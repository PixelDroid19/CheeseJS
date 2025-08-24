import { WebContainer } from '@webcontainer/api';

/**
 * WebContainer Manager - Núcleo para gestión de WebContainers
 * Maneja la inicialización, montaje de archivos y ejecución de comandos
 */
class WebContainerManager {
  constructor() {
    this.webcontainerInstance = null;
    this.isReady = false;
    this.eventCallbacks = new Map();
  }

  /**
   * Inicializar WebContainer
   */
  async boot() {
    try {
      if (!this.webcontainerInstance) {
        console.log('🧀 CheeseJS: Inicializando WebContainer...');
        
        // Verificaciones previas
        await this.performPreChecks();
        
        // Configuración de WebContainer
        const config = {
          coep: 'require-corp',
          workdirName: 'cheesejs-workspace'
        };
        
        console.log('🧀 Configuración WebContainer:', config);
        
        this.webcontainerInstance = await WebContainer.boot(config);
        
        this.isReady = true;
        console.log('🧀 CheeseJS: WebContainer listo');
        
        // Obtener información de la instancia
        await this.logWebContainerInfo();
      }
      return this.webcontainerInstance;
    } catch (error) {
      console.error('❌ Error al inicializar WebContainer:', error);
      
      // Emitir evento de error para que la UI pueda reaccionar
      if (typeof window !== 'undefined' && window.eventBus) {
        window.eventBus.emit('webcontainer:error', { error: error.message });
      }
      
      throw error;
    }
  }

  /**
   * Realizar verificaciones previas
   */
  async performPreChecks() {
    console.log('🔍 Realizando verificaciones previas...');
    
    // Verificar que WebContainer esté disponible
    if (typeof WebContainer === 'undefined') {
      throw new Error('WebContainer no está disponible. Verifica que @webcontainer/api esté importado correctamente.');
    }
    
    // Verificar contexto de ejecución
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'N/A';
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'N/A';
    
    console.log('🔍 Información del entorno:');
    console.log('- User Agent:', userAgent);
    console.log('- Protocolo:', protocol);
    console.log('- Contexto seguro:', isSecure);
    console.log('- Hostname:', hostname);
    
    // Verificar requisitos básicos
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    const isHttps = protocol === 'https:';
    
    if (!isSecure && !isLocalhost) {
      throw new Error(`WebContainer requiere contexto seguro (HTTPS) o localhost.
Actual: ${protocol}//${hostname}`);
    }
    
    // Verificar headers COOP/COEP (estos se verifican en tiempo de ejecución)
    console.log('🔍 Intentando crear instancia WebContainer...');
    
    console.log('✅ Verificaciones previas completadas');
  }

  /**
   * Registrar información de WebContainer
   */
  async logWebContainerInfo() {
    try {
      // Intentar obtener información básica
      console.log('📊 Información WebContainer:');
      console.log('- Instancia creada:', !!this.webcontainerInstance);
      console.log('- Estado listo:', this.isReady);
      
      // Verificar que podemos ejecutar comandos básicos
      try {
        const echoProcess = await this.webcontainerInstance.spawn('echo', ['test']);
        const exitCode = await echoProcess.exit;
        console.log('- Comando de prueba (echo):', exitCode === 0 ? '✅ Exitoso' : '❌ Fallido');
      } catch (e) {
        console.warn('- Comando de prueba:', '⚠️ No disponible');
      }
      
    } catch (error) {
      console.warn('⚠️ No se pudo obtener información adicional de WebContainer:', error.message);
    }
  }

  /**
   * Montar archivos en el sistema de archivos virtual
   * @param {import('@webcontainer/api').FileSystemTree} files 
   */
  async mount(files) {
    if (!this.isReady) {
      throw new Error('WebContainer no está inicializado');
    }
    
    try {
      await this.webcontainerInstance.mount(files);
      console.log('📁 Archivos montados en WebContainer');
      
      // Inicializar npm después del montaje
      await this.initializeNpm();
      
    } catch (error) {
      console.error('❌ Error al montar archivos:', error);
      throw error;
    }
  }

