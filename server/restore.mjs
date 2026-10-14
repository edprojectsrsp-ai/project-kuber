import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),target=path.join(root,'data','kuber.db'),source=process.argv[2]&&path.resolve(process.argv[2]);
if(!source||source===target||!existsSync(source))throw Error('Supply the path to a downloaded database backup.');
const listening=await new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port:Number(process.env.PORT||4317)});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});
if(listening)throw Error('Stop the Store Ledger server before restoring.');
const backup=new Database(source,{readonly:true,fileMustExist:true});if(backup.pragma('integrity_check',{simple:true})!=='ok')throw Error('The backup failed its integrity check.');
const row=backup.prepare('SELECT data FROM register WHERE id=1').get();if(!row||!JSON.parse(row.data).people)throw Error('This is not a Kuber backup.');backup.close();
const dataRoot=path.join(root,'data'),archive=path.join(dataRoot,'before-restore-'+Date.now());mkdirSync(archive,{recursive:true});
for(const file of [target,target+'-wal',target+'-shm']){const resolved=path.resolve(file);if(!resolved.startsWith(dataRoot+path.sep))throw Error('Unsafe restore target.');if(existsSync(resolved))renameSync(resolved,path.join(archive,path.basename(resolved)));}
copyFileSync(source,target);const db=new Database(target);db.prepare('DELETE FROM sessions').run();db.close();console.log('Restored successfully. Previous database preserved in '+archive+'. Start the app and sign in.');
