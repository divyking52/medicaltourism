/**
 * Converts the new floor-plan PNG into the optimised JPEG used by the site
 * (`assets/plano_stands.jpg`), using headless Chrome as the encoder.
 *
 * Usage: node scripts/make_floorplan.js
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9630 + Math.floor(Math.random() * 20);

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'plano_stands_source.png');
const OUT = path.join(ROOT, 'assets', 'plano_stands.jpg');

const TARGET_W = 2000;   // crisp enough for the full-screen lightbox
const QUALITY = 0.9;

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
  if (!fs.existsSync(SRC)) {
    console.log('source not found:', SRC);
    process.exit(1);
  }

  const proc = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${chromePort}`, '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', '--window-size=800,600', 'about:blank',
  ]);
  await sleep(2500);
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
  await send('Runtime.enable');

  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');

  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      const img = new Image();
      img.src = ${JSON.stringify(dataUrl)};
      await img.decode();
      const natural = { w: img.naturalWidth, h: img.naturalHeight };

      const scale = Math.min(1, ${TARGET_W} / natural.w);
      const w = Math.round(natural.w * scale);
      const h = Math.round(natural.h * scale);

      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      // flatten onto white so the JPEG has no black background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      return JSON.stringify({ natural, out: { w, h }, data: c.toDataURL('image/jpeg', ${QUALITY}) });
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  if (!r.result || !r.result.value) {
    console.log('encode failed:', JSON.stringify(r).slice(0, 300));
    process.exit(1);
  }

  const payload = JSON.parse(r.result.value);
  const b64 = payload.data.split(',')[1];
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));

  const before = Math.round(fs.statSync(SRC).size / 1024);
  const after = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`source ${payload.natural.w}x${payload.natural.h} (${before} KB PNG)`);
  console.log(`✓ ${path.relative(ROOT, OUT)}  ${payload.out.w}x${payload.out.h}  ${after} KB`);

  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
