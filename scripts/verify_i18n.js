/**
 * Measures how much of the visible copy switches to English on every page.
 *
 * Usage: node scripts/verify_i18n.js [baseUrl]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9960 + Math.floor(Math.random() * 30);
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

  // The built pages are huge (the hero video is inlined as base64), so we
  // wait for the document to finish parsing and the i18n dictionary to load.
  const waitReady = async (maxMs = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      const r = await send('Runtime.evaluate', {
        expression: `(document.readyState === 'complete' && !!window.SITE_I18N) ? 'ready' : 'pending'`,
        returnByValue: true,
      });
      if (r.result && r.result.value === 'ready') return true;
      await sleep(500);
    }
    return false;
  };

  // Count the text nodes that the engine can translate
  const countProbe = `(() => {
    const dict = window.SITE_I18N.en;
    let total = 0, covered = 0;
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    let n;
    while ((n = walk.nextNode())) {
      const k = n.nodeValue.replace(/\\s+/g, ' ').trim();
      if (k.length < 3) continue;
      total++;
      if (Object.prototype.hasOwnProperty.call(dict, k)) covered++;
    }
    return JSON.stringify({ total, covered, pct: total ? Math.round((covered / total) * 100) : 0 });
  })()`;

  console.log(`\n=== i18n coverage (${BASE}) ===\n`);
  let fails = 0;
  for (const page of PAGES) {
    await send('Page.navigate', { url: `${BASE}/${page}` });
    await sleep(1200);
    await waitReady();
    await sleep(600);
    const r = await send('Runtime.evaluate', { expression: countProbe, returnByValue: true });
    if (r.exceptionDetails) {
      console.log(`${page.padEnd(24)} EVAL ERROR: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description || ''}`);
      fails++;
      continue;
    }
    if (!r.result || typeof r.result.value !== 'string') {
      console.log(`${page.padEnd(24)} NO VALUE (result: ${JSON.stringify(r.result).slice(0, 160)})`);
      fails++;
      continue;
    }
    const v = JSON.parse(r.result.value);
    const pct = v.pct;
    if (pct < 80) fails++;
    console.log(`${page.padEnd(24)} ${v.covered}/${v.total} translatable strings  (${pct}%)  ${pct >= 80 ? 'OK' : 'LOW'}`);
  }
  console.log(`\n${fails ? fails + ' page(s) below 80%' : 'All pages well covered'}\n`);
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
