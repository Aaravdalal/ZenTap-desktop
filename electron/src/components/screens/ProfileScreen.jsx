import { Image as ImageIcon, Trash2, UserX } from 'lucide-react';
import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import './ProfileScreen.css';

/*
 * Profile screen — laid out on the 2135 x 1281 artboard measured from
 * UI References/Profile.png.
 */
function formatTime(mins) {
  if (!mins) return '0m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function ProfileScreen({
  screenTime = 0,
  totalTime,
  name = '',
  onChangeName,
  memberSince = '—',
  avatar,
  onPickAvatar,
  onDeleteProfile,
  onUnpairKey,
  activeTab,
  onChangeTab,
  onBack,
}) {
  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={55} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />
      <div className="ds-title">Profile</div>

      {/* Avatar */}
      <div className="pr-avatar" style={{ left: 134, top: 218, width: 632, height: 609 }}>
        {avatar && <img src={avatar} alt="" draggable={false} />}
      </div>
      <button
        type="button"
        className="pr-avatar-badge"
        style={{ left: 653, top: 179, width: 164, height: 164 }}
        onClick={onPickAvatar}
        aria-label="Change picture"
      >
        <ImageIcon size={50} strokeWidth={2} />
      </button>
      {/* Type straight over it; empty shows the placeholder in grey. */}
      <input
        className="pr-name"
        style={{ left: 124, top: 862, width: 632 }}
        value={name}
        placeholder="ZenTap User"
        maxLength={28}
        spellCheck={false}
        onChange={(e) => onChangeName?.(e.target.value)}
        aria-label="Your name"
      />

      {/* Time card */}
      <div className="pr-card" style={{ left: 931, top: 218, width: 1029, height: 340 }} />
      <div className="pr-pill" style={{ left: 961, top: 254, width: 288, height: 71 }}>Today&rsquo;s Time</div>
      <div className="pr-value" style={{ left: 967, top: 361, width: 463, height: 149 }}>{formatTime(screenTime)}</div>
      <div className="pr-vdivider" style={{ left: 1478, top: 254, height: 256 }} />
      <div className="pr-pill" style={{ left: 1527, top: 254, width: 238, height: 71, paddingLeft: 20 }}>Total Time</div>
      <div className="pr-value" style={{ left: 1527, top: 361, width: 387, height: 149 }}>
        {formatTime(totalTime ?? screenTime)}
      </div>

      {/* Member since */}
      <div className="pr-card" style={{ left: 931, top: 592, width: 579, height: 257 }} />
      <div className="pr-pill" style={{ left: 961, top: 623, width: 338, height: 71, paddingLeft: 30 }}>Member Since</div>
      <div className="pr-value" style={{ left: 961, top: 721, width: 508, height: 103 }}>{memberSince}</div>

      {/* Destructive actions */}
      <button type="button" className="pr-action" style={{ left: 1552, top: 592, width: 408, height: 114 }} onClick={onDeleteProfile}>
        <span className="pr-action-dot"><UserX size={34} strokeWidth={2.2} color="#ff2d2d" /></span>
        <span className="pr-action-label">Delete Profile</span>
      </button>
      <button type="button" className="pr-action" style={{ left: 1552, top: 735, width: 408, height: 114 }} onClick={onUnpairKey}>
        <span className="pr-action-dot"><Trash2 size={34} strokeWidth={2.2} color="#ff2d2d" /></span>
        <span className="pr-action-label">Unpair Zen-Key</span>
      </button>
    </DesignStage>
  );
}
