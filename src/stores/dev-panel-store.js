import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';

/**
 * DevPanelStore - Gestión de estado del panel de desarrollo
 * Maneja paneles, pestañas, plugins y estados de desarrollo
 */
const initialState = createInitialState({
  // Estado de pestañas
  activeTab: 'output',
  previousTab: null,
  tabHistory: [],
  maxTabHistory: 10,

  // Paneles registrados y disponibles
  registeredPanels: new Map(),
  availablePanels: [],
  disabledPanels: new Set(),

  // Estados individuales de cada panel
  panelStates: new Map(),
  panelData: new Map(),
  panelCounters: new Map(),

  // Configuración del DevPanel
  config: {
    enableTabHistory: true,
    enableAutoSwitch: true,
    persistState: true,
    showTabActions: true,
    maxPanelsVisible: 8
  },

  // Estado de plugins
  pluginSystem: {
    initialized: false,
    loadedPlugins: new Map(),
    failedPlugins: new Set(),
    pluginDependencies: new Map()
  },

  // Panel por defecto que deben estar disponibles
  defaultPanels: [
    {
      id: 'output',
      name: 'OUTPUT',
      icon: '📄',
      component: null,
      priority: 100,
      enabled: true,
      persistent: true
    },
    {
      id: 'terminal',
      name: 'TERMINAL',
      icon: '💻',
      component: null,
      priority: 90,
      enabled: true,
      persistent: true
    },
    {
      id: 'problems',
      name: 'PROBLEMS',
      icon: '⚠️',
      component: null,
      priority: 80,
      enabled: true,
      persistent: false
    },
    {
      id: 'debug',
      name: 'DEBUG CONSOLE',
      icon: '🐛',
      component: null,
      priority: 70,
      enabled: true,
      persistent: false
    },
    {
      id: 'ports',
      name: 'PORTS',
      icon: '🔌',
      component: null,
      priority: 60,
      enabled: true,
      persistent: false
    }
  ],

  // Estadísticas del panel
  stats: {
    totalPanels: 0,
    activePanels: 0,
    totalTabSwitches: 0,
    sessionStartTime: new Date().toISOString(),
    lastActivity: null
  },

  // Estado de notificaciones por panel
  panelNotifications: new Map(),
  
  // Configuración de acciones por panel
  panelActions: new Map(),

  // Estado de drag & drop para reordenar pestañas
  dragState: {
    isDragging: false,
    draggedTab: null,
    dropTarget: null
  }
});

