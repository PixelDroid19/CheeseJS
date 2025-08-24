import WebContainerManager from './webcontainer-manager.js';
import PackageManager from './package-manager.js';
import CodeExecutor from './code-executor.js';
import SandboxManager from './sandbox-manager.js';
import TerminalManager from './terminal-manager.js';
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
    this.webContainerManager = null;
    this.packageManager = null;
    this.codeExecutor = null;
    this.sandboxManager = null;
    this.terminalManager = null;
    this.isInitialized = false;
    this.initializationPromise = null;
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
    console.log('🔥 Inicializando núcleo modular...');
    
    // WebContainer Manager
    this.webContainerManager = new WebContainerManager();
    console.log('📦 WebContainer Manager creado');
    
    // Package Manager
    this.packageManager = new PackageManager(this.webContainerManager);
    console.log('📚 Package Manager creado');
    
    // Code Executor
    this.codeExecutor = new CodeExecutor(this.webContainerManager);
    console.log('⚡ Code Executor creado');
    
    // Sandbox Manager
    this.sandboxManager = new SandboxManager(this.webContainerManager);
    console.log('🏗️ Sandbox Manager creado');
    
    // Terminal Manager
    this.terminalManager = new TerminalManager(this.webContainerManager);
    console.log('🖥️ Terminal Manager creado');
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
    console.log('🚀 Inicializando WebContainer...');
    
    try {
      // Verificar soporte antes de inicializar
      if (typeof window !== 'undefined') {
        console.log('🔍 Verificando soporte de WebContainer...');
        console.log('- User Agent:', navigator.userAgent);
        console.log('- Headers COOP/COEP configurados en Vite');
        
        // Verificar si estamos en un contexto seguro
        if (!window.isSecureContext) {
          console.warn('⚠️ Advertencia: No estamos en un contexto seguro (HTTPS)');
        }
      }
      
      // Inicializar WebContainer
      await this.webContainerManager.boot();
      
      // Emitir evento de WebContainer listo antes de montar archivos
      eventBus.emit('webcontainer:ready', { timestamp: Date.now() });
      console.log('✅ WebContainer inicializado exitosamente');
      
      // Inicializar sandbox
      console.log('🏗️ Inicializando sandbox...');
      await this.sandboxManager.initialize(initialFiles);
      console.log('✅ Sandbox inicializado exitosamente');
      
      // Configurar monitoreo de recursos
      this.sandboxManager.startResourceMonitoring();
      
      console.log('🚀 WebContainer y sandbox inicializados completamente');
      
      // Emitir evento final de inicialización completa
      eventBus.emit('cheesejs:webcontainer-ready', { 
        timestamp: Date.now(),
        components: this._getComponentStatus()
      });
      
    } catch (error) {
      console.error('❌ Error crítico inicializando WebContainer:', error);
      
      // Emitir evento de error para que la UI pueda mostrar un mensaje
      eventBus.emit('cheesejs:webcontainer-error', { 
        error: error.message,
        timestamp: Date.now()
      });
      
      // Información de diagnóstico
      console.error('🔍 Información de diagnóstico:');
      console.error('- Error:', error.message);
      console.error('- Stack:', error.stack);
      
      if (typeof window !== 'undefined') {
        console.error('- Contexto seguro:', window.isSecureContext);
        console.error('- Protocolo:', window.location.protocol);
        console.error('- Host:', window.location.host);
      }
      
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

    return await this.codeExecutor.executeCode(code, options);
  }

  /**
   * Detener ejecución actual
   */
  async stopExecution() {
    if (!this.isInitialized) return;
    
    await this.codeExecutor.stopExecution();
  }

  /**
   * Instalar paquete npm
   */
  async installPackage(packageName, version = 'latest') {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.packageManager.installPackage(packageName, version);
  }

  /**
   * Desinstalar paquete npm
   */
  async uninstallPackage(packageName) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.packageManager.uninstallPackage(packageName);
  }

  /**
   * Listar paquetes instalados
   */
  async listInstalledPackages() {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.packageManager.listInstalled();
  }

  /**
   * Escribir archivo
   */
  async writeFile(path, content) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    await this.webContainerManager.writeFile(path, content);
  }

  /**
   * Leer archivo
   */
  async readFile(path) {
    if (!this.isInitialized) {
      throw new Error('CheeseJS Core no está inicializado');
    }

    return await this.webContainerManager.readFile(path);
  }

  /**
   * Obtener estado de los componentes
   */
  _getComponentStatus() {
    return {
      webContainerManager: !!this.webContainerManager?.isWebContainerReady(),
      packageManager: !!this.packageManager,
      codeExecutor: !!this.codeExecutor,
      sandboxManager: !!this.sandboxManager?.isSandboxInitialized(),
      terminalManager: !!this.terminalManager?.isTerminalReady(),
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
        this.sandboxManager.getResourceUsage(),
        this.packageManager.listInstalled()
      ]);

      return {
        initialized: true,
        timestamp: Date.now(),
        components: this._getComponentStatus(),
        resourceUsage,
        installedPackages: Array.isArray(installedPackages) ? 
          installedPackages.length : 
          Object.keys(installedPackages || {}).length,
        uptime: Date.now() - (this._initStartTime || Date.now())
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
    
    // Detener ejecución actual
    await this.stopExecution();
    
    // Reiniciar sandbox
    await this.sandboxManager.reset();
    
    // Limpiar lista de paquetes instalados
    this.packageManager.clearInstalledPackages();
    
    eventBus.emit('sandbox:reset', { timestamp: Date.now() });
    console.log('🔄 Sandbox reiniciado');
  }

  /**
   * Destruir instancia y limpiar recursos
   */
  async destroy() {
    if (!this.isInitialized) return;

    console.log('🧹 Destruyendo CheeseJS Core...');
    
    try {
      // Detener ejecución
      await this.stopExecution();
      
      // Limpiar sandbox
      if (this.sandboxManager) {
        this.sandboxManager.destroy();
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
   * Obtener instancias de componentes (para debugging)
   */
  getComponents() {
    return {
      webContainerManager: this.webContainerManager,
      packageManager: this.packageManager,
      codeExecutor: this.codeExecutor,
      sandboxManager: this.sandboxManager,
      terminalManager: this.terminalManager
    };
  }
}

// Instancia global de CheeseJS Core
const cheeseJSCore = new CheeseJSCore();

export default CheeseJSCore;
export { cheeseJSCore };