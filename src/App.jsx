import React, { useEffect } from 'react';
import { AppShell } from './components/layout/app-shell.jsx';
import { MonacoEditor } from './components/editor/monaco-editor.jsx';
import { OutputEditor } from './components/editor/output-editor.jsx';
import { Terminal } from './components/terminal/terminal.jsx';
import { cheeseJSCore } from './core/cheesejs-core.js';
import { eventBus } from './utils/event-bus.js';
import { usePanelResize } from './hooks/use-panel-resize.js';
import "./App.css";

/**
 * App Component - Aplicación principal CheeseJS
 * Layout de 3 paneles: Editor (izquierda), Salida (derecha), Terminal (abajo)
 */
function App() {
  // Hook para redimensionamiento de paneles
  const {
    panelSizes,
    isResizing,
    getPanelStyles,
    getSeparatorProps,
    resetPanelSizes
  } = usePanelResize(
    {
      editorWidth: 50,
      outputWidth: 50,
      topPanelHeight: 70,
      terminalHeight: 30
    },
    {
      minSizes: {
        editorWidth: 20,
        outputWidth: 20,
        topPanelHeight: 50,
        terminalHeight: 15
      },
      maxSizes: {
        editorWidth: 80,
        outputWidth: 80,
        topPanelHeight: 85,
        terminalHeight: 50
      },
      persistKey: 'cheesejs-layout',
      onResize: (sizes) => {
        console.log('📏 Tamaños de paneles actualizados:', sizes);
        eventBus.emit('layout:panel-resized', sizes);
      }
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

  return (
    <AppShell>
      <div className={`three-panel-layout ${isResizing ? 'resizing' : ''}`}>
        {/* Panel superior con Editor y Salida */}
        <div 
          className="top-panel" 
          style={{
            gridTemplateColumns: `${panelSizes.editorWidth}% 4px ${panelSizes.outputWidth}%`
          }}
        >
          {/* Monaco Editor - Izquierda */}
          <div className="editor-panel">
            <MonacoEditor />
          </div>
          
          {/* Separador vertical redimensionable */}
          <div {...getSeparatorProps('vertical-separator')}></div>
          
          {/* Output Editor - Derecha */}
          <div className="output-panel">
            <OutputEditor />
          </div>
        </div>
        
        {/* Separador horizontal redimensionable */}
        <div {...getSeparatorProps('horizontal-separator')}></div>
        
        {/* Terminal - Abajo */}
        <div className="terminal-panel">
          <Terminal />
        </div>
      </div>
    </AppShell>
  );
}

export default App;
