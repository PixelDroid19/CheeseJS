/**
 * Zustand DevTools Configuration
 * Configuración avanzada de DevTools para desarrollo con Zustand
 */

/**
 * Configuración de DevTools para stores
 */
export const devtoolsConfig = {
  // Configuración global para todos los stores
  global: {
    enabled: process.env.NODE_ENV === 'development',
    serialize: true,
    trace: true,
    traceLimit: 25
  },

  // Configuraciones específicas por store
  stores: {
    AppStore: {
      name: 'CheeseJS::AppStore',
      features: {
        pause: true,
        lock: true,
        persist: true,
        export: true,
        import: true,
        jump: true,
        skip: true,
        reorder: true,
        dispatch: true,
        test: true
      }
    },

    ThemeStore: {
      name: 'CheeseJS::ThemeStore',
      features: {
        pause: true,
        lock: false,
        persist: true,
        export: true,
        import: true,
        jump: true,
        skip: false,
        reorder: false,
        dispatch: true,
        test: true
      }
    },

    UIStore: {
      name: 'CheeseJS::UIStore',
      features: {
        pause: true,
        lock: false,
        persist: false,
        export: false,
        import: false,
        jump: true,
        skip: true,
        reorder: false,
        dispatch: true,
        test: false
      }
    },

    TerminalStore: {
      name: 'CheeseJS::TerminalStore',
      features: {
        pause: true,
        lock: false,
        persist: true,
        export: true,
        import: false,
        jump: false,
        skip: true,
        reorder: false,
        dispatch: true,
        test: true
      }
    },

    EditorStore: {
      name: 'CheeseJS::EditorStore',
      features: {
        pause: true,
        lock: false,
        persist: true,
        export: true,
        import: true,
        jump: true,
        skip: false,
        reorder: false,
        dispatch: true,
        test: true
      }
    },

    WebContainerStore: {
      name: 'CheeseJS::WebContainerStore',
      features: {
        pause: true,
        lock: true,
        persist: false,
        export: false,
        import: false,
        jump: false,
        skip: true,
        reorder: false,
        dispatch: true,
        test: false
      }
    },

    DevPanelStore: {
      name: 'CheeseJS::DevPanelStore',
      features: {
        pause: true,
        lock: false,
        persist: true,
        export: true,
        import: true,
        jump: true,
        skip: false,
        reorder: true,
        dispatch: true,
        test: true
      }
    }
  }
};

/**
 * Sanitizer personalizado para DevTools
 * Limpia datos sensibles antes de mostrarlos en DevTools
 */
export const sanitizeForDevTools = (state, action) => {
  const sanitized = { ...state };

  // Remover datos sensibles o demasiado grandes
  if (sanitized.terminalInstance) {
    sanitized.terminalInstance = '[XTerm Instance]';
  }

  if (sanitized.fitAddon) {
    sanitized.fitAddon = '[FitAddon Instance]';
  }

  if (sanitized.webLinksAddon) {
    sanitized.webLinksAddon = '[WebLinksAddon Instance]';
  }

  // Truncar arrays muy grandes
  if (sanitized.outputHistory && sanitized.outputHistory.length > 100) {
    sanitized.outputHistory = [
      ...sanitized.outputHistory.slice(-50),
      `... (${sanitized.outputHistory.length - 50} more entries)`
    ];
  }

  if (sanitized.commandHistory && sanitized.commandHistory.length > 50) {
    sanitized.commandHistory = [
      ...sanitized.commandHistory.slice(-25),
      `... (${sanitized.commandHistory.length - 25} more entries)`
    ];
  }

  // Truncar mapas grandes
  if (sanitized.loadingStates instanceof Map && sanitized.loadingStates.size > 20) {
    const entries = Array.from(sanitized.loadingStates.entries()).slice(0, 20);
    sanitized.loadingStates = new Map([
      ...entries,
      ['...truncated', `(${sanitized.loadingStates.size - 20} more)`]
    ]);
  }

  return sanitized;
};

/**
 * Action sanitizer para DevTools
 */
export const sanitizeAction = (action, id) => {
  // No mostrar acciones muy frecuentes en DevTools para reducir ruido
  const frequentActions = [
    'updateTimestamp',
    'setLoading',
    'updateStats'
  ];

  if (frequentActions.some(freq => action.type?.includes(freq))) {
    return {
      type: `${action.type} [Frequent - Hidden]`,
      payload: '[Hidden for clarity]'
    };
  }

  return action;
};

/**
 * Predicado para filtrar estados en DevTools
 */
export const shouldSkipAction = (action) => {
  // Saltar acciones muy frecuentes o de debugging
  const skipPatterns = [
    /updateTimestamp/,
    /@@/,
    /devtools/i
  ];

  return skipPatterns.some(pattern => 
    pattern.test(action.type || '')
  );
};

/**
 * Configuración avanzada de DevTools con middleware personalizado
 */
