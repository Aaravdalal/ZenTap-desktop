import { ChevronRight } from 'lucide-react';
import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import { asset } from '../shared/designArtboard';
import { useLinks, openLink } from '../shared/useLinks';
import './SettingsScreen.css';

/*
 * Settings screen — laid out on the 2135 x 1281 artboard measured from
 * UI References/Settings.png.
 */
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
  // Every URL here is editable in electron/links.md.
  const links = useLinks();
  const open = openLink;

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
          Interrupts focus sessions, unlocking all apps and websites. Use sparingly!
        </span>
        <span className="se-chevron-slot" style={{ left: 782, top: 31 }}><Chevron /></span>
      </button>

      <div className="se-card static" style={{ left: 133, top: 464, width: 874, height: 217 }}>
        <span className="se-heading" style={{ left: 25, top: 24 }}>Block Notifications</span>
        <span className="se-desc" style={{ left: 27, top: 118, width: 845 }}>
          If this is toggled, all notifications are blocked while a session runs.
        </span>
        <button
          type="button"
          className={`se-toggle ${blockNotifications ? 'on' : ''}`}
          style={{ left: 702, top: 27, width: 149, height: 61 }}
          onClick={() => onToggleNotifications?.(!blockNotifications)}
          aria-pressed={blockNotifications}
          aria-label="Block notifications during a session"
        >
          {/*
            * Redrawn from the supplied artwork (track 149x62, the knob a
            * rounded triangle 38x44 punched through it) so the knob can
            * actually travel instead of the two states cross-fading.
            */}
          <svg className="se-toggle-svg" viewBox="0 0 149 62" aria-hidden="true">
            <defs>
              <mask id="se-toggle-hole">
                <rect width="149" height="62" rx="31" fill="#ffffff" />
                <path
                  className="se-toggle-knob"
                  d="M25 18 L45 31 L25 44 Z"
                  fill="#000000"
                  stroke="#000000"
                  strokeWidth="18"
                  strokeLinejoin="round"
                />
              </mask>
            </defs>
            <rect className="se-toggle-track" width="149" height="62" rx="31" mask="url(#se-toggle-hole)" />
          </svg>
        </button>
      </div>

      <div className="se-card static" style={{ left: 133, top: 722, width: 874, height: 217 }}>
        <button type="button" className="se-subrow" style={{ top: 0, height: 106 }} onClick={() => open(links.privacy)}>
          <span className="se-heading" style={{ left: 46, top: 24 }}>Privacy Policy</span>
          <span className="se-chevron-slot" style={{ left: 787, top: 18 }}><Chevron /></span>
        </button>
        <div className="se-subdivider" style={{ top: 106 }} />
        <button type="button" className="se-subrow" style={{ top: 107, height: 110 }} onClick={() => open(links.why)}>
          <span className="se-heading" style={{ left: 43, top: 24 }}>Why ZenTap?</span>
          <span className="se-chevron-slot" style={{ left: 787, top: 31 }}><Chevron /></span>
        </button>
      </div>

      <button
        type="button"
        className="se-card"
        style={{ left: 1140, top: 205, width: 874, height: 217 }}
        onClick={() => open(links.contact)}
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
        onClick={() => open(links.refer)}
      >
        <img className="se-refer-art" src={asset('refer_art')} alt="" draggable={false} />
        <span className="se-heading" style={{ left: 31, top: 30 }}>Refer Us</span>
        <span className="se-desc" style={{ left: 26, top: 107, width: 290 }}>Share ZenTap with friends!</span>
      </button>

      <button
        type="button"
        className="se-card"
        style={{ left: 1140, top: 722, width: 874, height: 95 }}
        onClick={() => open(links.troubleshooting)}
      >
        <span className="se-heading" style={{ left: 26, top: 15 }}>Troubleshooting</span>
        <span className="se-chevron-slot" style={{ left: 788, top: 16 }}><Chevron /></span>
      </button>

      <button
        type="button"
        className="se-card"
        style={{ left: 1140, top: 844, width: 874, height: 95 }}
        onClick={() => open(links.faq)}
      >
        <span className="se-heading" style={{ left: 40, top: 16 }}>FAQ</span>
        <span className="se-chevron-slot" style={{ left: 788, top: 16 }}><Chevron /></span>
      </button>

      {/*
        * Pulled in from the reference's own position: there the pill's
        * bottom-right corner pokes about 2 units past the card's rounded
        * corner. This clears it.
        */}
      <div className="se-footer" style={{ left: 1694, top: 1036, width: 365, height: 40 }}>
        Designed with love in Sunnyvale, California
      </div>
    </DesignStage>
  );
}
