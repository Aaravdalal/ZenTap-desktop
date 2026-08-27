import { Home, History, BarChart3, Settings, User } from 'lucide-react';
import './BottomNav.css';

const TABS = [
  { id: 'home', label: 'Home', icon: <Home size={18} strokeWidth={2.2} /> },
  { id: 'session', label: 'Session', icon: <History size={18} strokeWidth={2.2} /> },
  { id: 'statistics', label: 'Statistics', icon: <BarChart3 size={18} strokeWidth={2.2} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} strokeWidth={2.2} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} strokeWidth={2.2} /> },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <div className="bottom-nav">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`bottom-nav-tab ${active ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {active && <span className="bottom-nav-indicator" />}
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
