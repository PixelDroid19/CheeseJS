import { eventBus } from '../utils/event-bus.js';

/**
 * Plugin Registry - Sistema de plugins extensible
 * Permite registrar paneles, servicios y comandos dinámicamente
 */
class PluginRegistry {
  constructor() {
    this.plugins = new Map(); // pluginId -> plugin config
    this.panelPlugins = new Map(); // panelId -> panel plugin
    this.servicePlugins = new Map(); // serviceId -> service plugin
    this.commandPlugins = new Map(); // commandId -> command plugin
    this.isDebugMode = false;
  }

  /**
   * Registrar un plugin
   */
  registerPlugin(pluginConfig) {
    const { id, name, type, version = '1.0.0' } = pluginConfig;

    if (!id || !name || !type) {
      throw new Error('Plugin debe tener id, name y type');
    }

    if (this.plugins.has(id)) {
      console.warn(`⚠️ Plugin ${id} ya está registrado, sobrescribiendo...`);
    }

    const plugin = {
      ...pluginConfig,
      registeredAt: Date.now(),
      status: 'registered'
    };

    this.plugins.set(id, plugin);

    // Registrar según el tipo
    switch (type) {
      case 'panel':
        this._registerPanelPlugin(plugin);
        break;
      case 'service':
        this._registerServicePlugin(plugin);
        break;
      case 'command':
        this._registerCommandPlugin(plugin);
        break;
      default:
        console.warn(`⚠️ Tipo de plugin no reconocido: ${type}`);
    }

    eventBus.emit('plugin:registered', { plugin });

    if (this.isDebugMode) {
      console.log(`🔌 Plugin registrado: ${id} (${type})`, plugin);
    }

    return plugin;
  }

  /**
   * Registrar plugin de panel
   */
  _registerPanelPlugin(plugin) {
    const { id, component, icon, priority = 0, disabled = false } = plugin;

    if (!component) {
      throw new Error('Panel plugin debe tener componente');
    }

    const panelConfig = {
      id,
      name: plugin.name,
      icon,
      component,
      disabled,
      priority,
      showCount: plugin.showCount || false,
      actions: plugin.actions || [],
      plugin: true
    };

    this.panelPlugins.set(id, panelConfig);
    eventBus.emit('devpanel:register-panel', panelConfig);
  }

  /**
   * Registrar plugin de servicio
   */
  _registerServicePlugin(plugin) {
    const { id, service } = plugin;

    if (!service) {
      throw new Error('Service plugin debe tener instancia de servicio');
    }

    this.servicePlugins.set(id, {
      ...plugin,
      service
    });

    eventBus.emit('service:registered', { pluginId: id, service });
  }

  /**
   * Registrar plugin de comando
   */
  _registerCommandPlugin(plugin) {
    const { id, command, handler } = plugin;

    if (!command || !handler) {
      throw new Error('Command plugin debe tener command y handler');
    }

    this.commandPlugins.set(id, {
      ...plugin,
      command,
      handler
    });

    eventBus.emit('command:registered', { pluginId: id, command });
  }

  /**
   * Desregistrar plugin
   */
  unregisterPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`⚠️ Plugin ${pluginId} no está registrado`);
      return false;
    }

    // Desregistrar según el tipo
    switch (plugin.type) {
      case 'panel':
        this.panelPlugins.delete(pluginId);
        eventBus.emit('devpanel:unregister-panel', { panelId: pluginId });
        break;
      case 'service':
        this.servicePlugins.delete(pluginId);
        eventBus.emit('service:unregistered', { pluginId });
        break;
      case 'command':
        this.commandPlugins.delete(pluginId);
        eventBus.emit('command:unregistered', { pluginId });
        break;
    }

    this.plugins.delete(pluginId);
    eventBus.emit('plugin:unregistered', { pluginId });

    if (this.isDebugMode) {
      console.log(`🔌 Plugin desregistrado: ${pluginId}`);
    }

    return true;
  }

  /**
   * Obtener plugin por ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  /**
   * Obtener todos los plugins de un tipo
   */
  getPluginsByType(type) {
    const plugins = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.type === type) {
        plugins.push(plugin);
      }
    }
    return plugins;
  }

  /**
   * Obtener todos los paneles registrados
   */
  getPanelPlugins() {
    return Array.from(this.panelPlugins.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Obtener servicio por ID
   */
  getService(serviceId) {
    const servicePlugin = this.servicePlugins.get(serviceId);
    return servicePlugin?.service;
  }

  /**
   * Ejecutar comando
   */
  async executeCommand(commandId, args = {}) {
    const commandPlugin = this.commandPlugins.get(commandId);
    if (!commandPlugin) {
      throw new Error(`Comando ${commandId} no encontrado`);
    }

    try {
      return await commandPlugin.handler(args);
    } catch (error) {
      console.error(`❌ Error ejecutando comando ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del registry
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      panelPlugins: this.panelPlugins.size,
      servicePlugins: this.servicePlugins.size,
      commandPlugins: this.commandPlugins.size,
      pluginsByType: {
        panel: this.getPluginsByType('panel').length,
        service: this.getPluginsByType('service').length,
        command: this.getPluginsByType('command').length
      }
    };
  }

  /**
   * Verificar si un plugin está registrado
   */
  hasPlugin(pluginId) {
    return this.plugins.has(pluginId);
  }

  /**
   * Activar/desactivar plugin
   */
  togglePlugin(pluginId, enabled) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.disabled = !enabled;
    
    if (plugin.type === 'panel') {
      const panelConfig = this.panelPlugins.get(pluginId);
      if (panelConfig) {
        panelConfig.disabled = !enabled;
        eventBus.emit('devpanel:panel-toggled', { panelId: pluginId, enabled });
      }
    }

    eventBus.emit('plugin:toggled', { pluginId, enabled });
    return true;
  }

  /**
   * Limpiar todos los plugins
   */
  clear() {
    const pluginIds = Array.from(this.plugins.keys());
    
    for (const pluginId of pluginIds) {
      this.unregisterPlugin(pluginId);
    }

    console.log('🧹 PluginRegistry: Todos los plugins limpiados');
  }

  /**
   * Activar/desactivar modo debug
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    console.log(`🔌 PluginRegistry Debug: ${enabled ? 'activado' : 'desactivado'}`);
  }

  /**
   * Exportar configuración de plugins (para persistencia)
   */
  exportConfig() {
    const config = {};
    
    for (const [pluginId, plugin] of this.plugins) {
      config[pluginId] = {
        id: plugin.id,
        name: plugin.name,
        type: plugin.type,
        version: plugin.version,
        disabled: plugin.disabled || false,
        // No exportar componentes/servicios, solo configuración
      };
    }

    return config;
  }

  /**
   * Importar configuración de plugins
   */
  importConfig(config) {
    for (const [pluginId, pluginConfig] of Object.entries(config)) {
      const existingPlugin = this.plugins.get(pluginId);
      if (existingPlugin) {
        // Solo actualizar configuración, no componentes
        existingPlugin.disabled = pluginConfig.disabled;
        this.togglePlugin(pluginId, !pluginConfig.disabled);
      }
    }
  }
}

// Instancia global del Plugin Registry
const pluginRegistry = new PluginRegistry();

export default PluginRegistry;
export { pluginRegistry };