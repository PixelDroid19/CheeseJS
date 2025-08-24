import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './button.jsx';
import './modal.css';

/**
 * Modal Component
 * Componente de modal reutilizable con backdrop, animaciones y gestión de foco
 */
export const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  contentClassName = '',
  overlayClassName = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Guardar el elemento con foco actual
      previousFocusRef.current = document.activeElement;
      
      // Enfocar el modal
      modalRef.current?.focus();
      
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
      
      // Manejar tecla Escape
      const handleEscape = (e) => {
        if (closeOnEscape && e.key === 'Escape') {
          onClose?.();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
        
        // Restaurar foco al elemento anterior
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose, closeOnEscape]);

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleClose = () => {
    onClose?.();
  };

  if (!isOpen) return null;

  const baseClass = 'ui-modal';
  const sizeClass = `ui-modal--${size}`;
  const classes = [baseClass, className].filter(Boolean).join(' ');
  
  const overlayClasses = ['ui-modal__overlay', overlayClassName].filter(Boolean).join(' ');
  const contentClasses = ['ui-modal__content', sizeClass, contentClassName].filter(Boolean).join(' ');

  const modalContent = (
    <div className={overlayClasses} onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        {...props}
      >
        <div className={contentClasses}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="ui-modal__header">
              {title && (
                <h2 id="modal-title" className="ui-modal__title">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="small"
                  icon="✕"
                  onClick={handleClose}
                  className="ui-modal__close"
                  aria-label="Cerrar modal"
                />
              )}
            </div>
          )}

          {/* Body */}
          <div className="ui-modal__body">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="ui-modal__footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;