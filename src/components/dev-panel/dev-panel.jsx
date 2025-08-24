import React, { useEffect, useState } from 'react';
import { useTheme } from '../layout/theme-provider.jsx';
import { useI18n } from '../../hooks/use-i18n.js';
import { useDevPanel } from '../../hooks/use-dev-panel-store.js';
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
    // Estado principal
    isInitialized,
    activeTab,
    
    // Helpers organizados
    panels,
    navigation,
    panelState,
    actions,
    
    // Acciones principales
    initialize,
    stats
  } = useDevPanel();

  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    initializeDevPanel();
  }, []);

  // Fallback: si un panel activo no tiene componente, intentar cargarlo dinámicamente
  useEffect(() => {
    const loadMissingComponent = async () => {
      const active = panels.active;
      if (!componentsLoaded || !active || active.component) return;

      try {
        let LoadedComponent = null;
        if (active.id === 'terminal') {
          const mod = await import('./panels/terminal-panel.jsx');
          LoadedComponent = mod.TerminalPanel || mod.default;
        } else if (active.id === 'output') {
          const mod = await import('./panels/output-panel.jsx');
          LoadedComponent = mod.OutputPanel || mod.default;
        } else if (active.id === 'problems') {
          const mod = await import('./panels/problems-panel.jsx');
          LoadedComponent = mod.ProblemsPanel || mod.default;
        } else if (active.id === 'debug') {
          const mod = await import('./panels/debug-panel.jsx');
          LoadedComponent = mod.DebugPanel || mod.default;
        } else if (active.id === 'ports') {
          const mod = await import('./panels/ports-panel.jsx');
          LoadedComponent = mod.PortsPanel || mod.default;
        }

        if (LoadedComponent && typeof LoadedComponent === 'function') {
          panels.register({ ...active, component: LoadedComponent });
          console.log(`🔧 Fallback cargó componente para panel: ${active.id}`);
        }
      } catch (e) {
        console.warn('⚠️ Fallback no pudo cargar componente del panel:', e);
      }
    };

    loadMissingComponent();
  }, [componentsLoaded, panels.activeId]);

  /**
   * Inicializar DevPanel
   */
  const initializeDevPanel = async () => {
    try {
      console.log('🛠️ Inicializando DevPanel con Zustand...');
      
      // Registrar paneles por defecto en el Plugin Registry primero
      await registerDefaultPanels();
      
      // Luego inicializar el store (cargará los paneles desde el registry)
      await initialize();
      
      // Marcar que los componentes están cargados
      setComponentsLoaded(true);
      
      console.log('🛠️ DevPanel inicializado con Zustand');
      console.log('📊 Estadísticas:', stats);
      
    } catch (error) {
      console.error('❌ Error inicializando DevPanel:', error);
      setLoadingError(error.message);
    }
  };

  /**
   * Manejar acción de pestaña
   */
  const handleTabAction = (tabId, actionId, params = {}) => {
    const success = actions.execute(tabId, actionId, params);
    if (!success) {
      console.warn(`⚠️ No se pudo ejecutar acción ${actionId} en panel ${tabId}`);
    }
  };

  /**
   * Renderizar contenido del panel
   */
  const renderPanelContent = () => {
    const activePanel = panels.active;
    
    // Mostrar error si hubo un problema de carga
    if (loadingError) {
      return (
        <div className="dev-panel-error">
          <div className="error-content">
            <span className="error-icon">❌</span>
            <p>Error cargando paneles</p>
            <small>{loadingError}</small>
          </div>
        </div>
      );
    }
    
    // Mostrar mensaje si no hay panel activo
    if (!activePanel) {
      return (
        <div className="dev-panel-empty">
          <p>No hay panel activo seleccionado</p>
        </div>
      );
    }

    // Verificar si los componentes están cargados
    if (!componentsLoaded) {
      return (
        <div className="dev-panel-loading">
          <div className="loading-content">
            <span className="loading-icon">🔌</span>
            <p>Cargando panel {activePanel.name}...</p>
            <small>Esperando componentes...</small>
          </div>
        </div>
      );
    }

    // Verificar si el panel tiene un componente válido
    const Component = activePanel.component;
    if (!Component) {
      return (
        <div className="dev-panel-loading">
          <div className="loading-content">
            <span className="loading-icon">🔌</span>
            <p>Componente no disponible para {activePanel.name}</p>
            <small>Verificando configuración...</small>
          </div>
        </div>
      );
    }

    // Verificar que el componente es una función válida
    if (typeof Component !== 'function') {
      return (
        <div className="dev-panel-error">
          <div className="error-content">
            <span className="error-icon">❌</span>
            <p>Componente inválido para {activePanel.name}</p>
            <small>Tipo: {typeof Component}</small>
          </div>
        </div>
      );
    }

    const currentPanelState = panelState.getActive();
    
    try {
      return (
        <Component
          panelId={activeTab}
          state={currentPanelState}
          updateState={panelState.updateActive}
          isActive={true}
        />
      );
    } catch (error) {
      console.error('❌ Error renderizando panel:', error);
      return (
        <div className="dev-panel-error">
          <div className="error-content">
            <span className="error-icon">❌</span>
            <p>Error cargando panel {activePanel.name}</p>
            <small>{error.message}</small>
          </div>
        </div>
      );
    }
  };

  // Mostrar mensaje de inicialización si el DevPanel no está listo
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
        panels={panels.available}
        activeTab={activeTab}
        panelStates={new Map(panels.available.map(p => [p.id, panelState.get(p.id)]))}
        onTabClick={navigation.switch}
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