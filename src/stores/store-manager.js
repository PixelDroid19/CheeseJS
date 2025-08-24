/**
 * Store Manager - Coordinador central de todos los stores de Zustand
 * Maneja inicialización, sincronización y coordinación entre stores
 */

import { useAppStore } from './app-store.js';
import { useThemeStore } from './theme-store.js';
import { useUIStore } from './ui-store.js';
import { useTerminalStore } from './terminal-store.js';
// import { useEditorStore } from './editor-store.js';
// import { useWebContainerStore } from './webcontainer-store.js';
// import { useDevPanelStore } from './dev-panel-store.js';

import { LegacyAdapterManager } from './adapters/legacy-adapters.js';

/**
 * Store Manager centralizado
 */
export class StoreManager {
  static isInitialized = false;
  static initializationPromise = null;
  static stores = new Map();
  static subscribers = new Map();

  /**
   * Registrar stores disponibles
   */
  static registerStores() {
    this.stores.set('app', useAppStore);
    this.stores.set('theme', useThemeStore);
    this.stores.set('ui', useUIStore);
    this.stores.set('terminal', useTerminalStore);
    // this.stores.set('editor', useEditorStore);
    // this.stores.set('webContainer', useWebContainerStore);
    // this.stores.set('devPanel', useDevPanelStore);
  }

