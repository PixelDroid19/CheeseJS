/**
 * Extension API - API extensible para plugins y integraciones
 * Proporciona interfaces limpias para extender la funcionalidad de CheeseJS
 */

import { eventBus } from '../utils/event-bus.js';
import { languageDetectionService } from './language-detection-service.js';
import { dependencyManager } from './dependency-management-service.js';
import { resultFormatter } from './result-formatter-service.js';

/**
 * EditorExtensionAPI - API para extensiones del editor
 */
class EditorExtensionAPI {
  constructor() {
    this.plugins = new Map();
    this.snippets = new Map();
    this.completionProviders = new Map();
    this.themes = new Map();
    this.formatters = new Map();
    this.hooks = new Map();
  }

  /**
   * Registrar plugin de editor
   */
  registerPlugin(pluginId, plugin) {
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} ya está registrado`);
    }

    // Validar plugin
    this.validatePlugin(plugin);

    // Registrar plugin
    this.plugins.set(pluginId, {
      ...plugin,
      id: pluginId,
      registeredAt: new Date().toISOString(),
      active: true
    });

    // Inicializar plugin si tiene método de inicialización
    if (plugin.initialize) {
      plugin.initialize(this);
    }

    eventBus.emit('editor:plugin-registered', { pluginId, plugin });
    console.log(`🔌 Plugin ${pluginId} registrado`);

    return pluginId;
  }

  /**
   * Validar estructura del plugin
   */
  validatePlugin(plugin) {
    const requiredFields = ['name', 'version'];
    const missingFields = requiredFields.filter(field => !plugin[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Plugin inválido: faltan campos ${missingFields.join(', ')}`);
    }

    if (plugin.languages && !Array.isArray(plugin.languages)) {
      throw new Error('Plugin inválido: languages debe ser un array');
    }
  }

  /**
   * Registrar snippet de código
   */
  addCodeSnippet(language, snippet) {
    if (!this.snippets.has(language)) {
      this.snippets.set(language, []);
    }

    const snippetWithId = {
      id: `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...snippet,
      addedAt: new Date().toISOString()
    };

    this.snippets.get(language).push(snippetWithId);
    eventBus.emit('editor:snippet-added', { language, snippet: snippetWithId });
    
    return snippetWithId.id;
  }

  /**
   * Obtener snippets por lenguaje
   */
  getSnippets(language) {
    return this.snippets.get(language) || [];
  }

  /**
   * Registrar proveedor de autocompletado
   */
  registerCompletionProvider(language, provider) {
    const providerId = `completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.completionProviders.has(language)) {
      this.completionProviders.set(language, new Map());
    }

    this.completionProviders.get(language).set(providerId, {
      ...provider,
      id: providerId,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('editor:completion-provider-registered', { language, providerId, provider });
    
    return providerId;
  }

  /**
   * Obtener proveedores de autocompletado
   */
  getCompletionProviders(language) {
    return this.completionProviders.get(language) || new Map();
  }

  /**
   * Registrar tema personalizado
   */
  addCustomTheme(themeName, theme) {
    this.themes.set(themeName, {
      ...theme,
      name: themeName,
      addedAt: new Date().toISOString()
    });

    // Registrar tema en el formateador de resultados también
    resultFormatter.addTheme(themeName, theme);
    
    eventBus.emit('editor:theme-added', { themeName, theme });
    console.log(`🎨 Tema ${themeName} registrado`);

    return themeName;
  }

  /**
   * Obtener temas disponibles
   */
  getThemes() {
    return Array.from(this.themes.keys());
  }

  /**
   * Registrar formateador personalizado
   */
  registerFormatter(language, formatter) {
    const formatterId = `formatter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.formatters.has(language)) {
      this.formatters.set(language, new Map());
    }

    this.formatters.get(language).set(formatterId, {
      ...formatter,
      id: formatterId,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('editor:formatter-registered', { language, formatterId, formatter });
    
    return formatterId;
  }

  /**
   * Registrar hook personalizado
   */
  registerHook(hookName, callback) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const hookId = `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.hooks.get(hookName).push({
      id: hookId,
      callback,
      registeredAt: new Date().toISOString()
    });

    return hookId;
  }

  /**
   * Ejecutar hooks
   */
  executeHooks(hookName, data) {
    const hooks = this.hooks.get(hookName) || [];
    
    for (const hook of hooks) {
      try {
        hook.callback(data);
      } catch (error) {
        console.error(`Error ejecutando hook ${hookName}:`, error);
      }
    }
  }

  /**
   * Obtener información de plugins
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Desactivar plugin
   */
  deactivatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.active = false;
      if (plugin.deactivate) {
        plugin.deactivate();
      }
      eventBus.emit('editor:plugin-deactivated', { pluginId });
    }
  }

  /**
   * Activar plugin
   */
  activatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.active = true;
      if (plugin.activate) {
        plugin.activate();
      }
      eventBus.emit('editor:plugin-activated', { pluginId });
    }
  }
}

