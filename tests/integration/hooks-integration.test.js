/**
 * Test de integración para hooks con servicios reales
 * Verifica que la corrección del error isInitialized funcione correctamente
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useI18n } from '../../src/hooks/use-i18n.js';
import { useTheme } from '../../src/hooks/use-theme.js';
import { i18nService } from '../../src/services/i18n-service.js';
import { themeService } from '../../src/services/theme-service.js';

describe('Hooks Integration Tests', () => {
  beforeEach(() => {
    // Resetear servicios antes de cada test
    i18nService.isInitialized = false;
    themeService.isInitialized = false;
  });

  describe('useI18n Hook Integration', () => {
    it('should access isInitialized as property, not method', async () => {
      // Verificar que isInitialized es una propiedad
      expect(typeof i18nService.isInitialized).toBe('boolean');
      expect(typeof i18nService.isInitialized).not.toBe('function');
      
      // Verificar estado inicial
      expect(i18nService.isInitialized).toBe(false);
    });

    it('should initialize service correctly through hook', async () => {
      const { result } = renderHook(() => useI18n());

      // Estado inicial
      expect(result.current.isLoading).toBe(true);

      // Esperar a que se complete la inicialización
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Verificar que el servicio se inicializó
      expect(i18nService.isInitialized).toBe(true);
      expect(result.current.isReady).toBe(true);
      expect(typeof result.current.t).toBe('function');
    });

    it('should handle multiple initializations gracefully', async () => {
      // Primera inicialización
      const { result: result1 } = renderHook(() => useI18n());
      
      await waitFor(() => {
        expect(result1.current.isReady).toBe(true);
      });

      // Segunda inicialización (debería reutilizar el servicio)
      const { result: result2 } = renderHook(() => useI18n());
      
      await waitFor(() => {
        expect(result2.current.isReady).toBe(true);
      });

      // Ambos hooks deberían funcionar
      expect(result1.current.currentLanguage).toBe(result2.current.currentLanguage);
      expect(typeof result1.current.t).toBe('function');
      expect(typeof result2.current.t).toBe('function');
    });

    it('should provide working translation function', async () => {
      const { result } = renderHook(() => useI18n());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Probar traducción
      const translated = result.current.t('header.run');
      expect(typeof translated).toBe('string');
      expect(translated.length).toBeGreaterThan(0);
    });
  });

  describe('useTheme Hook Integration', () => {
    it('should access isInitialized as property, not method', async () => {
      // Verificar que isInitialized es una propiedad
      expect(typeof themeService.isInitialized).toBe('boolean');
      expect(typeof themeService.isInitialized).not.toBe('function');
      
      // Verificar estado inicial
      expect(themeService.isInitialized).toBe(false);
    });

    it('should initialize service correctly through hook', async () => {
      const { result } = renderHook(() => useTheme());

      // Estado inicial
      expect(result.current.isLoading).toBe(true);

      // Esperar a que se complete la inicialización
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Verificar que el servicio se inicializó
      expect(themeService.isInitialized).toBe(true);
      expect(result.current.isReady).toBe(true);
      expect(typeof result.current.currentTheme).toBe('string');
    });

    it('should provide theme management functions', async () => {
      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Verificar funciones disponibles
      expect(typeof result.current.setTheme).toBe('function');
      expect(typeof result.current.toggleTheme).toBe('function');
      expect(typeof result.current.isDarkTheme).toBe('function');
      expect(Array.isArray(result.current.availableThemes)).toBe(true);
    });

    it('should detect dark theme correctly', async () => {
      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Test con tema light
      if (result.current.currentTheme === 'light') {
        expect(result.current.isDarkTheme()).toBe(false);
      }
      
      // Test con tema dark
      if (result.current.currentTheme === 'dark') {
        expect(result.current.isDarkTheme()).toBe(true);
      }
    });
  });

  describe('Error Prevention Tests', () => {
    it('should not throw "isInitialized is not a function" error', async () => {
      // Este test específicamente verifica que el error original está corregido
      let i18nError = null;
      let themeError = null;

      try {
        const { result: i18nResult } = renderHook(() => useI18n());
        await waitFor(() => expect(i18nResult.current.isReady).toBe(true));
      } catch (error) {
        i18nError = error;
      }

      try {
        const { result: themeResult } = renderHook(() => useTheme());
        await waitFor(() => expect(themeResult.current.isReady).toBe(true));
      } catch (error) {
        themeError = error;
      }

      // Verificar que no hay errores relacionados con isInitialized
      expect(i18nError).toBeNull();
      expect(themeError).toBeNull();
    });

    it('should handle service initialization errors gracefully', async () => {
      // Simular error en inicialización
      const originalInitialize = i18nService.initialize;
      i18nService.initialize = async () => {
        throw new Error('Simulated initialization error');
      };

      const { result } = renderHook(() => useI18n());

      // Esperar a que se maneje el error
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // El hook debería manejar el error sin crashear
      expect(result.current.isReady).toBe(false);

      // Restaurar función original
      i18nService.initialize = originalInitialize;
    });
  });
});