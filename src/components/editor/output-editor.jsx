import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../layout/theme-provider.jsx';
import { eventBus } from '../../utils/event-bus.js';
import './output-editor.css';

/**
 * Output Editor Component
 * Editor de solo lectura para mostrar la salida del código ejecutado
 */
export const OutputEditor = () => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { currentTheme, isDarkTheme, themeVariables } = useTheme();
  
  // Utilidades para limpiar y formatear salida
  const ANSI_REGEX = /[\u001B\u009B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  const stripAnsi = (text) => typeof text === 'string' ? text.replace(ANSI_REGEX, '') : text;
  const mapTokenToType = (token) => {
    switch (token) {
      case 'LOG': return 'log';
      case 'ERROR': return 'error';
      case 'WARN': return 'warn';
      case 'INFO': return 'info';
      default: return 'info';
    }
  };

  const [output, setOutput] = useState(`// CheeseJS - Salida del Código
// Los resultados de tu código aparecerán aquí

Esperando ejecución de código...
Presiona Ctrl+Enter en el editor para ejecutar
Los console.log() y resultados se mostrarán aquí

// Ejemplo de salida:
// > console.log('¡Hola CheeseJS!');
// ¡Hola CheeseJS!
//
// > const suma = 5 + 3;
// > console.log('Resultado:', suma);
// Resultado: 8
`);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState(null);

  useEffect(() => {
    // Suscribirse a eventos de ejecución
    const unsubscribeExecutionStarted = eventBus.subscribe('execution:started', (data) => {
      setIsExecuting(true);
      setOutput('// Ejecutando código...\n// Por favor espera...\n\n');
      setLastExecution(new Date());
    });

    const unsubscribeExecutionOutput = eventBus.subscribe('execution:output', (data) => {
      appendToOutput(data.data, data.type);
    });

    const unsubscribeExecutionCompleted = eventBus.subscribe('execution:completed', (data) => {
      setIsExecuting(false);
      const exitCode = data.result?.exitCode ?? 0;
      appendToOutput(`\n// Ejecución completada\n// Código: ${exitCode}`,'info');
    });

    const unsubscribeExecutionError = eventBus.subscribe('execution:error', (data) => {
      setIsExecuting(false);
      appendToOutput(`\n// Error de ejecución:\n// ${data.error}\n`, 'error');
    });

    const unsubscribeCodeChanged = eventBus.subscribe('code:changed', () => {
      // Opcional: mostrar que el código ha cambiado
      if (!isExecuting) {
        // No hacer nada por ahora, mantener la salida anterior
      }
    });

    // Agregar eventos personalizados para capturar console.log
    const unsubscribeConsoleLog = eventBus.subscribe('console:log', (data) => {
      appendToOutput(`${data.message}`, 'log');
    });

    const unsubscribeConsoleError = eventBus.subscribe('console:error', (data) => {
      appendToOutput(`${data.message}`, 'error');
    });

    const unsubscribeConsoleWarn = eventBus.subscribe('console:warn', (data) => {
      appendToOutput(`${data.message}`, 'warn');
    });

    return () => {
      unsubscribeExecutionStarted();
      unsubscribeExecutionOutput();
      unsubscribeExecutionCompleted();
      unsubscribeExecutionError();
      unsubscribeCodeChanged();
      unsubscribeConsoleLog();
      unsubscribeConsoleError();
      unsubscribeConsoleWarn();
    };
  }, [isExecuting]);

  /**
   * Agregar contenido a la salida
   */
  const appendToOutput = (newContent, type = 'info') => {
    setOutput(prevOutput => {
      let formattedContent = newContent;
      
      // Formatear según el tipo
      switch (type) {
        case 'error':
          formattedContent = `ERROR: ${stripAnsi(newContent)}`;
          break;
        case 'warn':
          formattedContent = `WARN: ${stripAnsi(newContent)}`;
          break;
        case 'log':
          formattedContent = `${stripAnsi(newContent)}`;
          break;
        case 'info':
          formattedContent = `${stripAnsi(newContent)}`;
          break;
        case 'stdout':
          // Procesar salida de ejecución: quitar ANSI y mapear tokens [LOG]/[ERROR]/...
          const clean = stripAnsi(newContent);
          const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length > 0) {
            const formattedLines = lines.map(line => {
              const match = line.match(/^\[(LOG|ERROR|WARN|INFO)\]\s*(.*)$/);
              if (match) {
                const mappedType = mapTokenToType(match[1]);
                const message = match[2];
                if (mappedType === 'error') return `ERROR: ${message}`;
                if (mappedType === 'warn') return `WARN: ${message}`;
                return `${message}`;
              }
              return `${line}`;
            });
            formattedContent = formattedLines.join('\n');
          } else {
            formattedContent = '';
          }
          break;
        case 'stderr':
          formattedContent = `ERROR: ${stripAnsi(newContent)}`;
          break;
        default:
          formattedContent = `${stripAnsi(newContent)}`;
      }
      
      // Evitar agregar líneas vacías
      if (!formattedContent) {
        return prevOutput;
      }
      return prevOutput + '\n' + formattedContent;
    });

    // Auto-scroll al final
    setTimeout(() => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const model = editor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          editor.setPosition({ lineNumber: lineCount, column: 1 });
          editor.revealLine(lineCount);
        }
      }
    }, 100);
  };

  /**
   * Limpiar salida
   */
  const clearOutput = () => {
    setOutput(`// 🧀 CheeseJS - Salida Limpiada
// Los nuevos resultados aparecerán aquí

🧹 Salida limpiada - ${new Date().toLocaleTimeString()}
📝 Presiona Ctrl+Enter para ejecutar código
`);
  };

  /**
   * Configurar Monaco Editor cuando se monta
   */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configurar themes personalizados (similares al editor principal)
    setupCustomThemes(monaco);
    applyTheme(monaco);

    // Configurar editor de solo lectura
    editor.updateOptions({
      readOnly: true,
      selectOnLineNumbers: false,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      renderWhitespace: 'none',
      renderControlCharacters: false,
      fontSize: 13,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Liberation Mono", monospace'
    });

    console.log('📖 Output Editor listo (solo lectura)');
  };

  /**
   * Configurar themes personalizados
   */
  const setupCustomThemes = (monaco) => {
    // Theme Light para output
    monaco.editor.defineTheme('cheesejs-output-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A6A6A', fontStyle: 'italic' },
        { token: 'string', foreground: '009900' },
        { token: 'number', foreground: 'FF6600' },
      ],
      colors: {
        'editor.background': themeVariables['--surface-color'] || '#F8F9FA',
        'editor.foreground': themeVariables['--text-color'] || '#212529',
        'editorGutter.background': themeVariables['--surface-variant'] || '#F1F3F4',
        'editorCursor.foreground': 'transparent', // Sin cursor visible
      }
    });

    // Theme Dark para output
    monaco.editor.defineTheme('cheesejs-output-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '999999', fontStyle: 'italic' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': themeVariables['--surface-color'] || '#252526',
        'editor.foreground': themeVariables['--text-color'] || '#CCCCCC',
        'editorGutter.background': themeVariables['--surface-variant'] || '#2D2D30',
        'editorCursor.foreground': 'transparent', // Sin cursor visible
      }
    });
  };

  /**
   * Aplicar theme al editor
   */
  const applyTheme = (monaco) => {
    const themeName = isDarkTheme() ? 'cheesejs-output-dark' : 'cheesejs-output-light';
    monaco.editor.setTheme(themeName);
  };

  /**
   * Actualizar theme cuando cambia
   */
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      setupCustomThemes(monacoRef.current);
      applyTheme(monacoRef.current);
    }
  }, [currentTheme, themeVariables]);

  const getMonacoTheme = () => {
    return isDarkTheme() ? 'cheesejs-output-dark' : 'cheesejs-output-light';
  };

  return (
    <div className="output-editor-container">
      <div className="output-toolbar">
        <div className="output-info">
          <span className="output-icon">📖</span>
          <span className="output-title">Salida del Código</span>
          {isExecuting && (
            <div className="executing-indicator">
              <div className="spinner"></div>
              <span>Ejecutando...</span>
            </div>
          )}
          {lastExecution && !isExecuting && (
            <span className="last-execution">
              Última ejecución: {lastExecution.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="output-actions">
          <button 
            className="output-btn"
            onClick={clearOutput}
            title="Limpiar salida"
            disabled={isExecuting}
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      <div className="output-content">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={output}
          onMount={handleEditorDidMount}
          theme={getMonacoTheme()}
          options={{
            readOnly: true,
            selectOnLineNumbers: false,
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            renderWhitespace: 'none',
            renderControlCharacters: false,
            fontSize: 13,
            automaticLayout: true
          }}
          loading={
            <div className="output-loading">
              <div className="loading-spinner"></div>
              <p>Cargando Output Editor...</p>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default OutputEditor;