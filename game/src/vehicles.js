// Cars: arcade physics (throttle / brake / reverse / steering that scales with
// speed) plus circle-vs-building collision. Used by the player, traffic, police
// and the convoy alike.
import { CAR } from './config.js';
import { pointInBuilding } from './city.js';

export function createCar(x, y, angle, color, kind = 'traffic') {
  return {
    x, y, angle, color, kind,
    speed: 0,
    hp: kind === 'convoy' ? 120 : 100,
    driver: kind === 'parked' ? null : kind,
    crashed: 0,
    honk: 0,
  };
}

function collides(city, x, y) {
  return pointInBuilding(city, x, y);
}

// Move a car one step. Returns 'crash' when it hit a building this step.
export function stepCar(city, car, dt, throttle, steer) {
  const wasSpeed = car.speed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed += CAR.reverseAccel * dt; // throttle<0 while stopped reverses
  } else {
    car.speed -= Math.sign(car.speed) * 220 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 140);
  car.angle += steer * CAR.turnRate * steerAuthority * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const r = 24;
  const hit = collides(city, nx + Math.cos(car.angle) * r, ny + Math.sin(car.angle) * r)
    || collides(city, nx - Math.cos(car.angle) * r, ny - Math.sin(car.angle) * r)
    || collides(city, nx, ny);
  if (hit) {
    if (Math.abs(wasSpeed) > 200) {
      car.hp -= Math.abs(wasSpeed) * 0.08;
      car.crashed = 0.4;
      car.speed *= -0.25;
      return 'crash';
    }
    car.speed *= -0.2;
    return 'bump';
  }
  car.x = Math.max(r, Math.min(city.width - r, nx));
  car.y = Math.max(r, Math.min(city.height - r, ny));
  if (car.crashed > 0) car.crashed -= dt;
  return 'ok';
}

export function carDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
