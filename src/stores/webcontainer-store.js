import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';

/**
 * WebContainerStore - Gestión de estado del WebContainer
 * Maneja inicialización, sistema de archivos, procesos y configuración del contenedor
 */
const initialState = createInitialState({
  // Estado de inicialización
  isInitialized: false,
  isInitializing: false,
  isReady: false,
  initializationProgress: 0,
  initializationStep: '',
  
  // Instancia del WebContainer
  webcontainerInstance: null,
  containerConfig: {
    coep: 'require-corp',
    workdirName: 'cheesejs-workspace'
  },
  
  // Sistema de archivos virtual
  fileSystem: new Map(),
  mountedFiles: new Map(),
  fileWatchers: new Map(),
  currentWorkingDirectory: '/',
  
  // Estado de npm
  npmInitialized: false,
  npmVersion: null,
  installedPackages: new Map(),
  packageJson: null,
  
  // Procesos en ejecución
  runningProcesses: new Map(),
  processHistory: [],
  maxProcessHistory: 100,
  
  // Logs y output
  systemLogs: [],
  processOutputs: new Map(),
  maxLogEntries: 1000,
  
  // Configuración del entorno
  environment: {
    NODE_ENV: 'development',
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: '/home/user'
  },
  
  // Estadísticas del sistema
  stats: {
    totalProcesses: 0,
    successfulProcesses: 0,
    failedProcesses: 0,
    filesCreated: 0,
    filesModified: 0,
    packagesInstalled: 0,
    uptime: 0,
    lastActivity: null
  },
  
  // Verificaciones del entorno
  environmentChecks: {
    webcontainerAvailable: false,
    secureContext: false,
    supportedBrowser: false,
    requiredHeaders: false,
    lastCheck: null
  },
  
  // Configuración de desarrollo
  devConfig: {
    enableHotReload: true,
    enableFileWatching: true,
    enableLogging: true,
    logLevel: 'info',
    maxMemoryUsage: 512 // MB
  }
});

