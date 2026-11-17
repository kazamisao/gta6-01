// Rendering: top-down Solara Bay on one canvas — extruded buildings for a
// pseudo-3D read, sun-soaked palette, cars / peds / police, particles, and the
// full HUD (cash, mission objective, wanted stars, health, minimap, messages).
import { WORLD, PALETTE } from './config.js';
import { totalCash } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, -30, -12, 64, 30, 8);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -32, -15, 64, 30, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  roundRect(ctx, -8, -12, 20, 24, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 12, -12, 8, 24, 3);
  ctx.fill();
  // Headlights / taillights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(30, -12, 3, 5);
  ctx.fillRect(30, 7, 3, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-33, -12, 3, 5);
  ctx.fillRect(-33, 7, 3, 5);
  if (car.kind === 'cop') {
    ctx.fillStyle = '#f5f5f5';
    roundRect(ctx, -32, -15, 64, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#1e4f9c';
    ctx.fillRect(-10, -15, 20, 30);
    const flash = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d7dff';
    ctx.fillRect(-6, -16, 7, 6);
    ctx.fillStyle = flash ? '#2d7dff' : '#ff2d2d';
    ctx.fillRect(2, -16, 7, 6);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 4);
  }
  if (car.kind === 'convoy') {
    ctx.fillStyle = '#f5c518';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENN', 0, 4);
  }
  ctx.restore();
}

function drawPed(ctx, ped, isPlayer, time) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(ped.angle);
  ctx.fillStyle = isPlayer ? '#d63031' : ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, isPlayer ? 13 : 10, 0, Math.PI * 2);
  ctx.fill();
  // Head + facing nose.
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isPlayer ? '#fff' : 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(10, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (isPlayer) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 20 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBuilding(ctx, b, time) {
  const drop = Math.min(26, b.height * 0.4);
  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(b.x + 6, b.y + drop + 4, b.w, b.h);
  // Extruded south + east faces (pseudo-3D).
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.h);
  ctx.lineTo(b.x + drop, b.y + b.h + drop);
  ctx.lineTo(b.x + b.w + drop, b.y + b.h + drop);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(b.x + b.w, b.y);
  ctx.lineTo(b.x + b.w + drop, b.y + drop);
  ctx.lineTo(b.x + b.w + drop, b.y + b.h + drop);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath();
  ctx.fill();
  // Roof.
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  // Rooftop details: AC units / skylights.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const cols = Math.max(1, Math.floor(b.w / 26));
  const rows = Math.max(1, Math.floor(b.h / 26));
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      ctx.fillRect(b.x + 6 + i * 26, b.y + 6 + j * 26, 12, 9);
    }
  }
  if (b.name) {
    ctx.fillStyle = 'rgba(20,20,20,0.75)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 4);
  }
}

function drawCityMap(ctx, world, x0, y0, size, withLabels) {
  const s = size / WORLD.width;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = '#5d8a4a';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x0, 0, 120 * s, size);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(x0 + world.city.marina.x * s, y0 + world.city.marina.y * s, world.city.marina.w * s, world.city.marina.h * s);
  for (const park of world.city.parks) {
    ctx.fillStyle = '#6da34e';
    ctx.fillRect(x0 + park.x * s, y0 + park.y * s, park.w * s, park.h * s);
  }
  ctx.fillStyle = '#c9c2b2';
  for (const b of world.city.buildings) {
    ctx.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(1.5, b.w * s), Math.max(1.5, b.h * s));
  }
  ctx.strokeStyle = '#3a3f47';
  ctx.lineWidth = Math.max(2, 96 * s);
  for (const r of world.city.roads) {
    ctx.beginPath();
    if (r.vertical) { ctx.moveTo(x0 + (r.x + r.w / 2) * s, y0); ctx.lineTo(x0 + (r.x + r.w / 2) * s, y0 + size); }
    else { ctx.moveTo(x0, y0 + (r.y + r.h / 2) * s); ctx.lineTo(x0 + size, y0 + (r.y + r.h / 2) * s); }
    ctx.stroke();
  }
  const dot = (x, y, color, r = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + x * s, y0 + y * s, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const target = world._target;
  if (target) {
    const tx = x0 + target.x * s;
    const ty = y0 + target.y * s;
    ctx.fillStyle = '#ffd700';
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(Math.PI / 4);
    const pulse = 4 + Math.sin(world.time * 5) * 1.5;
    ctx.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
    ctx.restore();
  }
  for (const car of world.convoy) dot(car.x, car.y, '#111', 3.5);
  for (const cop of world.cops) dot(cop.x, cop.y, '#2d7dff', 3.5);
  for (const car of world.traffic) dot(car.x, car.y, '#e8e8e8', 2);
  dot(world.player.x, world.player.y, '#2ecc71', 4.5);
  if (withLabels) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    for (const b of world.city.buildings) {
      if (!b.name) continue;
      ctx.fillText(b.name, x0 + b.x * s + 2, y0 + b.y * s - 3);
    }
  }
  ctx.restore();
}

