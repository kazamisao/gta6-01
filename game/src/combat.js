// Combat: punch (close range, cone in front) and pistol (raycast to the nearest
// living target in the aim direction). Returns what was hit so world.js can
// raise wanted stars and spawn effects.
export function punchHit(attacker, targets, range, arc) {
  let best = null;
  let bestD = range;
  for (const t of targets) {
    if (t.hp <= 0) continue;
    const d = Math.hypot(t.x - attacker.x, t.y - attacker.y);
    if (d > range) continue;
    const ang = Math.atan2(t.y - attacker.y, t.x - attacker.x);
    let diff = Math.abs(ang - attacker.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < arc && d < bestD) { best = t; bestD = d; }
  }
  if (best) best.hp -= 12;
  return best;
}

export function shootHit(shooter, aimAngle, targets, maxRange) {
  let best = null;
  let bestD = maxRange;
  for (const t of targets) {
    if (t.hp <= 0) continue;
    const dx = t.x - shooter.x;
    const dy = t.y - shooter.y;
    const along = dx * Math.cos(aimAngle) + dy * Math.sin(aimAngle);
    if (along < 0 || along > maxRange) continue;
    const perp = Math.abs(-dx * Math.sin(aimAngle) + dy * Math.cos(aimAngle));
    if (perp > 26) continue; // bullet passes wide
    if (along < bestD) { best = t; bestD = along; }
  }
  if (best) best.hp -= 34;
  return best ? { target: best, distance: bestD } : null;
}
