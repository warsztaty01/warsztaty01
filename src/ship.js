import {wrapPosition, rotatePoint, add, mul} from './utils.js';

export default class Ship{
  constructor(x,y){
    this.pos = {x,y};
    this.vel = {x:0,y:0};
    this.angle = -Math.PI/2; // up
    this.radius = 12;
    this.thrusting = false;
    this.lives = 3;
  }

  rotate(dir, dt){ this.angle += dir * 3 * dt; }
  applyThrust(power, dt){
    this.vel.x += Math.cos(this.angle) * power * dt;
    this.vel.y += Math.sin(this.angle) * power * dt;
    this.thrusting = true;
  }

  update(dt, bounds){
    // damping / small space drag
    this.vel.x *= 0.999**(dt*60);
    this.vel.y *= 0.999**(dt*60);
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos = wrapPosition(this.pos, bounds.width, bounds.height);
    this.thrusting = false;
  }

  draw(ctx){
    ctx.save();
    ctx.translate(this.pos.x,this.pos.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#e6f0ff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15,0);
    ctx.lineTo(-10,-8);
    ctx.lineTo(-6,0);
    ctx.lineTo(-10,8);
    ctx.closePath();
    ctx.stroke();
    if(this.thrusting){
      ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-18,0); ctx.lineTo(-7,3); ctx.strokeStyle='#ffb86b'; ctx.stroke();
    }
    ctx.restore();
  }

  // return polygon points in world coords (triangle)
  getPolygon(){
    const pts = [{x:15,y:0},{x:-10,y:-8},{x:-10,y:8}];
    return pts.map(p => ({x: this.pos.x + p.x * Math.cos(this.angle) - p.y * Math.sin(this.angle),
                         y: this.pos.y + p.x * Math.sin(this.angle) + p.y * Math.cos(this.angle)}));
  }
}
