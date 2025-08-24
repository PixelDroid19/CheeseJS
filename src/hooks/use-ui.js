import { useUIStore } from '../stores/ui-store.js';
import { useShallow } from 'zustand/react/shallow';

/**
 * Hook para gestión de estados de interfaz de usuario
 * Proporciona acceso simplificado a modales, notificaciones, layout y otros elementos de UI
 */
export const useUI = () => {
  const {
    // Estados principales
    modals,
    notifications,
    layout,
    tooltip,
    loadingStates,
    globalLoading,
    dragDrop,
    accessibility,
    floatingToolbar,
    
    // Acciones de modales
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getActiveModal,
    
    // Acciones de notificaciones
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Acciones de layout
    toggleSidebar,
    toggleConsole,
    updatePanelSize,
    startResize,
    endResize,
    
    // Acciones de tooltips
    showTooltip,
    hideTooltip,
    
    // Acciones de loading
    setLoading,
    isLoading,
    setGlobalLoading,
    
    // Acciones de drag & drop
    startDrag,
    endDrag,
    registerDropZone,
    
    // Acciones de accesibilidad
    updateAccessibility,
    
    // Acciones de toolbar
    toggleFloatingToolbar,
    toggleToolbarCollapse,
    updateToolbarPosition,
    
    // Utilidades
    resetUI,
    getUIState
  } = useUIStore(
    useShallow((state) => ({
      // Estados
      modals: state.modals,
      notifications: state.notifications,
      layout: state.layout,
      tooltip: state.tooltip,
      loadingStates: state.loadingStates,
      globalLoading: state.globalLoading,
      dragDrop: state.dragDrop,
      accessibility: state.accessibility,
      floatingToolbar: state.floatingToolbar,
      
      // Acciones
      openModal: state.openModal,
      closeModal: state.closeModal,
      closeAllModals: state.closeAllModals,
      isModalOpen: state.isModalOpen,
      getActiveModal: state.getActiveModal,
      
      addNotification: state.addNotification,
      removeNotification: state.removeNotification,
      clearNotifications: state.clearNotifications,
      
      toggleSidebar: state.toggleSidebar,
      toggleConsole: state.toggleConsole,
      updatePanelSize: state.updatePanelSize,
      startResize: state.startResize,
      endResize: state.endResize,
      
      showTooltip: state.showTooltip,
      hideTooltip: state.hideTooltip,
      
      setLoading: state.setLoading,
      isLoading: state.isLoading,
      setGlobalLoading: state.setGlobalLoading,
      
      startDrag: state.startDrag,
      endDrag: state.endDrag,
      registerDropZone: state.registerDropZone,
      
      updateAccessibility: state.updateAccessibility,
      
      toggleFloatingToolbar: state.toggleFloatingToolbar,
      toggleToolbarCollapse: state.toggleToolbarCollapse,
      updateToolbarPosition: state.updateToolbarPosition,
      
      resetUI: state.resetUI,
      getUIState: state.getUIState
    }))
  );

  // Helpers específicos para modales
  const modal = {
    open: openModal,
    close: closeModal,
    closeAll: closeAllModals,
    isOpen: isModalOpen,
    active: getActiveModal(),
    hasActive: modals.length > 0,
    count: modals.length,
    
    // Helpers específicos para tipos de modal
    openSettings: (props = {}) => openModal({ type: 'settings', title: 'Configuración', size: 'large', ...props }),
    openHelp: (props = {}) => openModal({ type: 'help', title: 'Ayuda', size: 'large', ...props }),
    openPackages: (props = {}) => openModal({ type: 'packages', title: 'Gestión de Paquetes', size: 'medium', ...props }),
    openExamples: (props = {}) => openModal({ type: 'examples', title: 'Ejemplos', size: 'large', ...props }),
    openConfirm: (message, onConfirm, onCancel, props = {}) => openModal({
      type: 'confirm',
      title: 'Confirmación',
      size: 'small',
      props: { message, onConfirm, onCancel },
      ...props
    })
  };

  // Helpers específicos para notificaciones
  const notification = {
    add: addNotification,
    remove: removeNotification,
    clear: clearNotifications,
    count: notifications.length,
    
    // Helpers para tipos específicos
    info: (message, options = {}) => addNotification({ type: 'info', message, ...options }),
    success: (message, options = {}) => addNotification({ type: 'success', message, ...options }),
    warning: (message, options = {}) => addNotification({ type: 'warning', message, ...options }),
    error: (message, options = {}) => addNotification({ type: 'error', message, ...options })
  };

  // Helpers específicos para layout
  const layoutHelpers = {
    toggleSidebar,
    toggleConsole,
    updatePanelSize,
    isResizing: layout.isResizing,
    startResize,
    endResize,
    
    // Estado del layout
    isSidebarCollapsed: layout.sidebarCollapsed,
    isConsoleVisible: layout.consoleVisible,
    sidebarWidth: layout.sidebarWidth,
    consoleHeight: layout.consoleHeight,
    panelSizes: layout.panelSizes,
    currentBreakpoint: layout.currentBreakpoint,
    
    // Helpers de breakpoints
    isMobile: layout.currentBreakpoint === 'mobile',
    isTablet: layout.currentBreakpoint === 'tablet',
    isDesktop: layout.currentBreakpoint === 'desktop'
  };

  // Helpers específicos para loading
  const loading = {
    set: setLoading,
    check: isLoading,
    global: globalLoading,
    setGlobal: setGlobalLoading,
    states: loadingStates,
    
    // Helpers para estados específicos
    isAnyLoading: loadingStates.size > 0 || globalLoading,
    getLoadingKeys: () => Array.from(loadingStates.keys())
  };

  // Helpers específicos para drag & drop
  const drag = {
    start: startDrag,
    end: endDrag,
    registerDropZone,
    isDragging: dragDrop.isDragging,
    dragType: dragDrop.dragType,
    dragData: dragDrop.dragData,
    dropZones: dragDrop.dropZones
  };

  // Helpers específicos para toolbar flotante
  const toolbar = {
    toggle: toggleFloatingToolbar,
    toggleCollapse: toggleToolbarCollapse,
    updatePosition: updateToolbarPosition,
    isVisible: floatingToolbar.isVisible,
    isCollapsed: floatingToolbar.isCollapsed,
    position: floatingToolbar.position,
    isDragging: floatingToolbar.isDragging
  };

  return {
    // Acceso directo a estados principales
    modals,
    notifications,
    layout,
    tooltip,
    accessibility,
    
    // Helpers organizados por categoría
    modal,
    notification,
    layout: layoutHelpers,
    loading,
    drag,
    toolbar,
    
    // Acciones de tooltips
    showTooltip,
    hideTooltip,
    isTooltipVisible: tooltip.isVisible,
    
    // Acciones de accesibilidad
    updateAccessibility,
    
    // Utilidades generales
    resetUI,
    getUIState: getUIState()
  };
};

/**
 * Hook específico para modales
 * Proporciona una API simplificada para gestión de modales
 */
export const useModal = () => {
  const { modal } = useUI();
  return modal;
};

/**
 * Hook específico para notificaciones
 * Proporciona una API simplificada para gestión de notificaciones
 */
export const useNotification = () => {
  const { notification } = useUI();
  return notification;
};

/**
 * Hook específico para layout
 * Proporciona una API simplificada para gestión de layout
 */
export const useLayout = () => {
  const { layout } = useUI();
  return layout;
};

/**
 * Hook específico para estados de loading
 * Proporciona una API simplificada para gestión de loading
 */
export const useLoading = () => {
  const { loading } = useUI();
  return loading;
};

export default useUI;