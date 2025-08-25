//import React, { useState, useRef, useEffect } from 'react';
import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../layout/theme-provider.jsx';
import { useEditorStore } from '../../stores/editor-store.js';
import { useTerminalStore } from '../../stores/terminal-store.js';
import { languageDetectionService } from '../../services/language-detection-service.js';
import { dependencyManager } from '../../services/dependency-management-service.js';
import { configService } from '../../services/config-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './monaco-editor.css';

/**
 * Enhanced Monaco Editor Component
 * Editor de código con detección automática de lenguajes, gestión de dependencias y ejecución avanzada
 */
export const MonacoEditor = () => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { currentTheme, isDarkTheme, themeVariables } = useTheme();
  
  // Estados locales
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  // Eliminado: resultados de ejecución se gestionan en OutputEditor
  
  // Stores
  const {
    currentCode,
    currentLanguage,
    currentFile,
    isExecuting,
    executionResult,
    executionError,
    missingDependencies,
    suggestedInstallations,
    editorConfig,
    theme,
    hasUnsavedChanges,
    // Actions
    initialize,
    setCode,
    detectLanguage,
    executeCode,
    formatCode,
    saveCode,
    newFile,
    installDependency,
    updateConfig,
    updateTheme
  } = useEditorStore();
  
  const terminalTheme = useTerminalStore(state => state.theme);

  useEffect(() => {
    // Suscribirse a eventos del event bus
    const unsubscribeRunRequested = eventBus.subscribe('code:run-requested', () => {
      handleExecuteCode();
    });

    const unsubscribeStopRequested = eventBus.subscribe('code:stop-requested', () => {
      // TODO: Implementar cancelación de ejecución
      console.log('🛑 Cancelación de ejecución solicitada');
    });

    const unsubscribeFormatRequested = eventBus.subscribe('code:format-requested', () => {
      handleFormatCode();
    });

    const unsubscribeFileNewRequested = eventBus.subscribe('file:new-requested', () => {
      handleNewFile();
    });

    const unsubscribeFileSaveRequested = eventBus.subscribe('file:save-requested', () => {
      handleSaveCode();
    });

    // Usar configService para gestionar configuración
    const unsubscribeConfigChanged = eventBus.subscribe('config:changed', (data) => {
      const { key, newValue } = data;
      if (key.startsWith('editor.')) {
        const configKey = key.replace('editor.', '');
        configService.updateConfig({ [configKey]: newValue });
        updateConfig({ [configKey]: newValue });
      }
    });

    return () => {
      unsubscribeRunRequested();
      unsubscribeStopRequested();
      unsubscribeFormatRequested();
      unsubscribeFileNewRequested();
      unsubscribeFileSaveRequested();
      unsubscribeConfigChanged();
    };
  }, [updateConfig]);

  // Sincronizar tema con terminal store
  useEffect(() => {
    if (terminalTheme && monacoRef.current) {
      const editorTheme = terminalTheme.background?.includes('#1e') ? 'cheesejs-dark' : 'cheesejs-light';
      updateTheme({ 
        name: editorTheme,
        isDark: terminalTheme.background?.includes('#1e'),
        colors: {
          background: terminalTheme.background,
          foreground: terminalTheme.foreground,
          selection: terminalTheme.selection || '#264f78',
          lineHighlight: '#2a2d2e',
          cursor: terminalTheme.cursor
        }
      });
    }
  }, [terminalTheme, updateTheme]);

  // Eliminado: formateo de resultados. La salida se visualiza en OutputEditor.

  // Analizar dependencias cuando cambia el código
  useEffect(() => {
    if (currentCode && currentCode.trim()) {
      const analyzeCode = async () => {
        try {
          const analysis = await dependencyManager.analyzeDependencies(currentCode, currentLanguage);
          if (analysis.missing.length > 0) {
            setShowDependencyDialog(true);
          }
        } catch (error) {
          console.error('Error analizando dependencias:', error);
        }
      };
      
      analyzeCode();
    }
  }, [currentCode, currentLanguage]);

  /**
   * Configurar Monaco Editor cuando se monta
   */
  const handleEditorDidMount = async (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    try {
      // Inicializar editor store
      await initialize(editor, monaco);
      
      setIsInitialized(true);

      // Configurar event listeners específicos
      setupEditorEventListeners(editor, monaco);

      // Cargar configuración inicial del editor
      const editorConfig = await configService.getEditorConfig();
      updateConfig(editorConfig);

      // Emitir evento de editor listo
      eventBus.emit('editor:ready', { editor, monaco });
      
      console.log('🖥️ Enhanced Monaco Editor listo');
      
    } catch (error) {
      console.error('❌ Error inicializando editor:', error);
    }
  };

  /**
   * Configurar event listeners específicos del editor
   */
  const setupEditorEventListeners = (editor, monaco) => {
    // Cambios en el contenido con debounce para performance
    let changeTimeout = null;
    editor.onDidChangeModelContent(() => {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        const code = editor.getValue();
        setCode(code);
        
        // Detectar lenguaje automáticamente
        const detected = detectLanguage(code, currentFile);
        
        // Configurar lenguaje en Monaco si cambió
        if (detected !== currentLanguage) {
          try {
            languageDetectionService.configureMonacoLanguage(monaco, detected);
          } catch (e) {
            console.warn('No se pudo configurar el lenguaje en Monaco:', e);
          }
        }
      }, 300);
    });

    // Cambios de selección
    editor.onDidChangeCursorSelection((e) => {
      // Aquí se puede implementar funcionalidad adicional
      // como mostrar información de contexto
    });

    // Comandos personalizados
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      handleFormatCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveCode();
    });
  };

  /**
   * Handlers para acciones del editor
   */
  const handleExecuteCode = async () => {
    if (isExecuting) {
      console.warn('⚠️ Ejecución ya en progreso');
      return;
    }

    try {
      await executeCode();
    } catch (error) {
      console.error('❌ Error ejecutando código:', error);
    }
  };

  const handleFormatCode = async () => {
    try {
      await formatCode();
    } catch (error) {
      console.error('❌ Error formateando código:', error);
    }
  };

  const handleSaveCode = () => {
    saveCode();
    console.log('💾 Código guardado');
  };

  const handleNewFile = () => {
    const template = getTemplateForLanguage();
    newFile(currentFile, template);
  };

  const getTemplateForLanguage = () => {
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
`,
      jsx: `// 🧀 Nuevo archivo JSX en CheeseJS
import React from 'react';

const Saludo = () => {
  return (
    <div>
      <h1>¡Hola CheeseJS! 🧀</h1>
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
    </div>
  );
};

export default Saludo;
`
    };
    
    return templates[currentLanguage] || templates.javascript;
  };

  /**
   * Instalar dependencia faltante
   */
  const handleInstallDependency = async (packageName) => {
    try {
      await installDependency(packageName);
      console.log(`✅ ${packageName} instalado correctamente`);
    } catch (error) {
      console.error(`❌ Error instalando ${packageName}:`, error);
    }
  };

  /**
   * Cerrar diálogo de dependencias
   */
  const handleCloseDependencyDialog = () => {
    setShowDependencyDialog(false);
  };

  // Eliminado: limpiar resultados (gestión en OutputEditor)

  /**
   * Obtener opciones del editor
   */
  const getEditorOptions = () => {
    return {
      value: currentCode,
      language: getMonacoLanguage(currentLanguage),
      theme: theme?.name || (isDarkTheme() ? 'cheesejs-dark' : 'cheesejs-light'),
      options: {
        ...editorConfig,
        readOnly: isExecuting, // Readonly durante ejecución
        contextmenu: true,
        copyWithSyntaxHighlighting: true
      }
    };
  };

  /**
   * Mapear lenguaje detectado a lenguaje Monaco
   */
  const getMonacoLanguage = (language) => {
    const mapping = {
      javascript: 'javascript',
      typescript: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript'
    };
    return mapping[language] || 'javascript';
  };

  return (
    <div className="monaco-editor-container">
      {/* Solo el editor; la salida vive en OutputEditor */}
      <div className="monaco-editor-panel">
        {/* Barra de estado del editor */}
        <div className="monaco-editor-status">
          <div className="monaco-editor-info">
            <span className="language-indicator">
              {languageDetectionService.getLanguageInfo(currentLanguage).displayName}
            </span>
            <span className="file-indicator">
              {currentFile}
              {hasUnsavedChanges && <span className="unsaved-indicator">●</span>}
            </span>
            {missingDependencies.length > 0 && (
              <span className="dependency-warning" onClick={() => setShowDependencyDialog(true)}>
                ⚠️ {missingDependencies.length} dependencia(s) faltante(s)
              </span>
            )}
          </div>
          
          <div className="monaco-editor-actions">
            <button 
              className="editor-action"
              onClick={handleExecuteCode}
              disabled={isExecuting}
              title="Ejecutar código (Ctrl+Enter)"
            >
              {isExecuting ? '⏳' : '▶️'}
            </button>
            <button 
              className="editor-action"
              onClick={handleFormatCode}
              title="Formatear código (Ctrl+Shift+F)"
            >
              🎨
            </button>
            <button 
              className="editor-action"
              onClick={handleSaveCode}
              disabled={!hasUnsavedChanges}
              title="Guardar código (Ctrl+S)"
            >
              💾
            </button>
          </div>
        </div>
        
        {/* Editor Monaco */}
        <div className="monaco-editor-wrapper">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            {...getEditorOptions()}
            onMount={handleEditorDidMount}
            loading={<div className="monaco-loading">Cargando editor...</div>}
          />
        </div>
      </div>
      
      {/* Diálogo de dependencias faltantes */}
      {showDependencyDialog && (
        <div className="dependency-dialog-overlay" onClick={handleCloseDependencyDialog}>
          <div className="dependency-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dependency-dialog-header">
              <h3>Dependencias Faltantes</h3>
              <button 
                className="close-dialog"
                onClick={handleCloseDependencyDialog}
              >
                ✕
              </button>
            </div>
            
            <div className="dependency-dialog-content">
              <p>Se detectaron las siguientes dependencias faltantes:</p>
              
              <div className="missing-dependencies">
                {missingDependencies.map((dep, index) => (
                  <div key={index} className="missing-dependency">
                    <div className="dependency-info">
                      <strong>{dep.name}</strong>
                      <span className="dependency-reason">{dep.reason}</span>
                    </div>
                    
                    {dep.suggested && (
                      <button
                        className="install-dependency"
                        onClick={() => handleInstallDependency(dep.name)}
                      >
                        Instalar
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {suggestedInstallations.length > 0 && (
                <div className="suggested-installations">
                  <h4>Instalaciones Sugeridas</h4>
                  {suggestedInstallations.map((suggestion, index) => (
                    <div key={index} className="suggestion">
                      <div className="suggestion-info">
                        <strong>{suggestion.name}</strong>
                        <span className="suggestion-description">{suggestion.description}</span>
                      </div>
                      <button
                        className="install-suggestion"
                        onClick={() => handleInstallDependency(suggestion.name)}
                      >
                        Instalar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonacoEditor;