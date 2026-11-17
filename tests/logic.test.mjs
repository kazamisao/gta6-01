// Logic tests for Solara Bay (run: node --test tests/logic.test.mjs).
// Pure modules only: no DOM, no canvas. Red first, then green.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../game/src/random.js';
import { buildCity } from '../game/src/city.js';
import { createMissions, MISSION_DEFS } from '../game/src/missions.js';
import { createWanted } from '../game/src/police.js';

test('rng is deterministic for the same seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.equal(a(), b());
  assert.notEqual(a(), mulberry32(7)());
});

test('city generation is deterministic and road-safe', () => {
  const c1 = buildCity(1234);
  const c2 = buildCity(1234);
  assert.equal(JSON.stringify(c1.buildings), JSON.stringify(c2.buildings));
  assert.ok(c1.buildings.length >= 40, 'city needs many buildings');
  assert.ok(c1.roads.length >= 10, 'city needs roads');
  // No building may overlap a road rect.
  for (const b of c1.buildings) {
    for (const r of c1.roads) {
      const overlap = b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y;
      assert.equal(overlap, false, `building at ${b.x},${b.y} overlaps a road`);
    }
  }
  // Spawn point must sit on a road.
  const onRoad = c1.roads.some((r) => c1.spawn.x >= r.x && c1.spawn.x <= r.x + r.w && c1.spawn.y >= r.y && c1.spawn.y <= r.y + r.h);
  assert.equal(onRoad, true, 'spawn must be on a road');
});

test('missions unlock in order and pay out', () => {
  const m = createMissions();
  assert.equal(m.available().id, 'borrowed-wheels');
  m.completeCurrent();
  assert.equal(m.cash, MISSION_DEFS[0].reward);
  assert.equal(m.available().id, 'night-shift');
  m.completeCurrent();
  m.completeCurrent();
  assert.equal(m.available(), null, 'all missions done');
  assert.equal(m.completedCount(), 3);
});

test('wanted level rises on crime and decays when hidden', () => {
  const w = createWanted();
  assert.equal(w.stars, 0);
  w.commitCrime('steal-car');
  assert.equal(w.stars, 1);
  w.commitCrime('assault');
  assert.ok(w.stars >= 2);
  w.commitCrime('shoot-cop');
  assert.equal(w.stars, 5, 'shooting a cop maxes wanted');
  // Hidden for a long while: stars fall back down.
  for (let i = 0; i < 600; i += 1) w.tick(1, { hidden: true, inCar: false });
  assert.ok(w.stars < 5, 'wanted decays while hidden');
});

test('wanted never exceeds 5 and never goes below 0', () => {
  const w = createWanted();
  for (let i = 0; i < 20; i += 1) w.commitCrime('shoot-cop');
  assert.equal(w.stars, 5);
  for (let i = 0; i < 2000; i += 1) w.tick(1, { hidden: true, inCar: false });
  assert.equal(w.stars, 0);
});
