/**
 * Verifies the top header layout after adding:
 *   - a 7th nav item ("Facilitadores")
 *   - the social media icon group in the top bar
 *
 * Checks that the header never overflows and that the social icons are
 * visible on wide screens and hidden (but still reachable in the drawer)
 * on narrow ones.
 *
 * Usage: node scripts/verify_header_layout.js
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9243;
const URL = 'http://localhost:8118/index.html';

const WIDTHS = [1920, 1600, 1440, 1366, 1280, 1100, 1024, 900, 860, 768, 390];

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
    '--window-size=1920,900', URL,
  ]);
  await sleep(2500);
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

  const measure = `(() => {
    const container = document.querySelector('.nav-container');
    const brand = document.querySelector('.brand');
    const links = document.querySelector('.nav-links');
    const actions = document.querySelector('.nav-actions');
    const social = document.querySelector('.nav-social');
    const cr = container.getBoundingClientRect();
    const br = brand.getBoundingClientRect();
    const lr = links.getBoundingClientRect();
    const ar = actions.getBoundingClientRect();
    const sr = social ? social.getBoundingClientRect() : null;
    const w = el => el ? Math.round(el.getBoundingClientRect().width) : 0;
    const overlaps = (a, b) => a && b && !(a.right <= b.left + 1 || b.right <= a.left + 1);
    return {
      navItemCount: links.children.length,
      linksVisible: getComputedStyle(links).display !== 'none',
      socialVisible: social ? getComputedStyle(social).display !== 'none' : false,
      socialIcons: social ? social.querySelectorAll('.nav-social-icon').length : 0,
      drawerSocialIcons: document.querySelectorAll('.drawer-social-links .nav-social-icon').length,
      containerW: Math.round(cr.width),
      brandW: w(brand), linksW: w(links), actionsW: w(actions), socialW: w(social),
      linksRight: Math.round(lr.right),
      actionsLeft: Math.round(ar.left),
      brandRight: Math.round(br.right),
      containerLeft: Math.round(cr.left),
      containerRight: Math.round(cr.right),
      linksOverlapBrand: overlaps(br, lr),
      linksOverlapActions: overlaps(lr, ar),
      socialOverlapLinks: overlaps(sr, lr),
      overflowsContainer: lr.right > cr.right + 1 || ar.right > cr.right + 1 || br.left < cr.left - 1
    };
  })()`;

  console.log('\n=== Top Header Layout ===\n');
  let failures = 0;
  for (const width of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 860 });
    await sleep(400);
    const r = await send('Runtime.evaluate', { expression: measure, returnByValue: true });
    const v = r.result.value;

    const problems = [];
    if (v.linksOverlapBrand) problems.push('links overlap brand');
    if (v.linksOverlapActions) problems.push('links overlap actions');
    if (v.socialOverlapLinks) problems.push('social overlaps links');
    if (v.overflowsContainer) problems.push('overflows container');
    if (v.navItemCount !== 7) problems.push(`nav items = ${v.navItemCount} (expected 7)`);
    if (v.drawerSocialIcons !== 3) problems.push('drawer social icons missing');
    if (width >= 1440 && !v.socialVisible) problems.push('social hidden on wide screen');
    if (width < 1440 && width > 860 && v.socialVisible) problems.push('social visible on narrow screen');
    if (problems.length) failures++;

    console.log(
      `${String(width).padStart(5)}px  links=${v.linksVisible ? 'shown' : 'hidden'} social=${v.socialVisible ? 'shown' : 'hidden'} ` +
      `items=${v.navItemCount} w[brand=${v.brandW} links=${v.linksW} social=${v.socialW} actions=${v.actionsW}] ` +
      `=> ${problems.length ? 'FAIL: ' + problems.join(', ') : 'PASS'}`
    );
  }

  console.log(`\n${failures ? failures + ' width(s) FAILED' : 'All widths PASS'}\n`);
  proc.kill();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
