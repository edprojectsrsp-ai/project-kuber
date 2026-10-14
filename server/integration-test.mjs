import { spawn } from 'node:child_process';
import { mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=mkdtempSync(path.join(tmpdir(),'kuber-integration-'));
const child=spawn(process.execPath,['server/server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:'4332',DB_FILE:path.join(dir,'test.db')},windowsHide:true});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
const jars={};
async function api(key,route,body){const r=await fetch('http://127.0.0.1:4332/api'+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Cookie:jars[key]||''},body:body===undefined?undefined:JSON.stringify(body)});const c=r.headers.get('set-cookie');if(c)jars[key]=c.split(';')[0];return {status:r.status,body:r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer()};}
try{
 for(let i=0;i<100&&!output.includes('running at');i++){if(child.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100));}assert.match(output,/running at/);
 assert.equal((await api('s','/register')).status,401);
 const wrongPortal=await api('wrong','/login',{personnelNo:'104821',password:'Kuber@2026',portal:'store'});assert.equal(wrongPortal.status,403);
 const administrator=await api('a','/login',{personnelNo:'admin',password:'Kuber@2026',portal:'admin'});assert.equal(administrator.status,200);assert.equal(administrator.body.user.role,'admin');
 await api('a','/password',{old:'Kuber@2026',password:'Test-Administrator-2026!'});await api('a','/login',{personnelNo:'admin',password:'Test-Administrator-2026!',portal:'admin'});assert.equal((await api('a','/register')).status,200);
 await api('s','/login',{personnelNo:'103900',password:'Kuber@2026'});assert.equal((await api('s','/register')).status,200);
 await api('s','/password',{old:'Kuber@2026',password:'Test-Store-Password-2026!'});assert.equal((await api('s','/register')).status,401);await api('s','/login',{personnelNo:'103900',password:'Test-Store-Password-2026!'});
 await api('e','/login',{personnelNo:'104821',password:'Kuber@2026'});await api('e','/password',{old:'Kuber@2026',password:'Test-Employee-Password-2026!'});await api('e','/login',{personnelNo:'104821',password:'Test-Employee-Password-2026!'});
 const state=(await api('s','/register')).body;assert.equal((await api('e','/action',{revision:state.revision,action:'receiveStock',args:[state.data.items[0].id,1,'Denied']})).status,403);
 const create=await api('e','/action',{revision:state.revision,action:'createSlip',args:[{personId:'p2',lines:[{itemId:state.data.items[0].id,qty:1}]}]});assert.equal(create.status,200);const req=create.body.result;
 assert.equal((await api('s','/action',{revision:state.revision,action:'approveSlip',args:[req]})).status,409);
 const approved=await api('s','/action',{revision:create.body.revision,action:'approveSlip',args:[req]});assert.equal(approved.status,200);
 const issued=await api('s','/action',{revision:approved.body.revision,action:'issueSlip',args:[req]});assert.equal(issued.status,200);
 assert.equal((await api('s','/action',{revision:issued.body.revision,action:'confirmSlip',args:[req]})).status,403);
 const closed=await api('e','/action',{revision:issued.body.revision,action:'confirmSlip',args:[req]});assert.equal(closed.status,200);assert.equal(closed.body.data.slips.find(s=>s.id===req).status,'closed');
 const bad=await api('s','/action',{revision:closed.body.revision,action:'retirePerson',args:['p1',Object.fromEntries(closed.body.data.assets.map(a=>[a.id,'does-not-exist']))]});assert.equal(bad.status,404);assert.equal((await api('s','/register')).body.revision,closed.body.revision);
 const imported=await api('s','/action',{revision:closed.body.revision,action:'importRows',args:[{kind:'people',rows:[{personnel_no:'NEW-TEST',name:'New Person'},{personnel_no:'104821',name:'Duplicate'}]}],initialPassword:'Temporary-Test-2026!'});assert.equal(imported.status,409);assert.equal((await api('s','/register')).body.revision,closed.body.revision);assert.ok(!(await api('s','/register')).body.data.people.some(p=>p.personnelNo==='NEW-TEST'));
 assert.equal((await api('e','/backup')).status,403);const backup=await api('s','/backup');assert.equal(backup.status,200);assert.ok(backup.body.byteLength>1000);const backupPath=path.join(dir,'downloaded.db');writeFileSync(backupPath,Buffer.from(backup.body));const restored=new Database(backupPath,{readonly:true});assert.equal(restored.pragma('integrity_check',{simple:true}),'ok');assert.equal(JSON.parse(restored.prepare('SELECT data FROM register').get().data).slips.find(s=>s.id===req).status,'closed');assert.equal(restored.prepare('SELECT count(*) n FROM accounts').get().n,state.data.people.length);restored.close();
 const help=await api('help','/password-help',{personnelNo:'104821',portal:'employee'});assert.equal(help.status,200);const missing=await api('missing','/password-help',{personnelNo:'does-not-exist',portal:'employee'});assert.equal(missing.body.message,help.body.message);
 assert.equal((await api('e','/password-help')).status,403);assert.equal((await api('s','/password-help')).status,403);const pending=(await api('a','/password-help')).body;assert.equal(pending.length,1);
 assert.equal((await api('s',`/password-help/${pending[0].id}/resolve`,{password:'Reset-Employee-2026!'})).status,403);assert.equal((await api('a',`/password-help/${pending[0].id}/resolve`,{password:'Reset-Employee-2026!'})).status,200);assert.equal((await api('e','/register')).status,401);await api('e','/login',{personnelNo:'104821',password:'Reset-Employee-2026!',portal:'employee'});assert.equal((await api('e','/register')).status,200);
 await api('e','/logout',{});assert.equal((await api('e','/register')).status,401);
 console.log('PASS: optional password change, administrator-mediated recovery, reset session revocation, role validation, shared data, request lifecycle, transaction rollback, backup and logout.');
}finally{if(child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}rmSync(dir,{recursive:true,force:true});}
