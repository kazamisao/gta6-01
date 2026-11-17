// City generation for Solara Bay: a deterministic grid of roads and blocks with
// buildings, parks, a beach on the west edge and a marina on the south edge.
// buildCity(seed) returns plain data; render.js draws it, world.js simulates on it.
import { WORLD, ROAD_WIDTH, BLOCK } from './config.js';
import { mulberry32, pick, range, intRange } from './random.js';

const LANDMARKS = [
  { name: 'Solara Tower', kind: 'tower' },
  { name: 'Marina Market', kind: 'market' },
  { name: 'Crescent Plaza', kind: 'plaza' },
  { name: 'Harbor Depot', kind: 'depot' },
  { name: 'The Palms Hotel', kind: 'hotel' },
  { name: 'Bayview Clinic', kind: 'clinic' },
];

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const roads = [];
  const verticals = [];
  const horizontals = [];
  // Road centre lines: grid every BLOCK, inset from the world edge.
  for (let x = BLOCK; x < WORLD.width; x += BLOCK) verticals.push(x);
  for (let y = BLOCK; y < WORLD.height; y += BLOCK) horizontals.push(y);
  for (const x of verticals) roads.push({ x: x - ROAD_WIDTH / 2, y: 0, w: ROAD_WIDTH, h: WORLD.height, vertical: true });
  for (const y of horizontals) roads.push({ x: 0, y: y - ROAD_WIDTH / 2, w: WORLD.width, h: ROAD_WIDTH, vertical: false });

  const buildings = [];
  const parks = [];
  const palette = ['#e8b06a', '#d98a7a', '#8fb8d8', '#c9c2b2', '#a8c686', '#e0a0b8'];
  let landmarkIndex = 0;
  // Blocks are the cells between roads; each holds 1-4 buildings or a park.
  for (let bx = 0; bx < verticals.length; bx += 1) {
    for (let by = 0; by < horizontals.length; by += 1) {
      const x0 = (bx === 0 ? 0 : verticals[bx - 1]) + ROAD_WIDTH / 2 + 14;
      const y0 = (by === 0 ? 0 : horizontals[by - 1]) + ROAD_WIDTH / 2 + 14;
      const x1 = (bx < verticals.length ? verticals[bx] : WORLD.width) - ROAD_WIDTH / 2 - 14;
      const y1 = (by < horizontals.length ? horizontals[by] : WORLD.height) - ROAD_WIDTH / 2 - 14;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      if (rng() < 0.16) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, trees: intRange(rng, 4, 9) });
        continue;
      }
      const count = intRange(rng, 1, 4);
      for (let i = 0; i < count; i += 1) {
        const w = range(rng, 52, Math.min(120, (x1 - x0) / count));
        const h = range(rng, 52, Math.min(120, y1 - y0));
        const x = x0 + ((x1 - x0 - w) * (count === 1 ? 0.5 : i / (count - 1)));
        const y = y0 + range(rng, 0, Math.max(0, y1 - y0 - h));
        const landmark = landmarkIndex < LANDMARKS.length && rng() < 0.35
          ? LANDMARKS[landmarkIndex++] : null;
        buildings.push({
          x, y, w, h,
          height: intRange(rng, 18, 64),
          color: pick(rng, palette),
          name: landmark ? landmark.name : null,
          kind: landmark ? landmark.kind : 'block',
        });
      }
    }
  }

  // Beach strip on the west edge, marina on the south edge.
  const beach = { x: 0, y: 0, w: 120, h: WORLD.height };
  const marina = { x: WORLD.width * 0.55, y: WORLD.height - 130, w: WORLD.width * 0.45, h: 130 };

  // Fixed mission spots, all on roads or open ground, never inside a building.
  const spawn = { x: verticals[5], y: horizontals[5] };
  const safehouse = { x: verticals[2], y: horizontals[8], label: 'Safehouse — Rosa\'s Garage' };
  const depot = { x: verticals[8], y: horizontals[2], label: 'Harbor Depot' };
  const convoyRoute = verticals.slice(3, 9).map((x, i) => ({ x, y: horizontals[7], t: i }));

  return { seed, roads, verticals, horizontals, buildings, parks, beach, marina, spawn, safehouse, depot, convoyRoute, width: WORLD.width, height: WORLD.height };
}

export function isOnRoad(city, x, y) {
  return city.roads.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

export function pointInBuilding(city, x, y) {
  return city.buildings.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}

export function nearestRoadPoint(city, x, y) {
  // Snap a point to the closest road centre line (used for spawning traffic).
  let best = null;
  let bestD = Infinity;
  for (const vx of city.verticals) {
    const d = Math.abs(x - vx);
    if (d < bestD) { bestD = d; best = { x: vx, y, angle: Math.PI / 2 }; }
  }
  for (const hy of city.horizontals) {
    const d = Math.abs(y - hy);
    if (d < bestD) { bestD = d; best = { x, y: hy, angle: 0 }; }
  }
  return best;
}
