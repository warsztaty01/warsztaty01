// ======================= CONFIG & STATE =======================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
 
const FEATURES = {
 shields: true,   // niezniszczalne bunkry
 ufo: false       // przelatujące UFO — włącz/wyłącz
};
 
let gameState = 'START'; // START | RUNNING | PAUSED | GAME_OVER
let waveNo = 1;
 
// prosta persystencja rekordu
const hiscoreEl = document.getElementById('hiscore');
const scoreEl   = document.getElementById('score');
const waveEl    = document.getElementById('wave');
const livesEl   = document.getElementById('lives');
const statusEl  = document.getElementById('status');
 
const HiScore = {
 get()  { return Number(localStorage.getItem('hi') || 0); },
 set(v) { localStorage.setItem('hi', String(v)); }
};
 
// ======================= INPUT =======================
const keys = new Set();
window.addEventListener('keydown', (e) => {
 if (['ArrowLeft','ArrowRight','KeyA','KeyD','Space','KeyP'].includes(e.code)) e.preventDefault();
 keys.add(e.code);
 
 if (e.code === 'Space') {
   if (gameState === 'START' || gameState === 'GAME_OVER') startGame();
 }
 if (e.code === 'KeyP' && gameState === 'RUNNING') gameState = 'PAUSED';
 else if (e.code === 'KeyP' && gameState === 'PAUSED') gameState = 'RUNNING';
});
window.addEventListener('keyup',  (e) => keys.delete(e.code));
 
// ======================= UTILS =======================
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
 return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
 
// ======================= PLAYER =======================
class Player {
 constructor() {
   this.width = 40; this.height = 18;
   this.x = canvas.width/2 - this.width/2;
   this.y = canvas.height - 70;
   this.speed = 280; // px/s
   this.cooldownMs = 250;
   this._timerMs = 0;
   this.lives = 3;
   this.invulnMs = 0;
 }
 update(dt) {
   if (gameState !== 'RUNNING') return;
   let dir = 0;
   if (keys.has('ArrowLeft') || keys.has('KeyA')) dir -= 1;
   if (keys.has('ArrowRight') || keys.has('KeyD')) dir += 1;
   this.x += dir * this.speed * dt;
   this.x = clamp(this.x, 10, canvas.width - this.width - 10);
 
   // strzał
   this._timerMs += dt*1000;
   if (keys.has('Space') && this._timerMs >= this.cooldownMs) {
     this._timerMs = 0;
     bulletPool.tryFire(this.x + this.width/2 - 2, this.y - 2);
     Audio.play('fire');
   }
 
   // nietykalność po trafieniu
   if (this.invulnMs > 0) this.invulnMs = Math.max(0, this.invulnMs - dt*1000);
 }
 render(ctx) {
   ctx.fillStyle = (this.invulnMs > 0) ? '#b4ff9f' : '#fff';
   ctx.fillRect(this.x, this.y, this.width, this.height);
 }
}
 
// ======================= BULLETS (PLAYER) =======================
class Bullet {
 constructor() {
   this.active = false;
   this.x = 0; this.y = 0;
   this.width = 3; this.height = 12;
   this.speed = 520;
 }
 fire(x, y) { this.x = x; this.y = y; this.active = true; }
 update(dt) { if (this.active) this.y -= this.speed * dt; }
 isOffscreen() { return (this.y + this.height) < 0; }
 render(ctx) { if (this.active) { ctx.fillStyle = '#ffec70'; ctx.fillRect(this.x, this.y, this.width, this.height); } }
}
class BulletPool {
 constructor(max) { this.pool = Array.from({length: max}, () => new Bullet()); }
 tryFire(x, y) {
   const slot = this.pool.find(b => !b.active);
   if (slot) slot.fire(x, y);
 }
 update(dt) {
   for (const b of this.pool) {
     if (!b.active) continue;
     b.update(dt);
     if (b.isOffscreen()) b.active = false; // czyszczenie pamięci
   }
 }
 render(ctx) { for (const b of this.pool) b.render(ctx); }
 activeBullets() { return this.pool.filter(b => b.active); }
}
 
