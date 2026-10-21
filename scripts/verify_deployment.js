/**
 * Verifies a deployed Vercel URL: all pages, assets, the standalone
 * downloads and the streaming video.
 *
 * Usage: node scripts/verify_deployment.js <baseUrl>
 */
const https = require('https');

const BASE = (process.argv[2] || 'https://medicaltourism-seven.vercel.app').replace(/\/$/, '');

const PAGES = [
  '/', '/index.html', '/agenda.html', '/expo.html', '/sede.html',
  '/galeria.html', '/facilitadores.html',
  '/agenda/', '/expo/', '/sede/', '/galeria/', '/facilitadores/',
];

const ASSETS = [
  '/styles.css', '/script.js',
  '/assets/brand_logo_600.png', '/assets/partner_chihuahua.jpg',
  '/assets/partner_icait.jpg', '/assets/plano_stands.jpg',
  '/assets/speaker_juan_carlos.png', '/assets/ficotrece.jpg',
  '/assets/photos/heroes/agenda-hero.jpg',
  '/assets/photos/editorial/cirugia.jpg',
  '/assets/logos/sectur.png', '/assets/logos/escudo-aguascalientes.png',
  '/assets/logos/ocv-negocios-convenciones.jpg', '/assets/logos/ags-medico.jpg',
];

const BIG = ['/standalone.html', '/website_standalone.html', '/congreso_turismo_medico_completo.html'];

function head(url, range = false, depth = 0) {
  return new Promise((resolve) => {
    const headers = { 'User-Agent': 'MedicalTourismCongressSite/1.0 (deployment check)' };
    if (range) headers.Range = 'bytes=0-1023';
    const req = https.request(url, { method: 'GET', headers }, (res) => {
      // Follow redirects (cleanUrls turns /page.html into /page)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 5) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return resolve(head(next, range, depth + 1).then((r) => ({ ...r, redirectedFrom: url })));
      }
      res.on('data', () => {});
      res.on('end', () => resolve({
        status: res.statusCode,
        type: res.headers['content-type'] || '',
        len: parseInt(res.headers['content-length'] || '0', 10),
        range: res.headers['content-range'] || null,
        loc: res.headers.location || null,
      }));
    });
    req.on('error', (e) => resolve({ status: 'ERR', type: e.code || e.message, len: 0 }));
    req.setTimeout(45000, () => { req.destroy(); resolve({ status: 'TIMEOUT', type: '', len: 0 }); });
    req.end();
  });
}

async function headRetry(url, range = false, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    last = await head(url, range);
    if (last.status === 200 || last.status === 206) return last;
    // Large bodies can be reset mid-transfer — retry before failing
    await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

(async () => {
  console.log(`\n=== Deployment check: ${BASE} ===\n`);

  console.log('--- pages ---');
  let fails = 0;
  for (const p of PAGES) {
    const r = await headRetry(BASE + p);
    const ok = r.status === 200;
    if (!ok) fails++;
    const via = r.redirectedFrom ? ` (via ${r.redirectedFrom.replace(BASE, '')})` : '';
    console.log(`${ok ? 'OK ' : 'ERR'}  ${p.padEnd(40)} ${r.status} ${r.type.split(';')[0]} ${r.len ? (r.len / 1024 / 1024).toFixed(1) + 'MB' : ''}${via}`);
  }

  console.log('\n--- assets ---');
  for (const a of ASSETS) {
    const r = await headRetry(BASE + a);
    const ok = r.status === 200;
    if (!ok) fails++;
    console.log(`${ok ? 'OK ' : 'ERR'}  ${a.padEnd(40)} ${r.status} ${r.type.split(';')[0]}`);
  }

  console.log('\n--- standalone downloads ---');
  for (const b of BIG) {
    // range request: verifies availability without pulling ~30 MB per file
    const r = await headRetry(BASE + b, true);
    const ok = r.status === 206 || r.status === 200;
    if (!ok) fails++;
    console.log(`${ok ? 'OK ' : 'ERR'}  ${b.padEnd(40)} ${r.status} ${r.type.split(';')[0]} ${r.cr || ''}`);
  }

  console.log('\n--- video range request ---');
  const v = await headRetry(BASE + '/gemini_generated_video_d04425a4.mp4', true);
  const vok = v.status === 206 || v.status === 200;
  if (!vok) fails++;
  console.log(`${vok ? 'OK ' : 'ERR'}  /gemini_generated_video_d04425a4.mp4  ${v.status} ${v.type.split(';')[0]} range=${v.range || 'n/a'}`);

  console.log(`\n${fails ? fails + ' check(s) FAILED' : 'All deployment checks PASS'}\n`);
  process.exit(fails ? 1 : 0);
})();
