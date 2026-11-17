// World: the whole simulation in one place. Holds the player, cars, pedestrians,
// police, missions, wanted level, particles and camera, and steps them forward.
// Screens: title -> play -> (paused | busted | wasted). Missions drive the story.
import { WORLD, PLAYER, CAR, POLICE } from './config.js';
import { buildCity, isOnRoad } from './city.js';
import { createMissions } from './missions.js';
import { createWanted } from './police.js';
import { createParticles } from './particles.js';
import { createCar, stepCar, carDistance } from './vehicles.js';
import { spawnPeds, updatePed, spawnTraffic, updateTraffic } from './entities.js';
import { punchHit, shootHit } from './combat.js';
import { mulberry32, pick } from './random.js';
import { PALETTE } from './config.js';
import { saveGame, loadGame } from './save.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

export function createWorld(seed = 20261117, opts = {}) {
  const city = buildCity(seed);
  const rng = mulberry32(seed + 7);
  const missions = createMissions();
  const wanted = createWanted();
  const particles = createParticles();
  const saved = opts.ignoreSave ? null : loadGame();
  if (saved) missions.restore({ index: saved.missionIndex, cash: saved.cash });

  const world = {
    seed, city, rng, missions, wanted, particles,
    screen: SCREEN_TITLE,
    time: 0,
    camera: { x: city.spawn.x, y: city.spawn.y, zoom: 1 },
    player: {
      x: city.spawn.x, y: city.spawn.y, angle: -Math.PI / 2,
      health: saved ? saved.health || PLAYER.maxHealth : PLAYER.maxHealth,
      inCar: null, punchCd: 0, shootCd: 0, ammo: 24, speed: 0,
    },
    peds: spawnPeds(city, seed, 70),
    traffic: spawnTraffic(city, seed, 22),
    parked: [],
    cops: [], // police cars
    footCops: [],
    convoy: [],
    cashDrops: [],
    messages: [],
    banner: null,
    bannerTimer: 0,
    bustTimer: 0,
    saveTimer: 0,
    danger: null,
    stats: { carsStolen: 0, missionsDone: 0, shotsFired: 0 },
    audio: null,
  };

  // Parked cars along the roads for the player to steal.
  for (let i = 0; i < 16; i += 1) {
    const vx = city.verticals[i % city.verticals.length];
    const hy = city.horizontals[(i * 3) % city.horizontals.length];
    const vertical = i % 2 === 0;
    const car = createCar(
      vertical ? vx + 30 : vx + (i * 37) % 200,
      vertical ? hy + (i * 53) % 220 : hy + 30,
      vertical ? Math.PI / 2 : 0,
      pick(rng, PALETTE.carColors), 'parked');
    car.speed = 0;
    world.parked.push(car);
  }
  // Cash pickups scattered on sidewalks.
  for (let i = 0; i < 12; i += 1) {
    world.cashDrops.push({
      x: 200 + rng() * (city.width - 400),
      y: 200 + rng() * (city.height - 400),
      amount: 50, taken: false, bob: rng() * 6,
    });
  }
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
  world.screen = SCREEN_PLAY;
}

function say(world, text) {
  world.messages.unshift({ text, t: 5 });
  if (world.messages.length > 4) world.messages.pop();
}

function showBanner(world, title, sub) {
  world.banner = { title, sub };
  world.bannerTimer = 3.2;
}