// ======================= ENEMIES & GRID =======================
class Enemy {
 constructor(baseX, baseY, w=32, h=22) {
   this.baseX = baseX; this.baseY = baseY; this.width = w; this.height = h;
   this.alive = true; this.hp = 1; this.scoreValue = 10;
 }
 x(grid) { return this.baseX + grid.offsetX; }
 y(grid) { return this.baseY + grid.offsetY; }
 render(ctx, grid) {
   if (!this.alive) return;
   ctx.fillStyle = '#6bf';
   ctx.fillRect(this.x(grid), this.y(grid), this.width, this.height);
 }
}
class EnemyGrid {
 constructor() {
   this.rows = 5; this.cols = 10;
   this.spacingX = 12; this.spacingY = 12;
   this.offsetX = 0; this.offsetY = 50;
   this.direction = +1; // +1 -> prawo, -1 -> lewo
   this.sharedSpeed = 60; this.stepDownY = 18;
   this.fireCooldownMs = 600; this._fireTimerMs = 0;
   this.enemies = [];
   this.gridWidth = 0; this.gridLeftBase = 60;
 }
 spawn() {
   this.enemies = [];
   const w=32,h=22; const startX = this.gridLeftBase; const startY = 60;
   for (let r=0;r<this.rows;r++) for (let c=0;c<this.cols;c++) {
     const bx = startX + c*(w+this.spacingX);
     const by = startY + r*(h+this.spacingY);
     this.enemies.push(new Enemy(bx, by, w, h));
   }
   const lastColX = startX + (this.cols-1)*(w+this.spacingX);
   this.gridWidth = (lastColX - startX) + w;
 
   // reset
   this.offsetX = 0; this.offsetY = 50; this.direction = +1;
   this.sharedSpeed = 60; this._fireTimerMs = 0;
 }
 update(dt, enemyBulletPool, playerX) {
   if (gameState !== 'RUNNING') return;
 
   // 1) zsynchronizowany ruch
   this.offsetX += this.direction * this.sharedSpeed * dt;
   const leftEdge = this.gridLeftBase + this.offsetX;
   const rightEdge = leftEdge + this.gridWidth;
   const hitRight = rightEdge >= canvas.width - 8;
   const hitLeft  = leftEdge  <= 8;
   if (hitRight || hitLeft) {
     this.offsetY += this.stepDownY;
     this.direction *= -1;
     this.sharedSpeed *= 1.03;
     // drobna cofka od krawędzi
     if (hitRight) this.offsetX -= (rightEdge - (canvas.width - 8));
     else          this.offsetX += (8 - leftEdge);
   }
 
   // 2) losowe strzały (tempo zależne od liczby żywych)
   const alive = this.enemies.filter(e=>e.alive);
   this._fireTimerMs += dt*1000;
   if (alive.length > 0) {
     const dynamicCooldown = Math.max(220, this.fireCooldownMs * (alive.length / (this.rows*this.cols)));
     if (this._fireTimerMs >= dynamicCooldown) {
       this._fireTimerMs = 0;
       // wybierz "najbliższych graczowi" i losuj z wąskiej puli
       const candidates = alive.sort((a,b)=>Math.abs((a.x(this)+a.width/2)-playerX) - Math.abs((b.x(this)+b.width/2)-playerX));
       const shooter = candidates[Math.floor(Math.random()*Math.min(4,candidates.length))] || alive[0];
       const sx = shooter.x(this)+shooter.width/2-2;
       const sy = shooter.y(this)+shooter.height+2;
       enemyBulletPool.tryFire(sx, sy);
       Audio.play('enemyFire');
     }
   }
 }
 forEachAlive(cb){ for (const e of this.enemies) if (e.alive) cb(e); }
 isCleared(){ return this.enemies.every(e=>!e.alive); }
 anyReachedBottom(){
   const groundLine = canvas.height - 60;
   for (const e of this.enemies) if (e.alive && e.y(this)+e.height >= groundLine) return true;
   return false;
 }
 render(ctx){ this.forEachAlive(e=>e.render(ctx, this)); }
}
 
// ======================= ENEMY BULLETS =======================
class EnemyBullet {
 constructor(){ this.active=false; this.x=0; this.y=0; this.width=4; this.height=12; this.speed=340; }
 fire(x,y){ this.x=x; this.y=y; this.active=true; }
 update(dt){ if (this.active) { this.y += this.speed*dt; if (this.y > canvas.height) this.active=false; } }
 render(ctx){ if (this.active){ ctx.fillStyle='#ff6b6b'; ctx.fillRect(this.x,this.y,this.width,this.height); } }
}
class EnemyBulletPool {
 constructor(max){ this.pool = Array.from({length:max}, ()=>new EnemyBullet()); }
 tryFire(x,y){ const slot = this.pool.find(b=>!b.active); if (slot) slot.fire(x,y); }
 update(dt){ for (const b of this.pool) b.update(dt); }
 render(ctx){ for (const b of this.pool) b.render(ctx); }
 activeBullets(){ return this.pool.filter(b=>b.active); }
}
 
