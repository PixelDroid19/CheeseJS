import { eventBus } from '../utils/event-bus.js';

/**
 * Code Executor - Ejecutor de código JavaScript en WebContainer
 * Maneja la ejecución de código, streaming de output y gestión de errores
 */
class CodeExecutor {
  constructor(webContainerManager) {
    this.webContainerManager = webContainerManager;
    this.isExecuting = false;
    this.currentProcess = null;
    this.eventCallbacks = new Map();
  }

  /**
   * Ejecutar código JavaScript
   * @param {string} code - Código JavaScript a ejecutar
   * @param {Object} options - Opciones de ejecución
   * @returns {Promise<Object>} - Resultado de la ejecución
   */
  async executeCode(code, options = {}) {
    const {
      filename = 'index.js',
      timeout = 30000, // 30 segundos por defecto
      captureOutput = true
    } = options;

    if (this.isExecuting) {
      throw new Error('Ya hay código ejecutándose. Detén la ejecución actual primero.');
    }

    this.isExecuting = true;
    this.emit('execution:started', { filename, code });

    try {
      // Crear un script que intercepte console.log y otros métodos
      const wrappedCode = this.wrapCodeWithConsoleInterception(code);
      
      // Escribir el código al archivo
      await this.webContainerManager.writeFile(filename, wrappedCode);
      
      // Ejecutar el código
      const result = await this.runNodeScript(filename, captureOutput);
      
      this.emit('execution:completed', { filename, result });
      return result;
    } catch (error) {
      this.emit('execution:error', { filename, error: error.message });
      throw error;
    } finally {
      this.isExecuting = false;
      this.currentProcess = null;
    }
  }

  /**
   * Envolver código para interceptar console.log
   * @param {string} code - Código original
   * @returns {string} - Código envuelto
   */
  wrapCodeWithConsoleInterception(code) {
    return `
// CheeseJS - Interceptor de Console
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console)
};

// Interceptar console.log
console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.log('\u001b[36m[LOG]\u001b[0m', message);
};

// Interceptar console.error
console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.error('\u001b[31m[ERROR]\u001b[0m', message);
};

// Interceptar console.warn
console.warn = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.warn('\u001b[33m[WARN]\u001b[0m', message);
};

// Interceptar console.info
console.info = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  originalConsole.info('\u001b[34m[INFO]\u001b[0m', message);
};

// Código del usuario
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
   * @param {string} filename - Nombre del archivo a ejecutar
   * @param {boolean} captureOutput - Si capturar la salida
   * @returns {Promise<Object>}
   */
  async runNodeScript(filename, captureOutput = true) {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    try {
      // Ejecutar el script con Node.js
      this.currentProcess = await this.webContainerManager.spawn('node', [filename]);

      if (captureOutput && this.currentProcess.output) {
        // Capturar stdout
        this.currentProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            const output = data.toString();
            stdout += output;
            this.emit('execution:output', { 
              type: 'stdout', 
              data: output,
              timestamp: Date.now()
            });
          }
        }));
      }

      // Capturar stderr si está disponible
      if (this.currentProcess.stderr) {
        this.currentProcess.stderr.pipeTo(new WritableStream({
          write: (data) => {
            const output = data.toString();
            stderr += output;
            this.emit('execution:output', { 
              type: 'stderr', 
              data: output,
              timestamp: Date.now()
            });
          }
        }));
      }

      // Esperar a que termine la ejecución
      const exitCode = await this.currentProcess.exit;
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        exitCode,
        stdout,
        stderr,
        executionTime,
        success: exitCode === 0,
        timestamp: endTime
      };
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        exitCode: -1,
        stdout,
        stderr: stderr + error.message,
        executionTime,
        success: false,
        error: error.message,
        timestamp: endTime
      };
    }
  }

  /**
   * Ejecutar comando personalizado
   * @param {string} command - Comando a ejecutar
   * @param {string[]} args - Argumentos del comando
   * @param {Object} options - Opciones de ejecución
   * @returns {Promise<Object>}
   */
  async executeCommand(command, args = [], options = {}) {
    const { captureOutput = true } = options;

    if (this.isExecuting) {
      throw new Error('Ya hay código ejecutándose. Detén la ejecución actual primero.');
    }

    this.isExecuting = true;
    this.emit('command:started', { command, args });

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    try {
      this.currentProcess = await this.webContainerManager.spawn(command, args);

      if (captureOutput && this.currentProcess.output) {
        this.currentProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            const output = data.toString();
            stdout += output;
            this.emit('command:output', { 
              type: 'stdout', 
              data: output,
              timestamp: Date.now()
            });
          }
        }));
      }

      const exitCode = await this.currentProcess.exit;
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const result = {
        command,
        args,
        exitCode,
        stdout,
        stderr,
        executionTime,
        success: exitCode === 0,
        timestamp: endTime
      };

      this.emit('command:completed', result);
      return result;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const result = {
        command,
        args,
        exitCode: -1,
        stdout,
        stderr: stderr + error.message,
        executionTime,
        success: false,
        error: error.message,
        timestamp: endTime
      };

      this.emit('command:error', result);
      throw error;
    } finally {
      this.isExecuting = false;
      this.currentProcess = null;
    }
  }

  /**
   * Detener ejecución actual
   */
  async stopExecution() {
    if (this.currentProcess) {
      try {
        await this.currentProcess.kill();
        this.emit('execution:stopped', { timestamp: Date.now() });
        console.log('🛑 Ejecución detenida');
      } catch (error) {
        console.error('❌ Error al detener ejecución:', error);
      }
    }
    this.isExecuting = false;
    this.currentProcess = null;
  }

  /**
   * Verificar si hay una ejecución en progreso
   * @returns {boolean}
   */
  isCodeExecuting() {
    return this.isExecuting;
  }

  /**
   * Obtener el proceso actual
   * @returns {import('@webcontainer/api').WebContainerProcess|null}
   */
  getCurrentProcess() {
    return this.currentProcess;
  }

  /**
   * Ejecutar código con timeout
   * @param {string} code - Código a ejecutar
   * @param {number} timeout - Timeout en milisegundos
   * @returns {Promise<Object>}
   */
  async executeWithTimeout(code, timeout = 30000) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stopExecution();
        reject(new Error(`Timeout: La ejecución superó los ${timeout}ms`));
      }, timeout);

      try {
        const result = await this.executeCode(code);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
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
   * Remover callback de evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback a remover
   */
  off(event, callback) {
    if (this.eventCallbacks.has(event)) {
      const callbacks = this.eventCallbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emitir evento
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   */
  emit(event, data) {
    // Emitir al sistema de eventos interno
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback del evento ${event}:`, error);
        }
      });
    }
    
    // Emitir también al Event Bus global para que otros componentes puedan escuchar
    try {
      eventBus.emit(event, data);
    } catch (error) {
      console.error(`Error emitiendo evento ${event} al Event Bus global:`, error);
    }
  }

  /**
   * Limpiar todos los callbacks de eventos
   */
  clearEventCallbacks() {
    this.eventCallbacks.clear();
  }
}

export default CodeExecutor;