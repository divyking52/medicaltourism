/**
 * Patches `i18n.js` with the exact DOM strings that the engine could not
 * translate yet (extracted from the live pages, so the keys match
 * character-for-character, including `&` and accented characters).
 *
 * Usage: node scripts/patch_i18n.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'i18n.js');

// Keys taken verbatim from the rendered DOM
const PATCH = {
  '¿Quieres Meeting con los Facilitadores del CTM 2026?': 'Would you like a Meeting with the CTM 2026 Facilitators?',
  '15 Años de liderazgo &': '15 Years of leadership &',
  '15ª EDICIÓN · 2 & 3 DE DICIEMBRE 2026': '15TH EDITION · DECEMBER 2 & 3, 2026',
  '15ª EDICIÓN · 2 & 3 DE DICIEMBRE 2026 · MÉXICO': '15TH EDITION · DECEMBER 2 & 3, 2026 · MEXICO',
  '2 & 3 DE DICIEMBRE · MÉXICO': 'DECEMBER 2 & 3 · MEXICO',
  '2 & 3 DE DICIEMBRE 2026 · MÉXICO': 'DECEMBER 2 & 3, 2026 · MEXICO',
  '2 & 3 de Diciembre de 2026 · Aguascalientes, México. Reserva tu stand comercial o asegura tu acreditación en conferencias y citas B2B.': 'December 2 & 3, 2026 · Aguascalientes, Mexico. Reserve your commercial stand or secure your accreditation for conferences and B2B meetings.',
  'Acreditaciones & Servicios': 'Accreditations & Services',
  'Citas B2B & Difusión Oficial': 'B2B Meetings & Official Promotion',
  'Citas B2B & Networking': 'B2B Meetings & Networking',
  'Cofundador · Lymbika Health': 'Co-founder · Lymbika Health',
  'con altura de 2.50 m en aluminio anodizado con montaje y desmontaje profesional.': 'in anodised aluminium at 2.50 m high, with professional assembly and disassembly.',
  'Conoce a facilitadores internacionales de EE.UU. y Canadá en reuniones preagendadas 1-a-1 de 15 minutos en FICOTRECE Aguascalientes.': 'Meet international facilitators from the US and Canada in pre-scheduled 1-on-1 15-minute meetings at FICOTRECE Aguascalientes.',
  'Conoce la distribución de islas comerciales, salas de conferencias y pabellón de citas de negocios B2B.': 'Get to know the layout of the commercial islands, conference halls and the B2B meeting pavilion.',
  'Conoce la distribución de las islas comerciales, auditorio magistral y pabellón de citas B2B en el complejo FICOTRECE.': 'Get to know the layout of the commercial islands, the main auditorium and the B2B meeting pavilion at the FICOTRECE complex.',
  'CONOCER SEDE FICOTRECE': 'DISCOVER THE FICOTRECE VENUE',
  'Contenido de valor &': 'Valuable content &',
  'COZUMEL · MÉXICO': 'COZUMEL · MEXICO',
  'De la mano de expertos y líderes internacionales, conoce las estrategias, perspectivas y herramientas que te ayudarán a anticipar los cambios del sector, fortalecer tu propuesta de valor y generar nuevas oportunidades de negocio.': 'Guided by international experts and leaders, discover the strategies, perspectives and tools that will help you anticipate sector change, strengthen your value proposition and generate new business opportunities.',
  'de su empresa en redes sociales oficiales durante el congreso.': 'of your company on official social media during the congress.',
  'de turismo médico de América Latina.': 'in Latin American medical tourism.',
  'Deja tus datos para recibir tu carta de confirmación oficial y agenda académica. También puedes comunicarte al': 'Leave your details to receive your official confirmation letter and academic agenda. You can also contact us at',
  'Déjate inspirar por los Líderes y Gurús Mundiales Expertos en Turismo Médico durante dos días de conferencias magistrales.': 'Be inspired by the world’s leading medical tourism experts and gurus over two days of keynote conferences.',
  'del turismo médico.': 'in medical tourism.',
  'DESCARGA FORMATO CONFERENCIAS': 'DOWNLOAD CONFERENCES FORM',
  'DESCARGAR PLANO JPG': 'DOWNLOAD FLOOR PLAN JPG',
  'DESCUBRIR EL CONGRESO': 'DISCOVER THE CONGRESS',
  'DISEÑANDO LA EXPERIENCIA DEL PACIENTE': 'DESIGNING THE PATIENT EXPERIENCE',
  'Diseño, Innovación y Comercialización': 'Design, Innovation and Commercialisation',
  'Donde una conversación': 'Where a conversation',
  'El Congreso Internacional de Turismo Médico es un evento de negocios basado en citas preestablecidas entre aseguradoras, financiadoras de procedimientos médicos, brokers y agencias especializadas en turismo médico provenientes de Canadá, Estados Unidos y México.': 'The International Medical Tourism Congress is a business event built on pre-scheduled meetings between insurers, medical treatment financiers, brokers and specialised medical tourism agencies from Canada, the United States and Mexico.',
  'El próximo capítulo': 'The next chapter',
  'ELEGIR UBICACIÓN': 'CHOOSE LOCATION',
  'empieza aquí.': 'starts here.',
  'Encuentros de Negocios B2B con Facilitadores': 'B2B Business Meetings with Facilitators',
  'Envía tu solicitud y un asesor de relaciones públicas te contactará para asignar tu stand oficial.': 'Send your request and a public relations advisor will contact you to assign your official stand.',
  'EQUIPAMIENTO & CAPACIDADES': 'EQUIPMENT & CAPACITIES',
  'Explora la memoria gráfica y audiovisual de nuestras ediciones anteriores: conferencias magistrales, pabellón de exposición, misiones comerciales y miles de encuentros de negocios bilaterales B2B celebrados en las sedes más emblemáticas de México.': 'Explore the visual and audiovisual memory of our previous editions: keynotes, exhibition pavilions, trade missions and thousands of B2B business meetings held in Mexico’s most emblematic venues.',
  'EXPLORAR PLANO DE STANDS': 'EXPLORE THE STAND FLOOR PLAN',
  'Facilitadores de EE.UU. & Canadá': 'Facilitators from the US & Canada',
  'forme parte del encuentro.': 'part of the gathering.',
  'Haz que tu marca': 'Make your brand',
  'Hemos recibido tu información. Procede a realizar el pago de $3,000 MXN + IVA mediante transferencia bancaria y envía tu comprobante a relacionespublicas@congresodeturismomedico.com. Un asesor del comité organizador te contactará a la brevedad con tu confirmación.': 'We have received your information. Please make the $3,000 MXN + VAT payment by bank transfer and send your receipt to relacionespublicas@congresodeturismomedico.com. An advisor from the organising committee will contact you shortly with your confirmation.',
  'Hemos recibido tu información. Un asesor del comité organizador te contactará a la brevedad con tu confirmación.': 'We have received your information. An advisor from the organising committee will contact you shortly with your confirmation.',
  'Hemos recibido tus datos. Un asesor del comité organizador se comunicará contigo a la brevedad.': 'We have received your details. An advisor from the organising committee will contact you shortly.',
  'Infraestructura & Montaje': 'Infrastructure & Setup',
  'Las marcas que ya tienen su stand': 'The brands that already have their stand',
  'MÁS QUE HABLAR INGLÉS: CERTIFIQUE LA COMUNICACIÓN CLÍNICA DE SU EQUIPO CON OET': 'MORE THAN ENGLISH: CERTIFY YOUR TEAM’S CLINICAL COMMUNICATION WITH OET',
  'Muestra tu competitividad médica o turística y haz negocios frente a facilitadores y compradores de Canadá, EE.UU. y México.': 'Show your medical or tourism competitiveness and do business with facilitators and buyers from Canada, the US and Mexico.',
  'Muestra tu competitividad médica o turística y haz negocios frente a una comunidad profesional que busca nuevas soluciones y alianzas.': 'Show your medical or tourism competitiveness and do business with a professional community looking for new solutions and alliances.',
  'NEGOCIOS B2B': 'B2B BUSINESS',
  'Pabellón Expo': 'Expo Pavilion',
  'Paquete Comercial & Citas B2B': 'Commercial Package & B2B Meetings',
  'PATRIMONIO & MODERNIDAD': 'HERITAGE & MODERNITY',
  'Promocional 9° Congreso de Turismo Médico': 'Promotional 9th Medical Tourism Congress',
  'Proveedor Oficial de Diseños Especiales & Renta de Equipo para Stands': 'Official Supplier for Special Stand Designs & Equipment Rental',
  'QUIERO PARTICIPAR': 'I WANT TO PARTICIPATE',
  'RECINTO MONUMENTAL OFICIAL': 'OFFICIAL MONUMENTAL VENUE',
  'Recomendaciones Oficiales del Congreso': 'Official Congress Recommendations',
  'Registra tu empresa como expositor o asistente y solicita tu agenda de citas pre-establecidas con los compradores internacionales de Estados Unidos, Canadá y México.': 'Register your company as an exhibitor or attendee and request your pre-scheduled meeting agenda with buyers from the United States, Canada and Mexico.',
  'Regístrate al mejor congreso': 'Register for the leading congress',
  'Regístrate al mejor congreso de turismo médico de América Latina. Reserva tu lugar en la 15ª edición.': 'Register for Latin America’s leading medical tourism congress. Reserve your place at the 15th edition.',
  'Registro & Contacto': 'Registration & Contact',
  'REGISTRO & CONTACTO': 'REGISTRATION & CONTACT',
  'REGISTRO VISUAL · EVENTOS, STANDS & NEGOCIOS': 'VISUAL RECORD · EVENTS, STANDS & BUSINESS',
  'RESPALDO INSTITUCIONAL & ALIADOS ESTRATÉGICOS': 'INSTITUTIONAL SUPPORT & STRATEGIC PARTNERS',
  'RESPALDO INSTITUCIONAL & COMERCIAL': 'INSTITUTIONAL & COMMERCIAL SUPPORT',
  'Revive las conferencias, paneles de discusión y testimonios de compradores y facilitadores internacionales en las cumbres pasadas.': 'Revive the conferences, panel discussions and testimonials from international buyers and facilitators at past editions.',
  'Sede Oficial FICOTRECE': 'Official Venue FICOTRECE',
  'SOLICITAR ACCESO': 'REQUEST ACCESS',
  'una industria.': 'an industry.',
  'VER AGENDA COMPLETA & PONENTES': 'VIEW FULL AGENDA & SPEAKERS',
  'VER PABELLÓN EXPO': 'VIEW EXPO PAVILION',
  'VIDEOS & FOTOGRAFÍA OFICIAL · TRAYECTORIA CONTINUA': 'VIDEOS & OFFICIAL PHOTOGRAPHY · A CONTINUOUS JOURNEY',
  'VIII Congreso Ciudad Juárez 2017': '8th Ciudad Juárez Congress 2017',
  'Aguascalientes Medical Cluster': 'Aguascalientes Medical Cluster',
  'Ocv Viva Aguascalientes': 'OCV Viva Aguascalientes',
  '“BEYOND MEDICAL TOURISM: BUILDING CROSS-BORDER HEALTHCARE INFRASTRUCTURE”': '“BEYOND MEDICAL TOURISM: BUILDING CROSS-BORDER HEALTHCARE INFRASTRUCTURE”',
  'CONTACTO': 'CONTACT',
  'REGISTRO STAND': 'STAND REGISTRATION',
  'EXPO · VISIBILIDAD · MARCA': 'EXPO · VISIBILITY · BRAND',
  'PARTICIPA EN LAS CITAS DE NEGOCIOS': 'TAKE PART IN THE BUSINESS MEETINGS',
  'NEGOCIOS · CONEXIONES · OPORTUNIDADES': 'BUSINESS · CONNECTIONS · OPPORTUNITIES',
  'PASOS DEL SISTEMA DE CITAS B2B': 'STEPS OF THE B2B MEETING SYSTEM',
  'Explora la memoria gráfica y audiovisual de nuestras ediciones anteriores: conferencias magistrales, pabellones de exposición, misiones comerciales y miles de encuentros de negocios bilaterales B2B celebrados en las sedes más emblemáticas de México.': 'Explore the visual and audiovisual memory of our previous editions: keynotes, exhibition pavilions, trade missions and thousands of B2B bilateral business meetings held in Mexico’s most emblematic venues.',
  'Certificado internacionalmente en Coaching Empresarial, Marketing Digital e Inteligencia Artificial aplicada a negocios, es además creador del programa “Haz Crecer tu Negocio con Google”. Su trabajo integra recorridos virtuales, SEO local e IA para que profesionales de la salud y clínicas privadas optimicen su visibilidad y conecten eficazmente con sus pacientes.': 'Internationally certified in Business Coaching, Digital Marketing and Artificial Intelligence applied to business, he is also the creator of the “Grow Your Business with Google” programme. His work combines virtual tours, local SEO and AI so that healthcare professionals and private clinics can optimise their visibility and connect effectively with their patients.',
  'Stands & Expo': 'Stands & Expo',
  'PROMO 2018': 'PROMO 2018',
  '¡Ah Chihuahua!': '¡Ah Chihuahua!',
  'Ciudad Juárez': 'Ciudad Juárez',
  'FICOTRECE Aguascalientes': 'FICOTRECE Aguascalientes',
  'OCV Viva Aguascalientes': 'OCV Viva Aguascalientes',
  'Desliza para explorar': 'Swipe to explore',
  'Cambiar de plataforma': 'Switch platform',
  'Travel Mexico': 'Travel Mexico',
  'Hospitality Cancún': 'Hospitality Cancún',
  'Motor de reservas de México: compara hoteles, vuelos, renta de autos y tours de todo el país, y reserva en línea.': 'Mexico’s reservation engine: compare hotels, flights, car rental and tours across the country, and book online.',
  'Servicio de turismo médico con productos ya empaquetados: paquetes de tratamiento, hotel con traslados y concierge 360° en Riviera Maya y Cozumel.': 'A medical tourism service with ready-made packages: treatment packages, hotel with transfers and a 360° concierge in Riviera Maya and Cozumel.',
  'Un país. Infinitas historias. Conoce los destinos de México, compara hoteles, vuelos, renta de autos y tours, y reserva en línea.': 'One country. Infinite stories. Discover Mexico’s destinations, compare hotels, flights, car rental and tours, and book online.',
  'Atención médica de primer nivel en Riviera Maya y Cozumel: hospitales acreditados, especialistas bilingües y concierge 360° para tu tratamiento y viaje.': 'First-class healthcare in Riviera Maya and Cozumel: accredited hospitals, bilingual specialists and a 360° concierge for your treatment and trip.',
  'Reuniones B2B preagendadas para conectar proveedores de servicios médicos con compradores, facilitadores, aseguradoras y aliados internacionales de Canadá, Estados Unidos y México.': 'Pre-scheduled B2B meetings to connect medical service providers with buyers, facilitators, insurance companies, and international partners from Canada, the United States, and Mexico.',
  'Reuniones B2B preagendadas de 15 minutos para conectar oferta médica con compradores, facilitadores, aseguradoras y aliados internacionales de Canadá, EE.UU. y México.': 'Pre-scheduled B2B meetings to connect medical service providers with buyers, facilitators, insurance companies, and international partners from Canada, the United States, and Mexico.',
  'Citas 1-to-1 de 15 Minutos': 'One-on-one 15-minute meetings',
  'Facilitadores de EE.UU. & Canadá': 'Facilitators from the US & Canada',
  'Software de Citas Pre-Establecidas': 'Pre-Scheduled Meeting Engine',
  'Stands 2.44 x 3 m HD': 'HD 2.44 x 3 m stands',
  'Agenda de Citas Incluida': 'Meeting agenda included',
  'Sede: FICOTRECE': 'Venue: FICOTRECE',
  'Inteligencia Artificial (IA)': 'Artificial Intelligence (AI)',
  'Experiencia del paciente': 'Patient Experience',
  'Acreditaciones': 'Accreditations',
  'Encuentros de negocios preestablecidos. Las citas inician inmediatamente después de la última conferencia. Un sonido especial marca el cambio de mesa para facilitar los encuentros.': 'Pre-scheduled business meetings. Meetings begin immediately after the last conference. A special sound marks the table change to make the encounters easier.',
  'Las citas inician inmediatamente después de la última conferencia. Un sonido especial marca el cambio de mesa para facilitar los encuentros.': 'Meetings begin immediately after the last conference. A special sound marks the table change to make the encounters easier.',
  'Citas puntuales de 15 minutos': 'One-on-one 15-minute meetings',
  'Ver perfil completo de Osvaldo Rodríguez': 'View the full profile of Osvaldo Rodríguez',
  'Ver perfil completo de Osvaldo': 'View the full profile of Osvaldo Rodríguez',
  'Osvaldo Rodríguez': 'Osvaldo Rodríguez',
  'Negocios de Salud Internacional': 'OET',
  'Osvaldo (Promotion Tres60) · Estrategia Digital y Visibilidad': 'Osvaldo Rodríguez (Promotion Tres60) · Digital Strategy & Visibility',
  'Osvaldo Rodríguez (Promotion Tres60) · Estrategia Digital y Visibilidad': 'Osvaldo Rodríguez (Promotion Tres60) · Digital Strategy & Visibility',
  'Todo lo que debes saber sobre el 15° Congreso de Turismo Médico: regístrate en línea o ponte en contacto directo con el comité organizador.': 'Everything you need to know about the 15th Medical Tourism Congress: register online or contact the organising committee directly.',
  'Todo lo que debes saber sobre el 15° Congreso de Turismo Médico: descarga los formatos oficiales de inscripción o ponte en contacto directo con el comité organizador.': 'Everything you need to know about the 15th Medical Tourism Congress: register online or contact the organising committee directly.',
  'Descubre México': 'Discover Mexico',
  'desde nuevas perspectivas.': 'from new perspectives.'
};

// Keys that are no longer used by the markup and are dropped from the
// dictionary so it stays a faithful mirror of the site's copy.
const REMOVE = [
  'Dos puertas de entrada',
  'al turismo médico.',
  'DESCARGA FORMATO DE STANDS',
  'DESCARGA FORMATO CONFERENCIAS',
  'DESCARGAR FORMATO DE STANDS (DOCX)',
  'DESCARGAR FORMATO CONFERENCIAS (DOCX)',
  'Citas puntuales de 15 minutos',
  'Ver perfil completo de Osvaldo',
  'Osvaldo',
  'Negocios de Salud Internacional',
  'Osvaldo (Promotion Tres60) · Estrategia Digital y Visibilidad',
  'Todo lo que debes saber sobre el 15° Congreso de Turismo Médico: descarga los formatos oficiales de inscripción o ponte en contacto directo con el comité organizador.',
];

let src = fs.readFileSync(FILE, 'utf8');
let added = 0;
let overridden = 0;
const toAdd = [];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Line-based update: every dictionary entry sits on its own line, so we can
// match it exactly instead of trying to build a fragile regex.
const lines = src.split('\n');
const entryRe = /^(\s*)'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)'(,?)$/;

for (const [key, value] of Object.entries(PATCH)) {
  const escaped = esc(key);
  let hit = false;

  for (let i = 0; i < lines.length; i++) {
    const m = entryRe.exec(lines[i]);
    if (!m) continue;
    // compare the unescaped key so `'it\'s'` matches "it's"
    let raw = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    if (raw !== key) continue;
    lines[i] = `${m[1]}'${escaped}': '${esc(value)}',`;
    overridden++;
    hit = true;
    break;
  }

  if (!hit) toAdd.push([escaped, value]);
}

src = lines.join('\n');

// Insert the new keys at the end of the EN object, keeping the list valid
// (the previous entry may or may not end with a comma).
if (toAdd.length) {
  const marker = '\n  };\n\n  global.SITE_I18N';
  const at = src.indexOf(marker);
  if (at === -1) throw new Error('EN object terminator not found');

  const head = src.slice(0, at).replace(/,\s*$/, ''); // drop a dangling comma
  const tail = src.slice(at + marker.length);          // keep everything after the marker
  const block = toAdd.map(([k, v]) => `    '${k}': '${esc(v)}'`).join(',\n');
  src = `${head},\n${block}${marker}${tail}`;
  added = toAdd.length;
}

// Drop the keys whose source string no longer exists in the markup
let removed = 0;
for (const key of REMOVE) {
  const re = new RegExp(`\\n\\s*'${esc(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*'(?:[^'\\\\]|\\\\.)*',`, 'g');
  const before = src;
  src = src.replace(re, (m) => {
    removed++;
    return '\n';
  });
  if (before === src) console.log(`  (not in dictionary: ${key})`);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`i18n.js patched: ${added} added, ${overridden} corrected, ${removed} removed`);

// Fail loudly if the result is not valid JavaScript
new (require('vm').Script)(src, { filename: FILE });
console.log('i18n.js parses cleanly');
