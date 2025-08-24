import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../../src/stores/ui-store.js';

describe('UIStore', () => {
  beforeEach(() => {
    // Limpiar el store antes de cada test
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.resetUI();
    });
    vi.clearAllMocks();
  });

  describe('Estado inicial', () => {
    it('debería tener el estado inicial correcto', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.modals).toEqual([]);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.layout.sidebarCollapsed).toBe(false);
      expect(result.current.layout.consoleVisible).toBe(true);
      expect(result.current.globalLoading).toBe(false);
      expect(result.current.loadingStates).toBeInstanceOf(Map);
    });
  });

  describe('Gestión de modales', () => {
    it('debería abrir modal correctamente', () => {
      const { result } = renderHook(() => useUIStore());
      
      let modalId;
      act(() => {
        modalId = result.current.openModal({
          type: 'settings',
          title: 'Configuración',
          size: 'large'
        });
      });
      
      expect(modalId).toBeDefined();
      expect(result.current.modals).toHaveLength(1);
      expect(result.current.modals[0]).toMatchObject({
        id: modalId,
        type: 'settings',
        title: 'Configuración',
        size: 'large'
      });
    });

    it('debería cerrar modal por ID', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Abrir modal
      let modalId;
      act(() => {
        modalId = result.current.openModal({
          type: 'settings',
          title: 'Configuración'
        });
      });
      
      expect(result.current.modals).toHaveLength(1);
      
      // Cerrar modal
      act(() => {
        result.current.closeModal(modalId);
      });
      
      expect(result.current.modals).toHaveLength(0);
      expect(result.current.modalHistory).toHaveLength(1);
    });

    it('debería cerrar el último modal si no se proporciona ID', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Abrir múltiples modales
      act(() => {
        result.current.openModal({ type: 'modal1', title: 'Modal 1' });
        result.current.openModal({ type: 'modal2', title: 'Modal 2' });
      });
      
      expect(result.current.modals).toHaveLength(2);
      
      // Cerrar sin ID (debería cerrar el último)
      act(() => {
        result.current.closeModal();
      });
      
      expect(result.current.modals).toHaveLength(1);
      expect(result.current.modals[0].type).toBe('modal1');
    });

    it('debería cerrar todos los modales', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Abrir múltiples modales
      act(() => {
        result.current.openModal({ type: 'modal1', title: 'Modal 1' });
        result.current.openModal({ type: 'modal2', title: 'Modal 2' });
        result.current.openModal({ type: 'modal3', title: 'Modal 3' });
      });
      
      expect(result.current.modals).toHaveLength(3);
      
      // Cerrar todos
      act(() => {
        result.current.closeAllModals();
      });
      
      expect(result.current.modals).toHaveLength(0);
      expect(result.current.modalHistory).toHaveLength(3);
    });

    it('debería verificar si un modal está abierto', () => {
      const { result } = renderHook(() => useUIStore());
      
      let modalId;
      act(() => {
        modalId = result.current.openModal({
          id: 'test-modal',
          type: 'test',
          title: 'Test'
        });
      });
      
      expect(result.current.isModalOpen('test-modal')).toBe(true);
      expect(result.current.isModalOpen('non-existent')).toBe(false);
    });

    it('debería obtener modal activo', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.getActiveModal()).toBeNull();
      
      act(() => {
        result.current.openModal({ type: 'modal1', title: 'Modal 1' });
        result.current.openModal({ type: 'modal2', title: 'Modal 2' });
      });
      
      const activeModal = result.current.getActiveModal();
      expect(activeModal.type).toBe('modal2'); // el último abierto
    });

    it('debería ordenar modales por prioridad', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal({ type: 'modal1', title: 'Modal 1', priority: 1 });
        result.current.openModal({ type: 'modal2', title: 'Modal 2', priority: 3 });
        result.current.openModal({ type: 'modal3', title: 'Modal 3', priority: 2 });
      });
      
      expect(result.current.modals[0].priority).toBe(3); // mayor prioridad primero
      expect(result.current.modals[1].priority).toBe(2);
      expect(result.current.modals[2].priority).toBe(1);
    });
  });

  describe('Gestión de notificaciones', () => {
    it('debería agregar notificación', () => {
      const { result } = renderHook(() => useUIStore());
      
      let notificationId;
      act(() => {
        notificationId = result.current.addNotification({
          type: 'success',
          title: 'Éxito',
          message: 'Operación completada'
        });
      });
      
      expect(notificationId).toBeDefined();
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        id: notificationId,
        type: 'success',
        title: 'Éxito',
        message: 'Operación completada'
      });
    });

    it('debería remover notificación', () => {
      const { result } = renderHook(() => useUIStore());
      
      let notificationId;
      act(() => {
        notificationId = result.current.addNotification({
          type: 'info',
          message: 'Test notification'
        });
      });
      
      expect(result.current.notifications).toHaveLength(1);
      
      act(() => {
        result.current.removeNotification(notificationId);
      });
      
      expect(result.current.notifications).toHaveLength(0);
    });

    it('debería limpiar todas las notificaciones', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Agregar múltiples notificaciones
      act(() => {
        result.current.addNotification({ type: 'info', message: 'Notification 1' });
        result.current.addNotification({ type: 'warning', message: 'Notification 2' });
        result.current.addNotification({ type: 'error', message: 'Notification 3' });
      });
      
      expect(result.current.notifications).toHaveLength(3);
      
      act(() => {
        result.current.clearNotifications();
      });
      
      expect(result.current.notifications).toHaveLength(0);
    });

    it('debería auto-remover notificaciones no persistentes', () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addNotification({
          type: 'info',
          message: 'Auto-remove test',
          duration: 1000,
          persistent: false
        });
      });
      
      expect(result.current.notifications).toHaveLength(1);
      
      // Avanzar tiempo
      act(() => {
        vi.advanceTimersByTime(1001);
      });
      
      expect(result.current.notifications).toHaveLength(0);
      
      vi.useRealTimers();
    });

    it('debería respetar límite máximo de notificaciones', () => {
      const { result } = renderHook(() => useUIStore());
      
      const maxNotifications = result.current.maxNotifications;
      
      // Agregar más notificaciones que el límite
      act(() => {
        for (let i = 0; i < maxNotifications + 2; i++) {
          result.current.addNotification({
            type: 'info',
            message: `Notification ${i}`
          });
        }
      });
      
      expect(result.current.notifications).toHaveLength(maxNotifications);
    });
  });

  describe('Gestión de layout', () => {
    it('debería alternar sidebar', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.layout.sidebarCollapsed).toBe(false);
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.layout.sidebarCollapsed).toBe(true);
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.layout.sidebarCollapsed).toBe(false);
    });

    it('debería alternar consola', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.layout.consoleVisible).toBe(true);
      
      act(() => {
        result.current.toggleConsole();
      });
      
      expect(result.current.layout.consoleVisible).toBe(false);
    });

    it('debería actualizar tamaño de panel', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.updatePanelSize('editor', 70);
      });
      
      expect(result.current.layout.panelSizes.editor).toBe(70);
    });

    it('debería manejar estado de redimensionamiento', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.layout.isResizing).toBe(false);
      
      act(() => {
        result.current.startResize();
      });
      
      expect(result.current.layout.isResizing).toBe(true);
      
      act(() => {
        result.current.endResize();
      });
      
      expect(result.current.layout.isResizing).toBe(false);
    });
  });

  describe('Gestión de tooltips', () => {
    it('debería mostrar tooltip', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.showTooltip('Test tooltip', { x: 100, y: 200 }, { anchor: 'bottom' });
      });
      
      expect(result.current.tooltip.isVisible).toBe(true);
      expect(result.current.tooltip.content).toBe('Test tooltip');
      expect(result.current.tooltip.position).toEqual({ x: 100, y: 200 });
      expect(result.current.tooltip.anchor).toBe('bottom');
    });

    it('debería ocultar tooltip', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Mostrar tooltip primero
      act(() => {
        result.current.showTooltip('Test tooltip', { x: 100, y: 200 });
      });
      
      expect(result.current.tooltip.isVisible).toBe(true);
      
      // Ocultar tooltip
      act(() => {
        result.current.hideTooltip();
      });
      
      expect(result.current.tooltip.isVisible).toBe(false);
    });
  });

  describe('Gestión de loading states', () => {
    it('debería establecer estado de loading', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setLoading('api-call', true);
      });
      
      expect(result.current.loadingStates.has('api-call')).toBe(true);
      expect(result.current.isLoading('api-call')).toBe(true);
      expect(result.current.isLoading()).toBe(true); // any loading
    });

    it('debería limpiar estado de loading', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Establecer loading
      act(() => {
        result.current.setLoading('api-call', true);
      });
      
      expect(result.current.isLoading('api-call')).toBe(true);
      
      // Limpiar loading
      act(() => {
        result.current.setLoading('api-call', false);
      });
      
      expect(result.current.isLoading('api-call')).toBe(false);
      expect(result.current.loadingStates.has('api-call')).toBe(false);
    });

    it('debería manejar loading global', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.globalLoading).toBe(false);
      
      act(() => {
        result.current.setGlobalLoading(true);
      });
      
      expect(result.current.globalLoading).toBe(true);
      
      act(() => {
        result.current.setGlobalLoading(false);
      });
      
      expect(result.current.globalLoading).toBe(false);
    });
  });

  describe('Gestión de drag & drop', () => {
    it('debería iniciar drag', () => {
      const { result } = renderHook(() => useUIStore());
      
      const dragData = { type: 'file', id: 'test-file' };
      
      act(() => {
        result.current.startDrag('file', dragData);
      });
      
      expect(result.current.dragDrop.isDragging).toBe(true);
      expect(result.current.dragDrop.dragType).toBe('file');
      expect(result.current.dragDrop.dragData).toEqual(dragData);
    });

    it('debería finalizar drag', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Iniciar drag primero
      act(() => {
        result.current.startDrag('file', { id: 'test' });
      });
      
      expect(result.current.dragDrop.isDragging).toBe(true);
      
      // Finalizar drag
      act(() => {
        result.current.endDrag();
      });
      
      expect(result.current.dragDrop.isDragging).toBe(false);
      expect(result.current.dragDrop.dragType).toBeNull();
      expect(result.current.dragDrop.dragData).toBeNull();
    });

    it('debería registrar zona de drop', () => {
      const { result } = renderHook(() => useUIStore());
      
      const dropZoneConfig = {
        acceptedTypes: ['file', 'folder'],
        onDrop: vi.fn()
      };
      
      act(() => {
        result.current.registerDropZone('main-area', dropZoneConfig);
      });
      
      const dropZone = result.current.dragDrop.dropZones.find(zone => zone.id === 'main-area');
      expect(dropZone).toBeDefined();
      expect(dropZone.acceptedTypes).toEqual(['file', 'folder']);
    });
  });

  describe('Gestión de accesibilidad', () => {
    it('debería actualizar configuración de accesibilidad', () => {
      const { result } = renderHook(() => useUIStore());
      
      const updates = {
        highContrast: true,
        reducedMotion: true,
        screenReader: true
      };
      
      act(() => {
        result.current.updateAccessibility(updates);
      });
      
      expect(result.current.accessibility.highContrast).toBe(true);
      expect(result.current.accessibility.reducedMotion).toBe(true);
      expect(result.current.accessibility.screenReader).toBe(true);
      expect(result.current.accessibility.focusVisible).toBe(false); // mantiene valor anterior
    });
  });

  describe('Toolbar flotante', () => {
    it('debería alternar visibilidad', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.floatingToolbar.isVisible).toBe(true);
      
      act(() => {
        result.current.toggleFloatingToolbar();
      });
      
      expect(result.current.floatingToolbar.isVisible).toBe(false);
    });

    it('debería alternar colapso', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.floatingToolbar.isCollapsed).toBe(false);
      
      act(() => {
        result.current.toggleToolbarCollapse();
      });
      
      expect(result.current.floatingToolbar.isCollapsed).toBe(true);
    });

    it('debería actualizar posición', () => {
      const { result } = renderHook(() => useUIStore());
      
      const newPosition = { x: 150, y: 250 };
      
      act(() => {
        result.current.updateToolbarPosition(newPosition);
      });
      
      expect(result.current.floatingToolbar.position).toEqual(newPosition);
    });
  });

  describe('Utilidades', () => {
    it('debería obtener estado completo de UI', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Agregar algunos elementos
      act(() => {
        result.current.openModal({ type: 'test', title: 'Test' });
        result.current.addNotification({ type: 'info', message: 'Test' });
        result.current.setLoading('test', true);
      });
      
      const uiState = result.current.getUIState();
      
      expect(uiState).toHaveProperty('modals');
      expect(uiState).toHaveProperty('notifications');
      expect(uiState).toHaveProperty('layout');
      expect(uiState).toHaveProperty('loadingStates');
      expect(uiState).toHaveProperty('accessibility');
      
      expect(uiState.modals).toHaveLength(1);
      expect(uiState.notifications).toHaveLength(1);
      expect(uiState.loadingStates).toEqual([['test', true]]);
    });

    it('debería resetear estado de UI', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Hacer cambios
      act(() => {
        result.current.openModal({ type: 'test', title: 'Test' });
        result.current.addNotification({ type: 'info', message: 'Test' });
        result.current.setLoading('test', true);
        result.current.toggleSidebar();
        result.current.setGlobalLoading(true);
      });
      
      // Verificar que hay cambios
      expect(result.current.modals).toHaveLength(1);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.isLoading()).toBe(true);
      expect(result.current.layout.sidebarCollapsed).toBe(true);
      expect(result.current.globalLoading).toBe(true);
      
      // Resetear
      act(() => {
        result.current.resetUI();
      });
      
      // Verificar reset
      expect(result.current.modals).toHaveLength(0);
      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.isLoading()).toBe(false);
      expect(result.current.layout.sidebarCollapsed).toBe(false);
      expect(result.current.globalLoading).toBe(false);
    });
  });
});