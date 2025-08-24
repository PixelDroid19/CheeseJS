import React, { useState, useEffect } from 'react';
import { useTheme } from './theme-provider.jsx';
import { i18nService } from '../../services/i18n-service.js';
import { eventBus } from '../../utils/event-bus.js';
import './sidebar-panel.css';

/**
 * Sidebar Panel Component
 * Panel lateral para navegación, archivos y gestión de paquetes
 */
export const SidebarPanel = ({ width = 250 }) => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('files');
  const [installedPackages, setInstalledPackages] = useState([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packageSearchQuery, setPackageSearchQuery] = useState('');
  const [t, setT] = useState(() => (key, params) => key);

  useEffect(() => {
    // Inicializar i18n
    const initializeI18n = async () => {
      await i18nService.initialize();
      setT(() => (key, params) => i18nService.t(key, params));
    };

    initializeI18n();

    // Suscribirse a eventos
    const unsubscribeLanguageChanged = eventBus.subscribe('i18n:language-changed', (data) => {
      setT(() => (key, params) => i18nService.t(key, params));
    });

    const unsubscribePackageInstalled = eventBus.subscribe('package:installed', (data) => {
      setInstalledPackages(prev => {
        const exists = prev.find(pkg => pkg.name === data.package);
        if (exists) return prev;
        return [...prev, { name: data.package, version: data.version || 'latest', installedAt: new Date() }];
      });
    });

    const unsubscribePackageUninstalled = eventBus.subscribe('package:uninstalled', (data) => {
      setInstalledPackages(prev => prev.filter(pkg => pkg.name !== data.package));
    });

    return () => {
      unsubscribeLanguageChanged();
      unsubscribePackageInstalled();
      unsubscribePackageUninstalled();
    };
  }, []);

  /**
   * Cambiar tab activa
   */
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    eventBus.emit('sidebar:tab-changed', { tab: tabName });
  };

  /**
   * Abrir diálogo de instalación de paquetes
   */
  const handleInstallPackage = () => {
    eventBus.emit('package:install-dialog-requested');
  };

  /**
   * Desinstalar paquete
   */
  const handleUninstallPackage = (packageName) => {
    eventBus.emit('package:uninstall-requested', { package: packageName });
  };

  /**
   * Abrir configuración
   */
  const handleOpenSettings = () => {
    eventBus.emit('settings:dialog-requested');
  };

  /**
   * Crear nuevo archivo
   */
  const handleNewFile = () => {
    eventBus.emit('file:new-requested');
  };

  /**
   * Abrir archivo de ejemplo
   */
  const handleOpenExample = (exampleName) => {
    eventBus.emit('example:load-requested', { example: exampleName });
  };

  const tabs = [
    { id: 'files', icon: '📁', label: t('sidebar.files') },
    { id: 'packages', icon: '📦', label: t('sidebar.packages') },
    { id: 'settings', icon: '⚙️', label: t('sidebar.settings') },
    { id: 'help', icon: '❓', label: t('sidebar.help') }
  ];

  const examples = [
    { id: 'hello-world', name: 'Hello World', icon: '👋' },
    { id: 'async-fetch', name: 'Async/Await + Fetch', icon: '🌐' },
    { id: 'array-methods', name: 'Array Methods', icon: '📋' },
    { id: 'promises', name: 'Promises', icon: '⏰' },
    { id: 'modules', name: 'ES6 Modules', icon: '📦' },
    { id: 'dom-manipulation', name: 'DOM Manipulation', icon: '🎨' }
  ];

  const filteredPackages = installedPackages.filter(pkg =>
    pkg.name.toLowerCase().includes(packageSearchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar-panel" style={{ width: `${width}px` }}>
      {/* Tab Navigation */}
      <div className="sidebar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="sidebar-content">
        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="tab-panel files-panel">
            <div className="panel-header">
              <h3 className="panel-title">{t('sidebar.files')}</h3>
              <button 
                className="action-button"
                onClick={handleNewFile}
                title="Nuevo archivo"
              >
                ➕
              </button>
            </div>

            <div className="file-tree">
              <div className="file-item active">
                <span className="file-icon">📄</span>
                <span className="file-name">index.js</span>
              </div>
              <div className="file-item">
                <span className="file-icon">📋</span>
                <span className="file-name">package.json</span>
              </div>
            </div>

            <div className="section-divider"></div>

            <div className="examples-section">
              <h4 className="section-title">🧀 Ejemplos</h4>
              <div className="examples-list">
                {examples.map(example => (
                  <button
                    key={example.id}
                    className="example-item"
                    onClick={() => handleOpenExample(example.id)}
                  >
                    <span className="example-icon">{example.icon}</span>
                    <span className="example-name">{example.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div className="tab-panel packages-panel">
            <div className="panel-header">
              <h3 className="panel-title">{t('sidebar.packages')}</h3>
              <button 
                className="action-button"
                onClick={handleInstallPackage}
                title={t('packages.install', { package: '' })}
              >
                ➕
              </button>
            </div>

            {/* Search Packages */}
            <div className="search-section">
              <input
                type="text"
                className="search-input"
                placeholder={t('packages.search')}
                value={packageSearchQuery}
                onChange={(e) => setPackageSearchQuery(e.target.value)}
              />
            </div>

            {/* Installed Packages */}
            <div className="packages-list">
              {filteredPackages.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📦</span>
                  <p className="empty-text">
                    {packageSearchQuery ? 
                      'No se encontraron paquetes' : 
                      t('packages.noPackages')
                    }
                  </p>
                  {!packageSearchQuery && (
                    <button 
                      className="install-first-button"
                      onClick={handleInstallPackage}
                    >
                      Instalar primer paquete
                    </button>
                  )}
                </div>
              ) : (
                filteredPackages.map(pkg => (
                  <div key={pkg.name} className="package-item">
                    <div className="package-info">
                      <span className="package-icon">📦</span>
                      <div className="package-details">
                        <span className="package-name">{pkg.name}</span>
                        <span className="package-version">v{pkg.version}</span>
                      </div>
                    </div>
                    <button
                      className="package-action"
                      onClick={() => handleUninstallPackage(pkg.name)}
                      title={t('packages.uninstall', { package: pkg.name })}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Popular Packages */}
            <div className="section-divider"></div>
            <div className="popular-section">
              <h4 className="section-title">⭐ Populares</h4>
              <div className="popular-packages">
                {['lodash', 'axios', 'moment', 'ramda', 'uuid'].map(pkg => (
                  <button
                    key={pkg}
                    className="popular-package"
                    onClick={() => eventBus.emit('package:quick-install', { package: pkg })}
                  >
                    <span className="package-icon">📦</span>
                    <span className="package-name">{pkg}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-panel settings-panel">
            <div className="panel-header">
              <h3 className="panel-title">{t('sidebar.settings')}</h3>
            </div>

            <div className="settings-list">
              <button 
                className="setting-item"
                onClick={handleOpenSettings}
              >
                <span className="setting-icon">⚙️</span>
                <div className="setting-info">
                  <span className="setting-title">{t('settings.general')}</span>
                  <span className="setting-desc">Configuración general</span>
                </div>
                <span className="setting-arrow">›</span>
              </button>

              <button 
                className="setting-item"
                onClick={() => eventBus.emit('settings:editor-requested')}
              >
                <span className="setting-icon">📝</span>
                <div className="setting-info">
                  <span className="setting-title">{t('settings.editor')}</span>
                  <span className="setting-desc">Editor de código</span>
                </div>
                <span className="setting-arrow">›</span>
              </button>

              <button 
                className="setting-item"
                onClick={() => eventBus.emit('settings:appearance-requested')}
              >
                <span className="setting-icon">🎨</span>
                <div className="setting-info">
                  <span className="setting-title">{t('settings.appearance')}</span>
                  <span className="setting-desc">Themes y apariencia</span>
                </div>
                <span className="setting-arrow">›</span>
              </button>
            </div>

            <div className="section-divider"></div>

            <div className="app-info">
              <h4 className="section-title">ℹ️ Información</h4>
              <div className="info-item">
                <span className="info-label">Versión:</span>
                <span className="info-value">0.1.0</span>
              </div>
              <div className="info-item">
                <span className="info-label">Theme:</span>
                <span className="info-value">{currentTheme}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Idioma:</span>
                <span className="info-value">{i18nService.getCurrentLanguage()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Help Tab */}
        {activeTab === 'help' && (
          <div className="tab-panel help-panel">
            <div className="panel-header">
              <h3 className="panel-title">{t('sidebar.help')}</h3>
            </div>

            <div className="help-content">
              <div className="help-section">
                <h4 className="help-title">🚀 Inicio Rápido</h4>
                <ul className="help-list">
                  <li>Escribe código JavaScript en el editor</li>
                  <li>Presiona <kbd>Ctrl+Enter</kbd> para ejecutar</li>
                  <li>Ve los resultados en la consola</li>
                  <li>Instala paquetes npm con el botón 📦</li>
                </ul>
              </div>

              <div className="help-section">
                <h4 className="help-title">⌨️ Atajos</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <kbd>Ctrl+Enter</kbd>
                    <span>Ejecutar código</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl+B</kbd>
                    <span>Toggle sidebar</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl+`</kbd>
                    <span>Toggle consola</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl+Shift+P</kbd>
                    <span>Instalar paquete</span>
                  </div>
                </div>
              </div>

              <div className="help-section">
                <h4 className="help-title">🧀 Sobre CheeseJS</h4>
                <p className="help-text">
                  CheeseJS es un entorno de desarrollo JavaScript interactivo 
                  que permite ejecutar código, instalar paquetes npm y 
                  experimentar con JavaScript de forma rápida y sencilla.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarPanel;