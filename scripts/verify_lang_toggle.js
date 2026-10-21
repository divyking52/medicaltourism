/**
 * Exercises the ES/EN toggle on every page: switches to English, checks the
 * copy changed, switches back to Spanish and checks the original copy is
 * restored in place (no reload).
 * Usage: node scripts/verify_lang_toggle.js [baseUrl]
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9930 + Math.floor(Math.random() * 40);
const BASE = (process.argv[2] || 'http://localhost:8118').replace(/\/$/, '');
const PAGES = ['index.html', 'agenda.html', 'expo.html', 'sede.html', 'galeria.html', 'facilitadores.html'];

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
    '--hide-scrollbars', '--window-size=1440,900', `${BASE}/index.html`,
  ]);
  await sleep(3000);
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

  const probe = `(() => {
    // The "decode" animation rewrites label text for ~400ms, so read the
    // canonical copy from data-text when the label has one.
    const txt = (el) => {
      const t = el.querySelector('.t');
      const src = t && typeof t.dataset.text === 'string' ? t.dataset.text : el.textContent;
      return src.replace(/\\s+/g, ' ').trim();
    };
    const nav = [...document.querySelectorAll('.nav-links .nav-link')].map(txt);
    const navDrawer = [...document.querySelectorAll('#mobileDrawer a')].map(txt);
    const cta = document.querySelector('.enter-pill');
    return JSON.stringify({
      lang: document.documentElement.getAttribute('lang'),
      title: document.title,
      nav, navDrawer,
      cta: cta ? txt(cta) : null,
      pressed: document.querySelector('.nav-actions [data-lang-toggle]').getAttribute('aria-pressed'),
      stored: localStorage.getItem('ctm-locale')
    });
  })()`;

  console.log('\n=== Language toggle round-trip ===\n');
  let failures = 0;

  for (const page of PAGES) {
    await send('Page.navigate', { url: `${BASE}/${page}` });
    // wait for the page to be parsed and the dictionary to load
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      await sleep(500);
      const r = await send('Runtime.evaluate', {
        expression: `(document.readyState === 'complete' && !!window.SITE_I18N && !!window.SiteI18n) ? 'ready' : 'pending'`,
        returnByValue: true,
      });
      ready = r.result && r.result.value === 'ready';
    }
    if (!ready) { console.log(`${page.padEnd(22)} NOT READY`); failures++; continue; }

    const es = JSON.parse((await send('Runtime.evaluate', { expression: probe, returnByValue: true })).result.value);

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.nav-actions [data-lang-toggle]').click(); 'ok'`,
      returnByValue: true,
    });
    await sleep(600);
    const en = JSON.parse((await send('Runtime.evaluate', { expression: probe, returnByValue: true })).result.value);

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.nav-actions [data-lang-toggle]').click(); 'ok'`,
      returnByValue: true,
    });
    await sleep(600);
    const back = JSON.parse((await send('Runtime.evaluate', { expression: probe, returnByValue: true })).result.value);

    const problems = [];
    if (es.lang !== 'es') problems.push(`initial lang=${es.lang}`);
    if (en.lang !== 'en') problems.push(`EN lang=${en.lang}`);
    if (back.lang !== 'es') problems.push(`back lang=${back.lang}`);
    if (en.pressed !== 'true') problems.push('EN aria-pressed');
    if (back.pressed !== 'false') problems.push('back aria-pressed');
    if (back.stored !== null) problems.push('localStorage not cleared');
    if (JSON.stringify(es.nav) !== JSON.stringify(back.nav)) problems.push('nav not restored');
    if (JSON.stringify(es.cta) !== JSON.stringify(back.cta)) problems.push('CTA not restored');
    if (en.nav.join('|') === es.nav.join('|')) problems.push('nav did not change');

    const ok = problems.length === 0;
    if (!ok) failures++;
    console.log(`${page.padEnd(22)} ES[${es.lang}] -> EN[${en.lang}] -> ES[${back.lang}]  ${ok ? 'PASS' : 'FAIL: ' + problems.join(', ')}`);
    console.log(`${''.padEnd(22)} nav: ${es.nav.slice(0, 3).join(' | ')}  =>  ${en.nav.slice(0, 3).join(' | ')}`);
  }

  console.log(`\n${failures ? failures + ' page(s) FAILED' : 'All pages PASS'}\n`);
  proc.kill();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
