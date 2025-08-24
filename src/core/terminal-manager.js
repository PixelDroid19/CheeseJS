import { eventBus } from '../utils/event-bus.js';

/**
 * Terminal Manager - Gestión de terminal interactiva con WebContainer
 * Conecta xterm.js con WebContainer para comandos en tiempo real
 */
class TerminalManager {
  constructor(webContainerManager) {
    this.webContainerManager = webContainerManager;
    this.currentProcess = null;
    this.isReady = false;
    this.commandHistory = [];
    this.setupEventListeners();
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Escuchar comandos desde la terminal
    eventBus.subscribe('webcontainer:terminal-command', this.handleTerminalCommand.bind(this));
    
    // Escuchar cuando WebContainer esté listo
    eventBus.subscribe('webcontainer:ready', this.handleWebContainerReady.bind(this));
    
    console.log('🖥️ Terminal Manager: Event listeners configurados');
  }

  /**
   * Manejar WebContainer listo
   */
  handleWebContainerReady() {
    this.isReady = true;
    eventBus.emit('terminal:ready', { timestamp: Date.now() });
    console.log('🖥️ Terminal Manager: WebContainer conectado');
  }

  /**
   * Manejar comando de terminal
   */
  async handleTerminalCommand(data) {
    const { command } = data;
    
    if (!this.isReady) {
      eventBus.emit('terminal:output', {
        type: 'error',
        data: 'WebContainer no está disponible\r\n'
      });
      return;
    }

    try {
      await this.executeCommand(command);
    } catch (error) {
      console.error('❌ Error ejecutando comando:', error);
      eventBus.emit('terminal:output', {
        type: 'error',
        data: `Error: ${error.message}\r\n`
      });
      eventBus.emit('terminal:ready', { timestamp: Date.now() });
    }
  }

  /**
   * Ejecutar comando en WebContainer
   */
  async executeCommand(command) {
    if (!command.trim()) {
      eventBus.emit('terminal:ready', { timestamp: Date.now() });
      return;
    }

    // Agregar al historial
    this.commandHistory.push(command);
    if (this.commandHistory.length > 50) {
      this.commandHistory.shift();
    }

    console.log('🖥️ Ejecutando comando:', command);

    // Verificar si es un comando builtin
    if (await this.executeBuiltinCommand(command)) {
      return;
    }

    try {
      // Detener proceso anterior si existe
      if (this.currentProcess) {
        try {
          await this.currentProcess.kill();
        } catch (e) {
          // Ignorar errores al matar proceso anterior
        }
      }

      // Parsear comando para manejos especiales
      const [cmd, ...args] = command.trim().split(/\s+/);
      
      // Manejar comandos npm especiales
      if (cmd === 'npm') {
        await this.handleNpmCommand(args, command);
        return;
      }

      // Ejecutar comando normal
      await this.executeRegularCommand(command);

    } catch (error) {
      console.error('Error ejecutando comando:', error);
      
      eventBus.emit('terminal:command-error', {
        command,
        error: error.message,
        timestamp: Date.now()
      });
      
      eventBus.emit('terminal:output', {
        type: 'error',
        data: `Error: ${error.message}\r\n`
      });
    } finally {
      this.currentProcess = null;
      eventBus.emit('terminal:ready', { timestamp: Date.now() });
    }
  }

  /**
   * Manejar comandos npm con funcionalidad completa
   */
  async handleNpmCommand(args, fullCommand) {
    const [subcommand, ...restArgs] = args;
    
    switch (subcommand) {
      case 'install':
      case 'i':
        await this.handleNpmInstall(restArgs, fullCommand);
        break;
        
      case 'uninstall':
      case 'remove':
      case 'rm':
        await this.handleNpmUninstall(restArgs, fullCommand);
        break;
        
      case 'list':
      case 'ls':
        await this.handleNpmList(restArgs, fullCommand);
        break;
        
      case 'run':
        await this.handleNpmRun(restArgs, fullCommand);
        break;
        
      case 'init':
        await this.handleNpmInit(restArgs, fullCommand);
        break;
        
      case 'info':
      case 'show':
        await this.handleNpmInfo(restArgs, fullCommand);
        break;
        
      default:
        // Ejecutar comando npm normal
        await this.executeRegularCommand(fullCommand);
    }
  }

  /**
   * Manejar npm install
   */
  async handleNpmInstall(packages, fullCommand) {
    if (packages.length === 0) {
      // npm install sin paquetes - instalar dependencias del package.json
      eventBus.emit('terminal:output', {
        type: 'info',
        data: '📦 Instalando dependencias del proyecto...\r\n'
      });
    } else {
      // npm install con paquetes específicos
      eventBus.emit('terminal:output', {
        type: 'info',
        data: `📦 Instalando: ${packages.join(', ')}...\r\n`
      });
    }
    
    await this.executeRegularCommand(fullCommand);
    
    // Emitir evento para actualizar lista de paquetes en la UI
    eventBus.emit('packages:installed', {
      packages: packages,
      timestamp: Date.now()
    });
  }

  /**
   * Manejar npm uninstall
   */
  async handleNpmUninstall(packages, fullCommand) {
    if (packages.length === 0) {
      eventBus.emit('terminal:output', {
        type: 'error',
        data: '❌ Especifica los paquetes a desinstalar\r\n'
      });
      return;
    }
    
    eventBus.emit('terminal:output', {
      type: 'info',
      data: `🗑️ Desinstalando: ${packages.join(', ')}...\r\n`
    });
    
    await this.executeRegularCommand(fullCommand);
    
    // Emitir evento para actualizar lista de paquetes en la UI
    eventBus.emit('packages:uninstalled', {
      packages: packages,
      timestamp: Date.now()
    });
  }

