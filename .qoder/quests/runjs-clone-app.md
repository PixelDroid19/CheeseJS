# Diseño Técnico: CheeseJS - Aplicación Similar a RunJS

## Visión General

CheeseJS es una aplicación de escritorio que proporciona un entorno de desarrollo JavaScript interactivo, similar a RunJS. La aplicación combina Tauri + React + WebContainers para ofrecer ejecución de código en tiempo real, gestión de paquetes npm, y un editor de código avanzado con Monaco Editor.

### Objetivos Principales

- **Core modular y escalable**: Núcleo desacoplado para fácil extensión
- **Layout temable**: Sistema completo de themes (light/dark/personalizables)
- **Internacionalización**: Soporte multiidioma desde el inicio
- **Ejecución de código**: Integración completa con WebContainers
- **Editor avanzado**: Monaco Editor con autocompletado y sintaxis highlighting

## Tecnología Stack & Dependencias

### Stack Principal
```mermaid
graph TB
    A[Tauri v2] --> B[React 19.1]
    B --> C[Vite 7.0]
    C --> D[WebContainers API]
    D --> E[Monaco Editor]
    
    F[Rust Backend] --> A
    G[JavaScript Frontend] --> B
    
    classDef framework fill:#4CAF50,stroke:#388E3C,color:white
    classDef tool fill:#2196F3,stroke:#1976D2,color:white
    
    class A,B framework
    class C,D,E,F,G tool
```

### Dependencias Clave
- **Frontend**: React 19.1, Monaco Editor, WebContainers API
- **Backend**: Tauri 2.0, Rust
- **Build Tools**: Vite 7.0, PostCSS, Tailwind CSS (futuro)
- **Desarrollo**: ESLint, Prettier, TypeScript (futuro)

## Arquitectura del Proyecto

### Estructura de Directorios
```
src/
├── core/                    # Núcleo modular del sistema
│   ├── webcontainer-manager.js   # Gestión de WebContainers
│   ├── package-manager.js        # Instalación/gestión de paquetes
│   ├── code-executor.js          # Ejecución de código
│   └── sandbox-manager.js        # Gestión del sandbox
├── services/                # Servicios globales
│   ├── theme-service.js          # Sistema de themes
│   ├── i18n-service.js           # Internacionalización
│   └── config-service.js         # Configuración
├── components/              # Componentes de UI
│   ├── layout/
│   │   ├── app-shell.jsx         # Contenedor principal
│   │   ├── header-bar.jsx        # Barra de encabezado
│   │   ├── sidebar-panel.jsx     # Panel lateral
│   │   └── theme-provider.jsx    # Proveedor de themes
│   ├── editor/
│   │   ├── monaco-editor.jsx     # Editor de código
│   │   └── editor-settings.jsx   # Configuración del editor
│   ├── console/
│   │   ├── console-panel.jsx     # Panel de consola
│   │   └── output-viewer.jsx     # Visualizador de salida
│   └── dialogs/
│       ├── settings-dialog.jsx   # Configuración global
│       └── package-dialog.jsx    # Gestión de paquetes
├── assets/                  # Recursos estáticos
│   ├── locales/             # Archivos de traducción
│   │   ├── es.json
│   │   ├── en.json
│   │   └── fr.json
│   ├── themes/              # Definiciones de themes
│   │   ├── light.css
│   │   ├── dark.css
│   │   └── custom.css
│   └── icons/               # Iconografía
└── utils/                   # Utilidades compartidas
    ├── event-bus.js              # Sistema de eventos
    ├── storage.js                # Persistencia local
    └── validators.js             # Validadores
```

### Arquitectura de Componentes

```mermaid
graph TD
    subgraph "Core Modular"
        WM[WebContainer Manager]
        PM[Package Manager]
        CE[Code Executor]
        SM[Sandbox Manager]
    end
    
    subgraph "Servicios Globales"
        TS[Theme Service]
        I18N[i18n Service]
        CS[Config Service]
    end
    
    subgraph "Layout Components"
        AS[App Shell]
        HB[Header Bar]
        SP[Sidebar Panel]
        TP[Theme Provider]
    end
    
    subgraph "Editor Components"
        ME[Monaco Editor]
        ES[Editor Settings]
    end
    
    subgraph "Console Components"
        CP[Console Panel]
        OV[Output Viewer]
    end
    
    AS --> HB
    AS --> SP
    AS --> ME
    AS --> CP
    AS --> TP
    
    ME --> WM
    CP --> WM
    SP --> PM
    PM --> WM
    WM --> CE
    WM --> SM
    
    AS --> TS
    AS --> I18N
    AS --> CS
    
    classDef core fill:#FF6B6B,stroke:#E53E3E,color:white
    classDef service fill:#4ECDC4,stroke:#38B2AC,color:white
    classDef layout fill:#45B7D1,stroke:#3182CE,color:white
    classDef editor fill:#96CEB4,stroke:#68D391,color:white
    classDef console fill:#FECA57,stroke:#F6AD55,color:white
    
    class WM,PM,CE,SM core
    class TS,I18N,CS service
    class AS,HB,SP,TP layout
    class ME,ES editor
    class CP,OV console
```

