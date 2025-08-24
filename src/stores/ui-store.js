import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';

/**
 * UIStore - Gestión de estados de interfaz de usuario
 * Maneja modales, notificaciones, layout, tooltips y otros elementos de UI
 */
const initialState = createInitialState({
  // Estado de modales
  modals: [],
  modalHistory: [],
  maxModalHistory: 10,
  
  // Estado de notificaciones
  notifications: [],
  maxNotifications: 5,
  notificationTimeout: 5000,
  
  // Estado de layout
  layout: {
    sidebarCollapsed: false,
    sidebarWidth: 250,
    consoleVisible: true,
    consoleHeight: 300,
    panelSizes: {
      editor: 60,
      console: 30,
      sidebar: 10
    },
    isResizing: false,
    currentBreakpoint: 'desktop' // mobile, tablet, desktop
  },
  
  // Estado de tooltips
  tooltip: {
    isVisible: false,
    content: '',
    position: { x: 0, y: 0 },
    anchor: 'top',
    delay: 500
  },
  
  // Estados de loading
  loadingStates: new Map(),
  globalLoading: false,
  
  // Estados de drag & drop
  dragDrop: {
    isDragging: false,
    dragType: null,
    dragData: null,
    dropZones: []
  },
  
  // Estado de teclado y accesibilidad
  accessibility: {
    focusVisible: false,
    highContrast: false,
    reducedMotion: false,
    screenReader: false
  },
  
  // Estado de la barra de herramientas flotante
  floatingToolbar: {
    isVisible: true,
    isCollapsed: false,
    position: { x: 20, y: 20 },
    isDragging: false
  }
});

