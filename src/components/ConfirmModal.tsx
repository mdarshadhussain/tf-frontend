import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Proceed', 
  cancelText = 'Cancel',
  variant = 'warning'
}: ConfirmModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay confirm-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`glass-card confirm-modal-content variant-${variant}`}
          >
            <div className="confirm-header">
              <div className="icon-badge">
                <AlertTriangle size={24} />
              </div>
              <h3>{title}</h3>
              <button onClick={onCancel} className="icon-btn close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="confirm-body">
              <p>{message}</p>
            </div>

            <div className="confirm-footer">
              <button onClick={onCancel} className="btn btn-ghost">
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onCancel();
                }} 
                className={`btn btn-primary ${variant === 'danger' ? 'btn-danger' : ''}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
