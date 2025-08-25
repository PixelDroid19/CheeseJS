import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';
import { cheeseJSCore } from '../core/cheesejs-core.js';

/**
 * EditorStore - Gestión centralizada del estado del editor
 * Maneja código, lenguajes, ejecución, dependencias y configuración de Monaco
 */
const initialState = createInitialState({
  // Estado del editor Monaco
  editorInstance: null,
  monacoInstance: null,
  isReady: false,
  
  // Gestión de código
  currentCode: `// 🧀 Bienvenido a CheeseJS
// Escribe tu código JavaScript aquí

console.log('¡Hola CheeseJS! 🧀');

// Ejemplo básico
const saludo = 'Hola mundo desde CheeseJS';
console.log(saludo);

// Funciones
function sumar(a, b) {
  return a + b;
}

console.log('2 + 3 =', sumar(2, 3));

// Arrays y métodos
const numeros = [1, 2, 3, 4, 5];
const pares = numeros.filter(n => n % 2 === 0);
console.log('Números pares:', pares);

// Promises y async/await
async function obtenerDatos() {
  try {
    // Simular una API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { mensaje: 'Datos obtenidos correctamente' };
  } catch (error) {
    console.error('Error:', error);
  }
}

obtenerDatos().then(datos => {
  console.log(datos);
});

// Experimenta con tu código aquí...
`,
  savedCode: '',
  hasUnsavedChanges: false,
  
  // Gestión de archivos
  currentFile: 'index.js',
  currentLanguage: 'javascript',
  supportedLanguages: ['javascript', 'typescript', 'jsx', 'tsx'],
  
  // Estado de ejecución
  isExecuting: false,
  executionResult: null,
  executionError: null,
  executionTime: 0,
  executionStartTime: null,
  
  // Gestión de dependencias
  installedPackages: new Set(['@types/node']),
  missingDependencies: [],
  suggestedInstallations: [],
  dependencyInstallInProgress: false,
  
  // Configuración del editor
  editorConfig: {
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    minimap: { enabled: true },
    automaticLayout: true,
    scrollBeyondLastLine: true,
    smoothScrolling: true,
    cursorBlinking: 'blink',
    cursorStyle: 'line',
    renderWhitespace: 'selection',
    renderControlCharacters: false,
    rulers: [],
    folding: true,
    foldingStrategy: 'auto',
    showFoldingControls: 'mouseover',
    matchBrackets: 'always',
    selectionHighlight: true,
    occurrencesHighlight: true,
    bracketPairColorization: { enabled: true },
    formatOnPaste: true,
    formatOnType: true,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'top',
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: true,
    parameterHints: { enabled: true },
    autoClosingBrackets: 'languageDefined',
    autoClosingQuotes: 'languageDefined',
    autoSurround: 'languageDefined',
    linkedEditing: false
  },
  
  // Tema del editor (sincronizado con terminal)
  theme: {
    name: 'cheesejs-dark',
    isDark: true,
    colors: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      selection: '#264f78',
      lineHighlight: '#2a2d2e',
      cursor: '#ffffff'
    }
  },
  
  // Estado de formateo
  isFormatting: false,
  formatError: null,
  
  // Historial de cambios
  changeHistory: [],
  maxHistorySize: 100,
  
  // Configuración de snippets
  customSnippets: new Map(),
  
  // Estado de autocompletado
  completionProviders: new Map(),
  
  // Métricas de rendimiento
  performance: {
    lastExecutionTime: 0,
    averageExecutionTime: 0,
    totalExecutions: 0,
    codeComplexity: 0
  }
});

