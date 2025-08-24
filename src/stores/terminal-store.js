import { createBaseStore, createInitialState, createBaseActions } from './base-store.js';

/**
 * TerminalStore - Gestión de estado del terminal
 * Maneja conexión, historial de comandos, configuración y estado de XTerm
 */
const initialState = createInitialState({
  // Estado de conexión
  isConnected: false,
  isInitialized: false,
  isConnecting: false,
  connectionError: null,
  connectionAttempts: 0,
  maxConnectionAttempts: 3,

  // Estado del terminal XTerm
  terminalReady: false,
  terminalInstance: null,
  fitAddon: null,
  webLinksAddon: null,
  
  // Dimensiones del terminal
  dimensions: {
    cols: 80,
    rows: 24,
    width: 0,
    height: 0
  },
  
  // Historial de comandos
  commandHistory: [],
  historyIndex: -1,
  maxHistorySize: 100,
  
  // Estado de entrada actual
  currentInput: '',
  currentLine: '',
  isExecuting: false,
  
  // Historial de salida
  outputHistory: [],
  maxOutputHistory: 1000,
  
  // Estadísticas
  stats: {
    commandsExecuted: 0,
    sessionsCount: 0,
    lastActivity: null,
    uptime: 0
  },
  
  // Configuración del terminal
  config: {
    enableWelcomeMessage: true,
    enableHistory: true,
    enableAutoResize: true,
    enableWebLinks: true,
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineHeight: 1.2,
    letterSpacing: 0,
    scrollback: 1000,
    bellSound: false,
    allowTransparency: false
  },
  
  // Configuración de tema
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: '#264f78',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff'
  },
  
  // Estado de procesos
  runningProcesses: new Map(),
  processHistory: [],
  
  // Configuración avanzada
  advanced: {
    bufferSize: 1000,
    enableGpu: true,
    enableWebgl: true,
    preserveSelection: true,
    rightClickSelectsWord: true,
    macOptionIsMeta: false,
    windowsMode: false
  }
});

