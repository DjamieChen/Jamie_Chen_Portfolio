/* Hamster behavior patch: smaller, always behind portfolio text, and no corner backflips. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    #hamster-runner {
      z-index: 16 !important;
      transform-origin: 36px 36px !important;
    }

    .wheel-and-hamster {
      font-size: 4.8px !important;
    }

    /* Keep all actual content above the decorative hamster. */
    #avatar-stage,
    .speech-bubble,
    .link-bubbles-container,
    .link-bubble,
    #contact-remote-container,
    .contact-remote,
    #music-btn,
    #intro-screen {
      position: relative;
      z-index: 50;
    }

    #avatar-stage,
    #music-btn,
    #intro-screen,
    #contact-remote-container {
      position: fixed;
    }
  `;
  document.head.appendChild(style);

  if (typeof HamsterRunner === 'undefined') return;

  // The visible wheel is now 72px (15em × 4.8px).
  HamsterRunner._wheelSize = 72;
  HamsterRunner._speed = 1.7;

  // Replace the perimeter step so the runner translates around the screen
  // without rotating the whole hamster/wheel at corners. This eliminates the
  // occasional apparent backflip caused by 90°/360° orientation transitions.
  HamsterRunner._step = function () {
    if (!this._running || !this._el) return;

    const wheelSize = this._wheelSize || 72;
    const minX = 0;
    const maxX = Math.max(0, window.innerWidth - wheelSize);
    const minY = 0;
    const maxY = Math.max(0, window.innerHeight - wheelSize);

    switch (this._edge) {
      case 0: // top: left -> right
        this._y = minY;
        this._x += this._speed;
        if (this._flipEl) this._flipEl.style.transform = 'scaleX(-1)';
        if (this._x >= maxX) {
          this._x = maxX;
          this._edge = 1;
        }
        break;

      case 1: // right: top -> bottom
        this._x = maxX;
        this._y += this._speed;
        if (this._y >= maxY) {
          this._y = maxY;
          this._edge = 2;
        }
        break;

      case 2: // bottom: right -> left
        this._y = maxY;
        this._x -= this._speed;
        if (this._flipEl) this._flipEl.style.transform = 'scaleX(1)';
        if (this._x <= minX) {
          this._x = minX;
          this._edge = 3;
        }
        break;

      case 3: // left: bottom -> top
        this._x = minX;
        this._y -= this._speed;
        if (this._y <= minY) {
          this._y = minY;
          this._edge = 0;
        }
        break;
    }

    // Translation only: never rotate the complete runner.
    this._el.style.transform = `translate3d(${this._x}px, ${this._y}px, 0)`;

    this._spokeAngle -= this._speed * 3.2;
    if (this._spoke) {
      this._spoke.style.transform = `rotate(${this._spokeAngle}deg)`;
    }

    requestAnimationFrame(() => this._step());
  };
})();
