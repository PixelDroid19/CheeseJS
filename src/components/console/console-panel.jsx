import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../layout/theme-provider.jsx';
import { configService } from '../../services/config-service.js';
import { i18nService } from '../../services/i18n-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './console-panel.css';

/**
 * Console Panel Component
 * Panel de consola para mostrar resultados de ejecución
 */
export const ConsolePanel = () => {
  const { currentTheme } = useTheme();
  const [logs, setLogs] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [filters, setFilters] = useState({
    info: true,
    warn: true,
    error: true,
    debug: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [t, setT] = useState(() => (key, params) => key);
  const consoleRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    // Inicializar i18n
    const initializeI18n = async () => {
      await i18nService.initialize();
      setT(() => (key, params) => i18nService.t(key, params));
    };

    initializeI18n();

    // Cargar configuración de consola
    const loadConsoleConfig = async () => {
      await configService.initialize();
      const consoleFilters = configService.get('console.filters', {
        info: true,
        warn: true,
        error: true,
        debug: false
      });
      setFilters(consoleFilters);
    };

    loadConsoleConfig();

    // Suscribirse a eventos
    const unsubscribeLanguageChanged = eventBus.subscribe('i18n:language-changed', (data) => {
      setT(() => (key, params) => i18nService.t(key, params));
    });

    const unsubscribeCodeExecute = eventBus.subscribe('code:execute', (data) => {
      handleCodeExecution(data.code);
    });

    const unsubscribeCodeStop = eventBus.subscribe('code:stop', () => {
      handleStopExecution();
    });

    const unsubscribeExecutionStarted = eventBus.subscribe('execution:started', () => {
      setIsExecuting(true);
      addLog('info', t('console.executing'));
    });

    const unsubscribeExecutionCompleted = eventBus.subscribe('execution:completed', (data) => {
      setIsExecuting(false);
      addLog('info', `Ejecución completada en ${data.result.executionTime}ms`, data.result);
    });

    const unsubscribeExecutionError = eventBus.subscribe('execution:error', (data) => {
      setIsExecuting(false);
      addLog('error', `Error: ${data.error}`, data);
    });

    const unsubscribeExecutionOutput = eventBus.subscribe('execution:output', (data) => {
      const logType = data.type === 'stderr' ? 'error' : 'info';
      addLog(logType, data.data, { type: data.type, timestamp: data.timestamp });
    });

    // Agregar log de bienvenida
    addLog('info', '🧀 CheeseJS Console - Listo para mostrar resultados');
    addLog('info', 'Presiona Ctrl+Enter para ejecutar código JavaScript');

    return () => {
      unsubscribeLanguageChanged();
      unsubscribeCodeExecute();
      unsubscribeCodeStop();
      unsubscribeExecutionStarted();
      unsubscribeExecutionCompleted();
      unsubscribeExecutionError();
      unsubscribeExecutionOutput();
    };
  }, []);

  /**
   * Agregar log a la consola
   */
  const addLog = (level, message, data = null) => {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level,
      message,
      data,
      formatted: formatLogMessage(message, data)
    };

    setLogs(prev => {
      const maxLines = configService.get('console.maxLines', 1000);
      const newLogs = [...prev, log];
      
      // Limitar número de líneas
      if (newLogs.length > maxLines) {
        return newLogs.slice(-maxLines);
      }
      
      return newLogs;
    });

    // Auto-scroll si está habilitado
    if (autoScrollRef.current) {
      setTimeout(() => {
        if (consoleRef.current) {
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  /**
   * Formatear mensaje de log
   */
  const formatLogMessage = (message, data) => {
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
   * Manejar ejecución de código
   */
  const handleCodeExecution = async (code) => {
    try {
      // Limpiar consola si está configurado
      if (configService.get('console.clearOnRun', false)) {
        clearConsole();
      }

      // Emitir evento para iniciar ejecución en WebContainer
      eventBus.emit('webcontainer:execute', { code });
    } catch (error) {
      addLog('error', `Error al ejecutar código: ${error.message}`);
    }
  };

  /**
   * Detener ejecución
   */
  const handleStopExecution = () => {
    setIsExecuting(false);
    addLog('warn', t('console.stopped'));
    eventBus.emit('webcontainer:stop');
  };

  /**
   * Limpiar consola
   */
  const clearConsole = () => {
    setLogs([]);
    addLog('info', 'Consola limpiada');
  };

  /**
   * Cambiar filtro de nivel
   */
  const toggleFilter = (level) => {
    const newFilters = { ...filters, [level]: !filters[level] };
    setFilters(newFilters);
    configService.set('console.filters', newFilters);
  };

  /**
   * Copiar logs al portapapeles
   */
  const copyLogs = () => {
    const visibleLogs = getFilteredLogs();
    const logText = visibleLogs
      .map(log => `[${log.timestamp.toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.formatted}`)
      .join('\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      addLog('info', 'Logs copiados al portapapeles');
    }).catch(error => {
      addLog('error', `Error al copiar logs: ${error.message}`);
    });
  };

  /**
   * Exportar logs como archivo
   */
  const exportLogs = () => {
    const visibleLogs = getFilteredLogs();
    const logText = visibleLogs
      .map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.formatted}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cheesejs-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('info', 'Logs exportados correctamente');
  };

  /**
   * Obtener logs filtrados
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
   * Obtener clase CSS para el nivel de log
   */
  const getLogLevelClass = (level) => {
    const classes = {
      info: 'log-info',
      warn: 'log-warning',
      error: 'log-error',
      debug: 'log-debug'
    };
    return classes[level] || 'log-info';
  };

  /**
   * Obtener icono para el nivel de log
   */
  const getLogLevelIcon = (level) => {
    const icons = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🐛'
    };
    return icons[level] || 'ℹ️';
  };

  /**
   * Manejar scroll manual
   */
  const handleScroll = () => {
    if (consoleRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
      autoScrollRef.current = scrollTop + clientHeight >= scrollHeight - 10;
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
    <div className="console-panel">
      {/* Console Header */}
      <div className="console-header">
        <div className="console-title">
          <span className="console-icon">🖥️</span>
          <span className="console-label">{t('console.output')}</span>
          {isExecuting && (
            <div className="executing-indicator">
              <div className="spinner"></div>
              <span>Ejecutando...</span>
            </div>
          )}
        </div>

        <div className="console-actions">
          {/* Filtros de nivel */}
          <div className="log-filters">
            {Object.entries(filters).map(([level, enabled]) => (
              <button
                key={level}
                className={`filter-btn ${enabled ? 'active' : ''}`}
                onClick={() => toggleFilter(level)}
                title={`${level} (${logCounts[level]})`}
              >
                <span className="filter-icon">{getLogLevelIcon(level)}</span>
                <span className="filter-count">{logCounts[level]}</span>
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar en logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Acciones */}
          <button 
            className="action-btn"
            onClick={clearConsole}
            title={t('console.clear')}
          >
            🗑️
          </button>
          
          <button 
            className="action-btn"
            onClick={copyLogs}
            title="Copiar logs"
          >
            📋
          </button>
          
          <button 
            className="action-btn"
            onClick={exportLogs}
            title="Exportar logs"
          >
            💾
          </button>
        </div>
      </div>

      {/* Console Content */}
      <div 
        className="console-content"
        ref={consoleRef}
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <div className="console-empty">
            <span className="empty-icon">📝</span>
            <p className="empty-message">
              {searchQuery ? 
                `No se encontraron logs que coincidan con "${searchQuery}"` : 
                t('console.empty')
              }
            </p>
          </div>
        ) : (
          <div className="console-logs">
            {filteredLogs.map(log => (
              <div key={log.id} className={`console-log ${getLogLevelClass(log.level)}`}>
                <div className="log-header">
                  <span className="log-icon">{getLogLevelIcon(log.level)}</span>
                  <span className="log-timestamp">
                    {configService.get('console.timestamp', true) && 
                      log.timestamp.toLocaleTimeString()
                    }
                  </span>
                  <span className="log-level">{log.level.toUpperCase()}</span>
                </div>
                <div className="log-content">
                  <pre className="log-message">{log.formatted}</pre>
                  {log.data && log.data.type && (
                    <div className="log-metadata">
                      <span className="metadata-label">Tipo:</span>
                      <span className="metadata-value">{log.data.type}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Console Footer */}
      <div className="console-footer">
        <div className="console-stats">
          <span className="stat-item">
            Total: {logs.length} logs
          </span>
          <span className="stat-item">
            Mostrando: {filteredLogs.length}
          </span>
          {searchQuery && (
            <span className="stat-item">
              Búsqueda: "{searchQuery}"
            </span>
          )}
        </div>
        
        <div className="console-controls">
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScrollRef.current}
              onChange={(e) => autoScrollRef.current = e.target.checked}
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ConsolePanel;