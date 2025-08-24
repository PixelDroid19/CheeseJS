import { useEffect, useRef } from 'react';
import { eventManager } from '../utils/event-manager.js';

/**
 * Hook para usar EventManager en componentes React
 * Simplifica la gestión de eventos y garantiza cleanup automático
 */
export const useEventManager = (componentId, eventConfigs = [], dependencies = []) => {
  const cleanupRef = useRef(null);
  const componentIdRef = useRef(componentId);

  useEffect(() => {
    // Actualizar componentId si cambia
    componentIdRef.current = componentId;

    // Si no hay configuraciones de eventos, no hacer nada
    if (!eventConfigs.length) {
      return;
    }

    // Suscribir a eventos
    const cleanup = eventManager.subscribeComponent(componentId, eventConfigs);
    cleanupRef.current = cleanup;

    // Cleanup al desmontar o cambiar dependencias
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [componentId, ...dependencies]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  /**
   * Emitir evento
   */
  const emit = (event, data) => {
    return eventManager.emit(event, data);
  };

  /**
   * Emitir evento asíncrono
   */
  const emitAsync = async (event, data) => {
    return await eventManager.emitAsync(event, data);
  };

  /**
   * Obtener estadísticas de suscripciones del componente
   */
  const getSubscriptions = () => {
    return eventManager.getComponentSubscriptions(componentIdRef.current);
  };

  return {
    emit,
    emitAsync,
    getSubscriptions,
    hasSubscriptions: () => eventManager.hasActiveSubscriptions(componentIdRef.current)
  };
};

/**
 * Hook para suscribirse a un grupo de eventos predefinido
 */
export const useEventGroup = (componentId, groupName, handlers = {}, dependencies = []) => {
  const cleanupRef = useRef(null);

  useEffect(() => {
    // Suscribir al grupo de eventos
    const cleanup = eventManager.subscribeToGroup(componentId, groupName, handlers);
    cleanupRef.current = cleanup;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [componentId, groupName, ...dependencies]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    emit: eventManager.emit.bind(eventManager),
    emitAsync: eventManager.emitAsync.bind(eventManager)
  };
};

export default useEventManager;