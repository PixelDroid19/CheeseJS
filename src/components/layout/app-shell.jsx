import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme-provider.jsx';
import { HeaderBar } from './header-bar.jsx';
import { DevPanel } from '../dev-panel/dev-panel.jsx';
import { FloatingToolbar } from '../floating-toolbar/floating-toolbar.jsx';
import { ModalManager } from '../modal/modal-manager.jsx';
import { useTheme } from './theme-provider.jsx';
import { configService } from '../../services/config-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './app-shell.css';

// Importar estilos globales
import '../../styles/colors.css';
import '../modal/modals/modal-styles.css';

/**
 * App Shell - Contenedor principal de la aplicación
 * Maneja el layout principal y la estructura de paneles
 */
const AppShellContent = ({ children }) => {
  const { currentTheme, isDarkTheme } = useTheme();
  const [showConsole, setShowConsole] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Inicializar configuración
    const initializeLayout = async () => {
      try {
        await configService.initialize();
        
        // Cargar configuración de layout
        setShowConsole(configService.get('layout.showConsole', true));
        setConsoleHeight(configService.get('layout.consoleHeight', 300));
        setToolbarCollapsed(configService.get('layout.toolbarCollapsed', false));
        
        setIsInitialized(true);
        console.log('🏗️ App Shell inicializado - Nueva arquitectura sin sidebar');
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
        case 'layout.showConsole':
          setShowConsole(newValue);
          break;
        case 'layout.consoleHeight':
          setConsoleHeight(newValue);
          break;
        case 'layout.toolbarCollapsed':
          setToolbarCollapsed(newValue);
          break;
      }
    });

    // Suscribirse a eventos del toolbar flotante
    const unsubscribeConsoleToggle = eventBus.subscribe('console:toggle-requested', () => {
      toggleConsole();
    });

    return () => {
      unsubscribeConfigChanged();
      unsubscribeConsoleToggle();
    };
  }, []);

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
   * Toggle del toolbar flotante
   */
  const toggleToolbar = () => {
    const newCollapsed = !toolbarCollapsed;
    setToolbarCollapsed(newCollapsed);
    configService.set('layout.toolbarCollapsed', newCollapsed);
  };

  /**
   * Iniciar redimensionamiento de la consola
   */
  const startResize = (event) => {
    event.preventDefault();
    setIsResizing(true);
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  /**
   * Manejar redimensionamiento de la consola
   */
  const handleResize = (event) => {
    if (!isResizing) return;
    const newHeight = Math.max(150, Math.min(400, window.innerHeight - event.clientY));
    setConsoleHeight(newHeight);
  };

  /**
   * Detener redimensionamiento
   */
  const stopResize = () => {
    if (!isResizing) return;
    
    setIsResizing(false);
    
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Guardar nueva altura
    configService.set('layout.consoleHeight', consoleHeight);
  };

  /**
   * Manejar atajos de teclado
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + ` - Toggle Console
      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault();
        toggleConsole();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConsole]);

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
      {/* Header Bar Simplificado */}
      <HeaderBar 
        onToggleConsole={toggleConsole}
        showConsole={showConsole}
      />
      
      {/* Main Layout Container - Sin Sidebar */}
      <div className="app-main app-main--no-sidebar">
        {/* Editor y Content Area */}
        <div className="app-content" style={{
          gridTemplateRows: showConsole ? `1fr 4px ${consoleHeight}px` : '1fr'
        }}>
          {/* Editor Panel (children) */}
          <div className="editor-container">
            {children}
          </div>
          
          {/* Console Resize Handle */}
          {showConsole && (
            <div 
              className="resize-handle resize-handle--horizontal"
              onMouseDown={startResize}
            />
          )}
          
          {/* Console Panel */}
          {showConsole && (
            <div 
              className="app-console"
              style={{ height: `${consoleHeight}px` }}
            >
              <DevPanel />
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Toolbar */}
      <FloatingToolbar 
        position="bottom-center"
        isCollapsed={toolbarCollapsed}
        onToggle={toggleToolbar}
      />
      
      {/* Modal Manager */}
      <ModalManager />
      
      {/* Background overlay cuando se está redimensionando */}
      {isResizing && <div className="resize-overlay" />}
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