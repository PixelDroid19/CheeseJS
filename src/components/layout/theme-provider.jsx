import React, { createContext, useContext, useEffect, useState } from 'react';
import { themeService } from '../../services/theme-service.js';
import { eventBus } from '../../utils/event-bus.js';

/**
 * Context para el sistema de themes
 */
const ThemeContext = createContext({
  currentTheme: 'light',
  availableThemes: {},
  setTheme: () => {},
  toggleTheme: () => {},
  themeVariables: {},
  isLoading: true
});

/**
 * Hook para usar el contexto de themes
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

/**
 * Theme Provider Component
 * Provee el sistema de themes a toda la aplicación
 */
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [availableThemes, setAvailableThemes] = useState({});
  const [themeVariables, setThemeVariables] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Inicializar theme service
    const initializeThemes = async () => {
      try {
        await themeService.initialize();
        
        // Obtener estado inicial
        setCurrentTheme(themeService.getCurrentTheme());
        setAvailableThemes(themeService.getAvailableThemes());
        setThemeVariables(themeService.getCurrentThemeVariables());
        setIsLoading(false);
        
        console.log('🎨 ThemeProvider inicializado');
      } catch (error) {
        console.error('❌ Error al inicializar ThemeProvider:', error);
        setIsLoading(false);
      }
    };

    initializeThemes();

    // Suscribirse a eventos de cambio de theme
    const unsubscribeThemeChanged = eventBus.subscribe('theme:changed', (data) => {
      setCurrentTheme(data.theme);
      setThemeVariables(data.variables);
      console.log('🎨 Theme cambiado a:', data.theme);
    });

    const unsubscribeThemeSwitched = eventBus.subscribe('theme:switched', (data) => {
      console.log(`🎨 Theme alternado de ${data.from} a ${data.to}`);
    });

    const unsubscribeCustomCreated = eventBus.subscribe('theme:custom-created', (data) => {
      setAvailableThemes(themeService.getAvailableThemes());
      console.log('🎨 Theme personalizado creado:', data.name);
    });

    const unsubscribeCustomDeleted = eventBus.subscribe('theme:custom-deleted', (data) => {
      setAvailableThemes(themeService.getAvailableThemes());
      console.log('🎨 Theme personalizado eliminado:', data.name);
    });

    // Cleanup
    return () => {
      unsubscribeThemeChanged();
      unsubscribeThemeSwitched();
      unsubscribeCustomCreated();
      unsubscribeCustomDeleted();
    };
  }, []);

  /**
   * Cambiar theme
   */
  const handleSetTheme = async (themeName) => {
    try {
      const success = await themeService.setTheme(themeName);
      if (!success) {
        console.error(`❌ No se pudo cambiar al theme: ${themeName}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error al cambiar theme:', error);
      return false;
    }
  };

  /**
   * Alternar entre light y dark
   */
  const handleToggleTheme = async () => {
    try {
      return await themeService.toggleTheme();
    } catch (error) {
      console.error('❌ Error al alternar theme:', error);
      return false;
    }
  };

  /**
   * Crear theme personalizado
   */
  const createCustomTheme = (name, variables, baseTheme = 'light') => {
    try {
      return themeService.createCustomTheme(name, variables, baseTheme);
    } catch (error) {
      console.error('❌ Error al crear theme personalizado:', error);
      return null;
    }
  };

  /**
   * Eliminar theme personalizado
   */
  const deleteCustomTheme = (name) => {
    try {
      return themeService.deleteCustomTheme(name);
    } catch (error) {
      console.error('❌ Error al eliminar theme personalizado:', error);
      return false;
    }
  };

  /**
   * Exportar theme
   */
  const exportTheme = (themeName) => {
    try {
      return themeService.exportTheme(themeName);
    } catch (error) {
      console.error('❌ Error al exportar theme:', error);
      return null;
    }
  };

  /**
   * Importar theme
   */
  const importTheme = (themeData) => {
    try {
      const success = themeService.importTheme(themeData);
      if (success) {
        setAvailableThemes(themeService.getAvailableThemes());
      }
      return success;
    } catch (error) {
      console.error('❌ Error al importar theme:', error);
      return false;
    }
  };

  /**
   * Obtener variable de CSS del theme actual
   */
  const getThemeVariable = (variableName) => {
    return themeVariables[variableName] || null;
  };

  /**
   * Verificar si es theme dark
   */
  const isDarkTheme = () => {
    return currentTheme === 'dark' || 
           (themeVariables['--background-color'] && 
            themeVariables['--background-color'].includes('#1E1E1E'));
  };

  /**
   * Obtener preferencia del sistema
   */
  const getSystemThemePreference = () => {
    return themeService.getSystemThemePreference();
  };

  const contextValue = {
    // Estado
    currentTheme,
    availableThemes,
    themeVariables,
    isLoading,
    
    // Acciones básicas
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
    
    // Themes personalizados
    createCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    
    // Utilidades
    getThemeVariable,
    isDarkTheme,
    getSystemThemePreference,
    
    // Servicio directo (para casos avanzados)
    themeService
  };

  // Mostrar loader mientras se inicializa
  if (isLoading) {
    return (
      <div className="theme-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Inicializando themes...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          .theme-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f8f9fa;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .loading-spinner {
            text-align: center;
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e9ecef;
            border-top: 4px solid #007acc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .theme-loading p {
            margin: 0;
            color: #6c757d;
            font-size: 14px;
          }
        `}} />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;