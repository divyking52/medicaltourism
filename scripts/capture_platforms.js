/**
 * Captures the platforms stage after its scroll reveal has played.
 * Usage: node scripts/capture_platforms.js [outName] [width] [height] [index]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9660 + Math.floor(Math.random() * 200);

const [, , outName = 'platforms-stage', wArg = '1440', hArg = '1000', idxArg = '0'] = process.argv;
const W = parseInt(wArg, 10);
const H = parseInt(hArg, 10);
const INDEX = parseInt(idxArg, 10);
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W <= 900 });

  // wait for the page to settle
  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `(document.readyState === 'complete' && !!window.SITE_I18N && !!document.querySelector('[data-platforms-stage]')) ? 'ready' : 'pending'`,
      returnByValue: true,
    });
    if (r.result && r.result.value === 'ready') break;
    await sleep(600);
  }

  // scroll the stage into view and let the reveal play
  const scrollToStage = async () => {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const s = document.querySelector('[data-platforms-stage]');
        window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 70);
        return 'ok';
      })()`,
      returnByValue: true,
    });
  };

  await scrollToStage();
  await sleep(1200);
  // Layout may shift after images/fonts settle — re-anchor until stable
  for (let i = 0; i < 8; i++) {
    const before = await send('Runtime.evaluate', {
      expression: `Math.round(document.querySelector('[data-platforms-stage]').getBoundingClientRect().top)`,
      returnByValue: true,
    });
    await sleep(500);
    const after = await send('Runtime.evaluate', {
      expression: `Math.round(document.querySelector('[data-platforms-stage]').getBoundingClientRect().top)`,
      returnByValue: true,
    });
    if (before.result.value === after.result.value && after.result.value < 200 && after.result.value > -100) break;
    await scrollToStage();
    await sleep(800);
  }
  await sleep(3500);

  // optional: switch platform
  if (INDEX) {
    await send('Runtime.evaluate', {
      expression: `document.querySelector('[data-platforms-option="${INDEX}"]').click(); 'ok'`,
      returnByValue: true,
    });
    await sleep(1600);
  }

  const state = await send('Runtime.evaluate', {
    expression: `(() => {
      const stage = document.querySelector('[data-platforms-stage]');
      const slider = stage.querySelector('[data-platforms-slider]');
      const thumb = stage.querySelector('[data-platforms-thumb]');
      const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), op: getComputedStyle(el).opacity }; };
      return JSON.stringify({
        active: stage.getAttribute('data-active'),
        revealed: stage.classList.contains('is-revealed'),
        armed: stage.classList.contains('is-armed'),
        slider: box(slider), thumb: box(thumb),
        cards: [...stage.querySelectorAll('[data-platform-card]')].map(box)
      });
    })()`,
    returnByValue: true,
  });
  console.log(state.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('✓ saved', path.relative(process.cwd(), OUT));
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
