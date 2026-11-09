import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { openDatabase } from './database.mjs';
import { sampleRegister } from '../src/lib/store/seed.ts';

if (!process.env.MYSQL_URL) throw new Error('Set MYSQL_URL for the isolated migration test.');
const directory=mkdtempSync(path.join(tmpdir(),'kuber-migration-'));
const filename=path.join(directory,'source.db');
const prefix=`qa_migration_${Date.now()}_`;
let active;
try {
  const source=await openDatabase({filename,url:''});
  const data=sampleRegister();
  await source.prepare('INSERT INTO register VALUES(1,7,?)').run(JSON.stringify(data));
  await source.prepare('INSERT INTO accounts VALUES(?,?,?,0)').run('p1','employee','unchanged-test-hash');
  await source.prepare('INSERT INTO sessions VALUES(?,?,?)').run('test-session','p1',Date.now()+60000);
  await source.prepare('INSERT INTO activity(at,person_id,action) VALUES(?,?,?)').run('2026-11-09','p1','migration-fixture');
  await source.close();
  active=await openDatabase({filename,tablePrefix:prefix});
  assert.equal(active.engine,'mysql');
  assert.deepEqual(JSON.parse((await active.prepare('SELECT data FROM register WHERE id=1').get()).data),data);
  assert.equal((await active.prepare('SELECT revision FROM register WHERE id=1').get()).revision,7);
  assert.equal((await active.prepare('SELECT hash FROM accounts WHERE person_id=?').get('p1')).hash,'unchanged-test-hash');
  assert.equal((await active.prepare('SELECT count(*) n FROM sessions').get()).n,1);
  assert.ok(readdirSync(path.join(directory,'backups')).some(file=>file.startsWith('before-mysql-')));
  await assert.rejects(active.transaction(async()=>{
    await active.prepare('UPDATE register SET revision=99 WHERE id=1').run();
    throw new Error('Rollback fixture');
  })(),/Rollback fixture/);
  assert.equal((await active.prepare('SELECT revision FROM register WHERE id=1').get()).revision,7);
  await active.prepare('UPDATE register SET revision=8 WHERE id=1').run();
  await active.close();active=null;
  active=await openDatabase({filename,tablePrefix:prefix});
  assert.equal((await active.prepare('SELECT revision FROM register WHERE id=1').get()).revision,8);
  const oldSource=await openDatabase({filename,url:''});
  assert.equal((await oldSource.prepare('SELECT revision FROM register WHERE id=1').get()).revision,7);
  await oldSource.close();
  console.log('PASS: SQLite-to-MySQL migration preserves records, credentials and sessions, creates a backup, rolls back failed transactions, and never overwrites an existing MySQL register.');
} finally {
  if(active)await active.close();
  const connection=await mysql.createConnection(process.env.MYSQL_URL);
  try {for(const table of ['register','accounts','sessions','activity','password_help'])await connection.query(`DROP TABLE IF EXISTS \`${prefix}${table}\``);}
  finally {await connection.end();}
  rmSync(directory,{recursive:true,force:true});
}
