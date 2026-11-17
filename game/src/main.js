// Entry point: canvas setup, game loop, screen transitions, shot mode.
// ?shot=start|foot|drive|chase stages a deterministic scene and renders it.
import { createWorld, updateWorld, resetWorld, wastePlayer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED } from './world.js';
import { renderWorld, renderTitle, renderOverlay, renderMapOverlay } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { saveGame } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed') || 20261117);

const world = createWorld(seedParam, { ignoreSave: !!shotName });
world.audio = createAudio();
// Exposed for debugging / play-testing from the console.
window.__solaraBay = world;
const input = createInput();
input.attach();

let viewW = 1280;
let viewH = 800;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  world.viewW = viewW;
  world.viewH = viewH;
}
window.addEventListener('resize', resize);
resize();

let shotStaged = false;
let last = performance.now();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startMissionOrResume() {
  if (world.screen === SCREEN_TITLE) {
    world.screen = SCREEN_PLAY;
    world.audio.unlock();
    if (!world.missions.active && world.missions.available()) {
      world.missions.start();
      const def = world.missions.available();
      if (def) {
        world.messages.unshift({ text: def.briefing, t: 7 });
      }
    }
    setStatus('Playing Solara Bay');
  } else if (world.screen === SCREEN_BUSTED || world.screen === SCREEN_WASTED) {
    world.screen = SCREEN_PLAY;
    setStatus('Back on the streets of Solara Bay');
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;

  if (shotName && !shotStaged) {
    shotStaged = true;
    stageShot(shotName, world, updateWorld);
    world.viewW = viewW;
    world.viewH = viewH;
  } else if (!shotName) {
    if (input.wasPressed('enter')) {
      if (world.screen === SCREEN_TITLE || world.screen === SCREEN_BUSTED || world.screen === SCREEN_WASTED) {
        startMissionOrResume();
      }
    }
    if (input.wasPressed('p') && world.screen === SCREEN_PLAY) {
      world.screen = SCREEN_PAUSED;
      setStatus('Paused');
    } else if (input.wasPressed('p') && world.screen === SCREEN_PAUSED) {
      world.screen = SCREEN_PLAY;
      setStatus('Playing Solara Bay');
    }
    if (input.wasPressed('m')) {
      const muted = world.audio.toggleMute();
      world.messages.unshift({ text: muted ? 'Sound muted' : 'Sound on', t: 2 });
    }
    if (input.wasPressed('tab') && (world.screen === SCREEN_PLAY || world.screen === SCREEN_TITLE)) {
      world.showMap = !world.showMap;
    }
    if (world.screen === SCREEN_PLAY) {
      updateWorld(world, input, dt);
      if (world.player.health <= 0 && world.screen === SCREEN_PLAY) wastePlayer(world);
    } else if (world.screen === SCREEN_TITLE) {
      world.time += dt;
    }
  }

  if (world.screen === SCREEN_TITLE) renderTitle(ctx, world, viewW, viewH);
  else if (world.screen === SCREEN_BUSTED) {
    renderWorld(ctx, world, viewW, viewH);
    renderOverlay(ctx, world, viewW, viewH, 'BUSTED', 'The Solara Bay PD caught up with Nia. Bail posted — $100 lost.');
  } else if (world.screen === SCREEN_WASTED) {
    renderWorld(ctx, world, viewW, viewH);
    renderOverlay(ctx, world, viewW, viewH, 'WASTED', 'Nia is down. The crew drags her to Bayview Clinic.');
  } else if (world.screen === SCREEN_PAUSED) {
    renderWorld(ctx, world, viewW, viewH);
    renderOverlay(ctx, world, viewW, viewH, 'PAUSED', 'Press P to keep driving.');
  } else {
    renderWorld(ctx, world, viewW, viewH);
  }
  if (world.showMap && (world.screen === SCREEN_PLAY || world.screen === SCREEN_TITLE)) {
    renderMapOverlay(ctx, world, viewW, viewH);
  }

  input.endFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('beforeunload', () => saveGame(world));
requestAnimationFrame(frame);
