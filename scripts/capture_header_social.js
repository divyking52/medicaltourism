/**
 * Captures a screenshot of the top header (with the social icon group)
 * at a wide viewport, for visual confirmation.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9245;
const OUT = path.join(__dirname, '..', 'screenshots', 'header-social-1600.png');

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
    '--hide-scrollbars', '--window-size=1600,900', 'http://localhost:8118/facilitadores.html',
  ]);
  await sleep(2800);
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

  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1600, height: 120, scale: 1 } });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('✓ header screenshot saved:', OUT);
  proc.kill();
})().catch(e => { console.error(e); process.exit(1); });
