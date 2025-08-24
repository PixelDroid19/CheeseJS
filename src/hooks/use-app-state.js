import { useAppStore } from '../stores/app-store.js';
import { useShallow } from 'zustand/react/shallow';

/**
 * Hook para gestión del estado global de la aplicación
 * Reemplaza múltiples hooks específicos con un acceso unificado
 */
export const useAppState = () => {
  // Selección optimizada del estado para evitar re-renders innecesarios
  const {
    isInitialized,
    isInitializing,
    initializationProgress,
    initializationStep,
    config,
    servicesStatus,
    appInfo,
    error,
    lastUpdated,
    initialize,
    setConfig,
    getConfig,
    updateServiceStatus,
    restart,
    areServicesReady,
    getAppInfo,
    updateAppInfo
  } = useAppStore(
    useShallow((state) => ({
      // Estado de inicialización
      isInitialized: state.isInitialized,
      isInitializing: state.isInitializing,
      initializationProgress: state.initializationProgress,
      initializationStep: state.initializationStep,
      
      // Configuración
      config: state.config,
      
      // Estado de servicios
      servicesStatus: state.servicesStatus,
      
      // Información de la app
      appInfo: state.appInfo,
      
      // Estado general
      error: state.error,
      lastUpdated: state.lastUpdated,
      
      // Acciones
      initialize: state.initialize,
      setConfig: state.setConfig,
      getConfig: state.getConfig,
      updateServiceStatus: state.updateServiceStatus,
      restart: state.restart,
      areServicesReady: state.areServicesReady,
      getAppInfo: state.getAppInfo,
      updateAppInfo: state.updateAppInfo
    }))
  );

  // Funciones derivadas y utilidades
  const isReady = isInitialized && !error && areServicesReady();
  const hasError = !!error;
  const initializationPercent = Math.round(initializationProgress);

  // Helpers para configuración específica
  const getLayoutConfig = () => config.layout;
  const getEditorConfig = () => config.editor;
  const getGeneralConfig = () => config.general;
  const getConsoleConfig = () => config.console;
  const getWebContainerConfig = () => config.webcontainer;

  // Helpers para servicios
  const isServiceReady = (serviceName) => servicesStatus[serviceName] === 'ready';
  const getServiceStatus = (serviceName) => servicesStatus[serviceName] || 'idle';

  return {
    // Estado de inicialización
    isInitialized,
    isInitializing,
    initializationProgress,
    initializationStep,
    initializationPercent,
    
    // Estado calculado
    isReady,
    hasError,
    error,
    lastUpdated,
    
    // Configuración
    config,
    getLayoutConfig,
    getEditorConfig,
    getGeneralConfig,
    getConsoleConfig,
    getWebContainerConfig,
    
    // Servicios
    servicesStatus,
    isServiceReady,
    getServiceStatus,
    areServicesReady: areServicesReady(),
    
    // Información de la app
    appInfo,
    
    // Acciones principales
    initialize,
    restart,
    
    // Gestión de configuración
    setConfig,
    getConfig,
    updateConfig: setConfig, // Alias
    
    // Gestión de servicios
    updateServiceStatus,
    
    // Gestión de información de la app
    getAppInfo,
    updateAppInfo
  };
};

export default useAppState;