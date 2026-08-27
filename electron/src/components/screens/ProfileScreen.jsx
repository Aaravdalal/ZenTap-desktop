import { useState, useEffect, useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import PageShell from '../shared/PageShell';
import './ProfileScreen.css';

function formatTime(mins) {
  if (!mins) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDate(iso) {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '--';
  }
}

export default function ProfileScreen({ screenTime }) {
  const [avatar, setAvatar] = useState(null);
  const [name, setName] = useState('ZenTap User');
  const [memberSince, setMemberSince] = useState(null);
  const [totalTime, setTotalTime] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    window.electron?.loadConfig?.().then((config) => {
      if (config.profileAvatar) setAvatar(config.profileAvatar);
      if (config.profileName) setName(config.profileName);
      if (config.memberSince) setMemberSince(config.memberSince);
    });
    window.electron?.getTotalScreenTime?.().then(setTotalTime);
  }, []);

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      window.electron?.saveConfig?.({ profileAvatar: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleNameBlur = () => {
    window.electron?.saveConfig?.({ profileName: name });
  };

  return (
    <PageShell title="Profile">
      <div className="profile-screen">
        <div className="profile-left">
          <div className="profile-avatar" onClick={handleAvatarPick}>
            {avatar && <img src={avatar} alt="Avatar" />}
            <div className="profile-avatar-btn">
              <ImagePlus size={18} />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <input
            className="profile-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
          />
        </div>

        <div className="profile-right">
          <div className="profile-time-card">
            <div className="profile-time-col">
              <span className="profile-field-label">Today's Time</span>
              <div className="profile-field-box">{formatTime(screenTime)}</div>
            </div>
            <div className="profile-time-divider" />
            <div className="profile-time-col">
              <span className="profile-field-label">Total Time</span>
              <div className="profile-field-box">{formatTime(totalTime)}</div>
            </div>
          </div>

          <div className="profile-member-card">
            <span className="profile-field-label">Member Since</span>
            <div className="profile-field-box">{formatDate(memberSince)}</div>
          </div>

          <div className="profile-actions">
            <button className="profile-action-btn">
              <span className="profile-action-dot" />
              Delete Profile
            </button>
            <button className="profile-action-btn">
              <Trash2 size={16} color="#e5484d" />
              Unpair Zen-Key
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
