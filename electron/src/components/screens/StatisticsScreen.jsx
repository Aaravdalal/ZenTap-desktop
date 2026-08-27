import { useState, useMemo } from 'react';
import PageShell from '../shared/PageShell';
import './StatisticsScreen.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];

export default function StatisticsScreen({ selectedApps, selectedWebsites, screenTime, onSelectItem }) {
  const [tab, setTab] = useState('apps');

  const values = useMemo(() => {
    // JS getDay(): 0=Sun..6=Sat -> map to Mon-first index
    const todayIdx = (new Date().getDay() + 6) % 7;
    const arr = new Array(7).fill(0);
    arr[todayIdx] = screenTime;
    return arr;
  }, [screenTime]);

  const maxVal = Math.max(...values, 60);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgPct = (avg / maxVal) * 100;

  const list = tab === 'apps' ? selectedApps : selectedWebsites;

  return (
    <PageShell title="Statistics">
      <div className="stats-screen">
        <div className="stats-chart-col">
          <div className="stats-chart">
            <div className="stats-avg-line" style={{ bottom: `${avgPct}%` }}>
              <span className="stats-avg-label">Avg</span>
            </div>
            <div className="stats-bars">
              {values.map((v, i) => (
                <div className="stats-bar-col" key={DAYS[i]}>
                  <div className="stats-bar" style={{ height: `${Math.max((v / maxVal) * 100, 2)}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="stats-day-labels">
            {DAYS.map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>

        <div className="stats-list-col">
          <div className="stats-tabs">
            <button className={`stats-tab ${tab === 'apps' ? 'active' : ''}`} onClick={() => setTab('apps')}>Apps</button>
            <button className={`stats-tab ${tab === 'websites' ? 'active' : ''}`} onClick={() => setTab('websites')}>Websites</button>
          </div>
          <div className="stats-list">
            {list.length === 0 ? (
              <div className="stats-empty">Nothing blocked yet — add {tab} from Home or Session.</div>
            ) : (
              list.map((item) => (
                <button
                  key={item.name || item.keyword}
                  className="stats-list-row"
                  onClick={() => onSelectItem({ type: tab, ...item })}
                >
                  <img
                    src={item.icon || '/missing_icon.png'}
                    alt=""
                    onError={(e) => { e.target.src = '/missing_icon.png'; }}
                  />
                  <span>{item.name || item.keyword}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
