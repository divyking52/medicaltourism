/**
 * Hovers a platform card and captures it, to check the smoke-hover effect.
 * Usage: node scripts/capture_platform_hover.js [outName] [width] [height]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9670 + Math.floor(Math.random() * 200);

const [, , outName = 'platform-hover', wArg = '1440', hArg = '900'] = process.argv;
const W = parseInt(wArg, 10);
const H = parseInt(hArg, 10);
const OUT = path.join(__dirname, '..', 'screenshots', `${outName}.png`);

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
    '--hide-scrollbars', `--window-size=${W},${H}`, 'http://localhost:8118/index.html',
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `(document.readyState === 'complete' && !!document.querySelector('[data-platforms-stage]')) ? 'ready' : 'pending'`,
      returnByValue: true,
    });
    if (r.result && r.result.value === 'ready') break;
    await sleep(600);
  }

  // bring the stage into view
  for (let i = 0; i < 8; i++) {
    await send('Runtime.evaluate', {
      expression: `(() => { const s = document.querySelector('[data-platforms-stage]'); window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 70); return 'ok'; })()`,
      returnByValue: true,
    });
    await sleep(900);
    const top = await send('Runtime.evaluate', {
      expression: `Math.round(document.querySelector('[data-platforms-stage]').getBoundingClientRect().top)`,
      returnByValue: true,
    });
    if (top.result.value < 200 && top.result.value > -100) break;
  }
  await sleep(2500);

  // hover the active card
  const box = (await send('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('[data-platform-card].is-active');
      const r = c.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left + r.width * 0.6), y: Math.round(r.top + r.height * 0.75) });
    })()`,
    returnByValue: true,
  })).result.value;

  const { x, y } = JSON.parse(box);

  // control: does hover tracking work at all over a plain element here?
  const ctrl = JSON.parse((await send('Runtime.evaluate', {
    expression: `(() => {
      const h = document.querySelector('.platforms-header .editorial-headline');
      const r = h.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left + 40), y: Math.round(r.top + 20) });
    })()`,
    returnByValue: true,
  })).result.value);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ctrl.x, y: ctrl.y, buttons: 0 });
  await sleep(500);
  const ctrlHover = await send('Runtime.evaluate', {
    expression: `JSON.stringify([...document.querySelectorAll(':hover')].map(e => e.tagName + '.' + (e.className || '').toString().split(' ')[0]).slice(0, 8))`,
    returnByValue: true,
  });
  console.log('control hover (header):', ctrlHover.result.value);

  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await sleep(500);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 40, y: y - 30, buttons: 0 });
  await sleep(900);

  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.elementFromPoint(${x}, ${y});
      const card = document.querySelector('[data-platform-card].is-active');
      const r = card.getBoundingClientRect();
      return JSON.stringify({
        at: el ? el.tagName + '.' + (el.className || '').toString().split(' ').slice(0,2).join('.') : 'none',
        cardRect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        probePoint: [${x}, ${y}],
        viewport: [window.innerWidth, window.innerHeight]
      });
    })()`,
    returnByValue: true,
  });
  console.log('probe:', probe.result.value);

  const smoke = await send('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('[data-platform-card].is-active');
      const cs = getComputedStyle(c, '::after');
      return JSON.stringify({
        opacity: cs.opacity,
        blend: cs.mixBlendMode,
        smokeX: c.style.getPropertyValue('--card-smoke-x'),
        localX: c.style.getPropertyValue('--platform-local-x'),
        isHover: c.matches(':hover'),
        armed: document.querySelector('[data-platforms-stage]').classList.contains('is-armed'),
        pointerEvents: getComputedStyle(c).pointerEvents,
        hovered: [...document.querySelectorAll(':hover')].map(e => e.tagName + '.' + (e.className || '').toString().split(' ')[0]).slice(0, 6)
      });
    })()`,
    returnByValue: true,
  });
  console.log('card ::after:', smoke.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('✓ saved', path.relative(process.cwd(), OUT));
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
