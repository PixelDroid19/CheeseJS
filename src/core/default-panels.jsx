import { pluginRegistry } from './plugin-registry.js';

/**
 * Registrar paneles por defecto en el sistema de plugins
 */
export const registerDefaultPanels = async () => {
  console.log('🔌 Registrando paneles por defecto...');

  // Importación dinámica de paneles
  const modules = await Promise.all([
    import('../components/dev-panel/panels/output-panel.jsx'),
    import('../components/dev-panel/panels/terminal-panel.jsx'),
    import('../components/dev-panel/panels/problems-panel.jsx'),
    import('../components/dev-panel/panels/debug-panel.jsx'),
    import('../components/dev-panel/panels/ports-panel.jsx')
  ]);

  // Extraer componentes de los módulos importados
  const OutputPanel = modules[0].OutputPanel || modules[0].default;
  const TerminalPanel = modules[1].TerminalPanel || modules[1].default;
  const ProblemsPanel = modules[2].ProblemsPanel || modules[2].default;
  const DebugPanel = modules[3].DebugPanel || modules[3].default;
  const PortsPanel = modules[4].PortsPanel || modules[4].default;

  console.log('🔍 Componentes cargados:', {
    OutputPanel: typeof OutputPanel,
    TerminalPanel: typeof TerminalPanel,
    ProblemsPanel: typeof ProblemsPanel,
    DebugPanel: typeof DebugPanel,
    PortsPanel: typeof PortsPanel
  });

  const defaultPanels = [
    {
      id: 'problems',
      name: 'PROBLEMS',
      type: 'panel',
      icon: '⚠️',
      component: ProblemsPanel,
      disabled: false,
      showCount: true,
      priority: 1,
      description: 'Panel de problemas y errores',
      version: '1.0.0',
      actions: [
        {
          id: 'clear',
          name: 'Limpiar',
          icon: '🧹',
          handler: () => {
            console.log('Limpiando problemas...');
            // TODO: Implementar lógica de limpieza
          }
        }
      ]
    },
    {
      id: 'output',
      name: 'OUTPUT',
      type: 'panel',
      icon: '📄',
      component: OutputPanel,
      disabled: false,
      showCount: true,
      priority: 2,
      description: 'Panel de salida de ejecución',
      version: '1.0.0',
      actions: [
        {
          id: 'clear',
          name: 'Limpiar',
          icon: '🧹',
          handler: () => {
            console.log('Limpiando output...');
            // TODO: Implementar lógica de limpieza
          }
        },
        {
          id: 'export',
          name: 'Exportar',
          icon: '💾',
          handler: () => {
            console.log('Exportando output...');
            // TODO: Implementar exportación
          }
        }
      ]
    },
    {
      id: 'debug',
      name: 'DEBUG CONSOLE',
      type: 'panel',
      icon: '🐛',
      component: DebugPanel,
      disabled: false,
      showCount: true,
      priority: 3,
      description: 'Panel de debug y logs del sistema',
      version: '1.0.0',
      actions: [
        {
          id: 'clear',
          name: 'Limpiar',
          icon: '🧹',
          handler: () => {
            console.log('Limpiando debug...');
            // TODO: Implementar lógica de limpieza
          }
        },
        {
          id: 'filter',
          name: 'Filtrar',
          icon: '🔍',
          handler: () => {
            console.log('Filtrando logs...');
            // TODO: Implementar filtros
          }
        }
      ]
    },
    {
      id: 'terminal',
      name: 'TERMINAL',
      type: 'panel',
      icon: '🖥️',
      component: TerminalPanel,
      disabled: false,
      showCount: false,
      priority: 4,
      description: 'Terminal interactiva',
      version: '1.0.0',
      actions: [
        {
          id: 'clear',
          name: 'Limpiar',
          icon: '🧹',
          handler: () => {
            console.log('Limpiando terminal...');
            // TODO: Implementar lógica de limpieza
          }
        },
        {
          id: 'restart',
          name: 'Reiniciar',
          icon: '🔄',
          handler: () => {
            console.log('Reiniciando terminal...');
            // TODO: Implementar reinicio
          }
        }
      ]
    },
    {
      id: 'ports',
      name: 'PORTS',
      type: 'panel',
      icon: '🌐',
      component: PortsPanel,
      disabled: true, // Deshabilitado por defecto
      showCount: false,
      priority: 5,
      description: 'Panel de puertos y servicios',
      version: '1.0.0',
      actions: [
        {
          id: 'refresh',
          name: 'Actualizar',
          icon: '🔄',
          handler: () => {
            console.log('Actualizando puertos...');
            // TODO: Implementar actualización
          }
        }
      ]
    }
  ];

  // Registrar cada panel como plugin
  const registeredPanels = [];
  for (const panelConfig of defaultPanels) {
    try {
      // Verificar que el panel tiene un componente válido
      if (panelConfig.component && typeof panelConfig.component === 'function') {
        const plugin = pluginRegistry.registerPlugin(panelConfig);
        registeredPanels.push(plugin);
        console.log(`✅ Panel registrado: ${panelConfig.id}`);
      } else {
        console.warn(`⚠️ Panel ${panelConfig.id} no tiene componente válido, omitiendo...`, {
          component: typeof panelConfig.component,
          value: panelConfig.component
        });
      }
    } catch (error) {
      console.error(`❌ Error registrando panel ${panelConfig.id}:`, error);
    }
  }

  console.log(`🔌 ${registeredPanels.length} paneles registrados exitosamente`);
  return registeredPanels;
};