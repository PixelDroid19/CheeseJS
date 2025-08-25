import React, { useEffect, useRef } from 'react';
import { useTerminalStore } from '../../stores/terminal-store.js';
import { extensionAPI } from '../../services/extension-api.js';
import { eventBus } from '../../utils/event-bus.js';
import './terminal.css';

/**
 * Enhanced Terminal Component
 * Terminal interactiva usando xterm.js con Zustand store y extensiones
 */
export const Terminal = ({ 
  panelId = 'main-terminal',
  enableWelcomeMessage = true,
  enableHistory = true,
  enableAutoResize = true,
  className = ''
}) => {
  const terminalRef = useRef(null);
  
  // Zustand store
  const {
    // State
    isConnected,
    isInitialized,
    terminalReady,
    terminalInstance,
    commandHistory,
    currentInput,
    isExecuting,
    stats,
    config,
    theme,
    // Actions
    initialize,
    clearTerminal,
    executeCommand,
    resize,
    updateConfig,
    updateTheme,
    getStats,
    disconnect
  } = useTerminalStore();

  /**
   * Inicializar terminal cuando el componente se monta
   */
  useEffect(() => {
    const initTerminal = async () => {
      if (!terminalRef.current || isInitialized) return;
      
      try {
        await initialize(terminalRef, {
          enableWelcomeMessage,
          enableHistory,
          enableAutoResize
        });
        
        console.log('🖥️ Terminal component inicializado');
      } catch (error) {
        console.error('❌ Error inicializando terminal:', error);
      }
    };
    
    initTerminal();
    
    // Cleanup al desmontar
    return () => {
      if (isInitialized) {
        disconnect();
      }
    };
  }, [initialize, disconnect, enableWelcomeMessage, enableHistory, enableAutoResize, isInitialized]);

  /**
   * Manejar redimensionamiento
   */
  useEffect(() => {
    if (!terminalReady || !enableAutoResize) return;
    
    const handleResize = () => {
      resize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Resize inicial
    const timer = setTimeout(handleResize, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [terminalReady, enableAutoResize, resize]);

  /**
   * Suscribirse a eventos globales
   */
  useEffect(() => {
    // Evento para limpiar terminal
    const unsubscribeClear = eventBus.subscribe('terminal:clear-requested', () => {
      handleClearTerminal();
    });
    
    // Evento para ejecutar comando
    const unsubscribeExecute = eventBus.subscribe('terminal:execute-command', (data) => {
      if (data.command) {
        handleExecuteCommand(data.command);
      }
    });
    
    // Evento para cambio de tema
    const unsubscribeTheme = eventBus.subscribe('theme:changed', (data) => {
      if (data.theme) {
        updateTheme(data.theme);
      }
    });
    
    return () => {
      unsubscribeClear();
      unsubscribeExecute();
      unsubscribeTheme();
    };
  }, [updateTheme]);

  /**
   * Handlers
   */
  const handleClearTerminal = () => {
    try {
      clearTerminal();
      
      // Emitir evento para extensiones
      eventBus.emit('terminal:cleared', {
        panelId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error limpiando terminal:', error);
    }
  };
  
  const handleExecuteCommand = async (command) => {
    if (!command || !terminalReady) return;
    
    try {
      await executeCommand(command);
      
      // Emitir evento para extensiones
      eventBus.emit('terminal:command-executed', {
        command,
        panelId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error ejecutando comando:', error);
    }
  };
  
  const handleShowStats = () => {
    const terminalStats = getStats();
    
    // Mostrar estadísticas en el terminal
    if (terminalInstance) {
      terminalInstance.writeln('\n📊 Estadísticas del Terminal:');
      terminalInstance.writeln(`Comandos ejecutados: ${terminalStats.commandsExecuted}`);
      terminalInstance.writeln(`Historial: ${terminalStats.historySize} comandos`);
      terminalInstance.writeln(`Sesiones: ${terminalStats.sessionsCount}`);
      terminalInstance.writeln(`Estado: ${terminalStats.isConnected ? 'Conectado' : 'Desconectado'}`);
      terminalInstance.writeln('');
      terminalInstance.write('\x1b[32m$\x1b[0m ');
    }
  };
  
  const handleToggleHistory = () => {
    const newConfig = {
      ...config,
      enableHistory: !config.enableHistory
    };
    updateConfig(newConfig);
    
    if (terminalInstance) {
      const status = newConfig.enableHistory ? 'activado' : 'desactivado';
      terminalInstance.writeln(`\n📚 Historial de comandos ${status}`);
      terminalInstance.write('\x1b[32m$\x1b[0m ');
    }
  };

  /**
   * Obtener estado de conexión
   */
  const getConnectionStatus = () => {
    if (!isInitialized) return { icon: '⏳', text: 'Inicializando', class: 'initializing' };
    if (!isConnected) return { icon: '🔴', text: 'Desconectado', class: 'disconnected' };
    if (!terminalReady) return { icon: '🟡', text: 'Cargando', class: 'loading' };
    return { icon: '🟢', text: 'Conectado', class: 'connected' };
  };
  
  const connectionStatus = getConnectionStatus();

  return (
    <div className={`terminal-container ${className}`}>
      <div className="terminal-header">
        <div className="terminal-info">
          <div className="terminal-title">
            <span className="terminal-icon">🖥️</span>
            <span className="terminal-name">Terminal</span>
          </div>
          
          <div className="terminal-status">
            <span className={`status-indicator ${connectionStatus.class}`}>
              {connectionStatus.icon} {connectionStatus.text}
            </span>
            
            {terminalReady && (
              <span className="terminal-stats">
                {stats.commandsExecuted} comandos
              </span>
            )}
            
            {isExecuting && (
              <span className="executing-indicator">
                ⏳ Ejecutando...
              </span>
            )}
          </div>
        </div>
        
        <div className="terminal-actions">
          <button 
            className="terminal-btn"
            onClick={handleShowStats}
            disabled={!terminalReady}
            title="Mostrar estadísticas"
          >
            📊
          </button>
          
          <button 
            className="terminal-btn"
            onClick={handleToggleHistory}
            disabled={!terminalReady}
            title={`${config.enableHistory ? 'Desactivar' : 'Activar'} historial`}
          >
            📚
          </button>
          
          <button 
            className="terminal-btn"
            onClick={handleClearTerminal}
            disabled={!terminalReady}
            title="Limpiar terminal"
          >
            🧹
          </button>
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="terminal-content"
        style={{
          backgroundColor: theme?.background || '#1e1e1e',
          color: theme?.foreground || '#d4d4d4'
        }}
      />
      
      {/* Información de ayuda cuando no está inicializado */}
      {!isInitialized && (
        <div className="terminal-help">
          <p>Inicializando terminal...</p>
          <small>xterm.js + WebContainer</small>
        </div>
      )}
      
      {/* Panel de información adicional */}
      {terminalReady && config.enableHistory && commandHistory.length > 0 && (
        <div className="terminal-footer">
          <small className="history-info">
            Último comando: {commandHistory[commandHistory.length - 1]}
          </small>
        </div>
      )}
    </div>
  );
};

export default Terminal;