export const createDevToolsEnhancer = (storeName) => {
  if (process.env.NODE_ENV !== 'development') {
    return (config) => config;
  }

  const storeConfig = devtoolsConfig.stores[storeName] || {};
  
  return (config) => (set, get, api) => {
    // Configurar DevTools con opciones específicas del store
    const devtoolsOptions = {
      name: storeConfig.name || `CheeseJS::${storeName}`,
      enabled: devtoolsConfig.global.enabled,
      serialize: devtoolsConfig.global.serialize,
      trace: devtoolsConfig.global.trace,
      traceLimit: devtoolsConfig.global.traceLimit,
      features: storeConfig.features || {},
      
      // Sanitizers personalizados
      stateSanitizer: sanitizeForDevTools,
      actionSanitizer: sanitizeAction,
      predicate: (state, action) => !shouldSkipAction(action),

      // Configuración adicional
      maxAge: 50,
      shouldCatchErrors: true,
      shouldHotReload: true,
      shouldRecordChanges: true
    };

    // Aplicar configuración de DevTools
    if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
      const devtools = window.__REDUX_DEVTOOLS_EXTENSION__(devtoolsOptions);
      
      // Wrapper para set que notifica a DevTools
      const enhancedSet = (partial, replace) => {
        const previousState = get();
        const result = set(partial, replace);
        const nextState = get();
        
        // Notificar a DevTools
        devtools.send({
          type: typeof partial === 'function' ? 'UPDATE' : 'SET',
          payload: partial
        }, nextState);
        
        return result;
      };

      return config(enhancedSet, get, api);
    }

    // Fallback si no hay DevTools
    return config(set, get, api);
  };
};

/**
 * Hook para debugging de stores en desarrollo
 */
export const useStoreDebugger = (storeName, store) => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const storeState = store();

  // Log cambios importantes en desarrollo
  React.useEffect(() => {
    console.groupCollapsed(`🏪 ${storeName} State Update`);
    console.log('Current State:', storeState);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }, [storeState.lastUpdated]);

  // Verificaciones de integridad en desarrollo
  React.useEffect(() => {
    validateStoreIntegrity(storeName, storeState);
  }, [storeName, storeState]);
};

/**
 * Validador de integridad de stores
 */
const validateStoreIntegrity = (storeName, state) => {
  const issues = [];

  // Validaciones generales
  if (!state.lastUpdated) {
    issues.push('Missing lastUpdated timestamp');
  }

  if (state.error && typeof state.error !== 'string') {
    issues.push('Error should be a string or null');
  }

  // Validaciones específicas por store
  switch (storeName) {
    case 'AppStore':
      if (typeof state.isInitialized !== 'boolean') {
        issues.push('isInitialized should be boolean');
      }
      break;

    case 'ThemeStore':
      if (!state.currentTheme) {
        issues.push('currentTheme is required');
      }
      break;

    case 'UIStore':
      if (!Array.isArray(state.modals)) {
        issues.push('modals should be an array');
      }
      break;

    case 'TerminalStore':
      if (!Array.isArray(state.commandHistory)) {
        issues.push('commandHistory should be an array');
      }
      break;
  }

  if (issues.length > 0) {
    console.warn(`⚠️ Store integrity issues in ${storeName}:`, issues);
  }
};

/**
 * Utilidades de debugging global para stores
 */
export const StoreDebugUtils = {
  /**
   * Obtener snapshot de todos los stores
   */
  getStoresSnapshot: () => {
    if (typeof window === 'undefined' || !window.__CHEESEJS_STORES__) {
      return {};
    }

    const snapshot = {};
    Object.entries(window.__CHEESEJS_STORES__).forEach(([name, store]) => {
      if (typeof store === 'function') {
        snapshot[name] = store.getState();
      }
    });

    return {
      timestamp: new Date().toISOString(),
      stores: snapshot
    };
  },

  /**
   * Comparar snapshots de stores
   */
  compareSnapshots: (snapshot1, snapshot2) => {
    const differences = {};

    Object.keys(snapshot1.stores).forEach(storeName => {
      const state1 = snapshot1.stores[storeName];
      const state2 = snapshot2.stores[storeName];

      if (JSON.stringify(state1) !== JSON.stringify(state2)) {
        differences[storeName] = {
          before: state1,
          after: state2,
          changed: true
        };
      }
    });

    return {
      hasChanges: Object.keys(differences).length > 0,
      differences,
      timespan: new Date(snapshot2.timestamp) - new Date(snapshot1.timestamp)
    };
  },

  /**
   * Exportar configuración de stores
   */
  exportStoreConfiguration: () => {
    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      stores: {}
    };

    if (typeof window !== 'undefined' && window.__CHEESEJS_STORES__) {
      Object.entries(window.__CHEESEJS_STORES__).forEach(([name, store]) => {
        if (typeof store === 'function') {
          const state = store.getState();
          config.stores[name] = {
            initialized: !!state.lastUpdated,
            hasError: !!state.error,
            stateKeys: Object.keys(state),
            configKeys: state.config ? Object.keys(state.config) : []
          };
        }
      });
    }

    return config;
  },

  /**
   * Ejecutar validación completa de stores
   */
  validateAllStores: () => {
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'pass',
      stores: {}
    };

    if (typeof window !== 'undefined' && window.__CHEESEJS_STORES__) {
      Object.entries(window.__CHEESEJS_STORES__).forEach(([name, store]) => {
        if (typeof store === 'function') {
          const state = store.getState();
          const issues = [];
          
          validateStoreIntegrity(name, state);
          
          results.stores[name] = {
            status: issues.length === 0 ? 'pass' : 'warn',
            issues
          };

          if (issues.length > 0) {
            results.overall = 'warn';
          }
        }
      });
    }

    return results;
  }
};

// Hacer disponibles las utilidades globalmente en desarrollo
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.__ZUSTAND_DEVTOOLS__ = StoreDebugUtils;
}

export default {
  devtoolsConfig,
  createDevToolsEnhancer,
  useStoreDebugger,
  StoreDebugUtils
};