function missionTarget(world) {
  const step = world.missions.currentStep();
  if (!step) return null;
  const { city } = world;
  switch (step.target) {
    case 'car': return { x: world.parked[0].x, y: world.parked[0].y, label: 'Steal a car' };
    case 'park': {
      const park = city.parks[0] || { x: 900, y: 900 };
      return { x: park.x + park.w / 2, y: park.y + park.h / 2, label: 'Pick up the witness' };
    }
    case 'safehouse': return { x: city.safehouse.x, y: city.safehouse.y, label: 'Rosa\'s Garage' };
    case 'depot': return { x: city.depot.x, y: city.depot.y, label: 'Harbor Depot' };
    case 'depot-office': return { x: city.depot.x, y: city.depot.y, label: 'Grab the deeds (E)' };
    case 'marina': return { x: city.marina.x + city.marina.w / 2, y: city.marina.y + city.marina.h / 2, label: 'Marina' };
    case 'convoy': return world.convoy[0]
      ? { x: world.convoy[0].x, y: world.convoy[0].y, label: 'Venn\'s convoy' }
      : { x: city.verticals[5], y: city.horizontals[7], label: 'Bay Boulevard' };
    case 'convoy-lead': return world.convoy[0]
      ? { x: world.convoy[0].x, y: world.convoy[0].y, label: 'Ram the lead car!' }
      : null;
    case 'tower': {
      const tower = city.buildings.find((b) => b.kind === 'tower') || city.buildings[0];
      return { x: tower.x + tower.w / 2, y: tower.y + tower.h / 2, label: 'Radio tower' };
    }
    default: return null;
  }
}

function spawnConvoy(world) {
  const { city } = world;
  world.convoy = [];
  for (let i = 0; i < 3; i += 1) {
    const car = createCar(city.verticals[3] + i * -90, city.horizontals[7], 0, i === 0 ? '#1a1a1a' : '#2c3e50', 'convoy');
    car.speed = 240;
    car.driver = 'convoy';
    world.convoy.push(car);
  }
  say(world, 'Venn\'s convoy is on Bay Boulevard — catch it!');
}

function spawnPolice(world) {
  const want = Math.min(POLICE.maxCops, world.wanted.stars * 2);
  const { city, player, rng } = world;
  while (world.cops.length < want) {
    const angle = rng() * Math.PI * 2;
    const dist = 480 + rng() * 260;
    const x = Math.max(80, Math.min(city.width - 80, player.x + Math.cos(angle) * dist));
    const y = Math.max(80, Math.min(city.height - 80, player.y + Math.sin(angle) * dist));
    const spot = { x, y };
    const car = createCar(spot.x, spot.y, Math.atan2(player.y - y, player.x - x), '#1e4f9c', 'cop');
    car.speed = 200;
    world.cops.push(car);
  }
  while (world.cops.length > want) world.cops.pop();
  // On foot, cops appear when the player is on foot and wanted is high.
  if (world.wanted.stars >= 3 && !world.player.inCar && world.footCops.length < 3) {
    const angle = rng() * Math.PI * 2;
    world.footCops.push({
      x: player.x + Math.cos(angle) * 420, y: player.y + Math.sin(angle) * 420,
      angle: 0, hp: 60, speed: 190, state: 'chase',
    });
  }
}

function carVsCar(world, a, b, dt) {
  const d = carDistance(a, b);
  if (d > 52 || d === 0) return;
  const push = (52 - d) / 2;
  const nx = (b.x - a.x) / d;
  const ny = (b.y - a.y) / d;
  a.x -= nx * push; a.y -= ny * push;
  b.x += nx * push; b.y += ny * push;
  const impact = Math.abs(a.speed - b.speed);
  if (impact > 120) {
    a.hp -= impact * 0.05;
    b.hp -= impact * 0.05;
    a.speed *= 0.5;
    b.speed *= 0.5;
    world.particles.spawn((a.x + b.x) / 2, (a.y + b.y) / 2, 'spark', 6);
    if (world.audio) world.audio.crash();
  }
}

