import { useState } from 'react';
import { Lock, Timer } from 'lucide-react';
import PageShell from '../shared/PageShell';
import BlockDock from '../shared/BlockDock';
import './SessionScreen.css';

const MODES = [
  {
    id: 'free',
    label: 'Free Mode',
    description: 'Freely unlock with ZenKey at any time you please.',
    icon: <Lock size={22} />,
  },
  {
    id: 'zen',
    label: 'Zen Mode',
    description: 'Set a timer and computer cannot unlock until time expires',
    icon: <Timer size={22} />,
  },
];

export default function SessionScreen({ selectedApps, selectedWebsites, onOpenDock, isBlocking, onStartZen }) {
  const [mode, setMode] = useState(null);

  return (
    <PageShell title="Zen Session">
      <div className="session-screen-wrap">
        <div className="session-screen">
          <div className="session-modes">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`session-mode-card ${mode === m.id ? 'selected' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span className="session-mode-icon">{m.icon}</span>
                <span className="session-mode-label">{m.label}</span>
                <span className="session-mode-desc">{m.description}</span>
              </button>
            ))}
          </div>

          <div className="session-docks">
            <BlockDock label="Apps to Block:" items={selectedApps} onOpen={onOpenDock} />
            <BlockDock label="Websites to Block:" items={selectedWebsites} onOpen={onOpenDock} />
          </div>
        </div>

        {mode && (
          <button className="session-start-bar" onClick={onStartZen}>
            {isBlocking ? 'Stop Session' : 'Start Session'}
          </button>
        )}
      </div>
    </PageShell>
  );
}
