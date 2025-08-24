import React, { useState, useEffect } from 'react';
import { eventBus } from '../../utils/event-bus.js';
import { Modal, Button, Icon } from '../ui/index.js';
import { SettingsModal } from './modals/settings-modal.jsx';
import { HelpModal } from './modals/help-modal.jsx';
import { ExamplesModal, PackagesModal, ConfirmModal } from './modals/additional-modals.jsx';
import './modal-manager.css';

/**
 * ModalManager Component
 * Gestiona todos los modales de la aplicación de forma centralizada
 */
export const ModalManager = () => {
  const [modals, setModals] = useState([]);

  useEffect(() => {
    // Suscribirse a eventos de modal
    const unsubscribeOpen = eventBus.subscribe('modal:open', (data) => {
      openModal(data);
    });

    const unsubscribeClose = eventBus.subscribe('modal:close', (data) => {
      closeModal(data?.id);
    });

    const unsubscribeCloseAll = eventBus.subscribe('modal:close-all', () => {
      closeAllModals();
    });

    // Eventos específicos para retrocompatibilidad
    const unsubscribeSettingsRequested = eventBus.subscribe('settings:dialog-requested', () => {
      openModal({ type: 'settings', title: 'Configuración', size: 'large' });
    });

    const unsubscribePackageInstallRequested = eventBus.subscribe('package:install-dialog-requested', () => {
      openModal({ type: 'packages', title: 'Gestión de Paquetes', size: 'medium' });
    });

    const unsubscribeHelpRequested = eventBus.subscribe('help:dialog-requested', () => {
      openModal({ type: 'help', title: 'Ayuda', size: 'large' });
    });

    return () => {
      unsubscribeOpen();
      unsubscribeClose();
      unsubscribeCloseAll();
      unsubscribeSettingsRequested();
      unsubscribePackageInstallRequested();
      unsubscribeHelpRequested();
    };
  }, []);

  const openModal = (modalData) => {
    const modal = {
      id: modalData.id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: modalData.type,
      title: modalData.title,
      size: modalData.size || 'medium',
      props: modalData.props || {},
      closeOnBackdrop: modalData.closeOnBackdrop !== false,
      closeOnEscape: modalData.closeOnEscape !== false,
      showCloseButton: modalData.showCloseButton !== false
    };

    setModals(prev => [...prev, modal]);
    return modal.id;
  };

  const closeModal = (modalId) => {
    if (!modalId) {
      // Cerrar el último modal si no se especifica ID
      setModals(prev => prev.slice(0, -1));
    } else {
      setModals(prev => prev.filter(modal => modal.id !== modalId));
    }
  };

  const closeAllModals = () => {
    setModals([]);
  };

  const handleModalClose = (modalId) => {
    closeModal(modalId);
    eventBus.emit('modal:closed', { id: modalId });
  };

  const renderModalContent = (modal) => {
    switch (modal.type) {
      case 'settings':
        return <SettingsModal {...modal.props} onClose={() => handleModalClose(modal.id)} />;
      
      case 'help':
        return <HelpModal {...modal.props} onClose={() => handleModalClose(modal.id)} />;
      
      case 'examples':
        return <ExamplesModal {...modal.props} onClose={() => handleModalClose(modal.id)} />;
      
      case 'packages':
        return <PackagesModal {...modal.props} onClose={() => handleModalClose(modal.id)} />;
      
      case 'confirm':
        return (
          <ConfirmModal 
            {...modal.props} 
            onClose={() => handleModalClose(modal.id)}
            onConfirm={() => {
              modal.props.onConfirm?.();
              handleModalClose(modal.id);
            }}
            onCancel={() => {
              modal.props.onCancel?.();
              handleModalClose(modal.id);
            }}
          />
        );
      
      case 'custom':
        // Para modales custom que pasan su propio contenido
        return modal.props.content;
      
      default:
        return (
          <div className="modal-error">
            <Icon name="warning" size="large" color="var(--color-warning)" />
            <h3>Tipo de modal desconocido</h3>
            <p>El tipo de modal "{modal.type}" no está registrado.</p>
            <Button 
              variant="primary" 
              onClick={() => handleModalClose(modal.id)}
            >
              Cerrar
            </Button>
          </div>
        );
    }
  };

  // No renderizar nada si no hay modales
  if (modals.length === 0) {
    return null;
  }

  return (
    <>
      {modals.map((modal, index) => (
        <Modal
          key={modal.id}
          isOpen={true}
          onClose={() => handleModalClose(modal.id)}
          title={modal.title}
          size={modal.size}
          closeOnBackdrop={modal.closeOnBackdrop}
          closeOnEscape={modal.closeOnEscape}
          showCloseButton={modal.showCloseButton}
          className={`modal-manager__modal modal-manager__modal--${modal.type}`}
          style={{
            zIndex: `calc(var(--z-modal) + ${index * 10})`
          }}
        >
          {renderModalContent(modal)}
        </Modal>
      ))}
    </>
  );
};

export default ModalManager;