/**
 * Captures a screenshot of a given page + CSS selector (or full page).
 * Usage: node scripts/capture_selector.js <path> <selector> <outName> [width] [height]
 *        node scripts/capture_selector.js /index.html ".partners-banner" partners-banner
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9249 + Math.floor(Math.random() * 40);

const [, , pagePath, selector, outName, wArg, hArg, scaleArg] = process.argv;
if (!pagePath || !selector || !outName) {
  console.error('Usage: node scripts/capture_selector.js <path> <selector> <outName> [width] [height] [scale]');
  process.exit(1);
}
const W = parseInt(wArg || '1600', 10);
const H = parseInt(hArg || '1000', 10);
const SCALE = parseFloat(scaleArg || '1');
const OUT = path.join(__dirname, '..', 'screenshots', `${outName}.png`);

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const proc = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${chromePort}`, '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', `--window-size=${W},${H}`,
    `http://localhost:8118${pagePath}`,
  ]);
  await sleep(3200);
  const tabs = await getJson(`http://127.0.0.1:${chromePort}/json`);
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 100000);
    const onMsg = e => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', onMsg); m.error ? rej(m.error) : res(m.result); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await new Promise(r => (ws.onopen = r));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await sleep(1400);

  // Scroll instantly (Lenis/CSS smooth scrolling would desync the clip rect)
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'null';
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y - 40, behavior: 'instant' });
      return true;
    })()`,
    returnByValue: true,
  });
  await sleep(500);

  const box = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'null';
      const r = el.getBoundingClientRect();
      return JSON.stringify({
        x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY),
        width: Math.round(r.width), height: Math.round(r.height)
      });
    })()`,
    returnByValue: true,
  });
  const b = JSON.parse(box.result.value);
  if (!b) { console.log(`selector not found: ${selector}`); proc.kill(); process.exit(1); }

  // Give the images time to decode
  await send('Runtime.evaluate', {
    expression: `Promise.all([...document.images].map(i => i.complete ? Promise.resolve() : i.decode().catch(() => {})))`,
    awaitPromise: true,
    returnByValue: true,
  });
  await sleep(700);

  const shot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 1400), scale: SCALE },
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(`✓ ${outName}.png  (${b.width}x${Math.min(b.height, 1400)})`);
  proc.kill();
})().catch(e => { console.error(e); process.exit(1); });
