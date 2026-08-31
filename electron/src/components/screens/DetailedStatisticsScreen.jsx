import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import { formatDuration } from '../shared/formatDuration';
import './DetailedStatisticsScreen.css';

/*
 * Per-item statistics — laid out on the 2135 x 1281 artboard measured from
 * UI References/Detailed_Statistics_Example_app.png. The item carries the
 * figures the main process measured for it.
 */
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const GRAPH = { x: 1032, y: 671, w: 724, h: 246 };

export default function DetailedStatisticsScreen({ item, days, activeTab, onChangeTab, onBack }) {
  const name = item?.name || 'Item';
  const daily = item?.daily?.length === 7 ? item.daily : [0, 0, 0, 0, 0, 0, 0];
  const peak = Math.max(...daily, 1);
  // Same seven days as the main chart: oldest on the left, today on the right.
  const labels = (days?.length === 7 ? days : []).map((key) => {
    const [y, m, d] = key.split('-').map(Number);
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
  });

  const cells = [
    { key: 'timeBlocked', label: 'Time Blocked', x: 1032, y: 251, value: formatDuration(item?.blockedSeconds) },
    { key: 'timeSpent', label: 'Time Spent', x: 1424, y: 251, value: formatDuration(item?.seconds) },
    { key: 'timeBlockedWeek', label: 'Time Blocked (Week)', x: 1032, y: 461, value: formatDuration(item?.blockedWeekSeconds) },
    { key: 'pickUpPrevention', label: 'Pick Up Prevention', x: 1424, y: 461, value: `${item?.blockEvents ?? 0}x` },
  ];

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={127} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={127} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />
      <div className="ds-title" style={{ left: 244, top: 67 }}>{name}</div>

      <div className="dst-icon" style={{ left: 256, top: 295, width: 606, height: 606 }}>
        <img
          src={item?.icon || 'missing_icon.png'}
          alt={name}
          draggable={false}
          onError={(e) => { e.target.src = 'missing_icon.png'; }}
        />
      </div>

      {cells.map(({ key, label, x, y, value }) => (
        <div key={key}>
          <div className="dst-pill" style={{ left: x, top: y, width: 328, height: 87 }}>{label}</div>
          <div className="dst-value" style={{ left: x, top: y + 120, width: 328 }}>{value}</div>
        </div>
      ))}

      {/* This week, day by day. */}
      <div className="dst-graph" style={{ left: GRAPH.x, top: GRAPH.y, width: GRAPH.w, height: GRAPH.h }}>
        {daily.map((v, i) => (
          <div key={i} className="dst-graph-col">
            <div className="dst-graph-bar" style={{ height: `${Math.max(3, (v / peak) * 100)}%` }} />
            <div className="dst-graph-day">{labels[i] ?? ''}</div>
          </div>
        ))}
      </div>
    </DesignStage>
  );
}
