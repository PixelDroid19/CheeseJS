import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../../src/stores/app-store.js';

// Mock de dependencias
vi.mock('../../src/services/app-service.js', () => ({
  appService: {
    isInitialized: false,
    initialize: vi.fn().mockResolvedValue(true),
    getAppConfig: vi.fn().mockReturnValue({
      layout: { type: 'horizontal', showSidebar: true },
      editor: { fontSize: 14, theme: 'light' },
      terminal: { fontSize: 12, showPrompt: true },
      theme: { current: 'light', followSystem: false },
      console: { maxLines: 1000, enableColors: true },
      performance: { enableMetrics: true, sampleRate: 0.1 }
    }),
    updateAppConfig: vi.fn(),
    getInitializationSteps: vi.fn().mockReturnValue([
      { id: 'config', name: 'Configuración', completed: false },
      { id: 'theme', name: 'Tema', completed: false },
      { id: 'editor', name: 'Editor', completed: false }
    ]),
    completeInitializationStep: vi.fn()
  }
}));

describe('AppStore', () => {
  beforeEach(() => {
    // Limpiar el store antes de cada test
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
    vi.clearAllMocks();
  });

  describe('Estado inicial', () => {
    it('debería tener el estado inicial correcto', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.config).toBeDefined();
      expect(result.current.initializationSteps).toEqual([]);
      expect(result.current.stats.startTime).toBeNull();
    });

    it('debería tener la configuración inicial por defecto', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.config.layout.type).toBe('horizontal');
      expect(result.current.config.editor.fontSize).toBe(14);
      expect(result.current.config.theme.current).toBe('light');
      expect(result.current.config.performance.enableMetrics).toBe(true);
    });
  });

  describe('Inicialización', () => {
    it('debería inicializar la aplicación correctamente', async () => {
      const { result } = renderHook(() => useAppStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.stats.startTime).toBeDefined();
    });

    it('debería manejar errores durante la inicialización', async () => {
      // Mock error en el servicio
      const mockError = new Error('Error de inicialización');
      vi.mocked(require('../../src/services/app-service.js').appService.initialize)
        .mockRejectedValueOnce(mockError);
      
      const { result } = renderHook(() => useAppStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe(mockError.message);
      expect(result.current.isLoading).toBe(false);
    });

    it('debería cargar los pasos de inicialización', async () => {
      const { result } = renderHook(() => useAppStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.initializationSteps).toHaveLength(3);
      expect(result.current.initializationSteps[0]).toEqual({
        id: 'config',
        name: 'Configuración',
        completed: false
      });
    });
  });

  describe('Gestión de configuración', () => {
    it('debería actualizar la configuración', async () => {
      const { result } = renderHook(() => useAppStore());
      
      const newConfig = {
        layout: { type: 'vertical', showSidebar: false },
        editor: { fontSize: 16 }
      };
      
      await act(async () => {
        await result.current.updateConfig(newConfig);
      });
      
      expect(result.current.config.layout.type).toBe('vertical');
      expect(result.current.config.layout.showSidebar).toBe(false);
      expect(result.current.config.editor.fontSize).toBe(16);
    });

    it('debería obtener configuración específica', () => {
      const { result } = renderHook(() => useAppStore());
      
      const layoutConfig = result.current.getConfig('layout');
      expect(layoutConfig).toEqual(result.current.config.layout);
      
      const invalidConfig = result.current.getConfig('invalid');
      expect(invalidConfig).toBeNull();
    });

    it('debería resetear la configuración', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.resetConfig();
      });
      
      // Debería volver a la configuración inicial
      expect(result.current.config.layout.type).toBe('horizontal');
      expect(result.current.config.editor.fontSize).toBe(14);
    });
  });

  describe('Pasos de inicialización', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useAppStore());
      await act(async () => {
        await result.current.initialize();
      });
    });

    it('debería completar un paso de inicialización', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.completeInitializationStep('config');
      });
      
      const configStep = result.current.initializationSteps.find(step => step.id === 'config');
      expect(configStep.completed).toBe(true);
    });

    it('debería obtener el progreso de inicialización', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.completeInitializationStep('config');
        result.current.completeInitializationStep('theme');
      });
      
      const progress = result.current.getInitializationProgress();
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBeCloseTo(66.67, 2);
    });

    it('debería verificar si la inicialización está completa', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isInitializationComplete()).toBe(false);
      
      act(() => {
        result.current.completeInitializationStep('config');
        result.current.completeInitializationStep('theme');
        result.current.completeInitializationStep('editor');
      });
      
      expect(result.current.isInitializationComplete()).toBe(true);
    });
  });

  describe('Estadísticas', () => {
    it('debería actualizar estadísticas de rendimiento', () => {
      const { result } = renderHook(() => useAppStore());
      
      const metrics = {
        memoryUsage: 50,
        loadTime: 1000,
        errors: 0
      };
      
      act(() => {
        result.current.updatePerformanceStats(metrics);
      });
      
      expect(result.current.stats.performance).toEqual(metrics);
    });

    it('debería obtener estadísticas completas', async () => {
      const { result } = renderHook(() => useAppStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      const stats = result.current.getAppStats();
      
      expect(stats).toHaveProperty('isInitialized');
      expect(stats).toHaveProperty('initializationTime');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('initializationSteps');
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('Utilidades', () => {
    it('debería verificar si la app está lista', async () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isReady()).toBe(false);
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.isReady()).toBe(true);
    });

    it('debería resetear el store correctamente', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.updateConfig({ layout: { type: 'vertical' } });
        result.current.reset();
      });
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.config.layout.type).toBe('horizontal');
      expect(result.current.initializationSteps).toEqual([]);
    });

    it('debería exportar configuración', () => {
      const { result } = renderHook(() => useAppStore());
      
      const exported = result.current.exportConfig();
      
      expect(exported).toHaveProperty('config');
      expect(exported).toHaveProperty('timestamp');
      expect(exported).toHaveProperty('version');
      expect(exported.config).toEqual(result.current.config);
    });

    it('debería importar configuración', () => {
      const { result } = renderHook(() => useAppStore());
      
      const configToImport = {
        config: {
          layout: { type: 'vertical', showSidebar: false },
          editor: { fontSize: 18 }
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      act(() => {
        result.current.importConfig(configToImport);
      });
      
      expect(result.current.config.layout.type).toBe('vertical');
      expect(result.current.config.editor.fontSize).toBe(18);
    });
  });

  describe('Manejo de errores', () => {
    it('debería manejar errores al actualizar configuración', async () => {
      // Mock error en el servicio
      vi.mocked(require('../../src/services/app-service.js').appService.updateAppConfig)
        .mockRejectedValueOnce(new Error('Error de configuración'));
      
      const { result } = renderHook(() => useAppStore());
      
      await act(async () => {
        await result.current.updateConfig({ invalid: 'config' });
      });
      
      expect(result.current.error).toBe('Error de configuración');
    });

    it('debería limpiar errores', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Persistencia', () => {
    it('debería llamar a localStorage para persistir estado', async () => {
      const { result } = renderHook(() => useAppStore());
      
      await act(async () => {
        await result.current.updateConfig({
          layout: { type: 'vertical' }
        });
      });
      
      // Verificar que se llama a localStorage (mockeado en setup.js)
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });
});