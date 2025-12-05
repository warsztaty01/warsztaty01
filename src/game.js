(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight * 0.72);
    // regenerate stars and craters to fit new size
    generateStars(Math.round(canvas.width/6));
    generateCraters();
  }
  window.addEventListener('resize', resize);
  resize();

  // Start higher (smaller y) so the ship falls longer on load
  const ship = new Ship(canvas.width/2, 30);

  // stars background
  const stars = [];
  function generateStars(count = 120) {
    stars.length = 0;
    for (let i=0;i<count;i++) {
      stars.push({
        x: Math.random()*canvas.width,
        y: Math.random()*(canvas.height*0.8),
        r: Math.random()*1.6 + 0.6,
        alpha: Math.random()*0.8 + 0.2,
        tw: Math.random()*Math.PI*2
      });
    }
  }
  generateStars(Math.round(canvas.width/6));

  // astronaut that exits after safe landing
  let astronaut = null;

  // landing rules
  const SAFE_LANDING_VY = 90; // px/s allowed vertical speed for safe landing

  // wind (horizontal acceleration) - varies slowly
  const MAX_WIND = 18; // px/s^2
  let wind = 0; // current horizontal acceleration from wind
  let windTimer = 0;

  // craters for moon-like ground
  const craters = [];
  function generateCraters() {
    craters.length = 0;
    const floorTop = canvas.height - 60;
    const count = Math.max(6, Math.round(canvas.width / 120));
    for (let i=0;i<count;i++) {
      const cx = Math.random() * canvas.width;
      const r = 12 + Math.random()*36;
      craters.push({x: cx, y: floorTop + Math.random()*18, r});
    }
  }
  generateCraters();

  let last = performance.now();

  function drawBackground() {
    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#02061a');
    g.addColorStop(1,'#061127');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // stars
    for (let s of stars) {
      const a = s.alpha * (0.6 + 0.4*Math.sin((performance.now()*0.002)+s.tw));
      ctx.fillStyle = `rgba(255,255,220,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawGround() {
    // moon-like surface
    const h = 60;
    const baseY = canvas.height - h;
    // base surface
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, baseY, canvas.width, h + 40);
    // craters (darker)
    for (let c of craters) {
      ctx.fillStyle = '#9f9f9f';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r*0.6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.ellipse(c.x - c.r*0.3, c.y - c.r*0.3, c.r*0.35, c.r*0.18,0,0,Math.PI*2); ctx.fill();
    }
    // landing pad marker
    ctx.fillStyle = '#cfe';
    const padW = 140; const padH = 8;
    ctx.fillRect((canvas.width-padW)/2, baseY - padH/2, padW, padH);
  }

  function drawDebug() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(10,10,300,120);
    ctx.fillStyle = '#cfe';
    ctx.font = '13px monospace';
    ctx.fillText(`y: ${ship.y.toFixed(1)} px`, 18, 30);
    // vy with color indicator
    const vy = ship.vy.toFixed(1);
    const safe = Math.abs(ship.vy) <= SAFE_LANDING_VY;
    ctx.fillStyle = safe ? '#7aff8a' : '#ff6b6b';
    ctx.fillText(`vy: ${vy} px/s`, 18, 48);
    ctx.fillStyle = '#cfe';
    ctx.fillText(`fuel: ${ship.fuel.toFixed(0)} / ${ship.maxFuel}`, 18, 66);
    ctx.fillText(`state: ${ship.landed? 'LANDED' : ship.crashed ? 'CRASHED' : ship.thrusting ? 'THRUST' : 'FALLING'}`, 18, 86);
    ctx.fillStyle = '#cfe'; ctx.fillText(`fps: ${Math.round(1000 / Math.max(1, Date.now() - last))}`, 200, 30);
    // wind indicator
    ctx.fillStyle = '#cfe'; ctx.fillText(`wind: ${wind.toFixed(1)} px/s²`, 200, 50);
  }

  function drawFuelBar() {
    // vertical fuel bar at top-right
    const barW = 14; const barH = 140; const x = canvas.width - 28; const y = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x-4,y-4,barW+8,barH+8);
    ctx.fillStyle = '#333'; ctx.fillRect(x,y,barW,barH);
    const perc = ship.fuel / ship.maxFuel;
    ctx.fillStyle = perc > 0.35 ? '#3fd' : '#ff8b4d';
    const fillH = Math.max(0, barH * perc);
    ctx.fillRect(x, y + (barH - fillH), barW, fillH);
    ctx.strokeStyle = '#cfe'; ctx.strokeRect(x,y,barW,barH);
    // label
    ctx.fillStyle = '#cfe'; ctx.font = '12px monospace'; ctx.fillText('FUEL', x-38, y+barH/2+4);
  }

  // explosion particles
  let explosion = null;


  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); // clamp dt to avoid big jumps
    last = now;
    // update wind (slowly varying)
    windTimer += dt;
    wind = Math.sin(windTimer * 0.35) * MAX_WIND * (0.6 + 0.4*Math.sin(windTimer*0.13));

    // update with precise collision detection (pass wind acceleration)
    const floorY = canvas.height - 60 - ship.height/2;
    const result = ship.update(dt, floorY, wind);
    if (result.hit && !ship.landed && !ship.crashed) {
      // check landing speed at impact
      const impactVy = Math.abs(result.vyAtHit);
      if (impactVy <= SAFE_LANDING_VY) {
        ship.vy = 0;
        ship.landed = true;
        ship.thrusting = false;
        astronaut = {
          x: ship.x,
          y: ship.y - ship.height/2 + 2,
          progress: 0,
          state: 'exiting'
        };
      } else {
        ship.vy = 0;
        ship.crashed = true;
        ship.thrusting = false;
        // spawn explosion
        if (!explosion) {
          explosion = { particles: [], time: 0 };
          for (let i=0;i<36;i++) {
            const ang = Math.random()*Math.PI*2;
            const speed = 40 + Math.random()*160;
            explosion.particles.push({ x: ship.x, y: ship.y, vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed, life: 0.9 + Math.random()*0.6 });
          }
        }
      }
    }

    // update explosion particles
    if (explosion) {
      explosion.time += dt;
      explosion.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 160 * dt; // gravity on particles
        p.life -= dt*0.9;
      });
      explosion.particles = explosion.particles.filter(p => p.life > 0);
      if (explosion.particles.length === 0) explosion = null;
    }

    // draw
    drawBackground();
    drawGround();
    ship.draw(ctx);
    // draw explosion overlay if crashed
    if (ship.crashed && explosion) {
      for (let p of explosion.particles) {
        const alpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = `rgba(255,160,40,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1-alpha)*6, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,10,10,0.08)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    if (astronaut) drawAstronaut(ctx, astronaut);
    drawDebug();
    drawFuelBar();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // keyboard: space for thrust
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!ship.landed && !ship.crashed && ship.fuel > 0) ship.thrusting = true;
      // if landed or crashed, ignore
    }
    // restart with R
    if (e.code === 'KeyR') {
      ship.reset(canvas.width/2, 30);
      astronaut = null;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      ship.thrusting = false;
    }
  });

  // arrow keys for left/right thrust
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') { e.preventDefault(); ship.leftThrust = true; }
    if (e.code === 'ArrowRight') { e.preventDefault(); ship.rightThrust = true; }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') ship.leftThrust = false;
    if (e.code === 'ArrowRight') ship.rightThrust = false;
  });

  function drawAstronaut(ctx, a) {
    if (!a) return;
    // exit animation: move down then walk right further, plant flag
    if (a.state === 'exiting') {
      a.progress += 1.6; // faster exit
      a.x = ship.x - 8 + a.progress * 1.8; // walk faster to the right
      a.y = ship.y - ship.height/2 + 2 + Math.min(a.progress*0.3, 22);
      if (a.progress > 110) a.state = 'idle';
    }
    // draw small astronaut: head + body + flag when walking
    ctx.save();
    ctx.translate(a.x, a.y);
    // legs (simple)
    ctx.fillStyle = '#cfcfcf'; ctx.fillRect(-4, 8, 3, 8); ctx.fillRect(1, 8, 3, 8);
    // body
    ctx.fillStyle = '#dcdcdc'; ctx.fillRect(-5, -2, 10, 12);
    // head
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI*2); ctx.fill();
    // visor
    ctx.fillStyle = '#2b65ff'; ctx.beginPath(); ctx.ellipse(0,-8,3.5,2.5,0,0,Math.PI*2); ctx.fill();

    // flag planted / carried: if in exiting state show flag in hand
    if (a.state === 'exiting' || a.state === 'idle') {
      // pole
      ctx.strokeStyle = '#6b4f3b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(6, -28); ctx.stroke();
      // flag
      ctx.fillStyle = '#b71c46';
      ctx.fillRect(8, -28, 28, 16);
      ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText('SUMMIT', 12, -18);
    }
    ctx.restore();
  }

})();
