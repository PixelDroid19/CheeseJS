import { pluginRegistry } from './plugin-registry.js';

// Importación dinámica de paneles para evitar dependencias circulares
let OutputPanel, TerminalPanel, ProblemsPanel, DebugPanel, PortsPanel;

const loadPanels = async () => {
  try {
    // Importación dinámica de paneles
    const modules = await Promise.all([
      import('../components/dev-panel/panels/output-panel.jsx'),
      import('../components/dev-panel/panels/terminal-panel.jsx'),
      import('../components/dev-panel/panels/problems-panel.jsx'),
      import('../components/dev-panel/panels/debug-panel.jsx'),
      import('../components/dev-panel/panels/ports-panel.jsx')
    ]);

    OutputPanel = modules[0].OutputPanel;
    TerminalPanel = modules[1].TerminalPanel;
    ProblemsPanel = modules[2].ProblemsPanel;
    DebugPanel = modules[3].DebugPanel;
    PortsPanel = modules[4].PortsPanel;

  } catch (error) {
    console.warn('⚠️ Algunos paneles no se pudieron cargar:', error);
  }
};

/**
 * Registrar paneles por defecto en el sistema de plugins
 */
export const registerDefaultPanels = async () => {
  console.log('🔌 Registrando paneles por defecto...');

  // Cargar paneles
  await loadPanels();

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
      if (panelConfig.component) {
        const plugin = pluginRegistry.registerPlugin(panelConfig);
        registeredPanels.push(plugin);
        console.log(`✅ Panel registrado: ${panelConfig.id}`);
      } else {
        console.warn(`⚠️ Panel ${panelConfig.id} no tiene componente, omitiendo...`);
      }
    } catch (error) {
      console.error(`❌ Error registrando panel ${panelConfig.id}:`, error);
    }
  }

  console.log(`🔌 ${registeredPanels.length} paneles registrados exitosamente`);
  return registeredPanels;
};

/**
 * Crear un panel personalizado
 */
export const createCustomPanel = (config) => {
  if (!config.id || !config.name || !config.component) {
    throw new Error('Panel personalizado debe tener id, name y component');
  }

  const panelConfig = {
    type: 'panel',
    disabled: false,
    showCount: false,
    priority: 0,
    description: 'Panel personalizado',
    version: '1.0.0',
    actions: [],
    ...config
  };

  return pluginRegistry.registerPlugin(panelConfig);
};

/**
 * Ejemplo de panel personalizado simple
 */
export const createExamplePanel = () => {
  const ExampleComponent = () => {
    return (
      <div style={{ padding: '16px' }}>
        <h3>Panel de Ejemplo</h3>
        <p>Este es un panel personalizado creado dinámicamente.</p>
      </div>
    );
  };

  return createCustomPanel({
    id: 'example',
    name: 'EXAMPLE',
    icon: '🎯',
    component: ExampleComponent,
    priority: 10,
    description: 'Panel de ejemplo para demostrar extensibilidad',
    actions: [
      {
        id: 'hello',
        name: 'Saludar',
        icon: '👋',
        handler: () => alert('¡Hola desde el panel de ejemplo!')
      }
    ]
  });
};

export default { registerDefaultPanels, createCustomPanel, createExamplePanel };