/**
 * Sandbox Manager - Gestión del entorno de ejecución aislado
 * Maneja recursos, limpieza y monitoreo del sandbox
 */
class SandboxManager {
  constructor(webContainerManager) {
    this.webContainerManager = webContainerManager;
    this.isInitialized = false;
    this.defaultFiles = null;
    this.resourceLimits = {
      maxMemory: 512 * 1024 * 1024, // 512MB
      maxExecutionTime: 30000, // 30 segundos
      maxOutputSize: 10 * 1024 * 1024 // 10MB
    };
    this.eventCallbacks = new Map();
  }

  /**
   * Inicializar sandbox con archivos por defecto
   * @param {import('@webcontainer/api').FileSystemTree} files - Archivos iniciales
   */
  async initialize(files = null) {
    try {
      console.log('🏗️ Iniciando sandbox...');
      this.emit('sandbox:initializing');
      
      // Verificar que WebContainer esté listo
      if (!this.webContainerManager.isWebContainerReady()) {
        throw new Error('WebContainer no está listo. Asegúrate de que se inicializó correctamente.');
      }
      
      // Crear estructura básica si no se proporcionan archivos
      this.defaultFiles = files || this.createDefaultFileSystem();
      
      console.log('📁 Montando archivos en sandbox...');
      console.log('📁 Archivos a montar:', Object.keys(this.defaultFiles));
      
      // Montar archivos en WebContainer
      await this.webContainerManager.mount(this.defaultFiles);
      
      // Verificar que los archivos se montaron correctamente
      await this.verifyFileSystem();
      
      this.isInitialized = true;
      this.emit('sandbox:initialized');
      console.log('🏗️ Sandbox inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error al inicializar sandbox:', error);
      this.emit('sandbox:error', { error: error.message });
      
      // Agregar información de diagnóstico
      console.error('🔍 Diagnóstico:');
      console.error('- WebContainer listo:', this.webContainerManager.isWebContainerReady());
      console.error('- Archivos por defecto:', !!this.defaultFiles);
      console.error('- Error original:', error);
      
      throw error;
    }
  }

  /**
   * Verificar que el sistema de archivos se montó correctamente
   */
  async verifyFileSystem() {
    try {
      console.log('🔍 Verificando sistema de archivos...');
      
      // Verificar que package.json existe
      const packageExists = await this.checkFileExists('package.json');
      if (!packageExists) {
        throw new Error('package.json no se montó correctamente');
      }
      
      // Verificar que index.js existe
      const indexExists = await this.checkFileExists('index.js');
      if (!indexExists) {
        throw new Error('index.js no se montó correctamente');
      }
      
      console.log('✅ Sistema de archivos verificado correctamente');
    } catch (error) {
      console.error('❌ Error verificando sistema de archivos:', error);
      throw error;
    }
  }

