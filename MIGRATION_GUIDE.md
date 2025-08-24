# 🔄 Guía de Migración - CheeseJS v2.0

## 📋 Lista de Verificación de Migración

### ✅ Cambios Obligatorios

- [ ] **Actualizar imports** de managers a servicios unificados
- [ ] **Reemplazar lógica de inicialización** con hooks personalizados
- [ ] **Migrar gestión de eventos** al EventManager
- [ ] **Convertir paneles hardcoded** a sistema de plugins
- [ ] **Actualizar tests** para nueva arquitectura
- [ ] **Verificar dependencias** y versiones compatibles

### ⚠️ Breaking Changes

| Componente | Antes | Después |
|------------|-------|---------|
| `webContainerManager` | Instancia separada | `webContainerService` |
| `packageManager` | Instancia separada | Método en `webContainerService` |
| `codeExecutor` | Instancia separada | Método en `webContainerService` |
| Inicialización i18n | Manual en cada componente | Hook `useI18n` |
| Gestión de eventos | Manual con cleanup | Hook `useEventManager` |

---

## 🔧 Migración por Componentes

### 1. HeaderBar Component

#### Antes (❌ Código duplicado)
```javascript
import React, { useState, useEffect } from 'react';
import { i18nService } from '../../services/i18n-service.js';
import { eventBus } from '../../utils/event-bus.js';

export const HeaderBar = () => {
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [isExecuting, setIsExecuting] = useState(false);
  const [t, setT] = useState(() => (key) => key);

  useEffect(() => {
    // Inicialización duplicada
    const initializeI18n = async () => {
      await i18nService.initialize();
      setCurrentLanguage(i18nService.getCurrentLanguage());
      setT(() => (key) => i18nService.t(key));
    };
    initializeI18n();

    // Eventos manuales
    const unsubscribers = [
      eventBus.subscribe('i18n:language-changed', (data) => {
        setCurrentLanguage(data.to);
        setT(() => (key) => i18nService.t(key));
      }),
      eventBus.subscribe('execution:started', () => setIsExecuting(true)),
      eventBus.subscribe('execution:completed', () => setIsExecuting(false)),
      eventBus.subscribe('execution:error', () => setIsExecuting(false))
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const handleRunCode = () => {
    if (isExecuting) {
      eventBus.emit('code:stop-requested');
    } else {
      eventBus.emit('code:run-requested');
    }
  };

  // ... resto del componente
};
```

#### Después (✅ Hooks y EventManager)
```javascript
import React, { useState, useEffect } from 'react';
import { useI18n } from '../../hooks/use-i18n.js';
import { useExecution } from '../../hooks/use-execution.js';
import { useEventGroup } from '../../hooks/use-event-manager.js';

export const HeaderBar = () => {
  // ✅ Un solo hook para i18n - sin duplicación
  const { currentLanguage, t, changeLanguage, isReady } = useI18n();
  
  // ✅ Un solo hook para ejecución - estado centralizado
  const { isExecuting, executeCode, stopExecution } = useExecution();
  
  // ✅ EventManager con cleanup automático
  const { emit } = useEventGroup('header-bar', 'UI_BASIC', {
    languageChanged: (data) => {
      console.log('🌍 Idioma cambió:', data);
    },
    themeChanged: (data) => {
      console.log('🎨 Tema cambió:', data);
    }
  });

  const handleRunCode = () => {
    if (isExecuting) {
      stopExecution();
    } else {
      emit('code:run-requested');
    }
  };

  if (!isReady) return <Loading />;

  // ... resto del componente simplificado
};
```

**Beneficios de la migración:**
- ✅ **-25 líneas** de código boilerplate
- ✅ **Sin duplicación** de lógica de inicialización
- ✅ **Cleanup automático** de eventos
- ✅ **Estado consistente** entre componentes

### 2. DevPanel Component

#### Antes (❌ Sistema hardcoded)
```javascript
export const DevPanel = () => {
  const [registeredPanels, setRegisteredPanels] = useState(new Map());
  const [activeTab, setActiveTab] = useState('output');

  const registerDefaultPanels = () => {
    // ❌ Paneles hardcoded
    const defaultPanels = [
      { id: 'output', component: OutputPanel },
      { id: 'terminal', component: TerminalPanel },
      // ... más paneles hardcoded
    ];

    defaultPanels.forEach(panel => {
      // ❌ Lógica de registro manual
      setRegisteredPanels(prev => {
        const newPanels = new Map(prev);
        newPanels.set(panel.id, panel);
        return newPanels;
      });
    });
  };

  useEffect(() => {
    registerDefaultPanels(); // ❌ No extensible
  }, []);

  // ... más código duplicado
};
```

