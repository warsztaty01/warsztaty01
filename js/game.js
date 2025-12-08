// Bingo game logic — audio mode: no draw button, no call tracking
(function(){
  const BOARD_SIZE = 5;
  const boardEl = document.getElementById('board');
  const bingoOverlay = document.getElementById('bingoOverlay');

  let allEntries = [];
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
        const inner = document.createElement('div');
        inner.className = 'text';
        inner.textContent = text;
        cell.appendChild(inner);
        cells.push({text,el:cell,marked:false});
        cell.addEventListener('click', ()=>{
          toggleMark(idx);
        });
        boardEl.appendChild(cell);
      }
    }
    updateBoardUI();
    // adjust font-size for long strings so they fit gracefully
    fitTextAll();
    
    // Save board state to localStorage
    boardState = {
      entries: cells.map(c=>({text:c.text, marked:c.marked}))
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
      entries: cells.map(c=>({text:c.text, marked:c.marked}))
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
    // Removed - audio bingo mode doesn't need draw functionality
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
      const inner = c.el.querySelector('.text');
      if(inner) inner.textContent = c.text;
      c.marked = false;
      c.el.classList.remove('marked');
    });
    bingoShown = false;
    fitTextAll();
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
        const inner = document.createElement('div');
        inner.className = 'text';
        inner.textContent = entry.text;
        cell.appendChild(inner);
        cells.push({text:entry.text, el:cell, marked:entry.marked});
        cell.addEventListener('click', ()=>{
          toggleMark(idx);
        });
        boardEl.appendChild(cell);
      });
      
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
    // Try to fetch entries from file first. If that succeeds we'll generate/overwrite the board.
    // If fetch fails (file:// or network) then we'll try to restore saved state and show fallback.
    fetchAndApplyEntries().catch(err=>{
      console.warn('Could not fetch entries automatically:', err);
      // Try to restore saved board state if available
      if(restoreBoardState()){
        console.info('Board restored from previous session');
      }else{
        // show fallback picker so user can load file manually
        showFilePickerFallback(err && err.message ? err.message : 'Fetch failed');
      }
    });
  }

  // Fetch entries using fetch API and cache-bust; return text
  function fetchEntriesText(){
    const url = 'entries/sample.txt?' + Date.now();
    return fetch(url, {cache: 'no-store'}).then(resp=>{
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.text();
    });
  }

  // Fetch entries and apply them to the board. Resolves when applied.
  let _lastFetchedText = null;
  function fetchAndApplyEntries(){
    return fetchEntriesText().then(text=>{
      removeFilePickerFallback();
      const normalized = text.replace(/\r\n/g,'\n').trim();
      if(!normalized){
        throw new Error('sample.txt is empty');
      }
      // If file content hasn't changed, do nothing
      if(_lastFetchedText !== null && _lastFetchedText === normalized){
        // start polling if not already
        startEntriesPolling();
        return;
      }
      _lastFetchedText = normalized;
      const lines = normalized.split(/\n/).map(s=>s.trim()).filter(Boolean);
      if(lines.length === 0) throw new Error('No entries in sample.txt');
      allEntries = lines;
      console.info(`Loaded ${lines.length} entries from sample.txt`);
      // Generate a fresh board based on the file contents (overwrite any saved board)
      generateBoard();
      // After successful initial fetch, start polling for changes
      startEntriesPolling();
    });
  }

  // Poll the entries file periodically to detect changes when served over HTTP
  let _pollIntervalId = null;
  function startEntriesPolling(intervalMs = 5000){
    // If already polling, don't start again
    if(_pollIntervalId) return;
    _pollIntervalId = setInterval(()=>{
      fetchEntriesText().then(text=>{
        const normalized = text.replace(/\r\n/g,'\n').trim();
        if(_lastFetchedText === null) _lastFetchedText = normalized;
        if(normalized !== _lastFetchedText){
          console.info('Entries file changed; reloading board');
          _lastFetchedText = normalized;
          const lines = normalized.split(/\n/).map(s=>s.trim()).filter(Boolean);
          if(lines.length>0){
            allEntries = lines;
            generateBoard();
          }
        }
      }).catch(err=>{
        // stop polling if fetch consistently fails (could be file:// context)
        console.debug('Polling fetch failed, stopping poll:', err);
        stopEntriesPolling();
      });
    }, intervalMs);
  }

  function stopEntriesPolling(){
    if(_pollIntervalId) clearInterval(_pollIntervalId);
    _pollIntervalId = null;
  }

    // If XHR fails (file:// or security), present a small file picker so user can load sample.txt manually.
    function showFilePickerFallback(reason){
      // avoid creating multiple pickers
      if(document.getElementById('bingo-filepicker')) return;
      const container = document.createElement('div');
      container.id = 'bingo-filepicker';
      container.style.position = 'fixed';
      container.style.left = '16px';
      container.style.bottom = '16px';
      container.style.zIndex = 2000;
      container.style.padding = '10px 12px';
      container.style.background = 'rgba(0,0,0,0.5)';
      container.style.color = '#f9e79f';
      container.style.border = '1px solid rgba(212,165,116,0.15)';
      container.style.borderRadius = '10px';
      container.style.fontSize = '13px';
      container.innerHTML = `Nie można automatycznie wczytać pliku (${reason}).<br/>Wczytaj ręcznie: `;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt';
      input.style.marginLeft = '8px';
      input.onchange = async (e)=>{
        const f = e.target.files && e.target.files[0];
        if(!f) return;
        try{
          const text = await readFile(f);
          const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
          if(lines.length>0){
            allEntries = lines;
            removeFilePickerFallback();
            generateBoard();
          }
        }catch(err){
          console.error('Failed to read file', err);
          alert('Błąd wczytywania pliku');
        }
      };
      container.appendChild(input);

      const hint = document.createElement('div');
      hint.style.marginTop = '8px';
      hint.style.fontSize = '12px';
      hint.style.opacity = '0.8';
      hint.innerHTML = 'Jeśli używasz lokalnego pliku, uruchom prosty serwer HTTP, np.:<br/><code>pwsh -c "python -m http.server 8000"</code>';
      container.appendChild(hint);

      document.body.appendChild(container);
    }

    function removeFilePickerFallback(){
      const el = document.getElementById('bingo-filepicker');
      if(el) el.remove();
    }

  function loadSampleDataOld(){
    // Fallback to old method if needed
    const entries = window.SAMPLE_ENTRIES || [];
    if(entries.length > 0){
      allEntries = entries;
      console.info(`Loaded ${entries.length} entries`);
      generateBoard();
    }else{
      console.error('No entries found');
    }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    loadSampleData();
  });

  // expose helpers for debugging in console
  window.BingoApp = {generateBoard,allEntries};

  // Text autosize helpers: shrink text inside `.text` until it fits its `.cell`
  function fitText(el){
    const inner = el.querySelector('.text');
    if(!inner) return;
    // prepare text element for measurement
    inner.style.whiteSpace = 'normal';
    inner.style.wordBreak = 'break-word';
    inner.style.lineHeight = '1.08';

    const elStyle = window.getComputedStyle(el);
    const padX = (parseFloat(elStyle.paddingLeft) || 0) + (parseFloat(elStyle.paddingRight) || 0) + 4;
    const padY = (parseFloat(elStyle.paddingTop) || 0) + (parseFloat(elStyle.paddingBottom) || 0) + 4;
    const maxWidth = Math.max(8, el.clientWidth - padX);
    const maxHeight = Math.max(8, el.clientHeight - padY);

    // binary-search for the largest font-size that fits both width and height
    const innerStyle = window.getComputedStyle(inner);
    const defaultSize = parseFloat(innerStyle.fontSize) || 18;
    const maxSize = Math.max(defaultSize, 36);
    const minSize = 12; // don't scale below this for readability
    let low = minSize, high = maxSize, best = minSize;
    // use a temporary forced width to allow accurate scroll measurement on some browsers
    inner.style.display = 'inline-block';
    inner.style.width = 'auto';
    for(let i=0;i<7;i++){ // 7 iterations -> enough precision
      const mid = Math.floor((low + high) / 2);
      inner.style.fontSize = mid + 'px';
      // force reflow measurement
      const sw = inner.scrollWidth;
      const sh = inner.scrollHeight;
      if(sw <= maxWidth && sh <= maxHeight){
        best = mid;
        low = mid + 1;
      }else{
        high = mid - 1;
      }
    }
    inner.style.fontSize = best + 'px';
    // If even the best font still overflows vertically, fall back to clamped 3-line ellipsis at minSize
    if(inner.scrollHeight > maxHeight){
      inner.style.fontSize = minSize + 'px';
      inner.classList.add('clamped');
    }else{
      inner.classList.remove('clamped');
    }
    // restore display block so wrapping keeps working nicely
    inner.style.display = '';
  }

  function fitTextAll(){
    if(!cells || !cells.length) return;
    cells.forEach(c=>{
      if(c && c.el) fitText(c.el);
    });
  }

  // debounce helper for resize
  function debounce(fn, wait){
    let t = null;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(()=>fn.apply(this,args), wait);
    };
  }

  window.addEventListener('resize', debounce(()=>{
    fitTextAll();
  }, 120));

  // Re-run autosize after webfonts are ready (helps when Google Fonts load late)
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>{
      setTimeout(()=>fitTextAll(), 60);
    }).catch(()=>{});
  }

})();
