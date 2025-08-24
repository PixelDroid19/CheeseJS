import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../layout/theme-provider.jsx';
import { configService } from '../../services/config-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './monaco-editor.css';

/**
 * Monaco Editor Component
 * Editor de código con configuración personalizable y temas
 */
export const MonacoEditor = () => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { currentTheme, isDarkTheme, themeVariables } = useTheme();
  
  const [code, setCode] = useState(`// 🧀 Bienvenido a CheeseJS
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
`);

  const [editorConfig, setEditorConfig] = useState({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Cargar configuración del editor
    const loadEditorConfig = async () => {
      await configService.initialize();
      
      const config = {
        fontSize: configService.get('editor.fontSize', 14),
        fontFamily: configService.get('editor.fontFamily', 'Monaco, Menlo, "Ubuntu Mono", monospace'),
        tabSize: configService.get('editor.tabSize', 2),
        insertSpaces: configService.get('editor.insertSpaces', true),
        wordWrap: configService.get('editor.wordWrap', 'on'),
        lineNumbers: configService.get('editor.lineNumbers', 'on'),
        minimap: { enabled: configService.get('editor.minimap', true) },
        automaticLayout: configService.get('editor.automaticLayout', true),
        scrollBeyondLastLine: configService.get('editor.scrollBeyondLastLine', true),
        smoothScrolling: configService.get('editor.smoothScrolling', true),
        cursorBlinking: configService.get('editor.cursorBlinking', 'blink'),
        cursorStyle: configService.get('editor.cursorStyle', 'line'),
        renderWhitespace: configService.get('editor.renderWhitespace', 'selection'),
        renderControlCharacters: configService.get('editor.renderControlCharacters', false),
        rulers: configService.get('editor.rulers', []),
        folding: configService.get('editor.folding', true),
        foldingStrategy: configService.get('editor.foldingStrategy', 'auto'),
        showFoldingControls: configService.get('editor.showFoldingControls', 'mouseover'),
        matchBrackets: configService.get('editor.matchBrackets', 'always'),
        selectionHighlight: configService.get('editor.selectionHighlight', true),
        occurrencesHighlight: configService.get('editor.occurrencesHighlight', true),
        bracketPairColorization: { enabled: configService.get('editor.bracketPairColorization', true) },
        formatOnPaste: configService.get('editor.formatOnPaste', true),
        formatOnType: configService.get('editor.formatOnType', true),
        acceptSuggestionOnCommitCharacter: configService.get('editor.acceptSuggestionOnCommitCharacter', true),
        acceptSuggestionOnEnter: configService.get('editor.acceptSuggestionOnEnter', 'on'),
        snippetSuggestions: configService.get('editor.snippetSuggestions', 'top'),
        quickSuggestions: configService.get('editor.quickSuggestions', true),
        suggestOnTriggerCharacters: configService.get('editor.suggestOnTriggerCharacters', true),
        wordBasedSuggestions: configService.get('editor.wordBasedSuggestions', true),
        parameterHints: { enabled: configService.get('editor.parameterHints', true) },
        autoClosingBrackets: configService.get('editor.autoClosingBrackets', 'languageDefined'),
        autoClosingQuotes: configService.get('editor.autoClosingQuotes', 'languageDefined'),
        autoSurround: configService.get('editor.autoSurround', 'languageDefined'),
        linkedEditing: configService.get('editor.linkedEditing', false),
      };
      
      setEditorConfig(config);
    };

    loadEditorConfig();

    // Suscribirse a eventos de configuración
    const unsubscribeConfigChanged = eventBus.subscribe('config:changed', (data) => {
      const { key, newValue } = data;
      if (key.startsWith('editor.')) {
        const configKey = key.replace('editor.', '');
        setEditorConfig(prev => ({ ...prev, [configKey]: newValue }));
      }
    });

    // Suscribirse a eventos de ejecución
    const unsubscribeRunRequested = eventBus.subscribe('code:run-requested', () => {
      executeCode();
    });

    const unsubscribeStopRequested = eventBus.subscribe('code:stop-requested', () => {
      stopExecution();
    });

    return () => {
      unsubscribeConfigChanged();
      unsubscribeRunRequested();
      unsubscribeStopRequested();
    };
  }, []);

  /**
   * Configurar Monaco Editor cuando se monta
   */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);

    // Configurar themes personalizados
    setupCustomThemes(monaco);
    
    // Aplicar theme inicial
    applyTheme(monaco);

    // Configurar atajos de teclado
    setupKeyboardShortcuts(editor);

    // Configurar autocompletado personalizado
    setupCustomCompletions(monaco);

    // Emitir evento de editor listo
    eventBus.emit('editor:ready', { editor, monaco });
    
    console.log('🖥️ Monaco Editor listo');
  };

  /**
   * Configurar themes personalizados
   */
  const setupCustomThemes = (monaco) => {
    // Theme Light personalizado
    monaco.editor.defineTheme('cheesejs-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A6A6A', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0066CC', fontStyle: 'bold' },
        { token: 'string', foreground: '009900' },
        { token: 'number', foreground: 'FF6600' },
        { token: 'identifier', foreground: '000000' },
        { token: 'operator', foreground: '666666' },
      ],
      colors: {
        'editor.background': themeVariables['--editor-background'] || '#FFFFFF',
        'editor.foreground': themeVariables['--editor-foreground'] || '#000000',
        'editor.selectionBackground': themeVariables['--editor-selection'] || '#ADD6FF',
        'editor.lineHighlightBackground': themeVariables['--editor-line-highlight'] || '#F8F9FA',
        'editorGutter.background': themeVariables['--editor-gutter'] || '#F1F3F4',
        'editorCursor.foreground': themeVariables['--editor-cursor'] || '#000000',
      }
    });

    // Theme Dark personalizado
    monaco.editor.defineTheme('cheesejs-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '999999', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'identifier', foreground: 'D4D4D4' },
        { token: 'operator', foreground: 'D4D4D4' },
      ],
      colors: {
        'editor.background': themeVariables['--editor-background'] || '#1E1E1E',
        'editor.foreground': themeVariables['--editor-foreground'] || '#D4D4D4',
        'editor.selectionBackground': themeVariables['--editor-selection'] || '#264F78',
        'editor.lineHighlightBackground': themeVariables['--editor-line-highlight'] || '#2D2D30',
        'editorGutter.background': themeVariables['--editor-gutter'] || '#252526',
        'editorCursor.foreground': themeVariables['--editor-cursor'] || '#AEAFAD',
      }
    });
  };

  /**
   * Aplicar theme al editor
   */
  const applyTheme = (monaco) => {
    const themeName = isDarkTheme() ? 'cheesejs-dark' : 'cheesejs-light';
    monaco.editor.setTheme(themeName);
  };

  /**
   * Actualizar theme cuando cambia
   */
  useEffect(() => {
    if (monacoRef.current && isReady) {
      setupCustomThemes(monacoRef.current);
      applyTheme(monacoRef.current);
    }
  }, [currentTheme, themeVariables, isReady]);

  /**
   * Configurar atajos de teclado
   */
  const setupKeyboardShortcuts = (editor) => {
    // Ctrl+Enter - Ejecutar código
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      executeCode();
    });

    // Ctrl+S - Guardar (prevenir comportamiento por defecto)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCode();
    });

    // Ctrl+Shift+F - Formatear código
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      formatCode();
    });
  };

  /**
   * Configurar autocompletado personalizado
   */
  const setupCustomCompletions = (monaco) => {
    // Registrar proveedor de autocompletado para JavaScript
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: 'cheesejs-log',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'console.log(${1:message});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'CheeseJS console.log snippet'
          },
          {
            label: 'cheesejs-function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'function ${1:functionName}(${2:params}) {\n\t${3:// código aquí}\n\treturn ${4:result};\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'CheeseJS function template'
          },
          {
            label: 'cheesejs-async',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'async function ${1:functionName}(${2:params}) {\n\ttry {\n\t\t${3:// código async aquí}\n\t\treturn ${4:result};\n\t} catch (error) {\n\t\tconsole.error(\'Error:\', error);\n\t}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'CheeseJS async function template'
          }
        ];

        return { suggestions };
      }
    });
  };

  /**
   * Ejecutar código
   */
  const executeCode = () => {
    if (!editorRef.current) return;
    
    const currentCode = editorRef.current.getValue();
    eventBus.emit('code:execute', { code: currentCode });
  };

  /**
   * Detener ejecución
   */
  const stopExecution = () => {
    eventBus.emit('code:stop', {});
  };

  /**
   * Guardar código
   */
  const saveCode = () => {
    if (!editorRef.current) return;
    
    const currentCode = editorRef.current.getValue();
    // Aquí podrías implementar guardado local o en el WebContainer
    eventBus.emit('code:saved', { code: currentCode });
    console.log('💾 Código guardado');
  };

  /**
   * Formatear código
   */
  const formatCode = () => {
    if (!editorRef.current) return;
    
    editorRef.current.getAction('editor.action.formatDocument').run();
  };

  /**
   * Manejar cambios en el código
   */
  const handleEditorChange = (value) => {
    setCode(value);
    eventBus.emit('code:changed', { code: value });
  };

  const getMonacoTheme = () => {
    if (!isReady) return 'vs-light';
    return isDarkTheme() ? 'cheesejs-dark' : 'cheesejs-light';
  };

  return (
    <div className="monaco-editor-container">
      <div className="editor-toolbar">
        <div className="editor-info">
          <span className="file-icon">📄</span>
          <span className="file-name">index.js</span>
          <span className="editor-status">
            {isReady ? '✅ Listo' : '⏳ Cargando...'}
          </span>
        </div>
        
        <div className="editor-actions">
          <button 
            className="editor-btn"
            onClick={executeCode}
            title="Ejecutar código (Ctrl+Enter)"
          >
            ▶️ Ejecutar
          </button>
          <button 
            className="editor-btn"
            onClick={formatCode}
            title="Formatear código (Ctrl+Shift+F)"
          >
            🎨 Formatear
          </button>
          <button 
            className="editor-btn"
            onClick={saveCode}
            title="Guardar código (Ctrl+S)"
          >
            💾 Guardar
          </button>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={getMonacoTheme()}
          options={editorConfig}
          loading={
            <div className="editor-loading">
              <div className="loading-spinner"></div>
              <p>Cargando Monaco Editor...</p>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default MonacoEditor;