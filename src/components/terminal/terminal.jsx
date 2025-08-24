import React, { useEffect } from 'react';
import { useTerminal } from '../../hooks/use-terminal.js';
import './terminal.css';

/**
 * Terminal Component
 * Terminal interactiva usando xterm.js integrada con WebContainer
 */
export const Terminal = () => {
  const {
    terminalRef,
    isConnected,
    commandHistory,
    commandsCount,
    initializeTerminal,
    clearTerminal
  } = useTerminal({
    enableWelcomeMessage: true,
    enableHistory: true,
    enableAutoResize: true
  });

  useEffect(() => {
    initializeTerminal();
  }, []);





































  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon">🖥️</span>
          <span className="terminal-name">Terminal</span>
          <span className="terminal-status">
            {isConnected ? '🟢 Conectada' : '🟡 Desconectada'}
          </span>
        </div>
        
        <div className="terminal-actions">
          <button 
            className="terminal-btn"
            onClick={clearTerminal}
            title="Limpiar terminal"
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="terminal-content"
      />
    </div>
  );
};

export default Terminal;