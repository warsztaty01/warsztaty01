// game.js — moduły: App, GameLoop, Renderer
// Komentarze w języku polskim

// GameLoop: zarządza pętlą i wywołuje update/render z dt w sekundach
export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this._running = false;
    this._lastTime = 0;
    this._boundLoop = this._loop.bind(this);
  }

  // Uruchom pętlę
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);
  }

  // Zatrzymaj pętlę
  stop() {
    this._running = false;
  }

  _loop(timestamp) {
    if (!this._running) return;
    const dt = (timestamp - this._lastTime) / 1000; // delta w sekundach
    this._lastTime = timestamp;

    // Ograniczenie dt dla stabilności (np. kiedy karta była uśpiona)
    const clampedDt = Math.min(dt, 0.1);

    // Wywołaj update i render (kolejność: update -> render)
    if (this.updateFn) this.updateFn(clampedDt);
    if (this.renderFn) this.renderFn();

    requestAnimationFrame(this._boundLoop);
  }
}

// Renderer: odpowiada za czyszczenie i rysowanie stanu gry
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // Czyści ekran każdej klatki
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Przykładowa metoda rysująca prosty stan (kulę)
  render(state) {
    this.clear();

    // Przykładowe tło — opcjonalne, używamy czyszczenia, żeby było szybciej
    // this.ctx.fillStyle = '#000';
    // this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

    // Rysuj kulę
    this.ctx.fillStyle = '#4ee';
    this.ctx.beginPath();
    this.ctx.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

// App: łączy wszystko razem i trzyma stan gry
export class App {
  constructor(canvas) {
    this.canvas = canvas;
    // Upewniamy się, że rozmiary płótna są takie jak wymagane
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Stan gry — prosty przykład z poruszającą się kulką
    this.state = {
      x: 50,
      y: this.canvas.height / 2,
      vx: 120, // px/s
      radius: 16
    };

    this.renderer = new Renderer(this.canvas);

    // Bind funkcji update/render
    this.loop = new GameLoop(this.update.bind(this), this.render.bind(this));
  }

  // Metoda update przyjmuje dt w sekundach
  update(dt) {
    // Prosta logika: przesuwamy kulę w prawo i zawijamy po przekroczeniu szerokości
    this.state.x += this.state.vx * dt;
    if (this.state.x - this.state.radius > this.canvas.width) {
      this.state.x = -this.state.radius;
    }
  }

  render() {
    this.renderer.render(this.state);
  }

  // Uruchom grę
  start() {
    console.log('Gra uruchomiona — App.start()'); // log startu gry w konsoli
    this.loop.start();
  }

  stop() {
    this.loop.stop();
  }
}

// Jeśli plik jest ładowany bezpośrednio jako moduł, automatycznie utwórz i uruchom App
// Dzięki temu wystarczy załadować <script type="module" src="game.js"></script>
// aby zobaczyć działający przykład.

// Znajdź canvas w dokumencie i uruchom aplikację
const canvas = document.getElementById('gameCanvas');
if (canvas) {
  const app = new App(canvas);
  // Krótki log informujący o inicjalizacji
  console.log('Inicjalizacja aplikacji...');
  app.start();
}
