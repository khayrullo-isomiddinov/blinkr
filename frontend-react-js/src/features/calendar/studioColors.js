// A color per workout, stable across reloads and never stored on the server.
const PALETTE = ['#FF6B35', '#5AA9FF', '#3CCFAE', '#9D8CFF', '#F5B841', '#FF6F91', '#9BD24A', '#48CAE4'];

export const PRESET_CHIPS = [
  { label: 'Push', color: PALETTE[0] },
  { label: 'Pull', color: PALETTE[1] },
  { label: 'Legs', color: PALETTE[2] },
  { label: 'Upper', color: PALETTE[3] },
  { label: 'Lower', color: PALETTE[4] },
  { label: 'Full body', color: PALETTE[5] },
  { label: 'Arms', color: PALETTE[6] },
  { label: 'Core', color: PALETTE[7] },
];

const PRESET_COLOR_BY_NAME = Object.fromEntries(PRESET_CHIPS.map((c) => [c.label.toLowerCase(), c.color]));

function hashColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

// A workout named like a preset (Push, Pull, ...) always gets that preset's color; anything else is hashed from its id.
export function colorForWorkout(workout) {
  return PRESET_COLOR_BY_NAME[workout.name.trim().toLowerCase()] || hashColor(workout.id);
}

export function tint(hex, alpha) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
