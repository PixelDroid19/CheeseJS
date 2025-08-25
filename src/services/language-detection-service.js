/**
 * LanguageDetectionService - Servicio para detección automática de lenguajes
 * Detecta JavaScript, TypeScript, JSX, y TSX basado en extensiones y contenido
 */
class LanguageDetectionService {
  constructor() {
    this.supportedLanguages = {
      javascript: {
        extensions: ['js', 'mjs', 'cjs'],
        mimeTypes: ['text/javascript', 'application/javascript'],
        monacoLanguage: 'javascript',
        displayName: 'JavaScript'
      },
      typescript: {
        extensions: ['ts'],
        mimeTypes: ['text/typescript'],
        monacoLanguage: 'typescript',
        displayName: 'TypeScript'
      },
      jsx: {
        extensions: ['jsx'],
        mimeTypes: ['text/jsx'],
        monacoLanguage: 'javascript', // Monaco trata JSX como JavaScript
        displayName: 'JavaScript React'
      },
      tsx: {
        extensions: ['tsx'],
        mimeTypes: ['text/tsx'],
        monacoLanguage: 'typescript', // Monaco trata TSX como TypeScript
        displayName: 'TypeScript React'
      }
    };

    // Patrones de detección por contenido
    this.contentPatterns = {
      typescript: [
        /interface\s+\w+/,
        /type\s+\w+\s*=/,
        /:\s*(string|number|boolean|object|any|unknown|never|void)\b/,
        /enum\s+\w+/,
        /namespace\s+\w+/,
        /declare\s+(module|namespace|var|let|const|function|class)/,
        /import\s+type\s+/,
        /export\s+type\s+/,
        /<.*>\s*\(/  // Generic function calls
      ],
      jsx: [
        /<[A-Z]\w*\s*[^>]*>/,        // React component tags
        /<\/[A-Z]\w*>/,              // Closing React component tags
        /React\.createElement/,       // React.createElement calls
        /jsx\s*:/,                   // JSX pragma
        /\w+\s*=\s*<[a-zA-Z]/,      // JSX assignment
        /return\s*\(\s*<[a-zA-Z]/,  // Return JSX
        /Fragment>/,                 // React Fragment
        /className\s*=/              // JSX className attribute
      ],
      react: [
        /import\s+.*from\s+['"`]react['"`]/,
        /useState\s*\(/,
        /useEffect\s*\(/,
        /React\./,
        /props\./,
        /this\.props/,
        /this\.state/
      ]
    };

    // Cache para mejorar rendimiento
    this.detectionCache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * Detectar lenguaje principal basado en archivo y contenido
   */
  detectLanguage(code, fileName = null) {
    const cacheKey = `${fileName || 'content'}_${code.substring(0, 200)}`;
    
    // Verificar cache
    if (this.detectionCache.has(cacheKey)) {
      return this.detectionCache.get(cacheKey);
    }

    let detectedLanguage = 'javascript'; // Por defecto
    let confidence = 0;

    // 1. Detectar por extensión de archivo (más confiable)
    if (fileName) {
      const fileLanguage = this.detectByFileName(fileName);
      if (fileLanguage.language !== 'javascript') {
        detectedLanguage = fileLanguage.language;
        confidence = fileLanguage.confidence;
      }
    }

    // 2. Detectar por contenido (puede refinar la detección)
    const contentLanguage = this.detectByContent(code);
    if (contentLanguage.confidence > confidence) {
      detectedLanguage = contentLanguage.language;
      confidence = contentLanguage.confidence;
    }

    // 3. Refinamiento para JSX/TSX
    if (this.containsJSX(code)) {
      if (detectedLanguage === 'typescript' || this.containsTypeScript(code)) {
        detectedLanguage = 'tsx';
      } else {
        detectedLanguage = 'jsx';
      }
      confidence = Math.max(confidence, 0.8);
    }

    const result = {
      language: detectedLanguage,
      confidence,
      monacoLanguage: this.supportedLanguages[detectedLanguage].monacoLanguage,
      displayName: this.supportedLanguages[detectedLanguage].displayName,
      detectedBy: fileName ? 'filename_and_content' : 'content_only'
    };

    // Guardar en cache
    this.setCacheResult(cacheKey, result);

    return result;
  }

  /**
   * Detectar lenguaje por nombre de archivo
   */
  detectByFileName(fileName) {
    const extension = this.getFileExtension(fileName);
    
    for (const [languageKey, languageInfo] of Object.entries(this.supportedLanguages)) {
      if (languageInfo.extensions.includes(extension)) {
        return {
          language: languageKey,
          confidence: 0.9, // Alta confianza en extensiones
          reason: `File extension: .${extension}`
        };
      }
    }

    return {
      language: 'javascript',
      confidence: 0.1,
      reason: 'Unknown extension, defaulting to JavaScript'
    };
  }

  /**
   * Detectar lenguaje por contenido del código
   */
  detectByContent(code) {
    if (!code || code.trim().length === 0) {
      return { language: 'javascript', confidence: 0.1, reason: 'Empty content' };
    }

    const detectionScores = {
      javascript: 0.1, // Score base
      typescript: 0,
      jsx: 0,
      tsx: 0
    };

    // Analizar patrones TypeScript
    const tsMatches = this.countPatternMatches(code, this.contentPatterns.typescript);
    if (tsMatches > 0) {
      detectionScores.typescript = Math.min(0.3 + (tsMatches * 0.2), 0.9);
    }

    // Analizar patrones JSX
    const jsxMatches = this.countPatternMatches(code, this.contentPatterns.jsx);
    if (jsxMatches > 0) {
      detectionScores.jsx = Math.min(0.3 + (jsxMatches * 0.2), 0.9);
    }

    // Analizar patrones React
    const reactMatches = this.countPatternMatches(code, this.contentPatterns.react);
    if (reactMatches > 0) {
      detectionScores.jsx += Math.min(reactMatches * 0.1, 0.3);
      detectionScores.tsx += Math.min(reactMatches * 0.1, 0.3);
    }

    // TSX tiene preferencia si hay TypeScript Y JSX
    if (detectionScores.typescript > 0.2 && jsxMatches > 0) {
      detectionScores.tsx = Math.min(detectionScores.typescript + detectionScores.jsx, 0.95);
    }

    // Encontrar el lenguaje con mayor score
    const maxScore = Math.max(...Object.values(detectionScores));
    const detectedLanguage = Object.keys(detectionScores).find(
      key => detectionScores[key] === maxScore
    );

    return {
      language: detectedLanguage,
      confidence: maxScore,
      reason: `Content analysis - ${Object.entries(detectionScores)
        .filter(([_, score]) => score > 0.1)
        .map(([lang, score]) => `${lang}:${score.toFixed(2)}`)
        .join(', ')}`
    };
  }

  /**
   * Verificar si el código contiene JSX
   */
  containsJSX(code) {
    return this.contentPatterns.jsx.some(pattern => pattern.test(code));
  }

  /**
   * Verificar si el código contiene TypeScript
   */
  containsTypeScript(code) {
    return this.contentPatterns.typescript.some(pattern => pattern.test(code));
  }

  /**
   * Contar coincidencias de patrones
   */
  countPatternMatches(code, patterns) {
    let matches = 0;
    patterns.forEach(pattern => {
      const match = code.match(pattern);
      if (match) {
        matches += match.length || 1;
      }
    });
    return matches;
  }

  /**
   * Obtener extensión de archivo
   */
  getFileExtension(fileName) {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Configurar soporte de lenguaje en Monaco
   */
  configureMonacoLanguage(monaco, language) {
    const languageInfo = this.supportedLanguages[language];
    if (!languageInfo) return;

    try {
      // Configurar opciones específicas del lenguaje
      switch (language) {
        case 'typescript':
        case 'tsx':
          this.configureTypeScript(monaco);
          break;
        case 'jsx':
          this.configureJavaScriptJSX(monaco);
          break;
        default:
          this.configureJavaScript(monaco);
      }
    } catch (error) {
      console.error(`Error configurando lenguaje ${language}:`, error);
    }
  }

  /**
   * Configurar TypeScript en Monaco
   */
  configureTypeScript(monaco) {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: false,
      skipLibCheck: true
    });

    // Configurar librerías adicionales
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module 'react' {
        export interface Component<P = {}, S = {}> {}
        export function useState<T>(initial: T): [T, (value: T) => void];
        export function useEffect(effect: () => void, deps?: any[]): void;
      }
    `, 'react.d.ts');
  }

  /**
   * Configurar JavaScript con JSX en Monaco
   */
  configureJavaScriptJSX(monaco) {
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React'
    });
  }

  /**
   * Configurar JavaScript básico en Monaco
   */
  configureJavaScript(monaco) {
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false
    });
  }

  /**
   * Obtener información de lenguaje
   */
  getLanguageInfo(language) {
    return this.supportedLanguages[language] || this.supportedLanguages.javascript;
  }

  /**
   * Obtener todos los lenguajes soportados
   */
  getSupportedLanguages() {
    return Object.keys(this.supportedLanguages);
  }

  /**
   * Validar si un lenguaje es soportado
   */
  isLanguageSupported(language) {
    return language in this.supportedLanguages;
  }

  /**
   * Gestión de cache
   */
  setCacheResult(key, result) {
    if (this.detectionCache.size >= this.maxCacheSize) {
      // Remover el más antiguo
      const firstKey = this.detectionCache.keys().next().value;
      this.detectionCache.delete(firstKey);
    }
    this.detectionCache.set(key, result);
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.detectionCache.clear();
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats() {
    return {
      size: this.detectionCache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.detectionCache.keys())
    };
  }

  /**
   * Detectar cambios de lenguaje en tiempo real
   */
  createLanguageWatcher(callback, debounceMs = 500) {
    let timeoutId = null;
    
    return (code, fileName) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const result = this.detectLanguage(code, fileName);
        callback(result);
      }, debounceMs);
    };
  }

  /**
   * Obtener sugerencias de configuración para un lenguaje
   */
  getLanguageSuggestions(language) {
    const suggestions = {
      typescript: {
        dependencies: ['typescript', '@types/node'],
        settings: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true
        },
        extensions: ['TypeScript Language Service', 'TSLint']
      },
      jsx: {
        dependencies: ['react', '@types/react'],
        settings: {
          jsx: 'react',
          jsxFactory: 'React.createElement'
        },
        extensions: ['ES7+ React/Redux/React-Native snippets']
      },
      tsx: {
        dependencies: ['typescript', 'react', '@types/react', '@types/node'],
        settings: {
          jsx: 'react',
          strict: true,
          jsxFactory: 'React.createElement'
        },
        extensions: ['TypeScript Language Service', 'ES7+ React/Redux/React-Native snippets']
      },
      javascript: {
        dependencies: ['@types/node'],
        settings: {
          target: 'ES2020',
          moduleResolution: 'node'
        },
        extensions: ['JavaScript (ES6) code snippets']
      }
    };

    return suggestions[language] || suggestions.javascript;
  }
}

// Instancia singleton del servicio
export const languageDetectionService = new LanguageDetectionService();

// Exportar la clase para testing
export { LanguageDetectionService };

export default languageDetectionService;