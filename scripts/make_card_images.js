/**
 * Produces card-sized JPEG variants of the platform imagery using headless
 * Chrome as the image processor (no native image libraries needed).
 *
 * Usage: node scripts/make_card_images.js
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9610 + Math.floor(Math.random() * 200);
const ROOT = path.resolve(__dirname, '..');

const JOBS = [
  { src: 'assets/expo_destination.jpg', out: 'assets/photos/platforms/hospitality-cancun.jpg', w: 1200, q: 0.82 },
  { src: 'assets/ficotrece.jpg', out: 'assets/photos/platforms/travel-mexico.jpg', w: 1200, q: 0.82 },
];

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

  for (const job of JOBS) {
    const srcAbs = path.join(ROOT, job.src);
    if (!fs.existsSync(srcAbs)) { console.log(`- ${job.src}: missing, skipped`); continue; }

    const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(srcAbs).toString('base64');

    const r = await send('Runtime.evaluate', {
      expression: `(async () => {
        const img = new Image();
        img.src = ${JSON.stringify(dataUrl)};
        await img.decode();
        const scale = ${job.w} / img.naturalWidth;
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        return c.toDataURL('image/jpeg', ${job.q});
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    if (!r.result || !r.result.value || !r.result.value.startsWith('data:image/jpeg')) {
      console.log(`- ${job.src}: encode failed`, JSON.stringify(r).slice(0, 200));
      continue;
    }

    const outAbs = path.join(ROOT, job.out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    const b64 = r.result.value.split(',')[1];
    fs.writeFileSync(outAbs, Buffer.from(b64, 'base64'));

    const before = Math.round(fs.statSync(srcAbs).size / 1024);
    const after = Math.round(fs.statSync(outAbs).size / 1024);
    console.log(`✓ ${job.out}  ${before}KB -> ${after}KB`);
  }

  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
