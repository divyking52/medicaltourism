/**
 * Captures a viewport-sized screenshot of a page scrolled to a selector.
 * Usage: node scripts/capture_viewport_at.js <path> <selector> <outName> [width] [height]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9700 + Math.floor(Math.random() * 200);

const [, , pagePath, selector, outName, wArg, hArg] = process.argv;
if (!pagePath || !selector || !outName) {
  console.error('Usage: node scripts/capture_viewport_at.js <path> <selector> <outName> [w] [h]');
  process.exit(1);
}
const W = parseInt(wArg || '1440', 10);
const H = parseInt(hArg || '900', 10);
const OUT = path.join(__dirname, '..', 'screenshots', `${outName}.png`);

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
    '--hide-scrollbars', `--window-size=${W},${H}`, `http://localhost:8118${pagePath}`,
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await sleep(900);

  await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'null';
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y - 40, behavior: 'instant' });
      return 'ok';
    })()`,
    returnByValue: true,
  });
  await sleep(1200);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(`✓ saved ${path.relative(path.join(__dirname, '..'), OUT)} (${W}x${H})`);
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
