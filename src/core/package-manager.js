/**
 * Package Manager - Gestión de paquetes npm en WebContainer
 * Maneja instalación, desinstalación y listado de paquetes
 */
class PackageManager {
  constructor(webContainerManager) {
    this.webContainerManager = webContainerManager;
    this.installedPackages = new Set();
    this.eventCallbacks = new Map();
  }

  /**
   * Instalar un paquete npm
   * @param {string} packageName - Nombre del paquete a instalar
   * @param {string} version - Versión específica (opcional)
   * @returns {Promise<boolean>} - True si la instalación fue exitosa
   */
  async installPackage(packageName, version = 'latest') {
    try {
      const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`;
      
      console.log(`📦 Instalando paquete: ${packageSpec}`);
      this.emit('package:installing', { package: packageName, version });

      const installProcess = await this.webContainerManager.spawn('npm', ['install', packageSpec]);
      
      // Escuchar output del proceso de instalación
      if (installProcess.output) {
        installProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            console.log(`📦 npm install: ${data}`);
            this.emit('package:install-output', { package: packageName, output: data });
          }
        }));
      }

      const exitCode = await installProcess.exit;
      
      if (exitCode === 0) {
        this.installedPackages.add(packageName);
        console.log(`✅ Paquete ${packageName} instalado correctamente`);
        this.emit('package:installed', { package: packageName, version });
        return true;
      } else {
        console.error(`❌ Error al instalar ${packageName}. Código de salida: ${exitCode}`);
        this.emit('package:install-error', { package: packageName, exitCode });
        return false;
      }
    } catch (error) {
      console.error(`❌ Error durante la instalación de ${packageName}:`, error);
      this.emit('package:install-error', { package: packageName, error: error.message });
      return false;
    }
  }

  /**
   * Instalar múltiples paquetes
   * @param {string[]} packages - Array de nombres de paquetes
   * @returns {Promise<Object>} - Resultado de las instalaciones
   */
  async installPackages(packages) {
    const results = {
      successful: [],
      failed: []
    };

    for (const pkg of packages) {
      const success = await this.installPackage(pkg);
      if (success) {
        results.successful.push(pkg);
      } else {
        results.failed.push(pkg);
      }
    }

    return results;
  }

  /**
   * Desinstalar un paquete
   * @param {string} packageName - Nombre del paquete a desinstalar
   * @returns {Promise<boolean>}
   */
  async uninstallPackage(packageName) {
    try {
      console.log(`🗑️ Desinstalando paquete: ${packageName}`);
      this.emit('package:uninstalling', { package: packageName });

      const uninstallProcess = await this.webContainerManager.spawn('npm', ['uninstall', packageName]);
      const exitCode = await uninstallProcess.exit;

      if (exitCode === 0) {
        this.installedPackages.delete(packageName);
        console.log(`✅ Paquete ${packageName} desinstalado correctamente`);
        this.emit('package:uninstalled', { package: packageName });
        return true;
      } else {
        console.error(`❌ Error al desinstalar ${packageName}. Código de salida: ${exitCode}`);
        this.emit('package:uninstall-error', { package: packageName, exitCode });
        return false;
      }
    } catch (error) {
      console.error(`❌ Error durante la desinstalación de ${packageName}:`, error);
      this.emit('package:uninstall-error', { package: packageName, error: error.message });
      return false;
    }
  }

  /**
   * Listar paquetes instalados
   * @returns {Promise<Object>} - Lista de paquetes instalados
   */
  async listInstalled() {
    try {
      const listProcess = await this.webContainerManager.spawn('npm', ['list', '--json', '--depth=0']);
      
      let output = '';
      if (listProcess.output) {
        listProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            output += data;
          }
        }));
      }

      await listProcess.exit;
      
      try {
        const packageInfo = JSON.parse(output);
        return packageInfo.dependencies || {};
      } catch (parseError) {
        console.warn('No se pudo parsear la lista de paquetes, devolviendo lista local');
        return Array.from(this.installedPackages);
      }
    } catch (error) {
      console.error('❌ Error al listar paquetes instalados:', error);
      return Array.from(this.installedPackages);
    }
  }

  /**
   * Verificar si un paquete está instalado
   * @param {string} packageName - Nombre del paquete
   * @returns {boolean}
   */
  isPackageInstalled(packageName) {
    return this.installedPackages.has(packageName);
  }

  /**
   * Obtener información de un paquete desde npm registry
   * @param {string} packageName - Nombre del paquete
   * @returns {Promise<Object>} - Información del paquete
   */
  async getPackageInfo(packageName) {
    try {
      const infoProcess = await this.webContainerManager.spawn('npm', ['view', packageName, '--json']);
      
      let output = '';
      if (infoProcess.output) {
        infoProcess.output.pipeTo(new WritableStream({
          write: (data) => {
            output += data;
          }
        }));
      }

      await infoProcess.exit;
      return JSON.parse(output);
    } catch (error) {
      console.error(`❌ Error al obtener información del paquete ${packageName}:`, error);
      return null;
    }
  }

  /**
   * Actualizar package.json con dependencias instaladas
   * @returns {Promise<void>}
   */
  async updatePackageJson() {
    try {
      const packageJsonContent = await this.webContainerManager.readFile('package.json');
      const packageJson = JSON.parse(packageJsonContent);
      
      // Obtener dependencias actuales
      const installed = await this.listInstalled();
      
      if (typeof installed === 'object' && installed !== null) {
        packageJson.dependencies = { ...packageJson.dependencies, ...installed };
      }
      
      await this.webContainerManager.writeFile('package.json', JSON.stringify(packageJson, null, 2));
      console.log('📄 package.json actualizado');
    } catch (error) {
      console.error('❌ Error al actualizar package.json:', error);
    }
  }

  /**
   * Registrar callback para eventos
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
  }

  /**
   * Emitir evento
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   */
  emit(event, data) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback del evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Limpiar paquetes instalados (reset)
   */
  clearInstalledPackages() {
    this.installedPackages.clear();
    console.log('🧹 Lista de paquetes instalados limpiada');
  }
}

export default PackageManager;