import React from 'react';
import {
  // Acciones básicas
  Play, Pause, Square, RotateCcw, Search, Settings, X, Plus, Minus, Trash2,
  Edit, Save, Download, Upload, Copy, Clipboard, Scissors,
  // Navegación
  Home, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Menu, MoreHorizontal,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  // Archivos y carpetas
  File, Folder, FolderOpen, Image, Code, Package,
  // Estados
  Check, AlertTriangle, Info, Loader, X as XIcon,
  // Comunicación
  Mail, MessageCircle, Bell, Share, Link,
  // Usuario
  User, Users, LogOut, LogIn,
  // Desarrollo
  Terminal, Monitor, Bug, GitBranch, GitCommit, GitMerge,
  // Herramientas
  Wrench, Sliders, Palette, Globe, HelpCircle, BookOpen,
  // Medios
  PlayCircle, Volume2, VolumeX, Maximize, Minimize,
  // Conectividad
  Wifi, Bluetooth, WifiOff, Circle,
  // Seguridad
  Lock, Unlock, Key, Shield,
  // Formateo y desarrollo
  AlignLeft, Type, Zap
} from 'lucide-react';
import './icon.css';

/**
 * Icon Component - Actualizado con Lucide React
 * Componente de icono reutilizable con iconos ligeros de Lucide
 */
export const Icon = ({
  name,
  size = 'medium',
  color,
  className = '',
  style = {},
  strokeWidth = 2,
  ...props
}) => {
  const baseClass = 'ui-icon';
  const sizeClass = `ui-icon--${size}`;
  const classes = [baseClass, sizeClass, className].filter(Boolean).join(' ');

  const iconStyle = {
    ...style,
    ...(color && { color })
  };

  // Map de iconos Lucide disponibles
  const iconMap = {
    // Acciones básicas - FloatingToolbar
    'play': Play,
    'pause': Pause,
    'stop': Square,
    'refresh': RotateCcw,
    'search': Search,
    'settings': Settings,
    'close': X,
    'add': Plus,
    'remove': Minus,
    'delete': Trash2,
    'edit': Edit,
    'save': Save,
    'download': Download,
    'upload': Upload,
    'copy': Copy,
    'paste': Clipboard,
    'cut': Scissors,
    'format': AlignLeft, // Para formatear código
    
    // Navegación
    'home': Home,
    'back': ArrowLeft,
    'forward': ArrowRight,
    'up': ArrowUp,
    'down': ArrowDown,
    'left': ArrowLeft,
    'right': ArrowRight,
    'menu': Menu,
    'more': MoreHorizontal,
    'expand': ChevronDown,
    'collapse': ChevronUp,
    'chevron-right': ChevronRight,
    'chevron-left': ChevronLeft,
    
    // Archivos y carpetas
    'file': File,
    'folder': Folder,
    'folder-open': FolderOpen,
    'image': Image,
    'code': Code,
    'package': Package,
    
    // Estados
    'success': Check,
    'error': XIcon,
    'warning': AlertTriangle,
    'info': Info,
    'loading': Loader,
    'check': Check,
    'x': XIcon,
    
    // Comunicación
    'mail': Mail,
    'message': MessageCircle,
    'notification': Bell,
    'share': Share,
    'link': Link,
    
    // Usuario
    'user': User,
    'users': Users,
    'profile': User,
    'logout': LogOut,
    'login': LogIn,
    
    // Desarrollo
    'terminal': Terminal,
    'console': Monitor,
    'debug': Bug,
    'git': GitBranch,
    'branch': GitBranch,
    'commit': GitCommit,
    'merge': GitMerge,
    
    // Herramientas
    'tools': Wrench,
    'config': Settings,
    'preferences': Sliders,
    'theme': Palette,
    'language': Globe,
    'help': HelpCircle,
    'docs': BookOpen,
    
    // Medios
    'play-circle': PlayCircle,
    'volume': Volume2,
    'mute': VolumeX,
    'fullscreen': Maximize,
    'minimize': Minimize,
    'maximize': Maximize,
    
    // Conectividad
    'wifi': Wifi,
    'bluetooth': Bluetooth,
    'offline': WifiOff,
    'online': Circle,
    'sync': RotateCcw,
    
    // Seguridad
    'lock': Lock,
    'unlock': Unlock,
    'key': Key,
    'shield': Shield,
    'security': Shield,
    
    // CheeseJS específicos
    'cheese': Circle, // Placeholder, puede usar un ícono personalizado
    'javascript': Code,
    'node': Circle,
    'npm': Package,
    'vite': Zap,
    'tauri': Shield
  };

  const IconComponent = iconMap[name];
  
  // Si no encontramos el ícono, mostramos un placeholder
  if (!IconComponent) {
    console.warn(`Ícono '${name}' no encontrado en Lucide React`);
    return (
      <HelpCircle 
        className={classes}
        style={iconStyle}
        strokeWidth={strokeWidth}
        {...props}
      />
    );
  }

  return (
    <IconComponent
      className={classes}
      style={iconStyle}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};

export default Icon;