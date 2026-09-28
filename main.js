(() => {
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const SP = 'assets/sprites/';
  const EMAIL = 'deepaliharish21w@gmail.com';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQ = matchMedia('(max-width: 767px)'), noRopeQ = matchMedia('(max-width: 1259px)');
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  // sprite metadata: width, height, rope x-centre (climb frames)
  const CLIMB = [[376,502,217.5],[368,494,213],[354,494,204],[386,500,222.5],[374,514,213.5],[420,480,193],[384,504,155.5],[320,542,101.5],[350,532,119]]
    .map(([w, h, cx], i) => ({ src: `${SP}climb-0${i + 1}.webp`, w, h, cx }));
  const LAND = [[426,468],[370,412],[322,354],[388,330]].map(([w, h], i) => ({ src: `${SP}jump-down-0${i + 1}.webp`, w, h }))
    .concat({ src: `${SP}tired-standing-01.webp`, w: 364, h: 606 });
  const FLAP = ['open-01','half-right','close','half-left','open-02','half-right','close','half-left'].map(n => `${SP}butterfly-${n}.webp`);
  [...CLIMB, ...LAND].map(f => f.src).concat(FLAP, SP + 'front-standing.webp').forEach(s => (new Image().src = s));

  const hero = $('.hero'), heroGirl = $('#hero-girl'), work = $('.work');
  const rope = $('#rope'), ropeLine = $('.rope-line'), pile = $('.pile');
  const climber = $('#climber'), landing = $('#landing'), hint = $('.scroll-hint');

  /* ---------- layout for rope + landing ---------- */
  let s = 0.4, ropeX = 100, ropeTop = 0, ropeBottom = 0;
  function layout() {
    const W = document.documentElement.clientWidth;
    s = mobileQ.matches ? 0.3 : 0.4;
    ropeX = Math.max(100, (W - 1280) / 2 + 100);
    ropeTop = hero.offsetHeight + 10;
    ropeBottom = work.getBoundingClientRect().bottom + scrollY;
    const H = ropeBottom - ropeTop;
    Object.assign(rope.style, { left: ropeX + 'px', top: ropeTop + 'px', height: H + 'px' });
    Object.assign(ropeLine.style, { width: 42 * s + 'px', height: H - 486 * s * 0.55 + 'px' });
    Object.assign(pile.style, { width: 596 * s + 'px', left: -333 * s + 'px', bottom: -63 * s + 'px' });
    landing.style.left = (noRopeQ.matches ? (mobileQ.matches ? 70 : 110) : ropeX + 150) + 'px';
  }
  new ResizeObserver(layout).observe(document.body);
  layout();

  /* ---------- hero girl waves ---------- */
  if (!reduce) {
    let w = true;
    setInterval(() => { w = !w; heroGirl.src = SP + (w ? 'waving-standing' : 'front-standing') + '.webp'; }, 450);
  }

  /* ---------- climber + landing ---------- */
  let f = 0, acc = 0, lastY = scrollY, y = null, landed = false, timers = [];
  function setClimb(i) {
    const fr = CLIMB[i];
    climber.src = fr.src; climber.style.width = fr.w * s + 'px'; climber.style.height = fr.h * s + 'px';
  }
  function setLand(i, lift) {
    const fr = LAND[i];
    landing.src = fr.src; landing.style.height = fr.h * s + 'px';
    landing.style.transform = `translate(-50%, ${lift}px)`;
  }
  function land() {
    landed = true; landing.hidden = false;
    if (reduce) return setLand(4, 0);
    LAND.forEach((_, i) => timers.push(setTimeout(() => setLand(i, i === 0 ? -90 * s * 2.5 : 0), i * 120)));
  }
  function unland() {
    landed = false; timers.forEach(clearTimeout); timers = []; landing.hidden = true;
  }
  setClimb(0);

  function updateClimber() {
    const sy = scrollY, vh = innerHeight;
    const shouldLand = ropeBottom - sy <= vh * 0.4 + 100;
    if (shouldLand !== landed) shouldLand ? land() : unland();
    hint.classList.toggle('gone', sy > 40);
    if (noRopeQ.matches) return;
    acc += sy - lastY; lastY = sy;
    let changed = false;
    while (Math.abs(acc) >= 24) { const d = Math.sign(acc); f = (f - d + 9) % 9; acc -= d * 24; changed = true; }
    if (changed && !reduce) setClimb(f);
    const fr = CLIMB[f], h = fr.h * s;
    const target = clamp(sy + vh * 0.4 - h / 2, ropeTop, ropeBottom - h - 486 * s * 0.5);
    y = y === null || reduce ? target : y + (target - y) * 0.18;
    climber.style.transform = `translate(${ropeX - fr.cx * s}px, ${y}px)`;
    climber.style.opacity = heroGirl.getBoundingClientRect().bottom < 0 && !landed ? 1 : 0;
  }

  /* ---------- butterflies ---------- */
  const flies = $('#flies');
  const mouse = { x: 0, y: 0, known: false };
  addEventListener('pointermove', e => Object.assign(mouse, { x: e.clientX, y: e.clientY, known: true }), { passive: true });
  addEventListener('pointerdown', e => Object.assign(mouse, { x: e.clientX, y: e.clientY, known: true }), { passive: true });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) mouse.known = false; });

  const bs = Array.from({ length: 7 }, (_, i) => {
    const el = document.createElement('img');
    el.className = 'fly'; el.alt = ''; el.src = FLAP[i % FLAP.length]; flies.appendChild(el);
    const W = innerWidth, H = hero.offsetHeight;
    return { el, i, x: W * (0.08 + Math.random() * 0.84), y: H * (0.2 + Math.random() * 0.6), vx: 0, vy: 0, head: 0,
      ph: Math.random() * 6.28, r: 40 + Math.random() * 70, spd: 0.6 + Math.random() * 0.8,
      fi: i, ft: 0, fdur: 70 + Math.random() * 60, wx: 0, wy: 0, wt: 0 };
  });

  function drawFly(b) {
    b.el.style.transform = `translate(${b.x}px, ${b.y}px) translate(-50%, -50%) rotate(${b.head}deg)`;
  }

  function updateFlies(t) {
    const W = document.documentElement.clientWidth, sy = scrollY, vh = innerHeight;
    const my = mouse.y + sy, gr = heroGirl.getBoundingClientRect(), gx = gr.left + gr.width / 2, gy = gr.top + sy + gr.height * 0.4;
    for (const b of bs) {
      let tx, ty;
      const a = t / 1000 * b.spd + b.ph;
      if (b.i >= 3) {
        tx = gx + Math.cos(a * 0.7) * (b.r + 70); ty = gy + Math.sin(a * 0.9) * (b.r + 30) * 0.6;
      } else if (mouse.known) {
        tx = mouse.x + Math.cos(a) * b.r; ty = my + Math.sin(a * 1.3) * b.r * 0.6;
      } else {
        if (t > b.wt || Math.abs(b.wy - (sy + vh / 2)) > vh) {
          b.wx = W * (0.05 + Math.random() * 0.9);
          b.wy = sy + vh * (0.1 + Math.random() * 0.8);
          b.wt = t + 2000 + Math.random() * 3000;
        }
        tx = b.wx; ty = b.wy;
      }
      ty += Math.sin(t / 300 + b.ph) * 8;
      b.vx = (b.vx + (tx - b.x) * 0.012) * 0.92;
      b.vy = (b.vy + (ty - b.y) * 0.012) * 0.92;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 9) { b.vx *= 9 / sp; b.vy *= 9 / sp; }
      b.x += b.vx; b.y += b.vy;
      if (sp > 0.6) {
        const want = Math.atan2(b.vy, b.vx) * 57.3 + 90;
        b.head += ((((want - b.head) % 360) + 540) % 360 - 180) * 0.08;
      }
      if (t - b.ft > b.fdur) { b.fi = (b.fi + 1) % FLAP.length; b.el.src = FLAP[b.fi]; b.ft = t; }
      drawFly(b);
    }
  }

  function loop(t) { updateClimber(); if (!reduce) updateFlies(t); requestAnimationFrame(loop); }
  bs.forEach(drawFly);
  requestAnimationFrame(loop);

  /* ---------- card text colour from background ---------- */
  $$('.card').forEach(card => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 32; c.height = 16;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0, 32, 16);
        const d = x.getImageData(0, 0, 32, 16).data; let l = 0;
        for (let i = 0; i < d.length; i += 4) l += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        card.style.color = (l / (d.length / 4) / 255) * 0.6 > 0.5 ? '#3b3b3b' : '#fff'; // 0.6 = 40% dark overlay
      } catch { /* file:// blocks canvas reads; keep white */ }
    };
    img.src = card.dataset.bg;
  });

  /* ---------- glass menu ---------- */
  const menu = $('.menu'), toggle = $('.menu-toggle');
  const setMenu = open => { menu.classList.toggle('open', open); toggle.setAttribute('aria-expanded', open); };
  toggle.addEventListener('click', e => { e.stopPropagation(); setMenu(true); });
  $$('.menu-items a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- contact: mailto + copy ---------- */
  const toast = $('.toast'); let tt;
  const copy = () => navigator.clipboard?.writeText(EMAIL).then(() => {
    toast.hidden = false; clearTimeout(tt); tt = setTimeout(() => (toast.hidden = true), 2000);
  }).catch(() => {});
  $$('.mail:not(.li)').forEach(a => a.addEventListener('click', copy));
  const bubble = $('.bubble');
  $('.hi-btn').addEventListener('click', e => { e.stopPropagation(); bubble.hidden = !bubble.hidden; });
  $('.copy-btn').addEventListener('click', e => { e.stopPropagation(); copy(); });

  /* ---------- project modal (edit content here) ---------- */
  const CS = 'assets/case-study/';
  const PROJECTS = {
    b2b: {
      title: 'Food R&D B2B SaaS Platform',
      tags: [['Food-tech', 1], ['B2B SaaS'], ['Product Design'], ['Design Systems'], ['UX Research']],
      cover: CS + 'cover.webp',
      link: 'case-study.html',
      sections: [
        ['Overview', 'A workflow-automation platform for food-tech R&D that brings experimentation, sensory, processing and sample-request teams onto one system, with API connectors, AI support and secure handling of proprietary formulation data.', 'overview'],
        ['Problem', 'R&D work was scattered across spreadsheets, legacy tools and hand-offs. Scientists lost whole afternoons to manual record-keeping, and strict IP rules meant any AI had to keep proprietary data inside the platform.', 'problem'],
        ['Research', 'Direct interviews with four R&D teams and a competitive teardown of existing lab software. The pattern: feature-heavy but outdated tools, mostly manual entry, limited API transfer and almost no AI for formulation.', 'research'],
        ['Process', 'Research, information architecture, wireframes, visual identity, then usability and A/B testing. Personas from intern to expert kept dense, data-heavy screens calm for every level of user.', 'process'],
        ['Outcome', 'Core R&D workflow time fell 82% in the first three months and is now down 90%+, with 90%+ adoption of the new module. Country-specific nutrition-facts panels replaced work spread across ~500 separate files.', 'outcome'],
      ],
    },
    website: { title: 'Company Website', tags: [['Web Design'], ['UX'], ['Brand']] },
  };
  const DEFAULT = ['Overview', 'Problem', 'Research', 'Process', 'Outcome'].map(h => [h, 'Content coming soon.']);
  const modal = $('.modal'), mScroll = $('.m-scroll'); let lastFocus;
  function openModal(id, btn) {
    const p = PROJECTS[id];
    mScroll.innerHTML = (p.cover ? `<img class="m-cover" src="${p.cover}" alt="${p.title} case study cover">` : '<div class="m-cover ph-box">Cover image</div>') +
      `<div class="m-body"><h2 id="m-title">${p.title}</h2><div class="chips">${p.tags.map(([t, hl]) => `<span${hl ? ' class="hl"' : ''}>${t}</span>`).join('')}</div><hr>` +
      (p.sections || DEFAULT).map(([h, txt, img]) => `<h3>${h}</h3><p>${txt}</p>` +
        (img ? `<img class="m-img" src="${CS + img}.webp" alt="${h} from the case study" loading="lazy">` : '<div class="ph-box m-img">Image</div>')).join('') +
      (p.link ? `<a class="cta" href="${p.link}" target="_blank" rel="noopener">View case study <span aria-hidden="true">↗</span></a>` : '') + '</div>';
    lastFocus = btn; modal.hidden = false; mScroll.scrollTop = 0; document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('show')); $('.m-close').focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('show'); document.body.style.overflow = '';
    setTimeout(() => (modal.hidden = true), 250); lastFocus?.focus();
  }
  $$('button.row').forEach(b => b.addEventListener('click', () => openModal(b.dataset.project, b)));
  $('.m-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  /* ---------- global dismiss ---------- */
  document.addEventListener('click', e => {
    if (!menu.contains(e.target)) setMenu(false);
    if (!bubble.contains(e.target)) bubble.hidden = true;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); bubble.hidden = true; closeModal(); } });
})();