export const useDevPanelStore = createBaseStore(
  'DevPanelStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar DevPanel
     */
    initialize: async () => {
      try {
        set({ isLoading: true });

        // Asegurar que todas las estructuras de datos estén correctamente inicializadas
        const currentState = get();
        const safeState = {
          registeredPanels: currentState.registeredPanels instanceof Map ? currentState.registeredPanels : new Map(),
          availablePanels: Array.isArray(currentState.availablePanels) ? currentState.availablePanels : [],
          disabledPanels: currentState.disabledPanels instanceof Set ? currentState.disabledPanels : new Set(),
          panelStates: currentState.panelStates instanceof Map ? currentState.panelStates : new Map(),
          panelCounters: currentState.panelCounters instanceof Map ? currentState.panelCounters : new Map(),
          panelNotifications: currentState.panelNotifications instanceof Map ? currentState.panelNotifications : new Map(),
          panelActions: currentState.panelActions instanceof Map ? currentState.panelActions : new Map(),
          tabHistory: Array.isArray(currentState.tabHistory) ? currentState.tabHistory : []
        };
        
        // Aplicar el estado seguro
        set(safeState);

        // Primero registrar paneles por defecto
        await get().registerDefaultPanels();

        // Luego cargar configuración persistida
        await get().loadPersistedConfiguration();

        // Inicializar sistema de plugins
        await get().initializePluginSystem();

        // Cargar paneles desde el plugin registry
        await get().loadPanelsFromPluginRegistry();

        // Verificar que los paneles se cargaron correctamente
        const finalState = get();
        if (finalState.availablePanels.length === 0) {
          console.warn('⚠️ No se cargaron paneles disponibles');
        }

        set({
          isLoading: false,
          isInitialized: true,
          stats: {
            ...get().stats,
            lastActivity: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        });

        console.log('🛠️ DevPanelStore inicializado');

      } catch (error) {
        console.error('❌ Error inicializando DevPanelStore:', error);
        set({ 
          isLoading: false, 
          isInitialized: false,
          error: error.message 
        });
      }
    },

    /**
     * Registrar paneles por defecto
     */
    registerDefaultPanels: async () => {
      const { defaultPanels } = get();
      const newRegisteredPanels = new Map();
      const newPanelStates = new Map();
      const newPanelCounters = new Map();

      defaultPanels.forEach(panel => {
        newRegisteredPanels.set(panel.id, panel);
        newPanelStates.set(panel.id, {
          data: null,
          lastUpdate: new Date().toISOString(),
          isVisible: true,
          hasError: false
        });
        newPanelCounters.set(panel.id, 0);
      });

      // Intentar cargar componentes por defecto de forma directa como fallback
      try {
        const modules = await Promise.all([
          import('../components/dev-panel/panels/output-panel.jsx'),
          import('../components/dev-panel/panels/terminal-panel.jsx'),
          import('../components/dev-panel/panels/problems-panel.jsx'),
          import('../components/dev-panel/panels/debug-panel.jsx'),
          import('../components/dev-panel/panels/ports-panel.jsx')
        ]);

        const OutputPanel = modules[0].OutputPanel || modules[0].default;
        const TerminalPanel = modules[1].TerminalPanel || modules[1].default;
        const ProblemsPanel = modules[2].ProblemsPanel || modules[2].default;
        const DebugPanel = modules[3].DebugPanel || modules[3].default;
        const PortsPanel = modules[4].PortsPanel || modules[4].default;

        const maybeAssign = (id, comp) => {
          if (!comp) return;
          const p = newRegisteredPanels.get(id);
          if (p && !p.component) {
            p.component = comp;
          }
        };

        maybeAssign('output', OutputPanel);
        maybeAssign('terminal', TerminalPanel);
        maybeAssign('problems', ProblemsPanel);
        maybeAssign('debug', DebugPanel);
        maybeAssign('ports', PortsPanel);
      } catch (e) {
        console.warn('⚠️ No se pudieron cargar componentes por defecto:', e);
      }

      const availablePanels = Array.from(newRegisteredPanels.values())
        .filter(panel => panel.enabled)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      set({
        registeredPanels: newRegisteredPanels,
        availablePanels,
        panelStates: newPanelStates,
        panelCounters: newPanelCounters,
        stats: {
          ...get().stats,
          totalPanels: defaultPanels.length,
          activePanels: availablePanels.length
        }
      });

      console.log(`📋 ${defaultPanels.length} paneles por defecto registrados`);
    },

    /**
     * Cargar configuración persistida
     */
    loadPersistedConfiguration: async () => {
      try {
        // Simular carga de configuración (aquí se integraría con localStorage/configService)
        const savedActiveTab = localStorage.getItem('devpanel-active-tab') || 'output';
        const savedConfig = JSON.parse(localStorage.getItem('devpanel-config') || '{}');

        // Validar que el tab guardado existe
        const { availablePanels } = get();
        const validTab = availablePanels.find(panel => panel.id === savedActiveTab);

        set({
          activeTab: validTab ? savedActiveTab : 'output',
          config: { ...get().config, ...savedConfig }
        });

        console.log('⚙️ Configuración cargada:', { activeTab: savedActiveTab });

      } catch (error) {
        console.warn('⚠️ Error cargando configuración persistida:', error);
      }
    },

    /**
     * Inicializar sistema de plugins
     */
    initializePluginSystem: async () => {
      try {
        set({
          pluginSystem: {
            ...get().pluginSystem,
            initialized: true
          }
        });

        console.log('🔌 Sistema de plugins inicializado');

      } catch (error) {
        console.error('❌ Error inicializando sistema de plugins:', error);
      }
    },

    /**
     * Cargar paneles desde el plugin registry
     */
    loadPanelsFromPluginRegistry: async () => {
      try {
        // Importar el plugin registry de forma dinámica para evitar dependencias circulares
        const { pluginRegistry } = await import('../core/plugin-registry.js');
        
        // Obtener paneles registrados en el plugin registry
        const registeredPlugins = pluginRegistry.getPanelPlugins();
        
        const currentState = get();
        const newRegisteredPanels = new Map(currentState.registeredPanels);
        const newPanelStates = new Map(currentState.panelStates);
        const newPanelCounters = new Map(currentState.panelCounters);
        const newPanelActions = new Map(currentState.panelActions);
        
        // Procesar cada panel del plugin registry
        registeredPlugins.forEach(plugin => {
          // Los elementos retornados por getPanelPlugins ya son paneles; validar por componente
          if (plugin && plugin.component) {
            // Usar tanto name como title para compatibilidad
            const panelData = {
              id: plugin.id,
              name: plugin.name || plugin.title,
              title: plugin.title || plugin.name,
              icon: plugin.icon,
              component: plugin.component,
              priority: plugin.priority || 50,
              enabled: !plugin.disabled,
              disabled: plugin.disabled || false,
              showCount: plugin.showCount || false,
              persistent: plugin.persistent || false,
              actions: plugin.actions || [],
              description: plugin.description,
              version: plugin.version
            };
            
            // Registrar el panel
            newRegisteredPanels.set(plugin.id, panelData);
            
            // Inicializar estado si no existe
            if (!newPanelStates.has(plugin.id)) {
              newPanelStates.set(plugin.id, {
                data: null,
                lastUpdate: new Date().toISOString(),
                isVisible: true,
                hasError: false,
                count: 0
              });
            }
            
            // Inicializar contador si no existe
            if (!newPanelCounters.has(plugin.id)) {
              newPanelCounters.set(plugin.id, 0);
            }
            
            // Registrar acciones si las tiene
            if (panelData.actions && panelData.actions.length > 0) {
              newPanelActions.set(plugin.id, panelData.actions);
            }
            
            console.log(`🔌 Panel cargado desde plugin registry: ${plugin.id} (${panelData.name})`);
          }
        });
        
        // Actualizar lista de paneles disponibles
        const availablePanels = Array.from(newRegisteredPanels.values())
          .filter(p => p.enabled && !p.disabled && !currentState.disabledPanels.has(p.id))
          .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        set({
          registeredPanels: newRegisteredPanels,
          panelStates: newPanelStates,
          panelCounters: newPanelCounters,
          panelActions: newPanelActions,
          availablePanels,
          stats: {
            ...currentState.stats,
            totalPanels: newRegisteredPanels.size,
            activePanels: availablePanels.length
          },
          lastUpdated: new Date().toISOString()
        });
        
        console.log(`🔌 ${registeredPlugins.length} paneles cargados desde plugin registry`);
        
      } catch (error) {
        console.error('❌ Error cargando paneles desde plugin registry:', error);
      }
    },

    /**
     * Cambiar pestaña activa
     */
    switchTab: (tabId) => {
      const currentState = get();
      const panel = currentState.registeredPanels.get(tabId);

      if (!panel) {
        console.warn(`⚠️ Panel ${tabId} no existe`);
        return false;
      }

      if (currentState.disabledPanels.has(tabId)) {
        console.warn(`⚠️ Panel ${tabId} está deshabilitado`);
        return false;
      }

      // Agregar al historial si está habilitado
      const newTabHistory = currentState.config.enableTabHistory
        ? [currentState.activeTab, ...currentState.tabHistory].slice(0, currentState.maxTabHistory)
        : currentState.tabHistory;

      set({
        previousTab: currentState.activeTab,
        activeTab: tabId,
        tabHistory: newTabHistory,
        stats: {
          ...currentState.stats,
          totalTabSwitches: currentState.stats.totalTabSwitches + 1,
          lastActivity: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      });

      // Persistir configuración
      get().persistConfiguration();

      console.log(`📋 Cambiado a pestaña: ${tabId}`);
      return true;
    },

    /**
     * Registrar nuevo panel
     */
    registerPanel: (panelConfig) => {
      const currentState = get();
      
      // Validación de configuración del panel
      if (!panelConfig.id || (!panelConfig.name && !panelConfig.title)) {
        console.error('❌ Configuración de panel inválida:', panelConfig);
        return false;
      }

      const panel = {
        id: panelConfig.id,
        name: panelConfig.name || panelConfig.title, // Soportar ambas propiedades
        title: panelConfig.title || panelConfig.name, // Mantener retrocompatibilidad
        icon: panelConfig.icon || '📄',
        component: panelConfig.component,
        priority: panelConfig.priority || 50,
        enabled: panelConfig.enabled !== false,
        persistent: panelConfig.persistent || false,
        disabled: panelConfig.disabled || false,
        showCount: panelConfig.showCount || false,
        actions: panelConfig.actions || [],
        ...panelConfig
      };

      // Agregar al registro
      const newRegisteredPanels = new Map(currentState.registeredPanels);
      newRegisteredPanels.set(panel.id, panel);

      // Inicializar estado del panel
      const newPanelStates = new Map(currentState.panelStates);
      newPanelStates.set(panel.id, {
        data: null,
        lastUpdate: new Date().toISOString(),
        isVisible: true,
        hasError: false,
        count: 0
      });

      // Inicializar contador
      const newPanelCounters = new Map(currentState.panelCounters);
      newPanelCounters.set(panel.id, 0);

      // Actualizar lista de paneles disponibles
      const availablePanels = Array.from(newRegisteredPanels.values())
        .filter(p => p.enabled && !p.disabled && !currentState.disabledPanels.has(p.id))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Configurar acciones del panel
      if (panel.actions && panel.actions.length > 0) {
        const newPanelActions = new Map(currentState.panelActions);
        newPanelActions.set(panel.id, panel.actions);
        set({ panelActions: newPanelActions });
      }

      set({
        registeredPanels: newRegisteredPanels,
        panelStates: newPanelStates,
        panelCounters: newPanelCounters,
        availablePanels,
        stats: {
          ...currentState.stats,
          totalPanels: newRegisteredPanels.size,
          activePanels: availablePanels.length
        },
        lastUpdated: new Date().toISOString()
      });

      console.log(`📋 Panel registrado: ${panel.id} (${panel.name})`);
      return true;
    },

    /**
     * Desregistrar panel
     */
    unregisterPanel: (panelId) => {
      const currentState = get();
      const panel = currentState.registeredPanels.get(panelId);

      if (!panel) {
        console.warn(`⚠️ Panel ${panelId} no existe`);
        return false;
      }

      if (panel.persistent) {
        console.warn(`⚠️ Panel ${panelId} es persistente y no puede ser desregistrado`);
        return false;
      }

      // Remover del registro
      const newRegisteredPanels = new Map(currentState.registeredPanels);
      newRegisteredPanels.delete(panelId);

      // Limpiar estado
      const newPanelStates = new Map(currentState.panelStates);
      newPanelStates.delete(panelId);

      const newPanelCounters = new Map(currentState.panelCounters);
      newPanelCounters.delete(panelId);

      const newPanelActions = new Map(currentState.panelActions);
      newPanelActions.delete(panelId);

      // Actualizar paneles disponibles
      const availablePanels = Array.from(newRegisteredPanels.values())
        .filter(p => p.enabled && !currentState.disabledPanels.has(p.id))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Si era el panel activo, cambiar al primero disponible
      let newActiveTab = currentState.activeTab;
      if (currentState.activeTab === panelId) {
        newActiveTab = availablePanels.length > 0 ? availablePanels[0].id : 'output';
      }

      set({
        registeredPanels: newRegisteredPanels,
        panelStates: newPanelStates,
        panelCounters: newPanelCounters,
        panelActions: newPanelActions,
        availablePanels,
        activeTab: newActiveTab,
        stats: {
          ...currentState.stats,
          totalPanels: newRegisteredPanels.size,
          activePanels: availablePanels.length
        },
        lastUpdated: new Date().toISOString()
      });

      console.log(`📋 Panel desregistrado: ${panelId}`);
      return true;
    },

    /**
     * Actualizar estado de panel
     */
    updatePanelState: (panelId, updates) => {
      const currentState = get();
      const currentPanelState = currentState.panelStates.get(panelId);

      if (!currentPanelState) {
        console.warn(`⚠️ Panel ${panelId} no tiene estado inicializado`);
        return false;
      }

      const newPanelStates = new Map(currentState.panelStates);
      newPanelStates.set(panelId, {
        ...currentPanelState,
        ...updates,
        lastUpdate: new Date().toISOString()
      });

      set({
        panelStates: newPanelStates,
        stats: {
          ...currentState.stats,
          lastActivity: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      });

      return true;
    },

    /**
     * Obtener estado de panel
     */
    getPanelState: (panelId) => {
      return get().panelStates.get(panelId) || {
        data: null,
        lastUpdate: null,
        isVisible: true,
        hasError: false
      };
    },

    /**
     * Incrementar contador de panel
     */
    incrementPanelCounter: (panelId, increment = 1) => {
      const currentState = get();
      const newPanelCounters = new Map(currentState.panelCounters);
      const currentCount = newPanelCounters.get(panelId) || 0;
      newPanelCounters.set(panelId, currentCount + increment);

      set({
        panelCounters: newPanelCounters,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Obtener contador de panel
     */
    getPanelCounter: (panelId) => {
      return get().panelCounters.get(panelId) || 0;
    },

    /**
     * Ejecutar acción de panel
     */
    executePanelAction: (panelId, actionId, params = {}) => {
      const currentState = get();
      const panelActions = currentState.panelActions.get(panelId);

      if (!panelActions) {
        console.warn(`⚠️ Panel ${panelId} no tiene acciones configuradas`);
        return false;
      }

      const action = panelActions.find(a => a.id === actionId);
      if (!action) {
        console.warn(`⚠️ Acción ${actionId} no encontrada en panel ${panelId}`);
        return false;
      }

      try {
        if (typeof action.handler === 'function') {
          action.handler(params);
          console.log(`⚡ Acción ejecutada: ${panelId}.${actionId}`);
          return true;
        } else {
          console.warn(`⚠️ Handler de acción ${actionId} no es función`);
          return false;
        }
      } catch (error) {
        console.error(`❌ Error ejecutando acción ${panelId}.${actionId}:`, error);
        return false;
      }
    },

    /**
     * Habilitar/deshabilitar panel
     */
    togglePanel: (panelId, enabled) => {
      const currentState = get();
      const newDisabledPanels = new Set(currentState.disabledPanels);

      if (enabled) {
        newDisabledPanels.delete(panelId);
      } else {
        newDisabledPanels.add(panelId);
      }

      // Actualizar paneles disponibles
      const availablePanels = Array.from(currentState.registeredPanels.values())
        .filter(p => p.enabled && !newDisabledPanels.has(p.id))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Si el panel deshabilitado era el activo, cambiar
      let newActiveTab = currentState.activeTab;
      if (!enabled && currentState.activeTab === panelId) {
        newActiveTab = availablePanels.length > 0 ? availablePanels[0].id : 'output';
      }

      set({
        disabledPanels: newDisabledPanels,
        availablePanels,
        activeTab: newActiveTab,
        stats: {
          ...currentState.stats,
          activePanels: availablePanels.length
        },
        lastUpdated: new Date().toISOString()
      });

      console.log(`📋 Panel ${panelId} ${enabled ? 'habilitado' : 'deshabilitado'}`);
    },

    /**
     * Agregar notificación a panel
     */
    addPanelNotification: (panelId, notification) => {
      const currentState = get();
      const newNotifications = new Map(currentState.panelNotifications);
      const currentNotifications = newNotifications.get(panelId) || [];
      
      const newNotification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...notification
      };

      newNotifications.set(panelId, [...currentNotifications, newNotification]);

      set({
        panelNotifications: newNotifications,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Limpiar notificaciones de panel
     */
    clearPanelNotifications: (panelId) => {
      const currentState = get();
      const newNotifications = new Map(currentState.panelNotifications);
      newNotifications.delete(panelId);

      set({
        panelNotifications: newNotifications,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Persistir configuración
     */
    persistConfiguration: () => {
      const { activeTab, config } = get();
      
      try {
        localStorage.setItem('devpanel-active-tab', activeTab);
        localStorage.setItem('devpanel-config', JSON.stringify(config));
      } catch (error) {
        console.warn('⚠️ Error persistiendo configuración:', error);
      }
    },

    /**
     * Obtener estadísticas del DevPanel
     */
    getDevPanelStats: () => {
      const currentState = get();
      return {
        ...currentState.stats,
        currentPanels: currentState.availablePanels.length,
        disabledPanels: currentState.disabledPanels.size,
        activeTab: currentState.activeTab,
        totalNotifications: Array.from(currentState.panelNotifications.values())
          .reduce((total, notifications) => total + notifications.length, 0)
      };
    },

    /**
     * Reordenar paneles (para drag & drop)
     */
    reorderPanels: (fromIndex, toIndex) => {
      const currentState = get();
      const newAvailablePanels = [...currentState.availablePanels];
      const [movedPanel] = newAvailablePanels.splice(fromIndex, 1);
      newAvailablePanels.splice(toIndex, 0, movedPanel);

      set({
        availablePanels: newAvailablePanels,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Resetear DevPanel
     */
    reset: () => {
      get().registerDefaultPanels();
      set({
        activeTab: 'output',
        previousTab: null,
        tabHistory: [],
        disabledPanels: new Set(),
        panelNotifications: new Map(),
        lastUpdated: new Date().toISOString()
      });
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-devpanel-store',
    devtools: true,
    // Persistir configuración y estado básico
    partialize: (state) => ({
      activeTab: state.activeTab,
      config: state.config,
      disabledPanels: Array.from(state.disabledPanels || []),
      tabHistory: state.tabHistory,
      stats: {
        totalTabSwitches: state.stats.totalTabSwitches,
        sessionStartTime: state.stats.sessionStartTime
      }
    }),
    // Función para rehidratar el estado correctamente
    onRehydrateStorage: () => (state) => {
      if (state) {
        // Convertir arrays de vuelta a Sets/Maps
        if (Array.isArray(state.disabledPanels)) {
          state.disabledPanels = new Set(state.disabledPanels);
        } else {
          state.disabledPanels = new Set();
        }
        
        // Asegurar que otras propiedades estén inicializadas correctamente
        if (!state.registeredPanels || !(state.registeredPanels instanceof Map)) {
          state.registeredPanels = new Map();
        }
        if (!state.panelStates || !(state.panelStates instanceof Map)) {
          state.panelStates = new Map();
        }
        if (!state.panelCounters || !(state.panelCounters instanceof Map)) {
          state.panelCounters = new Map();
        }
        if (!state.panelNotifications || !(state.panelNotifications instanceof Map)) {
          state.panelNotifications = new Map();
        }
        if (!state.panelActions || !(state.panelActions instanceof Map)) {
          state.panelActions = new Map();
        }
        if (!Array.isArray(state.availablePanels)) {
          state.availablePanels = [];
        }
        if (!Array.isArray(state.tabHistory)) {
          state.tabHistory = [];
        }
        
        console.log('🔄 DevPanelStore rehidratado correctamente');
      }
    }
  }
);