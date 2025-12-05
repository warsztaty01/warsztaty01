// Street Cross — game.js
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('overlay');
  const scoreEl = document.getElementById('score');
  const lanesInput = document.getElementById('lanes');
  const lanesVal = document.getElementById('lanesVal');

  let W = 600, H = 720; // canvas size
  canvas.width = W; canvas.height = H;

  const ASSETS = {
    character: {
      up: 'images/character/chup.png',
      down: 'images/character/chdown.png',
      left: 'images/character/chleft.png',
      right: 'images/character/chright.png'
    },
    cars: [
      'images/cars/1right.png','images/cars/1left.png',
      'images/cars/2right.png','images/cars/2left.png',
      'images/cars/3right.png','images/cars/3left.png'
    ],
    obstacles: ['images/obstacles/zus.png','images/obstacles/krs.png'],
    points: ['images/points/euro.png']
  };

  const images = {};
  function loadImages(list, callback){
    const keys = Object.keys(list);
    let total = 0, loaded = 0;
    // count entries
    function countEntries(obj){
      let c=0;
      for(const k in obj){
        if(Array.isArray(obj[k])) c += obj[k].length;
        else if(typeof obj[k] === 'object') c += Object.keys(obj[k]).length;
        else c++;
      }
      return c;
    }
    total = countEntries(list);
    // load each
    for(const k in list){
      const v = list[k];
      if(Array.isArray(v)){
        images[k] = [];
        v.forEach((src,i)=>{
          const img = new Image(); img.src = src; img.onload = ()=>{ loaded++; if(loaded===total) callback(); }
          images[k][i] = img;
        })
      } else {
        images[k] = {};
        for(const sub in v){
          const img = new Image(); img.src = v[sub]; img.onload = ()=>{ loaded++; if(loaded===total) callback(); }
          images[k][sub] = img;
        }
      }
    }
  }

  // Game state
  let lanesCount = Number(lanesInput.value);
  lanesVal.textContent = lanesCount;
  lanesInput.addEventListener('input', ()=>{ lanesCount = Number(lanesInput.value); lanesVal.textContent = lanesCount; });

  const TILE = 48;
  let player, lanes, grassZones, carsByLane, obstacles, points, score, running;

  function initState(){
    // Layout: bottom safe grass (start), then alternate road/grass lanesCount times, then top safe grass
    const laneHeight = 80; // road lane height
    const grassH = 60;
    grassZones = [];
    lanes = [];
    let y = H - grassH - TILE; // start player on bottom safe grass area
    // bottom grass
    grassZones.push({y: H - grassH, h: grassH});
    // build lanes up from bottom
    for(let i=0;i<lanesCount;i++){
      // road above bottom grass
      const roadY = H - grassH - (i+1)*laneHeight - i*grassH;
      lanes.push({y: roadY, h: laneHeight, dir: Math.random() < 0.5 ? 'right' : 'left', speedBase: 80 + Math.random()*80});
      // grass above that road
      const gy = roadY - grassH;
      grassZones.push({y: gy, h: grassH});
    }
    // top grass zone (might be off-calc) ensure top exists
    const top = grassZones[grassZones.length-1];
    if(top.y < 0){ /* fine */ }

    // initial player position: bottom center
    player = {x: W/2 - TILE/2, y: H - grassH - TILE, w: TILE, h: TILE, dir:'up'};

    carsByLane = lanes.map(()=>[]);
    obstacles = [];
    points = [];
    score = 0; scoreEl.textContent = score;
    running = true;
    overlay.classList.add('hidden');

    // initialize spawn timers per lane
    initSpawnTimers();

    // create some obstacles on random grass zones (except bottom where player starts maybe)
    grassZones.forEach((g,gi)=>{
      const count = Math.random() < 0.6 ? 1 : 0;
      for(let k=0;k<count;k++){
        const img = images.obstacles[Math.floor(Math.random()*images.obstacles.length)];
        const ox = Math.random()*(W - TILE);
        const oy = g.y + Math.random()*Math.max(0, g.h - TILE);
        obstacles.push({x:ox,y:oy,w:TILE,h:TILE,img});
      }
    });

    // points: some on grass and some on roads
    // on grass
    grassZones.forEach(g=>{
      if(Math.random()<0.6){
        const img = images.points[0];
        const px = Math.random()*(W - 24);
        const py = g.y + Math.random()*(g.h - 24);
        points.push({x:px,y:py,w:24,h:24,img});
      }
    });
    // on roads
    lanes.forEach(ln=>{
      if(Math.random()<0.7){
        const img = images.points[0];
        const px = Math.random()*(W - 24);
        const py = ln.y + 10 + Math.random()*(ln.h - 24);
        points.push({x:px,y:py,w:24,h:24,img});
      }
    });
  }

  // Spawn cars periodically per lane (attempt)
  // per-lane spawn timers to ensure independent spawn behavior
  function initSpawnTimers(){
    lanes.forEach(ln=>{ ln.spawnTimer = 0; ln.nextSpawn = 0.5 + Math.random()*1.5; });
  }

  function trySpawn(dt){
    lanes.forEach((ln, idx)=>{
      ln.spawnTimer += dt;
      if(ln.spawnTimer < ln.nextSpawn) return;
      ln.spawnTimer = 0; ln.nextSpawn = 0.6 + Math.random()*1.8;

      const dir = ln.dir;
      const carImgs = images.cars.filter(img=> img.src.includes(dir));
      const carImg = carImgs[Math.floor(Math.random()*carImgs.length)];
      const w = 64, h = 40;
      const y = ln.y + (ln.h - h)/2;
      const baseSpeed = ln.speedBase * (0.6 + Math.random()*1.2);
      const x = dir === 'right' ? -w - 10 : W + 10;

      // ensure spacing within the lane only
      const laneCars = carsByLane[idx];
      const spawnBuffer = 140;
      let blocked = false;
      for(const c of laneCars){
        if(dir === 'right'){
          if(c.x < spawnBuffer) { blocked = true; break; }
        } else {
          if(c.x > W - spawnBuffer) { blocked = true; break; }
        }
      }
      if(!blocked){ laneCars.push({x,y,w,h,baseSpeed,dir,img:carImg}); }
    });
  }

  function rectsOverlap(a,b){ return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }

  // Update cars and avoid car-car collisions by limiting speed
  function updateCars(dt){
    carsByLane.forEach((laneCars, idx)=>{
      const ln = lanes[idx];
      // sort depending on direction so head is first
      laneCars.sort((a,b)=> ln.dir==='right' ? a.x - b.x : b.x - a.x);
      for(let i=0;i<laneCars.length;i++){
        const car = laneCars[i];
        const dirFactor = car.dir === 'right' ? 1 : -1;
        const desired = car.x + dirFactor * car.baseSpeed * dt;

        // determine lead car
        let lead = null;
        if(i>0) lead = laneCars[i-1];
        const minGap = 20;
        if(lead){
          if(car.dir === 'right'){
            const allowed = lead.x - car.w - minGap;
            car.x = Math.min(desired, allowed);
          } else {
            const allowed = lead.x + lead.w + minGap;
            car.x = Math.max(desired, allowed);
          }
        } else {
          car.x = desired;
        }
      }
      // remove offscreen
      for(let i=laneCars.length-1;i>=0;i--){
        const c = laneCars[i];
        if(c.x < -300 || c.x > W + 300) laneCars.splice(i,1);
      }
    });
  }

  function update(dt){
    if(!running) return;
    trySpawn(dt);
    updateCars(dt);

    // check collisions with player
    for(const laneCars of carsByLane){
      for(const c of laneCars){ if(rectsOverlap(c, player)) { gameOver('lose'); return; } }
    }

    // check if reached topmost safe grass -> win
    if(grassZones.length){
      const topGrass = grassZones[grassZones.length - 1];
      if(player.y <= topGrass.y + 4){ gameOver('win'); return; }
    }

    // collect points
    for(let i=points.length-1;i>=0;i--){
      if(rectsOverlap(points[i], player)){
        points.splice(i,1); score++; scoreEl.textContent = score;
      }
    }
  }

  function gameOver(kind){
    running = false;
    const title = document.getElementById('overlayTitle');
    if(kind === 'win') title.textContent = `Wygrałeś! Punkty: ${score}`;
    else title.textContent = `Przegrałeś! Punkty: ${score}`;
    overlay.classList.remove('hidden');
  }

  function render(){
    // background grass
    ctx.clearRect(0,0,W,H);
    // draw zones: draw roads
    ctx.fillStyle = '#7ec850'; ctx.fillRect(0,0,W,H);
    lanes.forEach((ln, idx)=>{
      ctx.fillStyle = '#333'; ctx.fillRect(0, ln.y, W, ln.h);
      // dashed center lines
      ctx.fillStyle = '#fff';
      const stripeW = 30;
      for(let x = 0; x < W; x += stripeW*2){
        ctx.fillRect(x, ln.y + ln.h/2 - 4, stripeW, 8);
      }
    });

    // draw obstacles
    obstacles.forEach(o=>{ ctx.drawImage(o.img, o.x, o.y, o.w, o.h); });
    // draw points
    points.forEach(p=>{ ctx.drawImage(p.img, p.x, p.y, p.w, p.h); });

    // draw cars
    carsByLane.forEach(lc=>{ lc.forEach(c=>{ ctx.save(); if(c.dir==='left') ctx.scale(-1,1); if(c.dir==='left') ctx.drawImage(c.img, -c.x - c.w, c.y, c.w, c.h); else ctx.drawImage(c.img, c.x, c.y, c.w, c.h); ctx.restore(); }) });

    // draw player
    const pImg = images.character[player.dir] || images.character.up;
    ctx.drawImage(pImg, player.x, player.y, player.w, player.h);
  }

  // input handling — move by TILE, but prevent walking into obstacles or outside canvas
  window.addEventListener('keydown', (ev)=>{
    if(!running) return;
    const key = ev.key;
    let nx = player.x, ny = player.y;
    if(key === 'ArrowUp'){ ny -= TILE; player.dir='up'; }
    else if(key === 'ArrowDown'){ ny += TILE; player.dir='down'; }
    else if(key === 'ArrowLeft'){ nx -= TILE; player.dir='left'; }
    else if(key === 'ArrowRight'){ nx += TILE; player.dir='right'; }
    else return;
    ev.preventDefault();
    // clamp to canvas
    nx = Math.max(0, Math.min(W - player.w, nx));
    ny = Math.max(0, Math.min(H - player.h, ny));
    const candidate = {x:nx,y:ny,w:player.w,h:player.h};
    // obstacle collision
    for(const o of obstacles) if(rectsOverlap(candidate, o)) return;
    player.x = nx; player.y = ny;
  });

  // game loop
  let last = performance.now();
  function loop(now){
    const dt = (now - last)/1000; last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // Start / restart
  startBtn.addEventListener('click', ()=>{ initState(); });
  restartBtn.addEventListener('click', ()=>{ initState(); });

  // initial load
  loadImages(ASSETS, ()=>{ initState(); requestAnimationFrame(loop); });

})();
