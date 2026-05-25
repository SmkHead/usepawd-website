/* ── Counters for stats + dashboard ──────────────────────────── */
(function() {
  const els = document.querySelectorAll('[data-counter]');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.counter;
      const decimals = +(el.dataset.decimals || 0);
      const dur = 1800; const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = eased * target;
        el.textContent = decimals
          ? val.toFixed(decimals)
          : Math.round(val).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
})();

/* ── Bold statement word reveal ──────────────────────────────── */
(function() {
  const stmt = document.querySelector('.fs-bold');
  if (!stmt) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { stmt.classList.add('in-view'); io.unobserve(stmt); }
    });
  }, { threshold: 0.3 });
  io.observe(stmt);
})();
