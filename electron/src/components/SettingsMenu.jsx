import { useState } from 'react';
import './SettingsMenu.css';

export default function SettingsMenu({ onClose }) {
  const [muted, setMuted] = useState(false);

  const toggleNotif = () => {
    const newVal = !muted;
    setMuted(newVal);
    window.electron?.toggleNotifications(newVal);
  };

  return (
    <>
      <div className="settings-backdrop" onClick={onClose}></div>
      <div className="settings-menu">
        <div className="menu-item" onClick={toggleNotif}>
          <span>{muted ? "🔕" : "🔔"}</span>
          <span>Notifications</span>
          <div className={`toggle-pill ${muted ? 'on' : 'off'}`}>
             <div className="toggle-circle"></div>
          </div>
        </div>
        <div className="menu-divider"></div>
        <div className="menu-item" onClick={() => window.electron?.showError('Founders', 'Founders popup coming soon!')}>
          <img src="/founders_icon.png" alt="Founders" width={20} />
          <span>Founders</span>
        </div>
        <div className="menu-item" onClick={() => window.electron?.showError('Whats New', 'ZenTap v27.0\\n\\n• Settings menu\\n• Browser tab blocking\\n• Notifications silencer')}>
          <img src="/whatsnew_icon.png" alt="What's New" width={20} />
          <span>What's New</span>
        </div>
        <div className="menu-divider"></div>
        <div className="menu-item text-red" onClick={() => {}}>
          <img src="/unpair_usb.png" alt="Unpair" width={20} />
          <span>Unpair USB Key</span>
        </div>
      </div>
    </>
  );
}
