import { useEffect, useState } from 'react';
import './BrowserPickerDialog.css';

/*
 * Asks the user to add the ZenTap extension to a browser, listing the browsers
 * actually installed on this machine. Clicking one opens that browser at the
 * extension's install page - the browser still asks for confirmation itself,
 * which no application can skip.
 */
export default function BrowserPickerDialog({ onClose }) {
  const [browsers, setBrowsers] = useState(null);

  useEffect(() => {
    window.electron?.getBrowsers?.()
      .then((found) => setBrowsers(found || []))
      .catch(() => setBrowsers([]));
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="bp-overlay" onClick={onClose} role="presentation">
      <div
        className="bp-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add the ZenTap extension"
      >
        <h2 className="bp-title">Add ZenTap to your browser</h2>
        <p className="bp-body">
          Website blocking needs the ZenTap extension. Pick a browser and its
          install page opens — the browser will ask you to confirm.
        </p>

        <div className="bp-list">
          {browsers === null && <div className="bp-empty">Looking for browsers…</div>}
          {browsers?.length === 0 && <div className="bp-empty">No supported browser found.</div>}
          {browsers?.map((browser) => (
            <button
              key={browser.id}
              type="button"
              className="bp-browser"
              onClick={() => window.electron?.openExtensionPage?.(browser.id)}
            >
              <span className="bp-icon">
                {browser.icon && <img src={browser.icon} alt="" draggable={false} />}
              </span>
              <span className="bp-name">{browser.name}</span>
            </button>
          ))}
        </div>

        <button type="button" className="bp-done" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
