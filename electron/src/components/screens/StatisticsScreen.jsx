import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import { formatDuration } from '../shared/formatDuration';
import './StatisticsScreen.css';

/*
 * Statistics screen — laid out on the 2135 x 1281 artboard measured from
 * UI References/Statistics.png.
 *
 * Everything here is real: `usage` comes from the main process, which samples
 * the foreground window and keeps per-day totals for each app and site.
 */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
const BAR_X = [144, 247, 350, 453, 555, 659, 763];
const BAR_W = 77;
const AXIS_X = 104;
const AXIS_Y = 940;
const CHART_TOP = 262;

const ROW_Y = [345, 493, 641, 789];
const COL_X = [1134, 1496];

export default function StatisticsScreen({
  usage,
  tab = 'apps',
  onChangeListTab,
  onSelectItem,
  activeTab,
  onChangeTab,
  onBack,
}) {
  const data = usage?.weekly?.length === 7 ? usage.weekly : [0, 0, 0, 0, 0, 0, 0];
  const peak = Math.max(...data, 1);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const usable = AXIS_Y - CHART_TOP - 10;
  const barH = (v) => Math.max(4, Math.round((v / peak) * usable));
  const avgY = AXIS_Y - Math.round((avg / peak) * usable);

  const items = (tab === 'apps' ? usage?.apps : usage?.sites) || [];

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={55} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />
      <div className="ds-title">Statistics</div>

      {/* Weekly usage chart — minutes of active screen time per day. */}
      <div className="st-axis-v" style={{ left: AXIS_X, top: CHART_TOP, height: AXIS_Y - CHART_TOP + 2 }} />
      <div className="st-axis-h" style={{ left: AXIS_X, top: AXIS_Y, width: 866 - AXIS_X }} />
      {data.map((v, i) => (
        <div key={DAYS[i]} className="st-bar" style={{ left: BAR_X[i], width: BAR_W, top: AXIS_Y - 1 - barH(v), height: barH(v) }} />
      ))}
      <div className="st-avg-line" style={{ left: AXIS_X, top: avgY, width: 866 - AXIS_X }} />
      <div className="st-avg-label" style={{ left: 62, top: avgY - 10 }}>Avg</div>
      {DAYS.map((d, i) => (
        <div key={d} className="st-day" style={{ left: BAR_X[i], width: BAR_W, top: 954 }}>{d}</div>
      ))}

      {/* Breakdown panel */}
      <div className="st-panel" style={{ left: 1079, top: 128, width: 833, height: 859 }} />
      <button
        type="button"
        className={`st-tab ${tab === 'apps' ? 'active' : ''}`}
        style={{ left: 1128, top: 166, width: 328, height: 87 }}
        onClick={() => onChangeListTab?.('apps')}
      >
        Apps
      </button>
      <button
        type="button"
        className={`st-tab ${tab === 'websites' ? 'active' : ''}`}
        style={{ left: 1516, top: 166, width: 328, height: 87 }}
        onClick={() => onChangeListTab?.('websites')}
      >
        Websites
      </button>
      <div className="st-divider" style={{ left: 1140, top: 300, width: 698 }} />

      {[...Array(8)].map((_, i) => {
        const x = COL_X[i % 2];
        const y = ROW_Y[Math.floor(i / 2)];
        const item = items[i];
        return (
          <button
            key={i}
            type="button"
            className="st-row"
            style={{ left: x, top: y, width: 490, height: 120 }}
            onClick={() => item && onSelectItem?.(item)}
            disabled={!item}
          >
            <span className="st-row-icon">
              {item?.icon && <img src={item.icon} alt="" draggable={false} />}
            </span>
            <span className="st-row-text">
              <span className="st-row-name">{item ? item.name : 'Insert Name'}</span>
              {item && <span className="st-row-time">{formatDuration(item.seconds)} today</span>}
            </span>
          </button>
        );
      })}
    </DesignStage>
  );
}
