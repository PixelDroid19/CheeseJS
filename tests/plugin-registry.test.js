/**
 * Tests para PluginRegistry
 * Valida el sistema de plugins extensible
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import PluginRegistry, { pluginRegistry } from '../src/core/plugin-registry.js';

// Mock del eventBus
vi.mock('../src/utils/event-bus.js', () => ({
  eventBus: {
    emit: vi.fn()
  }
}));

describe('PluginRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new PluginRegistry();
    vi.clearAllMocks();
  });

  describe('Registro de Plugins', () => {
    it('debería registrar un plugin básico', () => {
      const pluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        type: 'panel',
        component: () => null
      };

      const plugin = registry.registerPlugin(pluginConfig);

      expect(plugin).toMatchObject({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: 'panel',
        status: 'registered',
        registeredAt: expect.any(Number)
      });
      expect(registry.hasPlugin('test-plugin')).toBe(true);
    });

    it('debería validar campos requeridos', () => {
      expect(() => {
        registry.registerPlugin({ name: 'Test' }); // falta id y type
      }).toThrow('Plugin debe tener id, name y type');
    });

    it('debería sobrescribir plugin existente con advertencia', () => {
      const originalSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const pluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        type: 'panel',
        component: () => null
      };

      registry.registerPlugin(pluginConfig);
      registry.registerPlugin({ ...pluginConfig, name: 'Updated Plugin' });

      expect(originalSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plugin test-plugin ya está registrado')
      );
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin.name).toBe('Updated Plugin');
      
      originalSpy.mockRestore();
    });
  });

  describe('Plugins de Panel', () => {
    it('debería registrar panel plugin correctamente', () => {
      const TestComponent = () => null;
      const pluginConfig = {
        id: 'test-panel',
        name: 'Test Panel',
        type: 'panel',
        component: TestComponent,
        icon: '🧪',
        priority: 5,
        showCount: true
      };

      registry.registerPlugin(pluginConfig);

      const panelPlugins = registry.getPanelPlugins();
      expect(panelPlugins).toHaveLength(1);
      expect(panelPlugins[0]).toMatchObject({
        id: 'test-panel',
        name: 'Test Panel',
        icon: '🧪',
        priority: 5,
        showCount: true,
        plugin: true
      });
    });

    it('debería ordenar paneles por prioridad', () => {
      const panels = [
        { id: 'panel1', name: 'Panel 1', type: 'panel', component: () => null, priority: 1 },
        { id: 'panel2', name: 'Panel 2', type: 'panel', component: () => null, priority: 3 },
        { id: 'panel3', name: 'Panel 3', type: 'panel', component: () => null, priority: 2 }
      ];

      panels.forEach(panel => registry.registerPlugin(panel));

      const sortedPanels = registry.getPanelPlugins();
      expect(sortedPanels.map(p => p.id)).toEqual(['panel2', 'panel3', 'panel1']);
    });

    it('debería validar que panel tenga componente', () => {
      expect(() => {
        registry.registerPlugin({
          id: 'invalid-panel',
          name: 'Invalid Panel',
          type: 'panel'
          // falta component
        });
      }).toThrow('Panel plugin debe tener componente');
    });
  });

  describe('Plugins de Servicio', () => {
    it('debería registrar service plugin correctamente', () => {
      const mockService = { method: vi.fn() };
      const pluginConfig = {
        id: 'test-service',
        name: 'Test Service',
        type: 'service',
        service: mockService
      };

      registry.registerPlugin(pluginConfig);

      const service = registry.getService('test-service');
      expect(service).toBe(mockService);
    });

    it('debería validar que service tenga instancia', () => {
      expect(() => {
        registry.registerPlugin({
          id: 'invalid-service',
          name: 'Invalid Service',
          type: 'service'
          // falta service
        });
      }).toThrow('Service plugin debe tener instancia de servicio');
    });
  });

  describe('Plugins de Comando', () => {
    it('debería registrar command plugin correctamente', () => {
      const handler = vi.fn().mockResolvedValue('result');
      const pluginConfig = {
        id: 'test-command',
        name: 'Test Command',
        type: 'command',
        command: 'test',
        handler
      };

      registry.registerPlugin(pluginConfig);

      expect(registry.commandPlugins.has('test-command')).toBe(true);
    });

    it('debería ejecutar comando correctamente', async () => {
      const handler = vi.fn().mockResolvedValue('success');
      const pluginConfig = {
        id: 'test-command',
        name: 'Test Command',
        type: 'command',
        command: 'test',
        handler
      };

      registry.registerPlugin(pluginConfig);

      const result = await registry.executeCommand('test-command', { param: 'value' });

      expect(result).toBe('success');
      expect(handler).toHaveBeenCalledWith({ param: 'value' });
    });

    it('debería manejar errores en comandos', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Command failed'));
      const pluginConfig = {
        id: 'failing-command',
        name: 'Failing Command',
        type: 'command',
        command: 'fail',
        handler
      };

      registry.registerPlugin(pluginConfig);

      await expect(registry.executeCommand('failing-command')).rejects.toThrow('Command failed');
    });

    it('debería validar comando inexistente', async () => {
      await expect(registry.executeCommand('non-existent')).rejects.toThrow(
        'Comando non-existent no encontrado'
      );
    });
  });

  describe('Gestión de Plugins', () => {
    beforeEach(() => {
      registry.registerPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: 'panel',
        component: () => null
      });
    });

    it('debería desregistrar plugin correctamente', () => {
      const result = registry.unregisterPlugin('test-plugin');

      expect(result).toBe(true);
      expect(registry.hasPlugin('test-plugin')).toBe(false);
    });

    it('debería manejar desregistro de plugin inexistente', () => {
      const originalSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = registry.unregisterPlugin('non-existent');

      expect(result).toBe(false);
      expect(originalSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plugin non-existent no está registrado')
      );
      
      originalSpy.mockRestore();
    });

    it('debería alternar estado de plugin', () => {
      const result = registry.togglePlugin('test-plugin', false);

      expect(result).toBe(true);
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin.disabled).toBe(true);
    });

    it('debería obtener plugins por tipo', () => {
      registry.registerPlugin({
        id: 'service-plugin',
        name: 'Service Plugin',
        type: 'service',
        service: {}
      });

      const panelPlugins = registry.getPluginsByType('panel');
      const servicePlugins = registry.getPluginsByType('service');

      expect(panelPlugins).toHaveLength(1);
      expect(servicePlugins).toHaveLength(1);
      expect(panelPlugins[0].type).toBe('panel');
      expect(servicePlugins[0].type).toBe('service');
    });
  });

  describe('Estadísticas y Utilidades', () => {
    beforeEach(() => {
      registry.registerPlugin({
        id: 'panel1',
        name: 'Panel 1',
        type: 'panel',
        component: () => null
      });
      registry.registerPlugin({
        id: 'service1',
        name: 'Service 1',
        type: 'service',
        service: {}
      });
    });

    it('debería obtener estadísticas correctas', () => {
      const stats = registry.getStats();

      expect(stats).toMatchObject({
        totalPlugins: 2,
        panelPlugins: 1,
        servicePlugins: 1,
        commandPlugins: 0,
        pluginsByType: {
          panel: 1,
          service: 1,
          command: 0
        }
      });
    });

    it('debería limpiar todos los plugins', () => {
      registry.clear();

      expect(registry.getStats().totalPlugins).toBe(0);
      expect(registry.getPanelPlugins()).toHaveLength(0);
    });

    it('debería exportar e importar configuración', () => {
      const config = registry.exportConfig();

      expect(config).toMatchObject({
        panel1: {
          id: 'panel1',
          name: 'Panel 1',
          type: 'panel',
          disabled: false
        },
        service1: {
          id: 'service1',
          name: 'Service 1',
          type: 'service',
          disabled: false
        }
      });

      // Test import
      const newRegistry = new PluginRegistry();
      newRegistry.registerPlugin({
        id: 'panel1',
        name: 'Panel 1',
        type: 'panel',
        component: () => null
      });
      
      newRegistry.importConfig({ panel1: { disabled: true } });
      
      const plugin = newRegistry.getPlugin('panel1');
      expect(plugin.disabled).toBe(true);
    });
  });

  describe('Modo Debug', () => {
    it('debería activar/desactivar modo debug', () => {
      const originalSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      registry.setDebugMode(true);
      expect(originalSpy).toHaveBeenCalledWith(
        expect.stringContaining('PluginRegistry Debug: activado')
      );

      registry.setDebugMode(false);
      expect(originalSpy).toHaveBeenCalledWith(
        expect.stringContaining('PluginRegistry Debug: desactivado')
      );
      
      originalSpy.mockRestore();
    });
  });
});