/**
 * Tests para WebContainerService
 * Valida la funcionalidad del servicio unificado
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import WebContainerService from '../src/core/webcontainer-service.js';

// Mock del WebContainer API
vi.mock('@webcontainer/api', () => ({
  WebContainer: {
    boot: vi.fn().mockResolvedValue({
      mount: vi.fn().mockResolvedValue(undefined),
      spawn: vi.fn().mockResolvedValue({
        exit: Promise.resolve(0),
        output: {
          pipeTo: vi.fn()
        }
      }),
      fs: {
        writeFile: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue('test content')
      }
    })
  }
}));

describe('WebContainerService', () => {
  let service;

  beforeEach(() => {
    service = new WebContainerService();
    vi.clearAllMocks();
  });

  describe('Inicialización', () => {
    it('debería inicializar correctamente', async () => {
      const result = await service.initialize();
      
      expect(service.isWebContainerReady()).toBe(true);
      expect(service.isInitialized).toBe(true);
      expect(result).toBeDefined();
    });

    it('debería manejar errores de inicialización', async () => {
      const { WebContainer } = await import('@webcontainer/api');
      WebContainer.boot.mockRejectedValueOnce(new Error('Boot failed'));

      await expect(service.initialize()).rejects.toThrow('Boot failed');
    });
  });

  describe('Ejecución de Código', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('debería ejecutar código correctamente', async () => {
      const code = 'console.log("Hello World");';
      const result = await service.executeCode(code);

      expect(result).toMatchObject({
        exitCode: 0,
        success: true,
        executionTime: expect.any(Number),
        timestamp: expect.any(Number)
      });
    });

    it('debería prevenir ejecución concurrente', async () => {
      const code = 'console.log("Test");';
      
      // Simular ejecución en progreso
      service.isExecuting = true;
      
      await expect(service.executeCode(code)).rejects.toThrow('Ya hay código ejecutándose');
    });

    it('debería detener ejecución correctamente', async () => {
      service.currentProcess = { kill: vi.fn() };
      service.isExecuting = true;

      await service.stopExecution();

      expect(service.currentProcess.kill).toHaveBeenCalled();
      expect(service.isExecuting).toBe(false);
    });
  });

  describe('Gestión de Paquetes', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('debería instalar paquetes correctamente', async () => {
      const result = await service.installPackage('lodash');

      expect(result).toBe(true);
      expect(service.installedPackages.has('lodash')).toBe(true);
    });

    it('debería desinstalar paquetes correctamente', async () => {
      service.installedPackages.add('lodash');
      
      const result = await service.uninstallPackage('lodash');

      expect(result).toBe(true);
      expect(service.installedPackages.has('lodash')).toBe(false);
    });

    it('debería listar paquetes instalados', async () => {
      service.installedPackages.add('package1');
      service.installedPackages.add('package2');

      const packages = await service.listInstalledPackages();

      expect(packages).toContain('package1');
      expect(packages).toContain('package2');
    });
  });

  describe('Operaciones de Archivos', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('debería escribir archivos correctamente', async () => {
      await service.writeFile('test.js', 'console.log("test");');

      expect(service.webcontainerInstance.fs.writeFile).toHaveBeenCalledWith(
        'test.js',
        'console.log("test");'
      );
    });

    it('debería leer archivos correctamente', async () => {
      const content = await service.readFile('test.js');

      expect(content).toBe('test content');
      expect(service.webcontainerInstance.fs.readFile).toHaveBeenCalledWith(
        'test.js',
        'utf-8'
      );
    });
  });

  describe('Estado y Utilidades', () => {
    it('debería reportar estado correctamente antes de inicializar', () => {
      expect(service.isWebContainerReady()).toBe(false);
      expect(service.isSandboxInitialized()).toBe(false);
      expect(service.isTerminalServiceReady()).toBe(false);
    });

    it('debería reportar estado correctamente después de inicializar', async () => {
      await service.initialize();

      expect(service.isWebContainerReady()).toBe(true);
      expect(service.isSandboxInitialized()).toBe(true);
      expect(service.isTerminalServiceReady()).toBe(true);
    });

    it('debería obtener uso de recursos', async () => {
      await service.initialize();
      
      const usage = await service.getResourceUsage();

      expect(usage).toMatchObject({
        available: true,
        sandbox: true,
        terminal: true,
        executing: false,
        packages: 0,
        uptime: expect.any(Number)
      });
    });

    it('debería reiniciar sandbox correctamente', async () => {
      await service.initialize();
      service.installedPackages.add('test-package');

      await service.resetSandbox();

      expect(service.installedPackages.size).toBe(0);
    });

    it('debería destruir servicio correctamente', async () => {
      await service.initialize();
      
      await service.destroy();

      expect(service.isReady).toBe(false);
      expect(service.isInitialized).toBe(false);
    });
  });
});