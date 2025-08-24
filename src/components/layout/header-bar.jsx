import React, { useState, useEffect } from 'react';
import { useTheme } from './theme-provider.jsx';
import { useI18n } from '../../hooks/use-i18n.js';
import { Icon } from '../ui/index.js';
import './header-bar.css';

/**
 * Header Bar Component - Simplificado
 * Barra de encabezado con logo, breadcrumb y toggle console únicamente
 * Las demás acciones han sido migradas al FloatingToolbar
 */
export const HeaderBar = ({ 
  onToggleConsole, 
  showConsole 
}) => {
  const { currentTheme } = useTheme();
  const { t } = useI18n();

  // Solo manejar eventos básicos del header simplificado
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Escape - Solo para consistencia (sin menús que cerrar)
      if (event.key === 'Escape') {
        // Sin menús que cerrar en el header simplificado
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

      {/* Controles Centrales - Simplificado */}
      <div className="header-center">
        <div className="breadcrumb">
          <span className="breadcrumb-item">📄 index.js</span>
        </div>
      </div>

      {/* Controles de la Derecha - Solo Toggle Console */}
      <div className="header-right">
        <div className="control-group">
          {/* Toggle Console - Único control del header */}
          <button 
            className={`header-button icon-only ${showConsole ? 'active' : ''}`}
            onClick={onToggleConsole}
            title={t('toolbar.toggleConsole') + ' (Ctrl+`)'}
          >
            <Icon name="console" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;