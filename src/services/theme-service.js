import { eventBus } from '../utils/event-bus.js';

/**
 * Theme Service - Gestión de themes y estilos de la aplicación
 * Maneja themes light/dark/custom con variables CSS
 */
class ThemeService {
  constructor() {
    this.currentTheme = 'light';
    this.themes = new Map();
    this.customThemes = new Map();
    this.isInitialized = false;
    
    // Cargar themes por defecto
    this.loadDefaultThemes();
  }

  /**
   * Inicializar el servicio de themes
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Cargar theme guardado
      const savedTheme = this.getSavedTheme();
      if (savedTheme && this.themes.has(savedTheme)) {
        this.currentTheme = savedTheme;
      }

      // Aplicar theme inicial
      await this.applyTheme(this.currentTheme);
      
      // Escuchar cambios de preferencia del sistema
      this.setupSystemThemeListener();
      
      this.isInitialized = true;
      eventBus.emit('theme:initialized', { theme: this.currentTheme });
      
      console.log('🎨 Theme Service inicializado con theme:', this.currentTheme);
    } catch (error) {
      console.error('❌ Error al inicializar Theme Service:', error);
    }
  }

  /**
   * Cargar themes por defecto
   */
  loadDefaultThemes() {
    // Theme Light
    this.themes.set('light', {
      name: 'Light',
      variables: {
        // Colores principales
        '--primary-color': '#007ACC',
        '--secondary-color': '#1E1E1E',
        '--accent-color': '#0078D7',
        
        // Backgrounds
        '--background-color': '#FFFFFF',
        '--surface-color': '#F8F9FA',
        '--surface-variant': '#F1F3F4',
        '--card-background': '#FFFFFF',
        
        // Textos
        '--text-color': '#212529',
        '--text-secondary': '#6C757D',
        '--text-muted': '#ADB5BD',
        '--text-inverse': '#FFFFFF',
        
        // Bordes
        '--border-color': '#E9ECEF',
        '--border-focus': '#007ACC',
        '--divider-color': '#DEE2E6',
        
        // Estados
        '--success-color': '#28A745',
        '--warning-color': '#FFC107',
        '--error-color': '#DC3545',
        '--info-color': '#17A2B8',
        
        // Editor
        '--editor-background': '#FFFFFF',
        '--editor-foreground': '#000000',
        '--editor-selection': '#ADD6FF',
        '--editor-line-highlight': '#F8F9FA',
        '--editor-gutter': '#F1F3F4',
        '--editor-cursor': '#000000',
        
        // Console
        '--console-background': '#FFFFFF',
        '--console-text': '#212529',
        '--console-error': '#DC3545',
        '--console-warning': '#FFC107',
        '--console-info': '#17A2B8',
        '--console-success': '#28A745',
        
        // Shadows
        '--shadow-sm': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        '--shadow-md': '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        '--shadow-lg': '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
        
        // Header
        '--header-background': '#F8F9FA',
        '--header-text': '#212529',
        '--header-border': '#DEE2E6',
        
        // Sidebar
        '--sidebar-background': '#F1F3F4',
        '--sidebar-text': '#495057',
        '--sidebar-hover': '#E9ECEF',
        '--sidebar-active': '#007ACC',
        
        // Scrollbar
        '--scrollbar-track': '#F1F3F4',
        '--scrollbar-thumb': '#CED4DA',
        '--scrollbar-thumb-hover': '#ADB5BD'
      }
    });

    // Theme Dark
    this.themes.set('dark', {
      name: 'Dark',
      variables: {
        // Colores principales
        '--primary-color': '#007ACC',
        '--secondary-color': '#FFFFFF',
        '--accent-color': '#0078D7',
        
        // Backgrounds
        '--background-color': '#1E1E1E',
        '--surface-color': '#252526',
        '--surface-variant': '#2D2D30',
        '--card-background': '#2D2D30',
        
        // Textos
        '--text-color': '#CCCCCC',
        '--text-secondary': '#999999',
        '--text-muted': '#6A6A6A',
        '--text-inverse': '#1E1E1E',
        
        // Bordes
        '--border-color': '#3E3E42',
        '--border-focus': '#007ACC',
        '--divider-color': '#3E3E42',
        
        // Estados
        '--success-color': '#28A745',
        '--warning-color': '#FFC107',
        '--error-color': '#F44747',
        '--info-color': '#17A2B8',
        
        // Editor
        '--editor-background': '#1E1E1E',
        '--editor-foreground': '#D4D4D4',
        '--editor-selection': '#264F78',
        '--editor-line-highlight': '#2D2D30',
        '--editor-gutter': '#252526',
        '--editor-cursor': '#AEAFAD',
        
        // Console
        '--console-background': '#1E1E1E',
        '--console-text': '#CCCCCC',
        '--console-error': '#F44747',
        '--console-warning': '#FFCC02',
        '--console-info': '#75BEFF',
        '--console-success': '#89D185',
        
        // Shadows
        '--shadow-sm': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
        '--shadow-md': '0 3px 6px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.5)',
        '--shadow-lg': '0 10px 20px rgba(0,0,0,0.5), 0 6px 6px rgba(0,0,0,0.6)',
        
        // Header
        '--header-background': '#2D2D30',
        '--header-text': '#CCCCCC',
        '--header-border': '#3E3E42',
        
        // Sidebar
        '--sidebar-background': '#252526',
        '--sidebar-text': '#CCCCCC',
        '--sidebar-hover': '#2D2D30',
        '--sidebar-active': '#007ACC',
        
        // Scrollbar
        '--scrollbar-track': '#2D2D30',
        '--scrollbar-thumb': '#424242',
        '--scrollbar-thumb-hover': '#4F4F4F'
      }
    });
  }

