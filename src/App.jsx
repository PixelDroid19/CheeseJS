import React, { useEffect } from 'react';
import { AppShell } from './components/layout/app-shell.jsx';
import { MonacoEditor } from './components/editor/monaco-editor.jsx';
import { OutputEditor } from './components/editor/output-editor.jsx';
import { cheeseJSCore } from './core/cheesejs-core.js';
import { eventBus } from './utils/event-bus.js';
import "./App.css";

/**
 * App Component - Aplicación principal CheeseJS
 * Layout principal con editor y salida, consola unificada gestionada por AppShell
 */
function App() {
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
      <div className="main-editor-layout">
        {/* Panel de Editor a la izquierda */}
        <div className="editor-section">
          <MonacoEditor />
        </div>
        
        {/* Panel de Salida a la derecha */}
        <div className="output-section">
          <OutputEditor />
        </div>
      </div>
    </AppShell>
  );
}

export default App;
