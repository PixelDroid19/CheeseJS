import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook personalizado para manejar redimensionamiento de paneles
 * Soporta redimensionamiento horizontal y vertical con límites y persistencia
 */
export const usePanelResize = (initialSizes = {}, options = {}) => {
  const {
    minSizes = {},
    maxSizes = {},
    persistKey = null,
    onResize = null
  } = options;

  // Estado de tamaños de paneles
  const [panelSizes, setPanelSizes] = useState(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`panel-sizes-${persistKey}`);
      if (saved) {
        try {
          return { ...initialSizes, ...JSON.parse(saved) };
        } catch (e) {
          console.warn('Error loading saved panel sizes:', e);
        }
      }
    }
    return initialSizes;
  });

  // Estado de redimensionamiento activo
  const [isResizing, setIsResizing] = useState(false);
  const [resizingPanel, setResizingPanel] = useState(null);

  // Referencias para el manejo de eventos
  const startPositionRef = useRef({ x: 0, y: 0 });
  const startSizesRef = useRef({});

  /**
   * Guardar tamaños en localStorage
   */
  const savePanelSizes = useCallback((sizes) => {
    if (persistKey) {
      try {
        localStorage.setItem(`panel-sizes-${persistKey}`, JSON.stringify(sizes));
      } catch (e) {
        console.warn('Error saving panel sizes:', e);
      }
    }
  }, [persistKey]);

  /**
   * Validar y aplicar límites a los tamaños
   */
  const validateSizes = useCallback((sizes) => {
    const validated = { ...sizes };
    
    Object.keys(validated).forEach(key => {
      const min = minSizes[key];
      const max = maxSizes[key];
      
      if (min !== undefined && validated[key] < min) {
        validated[key] = min;
      }
      if (max !== undefined && validated[key] > max) {
        validated[key] = max;
      }
    });
    
    return validated;
  }, [minSizes, maxSizes]);

  /**
   * Actualizar tamaños de paneles
   */
  const updatePanelSizes = useCallback((newSizes) => {
    const validated = validateSizes(newSizes);
    setPanelSizes(validated);
    savePanelSizes(validated);
    
    if (onResize) {
      onResize(validated);
    }
  }, [validateSizes, savePanelSizes, onResize]);

  /**
   * Iniciar redimensionamiento
   */
  const startResize = useCallback((panelId, event) => {
    event.preventDefault();
    
    setIsResizing(true);
    setResizingPanel(panelId);
    
    startPositionRef.current = {
      x: event.clientX,
      y: event.clientY
    };
    startSizesRef.current = { ...panelSizes };
    
    // Agregar cursor global
    document.body.style.cursor = panelId.includes('vertical') ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
    
    console.log(`🔧 Iniciando redimensionamiento: ${panelId}`);
  }, [panelSizes]);

  /**
   * Manejar movimiento durante redimensionamiento
   */
  const handleResize = useCallback((event) => {
    if (!isResizing || !resizingPanel) return;
    
    const deltaX = event.clientX - startPositionRef.current.x;
    const deltaY = event.clientY - startPositionRef.current.y;
    
    const newSizes = { ...startSizesRef.current };
    
    // Calcular nuevos tamaños basados en el panel que se está redimensionando
    if (resizingPanel === 'vertical-separator') {
      // Redimensionamiento horizontal - cambiar ancho del editor
      const containerWidth = event.currentTarget?.parentElement?.offsetWidth || 1000;
      const currentEditorWidth = startSizesRef.current.editorWidth || 50;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      newSizes.editorWidth = Math.max(20, Math.min(80, currentEditorWidth + deltaPercent));
      newSizes.outputWidth = 100 - newSizes.editorWidth;
      
    } else if (resizingPanel === 'horizontal-separator') {
      // Redimensionamiento vertical - cambiar altura de la terminal
      const containerHeight = event.currentTarget?.parentElement?.offsetHeight || 600;
      const currentTerminalHeight = startSizesRef.current.terminalHeight || 30;
      const deltaPercent = (-deltaY / containerHeight) * 100; // Negativo porque hacia arriba aumenta
      
      newSizes.terminalHeight = Math.max(15, Math.min(50, currentTerminalHeight + deltaPercent));
      newSizes.topPanelHeight = 100 - newSizes.terminalHeight;
    }
    
    updatePanelSizes(newSizes);
  }, [isResizing, resizingPanel, updatePanelSizes]);

  /**
   * Finalizar redimensionamiento
   */
  const stopResize = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    setResizingPanel(null);
    
    // Restaurar cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    console.log('🔧 Redimensionamiento finalizado');
  }, [isResizing]);

  /**
   * Resetear tamaños a los valores por defecto
   */
  const resetPanelSizes = useCallback(() => {
    updatePanelSizes(initialSizes);
    console.log('🔄 Tamaños de paneles reseteados');
  }, [initialSizes, updatePanelSizes]);

  /**
   * Configurar event listeners globales
   */
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e) => handleResize(e);
      const handleMouseUp = () => stopResize();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResize, stopResize]);

  /**
   * Limpiar al desmontar
   */
  useEffect(() => {
    return () => {
      if (isResizing) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isResizing]);

  /**
   * Obtener estilos para aplicar a los paneles
   */
  const getPanelStyles = useCallback((panelId) => {
    const styles = {};
    
    switch (panelId) {
      case 'editor':
        styles.width = `${panelSizes.editorWidth || 50}%`;
        break;
      case 'output':
        styles.width = `${panelSizes.outputWidth || 50}%`;
        break;
      case 'top-panel':
        styles.height = `${panelSizes.topPanelHeight || 70}%`;
        break;
      case 'terminal':
        styles.height = `${panelSizes.terminalHeight || 30}%`;
        break;
    }
    
    return styles;
  }, [panelSizes]);

  /**
   * Obtener props para separadores
   */
  const getSeparatorProps = useCallback((separatorId) => {
    return {
      onMouseDown: (e) => startResize(separatorId, e),
      className: `${separatorId} ${isResizing && resizingPanel === separatorId ? 'resizing' : ''}`,
      style: {
        cursor: separatorId.includes('vertical') ? 'ew-resize' : 'ns-resize'
      }
    };
  }, [startResize, isResizing, resizingPanel]);

  return {
    panelSizes,
    isResizing,
    resizingPanel,
    updatePanelSizes,
    resetPanelSizes,
    getPanelStyles,
    getSeparatorProps
  };
};