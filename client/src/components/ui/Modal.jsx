import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative bg-surface rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-display font-semibold text-primary">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <IoClose size={22} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">{children}</div>
            {footer && <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, children, confirmText = 'Confirm', loading = false, danger = false }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </>
    }
  >
    {children || <p className="text-text-secondary">{message}</p>}
  </Modal>
);

export default Modal;