// ======================= SHIELDS (BUNKRY) =======================
class Shield {
 constructor(x,y,w=90,h=24){ this.x=x; this.y=y; this.w=w; this.h=h; }
 render(ctx){ ctx.fillStyle = '#3a945b'; ctx.fillRect(this.x,this.y,this.w,this.h); }
}
class ShieldManager {
 constructor(){ this.list=[]; }
 spawn(){
   this.list = [
     new Shield(canvas.width*0.20-45, canvas.height-150),
     new Shield(canvas.width*0.50-45, canvas.height-150),
     new Shield(canvas.width*0.80-45, canvas.height-150),
   ];
 }
 render(ctx){ for (const s of this.list) s.render(ctx); }
}
function handleBulletsVsShields(bullets, shieldMgr){
 for (const b of bullets) {
   if (!b.active) continue;
   for (const s of shieldMgr.list) {
     if (aabb(b.x,b.y,b.width,b.height, s.x,s.y,s.w,s.h)) { b.active=false; break; }
   }
 }
}
 
// ======================= UFO (opcjonalnie) =======================
class Ufo {
 constructor(){ this.active=false; this.x=-60; this.y=30; this.width=48; this.height=20; this.speed=180; this.dir=+1; this.scoreValue=150; }
 spawn(){ this.active=true; this.dir = Math.random()<0.5 ? +1 : -1; this.x = (this.dir===+1) ? -60 : canvas.width+60; this.y = 35 + Math.random()*25; }
 update(dt){ if (!this.active) return; this.x += this.dir*this.speed*dt; if (this.x<-80 || this.x>canvas.width+80) this.active=false; }
 render(ctx){ if (!this.active) return; ctx.fillStyle='#ff00bb'; ctx.fillRect(this.x,this.y,this.width,this.height); }
}
class UfoController {
 constructor(){ this.ufo = new Ufo(); this.timer=0; this.nextSpawnMs = 15000 + Math.random()*10000; }
 update(dt){ this.timer += dt*1000; if (!this.ufo.active && this.timer>=this.nextSpawnMs){ this.timer=0; this.nextSpawnMs = 15000 + Math.random()*10000; this.ufo.spawn(); } this.ufo.update(dt); }
 render(ctx){ this.ufo.render(ctx); }
}
function handlePlayerBulletsVsUfo(bulletPool, ufo, score){
 if (!ufo.active) return;
 for (const b of bulletPool.activeBullets()){
   if (aabb(b.x,b.y,b.width,b.height, ufo.x,ufo.y,ufo.width,ufo.height)) {
     b.active=false; ufo.active=false; score.add(ufo.scoreValue); Audio.play('hit'); break;
   }
 }
}
 
// ======================= COLLISIONS & SCORE =======================
const Score = {
 value: 0,
 add(n){ this.value += n; scoreEl.textContent = 'Wynik: ' + this.value; if (this.value > HiScore.get()){ HiScore.set(this.value); hiscoreEl.textContent = 'Rekord: ' + this.value; } }
};
function handlePlayerBulletsVsEnemies(bulletPool, enemyGrid, score){
 const bullets = bulletPool.activeBullets();
 for (const b of bullets) {
   for (const e of enemyGrid.enemies) {
     if (!e.alive) continue;
     if (aabb(b.x,b.y,b.width,b.height, e.x(enemyGrid),e.y(enemyGrid),e.width,e.height)) {
       b.active=false; e.hp -= 1;
       if (e.hp<=0){ e.alive=false; score.add(e.scoreValue); Audio.play('hit'); }
       break;
     }
   }
 }
}
function handleEnemyBulletsVsPlayer(enemyBulletPool, player){
 for (const b of enemyBulletPool.activeBullets()){
   if (aabb(b.x,b.y,b.width,b.height, player.x,player.y,player.width,player.height)) {
     b.active=false;
     if (player.invulnMs<=0){
       player.lives = Math.max(0, player.lives-1);
       livesEl.textContent = 'Życia: ' + player.lives;
       player.invulnMs = 1200;
       Audio.play('lose');
       if (player.lives<=0) gameState='GAME_OVER';
     }
     break;
   }
 }
}
 
