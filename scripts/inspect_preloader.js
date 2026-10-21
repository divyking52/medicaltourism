/**
 * Reports the preloader state during a throttled load.
 * Usage: node scripts/inspect_preloader.js
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9950 + Math.floor(Math.random() * 40);

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
    '--hide-scrollbars', '--window-size=1440,900', 'about:blank',
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

  await send('Network.enable', {});
  await send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (700 * 1024) / 8, uploadThroughput: (500 * 1024) / 8,
  });
  await send('Page.navigate', { url: 'http://localhost:8118/index.html' });

  for (const wait of [800, 1500, 2500, 4000]) {
    await sleep(wait === 800 ? 800 : wait - (wait === 1500 ? 800 : wait === 2500 ? 1500 : 2500));
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.getElementById('pageLoader');
        const d = document;
        return JSON.stringify({
          readyState: d.readyState,
          url: d.location ? d.location.href : null,
          bodyExists: !!d.body,
          bodyChildren: d.body ? d.body.children.length : -1,
          bodyFirstTag: d.body && d.body.firstElementChild ? d.body.firstElementChild.tagName + '.' + d.body.firstElementChild.className : null,
          loaderPresent: !!l,
          loaderDone: l ? l.classList.contains('is-done') : null,
          loaderOpacity: l ? getComputedStyle(l).opacity : null,
          loaderVisibility: l ? getComputedStyle(l).visibility : null,
          innerChildren: l ? l.querySelector('.page-loader-inner') ? l.querySelector('.page-loader-inner').children.length : -1 : -1,
          logoNatural: l && l.querySelector('.page-loader-logo') ? l.querySelector('.page-loader-logo').naturalWidth + 'x' + l.querySelector('.page-loader-logo').naturalHeight : null,
          pct: l && l.querySelector('.page-loader-pct') ? l.querySelector('.page-loader-pct').textContent : null,
          htmlLocked: d.documentElement.classList.contains('is-preloading')
        });
      })()`,
      returnByValue: true,
    });
    console.log(`@${wait}ms  ${r.result.value}`);
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
