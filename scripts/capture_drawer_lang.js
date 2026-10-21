/**
 * Opens the mobile navigation drawer and captures it, plus reports the
 * state of the language toggle inside it.
 * Usage: node scripts/capture_drawer_lang.js [pagePath] [outName] [width]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9650 + Math.floor(Math.random() * 200);

const [, , pagePath = '/index.html', outName = 'drawer-lang', wArg = '390'] = process.argv;
const W = parseInt(wArg, 10);
const H = 844;
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
    '--hide-scrollbars', `--window-size=${W},${H}`, `http://localhost:8118${pagePath}`,
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

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await sleep(1200);

  // open the drawer
  const open = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('mobileMenuBtn');
      if (!btn) return 'no menu button';
      btn.click();
      return 'clicked';
    })()`,
    returnByValue: true,
  });
  await sleep(1500);

  const state = await send('Runtime.evaluate', {
    expression: `(() => {
      const drawer = document.querySelector('#mobileDrawer');
      const t = drawer ? drawer.querySelector('[data-lang-toggle]') : null;
      const links = drawer ? [...drawer.querySelectorAll('a')].map(a => a.textContent.replace(/\\s+/g,' ').trim()).filter(Boolean) : [];
      return JSON.stringify({
        drawerOpen: drawer ? drawer.className : 'none',
        hasToggle: !!t,
        toggleVisible: t ? getComputedStyle(t).display !== 'none' : false,
        toggleBox: t ? (r => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }))(t.getBoundingClientRect()) : null,
        links: links.slice(0, 12)
      });
    })()`,
    returnByValue: true,
  });
  console.log('open:', open.result.value);
  console.log('state:', state.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('✓ saved', path.relative(process.cwd(), OUT));
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
