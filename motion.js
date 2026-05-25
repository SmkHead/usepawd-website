/* ── Custom cursor (desktop only) ────────────────────────────── */
(function() {
  if (!matchMedia('(hover: hover)').matches) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(cursor);
  document.body.appendChild(dot);

  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let cx = mx, cy = my, dx = mx, dy = my;

  // Toggle white cursor over dark backgrounds.
  // Fast-path: explicit data-theme="dark" tag on a section.
  // Fallback: walk up from hovered element, read computed bg, check luminance.
  function updateCursorTheme(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    if (el.closest('[data-theme="dark"]')) {
      cursor.classList.add('on-dark'); dot.classList.add('on-dark'); return;
    }
    let node = el;
    while (node && node !== document.body) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg.match(/[\d.]+/g);
      if (m && m.length >= 3 && (m.length < 4 || +m[3] > 0.1)) {
        const lum = (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]) / 255;
        cursor.classList.toggle('on-dark', lum < 0.45);
        dot.classList.toggle('on-dark', lum < 0.45);
        return;
      }
      node = node.parentElement;
    }
    cursor.classList.remove('on-dark'); dot.classList.remove('on-dark');
  }

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; updateCursorTheme(mx, my); });
  function loop() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    dx += (mx - dx) * 0.5;
    dy += (my - dy) * 0.5;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  // hover state on interactive
  const sel = [
    'a', 'button', 'input', 'select',
    '.magnetic', '.swipe-card', '.contact-email',
    '.faq-q', '.city-pill',
    '.sh-chip', '.sh-distbtn', '.sh-locate', '.shelter-card', '.sh-search-area',
    '.sh-browse-state-link', '.sh-browse-city-link',
    '.bj-card', '.bj-featured-card', '.blog-related-card', '.blog-cta-btn',
    '.bj-cta-btn-primary', '.bj-cta-btn-ghost',
    '.cp-other-link', '.sp-city-card', '.sp-state-link',
  ].join(', ');
  document.addEventListener('mouseover', e => {
    if (e.target.closest(sel)) cursor.classList.add('is-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(sel)) cursor.classList.remove('is-hover');
  });

  document.addEventListener('mousedown', () => cursor.classList.add('is-drag'));
  document.addEventListener('mouseup', () => cursor.classList.remove('is-drag'));
})();

/* ── Nav scroll state ─────────────────────────────────────────── */
(function() {
  const nav   = document.querySelector('nav');
  const inner = nav && nav.querySelector('.nav-inner');
  if (!nav) return;

  function update() {
    const p = Math.min(1, window.scrollY / 100);
    // ease-out quad — snappy at the top, smooth plateau
    const e = 1 - (1 - p) * (1 - p);

    nav.style.background        = `rgba(246,241,232,${(e * 0.9).toFixed(3)})`;
    nav.style.borderBottomColor = `rgba(26,26,26,${(e * 0.1).toFixed(3)})`;
    nav.style.boxShadow = e > 0.04
      ? `0 1px ${Math.round(e * 28)}px rgba(0,0,0,${(e * 0.07).toFixed(3)})`
      : '';
    if (inner) inner.style.height = `${Math.round(68 - e * 12)}px`;
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  update();
})();

/* ── Fade-up reveal ───────────────────────────────────────────── */
(function() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
})();

