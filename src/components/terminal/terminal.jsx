import React, { useRef, useEffect, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTheme } from '../layout/theme-provider.jsx';
import { eventBus } from '../../utils/event-bus.js';
import './terminal.css';

/**
 * Terminal Component
 * Terminal interactiva usando xterm.js integrada con WebContainer
 */
export const Terminal = () => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const webLinksAddonRef = useRef(null);
  const { currentTheme, isDarkTheme } = useTheme();
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInput, setCurrentInput] = useState('');

  useEffect(() => {
    initializeTerminal();

    // Suscribirse a eventos
    const unsubscribeWebContainerReady = eventBus.subscribe('webcontainer:ready', handleWebContainerReady);
    const unsubscribeTerminalReady = eventBus.subscribe('terminal:ready', handleTerminalReady);
    const unsubscribeTerminalOutput = eventBus.subscribe('terminal:output', handleTerminalOutput);
    const unsubscribeTerminalClear = eventBus.subscribe('terminal:clear', handleTerminalClear);
    const unsubscribeThemeChanged = eventBus.subscribe('theme:changed', handleThemeChange);

    return () => {
      cleanup();
      unsubscribeWebContainerReady();
      unsubscribeTerminalReady();
      unsubscribeTerminalOutput();
      unsubscribeTerminalClear();
      unsubscribeThemeChanged();
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) {
      applyTheme();
    }
  }, [currentTheme]);

  /**
   * Inicializar terminal xterm.js
   */
  const initializeTerminal = () => {
    if (!terminalRef.current || xtermRef.current) return;

    console.log('🖥️ Inicializando Terminal...');

    // Verificar que el contenedor tenga dimensiones válidas
    const containerRect = terminalRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
      console.log('🖥️ Contenedor sin dimensiones, reintentando...');
      setTimeout(initializeTerminal, 100);
      return;
    }

    try {
      // Crear instancia de xterm
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

      // Addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);

      // Abrir terminal en el DOM
      xterm.open(terminalRef.current);

      // Esperar un momento antes de ajustar tamaño
      setTimeout(() => {
        try {
          fitAddon.fit();
          console.log('🖥️ Terminal ajustada al contenedor');
        } catch (error) {
          console.warn('⚠️ Error ajustando terminal:', error);
          // Intentar con dimensiones fijas si falla
          try {
            xterm.resize(80, 24);
          } catch (e) {
            console.warn('⚠️ Error redimensionando terminal:', e);
          }
        }

        // Escribir mensaje de bienvenida
        writeWelcomeMessage(xterm);

        // Configurar event handlers
        setupTerminalHandlers(xterm);
        
        console.log('🖥️ Terminal inicializada exitosamente');
      }, 50);

      // Guardar referencias
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      webLinksAddonRef.current = webLinksAddon;

    } catch (error) {
      console.error('❌ Error inicializando terminal:', error);
      // Reintentar después de un momento
      setTimeout(initializeTerminal, 500);
    }
  };

  /**
   * Obtener tema de la terminal basado en el tema actual
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
   * Aplicar tema a la terminal
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
    
    if (isConnected) {
      xterm.write('\x1b[32m$\x1b[0m ');
    } else {
      xterm.writeln('\x1b[33m⚠️  Esperando conexión con WebContainer...\x1b[0m');
      xterm.writeln('');
    }
  };

  /**
   * Configurar manejadores de eventos de la terminal
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
        // Manejar teclas especiales como flechas arriba/abajo para historial
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

    // Redimensionar cuando el contenedor cambie de tamaño
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          // Verificar que el terminal esté visible y tenga dimensiones
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

    // Limpiar observer al desmontar
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  };

  /**
   * Navegar en el historial de comandos
   */
  const navigateHistory = (direction, xterm) => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex + direction;
    
    if (newIndex < -1) newIndex = -1;
    if (newIndex >= commandHistory.length) newIndex = commandHistory.length - 1;

    // Limpiar línea actual
    xterm.write('\r\x1b[K');
    
    if (newIndex === -1) {
      // Volver al input actual
      xterm.write('\x1b[32m$\x1b[0m ' + currentInput);
      setHistoryIndex(-1);
    } else {
      // Mostrar comando del historial
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
      // Mantener solo los últimos 50 comandos
      return newHistory.slice(-50);
    });
  };

  /**
   * Ejecutar comando en la terminal
   */
  const executeCommand = async (command) => {
    if (!isConnected) {
      xtermRef.current?.writeln('\x1b[31m❌ WebContainer no está disponible\x1b[0m');
      xtermRef.current?.write('\x1b[32m$\x1b[0m ');
      return;
    }

    console.log('🖥️ Ejecutando comando:', command);

    try {
      // Emitir evento para ejecutar comando
      eventBus.emit('webcontainer:terminal-command', {
        command: command,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error ejecutando comando:', error);
      xtermRef.current?.writeln(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
      xtermRef.current?.write('\x1b[32m$\x1b[0m ');
    }
  };

  /**
   * Manejar WebContainer listo
   */
  const handleWebContainerReady = () => {
    setIsConnected(true);
    
    if (xtermRef.current) {
      xtermRef.current.writeln('\x1b[32m✅ WebContainer conectado\x1b[0m');
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
    }

    console.log('🖥️ Terminal conectada a WebContainer');
  };

  /**
   * Manejar terminal lista
   */
  const handleTerminalReady = () => {
    if (xtermRef.current) {
      xtermRef.current.write('\x1b[32m$\x1b[0m ');
    }
  };

  /**
   * Manejar output de terminal
   */
  const handleTerminalOutput = (data) => {
    if (xtermRef.current && data.data) {
      xtermRef.current.write(data.data);
    }
  };

  /**
   * Manejar limpiar terminal
   */
  const handleTerminalClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      writeWelcomeMessage(xtermRef.current);
    }
  };

  /**
   * Manejar ejecución de comando desde eventos externos
   */
  const handleExecuteCommand = (data) => {
    if (xtermRef.current && data.command) {
      xtermRef.current.writeln(`\x1b[90m> ${data.command}\x1b[0m`);
      executeCommand(data.command);
    }
  };

  /**
   * Manejar cambio de tema
   */
  const handleThemeChange = () => {
    applyTheme();
  };

  /**
   * Limpiar terminal
   */
  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      writeWelcomeMessage(xtermRef.current);
    }
  };

  /**
   * Cleanup al desmontar
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
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon">🖥️</span>
          <span className="terminal-name">Terminal</span>
          <span className="terminal-status">
            {isConnected ? '🟢 Conectada' : '🟡 Desconectada'}
          </span>
        </div>
        
        <div className="terminal-actions">
          <button 
            className="terminal-btn"
            onClick={clearTerminal}
            title="Limpiar terminal"
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="terminal-content"
      />
    </div>
  );
};

export default Terminal;