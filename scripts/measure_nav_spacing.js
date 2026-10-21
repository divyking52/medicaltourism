/**
 * Measures the spacing inside the top navigation bar so gaps between the
 * brand, the links and the actions can be balanced at each width.
 *
 * Usage: node scripts/measure_nav_spacing.js
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9500 + Math.floor(Math.random() * 300);
const WIDTHS = [1920, 1728, 1600, 1440, 1366, 1280];

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
    '--hide-scrollbars', '--window-size=1920,900', 'http://localhost:8118/index.html',
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
    const items = [...links.querySelectorAll('.nav-link')];
    const r = e => e.getBoundingClientRect();
    const cr = r(c), br = r(brand), lr = r(links), ar = r(actions);
    const sr = social ? r(social) : null;
    const gap = (a, b) => Math.round(b.left - a.right);
    return JSON.stringify({
      containerW: Math.round(cr.width),
      padL: Math.round(br.left - cr.left),
      padR: Math.round(cr.right - ar.right),
      brandW: Math.round(br.width),
      brandToLinks: gap(br, lr),
      linksW: Math.round(lr.width),
      linkGap: getComputedStyle(links).gap,
      linksToSocial: sr ? gap(lr, sr) : null,
      socialW: sr ? Math.round(sr.width) : null,
      socialToActions: sr ? gap(sr, ar) : null,
      actionsW: Math.round(ar.width),
      linksLeftGap: Math.round(lr.left - br.right),
      itemWidths: items.map(i => Math.round(r(i).width))
    });
  })()`;

  console.log('\n=== Header spacing by width ===\n');
  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(420);
    const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
    const v = JSON.parse(r.result.value);
    console.log(`${String(w).padStart(5)}px  container=${v.containerW}`);
    console.log(`        brand(${v.brandW})  --gap ${v.brandToLinks}-->  links(${v.linksW}, gap ${v.linkGap})`);
    console.log(`        links --gap ${v.linksToSocial}--> social(${v.socialW}) --gap ${v.socialToActions}--> actions(${v.actionsW})`);
    console.log(`        outer padding: ${v.padL} / ${v.padR}   |  item widths: ${v.itemWidths.join(', ')}`);
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
