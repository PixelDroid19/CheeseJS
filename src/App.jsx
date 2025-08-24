import React, { useEffect } from 'react';
import { AppShell } from './components/layout/app-shell.jsx';
import { MonacoEditor } from './components/editor/monaco-editor.jsx';
import { OutputEditor } from './components/editor/output-editor.jsx';
import { cheeseJSCore } from './core/cheesejs-core.js';
import { eventBus } from './utils/event-bus.js';
import { usePanelResize } from './hooks/use-panel-resize.js';
import "./App.css";

/**
 * App Component - Aplicación principal CheeseJS
 * Layout principal con editor y salida, consola unificada gestionada por AppShell
 */
function App() {
  const { panelSizes, getSeparatorProps } = usePanelResize(
    { editorWidth: 50, outputWidth: 50 },
    {
      minSizes: { editorWidth: 20, outputWidth: 20 },
      maxSizes: { editorWidth: 80, outputWidth: 80 },
      persistKey: 'main-editor-split'
    }
  );
  useEffect(() => {
    // Inicializar CheeseJS Core
    const initializeApp = async () => {
      try {
        console.log('🧀 Iniciando CheeseJS...');
        await cheeseJSCore.initialize();
        console.log('🧀 CheeseJS iniciado exitosamente');
        
        // Emitir evento de aplicación lista
        eventBus.emit('app:ready', {
          timestamp: Date.now(),
          version: '0.1.0'
        });
        
      } catch (error) {
        console.error('❌ Error al inicializar CheeseJS:', error);
        eventBus.emit('app:initialization-error', { error: error.message });
      }
    };

    initializeApp();

    // Cleanup al desmontar el componente
    return () => {
      cheeseJSCore.destroy();
    };
  }, []);

  const separatorProps = getSeparatorProps('vertical-separator');

  return (
    <AppShell>
      <div
        className="main-editor-layout"
        style={{
          gridTemplateColumns: `${panelSizes.editorWidth || 50}% 4px ${panelSizes.outputWidth || 50}%`
        }}
      >
        {/* Panel de Editor a la izquierda */}
        <div className="editor-section">
          <MonacoEditor />
        </div>

        {/* Separador vertical redimensionable */}
        <div
          {...separatorProps}
          className={`resizer resizer-vertical ${separatorProps.className || ''}`}
        />
        
        {/* Panel de Salida a la derecha */}
        <div className="output-section">
          <OutputEditor />
        </div>
      </div>
    </AppShell>
  );
}

export default App;
