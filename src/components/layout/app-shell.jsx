import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme-provider.jsx';
import { HeaderBar } from './header-bar.jsx';
import { SidebarPanel } from './sidebar-panel.jsx';
import { ConsolePanel } from '../console/console-panel.jsx';
import { useTheme } from './theme-provider.jsx';
import { configService } from '../../services/config-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './app-shell.css';

/**
 * App Shell - Contenedor principal de la aplicación
 * Maneja el layout principal y la estructura de paneles
 */
const AppShellContent = ({ children }) => {
  const { currentTheme, isDarkTheme } = useTheme();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showConsole, setShowConsole] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Inicializar configuración
    const initializeLayout = async () => {
      try {
        await configService.initialize();
        
        // Cargar configuración de layout
        setShowSidebar(configService.get('layout.showSidebar', true));
        setShowConsole(configService.get('layout.showConsole', true));
        setSidebarWidth(configService.get('layout.sidebarWidth', 250));
        setConsoleHeight(configService.get('layout.consoleHeight', 200));
        
        setIsInitialized(true);
        console.log('🏗️ App Shell inicializado');
      } catch (error) {
        console.error('❌ Error al inicializar App Shell:', error);
        setIsInitialized(true);
      }
    };

    initializeLayout();

    // Suscribirse a eventos de configuración
    const unsubscribeConfigChanged = eventBus.subscribe('config:changed', (data) => {
      const { key, newValue } = data;
      
      switch (key) {
        case 'layout.showSidebar':
          setShowSidebar(newValue);
          break;
        case 'layout.showConsole':
          setShowConsole(newValue);
          break;
        case 'layout.sidebarWidth':
          setSidebarWidth(newValue);
          break;
        case 'layout.consoleHeight':
          setConsoleHeight(newValue);
          break;
      }
    });

    return () => {
      unsubscribeConfigChanged();
    };
  }, []);

  /**
   * Alternar visibilidad del sidebar
   */
  const toggleSidebar = () => {
    const newShowSidebar = !showSidebar;
    setShowSidebar(newShowSidebar);
    configService.set('layout.showSidebar', newShowSidebar);
    
    eventBus.emit('layout:sidebar-toggled', { visible: newShowSidebar });
  };

  /**
   * Alternar visibilidad de la consola
   */
  const toggleConsole = () => {
    const newShowConsole = !showConsole;
    setShowConsole(newShowConsole);
    configService.set('layout.showConsole', newShowConsole);
    
    eventBus.emit('layout:console-toggled', { visible: newShowConsole });
  };

  /**
   * Iniciar redimensionamiento
   */
  const startResize = (type, event) => {
    event.preventDefault();
    setIsResizing(true);
    setResizeType(type);
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = type === 'sidebar' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  /**
   * Manejar redimensionamiento
   */
  const handleResize = (event) => {
    if (!isResizing || !resizeType) return;

    if (resizeType === 'sidebar') {
      const newWidth = Math.max(200, Math.min(500, event.clientX));
      setSidebarWidth(newWidth);
    } else if (resizeType === 'console') {
      const newHeight = Math.max(150, Math.min(400, window.innerHeight - event.clientY));
      setConsoleHeight(newHeight);
    }
  };

  /**
   * Detener redimensionamiento
   */
  const stopResize = () => {
    if (!isResizing) return;
    
    setIsResizing(false);
    setResizeType(null);
    
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Guardar nuevas dimensiones
    if (resizeType === 'sidebar') {
      configService.set('layout.sidebarWidth', sidebarWidth);
    } else if (resizeType === 'console') {
      configService.set('layout.consoleHeight', consoleHeight);
    }
  };

  /**
   * Manejar atajos de teclado
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + B - Toggle Sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
      
      // Ctrl/Cmd + ` - Toggle Console
      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault();
        toggleConsole();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSidebar, showConsole]);

  if (!isInitialized) {
    return (
      <div className="app-shell-loading">
        <div className="loading-content">
          <div className="cheese-icon">🧀</div>
          <h1>CheeseJS</h1>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
          <p>Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell theme-${currentTheme} ${isDarkTheme() ? 'dark' : 'light'}`}>
      {/* Header Bar */}
      <HeaderBar 
        onToggleSidebar={toggleSidebar}
        onToggleConsole={toggleConsole}
        showSidebar={showSidebar}
        showConsole={showConsole}
      />
      
      {/* Main Layout Container */}
      <div className="app-main" style={{
        gridTemplateColumns: showSidebar ? `${sidebarWidth}px 4px 1fr` : '1fr',
        gridTemplateRows: showConsole ? `1fr 4px ${consoleHeight}px` : '1fr'
      }}>
        {/* Sidebar Panel */}
        {showSidebar && (
          <>
            <SidebarPanel width={sidebarWidth} />
            
            {/* Sidebar Resizer */}
            <div 
              className="resizer resizer-vertical"
              onMouseDown={(e) => startResize('sidebar', e)}
              style={{ cursor: isResizing && resizeType === 'sidebar' ? 'ew-resize' : 'ew-resize' }}
            />
          </>
        )}
        
        {/* Main Content Area */}
        <div className="content-area">
          {/* Editor Panel (children) */}
          <div className="editor-container">
            {children}
          </div>
          
          {/* Console Resizer */}
          {showConsole && (
            <div 
              className="resizer resizer-horizontal"
              onMouseDown={(e) => startResize('console', e)}
              style={{ cursor: isResizing && resizeType === 'console' ? 'ns-resize' : 'ns-resize' }}
            />
          )}
          
          {/* Console Panel */}
          {showConsole && (
            <div 
              className="console-container"
              style={{ height: `${consoleHeight}px` }}
            >
              <ConsolePanel />
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay de redimensionamiento */}
      {isResizing && (
        <div className="resize-overlay" />
      )}
    </div>
  );
};

/**
 * App Shell con Theme Provider
 */
export const AppShell = ({ children }) => {
  return (
    <ThemeProvider>
      <AppShellContent>
        {children}
      </AppShellContent>
    </ThemeProvider>
  );
};

export default AppShell;