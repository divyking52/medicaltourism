/**
 * Verifies the interactive platforms stage: content preservation, slider
 * behaviour (click / drag / swipe), accessibility and mobile ergonomics.
 *
 * Usage: node scripts/verify_platforms_stage.js [baseUrl]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9940 + Math.floor(Math.random() * 40);
const BASE = (process.argv[2] || 'http://localhost:8118').replace(/\/$/, '');

function getJson(u) {
  return new Promise((resolve, reject) => {
    http.get(u, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const proc = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${chromePort}`, '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', '--window-size=1440,900', `${BASE}/index.html`,
  ]);
  await sleep(3500);
  let tabs = [];
  for (let i = 0; i < 6 && !tabs.find((t) => t.type === 'page'); i++) {
    try { tabs = await getJson(`http://127.0.0.1:${chromePort}/json`); } catch { /* waiting */ }
    if (!tabs.find((t) => t.type === 'page')) await sleep(1000);
  }
  const pageTab = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 100000);
    const onMsg = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', onMsg); m.error ? rej(m.error) : res(m.result); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await new Promise((r) => (ws.onopen = r));

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception || {}).description);
    return r.result.value;
  };

  let failures = 0;
  const check = (label, ok, detail) => {
    if (!ok) failures++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  (' + detail + ')' : ''}`);
  };

  // wait for the page
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const ready = await evaluate(`(document.readyState === 'complete' && !!window.SITE_I18N && !!document.querySelector('[data-platforms-stage]')) ? 1 : 0`);
    if (ready) break;
  }

  console.log('\n=== Platforms stage ===\n');

  // Bring the stage into view — the real input events need on-screen targets
  await evaluate(`(() => {
    const s = document.querySelector('[data-platforms-stage]');
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 60);
    return 'ok';
  })()`);
  await sleep(2500);

  /* ---------- 1. Content preservation ---------- */
  const content = JSON.parse(await evaluate(`(() => {
    const stage = document.querySelector('[data-platforms-stage]');
    const links = [...stage.querySelectorAll('a.platform-btn')].map(a => ({ href: a.href, text: a.textContent.replace(/\\s+/g,' ').trim() }));
    const names = [...stage.querySelectorAll('.platform-name')].map(n => n.textContent.trim());
    const tags = [...stage.querySelectorAll('.platform-tag')].map(n => n.textContent.trim());
    const descs = [...stage.querySelectorAll('.platform-desc')].map(n => n.textContent.trim());
    const headline = stage.querySelector('.editorial-headline').textContent.replace(/\\s+/g,' ').trim();
    const intro = stage.querySelector('.platforms-banner-intro').textContent.replace(/\\s+/g,' ').trim();
    const imgs = [...stage.querySelectorAll('.platform-card-media img')].map(i => ({ src: i.getAttribute('src'), alt: i.alt, w: i.getAttribute('width'), h: i.getAttribute('height') }));
    return JSON.stringify({ links, names, tags, descs, headline, intro, imgs });
  })()`));

  check('headline preserved', content.headline === 'Dos puertas de entrada al turismo médico.', content.headline);
  check('intro preserved', /Dos plataformas hermanas/.test(content.intro));
  check('both card names preserved', content.names.join('|') === 'TRAVEL MEXICO|HOSPITALIDAD CANCÚN', content.names.join('|'));
  check('both card tags preserved', content.tags.length === 2 && /Viajes, hoteles/.test(content.tags[0]) && /Caribe Mexicano/.test(content.tags[1]));
  check('both descriptions preserved', content.descs.length === 2 && content.descs.every(d => d.length > 60));
  check('Travel Mexico link preserved', content.links[0] && content.links[0].href === 'https://travelmexico.travel/', content.links[0] && content.links[0].href);
  check('Hospitality Cancún link preserved', content.links[1] && content.links[1].href === 'https://hospitalitycancun.com/', content.links[1] && content.links[1].href);
  check('both card images present with alt text', content.imgs.length === 2 && content.imgs.every(i => i.src && i.alt && i.w && i.h));

  /* ---------- 2. Slider interaction ---------- */
  const initial = JSON.parse(await evaluate(`(() => {
    const s = document.querySelector('[data-platforms-stage]');
    const t = document.querySelector('[data-platforms-thumb]');
    return JSON.stringify({
      active: s.getAttribute('data-active'),
      accent: getComputedStyle(s).getPropertyValue('--platform-accent').trim(),
      thumbLeft: Math.round(t.getBoundingClientRect().left),
      thumbW: Math.round(t.getBoundingClientRect().width),
      activeCard: [...s.querySelectorAll('[data-platform-card]')].findIndex(c => c.classList.contains('is-active')),
      activeDot: [...s.querySelectorAll('[data-platforms-dot]')].findIndex(d => d.classList.contains('is-active')),
      activeOption: [...s.querySelectorAll('[data-platforms-option]')].findIndex(o => o.classList.contains('is-active'))
    });
  })()`));

  check('starts on Travel Mexico', initial.active === '0' && initial.activeCard === 0);
  check('accent is gold on Travel Mexico', /gold|#d7|215/i.test(initial.accent), initial.accent);
  check('thumb, dot and option are in sync', initial.activeDot === 0 && initial.activeOption === 0);

  // click the second option
  await evaluate(`document.querySelector('[data-platforms-option="1"]').click(); 'ok'`);
  await sleep(900);
  const afterClick = JSON.parse(await evaluate(`(() => {
    const s = document.querySelector('[data-platforms-stage]');
    const t = document.querySelector('[data-platforms-thumb]');
    const g = document.querySelector('[data-platforms-grip]');
    return JSON.stringify({
      active: s.getAttribute('data-active'),
      accent: getComputedStyle(s).getPropertyValue('--platform-accent').trim(),
      thumbLeft: Math.round(t.getBoundingClientRect().left),
      thumbW: Math.round(t.getBoundingClientRect().width),
      gripLeft: Math.round(g.getBoundingClientRect().left),
      activeCard: [...s.querySelectorAll('[data-platform-card]')].findIndex(c => c.classList.contains('is-active')),
      activeDot: [...s.querySelectorAll('[data-platforms-dot]')].findIndex(d => d.classList.contains('is-active')),
      valuenow: g.getAttribute('aria-valuenow'),
      valuetext: g.getAttribute('aria-valuetext'),
      glowOpacity: getComputedStyle(document.querySelector('[data-platforms-glow="1"]')).opacity
    });
  })()`));

  check('option click switches the platform', afterClick.active === '1' && afterClick.activeCard === 1);
  check('accent switches to magenta', /magenta|#be|190/i.test(afterClick.accent), afterClick.accent);
  check('thumb slides one segment to the right', Math.abs((afterClick.thumbLeft - initial.thumbLeft) - (initial.thumbW + 4)) <= 3, `${initial.thumbLeft} -> ${afterClick.thumbLeft} (seg ${initial.thumbW})`);
  check('dot follows the active platform', afterClick.activeDot === 1);
  check('slider aria updates', afterClick.valuenow === '2' && /Canc/i.test(afterClick.valuetext), `${afterClick.valuenow} / ${afterClick.valuetext}`);
  check('background glow follows the platform', parseFloat(afterClick.glowOpacity) > 0.35, afterClick.glowOpacity);

  // arrow click
  await evaluate(`document.querySelector('[data-platforms-arrow="prev"]').click(); 'ok'`);
  await sleep(700);
  const afterArrow = await evaluate(`document.querySelector('[data-platforms-stage]').getAttribute('data-active')`);
  check('previous arrow switches back', afterArrow === '0', afterArrow);

  // dot click
  await evaluate(`document.querySelector('[data-platforms-dot="1"]').click(); 'ok'`);
  await sleep(700);
  const afterDot = await evaluate(`document.querySelector('[data-platforms-stage]').getAttribute('data-active')`);
  check('pagination dot switches the platform', afterDot === '1', afterDot);

  // keyboard
  await evaluate(`document.querySelector('[data-platforms-grip]').focus(); 'ok'`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await sleep(700);
  const afterKey = await evaluate(`document.querySelector('[data-platforms-stage]').getAttribute('data-active')`);
  check('arrow key on the grip switches the platform', afterKey === '0', afterKey);

  /* ---------- 3. Drag the grip ---------- */
  const dragBox = JSON.parse(await evaluate(`(() => {
    const g = document.querySelector('[data-platforms-grip]');
    const r = g.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
  })()`));

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragBox.x, y: dragBox.y, button: 'left', clickCount: 1, buttons: 1 });
  await sleep(150);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragBox.x + 160, y: dragBox.y, button: 'left', buttons: 1 });
  await sleep(250);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragBox.x + 160, y: dragBox.y, button: 'left', clickCount: 1, buttons: 0 });
  await sleep(1100);
  const afterDrag = await evaluate(`document.querySelector('[data-platforms-stage]').getAttribute('data-active')`);
  check('dragging the grip switches the platform', afterDrag === '1', afterDrag);

  /* ---------- 4. Mobile ---------- */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1500);
  // re-anchor after the viewport change
  await evaluate(`(() => {
    const s = document.querySelector('[data-platforms-stage]');
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 40);
    return 'ok';
  })()`);
  await sleep(2000);

  const mobile = JSON.parse(await evaluate(`(() => {
    const s = document.querySelector('[data-platforms-stage]');
    const viewport = s.querySelector('[data-platforms-viewport]');
    const thumb = s.querySelector('[data-platforms-thumb]');
    const dot = s.querySelector('.platform-dot');
    const opt = s.querySelector('.platforms-slider-option');
    const hint = s.querySelector('[data-platforms-hint]');
    const rect = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
    return JSON.stringify({
      touchAction: getComputedStyle(viewport).touchAction,
      trackOverflow: getComputedStyle(viewport).overflowX,
      thumb: rect(thumb), dot: rect(dot), option: rect(opt),
      hintDisplay: getComputedStyle(hint).display,
      cardWidth: Math.round(s.querySelector('.platform-card-wrap').getBoundingClientRect().width),
      viewportWidth: Math.round(viewport.getBoundingClientRect().width),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    });
  })()`));

  check('mobile viewport allows vertical scrolling (touch-action pan-y)', mobile.touchAction === 'pan-y', mobile.touchAction);
  check('mobile viewport clips the carousel horizontally', mobile.trackOverflow === 'hidden', mobile.trackOverflow);
  check('active card fills the viewport', Math.abs(mobile.cardWidth - mobile.viewportWidth) <= 2, `${mobile.cardWidth} / ${mobile.viewportWidth}`);
  check('thumb is at least 44x44px', mobile.thumb.w >= 44 && mobile.thumb.h >= 44, `${mobile.thumb.w}x${mobile.thumb.h}`);
  check('dots are at least 44x44px', mobile.dot.w >= 44 && mobile.dot.h >= 44, `${mobile.dot.w}x${mobile.dot.h}`);
  check('slider options are at least 44px tall', mobile.option.h >= 44, String(mobile.option.h));
  check('swipe hint is shown on mobile', mobile.hintDisplay === 'flex', mobile.hintDisplay);
  check('no horizontal document overflow on mobile', mobile.docOverflow <= 0, String(mobile.docOverflow));

  /* ---------- 5. Swipe gesture ---------- */
  const swipe = JSON.parse(await evaluate(`(() => {
    const s = document.querySelector('[data-platforms-stage]');
    const v = s.querySelector('[data-platforms-viewport]');
    const r = v.getBoundingClientRect();
    // record what the page receives
    window.__ptr = [];
    ['pointerdown', 'pointermove', 'pointerup'].forEach((t) => {
      v.addEventListener(t, (e) => window.__ptr.push(t + ':' + e.pointerType + ':' + Math.round(e.clientX)), true);
    });
    return JSON.stringify({ x: Math.round(r.left + r.width * 0.5), y: Math.round(r.top + r.height * 0.5) });
  })()`));

  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const touch = async (type, x, y) => {
    await send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 10, radiusY: 10, force: 1, id: 1 }],
    });
  };
  await touch('touchStart', swipe.x, swipe.y);
  await sleep(90);
  await touch('touchMove', swipe.x - 45, swipe.y);
  await sleep(90);
  await touch('touchMove', swipe.x - 120, swipe.y);
  await sleep(90);
  await touch('touchEnd', swipe.x - 120, swipe.y);
  await sleep(1100);

  const swipeTrace = await evaluate(`JSON.stringify(window.__ptr || [])`);
  console.log('  pointer trace:', swipeTrace);

  const afterSwipe = await evaluate(`document.querySelector('[data-platforms-stage]').getAttribute('data-active')`);
  check('swiping left switches to the next platform', afterSwipe === '1', afterSwipe);

  console.log(`\n${failures ? failures + ' check(s) FAILED' : 'All checks PASS'}\n`);
  proc.kill();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
