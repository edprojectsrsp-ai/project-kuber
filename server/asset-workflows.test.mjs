import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleRegister } from '../src/lib/store/seed.ts';
import { applyAction, visibleData } from './domain.mjs';
import { consumableDescriptions, replaceConsumables } from './consumables.mjs';

const store = {personId:'p5',name:'Storekeeper',role:'store'};
const employee = {personId:'p1',name:'Employee',role:'employee'};
const incharge = {personId:'p_admin',name:'In-charge',role:'admin'};
const act = (data,user,action,...args) => applyAction(data,user,action,args);

test('catalogue replacement retains history, cancels obsolete pending requests and runs once', () => {
  const data=sampleRegister(), oldItems=structuredClone(data.items), moves=structuredClone(data.moves);
  assert.equal(consumableDescriptions.length,71);
  assert.equal(replaceConsumables(data),true);
  assert.equal(data.items.length,70);
  assert.ok(data.items.every(item=>item.qty===0));
  assert.deepEqual(data.archivedItems,oldItems);
  assert.deepEqual(data.moves,moves);
  assert.ok(data.slips.every(slip=>!['open','approved'].includes(slip.status)));
  assert.equal(replaceConsumables(data),false);
  assert.equal(data.archivedItems.length,oldItems.length);
});

test('employee request, store amendment and independent approval update only the requested asset', () => {
  const data=sampleRegister(), asset=data.assets.find(a=>a.holderId==='p1'), other=data.assets.find(a=>a.holderId==='p1'&&a.id!==asset.id);
  const request=act(data,employee,'requestAssetChange',{assetId:asset.id,toHolderId:'p2',room:'205',reason:'Seat transfer',requestType:'Transfer'});
  assert.equal(asset.holderId,'p1');
  assert.throws(()=>act(data,incharge,'approveAssetRequest',request,''),/store must prepare/i);
  act(data,store,'prepareAssetRequest',request,{toHolderId:'p2',room:'206',storeNote:'Verified'});
  assert.throws(()=>act(data,store,'approveAssetRequest',request,''),/in-charge/);
  const otherRoom=other.location;
  act(data,incharge,'approveAssetRequest',request,'Approved');
  assert.equal(asset.holderId,'p2');assert.equal(asset.location,'206');assert.equal(other.location,otherRoom);
  assert.equal(data.assetRequests[0].status,'approved');
  assert.throws(()=>act(data,incharge,'approveAssetRequest',request,''),/prepare/);
  act(data,store,'receiveStock',data.items[0].id,1,'Receipt');
  assert.equal(asset.location,'206');
  assert.match(data.events[0].note,/Approved asset request/);
});

test('nominated in-charge can approve but cannot submit or approve their own preparation', () => {
  const data=sampleRegister(), asset=data.assets.find(a=>a.holderId==='p1');
  act(data,incharge,'updateSettings',{storeInchargeId:'p2'});
  const reviewer={personId:'p2',name:'Reviewer',role:'employee'};
  const request=act(data,store,'requestAssetChange',{assetId:asset.id,toHolderId:'p2',room:'202',reason:'Transfer'});
  act(data,reviewer,'approveAssetRequest',request,'Checked');assert.equal(asset.holderId,'p2');
  const second=act(data,reviewer,'requestAssetChange',{assetId:asset.id,toHolderId:null,room:'Store',reason:'Return'});
  act(data,store,'prepareAssetRequest',second,{toHolderId:null,room:'Store'});
  assert.throws(()=>act(data,reviewer,'approveAssetRequest',second,''),/Another authorised/);
  act(data,incharge,'approveAssetRequest',second,'Checked');assert.equal(asset.holderId,null);
});

test('replacement is atomic and stale or occupied replacements are rejected before any allocation change', () => {
  const data=sampleRegister(), asset=data.assets.find(a=>a.holderId==='p1'&&a.kind==='CPU');
  const replacement=data.assets.find(a=>!a.holderId&&a.kind==='CPU');
  const request=act(data,employee,'requestAssetChange',{assetId:asset.id,toHolderId:'p1',room:'101',reason:'CPU replacement',requestType:'Change of asset'});
  act(data,store,'prepareAssetRequest',request,{toHolderId:'p1',room:'101',replacementId:replacement.id});
  replacement.holderId='p2';
  assert.throws(()=>act(data,incharge,'approveAssetRequest',request,''),/no longer available/);
  assert.equal(asset.holderId,'p1');replacement.holderId=null;
  act(data,incharge,'approveAssetRequest',request,'Verified replacement');
  assert.equal(asset.holderId,null);assert.equal(asset.location,'Store');
  assert.equal(replacement.holderId,'p1');assert.equal(replacement.location,'101');
});

