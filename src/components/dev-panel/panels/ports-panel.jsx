import React, { useState, useEffect } from 'react';
import { eventBus } from '../../../utils/event-bus.js';
import './ports-panel.css';

/**
 * PortsPanel - Panel de puertos
 * Panel modular para gestionar puertos y servicios
 */
export const PortsPanel = ({ panelId, state, updateState, isActive }) => {
  const [ports, setPorts] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    // Suscribirse a eventos de puertos
    const unsubscribers = [
      eventBus.subscribe('ports:discovered', handlePortsDiscovered),
      eventBus.subscribe('service:started', handleServiceStarted),
      eventBus.subscribe('service:stopped', handleServiceStopped),
      eventBus.subscribe('devpanel:tab-action', handleTabAction)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    updateState({ count: ports.length + services.length });
  }, [ports.length, services.length]);

  const handlePortsDiscovered = (data) => {
    setPorts(data.ports || []);
  };

  const handleServiceStarted = (data) => {
    const service = {
      id: Date.now() + Math.random(),
      name: data.name,
      port: data.port,
      url: data.url,
      status: 'running',
      startTime: new Date()
    };
    
    setServices(prev => [...prev, service]);
  };

  const handleServiceStopped = (data) => {
    setServices(prev => prev.filter(service => service.port !== data.port));
  };

  const handleTabAction = (data) => {
    if (data.panelId !== panelId) return;
    
    if (data.action === 'clear') {
      setPorts([]);
      setServices([]);
    }
  };

  return (
    <div className="ports-panel">
      <div className="ports-content">
        <div className="empty-state">
          <span className="empty-icon">🌐</span>
          <p>Gestión de Puertos</p>
          <small>Funcionalidad próximamente disponible</small>
          <div className="coming-soon">
            <h4>Características planeadas:</h4>
            <ul>
              <li>🔍 Detección automática de puertos</li>
              <li>🌐 Gestión de servicios web</li>
              <li>📊 Monitoreo de estado</li>
              <li>🔗 Enlaces directos a servicios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortsPanel;