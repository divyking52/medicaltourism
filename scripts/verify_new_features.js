/**
 * Final verification for the 4-part update:
 *   1. Facilitadores section (nav entry + page + profiles)
 *   2. Confirmed Exhibitors section (Expo page)
 *   3. Social media icons at the top of the site
 *   4. Corrected Facebook URL
 *
 * Checks every generated page + the unified single-file build.
 */
const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9244;
const BASE = 'http://localhost:8118';

const PAGES = [
  'index.html',
  'agenda.html',
  'expo.html',
  'sede.html',
  'galeria.html',
  'facilitadores.html',
  'website_standalone.html',
];

const FB = 'https://www.facebook.com/CongresoDeTurismoMedicoLATAM';

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
    '--window-size=1600,900', `${BASE}/index.html`,
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

  const probe = `(() => {
    const nav = [...document.querySelectorAll('.nav-links .nav-link')].map(a => a.textContent.trim());
    const drawer = [...document.querySelectorAll('.drawer-link')].map(a => a.textContent.trim());
    const fbLinks = [...document.querySelectorAll('a[href*="facebook.com"]')]
      .map(a => a.getAttribute('href'))
      .filter(h => h.includes('CongresoDeTurismoMedicoLATAM') || h.includes('CumbreDeNegocios'));
    return {
      hasFacilitadoresNav: nav.some(t => /facilitadores/i.test(t)),
      navItems: nav.length,
      hasFacilitadoresDrawer: drawer.some(t => /facilitadores/i.test(t)),
      navSocialIcons: document.querySelectorAll('.nav-social .nav-social-icon').length,
      drawerSocialIcons: document.querySelectorAll('.drawer-social-links .nav-social-icon').length,
      footerSocialIcons: document.querySelectorAll('.footer-social-links .footer-social-icon').length,
      siteFbLinks: fbLinks,
      exhibitorsSection: !!document.getElementById('expositores-confirmados'),
      logoSlots: document.querySelectorAll('.expo-logo-card').length,
      realLogos: document.querySelectorAll('.expo-logo-frame img').length,
      logoNames: [...document.querySelectorAll('.expo-logo-name')].map(e => e.textContent.trim()),
      logosInlined: [...document.querySelectorAll('.expo-logo-frame img')].every(i => i.src.startsWith('data:image')),
      emptySlot: document.querySelectorAll('.expo-logo-card--empty').length,
      facilitatorCards: document.querySelectorAll('.agenda-cards-container .speaker-card-full').length,
      facilitatorTypeCards: document.querySelectorAll('.facilitator-type-card').length,
      pendingSlots: document.querySelectorAll('.facilitator-pending-slot').length,
      // 5. Floating WhatsApp button
      whatsapp: (() => {
        const w = document.querySelector('.whatsapp-float');
        if (!w) return null;
        const r = w.getBoundingClientRect();
        return {
          href: w.getAttribute('href'),
          label: w.querySelector('.whatsapp-float-label') ? w.querySelector('.whatsapp-float-label').textContent.trim() : null,
          position: getComputedStyle(w).position,
          zIndex: getComputedStyle(w).zIndex,
          inViewport: r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1 && r.width > 0,
          outsideMain: !document.querySelector('main .whatsapp-float')
        };
      })(),
      // 6. Strategic partners banner
      partners: {
        section: !!document.getElementById('partners'),
        tiles: document.querySelectorAll('.partner-tile').length,
        logoTiles: document.querySelectorAll('.partner-logo-frame img').length,
        wordmarks: document.querySelectorAll('.partner-tile--wordmark').length,
        // images may be base64-inlined (local) or served from the CDN
        logosServed: [...document.querySelectorAll('.partner-logo-frame img')]
          .every(i => i.src.startsWith('data:image') || i.src.includes('storebox.ai')),
        logosLoaded: [...document.querySelectorAll('.partner-logo-frame img')].filter(i => i.naturalWidth > 0).length
      },
      // 7. Photography
      photoBandItems: document.querySelectorAll('.photo-band-item').length,
      photoBandLoaded: [...document.querySelectorAll('.photo-band-item img')].filter(i => i.naturalWidth > 0).length,
      photoBandsServed: [...document.querySelectorAll('.photo-band-item img')]
        .every(i => i.src.startsWith('data:image') || i.src.includes('storebox.ai')),
      heroPhoto: (() => {
        const h = document.querySelector('.photo-hero-bg');
        if (!h) return { present: false };
        const bg = h.style.backgroundImage || '';
        return {
          present: true,
          served: bg.includes('data:image') || bg.includes('storebox.ai'),
          cdn: bg.includes('storebox.ai')
        };
      })(),
      // Platforms banner (Travel Mexico + Hospitality Cancún)
      platforms: {
        banner: !!document.getElementById('plataformas'),
        bannerButtons: [...document.querySelectorAll('.platform-btn')].map(b => ({
          text: b.querySelector('span').textContent.trim(),
          href: b.getAttribute('href')
        })),
        footerStrip: !!document.querySelector('.footer-platforms'),
        footerButtons: [...document.querySelectorAll('.footer-platform-btn')].map(b => ({
          text: b.querySelector('.footer-platform-btn-label').textContent.trim(),
          href: b.getAttribute('href')
        }))
      },
      navSocialVisible: (() => {
        const s = document.querySelector('.nav-social');
        return s ? getComputedStyle(s).display !== 'none' : false;
      })()
    };
  })()`;

  console.log('\n=== Feature Verification (1600px viewport) ===\n');
  let failures = 0;
  for (const page of PAGES) {
    await send('Page.navigate', { url: `${BASE}/${page}` });
    await sleep(2600);

    // Force lazy images to load so their dimensions can be measured
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
        const b = document.querySelector('.photo-band-item');
        if (b) b.scrollIntoView({ block: 'center' });
        return true;
      })()`,
      returnByValue: true,
    });
    await send('Runtime.evaluate', {
      expression: `Promise.all([...document.images].map(i => i.complete ? Promise.resolve() : i.decode().catch(() => {})))`,
      awaitPromise: true,
      returnByValue: true,
    });
    await sleep(500);

    const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
    const v = r.result.value;
    const problems = [];

    if (!v.hasFacilitadoresNav) problems.push('no Facilitadores nav link');
    if (!v.hasFacilitadoresDrawer) problems.push('no Facilitadores drawer link');
    if (v.navSocialIcons !== 3) problems.push(`nav social icons = ${v.navSocialIcons}`);
    if (v.drawerSocialIcons !== 3) problems.push(`drawer social icons = ${v.drawerSocialIcons}`);
    if (v.footerSocialIcons !== 3) problems.push(`footer social icons = ${v.footerSocialIcons}`);
    const staleFb = v.siteFbLinks.filter(h => h.includes('CumbreDeNegocios'));
    if (staleFb.length) problems.push(`stale facebook url: ${staleFb.join(', ')}`);
    if (!v.siteFbLinks.some(h => h === FB)) problems.push('new facebook url missing');

    if (page === 'expo.html' || page === 'website_standalone.html') {
      if (!v.exhibitorsSection) problems.push('no confirmed exhibitors section');
      if (v.logoSlots !== 5) problems.push(`logo cards = ${v.logoSlots} (expected 5)`);
      if (v.realLogos !== 5) problems.push(`real logos = ${v.realLogos} (expected 5)`);
      if (v.emptySlot !== 0) problems.push(`reserved slot = ${v.emptySlot} (expected 0)`);
      if (!v.logosInlined) problems.push('logos not base64-inlined');
      const wanted = ['¡Ah Chihuahua!', 'Ciudad Juárez', 'Ronten', 'MedParh', 'ICAIT'];
      if (JSON.stringify(v.logoNames) !== JSON.stringify(wanted)) {
        problems.push(`logo names = ${JSON.stringify(v.logoNames)}`);
      }
    }
    if (page === 'facilitadores.html') {
      if (v.facilitatorCards !== 5) problems.push(`facilitator cards = ${v.facilitatorCards}`);
      if (v.facilitatorTypeCards !== 6) problems.push(`type cards = ${v.facilitatorTypeCards}`);
      if (v.pendingSlots !== 6) problems.push(`pending slots = ${v.pendingSlots}`);
    }
    if (!v.navSocialVisible) problems.push('header social icons not visible at 1600px');

    // 5. WhatsApp floating button — required on every page
    if (!v.whatsapp) problems.push('no whatsapp button');
    else {
      if (!v.whatsapp.href.startsWith('https://wa.me/525530833864')) problems.push(`whatsapp href = ${v.whatsapp.href}`);
      if (v.whatsapp.label !== '+52 1 55 3083 3864') problems.push(`whatsapp label = ${v.whatsapp.label}`);
      if (v.whatsapp.position !== 'fixed') problems.push('whatsapp not fixed');
      if (!v.whatsapp.inViewport) problems.push('whatsapp outside viewport');
      if (!v.whatsapp.outsideMain) problems.push('whatsapp inside <main> (would break SPA views)');
    }

    // 6. Partners banner — homepage only
    if (page === 'index.html') {
      if (!v.partners.section) problems.push('no partners section');
      if (v.partners.tiles !== 9) problems.push(`partner tiles = ${v.partners.tiles}`);
      if (v.partners.logoTiles !== 9) problems.push(`partner logo tiles = ${v.partners.logoTiles}`);
      if (v.partners.wordmarks !== 0) problems.push(`partner wordmarks = ${v.partners.wordmarks}`);
      if (!v.partners.logosServed) problems.push('partner logos not served');
      if (v.partners.logosLoaded !== 9) problems.push(`partner logos loaded ${v.partners.logosLoaded}/9`);
    }

    // 7. Photography
    if (v.photoBandItems > 0 && !v.photoBandsServed) problems.push('photo band images not served');
    if (v.photoBandItems > 0 && v.photoBandLoaded !== v.photoBandItems) {
      problems.push(`photo band images loaded ${v.photoBandLoaded}/${v.photoBandItems}`);
    }
    if (page === 'agenda.html' || page === 'facilitadores.html') {
      if (!v.heroPhoto.present) problems.push('no hero photo layer');
      else if (!v.heroPhoto.served) problems.push('hero photo not served');
    }

    // 8. Platforms (Travel Mexico + Hospitality Cancún) — footer strip on every page
    if (!v.platforms.footerStrip) problems.push('no footer platforms strip');
    if (v.platforms.footerButtons.length !== 2) problems.push(`footer platform buttons = ${v.platforms.footerButtons.length}`);
    const expectFooter = [
      { text: 'TRAVEL MEXICO', href: 'https://travelmexico.travel' },
      { text: 'HOSPITALIDAD CANCÚN', href: 'https://hospitalitycancun.com' },
    ];
    if (JSON.stringify(v.platforms.footerButtons) !== JSON.stringify(expectFooter)) {
      problems.push(`footer platforms = ${JSON.stringify(v.platforms.footerButtons)}`);
    }
    // Full banner on the homepage
    if (page === 'index.html') {
      if (!v.platforms.banner) problems.push('no platforms banner');
      if (v.platforms.bannerButtons.length !== 2) problems.push(`banner platform buttons = ${v.platforms.bannerButtons.length}`);
      const expectBanner = [
        { text: 'TRAVEL MEXICO', href: 'https://travelmexico.travel' },
        { text: 'HOSPITALIDAD CANCÚN', href: 'https://hospitalitycancun.com' },
      ];
      if (JSON.stringify(v.platforms.bannerButtons) !== JSON.stringify(expectBanner)) {
        problems.push(`banner platforms = ${JSON.stringify(v.platforms.bannerButtons)}`);
      }
    }

    if (problems.length) failures++;
    console.log(`${page.padEnd(28)} ${problems.length ? 'FAIL: ' + problems.join(' | ') : 'PASS'}`);
  }

  console.log(`\n${failures ? failures + ' page(s) FAILED' : 'All pages PASS'}\n`);
  proc.kill();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
