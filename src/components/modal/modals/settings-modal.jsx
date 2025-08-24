import React, { useState, useEffect } from 'react';
import { useTheme } from '../../layout/theme-provider.jsx';
import { i18nService } from '../../../services/i18n-service.js';
import { eventBus } from '../../../utils/event-bus.js';
import { Button, Icon } from '../../ui/index.js';

/**
 * SettingsModal Component
 * Modal de configuraciones que reemplaza la pestaña de settings del sidebar
 */
export const SettingsModal = ({ onClose }) => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    theme: currentTheme,
    language: 'es',
    autoSave: true,
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    lineNumbers: true
  });
  const [t, setT] = useState(() => (key, params) => key);

  useEffect(() => {
    // Inicializar i18n
    const initializeI18n = async () => {
      await i18nService.initialize();
      setT(() => (key, params) => i18nService.t(key, params));
      setSettings(prev => ({
        ...prev,
        language: i18nService.getCurrentLanguage()
      }));
    };

    initializeI18n();

    // Suscribirse a cambios de idioma
    const unsubscribe = eventBus.subscribe('i18n:language-changed', (data) => {
      setT(() => (key, params) => i18nService.t(key, params));
      setSettings(prev => ({ ...prev, language: data.language }));
    });

    return () => unsubscribe();
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Aplicar cambios inmediatamente para algunos settings
    switch (key) {
      case 'theme':
        eventBus.emit('theme:change-requested', { theme: value });
        break;
      case 'language':
        eventBus.emit('i18n:change-language', { language: value });
        break;
      case 'fontSize':
      case 'tabSize':
      case 'wordWrap':
      case 'minimap':
      case 'lineNumbers':
        eventBus.emit('editor:setting-changed', { key, value });
        break;
    }
  };

  const handleSave = () => {
    // Guardar configuraciones en localStorage
    localStorage.setItem('cheeseJS:settings', JSON.stringify(settings));
    eventBus.emit('settings:saved', settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      theme: 'light',
      language: 'es',
      autoSave: true,
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      minimap: true,
      lineNumbers: true
    };
    setSettings(defaultSettings);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'editor', label: 'Editor', icon: 'code' },
    { id: 'appearance', label: 'Apariencia', icon: 'theme' },
    { id: 'advanced', label: 'Avanzado', icon: 'tools' }
  ];

  const themes = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'auto', label: 'Auto (Sistema)' }
  ];

  const languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' }
  ];

  return (
    <div className="settings-modal">
      {/* Tabs */}
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size="small" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="settings-section">
            <h3>Configuración General</h3>
            
            <div className="setting-group">
              <label className="setting-label">
                <Icon name="language" size="small" />
                Idioma
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="setting-select"
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
                <span className="setting-checkbox-mark"></span>
                <span>Guardado automático</span>
              </label>
              <p className="setting-description">
                Guardar automáticamente los cambios en el editor
              </p>
            </div>
          </div>
        )}

        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="settings-section">
            <h3>Configuración del Editor</h3>
            
            <div className="setting-group">
              <label className="setting-label">
                <Icon name="edit" size="small" />
                Tamaño de fuente
              </label>
              <input
                type="number"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                className="setting-input"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <Icon name="code" size="small" />
                Tamaño de tab
              </label>
              <select
                value={settings.tabSize}
                onChange={(e) => handleSettingChange('tabSize', parseInt(e.target.value))}
                className="setting-select"
              >
                <option value={2}>2 espacios</option>
                <option value={4}>4 espacios</option>
                <option value={8}>8 espacios</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={(e) => handleSettingChange('wordWrap', e.target.checked)}
                />
                <span className="setting-checkbox-mark"></span>
                <span>Ajuste de línea</span>
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.lineNumbers}
                  onChange={(e) => handleSettingChange('lineNumbers', e.target.checked)}
                />
                <span className="setting-checkbox-mark"></span>
                <span>Números de línea</span>
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.minimap}
                  onChange={(e) => handleSettingChange('minimap', e.target.checked)}
                />
                <span className="setting-checkbox-mark"></span>
                <span>Minimapa</span>
              </label>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h3>Apariencia</h3>
            
            <div className="setting-group">
              <label className="setting-label">
                <Icon name="theme" size="small" />
                Tema
              </label>
              <div className="theme-selector">
                {themes.map(theme => (
                  <label key={theme.value} className="theme-option">
                    <input
                      type="radio"
                      name="theme"
                      value={theme.value}
                      checked={settings.theme === theme.value}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                    />
                    <span className={`theme-preview theme-preview--${theme.value}`}></span>
                    <span>{theme.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">Información del tema actual</label>
              <div className="current-theme-info">
                <Icon name="theme" />
                <span>Tema actual: {currentTheme}</span>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="settings-section">
            <h3>Configuración Avanzada</h3>
            
            <div className="setting-group">
              <label className="setting-label">
                <Icon name="info" size="small" />
                Información de la aplicación
              </label>
              <div className="app-info">
                <div className="info-item">
                  <span>Versión:</span>
                  <span>0.1.0</span>
                </div>
                <div className="info-item">
                  <span>Tema actual:</span>
                  <span>{currentTheme}</span>
                </div>
                <div className="info-item">
                  <span>Idioma:</span>
                  <span>{settings.language}</span>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <Icon name="tools" size="small" />
                Acciones
              </label>
              <div className="action-buttons">
                <Button 
                  variant="warning" 
                  size="small"
                  icon={<Icon name="refresh" />}
                  onClick={handleReset}
                >
                  Restaurar por defecto
                </Button>
                <Button 
                  variant="secondary" 
                  size="small"
                  icon={<Icon name="download" />}
                  onClick={() => {
                    const dataStr = JSON.stringify(settings, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'cheeseJS-settings.json';
                    link.click();
                  }}
                >
                  Exportar configuración
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
};

export default SettingsModal;