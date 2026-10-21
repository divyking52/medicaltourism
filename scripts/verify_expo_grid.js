/**
 * Verify the Expo stand-package cards grid stays horizontally aligned
 * ("side by side") across desktop + tablet breakpoints, and stacks
 * cleanly on phones.
 *
 * Usage: node scripts/verify_expo_grid.js
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9241;
const URL = 'http://localhost:8118/expo.html';

const WIDTHS = [1600, 1440, 1280, 1100, 1024, 900, 768, 390];

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${chromePort}`,
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1600,900',
    URL,
  ]);

  await sleep(2500);

  const tabs = await getJson(`http://127.0.0.1:${chromePort}/json`);
  const pageTab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  function sendCdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === id) {
          ws.removeEventListener('message', onMsg);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(resolve => (ws.onopen = resolve));

  const measure = `(() => {
    const grid = document.querySelector('.expo-cards-grid');
    if (!grid) return { error: 'grid not found' };
    const gs = getComputedStyle(grid);
    const cards = [...grid.querySelectorAll('.expo-card')];
    const boxes = cards.map(c => {
      const r = c.getBoundingClientRect();
      const list = c.querySelector('.expo-feature-list').getBoundingClientRect();
      const title = c.querySelector('.expo-card-title');
      return {
        title: title.textContent.trim(),
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        listTop: Math.round(list.top),
        titleLines: Math.round(title.getBoundingClientRect().height / (parseFloat(getComputedStyle(title).lineHeight) || 1)),
        overflowX: c.scrollWidth > c.clientWidth + 1
      };
    });
    const first = boxes[0];
    return {
      cols: gs.gridTemplateColumns,
      colCount: gs.gridTemplateColumns.split(' ').length,
      allSameTop: boxes.every(b => b.y === first.y),
      allSameHeight: boxes.every(b => b.h === first.h),
      allSameListTop: boxes.every(b => b.listTop === first.listTop),
      anyOverflow: boxes.some(b => b.overflowX),
      boxes
    };
  })()`;

  const results = [];
  for (const w of WIDTHS) {
    await sendCdp('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 900,
      deviceScaleFactor: 1,
      mobile: w <= 768,
    });
    await sleep(450);
    const r = await sendCdp('Runtime.evaluate', { expression: measure, returnByValue: true });
    results.push({ width: w, ...r.result.value });
  }

  console.log('\n=== Expo Cards Grid — Responsive Alignment ===\n');
  for (const r of results) {
    const stacked = r.colCount === 1;
    const sideBySide = r.colCount === 3;
    const ok = stacked
      ? r.allSameTop === false && r.allSameHeight === false // stacked: each card on its own row
      : r.allSameTop && r.allSameHeight && r.allSameListTop && !r.anyOverflow;
    console.log(
      `${String(r.width).padStart(5)}px  cols=${r.colCount}  ` +
      `sameTop=${String(r.allSameTop).padEnd(5)} sameH=${String(r.allSameHeight).padEnd(5)} ` +
      `sameListTop=${String(r.allSameListTop).padEnd(5)} overflow=${String(r.anyOverflow).padEnd(5)} ` +
      `=> ${ok ? 'PASS' : 'CHECK'} (${sideBySide ? 'side by side' : stacked ? 'stacked' : 'n/a'})`
    );
    console.log(
      `         cards: ${r.boxes.map(b => `${b.title.split(' ')[0]}[x:${b.x} w:${b.w} h:${b.h} lines:${b.titleLines}]`).join('  ')}`
    );
  }

  chromeProc.kill();
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
