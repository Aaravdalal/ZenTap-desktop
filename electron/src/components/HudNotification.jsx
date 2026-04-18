import './HudNotification.css';

export default function HudNotification({ message }) {
  if (!message) return null;

  return (
    <div className="hud-container">
      <div className="hud-pill">
        <span>{message}</span>
      </div>
    </div>
  );
}
