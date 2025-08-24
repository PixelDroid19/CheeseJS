import { eventBus } from './event-bus.js';

/**
 * Event Manager - Gestión centralizada de eventos para componentes
 * Elimina la duplicación de lógica de suscripción y cleanup de eventos
 */
class EventManager {
  constructor() {
    this.subscriptions = new Map(); // componentId -> subscriptions array
    this.eventGroups = new Map(); // groupName -> event configurations
    this.isDebugMode = false;
  }

  /**
   * Registrar grupo de eventos para reutilización
   */
  registerEventGroup(groupName, eventConfigs) {
    this.eventGroups.set(groupName, eventConfigs);
    
    if (this.isDebugMode) {
      console.log(`📡 EventManager: Grupo de eventos registrado: ${groupName}`, eventConfigs);
    }
  }

  /**
   * Suscribir componente a múltiples eventos
   */
  subscribeComponent(componentId, eventConfigs) {
    if (this.subscriptions.has(componentId)) {
      console.warn(`⚠️ EventManager: Componente ${componentId} ya tiene suscripciones activas`);
      this.unsubscribeComponent(componentId);
    }

    const subscriptions = [];

    for (const config of eventConfigs) {
      try {
        const unsubscribe = eventBus.subscribe(
          config.event,
          config.handler,
          {
            once: config.once || false,
            priority: config.priority || 0
          }
        );

        subscriptions.push({
          event: config.event,
          unsubscribe,
          config
        });

        if (this.isDebugMode) {
          console.log(`📡 EventManager: Suscrito ${componentId} a ${config.event}`);
        }
      } catch (error) {
        console.error(`❌ EventManager: Error suscribiendo ${componentId} a ${config.event}:`, error);
      }
    }

    this.subscriptions.set(componentId, subscriptions);

    // Retornar función de cleanup
    return () => this.unsubscribeComponent(componentId);
  }

  /**
   * Suscribir componente usando un grupo de eventos predefinido
   */
  subscribeToGroup(componentId, groupName, handlers = {}) {
    const eventGroup = this.eventGroups.get(groupName);
    if (!eventGroup) {
      throw new Error(`Grupo de eventos no encontrado: ${groupName}`);
    }

    const eventConfigs = eventGroup.map(config => ({
      ...config,
      handler: handlers[config.name] || config.handler
    }));

    return this.subscribeComponent(componentId, eventConfigs);
  }

  /**
   * Desuscribir todas las suscripciones de un componente
   */
  unsubscribeComponent(componentId) {
    const subscriptions = this.subscriptions.get(componentId);
    if (!subscriptions) {
      return;
    }

    for (const subscription of subscriptions) {
      try {
        subscription.unsubscribe();
        
        if (this.isDebugMode) {
          console.log(`📡 EventManager: Desuscrito ${componentId} de ${subscription.event}`);
        }
      } catch (error) {
        console.error(`❌ EventManager: Error desuscribiendo ${componentId}:`, error);
      }
    }

    this.subscriptions.delete(componentId);
  }

  /**
   * Obtener suscripciones activas de un componente
   */
  getComponentSubscriptions(componentId) {
    return this.subscriptions.get(componentId) || [];
  }

  /**
   * Obtener estadísticas de suscripciones
   */
  getSubscriptionStats() {
    const stats = {
      totalComponents: this.subscriptions.size,
      totalSubscriptions: 0,
      eventGroups: this.eventGroups.size,
      components: {}
    };

    for (const [componentId, subscriptions] of this.subscriptions) {
      stats.totalSubscriptions += subscriptions.length;
      stats.components[componentId] = {
        subscriptions: subscriptions.length,
        events: subscriptions.map(sub => sub.event)
      };
    }

    return stats;
  }

  /**
   * Limpiar todas las suscripciones
   */
  cleanup() {
    const componentIds = Array.from(this.subscriptions.keys());
    
    for (const componentId of componentIds) {
      this.unsubscribeComponent(componentId);
    }

    console.log('🧹 EventManager: Cleanup completado');
  }

  /**
   * Activar/desactivar modo debug
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    console.log(`📡 EventManager Debug: ${enabled ? 'activado' : 'desactivado'}`);
  }

  /**
   * Verificar si un componente tiene suscripciones activas
   */
  hasActiveSubscriptions(componentId) {
    return this.subscriptions.has(componentId);
  }

  /**
   * Emitir evento a través del EventManager (proxy al eventBus)
   */
  emit(event, data) {
    return eventBus.emit(event, data);
  }

  /**
   * Emitir evento asíncrono
   */
  async emitAsync(event, data) {
    return await eventBus.emitAsync(event, data);
  }
}

// Grupos de eventos predefinidos comunes
const COMMON_EVENT_GROUPS = {
  // Eventos básicos de UI
  UI_BASIC: [
    {
      name: 'languageChanged',
      event: 'i18n:language-changed',
      handler: null // Se debe proporcionar en handlers
    },
    {
      name: 'themeChanged',
      event: 'theme:changed',
      handler: null
    }
  ],

  // Eventos de ejecución
  EXECUTION: [
    {
      name: 'executionStarted',
      event: 'execution:started',
      handler: null
    },
    {
      name: 'executionCompleted',
      event: 'execution:completed',
      handler: null
    },
    {
      name: 'executionError',
      event: 'execution:error',
      handler: null
    },
    {
      name: 'executionStopped',
      event: 'execution:stopped',
      handler: null
    }
  ],

  // Eventos de paquetes
  PACKAGES: [
    {
      name: 'packageInstalling',
      event: 'package:installing',
      handler: null
    },
    {
      name: 'packageInstalled',
      event: 'package:installed',
      handler: null
    },
    {
      name: 'packageInstallError',
      event: 'package:install-error',
      handler: null
    },
    {
      name: 'packageUninstalled',
      event: 'package:uninstalled',
      handler: null
    }
  ],

  // Eventos del DevPanel
  DEVPANEL: [
    {
      name: 'registerPanel',
      event: 'devpanel:register-panel',
      handler: null
    },
    {
      name: 'unregisterPanel',
      event: 'devpanel:unregister-panel',
      handler: null
    },
    {
      name: 'switchTab',
      event: 'devpanel:switch-tab',
      handler: null
    },
    {
      name: 'updatePanelState',
      event: 'devpanel:update-panel-state',
      handler: null
    }
  ],

  // Eventos del sistema
  SYSTEM: [
    {
      name: 'cheeseJSInitialized',
      event: 'cheesejs:initialized',
      handler: null
    },
    {
      name: 'webcontainerReady',
      event: 'webcontainer:ready',
      handler: null
    },
    {
      name: 'webcontainerError',
      event: 'webcontainer:error',
      handler: null
    },
    {
      name: 'sandboxReset',
      event: 'sandbox:reset',
      handler: null
    }
  ]
};

// Instancia global del Event Manager
const eventManager = new EventManager();

// Registrar grupos de eventos comunes
Object.entries(COMMON_EVENT_GROUPS).forEach(([groupName, eventConfigs]) => {
  eventManager.registerEventGroup(groupName, eventConfigs);
});

export default EventManager;
export { eventManager, COMMON_EVENT_GROUPS };