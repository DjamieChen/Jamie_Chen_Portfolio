/* ========================================
   Flipping Board — Split-Flap Display
   With random colors & symbols during flips
   ======================================== */

const FlippingBoard = {
  CHARS: ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,-\'',
  SYMBOLS: '★♦♣♠♥●◆▲■◖♪♫☼⬟⬡✦✧◉⬢',
  COLORS: ['green', 'orange', 'red', 'yellow', 'blue', 'violet'],
  
  /**
   * Create the flipping board in a container element.
   * @param {HTMLElement} container
   * @param {string[]} lines — array of strings, each string is a row
   * @param {number} cols — number of columns per row
   */
  create(container, lines, cols) {
    const board = document.createElement('div');
    board.className = 'flipping-board';
    
    const totalRows = lines.length;
    
    for (let r = 0; r < totalRows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      const text = (lines[r] || '').toUpperCase().padEnd(cols, ' ');
      
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'flap-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.dataset.target = text[c] || ' ';
        
        const charEl = document.createElement('div');
        charEl.className = 'flap-char';
        
        // Top half
        const topEl = document.createElement('div');
        topEl.className = 'flap-top';
        const topSpan = document.createElement('span');
        topSpan.textContent = ' ';
        topEl.appendChild(topSpan);
        
        // Bottom half
        const bottomEl = document.createElement('div');
        bottomEl.className = 'flap-bottom';
        const bottomSpan = document.createElement('span');
        bottomSpan.textContent = ' ';
        bottomEl.appendChild(bottomSpan);
        
        // Flip overlay
        const flipEl = document.createElement('div');
        flipEl.className = 'flap-flip';
        const flipSpan = document.createElement('span');
        flipSpan.textContent = ' ';
        flipEl.appendChild(flipSpan);
        
        charEl.appendChild(topEl);
        charEl.appendChild(bottomEl);
        charEl.appendChild(flipEl);
        cell.appendChild(charEl);
        rowEl.appendChild(cell);
      }
      
      board.appendChild(rowEl);
    }
    
    container.appendChild(board);
    return board;
  },
  
  /**
   * Animate the board — flip each cell to its target character.
   * @param {HTMLElement} board
   * @param {number} staggerMs — delay between each cell
   * @returns {Promise} — resolves when all flips complete
   */
  animate(board, staggerMs = 30) {
    const cells = board.querySelectorAll('.flap-cell');
    const promises = [];
    
    cells.forEach((cell, index) => {
      const target = cell.dataset.target;
      if (target === ' ') return;
      
      const charEl = cell.querySelector('.flap-char');
      const topSpan = cell.querySelector('.flap-top span');
      const bottomSpan = cell.querySelector('.flap-bottom span');
      const flipSpan = cell.querySelector('.flap-flip span');
      
      const delay = index * staggerMs;
      
      const p = new Promise(resolve => {
        setTimeout(() => {
          // More intermediate flips for a dramatic effect
          const steps = 4 + Math.floor(Math.random() * 6); // 4-9 intermediate flips
          this._flipSequence(cell, charEl, topSpan, bottomSpan, flipSpan, target, steps, 0, resolve);
        }, delay);
      });
      
      promises.push(p);
    });
    
    return Promise.all(promises);
  },
  
  /**
   * Internal: flip through intermediate characters with random colors and symbols.
   */
  _flipSequence(cell, charEl, topSpan, bottomSpan, flipSpan, target, totalSteps, step, resolve) {
    if (step >= totalSteps) {
      // Final flip to target — remove any color
      cell.removeAttribute('data-color');
      this._flipTo(charEl, topSpan, bottomSpan, flipSpan, target, () => {
        resolve();
      });
      return;
    }
    
    // Pick a random intermediate character — mix of letters and special symbols
    let intermediate;
    if (Math.random() < 0.5) {
      // Use a special symbol
      intermediate = this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
    } else {
      // Use a random alphanumeric
      const randIdx = Math.floor(Math.random() * this.CHARS.length);
      intermediate = this.CHARS[randIdx] || ' ';
    }
    
    // Apply a random color to the cell during intermediate flips
    const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    cell.setAttribute('data-color', color);
    
    this._flipTo(charEl, topSpan, bottomSpan, flipSpan, intermediate, () => {
      this._flipSequence(cell, charEl, topSpan, bottomSpan, flipSpan, target, totalSteps, step + 1, resolve);
    });
  },
  
  /**
   * Internal: perform a single flip transition to a character.
   */
  _flipTo(charEl, topSpan, bottomSpan, flipSpan, char, onComplete) {
    flipSpan.textContent = topSpan.textContent;
    topSpan.textContent = char;
    
    charEl.classList.remove('flipping');
    void charEl.offsetWidth;
    charEl.classList.add('flipping');
    
    setTimeout(() => {
      bottomSpan.textContent = char;
      charEl.classList.remove('flipping');
      if (onComplete) onComplete();
    }, 120); // Slightly faster for more dramatic flipping
  }
};

window.FlippingBoard = FlippingBoard;