  /**
   * Inicializar npm en el WebContainer
   */
  async initializeNpm() {
    try {
      console.log('📦 Inicializando npm...');
      
      // Verificar que npm esté disponible
      const npmVersionProcess = await this.webcontainerInstance.spawn('npm', ['--version']);
      const npmVersionExit = await npmVersionProcess.exit;
      
      if (npmVersionExit === 0) {
        console.log('📦 npm disponible y listo');
        
        // Instalar dependencias si existe package.json
        try {
          const packageContent = await this.webcontainerInstance.fs.readFile('package.json', 'utf-8');
          const packageJson = JSON.parse(packageContent);
          
          if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
            console.log('📦 Instalando dependencias iniciales...');
            const installProcess = await this.webcontainerInstance.spawn('npm', ['install']);
            await installProcess.exit;
            console.log('📦 Dependencias instaladas');
          }
        } catch (e) {
          // No hay package.json o no hay dependencias, continuar
          console.log('📦 No hay dependencias iniciales que instalar');
        }
      } else {
        console.warn('⚠️ npm no está disponible en WebContainer');
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando npm:', error.message);
      // No fallar completamente si npm no está disponible
    }
  }

  /**
   * Escribir archivo en el sistema de archivos virtual
   * @param {string} path - Ruta del archivo
   * @param {string} content - Contenido del archivo
   */
  async writeFile(path, content) {
    if (!this.isReady) {
      throw new Error('WebContainer no está inicializado');
    }

    try {
      await this.webcontainerInstance.fs.writeFile(path, content);
      console.log(`📝 Archivo escrito: ${path}`);
    } catch (error) {
      console.error(`❌ Error al escribir archivo ${path}:`, error);
      throw error;
    }
  }

  /**
   * Leer archivo del sistema de archivos virtual
   * @param {string} path - Ruta del archivo
   * @returns {Promise<string>} Contenido del archivo
   */
  async readFile(path) {
    if (!this.isReady) {
      throw new Error('WebContainer no está inicializado');
    }

    try {
      const content = await this.webcontainerInstance.fs.readFile(path, 'utf-8');
      return content;
    } catch (error) {
      console.error(`❌ Error al leer archivo ${path}:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar comando en WebContainer
   * @param {string} command - Comando a ejecutar
   * @param {string[]} args - Argumentos del comando
   * @returns {Promise<import('@webcontainer/api').WebContainerProcess>}
   */
  async spawn(command, args = []) {
    if (!this.isReady) {
      throw new Error('WebContainer no está inicializado');
    }

    try {
      console.log(`🔨 Ejecutando: ${command} ${args.join(' ')}`);
      const process = await this.webcontainerInstance.spawn(command, args);
      return process;
    } catch (error) {
      console.error(`❌ Error al ejecutar comando ${command}:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar comando de terminal interactivo
   * @param {string} commandLine - Línea de comando completa
   * @returns {Promise<import('@webcontainer/api').WebContainerProcess>}
   */
  async spawnTerminalCommand(commandLine) {
    if (!this.isReady) {
      throw new Error('WebContainer no está inicializado');
    }

    try {
      // Parsear el comando y argumentos
      const parts = commandLine.trim().split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      console.log(`🖥️ Terminal: ${command} ${args.join(' ')}`);
      
      // Crear proceso con configuración específica para terminal
      const process = await this.webcontainerInstance.spawn(command, args, {
        terminal: {
          cols: 80,
          rows: 24
        }
      });
      
      return process;
    } catch (error) {
      console.error(`❌ Error en comando de terminal ${commandLine}:`, error);
      throw error;
    }
  }

  /**
   * Escuchar eventos del WebContainer
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);

    if (this.webcontainerInstance) {
      this.webcontainerInstance.on(event, callback);
    }
  }

  /**
   * Obtener la instancia de WebContainer
   * @returns {import('@webcontainer/api').WebContainer}
   */
  getInstance() {
    return this.webcontainerInstance;
  }

  /**
   * Verificar si WebContainer está listo
   * @returns {boolean}
   */
  isWebContainerReady() {
    return this.isReady;
  }
}

export default WebContainerManager;