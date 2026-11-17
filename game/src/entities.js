// Pedestrians and traffic: peds stroll the sidewalks and flee from gunfire;
// traffic cars cruise the road grid and turn at intersections.
import { mulberry32, pick } from './random.js';
import { createCar, stepCar } from './vehicles.js';
import { PALETTE } from './config.js';
import { nearestRoadPoint, isOnRoad } from './city.js';

const PED_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#ecf0f1', '#e67e22'];

export function createPed(rng, city, x, y) {
  return {
    x, y,
    angle: rng() * Math.PI * 2,
    speed: 28 + rng() * 22,
    color: pick(rng, PED_COLORS),
    target: null,
    fleeing: 0,
    hp: 30,
    state: 'walk',
  };
}

export function spawnPeds(city, seed, count) {
  const rng = mulberry32(seed);
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const x = 150 + rng() * (city.width - 300);
    const y = 150 + rng() * (city.height - 300);
    peds.push(createPed(rng, city, x, y));
  }
  return peds;
}

export function updatePed(city, ped, dt, danger) {
  if (ped.fleeing > 0) {
    ped.fleeing -= dt;
    const away = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    ped.angle = away;
    ped.x += Math.cos(away) * 120 * dt;
    ped.y += Math.sin(away) * 120 * dt;
    return;
  }
  if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 12) {
    ped.target = {
      x: Math.max(60, Math.min(city.width - 60, ped.x + (Math.random() - 0.5) * 500)),
      y: Math.max(60, Math.min(city.height - 60, ped.y + (Math.random() - 0.5) * 500)),
    };
  }
  ped.angle = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  // Peds avoid walking through buildings: slide along them instead.
  if (!city.buildings.some((b) => nx > b.x - 8 && nx < b.x + b.w + 8 && ny > b.y - 8 && ny < b.y + b.h + 8)) {
    ped.x = nx;
    ped.y = ny;
  } else {
    ped.target = null;
  }
}

export function spawnTraffic(city, seed, count) {
  const rng = mulberry32(seed + 99);
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const spot = nearestRoadPoint(city, 150 + rng() * (city.width - 300), 150 + rng() * (city.height - 300));
    const angle = spot.angle + (rng() < 0.5 ? 0 : Math.PI);
    const car = createCar(spot.x, spot.y, angle, pick(rng, PALETTE.carColors), 'traffic');
    car.speed = 140 + rng() * 90;
    car.lane = rng() < 0.5 ? -22 : 22;
    cars.push(car);
  }
  return cars;
}

// Traffic follows its road: keep the lane offset, turn at intersections sometimes.
export function updateTraffic(city, car, dt, rng) {
  const onVertical = Math.abs(Math.sin(car.angle)) > 0.7;
  const nearCross = onVertical
    ? city.horizontals.some((hy) => Math.abs(car.y - hy) < 30)
    : city.verticals.some((vx) => Math.abs(car.x - vx) < 30);
  let steer = 0;
  if (nearCross && rng() < dt * 0.5) {
    car.angle += (rng() < 0.5 ? 1 : -1) * Math.PI / 2;
    car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2);
  }
  // Gentle recentring toward the lane: steer back if drifting off the road line.
  const target = onVertical
    ? car.x : car.y;
  void target;
  const result = stepCar(city, car, dt, car.speed < 170 ? 0.4 : 0, steer);
  if (result === 'crash' || result === 'bump') car.angle += Math.PI / 2;
  // Keep traffic on roads: if it somehow left the road, steer it back.
  if (!isOnRoad(city, car.x, car.y)) {
    const spot = nearestRoadPoint(city, car.x, car.y);
    car.angle = Math.atan2(spot.y - car.y, spot.x - car.x);
  }
  return result;
}
