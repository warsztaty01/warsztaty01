(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight * 0.72);
  }
  window.addEventListener('resize', resize);
  resize();

  const ship = new Ship(canvas.width/2, 80);

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
  }

  function drawDebug() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(10,10,230,82);
    ctx.fillStyle = '#cfe';
    ctx.font = '13px monospace';
    ctx.fillText(`y: ${ship.y.toFixed(1)} px`, 18, 30);
    ctx.fillText(`vy: ${ship.vy.toFixed(1)} px/s`, 18, 48);
    ctx.fillText(`vx: ${ship.vx.toFixed(1)} px/s`, 18, 66);
    ctx.fillText(`fps: ${Math.round(1000 / Math.max(1, Date.now() - last))}`, 120, 30);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); // clamp dt to avoid big jumps
    last = now;

    // update
    ship.update(dt);

    // simple floor collision to prevent falling off screen (no crash handling yet)
    const floorY = canvas.height - 60 - ship.height/2;
    if (ship.y > floorY) {
      ship.y = floorY;
      ship.vy = 0;
    }

    // draw
    drawBackground();
    drawGround();
    ship.draw(ctx);
    drawDebug();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // simple keyboard: space reserved for future thrust
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      // placeholder — thrust not implemented in this module
    }
  });

})();
