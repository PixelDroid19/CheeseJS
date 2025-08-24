import React, { useState, useEffect } from 'react';
import { Icon, Button } from '../../ui/index.js';
import { eventBus } from '../../../utils/event-bus.js';

/**
 * ExamplesModal Component
 */
export const ExamplesModal = ({ onClose }) => {
  const examples = [
    { id: 'hello-world', name: 'Hello World', icon: '👋', description: 'Primer programa básico' },
    { id: 'async-fetch', name: 'Async/Await + Fetch', icon: '🌐', description: 'Llamadas HTTP asíncronas' },
    { id: 'array-methods', name: 'Array Methods', icon: '📋', description: 'map, filter, reduce y más' },
    { id: 'promises', name: 'Promises', icon: '⏰', description: 'Programación asíncrona' },
    { id: 'modules', name: 'ES6 Modules', icon: '📦', description: 'Import/export de módulos' },
    { id: 'dom-manipulation', name: 'DOM Manipulation', icon: '🎨', description: 'Manipular elementos DOM' }
  ];

  const handleLoadExample = (exampleId) => {
    eventBus.emit('example:load-requested', { example: exampleId });
    onClose();
  };

  return (
    <div className="examples-modal">
      <div className="examples-header">
        <Icon name="code" size="large" />
        <div>
          <h2>Ejemplos de Código</h2>
          <p>Aprende JavaScript con ejemplos prácticos</p>
        </div>
      </div>

      <div className="examples-grid">
        {examples.map(example => (
          <div key={example.id} className="example-card">
            <div className="example-card-header">
              <span className="example-icon">{example.icon}</span>
              <h3>{example.name}</h3>
            </div>
            <p className="example-description">{example.description}</p>
            <Button
              variant="primary"
              size="small"
              onClick={() => handleLoadExample(example.id)}
              fullWidth
            >
              Cargar ejemplo
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * PackagesModal Component
 */
export const PackagesModal = ({ onClose }) => {
  const [installedPackages, setInstalledPackages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const unsubscribeInstalled = eventBus.subscribe('package:installed', (data) => {
      setInstalledPackages(prev => {
        const exists = prev.find(pkg => pkg.name === data.package);
        if (exists) return prev;
        return [...prev, { name: data.package, version: data.version || 'latest' }];
      });
    });

    const unsubscribeUninstalled = eventBus.subscribe('package:uninstalled', (data) => {
      setInstalledPackages(prev => prev.filter(pkg => pkg.name !== data.package));
    });

    return () => {
      unsubscribeInstalled();
      unsubscribeUninstalled();
    };
  }, []);

  const handleInstallPackage = async () => {
    if (!searchQuery.trim()) return;
    
    setIsInstalling(true);
    eventBus.emit('package:install-requested', { package: searchQuery.trim() });
    setSearchQuery('');
    setTimeout(() => setIsInstalling(false), 2000);
  };

  const handleUninstallPackage = (packageName) => {
    eventBus.emit('package:uninstall-requested', { package: packageName });
  };

  const handleQuickInstall = (packageName) => {
    eventBus.emit('package:quick-install', { package: packageName });
  };

  const popularPackages = ['lodash', 'axios', 'moment', 'ramda', 'uuid'];

  return (
    <div className="packages-modal">
      <div className="packages-header">
        <Icon name="package" size="large" />
        <div>
          <h2>Gestión de Paquetes</h2>
          <p>Instala y administra paquetes NPM</p>
        </div>
      </div>

      {/* Install Section */}
      <div className="install-section">
        <h3>Instalar Paquete</h3>
        <div className="install-form">
          <input
            type="text"
            placeholder="Nombre del paquete (ej: lodash, axios)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleInstallPackage()}
            className="package-input"
          />
          <Button
            variant="primary"
            onClick={handleInstallPackage}
            disabled={!searchQuery.trim() || isInstalling}
            loading={isInstalling}
          >
            Instalar
          </Button>
        </div>
      </div>

      {/* Popular Packages */}
      <div className="popular-section">
        <h3>Paquetes Populares</h3>
        <div className="popular-grid">
          {popularPackages.map(pkg => (
            <button
              key={pkg}
              className="popular-package"
              onClick={() => handleQuickInstall(pkg)}
            >
              <Icon name="package" size="small" />
              <span>{pkg}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Installed Packages */}
      <div className="installed-section">
        <h3>Paquetes Instalados ({installedPackages.length})</h3>
        {installedPackages.length === 0 ? (
          <div className="empty-state">
            <Icon name="package" size="large" />
            <p>No hay paquetes instalados</p>
            <p className="empty-hint">Instala tu primer paquete arriba</p>
          </div>
        ) : (
          <div className="installed-list">
            {installedPackages.map(pkg => (
              <div key={pkg.name} className="package-item">
                <div className="package-info">
                  <Icon name="package" size="small" />
                  <div>
                    <span className="package-name">{pkg.name}</span>
                    <span className="package-version">v{pkg.version}</span>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="small"
                  icon={<Icon name="delete" />}
                  onClick={() => handleUninstallPackage(pkg.name)}
                >
                  Desinstalar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ConfirmModal Component
 */
export const ConfirmModal = ({
  title = 'Confirmar acción',
  message = '¿Estás seguro de que quieres continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
  onClose
}) => {
  return (
    <div className="confirm-modal">
      <div className="confirm-content">
        <Icon 
          name={variant === 'danger' ? 'warning' : 'info'} 
          size="large" 
          color={variant === 'danger' ? 'var(--color-danger)' : 'var(--color-info)'} 
        />
        <div className="confirm-text">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
      </div>
      
      <div className="confirm-actions">
        <Button variant="secondary" onClick={onCancel || onClose}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </div>
  );
};

export default { ExamplesModal, PackagesModal, ConfirmModal };