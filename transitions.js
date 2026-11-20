/* froncu.dev page transitions.
   Every time one of the three pages opens it plays its own intro:
     code  – a terminal "builds" the page, then a scanline renders it top to bottom
     music – a red equalizer wall with the wordmark, which splits away bar by bar
     home  – two doors (the code side and the music side) meet at a seam and open
   Moving between the pages plays the destination's cover first, so the intro of
   the next page picks up exactly where the outro stopped.
   Each page sets <html data-fx="home|code|music"> plus a tiny inline cover in its
   <head>, so nothing flashes before this script runs. */
(function () {
  'use strict';
  const root = document.documentElement;
  const page = root.dataset.fx;
  if (!page || !('animate' in Element.prototype)) { root.classList.remove('fx-in', 'fx-busy'); return; }

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stacked = () => matchMedia('(max-width:760px), (max-aspect-ratio:4/5)').matches;   // same as the landing layout
  const base = new URL('.', document.currentScript.src).pathname;                         // site root, e.g. "/"
  const EASE = 'cubic-bezier(.7,0,.2,1)';
  const SOFT = 'cubic-bezier(.2,.7,.2,1)';

  const css = `
.fx{position:fixed; inset:0; z-index:10000; overflow:hidden}
.fx-scan{position:fixed; left:0; right:0; top:0; height:2px; z-index:10001; pointer-events:none;
  background:#B4B4FF; box-shadow:0 0 18px 4px rgba(140,140,255,.65), 0 0 2px 1px #8C8CFF}

/* code */
.fx--code{background:#0D0E11; color:#E9EAEE; font-family:'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace}
.fx--code .fx__grid{position:absolute; inset:0; opacity:.55;
  background:linear-gradient(#22252C 1px, transparent 1px) 0 0/40px 40px, linear-gradient(90deg, #22252C 1px, transparent 1px) 0 0/40px 40px;
  -webkit-mask-image:radial-gradient(70% 65% at 50% 50%, #000, transparent 80%); mask-image:radial-gradient(70% 65% at 50% 50%, #000, transparent 80%)}
.fx__term{position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(500px, calc(100vw - 40px));
  font-size:clamp(12px, 1.15vw, 15px); line-height:2}
.fx__term p{margin:0; white-space:nowrap; overflow:hidden}
.fx__pr{color:#6C707A} .fx__dollar{color:#8C8CFF}
.fx__cmd{display:inline-block; vertical-align:bottom; clip-path:inset(0 100% 0 0)}
.fx__caret{display:inline-block; width:.6em; height:1.15em; margin-left:3px; vertical-align:-.22em; background:#8C8CFF; animation:fx-blink .8s steps(1) infinite}
.fx__out{opacity:0; color:#A2A6B0}
.fx__out b{font-weight:500; color:#7DD8A4}
.fx__dots{color:#30343C}
.fx__bar{margin-top:14px; height:3px; border-radius:2px; background:#22252C; overflow:hidden}
.fx__bar span{display:block; height:100%; background:#8C8CFF; box-shadow:0 0 12px #8C8CFF; transform:scaleX(0); transform-origin:left}
@keyframes fx-blink{50%{opacity:0}}

/* music */
.fx__bars{position:absolute; inset:0; display:flex}
.fx__bars i{flex:1 1 0; background:#FF3B24; outline:1px solid #FF3B24}
.fx__mark{position:absolute; inset:0; display:grid; place-content:center; justify-items:center; gap:clamp(14px,2.4vh,24px); color:#1C0603; opacity:0}
.fx__mark span{font-family:'Anton', Impact, 'Arial Narrow Bold', sans-serif; font-size:clamp(64px, 15vw, 230px); line-height:.8; text-transform:uppercase}
.fx__mark b{font-weight:400; color:#F0E9DD}
.fx__eq{display:flex; align-items:flex-end; gap:clamp(4px,.5vw,6px); height:clamp(26px,4vh,40px)}
.fx__eq i{width:clamp(5px,.6vw,8px); height:100%; background:#1C0603; transform-origin:bottom; animation:fx-eq .36s ease-in-out infinite alternate}
@keyframes fx-eq{from{transform:scaleY(.12)} to{transform:scaleY(1)}}

/* home */
.fx__door{position:absolute; display:flex; align-items:center; overflow:hidden}
.fx__door--a{inset:0 50% 0 0; background:#0D0E11; color:#E9EAEE; justify-content:flex-end}
.fx__door--b{inset:0 0 0 50%; background:#FF3B24; color:#1C0603; justify-content:flex-start}
.fx--stacked .fx__door--a{inset:0 0 50% 0; align-items:flex-end; justify-content:center}
.fx--stacked .fx__door--b{inset:50% 0 0 0; align-items:flex-start; justify-content:center}
.fx__who{padding:0 clamp(16px,2.6vw,40px); white-space:nowrap; opacity:0}
.fx--stacked .fx__who{padding:clamp(14px,3vh,30px) 0}
.fx__who--code{font-family:'Geist', system-ui, sans-serif; font-weight:600; font-size:clamp(30px,4.4vw,68px); letter-spacing:-.045em}
.fx__who--music{font-family:'Anton', Impact, 'Arial Narrow Bold', sans-serif; font-size:clamp(42px,6.4vw,104px); line-height:.9; text-transform:uppercase}
.fx__seam{position:absolute; left:50%; top:0; bottom:0; width:2px; margin-left:-1px; background:#F0E9DD; transform:scaleY(0)}
.fx--stacked .fx__seam{left:0; right:0; top:50%; bottom:auto; width:auto; height:2px; margin:-1px 0 0; transform:scaleX(0)}
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const make = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const run = (node, frames, opts) => node.animate(frames, Object.assign({ fill: 'forwards' }, opts)).finished;
  const fonts = (spec, ms) => Promise.race([document.fonts ? document.fonts.load(spec).catch(() => {}) : 0, wait(ms)]);

  /* ── covers ─────────────────────────────────────────────────────────── */
  function codeCover(withTerminal){
    return make(`<div class="fx fx--code" aria-hidden="true"><div class="fx__grid"></div>${withTerminal ? `
      <div class="fx__term">
        <p><span class="fx__pr">~/froncu.dev</span> <span class="fx__dollar">$</span> <span class="fx__cmd">cd code &amp;&amp; ./build</span><i class="fx__caret"></i></p>
        <p class="fx__out">compiling shaders <span class="fx__dots">···········</span> <b>ok</b></p>
        <p class="fx__out">linking engine <span class="fx__dots">··············</span> <b>ok</b></p>
        <div class="fx__bar"><span></span></div>
      </div>` : ''}</div>`);
  }
  function musicCover(withMark){
    const n = innerWidth < 700 ? 10 : 18;
    return make(`<div class="fx fx--music" aria-hidden="true"><div class="fx__bars">${'<i></i>'.repeat(n)}</div>${withMark ? `
      <div class="fx__mark"><span>Froncu<b>*</b></span><div class="fx__eq">${
        [0, .12, .26, .06, .2, .32, .1, .24, .04].map(d => `<i style="animation-delay:-${d}s"></i>`).join('')}</div></div>` : ''}</div>`);
  }
  function homeCover(withNames){
    return make(`<div class="fx fx--home${stacked() ? ' fx--stacked' : ''}" aria-hidden="true">
      <div class="fx__door fx__door--a">${withNames ? '<span class="fx__who fx__who--code">Jakub Frątczak</span>' : ''}</div>
      <div class="fx__door fx__door--b">${withNames ? '<span class="fx__who fx__who--music">Froncu</span>' : ''}</div>
      ${withNames ? '<i class="fx__seam"></i>' : ''}</div>`);
  }

  /* ── intros: start fully covered (matching the inline cover), end revealed ── */
  let current = null, skipped = false;
  const done = () => {
    root.classList.remove('fx-in', 'fx-busy');
    document.querySelectorAll('.fx, .fx-scan').forEach(n => n.remove());
    current = null;
  };

  async function introCode(){
    const o = current = codeCover(true), scan = make('<div class="fx-scan" style="opacity:0"></div>');
    document.body.append(o, scan);
    root.classList.remove('fx-in');
    await fonts('500 14px "Geist Mono"', 300);
    const [cmd] = o.querySelectorAll('.fx__cmd'), outs = o.querySelectorAll('.fx__out'), bar = o.querySelector('.fx__bar span');
    await run(cmd, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 260, easing: 'steps(20, end)' });
    for (const line of outs){
      if (skipped) return;
      run(line, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 140, easing: SOFT });
      await wait(100);
    }
    await run(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(.7)', offset: .6 }, { transform: 'scaleX(1)' }], { duration: 320, easing: 'cubic-bezier(.3,0,.2,1)' });
    if (skipped) return;
    await wait(60);
    root.classList.remove('fx-busy');
    scan.style.opacity = 1;
    const sweep = { duration: 520, easing: EASE };
    run(o, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }], sweep);
    await run(scan, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(calc(100vh - 2px))', opacity: 1, offset: .92 }, { transform: 'translateY(100vh)', opacity: 0 }], sweep);
    done();
  }

  async function introMusic(){
    const o = current = musicCover(true);
    document.body.append(o);
    root.classList.remove('fx-in');
    await fonts('400 100px Anton', 450);
    if (skipped) return;
    const mark = o.querySelector('.fx__mark');
    await run(mark, [{ opacity: 0, transform: 'scale(1.1)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: SOFT });
    await wait(300);
    if (skipped) return;
    run(mark, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.94)' }], { duration: 180, easing: 'ease-in' });
    root.classList.remove('fx-busy');
    const bars = Array.from(o.querySelectorAll('.fx__bars i')), mid = (bars.length - 1) / 2;
    await Promise.all(bars.map((b, i) => run(b,
      [{ transform: 'translateY(0)' }, { transform: `translateY(${i % 2 ? -101 : 101}%)` }],
      { duration: 440, delay: 80 + Math.abs(i - mid) * 22, easing: 'cubic-bezier(.65,0,.3,1)' })));
    done();
  }

  async function introHome(){
    const o = current = homeCover(true), v = o.classList.contains('fx--stacked');
    document.body.append(o);
    root.classList.remove('fx-in');
    await Promise.all([fonts('600 40px Geist', 400), fonts('400 60px Anton', 400)]);
    if (skipped) return;
    const [a, b] = o.querySelectorAll('.fx__who'), seam = o.querySelector('.fx__seam');
    run(seam, [{ transform: v ? 'scaleX(0)' : 'scaleY(0)' }, { transform: v ? 'scaleX(1)' : 'scaleY(1)' }], { duration: 320, easing: EASE });
    run(a, [{ opacity: 0, transform: v ? 'translateY(16px)' : 'translateX(22px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 120, easing: SOFT });
    await run(b, [{ opacity: 0, transform: v ? 'translateY(-16px)' : 'translateX(-22px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 170, easing: SOFT });
    await wait(220);
    if (skipped) return;
    root.classList.remove('fx-busy');
    const [da, db] = o.querySelectorAll('.fx__door'), open = { duration: 640, easing: EASE };
    run(seam, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    run(da, [{ transform: 'none' }, { transform: v ? 'translateY(-101%)' : 'translateX(-101%)' }], open);
    await run(db, [{ transform: 'none' }, { transform: v ? 'translateY(101%)' : 'translateX(101%)' }], open);
    done();
  }

  /* any click or key during an intro skips straight to the page */
  function skip(){
    if (!current || skipped) return;
    skipped = true;
    const o = current;
    root.classList.remove('fx-busy');
    document.querySelectorAll('.fx-scan').forEach(n => n.remove());
    run(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).then(done);
  }

  /* ── outros: cover the page in the destination's style, then go ───────── */
  let leaving = false;
  async function outro(dest, href){
    leaving = true;
    if (dest === 'code'){
      const o = codeCover(false), scan = make('<div class="fx-scan"></div>');
      document.body.append(o, scan);
      const sweep = { duration: 460, easing: EASE };
      run(o, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], sweep);
      await run(scan, [{ transform: 'translateY(0)' }, { transform: 'translateY(calc(100vh - 2px))' }], sweep);
    } else if (dest === 'music'){
      const o = musicCover(false);
      document.body.append(o);
      const bars = Array.from(o.querySelectorAll('.fx__bars i')), n = bars.length;
      bars.forEach((b, i) => { b.style.transform = `translateY(${i % 2 ? -101 : 101}%)`; });
      await Promise.all(bars.map((b, i) => run(b,
        [{ transform: `translateY(${i % 2 ? -101 : 101}%)` }, { transform: 'translateY(0)' }],
        { duration: 380, delay: Math.min(i, n - 1 - i) * 18, easing: 'cubic-bezier(.5,0,.25,1)' })));
    } else {
      const o = homeCover(false), v = o.classList.contains('fx--stacked');
      document.body.append(o);
      const [da, db] = o.querySelectorAll('.fx__door'), close = { duration: 480, easing: EASE };
      run(da, [{ transform: v ? 'translateY(-101%)' : 'translateX(-101%)' }, { transform: 'none' }], close);
      await run(db, [{ transform: v ? 'translateY(101%)' : 'translateX(101%)' }, { transform: 'none' }], close);
    }
    location.href = href;
  }

  function destination(url){
    if (url.origin !== location.origin) return null;
    const p = url.pathname.replace(/index\.html$/, '');
    return p === base ? 'home' : p === base + 'code/' ? 'code' : p === base + 'music/' ? 'music' : null;
  }

  document.addEventListener('click', e => {
    if (still || leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    const dest = destination(url);
    if (!dest || url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '')) return;
    e.preventDefault();
    skip();
    outro(dest, url.href);
  });

  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, skip, { passive: true }));

  /* coming back with the back button must never show a leftover cover */
  addEventListener('pageshow', e => { if (e.persisted){ leaving = false; skipped = false; done(); } });

  if (still || !root.classList.contains('fx-in')){ done(); return; }
  ({ code: introCode, music: introMusic, home: introHome }[page] || done)();
})();
