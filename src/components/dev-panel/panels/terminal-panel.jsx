import React, { useRef, useEffect, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTheme } from '../../layout/theme-provider.jsx';
import { eventBus } from '../../../utils/event-bus.js';
import { cheeseJSCore } from '../../../core/cheesejs-core.js';
import './terminal-panel.css';

/**
 * TerminalPanel - Panel de terminal interactiva
 * Panel modular para terminal con WebContainer
 */
export const TerminalPanel = ({ panelId, state, updateState, isActive }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const webLinksAddonRef = useRef(null);
  const { currentTheme, isDarkTheme } = useTheme();
  
  const [isConnected, setIsConnected] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  // --- refs para evitar cierres obsoletos y capturar eventos tempranos ---
  const terminalReadyRef = useRef(false);
  const cheeseJSCoreRef = useRef(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInput, setCurrentInput] = useState('');
  const [cheeseJSCoreInstance, setCheeseJSCoreInstance] = useState(null);

  // Mantener refs sincronizadas con el estado actual
  useEffect(() => { terminalReadyRef.current = terminalReady; }, [terminalReady]);
  useEffect(() => { cheeseJSCoreRef.current = cheeseJSCoreInstance; }, [cheeseJSCoreInstance]);

  useEffect(() => {
    if (isActive && !xtermRef.current) {
      setTimeout(initializeTerminal, 200);
    }
    
    // Configurar eventos siguiendo el patrón del debug-terminal.html
    const unsubscribeWebContainerReady = eventBus.subscribe('cheesejs:webcontainer-ready', () => {
      setTerminalReady(true);
      terminalReadyRef.current = true;
      setIsConnected(true);
      
      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[32m✅ Terminal listo para usar\x1b[0m');
        xtermRef.current.writeln('Terminal inicializado correctamente');
        xtermRef.current.writeln('Puedes ejecutar comandos básicos');
        xtermRef.current.write('\x1b[32m$\x1b[0m ');
      }
      
      console.log('🖥️ Terminal Panel conectada a WebContainer');
    });
    
    const unsubscribeWebContainerError = eventBus.subscribe('cheesejs:webcontainer-error', (data) => {
      console.error('❌ Error de WebContainer:', data.error);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\x1b[31m❌ Error: ${data.error}\x1b[0m`);
      }
    });
    
    const unsubscribeTerminalOutput = eventBus.subscribe('terminal:output', (data) => {
      if (xtermRef.current) {
        if (data.type === 'error') {
          xtermRef.current.writeln(`\x1b[31m${data.data}\x1b[0m`);
        } else {
          xtermRef.current.write(data.data);
        }
      }
    });
    
    const unsubscribeTerminalReady = eventBus.subscribe('terminal:ready', () => {
      if (xtermRef.current && terminalReady) {
        xtermRef.current.write('\x1b[32m$\x1b[0m ');
      }
    });

    const unsubscribeTabAction = eventBus.subscribe('devpanel:tab-action', handleTabAction);
    const unsubscribeThemeUpdate = eventBus.subscribe('devpanel:theme-updated', handleThemeUpdate);

    // Inicializar CheeseJS Core si no está inicializado
    const initCore = async () => {
      try {
        if (!cheeseJSCore.isReady()) {
          console.log('🧀 Inicializando CheeseJS Core desde terminal panel...');
          await cheeseJSCore.initialize();
        }
        setCheeseJSCoreInstance(cheeseJSCore);
      } catch (error) {
        console.error('❌ Error inicializando CheeseJS Core:', error);
      }
    };

    initCore();

    return () => {
      cleanup();
      unsubscribeWebContainerReady();
      unsubscribeWebContainerError();
      unsubscribeTerminalOutput();
      unsubscribeTerminalReady();
      unsubscribeTabAction();
      unsubscribeThemeUpdate();
    };
  }, [isActive]);

  useEffect(() => {
    if (xtermRef.current) {
      applyTheme();
    }
  }, [currentTheme]);

  /**
   * Inicializar terminal
   */
  const initializeTerminal = () => {
    if (!terminalRef.current || xtermRef.current) {
      console.log('🖥️ Terminal: Contenedor no disponible o terminal ya existe');
      return;
    }

    console.log('🖥️ Inicializando Terminal Panel...');

    const containerRect = terminalRef.current.getBoundingClientRect();
    console.log('🖥️ Dimensiones del contenedor:', containerRect);
    
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
      console.log('🖥️ Terminal abierta en DOM');

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

        writeWelcome(xterm);
        setupHandlers(xterm);
        
        console.log('🖥️ Terminal Panel inicializada exitosamente');
        updateState({ initialized: true });
      }, 100);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      webLinksAddonRef.current = webLinksAddon;

    } catch (error) {
      console.error('❌ Error inicializando terminal:', error);
      updateState({ error: error.message });
      setTimeout(initializeTerminal, 1000);
    }
  };

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
  const writeWelcome = (xterm) => {
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
   * Configurar manejadores
   */
  const setupHandlers = (xterm) => {
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

    // Redimensionar con observer
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
  };

  /**
   * Navegar en historial
   */
  const navigateHistory = (direction, xterm) => {
    if (commandHistory.length === 0) return;

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
    setCommandHistory(prev => {
      const newHistory = [...prev, command];
      return newHistory.slice(-50); // Mantener últimos 50
    });
  };

  /**
   * Ejecutar comando
   * Basado en la lógica funcional del debug-terminal.html
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
      console.log('🖥️ Ejecutando comando:', command);
      
      // Usar el terminal manager de CheeseJS Core como en debug-terminal.html
      const components = core.getComponents();
      const terminalManager = components.terminalManager;
      
      // Ejecutar comando usando el método correcto
      await terminalManager.executeCommand(command);
      
      console.log(`✅ Comando enviado: ${command}`);
      
    } catch (error) {
      console.error('❌ Error ejecutando comando:', error);
      xtermRef.current?.writeln(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
      xtermRef.current?.write('\x1b[32m$\x1b[0m ');
    }
  };

  /**
   * Limpiar terminal
   */
  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      writeWelcome(xtermRef.current);
    }
  };

  /**
   * Reinicializar terminal
   */
  const resetTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    initializeTerminal();
  };

  /**
   * Event handlers
   */
  const handleWebContainerReady = () => {
    setIsConnected(true);
    
    if (xtermRef.current) {
      xtermRef.current.writeln('\x1b[32m✅ WebContainer conectado\x1b[0m');
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
    }

    console.log('🖥️ Terminal conectada a WebContainer');
  };

  const handleTerminalOutput = (data) => {
    if (xtermRef.current && data.data) {
      xtermRef.current.write(data.data);
    }
  };

  const handleTerminalReady = () => {
    if (xtermRef.current) {
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
    }
  };

  const handleTabAction = (data) => {
    if (data.panelId !== panelId) return;
    
    switch (data.action) {
      case 'clear':
        clearTerminal();
        break;
      case 'reset':
        resetTerminal();
        break;
      case 'settings':
        // TODO: Configuración de terminal
        if (xtermRef.current) {
          xtermRef.current.writeln('\x1b[90m⚙️ Configuración de terminal (próximamente)\x1b[0m');
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
        }
        break;
    }
  };

  const handleThemeUpdate = () => {
    applyTheme();
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    fitAddonRef.current = null;
    webLinksAddonRef.current = null;
  };

  return (
    <div className="terminal-panel">
      {/* Status bar */}
      <div className="terminal-status">
        <div className="status-info">
          <span className="status-icon">
            {isConnected ? '🟢' : '🟡'}
          </span>
          <span className="status-text">
            {isConnected ? 'Conectada' : 'Desconectada'}
          </span>
        </div>
        
        <div className="terminal-info">
          <span className="history-count">
            Historial: {commandHistory.length}
          </span>
        </div>
      </div>

      {/* Terminal container */}
      <div 
        ref={terminalRef}
        className="terminal-container"
      />
    </div>
  );
};

export default TerminalPanel;