import { eventBus } from '../utils/event-bus.js';

/**
 * i18n Service - Servicio de internacionalización
 * Maneja traducciones, interpolación y formateo por locale
 */
class I18nService {
  constructor() {
    this.currentLanguage = 'es';
    this.defaultLanguage = 'es';
    this.translations = new Map();
    this.isInitialized = false;
    this.fallbackChain = ['es', 'en'];
  }

  /**
   * Inicializar el servicio de i18n
   * @param {Object} options - Opciones de configuración
   */
  async initialize(options = {}) {
    if (this.isInitialized) return;

    const {
      defaultLanguage = 'es',
      fallbackLanguage = 'en',
      autoDetect = true
    } = options;

    this.defaultLanguage = defaultLanguage;
    this.fallbackChain = [defaultLanguage, fallbackLanguage].filter(Boolean);

    try {
      // Cargar traducciones
      await this.loadTranslations();
      
      // Detectar idioma automáticamente si está habilitado
      if (autoDetect) {
        const detectedLanguage = this.detectLanguage();
        if (this.isLanguageSupported(detectedLanguage)) {
          this.currentLanguage = detectedLanguage;
        }
      }

      // Cargar idioma guardado
      const savedLanguage = this.getSavedLanguage();
      if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
        this.currentLanguage = savedLanguage;
      }

      this.isInitialized = true;
      eventBus.emit('i18n:initialized', { 
        language: this.currentLanguage,
        availableLanguages: this.getAvailableLanguages()
      });

      console.log('🌍 i18n Service inicializado con idioma:', this.currentLanguage);
    } catch (error) {
      console.error('❌ Error al inicializar i18n Service:', error);
    }
  }

  /**
   * Cargar traducciones por defecto
   */
  async loadTranslations() {
    // Traducciones en español
    this.translations.set('es', {
      header: {
        run: 'Ejecutar',
        stop: 'Detener',
        install: 'Instalar Paquete',
        settings: 'Configuración',
        theme: 'Tema',
        language: 'Idioma',
        help: 'Ayuda'
      },
      editor: {
        placeholder: '// Escribe tu código JavaScript aquí...\nconsole.log("¡Hola CheeseJS! 🧀");',
        save: 'Guardar',
        format: 'Formatear',
        autocomplete: 'Autocompletar',
        lineNumbers: 'Números de línea',
        wordWrap: 'Ajuste de línea',
        minimap: 'Minimapa'
      },
      console: {
        clear: 'Limpiar',
        output: 'Salida',
        errors: 'Errores',
        warnings: 'Advertencias',
        info: 'Información',
        logs: 'Registros',
        empty: 'No hay salida que mostrar',
        executing: 'Ejecutando código...',
        stopped: 'Ejecución detenida'
      },
      packages: {
        install: 'Instalar {{package}}',
        installing: 'Instalando {{package}}...',
        installed: '{{package}} instalado correctamente',
        error: 'Error al instalar {{package}}',
        uninstall: 'Desinstalar {{package}}',
        search: 'Buscar paquetes...',
        version: 'Versión',
        description: 'Descripción',
        noPackages: 'No hay paquetes instalados'
      },
      sidebar: {
        files: 'Archivos',
        packages: 'Paquetes',
        settings: 'Configuración',
        help: 'Ayuda'
      },
      settings: {
        title: 'Configuración',
        general: 'General',
        editor: 'Editor',
        appearance: 'Apariencia',
        language: 'Idioma',
        theme: 'Tema',
        fontSize: 'Tamaño de fuente',
        tabSize: 'Tamaño de tabulación',
        autoSave: 'Guardado automático',
        wordWrap: 'Ajuste de línea',
        lineNumbers: 'Números de línea',
        minimap: 'Minimapa',
        save: 'Guardar',
        cancel: 'Cancelar',
        reset: 'Restablecer'
      },
      dialogs: {
        confirm: 'Confirmar',
        cancel: 'Cancelar',
        ok: 'OK',
        yes: 'Sí',
        no: 'No',
        close: 'Cerrar'
      },
      errors: {
        executionError: 'Error durante la ejecución',
        packageInstallError: 'Error al instalar el paquete',
        fileReadError: 'Error al leer el archivo',
        fileWriteError: 'Error al escribir el archivo',
        networkError: 'Error de red',
        unknownError: 'Error desconocido'
      },
      success: {
        codeSaved: 'Código guardado correctamente',
        packageInstalled: 'Paquete instalado correctamente',
        settingsSaved: 'Configuración guardada'
      },
      time: {
        seconds: 'segundos',
        minutes: 'minutos',
        hours: 'horas',
        days: 'días',
        ago: 'hace {{time}}'
      }
    });

    // Traducciones en inglés
    this.translations.set('en', {
      header: {
        run: 'Run',
        stop: 'Stop',
        install: 'Install Package',
        settings: 'Settings',
        theme: 'Theme',
        language: 'Language',
        help: 'Help'
      },
      editor: {
        placeholder: '// Write your JavaScript code here...\nconsole.log("Hello CheeseJS! 🧀");',
        save: 'Save',
        format: 'Format',
        autocomplete: 'Autocomplete',
        lineNumbers: 'Line Numbers',
        wordWrap: 'Word Wrap',
        minimap: 'Minimap'
      },
      console: {
        clear: 'Clear',
        output: 'Output',
        errors: 'Errors',
        warnings: 'Warnings',
        info: 'Information',
        logs: 'Logs',
        empty: 'No output to show',
        executing: 'Executing code...',
        stopped: 'Execution stopped'
      },
      packages: {
        install: 'Install {{package}}',
        installing: 'Installing {{package}}...',
        installed: '{{package}} installed successfully',
        error: 'Error installing {{package}}',
        uninstall: 'Uninstall {{package}}',
        search: 'Search packages...',
        version: 'Version',
        description: 'Description',
        noPackages: 'No packages installed'
      },
      sidebar: {
        files: 'Files',
        packages: 'Packages',
        settings: 'Settings',
        help: 'Help'
      },
      settings: {
        title: 'Settings',
        general: 'General',
        editor: 'Editor',
        appearance: 'Appearance',
        language: 'Language',
        theme: 'Theme',
        fontSize: 'Font Size',
        tabSize: 'Tab Size',
        autoSave: 'Auto Save',
        wordWrap: 'Word Wrap',
        lineNumbers: 'Line Numbers',
        minimap: 'Minimap',
        save: 'Save',
        cancel: 'Cancel',
        reset: 'Reset'
      },
      dialogs: {
        confirm: 'Confirm',
        cancel: 'Cancel',
        ok: 'OK',
        yes: 'Yes',
        no: 'No',
        close: 'Close'
      },
      errors: {
        executionError: 'Execution error',
        packageInstallError: 'Package installation error',
        fileReadError: 'File read error',
        fileWriteError: 'File write error',
        networkError: 'Network error',
        unknownError: 'Unknown error'
      },
      success: {
        codeSaved: 'Code saved successfully',
        packageInstalled: 'Package installed successfully',
        settingsSaved: 'Settings saved'
      },
      time: {
        seconds: 'seconds',
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
        ago: '{{time}} ago'
      }
    });
  }

  /**
   * Obtener traducción
   * @param {string} key - Clave de traducción (ej: 'header.run')
   * @param {Object} params - Parámetros para interpolación
   * @param {string} language - Idioma específico (opcional)
   * @returns {string}
   */
  t(key, params = {}, language = null) {
    const lang = language || this.currentLanguage;
    const translation = this.getTranslation(key, lang);
    
    if (translation) {
      return this.interpolate(translation, params);
    }

    // Fallback chain
    for (const fallbackLang of this.fallbackChain) {
      if (fallbackLang !== lang) {
        const fallbackTranslation = this.getTranslation(key, fallbackLang);
        if (fallbackTranslation) {
          console.warn(`⚠️ Usando fallback '${fallbackLang}' para clave '${key}'`);
          return this.interpolate(fallbackTranslation, params);
        }
      }
    }

    // Si no se encuentra traducción, devolver la clave
    console.warn(`⚠️ Traducción no encontrada para clave: ${key}`);
    return key;
  }

  /**
   * Obtener traducción anidada
   * @param {string} key - Clave de traducción
   * @param {string} language - Idioma
   * @returns {string|null}
   */
  getTranslation(key, language) {
    const translations = this.translations.get(language);
    if (!translations) return null;

    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  /**
   * Interpolar parámetros en la traducción
   * @param {string} translation - Texto de traducción
   * @param {Object} params - Parámetros
   * @returns {string}
   */
  interpolate(translation, params) {
    return translation.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Cambiar idioma
   * @param {string} language - Código de idioma
   * @returns {boolean}
   */
  async setLanguage(language) {
    if (!this.isLanguageSupported(language)) {
      console.error(`❌ Idioma '${language}' no soportado`);
      return false;
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;
    
    // Guardar preferencia
    this.saveLanguage(language);
    
    // Emitir evento de cambio
    eventBus.emit('i18n:language-changed', { 
      from: previousLanguage,
      to: language,
      translations: this.translations.get(language)
    });
    
    console.log(`🌍 Idioma cambiado a: ${language}`);
    return true;
  }

  /**
   * Obtener idioma actual
   * @returns {string}
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Obtener idiomas disponibles
   * @returns {Array}
   */
  getAvailableLanguages() {
    return Array.from(this.translations.keys()).map(code => ({
      code,
      name: this.getLanguageName(code),
      nativeName: this.getLanguageNativeName(code)
    }));
  }

  /**
   * Obtener nombre del idioma
   * @param {string} code - Código de idioma
   * @returns {string}
   */
  getLanguageName(code) {
    const names = {
      'es': 'Spanish',
      'en': 'English',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese'
    };
    return names[code] || code;
  }

  /**
   * Obtener nombre nativo del idioma
   * @param {string} code - Código de idioma
   * @returns {string}
   */
  getLanguageNativeName(code) {
    const nativeNames = {
      'es': 'Español',
      'en': 'English',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português'
    };
    return nativeNames[code] || code;
  }

  /**
   * Verificar si un idioma está soportado
   * @param {string} language - Código de idioma
   * @returns {boolean}
   */
  isLanguageSupported(language) {
    return this.translations.has(language);
  }

  /**
   * Detectar idioma del navegador
   * @returns {string}
   */
  detectLanguage() {
    if (typeof navigator !== 'undefined') {
      const language = navigator.language || navigator.userLanguage;
      return language.split('-')[0]; // 'es-ES' -> 'es'
    }
    return this.defaultLanguage;
  }

  /**
   * Formatear número según locale
   * @param {number} number - Número a formatear
   * @param {Object} options - Opciones de formateo
   * @returns {string}
   */
  formatNumber(number, options = {}) {
    try {
      const locale = this.getLocale();
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  /**
   * Formatear fecha según locale
   * @param {Date|string|number} date - Fecha a formatear
   * @param {Object} options - Opciones de formateo
   * @returns {string}
   */
  formatDate(date, options = {}) {
    try {
      const locale = this.getLocale();
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(locale, options).format(dateObj);
    } catch (error) {
      return date.toString();
    }
  }

  /**
   * Formatear tiempo relativo
   * @param {Date|string|number} date - Fecha
   * @returns {string}
   */
  formatRelativeTime(date) {
    try {
      const now = new Date();
      const dateObj = date instanceof Date ? date : new Date(date);
      const diffMs = now - dateObj;
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        return this.t('time.ago', { time: `${diffSeconds} ${this.t('time.seconds')}` });
      } else if (diffMinutes < 60) {
        return this.t('time.ago', { time: `${diffMinutes} ${this.t('time.minutes')}` });
      } else if (diffHours < 24) {
        return this.t('time.ago', { time: `${diffHours} ${this.t('time.hours')}` });
      } else {
        return this.t('time.ago', { time: `${diffDays} ${this.t('time.days')}` });
      }
    } catch (error) {
      return date.toString();
    }
  }

  /**
   * Obtener locale completo
   * @returns {string}
   */
  getLocale() {
    const locales = {
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR'
    };
    return locales[this.currentLanguage] || 'en-US';
  }

  /**
   * Agregar traducciones personalizadas
   * @param {string} language - Código de idioma
   * @param {Object} translations - Traducciones
   */
  addTranslations(language, translations) {
    if (!this.translations.has(language)) {
      this.translations.set(language, {});
    }

    const existing = this.translations.get(language);
    const merged = this.deepMerge(existing, translations);
    this.translations.set(language, merged);

    eventBus.emit('i18n:translations-added', { language, translations });
    console.log(`🌍 Traducciones agregadas para idioma: ${language}`);
  }

  /**
   * Merge profundo de objetos
   * @param {Object} target - Objeto objetivo
   * @param {Object} source - Objeto fuente
   * @returns {Object}
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Guardar idioma en localStorage
   * @param {string} language - Código de idioma
   */
  saveLanguage(language) {
    try {
      localStorage.setItem('cheesejs-language', language);
    } catch (error) {
      console.warn('⚠️ No se pudo guardar idioma en localStorage:', error);
    }
  }

  /**
   * Obtener idioma guardado
   * @returns {string|null}
   */
  getSavedLanguage() {
    try {
      return localStorage.getItem('cheesejs-language');
    } catch (error) {
      console.warn('⚠️ No se pudo leer idioma de localStorage:', error);
      return null;
    }
  }
}

// Instancia global del i18n Service
const i18nService = new I18nService();

export default I18nService;
export { i18nService };