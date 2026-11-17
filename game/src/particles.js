// Particles: skid smoke, muzzle flashes, sparks, explosions, cash sparkles.
// Plain data + update/draw; render.js draws them, world.js spawns them.
export function createParticles() {
  const list = [];
  return {
    list,
    spawn(x, y, kind, count = 1) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = kind === 'explosion' ? 120 + Math.random() * 160 : 20 + Math.random() * 60;
        list.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: kind === 'smoke' ? 0.9 : kind === 'spark' ? 0.35 : 0.6,
          maxLife: kind === 'smoke' ? 0.9 : kind === 'spark' ? 0.35 : 0.6,
          size: kind === 'explosion' ? 10 + Math.random() * 14 : 3 + Math.random() * 4,
          kind,
        });
      }
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const p = list[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.life <= 0) list.splice(i, 1);
      }
      if (list.length > 400) list.splice(0, list.length - 400);
    },
  };
}
