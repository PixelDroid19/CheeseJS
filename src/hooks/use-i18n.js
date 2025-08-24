import { useState, useEffect } from 'react';
import { i18nService } from '../services/i18n-service.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Hook para gestión de internacionalización
 * Elimina la duplicación de lógica de i18n en múltiples componentes
 */
export const useI18n = () => {
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [t, setT] = useState(() => (key, params) => key);

  useEffect(() => {
    let isMounted = true;

    const initializeI18n = async () => {
      try {
        setIsLoading(true);
        
        // Inicializar el servicio solo si no está ya inicializado
        if (!i18nService.isInitialized) {
          await i18nService.initialize();
        }
        
        if (isMounted) {
          setCurrentLanguage(i18nService.getCurrentLanguage());
          setAvailableLanguages(i18nService.getAvailableLanguages());
          setT(() => (key, params) => i18nService.t(key, params));
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error inicializando i18n:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeI18n();

    // Suscribirse a cambios de idioma
    const unsubscribeLanguageChanged = eventBus.subscribe('i18n:language-changed', (data) => {
      if (isMounted) {
        setCurrentLanguage(data.to);
        setT(() => (key, params) => i18nService.t(key, params));
      }
    });

    return () => {
      isMounted = false;
      unsubscribeLanguageChanged();
    };
  }, []);

  /**
   * Cambiar idioma
   */
  const changeLanguage = async (languageCode) => {
    try {
      await i18nService.setLanguage(languageCode);
    } catch (error) {
      console.error('❌ Error cambiando idioma:', error);
    }
  };

  /**
   * Obtener información del idioma actual
   */
  const getLanguageInfo = (languageCode = currentLanguage) => {
    return availableLanguages.find(lang => lang.code === languageCode);
  };

  return {
    // Estado
    currentLanguage,
    availableLanguages,
    isLoading,
    t,
    
    // Acciones
    changeLanguage,
    getLanguageInfo,
    
    // Utilidades
    isReady: !isLoading && !!t,
    service: i18nService // Para casos especiales que necesiten acceso directo
  };
};

export default useI18n;