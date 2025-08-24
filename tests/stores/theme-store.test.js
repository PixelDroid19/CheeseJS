import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeStore } from '../../src/stores/theme-store.js';

// Mock de dependencias
vi.mock('../../src/services/theme-service.js', () => ({
  themeService: {
    isInitialized: false,
    initialize: vi.fn().mockResolvedValue(true),
    getCurrentTheme: vi.fn().mockReturnValue('light'),
    getAvailableThemes: vi.fn().mockReturnValue(['light', 'dark']),
    getCurrentThemeVariables: vi.fn().mockReturnValue({
      '--primary-color': '#007acc',
      '--background-color': '#ffffff',
      '--text-color': '#000000'
    }),
    setTheme: vi.fn().mockResolvedValue(true),
    createCustomTheme: vi.fn().mockReturnValue('custom-theme-id'),
    deleteCustomTheme: vi.fn().mockReturnValue(true)
  }
}));

describe('ThemeStore', () => {
  beforeEach(() => {
    // Limpiar el store antes de cada test
    const { result } = renderHook(() => useThemeStore());
    act(() => {
      result.current.reset();
    });
    vi.clearAllMocks();
  });

  describe('Estado inicial', () => {
    it('debería tener el estado inicial correcto', () => {
      const { result } = renderHook(() => useThemeStore());
      
      expect(result.current.currentTheme).toBe('light');
      expect(result.current.previousTheme).toBeNull();
      expect(result.current.availableThemes).toBeInstanceOf(Map);
      expect(result.current.customThemes).toBeInstanceOf(Map);
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.followSystemTheme).toBe(false);
    });

    it('debería tener temas disponibles por defecto', () => {
      const { result } = renderHook(() => useThemeStore());
      
      expect(result.current.availableThemes.has('light')).toBe(true);
      expect(result.current.availableThemes.has('dark')).toBe(true);
      expect(result.current.availableThemes.get('light')).toEqual({
        name: 'Light',
        type: 'built-in'
      });
    });
  });

  describe('Inicialización', () => {
    it('debería inicializar correctamente', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentTheme).toBe('light');
      expect(result.current.themeVariables).toBeDefined();
    });

    it('debería manejar errores durante la inicialización', async () => {
      // Mock error en el servicio
      vi.mocked(require('../../src/services/theme-service.js').themeService.initialize)
        .mockRejectedValueOnce(new Error('Error de inicialización'));
      
      const { result } = renderHook(() => useThemeStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.error).toBe('Error de inicialización');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Cambio de tema', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useThemeStore());
      await act(async () => {
        await result.current.initialize();
      });
    });

    it('debería cambiar tema correctamente', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      await act(async () => {
        await result.current.setTheme('dark');
      });
      
      expect(result.current.currentTheme).toBe('dark');
      expect(result.current.previousTheme).toBe('light');
      expect(result.current.isTransitioning).toBe(false);
    });

    it('debería alternar entre temas claro y oscuro', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Empezar con tema claro
      expect(result.current.currentTheme).toBe('light');
      
      await act(async () => {
        await result.current.toggleTheme();
      });
      
      expect(result.current.currentTheme).toBe('dark');
      
      await act(async () => {
        await result.current.toggleTheme();
      });
      
      expect(result.current.currentTheme).toBe('light');
    });

    it('no debería cambiar si el tema es el mismo', async () => {
      const { result } = renderHook(() => useThemeStore());
      const originalTimestamp = result.current.lastUpdated;
      
      await act(async () => {
        await result.current.setTheme('light'); // mismo tema
      });
      
      // No debería cambiar el timestamp si no hubo cambio
      expect(result.current.lastUpdated).toBe(originalTimestamp);
    });

    it('debería manejar transiciones', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Mock de document.body.style para simular transiciones
      Object.defineProperty(document.body, 'style', {
        value: {
          transition: ''
        },
        writable: true
      });
      
      // Habilitar transiciones suaves
      act(() => {
        result.current.updatePreferences({ smoothTransitions: true });
      });
      
      await act(async () => {
        await result.current.setTheme('dark');
      });
      
      expect(result.current.currentTheme).toBe('dark');
    });
  });

  describe('Temas personalizados', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useThemeStore());
      await act(async () => {
        await result.current.initialize();
      });
    });

    it('debería crear tema personalizado', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const customVariables = {
        '--primary-color': '#ff6600',
        '--background-color': '#f0f0f0'
      };
      
      let themeId;
      act(() => {
        themeId = result.current.createCustomTheme('mi-tema', customVariables, 'light');
      });
      
      expect(themeId).toBe('custom-theme-id');
      expect(result.current.customThemes.has('mi-tema')).toBe(true);
      
      const customTheme = result.current.customThemes.get('mi-tema');
      expect(customTheme.name).toBe('mi-tema');
      expect(customTheme.variables).toEqual(customVariables);
      expect(customTheme.baseTheme).toBe('light');
    });

    it('debería rechazar tema con nombre duplicado', () => {
      const { result } = renderHook(() => useThemeStore());
      
      act(() => {
        result.current.createCustomTheme('test-theme', {});
      });
      
      expect(() => {
        act(() => {
          result.current.createCustomTheme('test-theme', {}); // nombre duplicado
        });
      }).toThrow('ya existe');
    });

    it('debería eliminar tema personalizado', () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Crear tema personalizado
      act(() => {
        result.current.createCustomTheme('tema-temporal', {});
      });
      
      expect(result.current.customThemes.has('tema-temporal')).toBe(true);
      
      // Eliminar tema
      let success;
      act(() => {
        success = result.current.deleteCustomTheme('tema-temporal');
      });
      
      expect(success).toBe(true);
      expect(result.current.customThemes.has('tema-temporal')).toBe(false);
    });

    it('debería cambiar a tema por defecto al eliminar tema activo', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Crear y activar tema personalizado
      act(() => {
        result.current.createCustomTheme('tema-activo', {});
      });
      
      await act(async () => {
        await result.current.setTheme('tema-activo');
      });
      
      expect(result.current.currentTheme).toBe('tema-activo');
      
      // Eliminar tema activo
      act(() => {
        result.current.deleteCustomTheme('tema-activo');
      });
      
      expect(result.current.currentTheme).toBe('light'); // cambió a por defecto
    });
  });

  describe('Variables de tema', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useThemeStore());
      await act(async () => {
        await result.current.initialize();
      });
    });

    it('debería obtener variable de tema', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const primaryColor = result.current.getThemeVariable('--primary-color');
      expect(primaryColor).toBe('#007acc');
      
      const invalidVariable = result.current.getThemeVariable('--invalid-variable');
      expect(invalidVariable).toBe('');
    });

    it('debería verificar si es tema oscuro', () => {
      const { result } = renderHook(() => useThemeStore());
      
      expect(result.current.isDarkTheme()).toBe(false);
      
      act(() => {
        result.current.currentTheme = 'dark';
      });
      
      expect(result.current.isDarkTheme()).toBe(true);
    });

    it('debería calcular variables derivadas', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const baseVariables = {
        '--primary-color': '#007acc',
        '--secondary-color': '#ff6600'
      };
      
      const computed = result.current.computeThemeVariables(baseVariables);
      
      expect(computed['--primary-color-alpha-10']).toBe('#007acc1A');
      expect(computed['--primary-color-alpha-50']).toBe('#007acc80');
      expect(computed['--secondary-color-alpha-20']).toBe('#ff660033');
    });
  });

  describe('Tema del sistema', () => {
    beforeEach(() => {
      // Mock de window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('dark'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });
    });

    it('debería detectar tema del sistema', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const systemTheme = result.current.detectSystemTheme();
      expect(systemTheme).toBe('dark'); // basado en el mock
    });

    it('debería seguir tema del sistema cuando está habilitado', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      act(() => {
        result.current.setFollowSystemTheme(true);
      });
      
      expect(result.current.followSystemTheme).toBe(true);
      // Debería cambiar al tema del sistema
      expect(result.current.currentTheme).toBe('dark');
    });

    it('debería configurar listener para cambios del sistema', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const cleanup = result.current.setupSystemThemeListener();
      expect(typeof cleanup).toBe('function');
      
      // Simular cambio en preferencia del sistema
      const mockEvent = { matches: false };
      window.matchMedia().addEventListener.mock.calls[0][1](mockEvent);
      
      expect(result.current.systemTheme).toBe('light');
    });
  });

  describe('Preferencias', () => {
    it('debería actualizar preferencias', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const newPreferences = {
        enableAnimations: false,
        highContrast: true
      };
      
      act(() => {
        result.current.updatePreferences(newPreferences);
      });
      
      expect(result.current.preferences.enableAnimations).toBe(false);
      expect(result.current.preferences.highContrast).toBe(true);
      expect(result.current.preferences.smoothTransitions).toBe(true); // mantiene valor anterior
    });
  });

  describe('Exportar/Importar configuración', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useThemeStore());
      await act(async () => {
        await result.current.initialize();
      });
    });

    it('debería exportar configuración de tema', () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Crear tema personalizado y configurar preferencias
      act(() => {
        result.current.createCustomTheme('test-theme', { '--color': '#123456' });
        result.current.updatePreferences({ enableAnimations: false });
      });
      
      const exported = result.current.exportThemeConfig();
      
      expect(exported).toHaveProperty('currentTheme');
      expect(exported).toHaveProperty('customThemes');
      expect(exported).toHaveProperty('preferences');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported.customThemes).toHaveLength(1);
      expect(exported.preferences.enableAnimations).toBe(false);
    });

    it('debería importar configuración de tema', () => {
      const { result } = renderHook(() => useThemeStore());
      
      const configToImport = {
        currentTheme: 'dark',
        customThemes: [
          ['imported-theme', {
            name: 'imported-theme',
            variables: { '--color': '#654321' },
            type: 'custom'
          }]
        ],
        preferences: {
          enableAnimations: false,
          highContrast: true
        }
      };
      
      act(() => {
        result.current.importThemeConfig(configToImport);
      });
      
      expect(result.current.currentTheme).toBe('dark');
      expect(result.current.customThemes.has('imported-theme')).toBe(true);
      expect(result.current.preferences.enableAnimations).toBe(false);
      expect(result.current.preferences.highContrast).toBe(true);
    });
  });

  describe('Reset', () => {
    it('debería resetear a tema por defecto', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Hacer cambios
      await act(async () => {
        await result.current.setTheme('dark');
      });
      
      act(() => {
        result.current.createCustomTheme('test-theme', {});
        result.current.updatePreferences({ enableAnimations: false });
        result.current.setFollowSystemTheme(true);
      });
      
      // Resetear
      act(() => {
        result.current.resetToDefault();
      });
      
      expect(result.current.currentTheme).toBe('light');
      expect(result.current.customThemes.size).toBe(0);
      expect(result.current.preferences.enableAnimations).toBe(true);
      expect(result.current.followSystemTheme).toBe(false);
    });
  });

  describe('Manejo de errores', () => {
    it('debería manejar errores al cambiar tema', async () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Mock error en el servicio
      vi.mocked(require('../../src/services/theme-service.js').themeService.setTheme)
        .mockRejectedValueOnce(new Error('Error al cambiar tema'));
      
      await act(async () => {
        await result.current.setTheme('dark');
      });
      
      expect(result.current.error).toBe('Error al cambiar tema');
      expect(result.current.isTransitioning).toBe(false);
    });

    it('debería manejar errores al crear tema personalizado', () => {
      const { result } = renderHook(() => useThemeStore());
      
      // Mock error en el servicio
      vi.mocked(require('../../src/services/theme-service.js').themeService.createCustomTheme)
        .mockImplementationOnce(() => {
          throw new Error('Error creando tema');
        });
      
      expect(() => {
        act(() => {
          result.current.createCustomTheme('error-theme', {});
        });
      }).toThrow('Error creando tema');
      
      expect(result.current.error).toBe('Error creando tema');
    });
  });
});