  /**
   * Aplicar theme
   * @param {string} themeName - Nombre del theme
   */
  async applyTheme(themeName) {
    const theme = this.themes.get(themeName) || this.customThemes.get(themeName);
    
    if (!theme) {
      console.error(`❌ Theme '${themeName}' no encontrado`);
      return false;
    }

    try {
      // Aplicar variables CSS
      const root = document.documentElement;
      Object.entries(theme.variables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Actualizar tema actual
      this.currentTheme = themeName;
      
      // Guardar preferencia
      this.saveTheme(themeName);
      
      // Aplicar clase de theme al body
      document.body.className = document.body.className
        .replace(/theme-\w+/g, '')
        .trim();
      document.body.classList.add(`theme-${themeName}`);
      
      // Emitir evento de cambio
      eventBus.emit('theme:changed', { 
        theme: themeName, 
        variables: theme.variables 
      });
      
      console.log(`🎨 Theme aplicado: ${theme.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al aplicar theme ${themeName}:`, error);
      return false;
    }
  }

  /**
   * Obtener theme actual
   * @returns {string}
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Obtener todos los themes disponibles
   * @returns {Object}
   */
  getAvailableThemes() {
    const themes = {};
    
    // Themes por defecto
    for (const [key, theme] of this.themes) {
      themes[key] = {
        name: theme.name,
        type: 'default'
      };
    }
    
    // Themes personalizados
    for (const [key, theme] of this.customThemes) {
      themes[key] = {
        name: theme.name,
        type: 'custom'
      };
    }
    
    return themes;
  }

  /**
   * Cambiar theme
   * @param {string} themeName - Nombre del theme
   */
  async setTheme(themeName) {
    if (themeName === this.currentTheme) {
      return true;
    }

    const success = await this.applyTheme(themeName);
    if (success) {
      eventBus.emit('theme:switched', { 
        from: this.currentTheme, 
        to: themeName 
      });
    }
    
    return success;
  }

  /**
   * Alternar entre light y dark
   */
  async toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    return await this.setTheme(newTheme);
  }

  /**
   * Crear theme personalizado
   * @param {string} name - Nombre del theme
   * @param {Object} variables - Variables CSS del theme
   * @param {string} baseTheme - Theme base para heredar
   */
  createCustomTheme(name, variables, baseTheme = 'light') {
    const base = this.themes.get(baseTheme);
    if (!base) {
      throw new Error(`Theme base '${baseTheme}' no encontrado`);
    }

    const customTheme = {
      name,
      variables: { ...base.variables, ...variables },
      baseTheme
    };

    this.customThemes.set(name, customTheme);
    
    eventBus.emit('theme:custom-created', { name, theme: customTheme });
    console.log(`🎨 Theme personalizado creado: ${name}`);
    
    return name;
  }

  /**
   * Eliminar theme personalizado
   * @param {string} name - Nombre del theme
   */
  deleteCustomTheme(name) {
    if (this.customThemes.has(name)) {
      this.customThemes.delete(name);
      
      // Si es el theme actual, cambiar a light
      if (this.currentTheme === name) {
        this.setTheme('light');
      }
      
      eventBus.emit('theme:custom-deleted', { name });
      console.log(`🗑️ Theme personalizado eliminado: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Obtener variables del theme actual
   * @returns {Object}
   */
  getCurrentThemeVariables() {
    const theme = this.themes.get(this.currentTheme) || 
                  this.customThemes.get(this.currentTheme);
    return theme ? theme.variables : {};
  }

  /**
   * Detectar preferencia de theme del sistema
   * @returns {string}
   */
  getSystemThemePreference() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  /**
   * Configurar listener para cambios de theme del sistema
   */
  setupSystemThemeListener() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        const systemTheme = e.matches ? 'dark' : 'light';
        eventBus.emit('theme:system-changed', { theme: systemTheme });
        
        // Auto-aplicar si está configurado
        if (this.getSavedTheme() === 'auto') {
          this.setTheme(systemTheme);
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
    }
  }

  /**
   * Guardar theme en localStorage
   * @param {string} themeName - Nombre del theme
   */
  saveTheme(themeName) {
    try {
      localStorage.setItem('cheesejs-theme', themeName);
    } catch (error) {
      console.warn('⚠️ No se pudo guardar theme en localStorage:', error);
    }
  }

  /**
   * Obtener theme guardado
   * @returns {string|null}
   */
  getSavedTheme() {
    try {
      return localStorage.getItem('cheesejs-theme');
    } catch (error) {
      console.warn('⚠️ No se pudo leer theme de localStorage:', error);
      return null;
    }
  }

  /**
   * Exportar theme personalizado
   * @param {string} themeName - Nombre del theme
   * @returns {Object|null}
   */
  exportTheme(themeName) {
    const theme = this.customThemes.get(themeName);
    if (theme) {
      return {
        name: theme.name,
        variables: theme.variables,
        baseTheme: theme.baseTheme,
        exportedAt: new Date().toISOString()
      };
    }
    return null;
  }

  /**
   * Importar theme personalizado
   * @param {Object} themeData - Datos del theme
   * @returns {boolean}
   */
  importTheme(themeData) {
    try {
      const { name, variables, baseTheme } = themeData;
      this.createCustomTheme(name, variables, baseTheme || 'light');
      return true;
    } catch (error) {
      console.error('❌ Error al importar theme:', error);
      return false;
    }
  }
}

// Instancia global del Theme Service
const themeService = new ThemeService();

export default ThemeService;
export { themeService };