function drawMinimap(ctx, world, w, h) {
  const size = 168;
  const x0 = w - size - 14;
  const y0 = h - size - 14;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,24,0.82)';
  roundRect(ctx, x0 - 6, y0 - 6, size + 12, size + 12, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawCityMap(ctx, world, x0, y0, size, false);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARA BAY', x0, y0 - 10);
}

// Full-city map overlay (TAB): the whole island at a glance — every road,
// landmark and the mission marker. Also drawn on the title screen.
export function renderMapOverlay(ctx, world, w, h) {
  ctx.fillStyle = 'rgba(8,12,20,0.78)';
  ctx.fillRect(0, 0, w, h);
  const size = Math.min(w, h) - 120;
  const x0 = (w - size) / 2;
  const y0 = (h - size) / 2 - 10;
  ctx.fillStyle = 'rgba(10,16,24,0.95)';
  roundRect(ctx, x0 - 14, y0 - 34, size + 28, size + 62, 14);
  ctx.fill();
  ctx.strokeStyle = '#f7c873';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f7c873';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLARA BAY — FULL MAP', w / 2, y0 - 12);
  drawCityMap(ctx, world, x0, y0, size, true);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText('● You    ◆ Mission    ● Police    ■ Landmark    — TAB to close —', w / 2, y0 + size + 18);
  ctx.textAlign = 'left';
}

function drawStars(ctx, stars, x, y) {
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    const sx = x + i * 30;
    ctx.fillText('★', sx, y);
    ctx.strokeText('★', sx, y);
  }
}

