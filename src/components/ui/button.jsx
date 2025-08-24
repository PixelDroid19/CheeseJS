import React, { forwardRef } from 'react';
import './button.css';

/**
 * Button Component
 * Componente de botón reutilizable con múltiples variantes y tamaños
 */
export const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const baseClass = 'ui-button';
  const variantClass = `ui-button--${variant}`;
  const sizeClass = `ui-button--${size}`;
  const disabledClass = disabled ? 'ui-button--disabled' : '';
  const loadingClass = loading ? 'ui-button--loading' : '';
  const fullWidthClass = fullWidth ? 'ui-button--full-width' : '';
  const iconOnlyClass = !children && icon ? 'ui-button--icon-only' : '';

  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    disabledClass,
    loadingClass,
    fullWidthClass,
    iconOnlyClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="ui-button__spinner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5C11.59 1.5 14.5 4.41 14.5 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <span className="ui-button__icon ui-button__icon--left">
          {icon}
        </span>
      )}
      
      {children && (
        <span className="ui-button__text">
          {children}
        </span>
      )}
      
      {icon && iconPosition === 'right' && !loading && (
        <span className="ui-button__icon ui-button__icon--right">
          {icon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;