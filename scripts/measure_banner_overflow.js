/**
 * Measures horizontal overflow of the B2B matchmaking banner text
 * (and any other overflowing block) at mobile widths.
 *
 * Usage: node scripts/measure_banner_overflow.js [url]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9310 + Math.floor(Math.random() * 300);
const URL = process.argv[2] || 'http://localhost:8118/index.html';
const WIDTHS = [320, 360, 390, 414, 480, 768];

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
    '--hide-scrollbars', '--window-size=1600,900', URL,
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

  const measure = `(() => {
    const banner = document.querySelector('.matchmaking-banner');
    const text = banner && banner.querySelector('.banner-text');
    if (!banner || !text) return 'not found';
    const cs = getComputedStyle(banner);
    const br = banner.getBoundingClientRect();
    const tr = text.getBoundingClientRect();
    // widest inline child (the long email lives in a <strong>)
    let widest = null, maxW = 0;
    text.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > maxW) { maxW = r.width; widest = el; }
    });
    const wr = widest ? widest.getBoundingClientRect() : null;
    // content box of the banner (excludes padding)
    const contentLeft = br.left + parseFloat(cs.paddingLeft);
    const contentRight = br.right - parseFloat(cs.paddingRight);
    return JSON.stringify({
      bannerLeft: Math.round(br.left), bannerRight: Math.round(br.right), bannerW: Math.round(br.width),
      contentLeft: Math.round(contentLeft), contentRight: Math.round(contentRight),
      textLeft: Math.round(tr.left), textRight: Math.round(tr.right), textW: Math.round(tr.width),
      widestTag: widest ? widest.tagName : null,
      widestText: widest ? widest.textContent.trim().slice(0, 50) : null,
      widestW: widest ? Math.round(wr.width) : 0,
      widestRight: widest ? Math.round(wr.right) : 0,
      // real overflow = content sticking out of the banner's padding box
      overflowRight: Math.round(Math.max(0, wr ? wr.right - contentRight : 0)),
      overflowLeft: Math.round(Math.max(0, widest ? contentLeft - wr.left : 0)),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    });
  })()`;

  console.log('\n=== B2B banner text — mobile overflow ===\n');
  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w <= 768 });
    await sleep(450);
    const r = await send('Runtime.evaluate', { expression: measure, returnByValue: true });
    const v = JSON.parse(r.result.value);
    const bad = v.overflowRight > 0 || v.overflowLeft > 0 || v.docOverflow > 0;
    console.log(`${String(w).padStart(4)}px  banner[${v.bannerLeft}..${v.bannerRight}] content[${v.contentLeft}..${v.contentRight}] text[${v.textLeft}..${v.textRight}]`);
    console.log(`       widest <${v.widestTag}> w=${v.widestW} right=${v.widestRight}  (email now ${v.widestW}px, was 365px)`);
    console.log(`       overflowRight=${v.overflowRight} overflowLeft=${v.overflowLeft} docOverflow=${v.docOverflow}  => ${bad ? 'OVERFLOW' : 'OK'}`);
  }
  proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
