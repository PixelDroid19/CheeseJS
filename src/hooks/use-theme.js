import { useState, useEffect } from 'react';
import { themeService } from '../services/theme-service.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Hook para gestión de temas
 * Elimina la duplicación de lógica de themes en múltiples componentes
 */
export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [availableThemes, setAvailableThemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [themeColors, setThemeColors] = useState({});

  useEffect(() => {
    let isMounted = true;

    const initializeTheme = async () => {
      try {
        setIsLoading(true);
        
        // Inicializar el servicio solo si no está ya inicializado
        if (!themeService.isInitialized) {
          await themeService.initialize();
        }
        
        if (isMounted) {
          setCurrentTheme(themeService.getCurrentTheme());
          setAvailableThemes(themeService.getAvailableThemes());
          setThemeColors(themeService.getCurrentThemeColors());
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error inicializando theme:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeTheme();

    // Suscribirse a cambios de tema
    const unsubscribeThemeChanged = eventBus.subscribe('theme:changed', (data) => {
      if (isMounted) {
        setCurrentTheme(data.to);
        setThemeColors(data.colors || {});
      }
    });

    return () => {
      isMounted = false;
      unsubscribeThemeChanged();
    };
  }, []);

  /**
   * Cambiar tema
   */
  const setTheme = async (themeName) => {
    try {
      await themeService.setTheme(themeName);
    } catch (error) {
      console.error('❌ Error cambiando tema:', error);
    }
  };

  /**
   * Alternar entre temas (útil para botón de toggle)
   */
  const toggleTheme = async () => {
    try {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      await setTheme(newTheme);
    } catch (error) {
      console.error('❌ Error alternando tema:', error);
    }
  };

  /**
   * Obtener información del tema actual
   */
  const getThemeInfo = (themeName = currentTheme) => {
    return availableThemes.find(theme => theme.name === themeName);
  };

  /**
   * Verificar si es tema oscuro
   */
  const isDarkTheme = () => {
    return currentTheme === 'dark';
  };

  /**
   * Obtener valor de variable CSS del tema actual
   */
  const getThemeVariable = (variableName) => {
    return themeColors[variableName] || '';
  };

  return {
    // Estado
    currentTheme,
    availableThemes,
    isLoading,
    themeColors,
    
    // Acciones
    setTheme,
    toggleTheme,
    
    // Utilidades
    getThemeInfo,
    isDarkTheme,
    getThemeVariable,
    isReady: !isLoading && !!currentTheme,
    service: themeService // Para casos especiales que necesiten acceso directo
  };
};

export default useTheme;