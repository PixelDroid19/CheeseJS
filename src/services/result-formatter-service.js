/**
 * ResultFormatterService - Servicio para formateo y resaltado de resultados
 * Proporciona formateo con syntax highlighting, temas y visualización mejorada
 */
class ResultFormatterService {
  constructor() {
    this.formatters = new Map();
    this.themes = new Map();
    this.currentTheme = 'dark';
    
    // Configuración de formateo
    this.config = {
      maxDepth: 10,
      maxArrayLength: 100,
      maxStringLength: 1000,
      indentSize: 2,
      showTypes: true,
      showSizes: true,
      collapseLargeObjects: true,
      enableInteractivity: true
    };
    
    // Inicializar formatters y temas
    this.initializeFormatters();
    this.initializeThemes();
  }

  /**
   * Inicializar formatters por tipo de datos
   */
  initializeFormatters() {
    // Formatter para JSON
    this.formatters.set('json', {
      name: 'JSON',
      format: (data, options) => this.formatJSON(data, options),
      supports: (data) => this.isJSONSerializable(data)
    });
    
    // Formatter para objetos JavaScript
    this.formatters.set('object', {
      name: 'JavaScript Object',
      format: (data, options) => this.formatJSObject(data, options),
      supports: (data) => typeof data === 'object' && data !== null
    });
    
    // Formatter para arrays
    this.formatters.set('array', {
      name: 'Array',
      format: (data, options) => this.formatArray(data, options),
      supports: (data) => Array.isArray(data)
    });
    
    // Formatter para funciones
    this.formatters.set('function', {
      name: 'Function',
      format: (data, options) => this.formatFunction(data, options),
      supports: (data) => typeof data === 'function'
    });
    
    // Formatter para errores
    this.formatters.set('error', {
      name: 'Error',
      format: (data, options) => this.formatError(data, options),
      supports: (data) => data instanceof Error
    });
    
    // Formatter para primitivos
    this.formatters.set('primitive', {
      name: 'Primitive',
      format: (data, options) => this.formatPrimitive(data, options),
      supports: (data) => this.isPrimitive(data)
    });
  }

  /**
   * Inicializar temas de syntax highlighting
   */
  initializeThemes() {
    // Tema oscuro
    this.themes.set('dark', {
      name: 'Dark Theme',
      colors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        string: '#ce9178',
        number: '#b5cea8',
        boolean: '#569cd6',
        null: '#569cd6',
        undefined: '#569cd6',
        key: '#9cdcfe',
        bracket: '#d4d4d4',
        comma: '#d4d4d4',
        error: '#f14c4c',
        warning: '#ffcc02',
        info: '#75beff',
        success: '#4ec9b0',
        type: '#4ec9b0',
        comment: '#6a9955'
      },
      syntax: {
        fontFamily: 'Monaco, Menlo, \"Ubuntu Mono\", monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        padding: '12px',
        borderRadius: '4px',
        border: '1px solid #3c3c3c'
      }
    });
    
