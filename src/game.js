import Ship from './ship.js';
import Asteroid from './asteroid.js';
import Bullet from './bullet.js';
import UFO from './ufo.js';
import {polygonsCollide} from './collision.js';

const KEYS = {};

export default class Game{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', ()=>this.resize());

    this.ship = new Ship(this.canvas.width/2, this.canvas.height/2);
    this.asteroids = [];
    this.bullets = [];
    this.ufos = [];

    this.last = 0; this.running = false; this.score = 0;
    this.gameOver = false;
    this.asteroidSpawnCooldown = 0;
    this.asteroidSpawnRate = 4.0; // seconds between spawns
    this.difficultyTimer = 0;
    this.difficultyMultiplier = 1;
    this.elapsedTime = 0;
    this.spawnInitial();
    this.setupInput();
  }

  spawnInitial(){
    this.asteroids = [];
    for(let i=0;i<4;i++){
      const x = Math.random()*this.canvas.width; const y = Math.random()*this.canvas.height;
      this.asteroids.push(new Asteroid(x,y,3));
    }
  }

  resize(){
    this.canvas.width = 800; this.canvas.height = 600;
    this.bounds = {width: this.canvas.width, height: this.canvas.height};
  }

  setupInput(){
    window.addEventListener('keydown', e=>{ KEYS[e.code]=true; if(e.code==='KeyR') this.restart(); });
    window.addEventListener('keyup', e=>{ KEYS[e.code]=false; });
  }

  start(){ this.running = true; requestAnimationFrame(t=>this.loop(t)); }

  restart(){ this.ship = new Ship(this.canvas.width/2,this.canvas.height/2); this.spawnInitial(); this.bullets=[]; this.score=0; this.gameOver = false; this.running = true; this.last = 0; this.asteroidSpawnCooldown = 0; this.asteroidSpawnRate = 4.0; this.difficultyTimer = 0; this.difficultyMultiplier = 1; this.elapsedTime = 0; }

  loop(ts){
    if(!this.last) this.last = ts; const dt = Math.min(0.05, (ts - this.last)/1000); this.last = ts;
    this.update(dt); this.draw();
    if(this.running) requestAnimationFrame(t=>this.loop(t));
  }

  update(dt){
    if(this.gameOver) return;

    this.elapsedTime += dt;
    this.difficultyTimer += dt;
    this.asteroidSpawnCooldown -= dt;
    
    // increase difficulty every 60 seconds
    if(this.difficultyTimer >= 60){
      this.difficultyMultiplier += 0.5;
      this.asteroidSpawnRate = Math.max(1.5, 4.0 - this.difficultyMultiplier * 0.3);
      this.difficultyTimer = 0;
    }

    // input
    if(KEYS['ArrowLeft']) this.ship.rotate(-1, dt);
    if(KEYS['ArrowRight']) this.ship.rotate(1, dt);
    if(KEYS['ArrowUp']) this.ship.applyThrust(220, dt);
    if(KEYS['ArrowDown']) this.ship.applyThrust(-160, dt); // braking / reverse thrust
    if(KEYS['Space'] && !this._spaceDown){ this.fireBullet(); this._spaceDown = true; }
    if(!KEYS['Space']) this._spaceDown = false;

    this.ship.update(dt, this.bounds);

    for(const a of this.asteroids) a.update(dt, this.bounds);
    for(const b of this.bullets) b.update(dt, this.bounds);
    for(const u of this.ufos) u.update(dt, this.bounds, this.ship);

    // bullets expiration
    this.bullets = this.bullets.filter(b=>b.life>0);

    // bullet-asteroid and bullet-UFO collisions
    for(let i=this.bullets.length-1;i>=0;i--){
      const b = this.bullets[i];
      let removed = false;
      for(let j=this.asteroids.length-1;j>=0;j--){
        const a = this.asteroids[j];
        // quick circle test
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        if(Math.hypot(dx,dy) < a.radius + b.radius){
          // hit asteroid
          this.bullets.splice(i,1);
          const newPieces = a.breakApart();
          this.asteroids.splice(j,1);
          this.asteroids.push(...newPieces);
          this.score += 50;
          removed = true;
          break;
        }
      }
      if(removed) continue;
      for(let j=this.ufos.length-1;j>=0;j--){
        const u = this.ufos[j];
        const dx = b.pos.x - u.pos.x, dy = b.pos.y - u.pos.y;
        if(Math.hypot(dx,dy) < (u.size + b.radius)){
          // hit UFO
          this.bullets.splice(i,1);
          this.ufos.splice(j,1);
          this.score += 200;
          removed = true;
          break;
        }
      }
    }

    // ship-asteroid collision via SAT (only first contact while not invulnerable)
    for(const a of this.asteroids){
      if(this.ship.invulnerable <= 0 && polygonsCollide(this.ship.getPolygon(), a.getPolygon())){
        this.ship.lives -= 1; this.score = Math.max(0,this.score-200);
        this.ship.pos = {x:this.canvas.width/2,y:this.canvas.height/2}; this.ship.vel={x:0,y:0};
        this.ship.onHit();
        if(this.ship.lives <= 0){
          this.endGame();
        }
        break;
      }
    }

    // spawn UFO occasionally
    if(Math.random() < 0.0009) this.ufos.push(new UFO(Math.random()*this.canvas.width, Math.random()*this.canvas.height));

    // UFO shooting -> spawn bullets
    for(const u of this.ufos){ if(u.shouldShoot()){ const dx = this.ship.pos.x - u.pos.x, dy = this.ship.pos.y - u.pos.y; const d = Math.hypot(dx,dy)||1; this.bullets.push(new Bullet(u.pos.x,u.pos.y,{x:dx/d*260,y:dy/d*260})); } }

    // continuous asteroid spawning with cooldown
    if(this.asteroidSpawnCooldown <= 0 && this.asteroids.length < 3 + Math.floor(this.difficultyMultiplier * 2)){
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      this.asteroids.push(new Asteroid(x,y,3));
      this.asteroidSpawnCooldown = this.asteroidSpawnRate;
    }
  }

  fireBullet(){
    const bspd = 600;
    const x = this.ship.pos.x + Math.cos(this.ship.angle)*18;
    const y = this.ship.pos.y + Math.sin(this.ship.angle)*18;
    const vel = {x: Math.cos(this.ship.angle)*bspd + this.ship.vel.x, y: Math.sin(this.ship.angle)*bspd + this.ship.vel.y};
    this.bullets.push(new Bullet(x,y,vel));
  }

  endGame(){
    this.running = false;
    this.gameOver = true;
  }

  draw(){
    const ctx = this.ctx; ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    // draw objects
    for(const a of this.asteroids) a.draw(ctx);
    for(const b of this.bullets) b.draw(ctx);
    for(const u of this.ufos) u.draw(ctx);
    this.ship.draw(ctx);
    // HUD
    document.getElementById('score').textContent = `Wynik: ${this.score}`;
    document.getElementById('lives').textContent = `Życia: ${this.ship.lives}`;

    if(this.gameOver){
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('KONIEC GRY', this.canvas.width/2, this.canvas.height/2 - 50);
      ctx.fillStyle = '#ffff00'; ctx.font = '32px sans-serif';
      ctx.fillText(`Punkty: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 30);
      ctx.fillStyle = '#aaa'; ctx.font = '14px sans-serif';
      ctx.fillText('Naciśnij R aby zrestartować', this.canvas.width/2, this.canvas.height/2 + 70);
      ctx.restore();
    }
  }
}
