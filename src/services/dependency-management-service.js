/**
 * DependencyManagementService - Gestión inteligente de dependencias
 * Detecta paquetes faltantes, sugiere instalaciones y gestiona el estado de dependencias
 */
class DependencyManagementService {
  constructor() {
    this.installedPackages = new Set(['@types/node']);
    this.packageRegistry = new Map();
    this.installationQueue = new Map();
    this.installationHistory = [];
    
    // Cache de análisis de dependencias
    this.analysisCache = new Map();
    this.maxCacheSize = 50;
    
    // Configuración
    this.config = {
      autoInstallSuggestions: true,
      checkForUpdates: false,
      respectSemver: true,
      timeoutMs: 30000,
      retryAttempts: 3
    };

    // Patrones de importación/require
    this.importPatterns = {
      es6Import: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g,
      require: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      dynamicImport: /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      nodeModules: /node_modules\/([^\/]+)/g
    };

    // Base de datos de paquetes conocidos
    this.knownPackages = new Map([
      ['react', {
        description: 'Librería para construir interfaces de usuario',
        category: 'ui-framework',
        dependencies: ['react-dom'],
        types: '@types/react',
        commonUsage: ['jsx', 'tsx'],
        installCommand: 'npm install react react-dom'
      }],
      ['lodash', {
        description: 'Librería de utilidades JavaScript',
        category: 'utility',
        types: '@types/lodash',
        commonUsage: ['javascript', 'typescript'],
        installCommand: 'npm install lodash'
      }],
      ['axios', {
        description: 'Cliente HTTP basado en promesas',
        category: 'http-client',
        types: '@types/axios',
        commonUsage: ['javascript', 'typescript'],
        installCommand: 'npm install axios'
      }],
      ['express', {
        description: 'Framework web para Node.js',
        category: 'server-framework',
        dependencies: ['@types/express'],
        commonUsage: ['javascript', 'typescript'],
        installCommand: 'npm install express'
      }],
      ['moment', {
        description: 'Librería para manejo de fechas',
        category: 'date-utility',
        types: '@types/moment',
        commonUsage: ['javascript', 'typescript'],
        installCommand: 'npm install moment',
        alternatives: ['date-fns', 'dayjs']
      }]
    ]);

    // Módulos nativos de Node.js que no requieren instalación
    this.nativeModules = new Set([
      'fs', 'path', 'os', 'crypto', 'util', 'events', 'stream', 'buffer',
      'url', 'querystring', 'http', 'https', 'net', 'dns', 'cluster',
      'child_process', 'worker_threads', 'readline', 'zlib', 'assert'
    ]);
  }

  /**
   * Analizar dependencias en código fuente
   */
  async analyzeDependencies(code, language = 'javascript') {
    const cacheKey = `${language}_${this.hashCode(code)}`;
    
    // Verificar cache
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const analysis = {
      dependencies: new Set(),
      missing: [],
      suggestions: [],
      warnings: [],
      conflicts: [],
      metadata: {
        totalImports: 0,
        nativeModules: 0,
        thirdPartyPackages: 0,
        localImports: 0,
        analysisTime: Date.now()
      }
    };

    try {
      // Extraer todas las dependencias
      const extractedDeps = this.extractDependencies(code);
      analysis.dependencies = extractedDeps.dependencies;
      analysis.metadata = { ...analysis.metadata, ...extractedDeps.metadata };

      // Filtrar dependencias que necesitan instalación
      const thirdPartyDeps = Array.from(analysis.dependencies).filter(dep => 
        !this.isNativeModule(dep) && 
        !this.isLocalImport(dep) &&
        !this.isInstalled(dep)
      );

      // Generar análisis detallado
      for (const dep of thirdPartyDeps) {
        const packageInfo = await this.getPackageInfo(dep);
        
        if (!packageInfo.exists) {
          analysis.missing.push({
            name: dep,
            reason: 'Package not found in registry',
            severity: 'error',
            suggested: false
          });
          continue;
        }

        // Verificar si está instalado
        if (!this.isInstalled(dep)) {
          const suggestion = {
            name: dep,
            description: packageInfo.description || `Install ${dep} package`,
            category: packageInfo.category || 'unknown',
            installCommand: packageInfo.installCommand || `npm install ${dep}`,
            priority: this.calculateInstallPriority(dep, language),
            estimatedSize: packageInfo.size || 'unknown',
            dependencies: packageInfo.dependencies || [],
            types: packageInfo.types,
            alternatives: packageInfo.alternatives || []
          };

          analysis.suggestions.push(suggestion);
          analysis.missing.push({
            name: dep,
            reason: 'Not installed',
            severity: 'warning',
            suggested: true,
            suggestion
          });
        }

        // Verificar tipos TypeScript
        if ((language === 'typescript' || language === 'tsx') && packageInfo.types) {
          if (!this.isInstalled(packageInfo.types)) {
            analysis.suggestions.push({
              name: packageInfo.types,
              description: `Definiciones de tipos para ${dep}`,
              category: 'types',
              installCommand: `npm install -D ${packageInfo.types}`,
              priority: 'medium',
              parentPackage: dep
            });
          }
        }
      }

      // Detectar conflictos potenciales
      analysis.conflicts = this.detectConflicts(Array.from(analysis.dependencies));

      // Guardar en cache
      this.setCacheResult(cacheKey, analysis);

      return analysis;

    } catch (error) {
      console.error('Error analizando dependencias:', error);
      analysis.warnings.push({
        type: 'analysis_error',
        message: error.message,
        severity: 'error'
      });
      return analysis;
    }
  }

