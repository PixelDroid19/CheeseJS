/**
 * Exportaciones centralizadas de todos los stores de Zustand
 * Este archivo facilita la importación de stores desde otros módulos
 */

// Store base y utilidades
export { 
  createBaseStore, 
  useStoreSelector, 
  createShallowSelector,
  loggerMiddleware,
  StoreStatus,
  createInitialState,
  createBaseActions
} from './base-store.js';

// Stores principales
export { useAppStore } from './app-store.js';
export { useThemeStore } from './theme-store.js';
export { useUIStore } from './ui-store.js';
export { useEditorStore } from './editor-store.js';
export { useTerminalStore } from './terminal-store.js';
export { useWebContainerStore } from './webcontainer-store.js';
export { useDevPanelStore } from './dev-panel-store.js';

/**
 * Hook combinado para acceder a múltiples stores
 * Útil para componentes que necesitan estado de varios stores
 */
export const useStores = () => {
  return {
    app: useAppStore(),
    theme: useThemeStore(),
    ui: useUIStore(),
    editor: useEditorStore(),
    terminal: useTerminalStore(),
    webContainer: useWebContainerStore(),
    devPanel: useDevPanelStore()
  };
};

/**
 * Función para resetear todos los stores
 * Útil para testing y reset completo de la aplicación
 */
export const resetAllStores = () => {
  // Se implementará una vez que tengamos todos los stores
  console.warn('resetAllStores() no implementado aún');
};

/**
 * Función para validar integridad de stores
 * Útil para debugging y desarrollo
 */
export const validateStores = () => {
  // Se implementará una vez que tengamos todos los stores
  console.warn('validateStores() no implementado aún');
};