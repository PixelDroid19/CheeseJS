import { useState, useEffect } from 'react';
import { cheeseJSCore } from '../core/cheesejs-core.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Hook para gestión centralizada de servicios
 * Proporciona acceso unificado a todos los servicios del sistema
 */
export const useServices = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [services, setServices] = useState({});

  useEffect(() => {
    let isMounted = true;

    const initializeServices = async () => {
      try {
        setIsLoading(true);
        setInitializationError(null);

        // Inicializar CheeseJS Core si no está ya inicializado
        if (!cheeseJSCore.isReady()) {
          await cheeseJSCore.initialize();
        }

        if (isMounted) {
          setServices({
            core: cheeseJSCore,
            webContainer: cheeseJSCore.getComponents().webContainerService
          });
          setIsInitialized(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error inicializando servicios:', error);
        if (isMounted) {
          setInitializationError(error.message);
          setIsLoading(false);
        }
      }
    };

    initializeServices();

    // Suscribirse a eventos de inicialización
    const unsubscribers = [
      eventBus.subscribe('cheesejs:initialized', () => {
        if (isMounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }),

      eventBus.subscribe('cheesejs:initialization-error', (data) => {
        if (isMounted) {
          setInitializationError(data.error);
          setIsLoading(false);
        }
      }),

      eventBus.subscribe('webcontainer-service:ready', (data) => {
        if (isMounted && services.core) {
          setServices(prev => ({
            ...prev,
            webContainer: services.core.getComponents().webContainerService
          }));
        }
      })
    ];

    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Ejecutar código usando el servicio
   */
  const executeCode = async (code, options = {}) => {
    if (!services.core) {
      throw new Error('Servicios no están inicializados');
    }
    return await services.core.executeCode(code, options);
  };

  /**
   * Instalar paquete usando el servicio
   */
  const installPackage = async (packageName, version = 'latest') => {
    if (!services.core) {
      throw new Error('Servicios no están inicializados');
    }
    return await services.core.installPackage(packageName, version);
  };

  /**
   * Obtener estadísticas del sistema
   */
  const getSystemStats = async () => {
    if (!services.core) {
      return { initialized: false };
    }
    return await services.core.getSystemStats();
  };

  /**
   * Reiniciar sandbox
   */
  const resetSandbox = async () => {
    if (!services.core) {
      throw new Error('Servicios no están inicializados');
    }
    return await services.core.resetSandbox();
  };

  /**
   * Escribir archivo
   */
  const writeFile = async (path, content) => {
    if (!services.core) {
      throw new Error('Servicios no están inicializados');
    }
    return await services.core.writeFile(path, content);
  };

  /**
   * Leer archivo
   */
  const readFile = async (path) => {
    if (!services.core) {
      throw new Error('Servicios no están inicializados');
    }
    return await services.core.readFile(path);
  };

  return {
    // Estado
    isLoading,
    isInitialized,
    initializationError,
    services,
    
    // Acciones del core
    executeCode,
    installPackage,
    resetSandbox,
    writeFile,
    readFile,
    
    // Utilidades
    getSystemStats,
    isReady: isInitialized && !isLoading && !initializationError,
    hasError: !!initializationError
  };
};

export default useServices;