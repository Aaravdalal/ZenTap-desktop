import PageShell from '../shared/PageShell';
import './DetailedStatisticsScreen.css';

const STATS = [
  { key: 'timeBlocked', label: 'Time Blocked' },
  { key: 'timeSpent', label: 'Time Spent' },
  { key: 'timeBlockedWeek', label: 'Time Blocked (Week)' },
  { key: 'pickUpPrevention', label: 'Pick Up Prevention' },
];

export default function DetailedStatisticsScreen({ item, onBack }) {
  const name = item?.name || item?.keyword || 'Item';

  return (
    <PageShell title={name} onBack={onBack}>
      <div className="dstats-screen">
        <div className="dstats-icon-wrap">
          <img
            src={item?.icon || '/missing_icon.png'}
            alt={name}
            onError={(e) => { e.target.src = '/missing_icon.png'; }}
          />
        </div>
        <div className="dstats-right">
          <div className="dstats-grid">
            {STATS.map(({ key, label }) => (
              <div className="dstats-card" key={key}>
                <span className="dstats-label">{label}</span>
                <span className="dstats-value">--</span>
              </div>
            ))}
          </div>
          <div className="dstats-graph-placeholder" />
        </div>
      </div>
    </PageShell>
  );
}
