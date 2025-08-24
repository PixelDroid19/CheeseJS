import React from 'react';
import { Icon, Button } from '../../ui/index.js';
import { eventBus } from '../../../utils/event-bus.js';

/**
 * HelpModal Component
 * Modal de ayuda que reemplaza la pestaña de help del sidebar
 */
export const HelpModal = ({ onClose }) => {
  const handleOpenExample = (exampleId) => {
    eventBus.emit('example:load-requested', { example: exampleId });
    onClose();
  };

  const shortcuts = [
    { keys: 'Ctrl+Enter', description: 'Ejecutar código' },
    { keys: 'Ctrl+S', description: 'Guardar archivo' },
    { keys: 'Ctrl+N', description: 'Nuevo archivo' },
    { keys: 'Ctrl+`', description: 'Toggle consola' },
    { keys: 'Ctrl+Shift+P', description: 'Instalar paquete' },
    { keys: 'F1', description: 'Mostrar ayuda' }
  ];

  return (
    <div className="help-modal">
      <div className="help-section">
        <div className="help-header">
          <Icon name="cheese" size="large" />
          <div>
            <h2>CheeseJS</h2>
            <p>Entorno de desarrollo JavaScript interactivo</p>
          </div>
        </div>
      </div>

      <div className="help-section">
        <h3><Icon name="play" size="small" /> Inicio Rápido</h3>
        <ul className="help-list">
          <li>Escribe código JavaScript en el editor</li>
          <li>Presiona <kbd>Ctrl+Enter</kbd> para ejecutar</li>
          <li>Ve los resultados en la consola</li>
          <li>Instala paquetes npm desde el toolbar flotante</li>
          <li>Experimenta con ejemplos predefinidos</li>
        </ul>
      </div>

      <div className="help-section">
        <h3><Icon name="code" size="small" /> Ejemplos Disponibles</h3>
        <div className="examples-grid">
          {[
            { id: 'hello-world', name: 'Hello World', icon: '👋' },
            { id: 'async-fetch', name: 'Async/Await', icon: '🌐' },
            { id: 'array-methods', name: 'Array Methods', icon: '📋' },
            { id: 'promises', name: 'Promises', icon: '⏰' }
          ].map(example => (
            <button
              key={example.id}
              className="example-card"
              onClick={() => handleOpenExample(example.id)}
            >
              <span className="example-icon">{example.icon}</span>
              <span className="example-name">{example.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="help-section">
        <h3><Icon name="terminal" size="small" /> Atajos de Teclado</h3>
        <div className="shortcuts-grid">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <kbd className="shortcut-keys">{shortcut.keys}</kbd>
              <span className="shortcut-description">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="help-section">
        <h3><Icon name="info" size="small" /> Características</h3>
        <div className="features-grid">
          <div className="feature-item">
            <Icon name="javascript" />
            <div>
              <h4>JavaScript Moderno</h4>
              <p>Soporte completo para ES6+ y APIs web</p>
            </div>
          </div>
          <div className="feature-item">
            <Icon name="npm" />
            <div>
              <h4>Paquetes NPM</h4>
              <p>Instala y usa cualquier paquete de npm</p>
            </div>
          </div>
          <div className="feature-item">
            <Icon name="console" />
            <div>
              <h4>Consola Integrada</h4>
              <p>Ve resultados y errores en tiempo real</p>
            </div>
          </div>
          <div className="feature-item">
            <Icon name="theme" />
            <div>
              <h4>Themes</h4>
              <p>Modo claro y oscuro disponibles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="help-footer">
        <Button variant="primary" onClick={onClose}>
          ¡Entendido!
        </Button>
      </div>
    </div>
  );
};

export default HelpModal;