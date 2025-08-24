/**
 * Adaptadores para servicios legacy durante la migración gradual
 * Permiten la coexistencia de Zustand stores con servicios singleton existentes
 */

import { useAppStore } from '../app-store.js';
import { useThemeStore } from '../theme-store.js';
import { useUIStore } from '../ui-store.js';
import { useTerminalStore } from '../terminal-store.js';
import { eventBus } from '../../utils/event-bus.js';
import { themeService } from '../../services/theme-service.js';
import { configService } from '../../services/config-service.js';
import { i18nService } from '../../services/i18n-service.js';

/**
 * Adaptador para Theme Service
 * Sincroniza cambios entre ThemeStore y ThemeService legacy
 */
export class ThemeServiceAdapter {
  static isConnected = false;

  static connect() {
    if (this.isConnected) return;

    const themeStore = useThemeStore.getState();

    // Escuchar cambios del servicio legacy y sincronizar al store
    const unsubscribeThemeChanged = eventBus.subscribe('theme:changed', (data) => {
      const currentTheme = themeStore.currentTheme;
      if (currentTheme !== data.to) {
        themeStore.setTheme(data.to);
      }
    });

    // Escuchar cambios del store y sincronizar al servicio
    const unsubscribeStore = useThemeStore.subscribe((state, prevState) => {
      if (state.currentTheme !== prevState.currentTheme) {
        // Solo sincronizar si el cambio no vino del servicio
        if (themeService.getCurrentTheme() !== state.currentTheme) {
          themeService.setTheme(state.currentTheme).catch(error => {
            console.error('Error sincronizando tema al servicio legacy:', error);
          });
        }
      }
    });

    this.isConnected = true;
    console.log('🔗 ThemeServiceAdapter conectado');

    // Retornar función de cleanup
    return () => {
      unsubscribeThemeChanged();
      unsubscribeStore();
      this.isConnected = false;
    };
  }

  /**
   * Sincronizar estado inicial
   */
  static async syncInitialState() {
    try {
      const themeStore = useThemeStore.getState();
      
      if (!themeService.isInitialized) {
        await themeService.initialize();
      }

      const currentTheme = themeService.getCurrentTheme();
      const availableThemes = themeService.getAvailableThemes();
      const themeVariables = themeService.getCurrentThemeVariables();

      // Actualizar store con datos del servicio
      themeStore.setTheme(currentTheme);
      
      console.log('🔄 ThemeServiceAdapter sincronizado:', currentTheme);
    } catch (error) {
      console.error('❌ Error sincronizando ThemeServiceAdapter:', error);
    }
  }
}

/**
 * Adaptador para Config Service
 * Sincroniza cambios entre AppStore y ConfigService legacy
 */
export class ConfigServiceAdapter {
  static isConnected = false;

  static connect() {
    if (this.isConnected) return;

    const appStore = useAppStore.getState();

    // Escuchar cambios del servicio legacy
    const unsubscribeConfigChanged = eventBus.subscribe('config:changed', (data) => {
      const { key, newValue } = data;
      appStore.setConfig(key, newValue);
    });

    // Escuchar cambios del store y sincronizar al servicio
    const unsubscribeStore = useAppStore.subscribe((state, prevState) => {
      // Detectar cambios en la configuración
      if (state.config !== prevState.config) {
        this.syncConfigChanges(state.config, prevState.config);
      }
    });

    this.isConnected = true;
    console.log('🔗 ConfigServiceAdapter conectado');

    return () => {
      unsubscribeConfigChanged();
      unsubscribeStore();
      this.isConnected = false;
    };
  }

  /**
   * Sincronizar cambios específicos de configuración
   */
  static syncConfigChanges(newConfig, prevConfig) {
    try {
      // Comparar configuraciones recursivamente
      this.deepCompareAndSync('', newConfig, prevConfig);
    } catch (error) {
      console.error('❌ Error sincronizando configuración:', error);
    }
  }

  /**
   * Comparación profunda y sincronización
   */
  static deepCompareAndSync(path, newObj, prevObj) {
    for (const key in newObj) {
      const newPath = path ? `${path}.${key}` : key;
      const newValue = newObj[key];
      const prevValue = prevObj ? prevObj[key] : undefined;

      if (typeof newValue === 'object' && newValue !== null) {
        this.deepCompareAndSync(newPath, newValue, prevValue || {});
      } else if (newValue !== prevValue) {
        // Sincronizar al servicio legacy
        configService.set(newPath, newValue);
      }
    }
  }

  /**
   * Sincronizar estado inicial
   */
  static async syncInitialState() {
    try {
      const appStore = useAppStore.getState();
      
      if (!configService.isInitialized) {
        await configService.initialize();
      }

      // Cargar configuración desde el servicio legacy
      const layoutConfig = {
        showConsole: configService.get('layout.showConsole', true),
        consoleHeight: configService.get('layout.consoleHeight', 300),
        toolbarCollapsed: configService.get('layout.toolbarCollapsed', false),
        sidebarWidth: configService.get('layout.sidebarWidth', 250),
        showSidebar: configService.get('layout.showSidebar', true)
      };

      const editorConfig = {
        fontSize: configService.get('editor.fontSize', 14),
        tabSize: configService.get('editor.tabSize', 2),
        wordWrap: configService.get('editor.wordWrap', true),
        theme: configService.get('editor.theme', 'vs-dark'),
        language: configService.get('editor.language', 'javascript')
      };

      // Actualizar store
      Object.keys(layoutConfig).forEach(key => {
        appStore.setConfig(`layout.${key}`, layoutConfig[key]);
      });

      Object.keys(editorConfig).forEach(key => {
        appStore.setConfig(`editor.${key}`, editorConfig[key]);
      });

      console.log('🔄 ConfigServiceAdapter sincronizado');
    } catch (error) {
      console.error('❌ Error sincronizando ConfigServiceAdapter:', error);
    }
  }
}

