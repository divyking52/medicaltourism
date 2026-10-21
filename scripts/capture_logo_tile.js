/**
 * Captures a single confirmed-exhibitor logo tile at 3x for inspection.
 * Usage: node scripts/capture_logo_tile.js [alt-text-fragment]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9247;
const NEEDLE = process.argv[2] || 'ICAIT';
const OUT = path.join(__dirname, '..', 'screenshots', `logo-tile-${NEEDLE.replace(/\W+/g, '')}.png`);

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
    '--hide-scrollbars', '--window-size=1600,1000', 'http://localhost:8118/expo.html#expositores-confirmados',
  ]);
  await sleep(3000);
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(1000);

  const box = await send('Runtime.evaluate', {
    expression: `(() => {
      const img = [...document.querySelectorAll('.expo-logo-frame img')].find(i => i.alt.includes(${JSON.stringify(NEEDLE)}));
      if (!img) return 'null';
      const r = img.getBoundingClientRect();
      return JSON.stringify({
        x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY),
        width: Math.round(r.width), height: Math.round(r.height),
        natural: img.naturalWidth + 'x' + img.naturalHeight
      });
    })()`,
    returnByValue: true,
  });
  const b = JSON.parse(box.result.value);
  if (!b) { console.log('not found'); proc.kill(); return; }

  const shot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 3 },
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(`✓ ${NEEDLE}: natural ${b.natural}, frame ${b.width}x${b.height} -> ${OUT}`);
  proc.kill();
})().catch(e => { console.error(e); process.exit(1); });
