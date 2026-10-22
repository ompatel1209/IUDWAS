import React from 'react';
import { AppleModal } from './AppleModal';
import { AppleButton } from './AppleButton';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}) => {
  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={
        <>
          <AppleButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </AppleButton>
          <AppleButton
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </AppleButton>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-2xl flex-shrink-0 ${
            destructive ? 'bg-red-500/10 text-apple-red' : 'bg-blue-500/10 text-apple-blue'
          }`}
        >
          {destructive ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed pt-1">
          {message}
        </p>
      </div>
    </AppleModal>
  );
};
