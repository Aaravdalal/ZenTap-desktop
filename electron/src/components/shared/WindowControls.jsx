import './WindowControls.css';

/*
 * Minimise / maximise / close, sized to match Windows' own caption buttons
 * (46 x 32 with a 10px glyph). `tone="light"` is for screens whose background
 * is grey, where the default translucent-dark buttons disappear.
 */
export default function WindowControls({ tone = 'default' }) {
  return (
    <div className={`win-controls ${tone}`}>
      <button type="button" className="win-btn" onClick={() => window.electron?.minimizeApp?.()} aria-label="Minimize">
        <svg viewBox="0 0 10 1" width="10" height="1"><path d="M0,0h10v1H0z" fill="currentColor" /></svg>
      </button>
      <button type="button" className="win-btn" onClick={() => window.electron?.maximizeApp?.()} aria-label="Maximize">
        <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0,0v10h10V0H0z M1,1h8v8H1V1z" fill="currentColor" /></svg>
      </button>
      <button type="button" className="win-btn close" onClick={() => window.electron?.closeApp?.()} aria-label="Close">
        <svg viewBox="0 0 10 10" width="10" height="10"><path d="M10,1L9,0L5,4L1,0L0,1l4,4L0,9l1,1l4-4l4,4l1-1L6,5L10,1z" fill="currentColor" /></svg>
      </button>
    </div>
  );
}
