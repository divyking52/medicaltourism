/**
 * Inspects the linked Vercel project via the API: git connection, branch,
 * deployment protection and the production alias.
 *
 * Usage: node scripts/inspect_vercel_project.js [projectName]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = process.argv[2] || 'medicaltourism';
const AUTH_PATH = path.join(process.env.APPDATA || '', 'com.vercel.cli', 'Data', 'auth.json');
const PROJ_PATH = path.join(__dirname, '..', '.vercel', 'project.json');

const auth = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8'));
const TOKEN = auth.token;
const proj = JSON.parse(fs.readFileSync(PROJ_PATH, 'utf8'));

function api(pathname) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.vercel.com${pathname}`,
      { headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'vercel-project-inspector' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          try { resolve(JSON.parse(body)); } catch { resolve({ raw: body.slice(0, 400) }); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log(`\n=== Vercel project: ${PROJECT} ===\n`);

  const p = await api(`/v9/projects/${proj.projectId}`);
  console.log('name            :', p.name);
  console.log('id              :', p.id);
  console.log('framework       :', p.framework);
  console.log('build command   :', p.buildCommand === null ? 'null (static)' : p.buildCommand);
  console.log('output dir      :', p.outputDirectory);
  console.log('ssoProtection   :', p.ssoProtection === null ? 'null (public)' : JSON.stringify(p.ssoProtection));
  console.log('password protect:', p.passwordProtection ? 'ON' : 'off');
  console.log('productionBranch:', p.productionBranch || '(default)');
  console.log('\ngit connection  :', p.link ? 'LINKED' : 'not linked');
  if (p.link) {
    console.log('  type   :', p.link.type);
    console.log('  repo   :', p.link.repo);
    console.log('  org    :', p.link.org);
    console.log('  branch :', p.link.productionBranch || p.link.branch);
  }
  console.log('\npublic alias    :', (p.alias || []).join(', ') || '(none)');
  console.log('domains         :', (p.domains || []).map((d) => d.name).join(', ') || '(none)');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
