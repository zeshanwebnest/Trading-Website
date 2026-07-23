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

  // The mobile menu's open/close is driven by a native checkbox + label
  // pair in the HTML/CSS (see .nav-check in main.css) — it works with zero
  // JavaScript. Everything here is pure enhancement on top of that, so if
  // any of it fails to run, the toggle itself still works.
  const navCheck = document.querySelector('.nav-check');
  const navLinks = document.querySelector('.nav-links');
  if (navCheck && navLinks) {
    // Plain `overflow:hidden` on <body> is well known to not reliably stop
    // background touch-scroll on iOS Safari. Pinning the body in place with
    // position:fixed and restoring the exact scroll offset on close is the
    // standard cross-browser-safe way to lock scroll behind an open menu.
    let lockedScrollY = 0;
    const lockScroll = () => {
      lockedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.width = '100%';
    };
    const unlockScroll = () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, lockedScrollY);
    };

    navCheck.addEventListener('change', () => {
      if (navCheck.checked) lockScroll(); else unlockScroll();
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => { navCheck.checked = false; unlockScroll(); });
    });
    // Esc closes the menu, and resizing past the mobile breakpoint (e.g.
    // rotating a tablet to landscape) shouldn't leave scroll locked behind
    // a menu that CSS has now hidden.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navCheck.checked) { navCheck.checked = false; unlockScroll(); }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1400 && navCheck.checked) { navCheck.checked = false; unlockScroll(); }
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
     Canvas: hero live candlestick chart. Not real market data — a
     continuously-scrolling OHLC series that ticks a new candle every
     TICK_MS, with the price/delta/24h stats above and below the chart
     kept in sync with the same series so the whole panel reads as one
     live terminal rather than a static illustration.
     --------------------------------------------------------------------- */
  const heroCanvas = document.getElementById('hero-chart');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    const priceEl = document.querySelector('.hero-panel-price .price-value');
    const deltaEl = document.querySelector('.hero-panel-price .delta');
    const footEls = document.querySelectorAll('.hero-panel-foot b');
    const dpr = window.devicePixelRatio || 1;

    const CANDLE_COUNT = 26;
    const TICK_MS = 1700;
    let w = 0, h = 0, candles = [];

    const nextCandle = (prevClose) => {
      const open = prevClose;
      const close = open + (Math.random() - 0.48) * 6.5;
      const high = Math.max(open, close) + Math.random() * 3;
      const low = Math.min(open, close) - Math.random() * 3;
      return { open, close, high, low };
    };

    const seed = () => {
      candles = [];
      let last = 2398.4;
      for (let i = 0; i < CANDLE_COUNT; i++) {
        const c = nextCandle(last);
        candles.push(c);
        last = c.close;
      }
    };
    seed();

    const resize = () => {
      const rect = heroCanvas.getBoundingClientRect();
      w = rect.width || heroCanvas.clientWidth || 1;
      h = rect.height || heroCanvas.clientHeight || 1;
      heroCanvas.width = w * dpr;
      heroCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const updateStats = () => {
      const last = candles[candles.length - 1];
      const first = candles[0];
      if (priceEl) priceEl.textContent = fmt(last.close);
      if (deltaEl) {
        const pct = ((last.close - first.open) / first.open) * 100;
        const up = pct >= 0;
        deltaEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
        deltaEl.classList.toggle('up', up);
        deltaEl.classList.toggle('down', !up);
      }
      if (footEls.length === 3) {
        const high = Math.max(...candles.map((c) => c.high));
        const low = Math.min(...candles.map((c) => c.low));
        footEls[0].textContent = fmt(high);
        footEls[1].textContent = fmt(low);
        footEls[2].textContent = `$${(800 + Math.random() * 90).toFixed(0)}M`;
      }
    };
    updateStats();

    const tick = () => {
      candles.push(nextCandle(candles[candles.length - 1].close));
      candles.shift();
      updateStats();
    };

    const draw = (slide) => {
      ctx.clearRect(0, 0, w, h);

      const prices = candles.flatMap((c) => [c.high, c.low]);
      const max = Math.max(...prices), min = Math.min(...prices);
      const span = (max - min) || 1;
      const pad = span * 0.18;
      const yFor = (p) => h - ((p - (min - pad)) / (span + pad * 2)) * h;

      ctx.strokeStyle = 'rgba(212,175,55,0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = Math.round((h / 4) * i) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cw = w / CANDLE_COUNT;
      const bodyW = Math.max(cw * 0.5, 2);
      const slideOffset = slide * cw;

      candles.forEach((c, i) => {
        const x = i * cw - slideOffset + cw / 2;
        if (x < -cw || x > w + cw) return;
        const up = c.close >= c.open;
        const rgb = up ? '111,174,140' : '194,107,95';
        const isLast = i === candles.length - 1;

        ctx.strokeStyle = `rgba(${rgb},${isLast ? 0.9 : 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yFor(c.high));
        ctx.lineTo(x, yFor(c.low));
        ctx.stroke();

        const yOpen = yFor(c.open), yClose = yFor(c.close);
        const top = Math.min(yOpen, yClose), bh = Math.max(Math.abs(yClose - yOpen), 1.5);
        if (isLast) { ctx.shadowColor = `rgba(${rgb},0.7)`; ctx.shadowBlur = 10; }
        ctx.fillStyle = `rgba(${rgb},${isLast ? 0.85 : 0.45})`;
        ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
        ctx.shadowBlur = 0;
      });

      const lineY = yFor(candles[candles.length - 1].close);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(212,175,55,0.55)';
      ctx.shadowColor = 'rgba(212,175,55,0.6)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
      ctx.restore();
    };

    if (reduceMotion) {
      draw(0);
    } else {
      let lastTick = 0;
      const render = (t) => {
        if (!lastTick) lastTick = t;
        const elapsed = t - lastTick;
        if (elapsed >= TICK_MS) { tick(); lastTick = t; }
        draw(Math.min(elapsed / TICK_MS, 1));
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
    }
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
    ctx.fillStyle = `rgba(212,175,55,${fillOpacity})`;
    ctx.fill();
  };

  document.querySelectorAll('.instrument-card canvas').forEach((c) => {
    drawSparkline(c, { points: 20, volatility: parseFloat(c.dataset.vol || '1') });
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
