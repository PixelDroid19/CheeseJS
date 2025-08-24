import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../layout/theme-provider.jsx';
import { useI18n } from '../../hooks/use-i18n.js';
import { useDevPanel } from '../../hooks/use-dev-panel.js';
import { useEventGroup } from '../../hooks/use-event-manager.js';
import { registerDefaultPanels } from '../../core/default-panels.jsx';
import { PanelTabManager } from './panel-tab-manager.jsx';
import './dev-panel.css';

/**
 * DevPanel - Panel de Desarrollo Modular Refactorizado
 * Sistema extensible de paneles con arquitectura de plugins
 */
export const DevPanel = () => {
  const { currentTheme } = useTheme();
  const { t, isReady: i18nReady } = useI18n();
  const {
    activeTab,
    panels,
    availablePanels,
    isInitialized,
    switchTab,
    updatePanelState,
    getPanelState,
    executePanelAction,
    getDevPanelStats
  } = useDevPanel();

  // Usar EventManager para eventos del DevPanel
  const { emit } = useEventGroup('dev-panel', 'DEVPANEL', {
    registerPanel: (data) => {
      console.log('📝 Panel registrado desde evento:', data);
    },
    unregisterPanel: (data) => {
      console.log('📝 Panel desregistrado desde evento:', data);
    },
    switchTab: (data) => {
      if (data.tabId) {
        switchTab(data.tabId);
      }
    },
    updatePanelState: (data) => {
      if (data.panelId && data.updates) {
        updatePanelState(data.panelId, data.updates);
      }
    }
  }, [switchTab, updatePanelState]);

  useEffect(() => {
    initializeDevPanel();
  }, []);

  /**
   * Inicializar DevPanel
   */
  const initializeDevPanel = async () => {
    try {
      console.log('🛠️ Inicializando DevPanel con sistema de plugins...');
      
      // Registrar paneles por defecto como plugins
      await registerDefaultPanels();
      
      console.log('🛠️ DevPanel inicializado con plugins');
      console.log('📊 Estadísticas:', getDevPanelStats());
      
    } catch (error) {
      console.error('❌ Error inicializando DevPanel:', error);
    }
  };

  /**
   * Manejar acción de pestaña
   */
  const handleTabAction = (tabId, actionId, params = {}) => {
    const success = executePanelAction(tabId, actionId, params);
    if (!success) {
      console.warn(`⚠️ No se pudo ejecutar acción ${actionId} en panel ${tabId}`);
    }
  };

  /**
   * Obtener panel activo
   */
  const getActivePanel = () => {
    return availablePanels.find(panel => panel.id === activeTab);
  };

  /**
   * Renderizar contenido del panel
   */
  const renderPanelContent = () => {
    const activePanel = getActivePanel();
    if (!activePanel) return null;

    const Component = activePanel.component;
    const panelState = getPanelState(activeTab);
    
    return (
      <Component
        panelId={activeTab}
        state={panelState}
        updateState={(updates) => updatePanelState(activeTab, updates)}
        isActive={true}
      />
    );
  };

  if (!isInitialized) {
    return (
      <div className="dev-panel-loading">
        <div className="loading-content">
          <span className="loading-icon">🛠️</span>
          <p>Inicializando Panel de Desarrollo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-panel" data-theme={currentTheme}>
      {/* Tab Manager */}
      <PanelTabManager
        panels={availablePanels}
        activeTab={activeTab}
        panelStates={new Map(availablePanels.map(p => [p.id, getPanelState(p.id)]))}
        onTabClick={switchTab}
        onTabAction={handleTabAction}
        t={t}
      />

      {/* Panel Content */}
      <div className="dev-panel-content">
        {renderPanelContent()}
      </div>
    </div>
  );
};

export default DevPanel;