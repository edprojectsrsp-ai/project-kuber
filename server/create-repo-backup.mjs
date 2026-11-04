import Database from 'better-sqlite3';
import { randomBytes, createCipheriv, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const label = process.argv[2] || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
if (!/^[\d-]+$/.test(label)) throw Error('Use a date label such as 2026-11-04.');
const stem = `kuber-${label}-${randomBytes(4).toString('hex')}`;
const directory = path.join(root, 'backups');
const privateDirectory = path.join(root, 'data', 'recovery-keys');
mkdirSync(directory, { recursive: true });
mkdirSync(privateDirectory, { recursive: true });
const temporary = path.join(root, 'data', `${stem}.snapshot.db`);
const source = new Database(process.env.DB_FILE || path.join(root, 'data', 'kuber.db'), { readonly: true, fileMustExist: true });
try {
  await source.backup(temporary);
} finally {
  source.close();
}
try {
  const snapshot = new Database(temporary);
  try {
    if (snapshot.pragma('integrity_check', { simple: true }) !== 'ok') throw Error('Backup integrity check failed.');
    // Preserve accounts and records, but do not archive active sign-in sessions.
    snapshot.prepare('DELETE FROM sessions').run();
    snapshot.pragma('journal_mode=DELETE');
  } finally {
    snapshot.close();
  }
  const plaintext = readFileSync(temporary);
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope = { version: 1, cipher: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') };
  const keyFile = path.join(privateDirectory, `${stem}.key.txt`);
  writeFileSync(keyFile, key.toString('base64') + '\n', { flag: 'wx', mode: 0o600 });
  const backupFile = path.join(directory, `${stem}.db.enc`);
  writeFileSync(backupFile, JSON.stringify(envelope) + '\n', { flag: 'wx' });
  writeFileSync(path.join(directory, `${stem}.json`), JSON.stringify({ file: path.basename(backupFile), encryption: 'AES-256-GCM', sha256: createHash('sha256').update(readFileSync(backupFile)).digest('hex'), plaintextSha256: createHash('sha256').update(plaintext).digest('hex'), createdAt: new Date().toISOString(), sessionsExcluded: true }, null, 2) + '\n', { flag: 'wx' });
  console.log(`Encrypted backup: ${backupFile}\nLocal recovery key (never commit): ${keyFile}`);
} finally {
  unlinkSync(temporary);
}
