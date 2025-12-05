import {wrapPosition} from './utils.js';

function randomRange(a,b){return a + Math.random()*(b-a)}

export default class Asteroid{
  constructor(x,y,size=3){
    this.pos = {x,y};
    this.size = size; // 3=large,2=med,1=small
    this.radius = size * 18 + Math.random()*10;
    const speed = 20 + (4-size)*40 + Math.random()*40;
    const ang = Math.random()*Math.PI*2;
    this.vel = {x: Math.cos(ang)*speed, y: Math.sin(ang)*speed};
    this.rotation = Math.random()*0.5 - 0.25;
    this.angle = Math.random()*Math.PI*2;
    this.vertices = this._makePolygon();
  }

  _makePolygon(){
    const v = [];
    const spikes = 8 + Math.floor(Math.random()*4);
    for(let i=0;i<spikes;i++){
      const a = (i/spikes)*Math.PI*2;
      const r = this.radius * (0.7 + Math.random()*0.6);
      v.push({x: Math.cos(a)*r, y: Math.sin(a)*r});
    }
    return v;
  }

  update(dt, bounds){
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.angle += this.rotation * dt;
    this.pos = wrapPosition(this.pos, bounds.width, bounds.height);
  }

  draw(ctx){
    ctx.save(); ctx.translate(this.pos.x,this.pos.y); ctx.rotate(this.angle);
    ctx.strokeStyle='#9db2ff'; ctx.lineWidth=2; ctx.beginPath();
    this.vertices.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y)});
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  getPolygon(){
    return this.vertices.map(p=>({x: this.pos.x + p.x*Math.cos(this.angle) - p.y*Math.sin(this.angle),
                                 y: this.pos.y + p.x*Math.sin(this.angle) + p.y*Math.cos(this.angle)}));
  }

  breakApart(){
    if(this.size <= 1) return [];
    const pieces = [];
    const count = 2 + Math.floor(Math.random()*2);
    for(let i=0;i<count;i++){
      const child = new Asteroid(this.pos.x + Math.random()*6-3, this.pos.y + Math.random()*6-3, this.size-1);
      child.vel.x += (Math.random()-0.5)*40;
      child.vel.y += (Math.random()-0.5)*40;
      pieces.push(child);
    }
    return pieces;
  }
}
