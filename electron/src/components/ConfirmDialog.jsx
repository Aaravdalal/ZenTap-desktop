import { useEffect } from 'react';
import './ConfirmDialog.css';

/*
 * The warning dialog from UI References/Emergency_Unblock.png: a mauve card
 * with a red triangle, the question, and No / Yes.
 */
export default function ConfirmDialog({
  title = 'WARNING',
  children,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}) {
  // Escape is the safe answer here, so it cancels.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="cd-overlay" onClick={onCancel} role="presentation">
      <div
        className="cd-card"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="cd-head">
          <svg className="cd-mark" viewBox="0 0 100 88" aria-hidden="true">
            <path
              d="M50 4 L96 84 H4 Z"
              fill="#ff383c"
              stroke="#ff383c"
              strokeWidth="16"
              strokeLinejoin="round"
            />
          </svg>
          <span className="cd-title">{title}</span>
        </div>

        <div className="cd-body">{children}</div>

        <div className="cd-actions">
          <button type="button" className="cd-no" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="cd-yes" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
