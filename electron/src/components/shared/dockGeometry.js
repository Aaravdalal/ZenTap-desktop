/*
 * One set of artboard coordinates for the "Apps to Block:" / "Websites to
 * Block:" docks, shared by Home, Zen Session and the session start screen so
 * the group never shifts as you move between tabs. Measured from
 * UI References/Session_Select.png.
 */
const SLOT_COLS = [1253, 1399, 1545, 1691, 1837];

export const APPS_DOCK = {
  title: 'Apps to Block:',
  titlePos: { x: 1213, y: 178 },
  countBox: { x: 1790, y: 164, w: 72, h: 74 },
  countDy: 3,
  plusBox: { x: 1883, y: 157, w: 89, h: 89 },
  frame: { src: 'dock_apps', x: 1183, y: 283, w: 807, h: 246 },
  cols: SLOT_COLS,
  rows: [311, 423],
  slots: ['slot_a01', 'slot_a02', 'slot_a03', 'slot_a04', 'slot_a05',
          'slot_a06', 'slot_a07', 'slot_a08', 'slot_a09', 'slot_a10'],
  label: 'Apps to Block',
  tab: 'apps',
};

export const WEBSITES_DOCK = {
  title: 'Websites to Block:',
  titlePos: { x: 1225, y: 605 },
  countBox: { x: 1788, y: 589, w: 74, h: 76 },
  plusBox: { x: 1887, y: 586, w: 85, h: 82 },
  frame: { src: 'dock_websites', x: 1183, y: 736, w: 807, h: 246 },
  cols: SLOT_COLS,
  rows: [761, 873],
  slots: ['slot_b01', 'slot_b02', 'slot_b03', 'slot_b04', 'slot_b05',
          'slot_b06', 'slot_b07', 'slot_b08', 'slot_b09', 'slot_b10'],
  label: 'Websites to Block',
  tab: 'websites',
};
