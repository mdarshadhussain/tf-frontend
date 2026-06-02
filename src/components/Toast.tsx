import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

const Toast = ({ id, message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle2 size={20} color="#10b981" />,
    error: <AlertCircle size={20} color="#ef4444" />,
    info: <Info size={20} color="#6366f1" />,
    warning: <AlertTriangle size={20} color="#f59e0b" />
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`premium-toast toast-${type}`}
    >
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-content">
        <p>{message}</p>
      </div>
      <button onClick={() => onClose(id)} className="toast-close">
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default Toast;
