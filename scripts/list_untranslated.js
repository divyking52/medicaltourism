/**
 * Lists the visible strings that the i18n dictionary does not cover yet.
 * Usage: node scripts/list_untranslated.js [baseUrl]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9970 + Math.floor(Math.random() * 20);
const BASE = (process.argv[2] || 'http://localhost:8118').replace(/\/$/, '');
const PAGES = ['index.html', 'agenda.html', 'expo.html', 'sede.html', 'galeria.html', 'facilitadores.html'];

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
    '--hide-scrollbars', '--window-size=1440,900', `${BASE}/index.html`,
  ]);
  await sleep(3000);
  let tabs = [];
  for (let i = 0; i < 5 && !tabs.find((t) => t.type === 'page'); i++) {
    try { tabs = await getJson(`http://127.0.0.1:${chromePort}/json`); } catch { /* waiting */ }
    if (!tabs.find((t) => t.type === 'page')) await sleep(1200);
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

  const missing = new Map();
  for (const page of PAGES) {
    await send('Page.navigate', { url: `${BASE}/${page}` });
    await sleep(2300);
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const dict = window.SITE_I18N.en;
        const out = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => {
            if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            let p = n.parentElement;
            while (p && p !== document.body) {
              const t = p.nodeName;
              if (t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA' || t === 'CODE' || t === 'PRE') return NodeFilter.FILTER_REJECT;
              p = p.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let n;
        while ((n = walk.nextNode())) {
          const k = n.nodeValue.replace(/\\s+/g, ' ').trim();
          if (k.length < 3) continue;
          if (/^https?:|^mailto:|^tel:/.test(k)) continue;
          if (!Object.prototype.hasOwnProperty.call(dict, k)) out.push(k);
        }
        return JSON.stringify([...new Set(out)]);
      })()`,
      returnByValue: true,
    });
    for (const s of JSON.parse(r.result.value)) {
      if (!missing.has(s)) missing.set(s, []);
      missing.get(s).push(page.replace('.html', ''));
    }
  }

  const list = [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  console.log(`\n=== ${list.length} untranslated strings ===\n`);
  for (const [s, pages] of list) console.log(`${JSON.stringify(s)}\t${[...new Set(pages)].join(',')}`);
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