  /**
   * Verificar si un archivo existe
   * @param {string} filepath - Ruta del archivo
   * @returns {Promise<boolean>}
   */
  async checkFileExists(filepath) {
    try {
      await this.webContainerManager.readFile(filepath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Crear sistema de archivos por defecto
   * @returns {import('@webcontainer/api').FileSystemTree}
   */
  createDefaultFileSystem() {
    return {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'cheesejs-workspace',
            type: 'module',
            version: '1.0.0',
            description: 'CheeseJS Workspace',
            main: 'index.js',
            dependencies: {},
            scripts: {
              start: 'node index.js',
              dev: 'nodemon index.js'
            }
          }, null, 2)
        }
      },
      'index.js': {
        file: {
          contents: `// 🧀 Bienvenido a CheeseJS
// Escribe tu código JavaScript aquí

console.log('¡Hola desde CheeseJS! 🧀');

// Ejemplo básico
const mensaje = 'CheeseJS está funcionando correctamente';
console.log(mensaje);

// Puedes instalar paquetes npm y usarlos aquí
// Ejemplo: npm install lodash
// import _ from 'lodash';
`
        }
      },
      '.gitignore': {
        file: {
          contents: `node_modules/
npm-debug.log*
.npm
.env
dist/
build/
*.log
`
        }
      }
    };
  }

  /**
   * Restablecer sandbox al estado inicial
   */
  async reset() {
    try {
      this.emit('sandbox:resetting');
      
      // Detener procesos en ejecución
      await this.cleanupProcesses();
      
      // Reinstalar archivos por defecto
      await this.webContainerManager.mount(this.defaultFiles);
      
      this.emit('sandbox:reset');
      console.log('🔄 Sandbox restablecido');
    } catch (error) {
      console.error('❌ Error al restablecer sandbox:', error);
      this.emit('sandbox:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Limpiar procesos en ejecución
   */
  async cleanupProcesses() {
    try {
      // Intentar detener procesos comunes
      const processesToKill = ['node', 'npm', 'nodemon'];
      
      for (const processName of processesToKill) {
        try {
          await this.webContainerManager.spawn('pkill', ['-f', processName]);
        } catch (error) {
          // Es normal que algunos procesos no existan
          console.log(`Proceso ${processName} no encontrado o ya detenido`);
        }
      }
      
      console.log('🧹 Procesos limpiados');
    } catch (error) {
      console.warn('⚠️ Advertencia durante limpieza de procesos:', error);
    }
  }

  /**
   * Crear archivo temporal
   * @param {string} filename - Nombre del archivo
   * @param {string} content - Contenido del archivo
   * @returns {Promise<string>} - Ruta del archivo creado
   */
  async createTempFile(filename, content) {
    const tempPath = `temp_${Date.now()}_${filename}`;
    
    try {
      await this.webContainerManager.writeFile(tempPath, content);
      console.log(`📁 Archivo temporal creado: ${tempPath}`);
      return tempPath;
    } catch (error) {
      console.error(`❌ Error al crear archivo temporal ${tempPath}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar archivo temporal
   * @param {string} filepath - Ruta del archivo a eliminar
   */
  async removeTempFile(filepath) {
    try {
      await this.webContainerManager.spawn('rm', [filepath]);
      console.log(`🗑️ Archivo temporal eliminado: ${filepath}`);
    } catch (error) {
      console.warn(`⚠️ No se pudo eliminar archivo temporal ${filepath}:`, error);
    }
  }

  /**
   * Obtener información de uso de recursos
   * @returns {Promise<Object>}
   */
  async getResourceUsage() {
    try {
      // Obtener información del sistema
      const memInfo = await this.webContainerManager.spawn('free', ['-m']);
      const processes = await this.webContainerManager.spawn('ps', ['aux']);
      
      // Simular información de recursos (WebContainer es virtual)
      return {
        memory: {
          used: Math.floor(Math.random() * 100), // MB simulados
          available: this.resourceLimits.maxMemory / (1024 * 1024),
          percentage: Math.floor(Math.random() * 50)
        },
        cpu: {
          usage: Math.floor(Math.random() * 30) // % simulado
        },
        processes: {
          active: Math.floor(Math.random() * 5) + 1
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('⚠️ No se pudo obtener información de recursos:', error);
      return {
        memory: { used: 0, available: 512, percentage: 0 },
        cpu: { usage: 0 },
        processes: { active: 0 },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Verificar límites de recursos
   * @param {Object} usage - Información de uso actual
   * @returns {Object} - Estado de los límites
   */
  checkResourceLimits(usage) {
    const limits = {
      memory: {
        exceeded: usage.memory.percentage > 90,
        warning: usage.memory.percentage > 70
      },
      cpu: {
        exceeded: usage.cpu.usage > 95,
        warning: usage.cpu.usage > 80
      }
    };

    if (limits.memory.exceeded || limits.cpu.exceeded) {
      this.emit('sandbox:resource-limit-exceeded', { usage, limits });
    } else if (limits.memory.warning || limits.cpu.warning) {
      this.emit('sandbox:resource-warning', { usage, limits });
    }

    return limits;
  }

  /**
   * Monitorear recursos del sandbox
   * @param {number} interval - Intervalo de monitoreo en ms
   */
  startResourceMonitoring(interval = 5000) {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }

    this.resourceMonitorInterval = setInterval(async () => {
      try {
        const usage = await this.getResourceUsage();
        const limits = this.checkResourceLimits(usage);
        
        this.emit('sandbox:resource-update', { usage, limits });
      } catch (error) {
        console.warn('⚠️ Error en monitoreo de recursos:', error);
      }
    }, interval);

    console.log(`📊 Monitoreo de recursos iniciado (intervalo: ${interval}ms)`);
  }

  /**
   * Detener monitoreo de recursos
   */
  stopResourceMonitoring() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
      console.log('📊 Monitoreo de recursos detenido');
    }
  }

  /**
   * Configurar límites de recursos
   * @param {Object} limits - Nuevos límites
   */
  setResourceLimits(limits) {
    this.resourceLimits = { ...this.resourceLimits, ...limits };
    console.log('⚙️ Límites de recursos actualizados:', this.resourceLimits);
  }

  /**
   * Verificar si el sandbox está inicializado
   * @returns {boolean}
   */
  isSandboxInitialized() {
    return this.isInitialized;
  }

  /**
   * Obtener archivos por defecto
   * @returns {import('@webcontainer/api').FileSystemTree}
   */
  getDefaultFiles() {
    return this.defaultFiles;
  }

  /**
   * Registrar callback para eventos
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
  }

  /**
   * Emitir evento
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   */
  emit(event, data) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback del evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Destructor - limpiar recursos
   */
  destroy() {
    this.stopResourceMonitoring();
    this.cleanupProcesses();
    this.eventCallbacks.clear();
    console.log('🗑️ Sandbox Manager destruido');
  }
}

export default SandboxManager;