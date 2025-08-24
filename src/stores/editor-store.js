import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';

/**
 * EditorStore - Gestión de estado del editor de código
 * Maneja código, archivos, configuración, ejecución y estado de Monaco Editor
 */
const initialState = createInitialState({
  // Estado del código actual
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

  // Estado de archivos
  currentFile: null,
  openFiles: new Map(),
  hasUnsavedChanges: false,
  lastSavedContent: '',
  recentFiles: [],
  maxRecentFiles: 10,

  // Estado del editor Monaco
  editorInstance: null,
  monacoInstance: null,
  isEditorReady: false,
  editorDimensions: { width: 0, height: 0 },

  // Configuración del editor
  editorConfig: {
    // Apariencia
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineHeight: 1.5,
    letterSpacing: 0,
    
    // Comportamiento
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    wordWrapColumn: 80,
    
    // UI Elements
    lineNumbers: 'on',
    minimap: { enabled: true },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false
    },
    
    // Layout
    automaticLayout: true,
    scrollBeyondLastLine: true,
    smoothScrolling: true,
    
    // Cursor
    cursorBlinking: 'blink',
    cursorStyle: 'line',
    cursorWidth: 2,
    
    // Rendering
    renderWhitespace: 'selection',
    renderControlCharacters: false,
    renderLineHighlight: 'line',
    renderIndentGuides: true,
    
    // Bracket matching
    matchBrackets: 'always',
    bracketPairColorization: { enabled: true },
    
    // Code folding
    folding: true,
    foldingStrategy: 'auto',
    showFoldingControls: 'mouseover',
    unfoldOnClickAfterEndOfLine: false,
    
    // Selections
    selectionHighlight: true,
    occurrencesHighlight: true,
    
    // Suggestions
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'top',
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: true,
    parameterHints: { enabled: true },
    
    // Auto closing
    autoClosingBrackets: 'languageDefined',
    autoClosingQuotes: 'languageDefined',
    autoSurround: 'languageDefined',
    
    // Formatting
    formatOnPaste: true,
    formatOnType: true,
    linkedEditing: false
  },

  // Estado de ejecución
  isExecuting: false,
  executionResult: null,
  executionError: null,
  executionStartTime: null,
  executionEndTime: null,

  // Historial y navegación
  undoHistory: [],
  redoHistory: [],
  maxHistorySize: 50,
  currentHistoryIndex: -1,

  // Estado de selección y cursor
  cursorPosition: { lineNumber: 1, column: 1 },
  selectedText: '',
  selectionRange: null,

  // Estadísticas y métricas
  stats: {
    linesOfCode: 0,
    charactersCount: 0,
    wordsCount: 0,
    editingSessions: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    errorExecutions: 0
  },

  // Preferencias de usuario
  preferences: {
    autoSave: true,
    autoSaveInterval: 5000,
    showLineNumbers: true,
    showMinimap: true,
    enableAutocompletion: true,
    enableLinting: true,
    enableFormatting: true,
    vimMode: false
  },

  // Estado de búsqueda y reemplazo
  searchState: {
    query: '',
    replaceText: '',
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    results: [],
    currentResultIndex: -1
  }
});

