import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';
import { configService } from '../services/config-service.js';
import { cheeseJSCore } from '../core/cheesejs-core.js';

/**
 * AppStore - Estado global de la aplicación
 * Maneja inicialización, configuración global, y estado general de la app
 */
const initialState = createInitialState({
  // Estado de inicialización
  isInitialized: false,
  isInitializing: false,
  initializationProgress: 0,
  initializationStep: '',
  
  // Configuración global
  config: {
    layout: {
      showConsole: true,
      consoleHeight: 300,
      toolbarCollapsed: false,
      sidebarWidth: 250,
      showSidebar: true
    },
    editor: {
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      theme: 'vs-dark',
      language: 'javascript'
    },
    general: {
      language: 'es',
      theme: 'light',
      autoSave: true,
      autoSaveInterval: 5000
    },
    console: {
      maxLines: 1000,
      showTimestamp: true,
      clearOnRun: false
    },
    webcontainer: {
      timeout: 30000,
      enableNodemon: true,
      autoInstallTypes: true
    }
  },
  
  // Estado de servicios
  servicesStatus: {
    configService: 'idle',
    themeService: 'idle',
    i18nService: 'idle',
    webContainerService: 'idle',
    cheeseJSCore: 'idle'
  },
  
  // Información de la aplicación
  appInfo: {
    name: 'CheeseJS',
    version: '1.0.0',
    buildDate: null,
    environment: 'development'
  }
});

export const useAppStore = createBaseStore(
  'AppStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar la aplicación
     */
    initialize: async () => {
      const currentState = get();
      if (currentState.isInitialized || currentState.isInitializing) {
        return;
      }

      try {
        set({
          isInitializing: true,
          initializationStep: 'Iniciando servicios...',
          initializationProgress: 0
        });

        // Paso 1: Inicializar ConfigService
        set({
          initializationStep: 'Cargando configuración...',
          initializationProgress: 20
        });

        if (!configService.isInitialized) {
          await configService.initialize();
        }

        // Cargar configuración inicial
        const config = {
          layout: {
            showConsole: configService.get('layout.showConsole', true),
            consoleHeight: configService.get('layout.consoleHeight', 300),
            toolbarCollapsed: configService.get('layout.toolbarCollapsed', false),
            sidebarWidth: configService.get('layout.sidebarWidth', 250),
            showSidebar: configService.get('layout.showSidebar', true)
          },
          editor: {
            fontSize: configService.get('editor.fontSize', 14),
            tabSize: configService.get('editor.tabSize', 2),
            wordWrap: configService.get('editor.wordWrap', true),
            theme: configService.get('editor.theme', 'vs-dark'),
            language: configService.get('editor.language', 'javascript')
          },
          general: {
            language: configService.get('general.language', 'es'),
            theme: configService.get('general.theme', 'light'),
            autoSave: configService.get('general.autoSave', true),
            autoSaveInterval: configService.get('general.autoSaveInterval', 5000)
          },
          console: {
            maxLines: configService.get('console.maxLines', 1000),
            showTimestamp: configService.get('console.timestamp', true),
            clearOnRun: configService.get('console.clearOnRun', false)
          },
          webcontainer: {
            timeout: configService.get('webcontainer.timeout', 30000),
            enableNodemon: configService.get('webcontainer.enableNodemon', true),
            autoInstallTypes: configService.get('webcontainer.autoInstallTypes', true)
          }
        };

        set({
          config,
          servicesStatus: { ...currentState.servicesStatus, configService: 'ready' },
          initializationProgress: 40
        });

        // Paso 2: Inicializar CheeseJS Core
        set({
          initializationStep: 'Inicializando entorno de ejecución...',
          initializationProgress: 60
        });

        if (!cheeseJSCore.isReady()) {
          await cheeseJSCore.initialize();
        }

        set({
          servicesStatus: { ...get().servicesStatus, cheeseJSCore: 'ready' },
          initializationProgress: 80
        });

        // Paso 3: Finalizar inicialización
        set({
          initializationStep: 'Finalizando...',
          initializationProgress: 100
        });

        // Esperar un momento para que se vea la barra de progreso completa
        await new Promise(resolve => setTimeout(resolve, 500));

        set({
          isInitialized: true,
          isInitializing: false,
          initializationStep: 'Completado',
          lastUpdated: new Date().toISOString()
        });

        console.log('🚀 CheeseJS inicializado correctamente');

      } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        set({
          isInitializing: false,
          error: error.message,
          initializationStep: 'Error en inicialización'
        });
      }
    },

    /**
     * Actualizar configuración
     */
    setConfig: (path, value) => {
      const currentConfig = get().config;
      const keys = path.split('.');
      
      // Crear una copia profunda del config actual
      const newConfig = JSON.parse(JSON.stringify(currentConfig));
      
      // Navegar hasta la propiedad a actualizar
      let target = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }
      
      // Establecer el nuevo valor
      target[keys[keys.length - 1]] = value;
      
      // Actualizar el store
      set({ config: newConfig, lastUpdated: new Date().toISOString() });
      
      // Persistir en configService
      try {
        configService.set(path, value);
      } catch (error) {
        console.error('❌ Error persistiendo configuración:', error);
      }
    },

    /**
     * Obtener valor de configuración
     */
    getConfig: (path, defaultValue = null) => {
      const config = get().config;
      const keys = path.split('.');
      
      let value = config;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }
      
      return value;
    },

    /**
     * Actualizar estado de un servicio
     */
    updateServiceStatus: (serviceName, status) => {
      const currentStatus = get().servicesStatus;
      set({
        servicesStatus: {
          ...currentStatus,
          [serviceName]: status
        },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Reiniciar la aplicación
     */
    restart: async () => {
      try {
        set({
          isInitialized: false,
          isInitializing: false,
          initializationProgress: 0,
          initializationStep: '',
          error: null
        });

        await get().initialize();
      } catch (error) {
        console.error('❌ Error reiniciando aplicación:', error);
        set({ error: error.message });
      }
    },

    /**
     * Verificar si todos los servicios están listos
     */
    areServicesReady: () => {
      const { servicesStatus } = get();
      return Object.values(servicesStatus).every(status => 
        status === 'ready' || status === 'idle'
      );
    },

    /**
     * Obtener información de la aplicación
     */
    getAppInfo: () => {
      return get().appInfo;
    },

    /**
     * Actualizar información de la aplicación
     */
    updateAppInfo: (info) => {
      const currentInfo = get().appInfo;
      set({
        appInfo: { ...currentInfo, ...info },
        lastUpdated: new Date().toISOString()
      });
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-app-store',
    devtools: true,
    // Solo persistir configuración, no estado de inicialización
    partialize: (state) => ({
      config: state.config,
      appInfo: state.appInfo
    })
  }
);