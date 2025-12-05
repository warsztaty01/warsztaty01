// Minimal UFO implementation: appears, moves, occasionally shoots
export default class UFO{
  constructor(x,y){
    this.pos = {x,y};
    this.vel = {x: (Math.random()-0.5)*60, y:(Math.random()-0.5)*60};
    this.size = 14;
    this.cooldown = 2 + Math.random()*3;
    this.angle = 0;
    this.alive = true;
  }
  update(dt, bounds, player){
    // simple steering towards player
    const dx = player.pos.x - this.pos.x, dy = player.pos.y - this.pos.y;
    const dist = Math.hypot(dx,dy)||1;
    this.vel.x += (dx/dist)*20*dt; this.vel.y += (dy/dist)*20*dt;
    this.pos.x += this.vel.x*dt; this.pos.y += this.vel.y*dt;
    if(this.pos.x < 0) this.pos.x += bounds.width; if(this.pos.x > bounds.width) this.pos.x -= bounds.width;
    if(this.pos.y < 0) this.pos.y += bounds.height; if(this.pos.y > bounds.height) this.pos.y -= bounds.height;
    this.cooldown -= dt;
  }
  shouldShoot(){ if(this.cooldown <= 0){ this.cooldown = 1.2 + Math.random()*2; return true } return false }
  draw(ctx){ ctx.strokeStyle='#ff8fb3'; ctx.beginPath(); ctx.rect(this.pos.x-12,this.pos.y-6,24,12); ctx.stroke(); }
  getPolygon(){ return [{x:this.pos.x-12,y:this.pos.y-6},{x:this.pos.x+12,y:this.pos.y-6},{x:this.pos.x+12,y:this.pos.y+6},{x:this.pos.x-12,y:this.pos.y+6}] }
}