  /**
   * Extraer dependencias del código
   */
  extractDependencies(code) {
    const dependencies = new Set();
    const metadata = {
      totalImports: 0,
      nativeModules: 0,
      thirdPartyPackages: 0,
      localImports: 0
    };

    // Extraer imports ES6
    let match;
    while ((match = this.importPatterns.es6Import.exec(code)) !== null) {
      const dep = this.normalizePackageName(match[1]);
      dependencies.add(dep);
      this.categorizeImport(dep, metadata);
    }

    // Extraer requires CommonJS
    this.importPatterns.require.lastIndex = 0;
    while ((match = this.importPatterns.require.exec(code)) !== null) {
      const dep = this.normalizePackageName(match[1]);
      dependencies.add(dep);
      this.categorizeImport(dep, metadata);
    }

    // Extraer dynamic imports
    this.importPatterns.dynamicImport.lastIndex = 0;
    while ((match = this.importPatterns.dynamicImport.exec(code)) !== null) {
      const dep = this.normalizePackageName(match[1]);
      dependencies.add(dep);
      this.categorizeImport(dep, metadata);
    }

    return { dependencies, metadata };
  }

  /**
   * Normalizar nombre de paquete
   */
  normalizePackageName(rawName) {
    // Remover rutas de submodulos (ej: 'lodash/debounce' -> 'lodash')
    const normalized = rawName.split('/')[0];
    
    // Manejar scoped packages (ej: '@babel/core')
    if (rawName.startsWith('@')) {
      const parts = rawName.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : normalized;
    }
    
    return normalized;
  }

  /**
   * Categorizar tipo de import
   */
  categorizeImport(dep, metadata) {
    metadata.totalImports++;
    
    if (this.isNativeModule(dep)) {
      metadata.nativeModules++;
    } else if (this.isLocalImport(dep)) {
      metadata.localImports++;
    } else {
      metadata.thirdPartyPackages++;
    }
  }

  /**
   * Verificar si es módulo nativo
   */
  isNativeModule(packageName) {
    return this.nativeModules.has(packageName);
  }

  /**
   * Verificar si es import local
   */
  isLocalImport(packageName) {
    return packageName.startsWith('.') || packageName.startsWith('/');
  }

  /**
   * Verificar si está instalado
   */
  isInstalled(packageName) {
    return this.installedPackages.has(packageName);
  }

  /**
   * Obtener información de paquete
   */
  async getPackageInfo(packageName) {
    // Verificar cache local primero
    if (this.packageRegistry.has(packageName)) {
      return this.packageRegistry.get(packageName);
    }

    // Verificar base de datos local
    if (this.knownPackages.has(packageName)) {
      const info = { ...this.knownPackages.get(packageName), exists: true };
      this.packageRegistry.set(packageName, info);
      return info;
    }

    // En un entorno real, aquí haríamos una consulta a npm registry
    // Por ahora, simular respuesta
    const mockInfo = {
      exists: Math.random() > 0.1, // 90% de probabilidad de existir
      description: `Package ${packageName}`,
      category: 'unknown',
      size: '~100KB',
      installCommand: `npm install ${packageName}`
    };

    this.packageRegistry.set(packageName, mockInfo);
    return mockInfo;
  }

