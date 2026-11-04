import { createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [backupFile, keyFile, outputFile] = process.argv.slice(2);
if (!backupFile || !keyFile || !outputFile) throw Error('Usage: node server/decrypt-backup.mjs backup.db.enc recovery.key.txt output.db');
const envelope = JSON.parse(readFileSync(backupFile, 'utf8'));
if (envelope.version !== 1 || envelope.cipher !== 'aes-256-gcm') throw Error('Unsupported encrypted backup.');
const key = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'base64');
if (key.length !== 32) throw Error('Invalid recovery key.');
const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]);
// Authentication completes before writing; never overwrite an existing database.
writeFileSync(path.resolve(outputFile), plaintext, { flag: 'wx', mode: 0o600 });
console.log('Backup decrypted to ' + path.resolve(outputFile));
