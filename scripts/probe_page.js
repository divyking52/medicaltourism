/**
 * Debug probe: reports the state of a built page in headless Chrome.
 * Usage: node scripts/probe_page.js <url>
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9980 + Math.floor(Math.random() * 15);
const url = process.argv[2] || 'http://localhost:8118/index.html';

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
    '--hide-scrollbars', '--window-size=1440,900', url,
  ]);
  await sleep(3000);
  let tabs = [];
  for (let i = 0; i < 6 && !tabs.find((t) => t.type === 'page'); i++) {
    try { tabs = await getJson(`http://127.0.0.1:${chromePort}/json`); } catch { /* waiting */ }
    if (!tabs.find((t) => t.type === 'page')) await sleep(1000);
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

  for (let i = 0; i < 24; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        ready: document.readyState,
        title: document.title,
        hasDict: typeof window.SITE_I18N,
        hasEngine: typeof window.SiteI18n,
        scripts: document.scripts.length,
        bodyLen: document.body ? document.body.innerHTML.length : 0,
        toggle: !!document.querySelector('[data-lang-toggle]')
      })`,
      returnByValue: true,
    }).catch((e) => ({ err: String(e) }));
    console.log(i, JSON.stringify(r.result ? r.result.value : r).slice(0, 400));
    try { if (JSON.parse(r.result.value).hasDict === 'object') break; } catch { /* keep polling */ }
    await sleep(1500);
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
