// Deterministic screenshot scenes: each one plays the real rules forward from a
// fresh world for a fixed number of steps, steered by a simple autopilot, so the
// frame is what a short game really looks like and the same seed always gives
// the same frame. ?shot=start|foot|drive|chase (any other name is start).
import { SCREEN_TITLE, SCREEN_PLAY } from './world.js';

const STEP = 1 / 60;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Manhattan waypoint for a car: drive along the current road to the cross street
// nearest the mission target, then turn — never cut across city blocks.
function roadWaypoint(world) {
  const car = world.player.inCar;
  const t = world._target;
  if (!car || !t) return t;
  const { city } = world;
  let hy = city.horizontals[0];
  for (const y of city.horizontals) if (Math.abs(car.y - y) < Math.abs(car.y - hy)) hy = y;
  let vx = city.verticals[0];
  for (const x of city.verticals) if (Math.abs(car.x - x) < Math.abs(car.x - vx)) vx = x;
  const onHorizontal = Math.abs(car.y - hy) < 48;
  const onVertical = Math.abs(car.x - vx) < 48;
  let waypoint;
  if (onHorizontal && !onVertical) {
    if (Math.abs(t.y - hy) < 60) waypoint = { x: t.x, y: hy, final: true };
    else {
      let tx = city.verticals[0];
      for (const x of city.verticals) if (Math.abs(t.x - x) < Math.abs(t.x - tx)) tx = x;
      waypoint = { x: tx, y: hy, final: false };
    }
  } else if (onVertical && !onHorizontal) {
    if (Math.abs(t.x - vx) < 60) waypoint = { x: vx, y: t.y, final: true };
    else {
      let ty = city.horizontals[0];
      for (const y of city.horizontals) if (Math.abs(t.y - y) < Math.abs(t.y - ty)) ty = y;
      waypoint = { x: vx, y: ty, final: false };
    }
  } else {
    // Off-road (or at an intersection): head for the nearest road point.
    waypoint = { x: vx, y: hy, final: false };
  }
  // Reached the turn point: head straight for the mission target (parks and
  // sidewalks are drivable, only buildings block).
  if (!waypoint.final && Math.hypot(waypoint.x - car.x, waypoint.y - car.y) < 70) {
    return { x: t.x, y: t.y, final: true };
  }
  return waypoint;
}

// A fake input the autopilot drives: axis toward a point, or drive toward it.
function makePilot(world, getTarget) {
  let pressedE = false;
  let pressedOnce = false;
  const driveTarget = () => (world.player.inCar ? roadWaypoint(world) : getTarget());
  return {
    mouse: { x: 640, y: 400, clicked: false },
    axis() {
      const t = getTarget();
      if (!t || world.player.inCar) return { x: 0, y: 0 };
      const dx = t.x - world.player.x;
      const dy = t.y - world.player.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    },
    down(...names) {
      if (!world.player.inCar) return false;
      const t = driveTarget();
      if (!t) return false;
      const want = Math.atan2(t.y - world.player.y, t.x - world.player.x);
      const dist = Math.hypot(t.x - world.player.x, t.y - world.player.y);
      if (names.includes('w') || names.includes('arrowup')) return !(t.final && dist < 60); // ease off only at point-blank range
      if (names.includes('a') || names.includes('arrowleft')) {
        return angleDiff(want, world.player.angle) < -0.08;
      }
      if (names.includes('d') || names.includes('arrowright')) {
        return angleDiff(want, world.player.angle) > 0.08;
      }
      return false;
    },
    wasPressed(name) {
      if (name === 'e' && pressedE && !pressedOnce) { pressedOnce = true; return true; }
      return false;
    },
    pressE() { pressedE = true; },
    endFrame() {},
  };
}

export function stageShot(name, world, updateWorld) {
  const pilot = makePilot(world, () => world._target);
  world.safeMode = true; // staged shots never bust / waste mid-scene
  try {
    return stageShotInner(name, world, updateWorld, pilot);
  } finally {
    world.safeMode = false;
  }
}

function stageShotInner(name, world, updateWorld, pilot) {
  if (name === 'foot') {
    world.screen = SCREEN_PLAY;
    world.missions.start();
    // Walk toward the nearest parked car, then just explore on foot.
    for (let i = 0; i < 22 * 60; i += 1) {
      world._target = { x: world.parked[0].x, y: world.parked[0].y };
      updateWorld(world, pilot, STEP);
      if (world.screen !== SCREEN_PLAY) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'drive') {
    world.screen = SCREEN_PLAY;
    world.missions.start();
    // Steal the nearest parked car, then drive the mission route.
    for (let i = 0; i < 26 * 60; i += 1) {
      const near = world.parked.length && Math.hypot(world.parked[0].x - world.player.x, world.parked[0].y - world.player.y) < 60;
      if (near && !world.player.inCar) pilot.pressE();
      updateWorld(world, pilot, STEP);
      if (world.screen !== SCREEN_PLAY) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Mission 3, wanted level 3, convoy ahead, police closing in — the cover.
    world.missions.restore({ index: 2, cash: 1700 });
    world.missions.start();
    world.screen = SCREEN_PLAY;
    // Put Nia in a fast car on Bay Boulevard, just BEHIND the convoy (west of it).
    const car = world.parked[0];
    world.player.inCar = car;
    car.driver = 'player';
    world.parked = world.parked.filter((c) => c !== car);
    car.x = world.city.verticals[2];
    car.y = world.city.horizontals[7];
    car.angle = 0;
    car.speed = 300;
    car.hp = 10000; // staged chase: the hero car does not wreck mid-shot
    world.player.x = car.x;
    world.player.y = car.y;
    world.wanted.commitCrime('steal-car');
    world.wanted.commitCrime('assault');
    world.wanted.commitCrime('assault');
    for (let i = 0; i < 4 * 60; i += 1) {
      updateWorld(world, pilot, STEP);
      if (world.screen !== SCREEN_PLAY) break;
    }
    return { screen: SCREEN_PLAY };
  }
  // start (default): title screen over a living city (simulated, then frozen).
  world.screen = SCREEN_PLAY;
  for (let i = 0; i < 5 * 60; i += 1) {
    updateWorld(world, pilot, STEP);
  }
  world.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE };
}
