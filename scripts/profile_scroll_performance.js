/**
 * Measures scroll smoothness (frame timing) and A/B tests the expensive
 * visual effects to find what actually causes the scroll lag.
 *
 * For each configuration it scrolls the page and records requestAnimationFrame
 * deltas, reporting average / p95 frame time and the number of long frames.
 *
 * Usage: node scripts/profile_scroll_performance.js [url]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9800 + Math.floor(Math.random() * 150);
const URL = (process.argv[2] || 'http://localhost:8118/index.html').replace(/\/$/, '');

// CSS injected to disable one suspect at a time
const CONFIGS = [
  { name: 'baseline', css: '' },
  { name: 'smoke: whole canvas off', css: '.smoke-ambient-canvas{display:none !important}' },
  { name: 'no backdrop-filter', css: '*{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}' },
  {
    name: 'PROPOSED: smoke unblended',
    css: `.smoke-ambient-layer{mix-blend-mode:normal !important;filter:contrast(140%) brightness(165%) !important}
      .smoke-spotlight-layer{mix-blend-mode:normal !important}`
  },
  {
    name: 'PROPOSED: + no backdrop',
    css: `.smoke-ambient-layer{mix-blend-mode:normal !important;filter:contrast(140%) brightness(165%) !important}
      .smoke-spotlight-layer{mix-blend-mode:normal !important}
      *{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}`
  },
  {
    name: 'PROPOSED: + portals only',
    css: `.smoke-ambient-layer{mix-blend-mode:normal !important;filter:contrast(140%) brightness(165%) !important}
      .smoke-spotlight-layer{mix-blend-mode:normal !important}
      .portal-card{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}`
  },
];

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

const SCROLL_JS = `(() => new Promise((resolve) => {
  const frames = [];
  let last = performance.now();
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const steps = 90;
  let i = 0;
  function step() {
    const now = performance.now();
    frames.push(now - last);
    last = now;
    window.scrollTo(0, (max * i) / steps);
    if (++i <= steps) { requestAnimationFrame(step); }
    else {
      frames.shift();
      const sorted = [...frames].sort((a, b) => a - b);
      const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
      resolve({
        avg: +avg.toFixed(1),
        p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
        max: +sorted[sorted.length - 1].toFixed(1),
        long: frames.filter(f => f > 50).length,
        frames: frames.length,
        fps: +(1000 / avg).toFixed(1)
      });
    }
  }
  requestAnimationFrame(step);
}))()`;

(async () => {
  const proc = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${chromePort}`, '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', '--window-size=1440,900', URL,
  ]);
  await sleep(3500);
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  console.log(`\n=== Scroll performance: ${URL} ===\n`);
  console.log('configuration'.padEnd(26) + 'avg    p95    max    long>50ms   fps   (median of 3)');

  const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

  for (const cfg of CONFIGS) {
    const runs = [];
    for (let run = 0; run < 3; run++) {
      await send('Page.navigate', { url: URL });
      await sleep(2800);
      if (cfg.css) {
        await send('Runtime.evaluate', {
          expression: `(() => { const s = document.createElement('style'); s.id='perf-test'; s.textContent = ${JSON.stringify(cfg.css)}; document.head.appendChild(s); return true; })()`,
          returnByValue: true,
        });
        await sleep(600);
      }
      const r = await send('Runtime.evaluate', { expression: SCROLL_JS, awaitPromise: true, returnByValue: true });
      runs.push(r.result.value);
    }
    const v = {
      avg: median(runs.map(x => x.avg)),
      p95: median(runs.map(x => x.p95)),
      max: median(runs.map(x => x.max)),
      long: median(runs.map(x => x.long)),
      fps: median(runs.map(x => x.fps)),
    };
    const flag = cfg.name === 'baseline' ? '  <-- reference' : '';
    console.log(
      cfg.name.padEnd(26) +
      String(v.avg).padStart(6) + String(v.p95).padStart(7) + String(v.max).padStart(7) +
      String(v.long).padStart(11) + String(v.fps).padStart(8) + flag
    );
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
