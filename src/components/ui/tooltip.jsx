import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

/**
 * Tooltip Component
 * Componente de tooltip con posicionamiento inteligente y soporte para themes
 */
export const Tooltip = ({
  children,
  content,
  placement = 'top',
  delay = 500,
  showDelay = 0,
  hideDelay = 0,
  disabled = false,
  trigger = 'hover',
  className = '',
  contentClassName = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = { top: 0, left: 0 };
    let newPlacement = placement;

    // Calcular posición base según placement
    switch (placement) {
      case 'top':
        newPosition.top = triggerRect.top - tooltipRect.height - 8;
        newPosition.left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        newPosition.top = triggerRect.bottom + 8;
        newPosition.left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        newPosition.top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        newPosition.left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        newPosition.top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        newPosition.left = triggerRect.right + 8;
        break;
    }

    // Ajustar si se sale del viewport
    if (newPosition.left < 8) {
      newPosition.left = 8;
    } else if (newPosition.left + tooltipRect.width > viewport.width - 8) {
      newPosition.left = viewport.width - tooltipRect.width - 8;
    }

    if (newPosition.top < 8) {
      if (placement === 'top') {
        newPosition.top = triggerRect.bottom + 8;
        newPlacement = 'bottom';
      } else {
        newPosition.top = 8;
      }
    } else if (newPosition.top + tooltipRect.height > viewport.height - 8) {
      if (placement === 'bottom') {
        newPosition.top = triggerRect.top - tooltipRect.height - 8;
        newPlacement = 'top';
      } else {
        newPosition.top = viewport.height - tooltipRect.height - 8;
      }
    }

    setPosition(newPosition);
    setActualPlacement(newPlacement);
  };

  const show = () => {
    if (disabled) return;
    
    clearTimeout(hideTimeoutRef.current);
    
    if (showDelay > 0) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, showDelay);
    } else {
      setIsVisible(true);
    }
  };

  const hide = () => {
    clearTimeout(showTimeoutRef.current);
    
    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible]);

  const triggerProps = {};
  
  if (trigger === 'hover') {
    triggerProps.onMouseEnter = show;
    triggerProps.onMouseLeave = hide;
  } else if (trigger === 'click') {
    triggerProps.onClick = () => {
      if (isVisible) {
        hide();
      } else {
        show();
      }
    };
  } else if (trigger === 'focus') {
    triggerProps.onFocus = show;
    triggerProps.onBlur = hide;
  }

  const tooltipClasses = [
    'ui-tooltip',
    `ui-tooltip--${actualPlacement}`,
    className
  ].filter(Boolean).join(' ');

  const contentClasses = [
    'ui-tooltip__content',
    contentClassName
  ].filter(Boolean).join(' ');

  return (
    <>
      <span ref={triggerRef} className="ui-tooltip__trigger" {...triggerProps}>
        {children}
      </span>
      
      {isVisible && content && createPortal(
        <div
          ref={tooltipRef}
          className={tooltipClasses}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 'var(--z-tooltip)'
          }}
          role="tooltip"
          {...props}
        >
          <div className={contentClasses}>
            {content}
          </div>
          <div className="ui-tooltip__arrow" />
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;