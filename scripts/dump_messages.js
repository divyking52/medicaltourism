/**
 * Dumps the shape of the user messages in the session database so the
 * attachment format can be identified.
 * Usage: node scripts/dump_messages.js [sessionId]
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
const db = new DatabaseSync(dbPath, { readOnly: true });
const sessionId = process.argv[2] || 'ses_ea3024253ffeaazLhKCrbQRh8P';

const rows = db
  .prepare(`SELECT id, type, seq, time_created, data FROM session_message WHERE session_id = ? AND type = 'user' ORDER BY seq DESC LIMIT 8`)
  .all(sessionId);

console.log('user messages:', rows.length);

for (const row of rows) {
  let data;
  try { data = JSON.parse(row.data); } catch { continue; }
  console.log('\n=== seq', row.seq, 'keys:', Object.keys(data).join(', '));
  if (data.files && data.files.length) {
    console.log('  FILES:', data.files.length);
    data.files.forEach((f, i) => {
      const info = {
        mime: f.mime,
        filename: f.filename,
        url: typeof f.url === 'string' ? f.url.slice(0, 120) : f.url,
        keys: Object.keys(f).join(',')
      };
      console.log('   ', i, JSON.stringify(info));
    });
  }
  const parts = data.parts || (data.message && data.message.parts) || [];
  console.log('  parts:', parts.length);
  parts.forEach((p, i) => {
    const info = {
      type: p.type,
      id: p.id,
      mime: p.mime,
      filename: p.filename,
      url: typeof p.url === 'string' ? p.url.slice(0, 90) : p.url,
      text: p.text ? String(p.text).replace(/\s+/g, ' ').slice(0, 70) : undefined
    };
    console.log('   ', i, JSON.stringify(info));
  });
}

db.close();
