import { Modal as AntModal } from 'antd';
import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Modal Component
 * Reusable modal dialog using Ant Design
 * Maintains same API as custom Modal for backward compatibility
 */
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const widthMap = {
    sm: 448,   // max-w-md
    md: 512,   // max-w-lg
    lg: 672,   // max-w-2xl
    xl: 896,   // max-w-4xl
    full: 1152 // max-w-6xl
  };
  
  const onCloseRef = useRef(onClose);
  
  // Keep ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
  // Handle close by navigating back in browser history
  const handleClose = useCallback((e) => {
    // Prevent all default behaviors
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    
    // Navigate back in browser history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If no history, fall back to onClose callback
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    }
  }, []);
  
  // Intercept close button clicks to navigate back
  useEffect(() => {
    if (!isOpen) return;
    
    const handleCloseButtonClick = (e) => {
      // Find the close button
      const target = e.target;
      const closeButton = target.closest('.ant-modal-close');
      
      if (closeButton) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Navigate back in browser history
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // If no history, fall back to onClose callback
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      }
    };
    
    // Use capture phase to intercept before other handlers
    document.addEventListener('click', handleCloseButtonClick, true);
    
    return () => {
      document.removeEventListener('click', handleCloseButtonClick, true);
    };
  }, [isOpen]);
  
  return (
    <AntModal
      open={isOpen}
      onCancel={handleClose}
      title={title}
      footer={null}
      width={widthMap[size]}
      closable={true}
      maskClosable={true}
      className="custom-modal"
      styles={{
        body: { maxHeight: '90vh', overflowY: 'auto' }
      }}
    >
      {children}
    </AntModal>
  );
};

export default Modal;