  /**
   * Manejar npm list
   */
  async handleNpmList(args, fullCommand) {
    eventBus.emit('terminal:output', {
      type: 'info',
      data: '📜 Listando paquetes instalados...\r\n'
    });
    
    await this.executeRegularCommand(fullCommand);
  }

  /**
   * Manejar npm run
   */
  async handleNpmRun(scripts, fullCommand) {
    if (scripts.length === 0) {
      // Mostrar scripts disponibles
      eventBus.emit('terminal:output', {
        type: 'info',
        data: '🏃 Scripts disponibles:\r\n'
      });
      await this.executeRegularCommand('npm run');
    } else {
      const scriptName = scripts[0];
      eventBus.emit('terminal:output', {
        type: 'info',
        data: `🏃 Ejecutando script: ${scriptName}...\r\n`
      });
      await this.executeRegularCommand(fullCommand);
    }
  }

  /**
   * Manejar npm init
   */
  async handleNpmInit(args, fullCommand) {
    eventBus.emit('terminal:output', {
      type: 'info',
      data: '🎆 Inicializando proyecto npm...\r\n'
    });
    
    await this.executeRegularCommand(fullCommand);
  }

  /**
   * Manejar npm info
   */
  async handleNpmInfo(packages, fullCommand) {
    if (packages.length === 0) {
      eventBus.emit('terminal:output', {
        type: 'error',
        data: '❌ Especifica el paquete para obtener información\r\n'
      });
      return;
    }
    
    const packageName = packages[0];
    eventBus.emit('terminal:output', {
      type: 'info',
      data: `📊 Obteniendo información de: ${packageName}...\r\n`
    });
    
    await this.executeRegularCommand(fullCommand);
  }

  /**
   * Ejecutar comando regular
   */
  async executeRegularCommand(command) {
    // Ejecutar comando
    this.currentProcess = await this.webContainerManager.spawnTerminalCommand(command);

    // Manejar output del proceso con streaming
    if (this.currentProcess.output) {
      const reader = this.currentProcess.output.getReader();
      
      const readOutput = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Verificar que value sea un ArrayBuffer o Uint8Array
            let output = '';
            if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
              output = new TextDecoder().decode(value);
            } else if (typeof value === 'string') {
              output = value;
            } else {
              console.warn('Tipo de dato inesperado en stream:', typeof value, value);
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
    const exitCode = await this.currentProcess.exit;
    
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
  }

  /**
   * Ejecutar comandos comunes del sistema
   */
  async executeBuiltinCommand(command) {
    const [cmd, ...args] = command.trim().split(/\s+/);
    
    switch (cmd.toLowerCase()) {
      case 'clear':
      case 'cls':
        eventBus.emit('terminal:clear');
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'help':
        this.showHelp();
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'history':
        this.showHistory();
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
        this.showVersion();
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      // Comandos npm rápidos
      case 'install':
        if (args.length === 0) {
          eventBus.emit('terminal:output', {
            type: 'error',
            data: '❌ Especifica el paquete a instalar. Ej: install lodash\r\n'
          });
        } else {
          await this.handleNpmInstall(args, `npm install ${args.join(' ')}`);
          return false; // Permitir que se ejecute el comando real
        }
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      case 'uninstall':
        if (args.length === 0) {
          eventBus.emit('terminal:output', {
            type: 'error',
            data: '❌ Especifica el paquete a desinstalar. Ej: uninstall lodash\r\n'
          });
        } else {
          await this.handleNpmUninstall(args, `npm uninstall ${args.join(' ')}`);
          return false; // Permitir que se ejecute el comando real
        }
        eventBus.emit('terminal:ready', { timestamp: Date.now() });
        return true;
        
      default:
        return false; // No es un comando builtin
    }
  }

  /**
   * Mostrar ayuda
   */
  showHelp() {
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
  
Comandos rápidos:
  install <pkg>      - Atajo para npm install
  uninstall <pkg>    - Atajo para npm uninstall

Comandos del sistema:
  ls                 - Listar archivos
  cat <archivo>      - Mostrar contenido de archivo
  pwd                - Directorio actual
  echo <mensaje>     - Imprimir mensaje
  date               - Mostrar fecha y hora
  whoami             - Usuario actual
  clear              - Limpiar terminal
  help               - Mostrar esta ayuda
  history            - Mostrar historial de comandos
  version            - Versión de CheeseJS

Ejemplos:
  npm install lodash express
  install react
  uninstall lodash
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
  showVersion() {
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

  /**
   * Mostrar historial
   */
  showHistory() {
    if (this.commandHistory.length === 0) {
      eventBus.emit('terminal:output', {
        type: 'info',
        data: 'No hay comandos en el historial\r\n'
      });
      return;
    }

    let historyText = 'Historial de comandos:\r\n';
    this.commandHistory.forEach((cmd, index) => {
      historyText += `  ${index + 1}. ${cmd}\r\n`;
    });
    
    eventBus.emit('terminal:output', {
      type: 'info',
      data: historyText
    });
  }

  /**
   * Obtener historial de comandos
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    this.commandHistory = [];
    console.log('🖥️ Historial de comandos limpiado');
  }

  /**
   * Verificar si está listo
   */
  isTerminalReady() {
    return this.isReady;
  }

  /**
   * Destruir y limpiar
   */
  destroy() {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
      } catch (e) {
        // Ignorar errores
      }
    }
    
    this.currentProcess = null;
    this.isReady = false;
    this.commandHistory = [];
    
    console.log('🖥️ Terminal Manager destruido');
  }
}

export default TerminalManager;