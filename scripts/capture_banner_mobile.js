/**
 * Captures the B2B matchmaking banner at a mobile width.
 * Usage: node scripts/capture_banner_mobile.js [width]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9350 + Math.floor(Math.random() * 300);
const WIDTH = parseInt(process.argv[2] || '360', 10);
const URL = 'http://localhost:8118/index.html';
const OUT = path.join(__dirname, '..', 'screenshots', `b2b-banner-mobile-${WIDTH}.png`);

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
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
    '--hide-scrollbars', '--window-size=1600,900', URL,
  ]);
  await sleep(3200);
  let tabs = [];
  for (let i = 0; i < 5 && !tabs.find((t) => t.type === 'page'); i++) {
    try { tabs = await getJson(`http://127.0.0.1:${chromePort}/json`); } catch { /* waiting */ }
    if (!tabs.find((t) => t.type === 'page')) await sleep(1200);
  }
  const pageTab = tabs.find((t) => t.type === 'page');
  if (!pageTab) { console.log('no page tab'); proc.kill(); process.exit(1); }
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

  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 2, mobile: true });
  await sleep(700);
  const box = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.matchmaking-banner');
      if (!el) return 'null';
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y - 20, behavior: 'instant' });
      return 'ok';
    })()`,
    returnByValue: true,
  });
  await sleep(900);
  const rect = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.matchmaking-banner');
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) });
    })()`,
    returnByValue: true,
  });
  const b = JSON.parse(rect.result.value);
  const shot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 2 },
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(`✓ saved ${path.relative(path.join(__dirname, '..'), OUT)} (${b.width}x${b.height} @${WIDTH}px)`);
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
