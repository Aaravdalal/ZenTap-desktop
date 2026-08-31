import { DImg, DHit } from './DesignStage';
import './DesignBlockDock.css';

const SLOT = 84;

/*
 * "Apps to Block:" / "Websites to Block:" group.
 * The heading and the count are live text (Inter, the font the artboard uses)
 * so they stay crisp at any window size; the + chip, dock frame and slots are
 * the exported artwork.
 */
export default function DesignBlockDock({
  title, titlePos, frame, slots, rows, cols,
  count, countBox, countDy = 0, plusBox, items, onOpen, label, tab,
}) {
  return (
    <>
      <div className="ds-dock-title" style={{ left: titlePos.x, top: titlePos.y }}>{title}</div>

      <div
        className="ds-count-chip"
        style={{
          left: countBox.x,
          top: countBox.y,
          width: countBox.w,
          height: countBox.h,
          paddingTop: countDy * 2,
        }}
      >
        {count}
      </div>

      <DImg src="chip_plus" x={plusBox.x} y={plusBox.y} w={plusBox.w} h={plusBox.h} />
      <DHit
        className="ds-plus-hit"
        x={plusBox.x}
        y={plusBox.y}
        w={plusBox.w}
        h={plusBox.h}
        onClick={() => onOpen?.(tab)}
        aria-label={`Add to ${label}`}
      />

      <DImg src={frame.src} x={frame.x} y={frame.y} w={frame.w} h={frame.h} />

      {slots.map((src, i) => {
        const x = cols[i % 5];
        const y = rows[Math.floor(i / 5)];
        const item = items[i];
        return (
          <div key={src}>
            <DImg src={src} x={x} y={y} w={SLOT} h={SLOT} />
            {item && (
              <img
                className="ds-el ds-slot-icon"
                src={item.icon || 'missing_icon.png'}
                alt={item.name || item.keyword || ''}
                draggable={false}
                style={{ left: x + 11, top: y + 11, width: SLOT - 22, height: SLOT - 22 }}
                onError={(e) => { e.target.src = 'missing_icon.png'; }}
              />
            )}
          </div>
        );
      })}

      <DHit
        className="ds-dock-hit"
        x={frame.x}
        y={frame.y}
        w={frame.w}
        h={frame.h}
        onClick={() => onOpen?.(tab)}
        aria-label={label}
      />
    </>
  );
}
