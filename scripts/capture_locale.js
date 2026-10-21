/**
 * Captures a page with the language forced to English (or Spanish) by
 * pre-seeding localStorage before the page loads.
 * Usage: node scripts/capture_locale.js <path> <outName> [en|es] [width] [height] [scrollY]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9620 + Math.floor(Math.random() * 200);

const [, , pagePath = '/index.html', outName = 'page-en', locale = 'en', wArg = '1440', hArg = '900', scrollArg = '0'] = process.argv;
const W = parseInt(wArg, 10);
const H = parseInt(hArg, 10);
const SCROLL = parseInt(scrollArg, 10);
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
    '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank',
  ]);
  await sleep(2500);
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  // seed the locale before the page script runs
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { ${locale === 'en' ? "localStorage.setItem('ctm-locale','en');" : "localStorage.removeItem('ctm-locale');"} } catch (e) {}`,
  });

  await send('Page.navigate', { url: `http://localhost:8118${pagePath}` });
  await sleep(6000);
  if (SCROLL) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${SCROLL}); 'ok'`, returnByValue: true });
    await sleep(2500);
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('✓ saved', path.relative(process.cwd(), OUT));
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
