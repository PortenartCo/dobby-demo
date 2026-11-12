/* Derived from immutable Ritual source 4e49be83d86f00d0ea267f58332d73012373807b4e65964b549e7797249f4054; original particles/audio, scoped lifetime and substituted hearth focus. */
window.DobbyRitualEffects=Object.freeze({start(main){let stopped=false,raf=0;
    // Initialisation Canvas 60 FPS
    const canvas = main.querySelector('#fireCanvas');
    const ctx = canvas.getContext('2d'); if(!ctx)return {floo(){},dispose(){}};
    let width = 0;
    let height = 0;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Variable d'état cinématique continu (0 = ambre repos, 1 = plein vortex émeraude floo)
    let flooProgress = 0;
    let targetFlooProgress = 0;
    let isTransitioning = false;
    let ritualCompleted = false;

    // Point focal centré strictement sur les braises/bûches au fond de l'âtre
    function getHearthCenter() { const img=main.querySelector('#dobby-hearth-img'),iw=img.naturalWidth||1024,ih=img.naturalHeight||1536,scale=Math.min(width/iw,height/ih);return {x:(width-iw*scale)/2+iw*scale*.25,y:(height-ih*scale)/2+ih*scale*.63}; }

    // Réduction du nombre de particules : animation aérée, poétique et calme
    const flameParticles = [];
    const maxFlames = 16;
    const emberParticles = [];
    const maxEmbers = 20;
    const vortexParticles = [];
    const maxVortex = 28;

    class FlameParticle {
      constructor() {
        this.reset();
      }
      reset() {
        const center = getHearthCenter();
        this.x = center.x + (Math.random() - 0.5) * (width * 0.22);
        this.y = center.y + (Math.random() * 12 - 4);
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = -(Math.random() * 0.55 + 0.35);
        this.radius = Math.random() * 16 + 8;
        this.maxLife = Math.random() * 45 + 35;
        this.life = this.maxLife;
        this.turbulence = Math.random() * 0.03 + 0.01;
      }
      update() {
        this.x += this.vx + Math.sin(this.life * this.turbulence) * 0.35;
        this.y += this.vy;
        this.radius *= 0.965;
        this.life--;
        const center = getHearthCenter();
        if (this.life <= 0 || this.radius < 1.5 || this.y < center.y - 50) {
          this.reset();
        }
      }
      draw(c) {
        const alpha = (this.life / this.maxLife) * 0.22;
        if (alpha <= 0) return;
        const grad = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        
        if (flooProgress < 0.1) {
          grad.addColorStop(0, `rgba(255, 230, 160, ${alpha * 1.1})`);
          grad.addColorStop(0.5, `rgba(245, 158, 11, ${alpha * 0.7})`);
          grad.addColorStop(1, `rgba(180, 83, 9, 0)`);
        } else {
          const r = Math.round(245 * (1 - flooProgress) + 52 * flooProgress);
          const g = Math.round(158 * (1 - flooProgress) + 211 * flooProgress);
          const b = Math.round(11 * (1 - flooProgress) + 153 * flooProgress);
          grad.addColorStop(0, `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, ${alpha * 1.2})`);
          grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
          grad.addColorStop(1, `rgba(5, 150, 105, 0)`);
        }

        c.fillStyle = grad;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fill();
      }
    }

    class EmberParticle {
      constructor() {
        this.reset();
      }
      reset() {
        const center = getHearthCenter();
        this.x = center.x + (Math.random() - 0.5) * (width * 0.32);
        this.y = center.y + (Math.random() * 20 - 10);
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = -(Math.random() * 0.45 + 0.25);
        this.size = Math.random() * 2.0 + 0.8;
        this.maxLife = Math.random() * 70 + 40;
        this.life = this.maxLife;
        this.twinkle = Math.random() * Math.PI * 2;
      }
      update() {
        this.twinkle += 0.04;
        this.x += this.vx + Math.sin(this.twinkle) * 0.3;
        this.y += this.vy * (1 + flooProgress * 0.6);
        this.life--;
        const center = getHearthCenter();
        if (this.life <= 0 || this.y < center.y - 85) {
          this.reset();
        }
      }
      draw(c) {
        const progress = this.life / this.maxLife;
        const alpha = Math.sin(progress * Math.PI) * (0.4 + Math.sin(this.twinkle) * 0.15);
        if (alpha <= 0) return;

        let colInner;
        if (flooProgress < 0.2) {
          colInner = `rgba(255, 240, 200, ${alpha * 0.95})`;
        } else {
          colInner = `rgba(209, 250, 229, ${alpha * 0.95})`;
        }

        c.shadowColor = flooProgress > 0.3 ? '#10b981' : '#f59e0b';
        c.shadowBlur = 4;
        c.fillStyle = colInner;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      }
    }

    class VortexSpark {
      constructor() {
        this.reset();
      }
      reset() {
        const center = getHearthCenter();
        this.angle = Math.random() * Math.PI * 2;
        this.dist = Math.random() * (width * 0.28) + 10;
        this.speed = (Math.random() * 0.015 + 0.01) * (1 + flooProgress * 1.2);
        this.radialSpeed = -(Math.random() * 0.5 + 0.2);
        this.size = Math.random() * 2 + 1;
        this.alpha = 0;
      }
      update() {
        this.angle += this.speed;
        this.dist += this.radialSpeed * (0.7 + flooProgress * 1.2);
        if (this.dist < 6) {
          this.reset();
          this.dist = width * 0.25;
        }
        this.alpha = Math.min(0.65, flooProgress * 0.8) * (this.dist / (width * 0.25));
      }
      draw(c) {
        if (flooProgress < 0.05 || this.alpha <= 0) return;
        const center = getHearthCenter();
        const px = center.x + Math.cos(this.angle) * this.dist;
        const py = center.y + Math.sin(this.angle) * this.dist * 0.5;

        c.shadowColor = '#34d399';
        c.shadowBlur = 6;
        c.fillStyle = `rgba(167, 243, 208, ${this.alpha})`;
        c.beginPath();
        c.arc(px, py, this.size, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      }
    }

    // Instanciation initiale des particules douces
    for (let i = 0; i < maxFlames; i++) flameParticles.push(new FlameParticle());
    for (let i = 0; i < maxEmbers; i++) emberParticles.push(new EmberParticle());
    for (let i = 0; i < maxVortex; i++) vortexParticles.push(new VortexSpark());

    // Éléments du DOM
    const sceneWrapper = main.querySelector('#scene-wrapper');
    const hearthImg = main.querySelector('#dobby-hearth-img');
    const volumetricLight = main.querySelector('#volumetric-hearth-light');
    const flooFlash = main.querySelector('#floo-vortex-flash');
    const ritualBadge = main.querySelector('#ritual-badge');
    const panelContentText = main.querySelector('#panel-content-text');
    const panelActionsWrapper = main.querySelector('#panel-actions-wrapper');
    const panelSecuritySeal = main.querySelector('#panel-security-seal');
    const btnFloo = main.querySelector('#btn-floo-trigger');
    const btnLabel = main.querySelector('#btn-label');
    const btnSparkle = main.querySelector('#btn-sparkle-icon');
    const homeArrivalModal = main.querySelector('#home-arrival-modal');

    // BOUCLE REQUESTANIMATIONFRAME 60 FPS
    let lastTime = performance.now();
    let flickerClock = 0;

    function renderLoop(now) { if(stopped || !canvas.isConnected)return;
      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;
      flickerClock += dt * 2.2;

      // Interpolation progressive de flooProgress
      if (Math.abs(flooProgress - targetFlooProgress) > 0.001) {
        flooProgress += (targetFlooProgress - flooProgress) * (dt * 1.3);
      } else {
        flooProgress = targetFlooProgress;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      // 1. Lueurs de cheminée volumétriques douces et intimes
      const center = getHearthCenter();
      const flickerVal = 0.5 + Math.sin(flickerClock * 1.1) * 0.04 + Math.cos(flickerClock * 1.8) * 0.03;
      
      const glowGrad = ctx.createRadialGradient(center.x, center.y, 5, center.x, center.y, width * 0.35);
      if (flooProgress < 0.2) {
        glowGrad.addColorStop(0, `rgba(245, 158, 11, ${0.28 * flickerVal})`);
        glowGrad.addColorStop(0.5, `rgba(180, 83, 9, ${0.12 * flickerVal})`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        const mix = flooProgress;
        glowGrad.addColorStop(0, `rgba(${Math.round(245*(1-mix)+16*mix)}, ${Math.round(158*(1-mix)+185*mix)}, ${Math.round(11*(1-mix)+129*mix)}, ${0.35 * flickerVal})`);
        glowGrad.addColorStop(0.5, `rgba(5, 150, 105, ${0.15 * flickerVal})`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Flammes tamisées
      for (let i = 0; i < flameParticles.length; i++) {
        flameParticles[i].update();
        flameParticles[i].draw(ctx);
      }

      // 3. Braises et étincelles calmes
      for (let i = 0; i < emberParticles.length; i++) {
        emberParticles[i].update();
        emberParticles[i].draw(ctx);
      }

      // 4. Vortex cinématique émeraude délicat
      if (flooProgress > 0.05) {
        for (let i = 0; i < vortexParticles.length; i++) {
          vortexParticles[i].update();
          vortexParticles[i].draw(ctx);
        }
      }

      ctx.globalCompositeOperation = 'source-over';

      if (volumetricLight) {
        if (flooProgress < 0.2) {
          volumetricLight.style.background = `radial-gradient(ellipse at ${center.x/width*100}% ${center.y/height*100}%, rgba(245,158,11,${0.24 * flickerVal}) 0%, rgba(180,83,9,0.1) 35%, transparent 62%)`;
        } else {
          volumetricLight.style.background = `radial-gradient(ellipse at ${center.x/width*100}% ${center.y/height*100}%, rgba(16,185,129,${0.35 * (1 + flooProgress)}) 0%, rgba(5,150,105,0.18) 40%, transparent 65%)`;
        }
      }

      raf=requestAnimationFrame(renderLoop);
    }
    raf=requestAnimationFrame(renderLoop);

    
return {floo(){targetFlooProgress=1;},dispose(){stopped=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resizeCanvas);ctx.clearRect(0,0,width,height);}};},audio(){let audioCtx = null;
    let crackleGain = null;

    function initAudioEngine() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        startGentleHearthCrackle();
      }
    }

    function startGentleHearthCrackle() {
      try {
        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.04;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 3.0;

        crackleGain = audioCtx.createGain();
        crackleGain.gain.setValueAtTime(0.025, audioCtx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(crackleGain);
        crackleGain.connect(audioCtx.destination);
        whiteNoise.start();
      } catch (e) {
        console.warn('Audio non initialisé', e);
      }
    }

    function playFlooWhooshSound() {
      try {
        initAudioEngine();
        const now = audioCtx.currentTime;

        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + idx * 0.14 + 1.2);

          gain.gain.setValueAtTime(0.001, now + idx * 0.14);
          gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.14 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.6);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 1.7);
        });
      } catch (e) {
        console.warn('Audio floo non joué', e);
      }
    }

    
try{initAudioEngine();playFlooWhooshSound();}catch{if(audioCtx)audioCtx.close().catch(()=>{});}return ()=>{if(audioCtx)audioCtx.close().catch(()=>{});};}});
