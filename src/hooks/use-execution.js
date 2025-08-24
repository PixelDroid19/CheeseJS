import { useState, useEffect } from 'react';
import { eventBus } from '../utils/event-bus.js';

/**
 * Hook para gestión de ejecución de código
 * Proporciona estado y controles para la ejecución de código
 */
export const useExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionOutput, setExecutionOutput] = useState([]);
  const [executionError, setExecutionError] = useState(null);

  useEffect(() => {
    // Suscribirse a eventos de ejecución
    const unsubscribers = [
      eventBus.subscribe('execution:started', (data) => {
        setIsExecuting(true);
        setExecutionResult(null);
        setExecutionOutput([]);
        setExecutionError(null);
      }),

      eventBus.subscribe('execution:completed', (data) => {
        setIsExecuting(false);
        setExecutionResult(data.result);
      }),

      eventBus.subscribe('execution:error', (data) => {
        setIsExecuting(false);
        setExecutionError(data.error);
      }),

      eventBus.subscribe('execution:stopped', () => {
        setIsExecuting(false);
      }),

      eventBus.subscribe('execution:output', (data) => {
        setExecutionOutput(prev => [...prev, {
          type: data.type,
          data: data.data,
          timestamp: data.timestamp || Date.now()
        }]);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Ejecutar código
   */
  const executeCode = (code, options = {}) => {
    if (isExecuting) {
      console.warn('⚠️ Ya hay código ejecutándose');
      return;
    }

    eventBus.emit('code:execute', { code, ...options });
  };

  /**
   * Detener ejecución
   */
  const stopExecution = () => {
    if (!isExecuting) {
      console.warn('⚠️ No hay código ejecutándose');
      return;
    }

    eventBus.emit('code:stop');
  };

  /**
   * Limpiar output
   */
  const clearOutput = () => {
    setExecutionOutput([]);
    setExecutionError(null);
    setExecutionResult(null);
  };

  /**
   * Obtener solo output de stdout
   */
  const getStdOutput = () => {
    return executionOutput.filter(entry => entry.type === 'stdout');
  };

  /**
   * Obtener solo output de stderr
   */
  const getErrorOutput = () => {
    return executionOutput.filter(entry => entry.type === 'stderr');
  };

  /**
   * Verificar si hay errores
   */
  const hasErrors = () => {
    return !!executionError || getErrorOutput().length > 0;
  };

  /**
   * Obtener estadísticas de ejecución
   */
  const getExecutionStats = () => {
    return {
      isExecuting,
      hasResult: !!executionResult,
      hasOutput: executionOutput.length > 0,
      hasErrors: hasErrors(),
      outputLines: executionOutput.length,
      stdoutLines: getStdOutput().length,
      stderrLines: getErrorOutput().length,
      executionTime: executionResult?.executionTime || 0,
      exitCode: executionResult?.exitCode || null
    };
  };

  return {
    // Estado
    isExecuting,
    executionResult,
    executionOutput,
    executionError,
    
    // Acciones
    executeCode,
    stopExecution,
    clearOutput,
    
    // Utilidades
    getStdOutput,
    getErrorOutput,
    hasErrors,
    getExecutionStats,
    
    // Estado derivado
    canExecute: !isExecuting,
    canStop: isExecuting
  };
};

export default useExecution;