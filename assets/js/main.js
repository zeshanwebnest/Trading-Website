(() => {
  'use strict';

  // Marks that JS is actually running, so the .reveal hide/fade-in animation
  // in main.css only applies when something is guaranteed to reveal it again.
  // Without this, any JS failure would leave every content section stuck at
  // opacity:0 forever, while the page still renders at full height.
  document.documentElement.classList.add('reveal-armed');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Sticky nav state
     --------------------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.textContent = open ? 'Close' : 'Menu';
      document.body.style.overflow = open ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.textContent = 'Menu';
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------------------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('is-visible'), i * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------------------
     Count-up stats
     --------------------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    if (reduceMotion) {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------------------------------------------------------------------
     Hero parallax: floating terminal panel drifts gently toward the cursor
     --------------------------------------------------------------------- */
  const heroEl = document.querySelector('.hero');
  const heroPanel = document.querySelector('.hero-panel');
  if (heroEl && heroPanel && !reduceMotion && window.matchMedia('(min-width: 761px)').matches) {
    heroEl.addEventListener('mousemove', (e) => {
      const rect = heroEl.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      heroPanel.style.transform = `rotateX(${py * -4}deg) rotateY(${px * 6}deg)`;
      document.querySelectorAll('.hero-float').forEach((el, i) => {
        const depth = i === 0 ? 14 : -10;
        el.style.transform = `translate(${px * depth}px, ${py * depth}px)`;
      });
    });
    heroEl.addEventListener('mouseleave', () => {
      heroPanel.style.transform = '';
      document.querySelectorAll('.hero-float').forEach((el) => { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------------------
     Ticker: duplicate content for seamless loop
     --------------------------------------------------------------------- */
  document.querySelectorAll('.ticker-track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });

  /* ---------------------------------------------------------------------
     Canvas: hero equity curve
     --------------------------------------------------------------------- */
  const heroCanvas = document.getElementById('hero-chart');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let w, h, points = [];
    const POINT_COUNT = 60;

    const resize = () => {
      const rect = heroCanvas.getBoundingClientRect();
      w = heroCanvas.width = rect.width;
      h = heroCanvas.height = rect.height;
      points = [];
      let val = h * 0.62;
      for (let i = 0; i < POINT_COUNT; i++) {
        val += (Math.sin(i * 0.7) * 6) + (Math.random() - 0.45) * 26;
        val = Math.max(h * 0.28, Math.min(h * 0.8, val));
        points.push(val);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const step = w / (POINT_COUNT - 1);

      ctx.beginPath();
      points.forEach((y, i) => {
        const x = i * step;
        const drift = Math.sin((i + offset) * 0.12) * 4;
        if (i === 0) ctx.moveTo(x, y + drift);
        else ctx.lineTo(x, y + drift);
      });

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(212,175,55,0.05)');
      grad.addColorStop(0.5, 'rgba(212,175,55,0.75)');
      grad.addColorStop(1, 'rgba(240,215,124,0.95)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(212,175,55,0.5)';
      ctx.shadowBlur = 12;
      ctx.stroke();

      const fill = ctx.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, 'rgba(212,175,55,0.14)');
      fill.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.shadowBlur = 0;
      ctx.fill();

      if (!reduceMotion) {
        offset += 0.015;
        requestAnimationFrame(draw);
      }
    };
    draw();
  }

  /* ---------------------------------------------------------------------
     Canvas: generic sparkline generator (instrument cards, device frame,
     education thumbnails)
     --------------------------------------------------------------------- */
  const drawSparkline = (canvas, { points = 24, color = '#d4af37', fillOpacity = 0.12, volatility = 1 } = {}) => {
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    const data = [];
    let v = h * 0.5;
    for (let i = 0; i < points; i++) {
      v += (Math.random() - 0.5) * 14 * volatility;
      v = Math.max(h * 0.12, Math.min(h * 0.88, v));
      data.push(v);
    }

    ctx.clearRect(0, 0, w, h);
    const step = w / (points - 1);
    ctx.beginPath();
    data.forEach((y, i) => {
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color.replace(')', `,${fillOpacity})`).replace('rgb', 'rgba').replace('#d4af37', 'rgba(212,175,55');
    ctx.fillStyle = `rgba(212,175,55,${fillOpacity})`;
    ctx.fill();
  };

  document.querySelectorAll('.instrument-card canvas').forEach((c) => {
    drawSparkline(c, { points: 20, volatility: parseFloat(c.dataset.vol || '1') });
  });

  const deviceCanvas = document.querySelector('.device-frame canvas');
  if (deviceCanvas) drawSparkline(deviceCanvas, { points: 40, volatility: 1.4 });

  document.querySelectorAll('.edu-media canvas').forEach((c) => {
    drawSparkline(c, { points: 16, volatility: 0.7, fillOpacity: 0.08 });
  });

  /* ---------------------------------------------------------------------
     FAQ accordions: only one item open per list. Enforced by reacting to
     the browser's own native 'toggle' event (fires for clicks, keyboard,
     and scripted changes alike) rather than trying to intercept clicks
     and re-implement toggling — that approach depended on a CSS
     transition finishing before the old item's `open` attribute got
     removed, which isn't reliable. The open/close animation itself is
     pure CSS now (see .faq-answer in main.css), so it works regardless
     of how the `open` attribute changed.
     --------------------------------------------------------------------- */
  document.querySelectorAll('.faq-list').forEach((list) => {
    const items = Array.from(list.querySelectorAll('.faq-item'));
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item && other.open) other.removeAttribute('open');
        });
      });
    });
  });

  /* ---------------------------------------------------------------------
     Newsletter form
     --------------------------------------------------------------------- */
  const form = document.querySelector('.newsletter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.parentElement.querySelector('.form-note');
      const input = form.querySelector('input');
      if (input && input.value.trim()) {
        note.textContent = 'You’re on the list — look out for market briefings in your inbox.';
        note.classList.add('success');
        input.value = '';
      }
    });
  }

  /* ---------------------------------------------------------------------
     Contact form
     --------------------------------------------------------------------- */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = contactForm.querySelector('.form-note');
      if (note) {
        note.textContent = 'Message received — our desk replies within one business day.';
        note.classList.add('success');
      }
      contactForm.reset();
    });
  }
})();
