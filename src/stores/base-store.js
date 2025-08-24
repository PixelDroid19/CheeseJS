import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Factory para crear stores con configuración común
 * Proporciona configuración estándar para devtools, persistencia y logging
 * 
 * @param {string} name - Nombre del store para devtools
 * @param {Function} storeCreator - Función que crea el estado y acciones del store
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.persist - Si debe persistir el estado en localStorage
 * @param {boolean} options.devtools - Si debe habilitar devtools (por defecto true)
 * @param {string} options.persistKey - Clave personalizada para localStorage
 * @param {Function} options.partialize - Función para seleccionar qué parte del estado persistir
 * @returns {Function} Store de Zustand configurado
 */
export const createBaseStore = (
  name,
  storeCreator,
  options = {}
) => {
  const {
    persist: shouldPersist = false,
    devtools: enableDevtools = true,
    persistKey,
    partialize
  } = options;

  let store = storeCreator;

  // Aplicar middleware de devtools si está habilitado
  if (enableDevtools && process.env.NODE_ENV === 'development') {
    store = devtools(store, { 
      name: `CheeseJS::${name}`,
      serialize: true
    });
  }

  // Aplicar middleware de persistencia si está habilitado
  if (shouldPersist) {
    store = persist(store, {
      name: persistKey || `cheesejs-${name.toLowerCase()}`,
      partialize: partialize || ((state) => {
        // Por defecto, persistir solo propiedades que no sean funciones
        const persistedState = {};
        Object.keys(state).forEach(key => {
          if (typeof state[key] !== 'function') {
            persistedState[key] = state[key];
          }
        });
        return persistedState;
      }),
      version: 1,
      migrate: (persistedState, version) => {
        // Manejo básico de migración de versiones
        if (version === 0) {
          // Migrar de versión 0 a 1
          return persistedState;
        }
        return persistedState;
      }
    });
  }

  return create(store);
};

/**
 * Utilidad para crear selectores optimizados
 * Evita re-renders innecesarios seleccionando solo las propiedades necesarias
 * 
 * @param {Function} useStore - Hook del store de Zustand
 * @param {Function} selector - Función selectora que extrae las propiedades necesarias
 * @returns {any} Estado seleccionado
 */
export const useStoreSelector = (useStore, selector) => {
  return useStore(selector);
};

/**
 * Helper para crear selectores shallow (comparación superficial)
 * Útil cuando se seleccionan múltiples propiedades del estado
 * 
 * @param {Array} keys - Array de claves a seleccionar del estado
 * @returns {Function} Función selectora
 */
export const createShallowSelector = (keys) => {
  return (state) => {
    const selected = {};
    keys.forEach(key => {
      selected[key] = state[key];
    });
    return selected;
  };
};

/**
 * Middleware personalizado para logging en desarrollo
 * Loguea cambios de estado para debugging
 */
export const loggerMiddleware = (config) => (set, get, api) =>
  config(
    (args) => {
      if (process.env.NODE_ENV === 'development') {
        console.group('🏪 Store Update');
        console.log('Previous state:', get());
        console.log('Action:', args);
      }
      
      set(args);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('New state:', get());
        console.groupEnd();
      }
    },
    get,
    api
  );

/**
 * Tipos comunes para todos los stores
 */
export const StoreStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

/**
 * Helper para crear estado inicial común
 */
export const createInitialState = (additionalState = {}) => ({
  status: StoreStatus.IDLE,
  isLoading: false,
  error: null,
  lastUpdated: null,
  ...additionalState
});

/**
 * Acciones comunes para todos los stores
 */
export const createBaseActions = (set, get) => ({
  setStatus: (status) => set({ status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, status: StoreStatus.ERROR }),
  clearError: () => set({ error: null }),
  reset: () => set(createInitialState()),
  updateTimestamp: () => set({ lastUpdated: new Date().toISOString() })
});

export default createBaseStore;