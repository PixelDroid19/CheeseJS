import { useDevPanelStore } from '../stores/dev-panel-store.js';
import { useShallow } from 'zustand/react/shallow';

/**
 * Hook para gestión del DevPanel usando Zustand
 * Reemplaza la implementación anterior y elimina dependencias de EventBus
 */
export const useDevPanel = () => {
  const {
    // Estado principal
    activeTab,
    previousTab,
    tabHistory,
    availablePanels,
    registeredPanels,
    disabledPanels,
    
    // Estados de paneles
    panelStates,
    panelCounters,
    panelNotifications,
    panelActions,
    
    // Configuración
    config,
    stats,
    
    // Estado de carga
    isLoading,
    isInitialized,
    error,
    
    // Acciones principales
    initialize,
    switchTab,
    registerPanel,
    unregisterPanel,
    updatePanelState,
    getPanelState,
    incrementPanelCounter,
    getPanelCounter,
    executePanelAction,
    togglePanel,
    
    // Notificaciones
    addPanelNotification,
    clearPanelNotifications,
    
    // Utilidades
    getDevPanelStats,
    reorderPanels,
    reset
  } = useDevPanelStore(
    useShallow((state) => ({
      // Estado
      activeTab: state.activeTab,
      previousTab: state.previousTab,
      tabHistory: state.tabHistory,
      availablePanels: state.availablePanels,
      registeredPanels: state.registeredPanels,
      disabledPanels: state.disabledPanels,
      panelStates: state.panelStates,
      panelCounters: state.panelCounters,
      panelNotifications: state.panelNotifications,
      panelActions: state.panelActions,
      config: state.config,
      stats: state.stats,
      isLoading: state.isLoading,
      isInitialized: state.isInitialized,
      error: state.error,
      
      // Acciones
      initialize: state.initialize,
      switchTab: state.switchTab,
      registerPanel: state.registerPanel,
      unregisterPanel: state.unregisterPanel,
      updatePanelState: state.updatePanelState,
      getPanelState: state.getPanelState,
      incrementPanelCounter: state.incrementPanelCounter,
      getPanelCounter: state.getPanelCounter,
      executePanelAction: state.executePanelAction,
      togglePanel: state.togglePanel,
      addPanelNotification: state.addPanelNotification,
      clearPanelNotifications: state.clearPanelNotifications,
      getDevPanelStats: state.getDevPanelStats,
      reorderPanels: state.reorderPanels,
      reset: state.reset
    }))
  );

  // Estado derivado
  const isReady = isInitialized && !isLoading && !error;
  const hasError = !!error;
  const panelsCount = availablePanels?.length || 0;
  const activePanel = availablePanels?.find(panel => panel.id === activeTab);
  const hasNotifications = Array.from(panelNotifications?.values() || []).some(notifications => notifications.length > 0);

  // Helpers para gestión de paneles
  const panels = {
    // Lista de paneles disponibles
    available: availablePanels || [],
    registered: Array.from(registeredPanels?.values() || []),
    disabled: Array.from(disabledPanels || []),
    
    // Panel activo
    active: activePanel,
    activeId: activeTab,
    previousId: previousTab,
    
    // Contadores
    count: panelsCount,
    totalRegistered: registeredPanels?.size || 0,
    
    // Acciones de paneles
    register: registerPanel,
    unregister: unregisterPanel,
    toggle: togglePanel,
    reorder: reorderPanels
  };

  // Helpers para navegación
  const navigation = {
    switch: switchTab,
    history: tabHistory,
    canGoBack: tabHistory?.length > 0,
    goBack: () => {
      if (tabHistory?.length > 0) {
        switchTab(tabHistory[0]);
      }
    },
    switchToNext: () => {
      if (availablePanels?.length > 0) {
        const currentIndex = availablePanels.findIndex(panel => panel.id === activeTab);
        const nextIndex = (currentIndex + 1) % availablePanels.length;
        switchTab(availablePanels[nextIndex].id);
      }
    },
    switchToPrevious: () => {
      if (availablePanels?.length > 0) {
        const currentIndex = availablePanels.findIndex(panel => panel.id === activeTab);
        const prevIndex = currentIndex === 0 ? availablePanels.length - 1 : currentIndex - 1;
        switchTab(availablePanels[prevIndex].id);
      }
    }
  };

  // Helpers para estado de paneles
  const panelState = {
    get: getPanelState,
    update: updatePanelState,
    
    // Helpers específicos para el panel activo
    getActive: () => getPanelState(activeTab),
    updateActive: (updates) => updatePanelState(activeTab, updates),
    
    // Verificar estados
    hasData: (panelId) => {
      const state = getPanelState(panelId);
      return state && state.data !== null;
    },
    hasError: (panelId) => {
      const state = getPanelState(panelId);
      return state && state.hasError === true;
    },
    isVisible: (panelId) => {
      const state = getPanelState(panelId);
      return state && state.isVisible !== false;
    }
  };

  // Helpers para contadores
  const counters = {
    get: getPanelCounter,
    increment: incrementPanelCounter,
    
    // Helpers específicos
    getActive: () => getPanelCounter(activeTab),
    incrementActive: (amount = 1) => incrementPanelCounter(activeTab, amount),
    
    // Obtener todos los contadores
    getAll: () => {
      const allCounters = {};
      if (availablePanels) {
        availablePanels.forEach(panel => {
          allCounters[panel.id] = getPanelCounter(panel.id);
        });
      }
      return allCounters;
    },
    
    // Verificar si hay contadores activos
    hasActive: () => {
      if (!availablePanels) return false;
      return availablePanels.some(panel => getPanelCounter(panel.id) > 0);
    }
  };

  // Helpers para acciones
  const actions = {
    execute: executePanelAction,
    
    // Ejecutar acción en panel activo
    executeActive: (actionId, params = {}) => {
      return executePanelAction(activeTab, actionId, params);
    },
    
    // Obtener acciones disponibles para un panel
    getAvailable: (panelId) => {
      return panelActions?.get(panelId) || [];
    }
  };

  return {
    // Estado principal
    isInitialized: isReady,
    isLoading,
    hasError,
    error,
    activeTab,
    
    // Helpers organizados
    panels,
    navigation,
    panelState,
    counters,
    actions,
    config,
    stats,
    
    // Acciones principales
    initialize,
    reset
  };
};