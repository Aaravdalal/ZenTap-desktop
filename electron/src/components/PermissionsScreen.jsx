import React from 'react';
import './PermissionsScreen.css';
import { Shield, Bell, Timer, CheckCircle } from 'lucide-react';

export default function PermissionsScreen({ onContinue }) {
  return (
    <div className="permissions-container">
      <div className="permissions-card">
        <h2 className="perm-title">System Access</h2>
        <p className="perm-subtitle">To help you focus, ZenTap requires the following permissions:</p>

        <div className="perm-list">
          <div className="perm-item">
            <div className="perm-icon">
              <Shield size={24} />
            </div>
            <div className="perm-text">
              <h3>App Blocking</h3>
              <p>Closes distracting applications while you are in Zen mode.</p>
            </div>
            <div className="perm-status">
              <CheckCircle size={18} className="success" />
            </div>
          </div>

          <div className="perm-item">
            <div className="perm-icon">
              <Bell size={24} />
            </div>
            <div className="perm-text">
              <h3>Notification Silencing</h3>
              <p>Mutes system alerts so you can work uninterrupted.</p>
            </div>
            <div className="perm-status">
              <CheckCircle size={18} className="success" />
            </div>
          </div>

          <div className="perm-item">
            <div className="perm-icon">
              <Timer size={24} />
            </div>
            <div className="perm-text">
              <h3>Screen Usage Tracking</h3>
              <p>Provides insights into your daily digital habits.</p>
            </div>
            <div className="perm-status">
              <CheckCircle size={18} className="success" />
            </div>
          </div>
        </div>

        <button className="allow-btn" onClick={onContinue}>
          Allow & Continue &nbsp;→
        </button>
      </div>
    </div>
  );
}
