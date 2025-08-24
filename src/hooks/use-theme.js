import { useThemeStore } from '../stores/theme-store.js';
import { useShallow } from 'zustand/react/shallow';

/**
 * Hook para gestión de temas usando Zustand
 * Reemplaza la implementación anterior basada en servicios y EventBus
 */
export const useTheme = () => {
  // Selección optimizada de estado para evitar re-renders innecesarios
  const {
    currentTheme,
    previousTheme,
    availableThemes,
    customThemes,
    themeVariables,
    isLoading,
    isTransitioning,
    followSystemTheme,
    systemTheme,
    preferences,
    error,
    // Acciones
    initialize,
    setTheme,
    toggleTheme,
    createCustomTheme,
    deleteCustomTheme,
    getThemeVariable,
    isDarkTheme,
    setFollowSystemTheme,
    updatePreferences,
    exportThemeConfig,
    importThemeConfig,
    resetToDefault
  } = useThemeStore(
    useShallow((state) => ({
      // Estado del tema
      currentTheme: state.currentTheme,
      previousTheme: state.previousTheme,
      availableThemes: state.availableThemes,
      customThemes: state.customThemes,
      themeVariables: state.themeVariables,
      
      // Estado de carga
      isLoading: state.isLoading,
      isTransitioning: state.isTransitioning,
      
      // Configuración
      followSystemTheme: state.followSystemTheme,
      systemTheme: state.systemTheme,
      preferences: state.preferences,
      
      // Error
      error: state.error,
      
      // Acciones
      initialize: state.initialize,
      setTheme: state.setTheme,
      toggleTheme: state.toggleTheme,
      createCustomTheme: state.createCustomTheme,
      deleteCustomTheme: state.deleteCustomTheme,
      getThemeVariable: state.getThemeVariable,
      isDarkTheme: state.isDarkTheme,
      setFollowSystemTheme: state.setFollowSystemTheme,
      updatePreferences: state.updatePreferences,
      exportThemeConfig: state.exportThemeConfig,
      importThemeConfig: state.importThemeConfig,
      resetToDefault: state.resetToDefault
    }))
  );

  // Estado derivado
  const isReady = !isLoading && !error;
  const hasCustomThemes = customThemes.size > 0;
  const isDark = isDarkTheme();
  const canToggle = availableThemes.has('light') && availableThemes.has('dark');
  
  // Obtener información del tema actual
  const getThemeInfo = (themeName = currentTheme) => {
    return availableThemes.get(themeName) || customThemes.get(themeName);
  };
  
  // Obtener todos los temas disponibles como array
  const getAllThemes = () => {
    const builtIn = Array.from(availableThemes.entries()).map(([key, value]) => ({
      id: key,
      ...value,
      type: 'built-in'
    }));
    
    const custom = Array.from(customThemes.entries()).map(([key, value]) => ({
      id: key,
      ...value,
      type: 'custom'
    }));
    
    return [...builtIn, ...custom];
  };
  
  // Helper para verificar si un tema existe
  const themeExists = (themeName) => {
    return availableThemes.has(themeName) || customThemes.has(themeName);
  };
  
  // Helper para obtener variables CSS con fallback
  const getVariable = (variableName, fallback = '') => {
    return getThemeVariable(variableName) || fallback;
  };
  
  // Helper para cambiar tema con validación
  const changeTheme = async (themeName) => {
    if (!themeExists(themeName)) {
      console.warn(`Tema '${themeName}' no existe`);
      return false;
    }
    
    try {
      await setTheme(themeName);
      return true;
    } catch (error) {
      console.error('Error cambiando tema:', error);
      return false;
    }
  };

  return {
    // Estado del tema
    currentTheme,
    previousTheme,
    isDark,
    isTransitioning,
    
    // Estado de carga
    isLoading,
    isReady,
    error,
    
    // Temas disponibles
    availableThemes,
    customThemes,
    hasCustomThemes,
    getAllThemes: getAllThemes(),
    
    // Variables del tema
    themeVariables,
    getVariable,
    getThemeVariable,
    
    // Configuración
    followSystemTheme,
    systemTheme,
    preferences,
    
    // Acciones principales
    setTheme: changeTheme,
    toggleTheme,
    
    // Gestión de temas personalizados
    createCustomTheme,
    deleteCustomTheme,
    
    // Configuración avanzada
    setFollowSystemTheme,
    updatePreferences,
    
    // Utilidades
    getThemeInfo,
    themeExists,
    canToggle,
    isDarkTheme: isDark,
    
    // Importar/Exportar
    exportThemeConfig,
    importThemeConfig,
    resetToDefault,
    
    // Inicialización
    initialize
  };
};

export default useTheme;