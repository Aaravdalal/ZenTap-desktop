import { useEffect, useState } from 'react';
import { DImg, DHit } from './DesignStage';
import { asset } from './designArtboard';
import './DesignNav.css';

/* Artboard coordinates measured from UI References/Session_Select.png. */
const PILL = { y: 1159, w: 273, h: 67 };
const DISC = { y: 1168, w: 53, h: 50 };
const INDICATOR = { y: 1122, w: 64, h: 52, offset: 109 };

const TABS = [
  {
    id: 'home',
    pill: { src: 'nav_pill_1', x: 196 },
    disc: { src: 'nav_disc_1', x: 208 },
    icon: { src: 'nav_icon_home', x: 212, y: 1168, w: 46, h: 46 },
    label: { src: 'nav_label_home', x: 303, y: 1182, w: 80, h: 23 },
  },
  {
    id: 'session',
    pill: { src: 'nav_pill_2', x: 563 },
    disc: { src: 'nav_disc_2', x: 577 },
    icon: { src: 'nav_icon_session', x: 582, y: 1171, w: 44, h: 44 },
    label: { src: 'nav_label_session', x: 649, y: 1182, w: 107, h: 23 },
  },
  {
    id: 'statistics',
    pill: { src: 'nav_pill_3', x: 931 },
    disc: { src: 'nav_disc_3', x: 938 },
    icon: { src: 'nav_icon_statistics', x: 947, y: 1175, w: 35, h: 35 },
    label: { src: 'nav_label_statistics', x: 1015, y: 1182, w: 128, h: 23 },
  },
  {
    id: 'settings',
    pill: { src: 'nav_pill_4', x: 1299 },
    disc: { src: 'nav_disc_4', x: 1313 },
    icon: { src: 'nav_icon_settings', x: 1322, y: 1175, w: 35, h: 35 },
    label: { src: 'nav_label_settings', x: 1395, y: 1182, w: 114, h: 29 },
  },
  {
    id: 'profile',
    pill: { src: 'nav_pill_5', x: 1666 },
    disc: { src: 'nav_disc_5', x: 1680 },
    icon: { src: 'nav_icon_profile', x: 1673, y: 1164, w: 67, h: 67 },
    label: { src: 'nav_label_profile', x: 1772, y: 1181, w: 86, h: 24 },
  },
];

/*
 * Which tab the marker was last parked on. It lives outside the component on
 * purpose: each screen renders its own nav, so switching tabs unmounts this
 * component and mounts a new one. Without remembering the previous tab the new
 * marker simply appears at its destination - the "teleport" - because a CSS
 * transition has no previous value to animate from.
 */
let parkedTab = null;

const markerX = (tabId) => {
  const tab = TABS.find((t) => t.id === tabId);
  return tab ? tab.pill.x + INDICATOR.offset : null;
};

export default function DesignNav({ activeTab, onChange }) {
  const active = TABS.find((t) => t.id === activeTab);

  // Render at the old tab's position, then move to the new one on the next
  // frame so the browser has something to animate from.
  const [x, setX] = useState(() => markerX(parkedTab) ?? markerX(activeTab));
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const target = markerX(activeTab);
    if (target == null) return undefined;
    const arrived = parkedTab === activeTab && x === target;
    parkedTab = activeTab;
    if (arrived) return undefined;

    // Two frames: one to paint the start position, one to change it.
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setX(target);
        setMoving(true);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [activeTab, x]);

  return (
    <>
      {TABS.map((tab) => (
        <div key={tab.id}>
          <DImg src={tab.pill.src} x={tab.pill.x} y={PILL.y} w={PILL.w} h={PILL.h} />
          <DImg src={tab.disc.src} x={tab.disc.x} y={DISC.y} w={DISC.w} h={DISC.h} />
          <DImg src={tab.icon.src} x={tab.icon.x} y={tab.icon.y} w={tab.icon.w} h={tab.icon.h} />
          <DImg src={tab.label.src} x={tab.label.x} y={tab.label.y} w={tab.label.w} h={tab.label.h} />
          <DHit
            className="ds-nav-hit"
            x={tab.pill.x}
            y={PILL.y}
            w={PILL.w}
            h={PILL.h}
            onClick={() => onChange?.(tab.id)}
            aria-label={tab.id}
            aria-current={tab.id === activeTab ? 'page' : undefined}
          />
        </div>
      ))}
      {/* The marker sits on top of its pill, as in the Figma render. */}
      {active && (
        <div
          className="ds-nav-indicator"
          style={{ left: x, top: INDICATOR.y, width: INDICATOR.w, height: INDICATOR.h }}
        >
          {/* Keyed on the tab so the settle restarts on each move, and only
              once it is actually moving - no wobble on first paint. */}
          <img
            key={moving ? activeTab : 'parked'}
            className={moving ? 'settling' : ''}
            src={asset('nav_indicator')}
            alt=""
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