export const useTerminalStore = createBaseStore(
  'TerminalStore',
  (set, get) => ({
    ...initialState,
    ...createBaseActions(set, get),

    /**
     * Inicializar terminal
     */
    initialize: async (terminalRef, options = {}) => {
      try {
        set({ 
          isLoading: true,
          isConnecting: true,
          connectionError: null 
        });

        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');

        const currentState = get();
        const config = { ...currentState.config, ...options };

        // Crear instancia de terminal
        const terminal = new Terminal({
          theme: currentState.theme,
          fontSize: config.fontSize,
          fontFamily: config.fontFamily,
          lineHeight: config.lineHeight,
          letterSpacing: config.letterSpacing,
          cursorBlink: config.cursorBlink,
          cursorStyle: config.cursorStyle,
          scrollback: config.scrollback,
          bellSound: config.bellSound,
          allowTransparency: config.allowTransparency,
          cols: currentState.dimensions.cols,
          rows: currentState.dimensions.rows
        });

        // Configurar addons
        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        if (config.enableWebLinks) {
          terminal.loadAddon(webLinksAddon);
        }

        // Abrir terminal en el DOM
        if (terminalRef?.current) {
          terminal.open(terminalRef.current);
          fitAddon.fit();
        }

        // Configurar event handlers
        get().setupTerminalEventHandlers(terminal);

        // Escribir mensaje de bienvenida
        if (config.enableWelcomeMessage) {
          get().writeWelcomeMessage(terminal);
        }

        set({
          terminalInstance: terminal,
          fitAddon,
          webLinksAddon,
          terminalReady: true,
          isConnected: true,
          isConnecting: false,
          isInitialized: true,
          isLoading: false,
          config,
          stats: {
            ...currentState.stats,
            sessionsCount: currentState.stats.sessionsCount + 1,
            lastActivity: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        });

        console.log('🖥️ Terminal inicializado correctamente');

      } catch (error) {
        console.error('❌ Error inicializando terminal:', error);
        set({
          isLoading: false,
          isConnecting: false,
          connectionError: error.message,
          connectionAttempts: get().connectionAttempts + 1
        });
      }
    },

    /**
     * Configurar event handlers del terminal
     */
    setupTerminalEventHandlers: (terminal) => {
      const currentState = get();

      // Handler para entrada de datos
      terminal.onData((data) => {
        get().handleTerminalInput(data);
      });

      // Handler para redimensionamiento
      terminal.onResize(({ cols, rows }) => {
        set({
          dimensions: {
            ...currentState.dimensions,
            cols,
            rows
          }
        });
      });

      // Handler para selección
      terminal.onSelectionChange(() => {
        const selection = terminal.getSelection();
        // Emitir evento de selección si es necesario
      });
    },

    /**
     * Manejar entrada de terminal
     */
    handleTerminalInput: (data) => {
      const currentState = get();
      const terminal = currentState.terminalInstance;
      
      if (!terminal || currentState.isExecuting) return;

      const char = data.charCodeAt(0);

      switch (char) {
        case 13: // Enter
          get().executeCurrentCommand();
          break;
          
        case 127: // Backspace
          if (currentState.currentInput.length > 0) {
            const newInput = currentState.currentInput.slice(0, -1);
            set({ currentInput: newInput });
            terminal.write('\b \b');
          }
          break;
          
        case 27: // Escape sequences
          get().handleEscapeSequence(data);
          break;
          
        case 3: // Ctrl+C
          get().handleInterrupt();
          break;
          
        case 12: // Ctrl+L
          get().clearTerminal();
          break;
          
        default:
          if (char >= 32 && char <= 126) { // Caracteres imprimibles
            const newInput = currentState.currentInput + data;
            set({ currentInput: newInput });
            terminal.write(data);
          }
          break;
      }
    },

    /**
     * Manejar secuencias de escape (flechas, etc.)
     */
    handleEscapeSequence: (data) => {
      if (data.length >= 3) {
        const currentState = get();
        
        switch (data.charCodeAt(2)) {
          case 65: // Flecha arriba
            get().navigateHistory(-1);
            break;
          case 66: // Flecha abajo
            get().navigateHistory(1);
            break;
          case 67: // Flecha derecha
            // Mover cursor derecha
            break;
          case 68: // Flecha izquierda
            // Mover cursor izquierda
            break;
        }
      }
    },

    /**
     * Navegar en el historial de comandos
     */
    navigateHistory: (direction) => {
      const currentState = get();
      const terminal = currentState.terminalInstance;
      
      if (!currentState.config.enableHistory || currentState.commandHistory.length === 0) {
        return;
      }

      let newIndex = currentState.historyIndex + direction;
      
      if (newIndex < -1) newIndex = -1;
      if (newIndex >= currentState.commandHistory.length) {
        newIndex = currentState.commandHistory.length - 1;
      }

      // Limpiar línea actual
      terminal.write('\r\x1b[K');
      terminal.write('\x1b[32m$\x1b[0m ');

      if (newIndex === -1) {
        // Restaurar entrada actual
        terminal.write(currentState.currentInput);
        set({ historyIndex: -1 });
      } else {
        // Mostrar comando del historial
        const command = currentState.commandHistory[currentState.commandHistory.length - 1 - newIndex];
        terminal.write(command);
        set({ 
          historyIndex: newIndex,
          currentInput: command
        });
      }
    },

    /**
     * Ejecutar comando actual
     */
    executeCurrentCommand: async () => {
      const currentState = get();
      const terminal = currentState.terminalInstance;
      const command = currentState.currentInput.trim();

      if (!command) {
        terminal.writeln('');
        terminal.write('\x1b[32m$\x1b[0m ');
        return;
      }

      terminal.writeln('');
      
      try {
        set({ 
          isExecuting: true,
          stats: {
            ...currentState.stats,
            lastActivity: new Date().toISOString()
          }
        });

        // Agregar al historial
        get().addToHistory(command);

        // Ejecutar comando
        await get().executeCommand(command);

        // Incrementar contador
        set({
          stats: {
            ...get().stats,
            commandsExecuted: get().stats.commandsExecuted + 1
          }
        });

      } catch (error) {
        console.error('❌ Error ejecutando comando:', error);
        terminal.writeln(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
      } finally {
        set({ 
          isExecuting: false,
          currentInput: '',
          historyIndex: -1
        });
        terminal.write('\x1b[32m$\x1b[0m ');
      }
    },

    /**
     * Ejecutar comando específico
     */
    executeCommand: async (command) => {
      const currentState = get();
      const terminal = currentState.terminalInstance;

      // Agregar a historial de salida
      get().addToOutput({
        type: 'command',
        content: command,
        timestamp: new Date().toISOString()
      });

      try {
        // Aquí se integrará con WebContainer o CheeseJS Core
        // Por ahora, simulamos la ejecución
        terminal.writeln(`\x1b[90mEjecutando: ${command}\x1b[0m`);
        
        // Simular respuesta
        await new Promise(resolve => setTimeout(resolve, 100));
        terminal.writeln(`\x1b[32m✓ Comando ejecutado\x1b[0m`);

        get().addToOutput({
          type: 'output',
          content: `Comando "${command}" ejecutado correctamente`,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        terminal.writeln(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
        
        get().addToOutput({
          type: 'error',
          content: error.message,
          timestamp: new Date().toISOString()
        });
      }
    },

    /**
     * Agregar comando al historial
     */
    addToHistory: (command) => {
      const currentState = get();
      
      if (!currentState.config.enableHistory) return;

      const newHistory = [...currentState.commandHistory, command];
      const trimmedHistory = newHistory.slice(-currentState.maxHistorySize);

      set({ commandHistory: trimmedHistory });
    },

    /**
     * Agregar salida al historial
     */
    addToOutput: (output) => {
      const currentState = get();
      const newOutput = [...currentState.outputHistory, output];
      const trimmedOutput = newOutput.slice(-currentState.maxOutputHistory);

      set({ outputHistory: trimmedOutput });
    },

    /**
     * Escribir mensaje de bienvenida
     */
    writeWelcomeMessage: (terminal) => {
      terminal.writeln('\x1b[1;36m🧀 CheeseJS Terminal\x1b[0m');
      terminal.writeln('\x1b[90mTerminal interactiva integrada con WebContainer\x1b[0m');
      terminal.writeln('\x1b[90mEscribe comandos de Node.js, npm, o del sistema\x1b[0m');
      terminal.writeln('');
      terminal.write('\x1b[32m$\x1b[0m ');
    },

    /**
     * Limpiar terminal
     */
    clearTerminal: () => {
      const terminal = get().terminalInstance;
      if (terminal) {
        terminal.clear();
        if (get().config.enableWelcomeMessage) {
          get().writeWelcomeMessage(terminal);
        } else {
          terminal.write('\x1b[32m$\x1b[0m ');
        }
      }
    },

    /**
     * Manejar interrupción (Ctrl+C)
     */
    handleInterrupt: () => {
      const currentState = get();
      const terminal = currentState.terminalInstance;
      
      if (currentState.isExecuting) {
        // Cancelar proceso en ejecución
        terminal.writeln('\n\x1b[33m^C\x1b[0m');
        set({ isExecuting: false });
      } else {
        // Limpiar entrada actual
        terminal.writeln('\n\x1b[33m^C\x1b[0m');
        set({ currentInput: '' });
      }
      
      terminal.write('\x1b[32m$\x1b[0m ');
    },

    /**
     * Redimensionar terminal
     */
    resize: () => {
      const currentState = get();
      const { fitAddon, terminalInstance } = currentState;
      
      if (fitAddon && terminalInstance) {
        try {
          fitAddon.fit();
          
          const newDimensions = {
            cols: terminalInstance.cols,
            rows: terminalInstance.rows,
            width: terminalInstance.element?.clientWidth || 0,
            height: terminalInstance.element?.clientHeight || 0
          };
          
          set({ dimensions: newDimensions });
          
        } catch (error) {
          console.error('❌ Error redimensionando terminal:', error);
        }
      }
    },

    /**
     * Actualizar configuración
     */
    updateConfig: (newConfig) => {
      const currentState = get();
      const updatedConfig = { ...currentState.config, ...newConfig };
      
      set({ config: updatedConfig });
      
      // Aplicar cambios al terminal activo
      const terminal = currentState.terminalInstance;
      if (terminal) {
        Object.keys(newConfig).forEach(key => {
          if (key in terminal.options) {
            terminal.options[key] = newConfig[key];
          }
        });
      }
    },

    /**
     * Actualizar tema
     */
    updateTheme: (newTheme) => {
      const currentState = get();
      const updatedTheme = { ...currentState.theme, ...newTheme };
      
      set({ theme: updatedTheme });
      
      // Aplicar tema al terminal activo
      const terminal = currentState.terminalInstance;
      if (terminal) {
        terminal.options.theme = updatedTheme;
      }
    },

    /**
     * Desconectar terminal
     */
    disconnect: () => {
      const currentState = get();
      const terminal = currentState.terminalInstance;
      
      if (terminal) {
        terminal.dispose();
      }
      
      set({
        isConnected: false,
        terminalReady: false,
        terminalInstance: null,
        fitAddon: null,
        webLinksAddon: null,
        currentInput: '',
        isExecuting: false
      });
    },

    /**
     * Obtener estadísticas del terminal
     */
    getStats: () => {
      const currentState = get();
      return {
        ...currentState.stats,
        historySize: currentState.commandHistory.length,
        outputSize: currentState.outputHistory.length,
        isConnected: currentState.isConnected,
        isExecuting: currentState.isExecuting
      };
    },

    /**
     * Exportar historial
     */
    exportHistory: () => {
      const currentState = get();
      return {
        commands: currentState.commandHistory,
        output: currentState.outputHistory,
        stats: currentState.stats,
        exportedAt: new Date().toISOString()
      };
    },

    /**
     * Resetear terminal
     */
    reset: () => {
      get().disconnect();
      set({
        ...initialState,
        stats: {
          ...initialState.stats,
          sessionsCount: get().stats.sessionsCount
        }
      });
    }
  }),
  {
    persist: true,
    persistKey: 'cheesejs-terminal-store',
    devtools: true,
    // Solo persistir configuración y estadísticas, no estado de sesión
    partialize: (state) => ({
      config: state.config,
      theme: state.theme,
      commandHistory: state.commandHistory.slice(-50), // Solo últimos 50 comandos
      stats: {
        commandsExecuted: state.stats.commandsExecuted,
        sessionsCount: state.stats.sessionsCount
      },
      maxHistorySize: state.maxHistorySize,
      maxOutputHistory: state.maxOutputHistory
    })
  }
);