export const useUIStore = createBaseStore(
  'UIStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    // ==================== GESTIÓN DE MODALES ====================
    
    /**
     * Abrir modal
     */
    openModal: (modalConfig) => {
      const currentState = get();
      const modal = {
        id: modalConfig.id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: modalConfig.type,
        title: modalConfig.title,
        size: modalConfig.size || 'medium',
        props: modalConfig.props || {},
        closeOnBackdrop: modalConfig.closeOnBackdrop !== false,
        closeOnEscape: modalConfig.closeOnEscape !== false,
        showCloseButton: modalConfig.showCloseButton !== false,
        priority: modalConfig.priority || 0,
        openedAt: new Date().toISOString()
      };

      const newModals = [...currentState.modals, modal];
      
      // Ordenar por prioridad
      newModals.sort((a, b) => b.priority - a.priority);

      set({
        modals: newModals,
        lastUpdated: new Date().toISOString()
      });

      return modal.id;
    },

    /**
     * Cerrar modal
     */
    closeModal: (modalId) => {
      const currentState = get();
      
      if (!modalId && currentState.modals.length > 0) {
        // Cerrar el último modal si no se especifica ID
        const closedModal = currentState.modals[currentState.modals.length - 1];
        modalId = closedModal.id;
      }

      const newModals = currentState.modals.filter(modal => modal.id !== modalId);
      const closedModal = currentState.modals.find(modal => modal.id === modalId);
      
      if (closedModal) {
        // Agregar al historial
        const newHistory = [
          ...currentState.modalHistory.slice(-(currentState.maxModalHistory - 1)),
          { ...closedModal, closedAt: new Date().toISOString() }
        ];

        set({
          modals: newModals,
          modalHistory: newHistory,
          lastUpdated: new Date().toISOString()
        });
      }
    },

    /**
     * Cerrar todos los modales
     */
    closeAllModals: () => {
      const currentState = get();
      const closedModals = currentState.modals.map(modal => ({
        ...modal,
        closedAt: new Date().toISOString()
      }));

      const newHistory = [
        ...currentState.modalHistory,
        ...closedModals
      ].slice(-currentState.maxModalHistory);

      set({
        modals: [],
        modalHistory: newHistory,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Verificar si un modal está abierto
     */
    isModalOpen: (modalId) => {
      const { modals } = get();
      return modals.some(modal => modal.id === modalId);
    },

    /**
     * Obtener modal activo (el último en la pila)
     */
    getActiveModal: () => {
      const { modals } = get();
      return modals.length > 0 ? modals[modals.length - 1] : null;
    },

    // ==================== GESTIÓN DE NOTIFICACIONES ====================

    /**
     * Agregar notificación
     */
    addNotification: (notification) => {
      const currentState = get();
      const newNotification = {
        id: notification.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: notification.type || 'info', // info, success, warning, error
        title: notification.title,
        message: notification.message,
        duration: notification.duration || currentState.notificationTimeout,
        persistent: notification.persistent || false,
        actions: notification.actions || [],
        createdAt: new Date().toISOString()
      };

      const newNotifications = [
        newNotification,
        ...currentState.notifications.slice(0, currentState.maxNotifications - 1)
      ];

      set({
        notifications: newNotifications,
        lastUpdated: new Date().toISOString()
      });

      // Auto-remover si no es persistente
      if (!newNotification.persistent && newNotification.duration > 0) {
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, newNotification.duration);
      }

      return newNotification.id;
    },

    /**
     * Remover notificación
     */
    removeNotification: (notificationId) => {
      const currentState = get();
      const newNotifications = currentState.notifications.filter(
        notification => notification.id !== notificationId
      );

      set({
        notifications: newNotifications,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Limpiar todas las notificaciones
     */
    clearNotifications: () => {
      set({
        notifications: [],
        lastUpdated: new Date().toISOString()
      });
    },

    // ==================== GESTIÓN DE LAYOUT ====================

    /**
     * Alternar sidebar
     */
    toggleSidebar: () => {
      const currentLayout = get().layout;
      set({
        layout: {
          ...currentLayout,
          sidebarCollapsed: !currentLayout.sidebarCollapsed
        },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Alternar consola
     */
    toggleConsole: () => {
      const currentLayout = get().layout;
      set({
        layout: {
          ...currentLayout,
          consoleVisible: !currentLayout.consoleVisible
        },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Actualizar tamaño de panel
     */
    updatePanelSize: (panel, size) => {
      const currentLayout = get().layout;
      set({
        layout: {
          ...currentLayout,
          panelSizes: {
            ...currentLayout.panelSizes,
            [panel]: size
          }
        },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Iniciar redimensionamiento
     */
    startResize: () => {
      const currentLayout = get().layout;
      set({
        layout: {
          ...currentLayout,
          isResizing: true
        }
      });
    },

    /**
     * Finalizar redimensionamiento
     */
    endResize: () => {
      const currentLayout = get().layout;
      set({
        layout: {
          ...currentLayout,
          isResizing: false
        },
        lastUpdated: new Date().toISOString()
      });
    },

    // ==================== GESTIÓN DE TOOLTIPS ====================

    /**
     * Mostrar tooltip
     */
    showTooltip: (content, position, options = {}) => {
      const currentTooltip = get().tooltip;
      set({
        tooltip: {
          ...currentTooltip,
          isVisible: true,
          content,
          position,
          anchor: options.anchor || 'top',
          delay: options.delay || currentTooltip.delay
        }
      });
    },

    /**
     * Ocultar tooltip
     */
    hideTooltip: () => {
      const currentTooltip = get().tooltip;
      set({
        tooltip: {
          ...currentTooltip,
          isVisible: false
        }
      });
    },

    // ==================== GESTIÓN DE LOADING STATES ====================

    /**
     * Establecer estado de loading
     */
    setLoading: (key, isLoading) => {
      const currentLoadingStates = get().loadingStates;
      const newLoadingStates = new Map(currentLoadingStates);
      
      if (isLoading) {
        newLoadingStates.set(key, true);
      } else {
        newLoadingStates.delete(key);
      }

      set({
        loadingStates: newLoadingStates,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Verificar si algo está cargando
     */
    isLoading: (key) => {
      const { loadingStates } = get();
      return key ? loadingStates.has(key) : loadingStates.size > 0;
    },

    /**
     * Establecer loading global
     */
    setGlobalLoading: (isLoading) => {
      set({
        globalLoading: isLoading,
        lastUpdated: new Date().toISOString()
      });
    },

    // ==================== GESTIÓN DE DRAG & DROP ====================

    /**
     * Iniciar drag
     */
    startDrag: (dragType, dragData) => {
      set({
        dragDrop: {
          ...get().dragDrop,
          isDragging: true,
          dragType,
          dragData
        }
      });
    },

    /**
     * Finalizar drag
     */
    endDrag: () => {
      set({
        dragDrop: {
          ...get().dragDrop,
          isDragging: false,
          dragType: null,
          dragData: null
        }
      });
    },

    /**
     * Registrar zona de drop
     */
    registerDropZone: (zoneId, config) => {
      const currentDragDrop = get().dragDrop;
      const newDropZones = currentDragDrop.dropZones.filter(zone => zone.id !== zoneId);
      newDropZones.push({ id: zoneId, ...config });

      set({
        dragDrop: {
          ...currentDragDrop,
          dropZones: newDropZones
        }
      });
    },

    // ==================== GESTIÓN DE ACCESIBILIDAD ====================

    /**
     * Actualizar configuración de accesibilidad
     */
    updateAccessibility: (updates) => {
      const currentAccessibility = get().accessibility;
      set({
        accessibility: {
          ...currentAccessibility,
          ...updates
        },
        lastUpdated: new Date().toISOString()
      });
    },

    // ==================== GESTIÓN DE TOOLBAR FLOTANTE ====================

    /**
     * Alternar toolbar flotante
     */
    toggleFloatingToolbar: () => {
      const currentToolbar = get().floatingToolbar;
      set({
        floatingToolbar: {
          ...currentToolbar,
          isVisible: !currentToolbar.isVisible
        },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Colapsar/expandir toolbar
     */
    toggleToolbarCollapse: () => {
      const currentToolbar = get().floatingToolbar;
      set({
        floatingToolbar: {
          ...currentToolbar,
          isCollapsed: !currentToolbar.isCollapsed
        },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Actualizar posición del toolbar
     */
    updateToolbarPosition: (position) => {
      const currentToolbar = get().floatingToolbar;
      set({
        floatingToolbar: {
          ...currentToolbar,
          position
        },
        lastUpdated: new Date().toISOString()
      });
    },

    // ==================== UTILIDADES ====================

    /**
     * Resetear estado de UI
     */
    resetUI: () => {
      set({
        ...initialState,
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Obtener estado completo de UI
     */
    getUIState: () => {
      const state = get();
      return {
        modals: state.modals,
        notifications: state.notifications,
        layout: state.layout,
        loadingStates: Array.from(state.loadingStates.entries()),
        accessibility: state.accessibility
      };
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-ui-store',
    devtools: true,
    // Solo persistir configuración estable, no estado temporal
    partialize: (state) => ({
      layout: state.layout,
      accessibility: state.accessibility,
      floatingToolbar: {
        isVisible: state.floatingToolbar.isVisible,
        isCollapsed: state.floatingToolbar.isCollapsed,
        position: state.floatingToolbar.position
      },
      notificationTimeout: state.notificationTimeout,
      maxNotifications: state.maxNotifications
    })
  }
);