import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import PageShell from '../shared/PageShell';
import './SettingsScreen.css';

function comingSoon(title) {
  window.electron?.showError?.(title, `${title} coming soon!`);
}

export default function SettingsScreen({ onEmergencyUnblock, isBlocking }) {
  const [muted, setMuted] = useState(false);

  const toggleNotif = () => {
    const newVal = !muted;
    setMuted(newVal);
    window.electron?.toggleNotifications(newVal);
  };

  return (
    <PageShell title="Settings">
      <div className="settings-screen">
        <div className="settings-col">
          <div className="settings-card" onClick={() => isBlocking ? onEmergencyUnblock() : comingSoon('Emergency Unblock')}>
            <div className="settings-card-title-row">
              <span className="settings-card-title">Emergency Unblock</span>
              <ChevronRight size={18} />
            </div>
            <p className="settings-card-desc">Interrupts focus sessions unlocking all apps and websites. Use sparingly!</p>
          </div>

          <div className="settings-card">
            <div className="settings-card-title-row">
              <span className="settings-card-title">Block Notifications</span>
              <div className={`settings-toggle ${muted ? 'on' : 'off'}`} onClick={toggleNotif}>
                <div className="settings-toggle-circle" />
              </div>
            </div>
            <p className="settings-card-desc">If this is toggled all notifications will be blocked, and will appear below.</p>
          </div>

          <div className="settings-card settings-card-group">
            <div className="settings-row" onClick={() => comingSoon('Privacy Policy')}>
              <span>Privacy Policy</span>
              <ChevronRight size={18} />
            </div>
            <div className="settings-row-divider" />
            <div className="settings-row" onClick={() => comingSoon('Why ZenTap?')}>
              <span>Why ZenTap?</span>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>

        <div className="settings-col">
          <div className="settings-card" onClick={() => comingSoon('Contact Us')}>
            <div className="settings-card-title-row">
              <span className="settings-card-title">Contact Us</span>
              <ChevronRight size={18} />
            </div>
            <p className="settings-card-desc">If you have any questions, concerns, or problems please feel free to reach out to us.</p>
          </div>

          <div className="settings-card settings-refer-card" onClick={() => comingSoon('Refer Us')}>
            <span className="settings-card-title">Refer Us</span>
            <p className="settings-card-desc">Share ZenTap with friends!</p>
            <img src="/z_icon.png" alt="" className="settings-refer-icon" />
          </div>

          <div className="settings-card settings-card-group">
            <div className="settings-row" onClick={() => comingSoon('Troubleshooting')}>
              <span>Troubleshooting</span>
              <ChevronRight size={18} />
            </div>
            <div className="settings-row-divider" />
            <div className="settings-row" onClick={() => comingSoon('FAQ')}>
              <span>FAQ</span>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
      <p className="settings-footer">Designed with love in Sunnyvale, California</p>
    </PageShell>
  );
}
