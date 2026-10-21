/**
 * Generates `facilitadores.template.html` from `agenda.template.html`.
 *
 * The new page reuses the agenda page skeleton (header, drawer, footer,
 * modals) so it stays visually and structurally identical to its siblings,
 * and swaps the <main> content for the Facilitators experience.
 *
 * The facilitator profile cards are injected at BUILD TIME from
 * agenda.template.html (same `.speaker-card-full` format), so the content
 * has a single source of truth.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'agenda.template.html');
const OUT = path.join(ROOT, 'facilitadores.template.html');

let html = fs.readFileSync(SRC, 'utf8');

function replaceOnce(find, replacement, label) {
  const parts = html.split(find);
  if (parts.length !== 2) {
    throw new Error(`${label}: expected exactly 1 match, found ${parts.length - 1}`);
  }
  html = parts.join(replacement);
}

// --- Head: title / meta / body class ---
replaceOnce(
  `<title>Agenda &amp; Conferencias Magistrales · 15° Congreso de Turismo Médico 2026</title>`,
  `<title>Facilitadores · 15° Congreso de Turismo Médico 2026</title>`,
  'title'
);

replaceOnce(
  `<meta name="description" content="`,
  `<meta name="description" content="Facilitadores de Turismo Médico de Estados Unidos, Canadá y México: aseguradoras, brokers, agencias, tour operadores y financiadoras que participan en las citas de negocios del 15° Congreso de Turismo Médico 2026." data-facilitators />`,
  'description'
);

replaceOnce(`<body class="agenda-page">`, `<body class="agenda-page facilitators-page">`, 'body class');

// --- Nav: Facilitadores becomes the active item (it already exists in the
//     agenda template — just swap the active state, no duplicate link) ---
replaceOnce(
  `          <a class="nav-link lbl active" href="#top"><span class="t">Agenda</span></a>`,
  `          <a class="nav-link lbl" href="agenda.html"><span class="t">Agenda</span></a>`,
  'nav agenda active'
);
replaceOnce(
  `          <a class="nav-link lbl" href="facilitadores.html"><span class="t">Facilitadores</span></a>`,
  `          <a class="nav-link lbl active" href="#top"><span class="t">Facilitadores</span></a>`,
  'nav facilitators active'
);

// --- Drawer: same treatment ---
replaceOnce(
  `          <a class="drawer-link active" href="#top"><span>02</span> Agenda de Conferencias</a>`,
  `          <a class="drawer-link" href="agenda.html"><span>02</span> Agenda de Conferencias</a>`,
  'drawer agenda active'
);
replaceOnce(
  `          <a class="drawer-link" href="facilitadores.html"><span>03</span> Facilitadores</a>`,
  `          <a class="drawer-link active" href="#top"><span>03</span> Facilitadores</a>`,
  'drawer facilitators active'
);

// --- Main content ---
const MAIN_CONTENT = `    <main>
      <!-- ============================================================
           HERO SECTION: FACILITADORES (B2B BUYERS & MATCHMAKERS)
           ============================================================ -->
      <section class="agenda-hero-section">
        <div class="photo-hero-bg" style="background-image: url('assets/photos/heroes/facilitadores-hero.jpg');" aria-hidden="true"></div>
        <div class="photo-hero-overlay" aria-hidden="true"></div>
        <div class="container relative-z">
          <div class="section-meta light-meta">
            <span class="section-number">FACILITADORES 2026</span>
            <span class="section-tag">COMPRADORES INTERNACIONALES · MÉXICO</span>
          </div>

          <p class="eyebrow gold-eyebrow">CITAS DE NEGOCIOS PRE-ESTABLECIDAS · 15 MINUTOS</p>
          <h1 class="editorial-headline text-white" style="font-size: clamp(38px, 4.5vw, 64px); max-width: 980px;">
            Los compradores que<br />
            <em class="headline-accent gold-accent">mueven el mercado.</em>
          </h1>

          <p class="hero-lead text-light" style="font-size: clamp(16px, 1.3vw, 19px); max-width: 860px; line-height: 1.7; margin-top: 20px;">
            Los Facilitadores son los compradores internacionales que participan en las citas de negocios del 15° Congreso de Turismo Médico: aseguradoras, brokers, agencias de viajes, tour operadores, empleadores corporativos y compañías de financiamiento en tratamientos médicos.<br />Cada año son más los Facilitadores en Turismo Médico procedentes de Estados Unidos, México y Canadá interesados en participar con el firme propósito de hacer negocios con hospitales, clínicas, consultorios médicos y destinos turísticos.
          </p>

          <!-- Official Disclaimers Bar -->
          <div class="agenda-notice-box">
            <p class="agenda-notice-text">
              <span style="color: var(--gold-bright);">✦</span>
              LO MÁS IMPORTANTE ES TRAER A VERDADEROS COMPRADORES INTERNACIONALES
            </p>
            <p class="agenda-notice-sub">
              *Roster de facilitadores sujeto a cambios según la organización sin previo aviso
            </p>
          </div>

          <!-- Quick Actions Bar -->
          <div style="margin-top: 32px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
            <button class="button primary btn-register-trigger" type="button" data-type="Citas de Negocios B2B">
              <span>SOLICITAR MIS CITAS DE NEGOCIOS</span>
              <span class="btn-arrow">→</span>
            </button>
            <button class="button ghost btn-register-trigger" type="button" data-type="Solo Conferencias" style="color: #fff; border-color: rgba(255,255,255,0.3);">
              <span>REGISTRARME EN LÍNEA</span>
              <span class="btn-arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ============================================================
           WHO THEY ARE — FACILITATOR CATEGORIES
           ============================================================ -->
      <section class="section section-agenda" style="padding-top: 60px; padding-bottom: 70px;">
        <div class="container">
          <div class="section-meta">
            <span class="section-number">QUIÉNES SON</span>
            <span class="section-tag">PARTICIPAN EN LAS CITAS DE NEGOCIOS</span>
          </div>

          <div class="facilitator-intro">
            <p class="section-lead">
              Lo más importante para el 15° Congreso de Turismo Médico es el compromiso de traer a verdaderos compradores internacionales interesados en enviar a sus pacientes hacia México. Esa es nuestra estrategia de éxito para generar un gran negocio.
            </p>
            <p class="section-lead-muted">
              Los Facilitadores de Turismo Médico han encontrado las ventajas competitivas que ofrece México, tanto en precio y calidad, para hacer excelentes negocios.
            </p>
          </div>

          <div class="facilitator-types-grid">
            <div class="facilitator-type-card">
              <span class="facilitator-type-index">01</span>
              <h3 class="facilitator-type-title">Aseguradoras</h3>
              <p class="facilitator-type-desc">Compañías aseguradoras con cobertura para tratamientos médicos fuera de su país de origen.</p>
            </div>
            <div class="facilitator-type-card">
              <span class="facilitator-type-index">02</span>
              <h3 class="facilitator-type-title">Brokers</h3>
              <p class="facilitator-type-desc">Intermediarios especializados en conectar pacientes y empleadores con proveedores de salud.</p>
            </div>
            <div class="facilitator-type-card">
              <span class="facilitator-type-index">03</span>
              <h3 class="facilitator-type-title">Agencias de Viajes</h3>
              <p class="facilitator-type-desc">Agencias que diseñan itinerarios de salud con alojamiento, traslados y atención integral.</p>
            </div>
            <div class="facilitator-type-card">
              <span class="facilitator-type-index">04</span>
              <h3 class="facilitator-type-title">Tour Operadores</h3>
              <p class="facilitator-type-desc">Operadores que enlazan la oferta médica mexicana con mercados internacionales.</p>
            </div>
            <div class="facilitator-type-card">
              <span class="facilitator-type-index">05</span>
              <h3 class="facilitator-type-title">Empleadores Corporativos</h3>
              <p class="facilitator-type-desc">Empresas que buscan programas de salud para sus colaboradores y familiares.</p>
            </div>
            <div class="facilitator-type-card">
              <span class="facilitator-type-index">06</span>
              <h3 class="facilitator-type-title">Compañías de Financiamiento</h3>
              <p class="facilitator-type-desc">Entidades que financian tratamientos médicos y hacen viable la atención internacional.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================================================
           CONFIRMED FACILITATOR PROFILES
           Same .speaker-card-full format as the agenda page.
           Injected at build time from agenda.template.html.
           ============================================================ -->
      <section class="section section-agenda" style="padding-top: 0; padding-bottom: 70px;">
        <div class="container">
          <div class="section-meta">
            <span class="section-number">FACILITADORES CONFIRMADOS</span>
            <span class="section-tag">ESTADOS UNIDOS · CANADÁ · MÉXICO</span>
          </div>

          <div class="agenda-cards-container">

            <!-- SPEAKER_ARTICLES -->
          </div>
        </div>
      </section>

      <!-- ============================================================
           PENDING FACILITATORS — PLACEHOLDER SLOTS
           ============================================================ -->
      <section class="section section-agenda" style="padding-top: 0; padding-bottom: 70px;">
        <div class="container">
          <div class="section-meta">
            <span class="section-number">PRÓXIMAMENTE</span>
            <span class="section-tag">FACILITADORES POR CONFIRMAR</span>
          </div>

          <p class="section-lead section-lead-muted">
            Los facilitadores confirmados por el comité organizador se incorporan a esta lista a medida que cierran su participación. Su agenda de citas de 15 minutos se asigna exclusivamente a empresas inscritas y acreditadas.
          </p>

          <div class="facilitator-pending-grid">
            <div class="facilitator-pending-slot"><span>USA</span><p>Por anunciar</p></div>
            <div class="facilitator-pending-slot"><span>USA</span><p>Por anunciar</p></div>
            <div class="facilitator-pending-slot"><span>CAN</span><p>Por anunciar</p></div>
            <div class="facilitator-pending-slot"><span>CAN</span><p>Por anunciar</p></div>
            <div class="facilitator-pending-slot"><span>MEX</span><p>Por anunciar</p></div>
            <div class="facilitator-pending-slot"><span>MEX</span><p>Por anunciar</p></div>
          </div>
        </div>
      </section>

      <!-- ============================================================
           CTA — REQUEST B2B MEETINGS
           ============================================================ -->
      <section class="section" style="padding-top: 0; padding-bottom: 90px;">
        <div class="container">
          <div class="facilitator-cta">
            <div>
              <p class="eyebrow gold-eyebrow">PARTICIPA EN LAS CITAS DE NEGOCIOS</p>
              <h3 class="facilitator-cta-title">¿Quieres Meeting con los Facilitadores del CTM 2026?</h3>
              <p class="facilitator-cta-text">
                Registra tu empresa como expositor o asistente y solicita tu agenda de citas pre-establecidas con los compradores internacionales de Estados Unidos, Canadá y México.
              </p>
            </div>
            <div class="facilitator-cta-actions">
              <button class="button primary btn-register-trigger" type="button" data-type="Citas de Negocios B2B">
                <span>SOLICITAR FORMATO DE NEGOCIOS</span>
                <span class="btn-arrow">→</span>
              </button>
              <a href="agenda.html" class="button ghost">
                <span>VER AGENDA COMPLETA</span>
                <span class="btn-arrow">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>`;

replaceOnce(
  html.match(/    <main>[\s\S]*?    <\/main>/)[0],
  MAIN_CONTENT,
  'main content'
);

// --- Footer sitemap: add the Facilitadores entry ---
replaceOnce(
  `            <li><a href="agenda.html">Agenda de Conferencias</a></li>`,
  `            <li><a href="agenda.html">Agenda de Conferencias</a></li>\n            <li><a href="facilitadores.html">Facilitadores</a></li>`,
  'footer sitemap'
);

fs.writeFileSync(OUT, html, 'utf8');
console.log('✓ facilitadores.template.html generated from agenda.template.html');
