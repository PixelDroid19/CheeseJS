import React, { useState, useEffect } from 'react';
import { eventBus } from '../../../utils/event-bus.js';
import './debug-panel.css';

/**
 * DebugPanel - Panel de debug
 * Panel modular para logs de debug y breakpoints
 */
export const DebugPanel = ({ panelId, state, updateState, isActive }) => {
  const [debugLogs, setDebugLogs] = useState([]);
  const [isDebugging, setIsDebugging] = useState(false);

  useEffect(() => {
    // Suscribirse a eventos de debug
    const unsubscribers = [
      eventBus.subscribe('debug:log', handleDebugLog),
      eventBus.subscribe('debug:start', handleDebugStart),
      eventBus.subscribe('debug:stop', handleDebugStop),
      eventBus.subscribe('devpanel:tab-action', handleTabAction)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    updateState({ count: debugLogs.length });
  }, [debugLogs.length]);

  const handleDebugLog = (data) => {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level: data.level || 'info',
      message: data.message,
      data: data.data
    };
    
    setDebugLogs(prev => [...prev, log]);
  };

  const handleDebugStart = () => {
    setIsDebugging(true);
  };

  const handleDebugStop = () => {
    setIsDebugging(false);
  };

  const handleTabAction = (data) => {
    if (data.panelId !== panelId) return;
    
    if (data.action === 'clear') {
      setDebugLogs([]);
    }
  };

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <div className="debug-status">
          {isDebugging ? (
            <span className="status-debugging">🐛 Debugging activo</span>
          ) : (
            <span className="status-idle">⏸️ Debug inactivo</span>
          )}
        </div>
      </div>

      <div className="debug-content">
        {debugLogs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🐛</span>
            <p>Debug Console</p>
            <small>Los logs de debug aparecerán aquí cuando uses el debugger</small>
          </div>
        ) : (
          <div className="debug-logs">
            {debugLogs.map(log => (
              <div key={log.id} className={`debug-log ${log.level}`}>
                <span className="log-timestamp">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;