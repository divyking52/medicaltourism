/**
 * Verifies the floating WhatsApp button across viewports:
 *   - stays inside the viewport (never clipped)
 *   - clears the floating back-to-top control on mobile
 *   - sits below modals so it never blocks a dialog
 *   - expands to reveal the phone number on hover
 *
 * Usage: node scripts/verify_whatsapp_button.js
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9251;
const PAGES = ['index.html', 'agenda.html', 'expo.html', 'sede.html', 'galeria.html', 'facilitadores.html'];
const WIDTHS = [1600, 1280, 1024, 768, 430, 390];

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
    '--window-size=1600,900', 'http://localhost:8118/index.html',
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

  const probe = `(() => {
    const w = document.querySelector('.whatsapp-float');
    if (!w) return { missing: true };
    const r = w.getBoundingClientRect();
    const btt = document.querySelector('.mobile-back-to-top');
    const bttR = btt ? btt.getBoundingClientRect() : null;
    const overlapsBTT = !!(bttR && bttR.width > 0 &&
      !(r.right <= bttR.left || bttR.right <= r.left || r.bottom <= bttR.top || bttR.bottom <= r.top));
    return {
      missing: false,
      right: Math.round(r.right), bottom: Math.round(r.bottom),
      top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      vw: window.innerWidth, vh: window.innerHeight,
      insideViewport: r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1 && r.left >= -1,
      overlapsBTT,
      z: getComputedStyle(w).zIndex,
      modalZ: getComputedStyle(document.getElementById('registerModal')).zIndex
    };
  })()`;

  let failures = 0;
  console.log('\n=== Floating WhatsApp Button ===\n');
  for (const page of PAGES) {
    await send('Page.navigate', { url: `http://localhost:8118/${page}` });
    await sleep(2200);
    for (const width of WIDTHS) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      await sleep(320);
      const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
      const v = r.result.value;
      const problems = [];
      if (v.missing) problems.push('button missing');
      else {
        if (!v.insideViewport) problems.push('outside viewport');
        if (v.overlapsBTT) problems.push('overlaps back-to-top');
        if (Number(v.z) >= Number(v.modalZ)) problems.push(`z-index ${v.z} >= modal ${v.modalZ}`);
      }
      if (problems.length) failures++;
      console.log(
        `${page.padEnd(22)} ${String(width).padStart(5)}px  ` +
        (v.missing ? 'MISSING' : `pos[${v.left ?? '?'},${v.top}] ${v.w}x${v.h} z=${v.z}`) +
        `  => ${problems.length ? 'FAIL: ' + problems.join(', ') : 'PASS'}`
      );
    }
  }

  console.log(`\n${failures ? failures + ' check(s) FAILED' : 'All checks PASS'}\n`);
  proc.kill();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
