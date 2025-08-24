import React, { useState, useEffect } from 'react';
import { eventBus } from '../../../utils/event-bus.js';
import './problems-panel.css';

/**
 * ProblemsPanel - Panel de problemas y errores
 * Panel modular para mostrar errores de sintaxis y warnings
 */
export const ProblemsPanel = ({ panelId, state, updateState, isActive }) => {
  const [problems, setProblems] = useState([]);
  const [filters, setFilters] = useState({
    errors: true,
    warnings: true,
    info: true
  });

  useEffect(() => {
    // Suscribirse a eventos de problemas
    const unsubscribers = [
      eventBus.subscribe('editor:problems', handleProblems),
      eventBus.subscribe('compilation:errors', handleCompilationErrors),
      eventBus.subscribe('devpanel:tab-action', handleTabAction)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    // Actualizar conteo
    updateState({ count: problems.length });
  }, [problems.length]);

  const handleProblems = (data) => {
    setProblems(data.problems || []);
  };

  const handleCompilationErrors = (data) => {
    const errorProblems = data.errors.map(error => ({
      id: Date.now() + Math.random(),
      type: 'error',
      message: error.message,
      file: error.file || 'unknown',
      line: error.line || 0,
      column: error.column || 0,
      timestamp: new Date()
    }));
    
    setProblems(prev => [...prev, ...errorProblems]);
  };

  const handleTabAction = (data) => {
    if (data.panelId !== panelId) return;
    
    if (data.action === 'clear') {
      setProblems([]);
    }
  };

  const filteredProblems = problems.filter(problem => 
    filters[problem.type + 's'] !== false
  );

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <div className="problems-filters">
          {Object.entries(filters).map(([type, enabled]) => (
            <button
              key={type}
              className={`filter-btn ${enabled ? 'active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, [type]: !enabled }))}
            >
              {type === 'errors' && '❌'}
              {type === 'warnings' && '⚠️'}
              {type === 'info' && 'ℹ️'}
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="problems-content">
        {filteredProblems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <p>No hay problemas detectados</p>
            <small>Los errores de sintaxis y warnings aparecerán aquí</small>
          </div>
        ) : (
          <div className="problems-list">
            {filteredProblems.map(problem => (
              <div key={problem.id} className={`problem-item ${problem.type}`}>
                <div className="problem-icon">
                  {problem.type === 'error' && '❌'}
                  {problem.type === 'warning' && '⚠️'}
                  {problem.type === 'info' && 'ℹ️'}
                </div>
                <div className="problem-details">
                  <div className="problem-message">{problem.message}</div>
                  <div className="problem-location">
                    {problem.file}:{problem.line}:{problem.column}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsPanel;