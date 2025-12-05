export default class Bullet{
  constructor(x,y,vel){
    this.pos = {x,y};
    this.vel = {...vel};
    this.life = 1.6; // seconds
    this.radius = 2;
  }
  update(dt, bounds){
    this.life -= dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    // wrap
    if(this.pos.x < 0) this.pos.x += bounds.width; if(this.pos.x > bounds.width) this.pos.x -= bounds.width;
    if(this.pos.y < 0) this.pos.y += bounds.height; if(this.pos.y > bounds.height) this.pos.y -= bounds.height;
  }
  draw(ctx){
    ctx.fillStyle = '#ffd'; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill();
  }
}