#### Después (✅ Sistema de plugins)
```javascript
import { useDevPanel } from '../../hooks/use-dev-panel.js';
import { registerDefaultPanels } from '../../core/default-panels.js';

export const DevPanel = () => {
  // ✅ Hook que maneja todo el estado
  const {
    activeTab,
    panels,
    availablePanels,
    isInitialized,
    switchTab,
    updatePanelState,
    getPanelState
  } = useDevPanel();

  useEffect(() => {
    // ✅ Registro automático via plugins
    registerDefaultPanels();
  }, []);

  // ✅ Componente simplificado - la lógica está en el hook
  if (!isInitialized) return <Loading />;

  return (
    <div className="dev-panel">
      <PanelTabManager
        panels={availablePanels}
        activeTab={activeTab}
        onTabClick={switchTab}
      />
      <PanelContent />
    </div>
  );
};

// ✅ Ahora es fácil agregar paneles dinámicamente
const addCustomPanel = () => {
  pluginRegistry.registerPlugin({
    id: 'my-panel',
    type: 'panel',
    component: MyCustomPanel
  });
};
```

### 3. Core Services

#### Antes (❌ Múltiples managers)
```javascript
class CheeseJSCore {
  constructor() {
    // ❌ 5 managers para una sola instancia de WebContainer
    this.webContainerManager = new WebContainerManager();
    this.packageManager = new PackageManager(this.webContainerManager);
    this.codeExecutor = new CodeExecutor(this.webContainerManager);
    this.sandboxManager = new SandboxManager(this.webContainerManager);
    this.terminalManager = new TerminalManager(this.webContainerManager);
  }

  async executeCode(code) {
    // ❌ Delegación a múltiples managers
    return await this.codeExecutor.executeCode(code);
  }

  async installPackage(pkg) {
    // ❌ Más delegación
    return await this.packageManager.installPackage(pkg);
  }
}
```

#### Después (✅ Servicio unificado)
```javascript
class CheeseJSCore {
  constructor() {
    // ✅ Un solo servicio que hace todo
    this.webContainerService = new WebContainerService();
  }

  async executeCode(code) {
    // ✅ Directo, sin delegación innecesaria
    return await this.webContainerService.executeCode(code);
  }

  async installPackage(pkg) {
    // ✅ API consistente
    return await this.webContainerService.installPackage(pkg);
  }
}
```

---

## 🔄 Script de Migración Automática

```javascript
// migrate.js - Script para ayudar con la migración
const fs = require('fs');
const path = require('path');

const migrations = [
  {
    name: 'Update service imports',
    pattern: /import.*from.*webcontainer-manager/g,
    replacement: "import WebContainerService from './webcontainer-service.js'"
  },
  {
    name: 'Replace i18n initialization',
    pattern: /const initializeI18n[\s\S]*?setT\(\(\) => \(key.*?\) => i18nService\.t\(key.*?\)\);/g,
    replacement: 'const { t, currentLanguage, isReady } = useI18n();'
  },
  {
    name: 'Replace event subscriptions',
    pattern: /const unsubscribers = \[[\s\S]*?eventBus\.subscribe[\s\S]*?\];[\s\S]*?return \(\) => \{[\s\S]*?unsubscribers\.forEach\(unsub => unsub\(\)\);[\s\S]*?\};/g,
    replacement: 'const { emit } = useEventGroup(componentId, eventGroupName, handlers);'
  }
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  migrations.forEach(migration => {
    content = content.replace(migration.pattern, migration.replacement);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Migrated: ${filePath}`);
}

