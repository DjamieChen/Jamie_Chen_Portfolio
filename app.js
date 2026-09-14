/* ========================================
   App — Main State Machine Orchestrator
   ======================================== */

const App = {
  // States
  STATE: {
    INTRO: 'INTRO',
    AVATAR_ENTRANCE: 'AVATAR_ENTRANCE',
    MUSIC_PROMPT: 'MUSIC_PROMPT',
    FIRST_LINK: 'FIRST_LINK',
    WELCOME_BACK: 'WELCOME_BACK',
    PORTFOLIO_EXPLOSION: 'PORTFOLIO_EXPLOSION',
  },
  
  _currentState: null,
  _audioEl: null,
  _musicPlaying: false,
  _wasPlayingBeforeTabLeave: false,
  _hasLeftTab: false,
  _avatarClicked: false,
  _audioCtx: null,
  _analyser: null,
  _audioSource: null,
  _dataArray: null,
  _audioAnimFrame: null,
  
  // Portfolio links (10 radial bubbles)
  PORTFOLIO_LINKS: [
    { title: 'Get to know Jamie Again',     url: 'https://canva.link/50kiakbew7sqf70' },
    { title: 'DECA ICDC Report',            url: 'https://canva.link/mx9tk5k88jsbgel' },
    { title: 'DECA ICDC Slides',            url: 'https://canva.link/vcnjg5nixm8c9pz' },
    { title: 'My Resume',                    url: 'https://canva.link/h4nv8c463fl6r59' },
    { title: 'Asia Consulting Pitch',        url: 'https://canva.link/t70yi8uq7v8dfm1' },
    { title: 'B3 Investors Bayfair',         url: 'https://canva.link/4ie3kx7293r8q9s' },
    { title: 'Fusion Marketing',             url: 'https://canva.link/wldqghskn356nx7' },
    { title: 'Youth Leadership',             url: 'https://canva.link/5hczx8vsha6dy78' },
    { title: 'Irvington Fusion Pitch',       url: 'https://canva.link/n4cqb38wg15nbdh' },
    { title: 'B3 Investors Summary',         url: 'https://canva.link/gtpsjl9ljdb9w0p' },
  ],
  
  /**
   * Initialize the application.
   */
  async init() {
    // Get DOM elements
    this._introScreen = document.getElementById('intro-screen');
    this._avatarStage = document.getElementById('avatar-stage');
    this._avatarContainer = document.getElementById('avatar-container');
    this._audioEl = document.getElementById('bg-music');
    this._musicBtn = document.getElementById('music-btn');
    this._playSymbol = document.getElementById('play-symbol');
    this._pauseSymbol = document.getElementById('pause-symbol');
    
    // Setup music toggle
    if (this._musicBtn) {
      this._musicBtn.addEventListener('click', () => this._toggleMusic());
    }
    
    // Proactively prime audio context on first user gesture (once only)
    const primeAudio = () => {
      this._initAudioContext();
      ['pointermove', 'mousemove', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(evt => {
        window.removeEventListener(evt, primeAudio);
      });
    };
    ['pointermove', 'mousemove', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(evt => {
      window.addEventListener(evt, primeAudio, { once: true, passive: true });
    });
    
    // Pause music when switching tabs or leaving the site, resume when returning
    const handleTabLeave = () => {
      this._isTabHidden = true;
      if (this._audioEl && !this._audioEl.paused) {
        this._audioEl.pause();
        this._wasPlayingBeforeTabLeave = true;
      }
      if (this._audioCtx && this._audioCtx.state === 'running') {
        this._audioCtx.suspend().catch(() => {});
      }
      this._setMusicUI(false);
    };

    const handleTabReturn = () => {
      this._isTabHidden = false;
      if (this._audioCtx && this._audioCtx.state === 'suspended') {
        this._audioCtx.resume().catch(() => {});
      }
      if (this._wasPlayingBeforeTabLeave && this._audioEl) {
        this._audioEl.play().then(() => {
          this._musicPlaying = true;
          this._setMusicUI(true);
        }).catch(() => {});
        this._wasPlayingBeforeTabLeave = false;
      }
      if (this._hasLeftTab) {
        this._onReturnToTab();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleTabLeave();
      } else {
        handleTabReturn();
      }
    });

    window.addEventListener('blur', () => {
      handleTabLeave();
    });

    window.addEventListener('focus', () => {
      if (!document.hidden && document.visibilityState !== 'hidden') {
        handleTabReturn();
      }
    });

    window.addEventListener('pagehide', handleTabLeave);
    
    // Initialize Hamster Runner along the bottom border
    HamsterRunner.init();
    
    // Initialize Sleepy Idle timer (1 minute of no mouse movement)
    IdleSleep.init();
    
    // Setup Contact Remote controls
    this._setupContactRemote();
    
    // Start the experience
    this._transition(this.STATE.INTRO);
  },
  
  /**
   * Transition to a new state.
   */
  async _transition(state) {
    this._currentState = state;
    
    switch (state) {
      case this.STATE.INTRO:
        await this._runIntro();
        break;
      case this.STATE.AVATAR_ENTRANCE:
        await this._runAvatarEntrance();
        break;
      case this.STATE.MUSIC_PROMPT:
        await this._runMusicPrompt();
        break;
      case this.STATE.FIRST_LINK:
        await this._runFirstLink();
        break;
      case this.STATE.WELCOME_BACK:
        await this._runWelcomeBack();
        break;
      case this.STATE.PORTFOLIO_EXPLOSION:
        await this._runPortfolioExplosion();
        break;
    }
  },
  
  /* ── State: INTRO ── */
  async _runIntro() {
    const boardContainer = document.getElementById('board-container');
    
    // Define the board text — 6 rows, 22 cols
    const lines = [
      '',
      '',
      '  HELLO OHLONE',
      '  BUSINESS SOCIETY',
      '',
      '',
    ];
    const cols = 22;
    
    const board = FlippingBoard.create(boardContainer, lines, cols);
    
    // Wait a beat, then animate
    await this._delay(600);
    await FlippingBoard.animate(board, 25);
    
    // Hold the text for 3 seconds
    await this._delay(3000);
    
    // Fade out intro
    this._introScreen.classList.add('fade-out');
    await this._delay(800);
    
    // Transition to avatar
    this._transition(this.STATE.AVATAR_ENTRANCE);
  },
  
  /* ── State: AVATAR_ENTRANCE ── */
  async _runAvatarEntrance() {
    // Switch to light mode
    document.body.classList.add('light-mode');
    
    // Start procedural cloud shader background (Aceternity UI)
    const cloudCanvas = document.getElementById('cloud-canvas');
    if (cloudCanvas && window.CloudShader) {
      CloudShader.init(cloudCanvas);
      cloudCanvas.classList.add('visible');
    }
    
    // Show avatar stage
    this._avatarStage.classList.add('visible');
    
    // Create the avatar
    Avatar.create(this._avatarContainer);
    
    // Initialize bubbles
    Bubbles.init(this._avatarContainer);
    
    await this._delay(200);
    
    // Play entrance animation
    Avatar.enter();
    
    await this._delay(1200);
    
    // Move to music prompt
    this._transition(this.STATE.MUSIC_PROMPT);
  },
  
  /* ── Google Chrome Site Settings Check ── */
  async _checkIfGoogleAllowsMusic() {
    // 1. Check if user configured explicit test override
    try {
      const explicit = localStorage.getItem('google_sound_site_setting');
      if (explicit === 'allow') return true;
      if (explicit === 'automatic' || explicit === 'block') return false;
    } catch (e) {}

    // 2. Test directly if Google Chrome allows unmuted playback
    try {
      const testEl = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      testEl.volume = 0.01;
      const playPromise = testEl.play();
      if (playPromise !== undefined) {
        await playPromise;
        testEl.pause();
        return true;
      }
    } catch (err) {
      return false;
    }
    return false;
  },

  /* ── State: MUSIC_PROMPT ── */
  async _runMusicPrompt() {
    const allowsMusic = await this._checkIfGoogleAllowsMusic();

    // IF site settings says that it allows music:
    // Automatically play the song + dynamic music button movement + Avatar says "U gotta Shazam this"
    if (allowsMusic) {
      Avatar.setAngry(false);
      Avatar.setExpression('happy');

      // Automatically play song + dynamic music button movement
      this._tryPlayMusic();
      this._showMusicBtn();

      // Avatar says: "U gotta Shazam this"
      await Bubbles.speak("U gotta Shazam this", { emoji: '🎵' });
      await this._delay(2400);
      await Bubbles.hideSpeech();
      await this._delay(300);

      // Then says: "Get to know me first"
      await Bubbles.speak("Get to know me first", { emoji: '✨' });
      await this._delay(2400);
      await Bubbles.hideSpeech();

      // Transition to first link
      await this._delay(300);
      this._transition(this.STATE.FIRST_LINK);
      return;
    }

    // IF the site setting on google says that it is on Automatic(Default)/Block:
    // Ask for permission + avatar says "Let's play some music. Press allow"
    Avatar.setExpression('happy');
    
    // Avatar speech: "Let's play some music. Press allow"
    await Bubbles.speak("Let's play some music. Press allow", { emoji: '🎵' });
    
    // Ask for permission
    await this._delay(750);
    const firstDecision = await this._showSoundPermissionPrompt();
    
    // If pressed yes then say "Great, let's move on!" + play song + dynamic button
    if (firstDecision === 'allow') {
      await this._onSoundAllowed();
    } else {
      // If said no, then it gets mad + Avatar says "I WASN'T ASKING! ALLOW SOUND!"
      await this._onSoundDeniedFirstTime();
    }
  },

  /**
   * Fork: If pressed yes then say "Great, let's move on!"
   */
  async _onSoundAllowed() {
    await Bubbles.hideSpeech();
    await this._delay(200);
    
    // Start music & dynamic button
    this._tryPlayMusic();
    this._showMusicBtn();
    
    // Avatar is excited!
    Avatar.setAngry(false);
    Avatar.setExpression('excited');
    
    // Says: "Great, let's move on!"
    await Bubbles.speak("Great, let's move on!", { emoji: '🎉' });
    
    await this._delay(2600);
    await Bubbles.hideSpeech();
    
    // Move to first link
    await this._delay(400);
    this._transition(this.STATE.FIRST_LINK);
  },

  /**
   * Fork: If said no, then it gets mad + Avatar says "I WASN'T ASKING! ALLOW SOUND!"
   */
  async _onSoundDeniedFirstTime() {
    await Bubbles.hideSpeech();
    await this._delay(200);
    
    // Avatar gets mad and shakes!
    Avatar.setAngry(true);
    Avatar.shake(1800);
    
    // Avatar says: "I WASN'T ASKING! ALLOW SOUND!" in ALL CAPS
    await Bubbles.speak("I WASN'T ASKING! ALLOW SOUND!", { emoji: '😠', isAngry: true });
    
    // Wait for speech to be read
    await this._delay(3400);
    
    // Ask for permission again
    const secondDecision = await this._showSoundPermissionPrompt();
    
    // If yes then he says "Great, let's move on!"
    if (secondDecision === 'allow') {
      await this._onSoundAllowed();
    } else {
      // If no, then he rolls his eyes and says "whatever"
      await this._onSoundDeniedSecondTime();
    }
  },

  /**
   * Fork: If no, then he rolls his eyes and says "whatever"
   */
  async _onSoundDeniedSecondTime() {
    await Bubbles.hideSpeech();
    await this._delay(200);
    
    Avatar.setAngry(false);
    
    // He rolls his eyes
    Avatar.eyeRoll(2200);
    
    // And says: "whatever"
    await Bubbles.speak("whatever 🙄", { emoji: '🙄' });
    
    await this._delay(2500);
    await Bubbles.hideSpeech();
    
    Avatar.setExpression('neutral');
    
    // Note: dynamic button does NOT play when permission is denied!
    await this._delay(400);
    this._transition(this.STATE.FIRST_LINK);
  },

  /**
   * Display Google Chrome style site sound permission dialog.
   */
  _showSoundPermissionPrompt() {
    return new Promise((resolve) => {
      const promptEl = document.getElementById('chrome-permission-prompt');
      const allowBtn = document.getElementById('perm-allow-btn');
      const blockBtn = document.getElementById('perm-block-btn');
      const closeBtn = document.getElementById('perm-close-btn');
      
      if (!promptEl || !allowBtn || !blockBtn) {
        resolve('allow');
        return;
      }
      
      promptEl.classList.add('visible');
      
      const finish = (result) => {
        promptEl.classList.remove('visible');
        allowBtn.removeEventListener('click', handleAllow);
        blockBtn.removeEventListener('click', handleBlock);
        if (closeBtn) closeBtn.removeEventListener('click', handleBlock);
        resolve(result);
      };
      
      const handleAllow = () => finish('allow');
      const handleBlock = () => finish('block');
      
      allowBtn.addEventListener('click', handleAllow, { once: true });
      blockBtn.addEventListener('click', handleBlock, { once: true });
      if (closeBtn) closeBtn.addEventListener('click', handleBlock, { once: true });
    });
  },
  
  /* ── State: FIRST_LINK ── */
  async _runFirstLink() {
    Avatar.setExpression('neutral');
    
    // Show featured bubble: "Get To Know Jamie"
    Bubbles.createFeaturedBubble('✨ Get To Know Jamie', 'https://canva.link/50kiakbew7sqf70', { x: 0, y: 170 });
    
    // Now we wait for the user to click and come back
    // Set a flag to detect tab departure
    this._hasLeftTab = false;
    
    // Listen for when user leaves the tab (clicks the link which opens in new tab)
    const checkLeave = () => {
      if (document.hidden) {
        this._hasLeftTab = true;
        document.removeEventListener('visibilitychange', checkLeave);
      }
    };
    document.addEventListener('visibilitychange', checkLeave);
    
    // Also auto-advance after 15 seconds if they don't click
    this._firstLinkTimeout = setTimeout(() => {
      if (this._currentState === this.STATE.FIRST_LINK) {
        this._hasLeftTab = true;
        this._onReturnToTab();
      }
    }, 15000);
  },
  
  /**
   * Called when user returns to the tab.
   */
  _onReturnToTab() {
    if (this._currentState === this.STATE.FIRST_LINK || this._currentState === this.STATE.WELCOME_BACK) {
      if (this._firstLinkTimeout) clearTimeout(this._firstLinkTimeout);
      
      // Clear the featured bubble
      Bubbles.clearFeaturedBubble();
      
      // Move to welcome back
      this._transition(this.STATE.WELCOME_BACK);
    }
  },
  
  /* ── State: WELCOME_BACK ── */
  async _runWelcomeBack() {
    // Prevent re-entry
    if (this._avatarClicked) return;
    
    Avatar.setExpression('excited');
    
    await this._delay(500);
    await Bubbles.speak("Welcome back! I missed you", { emoji: '💜' });
    
    await this._delay(2500);
    await Bubbles.hideSpeech();
    await this._delay(400);
    
    await Bubbles.speak("Press me to see the rest!", { emoji: '👇' });
    
    // Make avatar clickable
    Avatar.setClickable(true);
    
    const avatarSvg = document.getElementById('avatar-svg');
    const clickHandler = () => {
      if (this._avatarClicked) return;
      this._avatarClicked = true;
      
      avatarSvg.removeEventListener('click', clickHandler);
      Avatar.setClickable(false);
      
      Bubbles.hideSpeech();
      this._transition(this.STATE.PORTFOLIO_EXPLOSION);
    };
    
    avatarSvg.addEventListener('click', clickHandler);
  },
  
  /* ── State: PORTFOLIO_EXPLOSION ── */
  async _runPortfolioExplosion() {
    Avatar.setExpression('happy');
    
    await this._delay(300);
    
    // Create all the portfolio bubbles in a radial burst
    Bubbles.createRadialBubbles(this.PORTFOLIO_LINKS);
    
    // Reveal the contact remote as requested (only appears when the 9 bubbles come out)
    this._showContactRemote();
    
    // Show a final speech
    await this._delay(800);
    await Bubbles.speak("Here's my portfolio!", { emoji: '✨' });
    
    await this._delay(4000);
    await Bubbles.hideSpeech();
    
    Avatar.setExpression('neutral');
  },
  
  /* ── Music & Reactive Audio Button ── */
  _initAudioContext() {
    if (this._analyser && this._audioSource) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext || !this._audioEl) return;
      if (!this._audioCtx) {
        this._audioCtx = new AudioContext();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume().then(() => {
          this._connectAudioNodes();
        }).catch(() => {});
      } else if (this._audioCtx.state === 'running') {
        this._connectAudioNodes();
      }
    } catch (e) {
      console.warn('AudioContext setup deferred:', e);
    }
  },

  _connectAudioNodes() {
    if (this._audioSource || !this._audioCtx || !this._audioEl) return;
    try {
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 128;
      this._analyser.smoothingTimeConstant = 0.82;
      this._audioSource = this._audioCtx.createMediaElementSource(this._audioEl);
      this._audioSource.connect(this._analyser);
      this._analyser.connect(this._audioCtx.destination);
      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
      if (this._musicPlaying) {
        this._startAudioReactivity();
      }
    } catch (e) {
      console.warn('Audio graph connection deferred:', e);
    }
  },

  _startAudioReactivity() {
    if (!this._analyser || !this._dataArray) return;
    if (this._audioAnimFrame) cancelAnimationFrame(this._audioAnimFrame);
    
    const boxes = this._musicBtn ? this._musicBtn.querySelectorAll('.box') : [];
    
    const analyze = () => {
      if (!this._musicPlaying) {
        boxes.forEach(b => { b.style.transform = ''; });
        return;
      }
      
      this._analyser.getByteFrequencyData(this._dataArray);
      
      // Bass: bins 1 to 5 (~40Hz - 220Hz)
      let bassSum = 0;
      for (let i = 1; i <= 5; i++) {
        bassSum += this._dataArray[i] || 0;
      }
      const bass = bassSum / (5 * 255); // 0.0 to 1.0
      
      // Treble: bins 18 to 50 (~1.5kHz - 4.5kHz)
      let trebleSum = 0;
      for (let i = 18; i <= 50; i++) {
        trebleSum += this._dataArray[i] || 0;
      }
      const treble = trebleSum / (33 * 255); // 0.0 to 1.0
      
      // React to bass (outer rings) and treble (inner button)
      if (boxes.length >= 5) {
        boxes[0].style.transform = `scale(${1 + treble * 0.22})`;
        boxes[1].style.transform = `scale(${1 + treble * 0.16})`;
        boxes[3].style.transform = `scale(${1 + bass * 0.28})`;
        boxes[4].style.transform = `scale(${1 + bass * 0.42})`;
        boxes[4].style.borderColor = `rgba(168, 85, 247, ${0.2 + bass * 0.7})`;
      }
      
      this._audioAnimFrame = requestAnimationFrame(analyze);
    };
    
    this._audioAnimFrame = requestAnimationFrame(analyze);
  },

  _setMusicUI(isPlaying) {
    if (!this._musicBtn) return;
    
    if (isPlaying) {
      this._musicBtn.classList.remove('paused');
      if (this._playSymbol) this._playSymbol.style.display = 'none';
      if (this._pauseSymbol) this._pauseSymbol.style.display = 'block';
      this._musicBtn.setAttribute('title', 'Pause Music');
      this._startAudioReactivity();
    } else {
      this._musicBtn.classList.add('paused');
      if (this._playSymbol) this._playSymbol.style.display = 'block';
      if (this._pauseSymbol) this._pauseSymbol.style.display = 'none';
      this._musicBtn.setAttribute('title', 'Play Music');
      if (this._audioAnimFrame) {
        cancelAnimationFrame(this._audioAnimFrame);
        this._audioAnimFrame = null;
      }
      const boxes = this._musicBtn.querySelectorAll('.box');
      boxes.forEach(b => { b.style.transform = ''; });
    }
  },

  _tryPlayMusic() {
    if (!this._audioEl) return;
    
    this._musicWanted = true;
    this._showMusicBtn();
    
    // Set immediate audible volume
    this._audioEl.volume = 0.55;
    
    // Start dynamic button playing animation right away
    this._setMusicUI(true);
    
    // Try unmuted direct play
    const playPromise = this._audioEl.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this._musicPlaying = true;
        this._setMusicUI(true);
        this._initAudioContext();
      }).catch((err) => {
        console.log('Autoplay unblocking on next motion:', err);
        this._setMusicUI(true);
        
        const startOnMotion = () => {
          if (this._musicWanted && !this._isTabHidden && !document.hidden) {
            this._initAudioContext();
            this._audioEl.volume = 0.55;
            this._audioEl.play().then(() => {
              this._musicPlaying = true;
              this._setMusicUI(true);
            }).catch(() => {});
          }
          ['pointerdown', 'pointermove', 'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(evt => {
            window.removeEventListener(evt, startOnMotion);
          });
        };
        ['pointerdown', 'pointermove', 'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(evt => {
          window.addEventListener(evt, startOnMotion, { once: true, passive: true });
        });
      });
    }
  },
  
  _fadeInMusic() {
    if (!this._audioEl) return;
    let vol = 0;
    this._audioEl.volume = 0;
    const targetVol = 0.55;
    const fade = setInterval(() => {
      vol += 0.03;
      if (vol >= targetVol) {
        vol = targetVol;
        clearInterval(fade);
      }
      this._audioEl.volume = Math.min(1, vol);
    }, 80);
  },
  
  _toggleMusic() {
    if (!this._audioEl) return;
    this._initAudioContext();
    
    if (this._musicPlaying) {
      this._audioEl.pause();
      this._musicPlaying = false;
      this._musicWanted = false;
      this._setMusicUI(false);
    } else {
      this._audioEl.play().then(() => {
        this._musicPlaying = true;
        this._musicWanted = true;
        this._setMusicUI(true);
        if (this._audioEl.volume === 0) {
          this._fadeInMusic();
        }
      }).catch(() => {});
    }
  },
  
  _showMusicBtn() {
    if (this._musicBtn) {
      this._musicBtn.classList.add('visible');
    }
  },

  /* ── Contact Remote & TV Off Modal ── */
  _setupContactRemote() {
    const toggle = document.getElementById('remote-toggle');
    const toast = document.getElementById('remote-toast');
    const btnPower = document.getElementById('btn-power');
    const btnLinkedin = document.getElementById('btn-linkedin');
    const btnInstagram = document.getElementById('btn-instagram');
    const btnEmail = document.getElementById('btn-email');
    
    let toastTimeout = null;
    const showToast = (msg) => {
      if (!toast) return;
      if (msg) toast.textContent = msg;
      toast.classList.add('show');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 1800);
    };

    const checkRemote = (e) => {
      if (!toggle || !toggle.checked) {
        e.preventDefault();
        showToast('Turn remote ON first! ⚡');
        return false;
      }
      return true;
    };

    if (btnLinkedin) {
      btnLinkedin.addEventListener('click', (e) => {
        if (!checkRemote(e)) return;
      });
    }

    if (btnInstagram) {
      btnInstagram.addEventListener('click', (e) => {
        if (!checkRemote(e)) return;
      });
    }

    if (btnEmail) {
      btnEmail.addEventListener('click', (e) => {
        if (!checkRemote(e)) return;
        window.open('https://mail.google.com/mail/?view=cm&fs=1&to=djamiechen@gmail.com', '_blank');
        e.preventDefault();
      });
    }

    if (btnPower) {
      btnPower.addEventListener('click', (e) => {
        if (!checkRemote(e)) return;
        this._showTVOffModal();
      });
    }

    this._setupTVOffModal();
  },

  _showContactRemote() {
    const remote = document.getElementById('contact-remote-container');
    if (remote) {
      remote.classList.add('visible');
    }
  },

  _showTVOffModal() {
    const modal = document.getElementById('tv-off-modal');
    if (modal) modal.classList.add('visible');
  },

  _hideTVOffModal() {
    const modal = document.getElementById('tv-off-modal');
    if (modal) modal.classList.remove('visible');
  },

  _setupTVOffModal() {
    const modal = document.getElementById('tv-off-modal');
    const yesBtn = document.getElementById('tv-confirm-yes');
    const noBtn = document.getElementById('tv-confirm-no');
    const screenOff = document.getElementById('tv-screen-off');
    const goodbye = document.getElementById('tv-goodbye-screen');
    const turnOnAgain = document.getElementById('tv-turn-on-again');

    if (noBtn) {
      noBtn.addEventListener('click', () => {
        this._hideTVOffModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this._hideTVOffModal();
      });
    }

    if (yesBtn) {
      yesBtn.addEventListener('click', () => {
        this._hideTVOffModal();
        if (this._launchAudioTimer) {
          clearTimeout(this._launchAudioTimer);
          this._launchAudioTimer = null;
        }
        // TV turned off: completely stop music and reset time
        if (this._audioEl) {
          this._audioEl.pause();
          this._audioEl.currentTime = 0;
          this._musicPlaying = false;
          this._musicWanted = false;
          this._setMusicUI(false);
        }
        if (screenOff) {
          screenOff.classList.add('active');
        }
        setTimeout(() => {
          if (goodbye) goodbye.classList.add('visible');
        }, 750);
      });
    }

    if (turnOnAgain) {
      turnOnAgain.addEventListener('click', () => {
        // Turning TV back on goes back from the start page!
        window.location.reload();
      });
    }
  },
  
  /* ── Utility ── */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/* ========================================
   Hamster Runner Controller (Clockwise Perimeter with 90° Border Rotation)
   ======================================== */
