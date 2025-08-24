import React from 'react';
import './panel-tab-manager.css';

/**
 * PanelTabManager - Gestor de pestañas del DevPanel
 * Componente reutilizable para gestionar pestañas de paneles
 */
export const PanelTabManager = ({
  panels = [],
  activeTab,
  panelStates = new Map(),
  onTabClick, // Mantener compatibilidad con onTabClick
  onTabSwitch, // Y también soportar onTabSwitch 
  onTabAction,
  t = (key) => key // Función de traducción por defecto
}) => {
  
  /**
   * Manejar cambio de pestaña con compatibilidad
   */
  const handleTabSwitch = (panelId) => {
    if (onTabSwitch) {
      onTabSwitch(panelId);
    } else if (onTabClick) {
      onTabClick(panelId);
    }
  };

  /**
   * Obtener conteo de un panel
   */
  const getPanelCount = (panelId) => {
    const state = panelStates.get(panelId);
    return state?.count || 0;
  };

  /**
   * Verificar si un panel tiene notificaciones
   */
  const hasNotifications = (panelId) => {
    const count = getPanelCount(panelId);
    return count > 0;
  };

  /**
   * Renderizar acciones de panel
   */
  const renderPanelActions = () => {
    const activePanel = panels.find(p => p.id === activeTab);
    if (!activePanel || !activePanel.name) return null;

    return (
      <div className="panel-actions">
        {/* Acción de limpiar */}
        <button 
          className="action-btn"
          onClick={() => onTabAction && onTabAction(activeTab, 'clear')}
          title={t ? t('clear_panel', { panel: activePanel.name.toLowerCase() }) : `Limpiar ${activePanel.name.toLowerCase()}`}
        >
          🗑️
        </button>
        
        {/* Acción específica del panel */}
        {activePanel.id === 'terminal' && (
          <button 
            className="action-btn"
            onClick={() => onTabAction && onTabAction(activeTab, 'reset')}
            title={t ? t('reset_terminal') : "Reinicializar terminal"}
          >
            🔄
          </button>
        )}
        
        {activePanel.id === 'output' && (
          <button 
            className="action-btn"
            onClick={() => onTabAction && onTabAction(activeTab, 'test')}
            title={t ? t('generate_test_logs') : "Generar logs de prueba"}
          >
            🧪
          </button>
        )}
        
        {/* Acción de configuración */}
        <button 
          className="action-btn"
          onClick={() => onTabAction && onTabAction(activeTab, 'settings')}
          title={t ? t('configure_panel', { panel: activePanel.name.toLowerCase() }) : `Configurar ${activePanel.name.toLowerCase()}`}
        >
          ⚙️
        </button>
      </div>
    );
  };

  return (
    <div className="panel-tab-manager">
      {/* Lista de pestañas */}
      <div className="tabs-container">
        <div className="tabs-list">
          {panels.map(panel => (
            <button
              key={panel.id}
              className={`
                panel-tab 
                ${activeTab === panel.id ? 'active' : ''} 
                ${panel.disabled ? 'disabled' : ''}
                ${hasNotifications(panel.id) ? 'has-notifications' : ''}
              `}
              onClick={() => !panel.disabled && handleTabSwitch(panel.id)}
              disabled={panel.disabled}
              title={panel.disabled ? 'Funcionalidad próximamente' : panel.name}
              data-panel-id={panel.id}
            >
              {/* Icono del panel */}
              <span className="panel-icon">{panel.icon}</span>
              
              {/* Nombre del panel */}
              <span className="panel-name">{panel.name}</span>
              
              {/* Contador de notificaciones */}
              {panel.showCount && hasNotifications(panel.id) && (
                <span className="panel-count">
                  {getPanelCount(panel.id)}
                </span>
              )}
              
              {/* Indicador de estado */}
              {panel.disabled && (
                <span className="panel-status disabled" title="Deshabilitado">
                  🚫
                </span>
              )}
              
              {panel.id === activeTab && !panel.disabled && (
                <span className="panel-status active" title="Activo">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Indicador de tab activa */}
        <div className="active-tab-indicator" />
      </div>

      {/* Acciones del panel */}
      {renderPanelActions()}
    </div>
  );
};

export default PanelTabManager;