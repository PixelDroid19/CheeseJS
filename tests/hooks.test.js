/**
 * Tests para Hooks Personalizados
 * Valida la funcionalidad de los hooks reutilizables
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useI18n } from '../src/hooks/use-i18n.js';
import { useTheme } from '../src/hooks/use-theme.js';
import { useExecution } from '../src/hooks/use-execution.js';
import { useEventManager } from '../src/hooks/use-event-manager.js';

// Mock de servicios
vi.mock('../src/services/i18n-service.js', () => ({
  i18nService: {
    isInitialized: false, // Propiedad, no método
    initialize: vi.fn().mockResolvedValue(undefined),
    getCurrentLanguage: vi.fn().mockReturnValue('es'),
    getAvailableLanguages: vi.fn().mockReturnValue([
      { code: 'es', name: 'Español' },
      { code: 'en', name: 'English' }
    ]),
    t: vi.fn((key) => key),
    setLanguage: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../src/services/theme-service.js', () => ({
  themeService: {
    isInitialized: false, // Propiedad, no método
    initialize: vi.fn().mockResolvedValue(undefined),
    getCurrentTheme: vi.fn().mockReturnValue('light'),
    getAvailableThemes: vi.fn().mockReturnValue([
      { name: 'light', displayName: 'Claro' },
      { name: 'dark', displayName: 'Oscuro' }
    ]),
    getCurrentThemeColors: vi.fn().mockReturnValue({}),
    setTheme: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../src/utils/event-bus.js', () => ({
  eventBus: {
    subscribe: vi.fn().mockReturnValue(() => {}),
    emit: vi.fn()
  }
}));

vi.mock('../src/utils/event-manager.js', () => ({
  eventManager: {
    subscribeComponent: vi.fn().mockReturnValue(() => {}),
    subscribeToGroup: vi.fn().mockReturnValue(() => {}),
    emit: vi.fn(),
    emitAsync: vi.fn().mockResolvedValue(true)
  }
}));

describe('Hooks Personalizados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useI18n', () => {
    it('debería inicializar correctamente', async () => {
      const { result } = renderHook(() => useI18n());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentLanguage).toBe('es');
      expect(result.current.availableLanguages).toEqual([]);

      // Simular inicialización completada
      await act(async () => {
        // El hook debería llamar a initialize internamente
      });
    });

    it('debería cambiar idioma correctamente', async () => {
      const { result } = renderHook(() => useI18n());

      await act(async () => {
        await result.current.changeLanguage('en');
      });

      const { i18nService } = await import('../src/services/i18n-service.js');
      expect(i18nService.setLanguage).toHaveBeenCalledWith('en');
    });

    it('debería obtener información del idioma', () => {
      const { result } = renderHook(() => useI18n());

      // Simular idiomas disponibles
      act(() => {
        result.current.availableLanguages = [
          { code: 'es', name: 'Español' },
          { code: 'en', name: 'English' }
        ];
      });

      const languageInfo = result.current.getLanguageInfo('es');
      expect(languageInfo).toEqual({ code: 'es', name: 'Español' });
    });

    it('debería manejar errores en cambio de idioma', async () => {
      const { i18nService } = await import('../src/services/i18n-service.js');
      i18nService.setLanguage.mockRejectedValueOnce(new Error('Change failed'));
      
      const originalSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useI18n());

      await act(async () => {
        await result.current.changeLanguage('invalid');
      });

      expect(originalSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error cambiando idioma'),
        expect.any(Error)
      );
      
      originalSpy.mockRestore();
    });
  });

  describe('useTheme', () => {
    it('debería inicializar correctamente', async () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentTheme).toBe('light');
      expect(result.current.availableThemes).toEqual([]);
    });

    it('debería cambiar tema correctamente', async () => {
      const { result } = renderHook(() => useTheme());

      await act(async () => {
        await result.current.setTheme('dark');
      });

      const { themeService } = await import('../src/services/theme-service.js');
      expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    });

    it('debería alternar tema correctamente', async () => {
      const { result } = renderHook(() => useTheme());

      // Simular tema actual
      act(() => {
        result.current.currentTheme = 'light';
      });

      await act(async () => {
        await result.current.toggleTheme();
      });

      const { themeService } = await import('../src/services/theme-service.js');
      expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    });

    it('debería verificar si es tema oscuro', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.currentTheme = 'dark';
      });

      expect(result.current.isDarkTheme()).toBe(true);

      act(() => {
        result.current.currentTheme = 'light';
      });

      expect(result.current.isDarkTheme()).toBe(false);
    });

    it('debería obtener información del tema', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.availableThemes = [
          { name: 'light', displayName: 'Claro' },
          { name: 'dark', displayName: 'Oscuro' }
        ];
      });

      const themeInfo = result.current.getThemeInfo('dark');
      expect(themeInfo).toEqual({ name: 'dark', displayName: 'Oscuro' });
    });
  });

  describe('useExecution', () => {
    it('debería inicializar con estado correcto', () => {
      const { result } = renderHook(() => useExecution());

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.executionResult).toBe(null);
      expect(result.current.executionOutput).toEqual([]);
      expect(result.current.executionError).toBe(null);
      expect(result.current.canExecute).toBe(true);
      expect(result.current.canStop).toBe(false);
    });

    it('debería ejecutar código', () => {
      const { result } = renderHook(() => useExecution());

      act(() => {
        result.current.executeCode('console.log("test")');
      });

      const { eventBus } = require('../src/utils/event-bus.js');
      expect(eventBus.emit).toHaveBeenCalledWith('code:execute', {
        code: 'console.log("test")'
      });
    });

    it('debería detener ejecución', () => {
      const { result } = renderHook(() => useExecution());

      // Simular ejecución en progreso
      act(() => {
        result.current.isExecuting = true;
      });

      act(() => {
        result.current.stopExecution();
      });

      const { eventBus } = require('../src/utils/event-bus.js');
      expect(eventBus.emit).toHaveBeenCalledWith('code:stop');
    });

    it('debería limpiar output', () => {
      const { result } = renderHook(() => useExecution());

      // Simular output
      act(() => {
        result.current.executionOutput = [
          { type: 'stdout', data: 'test', timestamp: Date.now() }
        ];
        result.current.executionError = 'Some error';
      });

      act(() => {
        result.current.clearOutput();
      });

      expect(result.current.executionOutput).toEqual([]);
      expect(result.current.executionError).toBe(null);
    });

    it('debería filtrar output por tipo', () => {
      const { result } = renderHook(() => useExecution());

      act(() => {
        result.current.executionOutput = [
          { type: 'stdout', data: 'normal output', timestamp: Date.now() },
          { type: 'stderr', data: 'error output', timestamp: Date.now() },
          { type: 'stdout', data: 'more output', timestamp: Date.now() }
        ];
      });

      const stdOutput = result.current.getStdOutput();
      const errorOutput = result.current.getErrorOutput();

      expect(stdOutput).toHaveLength(2);
      expect(errorOutput).toHaveLength(1);
      expect(stdOutput[0].data).toBe('normal output');
      expect(errorOutput[0].data).toBe('error output');
    });

    it('debería detectar errores correctamente', () => {
      const { result } = renderHook(() => useExecution());

      // Sin errores
      expect(result.current.hasErrors()).toBe(false);

      // Con error de ejecución
      act(() => {
        result.current.executionError = 'Runtime error';
      });

      expect(result.current.hasErrors()).toBe(true);

      // Limpiar error y agregar stderr
      act(() => {
        result.current.executionError = null;
        result.current.executionOutput = [
          { type: 'stderr', data: 'error message', timestamp: Date.now() }
        ];
      });

      expect(result.current.hasErrors()).toBe(true);
    });

    it('debería generar estadísticas de ejecución', () => {
      const { result } = renderHook(() => useExecution());

      act(() => {
        result.current.isExecuting = false;
        result.current.executionResult = {
          exitCode: 0,
          executionTime: 150
        };
        result.current.executionOutput = [
          { type: 'stdout', data: 'output1', timestamp: Date.now() },
          { type: 'stderr', data: 'error1', timestamp: Date.now() }
        ];
      });

      const stats = result.current.getExecutionStats();

      expect(stats).toMatchObject({
        isExecuting: false,
        hasResult: true,
        hasOutput: true,
        hasErrors: true,
        outputLines: 2,
        stdoutLines: 1,
        stderrLines: 1,
        executionTime: 150,
        exitCode: 0
      });
    });
  });

  describe('useEventManager', () => {
    it('debería suscribirse a eventos correctamente', () => {
      const eventConfigs = [
        {
          event: 'test:event',
          handler: vi.fn()
        }
      ];

      renderHook(() => useEventManager('test-component', eventConfigs));

      const { eventManager } = require('../src/utils/event-manager.js');
      expect(eventManager.subscribeComponent).toHaveBeenCalledWith(
        'test-component',
        eventConfigs
      );
    });

    it('debería emitir eventos', () => {
      const { result } = renderHook(() => useEventManager('test-component', []));

      act(() => {
        result.current.emit('test:event', { data: 'test' });
      });

      const { eventManager } = require('../src/utils/event-manager.js');
      expect(eventManager.emit).toHaveBeenCalledWith('test:event', { data: 'test' });
    });

    it('debería emitir eventos asíncronos', async () => {
      const { result } = renderHook(() => useEventManager('test-component', []));

      await act(async () => {
        await result.current.emitAsync('test:async-event', { data: 'async' });
      });

      const { eventManager } = require('../src/utils/event-manager.js');
      expect(eventManager.emitAsync).toHaveBeenCalledWith('test:async-event', { data: 'async' });
    });
  });
});