test('ownership, pending duplicates, cancellation, rejection and preparation permissions', () => {
  const data=sampleRegister(), asset=data.assets.find(a=>a.holderId==='p1');
  assert.throws(()=>act(data,{...employee,personId:'p2'},'requestAssetChange',{assetId:asset.id,room:'101',reason:'Invalid'}),/only for your/);
  const draft={assetId:asset.id,toHolderId:null,room:'Store',reason:'Return'};
  const first=act(data,employee,'requestAssetChange',draft);
  assert.throws(()=>act(data,employee,'requestAssetChange',draft),/pending/);
  assert.throws(()=>act(data,employee,'prepareAssetRequest',first,{}),/storekeeper/);
  act(data,employee,'cancelAssetRequest',first);
  const second=act(data,store,'requestAssetChange',draft);
  assert.throws(()=>act(data,incharge,'rejectAssetRequest',second,''),/remarks/);
  act(data,incharge,'rejectAssetRequest',second,'Retain with employee');
  assert.equal(asset.holderId,'p1');assert.equal(data.assetRequests[0].status,'rejected');
  const third=act(data,store,'requestAssetChange',draft);
  act(data,incharge,'updateAsset',asset.id,{location:'Moved elsewhere'});
  assert.throws(()=>act(data,incharge,'approveAssetRequest',third,''),/changed after/);
});

test('ASR, AC specifications, furniture material and room options persist', () => {
  const data=sampleRegister();
  const id=act(data,store,'addAsset',{assetNo:'AC-TEST',asr:'ASR/123',kind:'Air conditioner',make:'Brand',model:'Office AC',acType:'Split',capacity:'1.5',location:'501',notes:'Verified'});
  const sofa=act(data,store,'addAsset',{assetNo:'SOFA-TEST',asr:'ASR/124',kind:'Sofa',make:'Brand',model:'Three seater',material:'Wood',location:'502'});
  let view=visibleData(data,store);assert.equal(data.assets.find(a=>a.id===id).capacity,'1.5');
  assert.equal(data.assets.find(a=>a.id===sofa).material,'Wood');
  for(const [field,value] of [['asrs','ASR/123'],['assetIds','AC-TEST'],['rooms','501'],['materials','Wood'],['acTypes','Split'],['capacities','1.5']])assert.ok(view.catalogs[field].includes(value));
  act(data,store,'addCatalogOption','materials','Fabric');view=visibleData(data,store);assert.ok(view.catalogs.materials.includes('Fabric'));
});

test('directory upsert retains both personnel numbers and limits employee contact visibility', () => {
  const data=sampleRegister(), row={personnelNo:'999001',sailPersonnelNo:'E999001',name:'Directory Person',section:'Projects',designation:'Manager',address:'Residence',mobile:'0000000000',officeIntercom:'123',email:'directory'};
  assert.throws(()=>act(data,store,'importEmployeeDirectory',[row]),/administrator/);
  assert.deepEqual(act(data,incharge,'importEmployeeDirectory',[row]),{added:1,updated:0});
  assert.deepEqual(act(data,incharge,'importEmployeeDirectory',[{...row,name:'Updated Person'}]),{added:0,updated:1});
  const person=data.people.find(p=>p.personnelNo==='999001');assert.equal(person.sailPersonnelNo,'E999001');assert.equal(person.mobile,'0000000000');assert.equal(person.room,'');
  const view=visibleData(data,employee);assert.ok(view.people.every(p=>p.id==='p1'));
  const recipient=view.assetRecipients.find(p=>p.id===person.id);assert.equal(recipient.name,'Updated Person');assert.equal(recipient.address,undefined);assert.equal(recipient.mobile,undefined);
});
