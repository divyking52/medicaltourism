/**
 * Measures the top navigation spacing on a deployed URL.
 *
 * Usage: node scripts/measure_nav_spacing.js [url]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9600 + Math.floor(Math.random() * 300);
const BASE = (process.argv[2] || 'http://localhost:8118').replace(/\/$/, '');
const WIDTHS = [1920, 1600, 1440, 1366, 1280];

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
    '--hide-scrollbars', '--window-size=1920,900', `${BASE}/index.html`,
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

  const probe = `(() => {
    const c = document.querySelector('.nav-container');
    const brand = document.querySelector('.brand');
    const links = document.querySelector('.nav-links');
    const social = document.querySelector('.nav-social');
    const actions = document.querySelector('.nav-actions');
    const menu = document.querySelector('.menu-pill');
    const r = e => e.getBoundingClientRect();
    const cr = r(c), br = r(brand), lr = r(links), ar = r(actions);
    const sr = social ? r(social) : null;
    return JSON.stringify({
      brandW: Math.round(br.width),
      brandToLinks: Math.round(lr.left - br.right),
      linksToActions: sr ? Math.round(sr.left - lr.right) : Math.round(ar.left - lr.right),
      padL: Math.round(br.left - cr.left),
      padR: Math.round(cr.right - ar.right),
      socialVisible: !!sr && getComputedStyle(social).display !== 'none',
      menuVisible: menu ? getComputedStyle(menu).display !== 'none' : false,
      overflow: Math.round(ar.right - cr.right)
    });
  })()`;

  console.log(`\n=== Nav spacing on ${BASE} ===\n`);
  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(450);
    const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
    const v = JSON.parse(r.result.value);
    const ok = v.brandW >= 195 && v.brandToLinks >= 30 && v.padL === v.padR && v.overflow <= 0;
    console.log(`${String(w).padStart(5)}px  brand=${v.brandW}  brand→links=${v.brandToLinks}  links→actions=${v.linksToActions}  pad=${v.padL}/${v.padR}  social=${v.socialVisible} menu=${v.menuVisible}  overflow=${v.overflow}  => ${ok ? 'OK' : 'CHECK'}`);
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
