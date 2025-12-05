import Game from './game.js';

document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  game.start();
});