/**
 * ExecutionExtensionAPI - API para extensiones de ejecución
 */
class ExecutionExtensionAPI {
  constructor() {
    this.executors = new Map();
    this.resolvers = new Map();
    this.transformers = new Map();
    this.resultFormatters = new Map();
    this.middleware = [];
  }

  /**
   * Registrar ejecutor personalizado
   */
  registerExecutor(language, executor) {
    this.executors.set(language, {
      ...executor,
      language,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('execution:executor-registered', { language, executor });
    console.log(`⚡ Ejecutor para ${language} registrado`);

    return language;
  }

  /**
   * Registrar resolvedor de dependencias
   */
  addDependencyResolver(resolver) {
    const resolverId = `resolver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.resolvers.set(resolverId, {
      ...resolver,
      id: resolverId,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('execution:resolver-registered', { resolverId, resolver });
    
    return resolverId;
  }

  /**
   * Registrar transformador de código
   */
  registerTransformer(language, transformer) {
    if (!this.transformers.has(language)) {
      this.transformers.set(language, []);
    }

    const transformerId = `transformer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.transformers.get(language).push({
      ...transformer,
      id: transformerId,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('execution:transformer-registered', { language, transformerId, transformer });
    
    return transformerId;
  }

  /**
   * Registrar formateador de resultados
   */
  addResultFormatter(type, formatter) {
    this.resultFormatters.set(type, {
      ...formatter,
      type,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('execution:result-formatter-registered', { type, formatter });
    
    return type;
  }

  /**
   * Agregar middleware de ejecución
   */
  addExecutionMiddleware(middleware) {
    const middlewareId = `middleware_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.middleware.push({
      id: middlewareId,
      ...middleware,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('execution:middleware-registered', { middlewareId, middleware });
    
    return middlewareId;
  }

  /**
   * Obtener ejecutores disponibles
   */
  getExecutors() {
    return Object.fromEntries(this.executors);
  }

  /**
   * Obtener transformadores por lenguaje
   */
  getTransformers(language) {
    return this.transformers.get(language) || [];
  }

  /**
   * Ejecutar middleware
   */
  async executeMiddleware(phase, context) {
    const phaseMiddleware = this.middleware.filter(m => m.phase === phase);
    
    for (const middleware of phaseMiddleware) {
      try {
        if (middleware.execute) {
          await middleware.execute(context);
        }
      } catch (error) {
        console.error(`Error ejecutando middleware ${middleware.id}:`, error);
      }
    }
  }
}

/**
 * TerminalExtensionAPI - API para extensiones de terminal
 */
class TerminalExtensionAPI {
  constructor() {
    this.commands = new Map();
    this.processors = [];
    this.themes = new Map();
    this.filters = [];
  }

  /**
   * Registrar comando personalizado
   */
  registerCommand(name, handler) {
    this.commands.set(name, {
      name,
      handler,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('terminal:command-registered', { name, handler });
    console.log(`💻 Comando ${name} registrado`);

    return name;
  }

  /**
   * Agregar procesador de salida
   */
  addOutputProcessor(processor) {
    const processorId = `processor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.processors.push({
      id: processorId,
      ...processor,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('terminal:processor-registered', { processorId, processor });
    
    return processorId;
  }

  /**
   * Registrar tema de terminal
   */
  registerTheme(themeName, theme) {
    this.themes.set(themeName, {
      ...theme,
      name: themeName,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('terminal:theme-registered', { themeName, theme });
    
    return themeName;
  }

  /**
   * Agregar filtro de historial
   */
  addHistoryFilter(filter) {
    const filterId = `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.filters.push({
      id: filterId,
      ...filter,
      registeredAt: new Date().toISOString()
    });

    eventBus.emit('terminal:filter-registered', { filterId, filter });
    
    return filterId;
  }

  /**
   * Obtener comandos disponibles
   */
  getCommands() {
    return Object.fromEntries(this.commands);
  }

  /**
   * Ejecutar comando
   */
  async executeCommand(name, args, context) {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(`Comando ${name} no encontrado`);
    }

    try {
      return await command.handler(args, context);
    } catch (error) {
      console.error(`Error ejecutando comando ${name}:`, error);
      throw error;
    }
  }

  /**
   * Procesar salida
   */
  processOutput(output, type = 'stdout') {
    let processedOutput = output;
    
    for (const processor of this.processors) {
      try {
        if (processor.process) {
          processedOutput = processor.process(processedOutput, type);
        }
      } catch (error) {
        console.error(`Error procesando salida con ${processor.id}:`, error);
      }
    }
    
    return processedOutput;
  }

  /**
   * Filtrar historial
   */
  filterHistory(history) {
    let filteredHistory = history;
    
    for (const filter of this.filters) {
      try {
        if (filter.filter) {
          filteredHistory = filter.filter(filteredHistory);
        }
      } catch (error) {
        console.error(`Error filtrando historial con ${filter.id}:`, error);
      }
    }
    
    return filteredHistory;
  }
}

/**
 * CheeseJSExtensionAPI - API principal de extensiones
 */
class CheeseJSExtensionAPI {
  constructor() {
    this.editor = new EditorExtensionAPI();
    this.execution = new ExecutionExtensionAPI();
    this.terminal = new TerminalExtensionAPI();
    this.version = '1.0.0';
    this.initialized = false;
  }

  /**
   * Inicializar API de extensiones
   */
  initialize() {
    if (this.initialized) {
      console.warn('⚠️ Extension API ya está inicializada');
      return;
    }

    // Configurar event listeners globales
    this.setupGlobalEventListeners();
    
    // Registrar extensiones por defecto
    this.registerDefaultExtensions();
    
    this.initialized = true;
    eventBus.emit('extension-api:initialized');
    
    console.log('🚀 CheeseJS Extension API inicializada');
  }

  /**
   * Configurar event listeners globales
   */
  setupGlobalEventListeners() {
    // Manejar eventos de ejecución de código
    eventBus.subscribe('code:execute', async (data) => {
      await this.execution.executeMiddleware('before-execute', data);
    });

    eventBus.subscribe('code:executed', async (data) => {
      await this.execution.executeMiddleware('after-execute', data);
    });

    // Manejar eventos de cambio de código
    eventBus.subscribe('editor:content-changed', (data) => {
      this.editor.executeHooks('content-changed', data);
    });

    // Manejar eventos de terminal
    eventBus.subscribe('terminal:output', (data) => {
      const processedOutput = this.terminal.processOutput(data.output, data.type);
      if (processedOutput !== data.output) {
        eventBus.emit('terminal:output-processed', { ...data, output: processedOutput });
      }
    });
  }

  /**
   * Registrar extensiones por defecto
   */
  registerDefaultExtensions() {
    // Registrar snippets básicos
    this.registerDefaultSnippets();
    
    // Registrar temas básicos
    this.registerDefaultThemes();
    
    // Registrar comandos básicos de terminal
    this.registerDefaultCommands();
    
    console.log('📦 Extensiones por defecto registradas');
  }

  /**
   * Registrar snippets por defecto
   */
  registerDefaultSnippets() {
    const defaultSnippets = {
      javascript: [
        {
          label: 'console.log',
          insertText: 'console.log(${1:value});',
          description: 'Imprimir en consola'
        },
        {
          label: 'function',
          insertText: 'function ${1:name}(${2:params}) {\\n\\t${3:// code}\\n}',
          description: 'Función básica'
        },
        {
          label: 'async function',
          insertText: 'async function ${1:name}(${2:params}) {\\n\\t${3:// code}\\n}',
          description: 'Función asíncrona'
        }
      ],
      typescript: [
        {
          label: 'interface',
          insertText: 'interface ${1:Name} {\\n\\t${2:property}: ${3:type};\\n}',
          description: 'Interfaz TypeScript'
        },
        {
          label: 'type',
          insertText: 'type ${1:Name} = ${2:type};',
          description: 'Alias de tipo'
        }
      ],
      jsx: [
        {
          label: 'component',
          insertText: 'const ${1:Component} = () => {\\n\\treturn (\\n\\t\\t<div>\\n\\t\\t\\t${2:content}\\n\\t\\t</div>\\n\\t);\\n};',
          description: 'Componente React funcional'
        }
      ]
    };

    Object.entries(defaultSnippets).forEach(([language, snippets]) => {
      snippets.forEach(snippet => {
        this.editor.addCodeSnippet(language, snippet);
      });
    });
  }

  /**
   * Registrar temas por defecto
   */
  registerDefaultThemes() {
    // Los temas ya están definidos en resultFormatter y terminal-store
    console.log('🎨 Temas por defecto ya disponibles');
  }

  /**
   * Registrar comandos básicos de terminal
   */
  registerDefaultCommands() {\n    this.terminal.registerCommand('help', () => {\n      return `CheeseJS Terminal - Comandos disponibles:\\n${Array.from(this.terminal.commands.keys()).join(', ')}`;\n    });\n\n    this.terminal.registerCommand('clear', () => {\n      eventBus.emit('terminal:clear-requested');\n      return '';\n    });\n\n    this.terminal.registerCommand('version', () => {\n      return `CheeseJS v${this.version}`;\n    });\n  }\n\n  /**\n   * Obtener información de la API\n   */\n  getInfo() {\n    return {\n      version: this.version,\n      initialized: this.initialized,\n      stats: {\n        plugins: this.editor.plugins.size,\n        snippets: Array.from(this.editor.snippets.values()).reduce((total, arr) => total + arr.length, 0),\n        completionProviders: Array.from(this.editor.completionProviders.values()).reduce((total, map) => total + map.size, 0),\n        themes: this.editor.themes.size,\n        executors: this.execution.executors.size,\n        commands: this.terminal.commands.size\n      }\n    };\n  }\n\n  /**\n   * Desactivar API de extensiones\n   */\n  shutdown() {\n    // Desactivar todos los plugins\n    for (const [pluginId] of this.editor.plugins) {\n      this.editor.deactivatePlugin(pluginId);\n    }\n    \n    this.initialized = false;\n    eventBus.emit('extension-api:shutdown');\n    \n    console.log('🛑 CheeseJS Extension API desactivada');\n  }\n}\n\n// Instancia singleton de la API de extensiones\nexport const extensionAPI = new CheeseJSExtensionAPI();\n\n// Exportar APIs individuales para uso específico\nexport { EditorExtensionAPI, ExecutionExtensionAPI, TerminalExtensionAPI };\n\nexport default extensionAPI;