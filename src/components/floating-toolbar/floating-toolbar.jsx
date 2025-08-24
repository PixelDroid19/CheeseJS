import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../layout/theme-provider.jsx';
import { useI18n } from '../../hooks/use-i18n.js';
import { i18nService } from '../../services/i18n-service.js';
import { eventBus } from '../../utils/event-bus.js';
import { Button, Icon, Tooltip } from '../ui/index.js';
import './floating-toolbar.css';

/**
 * FloatingToolbar Component - MEJORADO CON ICONOS LUCIDE
 * Toolbar flotante principal que consolida TODAS las acciones del editor
 * AHORA CON ICONOS ÚNICAMENTE - SIN TEXTO VISIBLE
 * 
 * CAMBIOS REALIZADOS:
 * ✅ Agregadas traducciones completas (ES/EN) con shortcuts
 * ✅ Migrada acción "Formatear" desde MonacoEditor
 * ✅ Migrado selector de "Idioma" desde HeaderBar
 * ✅ Mejorada integración con sistema de temas
 * ✅ Optimizado diseño responsive para mejor ocupación de espacio
 * ✅ Eliminadas duplicaciones CSS entre componentes
 * ✅ ✨ NUEVO: Implementados iconos Lucide React ligeros sin texto
 * ✅ ✨ NUEVO: Todo el texto movido a tooltips únicamente
 * ✅ ✨ NUEVO: Instalada dependencia lucide-react
 * 
 * ACCIONES CONSOLIDADAS (SOLO ICONOS):
 * - Primary: Play/Square, File, Save, AlignLeft (Format)
 * - Secondary: Package, Code, Terminal, Globe, Palette, Settings, HelpCircle
 */
