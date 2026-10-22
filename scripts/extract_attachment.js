/**
 * Extracts the latest image attachment from the opencode session database
 * into a file on disk.
 *
 * Usage: node scripts/extract_attachment.js [outputFile] [sessionId]
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
const outFile = process.argv[2] || path.join(process.cwd(), 'tmp_attachment', 'attachment.png');
const sessionId = process.argv[3] || 'ses_ea3024253ffeaazLhKCrbQRh8P';

const db = new DatabaseSync(dbPath, { readOnly: true });

const rows = db
  .prepare(`SELECT seq, time_created, data FROM session_message WHERE session_id = ? AND type = 'user' ORDER BY seq DESC LIMIT 30`)
  .all(sessionId);

let saved = null;
for (const row of rows) {
  let data;
  try { data = JSON.parse(row.data); } catch { continue; }
  const files = data.files || [];
  for (const f of files) {
    if (!f.mime || !f.mime.startsWith('image/')) continue;
    const raw = f.data || '';
    const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
    let buf;
    try { buf = Buffer.from(b64, 'base64'); } catch { continue; }
    if (!buf.length) continue;

    const ext = (f.mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const dest = outFile.replace(/\.[a-z0-9]+$/i, '') + '.' + ext;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log(`saved ${dest}`);
    console.log(`  mime=${f.mime} bytes=${buf.length} (${Math.round(buf.length / 1024)} KB) seq=${row.seq} source=${f.source || 'n/a'} name=${f.name || 'n/a'}`);
    saved = dest;
    break;
  }
  if (saved) break;
}

if (!saved) console.log('No image attachment found');
db.close();
process.exit(saved ? 0 : 1);
