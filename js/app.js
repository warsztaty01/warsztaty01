const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ustaw rozmiar płótna (jeśli chcesz, można też ustawić CSS i skalowanie DPI)
canvas.width = 800;
canvas.height = 600;

// Przykładowy stan gry: poruszająca się kula
const state = {
  x: 50,
  y: canvas.height / 2,
  vx: 120, // px/s
  radius: 16
};

let lastTime = 0;

function update(dt) {
  state.x += state.vx * dt;
  if (state.x - state.radius > canvas.width) {
    state.x = -state.radius;
  }
}

function render() {
  // Czyszczenie ekranu każdej klatki
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Opcjonalne tło (jeśli chcesz czarne tło, możesz użyć fillRect zamiast clearRect)
  // ctx.fillStyle = '#000';
  // ctx.fillRect(0,0,canvas.width,canvas.height);

  // Rysuj kulę
  ctx.fillStyle = '#4ee';
  ctx.beginPath();
  ctx.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
  ctx.fill();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000; // delta w sekundach
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
