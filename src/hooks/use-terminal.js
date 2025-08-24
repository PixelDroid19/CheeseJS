import { useRef, useEffect, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTheme } from '../components/layout/theme-provider.jsx';
import { eventBus } from '../utils/event-bus.js';

/**
 * Hook personalizado para gestión de terminal
 * Consolida toda la lógica común entre diferentes implementaciones de terminal
 */
export const useTerminal = (options = {}) => {
  const {
    enableWelcomeMessage = true,
    enableHistory = true,
    enableAutoResize = true,
    maxHistorySize = 50,
    onCommand = null,
    panelId = null
  } = options;

  // Referencias
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const webLinksAddonRef = useRef(null);
  const terminalReadyRef = useRef(false);
  const cheeseJSCoreRef = useRef(null);
  
  // Estado
  const [isConnected, setIsConnected] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInput, setCurrentInput] = useState('');
  const [commandsCount, setCommandsCount] = useState(0);
  const [cheeseJSCore, setCheeseJSCore] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Theme
  const { currentTheme, isDarkTheme } = useTheme();

  // Mantener refs sincronizadas
  useEffect(() => { terminalReadyRef.current = terminalReady; }, [terminalReady]);
  useEffect(() => { cheeseJSCoreRef.current = cheeseJSCore; }, [cheeseJSCore]);

  /**
   * Obtener tema de terminal
   */
  const getTerminalTheme = () => {
    if (isDarkTheme()) {
      return {
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
      };
    } else {
      return {
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        cursorAccent: '#ffffff',
        selection: '#add6ff',
        black: '#000000',
        red: '#cd3131',
        green: '#00bc00',
        yellow: '#949800',
        blue: '#0451a5',
        magenta: '#bc05bc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#cd3131',
        brightGreen: '#14ce14',
        brightYellow: '#b5ba00',
        brightBlue: '#0451a5',
        brightMagenta: '#bc05bc',
        brightCyan: '#0598bc',
        brightWhite: '#a5a5a5'
      };
    }
  };

  /**
   * Aplicar tema
   */
  const applyTheme = () => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getTerminalTheme();
    }
  };

  /**
   * Escribir mensaje de bienvenida
   */
  const writeWelcomeMessage = (xterm) => {
    xterm.writeln('\x1b[1;36m🧀 CheeseJS Terminal\x1b[0m');
    xterm.writeln('\x1b[90mTerminal interactiva integrada con WebContainer\x1b[0m');
    xterm.writeln('\x1b[90mEscribe comandos de Node.js, npm, o del sistema\x1b[0m');
    xterm.writeln('');
    
    if (terminalReady) {
      xterm.write('\x1b[32m$\x1b[0m ');
    } else {
      xterm.writeln('\x1b[33m⚠️  Inicializando terminal...\x1b[0m');
      xterm.writeln('');
    }
  };

  /**
   * Navegar en historial
   */
  const navigateHistory = (direction, xterm) => {
    if (!enableHistory || commandHistory.length === 0) return;

    let newIndex = historyIndex + direction;
    
    if (newIndex < -1) newIndex = -1;
    if (newIndex >= commandHistory.length) newIndex = commandHistory.length - 1;

    xterm.write('\r\x1b[K');
    
    if (newIndex === -1) {
      xterm.write('\x1b[32m$\x1b[0m ' + currentInput);
      setHistoryIndex(-1);
    } else {
      const command = commandHistory[commandHistory.length - 1 - newIndex];
      xterm.write('\x1b[32m$\x1b[0m ' + command);
      setHistoryIndex(newIndex);
    }
  };

  /**
   * Agregar comando al historial
   */
  const addToHistory = (command) => {
    if (!enableHistory) return;
    
    setCommandHistory(prev => {
      const newHistory = [...prev, command];
      return newHistory.slice(-maxHistorySize);
    });
  };

  /**
   * Ejecutar comando
   */
  const executeCommand = async (command) => {
    const isReadyNow = terminalReadyRef.current;
    const core = cheeseJSCoreRef.current;

    if (!isReadyNow || !core) {
      xtermRef.current?.writeln('\x1b[31m❌ Terminal no está listo\x1b[0m');
      xtermRef.current?.write('\x1b[32m$\x1b[0m ');
      return;
    }

    try {
      setCommandsCount(prev => prev + 1);
      
      console.log('🖥️ Ejecutando comando:', command);
      
      // Llamar callback personalizado si existe
      if (onCommand) {
        onCommand(command);
      }
      
      // Usar el terminal manager de CheeseJS Core
      const components = core.getComponents();
      const terminalManager = components?.terminalManager;

      if (!terminalManager) {
        xtermRef.current?.writeln('\x1b[31m❌ Terminal Manager no disponible\x1b[0m');
        xtermRef.current?.write('\x1b[32m$\x1b[0m ');
        return;
      }
      
      await terminalManager.executeCommand(command);
      console.log('✅ Comando enviado:', command);
      
    } catch (error) {
      console.error('❌ Error ejecutando comando:', error);
      xtermRef.current?.writeln(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
      xtermRef.current?.write('\x1b[32m$\x1b[0m ');
    }
  };

  /**
   * Configurar handlers de terminal
   */
  const setupTerminalHandlers = (xterm) => {
    let currentLine = '';

    xterm.onData((data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        xterm.writeln('');
        if (currentLine.trim()) {
          executeCommand(currentLine.trim());
          addToHistory(currentLine.trim());
        }
        currentLine = '';
        setHistoryIndex(-1);
        setCurrentInput('');
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          xterm.write('\b \b');
          setCurrentInput(currentLine);
        }
      } else if (code === 27) { // Escape sequence
        const seq = data.slice(1);
        if (seq === '[A') { // Flecha arriba
          navigateHistory(-1, xterm);
        } else if (seq === '[B') { // Flecha abajo
          navigateHistory(1, xterm);
        }
      } else if (code >= 32 && code <= 126) { // Caracteres imprimibles
        currentLine += data;
        xterm.write(data);
        setCurrentInput(currentLine);
      }
    });

    // Auto-resize si está habilitado
    if (enableAutoResize) {
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            const element = xtermRef.current.element;
            if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
              fitAddonRef.current.fit();
            }
          } catch (error) {
            console.warn('⚠️ Error redimensionando terminal:', error);
          }
        }
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => resizeObserver?.disconnect();
    }
  };

  /**
   * Inicializar terminal
   */
  const initializeTerminal = () => {
    if (!terminalRef.current || xtermRef.current) {
      console.log('🖥️ Terminal: Contenedor no disponible o terminal ya existe');
      return;
    }

    console.log('🖥️ Inicializando Terminal...');

    const containerRect = terminalRef.current.getBoundingClientRect();
    
    if (containerRect.width === 0 || containerRect.height === 0) {
      console.log('🖥️ Contenedor sin dimensiones, reintentando...');
      setTimeout(initializeTerminal, 300);
      return;
    }

    try {
      const xterm = new XTerm({
        theme: getTerminalTheme(),
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Liberation Mono", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        tabStopWidth: 4,
        bellStyle: 'none',
        allowTransparency: true,
        convertEol: true,
        disableStdin: false,
        macOptionIsMeta: true,
        scrollOnUserInput: true,
        smoothScrollDuration: 150,
        rows: 24,
        cols: 80
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);

      xterm.open(terminalRef.current);

      setTimeout(() => {
        try {
          fitAddon.fit();
          console.log('🖥️ Terminal ajustada al contenedor');
        } catch (error) {
          console.warn('⚠️ Error ajustando terminal:', error);
          try {
            xterm.resize(80, 24);
            console.log('🖥️ Terminal redimensionada con valores fijos');
          } catch (e) {
            console.warn('⚠️ Error redimensionando terminal:', e);
          }
        }

        if (enableWelcomeMessage) {
          writeWelcomeMessage(xterm);
        }
        
        setupTerminalHandlers(xterm);
        setIsInitialized(true);
        console.log('🖥️ Terminal inicializada exitosamente');
      }, 100);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      webLinksAddonRef.current = webLinksAddon;

    } catch (error) {
      console.error('❌ Error inicializando terminal:', error);
      setTimeout(initializeTerminal, 1000);
    }
  };

  /**
   * Event handlers
   */
  const handleWebContainerReady = () => {
    setTerminalReady(true);
    terminalReadyRef.current = true;
    setIsConnected(true);
    
    if (xtermRef.current) {
      xtermRef.current.writeln('\x1b[32m✅ Terminal listo para usar\x1b[0m');
      xtermRef.current.writeln('Terminal inicializado correctamente');
      xtermRef.current.writeln('Puedes ejecutar comandos básicos');
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
    }
    
    console.log('🖥️ Terminal conectada a WebContainer');
  };

  const handleWebContainerError = (data) => {
    console.error('❌ Error de WebContainer:', data.error);
    if (xtermRef.current) {
      xtermRef.current.writeln(`\x1b[31m❌ Error: ${data.error}\x1b[0m`);
    }
  };

  const handleTerminalOutput = (data) => {
    if (xtermRef.current) {
      if (data.type === 'error') {
        xtermRef.current.writeln(`\x1b[31m${data.data}\x1b[0m`);
      } else {
        xtermRef.current.write(data.data);
      }
    }
  };

  const handleTerminalReady = () => {
    if (xtermRef.current && terminalReady) {
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
    }
  };

  const handleTerminalClear = () => {
    clearTerminal();
  };

  const handleTabAction = (data) => {
    if (panelId && data.panelId !== panelId) return;
    
    switch (data.action) {
      case 'clear':
        clearTerminal();
        break;
      case 'reset':
        resetTerminal();
        break;
      case 'settings':
        if (xtermRef.current) {
          xtermRef.current.writeln('\x1b[90m⚙️ Configuración de terminal (próximamente)\x1b[0m');
          xtermRef.current.write('\x1b[32m$\x1b[0m ');
        }
        break;
    }
  };

  /**
   * Utilidades públicas
   */
  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      if (enableWelcomeMessage) {
        writeWelcomeMessage(xtermRef.current);
      }
    }
  };

  const resetTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    setIsInitialized(false);
    initializeTerminal();
  };

  const writeToTerminal = (text, color = null) => {
    if (xtermRef.current) {
      if (color) {
        xtermRef.current.writeln(`\x1b[${color}m${text}\x1b[0m`);
      } else {
        xtermRef.current.writeln(text);
      }
    }
  };

  const cleanup = () => {
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    fitAddonRef.current = null;
    webLinksAddonRef.current = null;
    setIsInitialized(false);
  };

  /**
   * Inicialización de CheeseJS Core
   */
  const initializeCheeseJSCore = async () => {
    try {
      console.log('🖥️ Inicializando CheeseJS Core en terminal...');
      
      const { cheeseJSCore: core } = await import('../core/cheesejs-core.js');
      setCheeseJSCore(core);
      cheeseJSCoreRef.current = core;
      
      if (!core.isReady()) {
        console.log('🚀 Inicializando CheeseJS Core...');
        await core.initialize();
      }
      
    } catch (error) {
      console.error('❌ Error inicializando CheeseJS Core en terminal:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\x1b[31m❌ Error crítico: ${error.message}\x1b[0m`);
      }
    }
  };

  // Effects
  useEffect(() => {
    if (xtermRef.current) {
      applyTheme();
    }
  }, [currentTheme]);

  useEffect(() => {
    initializeCheeseJSCore();

    // Event listeners
    const unsubscribeWebContainerReady = eventBus.subscribe('cheesejs:webcontainer-ready', handleWebContainerReady);
    const unsubscribeWebContainerError = eventBus.subscribe('cheesejs:webcontainer-error', handleWebContainerError);
    const unsubscribeTerminalOutput = eventBus.subscribe('terminal:output', handleTerminalOutput);
    const unsubscribeTerminalReady = eventBus.subscribe('terminal:ready', handleTerminalReady);
    const unsubscribeTerminalClear = eventBus.subscribe('terminal:clear', handleTerminalClear);
    const unsubscribeTabAction = panelId ? eventBus.subscribe('devpanel:tab-action', handleTabAction) : null;

    return () => {
      cleanup();
      unsubscribeWebContainerReady();
      unsubscribeWebContainerError();
      unsubscribeTerminalOutput();
      unsubscribeTerminalReady();
      unsubscribeTerminalClear();
      if (unsubscribeTabAction) unsubscribeTabAction();
    };
  }, []);

  return {
    // Referencias
    terminalRef,
    xtermRef,
    
    // Estado
    isConnected,
    terminalReady,
    commandHistory,
    commandsCount,
    isInitialized,
    
    // Funciones
    initializeTerminal,
    clearTerminal,
    resetTerminal,
    writeToTerminal,
    executeCommand,
    
    // Utilidades
    applyTheme,
    cleanup
  };
};

export default useTerminal;