const HamsterRunner = {
  _el: null,
  _flipEl: null,
  _spoke: null,
  _x: 0,
  _y: 0,
  _speed: 2.2,
  _edge: 0, // 0 = TOP (L->R), 1 = RIGHT (T->B), 2 = BOTTOM (R->L), 3 = LEFT (B->T)
  _targetRot: 180,
  _currentRot: 180,
  _spokeAngle: 0,
  _running: false,

  init() {
    this._el = document.getElementById('hamster-runner');
    if (!this._el) return;
    this._flipEl = this._el.querySelector('#hamster-flip') || this._el.querySelector('.hamster-flip');
    this._spoke = this._el.querySelector('.spoke');
    
    // Hamster always moves toward its left (head-first natural direction)
    if (this._flipEl) {
      this._flipEl.style.transform = 'scaleX(1)';
    }

    // Start along the top border touching the top edge (y = 0)
    this._edge = 0;
    this._x = 0;
    this._y = 0;
    this._targetRot = 180;
    this._currentRot = 180;
    this._running = true;
    this._step();
  },

  _step() {
    if (!this._running || !this._el) return;
    
    // Wheel is 15em at 8px font-size = 120px
    const wheelSize = 120;
    // Touching the border: min is 0, max is viewport minus wheelSize
    const minX = 0;
    const maxX = Math.max(0, window.innerWidth - wheelSize);
    const minY = 0;
    const maxY = Math.max(0, window.innerHeight - wheelSize);

    // Clockwise perimeter movement with 90° rotation at each border:
    switch (this._edge) {
      case 0: // TOP BORDER: Left -> Right (rotated 180°, feet on ceiling, moving head-first)
        this._y = minY;
        this._x += this._speed;
        if (this._x >= maxX) {
          this._x = maxX;
          this._edge = 1; // Switch to Right border
          this._targetRot = 270; // Rotate 90° to touch right wall
        }
        break;

      case 1: // RIGHT BORDER: Top -> Bottom (rotated 270°, feet on right wall, moving head-first)
        this._x = maxX;
        this._y += this._speed;
        if (this._y >= maxY) {
          this._y = maxY;
          this._edge = 2; // Switch to Bottom border
          this._targetRot = 360; // Rotate 90° to touch bottom floor
        }
        break;

      case 2: // BOTTOM BORDER: Right -> Left (rotated 0°/360°, feet on floor, moving head-first)
        this._y = maxY;
        this._x -= this._speed;
        if (this._x <= minX) {
          this._x = minX;
          this._edge = 3; // Switch to Left border
          this._targetRot = 90; // Rotate 90° to touch left wall
        }
        break;

      case 3: // LEFT BORDER: Bottom -> Top (rotated 90°, feet on left wall, moving head-first)
        this._x = minX;
        this._y -= this._speed;
        if (this._y <= minY) {
          this._y = minY;
          this._edge = 0; // Switch back to Top border
          this._targetRot = 180; // Rotate 90° to touch ceiling
        }
        break;
    }

    // Smoothly interpolate rotation around corners (rotate 90° when switching borders)
    if (this._targetRot === 360) {
      this._currentRot += (360 - this._currentRot) * 0.18;
      if (this._currentRot >= 359.5) {
        this._currentRot = 0;
        this._targetRot = 0;
      }
    } else {
      this._currentRot += (this._targetRot - this._currentRot) * 0.18;
    }

    // Move runner and rotate to match the border it is touching
    this._el.style.transform = `translate3d(${this._x}px, ${this._y}px, 0) rotate(${this._currentRot}deg)`;

    // Rotate spokes in rolling direction
    this._spokeAngle -= this._speed * 2.5;
    if (this._spoke) {
      this._spoke.style.transform = `rotate(${this._spokeAngle}deg)`;
    }

    requestAnimationFrame(() => this._step());
  }
};

