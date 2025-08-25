import { eventBus } from '../utils/event-bus.js';
import { languageDetectionService } from '../services/language-detection-service.js';
import { dependencyManager } from '../services/dependency-management-service.js';

/**
 * Enhanced Code Executor - Ejecutor avanzado de código con soporte multi-lenguaje
 * Soporta JavaScript, TypeScript, JSX, TSX con transformaciones automáticas
 */
class CodeExecutor {
  constructor(webContainerManager) {
    this.webContainerManager = webContainerManager;
    this.isExecuting = false;
    this.currentProcess = null;
    this.eventCallbacks = new Map();
    
    // Configuración de transformadores
    this.transformers = {
      typescript: null,
      babel: null,
      esbuild: null
    };
    
    // Cache de transformaciones
    this.transformCache = new Map();
    this.maxCacheSize = 50;
    
    // Métricas de ejecución
    this.executionMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      languageStats: new Map()
    };
    
    // Inicializar transformadores
    this.initializeTransformers();
  }

  /**
   * Inicializar transformadores de código
   */
  async initializeTransformers() {
    try {
      // Lazy loading de transformadores para mejor rendimiento
      if (typeof window !== 'undefined') {
        // Solo cargar en el cliente
        this.loadTransformers();
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando transformadores:', error.message);
    }
  }

  /**
   * Cargar transformadores dinámicamente
   */
  async loadTransformers() {
    try {
      // Cargar Babel para JSX
      if (!this.transformers.babel) {
        const Babel = await import('@babel/standalone');
        this.transformers.babel = Babel.default || Babel;
      }
      
      // Cargar esbuild para TypeScript (alternativa más rápida)
      if (!this.transformers.esbuild) {
        try {
          const esbuild = await import('esbuild-wasm');
          await esbuild.initialize({
            wasmURL: 'https://unpkg.com/esbuild-wasm@0.25.9/esbuild.wasm',
            worker: false
          });
          this.transformers.esbuild = esbuild;
        } catch (error) {
          console.warn('esbuild no disponible, usando TypeScript compiler');
        }
      }
      
      console.log('🔧 Transformadores de código inicializados');
    } catch (error) {
      console.error('❌ Error cargando transformadores:', error);
    }
  }

  /**
   * Ejecutar código con soporte multi-lenguaje
   * @param {string} code - Código a ejecutar
   * @param {Object} options - Opciones de ejecución
   * @returns {Promise<Object>} - Resultado de la ejecución
   */
  async executeCode(code, options = {}) {
    const {
      filename = 'index.js',
      language = null,
      timeout = 30000,
      captureOutput = true,
      checkDependencies = true,
      autoInstallDeps = false
    } = options;

    if (this.isExecuting) {
      throw new Error('Ya hay código ejecutándose. Detén la ejecución actual primero.');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.isExecuting = true;
    this.emit('execution:started', { executionId, filename, code, language });

    try {
      // 1. Detectar lenguaje si no se especifica
      const detectedLanguage = language || languageDetectionService.detectLanguage(code, filename);
      
      // 2. Verificar dependencias si está habilitado
      if (checkDependencies) {
        const depAnalysis = await dependencyManager.analyzeDependencies(code, detectedLanguage.language);
        
        if (depAnalysis.missing.length > 0) {
          if (autoInstallDeps) {
            await this.handleMissingDependencies(depAnalysis.missing);
          } else {
            this.emit('execution:dependencies-missing', {
              executionId,
              missing: depAnalysis.missing,
              suggestions: depAnalysis.suggestions
            });
          }
        }
      }
      
      // 3. Transformar código según el lenguaje
      const transformedCode = await this.transformCode(code, detectedLanguage, filename);
      
      // 4. Envolver código con interceptores
      const wrappedCode = this.wrapCodeWithConsoleInterception(transformedCode, detectedLanguage);
      
      // 5. Determinar archivo de salida
      const outputFilename = this.getOutputFilename(filename, detectedLanguage.language);
      
      // 6. Escribir archivo
      await this.webContainerManager.writeFile(outputFilename, wrappedCode);
      
      // 7. Ejecutar código
      const result = await this.runNodeScript(outputFilename, captureOutput, timeout);
      
      // 8. Actualizar métricas
      this.updateExecutionMetrics(detectedLanguage.language, Date.now() - startTime, true);
      
      const finalResult = {
        ...result,
        executionId,
        language: detectedLanguage,
        transformedCode: process.env.NODE_ENV === 'development' ? transformedCode : undefined,
        filename: outputFilename
      };
      
      this.emit('execution:completed', { executionId, result: finalResult });
      return finalResult;
      
    } catch (error) {
      this.updateExecutionMetrics(language || 'javascript', Date.now() - startTime, false);
      
      const enhancedError = this.enhanceError(error, code, language);
      this.emit('execution:error', { executionId, error: enhancedError });
      throw enhancedError;
      
    } finally {
      this.isExecuting = false;
      this.currentProcess = null;
    }
  }

  /**
   * Transformar código según el lenguaje
   */
  async transformCode(code, detectedLanguage, filename) {
    const { language, confidence } = detectedLanguage;
    
    // Cache key para evitar retransformaciones
    const cacheKey = `${language}_${this.hashCode(code)}`;
    if (this.transformCache.has(cacheKey)) {
      return this.transformCache.get(cacheKey);
    }
    
    let transformedCode = code;
    
    try {
      switch (language) {
        case 'typescript':
          transformedCode = await this.transformTypeScript(code, filename);
          break;
          
        case 'tsx':
          transformedCode = await this.transformTSX(code, filename);
          break;
          
        case 'jsx':
          transformedCode = await this.transformJSX(code, filename);
          break;
          
        case 'javascript':
        default:
          transformedCode = code; // No transformation needed
          break;
      }
      
      // Guardar en cache
      this.setCacheResult(cacheKey, transformedCode);
      
    } catch (error) {
      console.error(`❌ Error transformando ${language}:`, error);
      throw new Error(`Error de transformación ${language}: ${error.message}`);
    }
    
    return transformedCode;
  }

  /**
   * Transformar TypeScript a JavaScript
   */
  async transformTypeScript(code, filename) {
    if (this.transformers.esbuild) {
      // Usar esbuild (más rápido)
      const result = await this.transformers.esbuild.transform(code, {
        loader: 'ts',
        target: 'es2020',
        format: 'cjs'
      });
      return result.code;
    } else {
      // Fallback: usar TypeScript compiler via Monaco
      return this.transformWithMonacoTS(code);
    }
  }

  /**
   * Transformar TSX a JavaScript
   */
  async transformTSX(code, filename) {
    if (this.transformers.esbuild) {
      const result = await this.transformers.esbuild.transform(code, {
        loader: 'tsx',
        target: 'es2020',
        format: 'cjs',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment'
      });
      return result.code;
    } else {
      // Fallback: transformar con Babel
      return this.transformWithBabel(code, {
        presets: [
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
          ['@babel/preset-react']
        ]
      });
    }
  }

  /**
   * Transformar JSX a JavaScript
   */
  async transformJSX(code, filename) {
    if (!this.transformers.babel) {
      await this.loadTransformers();
    }
    
    return this.transformWithBabel(code, {
      presets: [['@babel/preset-react']],
      plugins: [
        ['@babel/plugin-transform-react-jsx', {
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    });
  }

  /**
   * Transformar con Babel
   */
  transformWithBabel(code, options = {}) {
    if (!this.transformers.babel) {
      throw new Error('Babel no está disponible para transformaciones JSX');
    }
    
    try {
      const result = this.transformers.babel.transform(code, {
        filename: 'code.js',
        ...options
      });
      return result.code;
    } catch (error) {
      throw new Error(`Error Babel: ${error.message}`);
    }
  }

  /**
   * Transformar TypeScript con Monaco (fallback)
   */
  transformWithMonacoTS(code) {
    // Implementación básica - en producción usaríamos Monaco TypeScript service
    // Por ahora, retornar el código sin transformar con advertencia
    console.warn('⚠️ Transformación TypeScript no disponible, ejecutando como JavaScript');
    return code;
  }

  /**
   * Manejar dependencias faltantes
   */
  async handleMissingDependencies(missing) {
    const installPromises = missing
      .filter(dep => dep.suggested)
      .map(dep => dependencyManager.installPackage(dep.name));
    
    if (installPromises.length > 0) {
      this.emit('execution:installing-dependencies', { count: installPromises.length });
      
      try {
        await Promise.all(installPromises);
        this.emit('execution:dependencies-installed', { count: installPromises.length });
      } catch (error) {
        throw new Error(`Error instalando dependencias: ${error.message}`);
      }
    }
  }

  /**
   * Obtener nombre de archivo de salida
   */
  getOutputFilename(originalFilename, language) {
    const baseName = originalFilename.replace(/\.(ts|tsx|jsx)$/, '');
    return `${baseName}.js`;
  }

  /**
   * Envolver código con interceptores mejorados
   * @param {string} code - Código transformado
   * @param {Object} languageInfo - Información del lenguaje detectado
   * @returns {string} - Código envuelto
   */
  wrapCodeWithConsoleInterception(code, languageInfo = {}) {
    const { language = 'javascript' } = languageInfo;
    
    return `
// CheeseJS - Enhanced Console Interceptor
// Language: ${language}
// Generated: ${new Date().toISOString()}

const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  table: console.table.bind(console),
  group: console.group.bind(console),
  groupEnd: console.groupEnd.bind(console),
  time: console.time.bind(console),
  timeEnd: console.timeEnd.bind(console)
};

// Helper para formatear valores complejos
function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'function') {
    return value.toString().length > 100 
      ? '[Function: ' + (value.name || 'anonymous') + ']'
      : value.toString();
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (circularError) {
      return '[Object with circular references]';
    }
  }
  return String(value);
}

// Interceptar console.log
console.log = (...args) => {
  const formatted = args.map(formatValue).join(' ');
  originalConsole.log('\u001b[36m[LOG]\u001b[0m', formatted);
  
  // Emitir evento para captura
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(JSON.stringify({
      type: 'console.log',
      args: args.map(formatValue),
      timestamp: Date.now()
    }) + '\n');
  }
};

// Interceptar console.error
console.error = (...args) => {
  const formatted = args.map(formatValue).join(' ');
  originalConsole.error('\u001b[31m[ERROR]\u001b[0m', formatted);
  
  if (typeof process !== 'undefined' && process.stderr) {
    process.stderr.write(JSON.stringify({
      type: 'console.error',
      args: args.map(formatValue),
      timestamp: Date.now()
    }) + '\n');
  }
};

// Interceptar console.warn
console.warn = (...args) => {
  const formatted = args.map(formatValue).join(' ');
  originalConsole.warn('\u001b[33m[WARN]\u001b[0m', formatted);
  
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(JSON.stringify({
      type: 'console.warn',
      args: args.map(formatValue),
      timestamp: Date.now()
    }) + '\n');
  }
};

// Interceptar console.info
console.info = (...args) => {
  const formatted = args.map(formatValue).join(' ');
  originalConsole.info('\u001b[34m[INFO]\u001b[0m', formatted);
  
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(JSON.stringify({
      type: 'console.info',
      args: args.map(formatValue),
      timestamp: Date.now()
    }) + '\n');
  }
};

// Interceptar console.table
console.table = (data, columns) => {
  originalConsole.table(data, columns);
  
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(JSON.stringify({
      type: 'console.table',
      data: formatValue(data),
      columns,
      timestamp: Date.now()
    }) + '\n');
  }
};

// Manejador global de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Añadir React si es necesario para JSX
${language === 'jsx' || language === 'tsx' ? this.getReactPolyfill() : ''}

// Código del usuario
try {
${this.indentCode(code, 2)}
} catch (error) {
  console.error('Error en ejecución:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    line: error.lineNumber,
    column: error.columnNumber
  });
  
  // Enviar error estructurado
  if (typeof process !== 'undefined' && process.stderr) {
    process.stderr.write(JSON.stringify({
      type: 'runtime.error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        line: error.lineNumber,
        column: error.columnNumber
      },
      timestamp: Date.now()
    }) + '\n');
  }
  
  process.exit(1);
}
`;
  }

  /**
   * Obtener polyfill de React para JSX
   */
  getReactPolyfill() {
    return `
// React polyfill para JSX
if (typeof React === 'undefined') {
  global.React = {
    createElement: function(type, props, ...children) {
      const element = {
        type,
        props: props || {},
        children: children.length === 1 ? children[0] : children
      };
      
      // Renderizar como string para visualización
      if (typeof type === 'string') {
        const attrs = props ? Object.entries(props)
          .map(([key, value]) => \`\${key}="\${value}"\`)
          .join(' ') : '';
        const content = children.join('');
        return \`<\${type}\${attrs ? ' ' + attrs : ''}>\${content}</\${type}>\`;
      }
      
      return element;
    },
    Fragment: function(props) {
      return props.children;
    }
  };
}
`;
  }

  /**
   * Indentar código
   */
  indentCode(code, spaces) {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map(line => indent + line).join('\n');
  }

  /**
   * Ejecutar script de Node.js con timeout mejorado
   * @param {string} filename - Nombre del archivo a ejecutar
   * @param {boolean} captureOutput - Si capturar la salida
   * @param {number} timeout - Timeout en milisegundos
   * @returns {Promise<Object>}
   */
  async runNodeScript(filename, captureOutput = true, timeout = 30000) {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timeoutId = null;

    try {
      // Crear promise con timeout
      const executionPromise = new Promise(async (resolve, reject) => {
        try {
          // Ejecutar el script con Node.js
          this.currentProcess = await this.webContainerManager.spawn('node', [filename]);

          if (captureOutput && this.currentProcess.output) {
            // Capturar stdout con parsing mejorado
            this.currentProcess.output.pipeTo(new WritableStream({
              write: (data) => {
                const output = data.toString();
                stdout += output;
                
                // Intentar parsear salida estructurada
                this.parseStructuredOutput(output);
                
                this.emit('execution:output', { 
                  type: 'stdout', 
                  data: output,
                  parsed: this.tryParseJSON(output),
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
                
                // Intentar parsear errores estructurados
                this.parseStructuredOutput(output, 'stderr');
                
                this.emit('execution:output', { 
                  type: 'stderr', 
                  data: output,
                  parsed: this.tryParseJSON(output),
                  timestamp: Date.now()
                });
              }
            }));
          }

          // Esperar a que termine la ejecución
          const exitCode = await this.currentProcess.exit;
          resolve(exitCode);
          
        } catch (error) {
          reject(error);
        }
      });

      // Configurar timeout
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Execution timeout after ${timeout}ms`));
        }, timeout);
      });

      // Ejecutar con timeout
      const exitCode = await Promise.race([executionPromise, timeoutPromise]);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        exitCode,
        stdout,
        stderr,
        executionTime,
        success: exitCode === 0,
        timestamp: endTime,
        metrics: {
          memoryUsage: this.getMemoryUsage(),
          outputSize: stdout.length + stderr.length,
          linesOfOutput: (stdout + stderr).split('\n').length
        }
      };
      
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Limpiar proceso si es timeout
      if (error.message.includes('timeout') && this.currentProcess) {
        try {
          await this.currentProcess.kill();
        } catch (killError) {
          console.warn('Error killing timed out process:', killError);
        }
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        exitCode: -1,
        stdout,
        stderr: stderr + error.message,
        executionTime,
        success: false,
        error: error.message,
        timestamp: endTime,
        timeout: error.message.includes('timeout')
      };
    }
  }

  /**
   * Parsear salida estructurada
   */
  parseStructuredOutput(output, type = 'stdout') {
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parsed = this.tryParseJSON(line);
      if (parsed && parsed.type) {
        this.emit('execution:structured-output', {
          outputType: type,
          data: parsed,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Intentar parsear JSON
   */
  tryParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Obtener uso de memoria (simulado)
   */
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0
    };
  }

  /**
   * Mejorar información de error
   */
  enhanceError(error, originalCode, language) {
    const enhanced = {
      name: error.name || 'ExecutionError',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      language: language || 'javascript',
      suggestions: []
    };

    // Agregar sugerencias basadas en errores comunes
    if (error.message.includes('Cannot find module')) {
      const moduleName = error.message.match(/'([^']+)'/)?.[1];
      if (moduleName) {
        enhanced.suggestions.push({
          type: 'missing_dependency',
          message: `Instalar dependencia faltante: ${moduleName}`,
          action: 'install',
          package: moduleName
        });
      }
    }
    
    if (error.message.includes('React is not defined') && (language === 'jsx' || language === 'tsx')) {
      enhanced.suggestions.push({
        type: 'missing_import',
        message: 'Agregar: import React from "react"',
        action: 'add_import',
        import: 'React'
      });
    }
    
    if (error.message.includes('Unexpected token') && language === 'typescript') {
      enhanced.suggestions.push({
        type: 'syntax_error',
        message: 'Verificar sintaxis de TypeScript',
        action: 'check_syntax'
      });
    }

    return enhanced;
  }

  /**
   * Actualizar métricas de ejecución
   */
  updateExecutionMetrics(language, executionTime, success) {
    this.executionMetrics.totalExecutions++;
    
    if (success) {
      this.executionMetrics.successfulExecutions++;
    } else {
      this.executionMetrics.failedExecutions++;
    }
    
    // Calcular tiempo promedio
    const totalTime = (this.executionMetrics.averageExecutionTime * (this.executionMetrics.totalExecutions - 1)) + executionTime;
    this.executionMetrics.averageExecutionTime = totalTime / this.executionMetrics.totalExecutions;
    
    // Estadísticas por lenguaje
    if (!this.executionMetrics.languageStats.has(language)) {
      this.executionMetrics.languageStats.set(language, {
        executions: 0,
        successes: 0,
        failures: 0,
        totalTime: 0,
        averageTime: 0
      });
    }
    
    const langStats = this.executionMetrics.languageStats.get(language);
    langStats.executions++;
    langStats.totalTime += executionTime;
    langStats.averageTime = langStats.totalTime / langStats.executions;
    
    if (success) {
      langStats.successes++;
    } else {
      langStats.failures++;
    }
  }

  /**
   * Gestión de cache
   */
  setCacheResult(key, result) {
    if (this.transformCache.size >= this.maxCacheSize) {
      const firstKey = this.transformCache.keys().next().value;
      this.transformCache.delete(firstKey);
    }
    this.transformCache.set(key, result);
  }

  /**
   * Hash simple para cache
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    return {
      ...this.executionMetrics,
      languageStats: Object.fromEntries(this.executionMetrics.languageStats),
      cacheStats: {
        transformCache: this.transformCache.size,
        maxCacheSize: this.maxCacheSize
      },
      transformersLoaded: {
        babel: !!this.transformers.babel,
        esbuild: !!this.transformers.esbuild,
        typescript: !!this.transformers.typescript
      }
    };
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.transformCache.clear();
    console.log('🧹 Cache de transformaciones limpiado');
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    this.executionMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      languageStats: new Map()
    };
    console.log('📊 Métricas de ejecución reseteadas');
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