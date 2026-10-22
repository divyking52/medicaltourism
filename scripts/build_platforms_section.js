/**
 * Replaces the platforms banner section in `index.template.html` with the
 * cinematic, slider-driven version.
 *
 * Usage: node scripts/build_platforms_section.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.template.html');

const SECTION = `      <!-- ============================================================
           PLATFORMS STAGE — Travel Mexico & Hospitality Cancún
           Cinematic 3D cards driven by the interactive slider
           ============================================================ -->
      <section class="platforms-stage" id="plataformas" data-platforms-stage data-active="0">
        <!-- Cinematic backdrop -->
        <div class="platforms-cinema" aria-hidden="true">
          <div class="platforms-gridlines"></div>
          <div class="platforms-glow platforms-glow--gold" data-platforms-glow="0"></div>
          <div class="platforms-glow platforms-glow--magenta" data-platforms-glow="1"></div>
          <div class="platforms-orb platforms-orb--a" data-platforms-parallax="0.16"></div>
          <div class="platforms-orb platforms-orb--b" data-platforms-parallax="-0.11"></div>
          <div class="platforms-orb platforms-orb--c" data-platforms-parallax="0.07"></div>
          <div class="platforms-trail" data-platforms-trail></div>
          <div class="platforms-vignette"></div>
        </div>

        <div class="container relative-z">
          <div class="platforms-header" data-platforms-reveal>
            <p class="eyebrow gold-eyebrow">NUESTRAS PLATAFORMAS</p>
            <h2 class="editorial-headline text-white">
              Descubre México<br />
              <em class="headline-accent gold-accent">desde nuevas perspectivas.</em>
            </h2>
            <p class="platforms-banner-intro">
              Dos plataformas hermanas para vivir México de otra manera: reserva viajes y experiencias con Travel Mexico, o encuentra atención médica de primer nivel en el Caribe Mexicano con Hospitality Cancún.
            </p>
          </div>

          <!-- The stage: two cinematic cards -->
          <div class="platforms-viewport" data-platforms-viewport>
            <div class="platforms-track" data-platforms-track>
              <div class="platform-card-wrap" data-platform-card-wrap="0">
                <article class="platform-card is-active" data-platform-card="0" data-accent="gold" data-platform="travel">
                  <div class="platform-card-media" data-platforms-media>
                    <img src="assets/photos/platforms/travel-mexico.jpg" alt="Complejo monumental FICOTRECE en Aguascalientes, destino de convenciones en México" loading="lazy" width="1200" height="800" />
                    <span class="platform-card-sheen" aria-hidden="true"></span>
                    <span class="platform-card-vignette" aria-hidden="true"></span>
                  </div>
                  <div class="platform-card-body">
                    <div class="platform-card-head">
                      <span class="platform-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 0 0 0 0-20z"></path><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20 0 0 1 0-20z"></path></svg>
                      </span>
                      <div>
                        <h3 class="platform-name">TRAVEL MEXICO</h3>
                        <p class="platform-tag">Viajes, hoteles y experiencias</p>
                      </div>
                    </div>
                    <p class="platform-desc">
                      Motor de reservas de México: compara hoteles, vuelos, renta de autos y tours de todo el país, y reserva en línea.
                    </p>
                    <a class="button primary platform-btn" href="https://travelmexico.travel" target="_blank" rel="noopener noreferrer">
                      <span>TRAVEL MEXICO</span>
                      <span class="btn-arrow">→</span>
                    </a>
                  </div>
                  <span class="platform-card-accent" aria-hidden="true"></span>
                </article>
              </div>

              <div class="platform-card-wrap" data-platform-card-wrap="1">
                <article class="platform-card" data-platform-card="1" data-accent="magenta" data-platform="hospitality">
                  <div class="platform-card-media" data-platforms-media>
                    <img src="assets/photos/platforms/hospitality-cancun.jpg" alt="Residencia frente al mar en el Caribe Mexicano, destino de turismo médico" loading="lazy" width="1200" height="800" />
                    <span class="platform-card-sheen" aria-hidden="true"></span>
                    <span class="platform-card-vignette" aria-hidden="true"></span>
                  </div>
                  <div class="platform-card-body">
                    <div class="platform-card-head">
                      <span class="platform-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                      </span>
                      <div>
                        <h3 class="platform-name">Hospitality Cancun</h3>
                        <p class="platform-tag">Turismo médico en el Caribe Mexicano</p>
                      </div>
                    </div>
                    <p class="platform-desc">
                      Servicio de turismo médico con productos ya empaquetados: paquetes de tratamiento, hotel con traslados y concierge 360° en Riviera Maya y Cozumel.
                    </p>
                    <a class="button primary platform-btn" href="https://hospitalitycancun.com" target="_blank" rel="noopener noreferrer">
                      <span>Hospitality Cancun</span>
                      <span class="btn-arrow">→</span>
                    </a>
                  </div>
                  <span class="platform-card-accent" aria-hidden="true"></span>
                </article>
              </div>
            </div>

            <p class="platforms-swipe-hint" data-platforms-hint aria-hidden="true">
              <span class="platforms-hint-arrow">←</span>
              <span class="platforms-hint-text">Desliza para explorar</span>
              <span class="platforms-hint-arrow">→</span>
            </p>
          </div>

          <!-- The interactive slider -->
          <div class="platforms-slider" data-platforms-slider>
            <span class="platforms-slider-arrow platforms-slider-arrow--prev" data-platforms-arrow="prev" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
            </span>

            <div class="platforms-slider-track" data-platforms-track-pill>
              <span class="platforms-slider-thumb" data-platforms-thumb aria-hidden="true"></span>

              <span class="platforms-slider-grip" data-platforms-grip role="slider" tabindex="0"
                    aria-label="Cambiar de plataforma" aria-valuemin="1" aria-valuemax="2" aria-valuenow="1"
                    aria-valuetext="Travel Mexico" aria-orientation="horizontal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7l-4 5 4 5"></path><path d="M15 7l4 5-4 5"></path></svg>
              </span>

              <button class="platforms-slider-option is-active" type="button" data-platforms-option="0" aria-pressed="true">
                <span class="platforms-option-text">TRAVEL MEXICO</span>
              </button>
              <button class="platforms-slider-option" type="button" data-platforms-option="1" aria-pressed="false">
                <span class="platforms-option-text">Hospitality Cancun</span>
              </button>
            </div>

            <span class="platforms-slider-arrow platforms-slider-arrow--next" data-platforms-arrow="next" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
            </span>
          </div>

          <!-- Pagination -->
          <div class="platforms-dots" data-platforms-dots role="tablist" aria-label="Plataformas">
            <button class="platform-dot is-active" type="button" role="tab" data-platforms-dot="0" aria-selected="true" aria-label="Travel Mexico"><span></span></button>
            <button class="platform-dot" type="button" role="tab" data-platforms-dot="1" aria-selected="false" aria-label="Hospitality Cancún"><span></span></button>
          </div>
        </div>
      </section>
`;

let html = fs.readFileSync(FILE, 'utf8');

// Locate the current platforms section (whatever shape it is in) and replace
// it wholesale, so the script can be re-run safely.
const sectionRe = /<section[^>]*\bid="plataformas"[^>]*>/i;
const sectionMatch = html.match(sectionRe);
if (!sectionMatch) throw new Error('platforms section element not found');

const sectionStart = sectionMatch.index;

// Find the matching </section> by counting the nesting
let depth = 0;
let cursor = sectionStart;
let sectionEnd = -1;
const tagRe = /<section\b[^>]*>|<\/section>/gi;
tagRe.lastIndex = sectionStart;
let m;
while ((m = tagRe.exec(html)) !== null) {
  if (m[0].toLowerCase() === '</section>') {
    depth--;
    if (depth === 0) { sectionEnd = m.index + m[0].length; break; }
  } else {
    depth++;
  }
  cursor = m.index;
}
if (sectionEnd === -1) throw new Error('platforms section closing tag not found');

// Include the leading comment block (if any) so it is replaced as well
let blockStart = sectionStart;
const commentStart = html.lastIndexOf('<!--', sectionStart);
if (commentStart !== -1 && html.slice(commentStart, sectionStart).indexOf('PLATFORMS') !== -1) {
  blockStart = commentStart;
}

let blockEnd = sectionEnd;
if (html[blockEnd] === '\r\n') blockEnd += 2;
else if (html[blockEnd] === '\n') blockEnd += 1;

html = html.slice(0, blockStart) + SECTION + html.slice(blockEnd);

fs.writeFileSync(FILE, html, 'utf8');

const order = [...html.matchAll(/<section[^>]*\bid="([^"]+)"/g)].map((m2) => m2[1]);
console.log('Section order:', order.join(' -> '));
