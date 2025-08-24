import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../layout/theme-provider.jsx';
import { configService } from '../../services/config-service.js';
import { i18nService } from '../../services/i18n-service.js';
import { eventBus } from '../../utils/event-bus.js';
import { PanelTabManager } from './panel-tab-manager.jsx';
import { OutputPanel } from './panels/output-panel.jsx';
import { TerminalPanel } from './panels/terminal-panel.jsx';
import { ProblemsPanel } from './panels/problems-panel.jsx';
import { DebugPanel } from './panels/debug-panel.jsx';
import { PortsPanel } from './panels/ports-panel.jsx';
import './dev-panel.css';

/**
 * DevPanel - Panel de Desarrollo Modular
 * Sistema extensible de paneles para desarrollo con arquitectura pluggable
 */
export const DevPanel = () => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('output');
  const [t, setT] = useState(() => (key, params) => key);
  const [isInitialized, setIsInitialized] = useState(false);

  // Estado para gestión de paneles
  const [registeredPanels, setRegisteredPanels] = useState(new Map());
  const [panelStates, setPanelStates] = useState(new Map());

  useEffect(() => {
    initializeDevPanel();
    
    // Suscribirse a eventos globales
    const unsubscribers = [
      eventBus.subscribe('i18n:language-changed', handleLanguageChange),
      eventBus.subscribe('theme:changed', handleThemeChange),
      eventBus.subscribe('devpanel:register-panel', handleRegisterPanel),
      eventBus.subscribe('devpanel:unregister-panel', handleUnregisterPanel),
      eventBus.subscribe('devpanel:switch-tab', handleSwitchTab),
      eventBus.subscribe('devpanel:update-panel-state', handleUpdatePanelState)
    ];

    return () => {
      cleanup();
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Inicializar DevPanel
   */
  const initializeDevPanel = async () => {
    try {
      await configService.initialize();
      await i18nService.initialize();
      setT(() => (key, params) => i18nService.t(key, params));
      
      // Cargar configuración
      const savedTab = configService.get('devpanel.activeTab', 'output');
      setActiveTab(savedTab);
      
      // Registrar paneles por defecto
      registerDefaultPanels();
      
      setIsInitialized(true);
      
      console.log('🛠️ DevPanel inicializado');
      eventBus.emit('devpanel:initialized', { timestamp: Date.now() });
      
    } catch (error) {
      console.error('❌ Error inicializando DevPanel:', error);
    }
  };

  /**
   * Registrar paneles por defecto
   */
  const registerDefaultPanels = () => {
    const defaultPanels = [
      {
        id: 'problems',
        name: 'PROBLEMS',
        icon: '⚠️',
        component: ProblemsPanel,
        disabled: false,
        showCount: true,
        priority: 1
      },
      {
        id: 'output',
        name: 'OUTPUT',
        icon: '📄',
        component: OutputPanel,
        disabled: false,
        showCount: true,
        priority: 2
      },
      {
        id: 'debug',
        name: 'DEBUG CONSOLE',
        icon: '🐛',
        component: DebugPanel,
        disabled: false,
        showCount: true,
        priority: 3
      },
      {
        id: 'terminal',
        name: 'TERMINAL',
        icon: '🖥️',
        component: TerminalPanel,
        disabled: false,
        showCount: false,
        priority: 4
      },
      {
        id: 'ports',
        name: 'PORTS',
        icon: '🌐',
        component: PortsPanel,
        disabled: true,
        showCount: false,
        priority: 5
      }
    ];

    defaultPanels.forEach(panel => {
      registerPanel(panel);
    });
  };

  /**
   * Registrar un nuevo panel
   */
  const registerPanel = (panelConfig) => {
    setRegisteredPanels(prev => {
      const newPanels = new Map(prev);
      newPanels.set(panelConfig.id, {
        ...panelConfig,
        registered: Date.now()
      });
      return newPanels;
    });

    // Inicializar estado del panel
    setPanelStates(prev => {
      const newStates = new Map(prev);
      if (!newStates.has(panelConfig.id)) {
        newStates.set(panelConfig.id, {
          count: 0,
          data: null,
          lastUpdate: Date.now()
        });
      }
      return newStates;
    });

    console.log(`🔌 Panel registrado: ${panelConfig.id}`);
  };

  /**
   * Desregistrar panel
   */
  const unregisterPanel = (panelId) => {
    setRegisteredPanels(prev => {
      const newPanels = new Map(prev);
      newPanels.delete(panelId);
      return newPanels;
    });

    setPanelStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(panelId);
      return newStates;
    });

    console.log(`🔌 Panel desregistrado: ${panelId}`);
  };

  /**
   * Cambiar pestaña activa
   */
  const switchTab = (tabId) => {
    const panel = registeredPanels.get(tabId);
    if (!panel || panel.disabled) return;

    console.log('🏷️ Cambiando a panel:', tabId);
    setActiveTab(tabId);
    configService.set('devpanel.activeTab', tabId);
    
    eventBus.emit('devpanel:tab-changed', { 
      previousTab: activeTab, 
      currentTab: tabId 
    });
  };

  /**
   * Actualizar estado de panel
   */
  const updatePanelState = (panelId, updates) => {
    setPanelStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(panelId) || {};
      newStates.set(panelId, {
        ...currentState,
        ...updates,
        lastUpdate: Date.now()
      });
      return newStates;
    });
  };

  /**
   * Event handlers
   */
  const handleLanguageChange = () => {
    setT(() => (key, params) => i18nService.t(key, params));
  };

  const handleThemeChange = () => {
    // Los paneles individuales manejan sus propios cambios de tema
    eventBus.emit('devpanel:theme-updated', { theme: currentTheme });
  };

  const handleRegisterPanel = (data) => {
    registerPanel(data.panel);
  };

  const handleUnregisterPanel = (data) => {
    unregisterPanel(data.panelId);
  };

  const handleSwitchTab = (data) => {
    switchTab(data.tabId);
  };

  const handleUpdatePanelState = (data) => {
    updatePanelState(data.panelId, data.updates);
  };

  /**
   * Obtener panel activo
   */
  const getActivePanel = () => {
    return registeredPanels.get(activeTab);
  };

  /**
   * Obtener paneles ordenados por prioridad
   */
  const getSortedPanels = () => {
    return Array.from(registeredPanels.values())
      .sort((a, b) => a.priority - b.priority);
  };

  /**
   * Renderizar contenido del panel
   */
  const renderPanelContent = () => {
    const activePanel = getActivePanel();
    if (!activePanel) return null;

    const Component = activePanel.component;
    const panelState = panelStates.get(activeTab) || {};
    
    return (
      <Component
        panelId={activeTab}
        state={panelState}
        updateState={(updates) => updatePanelState(activeTab, updates)}
        isActive={true}
      />
    );
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    console.log('🧹 Limpiando DevPanel...');
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
        panels={getSortedPanels()}
        activeTab={activeTab}
        panelStates={panelStates}
        onTabSwitch={switchTab}
        onTabAction={(action, panelId) => {
          eventBus.emit('devpanel:tab-action', { action, panelId });
        }}
      />

      {/* Panel Content */}
      <div className="dev-panel-content">
        {renderPanelContent()}
      </div>
    </div>
  );
};

/**
 * Hook para registrar paneles externos
 */
export const useDevPanel = () => {
  const registerPanel = (panelConfig) => {
    eventBus.emit('devpanel:register-panel', { panel: panelConfig });
  };

  const unregisterPanel = (panelId) => {
    eventBus.emit('devpanel:unregister-panel', { panelId });
  };

  const switchToPanel = (panelId) => {
    eventBus.emit('devpanel:switch-tab', { tabId: panelId });
  };

  const updatePanelState = (panelId, updates) => {
    eventBus.emit('devpanel:update-panel-state', { panelId, updates });
  };

  return {
    registerPanel,
    unregisterPanel,
    switchToPanel,
    updatePanelState
  };
};

export default DevPanel;