/**
 * Downloads the official Aguascalientes state coat of arms (Escudo) from
 * Wikimedia Commons. The file is in the public domain, so it is free to use
 * for institutional identification.
 *
 * Usage: node scripts/fetch_ags_escudo.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const UA = 'MedicalTourismCongressSite/1.0 (institutional logo retrieval)';
const OUT = path.join(__dirname, '..', 'assets', 'logos', 'escudo-aguascalientes.svg');

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
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|size&titles=File%3AEscudo_de_Aguascalientes.svg';
  const res = await get(api, { Accept: 'application/json' });
  const j = JSON.parse(res.body.toString('utf8'));
  const page = Object.values(j.query.pages)[0];
  const info = page.imageinfo && page.imageinfo[0];
  if (!info) { console.log('no imageinfo'); process.exit(1); }
  console.log('file:', page.title, '|', info.width + 'x' + info.height);
  console.log('url :', info.url);

  const svg = await get(info.url, { Referer: 'https://commons.wikimedia.org/' });
  if (svg.status !== 200 || !svg.body.length) { console.log('status', svg.status); process.exit(1); }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, svg.body);
  console.log(`✓ saved assets/logos/escudo-aguascalientes.svg (${(svg.body.length / 1024).toFixed(1)} KB, ${svg.type})`);

  // Also fetch the Wikimedia-rendered PNG (transparent) for use in the site
  const thumbApi =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url&iiurlwidth=600&titles=File%3AEscudo_de_Aguascalientes.svg';
  const tRes = await get(thumbApi, { Accept: 'application/json' });
  const tPage = Object.values(JSON.parse(tRes.body.toString('utf8')).query.pages)[0];
  const tInfo = tPage.imageinfo && tPage.imageinfo[0];
  if (tInfo && tInfo.thumburl) {
    const png = await get(tInfo.thumburl, { Referer: 'https://commons.wikimedia.org/' });
    if (png.status === 200 && png.body.length) {
      const pngOut = path.join(__dirname, '..', 'assets', 'logos', 'escudo-aguascalientes.png');
      fs.writeFileSync(pngOut, png.body);
      console.log(`✓ saved assets/logos/escudo-aguascalientes.png (${(png.body.length / 1024).toFixed(1)} KB, ${png.type})`);
    }
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