// Ejecutar migración
const srcDir = './src';
const files = getAllJsxFiles(srcDir);
files.forEach(migrateFile);
```

---

## 🧪 Actualización de Tests

### Antes (❌ Tests complejos)
```javascript
describe('HeaderBar', () => {
  it('should initialize i18n', async () => {
    const mockInitialize = jest.fn();
    const mockGetCurrentLanguage = jest.fn().mockReturnValue('es');
    
    // ❌ Muchos mocks necesarios
    jest.mock('../../services/i18n-service.js', () => ({
      i18nService: {
        initialize: mockInitialize,
        getCurrentLanguage: mockGetCurrentLanguage,
        t: jest.fn(key => key)
      }
    }));

    // ❌ Test complejo para funcionalidad básica
    render(<HeaderBar />);
    
    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockGetCurrentLanguage).toHaveBeenCalled();
    });
  });
});
```

### Después (✅ Tests simples)
```javascript
describe('HeaderBar', () => {
  it('should display translated content', () => {
    // ✅ Mock simple del hook
    const mockUseI18n = {
      t: jest.fn(key => `translated_${key}`),
      currentLanguage: 'es',
      isReady: true
    };
    
    jest.mock('../../hooks/use-i18n.js', () => ({
      useI18n: () => mockUseI18n
    }));

    // ✅ Test directo y simple
    render(<HeaderBar />);
    
    expect(screen.getByText('translated_welcome')).toBeInTheDocument();
  });
});
```

---

## 📝 Checklist de Verificación Post-Migración

### Funcionalidad ✅
- [ ] La aplicación inicia correctamente
- [ ] El cambio de idioma funciona
- [ ] El cambio de tema funciona
- [ ] La ejecución de código funciona
- [ ] La instalación de paquetes funciona
- [ ] Los paneles se muestran correctamente
- [ ] Los eventos se propagan correctamente

### Performance ✅
- [ ] El tiempo de inicialización mejoró
- [ ] El uso de memoria se redujo
- [ ] No hay memory leaks de eventos
- [ ] Los hooks se re-renderizan apropiadamente

### Code Quality ✅
- [ ] Se eliminó código duplicado
- [ ] Los componentes son más pequeños
- [ ] Los tests pasan todos
- [ ] No hay warnings en consola
- [ ] ESLint pasa sin errores

### Extensibilidad ✅
- [ ] Se pueden agregar paneles via plugins
- [ ] Los nuevos hooks son reutilizables
- [ ] El EventManager maneja nuevos eventos
- [ ] La API es consistente

---

## 🆘 Troubleshooting

### Problema: "Hook must be called inside a function component"

```javascript
// ❌ Problema
const { t } = useI18n(); // Fuera del componente

function MyComponent() {
  return <div>{t('key')}</div>;
}

// ✅ Solución
function MyComponent() {
  const { t } = useI18n(); // Dentro del componente
  return <div>{t('key')}</div>;
}
```

### Problema: "Service not initialized"

```javascript
// ❌ Problema
const { t } = useI18n();
return <div>{t('key')}</div>; // Error si no está listo

// ✅ Solución
const { t, isReady } = useI18n();
if (!isReady) return <Loading />;
return <div>{t('key')}</div>;
```

### Problema: "Plugin not registered"

```javascript
// ❌ Problema
pluginRegistry.registerPlugin({
  id: 'my-panel',
  name: 'My Panel'
  // Falta type y component
});

// ✅ Solución
pluginRegistry.registerPlugin({
  id: 'my-panel',
  name: 'My Panel',
  type: 'panel',
  component: MyPanelComponent
});
```

---

## 🎯 Beneficios Post-Migración

### Para Desarrolladores
- ✅ **Menos código boilerplate** - hooks manejan la complejidad
- ✅ **Reutilización fácil** - mismos hooks en múltiples componentes
- ✅ **Tests más simples** - mock de hooks en lugar de servicios
- ✅ **Extensibilidad** - agregar funcionalidad via plugins

### Para la Aplicación
- ✅ **Menor tiempo de inicialización** - servicios unificados
- ✅ **Menor uso de memoria** - menos instancias duplicadas
- ✅ **Mejor performance** - event management optimizado
- ✅ **Más estable** - menos duplicación = menos bugs

### Para el Proyecto
- ✅ **Más mantenible** - arquitectura clara y modular
- ✅ **Más escalable** - sistema de plugins extensible
- ✅ **Mejor DX** - herramientas de desarrollo mejoradas
- ✅ **Futuro-proof** - base sólida para nuevas features

---

*🎉 ¡Felicitaciones! Has migrado exitosamente a CheeseJS v2.0. La nueva arquitectura te permitirá desarrollar funcionalidades más rápido y con mayor confianza.*