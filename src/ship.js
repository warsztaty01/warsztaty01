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
  }

  // Update physics: gravity, velocity, position
  // dt in seconds
  update(dt) {
    const GRAVITY = 400; // px/s^2 (tweakable)
    // gravity accelerates downward (positive y)
    this.vy += GRAVITY * dt;

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

    ctx.restore();
  }

  // reset to a starting position
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.angle = 0;
  }
}

// Expose class to global scope for simple script include
window.Ship = Ship;
