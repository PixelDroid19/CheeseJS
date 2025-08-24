import WebContainerService from './webcontainer-service.js';
import { themeService } from '../services/theme-service.js';
import { i18nService } from '../services/i18n-service.js';
import { configService } from '../services/config-service.js';
import { eventBus } from '../utils/event-bus.js';
import initialFiles from '../utils/initial-files.js';

/**
 * CheeseJS Core - Integrador principal del sistema
 * Conecta todos los servicios y gestiona el ciclo de vida de la aplicación
 */
class CheeseJSCore {
  constructor() {
    this.webContainerService = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this._initStartTime = Date.now();
  }

  /**
   * Inicializar CheeseJS Core
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Realizar inicialización completa
   */
  async _performInitialization() {
    try {
      console.log('🧀 CheeseJS Core: Iniciando inicialización...');
      
      // 1. Inicializar servicios globales
      await this._initializeServices();
      
      // 2. Inicializar núcleo modular
      await this._initializeCore();
      
      // 3. Configurar event listeners
      this._setupEventListeners();
      
      // 4. Inicializar WebContainer y sandbox
      await this._initializeWebContainer();
      
      this.isInitialized = true;
      eventBus.emit('cheesejs:initialized', { 
        timestamp: Date.now(),
        components: this._getComponentStatus()
      });
      
      console.log('🧀 CheeseJS Core: Inicialización completada exitosamente');
      
    } catch (error) {
      console.error('❌ CheeseJS Core: Error durante la inicialización:', error);
      eventBus.emit('cheesejs:initialization-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Inicializar servicios globales
   */
  async _initializeServices() {
    console.log('🔧 Inicializando servicios globales...');
    
    // Configuración
    await configService.initialize();
    console.log('⚙️ Config Service inicializado');
    
    // Internacionalización
    await i18nService.initialize();
    console.log('🌍 i18n Service inicializado');
    
    // Themes
    await themeService.initialize();
    console.log('🎨 Theme Service inicializado');
  }

  /**
   * Inicializar núcleo modular
   */
  async _initializeCore() {
    console.log('🔥 Inicializando núcleo unificado...');
    
    // WebContainer Service (reemplaza a todos los managers)
    this.webContainerService = new WebContainerService();
    console.log('🚀 WebContainer Service creado');
  }

  /**
   * Configurar event listeners
   */
  _setupEventListeners() {
    console.log('📡 Configurando event listeners...');
    
    // Ejecución de código desde Monaco Editor
    eventBus.subscribe('code:execute', async (data) => {
      try {
        console.log('🚀 Ejecutando código desde Monaco Editor...');
        eventBus.emit('execution:started', { code: data.code });
        const result = await this.executeCode(data.code);
        console.log('✅ Código ejecutado exitosamente:', result);
      } catch (error) {
        console.error('❌ Error ejecutando código:', error);
        eventBus.emit('execution:error', { error: error.message });
      }
    });

    // Detener ejecución
    eventBus.subscribe('code:stop', () => {
      console.log('🛑 Deteniendo ejecución...');
      this.stopExecution();
    });

    // Compatibilidad con eventos webcontainer (por si se usan desde otros componentes)
    eventBus.subscribe('webcontainer:execute', async (data) => {
      try {
        await this.executeCode(data.code);
      } catch (error) {
        eventBus.emit('execution:error', { error: error.message });
      }
    });

    eventBus.subscribe('webcontainer:stop', () => {
      this.stopExecution();
    });

    // Instalación de paquetes
    eventBus.subscribe('package:quick-install', async (data) => {
      try {
        await this.installPackage(data.package);
      } catch (error) {
        eventBus.emit('package:install-error', { 
          package: data.package, 
          error: error.message 
        });
      }
    });

    eventBus.subscribe('package:uninstall-requested', async (data) => {
      try {
        await this.uninstallPackage(data.package);
      } catch (error) {
        eventBus.emit('package:uninstall-error', { 
          package: data.package, 
          error: error.message 
        });
      }
    });

    // Gestión de archivos
    eventBus.subscribe('file:write', async (data) => {
      try {
        await this.writeFile(data.path, data.content);
      } catch (error) {
        eventBus.emit('file:write-error', { 
          path: data.path, 
          error: error.message 
        });
      }
    });

    eventBus.subscribe('file:read', async (data) => {
      try {
        const content = await this.readFile(data.path);
        eventBus.emit('file:read-success', { 
          path: data.path, 
          content 
        });
      } catch (error) {
        eventBus.emit('file:read-error', { 
          path: data.path, 
          error: error.message 
        });
      }
    });

    console.log('📡 Event listeners configurados');
  }

  /**
   * Inicializar WebContainer y sandbox
   */
  async _initializeWebContainer() {
    console.log('🚀 Inicializando WebContainer Service...');
    
    try {
      // Inicializar el servicio unificado
      await this.webContainerService.initialize(initialFiles);
      
      // Emitir eventos de compatibilidad
      eventBus.emit('webcontainer:ready', { timestamp: Date.now() });
      eventBus.emit('cheesejs:webcontainer-ready', { 
        timestamp: Date.now(),
        components: this._getComponentStatus()
      });
      
      console.log('🚀 WebContainer Service inicializado completamente');
      
    } catch (error) {
      console.error('❌ Error crítico inicializando WebContainer Service:', error);
      
      eventBus.emit('cheesejs:webcontainer-error', { 
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Ejecutar código JavaScript
   */
  async executeCode(code, options = {}) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.webContainerService.executeCode(code, options);
  }

  /**
   * Detener ejecución actual
   */
  async stopExecution() {
    if (!this.isInitialized) return;
    
    await this.webContainerService.stopExecution();
  }

  /**
   * Instalar paquete npm
   */
  async installPackage(packageName, version = 'latest') {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.webContainerService.installPackage(packageName, version);
  }

  /**
   * Desinstalar paquete npm
   */
  async uninstallPackage(packageName) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.webContainerService.uninstallPackage(packageName);
  }

  /**
   * Listar paquetes instalados
   */
  async listInstalledPackages() {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.webContainerService.listInstalledPackages();
  }

  /**
   * Escribir archivo
   */
  async writeFile(path, content) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    await this.webContainerService.writeFile(path, content);
  }

  /**
   * Leer archivo
   */
  async readFile(path) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.webContainerService.readFile(path);
  }

  /**
   * Obtener estado de los componentes
   */
  _getComponentStatus() {
    return {
      webContainerService: !!this.webContainerService?.isWebContainerReady(),
      sandbox: !!this.webContainerService?.isSandboxInitialized(),
      terminal: !!this.webContainerService?.isTerminalServiceReady(),
      configService: !!configService,
      i18nService: !!i18nService,
      themeService: !!themeService
    };
  }

  /**
   * Obtener estadísticas del sistema
   */
  async getSystemStats() {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    try {
      const [resourceUsage, installedPackages] = await Promise.all([
        this.webContainerService.getResourceUsage(),
        this.webContainerService.listInstalledPackages()
      ]);

      return {
        initialized: true,
        timestamp: Date.now(),
        components: this._getComponentStatus(),
        resourceUsage,
        installedPackages: Array.isArray(installedPackages) ? 
          installedPackages.length : 
          Object.keys(installedPackages || {}).length,
        uptime: Date.now() - this._initStartTime
      };
    } catch (error) {
      return {
        initialized: true,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Reiniciar sandbox
   */
  async resetSandbox() {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    console.log('🔄 Reiniciando sandbox...');
    
    await this.webContainerService.resetSandbox();
    
    console.log('🔄 Sandbox reiniciado');
  }

  /**
   * Destruir instancia y limpiar recursos
   */
  async destroy() {
    if (!this.isInitialized) return;

    console.log('🧹 Destruyendo CheeseJS Core...');
    
    try {
      // Destruir servicio unificado
      if (this.webContainerService) {
        await this.webContainerService.destroy();
      }
      
      // Limpiar event listeners
      eventBus.clear();
      
      this.isInitialized = false;
      console.log('🧹 CheeseJS Core destruido');
      
    } catch (error) {
      console.error('❌ Error al destruir CheeseJS Core:', error);
    }
  }

  /**
   * Verificar si está inicializado
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Obtener instancias de componentes (para debugging y compatibilidad)
   */
  getComponents() {
    return {
      webContainerService: this.webContainerService,
      // Para compatibilidad con hook useTerminal
      terminalManager: this.webContainerService
    };
  }
}

// Instancia global de CheeseJS Core
const cheeseJSCore = new CheeseJSCore();

export default CheeseJSCore;
export { cheeseJSCore };