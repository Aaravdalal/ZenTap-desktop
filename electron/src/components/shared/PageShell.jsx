import './PageShell.css';

function BackArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PageShell({ title, onBack, headerExtra, children, contentClassName = '' }) {
  return (
    <div className="page-shell">
      <div className="page-shell-header">
        <button
          className={`page-back-btn ${onBack ? '' : 'invisible'}`}
          onClick={onBack}
          disabled={!onBack}
          aria-hidden={!onBack}
        >
          <BackArrowIcon />
        </button>
        <h2 className="page-shell-title">{title}</h2>
        {headerExtra && <div className="page-shell-header-extra">{headerExtra}</div>}
      </div>
      <div className={`page-shell-content ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
