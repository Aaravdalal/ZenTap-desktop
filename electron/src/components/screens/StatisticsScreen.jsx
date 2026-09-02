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
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BAR_X = [144, 247, 350, 453, 555, 659, 763];
const BAR_W = 77;
const AXIS_X = 104;
const AXIS_Y = 940;
const CHART_TOP = 262;

const ROW_Y = [345, 493, 641, 789];
const COL_X = [1134, 1496];
// The columns are 362 apart, so a row has to stay narrower than that or a long
// name runs straight into the next column instead of being trimmed.
const ROW_W = 344;

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

  /*
   * The chart is the last seven days ending today, so the labels come from the
   * dates themselves rather than a fixed Monday-first week. Today is "Today".
   */
  const labels = (usage?.days?.length === 7 ? usage.days : []).map((key, i) => {
    if (i === 6) return 'Today';
    const [y, m, d] = key.split('-').map(Number);
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
  });
  const dayLabels = labels.length === 7 ? labels : ['', '', '', '', '', '', 'Today'];
  /*
   * The axis runs to a round number above the busiest day rather than to the
   * day itself, so the gridline labels are readable and the average sits where
   * you can actually check it against them.
   */
  const busiest = Math.max(...data, 1);
  const stepFor = (top) => {
    for (const step of [15, 30, 60, 120, 180, 240, 360, 480, 720]) {
      if (top / step <= 5) return step;
    }
    return 1440;
  };
  const step = stepFor(busiest);
  const axisMax = Math.max(step, Math.ceil(busiest / step) * step);
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);

  const usable = AXIS_Y - CHART_TOP - 10;
  const yFor = (minutes) => AXIS_Y - Math.round((minutes / axisMax) * usable);
  const barH = (v) => Math.max(v > 0 ? 4 : 0, AXIS_Y - yFor(v));

  /*
   * Averaged over the days that actually have time on them, today included.
   * Dividing by a flat seven buried the line near zero on a fresh install,
   * where the six days before it are empty only because nothing was recorded
   * yet - not because nothing was used.
   */
  const measured = data.filter((v) => v > 0);
  const avg = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : 0;
  const avgY = yFor(avg);

  const axisLabel = (minutes) => {
    if (minutes === 0) return '0';
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h${minutes % 60}`;
  };

  const items = (tab === 'apps' ? usage?.apps : usage?.sites) || [];

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={55} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />
      <div className="ds-title">Statistics</div>

      {/* Weekly usage chart — minutes of active screen time per day. */}
      <div className="st-axis-v" style={{ left: AXIS_X, top: CHART_TOP, height: AXIS_Y - CHART_TOP + 2 }} />
      {/* Gridlines and their values, so the bars can be read off the axis. */}
      {ticks.map((minutes) => (
        <div key={minutes}>
          {minutes > 0 && (
            <div className="st-gridline" style={{ left: AXIS_X, top: yFor(minutes), width: 866 - AXIS_X }} />
          )}
          <div className="st-tick" style={{ left: 0, top: yFor(minutes) - 10, width: AXIS_X - 12 }}>
            {axisLabel(minutes)}
          </div>
        </div>
      ))}
      <div className="st-axis-h" style={{ left: AXIS_X, top: AXIS_Y, width: 866 - AXIS_X }} />
      {data.map((v, i) => (
        <div key={i} className="st-bar" style={{ left: BAR_X[i], width: BAR_W, top: AXIS_Y - 1 - barH(v), height: barH(v) }} />
      ))}
      <div className="st-avg-line" style={{ left: AXIS_X, top: avgY, width: 866 - AXIS_X }} />
      <div className="st-avg-label" style={{ left: 880, top: avgY - 11 }}>
        Avg {formatDuration(Math.round(avg) * 60)}
      </div>
      {dayLabels.map((d, i) => (
        <div key={i} className={`st-day ${i === 6 ? 'today' : ''}`} style={{ left: BAR_X[i], width: BAR_W, top: 954 }}>{d}</div>
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

      {items.slice(0, 8).map((item, i) => {
        const x = COL_X[i % 2];
        const y = ROW_Y[Math.floor(i / 2)];
        return (
          <button
            key={item.key}
            type="button"
            className="st-row"
            style={{ left: x, top: y, width: ROW_W, height: 120 }}
            onClick={() => onSelectItem?.(item)}
          >
            <span className="st-row-icon">
              {item.icon && <img src={item.icon} alt="" draggable={false} />}
            </span>
            <span className="st-row-text">
              <span className="st-row-name">{item.name}</span>
              <span className="st-row-time">{formatDuration(item.seconds)} today</span>
            </span>
          </button>
        );
      })}

      {items.length === 0 && (
        <div className="st-empty" style={{ left: 1134, top: 400, width: 706 }}>
          Nothing on your {tab === 'apps' ? 'app' : 'website'} block list yet.
        </div>
      )}

    </DesignStage>
  );
}
