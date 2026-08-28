import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import './DetailedStatisticsScreen.css';

/*
 * Per-item statistics — laid out on the 2135 x 1281 artboard measured from
 * UI References/Detailed_Statistics_Example_app.png.
 */
const CELLS = [
  { key: 'timeBlocked', label: 'Time Blocked', x: 1032, y: 251 },
  { key: 'timeSpent', label: 'Time Spent', x: 1424, y: 251 },
  { key: 'timeBlockedWeek', label: 'Time Blocked (Week)', x: 1032, y: 461 },
  { key: 'pickUpPrevention', label: 'Pick Up Prevention', x: 1424, y: 461 },
];

export default function DetailedStatisticsScreen({ item, stats, activeTab, onChangeTab, onBack }) {
  const name = item?.name || item?.keyword || 'Item';

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={127} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={127} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />
      <div className="ds-title" style={{ left: 244, top: 67 }}>{name}</div>

      <div className="dst-icon" style={{ left: 256, top: 295, width: 606, height: 606 }}>
        <img
          src={item?.icon || '/missing_icon.png'}
          alt={name}
          draggable={false}
          onError={(e) => { e.target.src = '/missing_icon.png'; }}
        />
      </div>

      {CELLS.map(({ key, label, x, y }) => (
        <div key={key}>
          <div className="dst-pill" style={{ left: x, top: y, width: 328, height: 87 }}>{label}</div>
          <div className="dst-value" style={{ left: x, top: y + 120, width: 328 }}>
            {stats?.[key] ?? '--'}
          </div>
        </div>
      ))}

      <div className="dst-graph" style={{ left: 1032, top: 671, width: 724, height: 246 }} />
    </DesignStage>
  );
}
