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

  // Update physics: gravity, velocity, position
  // dt in seconds
  update(dt) {
    // px/s^2 (tweakable) — zmniejszone, żeby spadek trwał dłużej
    const GRAVITY = 180;
    // gravity accelerates downward (positive y)
    this.vy += GRAVITY * dt;

    // apply thrust if requested and we have fuel (thrusting reduces vy)
    if (this.thrusting && this.fuel > 0 && !this.landed && !this.crashed) {
      const accel = this.thrustPower; // upward
      this.vy -= accel * dt;
      // consume fuel
      this.fuel -= this.fuelConsumption * dt;
      if (this.fuel < 0) this.fuel = 0;
    }

    // Integrate velocity to position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
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