export function updateWorld(world, input, dt) {
  if (world.screen !== SCREEN_PLAY) return;
  world.time += dt;
  const p = world.player;
  const { city } = world;
  // Camera follows the player first, so an early return below can never freeze it.
  world.camera.x = p.x;
  world.camera.y = p.y;

  // --- mission start: Enter on the title screen is handled in main.js ---
  const target = missionTarget(world);
  world._target = target;

  // --- player on foot ---
  if (!p.inCar) {
    const axis = input.axis();
    const running = input.down('shift');
    const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    let mx = axis.x;
    let my = axis.y;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; p.angle = Math.atan2(my, mx); }
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    const blocked = (x, y) => city.buildings.some((b) => x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - 10 && y < b.y + b.h + 10);
    if (!blocked(nx, ny)) {
      p.x = Math.max(20, Math.min(city.width - 20, nx));
      p.y = Math.max(20, Math.min(city.height - 20, ny));
    } else if (!blocked(nx, p.y)) {
      p.x = Math.max(20, Math.min(city.width - 20, nx)); // slide along the wall
    } else if (!blocked(p.x, ny)) {
      p.y = Math.max(20, Math.min(city.height - 20, ny));
    }
    p.speed = len > 0 ? speed : 0;

    // Punch
    if (p.punchCd > 0) p.punchCd -= dt;
    if (input.wasPressed('f') && p.punchCd <= 0) {
      p.punchCd = PLAYER.punchCooldown;
      const victims = [...world.peds, ...world.footCops];
      const hit = punchHit(p, victims, PLAYER.punchRange + 14, 1.1);
      if (hit) {
        world.wanted.commitCrime('assault');
        world.particles.spawn(hit.x, hit.y, 'spark', 4);
        if (world.audio) world.audio.punch();
        if (hit.hp <= 0 && world.peds.includes(hit)) {
          hit.fleeing = 0;
          hit.state = 'down';
        }
      }
    }
    // Shoot toward the mouse
    if (p.shootCd > 0) p.shootCd -= dt;
    if (input.mouse.clicked && p.shootCd <= 0 && p.ammo > 0) {
      p.shootCd = 0.28;
      p.ammo -= 1;
      world.stats.shotsFired += 1;
      const rect = { w: world.viewW || 1280, h: world.viewH || 800 };
      const aim = Math.atan2(
        (input.mouse.y - rect.h / 2) + (p.y - world.camera.y),
        (input.mouse.x - rect.w / 2) + (p.x - world.camera.x));
      const victims = [...world.peds, ...world.footCops, ...world.cops];
      const hit = shootHit(p, aim, victims, 520);
      world.particles.spawn(p.x + Math.cos(aim) * 24, p.y + Math.sin(aim) * 24, 'spark', 3);
      world.danger = { x: p.x, y: p.y };
      for (const ped of world.peds) {
        if (Math.hypot(ped.x - p.x, ped.y - p.y) < 320) ped.fleeing = 2.5;
      }
      if (world.audio) world.audio.gunshot();
      if (hit) {
        const t = hit.target;
        if (world.cops.includes(t) || world.footCops.includes(t)) world.wanted.commitCrime('shoot-cop');
        else world.wanted.commitCrime('shoot-ped');
        world.particles.spawn(t.x, t.y, 'spark', 5);
      }
    }
    // Enter / steal a car
    if (input.wasPressed('e')) {
      const allCars = [...world.parked, ...world.traffic];
      let best = null;
      let bestD = 70;
      for (const car of allCars) {
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d < bestD) { best = car; bestD = d; }
      }
      if (best) {
        const wasParked = world.parked.includes(best);
        if (!wasParked) {
          world.wanted.commitCrime('steal-car');
          say(world, 'Car stolen! The owner called it in.');
          world.stats.carsStolen += 1;
        }
        p.inCar = best;
        best.driver = 'player';
        world.parked = world.parked.filter((c) => c !== best);
        world.traffic = world.traffic.filter((c) => c !== best);
        if (world.audio) world.audio.pickup();
      } else if (target && target.label.includes('deeds') && Math.hypot(target.x - p.x, target.y - p.y) < 90) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
        else say(world, 'Deeds grabbed — run for the marina!');
      }
    }
  } else {
    // --- driving ---
    const car = p.inCar;
    const throttle = input.down('w', 'arrowup') ? 1 : input.down('s', 'arrowdown') ? -1 : 0;
    const steer = (input.down('a', 'arrowleft') ? -1 : 0) + (input.down('d', 'arrowright') ? 1 : 0);
    const result = stepCar(city, car, dt, throttle, steer);
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    if (result === 'crash') {
      world.particles.spawn(car.x, car.y, 'smoke', 8);
      if (world.audio) world.audio.crash();
    }
    if (car.hp <= 0 && !world.safeMode) { wastePlayer(world); return; }
    if (Math.abs(car.speed) > 300 && Math.random() < dt * 8) {
      world.particles.spawn(car.x - Math.cos(car.angle) * 26, car.y - Math.sin(car.angle) * 26, 'smoke', 1);
    }
    if (world.audio) world.audio.setEngine(Math.abs(car.speed) / CAR.maxSpeed);
    if (input.wasPressed('e')) {
      p.inCar = null;
      car.driver = 'parked';
      car.speed = 0;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
      world.parked.push(car);
      if (world.audio) world.audio.setEngine(0);
    }
  }

  // --- car vs car collisions ---
  const allCars = [...world.traffic, ...world.parked, ...world.cops, ...world.convoy];
  if (p.inCar) {
    for (const other of allCars) {
      if (other === p.inCar) continue;
      const before = other.hp;
      carVsCar(world, p.inCar, other, dt);
      if (other.hp < before && other.kind === 'cop') world.wanted.commitCrime('ram-cop');
      if (other.kind === 'convoy' && other.hp <= 0 && world.convoy.includes(other)) {
        world.convoy = world.convoy.filter((c) => c !== other);
        world.particles.spawn(other.x, other.y, 'explosion', 14);
        say(world, 'Convoy car stopped!');
      }
    }
  }

  // --- traffic & peds ---
  for (const car of world.traffic) updateTraffic(city, car, dt, world.rng);
  for (const ped of world.peds) {
    if (ped.state === 'down') continue;
    updatePed(city, ped, dt, world.danger || { x: p.x, y: p.y });
  }

  // --- police ---
  if (world.wanted.stars > 0) spawnPolice(world);
  else { world.cops = []; world.footCops = []; }
  for (const cop of world.cops) {
    const wantAngle = Math.atan2(p.y - cop.y, p.x - cop.x);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    stepCar(city, cop, dt, 1, Math.max(-1, Math.min(1, diff * 2)));
    // Cop rams the player car.
    if (p.inCar && carDistance(cop, p.inCar) < 56) carVsCar(world, cop, p.inCar, dt);
  }
  for (const fc of world.footCops) {
    if (fc.hp <= 0) continue;
    const d = Math.hypot(p.x - fc.x, p.y - fc.y);
    fc.angle = Math.atan2(p.y - fc.y, p.x - fc.x);
    fc.x += Math.cos(fc.angle) * fc.speed * dt;
    fc.y += Math.sin(fc.angle) * fc.speed * dt;
    if (d < 30) {
      p.health -= 22 * dt;
      if (p.health <= 0) { wastePlayer(world); return; }
    }
    if (d < POLICE.bustRange) {
      world.bustTimer += dt;
      if (world.bustTimer > 1.2) { bustPlayer(world); return; }
    }
  }
  if (world.cops.length === 0 && world.footCops.length === 0) world.bustTimer = 0;
  // Busted if a cop car pins the player car at low speed.
  if (p.inCar && world.wanted.stars >= 3 && Math.abs(p.inCar.speed) < 40) {
    const near = world.cops.some((c) => carDistance(c, p.inCar) < 60);
    if (near) {
      world.bustTimer += dt;
      if (world.bustTimer > 2.5) { bustPlayer(world); return; }
    }
  }
  if (world.audio) world.audio.setSiren(world.wanted.stars > 0);

  // --- wanted cooldown ---
  const nearestCop = [...world.cops, ...world.footCops]
    .reduce((m, c) => Math.min(m, Math.hypot(c.x - p.x, c.y - p.y)), Infinity);
  world.wanted.tick(dt, { hidden: nearestCop > 520, inCar: !!p.inCar });

  // --- cash pickups ---
  for (const drop of world.cashDrops) {
    if (drop.taken) continue;
    drop.bob += dt;
    if (Math.hypot(drop.x - p.x, drop.y - p.y) < 30) {
      drop.taken = true;
      world.cashBonus = (world.cashBonus || 0) + drop.amount;
      world.particles.spawn(drop.x, drop.y, 'spark', 6);
      say(world, `+$${drop.amount} cash found`);
      if (world.audio) world.audio.pickup();
    }
  }

  // --- mission progress ---
  if (world.missions.active && target) {
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    const step = world.missions.currentStep();
    if (step) {
      if (step.id === 'steal' && p.inCar) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
        else say(world, 'Now pick up the witness at Crescent Park.');
      } else if (step.id === 'pickup' && d < 80) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
        else say(world, 'Witness aboard — get her to Rosa\'s Garage!');
      } else if (step.id === 'deliver' && d < 90) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
      } else if (step.id === 'infiltrate' && !p.inCar && d < 90) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
        else say(world, 'Inside the depot — grab the deeds at the office (E).');
      } else if (step.id === 'escape' && d < 100) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
      } else if (step.id === 'chase' && world.convoy.length && d < 320) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
        else say(world, 'Ram the black lead car until it stops!');
      } else if (step.id === 'ram' && world.convoy.length === 0) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
        else say(world, 'Ledger secured — reach the radio tower!');
      } else if (step.id === 'ledger' && d < 100) {
        const res = world.missions.advanceStep();
        if (res === 'completed') missionCompleted(world);
      }
    }
  }
  // Mission 3 spawns its convoy when started.
  if (world.missions.active && world.missions.available() && world.missions.available().id === 'high-tide'
    && world.missions.currentStep() && world.missions.currentStep().id === 'chase' && world.convoy.length === 0) {
    spawnConvoy(world);
  }
  // Convoy drives on.
  for (const car of world.convoy) {
    stepCar(city, car, dt, 0.55, 0);
    if (car.x > city.width - 100) car.x = 150;
  }

  // --- particles, banner, messages ---
  world.particles.update(dt);
  if (world.bannerTimer > 0) {
    world.bannerTimer -= dt;
    if (world.bannerTimer <= 0) world.banner = null;
  }
  for (const m of world.messages) m.t -= dt;
  world.messages = world.messages.filter((m) => m.t > 0);

  // --- camera follows the player (also set at the top of this function) ---
  world.camera.x = p.x;
  world.camera.y = p.y;

  // --- autosave every 20 s (never during staged screenshots) ---
  world.saveTimer += dt;
  if (world.saveTimer > 20 && !world.safeMode) {
    world.saveTimer = 0;
    saveGame(world);
  }

  // --- health regen slowly out of combat ---
  if (world.wanted.stars === 0 && p.health < PLAYER.maxHealth) p.health = Math.min(PLAYER.maxHealth, p.health + 2 * dt);
}