## Core Modular (Núcleo del Sistema)

### WebContainer Manager
**Responsabilidades:**
- Inicialización y gestión del WebContainer
- Configuración de headers COOP/COEP
- Montaje del sistema de archivos virtual
- Comunicación entre frontend y sandbox

**Interfaz Principal:**
```javascript
class WebContainerManager {
  async boot()                    // Inicializar WebContainer
  async mount(files)             // Montar archivos en el sandbox
  async writeFile(path, content) // Escribir archivo
  async readFile(path)           // Leer archivo
  spawn(command, args)           // Ejecutar comando
  on(event, callback)            // Escuchar eventos
}
```

### Package Manager
**Responsabilidades:**
- Instalación de paquetes npm
- Gestión de dependencias
- Cache de paquetes
- Resolución de versiones

**Flujo de Instalación:**
```mermaid
sequenceDiagram
    participant U as Usuario
    participant PM as Package Manager
    participant WM as WebContainer Manager
    participant NPM as npm Registry
    
    U->>PM: installPackage('lodash')
    PM->>WM: spawn('npm', ['install', 'lodash'])
    WM->>NPM: Descargar paquete
    NPM-->>WM: Paquete descargado
    WM-->>PM: Instalación completada
    PM-->>U: Paquete disponible
```

### Code Executor
**Responsabilidades:**
- Ejecución de código JavaScript
- Manejo de errores en tiempo de ejecución
- Streaming de output en tiempo real
- Gestión de procesos

### Sandbox Manager
**Responsabilidades:**
- Aislamiento del entorno de ejecución
- Gestión de recursos del sandbox
- Limpieza de procesos
- Monitoreo de rendimiento

## Layout + Sistema de Themes

### Theme Provider
**Arquitectura de Themes:**
```mermaid
graph LR
    A[Theme Provider] --> B[Light Theme]
    A --> C[Dark Theme]
    A --> D[Custom Themes]
    
    B --> E[CSS Variables]
    C --> E
    D --> E
    
    E --> F[Componentes UI]
    
    subgraph "Theme Structure"
        G[Colors]
        H[Typography]
        I[Spacing]
        J[Shadows]
        K[Borders]
    end
    
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K
```

**Definición de Theme:**
```css
:root {
  /* Colors */
  --primary-color: #007ACC;
  --secondary-color: #1E1E1E;
  --background-color: #FFFFFF;
  --surface-color: #F3F3F3;
  --text-color: #000000;
  --text-secondary: #666666;
  
  /* Editor */
  --editor-background: #FFFFFF;
  --editor-foreground: #000000;
  --editor-selection: #ADD6FF;
  --editor-line-highlight: #F0F0F0;
  
  /* Console */
  --console-background: #1E1E1E;
  --console-text: #FFFFFF;
  --console-error: #F44747;
  --console-warning: #FFCC02;
  --console-info: #007ACC;
}
```

### Layout Responsivo
**Estructura Base:**
```mermaid
graph TD
    subgraph "App Shell"
        A[Header Bar]
        
        subgraph "Main Layout"
            B[Sidebar Panel]
            C[Editor Panel]
            D[Console Panel]
        end
    end
    
    A --> |Navigation| B
    B --> |File Management| C
    C --> |Code Output| D
    
    classDef header fill:#4A90E2,color:white
    classDef sidebar fill:#7ED321,color:white
    classDef editor fill:#F5A623,color:white
    classDef console fill:#BD10E0,color:white
    
    class A header
    class B sidebar
    class C editor
    class D console
```

**Layout Escalable:**
- **Grid System**: CSS Grid para layouts principales
- **Flexbox**: Para componentes internos
- **Responsive Breakpoints**: Mobile-first approach
- **Panel Resizing**: Drag & drop para redimensionar paneles

## Sistema de Internacionalización (i18n)

### Estructura de Traducciones
**Archivo de idioma (es.json):**
```json
{
  "header": {
    "run": "Ejecutar",
    "install": "Instalar Paquete",
    "settings": "Configuración",
    "theme": "Tema"
  },
  "editor": {
    "placeholder": "// Escribe tu código JavaScript aquí...",
    "save": "Guardar",
    "format": "Formatear",
    "autocomplete": "Autocompletar"
  },
  "console": {
    "clear": "Limpiar",
    "output": "Salida",
    "errors": "Errores",
    "warnings": "Advertencias"
  },
  "packages": {
    "install": "Instalar {{package}}",
    "installing": "Instalando...",
    "installed": "{{package}} instalado correctamente",
    "error": "Error al instalar {{package}}"
  }
}
```

### I18n Service
**Funcionalidades:**
- Carga dinámica de traducciones
- Interpolación de variables
- Pluralización
- Formateo de fechas/números por locale
- Fallback a idioma por defecto

