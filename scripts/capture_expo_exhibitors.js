/**
 * Captures the "Confirmed Exhibitors" section of the Expo page.
 * Usage: node scripts/capture_expo_exhibitors.js
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9246;
const OUT = path.join(__dirname, '..', 'screenshots', 'expo-confirmed-exhibitors.png');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const proc = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${chromePort}`, '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', '--window-size=1600,1000',
    'http://localhost:8118/expo.html#expositores-confirmados',
  ]);
  await sleep(3000);
  const tabs = await getJson(`http://127.0.0.1:${chromePort}/json`);
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 100000);
    const onMsg = e => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', onMsg); m.error ? rej(m.error) : res(m.result); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await new Promise(r => (ws.onopen = r));

  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);

  // Scroll the section into view and grab its ABSOLUTE page bounding box
  const box = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = document.getElementById('expositores-confirmados');
      const y = s.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo(0, y);
      const r = s.getBoundingClientRect();
      return JSON.stringify({
        x: Math.round(r.x + window.scrollX),
        y: Math.round(r.y + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height)
      });
    })()`,
    returnByValue: true,
  });
  await sleep(900);

  const b = JSON.parse(box.result.value);
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: b.x, y: b.y, width: b.width, height: Math.min(b.height, 900), scale: 1 },
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('✓ saved:', OUT, `(${b.width}x${Math.min(b.height, 900)})`);
  proc.kill();
})().catch(e => { console.error(e); process.exit(1); });
