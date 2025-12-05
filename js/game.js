// Bingo game logic — updated: no FREE center, modern UI helpers
(function(){
  const BOARD_SIZE = 5;
  const boardEl = document.getElementById('board');
  const entriesFile = document.getElementById('entriesFile');
  const fileNameEl = document.getElementById('fileName');
  const generateBtn = document.getElementById('generateBtn');
  const drawBtn = document.getElementById('drawBtn');
  const resetBtn = document.getElementById('resetBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const nextCallEl = document.getElementById('nextCall');
  const callsLogEl = document.getElementById('callsLog');
  const bingoOverlay = document.getElementById('bingoOverlay');

  let allEntries = [];
  let callsPool = [];
  let callsDrawn = [];
  let cells = []; // {text, el, marked}
  let boardState = null; // store board state for persistence

  function readFile(file){
    return new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onload = ()=>resolve(fr.result);
      fr.onerror = ()=>reject(fr.error);
      fr.readAsText(file,'utf-8');
    });
  }



  drawBtn.addEventListener('click', ()=>{
    drawCall();
  });

  function resetCalls(){
    callsPool = allEntries.slice();
    callsDrawn = [];
    updateCallsUI();
  }

  function updateCallsUI(){
    nextCallEl.textContent = callsPool.length ? `Następne: ${callsPool[0]}` : 'Następne: —';
    callsLogEl.textContent = callsDrawn.join(' — ');
  }

  function generateBoard(){
    const unique = Array.from(new Set(allEntries));
    const needed = BOARD_SIZE*BOARD_SIZE;
    if(unique.length < needed){
      if(!confirm('Za mało unikalnych wpisów do pełnej planszy. Powtórzyć wpisy?')) return;
    }
    const pool = duplicateAndShuffle(unique, needed);
    cells = [];
    boardEl.innerHTML = '';

    let i = 0;
    for(let r=0;r<BOARD_SIZE;r++){
      for(let c=0;c<BOARD_SIZE;c++){
        const idx = r*BOARD_SIZE + c;
        const cell = document.createElement('div');
        cell.className = 'cell';
        const text = pool[i++] || '';
        cell.textContent = text;
        cells.push({text,el:cell,marked:false});
        cell.addEventListener('click', ()=>{
          toggleMark(idx);
        });
        boardEl.appendChild(cell);
      }
    }
    resetCalls();
    updateBoardUI();
    
    // Save board state to localStorage
    boardState = {
      entries: cells.map(c=>({text:c.text, marked:c.marked})),
      drawn: callsDrawn.slice(),
      pool: callsPool.slice()
    };
    localStorage.setItem('bingoState', JSON.stringify(boardState));
  }

  function duplicateAndShuffle(arr, needed){
    const out = [];
    const pool = arr.slice();
    while(out.length < needed){
      if(pool.length===0) pool.push(...arr);
      const i = Math.floor(Math.random()*pool.length);
      out.push(pool.splice(i,1)[0]);
    }
    return shuffleArray(out);
  }

  function shuffleArray(a){
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function toggleMark(index){
    const item = cells[index];
    if(!item) return;
    item.marked = !item.marked;
    item.el.classList.toggle('marked', item.marked);
    checkBingo();
    
    // Save state after toggle
    boardState = {
      entries: cells.map(c=>({text:c.text, marked:c.marked})),
      drawn: callsDrawn.slice(),
      pool: callsPool.slice()
    };
    localStorage.setItem('bingoState', JSON.stringify(boardState));
  }

  function updateBoardUI(){
    cells.forEach(cell=>{
      cell.el.classList.toggle('marked', !!cell.marked);
    });
  }

  function checkBingo(){
    const n = BOARD_SIZE;
    // build matrix of booleans
    const marked = Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>{
      const idx = r*n + c;
      return cells[idx] && cells[idx].marked;
    }));

    // check rows
    for(let r=0;r<n;r++){
      if(marked[r].every(Boolean)) return announceBingo();
    }
    // cols
    for(let c=0;c<n;c++){
      let ok = true;
      for(let r=0;r<n;r++) if(!marked[r][c]) {ok=false;break}
      if(ok) return announceBingo();
    }
    // diag
    let ok = true;
    for(let i=0;i<n;i++) if(!marked[i][i]) {ok=false;break}
    if(ok) return announceBingo();
    ok = true;
    for(let i=0;i<n;i++) if(!marked[i][n-1-i]) {ok=false;break}
    if(ok) return announceBingo();
  }

  let bingoShown = false;
  function announceBingo(){
    if(bingoShown) return;
    bingoShown = true;
    showBingo();
  }

  function showBingo(){
    bingoOverlay.classList.add('show');
    bingoOverlay.setAttribute('aria-hidden','false');
    setTimeout(()=>{
      bingoOverlay.classList.remove('show');
      bingoOverlay.setAttribute('aria-hidden','true');
      bingoShown = false;
    },5000);
  }

  function drawCall(){
    if(callsPool.length===0){
      alert('Brak więcej wpisów do losowania.');
      return;
    }
    const i = Math.floor(Math.random()*callsPool.length);
    const item = callsPool.splice(i,1)[0];
    callsDrawn.push(item);
    // auto-mark any matching cell
    cells.forEach(c=>{
      if(c.text === item){
        c.marked = true;
        c.el.classList.add('marked');
      }
    });
    updateCallsUI();
    checkBingo();
    
    // Save state after draw
    boardState = {
      entries: cells.map(c=>({text:c.text, marked:c.marked})),
      drawn: callsDrawn.slice(),
      pool: callsPool.slice()
    };
    localStorage.setItem('bingoState', JSON.stringify(boardState));
  }

  function resetBoard(){
    cells = [];
    boardEl.innerHTML = '';
    bingoOverlay.classList.remove('show');
    bingoOverlay.setAttribute('aria-hidden','true');
    bingoShown = false;
  }

  function shuffleBoard(){
    // shuffle texts among all cells
    const texts = cells.map(c=>c.text);
    const shuffled = shuffleArray(texts);
    let si=0;
    cells.forEach(c=>{
      c.text = shuffled[si++] || '';
      c.el.textContent = c.text;
      c.marked = false;
      c.el.classList.remove('marked');
    });
    bingoShown = false;
  }

  // Restore board state from localStorage if available
  function restoreBoardState(){
    const saved = localStorage.getItem('bingoState');
    if(!saved) return false;
    
    try{
      boardState = JSON.parse(saved);
      cells = [];
      boardEl.innerHTML = '';
      
      boardState.entries.forEach((entry, idx)=>{
        const cell = document.createElement('div');
        cell.className = 'cell';
        if(entry.marked) cell.classList.add('marked');
        cell.textContent = entry.text;
        cells.push({text:entry.text, el:cell, marked:entry.marked});
        cell.addEventListener('click', ()=>{
          toggleMark(idx);
        });
        boardEl.appendChild(cell);
      });
      
      callsDrawn = boardState.drawn.slice();
      callsPool = boardState.pool.slice();
      updateCallsUI();
      
      console.info('Restored board state from localStorage');
      return true;
    }catch(err){
      console.error('Failed to restore board state:', err);
      localStorage.removeItem('bingoState');
      return false;
    }
  }

  // Auto-load sample entries from embedded data
  function loadSampleData(){
    // Try to restore saved state first
    if(restoreBoardState()){
      console.info('Board restored from previous session');
      return;
    }
    
    const entries = window.SAMPLE_ENTRIES || [];
    if(entries.length > 0){
      allEntries = entries;
      resetCalls();
      if(fileNameEl) fileNameEl.textContent = 'sample.txt (' + entries.length + ' wpisów)';
      console.info(`Loaded ${entries.length} entries`);
      generateBoard();
    }else{
      if(fileNameEl) fileNameEl.textContent = 'Brak danych';
      console.error('No entries found');
    }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    loadSampleData();
  });

  // expose helpers for debugging in console
  window.BingoApp = {generateBoard,resetBoard,drawCall,shuffleBoard,allEntries};

})();
