// Brick Breaker / Arkanoid - HTML5 Canvas
// Edytowalne poziomy: see `levels` below. Brick types: 0=empty,1=one-hit,2=two-hit

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // HUD elements
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');

  // --- Editable level definitions ---
  // Rows are arrays where numbers represent brick types
  // Levels: each level has a layout and optional parameters (ballSpeed, paddleWidth)
  // Layout uses numbers: 0=empty,1=one-hit,2=two-hit,3=three-hit
  const levels = [
    { name: 'Level 1', ballSpeed: 260, paddleWidth: 140, layout: [
        [0,1,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,1,0],
      ]},
    { name: 'Level 2', ballSpeed: 280, paddleWidth: 130, layout: [
        [2,1,1,1,1,1,1,1,1,2],
        [1,2,1,2,1,2,1,2,1,1],
        [1,1,2,1,2,1,2,1,1,1],
      ]},
    { name: 'Level 3', ballSpeed: 300, paddleWidth: 120, layout: [
        [0,2,2,1,1,1,1,2,2,0],
        [2,3,2,2,1,1,2,2,3,2],
        [1,2,2,2,2,2,2,2,2,1],
      ]},
    { name: 'Level 4', ballSpeed: 320, paddleWidth: 120, layout: [
        [1,1,2,2,2,2,2,2,1,1],
        [2,2,3,3,2,2,3,3,2,2],
        [1,3,1,3,1,3,1,3,1,3],
      ]},
    { name: 'Level 5', ballSpeed: 340, paddleWidth: 110, layout: [
        [3,2,2,3,2,2,3,2,2,3],
        [2,3,2,3,2,3,2,3,2,3],
        [1,2,3,2,3,2,3,2,3,1],
        [0,1,1,1,1,1,1,1,1,0],
      ]},
    { name: 'Level 6', ballSpeed: 360, paddleWidth: 110, layout: [
        [0,3,2,3,2,3,2,3,2,0],
        [3,3,3,2,2,2,2,3,3,3],
        [2,2,3,3,3,3,3,3,2,2],
        [1,1,2,2,2,2,2,2,1,1],
      ]},
    { name: 'Level 7', ballSpeed: 380, paddleWidth: 100, layout: [
        [3,3,1,3,3,3,3,1,3,3],
        [2,3,2,3,2,3,2,3,2,3],
        [3,2,3,2,3,2,3,2,3,2],
        [1,1,1,1,2,2,1,1,1,1],
      ]},
    { name: 'Level 8', ballSpeed: 400, paddleWidth: 100, layout: [
        [3,3,3,3,3,3,3,3,3,3],
        [0,3,2,2,2,2,2,2,3,0],
        [3,2,3,2,3,2,3,2,3,2],
        [2,1,1,1,1,1,1,1,1,2],
      ]},
    { name: 'Level 9', ballSpeed: 420, paddleWidth: 90, layout: [
        [3,3,3,2,3,3,3,2,3,3],
        [3,2,3,2,3,2,3,2,3,2],
        [2,2,2,3,3,3,3,2,2,2],
        [1,1,1,1,2,2,1,1,1,1],
      ]},
    { name: 'Level 10', ballSpeed: 450, paddleWidth: 80, layout: [
        [3,3,3,3,3,3,3,3,3,3],
        [3,2,3,2,3,2,3,2,3,2],
        [2,3,2,3,2,3,2,3,2,3],
        [3,3,3,3,3,3,3,3,3,3],
        [0,1,1,1,1,1,1,1,1,0],
      ]}
  ];

  // Brick visual and behaviour mapping
  const BRICK = {
    width: 72,
    height: 20,
    padding: 6,
    offsetTop: 60,
    offsetLeft: 24,
    colors: {
      1: '#f27c6b',
      2: '#f2b46b',
      3: '#8ec07c'
    }
  };

  // Game state
  let game = null;

  // Power-up definitions (chance is per-destroyed-brick percent)
  const POWERUP_DEFS = [
    {key:'multiball', chance:0.03, icon:'ikonka_multiball.png', duration:null},
    {key:'mega', chance:0.08, icon:'ikonka_mega_paletka.png', duration:22},
    {key:'magnet', chance:0.05, icon:'ikonka_magnetyczna_paletka.png', duration:{hits:12}},
    {key:'piercing', chance:0.03, icon:'ikonka_pilka_przebijajaca.png', duration:11},
    {key:'shield', chance:0.04, icon:'ikonka_tarcza_ratunkowa.png', duration:30},
    {key:'slow', chance:0.07, icon:'ikonka_spowolnienie_czasu.png', duration:13},
    {key:'bomb', chance:0.03, icon:'ikonka_bomba_ceglana.png', duration:{uses:1}},
    {key:'laser', chance:0.02, icon:'ikonka_laser_paletka.png', duration:10},
    {key:'debuff', chance:0.03, icon:'ikonka_zla_niespodzianka.png', duration:11}
  ];

  // Preload icons for power-ups. If external files are missing, create small fallback icons via canvas.
  const POWERUP_ICONS = {};
  const ICON_COLORS = {
    multiball:'#ffd36b', mega:'#6fa8dc', magnet:'#b085d6', piercing:'#f27c6b', shield:'#8ec07c', slow:'#93c5fd', bomb:'#ff9aa2', laser:'#ffd36b', debuff:'#9a6b6b'
  };

  function createIconDataURL(color, letter){
    const s = 32;
    const c = document.createElement('canvas'); c.width = s; c.height = s; const g = c.getContext('2d');
    // background
    g.fillStyle = color || '#cccccc'; g.fillRect(0,0,s,s);
    // inner rounded
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(2,2,s-4,s-4);
    // letter
    g.fillStyle = '#062236'; g.font = 'bold 16px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(letter||'P', s/2, s/2+1);
    return c.toDataURL('image/png');
  }

  // initialize icons map (attempt to load external files, fallback to generated)
  for(const def of POWERUP_DEFS){
    const key = def.key;
    const path = `assets/powerups/${def.icon}`;
    const img = new Image();
    img.onload = ()=>{ POWERUP_ICONS[key] = img; };
    img.onerror = ()=>{ // fallback
      const letter = (key[0]||'P').toUpperCase();
      const url = createIconDataURL(ICON_COLORS[key]||'#ddd', letter);
      const im = new Image(); im.src = url; POWERUP_ICONS[key] = im;
    };
    img.src = path;
  }

  function pickPowerupByChance(){
    const total = POWERUP_DEFS.reduce((s,p)=>s+p.chance,0);
    let r = Math.random()*total;
    for(const p of POWERUP_DEFS){ r -= p.chance; if(r <= 0) return p.key; }
    return null;
  }

  // Utility - sound simple beep
  const Sound = (() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    function beep(freq=440, time=0.03, type='sine', gain=0.03){
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(ctx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time);
      o.stop(ctx.currentTime + time + 0.02);
    }
    return {beep};
  })();

  // Classes
  class Paddle {
    constructor(){
      this.width = 120;
      this.height = 14;
      this.x = (W - this.width)/2;
      this.y = H - 40;
      this.speed = 8;
      this.color = '#d6e9ff';
      this.expandTimer = 0; // seconds
    }
    update(dt){
      if(this.expandTimer > 0){
        this.expandTimer -= dt;
        if(this.expandTimer <= 0){ this.width = 120; }
      }
    }
    draw(){
      ctx.fillStyle = this.color;
      roundRect(ctx,this.x,this.y,this.width,this.height,6,true,false);
    }
    setX(x){
      this.x = Math.max(0, Math.min(W - this.width, x));
    }
    move(dir){
      this.x += dir * this.speed;
      if(this.x < 0) this.x = 0;
      if(this.x + this.width > W) this.x = W - this.width;
    }
    expand(duration=8){
      this.width = Math.min(240, this.width * 1.6);
      this.expandTimer = duration;
    }
  }

  class Ball {
    constructor(x,y,speed){
      this.r = 8;
      this.x = x || W/2;
      this.y = y || H/2;
      this.speed = speed || 260; // pixels per second
      const ang = (Math.random()*Math.PI*0.6) + Math.PI*0.2; // avoid straight vertical
      this.vx = Math.cos(ang) * this.speed;
      this.vy = Math.sin(ang) * this.speed * -1;
      this.color = '#fff7ea';
      this.stuck = true; // stuck on paddle until launch
      this.stickTimer = 0;
    }
    update(dt){
      if(this.stuck) return;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    draw(){
      ctx.beginPath(); ctx.fillStyle = this.color; ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
    }
    speedUp(factor){
      const s = Math.hypot(this.vx, this.vy) * factor;
      const a = Math.atan2(this.vy, this.vx);
      this.vx = Math.cos(a)*s; this.vy = Math.sin(a)*s;
    }
  }

  class Brick {
    constructor(col,row,type){
      this.col = col; this.row = row; this.type = type; // 1 or 2
      this.alive = type>0;
      this.hits = 0;
      this.x = BRICK.offsetLeft + col*(BRICK.width+BRICK.padding);
      this.y = BRICK.offsetTop + row*(BRICK.height+BRICK.padding);
      this.w = BRICK.width; this.h = BRICK.height;
    }
    draw(){
      if(!this.alive) return;
      const t = this.type - this.hits;
      ctx.fillStyle = t===2 ? '#b085d6' : (t===1 ? '#6fa8dc' : '#8ec07c');
      roundRect(ctx,this.x,this.y,this.w,this.h,4,true,false);
      // inner highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth=1; ctx.strokeRect(this.x+1,this.y+1,this.w-2,this.h-2);
    }
    hit(){
      this.hits++;
      if(this.hits >= this.type) { this.alive = false; }
    }
  }

  class PowerUp {
    constructor(x,y,kind){
      this.x = x; this.y = y; this.kind = kind; this.w=20; this.h=20; this.vy=90; this.color='#ffd36b'; this.alive=true;
      this.iconKey = (kind==='expand' ? 'mega' : kind);
    }
    update(dt){ this.y += this.vy * dt; if(this.y>H+50) this.alive=false; }
    draw(){
      // draw background box
      ctx.fillStyle='rgba(6,34,54,0.85)'; roundRect(ctx,this.x-2,this.y-2,this.w+4,this.h+4,6,true,false);
      const img = POWERUP_ICONS[this.iconKey];
      if(img && img.complete){ ctx.drawImage(img, this.x, this.y, this.w, this.h); }
      else { ctx.fillStyle=this.color; roundRect(ctx,this.x,this.y,this.w,this.h,4,true,false); ctx.fillStyle='#062236'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(this.kind[0].toUpperCase(), this.x+this.w/2, this.y+this.h/2); }
    }
  }

  // Laser projectile
  class LaserShot {
    constructor(x,y){ this.x = x; this.y = y; this.w = 6; this.h = 14; this.vy = -480; this.alive = true; }
    update(dt){ this.y += this.vy * dt; if(this.y < -20) this.alive = false; }
    draw(){ ctx.fillStyle = '#ffd36b'; ctx.fillRect(this.x - this.w/2, this.y - this.h, this.w, this.h); }
  }

  // Helpers
  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    if(typeof r==='undefined') r=6; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke();
  }

  function createBricksFromLayout(layout){
    const bricks = [];
    for(let r=0;r<layout.length;r++){
      for(let c=0;c<layout[r].length;c++){
        const t = layout[r][c];
        bricks.push(new Brick(c,r,t));
      }
    }
    return bricks;
  }

  // Main Game class
  class Game {
    constructor(){
      this.paddle = new Paddle();
      this.balls = [ new Ball(this.paddle.x + this.paddle.width/2, this.paddle.y - 12) ];
      this.bricks = [];
      this.powerups = [];
      this.score = 0;
      this.lives = 3;
      this.levelIndex = 0;
      this.paused = false;
      this.gameOver = false;
      this.spawnMultiballCount = 0;
      this.lastTime = performance.now();
      this.accumTime = 0;
      this.laserShots = [];
      this.active = {
        megaUntil: 0,
        magnetHits: 0,
        piercingUntil: 0,
        shieldUntil: 0,
        shieldActive: false,
        slowUntil: 0,
        slowFactor: 1,
        bombReady: false,
        laserUntil: 0,
        laserShotsLeft: 0,
        debuffUntil: 0,
        lastLaserFire: 0
      };
      this.loadLevel(this.levelIndex);
    }
    loadLevel(i){
      this.levelIndex = i % levels.length;
      const lvl = levels[this.levelIndex];
      this.currentLevel = lvl;
      // create bricks
      this.bricks = createBricksFromLayout(lvl.layout);
      // set base parameters according to level
      this.baseBallSpeed = lvl.ballSpeed || 260;
      this.paddle.width = lvl.paddleWidth || 120;
      this.paddle.expandTimer = 0;
      // reset balls to single ball stuck on paddle with level speed
      this.balls = [ new Ball(this.paddle.x + this.paddle.width/2, this.paddle.y - 12, this.baseBallSpeed) ];
      this.balls[0].stuck = true;
      // reset powerups and active states
      this.powerups = [];
      this.laserShots = [];
      this.active.magnetHits = 0; this.active.piercingUntil = 0; this.active.shieldActive = false; this.active.shieldUntil = 0; this.active.slowUntil = 0; this.active.slowFactor = 1; this.active.bombReady = false; this.active.laserUntil = 0; this.active.laserShotsLeft = 0; this.active.debuffUntil = 0;
      this.paused = true; // start paused until auto-start or space
      this.gameOver = false;
      this.levelComplete = { status: 'idle', t: 0, alpha: 0, msg: '' };
      this.updateHud();
    }
    updateHud(){ scoreEl.textContent = `Punkty: ${this.score}`; livesEl.textContent = `Życia: ${this.lives}`; levelEl.textContent = `Poziom: ${this.levelIndex+1}`; }
    spawnPowerup(x,y){
      // choose power-up according to configured rarities (each has independent chance)
      const candidates = POWERUP_DEFS.filter(p=>Math.random() < p.chance);
      if(candidates.length === 0) return;
      const chosen = candidates[Math.floor(Math.random()*candidates.length)];
      const mapKey = chosen.key === 'mega' ? 'expand' : chosen.key;
      this.powerups.push(new PowerUp(x - 9, y - 9, mapKey));
    }
    update(dt){
      const now = performance.now();
      // handle level complete sequence even when paused
      if(this.levelComplete && this.levelComplete.status !== 'idle'){
        const elapsed = now - this.levelComplete.t;
        if(this.levelComplete.status === 'complete'){
          // after 2 seconds, load next level and show its label
          if(elapsed >= 2000){
            // advance level
            this.levelIndex = (this.levelIndex + 1) % levels.length;
            this.loadLevel(this.levelIndex);
            // show 'Level X' for next level
            this.levelComplete.status = 'next';
            this.levelComplete.t = now;
            this.levelComplete.msg = `Level ${this.levelIndex+1}`;
            Sound.beep(1800,0.08);
          }
        } else if(this.levelComplete.status === 'next'){
          // after 1.2s start the next level automatically
          if(elapsed >= 1200){
            this.levelComplete.status = 'idle';
            this.levelComplete.t = 0;
            this.levelComplete.msg = '';
            this.paused = false;
            for(const b of this.balls) b.stuck = false;
          }
        }
      }
      if(this.paused) return;
      this.paddle.update(dt);
      // update balls
      for(const ball of this.balls){
        if(ball.stuck){ ball.x = this.paddle.x + this.paddle.width/2; ball.y = this.paddle.y - 12; continue; }
        ball.update(dt);
        // walls
        if(ball.x - ball.r < 0){ ball.x = ball.r; ball.vx *= -1; Sound.beep(600,0.02); }
        if(ball.x + ball.r > W){ ball.x = W - ball.r; ball.vx *= -1; Sound.beep(600,0.02); }
        if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy *= -1; Sound.beep(600,0.02); }
        // bottom
        if(ball.y - ball.r > H){
          // if shield active, bounce and consume shield
          if(this.active.shieldActive){
            ball.y = H - ball.r - 4;
            ball.vy *= -1;
            this.active.shieldActive = false;
            this.active.shieldUntil = 0;
            Sound.beep(900,0.03);
          } else {
            // remove this ball
            const idx = this.balls.indexOf(ball);
            if(idx>=0) this.balls.splice(idx,1);
            if(this.balls.length===0){ this.lives--; this.updateHud(); if(this.lives<=0){ this.gameOver=true; this.paused=true; } else { // reset single ball
              const b = new Ball(this.paddle.x + this.paddle.width/2, this.paddle.y - 12, this.baseBallSpeed); b.stuck = true; this.balls=[b]; }
            }
          }
        }
      }

      // paddle collisions
      for(const ball of this.balls){
        if(ball.stuck) continue;
        if(ball.y + ball.r >= this.paddle.y && ball.y + ball.r <= this.paddle.y + this.paddle.height && ball.x >= this.paddle.x && ball.x <= this.paddle.x + this.paddle.width){
          // reflect depending on where it hits
          const rel = (ball.x - (this.paddle.x + this.paddle.width/2)) / (this.paddle.width/2);
          const bounceAngle = rel * (Math.PI/3); // -60..60 degrees
          const speed = Math.hypot(ball.vx, ball.vy);
          ball.vx = Math.sin(bounceAngle) * speed;
          ball.vy = -Math.cos(bounceAngle) * speed;
          // small tweak to keep ball above paddle
          ball.y = this.paddle.y - ball.r - 1;
          Sound.beep(1000,0.02);
          // magnet behavior: stick ball to paddle for a short time if active
          if(this.active.magnetHits && this.active.magnetHits > 0){
            ball.stuck = true;
            ball.stickTimer = 0.8; // seconds to hold
            this.active.magnetHits = Math.max(0, this.active.magnetHits - 1);
          }
        }
      }

      // handle sticky timers for magnet-held balls
      for(const ball of this.balls){
        if(ball.stuck && ball.stickTimer){
          ball.stickTimer -= dt;
          if(ball.stickTimer <= 0){ ball.stuck = false; ball.stickTimer = 0; }
        }
      }

      // bricks collisions
      for(const brick of this.bricks){
        if(!brick.alive) continue;
        for(const ball of this.balls){
          if(ball.stuck) continue;
          if(ball.x + ball.r > brick.x && ball.x - ball.r < brick.x + brick.w && ball.y + ball.r > brick.y && ball.y - ball.r < brick.y + brick.h){
            const now = performance.now();
            const isPiercing = now < this.active.piercingUntil;

            // reflect calculation (for bomb and normal collisions)
            const overlapX = Math.min(ball.x+ball.r - brick.x, brick.x+brick.w - (ball.x - ball.r));
            const overlapY = Math.min(ball.y+ball.r - brick.y, brick.y+brick.h - (ball.y - ball.r));
            // If bomb armed, explode around brick (but still reflect as single brick)
            if(this.active.bombReady){
              if(overlapX < overlapY){ ball.vx *= -1; } else { ball.vy *= -1; }
              this.explodeAt(brick.col, brick.row, 2);
              this.active.bombReady = false;
            } else if(isPiercing){
              // piercing: destroy brick(s) without reflecting
              brick.hit();
              if(!brick.alive){ this.score += (brick.type*50); this.updateHud(); Sound.beep(1200,0.05); this.spawnPowerup(brick.x + brick.w/2, brick.y + brick.h/2); }
              else { this.score += 25; this.updateHud(); Sound.beep(900,0.04); }
            } else {
              // normal reflection
              if(overlapX < overlapY){ ball.vx *= -1; } else { ball.vy *= -1; }
              brick.hit();
              if(!brick.alive){ this.score += (brick.type*50); this.updateHud(); Sound.beep(1200,0.05); this.spawnPowerup(brick.x + brick.w/2, brick.y + brick.h/2); }
              else { this.score += 25; this.updateHud(); Sound.beep(900,0.04); }
              // speed up ball a little
              ball.speedUp(1.03);
            }
          }
        }
      }

      // powerups
      for(const p of this.powerups){
        p.update(dt);
        if(!p.alive) continue;
        if(p.y + p.h >= this.paddle.y && p.x + p.w > this.paddle.x && p.x < this.paddle.x + this.paddle.width){
          // apply powerup effect
          switch(p.kind){
            case 'expand': this.paddle.expand((POWERUP_DEFS.find(d=>d.key==='mega')||{}).duration || 20); break;
            case 'multiball': this.spawnMultiball(); break;
            case 'life': this.lives++; this.updateHud(); break;
            case 'magnet': this.active.magnetHits = (POWERUP_DEFS.find(d=>d.key==='magnet')||{}).duration?.hits || 12; break;
            case 'piercing': this.active.piercingUntil = performance.now() + ((POWERUP_DEFS.find(d=>d.key==='piercing')||{}).duration||10)*1000; break;
            case 'shield': this.active.shieldActive = true; this.active.shieldUntil = performance.now() + ((POWERUP_DEFS.find(d=>d.key==='shield')||{}).duration||30)*1000; break;
            case 'slow': {
              const dur = (POWERUP_DEFS.find(d=>d.key==='slow')||{}).duration||12;
              if(this.active.slowUntil < performance.now()){
                this.active.slowFactor = 0.65; // slow by ~35%
                for(const b of this.balls){ b.vx *= this.active.slowFactor; b.vy *= this.active.slowFactor; }
              }
              this.active.slowUntil = performance.now() + dur*1000; break;
            }
            case 'bomb': this.active.bombReady = true; break;
            case 'laser': this.active.laserUntil = performance.now() + ((POWERUP_DEFS.find(d=>d.key==='laser')||{}).duration||10)*1000; this.active.laserShotsLeft = 20; break;
            case 'debuff': {
              const dur = (POWERUP_DEFS.find(d=>d.key==='debuff')||{}).duration||10;
              this.paddle.width = Math.max(40, this.paddle.width * 0.55);
              for(const b of this.balls){ b.vx *= 1.2; b.vy *= 1.2; }
              this.active.debuffUntil = performance.now() + dur*1000; break;
            }
          }
          p.alive = false; Sound.beep(1400,0.06);
        }
      }
      this.powerups = this.powerups.filter(p=>p.alive);

      // update laser shots and their collisions
      for(const s of this.laserShots){
        s.update(dt);
        if(!s.alive) continue;
        for(const br of this.bricks){ if(!br.alive) continue; if(s.y - s.h <= br.y + br.h && s.x >= br.x && s.x <= br.x + br.w){ br.hit(); s.alive=false; if(!br.alive){ this.score += (br.type*50); this.updateHud(); Sound.beep(1200,0.04); this.spawnPowerup(br.x + br.w/2, br.y + br.h/2); } else { this.score += 25; this.updateHud(); Sound.beep(900,0.03); } break; } }
      }
      this.laserShots = this.laserShots.filter(s=>s.alive);

      // shield timeout
      if(this.active.shieldActive && performance.now() > this.active.shieldUntil){ this.active.shieldActive = false; }
      // slow timeout: restore velocities
      if(this.active.slowUntil && performance.now() > this.active.slowUntil){ if(this.active.slowFactor !== 1){ const inv = 1/this.active.slowFactor; for(const b of this.balls){ b.vx *= inv; b.vy *= inv; } this.active.slowFactor = 1; } this.active.slowUntil = 0; }
      // debuff timeout
      if(this.active.debuffUntil && performance.now() > this.active.debuffUntil){ this.active.debuffUntil = 0; this.paddle.width = 120; }
      // laser timeout
      if(this.active.laserUntil && performance.now() > this.active.laserUntil){ this.active.laserUntil = 0; this.active.laserShotsLeft = 0; }

      // check win -> begin level-complete sequence
      if(this.bricks.filter(b=>b.alive).length === 0){
        if(this.levelComplete && this.levelComplete.status === 'idle'){
          this.levelComplete.status = 'complete';
          this.levelComplete.t = performance.now();
          this.levelComplete.msg = `Level ${this.levelIndex+1} Complete!`;
          this.paused = true;
          // stick balls to paddle visually
          for(const b of this.balls){ b.stuck = true; }
          Sound.beep(2000,0.12);
        }
      }
    }
    spawnMultiball(){
      const copies = [];
      for(const b of this.balls){
        const sp = Math.hypot(b.vx,b.vy) || this.baseBallSpeed || 260;
        const b1 = new Ball(b.x,b.y, sp); b1.stuck=false; b1.vx = b.vx; b1.vy = -Math.abs(b.vy); copies.push(b1);
        const b2 = new Ball(b.x,b.y, sp); b2.stuck=false; b2.vx = -b.vx; b2.vy = -Math.abs(b.vy); copies.push(b2);
      }
      this.balls = this.balls.concat(copies);
    }

    explodeAt(col,row,radius=2){
      // destroy bricks in a rectangular neighborhood of size radius
      for(const b of this.bricks){
        if(!b.alive) continue;
        if(Math.abs(b.col - col) <= radius && Math.abs(b.row - row) <= radius){
          b.alive = false;
          this.score += (b.type*50);
          Sound.beep(1000,0.02);
          // spawn chance for powerups from exploded bricks
          this.spawnPowerup(b.x + b.w/2, b.y + b.h/2);
        }
      }
      this.updateHud();
    }

    fireLaser(){
      const now = performance.now();
      if(now < this.active.lastLaserFire + 120) return; // small rate limit
      if(this.active.laserUntil && now < this.active.laserUntil && this.active.laserShotsLeft > 0){
        const leftX = this.paddle.x + 8;
        const rightX = this.paddle.x + this.paddle.width - 8;
        this.laserShots.push(new LaserShot(leftX, this.paddle.y));
        this.laserShots.push(new LaserShot(rightX, this.paddle.y));
        this.active.laserShotsLeft = Math.max(0, this.active.laserShotsLeft - 2);
        this.active.lastLaserFire = now;
        Sound.beep(1600,0.03);
      }
    }
    draw(){
      // clear
      ctx.clearRect(0,0,W,H);
      // background grid subtle
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      for(let i=0;i<W;i+=60) ctx.fillRect(i,H-1,1,1);

      // bricks
      for(const b of this.bricks) b.draw();
      // powerups
      for(const p of this.powerups) p.draw();
      // laser shots
      for(const s of this.laserShots) s.draw();
      // paddle
      this.paddle.draw();
      // shield visual
      if(this.active.shieldActive){ ctx.fillStyle='rgba(100,180,255,0.18)'; roundRect(ctx, this.paddle.x-6, this.paddle.y + this.paddle.height + 4, this.paddle.width+12, 8, 4, true, false); }
      // balls
      for(const ball of this.balls) ball.draw();

      // Active power-up HUD (top-right)
      const now = performance.now();
      const hudSize = 28; let hx = W - 12;
      const activeList = [];
      for(const def of POWERUP_DEFS){
        const k = def.key;
        let info = null;
        if(k === 'multiball' && this.balls.length > 1) info = `${this.balls.length}`;
        if(k === 'mega' && this.paddle.expandTimer > 0) info = `${Math.ceil(this.paddle.expandTimer)}s`;
        if(k === 'magnet' && this.active.magnetHits > 0) info = `${this.active.magnetHits}`;
        if(k === 'piercing' && now < this.active.piercingUntil) info = `${Math.ceil((this.active.piercingUntil-now)/1000)}s`;
        if(k === 'shield' && this.active.shieldActive) info = `1`;
        if(k === 'slow' && now < this.active.slowUntil) info = `${Math.ceil((this.active.slowUntil-now)/1000)}s`;
        if(k === 'bomb' && this.active.bombReady) info = `1`;
        if(k === 'laser' && now < this.active.laserUntil) info = `${Math.ceil((this.active.laserUntil-now)/1000)}s`;
        if(k === 'debuff' && now < this.active.debuffUntil) info = `${Math.ceil((this.active.debuffUntil-now)/1000)}s`;
        if(info) activeList.push({key:k, info});
      }
      for(const item of activeList){
        const img = POWERUP_ICONS[item.key];
        hx -= hudSize; // move left
        // background box
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, hx-4, 8, hudSize+8, hudSize+10, 6, true, false);
        if(img && img.complete){ ctx.drawImage(img, hx, 12, hudSize, hudSize); }
        else { ctx.fillStyle = '#666'; roundRect(ctx, hx, 12, hudSize, hudSize, 4, true, false); ctx.fillStyle='#fff'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.key[0].toUpperCase(), hx + hudSize/2, 12 + hudSize/2); }
        // small badge
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.arc(hx + hudSize - 4, 12 + 6, 10, 0, Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.info, hx + hudSize - 4, 12 + 6);
      }

      // HUD hints
      if(this.paused && !this.gameOver && (!this.levelComplete || this.levelComplete.status==='idle')){
        ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(W/2-200,H/2-44,400,88);
        ctx.fillStyle='#eaf6ff'; ctx.font='20px sans-serif'; ctx.textAlign='center'; ctx.fillText('Naciśnij SPACJĘ aby startować', W/2, H/2 - 4);
      }
      // draw level-complete / next-level messages with fade
      if(this.levelComplete && this.levelComplete.status !== 'idle'){
        const now = performance.now();
        const st = this.levelComplete.status === 'complete' ? 2000 : 1200;
        const elapsed = Math.min(st, now - this.levelComplete.t);
        const fadeIn = 300, fadeOut = 300;
        let alpha = 1;
        if(elapsed < fadeIn) alpha = elapsed / fadeIn;
        else if(elapsed > st - fadeOut) alpha = Math.max(0, (st - elapsed) / fadeOut);

        ctx.save();
        ctx.globalAlpha = 0.85 * alpha;
        ctx.fillStyle='black'; ctx.fillRect(0, H/2 - 80, W, 160);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.font = this.levelComplete.status==='complete' ? '36px sans-serif' : '30px sans-serif';
        ctx.fillText(this.levelComplete.msg, W/2, H/2 - 6);
        ctx.restore();
      }
      if(this.gameOver){
        ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(W/2-240,H/2-80,480,160);
        ctx.fillStyle='#fff'; ctx.font='32px sans-serif'; ctx.textAlign='center'; ctx.fillText('Koniec gry', W/2, H/2 - 6);
        ctx.font='18px sans-serif'; ctx.fillText(`Twoje punkty: ${this.score}`, W/2, H/2 + 26);
      }
    }
  }

  // Input
  const keys = {};
  window.addEventListener('keydown', (e)=>{ keys[e.code]=true; if(e.code==='Space'){ if(game){ if(game.gameOver){ // restart
      game = new Game(); } else { game.paused = false; for(const b of game.balls) b.stuck=false; } } } });
  window.addEventListener('keyup', (e)=>{ keys[e.code]=false; });

  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    if(game) game.paddle.setX(mx - game.paddle.width/2);
  });

  // Main loop
  function loop(now){
    const dt = Math.min(0.03, (now - (game.lastTime||now))/1000);
    game.lastTime = now;
    // input
    if(keys['ArrowLeft']) game.paddle.move(-1);
    if(keys['ArrowRight']) game.paddle.move(1);
    if(keys['KeyZ']) game.fireLaser && game.fireLaser();

    game.update(dt);
    game.draw();
    requestAnimationFrame(loop);
  }

  // init
  function init(){
    game = new Game();
    requestAnimationFrame(loop);
  }

  // Start after user gesture to enable audio on some browsers
  document.body.addEventListener('click', function once(){ document.body.removeEventListener('click', once); try{ if(window.AudioContext || window.webkitAudioContext) new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} }, {once:true});

  init();

})();