/* ── Magnetic buttons ─────────────────────────────────────────── */
(function() {
  document.querySelectorAll('.magnetic').forEach(el => {
    const strength = +(el.dataset.magnet || 0.3);
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width/2);
      const y = e.clientY - (r.top + r.height/2);
      el.style.transform = `translate(${x*strength}px, ${y*strength}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
})();

/* ── 3D tilt on hover ─────────────────────────────────────────── */
(function() {
  document.querySelectorAll('.tilt').forEach(el => {
    const max = +(el.dataset.tilt || 8);
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * max;
      const ry = (px - 0.5) * max;
      el.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
})();

/* ── Hero phone parallax tilt on mouse ────────────────────────── */
(function() {
  const phone = document.querySelector('.phone-wrap-hero');
  if (!phone) return;
  const right = document.querySelector('.hero-right');
  right.addEventListener('mousemove', e => {
    const r = right.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    phone.style.transform = `perspective(1200px) rotateX(${-py*6}deg) rotateY(${px*8}deg) translateY(${py*-6}px)`;
  });
  right.addEventListener('mouseleave', () => {
    phone.style.transform = '';
  });
})();

/* ── Phones-section slide-in based on scroll ──────────────────── */
(function() {
  const phoneLeft  = document.querySelector('.phone-left');
  const phoneRight = document.querySelector('.phone-right');
  const stage = document.querySelector('.phones-stage');
  if (!phoneLeft || !phoneRight || !stage) return;

  function update() {
    const rect = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const raw = (vh - rect.top) / (vh * 1.15);
    const p = Math.min(1, Math.max(0, raw));
    const eased = 1 - Math.pow(1 - p, 3);
    const offset = Math.round((1 - eased) * vw * 0.7);
    phoneLeft.style.transform = `translateX(${-offset}px) rotate(${-6 + eased*4}deg) translateY(${20 - eased*20}px)`;
    phoneLeft.style.opacity = Math.min(1, p*2);
    phoneRight.style.transform = `translateX(${offset}px) rotate(${6 - eased*4}deg) translateY(${20 - eased*20}px)`;
    phoneRight.style.opacity = Math.min(1, p*2);
  }
  (function loop(){ update(); requestAnimationFrame(loop); })();
})();

/* ── Phone-section tilt (inner wrap only, never touches slide-in) ─ */
(function() {
  document.querySelectorAll('.phones-stage .phone-wrap').forEach(wrap => {
    const inner = wrap.querySelector('.phone-tilt-wrap');
    if (!inner) return;
    wrap.addEventListener('mousemove', e => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * 9;
      const ry = (px - 0.5) * 9;
      inner.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    wrap.addEventListener('mouseleave', () => {
      inner.style.transform = '';
    });
  });
})();

/* ── Counter for mission stat ─────────────────────────────────── */
(function() {
  const el = document.querySelector('[data-counter]');
  if (!el) return;
  const target = +el.dataset.counter;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const dur = 1800; const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.firstChild.textContent = Math.round(eased * target);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  io.observe(el);
})();

/* ── Draggable swipe card stack ───────────────────────────────── */
(function() {
  const deck = document.querySelector('.swipe-deck');
  if (!deck) return;
  const cards = [...deck.querySelectorAll('.swipe-card')];
  let order = cards.map((_, i) => i);

  function layout() {
    cards.forEach((c, i) => {
      const pos = order.indexOf(i);
      c.dataset.i = pos;
      c.style.zIndex = cards.length - pos;
      if (pos === 0) {
        c.style.transform = `rotate(-3deg) translate(0,0)`;
      } else if (pos === 1) {
        c.style.transform = `translateY(4px) translateX(4px) rotate(-1deg) scale(0.98)`;
      } else {
        c.style.transform = `translateY(8px) translateX(8px) rotate(3deg) scale(0.96)`;
      }
      c.style.opacity = '1';
    });
  }
  layout();

  function bind(card) {
    let sx=0, sy=0, dx=0, dy=0, dragging=false;
    const onDown = (e) => {
      if (+card.dataset.i !== 0) return;
      dragging = true;
      const pt = e.touches ? e.touches[0] : e;
      sx = pt.clientX; sy = pt.clientY;
      card.style.transition = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      if (e.touches) e.preventDefault();
      const pt = e.touches ? e.touches[0] : e;
      dx = pt.clientX - sx;
      dy = pt.clientY - sy;
      const rot = dx * 0.08;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      const threshold = 80;
      card.style.transition = 'transform .55s cubic-bezier(0.34,1.56,0.64,1), opacity .4s';
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        const flyX = Math.sign(dx || 1) * (window.innerWidth * 0.6);
        const flyY = dy * 1.5;
        const rot = dx * 0.2;
        card.style.transform = `translate(${flyX}px, ${flyY}px) rotate(${rot}deg)`;
        card.style.opacity = '0';
        setTimeout(() => {
          // recycle to bottom
          const idx = cards.indexOf(card);
          order = order.filter(x => x !== idx).concat(idx);
          card.style.transition = 'none';
          card.style.transform = `translateY(8px) translateX(8px) rotate(3deg) scale(0.96)`;
          setTimeout(() => {
            card.style.transition = 'transform .5s cubic-bezier(0.34,1.56,0.64,1), opacity .4s';
            card.style.opacity = '1';
            layout();
          }, 30);
        }, 450);
      } else {
        card.style.transform = `rotate(-3deg)`;
      }
    };
    card.addEventListener('mousedown', onDown);
    card.addEventListener('touchstart', onDown, { passive: true });
  }
  cards.forEach(bind);
})();

/* ── Step card pinning indicator + stat swap ──────────────────── */
(function() {
  const dots  = document.querySelectorAll('.how-progress .dot');
  const stats = document.querySelectorAll('.how-stat');
  const steps = document.querySelectorAll('.step-card');
  if (!dots.length || !steps.length) return;

  function update() {
    const vh = window.innerHeight;
    let active = 0;
    steps.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top < vh * 0.5) active = i;
    });
    dots.forEach((d, i)  => d.classList.toggle('active', i <= active));
    stats.forEach((s, i) => s.classList.toggle('active', i === active));
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ── Form submit handler ──────────────────────────────────────── */
(function() {
  const form = document.getElementById('notify-form');
  if (!form) return;
  const success = document.getElementById('form-success');
  const note = document.querySelector('.form-note');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.style.display = 'none';
        if (note) note.style.display = 'none';
        success.style.display = 'block';
        burstPaws(form);
      }
    } catch {}
  });

  function burstPaws(host) {
    const r = host.getBoundingClientRect();
    for (let i=0; i<14; i++) {
      const p = document.createElement('div');
      p.textContent = '🐾';
      p.style.cssText = `position:fixed; left:${r.left + r.width/2}px; top:${r.top + r.height/2}px; font-size: ${14 + Math.random()*16}px; pointer-events:none; z-index:9998; transition: transform 1.4s cubic-bezier(.16,1,.3,1), opacity 1.4s ease; transform: translate(-50%,-50%);`;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        const a = Math.random() * Math.PI * 2;
        const d = 80 + Math.random() * 160;
        p.style.transform = `translate(${Math.cos(a)*d - 50}%, ${Math.sin(a)*d - 50}%) rotate(${(Math.random()-0.5)*180}deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 1500);
    }
  }
})();

/* ── Page transitions ─────────────────────────────────────────── */
(function() {
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http') || a.target === '_blank') return;
    e.preventDefault();
    document.documentElement.classList.add('page-leaving');
    setTimeout(function() { window.location.href = href; }, 280);
  });
})();

/* ── Video autoplay safety ────────────────────────────────────── */
(function() {
  const v = document.querySelector('.hero-vid');
  if (v) { v.muted = true; v.play().catch(()=>{}); }
})();

/* ── FAQ Accordion ────────────────────────────────────────────── */
(function() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;
  items.forEach(item => {
    const btn = item.querySelector('.faq-q');
    const ans = item.querySelector('.faq-a');
    if (!btn || !ans) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all open items
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq-q');
        const a = i.querySelector('.faq-a');
        if (b) b.setAttribute('aria-expanded', 'false');
        if (a) a.style.maxHeight = '0';
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        ans.style.maxHeight = ans.scrollHeight + 'px';
      }
    });
  });
})();