export const useWebContainerStore = createBaseStore(
  'WebContainerStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar WebContainer
     */
    initialize: async () => {
      const currentState = get();
      
      if (currentState.isInitialized || currentState.isInitializing) {
        return currentState.webcontainerInstance;
      }

      try {
        set({
          isInitializing: true,
          initializationProgress: 0,
          initializationStep: 'Verificando entorno...'
        });

        // Verificaciones del entorno
        await get().performEnvironmentChecks();

        set({
          initializationProgress: 20,
          initializationStep: 'Importando WebContainer API...'
        });

        // Importar WebContainer dinámicamente
        const { WebContainer } = await import('@webcontainer/api');

        set({
          initializationProgress: 40,
          initializationStep: 'Inicializando contenedor...'
        });

        // Inicializar WebContainer
        const webcontainerInstance = await WebContainer.boot(currentState.containerConfig);

        set({
          webcontainerInstance,
          initializationProgress: 60,
          initializationStep: 'Configurando sistema de archivos...'
        });

        // Configurar sistema de archivos inicial
        await get().setupInitialFileSystem();

        set({
          initializationProgress: 80,
          initializationStep: 'Inicializando npm...'
        });

        // Inicializar npm
        await get().initializeNpm();

        set({
          isInitialized: true,
          isInitializing: false,
          isReady: true,
          initializationProgress: 100,
          initializationStep: 'Completado',
          stats: {
            ...get().stats,
            lastActivity: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        });

        // Configurar watchers y listeners
        get().setupFileWatchers();
        get().startUptimeCounter();

        console.log('🐳 WebContainer inicializado correctamente');
        return webcontainerInstance;

      } catch (error) {
        console.error('❌ Error inicializando WebContainer:', error);
        
        set({
          isInitializing: false,
          error: error.message,
          initializationStep: 'Error en inicialización'
        });

        throw error;
      }
    },

    /**
     * Realizar verificaciones del entorno
     */
    performEnvironmentChecks: async () => {
      const checks = {
        webcontainerAvailable: false,
        secureContext: false,
        supportedBrowser: false,
        requiredHeaders: false,
        lastCheck: new Date().toISOString()
      };

      try {
        // Verificar que WebContainer esté disponible
        const { WebContainer } = await import('@webcontainer/api');
        checks.webcontainerAvailable = !!WebContainer;

        // Verificar contexto seguro
        if (typeof window !== 'undefined') {
          checks.secureContext = window.isSecureContext || 
                                window.location.hostname === 'localhost' ||
                                window.location.hostname === '127.0.0.1';

          // Verificar navegador soportado
          const userAgent = navigator.userAgent.toLowerCase();
          checks.supportedBrowser = userAgent.includes('chrome') || 
                                  userAgent.includes('firefox') || 
                                  userAgent.includes('safari');

          // Verificar headers (esto es aproximado, los headers reales se verifican en runtime)
          checks.requiredHeaders = window.crossOriginIsolated || checks.secureContext;
        }

        set({ environmentChecks: checks });

        // Validar requisitos críticos
        if (!checks.webcontainerAvailable) {
          throw new Error('WebContainer API no está disponible');
        }

        if (!checks.secureContext) {
          throw new Error('Se requiere contexto seguro (HTTPS) o localhost');
        }

        console.log('✅ Verificaciones del entorno completadas:', checks);

      } catch (error) {
        set({ environmentChecks: checks });
        throw error;
      }
    },

    /**
     * Configurar sistema de archivos inicial
     */
    setupInitialFileSystem: async () => {
      const { webcontainerInstance } = get();
      if (!webcontainerInstance) return;

      try {
        // Crear estructura básica de directorios
        const initialFiles = {
          'package.json': {
            file: {
              contents: JSON.stringify({
                name: 'cheesejs-project',
                version: '1.0.0',
                description: 'Proyecto CheeseJS',
                main: 'index.js',
                scripts: {
                  start: 'node index.js',
                  dev: 'node index.js'
                },
                dependencies: {}
              }, null, 2)
            }
          },
          'index.js': {
            file: {
              contents: `// 🧀 CheeseJS - Archivo principal
console.log('¡Hola desde CheeseJS! 🧀');

// Tu código aquí...
`
            }
          },
          'README.md': {
            file: {
              contents: `# 🧀 Proyecto CheeseJS

Este es un proyecto ejecutado en CheeseJS con WebContainer.

## Ejecutar

\`\`\`bash
npm start
\`\`\`
`
            }
          }
        };

        await webcontainerInstance.mount(initialFiles);

        // Actualizar estado del sistema de archivos
        const fileSystemMap = new Map();
        Object.keys(initialFiles).forEach(path => {
          fileSystemMap.set(path, {
            type: 'file',
            content: initialFiles[path].file.contents,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
          });
        });

        set({
          fileSystem: fileSystemMap,
          mountedFiles: new Map(Object.entries(initialFiles)),
          stats: {
            ...get().stats,
            filesCreated: Object.keys(initialFiles).length
          }
        });

        console.log('📁 Sistema de archivos inicial configurado');

      } catch (error) {
        console.error('❌ Error configurando sistema de archivos:', error);
        throw error;
      }
    },

    /**
     * Inicializar npm
     */
    initializeNpm: async () => {
      const { webcontainerInstance } = get();
      if (!webcontainerInstance) return;

      try {
        // Verificar disponibilidad de npm
        const npmVersionProcess = await webcontainerInstance.spawn('npm', ['--version']);
        const npmOutput = get().captureProcessOutput(npmVersionProcess);
        const exitCode = await npmVersionProcess.exit;

        if (exitCode === 0) {
          const npmVersion = npmOutput.trim();
          
          set({
            npmInitialized: true,
            npmVersion,
            lastUpdated: new Date().toISOString()
          });

          console.log(`📦 npm inicializado - versión: ${npmVersion}`);

          // Cargar paquetes instalados inicialmente
          await get().loadInstalledPackages();

        } else {
          console.warn('⚠️ npm no está disponible en WebContainer');
          set({ npmInitialized: false });
        }

      } catch (error) {
        console.warn('⚠️ Error inicializando npm:', error.message);
        set({ npmInitialized: false });
      }
    },

    /**
     * Capturar output de proceso
     */
    captureProcessOutput: (process) => {
      let output = '';
      
      process.output.pipeTo(new WritableStream({
        write(data) {
          output += data;
        }
      }));

      return output;
    },

    /**
     * Cargar paquetes instalados
     */
    loadInstalledPackages: async () => {
      try {
        const packageJsonContent = await get().readFile('package.json');
        const packageJson = JSON.parse(packageJsonContent);
        
        const installedPackages = new Map();
        
        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            installedPackages.set(name, {
              name,
              version,
              type: 'dependency',
              installedAt: new Date().toISOString()
            });
          });
        }

        if (packageJson.devDependencies) {
          Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            installedPackages.set(name, {
              name,
              version,
              type: 'devDependency',
              installedAt: new Date().toISOString()
            });
          });
        }

        set({
          packageJson,
          installedPackages,
          lastUpdated: new Date().toISOString()
        });

      } catch (error) {
        console.warn('⚠️ Error cargando paquetes instalados:', error.message);
      }
    },

    /**
     * Escribir archivo
     */
    writeFile: async (path, content) => {
      const { webcontainerInstance, fileSystem } = get();
      if (!webcontainerInstance) {
        throw new Error('WebContainer no está inicializado');
      }

      try {
        await webcontainerInstance.fs.writeFile(path, content);

        // Actualizar sistema de archivos local
        const newFileSystem = new Map(fileSystem);
        const isNewFile = !newFileSystem.has(path);
        
        newFileSystem.set(path, {
          type: 'file',
          content,
          createdAt: isNewFile ? new Date().toISOString() : newFileSystem.get(path)?.createdAt,
          modifiedAt: new Date().toISOString()
        });

        set({
          fileSystem: newFileSystem,
          stats: {
            ...get().stats,
            filesCreated: isNewFile ? get().stats.filesCreated + 1 : get().stats.filesCreated,
            filesModified: !isNewFile ? get().stats.filesModified + 1 : get().stats.filesModified,
            lastActivity: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        });

        console.log(`📝 Archivo ${isNewFile ? 'creado' : 'modificado'}: ${path}`);
        return true;

      } catch (error) {
        console.error(`❌ Error escribiendo archivo ${path}:`, error);
        set({ error: error.message });
        throw error;
      }
    },

    /**
     * Leer archivo
     */
    readFile: async (path) => {
      const { webcontainerInstance } = get();
      if (!webcontainerInstance) {
        throw new Error('WebContainer no está inicializado');
      }

      try {
        const content = await webcontainerInstance.fs.readFile(path, 'utf-8');
        
        set({
          stats: {
            ...get().stats,
            lastActivity: new Date().toISOString()
          }
        });

        return content;

      } catch (error) {
        console.error(`❌ Error leyendo archivo ${path}:`, error);
        throw error;
      }
    },

    /**
     * Instalar paquete
     */
    installPackage: async (packageName, version = 'latest') => {
      const { webcontainerInstance, npmInitialized } = get();
      
      if (!webcontainerInstance || !npmInitialized) {
        throw new Error('WebContainer o npm no están inicializados');
      }

      try {
        const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`;
        
        // Registrar proceso
        const processId = get().registerProcess('npm', ['install', packageSpec]);

        // Ejecutar instalación
        const installProcess = await webcontainerInstance.spawn('npm', ['install', packageSpec]);
        
        // Capturar output
        const output = get().captureProcessOutput(installProcess);
        const exitCode = await installProcess.exit;

        // Actualizar proceso
        get().updateProcess(processId, { exitCode, output, completed: true });

        if (exitCode === 0) {
          // Actualizar paquetes instalados
          await get().loadInstalledPackages();

          set({
            stats: {
              ...get().stats,
              packagesInstalled: get().stats.packagesInstalled + 1,
              successfulProcesses: get().stats.successfulProcesses + 1,
              lastActivity: new Date().toISOString()
            },
            lastUpdated: new Date().toISOString()
          });

          console.log(`📦 Paquete instalado: ${packageSpec}`);
          return { success: true, output };

        } else {
          set({
            stats: {
              ...get().stats,
              failedProcesses: get().stats.failedProcesses + 1
            }
          });

          throw new Error(`Error instalando paquete: ${output}`);
        }

      } catch (error) {
        console.error(`❌ Error instalando paquete ${packageName}:`, error);
        set({ error: error.message });
        throw error;
      }
    },

    /**
     * Ejecutar comando
     */
    runCommand: async (command, args = []) => {
      const { webcontainerInstance } = get();
      if (!webcontainerInstance) {
        throw new Error('WebContainer no está inicializado');
      }

      try {
        // Registrar proceso
        const processId = get().registerProcess(command, args);

        // Ejecutar comando
        const process = await webcontainerInstance.spawn(command, args);
        
        // Capturar output
        const output = get().captureProcessOutput(process);
        const exitCode = await process.exit;

        // Actualizar proceso
        get().updateProcess(processId, { exitCode, output, completed: true });

        set({
          stats: {
            ...get().stats,
            totalProcesses: get().stats.totalProcesses + 1,
            successfulProcesses: exitCode === 0 ? 
              get().stats.successfulProcesses + 1 : 
              get().stats.successfulProcesses,
            failedProcesses: exitCode !== 0 ? 
              get().stats.failedProcesses + 1 : 
              get().stats.failedProcesses,
            lastActivity: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        });

        const result = {
          command,
          args,
          exitCode,
          output,
          success: exitCode === 0
        };

        console.log(`⚡ Comando ejecutado: ${command} ${args.join(' ')} - Exit: ${exitCode}`);
        return result;

      } catch (error) {
        console.error(`❌ Error ejecutando comando ${command}:`, error);
        set({ error: error.message });
        throw error;
      }
    },

    /**
     * Registrar proceso en ejecución
     */
    registerProcess: (command, args) => {
      const processId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const process = {
        id: processId,
        command,
        args,
        startTime: new Date().toISOString(),
        status: 'running',
        exitCode: null,
        output: '',
        completed: false
      };

      const { runningProcesses } = get();
      const newRunningProcesses = new Map(runningProcesses);
      newRunningProcesses.set(processId, process);

      set({ runningProcesses: newRunningProcesses });
      return processId;
    },

    /**
     * Actualizar proceso
     */
    updateProcess: (processId, updates) => {
      const { runningProcesses, processHistory } = get();
      const process = runningProcesses.get(processId);
      
      if (!process) return;

      const updatedProcess = {
        ...process,
        ...updates,
        endTime: updates.completed ? new Date().toISOString() : undefined
      };

      // Actualizar proceso en ejecución
      const newRunningProcesses = new Map(runningProcesses);
      
      if (updates.completed) {
        // Mover a historial si está completado
        newRunningProcesses.delete(processId);
        
        const newProcessHistory = [updatedProcess, ...processHistory]
          .slice(0, get().maxProcessHistory);

        set({
          runningProcesses: newRunningProcesses,
          processHistory: newProcessHistory
        });
      } else {
        newRunningProcesses.set(processId, updatedProcess);
        set({ runningProcesses: newRunningProcesses });
      }
    },

    /**
     * Configurar watchers de archivos
     */
    setupFileWatchers: () => {
      const { devConfig } = get();
      
      if (!devConfig.enableFileWatching) return;

      // Implementar watchers cuando sea necesario
      console.log('👁️ File watchers configurados');
    },

    /**
     * Iniciar contador de uptime
     */
    startUptimeCounter: () => {
      const startTime = Date.now();
      
      setInterval(() => {
        const uptime = Date.now() - startTime;
        set({
          stats: {
            ...get().stats,
            uptime
          }
        });
      }, 60000); // Actualizar cada minuto
    },

    /**
     * Obtener estadísticas del sistema
     */
    getSystemStats: () => {
      return get().stats;
    },

    /**
     * Obtener información del entorno
     */
    getEnvironmentInfo: () => {
      const state = get();
      return {
        isInitialized: state.isInitialized,
        isReady: state.isReady,
        npmVersion: state.npmVersion,
        environmentChecks: state.environmentChecks,
        stats: state.stats,
        runningProcesses: state.runningProcesses.size,
        filesInSystem: state.fileSystem.size
      };
    },

    /**
     * Limpiar recursos
     */
    cleanup: () => {
      const { runningProcesses } = get();
      
      // Terminar procesos en ejecución
      runningProcesses.forEach((process, id) => {
        console.log(`🔄 Terminando proceso: ${process.command}`);
      });

      set({
        runningProcesses: new Map(),
        webcontainerInstance: null,
        isInitialized: false,
        isReady: false
      });

      console.log('🧹 WebContainer limpiado');
    },

    /**
     * Reiniciar WebContainer
     */
    restart: async () => {
      get().cleanup();
      await get().initialize();
    }
  }),
  {
    persist: false, // No persistir el estado del contenedor
    devtools: true,
    // Configuración específica para DevTools
    partialize: (state) => ({
      // Solo persistir configuración, no estado del contenedor
      containerConfig: state.containerConfig,
      environment: state.environment,
      devConfig: state.devConfig,
      stats: {
        totalProcesses: state.stats.totalProcesses,
        successfulProcesses: state.stats.successfulProcesses,
        failedProcesses: state.stats.failedProcesses,
        packagesInstalled: state.stats.packagesInstalled
      }
    })
  }
);