import { DImg, DHit } from './DesignStage';
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

export default function DesignNav({ activeTab, onChange }) {
  const active = TABS.find((t) => t.id === activeTab);

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
        <DImg
          src="nav_indicator"
          x={active.pill.x + INDICATOR.offset}
          y={INDICATOR.y}
          w={INDICATOR.w}
          h={INDICATOR.h}
        />
      )}
    </>
  );
}
