/*
 * The two session cards, shared by the Zen Session screen (where you pick one)
 * and the session start screen (where the pick is shown back to you).
 * Artboard coordinates measured from UI References/Session_Select.png.
 */
export const MODES = [
  {
    id: 'free',
    card: { src: 'card_free', x: 135, y: 157, w: 967, h: 372 },
    pad: { src: 'icon_pad_free', x: 34, y: 31, w: 139, h: 132 },
    icon: { src: 'icon_lock', x: 46, y: 40, w: 114, h: 113 },
    label: { src: 'label_free', x: 213, y: 79, w: 253, h: 37 },
    desc: { src: 'desc_free', x: 49, y: 218, w: 807, h: 87 },
    name: 'Free Mode',
  },
  {
    id: 'zen',
    card: { src: 'card_zen', x: 135, y: 616, w: 967, h: 372 },
    pad: { src: 'icon_pad_zen', x: 34, y: 54, w: 139, h: 132 },
    icon: { src: 'icon_timer', x: 14, y: 30, w: 180, h: 180 },
    label: { src: 'label_zen', x: 209, y: 102, w: 240, h: 37 },
    desc: { src: 'desc_zen', x: 48, y: 229, w: 770, h: 87 },
    name: 'Zen Mode',
  },
];
