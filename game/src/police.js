// Wanted level: stars 0-5. Crimes raise heat; hiding out of police sight lets it
// cool down. Pure logic so the test suite can drive it without a canvas.
export const CRIME_HEAT = {
  'steal-car': 1,
  'assault': 1,
  'joyride': 0, // speeding alone is not a crime unless police see it
  'shoot-cop': 4,
  'shoot-ped': 2,
  'ram-cop': 2,
  'mission-crime': 1,
};
const COOL_SECONDS_PER_STAR = 45;

export function createWanted() {
  let stars = 0;
  let heat = 0; // fractional heat inside the current star level
  let coolTimer = 0;
  return {
    get stars() { return stars; },
    get heat() { return heat; },
    commitCrime(kind) {
      const add = CRIME_HEAT[kind] ?? 1;
      heat += add;
      while (heat >= 1 && stars < 5) { stars += 1; heat -= 1; }
      if (stars >= 5) heat = 0;
      coolTimer = 0;
    },
    tick(dt, sight) {
      // sight: { hidden, inCar } — hidden means no cop can see the player.
      if (stars === 0) return;
      if (sight.hidden) {
        coolTimer += dt;
        const perStar = COOL_SECONDS_PER_STAR * (sight.inCar ? 0.7 : 1);
        while (coolTimer >= perStar && stars > 0) {
          coolTimer -= perStar;
          stars -= 1;
          heat = 0;
        }
      } else {
        coolTimer = 0;
      }
    },
    reset() { stars = 0; heat = 0; coolTimer = 0; },
    serialize() { return { stars }; },
    restore(data) {
      stars = data ? Math.min(5, Math.max(0, data.stars | 0)) : 0;
      heat = 0;
      coolTimer = 0;
    },
  };
}
