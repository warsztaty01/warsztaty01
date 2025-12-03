/* Koło fortuny w czystym JS
   Prosty mechanizm losowania z animacją.
*/

const projects = [
  { title: "Todo App", desc: "Prosta aplikacja do listy zadań (localStorage, CRUD).", color: '#ef476f' },
  { title: "Weather App", desc: "Pobieranie pogody z API i wizualizacja (fetch + responsywność).", color: '#ffd166' },
  { title: "Chat Room", desc: "Prosty chat w czasie rzeczywistym (Socket.IO lub polling).", color: '#06d6a0' },
  { title: "Portfolio", desc: "Responsywne portfolio z animacjami i routingiem." , color: '#118ab2' },
  { title: "Blog CMS", desc: "Prosty blog z edycją i markdown (NetlifyCMS/Static front matter).", color: '#8338ec' }
];

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
let width = canvas.width;
let height = canvas.height;
const cx = width/2;
const cy = height/2;
const radius = Math.min(width, height)/2 - 8;
const segments = projects.length;
let rotation = 0; // radians
let isSpinning = false;

function drawWheel(){
  ctx.clearRect(0,0,width,height);
  const anglePer = (Math.PI * 2) / segments;
  for(let i=0;i<segments;i++){
    const start = rotation + i*anglePer;
    const end = start + anglePer;
    // segment
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,radius,start,end);
    ctx.closePath();
    ctx.fillStyle = projects[i].color;
    ctx.fill();
    // label
    ctx.save();
    ctx.translate(cx,cy);
    const mid = start + anglePer/2;
    ctx.rotate(mid);
    ctx.fillStyle = '#071029';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(projects[i].title, radius - 14, 6);
    ctx.restore();
  }
  // center circle
  ctx.beginPath();
  ctx.arc(cx,cy,48,0,Math.PI*2);
  ctx.fillStyle = '#071029';
  ctx.fill();
}

function resizeIfNeeded(){
  // Support responsive by matching CSS sized canvas
  const rect = canvas.getBoundingClientRect();
  if(canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)){
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    width = canvas.width; height = canvas.height;
  }
}

function render(){
  resizeIfNeeded();
  drawWheel();
  requestAnimationFrame(render);
}

// Spin logic: random target index and easing
function spinToIndex(targetIndex){
  if(isSpinning) return;
  isSpinning = true;
  const fullRotations = Math.floor(Math.random()*4) + 4; // 4-7 full spins
  const anglePer = (Math.PI * 2) / segments;
  // we want the pointer at top (angle = -Math.PI/2). compute target rotation so that segment center aligns with pointer
  const segmentCenterAngle = targetIndex*anglePer + anglePer/2;
  // current rotation mod 2pi
  const current = rotation % (Math.PI*2);
  // compute target rotation value (make rotation decrease so wheel moves clockwise)
  // We'll set finalRotation such that: finalRotation + Math.PI/2 = segmentCenterAngle + k*2pi
  const desired = (Math.PI*2*fullRotations) + (segmentCenterAngle - Math.PI/2);
  const start = rotation;
  const duration = 4500 + Math.floor(Math.random()*1200); // ms
  const startTime = performance.now();

  function animate(now){
    const t = Math.min(1,(now - startTime)/duration);
    // ease out cubic
    const ease = 1 - Math.pow(1-t,3);
    rotation = start + (desired - start) * ease;
    if(t < 1){
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      announceWinner();
    }
  }
  requestAnimationFrame(animate);
}

function pickRandomAndSpin(){
  const idx = Math.floor(Math.random()*segments);
  spinToIndex(idx);
}

function getWinningIndex(){
  // pointer is at top (angle -PI/2). We want which segment covers that angle in wheel coords
  const anglePer = (Math.PI * 2) / segments;
  // compute normalized angle in [0,2pi)
  const final = (rotation + Math.PI/2) % (Math.PI*2);
  const normalized = (final + Math.PI*2) % (Math.PI*2);
  // segment index that starts at rotation + i*anglePer, so index = floor(normalized / anglePer)
  const idx = Math.floor(normalized / anglePer) % segments;
  return idx;
}

function announceWinner(){
  const idx = getWinningIndex();
  const p = projects[idx];
  document.getElementById('resultTitle').textContent = p.title;
  document.getElementById('resultDesc').textContent = p.desc;
  document.getElementById('result').classList.remove('hidden');
}

function resetWheel(){
  rotation = 0;
  document.getElementById('result').classList.add('hidden');
}

// fill projects list UI
function renderProjectsList(){
  const ol = document.getElementById('projectsList');
  ol.innerHTML = '';
  projects.forEach((p,i)=>{
    const li = document.createElement('li');
    li.textContent = `${p.title} — ${p.desc}`;
    ol.appendChild(li);
  });
}

// wire buttons
document.getElementById('spinBtn').addEventListener('click',()=>{
  if(isSpinning) return;
  // pick index by randomness biased to ensure fairness
  pickRandomAndSpin();
});

document.getElementById('resetBtn').addEventListener('click',()=>{
  resetWheel();
});

// initialize
renderProjectsList();
requestAnimationFrame(render);
