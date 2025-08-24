import { WebContainer } from '@webcontainer/api';
import { eventBus } from '../utils/event-bus.js';

/**
 * WebContainer Service - Servicio unificado para gestión de WebContainer
 * Consolida funcionalidad de WebContainerManager, PackageManager, CodeExecutor, SandboxManager y TerminalManager
 */
class WebContainerService {
  constructor() {
    // Estado principal
    this.webcontainerInstance = null;
    this.isReady = false;
    this.isInitialized = false;
    
    // Estado de ejecución
    this.isExecuting = false;
    this.currentProcess = null;
    
    // Estado de packages
    this.installedPackages = new Set();
    
    // Estado del sandbox
    this.isSandboxReady = false;
    this.defaultFiles = null;
    
    // Estado del terminal
    this.isTerminalReady = false;
    this.terminalProcess = null;
    
    // Configuración
    this.config = {
      executionTimeout: 30000,
      workdirName: 'cheesejs-workspace'
    };
  }

  /**
   * Inicializar WebContainer Service
   */
  async initialize(initialFiles = null) {
    if (this.isInitialized) {
      return this.webcontainerInstance;
    }

    try {
      console.log('🧀 WebContainerService: Iniciando inicialización...');
      
      // 1. Verificaciones previas
      await this._performPreChecks();
      
      // 2. Inicializar WebContainer
      await this._bootWebContainer();
      
      // 3. Inicializar sandbox si se proporcionan archivos
      if (initialFiles) {
        await this._initializeSandbox(initialFiles);
      }
      
      // 4. Configurar terminal
      await this._initializeTerminal();
      
      this.isInitialized = true;
      
      eventBus.emit('webcontainer-service:ready', {
        timestamp: Date.now(),
        capabilities: this._getCapabilities()
      });
      
      console.log('✅ WebContainerService inicializado exitosamente');
      return this.webcontainerInstance;
      
    } catch (error) {
      console.error('❌ Error en WebContainerService:', error);
      eventBus.emit('webcontainer-service:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verificaciones previas
   */
  async _performPreChecks() {
    console.log('🔍 Realizando verificaciones previas...');
    
    if (typeof WebContainer === 'undefined') {
      throw new Error('WebContainer no está disponible');
    }
    
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'N/A';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    
    if (!isSecure && !isLocalhost) {
      throw new Error(`WebContainer requiere contexto seguro (HTTPS) o localhost`);
    }
    
    console.log('✅ Verificaciones completadas');
  }

  /**
   * Inicializar WebContainer
   */
  async _bootWebContainer() {
    console.log('🚀 Inicializando WebContainer...');
    
    const config = {
      coep: 'require-corp',
      workdirName: this.config.workdirName
    };
    
    this.webcontainerInstance = await WebContainer.boot(config);
    this.isReady = true;
    
    console.log('✅ WebContainer listo');
  }

  /**
   * Inicializar sandbox
   */
  async _initializeSandbox(files) {
    console.log('🏗️ Inicializando sandbox...');
    
    this.defaultFiles = files;
    await this.webcontainerInstance.mount(files);
    this.isSandboxReady = true;
    
    // Inicializar npm después del montaje
    await this._initializeNpm();
    
    console.log('✅ Sandbox inicializado');
  }

  /**
   * Inicializar npm
   */
  async _initializeNpm() {
    try {
      console.log('📦 Inicializando npm...');
      
      const npmVersionProcess = await this.spawn('npm', ['--version']);
      const npmVersionExit = await npmVersionProcess.exit;
      
      if (npmVersionExit === 0) {
        console.log('📦 npm disponible y listo');
        
        // Instalar dependencias si existe package.json
        try {
          const packageContent = await this.readFile('package.json');
          const packageJson = JSON.parse(packageContent);
          
          if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
            console.log('📦 Instalando dependencias iniciales...');
            const installProcess = await this.spawn('npm', ['install']);
            await installProcess.exit;
            console.log('📦 Dependencias instaladas');
          }
        } catch (e) {
          console.log('📦 No hay dependencias iniciales que instalar');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando npm:', error.message);
    }
  }

  /**
   * Inicializar terminal
   */
  async _initializeTerminal() {
    console.log('🖥️ Inicializando terminal...');
    this.isTerminalReady = true;
    console.log('✅ Terminal listo');
  }

  // ==================== CÓDIGO EXECUTION ====================

  /**
   * Ejecutar código JavaScript
   */
  async executeCode(code, options = {}) {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    if (this.isExecuting) {
      throw new Error('Ya hay código ejecutándose');
    }

    const { filename = 'index.js', timeout = this.config.executionTimeout } = options;
    
    this.isExecuting = true;
    eventBus.emit('execution:started', { filename, code });

    try {
      const wrappedCode = this._wrapCodeWithConsoleInterception(code);
      await this.writeFile(filename, wrappedCode);
      
      const result = await this._runNodeScript(filename);
      
      eventBus.emit('execution:completed', { filename, result });
      return result;
      
    } catch (error) {
      eventBus.emit('execution:error', { filename, error: error.message });
      throw error;
    } finally {
      this.isExecuting = false;
      this.currentProcess = null;
    }
  }

  /**
   * Envolver código para interceptar console
   */
  _wrapCodeWithConsoleInterception(code) {
    return `
// CheeseJS - Interceptor de Console
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console)
};

console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.log('\\u001b[36m[LOG]\\u001b[0m', message);
};

console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.error('\\u001b[31m[ERROR]\\u001b[0m', message);
};

console.warn = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.warn('\\u001b[33m[WARN]\\u001b[0m', message);
};

console.info = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.info('\\u001b[34m[INFO]\\u001b[0m', message);
};

try {
${code}
} catch (error) {
  console.error('Error en ejecución:', error.message);
  console.error('Stack:', error.stack);
}
`;
  }

  /**
   * Ejecutar script de Node.js
   */
  async _runNodeScript(filename) {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    try {
      this.currentProcess = await this.spawn('node', [filename]);

      if (this.currentProcess.output) {
        this.currentProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            const output = data.toString();
            stdout += output;
            eventBus.emit('execution:output', { 
              type: 'stdout', 
              data: output,
              timestamp: Date.now()
            });
          }
        }));
      }

      if (this.currentProcess.stderr) {
        this.currentProcess.stderr.pipeTo(new WritableStream({
          write: (data) => {
            const output = data.toString();
            stderr += output;
            eventBus.emit('execution:output', { 
              type: 'stderr', 
              data: output,
              timestamp: Date.now()
            });
          }
        }));
      }

      const exitCode = await this.currentProcess.exit;
      const endTime = Date.now();

      return {
        exitCode,
        stdout,
        stderr,
        executionTime: endTime - startTime,
        success: exitCode === 0,
        timestamp: endTime
      };
    } catch (error) {
      return {
        exitCode: -1,
        stdout,
        stderr: stderr + error.message,
        executionTime: Date.now() - startTime,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Detener ejecución actual
   */
  async stopExecution() {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
        eventBus.emit('execution:stopped', { timestamp: Date.now() });
      } catch (error) {
        console.warn('⚠️ Error deteniendo proceso:', error);
      } finally {
        this.isExecuting = false;
        this.currentProcess = null;
      }
    }
  }

  // ==================== PACKAGE MANAGEMENT ====================

  /**
   * Instalar paquete npm
   */
  async installPackage(packageName, version = 'latest') {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    try {
      const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`;
      
      console.log(`📦 Instalando paquete: ${packageSpec}`);
      eventBus.emit('package:installing', { package: packageName, version });

      const installProcess = await this.spawn('npm', ['install', packageSpec]);
      
      if (installProcess.output) {
        installProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            eventBus.emit('package:install-output', { 
              package: packageName, 
              output: data.toString() 
            });
          }
        }));
      }

      const exitCode = await installProcess.exit;
      
      if (exitCode === 0) {
        this.installedPackages.add(packageName);
        console.log(`✅ Paquete ${packageName} instalado`);
        eventBus.emit('package:installed', { package: packageName, version });
        return true;
      } else {
        console.error(`❌ Error al instalar ${packageName}`);
        eventBus.emit('package:install-error', { package: packageName, exitCode });
        return false;
      }
    } catch (error) {
      console.error(`❌ Error instalando ${packageName}:`, error);
      eventBus.emit('package:install-error', { package: packageName, error: error.message });
      return false;
    }
  }

  /**
   * Desinstalar paquete npm
   */
  async uninstallPackage(packageName) {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    try {
      console.log(`🗑️ Desinstalando paquete: ${packageName}`);
      eventBus.emit('package:uninstalling', { package: packageName });

      const uninstallProcess = await this.spawn('npm', ['uninstall', packageName]);
      const exitCode = await uninstallProcess.exit;

      if (exitCode === 0) {
        this.installedPackages.delete(packageName);
        console.log(`✅ Paquete ${packageName} desinstalado`);
        eventBus.emit('package:uninstalled', { package: packageName });
        return true;
      } else {
        console.error(`❌ Error al desinstalar ${packageName}`);
        eventBus.emit('package:uninstall-error', { package: packageName, exitCode });
        return false;
      }
    } catch (error) {
      console.error(`❌ Error desinstalando ${packageName}:`, error);
      eventBus.emit('package:uninstall-error', { package: packageName, error: error.message });
      return false;
    }
  }

  /**
   * Listar paquetes instalados
   */
  async listInstalledPackages() {
    if (!this.isReady) {
      return Array.from(this.installedPackages);
    }

    try {
      const listProcess = await this.spawn('npm', ['list', '--json', '--depth=0']);
      
      let output = '';
      if (listProcess.output) {
        listProcess.output.pipeTo(new WritableStream({
          write: (data) => { output += data; }
        }));
      }

      await listProcess.exit;
      
      try {
        const packageInfo = JSON.parse(output);
        return packageInfo.dependencies || {};
      } catch (parseError) {
        return Array.from(this.installedPackages);
      }
    } catch (error) {
      console.error('❌ Error al listar paquetes:', error);
      return Array.from(this.installedPackages);
    }
  }

  // ==================== FILE OPERATIONS ====================

  /**
   * Escribir archivo
   */
  async writeFile(path, content) {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    try {
      await this.webcontainerInstance.fs.writeFile(path, content);
      console.log(`📝 Archivo escrito: ${path}`);
    } catch (error) {
      console.error(`❌ Error escribiendo archivo ${path}:`, error);
      throw error;
    }
  }

  /**
   * Leer archivo
   */
  async readFile(path) {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    try {
      const content = await this.webcontainerInstance.fs.readFile(path, 'utf-8');
      return content;
    } catch (error) {
      console.error(`❌ Error leyendo archivo ${path}:`, error);
      throw error;
    }
  }

  /**
   * Montar archivos
   */
  async mount(files) {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }
    
    try {
      await this.webcontainerInstance.mount(files);
      console.log('📁 Archivos montados');
    } catch (error) {
      console.error('❌ Error al montar archivos:', error);
      throw error;
    }
  }

  // ==================== COMMAND EXECUTION ====================

  /**
   * Ejecutar comando
   */
  async spawn(command, args = []) {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    return await this.webcontainerInstance.spawn(command, args);
  }

  /**
   * Ejecutar comando de terminal
   */
  async executeTerminalCommand(command) {
    if (!this.isTerminalReady) {
      throw new Error('Terminal no está listo');
    }

    try {
      console.log(`🖥️ Ejecutando: ${command}`);
      
      // Separar comando y argumentos
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);
      
      this.terminalProcess = await this.spawn(cmd, args);
      return this.terminalProcess;
      
    } catch (error) {
      console.error(`❌ Error ejecutando comando: ${command}`, error);
      throw error;
    }
  }

  /**
   * Método de compatibilidad para hook useTerminal
   * Ejecuta comando siguiendo el patrón esperado por el hook
   */
  async executeCommand(command) {
    if (!this.isTerminalReady) {
      throw new Error('Terminal no está listo');
    }

    try {
      console.log(`🖥️ Terminal: Ejecutando comando: ${command}`);
      
      // Manejar comandos especiales/builtin primero
      if (await this._handleBuiltinCommand(command)) {
        return;
      }
      
      // Separar comando y argumentos
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);
      
      // Ejecutar comando
      this.terminalProcess = await this.spawn(cmd, args);
      
      // Manejar output si existe
      if (this.terminalProcess.output) {
        const reader = this.terminalProcess.output.getReader();
        
        const readOutput = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              let output = '';
              if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
                output = new TextDecoder().decode(value);
              } else if (typeof value === 'string') {
                output = value;
              } else {
                output = String(value);
              }
              
              eventBus.emit('terminal:output', {
                type: 'stdout',
                data: output
              });
            }
          } catch (error) {
            console.error('Error leyendo output:', error);
          } finally {
            reader.releaseLock();
          }
        };

        readOutput();
      }

      // Esperar a que termine el proceso
      const exitCode = await this.terminalProcess.exit;
      
      // Emitir resultado
      if (exitCode === 0) {
        eventBus.emit('terminal:command-success', {
          command,
          exitCode,
          timestamp: Date.now()
        });
      } else {
        eventBus.emit('terminal:command-error', {
          command,
          exitCode,
          timestamp: Date.now()
        });
        
        eventBus.emit('terminal:output', {
          type: 'error',
          data: `Comando terminó con código de salida: ${exitCode}\r\n`
        });
      }
      
      // Emitir que está listo para el siguiente comando
      eventBus.emit('terminal:ready', { timestamp: Date.now() });
      
    } catch (error) {
      console.error(`❌ Error ejecutando comando: ${command}`, error);
      
      eventBus.emit('terminal:command-error', {
        command,
        error: error.message,
        timestamp: Date.now()
      });
      
      eventBus.emit('terminal:output', {
        type: 'error',
        data: `Error: ${error.message}\r\n`
      });
      
      eventBus.emit('terminal:ready', { timestamp: Date.now() });
    }
  }

  /**
   * Manejar comandos builtin/especiales
   */
  async _handleBuiltinCommand(command) {
    const [cmd, ...args] = command.trim().split(/\s+/);
    
    switch (cmd.toLowerCase()) {
      case 'clear':
      case 'cls':
        eventBus.emit('terminal:clear');
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'help':
        this._showHelp();
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'pwd':
        eventBus.emit('terminal:output', {
          type: 'stdout',
          data: '/\r\n'
        });
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'echo':
        const message = args.join(' ');
        eventBus.emit('terminal:output', {
          type: 'stdout',
          data: message + '\r\n'
        });
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'date':
        const now = new Date().toLocaleString();
        eventBus.emit('terminal:output', {
          type: 'stdout',
          data: now + '\r\n'
        });
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'whoami':
        eventBus.emit('terminal:output', {
          type: 'stdout',
          data: 'cheesejs-user\r\n'
        });
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'version':
      case '--version':
        this._showVersion();
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      default:
        return false; // No es un comando builtin
    }
  }

  /**
   * Mostrar ayuda
   */
  _showHelp() {
    const helpText = `
🧀 CheeseJS Terminal - Comandos disponibles:

Comandos de Node.js:
  node <archivo>     - Ejecutar archivo JavaScript
  node --version     - Versión de Node.js

Comandos de npm:
  npm install <pkg>  - Instalar paquete npm
  npm uninstall <pkg>- Desinstalar paquete
  npm list           - Listar paquetes instalados
  npm run <script>   - Ejecutar script npm
  npm init           - Inicializar proyecto
  npm info <pkg>     - Información del paquete
  
Comandos del sistema:
  ls                 - Listar archivos
  cat <archivo>      - Mostrar contenido de archivo
  pwd                - Directorio actual
  echo <mensaje>     - Imprimir mensaje
  date               - Mostrar fecha y hora
  whoami             - Usuario actual
  clear              - Limpiar terminal
  help               - Mostrar esta ayuda
  version            - Versión de CheeseJS

Ejemplos:
  npm install lodash express
  npm run dev
  node index.js
  ls -la
  cat package.json

💡 Tip: Usa las flechas ↑↓ para navegar por el historial de comandos

`;
    
    eventBus.emit('terminal:output', {
      type: 'info',
      data: helpText
    });
  }

  /**
   * Mostrar versión
   */
  _showVersion() {
    const versionText = `
🧀 CheeseJS v0.1.0

Entorno de desarrollo JavaScript interactivo
Basado en WebContainers API y Monaco Editor

Componentes:
- Node.js: Disponible en WebContainer
- npm: Gestor de paquetes integrado
- Terminal: xterm.js v5.x
- Editor: Monaco Editor v0.x

Desarrollado con ❤️ y mucho 🧀

`;
    
    eventBus.emit('terminal:output', {
      type: 'info',
      data: versionText
    });
  }

  // ==================== SANDBOX MANAGEMENT ====================

  /**
   * Reiniciar sandbox
   */
  async resetSandbox() {
    if (!this.isReady) {
      throw new Error('WebContainerService no está listo');
    }

    console.log('🔄 Reiniciando sandbox...');
    
    // Detener ejecución actual
    await this.stopExecution();
    
    // Limpiar paquetes instalados
    this.installedPackages.clear();
    
    // Remontar archivos por defecto si están disponibles
    if (this.defaultFiles) {
      await this.mount(this.defaultFiles);
    }
    
    eventBus.emit('sandbox:reset', { timestamp: Date.now() });
    console.log('🔄 Sandbox reiniciado');
  }

  /**
   * Obtener uso de recursos
   */
  async getResourceUsage() {
    try {
      if (!this.isReady) {
        return { available: false };
      }

      return {
        available: true,
        sandbox: this.isSandboxReady,
        terminal: this.isTerminalReady,
        executing: this.isExecuting,
        packages: this.installedPackages.size,
        uptime: Date.now() - (this._startTime || Date.now())
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Obtener capacidades del servicio
   */
  _getCapabilities() {
    return {
      webcontainer: this.isReady,
      sandbox: this.isSandboxReady,
      terminal: this.isTerminalReady,
      codeExecution: this.isReady,
      packageManagement: this.isReady,
      fileOperations: this.isReady
    };
  }

  /**
   * Verificar si está listo
   */
  isWebContainerReady() {
    return this.isReady;
  }

  /**
   * Verificar si el sandbox está inicializado
   */
  isSandboxInitialized() {
    return this.isSandboxReady;
  }

  /**
   * Verificar si el terminal está listo
   */
  isTerminalServiceReady() {
    return this.isTerminalReady;
  }

  /**
   * Limpiar recursos
   */
  async destroy() {
    console.log('🧹 Destruyendo WebContainerService...');
    
    try {
      await this.stopExecution();
      this.isReady = false;
      this.isInitialized = false;
      this.isSandboxReady = false;
      this.isTerminalReady = false;
      
      console.log('🧹 WebContainerService destruido');
    } catch (error) {
      console.error('❌ Error al destruir WebContainerService:', error);
    }
  }
}

export default WebContainerService;