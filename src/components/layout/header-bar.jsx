import React, { useState, useEffect } from 'react';
import { useTheme } from './theme-provider.jsx';
import { i18nService } from '../../services/i18n-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './header-bar.css';

/**
 * Header Bar Component
 * Barra de encabezado con navegación y controles principales
 */
export const HeaderBar = ({ 
  onToggleSidebar, 
  onToggleConsole, 
  showSidebar, 
  showConsole 
}) => {
  const { currentTheme, toggleTheme, availableThemes } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [t, setT] = useState(() => (key, params) => key);

  useEffect(() => {
    // Inicializar i18n
    const initializeI18n = async () => {
      await i18nService.initialize();
      setCurrentLanguage(i18nService.getCurrentLanguage());
      setAvailableLanguages(i18nService.getAvailableLanguages());
      setT(() => (key, params) => i18nService.t(key, params));
    };

    initializeI18n();

    // Suscribirse a eventos
    const unsubscribeLanguageChanged = eventBus.subscribe('i18n:language-changed', (data) => {
      setCurrentLanguage(data.to);
      setT(() => (key, params) => i18nService.t(key, params));
    });

    const unsubscribeExecutionStarted = eventBus.subscribe('execution:started', () => {
      setIsExecuting(true);
    });

    const unsubscribeExecutionCompleted = eventBus.subscribe('execution:completed', () => {
      setIsExecuting(false);
    });

    const unsubscribeExecutionError = eventBus.subscribe('execution:error', () => {
      setIsExecuting(false);
    });

    const unsubscribeExecutionStopped = eventBus.subscribe('execution:stopped', () => {
      setIsExecuting(false);
    });

    return () => {
      unsubscribeLanguageChanged();
      unsubscribeExecutionStarted();
      unsubscribeExecutionCompleted();
      unsubscribeExecutionError();
      unsubscribeExecutionStopped();
    };
  }, []);

  /**
   * Manejar ejecución de código
   */
  const handleRunCode = () => {
    if (isExecuting) {
      eventBus.emit('code:stop-requested');
    } else {
      eventBus.emit('code:run-requested');
    }
  };

  /**
   * Manejar instalación de paquetes
   */
  const handleInstallPackage = () => {
    eventBus.emit('package:install-dialog-requested');
  };

  /**
   * Cambiar idioma
   */
  const handleLanguageChange = async (languageCode) => {
    await i18nService.setLanguage(languageCode);
    setShowLanguageMenu(false);
  };

  /**
   * Cambiar theme
   */
  const handleThemeChange = async (themeName) => {
    const { setTheme } = useTheme();
    await setTheme(themeName);
    setShowThemeMenu(false);
  };

  /**
   * Abrir configuración
   */
  const handleOpenSettings = () => {
    eventBus.emit('settings:dialog-requested');
    setShowSettingsMenu(false);
  };

  /**
   * Manejar atajos de teclado
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + Enter - Ejecutar código
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunCode();
      }
      
      // Ctrl/Cmd + Shift + P - Instalar paquete
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        handleInstallPackage();
      }
      
      // Escape - Cerrar menús
      if (event.key === 'Escape') {
        setShowThemeMenu(false);
        setShowLanguageMenu(false);
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExecuting]);

  /**
   * Cerrar menús al hacer clic fuera
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-menu') && !event.target.closest('.header-button')) {
        setShowThemeMenu(false);
        setShowLanguageMenu(false);
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="header-bar">
      {/* Logo y Título */}
      <div className="header-left">
        <div className="logo-section">
          <span className="logo-icon">🧀</span>
          <h1 className="app-title">CheeseJS</h1>
          <span className="version-badge">v0.1.0</span>
        </div>
      </div>

      {/* Controles Centrales */}
      <div className="header-center">
        <div className="control-group">
          {/* Botón Ejecutar/Detener */}
          <button 
            className={`header-button primary ${isExecuting ? 'executing' : ''}`}
            onClick={handleRunCode}
            title={isExecuting ? t('header.stop') : t('header.run')}
          >
            <span className="button-icon">
              {isExecuting ? '⏹️' : '▶️'}
            </span>
            <span className="button-text">
              {isExecuting ? t('header.stop') : t('header.run')}
            </span>
            {isExecuting && <div className="executing-indicator"></div>}
          </button>

          {/* Botón Instalar Paquete */}
          <button 
            className="header-button"
            onClick={handleInstallPackage}
            title={t('header.install')}
          >
            <span className="button-icon">📦</span>
            <span className="button-text">{t('header.install')}</span>
          </button>
        </div>
      </div>

      {/* Controles de la Derecha */}
      <div className="header-right">
        <div className="control-group">
          {/* Toggle Sidebar */}
          <button 
            className={`header-button icon-only ${showSidebar ? 'active' : ''}`}
            onClick={onToggleSidebar}
            title="Toggle Sidebar (Ctrl+B)"
          >
            <span className="button-icon">📂</span>
          </button>

          {/* Toggle Console */}
          <button 
            className={`header-button icon-only ${showConsole ? 'active' : ''}`}
            onClick={onToggleConsole}
            title="Toggle Console (Ctrl+`)"
          >
            <span className="button-icon">🖥️</span>
          </button>

          {/* Selector de Theme */}
          <div className="dropdown">
            <button 
              className="header-button icon-only"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title={t('header.theme')}
            >
              <span className="button-icon">
                {currentTheme === 'dark' ? '🌙' : '☀️'}
              </span>
            </button>
            
            {showThemeMenu && (
              <div className="dropdown-menu theme-menu">
                <div className="dropdown-header">{t('header.theme')}</div>
                {Object.entries(availableThemes).map(([key, theme]) => (
                  <button
                    key={key}
                    className={`dropdown-item ${currentTheme === key ? 'active' : ''}`}
                    onClick={() => handleThemeChange(key)}
                  >
                    <span className="item-icon">
                      {key === 'dark' ? '🌙' : key === 'light' ? '☀️' : '🎨'}
                    </span>
                    <span className="item-text">{theme.name}</span>
                    {currentTheme === key && <span className="item-check">✓</span>}
                  </button>
                ))}
                <div className="dropdown-divider"></div>
                <button 
                  className="dropdown-item"
                  onClick={toggleTheme}
                >
                  <span className="item-icon">🔄</span>
                  <span className="item-text">Alternar Theme</span>
                </button>
              </div>
            )}
          </div>

          {/* Selector de Idioma */}
          <div className="dropdown">
            <button 
              className="header-button icon-only"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              title={t('header.language')}
            >
              <span className="button-icon">🌍</span>
            </button>
            
            {showLanguageMenu && (
              <div className="dropdown-menu language-menu">
                <div className="dropdown-header">{t('header.language')}</div>
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`dropdown-item ${currentLanguage === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    <span className="item-text">{lang.nativeName}</span>
                    {currentLanguage === lang.code && <span className="item-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menú de Configuración */}
          <div className="dropdown">
            <button 
              className="header-button icon-only"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              title={t('header.settings')}
            >
              <span className="button-icon">⚙️</span>
            </button>
            
            {showSettingsMenu && (
              <div className="dropdown-menu settings-menu">
                <div className="dropdown-header">{t('header.settings')}</div>
                <button
                  className="dropdown-item"
                  onClick={handleOpenSettings}
                >
                  <span className="item-icon">⚙️</span>
                  <span className="item-text">{t('header.settings')}</span>
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item"
                  onClick={() => eventBus.emit('help:dialog-requested')}
                >
                  <span className="item-icon">❓</span>
                  <span className="item-text">{t('header.help')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;