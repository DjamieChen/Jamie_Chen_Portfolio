/* ========================================
   Bubbles — Speech & Link Bubbles
   ======================================== */

const Bubbles = {
  _speechBubble: null,
  _linkContainer: null,
  _connectorSvg: null,
  _activeBubbles: [],
  
  /**
   * Initialize the bubble system.
   * @param {HTMLElement} avatarContainer — the avatar's parent for positioning
   */
  init(avatarContainer) {
    this._avatarContainer = avatarContainer;
    
    // Create speech bubble element
    const speech = document.createElement('div');
    speech.className = 'speech-bubble';
    speech.setAttribute('id', 'speech-bubble');
    speech.innerHTML = '<span class="speech-text"></span>';
    avatarContainer.appendChild(speech);
    this._speechBubble = speech;
    
    // Create link bubbles container (positioned relative to viewport center)
    const linkContainer = document.createElement('div');
    linkContainer.className = 'link-bubbles-container';
    linkContainer.setAttribute('id', 'link-bubbles');
    avatarContainer.appendChild(linkContainer);
    this._linkContainer = linkContainer;
    
    // Create SVG for connector lines
    const connSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    connSvg.setAttribute('class', 'connector-lines');
    connSvg.setAttribute('id', 'connector-lines');
    connSvg.style.position = 'fixed';
    connSvg.style.inset = '0';
    connSvg.style.width = '100%';
    connSvg.style.height = '100%';
    connSvg.style.pointerEvents = 'none';
    connSvg.style.zIndex = '45';
    document.body.appendChild(connSvg);
    this._connectorSvg = connSvg;
  },
  
  /**
   * Show a speech bubble with typewriter effect.
   * @param {string} text — the text to display
   * @param {object} options — { duration, emoji }
   * @returns {Promise} — resolves when text is fully typed
   */
  speak(text, options = {}) {
    const { emoji = '', showCursor = true, isAngry = false } = options;
    
    return new Promise((resolve) => {
      const textEl = this._speechBubble.querySelector('.speech-text');
      
      // Reset
      textEl.innerHTML = '';
      if (isAngry) {
        this._speechBubble.classList.add('angry');
      } else {
        this._speechBubble.classList.remove('angry');
      }
      this._speechBubble.classList.add('visible');
      
      // Typewriter
      let charIndex = 0;
      const fullText = emoji ? `${text} ${emoji}` : text;
      
      const type = () => {
        if (charIndex < fullText.length) {
          textEl.textContent = fullText.substring(0, charIndex + 1);
          if (showCursor) {
            textEl.innerHTML = fullText.substring(0, charIndex + 1) + '<span class="cursor"></span>';
          }
          charIndex++;
          setTimeout(type, 35 + Math.random() * 25);
        } else {
          // Done typing — remove cursor after a moment
          setTimeout(() => {
            textEl.textContent = fullText;
            resolve();
          }, 400);
        }
      };
      
      type();
    });
  },
  
  /**
   * Hide the speech bubble.
   * @returns {Promise}
   */
  hideSpeech() {
    return new Promise(resolve => {
      this._speechBubble.classList.remove('visible');
      setTimeout(() => {
        this._speechBubble.classList.remove('angry');
        resolve();
      }, 400);
    });
  },
  
  /**
   * Create a single featured link bubble.
   * @param {string} title
   * @param {string} url
   * @param {object} position — { x, y } offset from center
   * @returns {HTMLElement}
   */
  createFeaturedBubble(title, url, position = { x: 0, y: 150 }) {
    const bubble = document.createElement('a');
    bubble.className = 'link-bubble featured';
    bubble.href = url;
    bubble.target = '_blank';
    bubble.rel = 'noopener noreferrer';
    bubble.textContent = title;
    bubble.style.left = `${position.x}px`;
    bubble.style.top = `${position.y}px`;
    bubble.style.transform = 'translate(-50%, -50%) scale(0)';
    
    this._linkContainer.appendChild(bubble);
    this._activeBubbles.push(bubble);
    
    // Animate in with spring
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bubble.classList.add('visible');
        bubble.style.transform = `translate(-50%, -50%) scale(1)`;
        bubble.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
        bubble.style.opacity = '1';
        setTimeout(() => {
          bubble.style.transition = '';
        }, 700);
      });
    });
    
    // Draw connector line
    this._drawConnector(position, bubble);
    
    return bubble;
  },
  
  /**
   * Create multiple link bubbles in a radial pattern.
   * @param {Array<{title: string, url: string}>} items
   */
  createRadialBubbles(items) {
    const count = items.length;
    const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.32;
    
    // Clear any existing
    this.clearBubbles();
    
    items.forEach((item, i) => {
      // Distribute around a circle, starting from top
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      
      // Slight radius variation for organic feel
      const radius = baseRadius + (i % 2 === 0 ? 15 : -10);
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      const bubble = document.createElement('a');
      bubble.className = 'link-bubble';
      bubble.href = item.url;
      bubble.target = '_blank';
      bubble.rel = 'noopener noreferrer';
      bubble.textContent = item.title;
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
      bubble.style.transform = 'translate(-50%, -50%) scale(0)';
      bubble.style.opacity = '0';
      
      this._linkContainer.appendChild(bubble);
      this._activeBubbles.push(bubble);
      
        // Staggered animation
      const delay = i * 80;
      setTimeout(() => {
        bubble.classList.add('visible');
        bubble.style.transition = `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease`;
        bubble.style.opacity = '1';
        bubble.style.transform = 'translate(-50%, -50%) scale(1)';
        
        // After entrance, clear inline transition so CSS hover takes over smoothly
        setTimeout(() => {
          bubble.style.transition = '';
        }, 600);
        
        // Draw connector
        this._drawConnector({ x, y }, bubble, delay);
      }, delay);
    });
  },
  
  /**
   * Draw a dashed connector line from center to a bubble position.
   */
  _drawConnector(position, bubble, delay = 0) {
    if (!this._connectorSvg) return;
    
    // Get avatar center in viewport
    const avatarRect = this._avatarContainer.getBoundingClientRect();
    const cx = avatarRect.left + avatarRect.width / 2;
    const cy = avatarRect.top + avatarRect.height / 2;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', cx + position.x);
    line.setAttribute('y2', cy + position.y);
    line.setAttribute('class', 'connector-line');
    line.style.stroke = 'rgba(0, 0, 0, 0.06)';
    line.style.strokeWidth = '1.5';
    line.style.strokeDasharray = '4 4';
    line.style.opacity = '0';
    line.style.transition = `opacity 0.6s ease ${delay}ms`;
    
    this._connectorSvg.appendChild(line);
    
    requestAnimationFrame(() => {
      line.style.opacity = '1';
    });
  },
  
  /**
   * Clear all link bubbles and connectors.
   */
  clearBubbles() {
    this._activeBubbles.forEach(b => b.remove());
    this._activeBubbles = [];
    
    if (this._connectorSvg) {
      this._connectorSvg.innerHTML = '';
    }
  },
  
  /**
   * Remove the featured bubble specifically.
   */
  clearFeaturedBubble() {
    const featured = this._activeBubbles.filter(b => b.classList.contains('featured'));
    featured.forEach(b => {
      b.style.opacity = '0';
      b.style.transform = 'translate(-50%, -50%) scale(0)';
      setTimeout(() => b.remove(), 500);
    });
    this._activeBubbles = this._activeBubbles.filter(b => !b.classList.contains('featured'));
    
    if (this._connectorSvg) {
      this._connectorSvg.innerHTML = '';
    }
  }
};

window.Bubbles = Bubbles;