export function renderWorld(ctx, world, w, h) {
  const { city, player, time } = world;
  ctx.clearRect(0, 0, w, h);
  // Warm late-afternoon sky tint behind everything (visible at world edges).
  ctx.fillStyle = '#f7c873';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  const scale = 1;
  ctx.translate(w / 2 - world.camera.x * scale, h / 2 - world.camera.y * scale);
  ctx.scale(scale, scale);

  // Ground: grass, beach west, marina water south.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(city.beach.x, city.beach.y, city.beach.w, city.beach.h);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(city.marina.x, city.marina.y, city.marina.w, city.marina.h);
  // Marina boats.
  ctx.fillStyle = '#f5f5f5';
  for (let i = 0; i < 6; i += 1) {
    ctx.fillRect(city.marina.x + 30 + i * 90, city.marina.y + 30, 44, 14);
  }

  // Parks.
  for (const park of city.parks) {
    ctx.fillStyle = '#6da34e';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#4e7d3a';
    for (let i = 0; i < park.trees; i += 1) {
      const tx = park.x + 20 + ((i * 53) % Math.max(40, park.w - 40));
      const ty = park.y + 20 + ((i * 37) % Math.max(40, park.h - 40));
      ctx.beginPath();
      ctx.arc(tx, ty, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Roads + sidewalks + lane dashes.
  for (const road of city.roads) {
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(road.x - 10, road.y - 10, road.w + 20, road.h + 20);
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(road.x, road.y, road.w, road.h);
  }
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 26]);
  for (const vx of city.verticals) {
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.lineTo(vx, WORLD.height);
    ctx.stroke();
  }
  for (const hy of city.horizontals) {
    ctx.beginPath();
    ctx.moveTo(0, hy);
    ctx.lineTo(WORLD.width, hy);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings.
  for (const b of city.buildings) drawBuilding(ctx, b, time);

  // Cash pickups.
  for (const drop of world.cashDrops) {
    if (drop.taken) continue;
    const bob = Math.sin(drop.bob * 3) * 3;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(drop.x, drop.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', drop.x, drop.y + bob + 4);
  }

  // Objective beacon.
  const target = world._target;
  if (target && world.missions.active) {
    const pulse = 26 + Math.sin(time * 5) * 6;
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.save();
    ctx.translate(target.x, target.y - 34 - Math.sin(time * 4) * 5);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.fillRect(target.x - 14, target.y - 260, 28, 260);
  }

  // Cars: parked, traffic, convoy, police.
  for (const car of world.parked) drawCar(ctx, car, time);
  for (const car of world.traffic) drawCar(ctx, car, time);
  for (const car of world.convoy) drawCar(ctx, car, time);
  for (const car of world.cops) drawCar(ctx, car, time);
  if (player.inCar) drawCar(ctx, player.inCar, time);

  // Pedestrians + foot cops.
  for (const ped of world.peds) {
    if (ped.state === 'down') continue;
    drawPed(ctx, ped, false, time);
  }
  for (const fc of world.footCops) {
    if (fc.hp <= 0) continue;
    ctx.save();
    ctx.translate(fc.x, fc.y);
    ctx.fillStyle = '#1e4f9c';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    ctx.restore();
  }
  if (!player.inCar) drawPed(ctx, player, true, time);

  // Particles.
  for (const pt of world.particles.list) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.kind === 'smoke' ? `rgba(120,120,120,${alpha * 0.6})`
      : pt.kind === 'spark' ? `rgba(255,200,60,${alpha})`
      : `rgba(255,${Math.floor(120 * alpha)},40,${alpha})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (pt.kind === 'smoke' ? (1.6 - alpha * 0.6) : 1), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // ---- HUD (screen space) ----
  // Top-left: cash + mission.
  ctx.fillStyle = 'rgba(10,16,24,0.72)';
  roundRect(ctx, 12, 12, 330, 86, 10);
  ctx.fill();
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${totalCash(world).toLocaleString('en-US')}`, 26, 40);
  const mission = world.missions.available();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  if (mission) {
    ctx.fillText(`MISSION ${world.missions.index + 1}/3 — ${mission.title}`, 26, 62);
    const step = world.missions.currentStep();
    ctx.fillStyle = '#ffd700';
    ctx.font = '13px sans-serif';
    ctx.fillText(world.missions.active && step ? `▸ ${step.text}` : 'Press ENTER to start the mission', 26, 82);
  } else {
    ctx.fillText('ALL MISSIONS COMPLETE — free roam', 26, 62);
    ctx.fillStyle = '#ffd700';
    ctx.font = '13px sans-serif';
    ctx.fillText('Solara Bay is yours, Nia.', 26, 82);
  }

  // Top-right: wanted stars + heat label.
  ctx.fillStyle = 'rgba(10,16,24,0.72)';
  roundRect(ctx, w - 190, 12, 178, 58, 10);
  ctx.fill();
  drawStars(ctx, world.wanted.stars, w - 176, 44);
  ctx.fillStyle = world.wanted.stars > 0 ? '#ff6b5e' : 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(world.wanted.stars > 0 ? 'WANTED — police responding' : 'Clean — no heat', w - 176, 62);

  // Messages feed.
  ctx.font = '13px sans-serif';
  world.messages.forEach((m, i) => {
    ctx.fillStyle = `rgba(10,16,24,${Math.min(0.75, m.t)})`;
    const tw = ctx.measureText(m.text).width + 20;
    roundRect(ctx, 12, 108 + i * 28, tw, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(m.text, 22, 124 + i * 28);
  });

  // Bottom-left: health + ammo.
  ctx.fillStyle = 'rgba(10,16,24,0.72)';
  roundRect(ctx, 12, h - 64, 220, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('NIA REYES', 24, h - 42);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, h - 34, 150, 10);
  ctx.fillStyle = player.health > 30 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(24, h - 34, 150 * (player.health / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.fillText(`Ammo ${player.ammo}  •  Cars stolen ${world.stats.carsStolen}`, 24, h - 18);

  // Speedometer when driving.
  if (player.inCar) {
    const kmh = Math.round(Math.abs(player.speed) * 0.36);
    ctx.fillStyle = 'rgba(10,16,24,0.72)';
    roundRect(ctx, w / 2 - 70, h - 64, 140, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${kmh}`, w / 2, h - 32);
    ctx.font = '11px sans-serif';
    ctx.fillText('km/h', w / 2, h - 18);
    ctx.textAlign = 'left';
  }

  // Controls hint.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '11px sans-serif';
  ctx.fillText('WASD move/drive • E enter/steal car • F punch • Click shoot • TAB map • M mute • P pause • Enter mission', 12, h - 76);

  drawMinimap(ctx, world, w, h);

  // Mission banner.
  if (world.banner) {
    ctx.fillStyle = 'rgba(10,16,24,0.8)';
    roundRect(ctx, w / 2 - 260, h / 2 - 120, 520, 84, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.banner.title, w / 2, h / 2 - 82);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText(world.banner.sub, w / 2, h / 2 - 54);
    ctx.textAlign = 'left';
  }

  // Off-screen objective arrow.
  if (target && world.missions.active) {
    const sx = w / 2 + (target.x - world.camera.x);
    const sy = h / 2 + (target.y - world.camera.y);
    if (sx < 40 || sx > w - 40 || sy < 40 || sy > h - 40) {
      const cx = Math.max(60, Math.min(w - 60, sx));
      const cy = Math.max(60, Math.min(h - 60, sy));
      const ang = Math.atan2(sy - h / 2, sx - w / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

export function renderTitle(ctx, world, w, h) {
  // The world behind the title, dimmed, then the menu card.
  renderWorld(ctx, world, w, h);
  ctx.fillStyle = 'rgba(8,12,20,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10,16,24,0.88)';
  roundRect(ctx, w / 2 - 330, h / 2 - 215, 660, 430, 16);
  ctx.fill();
  ctx.strokeStyle = '#f7c873';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7c873';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLARA BAY', w / 2, h / 2 - 140);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('An open-world crime story', w / 2, h / 2 - 105);
  ctx.fillStyle = '#ffd700';
  ctx.font = '15px sans-serif';
  ctx.fillText('Nia Reyes • getaway driver • Marlo Venn wants the waterfront', w / 2, h / 2 - 72);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '14px sans-serif';
  const lines = [
    'Steal cars, outrun the Solara Bay PD, and run three story missions:',
    '1. Borrowed Wheels — steal a car, move a witness, dodge the law.',
    '2. Night Shift — steal the forged deeds from Harbor Depot.',
    '3. High Tide — stop Venn\'s convoy on Bay Boulevard.',
    '',
    'WASD move / drive  •  E enter or steal a car  •  F punch',
    'Mouse aim + Click shoot  •  P pause  •  M mute  •  progress auto-saves',
  ];
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 - 38 + i * 22));
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) ctx.fillText('— PRESS ENTER TO START —', w / 2, h / 2 + 178);
  ctx.textAlign = 'left';
  // Full-city map panel on the title screen: the whole island at a glance.
  if (w >= 1100) {
    const mapSize = 260;
    const mx = w - mapSize - 16;
    const my = h / 2 - mapSize / 2;
    ctx.fillStyle = 'rgba(10,16,24,0.88)';
    roundRect(ctx, mx - 8, my - 28, mapSize + 16, mapSize + 52, 12);
    ctx.fill();
    ctx.strokeStyle = '#f7c873';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f7c873';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE WHOLE CITY', mx + mapSize / 2, my - 10);
    drawCityMap(ctx, world, mx, my, mapSize, true);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.fillText('TAB in-game for the full map', mx + mapSize / 2, my + mapSize + 16);
    ctx.textAlign = 'left';
  }
}

export function renderOverlay(ctx, world, w, h, title, sub) {
  ctx.fillStyle = 'rgba(8,12,20,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = title === 'BUSTED' ? '#2d7dff' : '#e74c3c';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(sub, w / 2, h / 2 + 20);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press ENTER to get back out there', w / 2, h / 2 + 60);
  ctx.textAlign = 'left';
}
