import { asset } from '../shared/designArtboard';
import './sessionModes.css';

export default function ModeCard({ mode, state = 'idle', onClick, children, ariaLabel }) {
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      {...(interactive ? { type: 'button', onClick, 'aria-label': ariaLabel || mode.name } : {})}
      className={`ds-mode-card ${state}`}
      style={{ left: mode.card.x, top: mode.card.y, width: mode.card.w, height: mode.card.h }}
    >
      <img className="ds-mode-bg" src={asset(mode.card.src)} alt="" draggable={false} />
      <img className="ds-mode-el" src={asset(mode.pad.src)} alt="" draggable={false}
           style={{ left: mode.pad.x, top: mode.pad.y, width: mode.pad.w, height: mode.pad.h }} />
      <img className="ds-mode-el" src={asset(mode.icon.src)} alt="" draggable={false}
           style={{ left: mode.icon.x, top: mode.icon.y, width: mode.icon.w, height: mode.icon.h }} />
      <img className="ds-mode-el" src={asset(mode.label.src)} alt="" draggable={false}
           style={{ left: mode.label.x, top: mode.label.y, width: mode.label.w, height: mode.label.h }} />
      {/* The description makes way for the timer picker when there is one. */}
      {!children && (
        <img className="ds-mode-el" src={asset(mode.desc.src)} alt="" draggable={false}
             style={{ left: mode.desc.x, top: mode.desc.y, width: mode.desc.w, height: mode.desc.h }} />
      )}
      {children}
    </Tag>
  );
}