export const FloatingToolbar = ({
  position = 'bottom-center',
  isCollapsed = false,
  onToggle
}) => {
  const { currentTheme } = useTheme();
  const { currentLanguage, availableLanguages, changeLanguage, t: translate } = useI18n();
  const [activeMenu, setActiveMenu] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [t, setT] = useState(() => (key, params) => key);
  
  const toolbarRef = useRef(null);
  const dragStartRef = useRef(null);

  useEffect(() => {
    // Inicializar i18n
    const initializeI18n = async () => {
      await i18nService.initialize();
      setT(() => (key, params) => i18nService.t(key, params));
    };

    initializeI18n();

    // Suscribirse a eventos
    const unsubscribeLanguageChanged = eventBus.subscribe('i18n:language-changed', () => {
      setT(() => (key, params) => i18nService.t(key, params));
    });

    const unsubscribeExecutionStarted = eventBus.subscribe('execution:started', () => {
      setIsExecuting(true);
    });

    const unsubscribeExecutionCompleted = eventBus.subscribe('execution:completed', () => {
      setIsExecuting(false);
    });

    const unsubscribeExecutionStopped = eventBus.subscribe('execution:stopped', () => {
      setIsExecuting(false);
    });

    return () => {
      unsubscribeLanguageChanged();
      unsubscribeExecutionStarted();
      unsubscribeExecutionCompleted();
      unsubscribeExecutionStopped();
    };
  }, []);

  // Acciones principales del toolbar
  const handleRunCode = () => {
    if (isExecuting) {
      eventBus.emit('code:stop-requested');
    } else {
      eventBus.emit('code:run-requested');
    }
    setActiveMenu(null);
  };

  const handleNewFile = () => {
    eventBus.emit('file:new-requested');
    setActiveMenu(null);
  };

  const handleSaveFile = () => {
    eventBus.emit('file:save-requested');
    setActiveMenu(null);
  };

  const handleInstallPackage = () => {
    eventBus.emit('package:install-dialog-requested');
    setActiveMenu(null);
  };

  const handleOpenSettings = () => {
    eventBus.emit('modal:open', {
      type: 'settings',
      title: t('settings.title'),
      size: 'large'
    });
    setActiveMenu(null);
  };

  const handleFormatCode = () => {
    eventBus.emit('code:format-requested');
    setActiveMenu(null);
  };

  const handleToggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    eventBus.emit('theme:change-requested', { theme: newTheme });
    setActiveMenu(null);
  };

  const handleOpenHelp = () => {
    eventBus.emit('modal:open', {
      type: 'help',
      title: t('help.title'),
      size: 'large'
    });
    setActiveMenu(null);
  };

  const handleToggleConsole = () => {
    eventBus.emit('console:toggle-requested');
    setActiveMenu(null);
  };

  const handleOpenExamples = () => {
    eventBus.emit('modal:open', {
      type: 'examples',
      title: t('examples.title'),
      size: 'medium'
    });
    setActiveMenu(null);
  };

  const handleChangeLanguage = async (languageCode) => {
    await changeLanguage(languageCode);
    setActiveMenu(null);
  };

  const handleOpenPackages = () => {
    eventBus.emit('modal:open', {
      type: 'packages',
      title: t('packages.title'),
      size: 'medium'
    });
    setActiveMenu(null);
  };

  // Funcionalidad de drag & drop
  const handleMouseDown = (e) => {
    if (e.target.closest('.toolbar-action')) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      toolbarX: toolbarRef.current.offsetLeft,
      toolbarY: toolbarRef.current.offsetTop
    };

    const handleMouseMove = (e) => {
      if (!dragStartRef.current) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      setDragPosition({
        x: dragStartRef.current.toolbarX + deltaX,
        y: dragStartRef.current.toolbarY + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Acciones principales del toolbar
  const primaryActions = [
    {
      id: 'run',
      icon: isExecuting ? 'stop' : 'play',
      label: isExecuting ? t('toolbar.stop') : t('toolbar.run'),
      variant: isExecuting ? 'danger' : 'success',
      onClick: handleRunCode,
      shortcut: t('toolbar.runCodeShortcut')
    },
    {
      id: 'new',
      icon: 'file',
      label: t('toolbar.newFile'),
      variant: 'primary',
      onClick: handleNewFile,
      shortcut: t('toolbar.newFileShortcut')
    },
    {
      id: 'save',
      icon: 'save',
      label: t('toolbar.save'),
      variant: 'secondary',
      onClick: handleSaveFile,
      shortcut: t('toolbar.saveFileShortcut')
    },
    {
      id: 'format',
      icon: 'format',
      label: t('toolbar.format'),
      variant: 'secondary',
      onClick: handleFormatCode,
      shortcut: t('toolbar.formatCodeShortcut')
    }
  ];

  // Acciones secundarias (desplegable)
  const secondaryActions = [
    {
      id: 'packages',
      icon: 'package',
      label: t('toolbar.packages'),
      onClick: handleOpenPackages
    },
    {
      id: 'examples',
      icon: 'code',
      label: t('toolbar.examples'),
      onClick: handleOpenExamples
    },
    {
      id: 'console',
      icon: 'terminal',
      label: t('toolbar.toggleConsole'),
      onClick: handleToggleConsole,
      shortcut: t('toolbar.toggleConsoleShortcut')
    },
    {
      id: 'language',
      icon: 'language',
      label: t('toolbar.language'),
      onClick: () => setActiveMenu(activeMenu === 'language' ? null : 'language'),
      hasSubmenu: true
    },
    { divider: true },
    {
      id: 'theme',
      icon: 'theme',
      label: t('toolbar.toggleTheme'),
      onClick: handleToggleTheme
    },
    {
      id: 'settings',
      icon: 'settings',
      label: t('toolbar.settings'),
      onClick: handleOpenSettings
    },
    {
      id: 'help',
      icon: 'help',
      label: t('toolbar.help'),
      onClick: handleOpenHelp,
      shortcut: t('toolbar.helpShortcut')
    }
  ];

  const toolbarClasses = [
    'floating-toolbar',
    `floating-toolbar--${position}`,
    isCollapsed ? 'floating-toolbar--collapsed' : '',
    isDragging ? 'floating-toolbar--dragging' : '',
    dragPosition ? 'floating-toolbar--custom-position' : ''
  ].filter(Boolean).join(' ');

  const toolbarStyle = dragPosition ? {
    position: 'fixed',
    left: `${dragPosition.x}px`,
    top: `${dragPosition.y}px`,
    transform: 'none'
  } : {};

  return (
    <div
      ref={toolbarRef}
      className={toolbarClasses}
      style={toolbarStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="floating-toolbar__container">
        {/* Drag Handle */}
        <div className="floating-toolbar__drag-handle">
          <Icon name="menu" size="small" strokeWidth={1.5} />
        </div>

        {/* Primary Actions - Solo iconos */}
        <div className="floating-toolbar__primary">
          {primaryActions.map((action, index) => (
            <Tooltip
              key={action.id}
              content={
                <div className="toolbar-tooltip">
                  <div>{action.label}</div>
                  {action.shortcut && (
                    <div className="toolbar-tooltip__shortcut">{action.shortcut}</div>
                  )}
                </div>
              }
              placement="top"
            >
              <Button
                variant={action.variant}
                size="medium"
                icon={<Icon name={action.icon} strokeWidth={1.5} />}
                onClick={action.onClick}
                className="toolbar-action toolbar-action--icon-only"
                loading={action.id === 'run' && isExecuting}
                aria-label={action.label}
              />
            </Tooltip>
          ))}
        </div>

        {/* Separator */}
        <div className="floating-toolbar__separator"></div>

        {/* Secondary Actions Menu - Solo iconos */}
        <div className="floating-toolbar__secondary">
          <Tooltip content={t('toolbar.moreActions')} placement="top">
            <Button
              variant="ghost"
              size="medium"
              icon={<Icon name="more" strokeWidth={1.5} />}
              onClick={() => setActiveMenu(activeMenu === 'secondary' ? null : 'secondary')}
              className="toolbar-action toolbar-action--icon-only"
              aria-label={t('toolbar.moreActions')}
            />
          </Tooltip>

          {/* Language Submenu */}
          {activeMenu === 'language' && (
            <div className="floating-toolbar__dropdown language-dropdown">
              <div className="dropdown-header">{t('toolbar.language')}</div>
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  className={`dropdown-item ${currentLanguage === lang.code ? 'active' : ''}`}
                  onClick={() => handleChangeLanguage(lang.code)}
                >
                  <Icon name="language" size="small" strokeWidth={1.5} />
                  <span className="dropdown-item__label">{lang.nativeName}</span>
                  {currentLanguage === lang.code && (
                    <Icon name="check" size="small" strokeWidth={1.5} className="dropdown-item__check" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Dropdown Menu */}
          {activeMenu === 'secondary' && (
            <div className="floating-toolbar__dropdown">
              {secondaryActions.map((action, index) => (
                action.divider ? (
                  <div key={`divider-${index}`} className="dropdown-divider"></div>
                ) : (
                  <button
                    key={action.id}
                    className="dropdown-item"
                    onClick={action.onClick}
                  >
                    <Icon name={action.icon} size="small" strokeWidth={1.5} />
                    <span className="dropdown-item__label">{action.label}</span>
                    {action.shortcut && (
                      <span className="dropdown-item__shortcut">{action.shortcut}</span>
                    )}
                    {action.hasSubmenu && (
                      <Icon name="chevron-right" size="small" strokeWidth={1.5} className="dropdown-item__arrow" />
                    )}
                  </button>
                )
              ))}
            </div>
          )}
        </div>

        {/* Collapse Toggle - Solo icono */}
        <div className="floating-toolbar__toggle">
          <Tooltip content={isCollapsed ? t('toolbar.expand') : t('toolbar.collapse')} placement="top">
            <Button
              variant="ghost"
              size="small"
              icon={<Icon name={isCollapsed ? 'expand' : 'collapse'} strokeWidth={1.5} />}
              onClick={onToggle}
              className="toolbar-action toolbar-action--icon-only"
              aria-label={isCollapsed ? t('toolbar.expand') : t('toolbar.collapse')}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default FloatingToolbar;