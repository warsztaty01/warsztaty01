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

    // lateral (side) control
    this.leftThrust = false;
    this.rightThrust = false;
    this.lateralPower = 220; // px/s^2 horizontal thrust
    this.lateralFuelConsumption = 12; // units/sec for lateral thrusters

    // state flags
    this.landed = false;
    this.crashed = false;
  }

  // Update physics: gravity, velocity, position using constant-acceleration integration
  // dt in seconds. Optionally pass a floorY to detect and report collisions during the step.
  // Returns { hit: boolean, tHit?: number, vyAtHit?: number }
  update(dt, floorY = null, windX = 0) {
    // px/s^2 (tweakable)
    const GRAVITY = 180;

    // determine thrust acceleration for this step (positive upward reduces downward acceleration)
    const thrustActive = this.thrusting && this.fuel > 0 && !this.landed && !this.crashed;
    const thrustAccel = thrustActive ? this.thrustPower : 0;

    // lateral thrust flags
    const leftActive = this.leftThrust && this.fuel > 0 && !this.landed && !this.crashed;
    const rightActive = this.rightThrust && this.fuel > 0 && !this.landed && !this.crashed;

    // total vertical acceleration (positive increases downward velocity)
    const a = GRAVITY - thrustAccel;

    // apply wind horizontal acceleration (windX is acceleration in px/s^2)
    if (typeof windX === 'number') {
      this.vx += windX * dt;
    }

    // apply lateral thrust to horizontal velocity
    if (leftActive) this.vx -= this.lateralPower * dt;
    if (rightActive) this.vx += this.lateralPower * dt;

    // previous state
    const y0 = this.y;
    const vy0 = this.vy;

    // compute new velocity and position under constant acceleration
    const vy1 = vy0 + a * dt;
    const y1 = y0 + vy0 * dt + 0.5 * a * dt * dt;

    // consume fuel for the actual thrust duration (will be adjusted if collision occurs)
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
          const candidates = [tA, tB].filter(t => t >= 0 && t <= dt);
          if (candidates.length) tHit = Math.min(...candidates);
        }
      }

      if (tHit !== null) {
        // compute state at impact time
        const vyAtHit = vy0 + a * tHit;
        // consume fuel only for tHit duration (vertical + lateral proportionally)
        if (thrustActive) {
          fuelUsed += this.fuelConsumption * tHit;
        }
        if (leftActive || rightActive) {
          fuelUsed += this.lateralFuelConsumption * tHit;
        }
        this.fuel = Math.max(0, this.fuel - fuelUsed);
        // compute impact position at time tHit
        const impactX = this.x + this.vx * tHit;
        const impactY = y0 + vy0 * tHit + 0.5 * a * tHit * tHit;
        // set to impact state (position and velocity at impact)
        this.vy = vyAtHit;
        this.x = impactX;
        this.y = impactY;
        return { hit: true, tHit, vyAtHit, impactX, impactY };
      }
    }

    // no collision within this step: commit full step
    this.vy = vy1;
    this.y = y1;
    this.x += this.vx * dt;

    if (thrustActive) fuelUsed += this.fuelConsumption * dt;
    if (leftActive || rightActive) fuelUsed += this.lateralFuelConsumption * dt;
    if (fuelUsed) this.fuel = Math.max(0, this.fuel - fuelUsed);

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
    ctx.ellipse(6, 12, this.width*0.7, this.height*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // main body (capsule-like)
    ctx.fillStyle = '#efe6da';
    ctx.beginPath();
    ctx.moveTo(0, -this.height/2 - 6);
    ctx.quadraticCurveTo(-this.width/2, -this.height/4, -this.width/2, this.height/2);
    ctx.lineTo(this.width/2, this.height/2);
    ctx.quadraticCurveTo(this.width/2, -this.height/4, 0, -this.height/2 - 6);
    ctx.closePath();
    ctx.fill();

    // orange stripe
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(-this.width/2+4, -6, this.width-8, 10);

    // legs (3) - dark gray
    ctx.fillStyle = '#2e2f33';
    const legLen = 28;
    const legX = [ -this.width/2+6, 0, this.width/2-6 ];
    for (let i=0;i<3;i++){
      ctx.beginPath();
      ctx.moveTo(legX[i], this.height/2 - 2);
      ctx.lineTo(legX[i] + (i-1)*6, this.height/2 + legLen);
      ctx.lineTo(legX[i] + (i-1)*6 + 12, this.height/2 + legLen);
      ctx.lineTo(legX[i] + 12, this.height/2 - 2);
      ctx.closePath();
      ctx.fill();
    }

    // window
    ctx.fillStyle = '#0b2b5a';
    ctx.beginPath(); ctx.ellipse(0, -6, 12, 10, 0, 0, Math.PI*2); ctx.fill();

    // flame when thrusting
    if (this.thrusting && this.fuel > 0 && !this.landed && !this.crashed) {
      ctx.fillStyle = 'rgba(255,140,0,0.95)';
      ctx.beginPath();
      ctx.moveTo(-10, this.height/2 + 2);
      ctx.lineTo(0, this.height/2 + 24 + Math.random()*8);
      ctx.lineTo(10, this.height/2 + 2);
      ctx.closePath();
      ctx.fill();
    }

    // small left/right thruster visualization
    if ((this.leftThrust || this.rightThrust) && this.fuel > 0 && !this.landed && !this.crashed) {
      ctx.fillStyle = 'rgba(150,200,255,0.9)';
      if (this.leftThrust) ctx.fillRect(-this.width/2-6, -4, 6, 8);
      if (this.rightThrust) ctx.fillRect(this.width/2, -4, 6, 8);
    }

    ctx.restore();
  }

  // reset to a starting position
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.angle = 0;
    this.fuel = this.maxFuel; this.landed = false; this.crashed = false; this.thrusting = false;
    this.leftThrust = false; this.rightThrust = false;
  }
}

// Expose class to global scope for simple script include
window.Ship = Ship;
