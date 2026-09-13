/* ========================================
   Avatar — SVG Animated Character
   Inspired by bloub.vercel.app
   ======================================== */

const Avatar = {
  // State
  _svg: null,
  _leftEye: null,
  _rightEye: null,
  _leftPupil: null,
  _rightPupil: null,
  _body: null,
  _container: null,
  _offsetX: 0,
  _offsetY: 0,
  _targetOffsetX: 0,
  _targetOffsetY: 0,
  _tiltX: 0,
  _tiltY: 0,
  _targetTiltX: 0,
  _targetTiltY: 0,
  _blinkTimer: null,
  _animFrame: null,
  _expression: 'neutral',
  _isBlinking: false,
  
  // Eye config — responsive & expressive
  EYE_MOVE_RANGE: 26,  // px the eyes can shift toward the mouse
  LERP_FACTOR: 0.16,   // snappy, organic tracking response
  
  // Expression presets — [eyeWidth, eyeHeight, eyeScale]
  EXPRESSIONS: {
    neutral:  { eyeWidth: 26, eyeHeight: 42 },
    happy:    { eyeWidth: 28, eyeHeight: 28 },
    excited:  { eyeWidth: 30, eyeHeight: 48 },
    talking:  { eyeWidth: 26, eyeHeight: 36 },
    angry:    { eyeWidth: 28, eyeHeight: 16 },
    eyeroll:  { eyeWidth: 24, eyeHeight: 38 },
  },
  
  /**
   * Create the SVG avatar inside the given container.
   * @param {HTMLElement} container
   * @returns {SVGElement}
   */
  create(container) {
    this._container = container;
    
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 240');
    svg.setAttribute('class', 'avatar-svg');
    svg.setAttribute('id', 'avatar-svg');
    
    // Definitions — clip path for eyes inside body
    const defs = document.createElementNS(svgNS, 'defs');
    
    // Body clip
    const clipPath = document.createElementNS(svgNS, 'clipPath');
    clipPath.setAttribute('id', 'body-clip');
    const clipCircle = document.createElementNS(svgNS, 'circle');
    clipCircle.setAttribute('cx', '120');
    clipCircle.setAttribute('cy', '120');
    clipCircle.setAttribute('r', '105');
    clipPath.appendChild(clipCircle);
    defs.appendChild(clipPath);
    
    // Subtle gradient for body
    const bodyGrad = document.createElementNS(svgNS, 'radialGradient');
    bodyGrad.setAttribute('id', 'body-gradient');
    bodyGrad.setAttribute('cx', '40%');
    bodyGrad.setAttribute('cy', '35%');
    bodyGrad.setAttribute('r', '65%');
    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#1a1a2e');
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#0a0a0c');
    bodyGrad.appendChild(stop1);
    bodyGrad.appendChild(stop2);
    defs.appendChild(bodyGrad);
    
    svg.appendChild(defs);
    
    // Body circle
    const body = document.createElementNS(svgNS, 'circle');
    body.setAttribute('cx', '120');
    body.setAttribute('cy', '120');
    body.setAttribute('r', '105');
    body.setAttribute('fill', 'url(#body-gradient)');
    body.setAttribute('class', 'avatar-body');
    svg.appendChild(body);
    this._body = body;
    
    // Subtle body highlight
    const highlight = document.createElementNS(svgNS, 'ellipse');
    highlight.setAttribute('cx', '100');
    highlight.setAttribute('cy', '85');
    highlight.setAttribute('rx', '45');
    highlight.setAttribute('ry', '30');
    highlight.setAttribute('fill', 'rgba(255,255,255,0.04)');
    svg.appendChild(highlight);
    
    // Eyes group — clipped to body
    const eyesGroup = document.createElementNS(svgNS, 'g');
    eyesGroup.setAttribute('clip-path', 'url(#body-clip)');
    
    // Left eye
    const leftEyeGroup = document.createElementNS(svgNS, 'g');
    leftEyeGroup.setAttribute('id', 'left-eye-group');
    
    const leftEye = document.createElementNS(svgNS, 'rect');
    leftEye.setAttribute('x', '76');
    leftEye.setAttribute('y', '88');
    leftEye.setAttribute('width', '26');
    leftEye.setAttribute('height', '42');
    leftEye.setAttribute('rx', '13');
    leftEye.setAttribute('ry', '13');
    leftEye.setAttribute('fill', '#ffffff');
    leftEye.setAttribute('class', 'avatar-eye');
    leftEye.setAttribute('id', 'left-eye');
    leftEyeGroup.appendChild(leftEye);
    
    eyesGroup.appendChild(leftEyeGroup);
    
    // Right eye
    const rightEyeGroup = document.createElementNS(svgNS, 'g');
    rightEyeGroup.setAttribute('id', 'right-eye-group');
    
    const rightEye = document.createElementNS(svgNS, 'rect');
    rightEye.setAttribute('x', '132');
    rightEye.setAttribute('y', '88');
    rightEye.setAttribute('width', '26');
    rightEye.setAttribute('height', '42');
    rightEye.setAttribute('rx', '13');
    rightEye.setAttribute('ry', '13');
    rightEye.setAttribute('fill', '#ffffff');
    rightEye.setAttribute('class', 'avatar-eye');
    rightEye.setAttribute('id', 'right-eye');
    rightEyeGroup.appendChild(rightEye);
    
    eyesGroup.appendChild(rightEyeGroup);
    svg.appendChild(eyesGroup);
    
    container.appendChild(svg);
    
    this._svg = svg;
    this._leftEye = leftEye;
    this._rightEye = rightEye;
    
    // Start tracking
    this._startTracking();
    this._startBlinking();
    
    return svg;
  },
  
  /**
   * Start cursor tracking.
   */
  _startTracking() {
    const updateTarget = (clientX, clientY) => {
      if (!this._container) return;
      const rect = this._container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      // Full displacement when cursor is within ~360px
      const reach = Math.min(1, Math.max(0.1, dist / 320));
      this._targetOffsetX = Math.cos(angle) * this.EYE_MOVE_RANGE * reach;
      this._targetOffsetY = Math.sin(angle) * this.EYE_MOVE_RANGE * reach;
      
      // Dynamic tilt: rotate avatar face slightly toward cursor
      const maxTilt = 14;
      const halfW = window.innerWidth / 2 || 1;
      const halfH = window.innerHeight / 2 || 1;
      this._targetTiltX = Math.max(-maxTilt, Math.min(maxTilt, (dx / halfW) * maxTilt));
      this._targetTiltY = Math.max(-maxTilt, Math.min(maxTilt, (-dy / halfH) * maxTilt));
    };

    // Mouse
    document.addEventListener('mousemove', (e) => {
      updateTarget(e.clientX, e.clientY);
    });
    
    // Touch
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        updateTarget(e.touches[0].clientX, e.touches[0].clientY);
      }
    });
    
    // Start animation loop
    this._animate();
  },
  
  /**
   * Animation loop — lerp eye positions and tilt.
   */
  _animate() {
    // Lerp toward target smoothly
    this._offsetX += (this._targetOffsetX - this._offsetX) * this.LERP_FACTOR;
    this._offsetY += (this._targetOffsetY - this._offsetY) * this.LERP_FACTOR;
    this._tiltX += (this._targetTiltX - this._tiltX) * this.LERP_FACTOR;
    this._tiltY += (this._targetTiltY - this._tiltY) * this.LERP_FACTOR;
    
    const expr = this.EXPRESSIONS[this._expression] || this.EXPRESSIONS.neutral;
    const currentH = this._isBlinking ? 3 : expr.eyeHeight;
    const currentRy = this._isBlinking ? 1.5 : Math.min(expr.eyeWidth / 2, expr.eyeHeight / 2);
    
    // Eyes center is around y = 88 + 21 = 109
    const centerY = 88 + expr.eyeHeight / 2;
    const yPos = centerY - currentH / 2 + this._offsetY;
    
    // Apply to eyes
    if (this._leftEye) {
      this._leftEye.setAttribute('x', 76 + this._offsetX);
      this._leftEye.setAttribute('y', yPos);
      this._leftEye.setAttribute('height', currentH);
      this._leftEye.setAttribute('ry', currentRy);
    }
    
    if (this._rightEye) {
      this._rightEye.setAttribute('x', 132 + this._offsetX);
      this._rightEye.setAttribute('y', yPos);
      this._rightEye.setAttribute('height', currentH);
      this._rightEye.setAttribute('ry', currentRy);
    }
    
    // Responsive 3D container tilt toward cursor
    if (this._container) {
      this._container.style.transform = `perspective(700px) rotateY(${this._tiltX}deg) rotateX(${this._tiltY}deg)`;
    }
    
    this._animFrame = requestAnimationFrame(() => this._animate());
  },
  
  /**
   * Start automatic blinking.
   */
  _startBlinking() {
    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 2800; // 2.2–5 seconds
      this._blinkTimer = setTimeout(() => {
        this._blink();
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
  },
  
  /**
   * Perform a blink animation.
   */
  _blink() {
    if (!this._leftEye || !this._rightEye || this._isBlinking) return;
    this._isBlinking = true;
    
    setTimeout(() => {
      this._isBlinking = false;
    }, 150);
  },
  
  /**
   * Set avatar expression.
   * @param {'neutral'|'happy'|'excited'|'talking'} name
   */
  setExpression(name) {
    const expr = this.EXPRESSIONS[name] || this.EXPRESSIONS.neutral;
    this._expression = name;
    
    if (this._leftEye) {
      this._leftEye.setAttribute('width', expr.eyeWidth);
      this._leftEye.setAttribute('height', expr.eyeHeight);
      this._leftEye.setAttribute('rx', expr.eyeWidth / 2);
      this._leftEye.setAttribute('ry', Math.min(expr.eyeHeight / 2, expr.eyeWidth / 2));
    }
    
    if (this._rightEye) {
      this._rightEye.setAttribute('width', expr.eyeWidth);
      this._rightEye.setAttribute('height', expr.eyeHeight);
      this._rightEye.setAttribute('rx', expr.eyeWidth / 2);
      this._rightEye.setAttribute('ry', Math.min(expr.eyeHeight / 2, expr.eyeWidth / 2));
    }
  },
  
  /**
   * Make the avatar clickable.
   */
  setClickable(isClickable) {
    if (this._container) {
      if (isClickable) {
        this._container.classList.add('clickable');
      } else {
        this._container.classList.remove('clickable');
      }
    }
  },
  
  /**
   * Play entrance animation.
   */
  enter() {
    if (this._svg) {
      this._svg.classList.add('entering');
      // Remove after animation to allow float to take over
      setTimeout(() => {
        this._svg.classList.remove('entering');
      }, 900);
    }
  },
  
  /**
   * Set angry visual state with exact angry face image and glowing aura.
   */
  setAngry(isAngry) {
    const angryImg = document.getElementById('avatar-angry-img');
    if (!this._container) return;
    if (isAngry) {
      this._container.classList.add('angry');
      if (angryImg) angryImg.classList.add('visible');
      if (this._svg) this._svg.classList.add('angry-mode');
    } else {
      this._container.classList.remove('angry');
      if (angryImg) angryImg.classList.remove('visible');
      if (this._svg) this._svg.classList.remove('angry-mode');
      this.setExpression('neutral');
    }
  },

  /**
   * Perform intense shake animation.
   */
  shake(duration = 1400) {
    if (!this._container) return;
    this._container.classList.add('shaking');
    setTimeout(() => {
      this._container.classList.remove('shaking');
    }, duration);
  },

  /**
   * Perform an expressive eyeroll animation.
   */
  eyeRoll(duration = 2000) {
    this.setExpression('eyeroll');
    const start = performance.now();
    const roll = (now) => {
      const elapsed = now - start;
      const progress = elapsed / duration;
      if (progress < 1) {
        const angle = progress * Math.PI * 2;
        this._targetOffsetX = Math.sin(angle) * 16;
        this._targetOffsetY = -22 + Math.cos(angle) * 6; // Look up toward top
        requestAnimationFrame(roll);
      } else {
        this._targetOffsetX = 0;
        this._targetOffsetY = 0;
        this.setExpression('neutral');
      }
    };
    requestAnimationFrame(roll);
  },

  /**
   * Clean up.
   */
  destroy() {
    if (this._blinkTimer) clearTimeout(this._blinkTimer);
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }
};

window.Avatar = Avatar;
