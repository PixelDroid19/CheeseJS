import React, { useEffect } from 'react';
import { useTerminal } from '../../../hooks/use-terminal.js';
import './terminal-panel.css';

/**
 * TerminalPanel - Panel de terminal interactiva
 * Panel modular para terminal con WebContainer
 */
export const TerminalPanel = ({ panelId, state, updateState, isActive }) => {
  const {
    terminalRef,
    isConnected,
    commandHistory,
    initializeTerminal
  } = useTerminal({
    enableWelcomeMessage: true,
    enableHistory: true,
    enableAutoResize: true,
    panelId: panelId
  });

  useEffect(() => {
    if (isActive) {
      setTimeout(initializeTerminal, 200);
    }
  }, [isActive]);

























  return (
    <div className="terminal-panel">
      {/* Status bar */}
      <div className="terminal-status">
        <div className="status-info">
          <span className="status-icon">
            {isConnected ? '🟢' : '🟡'}
          </span>
          <span className="status-text">
            {isConnected ? 'Conectada' : 'Desconectada'}
          </span>
        </div>
        
        <div className="terminal-info">
          <span className="history-count">
            Historial: {commandHistory.length}
          </span>
        </div>
      </div>

      {/* Terminal container */}
      <div 
        ref={terminalRef}
        className="terminal-container"
      />
    </div>
  );
};

export default TerminalPanel;