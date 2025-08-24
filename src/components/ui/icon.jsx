import React from 'react';
import './icon.css';

/**
 * Icon Component
 * Componente de icono reutilizable con soporte para múltiples sets de iconos
 */
export const Icon = ({
  name,
  size = 'medium',
  color,
  className = '',
  style = {},
  ...props
}) => {
  const baseClass = 'ui-icon';
  const sizeClass = `ui-icon--${size}`;
  const classes = [baseClass, sizeClass, className].filter(Boolean).join(' ');

  const iconStyle = {
    ...style,
    ...(color && { color })
  };

  // Map de iconos disponibles
  const iconMap = {
    // Acciones básicas
    'play': '▶️',
    'pause': '⏸️',
    'stop': '⏹️',
    'refresh': '🔄',
    'search': '🔍',
    'settings': '⚙️',
    'close': '✕',
    'add': '➕',
    'remove': '➖',
    'delete': '🗑️',
    'edit': '✏️',
    'save': '💾',
    'download': '⬇️',
    'upload': '⬆️',
    'copy': '📋',
    'paste': '📄',
    'cut': '✂️',
    
    // Navegación
    'home': '🏠',
    'back': '⬅️',
    'forward': '➡️',
    'up': '⬆️',
    'down': '⬇️',
    'left': '⬅️',
    'right': '➡️',
    'menu': '☰',
    'more': '⋯',
    'expand': '⌄',
    'collapse': '⌃',
    
    // Archivos y carpetas
    'file': '📄',
    'folder': '📁',
    'folder-open': '📂',
    'image': '🖼️',
    'code': '💻',
    'package': '📦',
    
    // Estados
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️',
    'loading': '⏳',
    'check': '✓',
    'x': '✗',
    
    // Comunicación
    'mail': '📧',
    'message': '💬',
    'notification': '🔔',
    'share': '📤',
    'link': '🔗',
    
    // Usuario
    'user': '👤',
    'users': '👥',
    'profile': '🧑',
    'logout': '🚪',
    'login': '🔑',
    
    // Desarrollo
    'terminal': '⌨️',
    'console': '🖥️',
    'debug': '🐛',
    'git': '🌿',
    'branch': '🌳',
    'commit': '📝',
    'merge': '🔀',
    'pull': '⬇️',
    'push': '⬆️',
    
    // Herramientas
    'tools': '🔧',
    'config': '⚙️',
    'preferences': '🎛️',
    'theme': '🎨',
    'language': '🌐',
    'help': '❓',
    'docs': '📚',
    
    // Medios
    'play-circle': '⏯️',
    'volume': '🔊',
    'mute': '🔇',
    'fullscreen': '⛶',
    'minimize': '🗕',
    'maximize': '🗖',
    
    // Conectividad
    'wifi': '📶',
    'bluetooth': '🔵',
    'offline': '📴',
    'online': '🟢',
    'sync': '🔄',
    
    // Seguridad
    'lock': '🔒',
    'unlock': '🔓',
    'key': '🔑',
    'shield': '🛡️',
    'security': '🔐',
    
    // CheeseJS específicos
    'cheese': '🧀',
    'javascript': '🟨',
    'node': '🟢',
    'npm': '📦',
    'vite': '⚡',
    'tauri': '🦀'
  };

  const iconContent = iconMap[name] || name || '❓';

  return (
    <span
      className={classes}
      style={iconStyle}
      role="img"
      aria-label={name}
      {...props}
    >
      {iconContent}
    </span>
  );
};

export default Icon;