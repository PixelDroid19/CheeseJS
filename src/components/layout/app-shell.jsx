import React, { useEffect } from 'react';
import { ThemeProvider } from './theme-provider.jsx';
import { HeaderBar } from './header-bar.jsx';
import { DevPanel } from '../dev-panel/dev-panel.jsx';
import { FloatingToolbar } from '../floating-toolbar/floating-toolbar.jsx';
import { ModalManager } from '../modal/modal-manager.jsx';
import { useTheme } from '../../hooks/use-theme.js';
import { useAppState } from '../../hooks/use-app-state.js';
import { useUI } from '../../hooks/use-ui.js';
import './app-shell.css';

// Importar estilos globales
import '../../styles/colors.css';
import '../modal/modals/modal-styles.css';

/**
 * App Shell - Contenedor principal de la aplicación
 * Refactorizado para usar Zustand stores, eliminando prop drilling y EventBus
 */
const AppShellContent = ({ children }) => {
  const { currentTheme, isDark } = useTheme();
  const {
    isInitialized,
    isInitializing,
    initializationProgress,
    initializationStep,
    initialize
  } = useAppState();
  
  const {
    layout,
    loading
  } = useUI();

  // Inicializar la aplicación al montar el componente
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      initialize();
    }
  }, [isInitialized, isInitializing, initialize]);

  // Configuración de layout desde el estado global
  const showConsole = layout.isConsoleVisible;
  const consoleHeight = layout.consoleHeight;
  const isResizing = layout.isResizing;

  /**
   * Manejar atajos de teclado
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + ` - Toggle Console
      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault();
        layout.toggleConsole();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layout]);

  // Mostrar pantalla de carga durante la inicialización
  if (!isInitialized) {
    return (
      <div className="app-shell-loading">
        <div className="loading-content">
          <div className="cheese-icon">🧀</div>
          <h1>CheeseJS</h1>
          <div className="loading-bar">
            <div 
              className="loading-progress"
              style={{ width: `${initializationProgress}%` }}
            />
          </div>
          <p>{initializationStep || 'Inicializando aplicación...'}</p>
          {initializationProgress > 0 && (
            <span className="loading-percent">{Math.round(initializationProgress)}%</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell theme-${currentTheme} ${isDark ? 'dark' : 'light'}`}>
      {/* Header Bar Simplificado */}
      <HeaderBar />
      
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
              className={`resize-handle resize-handle--horizontal ${
                isResizing ? 'resize-handle--active' : ''
              }`}
              onMouseDown={layout.startResize}
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
      <FloatingToolbar />
      
      {/* Modal Manager */}
      <ModalManager />
      
      {/* Loading Overlay Global */}
      {loading.global && (
        <div className="app-loading-overlay">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
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