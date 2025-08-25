import { eventBus } from '../utils/event-bus.js';

/**
 * Config Service - Gestión de configuración global de la aplicación
 * Maneja configuraciones, persistencia y validación
 */
class ConfigService {
  constructor() {
    this.config = new Map();
    this.defaultConfig = this.getDefaultConfig();
    this.isInitialized = false;
    this.validators = new Map();
    this.changeHistory = [];
    
    // Configurar validadores por defecto
    this.setupDefaultValidators();
  }

  /**
   * Obtener configuración por defecto
   * @returns {Object}
   */
  getDefaultConfig() {
    return {
      // General
      general: {
        autoSave: true,
        autoSaveInterval: 5000, // 5 segundos
        language: 'es',
        theme: 'light',
        showWelcome: true,
        enableTelemetry: false,
        updateChannel: 'stable' // stable, beta, dev
      },
      
      // Editor
      editor: {
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on', // on, off, wordWrapColumn, bounded
        wordWrapColumn: 80,
        lineNumbers: 'on', // on, off, relative, interval
        minimap: true,
        minimapMaxColumn: 120,
        automaticLayout: true,
        scrollBeyondLastLine: true,
        smoothScrolling: true,
        cursorBlinking: 'blink', // blink, smooth, phase, expand, solid
        cursorStyle: 'line', // line, block, underline, line-thin, block-outline, underline-thin
        renderWhitespace: 'selection', // none, boundary, selection, trailing, all
        renderControlCharacters: false,
        rulers: [],
        bracketPairColorization: true,
        colorDecorators: true,
        codeLens: true,
        formatOnPaste: true,
        formatOnType: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on', // on, smart, off
        snippetSuggestions: 'top', // top, bottom, inline, none
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: true,
        parameterHints: true,
        autoClosingBrackets: 'languageDefined', // always, languageDefined, beforeWhitespace, never
        autoClosingQuotes: 'languageDefined',
        autoSurround: 'languageDefined',
        linkedEditing: false,
        folding: true,
        foldingStrategy: 'auto', // auto, indentation
        showFoldingControls: 'mouseover', // always, mouseover
        unfoldOnClickAfterEndOfLine: false,
        matchBrackets: 'always', // always, near, never
        selectionHighlight: true,
        occurrencesHighlight: true,
        overviewRulerLanes: 2,
        overviewRulerBorder: true,
        hideCursorInOverviewRuler: false
      },
      
      // Console
      console: {
        fontSize: 13,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        maxLines: 1000,
        wordWrap: true,
        timestamp: true,
        clearOnRun: false,
        groupSimilarMessages: true,
        showLogLevel: true,
        filters: {
          info: true,
          warn: true,
          error: true,
          debug: false
        }
      },
      
      // WebContainer
      webcontainer: {
        timeout: 30000,
        maxMemory: 512, // MB
        enableNodemon: true,
        npmRegistry: 'https://registry.npmjs.org/',
        defaultPackages: ['lodash', 'axios', 'moment'],
        installTimeout: 60000,
        autoInstallTypes: true
      },
      
      // Layout
      layout: {
        sidebarWidth: 250,
        consoleHeight: 200,
        showSidebar: true,
        showConsole: true,
        sidebarPosition: 'left', // left, right
        consolePosition: 'bottom', // bottom, right
        panelSizes: {
          editor: 60,
          console: 30,
          sidebar: 10
        }
      },
      
      // Packages
      packages: {
        autoUpdate: false,
        showVersions: true,
        groupByCategory: false,
        enableCache: true,
        cacheTimeout: 3600000, // 1 hora
        searchTimeout: 5000,
        maxSearchResults: 50
      },
      
      // Development
      development: {
        enableDebugMode: false,
        showPerformanceMetrics: false,
        enableExperimentalFeatures: false,
        logLevel: 'info', // error, warn, info, debug
        enableHotReload: true
      }
    };
  }

  /**
   * Configurar validadores por defecto
   */
  setupDefaultValidators() {
    // Validador para fontSize
    this.validators.set('editor.fontSize', (value) => {
      return typeof value === 'number' && value >= 8 && value <= 72;
    });

    // Validador para tabSize
    this.validators.set('editor.tabSize', (value) => {
      return typeof value === 'number' && value >= 1 && value <= 8;
    });

    // Validador para language
    this.validators.set('general.language', (value) => {
      return typeof value === 'string' && ['es', 'en', 'fr', 'de'].includes(value);
    });

    // Validador para theme
    this.validators.set('general.theme', (value) => {
      return typeof value === 'string' && ['light', 'dark'].includes(value);
    });

    // Validador para timeout
    this.validators.set('webcontainer.timeout', (value) => {
      return typeof value === 'number' && value >= 1000 && value <= 300000;
    });

    // Validador para maxMemory
    this.validators.set('webcontainer.maxMemory', (value) => {
      return typeof value === 'number' && value >= 128 && value <= 2048;
    });

    // Validador para console.maxLines
    this.validators.set('console.maxLines', (value) => {
      return typeof value === 'number' && value >= 100 && value <= 10000;
    });
  }

