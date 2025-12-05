(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight * 0.72);
  }
  window.addEventListener('resize', resize);
  resize();

  // Start higher (smaller y) so the ship falls longer on load
  const ship = new Ship(canvas.width/2, 30);

  // astronaut that exits after safe landing
  let astronaut = null;

  // landing rules
  const SAFE_LANDING_VY = 90; // px/s allowed vertical speed for safe landing

  let last = performance.now();

  function drawBackground() {
    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#041428');
    g.addColorStop(1,'#071223');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  function drawGround() {
    ctx.fillStyle = '#203a2f';
    const h = 60;
    ctx.fillRect(0, canvas.height - h, canvas.width, h);
    // simple landing pad marker in center
    ctx.fillStyle = '#aeb';
    const padW = 140;
    const padH = 8;
    ctx.fillRect((canvas.width-padW)/2, canvas.height - h - padH/2, padW, padH);
  }

  function drawDebug() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(10,10,260,120);
    ctx.fillStyle = '#cfe';
    ctx.font = '13px monospace';
    ctx.fillText(`y: ${ship.y.toFixed(1)} px`, 18, 30);
    ctx.fillText(`vy: ${ship.vy.toFixed(1)} px/s`, 18, 48);
    ctx.fillText(`fuel: ${ship.fuel.toFixed(0)} / ${ship.maxFuel}`, 18, 66);
    ctx.fillText(`state: ${ship.landed? 'LANDED' : ship.crashed ? 'CRASHED' : ship.thrusting ? 'THRUST' : 'FALLING'}`, 18, 86);
    ctx.fillText(`fps: ${Math.round(1000 / Math.max(1, Date.now() - last))}`, 160, 30);
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

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); // clamp dt to avoid big jumps
    last = now;


    // update with precise collision detection
    const floorY = canvas.height - 60 - ship.height/2;
    const result = ship.update(dt, floorY);
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
      }
    }

    // if crashed, add a simple shake/effect (no physics)
    if (ship.crashed) {
      // could implement explosion; for now tint the background red overlay
      ctx.fillStyle = 'rgba(120,10,10,0.15)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    // draw
    drawBackground();
    drawGround();
    ship.draw(ctx);
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

  function drawAstronaut(ctx, a) {
    if (!a) return;
    // simple exit animation: move down and then right a bit
    if (a.state === 'exiting') {
      a.progress += 0.6; // speed of exit
      a.x = ship.x - 8 + a.progress * 0.5;
      a.y = ship.y - ship.height/2 + 2 + Math.min(a.progress, 20);
      if (a.progress > 50) a.state = 'idle';
    }
    // draw small astronaut: head + body
    ctx.save();
    ctx.translate(a.x, a.y);
    // head
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI*2); ctx.fill();
    // visor
    ctx.fillStyle = '#3a6eff'; ctx.beginPath(); ctx.ellipse(0,-6,3.5,2.5,0,0,Math.PI*2); ctx.fill();
    // body
    ctx.fillStyle = '#dcdcdc'; ctx.fillRect(-4, -1, 8, 12);
    ctx.restore();
  }

})();
