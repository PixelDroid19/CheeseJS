import { useTerminalStore } from '../stores/terminal-store.js';
import { useShallow } from 'zustand/react/shallow';
import { useRef, useEffect } from 'react';

/**
 * Hook para gestión de terminal usando Zustand
 * Reemplaza la implementación anterior y elimina duplicación de código
 */
export const useTerminalStore = (options = {}) => {
  const terminalRef = useRef(null);
  
  const {
    // Estado de conexión
    isConnected,
    isInitialized,
    isConnecting,
    connectionError,
    terminalReady,
    
    // Estado del terminal
    currentInput,
    isExecuting,
    commandHistory,
    outputHistory,
    dimensions,
    
    // Configuración
    config,
    theme,
    
    // Estadísticas
    stats,
    
    // Acciones principales
    initialize,
    executeCommand,
    clearTerminal,
    disconnect,
    reset,
    
    // Gestión de historial
    addToHistory,
    addToOutput,
    
    // Configuración
    updateConfig,
    updateTheme,
    resize,
    
    // Utilidades
    getStats,
    exportHistory
  } = useTerminalStore(
    useShallow((state) => ({
      // Estado
      isConnected: state.isConnected,
      isInitialized: state.isInitialized,
      isConnecting: state.isConnecting,
      connectionError: state.connectionError,
      terminalReady: state.terminalReady,
      currentInput: state.currentInput,
      isExecuting: state.isExecuting,
      commandHistory: state.commandHistory,
      outputHistory: state.outputHistory,
      dimensions: state.dimensions,
      config: state.config,
      theme: state.theme,
      stats: state.stats,
      
      // Acciones
      initialize: state.initialize,
      executeCommand: state.executeCommand,
      clearTerminal: state.clearTerminal,
      disconnect: state.disconnect,
      reset: state.reset,
      addToHistory: state.addToHistory,
      addToOutput: state.addToOutput,
      updateConfig: state.updateConfig,
      updateTheme: state.updateTheme,
      resize: state.resize,
      getStats: state.getStats,
      exportHistory: state.exportHistory
    }))
  );

  // Inicializar terminal cuando el ref esté disponible
  useEffect(() => {
    if (terminalRef.current && !isInitialized) {
      initialize(terminalRef, options);
    }
  }, [terminalRef.current, isInitialized, initialize, options]);

  // Auto-resize cuando cambian las dimensiones
  useEffect(() => {
    if (config.enableAutoResize && terminalReady) {
      const handleResize = () => resize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [config.enableAutoResize, terminalReady, resize]);

  // Estado derivado
  const isReady = isConnected && terminalReady && !isConnecting;
  const hasError = !!connectionError;
  const canExecute = isReady && !isExecuting;
  const hasHistory = commandHistory.length > 0;

  // Helpers para comandos
  const executeCommandSafe = async (command) => {
    if (!canExecute) {
      console.warn('Terminal no está listo para ejecutar comandos');
      return false;
    }

    try {
      await executeCommand(command);
      return true;
    } catch (error) {
      console.error('Error ejecutando comando:', error);
      return false;
    }
  };

  // Helpers para configuración
  const updateTerminalConfig = (newConfig) => {
    updateConfig(newConfig);
  };

  const updateTerminalTheme = (newTheme) => {
    updateTheme(newTheme);
  };

  // Helpers para historial
  const getCommandHistory = () => commandHistory;
  const getOutputHistory = () => outputHistory;
  const getLastCommand = () => commandHistory[commandHistory.length - 1];
  const getCommandCount = () => stats.commandsExecuted;

  // Helpers para dimensiones
  const getCurrentDimensions = () => dimensions;
  const resizeTerminal = () => resize();

  // Helpers para estado
  const getConnectionStatus = () => {
    if (isConnecting) return 'connecting';
    if (isConnected && terminalReady) return 'connected';
    if (hasError) return 'error';
    return 'disconnected';
  };

  const getTerminalInfo = () => ({
    status: getConnectionStatus(),
    dimensions,
    config,
    stats: getStats(),
    hasHistory,
    canExecute
  });

  // Helpers para acciones
  const reconnect = async () => {
    if (isConnected) {
      disconnect();
    }
    await initialize(terminalRef, options);
  };

  const clearAll = () => {
    clearTerminal();
  };

  const resetTerminal = () => {
    reset();
  };

  return {
    // Ref para el contenedor del terminal
    terminalRef,
    
    // Estado principal
    isConnected,
    isInitialized,
    isConnecting,
    isReady,
    hasError,
    connectionError,
    
    // Estado del terminal
    terminalReady,
    currentInput,
    isExecuting,
    canExecute,
    
    // Historial
    commandHistory,
    outputHistory,
    hasHistory,
    getCommandHistory,
    getOutputHistory,
    getLastCommand,
    
    // Dimensiones
    dimensions,
    getCurrentDimensions,
    
    // Configuración
    config,
    theme,
    
    // Estadísticas
    stats,
    getCommandCount,
    getStats: getStats(),
    
    // Acciones principales
    initialize: (ref, opts) => initialize(ref || terminalRef, opts || options),
    executeCommand: executeCommandSafe,
    clearTerminal: clearAll,
    disconnect,
    reset: resetTerminal,
    reconnect,
    
    // Gestión de configuración
    updateConfig: updateTerminalConfig,
    updateTheme: updateTerminalTheme,
    
    // Utilidades
    resize: resizeTerminal,
    exportHistory,
    getTerminalInfo,
    getConnectionStatus: getConnectionStatus(),
    
    // Helpers de estado
    isHealthy: isReady && !hasError,
    needsReconnection: hasError && !isConnecting,
    
    // Acciones de conveniencia
    clear: clearAll,
    restart: resetTerminal
  };
};

export default useTerminalStore;