// ======================= AUDIO (proste „beepy”) =======================
const Audio = (() => {
 const ctxA = new (window.AudioContext || window.webkitAudioContext)();
 function beep(freq=440, dur=0.08, type='square', vol=0.15){
   const o = ctxA.createOscillator(); const g = ctxA.createGain();
   o.type = type; o.frequency.setValueAtTime(freq, ctxA.currentTime);
   g.gain.value = vol;
   o.connect(g); g.connect(ctxA.destination); o.start(); o.stop(ctxA.currentTime + dur);
 }
 return {
   play(name){
     if (name==='fire') beep(940, 0.06, 'square', 0.12);
     else if (name==='enemyFire') beep(280, 0.06, 'square', 0.10);
     else if (name==='hit') beep(640, 0.08, 'sawtooth', 0.12);
     else if (name==='lose') beep(180, 0.18, 'triangle', 0.15);
   }
 };
})();
 
// ======================= GAME BOOTSTRAP =======================
const player = new Player();
const bulletPool = new BulletPool(40);
const enemyBulletPool = new EnemyBulletPool(40);
const enemyGrid = new EnemyGrid();
const shieldMgr = new ShieldManager();
const ufoCtrl = new UfoController();
 
function startGame(){
 Score.value = 0;
 scoreEl.textContent = 'Wynik: ' + Score.value;
 hiscoreEl.textContent = 'Rekord: ' + HiScore.get();
 player.lives = 3; livesEl.textContent = 'Życia: ' + player.lives;
 waveNo = 1; waveEl.textContent = 'Fala: ' + waveNo;
 gameState = 'RUNNING';
 statusEl.textContent = 'P = pauza';
 
 enemyGrid.rows = 5; enemyGrid.cols = 10; enemyGrid.spawn();
 if (FEATURES.shields) shieldMgr.spawn();
 // wyczyść pociski
 for (const b of bulletPool.pool) b.active=false;
 for (const b of enemyBulletPool.pool) b.active=false;
}
 
function nextWave(){
 waveNo++; waveEl.textContent = 'Fala: ' + waveNo;
 enemyGrid.sharedSpeed *= 1.08;
 enemyGrid.spawn();
 if (FEATURES.shields) shieldMgr.spawn();
}
 
function update(dt) {
 // -- Twój szkic pętli z pytania, już podpięty --
 player.update(dt);
 bulletPool.update(dt);
 enemyBulletPool.update(dt);
 
 enemyGrid.update(dt, enemyBulletPool, player.x);
 
 // kolizje
 handlePlayerBulletsVsEnemies(bulletPool, enemyGrid, Score);
 handleEnemyBulletsVsPlayer(enemyBulletPool, player);
 
 if (FEATURES.shields) {
   handleBulletsVsShields(bulletPool.activeBullets(), shieldMgr);
   handleBulletsVsShields(enemyBulletPool.activeBullets(), shieldMgr);
 }
 if (FEATURES.ufo) {
   ufoCtrl.update(dt);
   handlePlayerBulletsVsUfo(bulletPool, ufoCtrl.ufo, Score);
 }
 
 // warunki końca gry / fale
 if (enemyGrid.anyReachedBottom() || gameState === 'GAME_OVER') {
   gameState = 'GAME_OVER';
   statusEl.textContent = 'Game Over — Spacja = Restart';
 }
 if (enemyGrid.isCleared() && gameState==='RUNNING') {
   nextWave(); // eskalacja przy przejściu fali
 }
}
 
function render(ctx) {
 // tło
 ctx.clearRect(0,0,canvas.width,canvas.height);
 // drobne gwiazdy
 ctx.fillStyle = '#123';
 for (let i=0;i<80;i++) ctx.fillRect((i*97)%800, (i*53)%600, 2, 2);
 
 // obiekty gry
 enemyGrid.render(ctx);
 bulletPool.render(ctx);
 enemyBulletPool.render(ctx);
 if (FEATURES.shields) shieldMgr.render(ctx);
 if (FEATURES.ufo) ufoCtrl.render(ctx);
 player.render(ctx);
}
 
// ======================= MAIN LOOP =======================
let last = performance.now();
function loop(now){
 const dt = Math.min(0.033, (now - last)/1000); // cap 33ms
 last = now;
 
 if (gameState === 'RUNNING') update(dt);
 render(ctx);
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
 
// Wyświetl rekord na starcie
hiscoreEl.textContent = 'Rekord: ' + HiScore.get();