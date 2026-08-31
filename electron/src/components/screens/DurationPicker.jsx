import { ChevronUp, ChevronDown } from 'lucide-react';
import './DurationPicker.css';

/*
 * Hours / minutes / seconds for a Zen Mode session. Each column takes the
 * arrows or the scroll wheel, and wraps at its own limit. Laid out in artboard
 * units inside the Zen card, in place of that card's description.
 */
const COLUMNS = [
  { id: 'hours', unit: 'hr', max: 23 },
  { id: 'minutes', unit: 'min', max: 59 },
  { id: 'seconds', unit: 'sec', max: 59 },
];

const COL_W = 132;
const COL_GAP = 20;
const LEFT = 48;
const TOP = 186;

const parts = (seconds) => ({
  hours: Math.floor(seconds / 3600),
  minutes: Math.floor((seconds % 3600) / 60),
  seconds: seconds % 60,
});

const toSeconds = ({ hours, minutes, seconds }) => hours * 3600 + minutes * 60 + seconds;

export default function DurationPicker({ seconds, onChange }) {
  const value = parts(seconds);

  const step = (id, delta) => {
    const max = COLUMNS.find((c) => c.id === id).max;
    const next = { ...value };
    // Wrap rather than stop, so holding one direction keeps working.
    next[id] = (next[id] + delta + (max + 1)) % (max + 1);
    const total = toSeconds(next);
    onChange?.(Math.max(60, total));
  };

  return (
    <div className="dp-root" style={{ left: LEFT, top: TOP }}>
      {COLUMNS.map((col, i) => (
        <div
          key={col.id}
          className="dp-col"
          style={{ left: i * (COL_W + COL_GAP), width: COL_W }}
          onWheel={(e) => step(col.id, e.deltaY < 0 ? 1 : -1)}
        >
          <button type="button" className="dp-arrow" onClick={() => step(col.id, 1)} aria-label={`More ${col.id}`}>
            <ChevronUp size={38} strokeWidth={2.6} />
          </button>
          <div className="dp-value">
            {String(value[col.id]).padStart(2, '0')}
            <span className="dp-unit">{col.unit}</span>
          </div>
          <button type="button" className="dp-arrow" onClick={() => step(col.id, -1)} aria-label={`Fewer ${col.id}`}>
            <ChevronDown size={38} strokeWidth={2.6} />
          </button>
        </div>
      ))}
    </div>
  );
}