  /**
   * Calcular prioridad de instalación
   */
  calculateInstallPriority(packageName, language) {
    const priorityFactors = {
      react: language.includes('jsx') ? 'high' : 'medium',
      typescript: language.includes('typescript') ? 'high' : 'low',
      '@types/': 'medium',
      lodash: 'medium',
      axios: 'medium',
      express: 'medium'
    };

    // Verificar factores específicos
    for (const [pattern, priority] of Object.entries(priorityFactors)) {
      if (packageName.includes(pattern)) {
        return priority;
      }
    }

    return 'low';
  }

  /**
   * Detectar conflictos de dependencias
   */
  detectConflicts(dependencies) {
    const conflicts = [];
    
    // Detectar dependencias conflictivas conocidas
    const conflictRules = [
      {
        packages: ['moment', 'date-fns'],
        type: 'alternative',
        message: 'moment y date-fns proporcionan funcionalidad similar'
      },
      {
        packages: ['lodash', 'underscore'],
        type: 'alternative',
        message: 'lodash y underscore proporcionan funcionalidad similar'
      }
    ];

    for (const rule of conflictRules) {
      const foundPackages = rule.packages.filter(pkg => dependencies.includes(pkg));
      if (foundPackages.length > 1) {
        conflicts.push({
          type: rule.type,
          packages: foundPackages,
          message: rule.message,
          severity: 'warning'
        });
      }
    }

    return conflicts;
  }