```mermaid
graph LR
    A[i18n Service] --> B[Load Translations]
    B --> C[Set Language]
    C --> D[Interpolate Variables]
    D --> E[Format Output]
    
    F[Component] --> |t('key', params)| A
    A --> |Translated Text| F
```

## Ejecución de Código con WebContainers

### Configuración COOP/COEP
**Headers Requeridos:**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
```

### Flujo de Ejecución
```mermaid
sequenceDiagram
    participant Editor as Monaco Editor
    participant WM as WebContainer Manager
    participant WC as WebContainer
    participant Console as Console Panel
    
    Editor->>WM: executeCode(code)
    WM->>WC: writeFile('/index.js', code)
    WM->>WC: spawn('node', ['index.js'])
    
    loop Output Stream
        WC-->>WM: stdout/stderr data
        WM-->>Console: appendOutput(data)
    end
    
    WC-->>WM: Process exit
    WM-->>Editor: Execution complete
```

### Gestión de Archivos Virtuales
**File System Tree:**
```javascript
const files = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: 'cheesejs-workspace',
        type: 'module',
        dependencies: {},
        scripts: {
          start: 'node index.js'
        }
      }, null, 2)
    }
  },
  'index.js': {
    file: {
      contents: '// Tu código aquí\nconsole.log("¡Hola CheeseJS!");'
    }
  }
};
```

## Editor de Código con Monaco

### Configuración del Editor
**Features Principales:**
- Syntax highlighting para JS/TS/JSX/TSX
- Autocompletado inteligente
- Error checking en tiempo real
- Code formatting
- Multiple cursors
- Find & replace

### Integración con Themes
```mermaid
graph TD
    A[Monaco Editor] --> B[Theme Service]
    B --> C{Theme Type}
    
    C --> |Light| D[VS Light Theme]
    C --> |Dark| E[VS Dark Theme]
    C --> |Custom| F[Custom Monaco Theme]
    
    D --> G[Apply Theme]
    E --> G
    F --> G
    
    G --> H[Update Editor]
```

### Autocompletado Personalizado
**Providers de Autocompletado:**
- **NPM Packages**: Sugerencias de paquetes instalados
- **Node.js APIs**: APIs nativas de Node.js
- **Custom Snippets**: Snippets definidos por el usuario
- **Context-aware**: Basado en imports y scope

## Consola de Salida

### Console Panel Features
- **Real-time Output**: Streaming de stdout/stderr
- **Log Levels**: Info, Warning, Error con colores
- **Filtering**: Filtros por tipo de log
- **Search**: Búsqueda en output
- **Clear**: Limpieza de consola
- **Copy**: Copiar output seleccionado

### Output Viewer
```mermaid
graph LR
    A[Process Output] --> B[Output Parser]
    B --> C{Log Type}
    
    C --> |stdout| D[Info Style]
    C --> |stderr| E[Error Style]
    C --> |console.log| F[Log Style]
    C --> |console.warn| G[Warning Style]
    
    D --> H[Render Output]
    E --> H
    F --> H
    G --> H
```

## Comunicación Entre Componentes

### Event Bus System
**Arquitectura de Eventos:**
```mermaid
graph TD
    A[Event Bus] --> B[Component A]
    A --> C[Component B]
    A --> D[Component C]
    
    B --> |emit event| A
    A --> |notify subscribers| C
    A --> |notify subscribers| D
    
    subgraph "Event Types"
        E[theme.changed]
        F[language.changed]
        G[code.executed]
        H[package.installed]
        I[file.saved]
    end
```

### Patrón Observer
**Implementación:**
```javascript
class EventBus {
  constructor() {
    this.events = new Map();
  }
  
  subscribe(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => callback(data));
    }
  }
  
  unsubscribe(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}
```

## Estrategia de Testing

### Unit Testing
**Framework**: Jest + React Testing Library
**Cobertura Objetivo**: 80%

**Áreas de Testing:**
- **Core Services**: WebContainer Manager, Package Manager
- **UI Components**: Renderizado y interactions
- **Event System**: Emisión y recepción de eventos
- **i18n**: Traducciones y formateo
- **Theme System**: Aplicación de themes

### Ejemplo de Test
```javascript
describe('WebContainerManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new WebContainerManager();
  });
  
  test('should boot WebContainer successfully', async () => {
    await manager.boot();
    expect(manager.isReady).toBe(true);
  });
  
  test('should execute code and return output', async () => {
    await manager.boot();
    const output = await manager.executeCode('console.log("test")');
    expect(output).toContain('test');
  });
});
```

### Integration Testing
**Scenarios:**
- **Full Code Execution Flow**: Desde editor hasta console output
- **Package Installation**: Instalación e importación de paquetes
- **Theme Switching**: Cambio de themes en toda la app
- **Language Switching**: Cambio de idioma y actualización de UI