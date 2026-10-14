import express from 'express';
import Database from 'better-sqlite3';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleRegister } from '../src/lib/store/seed.ts';
import { applyAction, visibleData, fail } from './domain.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbPath=process.env.DB_FILE||path.join(root,'data','kuber.db');mkdirSync(path.dirname(dbPath),{recursive:true});
const db=new Database(dbPath);db.pragma('journal_mode=WAL');
db.exec('CREATE TABLE IF NOT EXISTS register(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS accounts(person_id TEXT PRIMARY KEY,role TEXT NOT NULL,hash TEXT NOT NULL,must_change INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,person_id TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY,at TEXT,person_id TEXT,action TEXT);');
const hash=p=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');};
const check=(p,h)=>{const [salt,digest]=h.split(':');return timingSafeEqual(scryptSync(String(p),salt,64),Buffer.from(digest,'hex'));};
const sessionHash=t=>createHash('sha256').update(t).digest('hex');
db.exec("CREATE TABLE IF NOT EXISTS password_help(id INTEGER PRIMARY KEY,person_id TEXT NOT NULL,requested_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',resolved_at TEXT,resolved_by TEXT);");
// Password changes are optional; preserve every existing password hash.
db.prepare('UPDATE accounts SET must_change=0 WHERE must_change!=0').run();
if(!db.prepare('SELECT id FROM register').get()){
 const d=sampleRegister();d.audit=null;d.audits=[];d.settings.storekeeper='Storekeeper';
 if(process.env.KUBER_DEMO==='false'){const admin=d.people.find(p=>p.id==='p5');admin.personnelNo=process.env.KUBER_ADMIN_NO||'admin';admin.name=process.env.KUBER_ADMIN_NAME||'Storekeeper';d.people=[admin];d.assets=[];d.events=[];d.items=[];d.moves=[];d.slips=[];d.slipSeq=0;}
 db.prepare('INSERT INTO register VALUES(1,1,?)').run(JSON.stringify(d));
 const initial=process.env.KUBER_INITIAL_PASSWORD||'Kuber@2026';
 for(const p of d.people)db.prepare('INSERT INTO accounts VALUES(?,?,?,0)').run(p.id,p.id==='p5'?'store':'employee',hash(initial));
 console.log((process.env.KUBER_DEMO==='false'?`Empty register created. Storekeeper: ${d.people[0].personnelNo}.`:'Demo register created. Storekeeper: 103900; employee: 104821.')+' Initial password: '+(process.env.KUBER_INITIAL_PASSWORD?'set through environment':'Kuber@2026')+'. Password changes are optional from Profile & settings.');
}
const read=()=>{const row=db.prepare('SELECT * FROM register WHERE id=1').get();return {revision:row.revision,data:JSON.parse(row.data)};};
// Add the separate administrator account without changing existing credentials.
if(!db.prepare("SELECT person_id FROM accounts WHERE role='admin'").get())db.transaction(()=>{
 const current=read();let no=process.env.KUBER_ADMIN_LOGIN||'admin';if(current.data.people.some(p=>p.personnelNo===no))no='administrator';
 current.data.people.push({id:'p_admin',personnelNo:no,name:'Administrator',designation:'Administrator',section:'Administration',status:'active'});
 db.prepare('INSERT INTO accounts VALUES(?,?,?,0)').run('p_admin','admin',hash(process.env.KUBER_INITIAL_PASSWORD||'Kuber@2026'));
 db.prepare('UPDATE register SET revision=?,data=? WHERE id=1').run(current.revision+1,JSON.stringify(current.data));
})();
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'5mb'}));
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');res.set('X-Frame-Options','DENY');if(req.path.startsWith('/api'))res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)fail('Cross-origin writes are not allowed.',403);}catch(e){return res.status(e.status||403).json({error:e.message});}}next();});
const cookie=(res,token,age)=>res.cookie('kuber_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',maxAge:age,path:'/'});
const wrap=fn=>(req,res,next)=>{try{fn(req,res);}catch(e){res.status(e.status||500).json({error:e.status?e.message:'Unable to save. Check the server log.'});if(!e.status)console.error(e);}};
const pub=(p,a)=>({personId:p.id,name:p.name,personnelNo:p.personnelNo,role:a.role,mustChange:false});
const attempts=new Map();
const helpAttempts=new Map();
app.post('/api/password-help',wrap((req,res)=>{
 const key=req.ip;let attempt=helpAttempts.get(key);if(!attempt||attempt.until<Date.now()){attempt={count:0,until:Date.now()+15*60e3};helpAttempts.set(key,attempt);}if(attempt.count>=8)fail('Too many requests. Please try again later.',429);attempt.count++;
 const no=String(req.body.personnelNo||'').trim(),p=read().data.people.find(p=>p.personnelNo===no&&p.status==='active'),a=p&&db.prepare('SELECT * FROM accounts WHERE person_id=?').get(p.id);
 if(a&&a.role===req.body.portal&&!db.prepare("SELECT id FROM password_help WHERE person_id=? AND status='pending'").get(p.id))db.prepare('INSERT INTO password_help(person_id,requested_at) VALUES(?,?)').run(p.id,new Date().toISOString());
 res.json({message:'If this account exists, a password-reset request is now available to the administrator. Contact your administrator to receive a temporary password.'});
}));
app.post('/api/login',wrap((req,res)=>{
 const no=String(req.body.personnelNo||'').trim(),key=req.ip+':'+no;let attempt=attempts.get(key);if(!attempt||attempt.until<Date.now()){attempt={count:0,until:Date.now()+15*60e3};attempts.set(key,attempt);}if(attempt.count>=8)fail('Too many attempts. Try again in 15 minutes.',429);
 const {data}=read(),p=data.people.find(p=>p.personnelNo===no&&p.status==='active'),a=p&&db.prepare('SELECT * FROM accounts WHERE person_id=?').get(p.id);
 if(!a||!check(req.body.password||'',a.hash)){attempt.count++;fail('Personnel number or password is incorrect.',401);}attempts.delete(key);
 const portal=req.body.portal;if(portal!==undefined){if(!['store','employee','admin'].includes(portal))fail('Choose a valid sign-in role.');if(portal!==a.role)fail(`Use the ${a.role==='store'?'Storekeeper':a.role==='admin'?'Administrator':'User'} sign-in for this account.`,403);}
 const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(sessionHash(token),p.id,Date.now()+8*60*60e3);cookie(res,token,8*60*60e3);res.json({user:pub(p,a)});
}));
app.use('/api',(req,res,next)=>{try{const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('kuber_session='))?.slice(14);const s=token&&db.prepare('SELECT * FROM sessions WHERE hash=? AND expires>?').get(sessionHash(token),Date.now());if(!s)fail('Please sign in.',401);const p=read().data.people.find(p=>p.id===s.person_id&&p.status==='active'),a=p&&db.prepare('SELECT * FROM accounts WHERE person_id=?').get(p.id);if(!a)fail('Account inactive.',401);req.user=pub(p,a);req.tokenHash=sessionHash(token);next();}catch(e){res.status(e.status||401).json({error:e.message});}});
app.get('/api/me',(req,res)=>res.json({user:req.user}));
app.post('/api/logout',(req,res)=>{db.prepare('DELETE FROM sessions WHERE hash=?').run(req.tokenHash);cookie(res,'',0);res.json({ok:true});});
app.post('/api/password',wrap((req,res)=>{
 const a=db.prepare('SELECT * FROM accounts WHERE person_id=?').get(req.user.personId);if(!check(req.body.old||'',a.hash))fail('Current password is incorrect.');const p=req.body.password;if(typeof p!=='string'||p.length<10||p.length>128||p==='Kuber@2026'||p===req.body.old)fail('Choose a new password of 10–128 characters.');
 db.transaction(()=>{db.prepare('UPDATE accounts SET hash=?,must_change=0 WHERE person_id=?').run(hash(p),req.user.personId);db.prepare('DELETE FROM sessions WHERE person_id=?').run(req.user.personId);})();cookie(res,'',0);res.json({ok:true});
}));
app.get('/api/password-help',wrap((req,res)=>{if(req.user.role!=='admin')fail('Administrator access required.',403);const people=read().data.people;res.json(db.prepare("SELECT * FROM password_help WHERE status='pending' ORDER BY id DESC").all().map(r=>({...r,name:people.find(p=>p.id===r.person_id)?.name||'Unknown',personnelNo:people.find(p=>p.id===r.person_id)?.personnelNo||''})));}));
app.post('/api/password-help/:id/resolve',wrap((req,res)=>{
 if(req.user.role!=='admin')fail('Only an administrator can reset passwords.',403);const help=db.prepare("SELECT * FROM password_help WHERE id=? AND status='pending'").get(req.params.id);if(!help)fail('This request is no longer pending.',404);if(help.person_id===req.user.personId)fail('Use Change password for your own account.');const password=req.body.password;if(typeof password!=='string'||password.length<10||password.length>128)fail('Enter a temporary password of 10–128 characters.');
 db.transaction(()=>{db.prepare('UPDATE accounts SET hash=?,must_change=0 WHERE person_id=?').run(hash(password),help.person_id);db.prepare('DELETE FROM sessions WHERE person_id=?').run(help.person_id);db.prepare("UPDATE password_help SET status='resolved',resolved_at=?,resolved_by=? WHERE id=?").run(new Date().toISOString(),req.user.personId,help.id);db.prepare('INSERT INTO activity(at,person_id,action) VALUES(?,?,?)').run(new Date().toISOString(),req.user.personId,'password-reset');})();res.json({ok:true});
}));
app.get('/api/register',(req,res)=>{const {revision,data}=read();res.json({revision,data:visibleData(data,req.user)});});
app.post('/api/action',wrap((req,res)=>{
 const {action,args,revision}=req.body;if(typeof action!=='string'||!Array.isArray(args))fail('Invalid action.');
 const response=db.transaction(()=>{const current=read();if(current.revision!==revision)fail('The register changed on another device. It has been refreshed; please try again.',409);const before=new Set(current.data.people.map(p=>p.id));const result=applyAction(current.data,req.user,action,args);
  const newPeople=current.data.people.filter(p=>!before.has(p.id));if(newPeople.length){const password=req.body.initialPassword;if(typeof password!=='string'||password.length<10||password.length>128)fail('Enter a temporary password of 10–128 characters for the new employee.');for(const p of newPeople)db.prepare('INSERT INTO accounts VALUES(?,?,?,0)').run(p.id,'employee',hash(password));}
  db.prepare('UPDATE register SET revision=?,data=? WHERE id=1').run(current.revision+1,JSON.stringify(current.data));db.prepare('INSERT INTO activity(at,person_id,action) VALUES(?,?,?)').run(new Date().toISOString(),req.user.personId,action);return {result,revision:current.revision+1,data:visibleData(current.data,req.user)};
 })();res.json(response);
}));
app.get('/api/export',wrap((req,res)=>{if(!['store','admin'].includes(req.user.role))fail('Only the storekeeper can export the register.',403);res.set('Content-Disposition','attachment; filename="kuber-register.json"').json({exportedAt:new Date().toISOString(),...read()});}));
app.get('/api/backup',(req,res)=>{
 if(!['store','admin'].includes(req.user.role))return res.status(403).json({error:'Only the storekeeper can back up the database.'});
 const destination=path.join(path.dirname(dbPath),'backups',`kuber-${Date.now()}-${randomBytes(4).toString('hex')}.db`);mkdirSync(path.dirname(destination),{recursive:true});db.backup(destination).then(()=>res.download(destination,'kuber-backup.db')).catch(e=>{console.error(e);res.status(500).json({error:'Backup failed.'});});
});
app.get('/api/activity',wrap((req,res)=>{if(!['store','admin'].includes(req.user.role))fail('Storekeeper access required.',403);res.json(db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 200').all());}));
app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
if(existsSync(path.join(root,'dist'))){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(req,res)=>path.extname(req.path)?res.status(404).send('File not found.'):res.sendFile(path.join(root,'dist','index.html')));}
const port=Number(process.env.PORT||4317);const server=app.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Store Ledger running at http://localhost:${port}`));server.on('error',e=>{console.error(e.message);process.exitCode=1;});
