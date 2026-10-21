/**
 * Connects the Vercel project to a GitHub repository and normalises the
 * deployment protection settings.
 *
 * Usage: node scripts/link_vercel_git.js <owner/repo> [branch]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET = process.argv[2] || 'divyking52/medicaltourism';
const BRANCH = process.argv[3] || 'main';
const AUTH_PATH = path.join(process.env.APPDATA || '', 'com.vercel.cli', 'Data', 'auth.json');
const PROJ_PATH = path.join(__dirname, '..', '.vercel', 'project.json');

const TOKEN = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')).token;
const proj = JSON.parse(fs.readFileSync(PROJ_PATH, 'utf8'));
const [org, repo] = TARGET.split('/');

function api(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      `https://api.vercel.com${pathname}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'User-Agent': 'vercel-link-helper',
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = { raw: raw.slice(0, 300) }; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log(`\n=== Linking ${proj.projectName} -> ${TARGET}#${BRANCH} ===\n`);

  // 1. Repoint the git connection (must disconnect the existing one first)
  const unlink = await api('DELETE', `/v9/projects/${proj.projectId}/link`);
  console.log('unlink->', unlink.status, unlink.body && unlink.body.error ? JSON.stringify(unlink.body.error).slice(0, 200) : 'ok');

  const link = await api('POST', `/v9/projects/${proj.projectId}/link`, {
    type: 'github',
    repo: TARGET,
    org,
    ref: BRANCH,
    productionBranch: BRANCH,
  });
  console.log('link  ->', link.status, JSON.stringify(link.body).slice(0, 400));

  // 2. Make sure the project is publicly reachable
  const prot = await api('PATCH', `/v9/projects/${proj.projectId}`, {
    ssoProtection: null,
    passwordProtection: null,
  });
  console.log('prot  ->', prot.status, prot.body && prot.body.error ? JSON.stringify(prot.body.error).slice(0, 300) : 'ok');

  // 3. Report the final state
  const p = await api('GET', `/v9/projects/${proj.projectId}`);
  console.log('\n--- final state ---');
  console.log('git repo  :', p.body.link ? p.body.link.repo : 'not linked');
  console.log('branch    :', p.body.link ? p.body.link.productionBranch || p.body.link.branch : '-');
  console.log('sso       :', p.body.ssoProtection === null ? 'null (public)' : JSON.stringify(p.body.ssoProtection));
  console.log('password  :', p.body.passwordProtection ? 'ON' : 'off');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