    // Tema claro
    this.themes.set('light', {
      name: 'Light Theme',
      colors: {
        background: '#ffffff',
        foreground: '#333333',
        string: '#a31515',
        number: '#098658',
        boolean: '#0000ff',
        null: '#0000ff',
        undefined: '#0000ff',
        key: '#001080',
        bracket: '#333333',
        comma: '#333333',
        error: '#cd3131',
        warning: '#bf8803',
        info: '#0451a5',
        success: '#00aa44',
        type: '#267f99',
        comment: '#008000'
      },
      syntax: {
        fontFamily: 'Monaco, Menlo, \"Ubuntu Mono\", monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        padding: '12px',
        borderRadius: '4px',
        border: '1px solid #e0e0e0'
      }
    });
  }

  /**
   * Formatear datos con syntax highlighting
   */
  format(data, options = {}) {
    const formatOptions = {
      ...this.config,
      ...options,
      theme: this.themes.get(options.theme || this.currentTheme)
    };
    
    try {
      // Detectar el tipo de formatter más apropiado
      const formatter = this.detectFormatter(data);
      
      if (!formatter) {
        return this.formatFallback(data, formatOptions);
      }
      
      // Formatear los datos
      const formatted = formatter.format(data, formatOptions);
      
      // Envolver con metadata
      return {
        formatted,
        type: formatter.name,
        theme: formatOptions.theme.name,
        metadata: this.generateMetadata(data, formatOptions),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error formateando datos:', error);
      return this.formatError(error, formatOptions);
    }
  }

  /**
   * Alias method for compatibility - formatResult calls format internally
   * @param {*} data - Data to format
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted result
   */
  formatResult(data, options = {}) {
    return this.format(data, options);
  }

  /**
   * Detectar formatter apropiado
   */
  detectFormatter(data) {
    // Prioridad: error > function > array > object > primitive
    const priorities = ['error', 'function', 'array', 'object', 'json', 'primitive'];
    
    for (const type of priorities) {
      const formatter = this.formatters.get(type);
      if (formatter && formatter.supports(data)) {
        return formatter;
      }
    }
    
    return null;
  }

  /**
   * Formatear JSON con syntax highlighting
   */
  formatJSON(data, options) {
    const { theme, indentSize, maxDepth } = options;
    const indent = ' '.repeat(indentSize);
    
    try {
      const jsonString = JSON.stringify(data, null, indentSize);
      return this.highlightJSON(jsonString, theme, 0, maxDepth);
    } catch (error) {
      // Si no es serializable, formatear como objeto JS
      return this.formatJSObject(data, options);
    }
  }

  /**
   * Aplicar syntax highlighting a JSON
   */
  highlightJSON(jsonString, theme, currentDepth = 0, maxDepth = 10) {
    if (currentDepth > maxDepth) {
      return `<span style=\"color: ${theme.colors.comment}\">... (max depth reached)</span>`;
    }
    
    const lines = jsonString.split('\n');
    const highlighted = lines.map(line => {
      let processedLine = line;
      
      // Destacar strings
      processedLine = processedLine.replace(
        /\"([^\"\\\\]*(\\\\.[^\"\\\\]*)*)\"/g,
        `<span style=\"color: ${theme.colors.string}\">\"$1\"</span>`
      );
      
      // Destacar números
      processedLine = processedLine.replace(
        /\\b(-?\\d+\\.?\\d*)\\b/g,
        `<span style=\"color: ${theme.colors.number}\">$1</span>`
      );
      
      // Destacar booleans
      processedLine = processedLine.replace(
        /\\b(true|false)\\b/g,
        `<span style=\"color: ${theme.colors.boolean}\">$1</span>`
      );
      
      // Destacar null/undefined
      processedLine = processedLine.replace(
        /\\b(null|undefined)\\b/g,
        `<span style=\"color: ${theme.colors.null}\">$1</span>`
      );
      
      // Destacar llaves de objeto (que no están ya en strings)
      processedLine = processedLine.replace(
        /\"([^\"]+)\":/g,
        `<span style=\"color: ${theme.colors.key}\">\"$1\"</span>:`
      );
      
      // Destacar brackets y comas
      processedLine = processedLine.replace(
        /([{}\\[\\],])/g,
        `<span style=\"color: ${theme.colors.bracket}\">$1</span>`
      );
      
      return processedLine;
    });
    
    return highlighted.join('\n');
  }

  /**
   * Formatear objeto JavaScript (no-JSON serializable)
   */
  formatJSObject(obj, options, currentDepth = 0) {
    const { theme, maxDepth, collapseLargeObjects } = options;
    
    if (currentDepth > maxDepth) {
      return `<span style=\"color: ${theme.colors.comment}\">... (max depth)</span>`;
    }
    
    if (obj === null) {
      return `<span style=\"color: ${theme.colors.null}\">null</span>`;
    }
    
    if (obj === undefined) {
      return `<span style=\"color: ${theme.colors.undefined}\">undefined</span>`;
    }
    
    const entries = Object.entries(obj);
    
    if (entries.length === 0) {
      return `<span style=\"color: ${theme.colors.bracket}\">{}</span>`;
    }
    
    if (collapseLargeObjects && entries.length > 5) {
      return this.formatCollapsibleObject(obj, options, currentDepth);
    }
    
    const formatted = entries.map(([key, value]) => {
      const formattedKey = `<span style=\"color: ${theme.colors.key}\">${key}</span>`;
      const formattedValue = this.formatValue(value, options, currentDepth + 1);
      return `  ${formattedKey}: ${formattedValue}`;
    }).join(',\n');
    
    return `<span style=\"color: ${theme.colors.bracket}\">{</span>\n${formatted}\n<span style=\"color: ${theme.colors.bracket}\">}</span>`;
  }

  /**
   * Formatear array
   */
  formatArray(arr, options, currentDepth = 0) {
    const { theme, maxArrayLength, maxDepth } = options;
    
    if (currentDepth > maxDepth) {
      return `<span style=\"color: ${theme.colors.comment}\">... (max depth)</span>`;
    }
    
    if (arr.length === 0) {
      return `<span style=\"color: ${theme.colors.bracket}\">[]</span>`;
    }
    
    const displayArray = arr.slice(0, maxArrayLength);
    const hasMore = arr.length > maxArrayLength;
    
    const formatted = displayArray.map((item, index) => {
      const formattedValue = this.formatValue(item, options, currentDepth + 1);
      return `  ${formattedValue}`;
    }).join(',\n');
    
    const moreText = hasMore ? 
      `,\n  <span style=\"color: ${theme.colors.comment}\">... ${arr.length - maxArrayLength} more items</span>` : 
      '';
    
    return `<span style=\"color: ${theme.colors.bracket}\">[</span>\n${formatted}${moreText}\n<span style=\"color: ${theme.colors.bracket}\">]</span>`;
  }

  /**
   * Formatear función
   */
  formatFunction(func, options) {
    const { theme, maxStringLength } = options;
    const funcString = func.toString();
    const truncated = funcString.length > maxStringLength ? 
      funcString.substring(0, maxStringLength) + '...' : 
      funcString;
    
    return `<span style=\"color: ${theme.colors.key}\">[Function: ${func.name || 'anonymous'}]</span>\n<pre style=\"color: ${theme.colors.comment}; font-size: 0.9em; margin: 4px 0;\">${this.escapeHtml(truncated)}</pre>`;
  }

  /**
   * Formatear error
   */
  formatError(error, options) {
    const { theme } = options;
    
    return `<div style=\"color: ${theme.colors.error}; border-left: 3px solid ${theme.colors.error}; padding-left: 8px;\">\n  <strong>${error.name}</strong>: ${this.escapeHtml(error.message)}\n  ${error.stack ? `<pre style=\"color: ${theme.colors.comment}; font-size: 0.8em; margin-top: 4px;\">${this.escapeHtml(error.stack)}</pre>` : ''}\n</div>`;
  }

  /**
   * Formatear primitivos
   */
  formatPrimitive(value, options) {
    const { theme } = options;
    
    if (typeof value === 'string') {
      const truncated = value.length > options.maxStringLength ? 
        value.substring(0, options.maxStringLength) + '...' : 
        value;
      return `<span style=\"color: ${theme.colors.string}\">\"${this.escapeHtml(truncated)}\"</span>`;
    }
    
    if (typeof value === 'number') {
      return `<span style=\"color: ${theme.colors.number}\">${value}</span>`;
    }
    
    if (typeof value === 'boolean') {
      return `<span style=\"color: ${theme.colors.boolean}\">${value}</span>`;
    }
    
    if (value === null) {
      return `<span style=\"color: ${theme.colors.null}\">null</span>`;
    }
    
    if (value === undefined) {
      return `<span style=\"color: ${theme.colors.undefined}\">undefined</span>`;
    }
    
    return `<span style=\"color: ${theme.colors.foreground}\">${this.escapeHtml(String(value))}</span>`;
  }

  /**
   * Formatear valor recursivamente
   */
  formatValue(value, options, currentDepth) {
    if (this.isPrimitive(value)) {
      return this.formatPrimitive(value, options);
    }
    
    if (value instanceof Error) {
      return this.formatError(value, options);
    }
    
    if (typeof value === 'function') {
      return this.formatFunction(value, options);
    }
    
    if (Array.isArray(value)) {
      return this.formatArray(value, options, currentDepth);
    }
    
    if (typeof value === 'object' && value !== null) {
      return this.formatJSObject(value, options, currentDepth);
    }
    
    return this.formatPrimitive(value, options);
  }

  /**
   * Formatear objeto colapsible (para objetos grandes)
   */
  formatCollapsibleObject(obj, options, currentDepth) {
    const { theme } = options;
    const entries = Object.entries(obj);
    const preview = entries.slice(0, 3).map(([key, value]) => {
      const shortValue = this.getShortValue(value);
      return `${key}: ${shortValue}`;
    }).join(', ');
    
    const id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return `
<div class=\"collapsible-object\">
  <span style=\"color: ${theme.colors.bracket}; cursor: pointer;\" onclick=\"toggleCollapse('${id}')\">
    ▶ {${preview}${entries.length > 3 ? ', ...' : ''}}
  </span>
  <div id=\"${id}\" style=\"display: none; margin-left: 16px;\">
    ${this.formatJSObject(obj, { ...options, collapseLargeObjects: false }, currentDepth)}
  </div>
</div>`;
  }

  /**
   * Obtener valor corto para preview
   */
  getShortValue(value) {
    if (this.isPrimitive(value)) {
      const str = String(value);
      return str.length > 20 ? str.substring(0, 20) + '...' : str;
    }
    
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }
    
    if (typeof value === 'object' && value !== null) {
      return 'Object';
    }
    
    if (typeof value === 'function') {
      return `Function(${value.name || 'anonymous'})`;
    }
    
    return String(value);
  }

  /**
   * Generar metadata del resultado
   */
  generateMetadata(data, options) {
    return {
      type: this.getDataType(data),
      size: this.getDataSize(data),
      serializable: this.isJSONSerializable(data),
      depth: this.getObjectDepth(data),
      properties: this.getObjectProperties(data)
    };
  }

  /**
   * Obtener tipo de datos
   */
  getDataType(data) {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (Array.isArray(data)) return 'array';
    if (data instanceof Error) return 'error';
    if (data instanceof Date) return 'date';
    if (data instanceof RegExp) return 'regexp';
    return typeof data;
  }

  /**
   * Obtener tamaño aproximado de datos
   */
  getDataSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch {
      return String(data).length;
    }
  }

  /**
   * Verificar si es serializable a JSON
   */
  isJSONSerializable(data) {
    try {
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtener profundidad de objeto
   */
  getObjectDepth(obj, currentDepth = 0) {
    if (currentDepth > 50) return 50; // Prevenir stack overflow
    
    if (!obj || typeof obj !== 'object') {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        const depth = this.getObjectDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    return maxDepth;
  }

  /**
   * Obtener propiedades de objeto
   */
  getObjectProperties(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }
    
    return {
      keys: Object.keys(data).length,
      hasNonEnumerableProps: Object.getOwnPropertyNames(data).length > Object.keys(data).length,
      prototype: Object.getPrototypeOf(data)?.constructor?.name || null
    };
  }

  /**
   * Verificar si es primitivo
   */
  isPrimitive(value) {
    return value === null || 
           value === undefined || 
           typeof value === 'string' || 
           typeof value === 'number' || 
           typeof value === 'boolean' || 
           typeof value === 'symbol' || 
           typeof value === 'bigint';
  }

  /**
   * Escapar HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Formatear fallback
   */
  formatFallback(data, options) {
    const { theme } = options;
    return `<span style=\"color: ${theme.colors.foreground}\">${this.escapeHtml(String(data))}</span>`;
  }

  /**
   * Establecer tema
   */
  setTheme(themeName) {
    if (this.themes.has(themeName)) {
      this.currentTheme = themeName;
    }
  }

  /**
   * Obtener tema actual
   */
  getCurrentTheme() {
    return this.themes.get(this.currentTheme);
  }

  /**
   * Agregar tema personalizado
   */
  addTheme(name, theme) {
    this.themes.set(name, theme);
  }

  /**
   * Obtener todos los temas
   */
  getThemes() {
    return Array.from(this.themes.keys());
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtener configuración actual
   */
  getConfig() {
    return { ...this.config };
  }
}

// Instancia singleton
export const resultFormatter = new ResultFormatterService();

// Exportar clase para testing
export { ResultFormatterService };

export default resultFormatter;