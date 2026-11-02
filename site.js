// GaVira Systems site. It opens with the GaVira mark and the person behind it. After that one gold thread
// does the work: it underlines the promise, runs through the four beats (lands, read, decide, sign), loops the
// statement, ticks each system in the routing table, does each desk's work, runs the person-in-the-loop figure of
// eight, signs Vidhya's closing note, and ends in the one button that books a call.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const f = (n) => n.toFixed(1);
  const docW = () => document.documentElement.clientWidth;
  const narrow = () => docW() < 1000;
  const gutter = () => parseFloat(getComputedStyle($('.wrap')).paddingLeft);

  // ---------- line art, with a caption under each drawing ----------
  for (const svg of $$('svg[data-art]')) {
    svg.setAttribute('viewBox', '0 0 256 256'); svg.setAttribute('width', 256); svg.setAttribute('height', 256);
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ART[svg.dataset.art] || ''); svg.appendChild(p);
    if (svg.dataset.cap) { const c = document.createElement('span'); c.className = 'cap'; c.textContent = svg.dataset.cap; svg.after(c); svg._cap = c; }
  }
  // (drawings are SVG, which has no offsetTop, so measure against the stage)
  const placeCaptions = () => { for (const svg of $$('svg[data-art]')) if (svg._cap) { const st = svg.parentNode.getBoundingClientRect(), r = svg.getBoundingClientRect(); svg._cap.style.left = f(r.left - st.left + r.width * 0.08) + 'px'; svg._cap.style.top = f(r.bottom - st.top - r.height * 0.06) + 'px'; } };

  // A smooth curve through points (Catmull-Rom as cubic Béziers), continuing an open path.
  function through(pts) {
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C ${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)}, ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)}, ${f(p2.x)} ${f(p2.y)}`;
    }
    return d;
  }
  // The signature, written into a canvas: every inked pixel of the name knows the moment the pen reaches it
  // (img/sig-time.png: red and green hold that time, blue the ink), so the name writes left to right.
  const sigInk = new Promise((done) => {
    const img = new Image();
    img.onload = () => {
      const { w, h } = SIGNATURE, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const px = x.getImageData(0, 0, w, h).data, at = [], when = [], ink = [];
      for (let i = 0; i < w * h; i++) if (px[i * 4 + 2]) { at.push(i); when.push((px[i * 4] * 256 + px[i * 4 + 1]) / 65535); ink.push(px[i * 4 + 2]); }
      done({ at, when, ink });
    };
    img.onerror = () => done(null);
    img.src = SIGNATURE.src;
  });
  function setSignature(canvas) {
    const { w, h } = SIGNATURE, ctx = canvas.getContext('2d');
    canvas.width = w; canvas.height = h;
    const out = ctx.createImageData(w, h), d = out.data;
    let data = null, t = 0;
    // gold, with the pen's tip a short soft edge rather than a hard cut
    const paint = () => {
      if (!data) return;
      const { at, when, ink } = data, soft = 0.012;
      for (let k = 0; k < at.length; k++) {
        const i = at[k] * 4, a = clamp((t - when[k]) / soft + 1, 0, 1);
        d[i] = 255; d[i + 1] = 209; d[i + 2] = 102; d[i + 3] = ink[k] * a;
      }
      ctx.putImageData(out, 0, 0);
    };
    sigInk.then((r) => { data = r; paint(); });
    const write = (duration, delay = 0) => gsap.fromTo({ v: 0 }, { v: 0 }, { v: 1, duration, delay, ease: 'none', onUpdate() { t = this.targets()[0].v; paint(); } });
    const show = () => { t = 1.02; paint(); };
    return { write, show };
  }

  // ---------- the thread ----------
  const svg = $('#thread'), strands = $('#t-pieces'), ink = $('#t-ink'), head = $('#t-head');
  const ruler = document.createElementNS(NS, 'path');
  ruler.setAttribute('visibility', 'hidden');
  svg.appendChild(ruler);
  const lengthOf = (start, d) => { ruler.setAttribute('d', `M ${f(start.x)} ${f(start.y)} ${d}`); return ruler.getTotalLength(); };
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  const DOWN = { x: 0, y: 1 }, UP = { x: 0, y: -1 }, RIGHT = { x: 1, y: 0 }, LEFT = { x: -1, y: 0 };
  const DIRS = { right: RIGHT, left: LEFT, up: UP, down: DOWN };

  // Each anchor's shape: where the thread enters (a), what it draws (d) and where it leaves (b), plus any
  // labels that light as it passes.
  const shape = (el) => drawShape(el);
  function drawShape(el) {
    const kind = el.dataset.thread || 'pass', k = box(el), cx = (k.l + k.r) / 2, cy = (k.t + k.b) / 2;
    const flat = narrow() && !el.classList.contains('node') && !el.classList.contains('pin') && !el.closest('.beats');
    if (kind === 'edge') {
      // The thread comes in from the left edge, the way the signature's pen did, along the line it underlines.
      const r = [...$('[data-thread="under"]').getClientRects()].pop();
      const y = narrow() ? r.top + scrollY - 24 : r.bottom + scrollY - r.height * 0.1;
      const c = { x: -12, y };
      return { a: c, b: c, d: '', in: RIGHT, out: RIGHT, nobow: true };
    }
    if (kind === 'under' && !flat) {
      const r = [...el.getClientRects()].pop(), l = r.left + scrollX - 8, rt = r.right + scrollX + 12, y = r.bottom + scrollY - r.height * 0.1;
      return { a: { x: l, y }, b: { x: rt, y: y - 3 }, d: ` Q ${f((l + rt) / 2)} ${f(y + 9)}, ${f(rt)} ${f(y - 3)}`, in: RIGHT, out: RIGHT, room: 0.25 };
    }
    if (kind === 'loop') {
      // The person in the loop, drawn as a figure of eight: the work leaves the person, goes round the AI's
      // side (it reads, the rules check) and comes back to the person, and only then goes out, straight down.
      const A = k.w * 0.4, ox = k.l + k.w * 0.46, oy = k.t + k.h * 0.5, N = 72, pts = [];
      for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI * 2, sn = Math.sin(t), c = Math.cos(t), q = 1 + sn * sn; pts.push({ x: ox + A * c / q, y: oy + A * sn * c / q }); }
      const R = pts[0], a = { x: R.x, y: k.t - 24 }, end = { x: R.x, y: k.b + 14 };
      const entry = ` L ${f(R.x)} ${f(R.y)}`, d = entry + through(pts) + ` L ${f(end.x)} ${f(end.y)}`;
      const lenIn = lengthOf(a, entry), all = lengthOf(a, d), cum = [0];
      for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      const at = (i) => (lenIn + cum[i] * (all - lenIn - (end.y - R.y)) / cum[N]) / all;
      const place = (el, x, y) => { el.style.left = f(x - k.l) + 'px'; el.style.top = f(y - k.t) + 'px'; };
      const person = $('.il-person', el), labels = $$('.il-label', el);
      place(person, R.x, R.y);
      const marks = [[person, at(0) + 0.002]];
      [6, 30, 42, 66].forEach((i, n) => { place(labels[n], pts[i].x, pts[i].y); marks.push([labels[n], at(i)]); });
      place(labels[4], end.x, end.y + 6); marks.push([labels[4], 0.995]);
      return { a, b: end, d, in: DOWN, out: DOWN, room: 0.12, marks };
    }
    if (kind === 'frame' && !flat) {
      // A loose loop drawn round the statement by hand: a soft rounded oval, a little more than once round.
      const rx = k.w / 2 + 6, ry = k.h / 2 + 4, pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = -0.25 + (i / 64) * Math.PI * 2.16, c = Math.cos(a), sn = Math.sin(a), n = 0.38;
        const wob = 1 + 0.015 * Math.sin(a * 3 + 1);
        pts.push({ x: cx + Math.sign(c) * Math.pow(Math.abs(c), n) * rx * wob, y: cy + Math.sign(sn) * Math.pow(Math.abs(sn), n) * ry * wob + i * 0.25 });
      }
      return { a: pts[0], b: pts[pts.length - 1], d: through(pts), in: DOWN, out: DOWN, room: 0.12, nobow: true };
    }
    const at = el.dataset.at;
    const c = { x: at === 'left' ? k.l - 10 : at === 'right' ? k.r + 10 : cx, y: cy };
    // On narrow screens there is no spare column: the thread keeps to the left margin, like a ledger's rule.
    if (flat) c.x = gutter() / 2;
    return { a: c, b: c, d: '', in: DIRS[el.dataset.in] || DOWN, out: DIRS[el.dataset.out] || DOWN, nobow: 'nobow' in el.dataset };
  }

  // Between anchors: one soft curve that leaves along the last shape and arrives along the next.
  let swing = 1;
  function connector(p, q) {
    const dx = q.a.x - p.b.x, dy = q.a.y - p.b.y, dist = Math.hypot(dx, dy);
    if (dist < 1) return '';
    const k = clamp(dist * 0.4, 24, 280);
    const bow = dy > 260 && p.out === DOWN && q.in === DOWN && !p.nobow && !q.nobow && !narrow() ? (swing = -swing) * Math.min(90, docW() * 0.06) : 0;
    return ` C ${f(p.b.x + p.out.x * k + bow)} ${f(p.b.y + p.out.y * k)}, ${f(q.a.x - q.in.x * k + bow)} ${f(q.a.y - q.in.y * k)}, ${f(q.a.x)} ${f(q.a.y)}`;
  }

  let anchors = [], pieces = [], keys = [], marks = [], total = 0, darkBands = [], contactTop = Infinity;
  function fitNames() {
    for (const el of $$('.stage .name .ln')) {
      el.style.fontSize = '';
      const w = el.closest('.stage').clientWidth - (narrow() ? 0 : 20);
      if (el.scrollWidth > w) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * w / el.scrollWidth) + 'px';
    }
  }
  function layout() {
    fitNames(); placeCaptions();
    // collapse the thread layers first, or their old height props the page open past the footer
    svg.setAttribute('height', 0);
    const W = docW(), H = document.documentElement.scrollHeight;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    anchors = $$('[data-thread]').filter((el) => el.getClientRects().length && !el.closest('dialog'));
    swing = 1;
    const shapes = anchors.map(shape);
    pieces = [];
    shapes.forEach((s, i) => {
      if (i) pieces.push({ d: connector(shapes[i - 1], s), from: shapes[i - 1].b, end: s.a });
      pieces.push({ d: s.d, from: s.a, end: s.b, anchor: i, room: s.room || 0, shape: s });
    });
    for (const p of pieces) p.len = p.d ? lengthOf(p.from, p.d) : 0;


    darkBands = $$('.dark').map((s) => { const r = s.getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY]; }).sort((a, b) => a[0] - b[0]);
    // One ink for the whole thread: deep gold on cream, light gold on the teal bands, changing exactly at each
    // band's edge. (Clip masks did the same job, but Safari redrew them for the whole page on every frame.)
    const stop = (at, c) => `<stop offset="${(at / H).toFixed(5)}" stop-color="${c}"/>`, onCream = '#d9a520', onTeal = '#ffd166';
    ink.setAttribute('y2', H);
    ink.innerHTML = stop(0, onCream) + darkBands.map(([a, b]) => stop(a, onCream) + stop(a, onTeal) + stop(b, onTeal) + stop(b, onCream)).join('') + stop(H, onCream);
    contactTop = box($('#contact')).t;
    assemble();
  }

  // Join the pieces, and work out how far down the page each length is reached. Depth only ever grows;
  // the drawings get a little scroll of their own so they are drawn rather than appearing at once.
  // Each piece is its own short path, so drawing the line only ever repaints the piece being drawn.
  function assemble() {
    if (!pieces.length) return;
    let L = 0, D = pieces[0].from.y;
    keys = [[0, D]]; marks = [];
    strands.textContent = '';
    for (const p of pieces) {
      p.start = L;
      if (p.anchor !== undefined) {
        anchors[p.anchor]._len = L;
        for (const [el, at] of (p.shape.marks || [])) if (el) { el._len = L + p.len * at; marks.push(el); }
      }
      if (p.len) {
        const e = document.createElementNS(NS, 'path');
        e.setAttribute('d', `M ${f(p.from.x)} ${f(p.from.y)}${p.d}`);
        e.style.strokeDasharray = `${p.len} ${p.len}`; e.style.strokeDashoffset = p.len; e.style.visibility = 'hidden';
        strands.appendChild(e); p.el = e; p.u = 0;
      }
      L += p.len;
      D = Math.max(p.end.y, D + (p.room ? p.len * p.room : 1));
      keys.push([L, D]);
    }
    total = L;
    kick();
  }

  function lengthAt(depth) {
    if (!keys.length || depth <= keys[0][1]) return 0;
    let lo = 0, hi = keys.length - 1;
    if (depth >= keys[hi][1]) return keys[hi][0];
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (keys[mid][1] <= depth) lo = mid; else hi = mid; }
    const [L0, D0] = keys[lo], [L1, D1] = keys[hi];
    return L0 + (L1 - L0) * (D1 > D0 ? (depth - D0) / (D1 - D0) : 1);
  }

  // The drawn length eases toward where the scroll says it should be, so the line glides instead of jumping.
  // Once the last section is on screen the thread is drawn all the way to the booking button.
  const state = { started: false, floor: 0, shown: 0 };
  const target = () => {
    if (reduce) return total;
    if (!state.started) return 0;
    if (scrollY + viewH * 0.55 > contactTop) return total;
    return Math.min(total, Math.max(state.floor, lengthAt(scrollY + viewH * 0.66)));
  };
  let raf = 0;
  const bar = $('.progress i');
  function loop() {
    raf = 0;
    const goal = target();
    state.shown += (goal - state.shown) * (reduce ? 1 : 0.12);
    if (Math.abs(goal - state.shown) < 0.6) state.shown = goal;
    render(state.shown);
    if (state.shown !== goal) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  const counted = new WeakSet();
  function setLit(el, on) {
    if (el.classList.contains('lit') === on) return;
    el.classList.toggle('lit', on);
    if (on && el._onLit) { el._onLit(); el._onLit = null; }
    if (el.dataset.also) $$(el.dataset.also).forEach((x) => x.classList.toggle('lit', on));
    if (on && el.dataset.count && !counted.has(el) && hasGsap && !reduce) {
      counted.add(el);
      const n = { v: 0 }, to = +el.dataset.count, dp = +(el.dataset.dp || 0), pre = el.dataset.pre || '', post = el.dataset.post || '';
      gsap.to(n, { v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => { el.textContent = pre + n.v.toFixed(dp) + post; } });
    }
  }
  function render(L) {
    // only the pieces whose drawn length changed are touched
    let at = null;
    for (const p of pieces) {
      if (!p.el) continue;
      const u = clamp(L - p.start, 0, p.len);
      if (u !== p.u) { p.u = u; p.el.style.strokeDashoffset = p.len - u; p.el.style.visibility = u > 0 ? 'visible' : 'hidden'; }
      if (u > 0 && u < p.len) at = p;
    }
    for (const el of anchors) setLit(el, el._len <= L + 1);
    for (const el of marks) setLit(el, el._len <= L + 1);
    if (bar) bar.style.transform = `scaleX(${total ? (L / total).toFixed(4) : 0})`;
    if (at && L < total - 2) {
      const p = at.el.getPointAtLength(at.u);
      head.setAttribute('cx', f(p.x)); head.setAttribute('cy', f(p.y));
      head.classList.add('on');
      head.classList.toggle('on-dark', darkBands.some(([a, b]) => p.y >= a && p.y <= b));
    } else head.classList.remove('on');
  }

  let queued = false;
  const relayout = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; layout(); if (hasGsap) ScrollTrigger.refresh(); }); };
  addEventListener('scroll', kick, { passive: true });
  // A phone's address bar sliding in and out only changes the height: that is not a new layout, and
  // re-measuring then would make the page jump mid-scroll. Only a change of width lays the page out again.
  let viewW = docW(), viewH = innerHeight;
  addEventListener('resize', () => { if (docW() === viewW) return; viewW = docW(); viewH = innerHeight; relayout(); });
  new ResizeObserver(relayout).observe(document.body);
  document.fonts && document.fonts.ready.then(relayout);
  addEventListener('load', relayout);
  layout();


  // ---------- headings come into focus as they arrive ----------
  const headIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); headIO.unobserve(e.target); } }), { threshold: 0.2 });
  $$('.blur-in').forEach((h) => headIO.observe(h));

  // ---------- the opening: the GaVira mark, "AI Systems", who is behind it; then the headline ----------
  const hero = $('#hero'), opening = $('.opening', hero);
  function startThread() {
    hero.classList.add('ready');
    state.started = true;
    const cue = $('.cue .node');
    const floor = () => cue._len || 0;
    if (reduce || !hasGsap) { state.floor = floor(); return kick(); }
    // The thread curls in from the corner and underlines "their work."
    const s = { v: 0 };
    gsap.to(s, { v: 1, delay: 0.5, duration: 1.8, ease: 'power2.inOut', onUpdate: () => { state.floor = floor() * s.v; kick(); } });
  }
  function playIntro() {
    const root = document.documentElement, done = () => { opening.remove(); root.classList.remove('opening-on'); release(); startThread(); };
    // While the opening plays the page holds still; a swipe, a wheel or a key plays the rest of it quickly instead
    // of scrolling the page out from under it.
    let tl = null;
    const hold = (e) => { if (e.cancelable) e.preventDefault(); if (tl) tl.timeScale(5); };
    const keys = (e) => { if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) hold(e); };
    const release = () => { removeEventListener('wheel', hold); removeEventListener('touchmove', hold); removeEventListener('keydown', keys); };
    if (reduce || !hasGsap || location.hash || scrollY > 40) return done();
    root.classList.add('opening-on');
    addEventListener('wheel', hold, { passive: false }); addEventListener('touchmove', hold, { passive: false }); addEventListener('keydown', keys);
    const logo = $('.o-logo', opening), sys = $('.o-sys', opening), me = $('.o-me', opening);
    sys.innerHTML = [...sys.textContent].map((c) => `<i>${c === ' ' ? '&nbsp;' : c}</i>`).join('');
    // fly an opening piece onto the element it becomes, then hand over to that element
    // (sized by `by`: the logo by its own width, the chip by its photo)
    const flyTo = (el, to, by = (x) => x) => { const a = el.getBoundingClientRect(), b = to.getBoundingClientRect(), k = by(to).getBoundingClientRect().width / by(el).getBoundingClientRect().width; return { x: b.left - a.left, y: b.top - a.top, scale: k, transformOrigin: '0 0', duration: 0.9, ease: 'power3.inOut' }; };
    tl = gsap.timeline({ delay: 0.25 })
      .fromTo(logo, { clipPath: 'inset(0 100% 0 0)', filter: 'brightness(0) invert(1) blur(10px)', y: 10 }, { clipPath: 'inset(0 0% 0 0)', filter: 'brightness(0) invert(1) blur(0px)', y: 0, duration: 1.1, ease: 'power3.inOut' })
      .from($$('i', sys), { y: 18, opacity: 0, duration: 0.5, stagger: 0.035, ease: 'power3.out' }, '-=0.35')
      .from($('img', me), { scale: 0.4, opacity: 0, duration: 0.55, ease: 'power3.out' }, '+=0.1')
      .from($('span', me), { x: -14, opacity: 0, duration: 0.5, ease: 'power3.out' }, '-=0.3')
      .add(() => {
        const fast = tl.timeScale() > 1 ? 0.3 : 0.9;
        gsap.to(logo, { ...flyTo(logo, $('.top .brand img')), duration: fast, onComplete: () => root.classList.remove('opening-on') });
        gsap.to(me, { ...flyTo(me, $('.hero-chip'), (x) => $('img', x)), duration: fast });
        gsap.to(sys, { opacity: 0, y: -10, duration: 0.4, ease: 'power2.in' });
        setTimeout(() => hero.classList.add('ready'), 450);
      }, '+=0.9')
      .add(done, '+=1.0');
  }
  playIntro();

  // ---------- the hero's lines drift apart as you scroll ----------
  if (hasGsap && !reduce) {
    const lines = $$('.hero h1 .ln');
    [[lines[0], -7], [lines[1], 9]].forEach(([el, x]) => gsap.to(el, { xPercent: x, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } }));
  }

  // ---------- each desk's name: its words drift apart as the scene scrolls past ----------
  for (const ln of $$('.stage .name .ln')) {
    const words = ln.textContent.trim().split(/\s+/);
    ln.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    if (!hasGsap || reduce) continue;
    const amp = () => (narrow() ? 0.025 : 0.045) * innerWidth;
    $$('.w', ln).forEach((w, i, all) => {
      const dir = all.length === 1 ? 1 : i === 0 ? -1 : 1;
      gsap.fromTo(w, { x: () => -dir * amp() * 0.35 }, { x: () => dir * amp(), ease: 'none', scrollTrigger: { trigger: ln.closest('.scene'), start: 'top bottom', end: 'bottom top', scrub: 0.7, invalidateOnRefresh: true } });
    });
  }

  // ---------- the sign-off: her note is signed as the thread reaches it ----------
  const noteSig = setSignature($('.note-sig canvas'));
  $('.note-sig .node')._onLit = () => (reduce || !hasGsap ? noteSig.show() : noteSig.write(1.8, 0.1));

  // ---------- the conversation ----------
  const talk = $('#talk'), talkSig = setSignature($('.sig', talk));
  // The booking page: on a wide screen it opens inside the card, otherwise the button takes you to it.
  // Until a booking page is set, the button starts an email asking for a call.
  const BOOKING = talk.dataset.booking, frame = $('.book-frame', talk), bookBtn = $('[data-book]', talk);
  if (BOOKING) bookBtn.href = BOOKING;
  bookBtn.addEventListener('click', () => { talk.dataset.booked = '1'; });
  function openTalk() {
    closeSheet();
    if (talk.open) return;
    const embed = BOOKING && !narrow();
    talk.classList.toggle('embedded', !!embed); frame.hidden = !embed;
    // gv=true is Google's own embed view of a booking page
    if (embed && !frame.firstElementChild.src) frame.firstElementChild.src = BOOKING + (BOOKING.includes('?') ? '&' : '?') + 'gv=true';
    talk.showModal();
    if (reduce || !hasGsap) talkSig.show();
    else talkSig.write(2.2, 0.5);
  }
  $$('[data-talk]').forEach((b) => b.addEventListener('click', openTalk));
  $('.close', talk).addEventListener('click', () => talk.close());
  talk.addEventListener('click', (e) => { if (e.target === talk) talk.close(); });

  // A key that presses itself: T opens the conversation from anywhere.
  const kbd = $('kbd');
  addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest('input, textarea, [contenteditable]') && !talk.open) {
      kbd.classList.add('pressed'); setTimeout(() => kbd.classList.remove('pressed'), 160);
      setTimeout(openTalk, 120);
    }
  });

  // ---------- small things ----------
  const toast = $('.toast'), brandMenu = $('.brand-menu');
  const say = (msg) => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 1800); };
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('vidhya@gavira.co.in'); say('Email copied'); } catch { say('vidhya@gavira.co.in'); }
  }));
  // Right-click the logo for a small menu.
  $('.brand').addEventListener('contextmenu', (e) => { e.preventDefault(); brandMenu.style.left = e.clientX + 'px'; brandMenu.style.top = e.clientY + 'px'; brandMenu.classList.add('open'); });
  addEventListener('pointerdown', (e) => { if (!e.target.closest('.brand-menu')) brandMenu.classList.remove('open'); });
  $$('a, button', brandMenu).forEach((b) => b.addEventListener('click', () => brandMenu.classList.remove('open')));

  // Nav labels roll over to a second copy on hover.
  $$('.navlink').forEach((a) => { const t = a.textContent; a.innerHTML = `<span class="roll"><span data-text="${t}">${t}</span></span>`; });

  // The phone menu.
  const sheet = $('#sheet'), menuBtn = $('.menu-btn');
  function closeSheet() { sheet.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => { const open = !sheet.classList.contains('open'); sheet.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); });
  $$('a', sheet).forEach((a) => a.addEventListener('click', closeSheet));

  if (fine && !reduce) {
    // Buttons lean toward the pointer.
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${f((e.clientX - r.left - r.width / 2) * 0.25)}px, ${f((e.clientY - r.top - r.height / 2) * 0.35)}px)`; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    // Cards tilt a little toward the pointer, like paper on a desk.
    $$('.stage .card, .stage .tool, .stage .panel').forEach((el) => {
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(700px) rotateX(${f(-y * 6)}deg) rotateY(${f(x * 8)}deg) translateY(-3px)`; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // ---------- film dialog ----------
  const film = $('#film'), video = $('video', film);
  const FILMS = 'https://gavira-systems.github.io/gavira-finance-demos/films/';
  $$('[data-film]').forEach((b) => b.addEventListener('click', () => {
    video.poster = `img/${b.dataset.film}-poster.jpg`;
    video.src = `${FILMS}${b.dataset.film}.mp4`;
    film.showModal(); video.play().catch(() => {});
  }));
  $('.close', film).addEventListener('click', () => film.close());
  film.addEventListener('click', (e) => { if (e.target === film) film.close(); });
  film.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); });

  // ---------- header: tone over dark sections, and where you are ----------
  const top = $('#top');
  const links = $$('.navlink').map((a) => [a, $(a.getAttribute('href'))]);
  function headerState() {
    const on = $$('.dark').some((s) => { const r = s.getBoundingClientRect(); return r.top <= 34 && r.bottom >= 34; });
    top.classList.toggle('on-dark', on);
    top.classList.toggle('scrolled', scrollY > 10);
    const y = innerHeight * 0.4;
    for (const [a, sec] of links) { const r = sec.getBoundingClientRect(); a.setAttribute('aria-current', r.top <= y && r.bottom > y ? 'true' : 'false'); }
  }
  addEventListener('scroll', headerState, { passive: true }); headerState();

  // ---------- the cursor: a gold ring that becomes a label over things you can act on ----------
  const cursor = $('.cursor'), label = $('span', cursor);
  if (fine && !reduce) {
    const pos = { x: -100, y: -100 }, at = { x: -100, y: -100 };
    addEventListener('pointermove', (e) => {
      pos.x = e.clientX; pos.y = e.clientY; cursor.classList.add('on');
      const t = e.target.closest && e.target.closest('[data-cursor]');
      cursor.classList.toggle('big', !!t); if (t) label.textContent = t.dataset.cursor;
      cursor.classList.toggle('on-dark', !!(e.target.closest && e.target.closest('.dark, dialog')));
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
    (function follow() {
      at.x += (pos.x - at.x) * 0.25; at.y += (pos.y - at.y) * 0.25;
      cursor.style.transform = `translate(${f(at.x)}px, ${f(at.y)}px)`;
      requestAnimationFrame(follow);
    })();
  }
})();