  /**
   * Instalar dependencia
   */
  async installPackage(packageName, options = {}) {
    const {
      save = true,
      dev = false,
      global = false,
      version = 'latest',
      force = false
    } = options;

    // Verificar si ya está instalado
    if (this.isInstalled(packageName) && !force) {
      return {
        success: true,
        message: `${packageName} ya está instalado`,
        skipped: true
      };
    }

    // Verificar si ya está en cola
    if (this.installationQueue.has(packageName)) {
      return {
        success: false,
        message: `${packageName} ya está en proceso de instalación`,
        pending: true
      };
    }

    try {
      // Agregar a cola de instalación
      this.installationQueue.set(packageName, {
        status: 'pending',
        startTime: Date.now(),
        options
      });

      console.log(`📦 Instalando ${packageName}...`);

      // Simular proceso de instalación (en producción sería con WebContainer)
      await this.simulateInstallation(packageName, options);

      // Marcar como instalado
      this.installedPackages.add(packageName);
      
      // Remover de cola
      this.installationQueue.delete(packageName);

      // Agregar al historial
      this.installationHistory.push({
        package: packageName,
        version,
        installedAt: new Date().toISOString(),
        options,
        success: true
      });

      console.log(`✅ ${packageName} instalado correctamente`);

      return {
        success: true,
        message: `${packageName} instalado correctamente`,
        version,
        size: await this.getPackageSize(packageName)
      };

    } catch (error) {
      console.error(`❌ Error instalando ${packageName}:`, error);
      
      // Remover de cola
      this.installationQueue.delete(packageName);

      // Agregar al historial como fallido
      this.installationHistory.push({
        package: packageName,
        installedAt: new Date().toISOString(),
        options,
        success: false,
        error: error.message
      });

      return {
        success: false,
        message: `Error instalando ${packageName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Simular instalación (reemplazar con WebContainer en producción)
   */
  async simulateInstallation(packageName, options) {
    const installTime = Math.random() * 3000 + 1000; // 1-4 segundos
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simular posible fallo (5% de probabilidad)
        if (Math.random() < 0.05) {
          reject(new Error(`Installation failed for ${packageName}`));
        } else {
          resolve();
        }
      }, installTime);
    });
  }

  /**
   * Instalar múltiples paquetes
   */
  async installMultiplePackages(packages, options = {}) {
    const results = [];
    
    if (options.parallel) {
      // Instalación en paralelo
      const promises = packages.map(pkg => this.installPackage(pkg, options));
      const responses = await Promise.allSettled(promises);
      
      responses.forEach((response, index) => {
        results.push({
          package: packages[index],
          success: response.status === 'fulfilled' && response.value.success,
          result: response.status === 'fulfilled' ? response.value : response.reason
        });
      });
    } else {
      // Instalación secuencial
      for (const pkg of packages) {
        const result = await this.installPackage(pkg, options);
        results.push({
          package: pkg,
          success: result.success,
          result
        });
      }
    }

    return {
      totalPackages: packages.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Desinstalar paquete
   */
  async uninstallPackage(packageName) {
    if (!this.isInstalled(packageName)) {
      return {
        success: false,
        message: `${packageName} no está instalado`
      };
    }

    try {
      console.log(`🗑️ Desinstalando ${packageName}...`);
      
      // Simular desinstalación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.installedPackages.delete(packageName);
      
      console.log(`✅ ${packageName} desinstalado correctamente`);
      
      return {
        success: true,
        message: `${packageName} desinstalado correctamente`
      };
      
    } catch (error) {
      console.error(`❌ Error desinstalando ${packageName}:`, error);
      
      return {
        success: false,
        message: `Error desinstalando ${packageName}: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Obtener tamaño del paquete
   */
  async getPackageSize(packageName) {
    // Simular tamaños (en producción consultaría npm registry)
    const sizes = {
      'react': '42.2KB',
      'lodash': '69.3KB',
      'axios': '13.5KB',
      'express': '209KB',
      'moment': '67.8KB'
    };
    
    return sizes[packageName] || `~${Math.floor(Math.random() * 100)}KB`;
  }

  /**
   * Obtener estado de dependencias
   */
  getDependencyStatus() {
    return {
      installed: Array.from(this.installedPackages),
      installing: Array.from(this.installationQueue.keys()),
      history: this.installationHistory.slice(-10), // Últimas 10
      cacheStats: {
        analysisCache: this.analysisCache.size,
        packageRegistry: this.packageRegistry.size
      }
    };
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.analysisCache.clear();
    this.packageRegistry.clear();
  }

  /**
   * Gestión de cache
   */
  setCacheResult(key, result) {
    if (this.analysisCache.size >= this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    this.analysisCache.set(key, result);
  }

  /**
   * Hash simple para cache
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Exportar configuración
   */
  exportConfig() {
    return {
      installedPackages: Array.from(this.installedPackages),
      config: this.config,
      installationHistory: this.installationHistory
    };
  }

  /**
   * Importar configuración
   */
  importConfig(configData) {
    if (configData.installedPackages) {
      this.installedPackages = new Set(configData.installedPackages);
    }
    if (configData.config) {
      this.config = { ...this.config, ...configData.config };
    }
    if (configData.installationHistory) {
      this.installationHistory = configData.installationHistory;
    }
  }

  /**
   * Obtener sugerencias inteligentes
   */
  getSmartSuggestions(language, codeContext = '') {
    const suggestions = [];
    
    // Sugerencias basadas en lenguaje
    if (language === 'jsx' || language === 'tsx') {
      if (!this.isInstalled('react')) {
        suggestions.push({
          name: 'react',
          reason: 'Required for JSX/TSX development',
          priority: 'high',
          category: 'framework'
        });
      }
    }

    if (language === 'typescript' || language === 'tsx') {
      if (!this.isInstalled('@types/node')) {
        suggestions.push({
          name: '@types/node',
          reason: 'TypeScript definitions for Node.js',
          priority: 'medium',
          category: 'types'
        });
      }
    }

    // Sugerencias basadas en contexto de código
    if (codeContext.includes('HTTP') || codeContext.includes('fetch')) {
      if (!this.isInstalled('axios')) {
        suggestions.push({
          name: 'axios',
          reason: 'Popular HTTP client library',
          priority: 'medium',
          category: 'utility'
        });
      }
    }

    return suggestions;
  }
}

// Instancia singleton
export const dependencyManager = new DependencyManagementService();

// Exportar clase para testing
export { DependencyManagementService };

export default dependencyManager;