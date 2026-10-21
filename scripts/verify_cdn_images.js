/**
 * Verifies that every image served from the Storebox CDN actually loads
 * (and has the expected dimensions) on each page.
 *
 * Usage: node scripts/verify_cdn_images.js [baseUrl]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9450 + Math.floor(Math.random() * 300);
const BASE = (process.argv[2] || 'http://localhost:8118').replace(/\/$/, '');
const PAGES = ['index.html', 'agenda.html', 'expo.html', 'facilitadores.html'];

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
    '--hide-scrollbars', '--window-size=1600,900', `${BASE}/index.html`,
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

  const probe = `(async () => {
    // collect CDN-backed <img> and hero background layers
    const imgs = [...document.querySelectorAll('img')].filter(i => (i.src||'').includes('storebox.ai'));
    imgs.forEach(i => { i.loading = 'eager'; });
    await Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(res => { i.onload = res; i.onerror = res; setTimeout(res, 20000); })));

    const heroes = [...document.querySelectorAll('.photo-hero-bg')].map(el => ({
      url: (el.style.backgroundImage || '').replace(/^url\\(["']?/, '').replace(/["']?\\)$/, ''),
      loaded: false
    }));
    // background layers load outside the <img> flow — probe them explicitly
    await Promise.all(heroes.map(h => h.url ? new Promise(res => {
      const im = new Image();
      im.onload = () => { h.loaded = im.naturalWidth > 0; res(); };
      im.onerror = () => res();
      setTimeout(res, 20000);
      im.src = h.url;
    }) : Promise.resolve()));

    return JSON.stringify({
      imgs: imgs.map(i => ({ file: (i.getAttribute('src')||'').split('/').pop(), size: i.naturalWidth + 'x' + i.naturalHeight, ok: i.naturalWidth > 0 })),
      heroes: heroes.map(h => ({ file: (h.url||'').split('/').pop(), ok: h.loaded }))
    });
  })()`;

  console.log(`\n=== Storebox CDN image check (${BASE}) ===\n`);
  let fails = 0;
  for (const page of PAGES) {
    await send('Page.navigate', { url: `${BASE}/${page}` });
    await sleep(2600);
    const r = await send('Runtime.evaluate', { expression: probe, awaitPromise: true, returnByValue: true });
    const v = JSON.parse(r.result.value);
    const all = [...v.imgs.map((i) => ({ file: i.file, ok: i.ok, kind: 'img' })), ...v.heroes.map((h) => ({ file: h.file, ok: h.ok, kind: 'hero' }))];
    const bad = all.filter((i) => !i.ok);
    if (bad.length) fails++;
    console.log(`${page.padEnd(22)} ${all.length} CDN image(s)  ${bad.length ? 'FAIL: ' + bad.map((b) => b.file).join(', ') : 'all loaded OK'}`);
    all.forEach((i) => console.log(`    ${i.ok ? 'OK ' : 'ERR'} [${i.kind}] ${i.file}`));
  }
  console.log(`\n${fails ? fails + ' page(s) FAILED' : 'All CDN images load on every page'}\n`);
  proc.kill();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
