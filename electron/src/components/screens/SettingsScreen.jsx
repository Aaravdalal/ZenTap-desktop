import { ChevronRight } from 'lucide-react';
import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import { asset } from '../shared/designArtboard';
import './SettingsScreen.css';

/*
 * Settings screen — laid out on the 2135 x 1281 artboard measured from
 * UI References/Settings.png.
 */
const LINKS = {
  privacy: 'https://zentap.app/privacy',
  why: 'https://zentap.app/why',
  contact: 'mailto:hello@zentap.app',
  troubleshooting: 'https://zentap.app/troubleshooting',
  faq: 'https://zentap.app/faq',
  refer: 'https://zentap.app',
};

const Chevron = () => (
  <span className="se-chevron"><ChevronRight size={32} strokeWidth={2.4} /></span>
);

export default function SettingsScreen({
  isBlocking,
  onEmergencyUnblock,
  blockNotifications = false,
  onToggleNotifications,
  activeTab,
  onChangeTab,
  onBack,
}) {
  const open = (url) => {
    if (window.electron?.openExternal) window.electron.openExternal(url);
    else window.open(url, '_blank');
  };

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={55} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />
      <div className="ds-title">Settings</div>

      <button
        type="button"
        className="se-card"
        style={{ left: 133, top: 205, width: 874, height: 217 }}
        onClick={onEmergencyUnblock}
        disabled={!isBlocking}
      >
        <span className="se-heading" style={{ left: 35, top: 37 }}>Emergency Unblock</span>
        <span className="se-desc" style={{ left: 28, top: 116, width: 845 }}>
          Interrupts focus sessions unlocking all apps and websites. Use sparingly!
        </span>
        <span className="se-chevron-slot" style={{ left: 782, top: 31 }}><Chevron /></span>
      </button>

      <div className="se-card static" style={{ left: 133, top: 464, width: 874, height: 217 }}>
        <span className="se-heading" style={{ left: 25, top: 24 }}>Block Notifications</span>
        <span className="se-desc" style={{ left: 27, top: 118, width: 845 }}>
          If this is toggled all notification will be blocked, and will appear below.
        </span>
        <button
          type="button"
          className={`se-toggle ${blockNotifications ? 'on' : ''}`}
          style={{ left: 702, top: 27, width: 149, height: 61 }}
          onClick={() => onToggleNotifications?.(!blockNotifications)}
          aria-pressed={blockNotifications}
        >
          <span className="se-knob" />
        </button>
      </div>

      <div className="se-card static" style={{ left: 133, top: 722, width: 874, height: 217 }}>
        <button type="button" className="se-subrow" style={{ top: 0, height: 106 }} onClick={() => open(LINKS.privacy)}>
          <span className="se-heading" style={{ left: 46, top: 24 }}>Privacy Policy</span>
          <span className="se-chevron-slot" style={{ left: 787, top: 18 }}><Chevron /></span>
        </button>
        <div className="se-subdivider" style={{ top: 106 }} />
        <button type="button" className="se-subrow" style={{ top: 107, height: 110 }} onClick={() => open(LINKS.why)}>
          <span className="se-heading" style={{ left: 43, top: 24 }}>Why ZenTap?</span>
          <span className="se-chevron-slot" style={{ left: 787, top: 31 }}><Chevron /></span>
        </button>
      </div>

      <button
        type="button"
        className="se-card"
        style={{ left: 1140, top: 205, width: 874, height: 217 }}
        onClick={() => open(LINKS.contact)}
      >
        <span className="se-heading" style={{ left: 32, top: 36 }}>Contact Us</span>
        <span className="se-desc" style={{ left: 33, top: 111, width: 845 }}>
          If you have any questions, concerns, or problems please feel free to reach out to us.
        </span>
        <span className="se-chevron-slot" style={{ left: 787, top: 17 }}><Chevron /></span>
      </button>

      <button
        type="button"
        className="se-card refer"
        style={{ left: 1140, top: 464, width: 874, height: 217 }}
        onClick={() => open(LINKS.refer)}
      >
        <img className="se-refer-art" src={asset('refer_art')} alt="" draggable={false} />
        <span className="se-heading" style={{ left: 31, top: 30 }}>Refer Us</span>
        <span className="se-desc" style={{ left: 26, top: 107, width: 300 }}>Share ZenTap with friends!</span>
      </button>

      <button
        type="button"
        className="se-card"
        style={{ left: 1140, top: 722, width: 874, height: 95 }}
        onClick={() => open(LINKS.troubleshooting)}
      >
        <span className="se-heading" style={{ left: 26, top: 15 }}>Troubleshooting</span>
        <span className="se-chevron-slot" style={{ left: 788, top: 16 }}><Chevron /></span>
      </button>

      <button
        type="button"
        className="se-card"
        style={{ left: 1140, top: 844, width: 874, height: 95 }}
        onClick={() => open(LINKS.faq)}
      >
        <span className="se-heading" style={{ left: 40, top: 16 }}>FAQ</span>
        <span className="se-chevron-slot" style={{ left: 788, top: 16 }}><Chevron /></span>
      </button>

      <div className="se-footer" style={{ left: 1730, top: 1044, width: 323, height: 29 }}>
        Designed with love in Sunnyvale, California
      </div>
    </DesignStage>
  );
}