export const useEditorStore = createBaseStore(
  'EditorStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar el editor
     */
    initialize: async (editorInstance, monacoInstance) => {
      try {
        set({
          editorInstance,
          monacoInstance,
          isEditorReady: true,
          stats: {
            ...get().stats,
            editingSessions: get().stats.editingSessions + 1
          },
          lastUpdated: new Date().toISOString()
        });

        // Configurar el editor
        get().setupEditor();

        console.log('📝 EditorStore inicializado');

      } catch (error) {
        console.error('❌ Error inicializando EditorStore:', error);
        set({ error: error.message });
      }
    },

    /**
     * Configurar el editor con opciones personalizadas
     */
    setupEditor: () => {
      const { editorInstance, monacoInstance, editorConfig } = get();
      
      if (!editorInstance || !monacoInstance) return;

      try {
        // Aplicar configuración
        editorInstance.updateOptions(editorConfig);

        // Configurar event listeners
        get().setupEventListeners();

        // Configurar temas personalizados
        get().setupCustomThemes();

        // Configurar atajos de teclado
        get().setupKeyboardShortcuts();

        console.log('⚙️ Editor configurado correctamente');

      } catch (error) {
        console.error('❌ Error configurando editor:', error);
      }
    },

    /**
     * Configurar event listeners del editor
     */
    setupEventListeners: () => {
      const { editorInstance } = get();
      if (!editorInstance) return;

      // Cambios en el contenido
      editorInstance.onDidChangeModelContent(() => {
        const newCode = editorInstance.getValue();
        get().updateCode(newCode, false);
      });

      // Cambios en la posición del cursor
      editorInstance.onDidChangeCursorPosition((e) => {
        set({
          cursorPosition: {
            lineNumber: e.position.lineNumber,
            column: e.position.column
          }
        });
      });

      // Cambios en la selección
      editorInstance.onDidChangeCursorSelection((e) => {
        const selectedText = editorInstance.getModel()?.getValueInRange(e.selection) || '';
        set({
          selectedText,
          selectionRange: e.selection
        });
      });

      // Cambios en las dimensiones
      editorInstance.onDidLayoutChange((e) => {
        set({
          editorDimensions: {
            width: e.width,
            height: e.height
          }
        });
      });
    },

    /**
     * Configurar temas personalizados
     */
    setupCustomThemes: () => {
      const { monacoInstance } = get();
      if (!monacoInstance) return;

      // Tema claro personalizado
      monacoInstance.editor.defineTheme('cheesejs-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A6A6A', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0066CC', fontStyle: 'bold' },
          { token: 'string', foreground: '009900' },
          { token: 'number', foreground: 'FF6600' },
          { token: 'identifier', foreground: '000000' },
          { token: 'operator', foreground: '666666' }
        ],
        colors: {
          'editor.background': '#FFFFFF',
          'editor.foreground': '#000000',
          'editor.selectionBackground': '#ADD6FF',
          'editor.lineHighlightBackground': '#F8F9FA'
        }
      });

      // Tema oscuro personalizado
      monacoInstance.editor.defineTheme('cheesejs-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A6A6A', fontStyle: 'italic' },
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'identifier', foreground: 'D4D4D4' },
          { token: 'operator', foreground: 'D4D4D4' }
        ],
        colors: {
          'editor.background': '#1E1E1E',
          'editor.foreground': '#D4D4D4',
          'editor.selectionBackground': '#264F78',
          'editor.lineHighlightBackground': '#2D2D30'
        }
      });
    },

    /**
     * Configurar atajos de teclado
     */
    setupKeyboardShortcuts: () => {
      const { editorInstance, monacoInstance } = get();
      if (!editorInstance || !monacoInstance) return;

      // Ctrl+S / Cmd+S - Guardar
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => get().saveCode()
      );

      // Ctrl+Shift+F / Cmd+Shift+F - Formatear
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF,
        () => get().formatCode()
      );

      // F5 - Ejecutar código
      editorInstance.addCommand(
        monacoInstance.KeyCode.F5,
        () => get().executeCode()
      );

      // Ctrl+/ / Cmd+/ - Comentar línea
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Slash,
        () => get().toggleComment()
      );
    },

    /**
     * Actualizar código
     */
    updateCode: (newCode, addToHistory = true) => {
      const currentState = get();
      const previousCode = currentState.currentCode;

      // Agregar al historial si es diferente
      if (addToHistory && newCode !== previousCode) {
        get().addToHistory(previousCode);
      }

      // Calcular estadísticas
      const lines = newCode.split('\n');
      const stats = {
        ...currentState.stats,
        linesOfCode: lines.length,
        charactersCount: newCode.length,
        wordsCount: newCode.split(/\s+/).filter(word => word.length > 0).length
      };

      set({
        currentCode: newCode,
        hasUnsavedChanges: newCode !== currentState.lastSavedContent,
        stats,
        lastUpdated: new Date().toISOString()
      });

      // Auto-guardar si está habilitado
      if (currentState.preferences.autoSave) {
        get().scheduleAutoSave();
      }
    },

    /**
     * Agregar al historial de deshacer
     */
    addToHistory: (code) => {
      const currentState = get();
      const newHistory = [...currentState.undoHistory, code];
      const trimmedHistory = newHistory.slice(-currentState.maxHistorySize);

      set({
        undoHistory: trimmedHistory,
        redoHistory: [], // Limpiar redo al agregar nueva entrada
        currentHistoryIndex: trimmedHistory.length - 1
      });
    },

    /**
     * Deshacer cambio
     */
    undo: () => {
      const currentState = get();
      
      if (currentState.undoHistory.length === 0) return;

      const previousCode = currentState.undoHistory[currentState.undoHistory.length - 1];
      const newRedoHistory = [currentState.currentCode, ...currentState.redoHistory];
      const newUndoHistory = currentState.undoHistory.slice(0, -1);

      set({
        currentCode: previousCode,
        undoHistory: newUndoHistory,
        redoHistory: newRedoHistory
      });

      // Actualizar editor
      if (currentState.editorInstance) {
        currentState.editorInstance.setValue(previousCode);
      }
    },

    /**
     * Rehacer cambio
     */
    redo: () => {
      const currentState = get();
      
      if (currentState.redoHistory.length === 0) return;

      const nextCode = currentState.redoHistory[0];
      const newUndoHistory = [...currentState.undoHistory, currentState.currentCode];
      const newRedoHistory = currentState.redoHistory.slice(1);

      set({
        currentCode: nextCode,
        undoHistory: newUndoHistory,
        redoHistory: newRedoHistory
      });

      // Actualizar editor
      if (currentState.editorInstance) {
        currentState.editorInstance.setValue(nextCode);
      }
    },

    /**
     * Guardar código
     */
    saveCode: async () => {
      const currentState = get();
      
      try {
        // Simular guardado (aquí se integraría con sistema de archivos)
        await new Promise(resolve => setTimeout(resolve, 100));

        set({
          lastSavedContent: currentState.currentCode,
          hasUnsavedChanges: false,
          lastUpdated: new Date().toISOString()
        });

        // Agregar a archivos recientes si tiene nombre
        if (currentState.currentFile) {
          get().addToRecentFiles(currentState.currentFile);
        }

        console.log('💾 Código guardado');
        return true;

      } catch (error) {
        console.error('❌ Error guardando código:', error);
        set({ error: error.message });
        return false;
      }
    },

    /**
     * Programar auto-guardado
     */
    scheduleAutoSave: (() => {
      let timeout;
      return () => {
        const { preferences } = get();
        
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          get().saveCode();
        }, preferences.autoSaveInterval);
      };
    })(),

    /**
     * Ejecutar código
     */
    executeCode: async () => {
      const currentState = get();
      
      if (currentState.isExecuting) return;

      try {
        set({
          isExecuting: true,
          executionStartTime: new Date().toISOString(),
          executionResult: null,
          executionError: null
        });

        // Simular ejecución (aquí se integraría con WebContainer)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simular resultado exitoso
        const result = {
          output: 'Código ejecutado correctamente',
          exitCode: 0,
          duration: 1000
        };

        set({
          isExecuting: false,
          executionResult: result,
          executionEndTime: new Date().toISOString(),
          stats: {
            ...currentState.stats,
            totalExecutions: currentState.stats.totalExecutions + 1,
            successfulExecutions: currentState.stats.successfulExecutions + 1
          },
          lastUpdated: new Date().toISOString()
        });

        console.log('▶️ Código ejecutado:', result);
        return result;

      } catch (error) {
        console.error('❌ Error ejecutando código:', error);
        
        set({
          isExecuting: false,
          executionError: error.message,
          executionEndTime: new Date().toISOString(),
          stats: {
            ...currentState.stats,
            totalExecutions: currentState.stats.totalExecutions + 1,
            errorExecutions: currentState.stats.errorExecutions + 1
          }
        });

        return null;
      }
    },

    /**
     * Formatear código
     */
    formatCode: async () => {
      const { editorInstance } = get();
      
      if (!editorInstance) return;

      try {
        await editorInstance.getAction('editor.action.formatDocument').run();
        console.log('🎨 Código formateado');
      } catch (error) {
        console.error('❌ Error formateando código:', error);
      }
    },

    /**
     * Comentar/descomentar línea
     */
    toggleComment: () => {
      const { editorInstance } = get();
      
      if (!editorInstance) return;

      try {
        editorInstance.getAction('editor.action.commentLine').run();
      } catch (error) {
        console.error('❌ Error comentando línea:', error);
      }
    },

    /**
     * Crear nuevo archivo
     */
    newFile: () => {
      const defaultCode = `// 🧀 Nuevo archivo en CheeseJS
// Escribe tu código JavaScript aquí

console.log('¡Hola CheeseJS! 🧀');

// Tu código aquí...
`;

      set({
        currentCode: defaultCode,
        currentFile: null,
        hasUnsavedChanges: false,
        lastSavedContent: '',
        undoHistory: [],
        redoHistory: [],
        lastUpdated: new Date().toISOString()
      });

      // Actualizar editor
      const { editorInstance } = get();
      if (editorInstance) {
        editorInstance.setValue(defaultCode);
      }
    },

    /**
     * Actualizar configuración del editor
     */
    updateEditorConfig: (newConfig) => {
      const currentState = get();
      const updatedConfig = { ...currentState.editorConfig, ...newConfig };

      set({
        editorConfig: updatedConfig,
        lastUpdated: new Date().toISOString()
      });

      // Aplicar configuración al editor
      if (currentState.editorInstance) {
        currentState.editorInstance.updateOptions(updatedConfig);
      }
    },

    /**
     * Actualizar preferencias
     */
    updatePreferences: (newPreferences) => {
      const currentState = get();
      set({
        preferences: { ...currentState.preferences, ...newPreferences },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Agregar a archivos recientes
     */
    addToRecentFiles: (filePath) => {
      const currentState = get();
      const newRecentFiles = [
        filePath,
        ...currentState.recentFiles.filter(f => f !== filePath)
      ].slice(0, currentState.maxRecentFiles);

      set({
        recentFiles: newRecentFiles,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Buscar en código
     */
    search: (query, options = {}) => {
      const { editorInstance } = get();
      if (!editorInstance) return [];

      const searchOptions = {
        caseSensitive: options.caseSensitive || false,
        wholeWord: options.wholeWord || false,
        useRegex: options.useRegex || false
      };

      try {
        const matches = editorInstance.getModel()?.findMatches(
          query,
          true, // searchOnlyEditableRange
          searchOptions.useRegex,
          searchOptions.caseSensitive,
          searchOptions.wholeWord ? '\\b' : null,
          true // captureMatches
        ) || [];

        set({
          searchState: {
            query,
            ...searchOptions,
            results: matches,
            currentResultIndex: matches.length > 0 ? 0 : -1
          }
        });

        return matches;
      } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        return [];
      }
    },

    /**
     * Ir al siguiente resultado de búsqueda
     */
    findNext: () => {
      const { searchState, editorInstance } = get();
      
      if (!editorInstance || searchState.results.length === 0) return;

      const nextIndex = (searchState.currentResultIndex + 1) % searchState.results.length;
      const match = searchState.results[nextIndex];

      editorInstance.setSelection(match.range);
      editorInstance.revealRangeInCenter(match.range);

      set({
        searchState: {
          ...searchState,
          currentResultIndex: nextIndex
        }
      });
    },

    /**
     * Obtener estadísticas del editor
     */
    getStats: () => {
      return get().stats;
    },

    /**
     * Resetear editor
     */
    reset: () => {
      const { editorInstance } = get();
      
      set({
        ...initialState,
        editorInstance,
        monacoInstance: get().monacoInstance,
        isEditorReady: get().isEditorReady
      });

      if (editorInstance) {
        editorInstance.setValue(initialState.currentCode);
      }
    },

    /**
     * Limpiar recursos
     */
    dispose: () => {
      const { editorInstance } = get();
      
      if (editorInstance) {
        editorInstance.dispose();
      }

      set({
        editorInstance: null,
        monacoInstance: null,
        isEditorReady: false
      });
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-editor-store',
    devtools: true,
    // Persistir configuración y preferencias, no el código actual
    partialize: (state) => ({
      editorConfig: state.editorConfig,
      preferences: state.preferences,
      recentFiles: state.recentFiles,
      stats: {
        editingSessions: state.stats.editingSessions,
        totalExecutions: state.stats.totalExecutions,
        successfulExecutions: state.stats.successfulExecutions,
        errorExecutions: state.stats.errorExecutions
      }
    })
  }
);