/**
 * Audits every page for horizontal overflow at mobile widths.
 * Catches content that spills out of its container (the symptom of
 * unbreakable strings such as e-mail addresses).
 *
 * Usage: node scripts/audit_mobile_overflow.js [width]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9400 + Math.floor(Math.random() * 300);
const WIDTHS = [320, 360, 390];
const PAGES = ['index.html', 'agenda.html', 'expo.html', 'sede.html', 'galeria.html', 'facilitadores.html'];
const BASE = (process.argv[2] || 'http://localhost:8118').replace(/\/$/, '') + '/';

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
    '--hide-scrollbars', '--window-size=1600,900', BASE + 'index.html',
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

  // Find elements whose content sticks out of their own padding box
  const probe = `(() => {
    const doc = document.documentElement;
    const out = [];
    const vw = doc.clientWidth;
    document.querySelectorAll('body *').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
      // elements that are themselves scrollable are fine
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.right > vw + 1) {
        out.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 40),
          right: Math.round(r.right),
          vw,
          text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40)
        });
      }
    });
    return JSON.stringify({ docOverflow: doc.scrollWidth - doc.clientWidth, offenders: out.slice(0, 8) });
  })()`;

  console.log('\n=== Mobile horizontal overflow audit ===\n');
  let fails = 0;
  for (const page of PAGES) {
    await send('Page.navigate', { url: BASE + page });
    await sleep(2400);
    for (const w of WIDTHS) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w <= 768 });
      await sleep(420);
      const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
      const v = JSON.parse(r.result.value);
      const bad = v.offenders.length > 0;
      if (bad) fails++;
      console.log(`${page.padEnd(22)} ${String(w).padStart(4)}px  docOverflow=${v.docOverflow}  ${bad ? 'OVERFLOW: ' + v.offenders.map((o) => `<${o.tag}.${o.cls}> right=${o.right}`).join(' | ') : 'OK'}`);
    }
  }
  console.log(`\n${fails ? fails + ' page/width combination(s) with overflow' : 'No horizontal overflow anywhere'}\n`);
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
