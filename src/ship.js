class Ship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 48;
    this.height = 36;
    this.angle = 0; // radians
    this.thrusting = false;
    this.mass = 1; // reserved for future use

    // Fuel / thrust
    this.maxFuel = 100; // units
    this.fuel = this.maxFuel;
    this.thrustPower = 420; // px/s^2 upward acceleration when thrusting
    this.fuelConsumption = 22; // units per second while thrusting

    // state flags
    this.landed = false;
    this.crashed = false;
  }

  // Update physics: gravity, velocity, position using constant-acceleration integration
  // dt in seconds. Optionally pass a floorY to detect and report collisions during the step.
  // Returns { hit: boolean, tHit?: number, vyAtHit?: number }
  update(dt, floorY = null) {
    // px/s^2 (tweakable)
    const GRAVITY = 180;

    // determine thrust acceleration for this step (positive upward reduction)
    const thrustActive = this.thrusting && this.fuel > 0 && !this.landed && !this.crashed;
    const thrustAccel = thrustActive ? this.thrustPower : 0;

    // total acceleration (positive increases downward velocity)
    const a = GRAVITY - thrustAccel;

    // previous state
    const y0 = this.y;
    const vy0 = this.vy;

    // compute new velocity and position under constant acceleration
    const vy1 = vy0 + a * dt;
    const y1 = y0 + vy0 * dt + 0.5 * a * dt * dt;

    // consume fuel for the actual thrust duration (we'll adjust if collision occurs)
    let fuelUsed = 0;

    // if floorY provided, check whether trajectory crosses the floor within dt
    if (floorY !== null && y1 > floorY) {
      // solve 0.5*a*t^2 + vy0*t + (y0 - floorY) = 0 for t in (0,dt]
      const A = 0.5 * a;
      const B = vy0;
      const C = y0 - floorY;
      let tHit = null;
      if (Math.abs(A) < 1e-6) {
        // linear case: vy0 * t + C = 0 -> t = -C/vy0
        if (Math.abs(B) > 1e-6) {
          const t = -C / B;
          if (t >= 0 && t <= dt) tHit = t;
        }
      } else {
        const disc = B*B - 4*A*C;
        if (disc >= 0) {
          const sqrtD = Math.sqrt(disc);
          const tA = (-B - sqrtD) / (2*A);
          const tB = (-B + sqrtD) / (2*A);
          // choose the smallest positive root within (0,dt]
          const candidates = [tA, tB].filter(t => t >= 0 && t <= dt);
          if (candidates.length) tHit = Math.min(...candidates);
        }
      }

      if (tHit !== null) {
        // compute state at impact time
        const vyAtHit = vy0 + a * tHit;
        // consume fuel only for tHit duration
        if (thrustActive) {
          fuelUsed = this.fuelConsumption * tHit;
          this.fuel = Math.max(0, this.fuel - fuelUsed);
        }
        // set to impact state
        this.vy = vyAtHit;
        this.y = floorY;
        // advance horizontal position linearly
        this.x += this.vx * dt;
        return { hit: true, tHit, vyAtHit };
      }
    }

    // no collision within this step: commit full step
    this.vy = vy1;
    this.y = y1;
    this.x += this.vx * dt;

    if (thrustActive) {
      fuelUsed = this.fuelConsumption * dt;
      this.fuel = Math.max(0, this.fuel - fuelUsed);
    }

    return { hit: false };
  }

  // Simple drawing: triangle representing the lander
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // body shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(4, 8, this.width*0.6, this.height*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // body
    ctx.fillStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.moveTo(0, -this.height/2);
    ctx.lineTo(-this.width/2, this.height/2);
    ctx.lineTo(this.width/2, this.height/2);
    ctx.closePath();
    ctx.fill();

    // windows
    ctx.fillStyle = '#1b6eff';
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI*2);
    ctx.fill();

    // flame when thrusting
    if (this.thrusting && this.fuel > 0 && !this.landed && !this.crashed) {
      ctx.fillStyle = 'rgba(255,140,0,0.9)';
      ctx.beginPath();
      ctx.moveTo(-8, this.height/2);
      ctx.lineTo(0, this.height/2 + 18 + Math.random()*6);
      ctx.lineTo(8, this.height/2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // reset to a starting position
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.angle = 0;
    this.fuel = this.maxFuel; this.landed = false; this.crashed = false; this.thrusting = false;
  }
}

// Expose class to global scope for simple script include
window.Ship = Ship;
