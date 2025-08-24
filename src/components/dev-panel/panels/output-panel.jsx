import React, { useState, useEffect, useRef } from 'react';
import { eventBus } from '../../../utils/event-bus.js';
import { configService } from '../../../services/config-service.js';
import './output-panel.css';

/**
 * OutputPanel - Panel de salida de ejecución
 * Panel modular para mostrar logs y resultados de ejecución
 */
export const OutputPanel = ({ panelId, state, updateState, isActive }) => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    info: true,
    warn: true,
    error: true,
    debug: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollRef = useRef(null);

  useEffect(() => {
    initializePanel();
    
    // Suscribirse a eventos
    const unsubscribers = [
      eventBus.subscribe('execution:started', handleExecutionStarted),
      eventBus.subscribe('execution:completed', handleExecutionCompleted),
      eventBus.subscribe('execution:error', handleExecutionError),
      eventBus.subscribe('execution:output', handleExecutionOutput),
      eventBus.subscribe('webcontainer:ready', handleWebContainerReady),
      eventBus.subscribe('cheesejs:initialized', handleCheeseJSInitialized),
      eventBus.subscribe('devpanel:tab-action', handleTabAction)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    // Actualizar conteo en el estado del panel
    updateState({ count: logs.length });
  }, [logs.length]);

  useEffect(() => {
    // Auto-scroll si está habilitado y el panel está activo
    if (autoScroll && isActive && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  }, [logs, autoScroll, isActive]);

  /**
   * Inicializar panel
   */
  const initializePanel = async () => {
    try {
      await configService.initialize();
      
      // Cargar filtros guardados
      const savedFilters = configService.get('output.filters', {
        info: true,
        warn: true,
        error: true,
        debug: false
      });
      setFilters(savedFilters);

      // Logs de bienvenida
      addLog('info', '🧀 CheeseJS - Panel de Salida Inicializado');
      addLog('info', '🔌 Esperando conexión con WebContainer...');
      addLog('info', '📝 Para ejecutar código, usa Ctrl+Enter en el editor');

      console.log('📄 OutputPanel inicializado');
      
    } catch (error) {
      console.error('❌ Error inicializando OutputPanel:', error);
    }
  };

  /**
   * Agregar log
   */
  const addLog = (level, message, data = null) => {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level,
      message,
      data,
      formatted: formatMessage(message, data)
    };

    setLogs(prev => {
      const maxLines = configService.get('output.maxLines', 1000);
      const newLogs = [...prev, log];
      
      if (newLogs.length > maxLines) {
        return newLogs.slice(-maxLines);
      }
      
      return newLogs;
    });
  };

  /**
   * Formatear mensaje
   */
  const formatMessage = (message, data) => {
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2);
      } catch (error) {
        return String(message);
      }
    }
    return String(message);
  };

  /**
   * Limpiar logs
   */
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Output limpiado');
  };

  /**
   * Generar logs de prueba
   */
  const generateTestLogs = () => {
    const timestamp = new Date().toLocaleTimeString();
    addLog('info', `🧪 Log de prueba - ${timestamp}`);
    addLog('warn', '⚠️ Ejemplo de advertencia');
    addLog('error', '❌ Ejemplo de error');
    addLog('debug', '🐛 Log de debug (solo visible si está habilitado)');
  };

  /**
   * Filtrar logs
   */
  const getFilteredLogs = () => {
    return logs.filter(log => {
      // Filtrar por nivel
      if (!filters[log.level]) return false;
      
      // Filtrar por búsqueda
      if (searchQuery && !log.formatted.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  /**
   * Cambiar filtro
   */
  const toggleFilter = (level) => {
    const newFilters = { ...filters, [level]: !filters[level] };
    setFilters(newFilters);
    configService.set('output.filters', newFilters);
  };

  /**
   * Event handlers
   */
  const handleExecutionStarted = () => {
    setIsExecuting(true);
    addLog('info', '🔄 Ejecutando código...');
  };

  const handleExecutionCompleted = (data) => {
    setIsExecuting(false);
    addLog('info', `✅ Ejecución completada en ${data.result.executionTime}ms`, data.result);
  };

  const handleExecutionError = (data) => {
    setIsExecuting(false);
    addLog('error', `❌ Error: ${data.error}`, data);
  };

  const handleExecutionOutput = (data) => {
    const logType = data.type === 'stderr' ? 'error' : 'info';
    addLog(logType, data.data, { type: data.type, timestamp: data.timestamp });
  };

  const handleWebContainerReady = () => {
    addLog('info', '✅ WebContainer conectado y listo');
  };

  const handleCheeseJSInitialized = (data) => {
    addLog('info', '🧀 CheeseJS Core inicializado correctamente');
    addLog('info', `📊 Componentes: ${Object.keys(data.components).length} activos`);
  };

  const handleTabAction = (data) => {
    if (data.panelId !== panelId) return;
    
    switch (data.action) {
      case 'clear':
        clearLogs();
        break;
      case 'test':
        generateTestLogs();
        break;
      case 'settings':
        // TODO: Abrir configuración del panel
        addLog('info', '⚙️ Configuración del panel (próximamente)');
        break;
    }
  };

  const filteredLogs = getFilteredLogs();
  
  const logCounts = {
    info: logs.filter(log => log.level === 'info').length,
    warn: logs.filter(log => log.level === 'warn').length,
    error: logs.filter(log => log.level === 'error').length,
    debug: logs.filter(log => log.level === 'debug').length
  };

  return (
    <div className="output-panel">
      {/* Header de controles */}
      <div className="output-header">
        <div className="output-info">
          {isExecuting && (
            <div className="executing-indicator">
              <div className="spinner"></div>
              <span>Ejecutando...</span>
            </div>
          )}
        </div>

        <div className="output-controls">
          {/* Filtros de nivel */}
          <div className="log-filters">
            {Object.entries(filters).map(([level, enabled]) => (
              <button
                key={level}
                className={`filter-btn ${enabled ? 'active' : ''}`}
                onClick={() => toggleFilter(level)}
                title={`${level} (${logCounts[level]})`}
              >
                <span className="filter-icon">
                  {level === 'info' && 'ℹ️'}
                  {level === 'warn' && '⚠️'}
                  {level === 'error' && '❌'}
                  {level === 'debug' && '🐛'}
                </span>
                <span className="filter-count">{logCounts[level]}</span>
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <input
            type="text"
            className="search-input"
            placeholder="Buscar en output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Auto-scroll toggle */}
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Contenido de logs */}
      <div 
        className="output-content"
        ref={scrollRef}
      >
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📝</span>
            <p>
              {searchQuery ? 
                `No se encontraron logs que coincidan con "${searchQuery}"` : 
                'No hay output para mostrar'
              }
            </p>
            <small>Los resultados de ejecución aparecerán aquí</small>
          </div>
        ) : (
          <div className="logs-container">
            {filteredLogs.map(log => (
              <div key={log.id} className={`output-log log-${log.level}`}>
                <div className="log-header">
                  <span className="log-icon">
                    {log.level === 'info' && 'ℹ️'}
                    {log.level === 'warn' && '⚠️'}
                    {log.level === 'error' && '❌'}
                    {log.level === 'debug' && '🐛'}
                  </span>
                  <span className="log-timestamp">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="log-level">{log.level.toUpperCase()}</span>
                </div>
                <div className="log-content">
                  <pre className="log-message">{log.formatted}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con estadísticas */}
      <div className="output-footer">
        <div className="output-stats">
          <span className="stat-item">Total: {logs.length} logs</span>
          <span className="stat-item">Mostrando: {filteredLogs.length}</span>
          {searchQuery && (
            <span className="stat-item">Búsqueda: "{searchQuery}"</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;