export const useEditorStore = createBaseStore(
  'EditorStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar editor Monaco
     */
    initialize: async (editor, monaco) => {
      try {
        set({ isLoading: true });

        // Configurar editor
        await get().setupEditor(editor, monaco);
        
        // Configurar lenguajes
        await get().setupLanguageSupport(monaco);
        
        // Configurar autocompletado
        await get().setupAutocompletion(monaco);
        
        // Configurar temas
        await get().setupCustomThemes(monaco);

        set({
          editorInstance: editor,
          monacoInstance: monaco,
          isReady: true,
          isLoading: false,
          lastUpdated: new Date().toISOString()
        });

        console.log('🖥️ Editor Store inicializado correctamente');

      } catch (error) {
        console.error('❌ Error inicializando Editor Store:', error);
        set({
          isLoading: false,
          error: error.message
        });
      }
    },

    /**
     * Configurar editor básico
     */
    setupEditor: async (editor, monaco) => {
      // Configurar opciones del editor
      editor.updateOptions(get().editorConfig);
      
      // Configurar event listeners
      editor.onDidChangeModelContent(() => {
        const code = editor.getValue();
        get().setCode(code);
        get().detectLanguage(code);
        get().checkDependencies(code);
      });

      editor.onDidChangeCursorSelection(() => {
        // Manejar cambios de selección si es necesario
      });
    },

    /**
     * Configurar soporte de lenguajes
     */
    setupLanguageSupport: async (monaco) => {
      // Configurar TypeScript
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
        typeRoots: ['node_modules/@types']
      });

      // Configurar JavaScript
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false
      });
    },

    /**
     * Configurar autocompletado personalizado
     */
    setupAutocompletion: async (monaco) => {
      // Autocompletado para console
      monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            {
              label: 'console.log',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'console.log(${1:value});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Mostrar valor en la consola'
            },
            {
              label: 'console.error',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'console.error(${1:error});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Mostrar error en la consola'
            }
          ];
          
          return { suggestions };
        }
      });
    },

    /**
     * Configurar temas personalizados
     */
    setupCustomThemes: async (monaco) => {
      const currentTheme = get().theme;
      
      // Tema oscuro personalizado
      monaco.editor.defineTheme('cheesejs-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'identifier', foreground: '9CDCFE' }
        ],
        colors: currentTheme.colors
      });

      // Tema claro personalizado
      monaco.editor.defineTheme('cheesejs-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A6A6A', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0066CC', fontStyle: 'bold' },
          { token: 'string', foreground: '009900' },
          { token: 'number', foreground: 'FF6600' },
          { token: 'identifier', foreground: '000000' }
        ],
        colors: {
          'editor.background': '#FFFFFF',
          'editor.foreground': '#000000',
          'editor.selectionBackground': '#ADD6FF',
          'editor.lineHighlightBackground': '#F8F9FA'
        }
      });

      // Aplicar tema inicial
      monaco.editor.setTheme(currentTheme.name);
    },

    /**
     * Establecer código
     */
    setCode: (code) => {
      const currentState = get();
      set({ 
        currentCode: code,
        hasUnsavedChanges: code !== currentState.savedCode,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Detectar lenguaje automáticamente
     */
    detectLanguage: (code, fileName = null) => {
      let detectedLanguage = 'javascript';

      // Detectar por extensión de archivo
      if (fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'ts':
            detectedLanguage = 'typescript';
            break;
          case 'tsx':
            detectedLanguage = 'tsx';
            break;
          case 'jsx':
            detectedLanguage = 'jsx';
            break;
          case 'js':
          default:
            detectedLanguage = 'javascript';
        }
      } else {
        // Detectar por contenido
        if (code.includes('interface ') || code.includes('type ') || code.includes(': string') || code.includes(': number')) {
          detectedLanguage = code.includes('<') && code.includes('/>') ? 'tsx' : 'typescript';
        } else if (code.includes('<') && code.includes('/>') && (code.includes('React') || code.includes('jsx'))) {
          detectedLanguage = 'jsx';
        }
      }

      const currentState = get();
      if (detectedLanguage !== currentState.currentLanguage) {
        set({ currentLanguage: detectedLanguage });
        get().updateEditorLanguage(detectedLanguage);
      }

      return detectedLanguage;
    },

    /**
     * Actualizar lenguaje del editor
     */
    updateEditorLanguage: (language) => {
      const { editorInstance, monacoInstance } = get();
      if (editorInstance && monacoInstance) {
        const model = editorInstance.getModel();
        if (model) {
          monacoInstance.editor.setModelLanguage(model, language === 'jsx' || language === 'tsx' ? 'javascript' : language);
        }
      }
    },

    /**
     * Detectar dependencias faltantes
     */
    checkDependencies: (code) => {
      const currentState = get();
      const importRegex = /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g;
      const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      
      const dependencies = new Set();
      let match;

      // Extraer imports
      while ((match = importRegex.exec(code)) !== null) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          dependencies.add(dep.split('/')[0]);
        }
      }

      // Extraer requires
      while ((match = requireRegex.exec(code)) !== null) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          dependencies.add(dep.split('/')[0]);
        }
      }

      // Filtrar dependencias no instaladas
      const missing = Array.from(dependencies).filter(dep => 
        !currentState.installedPackages.has(dep) && 
        !['fs', 'path', 'os', 'crypto', 'util', 'events'].includes(dep) // Módulos nativos de Node.js
      );

      if (missing.length > 0) {
        set({ 
          missingDependencies: missing,
          suggestedInstallations: missing.map(dep => ({
            name: dep,
            suggested: true,
            description: `Instalar ${dep} para usar en el código`
          }))
        });
      } else {
        set({ 
          missingDependencies: [],
          suggestedInstallations: []
        });
      }
    },

    /**
     * Instalar dependencia
     */
    installDependency: async (packageName) => {
      try {
        set({ dependencyInstallInProgress: true });

        // Aquí se integrará con WebContainer para instalar la dependencia
        console.log(`📦 Instalando ${packageName}...`);
        
        // Simular instalación
        await new Promise(resolve => setTimeout(resolve, 2000));

        const currentState = get();
        const newInstalled = new Set(currentState.installedPackages);
        newInstalled.add(packageName);

        set({
          installedPackages: newInstalled,
          missingDependencies: currentState.missingDependencies.filter(dep => dep !== packageName),
          suggestedInstallations: currentState.suggestedInstallations.filter(inst => inst.name !== packageName),
          dependencyInstallInProgress: false
        });

        console.log(`✅ ${packageName} instalado correctamente`);

      } catch (error) {
        console.error(`❌ Error instalando ${packageName}:`, error);
        set({
          dependencyInstallInProgress: false,
          error: `Error instalando ${packageName}: ${error.message}`
        });
      }
    },

    /**
     * Ejecutar código
     */
    executeCode: async () => {
      const currentState = get();
      
      if (currentState.isExecuting) {
        console.warn('⚠️ Ejecución ya en progreso');
        return;
      }

      try {
        const startTime = Date.now();
        
        set({
          isExecuting: true,
          executionStartTime: startTime,
          executionError: null,
          executionResult: null
        });

        console.log('🚀 Ejecutando código...');

        // Ejecutar realmente el código en WebContainer a través del Core
        const result = await cheeseJSCore.executeCode(currentState.currentCode, {
          filename: currentState.currentFile
        });
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Actualizar métricas
        const newPerformance = {
          ...currentState.performance,
          lastExecutionTime: executionTime,
          totalExecutions: currentState.performance.totalExecutions + 1,
          averageExecutionTime: ((currentState.performance.averageExecutionTime * currentState.performance.totalExecutions) + executionTime) / (currentState.performance.totalExecutions + 1)
        };

        set({
          isExecuting: false,
          executionResult: result,
          executionTime,
          performance: newPerformance,
          lastUpdated: new Date().toISOString()
        });

        console.log('✅ Código ejecutado correctamente');

      } catch (error) {
        console.error('❌ Error ejecutando código:', error);
        
        set({
          isExecuting: false,
          executionError: {
            message: error.message,
            type: 'execution_error',
            timestamp: new Date().toISOString()
          }
        });
      }
    },

    /**
     * Formatear código
     */
    formatCode: async () => {
      const currentState = get();
      
      if (!currentState.editorInstance || currentState.isFormatting) {
        return;
      }

      try {
        set({ isFormatting: true, formatError: null });

        await currentState.editorInstance.getAction('editor.action.formatDocument').run();

        set({ isFormatting: false });
        console.log('✅ Código formateado');

      } catch (error) {
        console.error('❌ Error formateando código:', error);
        set({
          isFormatting: false,
          formatError: error.message
        });
      }
    },

    /**
     * Guardar código
     */
    saveCode: () => {
      const currentState = get();
      set({
        savedCode: currentState.currentCode,
        hasUnsavedChanges: false,
        lastUpdated: new Date().toISOString()
      });
      console.log('💾 Código guardado');
    },

    /**
     * Crear nuevo archivo
     */
    newFile: (fileName = 'index.js', template = '') => {
      const language = get().detectLanguage(template, fileName);
      
      set({
        currentFile: fileName,
        currentCode: template || get().getDefaultTemplate(language),
        currentLanguage: language,
        savedCode: '',
        hasUnsavedChanges: false,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Obtener plantilla por defecto para un lenguaje
     */
    getDefaultTemplate: (language) => {
      const templates = {
        javascript: `// 🧀 Nuevo archivo JavaScript en CheeseJS
console.log('¡Hola CheeseJS! 🧀');

// Tu código aquí...
`,
        typescript: `// 🧀 Nuevo archivo TypeScript en CheeseJS
interface Saludo {
  mensaje: string;
}

const saludo: Saludo = {
  mensaje: '¡Hola CheeseJS! 🧀'
};

console.log(saludo.mensaje);

// Tu código aquí...
`,
        jsx: `// 🧀 Nuevo archivo JSX en CheeseJS
import React from 'react';

const Saludo = () => {
  return (
    <div>
      <h1>¡Hola CheeseJS! 🧀</h1>
      <p>Componente React en CheeseJS</p>
    </div>
  );
};

export default Saludo;
`,
        tsx: `// 🧀 Nuevo archivo TSX en CheeseJS
import React from 'react';

interface SaludoProps {
  nombre: string;
}

const Saludo: React.FC<SaludoProps> = ({ nombre }) => {
  return (
    <div>
      <h1>¡Hola {nombre}! 🧀</h1>
      <p>Componente React TypeScript en CheeseJS</p>
    </div>
  );
};

export default Saludo;
`
      };

      return templates[language] || templates.javascript;
    },

    /**
     * Actualizar configuración del editor
     */
    updateConfig: (newConfig) => {
      const currentState = get();
      const updatedConfig = { ...currentState.editorConfig, ...newConfig };
      
      set({ editorConfig: updatedConfig });
      
      // Aplicar configuración al editor activo
      if (currentState.editorInstance) {
        currentState.editorInstance.updateOptions(newConfig);
      }
    },

    /**
     * Actualizar tema
     */
    updateTheme: (newTheme) => {
      const currentState = get();
      const updatedTheme = { ...currentState.theme, ...newTheme };
      
      set({ theme: updatedTheme });
      
      // Aplicar tema al editor activo
      if (currentState.monacoInstance) {
        currentState.monacoInstance.editor.setTheme(updatedTheme.name);
      }
    },

    /**
     * Obtener estadísticas del editor
     */
    getStats: () => {
      const currentState = get();
      return {
        ...currentState.performance,
        codeLength: currentState.currentCode.length,
        hasUnsavedChanges: currentState.hasUnsavedChanges,
        currentLanguage: currentState.currentLanguage,
        missingDependencies: currentState.missingDependencies.length,
        isExecuting: currentState.isExecuting
      };
    },

    /**
     * Resetear editor
     */
    reset: () => {
      set({
        ...initialState,
        editorInstance: get().editorInstance,
        monacoInstance: get().monacoInstance,
        isReady: get().isReady
      });
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-editor-store',
    devtools: true,
    // Persistir configuración y código guardado
    partialize: (state) => ({
      editorConfig: state.editorConfig,
      theme: state.theme,
      savedCode: state.savedCode,
      currentFile: state.currentFile,
      currentLanguage: state.currentLanguage,
      installedPackages: Array.from(state.installedPackages),
      customSnippets: Array.from(state.customSnippets.entries()),
      performance: state.performance
    })
  }
);