/* ========================================
   Idle Sleep Controller (1 Minute Timeout)
   ======================================== */
const IdleSleep = {
  _timer: null,
  _isSleeping: false,
  _sleepyImg: null,
  _zzzContainer: null,
  IDLE_TIMEOUT: 60000, // 1 minute (60,000 ms)

  init() {
    this._sleepyImg = document.getElementById('avatar-sleepy-img');
    this._zzzContainer = document.getElementById('zzz-container');

    const onUserActivity = () => this.resetTimer();

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('mousedown', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('scroll', onUserActivity, { passive: true });

    this.resetTimer();
  },

  resetTimer() {
    if (this._isSleeping) {
      this.wakeUp();
    }
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.sleep();
    }, this.IDLE_TIMEOUT);
  },

  sleep() {
    this._isSleeping = true;
    if (this._sleepyImg) this._sleepyImg.classList.add('visible');
    if (this._zzzContainer) this._zzzContainer.classList.add('visible');
    const svg = document.getElementById('avatar-svg');
    if (svg) svg.classList.add('sleeping');
  },

  wakeUp() {
    this._isSleeping = false;
    if (this._sleepyImg) this._sleepyImg.classList.remove('visible');
    if (this._zzzContainer) this._zzzContainer.classList.remove('visible');
    const svg = document.getElementById('avatar-svg');
    if (svg) svg.classList.remove('sleeping');
  }
};

// Launch when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
