/**
 * Measures how much the header action cluster overflows its container at a
 * given viewport width.
 * Usage: node scripts/measure_header.js [width]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9700 + Math.floor(Math.random() * 200);
const WIDTHS = (process.argv[2] || '1280,1366,1440').split(',').map(Number);

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
    '--hide-scrollbars', '--window-size=1440,900', 'http://localhost:8118/index.html',
  ]);
  await sleep(3000);
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

  for (const width of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(600);
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const header = document.querySelector('header');
        const cr = header.getBoundingClientRect();
        const actions = document.querySelector('.nav-actions');
        const ar = actions.getBoundingClientRect();
        const links = document.querySelector('.nav-links');
        const lr = links.getBoundingClientRect();
        const brand = document.querySelector('.brand');
        const br = brand.getBoundingClientRect();
        const kids = [...actions.children].filter(c => getComputedStyle(c).display !== 'none').map(c => c.className.split(' ')[0] + ':' + Math.round(c.getBoundingClientRect().width));
        return JSON.stringify({
          containerLeft: Math.round(cr.left), containerRight: Math.round(cr.right), containerW: Math.round(cr.width),
          actionsLeft: Math.round(ar.left), actionsRight: Math.round(ar.right), actionsW: Math.round(ar.width),
          overflowRight: Math.round(ar.right - cr.right),
          linksW: Math.round(lr.width), brandW: Math.round(br.width),
          gapLinksActions: Math.round(ar.left - lr.right),
          gapBrandLinks: Math.round(lr.left - br.right),
          actionKids: kids
        });
      })()`,
      returnByValue: true,
    });
    console.log(`${width}px  ${r.result.value}`);
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
