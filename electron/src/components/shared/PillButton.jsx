import './PillButton.css';

export default function PillButton({ variant = 'black', children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`pill-btn pill-btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
