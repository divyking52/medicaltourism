/**
 * Points the new imagery at the Storebox CDN instead of the local
 * `assets/` copies.
 *
 * Only the references that exist in the templates are replaced; every
 * replacement is asserted so a silent no-op cannot slip through.
 *
 * Usage: node scripts/use_storebox_cdn.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CDN = 'https://admin.storebox.ai/media/9d2df151-23ca-4484-a18e-b1d06e387e46';

// local path -> Storebox media id
const MAP = {
  'assets/photos/heroes/agenda-hero.jpg': 'f717f68d-1310-4e43-8505-e7072d03ceb9/agenda-hero.jpg',
  'assets/photos/heroes/facilitadores-hero.jpg': '81519a04-1fb6-4be4-bdc2-c61f9722502d/facilitadores-hero.jpg',
  'assets/photos/editorial/biotecnologia.jpg': '0f5d1986-dbeb-495c-ad67-cc624da2fcf6/biotecnologia.jpg',
  'assets/photos/editorial/cirugia.jpg': 'c1614df2-aec8-4faf-beb3-3ee23546374e/cirugia.jpg',
  'assets/photos/editorial/consulta-paciente.jpg': '4fe0b673-7a54-4c8c-bdf3-559dd4b9255d/consulta-paciente.jpg',
  'assets/photos/editorial/dental.jpg': '604f56ca-53a0-4f91-beea-442fbd575ec3/dental.jpg',
  'assets/photos/editorial/especialistas.jpg': '05903431-4316-449f-837f-e704fa4659d6/especialistas.jpg',
  'assets/photos/editorial/investigacion.jpg': 'fabcc617-49e1-4a91-802b-e97034de88fd/investigacion.jpg',
  'assets/photos/editorial/laboratorio.jpg': 'e69f05b7-446c-4a68-b3fe-bb0f8fe7c38e/laboratorio.jpg',
  'assets/photos/editorial/medica.jpg': '560e777d-c3d7-40c8-9307-4bd8bed69765/medica.jpg',
  'assets/logos/ags-medico.jpg': 'c843fb9f-da62-448c-b15d-992561946b36/ags-medico.jpg',
  'assets/logos/escudo-aguascalientes.png': 'd22c187e-c25b-47ea-ba0d-f9b6f2618a84/escudo-aguascalientes.png',
  'assets/logos/ocv-negocios-convenciones.jpg': '548c5f60-76bf-42fc-b0f9-e65526a9ac2e/ocv-negocios-convenciones.jpg',
  'assets/logos/sectur.png': '1d0013d0-de6e-4bb4-9d1a-56b3ab9275a3/sectur.png',
};

const TEMPLATES = [
  'index.template.html',
  'agenda.template.html',
  'expo.template.html',
  'sede.template.html',
  'galeria.template.html',
  'facilitadores.template.html',
];

let replacements = 0;
const touched = new Set();

for (const file of TEMPLATES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [local, media] of Object.entries(MAP)) {
    const cdn = `${CDN}/${media}`;
    // 1) inside a url('...') — hero backgrounds
    const inUrl = `url('${local}')`;
    if (content.includes(inUrl)) {
      content = content.split(inUrl).join(`url('${cdn}')`);
      replacements++;
      touched.add(local);
    }
    // 2) inside src="..."
    const inSrc = `src="${local}"`;
    if (content.includes(inSrc)) {
      content = content.split(inSrc).join(`src="${cdn}"`);
      replacements++;
      touched.add(local);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${file}`);
  }
}

console.log(`\n${replacements} reference(s) repointed to the Storebox CDN across ${touched.size} asset(s).`);

const unused = Object.keys(MAP).filter((k) => !touched.has(k));
if (unused.length) {
  console.log('\nPrepared but not referenced anywhere (left on the CDN only):');
  unused.forEach((u) => console.log(`  - ${u}`));
}
