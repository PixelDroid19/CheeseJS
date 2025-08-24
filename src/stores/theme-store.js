import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';
import { themeService } from '../services/theme-service.js';

/**
 * ThemeStore - Gestión de temas con Zustand
 * Maneja temas light/dark/custom, variables CSS y persistencia
 */
const initialState = createInitialState({
  // Estado del tema actual
  currentTheme: 'light',
  previousTheme: null,
  
  // Temas disponibles
  availableThemes: new Map([
    ['light', { name: 'Light', type: 'built-in' }],
    ['dark', { name: 'Dark', type: 'built-in' }]
  ]),
  
  // Temas personalizados
  customThemes: new Map(),
  
  // Variables CSS del tema actual
  themeVariables: {},
  
  // Estado de transición
  isTransitioning: false,
  transitionDuration: 200,
  
  // Configuración de tema
  followSystemTheme: false,
  systemTheme: 'light',
  
  // Cache de variables calculadas
  computedVariables: {},
  
  // Configuración avanzada
  preferences: {
    enableAnimations: true,
    smoothTransitions: true,
    highContrast: false,
    reducedMotion: false
  }
});

export const useThemeStore = createBaseStore(
  'ThemeStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar el store de temas
     */
    initialize: async () => {
      try {
        set({ isLoading: true });

        // Inicializar el servicio de temas si no está listo
        if (!themeService.isInitialized) {
          await themeService.initialize();
        }

        // Cargar configuración inicial
        const currentTheme = themeService.getCurrentTheme();
        const availableThemes = themeService.getAvailableThemes();
        const themeVariables = themeService.getCurrentThemeVariables();

        // Detectar tema del sistema
        const systemTheme = get().detectSystemTheme();

        // Configurar listener para cambios del sistema
        get().setupSystemThemeListener();

        set({
          currentTheme,
          themeVariables,
          systemTheme,
          isLoading: false,
          lastUpdated: new Date().toISOString()
        });

        console.log('🎨 ThemeStore inicializado:', currentTheme);

      } catch (error) {
        console.error('❌ Error inicializando ThemeStore:', error);
        set({ 
          error: error.message, 
          isLoading: false 
        });
      }
    },

    /**
     * Cambiar tema
     */
    setTheme: async (themeName) => {
      const currentState = get();
      
      if (currentState.currentTheme === themeName || currentState.isTransitioning) {
        return;
      }

      try {
        set({ 
          isTransitioning: true,
          previousTheme: currentState.currentTheme
        });

        // Aplicar animación de transición si está habilitada
        if (currentState.preferences.smoothTransitions) {
          document.body.style.transition = `all ${currentState.transitionDuration}ms ease-in-out`;
        }

        // Cambiar tema usando el servicio
        await themeService.setTheme(themeName);

        // Obtener nuevas variables del tema
        const themeVariables = themeService.getCurrentThemeVariables();
        const computedVariables = get().computeThemeVariables(themeVariables);

        set({
          currentTheme: themeName,
          themeVariables,
          computedVariables,
          isTransitioning: false,
          lastUpdated: new Date().toISOString()
        });

        // Limpiar transición
        if (currentState.preferences.smoothTransitions) {
          setTimeout(() => {
            document.body.style.transition = '';
          }, currentState.transitionDuration);
        }

        console.log('🎨 Tema cambiado a:', themeName);

      } catch (error) {
        console.error('❌ Error cambiando tema:', error);
        set({ 
          error: error.message,
          isTransitioning: false
        });
      }
    },

    /**
     * Alternar entre tema claro y oscuro
     */
    toggleTheme: async () => {
      const { currentTheme } = get();
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      await get().setTheme(newTheme);
    },

    /**
     * Crear tema personalizado
     */
    createCustomTheme: (name, variables, baseTheme = 'light') => {
      const currentState = get();
      
      try {
        // Validar que el nombre no existe
        if (currentState.customThemes.has(name) || currentState.availableThemes.has(name)) {
          throw new Error(`El tema '${name}' ya existe`);
        }

        // Crear el tema usando el servicio
        const themeId = themeService.createCustomTheme(name, variables, baseTheme);

        // Actualizar store
        const newCustomThemes = new Map(currentState.customThemes);
        newCustomThemes.set(name, {
          id: themeId,
          name,
          variables,
          baseTheme,
          type: 'custom',
          createdAt: new Date().toISOString()
        });

        set({
          customThemes: newCustomThemes,
          lastUpdated: new Date().toISOString()
        });

        console.log('🎨 Tema personalizado creado:', name);
        return themeId;

      } catch (error) {
        console.error('❌ Error creando tema personalizado:', error);
        set({ error: error.message });
        throw error;
      }
    },

    /**
     * Eliminar tema personalizado
     */
    deleteCustomTheme: (name) => {
      const currentState = get();
      
      try {
        if (!currentState.customThemes.has(name)) {
          throw new Error(`El tema '${name}' no existe`);
        }

        // Si es el tema actual, cambiar a uno por defecto
        if (currentState.currentTheme === name) {
          get().setTheme('light');
        }

        // Eliminar usando el servicio
        const success = themeService.deleteCustomTheme(name);
        
        if (success) {
          const newCustomThemes = new Map(currentState.customThemes);
          newCustomThemes.delete(name);

          set({
            customThemes: newCustomThemes,
            lastUpdated: new Date().toISOString()
          });

          console.log('🎨 Tema personalizado eliminado:', name);
        }

        return success;

      } catch (error) {
        console.error('❌ Error eliminando tema personalizado:', error);
        set({ error: error.message });
        return false;
      }
    },

    /**
     * Obtener variable del tema actual
     */
    getThemeVariable: (variableName) => {
      const { themeVariables } = get();
      return themeVariables[variableName] || '';
    },

    /**
     * Verificar si es tema oscuro
     */
    isDarkTheme: () => {
      const { currentTheme } = get();
      return currentTheme === 'dark' || currentTheme.includes('dark');
    },

    /**
     * Configurar seguimiento del tema del sistema
     */
    setFollowSystemTheme: (follow) => {
      const currentState = get();
      
      set({ followSystemTheme: follow });

      if (follow) {
        const systemTheme = get().detectSystemTheme();
        if (systemTheme !== currentState.currentTheme) {
          get().setTheme(systemTheme);
        }
      }
    },

    /**
     * Detectar tema del sistema
     */
    detectSystemTheme: () => {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    },

    /**
     * Configurar listener para cambios del tema del sistema
     */
    setupSystemThemeListener: () => {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
          const systemTheme = e.matches ? 'dark' : 'light';
          set({ systemTheme });

          const { followSystemTheme } = get();
          if (followSystemTheme) {
            get().setTheme(systemTheme);
          }
        };

        mediaQuery.addEventListener('change', handleChange);
        
        // Retornar función de cleanup
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    },

    /**
     * Actualizar preferencias de tema
     */
    updatePreferences: (newPreferences) => {
      const currentPreferences = get().preferences;
      set({
        preferences: { ...currentPreferences, ...newPreferences },
        lastUpdated: new Date().toISOString()
      });
    },

    /**
     * Calcular variables derivadas del tema
     */
    computeThemeVariables: (baseVariables) => {
      const computed = {};
      
      // Calcular colores con transparencia
      Object.entries(baseVariables).forEach(([key, value]) => {
        if (key.includes('color') && value.startsWith('#')) {
          // Generar variantes con transparencia
          computed[`${key}-alpha-10`] = `${value}1A`;
          computed[`${key}-alpha-20`] = `${value}33`;
          computed[`${key}-alpha-50`] = `${value}80`;
        }
      });

      return computed;
    },

    /**
     * Exportar configuración de tema
     */
    exportThemeConfig: () => {
      const { currentTheme, customThemes, preferences } = get();
      
      return {
        currentTheme,
        customThemes: Array.from(customThemes.entries()),
        preferences,
        exportedAt: new Date().toISOString()
      };
    },

    /**
     * Importar configuración de tema
     */
    importThemeConfig: (config) => {
      try {
        const { currentTheme, customThemes = [], preferences = {} } = config;

        // Restaurar temas personalizados
        const customThemesMap = new Map(customThemes);
        
        // Aplicar configuración
        set({
          customThemes: customThemesMap,
          preferences: { ...get().preferences, ...preferences }
        });

        // Aplicar tema si es válido
        if (currentTheme && (get().availableThemes.has(currentTheme) || customThemesMap.has(currentTheme))) {
          get().setTheme(currentTheme);
        }

        console.log('🎨 Configuración de tema importada');

      } catch (error) {
        console.error('❌ Error importando configuración de tema:', error);
        set({ error: error.message });
      }
    },

    /**
     * Resetear a tema por defecto
     */
    resetToDefault: () => {
      get().setTheme('light');
      set({
        customThemes: new Map(),
        preferences: initialState.preferences,
        followSystemTheme: false
      });
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-theme-store',
    devtools: true,
    // Persistir configuración pero no estado temporal
    partialize: (state) => ({
      currentTheme: state.currentTheme,
      customThemes: Array.from(state.customThemes.entries()),
      preferences: state.preferences,
      followSystemTheme: state.followSystemTheme
    })
  }
);