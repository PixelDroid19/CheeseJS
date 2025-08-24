import { useState, useEffect } from 'react';
import { pluginRegistry } from '../core/plugin-registry.js';
import { configService } from '../services/config-service.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Hook para gestión del DevPanel con sistema de plugins
 * Proporciona funcionalidad escalable para paneles
 */
export const useDevPanel = () => {
  const [activeTab, setActiveTab] = useState('output');
  const [panels, setPanels] = useState([]);
  const [panelStates, setPanelStates] = useState(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeDevPanel();

    // Suscribirse a eventos de plugins
    const unsubscribers = [
      eventBus.subscribe('devpanel:register-panel', handleRegisterPanel),
      eventBus.subscribe('devpanel:unregister-panel', handleUnregisterPanel),
      eventBus.subscribe('devpanel:panel-toggled', handlePanelToggled),
      eventBus.subscribe('plugin:registered', handlePluginRegistered),
      eventBus.subscribe('plugin:unregistered', handlePluginUnregistered)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Inicializar DevPanel
   */
  const initializeDevPanel = async () => {
    try {
      // Cargar configuración guardada
      const savedTab = configService.get('devpanel.activeTab', 'output');
      setActiveTab(savedTab);

      // Cargar paneles registrados
      const registeredPanels = pluginRegistry.getPanelPlugins();
      setPanels(registeredPanels);

      // Inicializar estados de paneles
      const initialStates = new Map();
      registeredPanels.forEach(panel => {
        initialStates.set(panel.id, {
          count: 0,
          data: null,
          lastUpdate: Date.now()
        });
      });
      setPanelStates(initialStates);

      setIsInitialized(true);
      console.log('🛠️ DevPanel inicializado con sistema de plugins');

    } catch (error) {
      console.error('❌ Error inicializando DevPanel:', error);
    }
  };

  /**
   * Manejar registro de panel
   */
  const handleRegisterPanel = (panelConfig) => {
    setPanels(prev => {
      const updated = [...prev.filter(p => p.id !== panelConfig.id), panelConfig];
      return updated.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });

    setPanelStates(prev => {
      const newStates = new Map(prev);
      if (!newStates.has(panelConfig.id)) {
        newStates.set(panelConfig.id, {
          count: 0,
          data: null,
          lastUpdate: Date.now()
        });
      }
      return newStates;
    });

    console.log(`🔌 Panel registrado: ${panelConfig.id}`);
  };

  /**
   * Manejar desregistro de panel
   */
  const handleUnregisterPanel = ({ panelId }) => {
    setPanels(prev => prev.filter(p => p.id !== panelId));
    
    setPanelStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(panelId);
      return newStates;
    });

    // Si el panel activo fue removido, cambiar al primero disponible
    if (activeTab === panelId) {
      const remainingPanels = panels.filter(p => p.id !== panelId && !p.disabled);
      if (remainingPanels.length > 0) {
        switchTab(remainingPanels[0].id);
      }
    }

    console.log(`🔌 Panel desregistrado: ${panelId}`);
  };

  /**
   * Manejar toggle de panel
   */
  const handlePanelToggled = ({ panelId, enabled }) => {
    setPanels(prev => prev.map(panel => 
      panel.id === panelId 
        ? { ...panel, disabled: !enabled }
        : panel
    ));
  };

  /**
   * Manejar registro de plugin
   */
  const handlePluginRegistered = ({ plugin }) => {
    if (plugin.type === 'panel') {
      // El panel ya fue registrado por handleRegisterPanel
      console.log(`🔌 Plugin de panel registrado: ${plugin.id}`);
    }
  };

  /**
   * Manejar desregistro de plugin
   */
  const handlePluginUnregistered = ({ pluginId }) => {
    console.log(`🔌 Plugin desregistrado: ${pluginId}`);
  };

  /**
   * Cambiar pestaña activa
   */
  const switchTab = (tabId) => {
    const panel = panels.find(p => p.id === tabId);
    if (!panel || panel.disabled) {
      console.warn(`⚠️ Panel ${tabId} no disponible`);
      return;
    }

    setActiveTab(tabId);
    configService.set('devpanel.activeTab', tabId);
    
    eventBus.emit('devpanel:tab-changed', {
      previousTab: activeTab,
      currentTab: tabId
    });
  };

  /**
   * Actualizar estado de panel
   */
  const updatePanelState = (panelId, updates) => {
    setPanelStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(panelId) || {};
      newStates.set(panelId, {
        ...currentState,
        ...updates,
        lastUpdate: Date.now()
      });
      return newStates;
    });

    eventBus.emit('devpanel:panel-state-updated', { panelId, updates });
  };

  /**
   * Obtener estado de panel
   */
  const getPanelState = (panelId) => {
    return panelStates.get(panelId) || { count: 0, data: null, lastUpdate: 0 };
  };

  /**
   * Registrar nuevo panel programáticamente
   */
  const registerPanel = (panelConfig) => {
    return pluginRegistry.registerPlugin({
      type: 'panel',
      ...panelConfig
    });
  };

  /**
   * Desregistrar panel
   */
  const unregisterPanel = (panelId) => {
    return pluginRegistry.unregisterPlugin(panelId);
  };

  /**
   * Obtener paneles disponibles (no deshabilitados)
   */
  const getAvailablePanels = () => {
    return panels.filter(panel => !panel.disabled);
  };

  /**
   * Obtener panel activo
   */
  const getActivePanel = () => {
    return panels.find(panel => panel.id === activeTab);
  };

  /**
   * Ejecutar acción de panel
   */
  const executePanelAction = (panelId, actionId, params = {}) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || !panel.actions) {
      return false;
    }

    const action = panel.actions.find(a => a.id === actionId);
    if (!action || !action.handler) {
      return false;
    }

    try {
      action.handler(params);
      eventBus.emit('devpanel:action-executed', { panelId, actionId, params });
      return true;
    } catch (error) {
      console.error(`❌ Error ejecutando acción ${actionId} en panel ${panelId}:`, error);
      return false;
    }
  };

  /**
   * Obtener estadísticas del DevPanel
   */
  const getDevPanelStats = () => {
    return {
      totalPanels: panels.length,
      availablePanels: getAvailablePanels().length,
      disabledPanels: panels.filter(p => p.disabled).length,
      activeTab,
      isInitialized,
      pluginStats: pluginRegistry.getStats()
    };
  };

  return {
    // Estado
    activeTab,
    panels,
    availablePanels: getAvailablePanels(),
    isInitialized,

    // Acciones principales
    switchTab,
    updatePanelState,
    getPanelState,

    // Gestión de paneles
    registerPanel,
    unregisterPanel,
    getActivePanel,

    // Acciones de panel
    executePanelAction,

    // Utilidades
    getDevPanelStats,
    isReady: isInitialized && panels.length > 0
  };
};

export default useDevPanel;