function missionCompleted(world) {
  const def = world.missions.available();
  world.stats.missionsDone += 1;
  showBanner(world, 'MISSION COMPLETE', def ? `${def.title} — $${def.reward}` : '');
  say(world, def ? `Mission complete: ${def.title} (+$${def.reward})` : 'All missions complete!');
  if (world.audio) world.audio.missionDone();
  world.particles.spawn(world.player.x, world.player.y, 'spark', 12);
  if (world.missions.isDone()) {
    showBanner(world, 'SOLARA BAY IS YOURS', 'Every mission complete — free roam, Nia.');
  }
}

function bustPlayer(world) {
  if (world.safeMode) { world.bustTimer = 0; return; } // staged shots never bust
  world.screen = SCREEN_BUSTED;
  world.wanted.reset();
  world.bustTimer = 0;
  if (world.audio) { world.audio.busted(); world.audio.setSiren(false); world.audio.setEngine(0); }
  const p = world.player;
  p.health = PLAYER.maxHealth;
  p.x = world.city.spawn.x;
  p.y = world.city.spawn.y;
  p.inCar = null;
  world.cops = [];
  world.footCops = [];
  saveGame(world);
}

export function wastePlayer(world) {
  if (world.safeMode) { world.player.health = PLAYER.maxHealth; return; } // staged shots never waste
  world.screen = SCREEN_WASTED;
  world.wanted.reset();
  if (world.audio) world.audio.busted();
  const p = world.player;
  p.health = PLAYER.maxHealth;
  p.x = world.city.spawn.x;
  p.y = world.city.spawn.y;
  p.inCar = null;
  world.cops = [];
  world.footCops = [];
  saveGame(world);
}

export function totalCash(world) {
  return world.missions.cash + (world.cashBonus || 0);
}
