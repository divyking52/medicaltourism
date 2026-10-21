/**
 * Resolves and downloads the SECTUR logo from Wikimedia Commons via the
 * MediaWiki API (the file is CC0 / public domain, dedicated by Gobierno de
 * México, so it is free to reuse).
 *
 * Usage: node scripts/fetch_sectur_logo.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const UA = 'MedicalTourismCongressSite/1.0 (logo asset retrieval)';
const API =
  'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
  '&iiprop=url|size&iiurlwidth=900&titles=File%3ASECTUR_Logo_(2024).png';
const OUT = path.join(__dirname, '..', 'assets', 'logos', 'sectur.png');

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA, ...headers } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location, headers));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body: Buffer.concat(chunks) })
      );
    }).on('error', reject);
  });
}

(async () => {
  const res = await get(API, { Accept: 'application/json' });
  if (res.status !== 200) { console.log('API status', res.status); process.exit(1); }

  const j = JSON.parse(res.body.toString('utf8'));
  const page = Object.values(j.query.pages)[0];
  const info = page.imageinfo && page.imageinfo[0];
  if (!info) { console.log('no imageinfo:', JSON.stringify(j).slice(0, 300)); process.exit(1); }

  console.log('file  :', page.title);
  console.log('thumb :', info.thumburl);
  console.log('size  :', info.thumbwidth + 'x' + info.thumbheight);

  const img = await get(info.thumburl, { Referer: 'https://commons.wikimedia.org/' });
  if (img.status !== 200 || !img.body.length) { console.log('download status', img.status); process.exit(1); }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, img.body);
  console.log(`✓ saved ${path.relative(path.join(__dirname, '..'), OUT)} (${(img.body.length / 1024).toFixed(1)} KB, ${img.type})`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