  /**
   * Inicializar todos los stores y el sistema
   */
  static async initialize() {
    // Evitar múltiples inicializaciones simultáneas
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Realizar la inicialización actual
   */
  static async _performInitialization() {
    try {
      console.log('🏪 Inicializando Store Manager...');

      // Registrar stores
      this.registerStores();

      // Fase 1: Inicializar stores básicos
      await this.initializeBasicStores();

      // Fase 2: Conectar adaptadores legacy
      await this.connectLegacyAdapters();

      // Fase 3: Inicializar stores dependientes
      await this.initializeDependentStores();

      // Fase 4: Configurar coordinación entre stores
      this.setupInterStoreCoordination();

      // Fase 5: Configurar DevTools en desarrollo
      this.setupDevTools();

      this.isInitialized = true;
      console.log('✅ Store Manager inicializado correctamente');

      // Emitir evento de inicialización completa
      this.emitInitializationComplete();

    } catch (error) {
      console.error('❌ Error inicializando Store Manager:', error);
      throw error;
    }
  }

  /**
   * Inicializar stores básicos (sin dependencias)
   */
  static async initializeBasicStores() {
    console.log('📦 Inicializando stores básicos...');

    try {
      // Inicializar theme store
      const themeStore = useThemeStore.getState();
      await themeStore.initialize();

      // Inicializar app store
      const appStore = useAppStore.getState();
      await appStore.initialize();

      console.log('✅ Stores básicos inicializados');
    } catch (error) {
      console.error('❌ Error inicializando stores básicos:', error);
      throw error;
    }
  }

  /**
   * Conectar adaptadores legacy
   */
  static async connectLegacyAdapters() {
    console.log('🔗 Conectando adaptadores legacy...');

    try {
      await LegacyAdapterManager.connectAll();
      console.log('✅ Adaptadores legacy conectados');
    } catch (error) {
      console.error('❌ Error conectando adaptadores legacy:', error);
      // No es crítico, continuar sin adaptadores
    }
  }

  /**
   * Inicializar stores dependientes
   */
  static async initializeDependentStores() {
    console.log('🔧 Inicializando stores dependientes...');

    try {
      // Los stores dependientes se inicializarán cuando sean requeridos
      // por sus hooks correspondientes
      console.log('✅ Stores dependientes configurados');
    } catch (error) {
      console.error('❌ Error inicializando stores dependientes:', error);
      throw error;
    }
  }

  /**
   * Configurar coordinación entre stores
   */
  static setupInterStoreCoordination() {
    console.log('🤝 Configurando coordinación entre stores...');

    try {
      // Coordinación Theme <-> App
      const unsubThemeApp = useThemeStore.subscribe((themeState, prevThemeState) => {
        if (themeState.currentTheme !== prevThemeState.currentTheme) {
          // Actualizar configuración del tema en AppStore
          const appStore = useAppStore.getState();
          appStore.setConfig('general.theme', themeState.currentTheme);
        }
      });

      // Coordinación App <-> UI Layout
      const unsubAppUI = useAppStore.subscribe((appState, prevAppState) => {
        if (appState.config.layout !== prevAppState.config.layout) {
          // Sincronizar configuración de layout con UIStore
          const uiStore = useUIStore.getState();
          const layoutConfig = appState.config.layout;
          
          // Actualizar estado de layout en UIStore si es diferente
          if (uiStore.layout.consoleVisible !== layoutConfig.showConsole) {
            uiStore.toggleConsole();
          }
        }
      });

      // Guardar unsubscribers para cleanup
      this.subscribers.set('theme-app', unsubThemeApp);
      this.subscribers.set('app-ui', unsubAppUI);

      console.log('✅ Coordinación entre stores configurada');
    } catch (error) {
      console.error('❌ Error configurando coordinación:', error);
    }
  }

  /**
   * Configurar DevTools en desarrollo
   */
  static setupDevTools() {
    if (process.env.NODE_ENV !== 'development') return;

    console.log('🛠️ Configurando DevTools...');

    try {
      // Configurar acceso global para debugging
      if (typeof window !== 'undefined') {
        window.__CHEESEJS_STORES__ = {
          app: useAppStore,
          theme: useThemeStore,
          ui: useUIStore,
          terminal: useTerminalStore,
          manager: this
        };

        // Utilidades de debugging
        window.__CHEESEJS_DEBUG__ = {
          getStoreStates: () => {
            const states = {};
            this.stores.forEach((store, name) => {
              states[name] = store.getState();
            });
            return states;
          },
          resetAllStores: () => this.resetAllStores(),
          getConnectionStatus: () => LegacyAdapterManager.getConnectionStatus(),
          reconnectAdapters: () => LegacyAdapterManager.reconnectIfNeeded()
        };

        console.log('🛠️ DevTools configuradas. Usa window.__CHEESEJS_STORES__ y window.__CHEESEJS_DEBUG__');
      }
    } catch (error) {
      console.error('❌ Error configurando DevTools:', error);
    }
  }

  /**
   * Emitir evento de inicialización completa
   */
  static emitInitializationComplete() {
    try {
      // Usar eventBus para compatibilidad legacy
      const { eventBus } = require('../utils/event-bus.js');
      eventBus.emit('store-manager:initialized', {
        timestamp: new Date().toISOString(),
        stores: Array.from(this.stores.keys())
      });
    } catch (error) {
      console.error('❌ Error emitiendo evento de inicialización:', error);
    }
  }

  /**
   * Obtener estado de todos los stores
   */
  static getAllStoreStates() {
    const states = {};
    
    this.stores.forEach((store, name) => {
      try {
        states[name] = store.getState();
      } catch (error) {
        console.error(`❌ Error obteniendo estado de ${name}:`, error);
        states[name] = { error: error.message };
      }
    });

    return states;
  }

  /**
   * Resetear todos los stores
   */
  static resetAllStores() {
    console.log('🔄 Reseteando todos los stores...');

    this.stores.forEach((store, name) => {
      try {
        const state = store.getState();
        if (typeof state.reset === 'function') {
          state.reset();
          console.log(`✅ Store ${name} reseteado`);
        }
      } catch (error) {
        console.error(`❌ Error reseteando store ${name}:`, error);
      }
    });
  }

  /**
   * Validar integridad de stores
   */
  static validateStores() {
    console.log('🔍 Validando integridad de stores...');

    const results = {
      valid: true,
      issues: []
    };

    this.stores.forEach((store, name) => {
      try {
        const state = store.getState();
        
        // Validaciones básicas
        if (!state) {
          results.valid = false;
          results.issues.push(`Store ${name}: Estado nulo`);
        }

        if (typeof state.lastUpdated !== 'string') {
          results.issues.push(`Store ${name}: lastUpdated inválido`);
        }

        // Validaciones específicas por store
        switch (name) {
          case 'app':
            if (typeof state.isInitialized !== 'boolean') {
              results.valid = false;
              results.issues.push(`AppStore: isInitialized inválido`);
            }
            break;

          case 'theme':
            if (!state.currentTheme) {
              results.valid = false;
              results.issues.push(`ThemeStore: currentTheme inválido`);
            }
            break;

          case 'ui':
            if (!Array.isArray(state.modals)) {
              results.valid = false;
              results.issues.push(`UIStore: modals no es array`);
            }
            break;
        }

      } catch (error) {
        results.valid = false;
        results.issues.push(`Store ${name}: Error de validación - ${error.message}`);
      }
    });

    if (results.valid) {
      console.log('✅ Todos los stores son válidos');
    } else {
      console.warn('⚠️ Issues encontrados en stores:', results.issues);
    }

    return results;
  }

  /**
   * Cleanup y desconexión
   */
  static cleanup() {
    console.log('🧹 Limpiando Store Manager...');

    try {
      // Desconectar adaptadores legacy
      LegacyAdapterManager.disconnectAll();

      // Desuscribir coordinación entre stores
      this.subscribers.forEach((unsubscriber, name) => {
        try {
          unsubscriber();
          console.log(`✅ Desuscrito: ${name}`);
        } catch (error) {
          console.error(`❌ Error desuscribiendo ${name}:`, error);
        }
      });

      this.subscribers.clear();

      // Limpiar referencias globales
      if (typeof window !== 'undefined') {
        delete window.__CHEESEJS_STORES__;
        delete window.__CHEESEJS_DEBUG__;
      }

      this.isInitialized = false;
      this.initializationPromise = null;

      console.log('✅ Store Manager limpiado');
    } catch (error) {
      console.error('❌ Error en cleanup de Store Manager:', error);
    }
  }

  /**
   * Verificar si está inicializado
   */
  static isReady() {
    return this.isInitialized && !this.initializationPromise;
  }

  /**
   * Obtener información de estado del manager
   */
  static getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: !!this.initializationPromise && !this.isInitialized,
      storeCount: this.stores.size,
      subscriberCount: this.subscribers.size,
      legacyAdapters: LegacyAdapterManager.getConnectionStatus()
    };
  }
}

export default StoreManager;