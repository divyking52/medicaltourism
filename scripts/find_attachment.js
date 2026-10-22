/**
 * Looks for image attachments stored in the opencode session database.
 * Usage: node scripts/find_attachment.js
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
if (!fs.existsSync(dbPath)) {
  console.log('db not found:', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('tables:', tables.map(t => t.name).join(', '));

for (const t of tables) {
  try {
    const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
    const colNames = cols.map(c => c.name);
    const hasBlob = colNames.some(c => /data|blob|content|image|file/i.test(c));
    console.log(`\n--- ${t.name} (${colNames.join(', ')}) blobish=${hasBlob}`);
    if (hasBlob) {
      const rows = db.prepare(`SELECT * FROM "${t.name}" ORDER BY rowid DESC LIMIT 5`).all();
      rows.forEach((r, i) => {
        const summary = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          if (v && typeof v === 'object' && v.type === 'Buffer') {
            summary[k] = `<Buffer ${v.length} bytes>`;
          } else if (typeof v === 'string' && v.length > 120) {
            summary[k] = v.slice(0, 120) + '…';
          } else {
            summary[k] = v;
          }
        }
        console.log(' ', i, JSON.stringify(summary).slice(0, 400));
      });
    }
  } catch (e) {
    console.log(`  (${t.name}: ${e.message})`);
  }
}

db.close();