/**
 * Adaptador para UI Events
 * Traduce eventos del EventBus a acciones de UIStore
 */
export class UIEventAdapter {
  static isConnected = false;

  static connect() {
    if (this.isConnected) return;

    const uiStore = useUIStore.getState();

    // Mapear eventos legacy a acciones del store
    const eventMappings = [
      {
        event: 'modal:open',
        action: (data) => uiStore.openModal(data)
      },
      {
        event: 'modal:close',
        action: (data) => uiStore.closeModal(data?.id)
      },
      {
        event: 'modal:close-all',
        action: () => uiStore.closeAllModals()
      },
      {
        event: 'settings:dialog-requested',
        action: () => uiStore.openModal({ 
          type: 'settings', 
          title: 'Configuración', 
          size: 'large' 
        })
      },
      {
        event: 'package:install-dialog-requested',
        action: () => uiStore.openModal({ 
          type: 'packages', 
          title: 'Gestión de Paquetes', 
          size: 'medium' 
        })
      },
      {
        event: 'help:dialog-requested',
        action: () => uiStore.openModal({ 
          type: 'help', 
          title: 'Ayuda', 
          size: 'large' 
        })
      },
      {
        event: 'console:toggle-requested',
        action: () => uiStore.toggleConsole()
      },
      {
        event: 'layout:sidebar-toggle-requested',
        action: () => uiStore.toggleSidebar()
      }
    ];

    // Suscribirse a todos los eventos
    const unsubscribers = eventMappings.map(mapping => {
      return eventBus.subscribe(mapping.event, mapping.action);
    });

    // Emitir eventos cuando cambien los states del store
    const unsubscribeStore = useUIStore.subscribe((state, prevState) => {
      // Emitir eventos de layout si cambian
      if (state.layout.sidebarCollapsed !== prevState.layout.sidebarCollapsed) {
        eventBus.emit('layout:sidebar-toggled', { 
          collapsed: state.layout.sidebarCollapsed 
        });
      }

      if (state.layout.consoleVisible !== prevState.layout.consoleVisible) {
        eventBus.emit('layout:console-toggled', { 
          visible: state.layout.consoleVisible 
        });
      }

      // Emitir eventos de modal
      if (state.modals.length !== prevState.modals.length) {
        if (state.modals.length > prevState.modals.length) {
          const newModal = state.modals[state.modals.length - 1];
          eventBus.emit('modal:opened', { modal: newModal });
        } else if (state.modals.length < prevState.modals.length) {
          eventBus.emit('modal:closed', {});
        }
      }
    });

    this.isConnected = true;
    console.log('🔗 UIEventAdapter conectado');

    return () => {
      unsubscribers.forEach(unsub => unsub());
      unsubscribeStore();
      this.isConnected = false;
    };
  }
}

/**
 * Adaptador maestro que coordina todos los adaptadores
 */
export class LegacyAdapterManager {
  static adapters = [
    ThemeServiceAdapter,
    ConfigServiceAdapter,
    UIEventAdapter
  ];

  static unsubscribers = [];

  /**
   * Conectar todos los adaptadores
   */
  static async connectAll() {
    try {
      console.log('🔗 Conectando adaptadores legacy...');

      // Conectar cada adaptador
      for (const Adapter of this.adapters) {
        const unsubscriber = Adapter.connect();
        if (unsubscriber) {
          this.unsubscribers.push(unsubscriber);
        }
      }

      // Sincronizar estados iniciales
      await this.syncInitialStates();

      console.log('✅ Todos los adaptadores legacy conectados');
    } catch (error) {
      console.error('❌ Error conectando adaptadores legacy:', error);
    }
  }

  /**
   * Sincronizar estados iniciales de todos los adaptadores
   */
  static async syncInitialStates() {
    try {
      await Promise.all([
        ThemeServiceAdapter.syncInitialState(),
        ConfigServiceAdapter.syncInitialState()
      ]);

      console.log('🔄 Estados iniciales sincronizados');
    } catch (error) {
      console.error('❌ Error sincronizando estados iniciales:', error);
    }
  }

  /**
   * Desconectar todos los adaptadores
   */
  static disconnectAll() {
    try {
      this.unsubscribers.forEach(unsubscriber => {
        if (typeof unsubscriber === 'function') {
          unsubscriber();
        }
      });

      this.unsubscribers = [];
      
      // Marcar adaptadores como desconectados
      this.adapters.forEach(Adapter => {
        Adapter.isConnected = false;
      });

      console.log('🔌 Adaptadores legacy desconectados');
    } catch (error) {
      console.error('❌ Error desconectando adaptadores:', error);
    }
  }

  /**
   * Verificar estado de conexión
   */
  static getConnectionStatus() {
    return {
      connected: this.adapters.every(Adapter => Adapter.isConnected),
      adapters: this.adapters.map(Adapter => ({
        name: Adapter.name,
        connected: Adapter.isConnected
      }))
    };
  }

  /**
   * Reconectar adaptadores si es necesario
   */
  static async reconnectIfNeeded() {
    const status = this.getConnectionStatus();
    
    if (!status.connected) {
      console.log('🔄 Reconectando adaptadores legacy...');
      await this.connectAll();
    }
  }
}

export default LegacyAdapterManager;