  /**
   * Inicializar el servicio de configuración
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Cargar configuración guardada
      await this.loadConfig();
      
      // Aplicar configuración por defecto para valores faltantes
      this.mergeWithDefaults();
      
      // Validar configuración
      this.validateAllConfig();
      
      this.isInitialized = true;
      eventBus.emit('config:initialized', { config: this.getAllConfig() });
      
      console.log('⚙️ Config Service inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar Config Service:', error);
    }
  }

  /**
   * Obtener valor de configuración
   * @param {string} key - Clave de configuración (ej: 'editor.fontSize')
   * @param {*} defaultValue - Valor por defecto si no existe
   * @returns {*}
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && value.has && value.has(k)) {
        value = value.get(k);
      } else if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Buscar en configuración por defecto
        const defaultVal = this.getDefaultValue(key);
        return defaultVal !== undefined ? defaultVal : defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Obtener valor por defecto
   * @param {string} key - Clave de configuración
   * @returns {*}
   */
  getDefaultValue(key) {
    const keys = key.split('.');
    let value = this.defaultConfig;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Establecer valor de configuración
   * @param {string} key - Clave de configuración
   * @param {*} value - Valor a establecer
   * @param {boolean} save - Si guardar automáticamente
   * @returns {boolean}
   */
  set(key, value, save = true) {
    try {
      // Validar valor
      if (!this.validateValue(key, value)) {
        console.error(`❌ Valor inválido para configuración '${key}':`, value);
        return false;
      }

      const oldValue = this.get(key);
      const keys = key.split('.');
      
      // Navegar y crear estructura si es necesario
      let current = this.config;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current.has(k)) {
          current.set(k, new Map());
        }
        current = current.get(k);
      }

      // Establecer valor final
      const finalKey = keys[keys.length - 1];
      current.set(finalKey, value);

      // Registrar cambio
      this.recordChange(key, oldValue, value);

      // Emitir evento de cambio
      eventBus.emit('config:changed', { key, oldValue, newValue: value });
      eventBus.emit(`config:changed:${key}`, { oldValue, newValue: value });

      // Guardar si es necesario
      if (save) {
        this.saveConfig();
      }

      console.log(`⚙️ Configuración actualizada: ${key} = ${value}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al establecer configuración '${key}':`, error);
      return false;
    }
  }

  /**
   * Establecer múltiples configuraciones
   * @param {Object} configObject - Objeto con configuraciones
   * @param {boolean} save - Si guardar automáticamente
   * @returns {boolean}
   */
  setMultiple(configObject, save = true) {
    const changes = [];
    
    try {
      for (const [key, value] of Object.entries(configObject)) {
        if (this.set(key, value, false)) {
          changes.push({ key, value });
        }
      }

      if (save && changes.length > 0) {
        this.saveConfig();
      }

      eventBus.emit('config:multiple-changed', { changes });
      return true;
    } catch (error) {
      console.error('❌ Error al establecer múltiples configuraciones:', error);
      return false;
    }
  }

  /**
   * Validar valor de configuración
   * @param {string} key - Clave de configuración
   * @param {*} value - Valor a validar
   * @returns {boolean}
   */
  validateValue(key, value) {
    const validator = this.validators.get(key);
    if (validator) {
      return validator(value);
    }
    
    // Validación básica por tipo si no hay validador específico
    const defaultValue = this.getDefaultValue(key);
    if (defaultValue !== undefined) {
      return typeof value === typeof defaultValue;
    }
    
    return true;
  }

  /**
   * Validar toda la configuración
   */
  validateAllConfig() {
    const errors = [];
    
    for (const [key, validator] of this.validators) {
      const value = this.get(key);
      if (value !== null && !validator(value)) {
        errors.push({ key, value });
        // Restablecer al valor por defecto
        const defaultValue = this.getDefaultValue(key);
        if (defaultValue !== undefined) {
          this.set(key, defaultValue, false);
        }
      }
    }

    if (errors.length > 0) {
      console.warn('⚠️ Configuraciones inválidas encontradas y corregidas:', errors);
      eventBus.emit('config:validation-errors', { errors });
    }
  }

  /**
   * Registrar cambio en el historial
   * @param {string} key - Clave de configuración
   * @param {*} oldValue - Valor anterior
   * @param {*} newValue - Nuevo valor
   */
  recordChange(key, oldValue, newValue) {
    this.changeHistory.push({
      key,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      source: 'user' // user, system, import
    });

    // Limitar historial a 100 entradas
    if (this.changeHistory.length > 100) {
      this.changeHistory.shift();
    }
  }

  /**
   * Obtener configuración del editor
   * @returns {Object}
   */
  getEditorConfig() {
    return {
      fontSize: this.get('editor.fontSize', 14),
      fontFamily: this.get('editor.fontFamily', 'Monaco, Menlo, "Ubuntu Mono", monospace'),
      tabSize: this.get('editor.tabSize', 2),
      insertSpaces: this.get('editor.insertSpaces', true),
      wordWrap: this.get('editor.wordWrap', 'on'),
      lineNumbers: this.get('editor.lineNumbers', 'on'),
      minimap: this.get('editor.minimap', true),
      automaticLayout: this.get('editor.automaticLayout', true),
      scrollBeyondLastLine: this.get('editor.scrollBeyondLastLine', true),
      cursorBlinking: this.get('editor.cursorBlinking', 'blink'),
      cursorStyle: this.get('editor.cursorStyle', 'line'),
      renderWhitespace: this.get('editor.renderWhitespace', 'selection'),
      bracketPairColorization: this.get('editor.bracketPairColorization', true),
      formatOnPaste: this.get('editor.formatOnPaste', true),
      formatOnType: this.get('editor.formatOnType', true),
      acceptSuggestionOnEnter: this.get('editor.acceptSuggestionOnEnter', 'on'),
      quickSuggestions: this.get('editor.quickSuggestions', true),
      autoClosingBrackets: this.get('editor.autoClosingBrackets', 'languageDefined'),
      folding: this.get('editor.folding', true),
      matchBrackets: this.get('editor.matchBrackets', 'always'),
      selectionHighlight: this.get('editor.selectionHighlight', true)
    };
  }

  /**
   * Obtener configuración del terminal
   * @returns {Object}
   */
  getTerminalConfig() {
    return {
      fontSize: this.get('console.fontSize', 13),
      fontFamily: this.get('console.fontFamily', 'Monaco, Menlo, "Ubuntu Mono", monospace'),
      maxLines: this.get('console.maxLines', 1000),
      wordWrap: this.get('console.wordWrap', true),
      timestamp: this.get('console.timestamp', true),
      clearOnRun: this.get('console.clearOnRun', false),
      groupSimilarMessages: this.get('console.groupSimilarMessages', true),
      showLogLevel: this.get('console.showLogLevel', true)
    };
  }

  /**
   * Obtener configuración de WebContainer
   * @returns {Object}
   */
  getWebContainerConfig() {
    return {
      timeout: this.get('webcontainer.timeout', 30000),
      maxMemory: this.get('webcontainer.maxMemory', 512),
      enableNodemon: this.get('webcontainer.enableNodemon', true),
      npmRegistry: this.get('webcontainer.npmRegistry', 'https://registry.npmjs.org/'),
      defaultPackages: this.get('webcontainer.defaultPackages', ['lodash', 'axios', 'moment']),
      installTimeout: this.get('webcontainer.installTimeout', 60000),
      autoInstallTypes: this.get('webcontainer.autoInstallTypes', true)
    };
  }

  /**
   * Obtener configuración de layout
   * @returns {Object}
   */
  getLayoutConfig() {
    return {
      sidebarWidth: this.get('layout.sidebarWidth', 250),
      consoleHeight: this.get('layout.consoleHeight', 200),
      showSidebar: this.get('layout.showSidebar', true),
      showConsole: this.get('layout.showConsole', true),
      sidebarPosition: this.get('layout.sidebarPosition', 'left'),
      consolePosition: this.get('layout.consolePosition', 'bottom'),
      panelSizes: this.get('layout.panelSizes', { editor: 60, console: 30, sidebar: 10 })
    };
  }

  /**
   * Obtener configuración general
   * @returns {Object}
   */
  getGeneralConfig() {
    return {
      autoSave: this.get('general.autoSave', true),
      autoSaveInterval: this.get('general.autoSaveInterval', 5000),
      language: this.get('general.language', 'es'),
      theme: this.get('general.theme', 'light'),
      showWelcome: this.get('general.showWelcome', true),
      enableTelemetry: this.get('general.enableTelemetry', false),
      updateChannel: this.get('general.updateChannel', 'stable')
    };
  }

  /**
   * Actualizar configuración (método helper)
   * @param {Object} updates - Actualizaciones de configuración
   */
  updateConfig(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Obtener toda la configuración
   * @returns {Object}
   */
  getAllConfig() {
    const result = {};
    
    const convertMapToObject = (map) => {
      const obj = {};
      for (const [key, value] of map) {
        if (value instanceof Map) {
          obj[key] = convertMapToObject(value);
        } else {
          obj[key] = value;
        }
      }
      return obj;
    };

    return convertMapToObject(this.config);
  }

  /**
   * Restablecer configuración a valores por defecto
   * @param {string} section - Sección específica (opcional)
   */
  resetToDefaults(section = null) {
    try {
      if (section) {
        // Restablecer sección específica
        const defaultSection = this.defaultConfig[section];
        if (defaultSection) {
          for (const [key, value] of Object.entries(defaultSection)) {
            this.set(`${section}.${key}`, value, false);
          }
        }
      } else {
        // Restablecer toda la configuración
        this.config.clear();
        this.mergeWithDefaults();
      }

      this.saveConfig();
      eventBus.emit('config:reset', { section });
      
      console.log(`⚙️ Configuración restablecida: ${section || 'completa'}`);
    } catch (error) {
      console.error('❌ Error al restablecer configuración:', error);
    }
  }

  /**
   * Fusionar con configuración por defecto
   */
  mergeWithDefaults() {
    const mergeSection = (target, source, prefix = '') => {
      for (const [key, value] of Object.entries(source)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          mergeSection(target, value, fullKey);
        } else if (this.get(fullKey) === null) {
          this.set(fullKey, value, false);
        }
      }
    };

    mergeSection(this.config, this.defaultConfig);
  }

  /**
   * Cargar configuración desde localStorage
   */
  async loadConfig() {
    try {
      const configJson = localStorage.getItem('cheesejs-config');
      if (configJson) {
        const configData = JSON.parse(configJson);
        this.importConfig(configData, false);
        console.log('⚙️ Configuración cargada desde localStorage');
      }
    } catch (error) {
      console.warn('⚠️ Error al cargar configuración, usando valores por defecto:', error);
    }
  }

  /**
   * Guardar configuración en localStorage
   */
  saveConfig() {
    try {
      const configData = this.getAllConfig();
      localStorage.setItem('cheesejs-config', JSON.stringify(configData, null, 2));
      eventBus.emit('config:saved', { config: configData });
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
    }
  }

  /**
   * Exportar configuración
   * @returns {Object}
   */
  exportConfig() {
    return {
      config: this.getAllConfig(),
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      changeHistory: this.changeHistory.slice(-10) // Últimos 10 cambios
    };
  }

  /**
   * Importar configuración
   * @param {Object} configData - Datos de configuración
   * @param {boolean} merge - Si fusionar con configuración actual
   */
  importConfig(configData, merge = true) {
    try {
      if (!merge) {
        this.config.clear();
      }

      const importObject = (obj, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            importObject(value, fullKey);
          } else {
            this.set(fullKey, value, false);
          }
        }
      };

      if (configData.config) {
        importObject(configData.config);
      } else {
        importObject(configData);
      }

      this.saveConfig();
      eventBus.emit('config:imported', { merge });
      
      console.log('⚙️ Configuración importada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error al importar configuración:', error);
      return false;
    }
  }

  /**
   * Obtener historial de cambios
   * @param {number} limit - Límite de entradas
   * @returns {Array}
   */
  getChangeHistory(limit = 50) {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Obtener esquema de configuración
   * @returns {Object}
   */
  getConfigSchema() {
    return {
      defaultConfig: this.defaultConfig,
      validators: Array.from(this.validators.keys()),
      sections: Object.keys(this.defaultConfig)
    };
  }

  /**
   * Agregar validador personalizado
   * @param {string} key - Clave de configuración
   * @param {Function} validator - Función validadora
   */
  addValidator(key, validator) {
    this.validators.set(key, validator);
    console.log(`⚙️ Validador agregado para: ${key}`);
  }

  /**
   * Remover validador
   * @param {string} key - Clave de configuración
   */
  removeValidator(key) {
    this.validators.delete(key);
    console.log(`⚙️ Validador removido para: ${key}`);
  }
}

// Instancia global del Config Service
const configService = new ConfigService();

export default ConfigService;
export { configService };