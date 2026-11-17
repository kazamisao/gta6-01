// Tunable constants for Solara Bay. One place for every magic number the
// gameplay modules share, so balancing is an edit here, not a hunt.
export const WORLD = { width: 3600, height: 3600 };
export const ROAD_WIDTH = 96;
export const BLOCK = 300;
export const PLAYER = {
  walkSpeed: 170,
  runSpeed: 265,
  radius: 13,
  maxHealth: 100,
  punchDamage: 12,
  punchRange: 34,
  punchCooldown: 0.38,
};
export const CAR = {
  accel: 520,
  brake: 900,
  reverseAccel: 300,
  maxSpeed: 560,
  maxReverse: 180,
  turnRate: 2.6,
  grip: 3.2,
  length: 64,
  width: 30,
};
export const POLICE = { maxStars: 5, maxCops: 10, copSpeed: 300, bustRange: 26 };
export const SAVE_KEY = 'solara-bay-save-v1';
export const MISSION_REWARD_MULTIPLIER = 1;

// Palette: sun-soaked coastal city, late-afternoon light.
export const PALETTE = {
  grass: '#8abd63',
  sand: '#e8d29a',
  sea: '#2f7fb8',
  road: '#4b515c',
  roadLine: '#f2d54d',
  sidewalk: '#c8c2b2',
  buildingTop: ['#e8b06a', '#d98a7a', '#8fb8d8', '#c9c2b2', '#a8c686', '#e0a0b8'],
  buildingSide: '#6b5a48',
  carColors: ['#c0392b', '#2471a3', '#f1c40f', '#eaf0f1', '#2c3e50', '#8e44ad', '#16a085', '#e67e22'],
};
