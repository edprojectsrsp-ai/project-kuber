import { randomUUID } from 'node:crypto';
import { isActiveAsset } from '../src/lib/store/asset-status.ts';
const id = p => `${p}_${randomUUID()}`;
const now = () => new Date().toISOString();
export function fail(message, status=400) { const e=new Error(message); e.status=status; throw e; }
const text = (v, label, required=false) => { if(typeof v!=='string'||v.length>2000||(required&&!v.trim()))fail(`Enter a valid ${label}.`); return v.trim(); };
const quantity = (v, zero=false) => { if(typeof v!=='number'||!Number.isFinite(v)||v<(zero?0:1)||!Number.isSafeInteger(v))fail('Quantity must be a positive whole number (zero allowed for opening stock).'); return v; };
const find = (rows,key,label) => rows.find(x=>x.id===key)||fail(`${label} not found.`,404);
export function normalizeRooms(d) {
 if(d.roomModelVersion===1)return;
 for(const p of d.people){if(typeof p.room!=='string'){const held=d.assets.filter(a=>a.holderId===p.id&&a.location);const counts=new Map();for(const a of held)counts.set(a.location,(counts.get(a.location)||0)+1);p.room=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';}}
 for(const a of d.assets)if(a.holderId){const p=d.people.find(p=>p.id===a.holderId);if(p)a.location=p.room;}
 d.roomModelVersion=1;
}
export function reservedStock(d,itemId,exceptId){return d.slips.filter(s=>s.status==='approved'&&s.id!==exceptId).reduce((sum,s)=>sum+s.lines.filter(l=>l.itemId===itemId).reduce((n,l)=>n+(l.approvedQty??l.qty),0),0);}
export function availableStock(d,itemId,exceptId){return Math.max(0,find(d.items,itemId,'Item').qty-reservedStock(d,itemId,exceptId));}
export function applyAction(d, user, action, args) {
 normalizeRooms(d);
 const store=['store','admin'].includes(user.role);
 const incharge=user.role==='admin'||d.settings.storeInchargeId===user.personId;
 const employeeActions=['createSlip','updateSlip','confirmSlip','cancelSlip','reportReceipt','requestAssetChange','cancelAssetRequest'];
 const approvalActions=['approveAssetRequest','rejectAssetRequest'];
 if(!store&&!employeeActions.includes(action)&&!(incharge&&approvalActions.includes(action)))fail('Only the storekeeper can perform this action.',403);
 if(['addPerson','updatePerson','retirePerson','importEmployeeDirectory'].includes(action)&&user.role!=='admin')fail('Only the administrator can change employee records.',403);
 const person = key => { const p=find(d.people,key,'Person'); if(p.status!=='active')fail('This person is retired.'); return p; };
 const holder = key => key===null?null:person(key).id;
 const item = key => find(d.items,key,'Item');
 const asset = key => find(d.assets,key,'Asset');
 const event=(a,type,from,to,note)=>d.events.unshift({id:id('ev'),assetId:a.id,at:now(),type,fromHolderId:from,toHolderId:to,note,by:user.name});
 const move=(i,qty,type,note,slipId)=>{const balance=i.qty+(type==='out'?-qty:qty);quantity(balance,true);i.qty=balance;d.moves.unshift({id:id('m'),itemId:i.id,at:now(),type,qty,note,slipId,by:user.name});};
 const unique=(rows,key,value,except)=>{if(rows.some(x=>x.id!==except&&String(x[key]).toLowerCase()===value.toLowerCase()))fail(`${key==='assetNo'?'Asset number':'Personnel number'} already exists.`,409);};
 const uniqueItem=(candidate,except)=>{
  const normalized=value=>value.trim().replace(/\s+/g,' ').toLowerCase();
  if(d.items.some(row=>row.id!==except&&['name','make','unit'].every(key=>normalized(row[key]||'')===normalized(candidate[key]||''))))fail('This item and make already exist. Receive stock against the existing item.',409);
 };
 const assign=(a,to,room,note,audit=false)=>{
  if(!isActiveAsset(a))fail('A deactivated or condemned asset cannot be allocated. Reactivate it first.');
  to=holder(to); const from=a.holderId;
  if(audit&&to)for(const old of d.assets.filter(x=>x.id!==a.id&&x.holderId===to&&x.kind===a.kind&&isActiveAsset(x))){
   old.holderId=null;old.status='unallocated';old.updatedAt=now();event(old,'returned',to,null,'Displaced during audit; physical location needs verification.');
   if(d.audit?.status==='open')d.audit.results[old.id]='needs-review';
  }
  a.holderId=to;a.status=to?'in-use':audit?'unallocated':'in-store';if(room!==undefined)a.location=text(room,'room');else if(to)a.location=person(to).room;a.updatedAt=now();
  event(a,from===to?'updated':to?(from?'transferred':'assigned'):'returned',from,to,note);
  if(audit&&d.audit?.status==='open')d.audit.results[a.id]='changed';
 };
 switch(action){
 case 'deactivateAsset': {
  const a=asset(args[0]),reason=text(args[1],'deactivation reason',true);
  if(!isActiveAsset(a))fail('This asset is already inactive.');
  const from=a.holderId;
  a.holderId=null;a.status='deactivated';a.deactivatedAt=now();a.deactivatedBy=user.name;
  a.deactivationReason=reason;a.updatedAt=now();
  event(a,'deactivated',from,null,reason);
  for(const request of d.assetRequests||[]){
   if(!['requested','pending-approval'].includes(request.status))continue;
   if(request.assetId===a.id){
    request.status='cancelled';request.cancelledAt=now();request.cancelledBy=user.personId;
    request.resolutionNote=`Asset deactivated: ${reason}`;
   }else if(request.replacementId===a.id){
    delete request.replacementId;delete request.replacementLabel;delete request.replacementUpdatedAt;
    request.status='requested';delete request.preparedBy;delete request.preparedAt;
    request.resolutionNote='The proposed replacement was deactivated. Select another replacement.';
   }
  }
  if(d.audit?.status==='open'&&d.audit.baseline.some(row=>row.id===a.id))d.audit.results[a.id]='deactivated';
  return;
 }
 case 'reactivateAsset': {
  const a=asset(args[0]),reason=text(args[1],'reactivation reason',true);
  if(a.status!=='deactivated')fail('Only a deactivated asset can be reactivated.');
  a.holderId=null;a.status='unallocated';a.updatedAt=now();
  event(a,'reactivated',null,null,reason);return;
 }
 case 'seedDemonstrationStock': {
  if(user.role!=='admin')fail('Only the administrator can set demonstration balances.',403);
  if(!Array.isArray(args[0])||!args[0].length||new Set(args[0].map(row=>row.itemId)).size!==args[0].length)fail('Select distinct sample balances.');
  for(const row of args[0]){
   const i=item(row.itemId);
   if(i.qty!==0||d.moves.some(m=>m.itemId===i.id))fail('Sample balances can only be set for unused catalogue items.');
   quantity(row.qty);
  }
  for(const row of args[0]){const i=item(row.itemId);move(i,row.qty,'in','Sample opening balance for setup; replace with a verified physical count.');i.sampleBalance=true;}
  return;
 }
 case 'importEmployeeDirectory': {
  const rows=args[0];
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)fail('Import up to 1,000 employees at a time.');
  const numbers=new Set(),sailNumbers=new Set();let added=0,updated=0;
  for(const row of rows){
   const no=text(row.personnelNo,'RSP personnel number',true),sail=text(row.sailPersonnelNo||'','SAIL personnel number');
   if(numbers.has(no)||(sail&&sailNumbers.has(sail)))fail('Duplicate personnel number in the directory.');
   numbers.add(no);if(sail)sailNumbers.add(sail);
   const existing=d.people.find(p=>p.personnelNo===no||(sail&&p.sailPersonnelNo===sail));
   const draft={...row,personnelNo:no};
   if(existing){applyAction(d,user,'updatePerson',[existing.id,draft]);updated++;}
   else{const key=applyAction(d,user,'addPerson',[draft]);applyAction(d,user,'updatePerson',[key,draft]);added++;}
  }
  return {added,updated};
 }
 case 'requestAssetChange': {
  const draft=args[0],a=asset(draft.assetId);
  if(!store&&a.holderId!==user.personId)fail('You can request changes only for your allocated assets.',403);
  if(!isActiveAsset(a))fail('A deactivated or condemned asset cannot be transferred. Reactivate it first.');
  d.assetRequests??=[];
  if(d.assetRequests.some(r=>r.assetId===a.id&&['requested','pending-approval'].includes(r.status)))fail('This asset already has a pending change request.',409);
  const to=holder(draft.toHolderId??null),room=text(draft.room||'','room',true);
  const request={id:id('ar'),assetId:a.id,assetLabel:`${a.kind} · ${a.assetNo}`,requesterId:user.personId,requesterName:user.name,
   fromHolderId:a.holderId,fromLocation:a.location,assetUpdatedAt:a.updatedAt,toHolderId:to,toName:to?person(to).name:'Store',room,
   requestType:text(draft.requestType||'Transfer','request type',true),reason:text(draft.reason||'','remarks',true),
   status:store&&draft.requestType!=='Change of asset'?'pending-approval':'requested',createdAt:now()};
  if(store){request.preparedBy=user.personId;request.preparedAt=now();}
  d.assetRequests.unshift(request);return request.id;
 }
 case 'prepareAssetRequest': {
  const r=find(d.assetRequests||[],args[0],'Asset request'),draft=args[1];
  if(!['requested','pending-approval'].includes(r.status))fail('This request is already resolved.');
  const a=asset(r.assetId);
  if(a.updatedAt!==r.assetUpdatedAt)fail('The asset changed after this request. Cancel it and submit a fresh request.',409);
  r.toHolderId=holder(draft.toHolderId??null);r.toName=r.toHolderId?person(r.toHolderId).name:'Store';
  r.room=text(draft.room,'room',true);r.storeNote=text(draft.storeNote||'','store remarks');
  if(draft.replacementId){
   const replacement=asset(draft.replacementId);
   if(r.requestType!=='Change of asset'||replacement.id===a.id||replacement.kind!==a.kind||replacement.holderId||!isActiveAsset(replacement))fail('Choose an unallocated replacement of the same asset type.');
   r.replacementId=replacement.id;r.replacementLabel=`${replacement.kind} · ${replacement.assetNo}`;r.replacementUpdatedAt=replacement.updatedAt;
  }else{delete r.replacementId;delete r.replacementLabel;delete r.replacementUpdatedAt;}
  delete r.resolutionNote;r.status='pending-approval';r.preparedBy=user.personId;r.preparedAt=now();return;
 }
 case 'approveAssetRequest': case 'rejectAssetRequest': {
  if(!incharge)fail('Only the nominated store in-charge or administrator can approve asset changes.',403);
  const r=find(d.assetRequests||[],args[0],'Asset request');
  if(r.status!=='pending-approval')fail('The store must prepare this request before approval.');
  if(r.preparedBy===user.personId||r.requesterId===user.personId)fail('Another authorised in-charge must review this request.',403);
  const note=text(args[1]||'','review remarks',action==='rejectAssetRequest');
  if(action==='approveAssetRequest'){
   const a=asset(r.assetId);
   if(a.updatedAt!==r.assetUpdatedAt||a.holderId!==r.fromHolderId||a.location!==r.fromLocation)fail('The asset changed after this request. Cancel it and submit a fresh request.',409);
   const reason=`Approved asset request ${r.id}: ${r.reason}${r.storeNote?' · '+r.storeNote:''}${note?' · '+note:''}`;
   if(r.requestType==='Change of asset'&&!r.replacementId)fail('The store must select the replacement asset before approval.');
   if(r.replacementId){
    const replacement=asset(r.replacementId);
    if(replacement.updatedAt!==r.replacementUpdatedAt||replacement.holderId||!isActiveAsset(replacement))fail('The replacement asset is no longer available. Ask the store to prepare this request again.',409);
    if(!r.toHolderId)fail('Select the replacement asset recipient.');
    person(r.toHolderId);
    assign(a,null,'Store',reason);assign(replacement,r.toHolderId,r.room,reason);
   }else assign(a,r.toHolderId,r.room,reason);
   r.status='approved';
  }else r.status='rejected';
  r.reviewedBy=user.personId;r.reviewedAt=now();r.reviewNote=note;return;
 }
 case 'cancelAssetRequest': {
  const r=find(d.assetRequests||[],args[0],'Asset request');
  if(!store&&r.requesterId!==user.personId)fail('This is not your request.',403);
  if(!['requested','pending-approval'].includes(r.status))fail('This request is already resolved.');
  r.status='cancelled';r.cancelledAt=now();r.cancelledBy=user.personId;return;
 }
 case 'importRows': {const {kind,rows}=args[0];if(kind==='people'&&user.role!=='admin')fail('Only the administrator can import people.',403);if(!['people','assets'].includes(kind)||!Array.isArray(rows)||!rows.length||rows.length>1000)fail('Import up to 1,000 people or assets at a time.');for(const row of rows){if(kind==='people')applyAction(d,user,'addPerson',[{personnelNo:row.personnel_no,name:row.name,designation:row.designation||'',section:row.section||'',room:row.room||''}]);else{const p=row.holder_pno?d.people.find(p=>p.personnelNo===row.holder_pno):null;if(row.holder_pno&&!p)fail(`Unknown personnel number ${row.holder_pno}.`);applyAction(d,user,'addAsset',[{assetNo:row.asset_no,kind:row.type,make:row.brand||'',model:row.model||'',serialNo:row.serial_no||'',location:row.room||'',holderId:p?.id||null,notes:row.remarks||'',asr:row.asr||'',acType:row.ac_type||'',capacity:row.capacity||'',material:row.material||''}]);}}return rows.length;}
 case 'updateRoom': {if(user.role!=='admin')fail('Submit asset change requests for room changes.',403);const p=person(args[0]);const room=text(args[1],'room');for(const a of d.assets.filter(a=>a.holderId===p.id&&a.location===(p.room||''))){event(a,'updated',p.id,p.id,'Room changed with holder: '+(a.location||'not set')+' → '+(room||'not set'));a.location=room;a.updatedAt=now();}p.room=room;return;}
 case 'addCatalogOption': {const [kind,value]=args;const allowed=['makes','categories','units','assetKinds','designations','sections','asrs','assetIds','serials','rooms','acTypes','capacities','materials','assetRequestTypes'];if(!allowed.includes(kind))fail('Invalid catalogue field.');const entry=text(value,'option',true);if(entry.length>100)fail('Keep options below 100 characters.');const existing=catalogueOptions(d)[kind].find(value=>value.toLowerCase()===entry.toLowerCase());if(existing)return existing;d.catalogs??={};d.catalogs[kind]??=[];d.catalogs[kind].push(entry);return entry;}
 case 'addPerson': {const draft=args[0];const p={id:id('p'),personnelNo:text(draft.personnelNo,'personnel number',true),name:text(draft.name,'name',true),designation:text(draft.designation||'','designation'),section:text(draft.section||'','section'),room:text(draft.room||'','room'),status:'active'};unique(d.people,'personnelNo',p.personnelNo);for(const key of ['sailPersonnelNo','address','mobile','officeIntercom','residenceIntercom','officeBsnl','residenceBsnl','email'])if(draft[key]!==undefined)p[key]=text(draft[key],key);if(p.sailPersonnelNo)unique(d.people,'sailPersonnelNo',p.sailPersonnelNo);d.people.unshift(p);return p.id;}
 case 'updatePerson': {const p=find(d.people,args[0],'Person'),patch=args[1];if(patch.sailPersonnelNo)unique(d.people,'sailPersonnelNo',text(patch.sailPersonnelNo,'SAIL personnel number'),p.id);if(patch.personnelNo!==undefined){const no=text(patch.personnelNo,'personnel number',true);unique(d.people,'personnelNo',no,p.id);p.personnelNo=no;}if(patch.room!==undefined){const room=text(patch.room,'room');for(const a of d.assets.filter(a=>a.holderId===p.id&&a.location===(p.room||''))){if(a.location!==room){event(a,'updated',p.id,p.id,`Room changed with ${p.name}: ${a.location||'not set'} → ${room||'not set'}`);a.location=room;a.updatedAt=now();}}p.room=room;}for(const k of ['name','designation','section','sailPersonnelNo','address','mobile','officeIntercom','residenceIntercom','officeBsnl','residenceBsnl','email'])if(patch[k]!==undefined)p[k]=text(patch[k],k,k==='name');if(patch.status){if(!['active','retired'].includes(patch.status))fail('Invalid person status.');if(patch.status==='retired'&&d.assets.some(a=>a.holderId===p.id))fail('Complete the asset handover before retirement.');p.status=patch.status;}return;}
 case 'retirePerson': {const p=person(args[0]);if(p.id===user.personId)fail('You cannot retire your own account.');for(const a of d.assets.filter(a=>a.holderId===p.id)){const to=args[1][a.id];if(to===p.id)fail('Select another holder.');assign(a,!to||to==='store'?null:to,undefined,`Handover on retirement of ${p.name}`);}p.status='retired';return;}
 case 'addAsset': {const draft=args[0];const a={id:id('a'),assetNo:text(draft.assetNo,'asset number',true),kind:text(draft.kind,'asset type',true),make:text(draft.make||'','make'),model:text(draft.model||'','model'),serialNo:text(draft.serialNo||'','serial'),holderId:holder(draft.holderId??null),location:text(draft.location|| (draft.holderId?person(draft.holderId).room:'')||'','room'),asr:text(draft.asr||'','ASR'),acType:text(draft.acType||'','AC type'),capacity:text(draft.capacity||'','capacity'),material:text(draft.material||'','material'),notes:text(draft.notes||'','notes'),status:draft.holderId?'in-use':'in-store',updatedAt:now()};unique(d.assets,'assetNo',a.assetNo);d.assets.unshift(a);event(a,'created',null,a.holderId,'Entered in register');return a.id;}
 case 'updateAsset': {const a=asset(args[0]),patch=args[1];if(user.role!=='admin'&&((patch.holderId!==undefined&&patch.holderId!==a.holderId)||(patch.location!==undefined&&patch.location!==a.location)))fail('Submit an asset change request for allocation or room changes.');if(patch.assetNo!==undefined){const no=text(patch.assetNo,'asset number',true);unique(d.assets,'assetNo',no,a.id);a.assetNo=no;}for(const k of ['kind','make','model','serialNo','notes','asr','acType','capacity','material'])if(patch[k]!==undefined)a[k]=text(patch[k],k,k==='kind');if((patch.holderId!==undefined&&patch.holderId!==a.holderId)||(patch.location!==undefined&&patch.location!==a.location))assign(a,patch.holderId===undefined?a.holderId:patch.holderId,patch.location,'Allocation or room edited');else event(a,'updated',a.holderId,a.holderId,'Asset details updated');if(patch.status==='condemned'){event(a,'condemned',a.holderId,null,'Asset condemned');a.holderId=null;a.status='condemned';}a.updatedAt=now();return;}
 case 'transferAsset': {const a=asset(args[0]);return applyAction(d,user,'requestAssetChange',[{assetId:a.id,toHolderId:args[1],room:args[3]||(args[1]?person(args[1]).room:a.location),reason:args[2]||'Asset transfer',requestType:'Transfer'}]);}
 case 'auditAssign': {if(user.role!=='admin')fail('Use an asset change request to amend allocation. Only administrators can reconcile audit allocations.',403);assign(asset(args[0]),args[1],args[2],'Allocation verified during audit',true);return;}
 case 'swapAssets': {if(user.role!=='admin')fail('Submit individual asset change requests for a swap.',403);const a=asset(args[0]),b=asset(args[1]);if(a.id===b.id||a.kind!==b.kind||!isActiveAsset(a)||!isActiveAsset(b))fail('Choose two usable assets of the same type.');const from=a.holderId,to=b.holderId,room=a.location;a.holderId=to;b.holderId=from;a.location=to?person(to).room:b.location;b.location=from?person(from).room:room;a.status=to?'in-use':'unallocated';b.status=from?'in-use':'unallocated';a.updatedAt=b.updatedAt=now();event(a,'swapped',from,to,text(args[2]||'Assets swapped','note'));event(b,'swapped',to,from,text(args[2]||'Assets swapped','note'));return;}
 case 'addItem': {const draft=args[0];const i={id:id('i'),name:text(draft.name,'item name',true),make:text(draft.make||'','make'),category:text(draft.category||'Other','category'),unit:text(draft.unit||'nos','unit',true),minQty:quantity(draft.minQty??1),qty:0,icon:text(draft.icon||'auto','icon')};uniqueItem(i);d.items.unshift(i);if(draft.qty)move(i,quantity(draft.qty),'in','Opening stock');return i.id;}
 case 'updateItem': {
  const i=item(args[0]),patch=args[1],next={...i};
  if(patch.qty!==undefined)fail('Use a stock movement to change balance.');
  for(const key of ['name','make','category','unit'])if(patch[key]!==undefined){
   if(key==='unit'&&patch.unit!==i.unit&&d.moves.some(move=>move.itemId===i.id))fail('Unit cannot change after stock movements. Create a new catalogue item.');
   next[key]=text(patch[key],key,key==='name'||key==='unit');
  }
  if(patch.icon!==undefined)next.icon=text(patch.icon,'icon');
  if(patch.minQty!==undefined)next.minQty=quantity(patch.minQty);
  uniqueItem(next,i.id);Object.assign(i,next);return;
 }
 case 'receiveStock': {move(item(args[0]),quantity(args[1]),'in',text(args[2]||'Stock received','note'));return;}
 case 'adjustStock': {const i=item(args[0]),target=quantity(args[1],true),reason=text(args[2],'adjustment reason',true);if(target<reservedStock(d,i.id))fail('This count is below stock already reserved for approved requests. Cancel those approvals first.');const diff=target-i.qty;if(diff)move(i,Math.abs(diff),diff<0?'out':'in',`Physical count adjustment: ${reason}`);delete i.sampleBalance;return;}
 case 'createSlip': {const draft=args[0];const who=store?person(draft.personId).id:person(user.personId).id;if(!Array.isArray(draft.lines)||!draft.lines.length||draft.lines.length>100)fail('Add at least one item.');const totals=new Map();for(const l of draft.lines){item(l.itemId);const q=quantity(l.qty);totals.set(l.itemId,(totals.get(l.itemId)||0)+q);}const s={id:id('s'),number:`SL-${new Date().getFullYear()}-${String(++d.slipSeq).padStart(4,'0')}`,personId:who,createdAt:now(),status:'open',purpose:text(draft.purpose||'Store request','purpose'),lines:[...totals].map(([itemId,qty])=>({itemId,qty,name:item(itemId).name,make:item(itemId).make,unit:item(itemId).unit}))};d.slips.unshift(s);return s.id;}
 case 'updateSlip': {const s=find(d.slips,args[0],'Request');if(s.personId!==user.personId)fail('You can edit only your own requirement.',403);if(!['open','approved'].includes(s.status))fail('Material has already been issued. This requirement can no longer be edited.');const draft=args[1];if(!Array.isArray(draft.lines)||!draft.lines.length||draft.lines.length>100)fail('Add at least one item.');const totals=new Map();for(const l of draft.lines){item(l.itemId);totals.set(l.itemId,(totals.get(l.itemId)||0)+quantity(l.qty));}s.lines=[...totals].map(([itemId,qty])=>({itemId,qty,name:item(itemId).name,make:item(itemId).make,unit:item(itemId).unit}));s.purpose=text(draft.purpose||'Store request','purpose');s.status='open';delete s.approvedAt;delete s.approvedBy;delete s.approvalNote;s.updatedAt=now();s.edits??=[];s.edits.push({at:now(),by:user.personId});return s.id;}
 case 'approveSlip': {const s=find(d.slips,args[0],'Request');if(s.status!=='open')fail('Only an open request can be approved.');person(s.personId);const rows=args[1]??s.lines.map(l=>({itemId:l.itemId,qty:l.qty}));if(!Array.isArray(rows)||rows.length!==s.lines.length||new Set(rows.map(l=>l.itemId)).size!==s.lines.length)fail('Provide one approved quantity for every requested item.');const approved=s.lines.map(l=>{const row=rows.find(r=>r.itemId===l.itemId);if(!row)fail('Requested item is missing from approval.');const q=quantity(row.qty,true);if(q>l.qty)fail('Approved quantity cannot exceed the request.');if(q>availableStock(d,l.itemId))fail('Not enough unreserved '+item(l.itemId).name+' in stock.');return q;});if(!approved.some(q=>q>0))fail('Approve at least one item, or cancel the request.');s.lines.forEach((l,i)=>l.approvedQty=approved[i]);s.approvalNote=text(args[2]||'','approval note');s.status='approved';s.approvedAt=now();s.approvedBy=user.name;return {ok:true};}
 case 'issueSlip': case 'giveSlip': {const s=find(d.slips,args[0],'Request');if(!['open','approved'].includes(s.status))fail('This request has already been issued or cancelled.');person(s.personId);const rows=args[1]??s.lines.map(l=>({itemId:l.itemId,qty:l.approvedQty??l.qty}));if(!Array.isArray(rows)||rows.length!==s.lines.length||new Set(rows.map(l=>l.itemId)).size!==s.lines.length)fail('Provide one issue quantity for every requested item.');const quantities=s.lines.map(l=>{const row=rows.find(r=>r.itemId===l.itemId);if(!row)fail('Missing issue item.');const q=quantity(row.qty,true);if(q>l.qty)fail('Issue quantity cannot exceed the requirement.');if(q>availableStock(d,l.itemId,s.id))fail('Not enough '+item(l.itemId).name+' available in stock.');return q;});if(!quantities.some(q=>q>0))fail('Choose at least one quantity to issue.');for(let n=0;n<s.lines.length;n++){const l=s.lines[n],q=quantities[n];l.approvedQty=q;l.issuedQty=q;if(q)move(item(l.itemId),q,'out','Issued on '+s.number,s.id);}s.approvalNote=text(args[2]||s.approvalNote||'','issue note');s.status='issued';s.issuedAt=now();s.issuedBy=user.name;return {ok:true};}
 case 'confirmSlip': {const s=find(d.slips,args[0],'Request');if(s.personId!==user.personId)fail('Only the requesting employee can confirm receipt.',403);if(s.status!=='issued')fail('This request is not awaiting receipt.');s.status='closed';s.receivedAt=now();s.receivedBy=user.name;return;}
 case 'reportReceipt': {const s=find(d.slips,args[0],'Request');if(s.personId!==user.personId)fail('Only the recipient can report a problem.',403);if(s.status!=='issued')fail('This request is not awaiting receipt.');s.receiptProblem=text(args[1],'problem description',true);return;}
 case 'cancelSlip': {const s=find(d.slips,args[0],'Request');if(!store&&s.personId!==user.personId)fail('This is not your request.',403);if(!['open','approved'].includes(s.status))fail('Issued material must be returned through a stock movement.');s.status='cancelled';s.reason=text(args[1]||'Cancelled before issue','reason');return {ok:true};}
 case 'updateSettings': {if(args[0].storeInchargeId!==undefined){if(user.role!=='admin')fail('Only the administrator can nominate the store in-charge.',403);const nominated=args[0].storeInchargeId;if(nominated)person(nominated);d.settings.storeInchargeId=nominated;}for(const k of ['officeName','storekeeper'])if(args[0][k]!==undefined)d.settings[k]=text(args[0][k],k,true);return;}
 case 'startAudit': {if(d.audit?.status==='open')fail('An audit is already open.');d.audit={id:id('audit'),status:'open',startedAt:now(),by:user.name,baseline:structuredClone(d.assets.filter(isActiveAsset)),results:{}};return;}
 case 'markAudit': {if(d.audit?.status!=='open')fail('Start an audit first.');if(!isActiveAsset(asset(args[0])))fail('Inactive assets cannot be verified in an active asset audit.');if(!['verified','missing','needs-review'].includes(args[1]))fail('Invalid audit result.');d.audit.results[args[0]]=args[1];return;}
 case 'finishAudit': {if(d.audit?.status!=='open')fail('No open audit.');const unchecked=d.audit.baseline.filter(a=>!d.audit.results[a.id]);if(unchecked.length&&!args[0]?.trim())fail(`${unchecked.length} assets are unchecked. Enter an exception note to finish.`);d.audit.status='closed';d.audit.finishedAt=now();d.audit.note=text(args[0]||'','note');d.audits??=[];d.audits.unshift(structuredClone(d.audit));return;}
 default: fail('Unknown action.');
 }
}
export function catalogueOptions(d) {
 const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const fields={
  makes:[...d.items.map(i=>i.make),...d.assets.map(a=>a.make)],
  categories:['Consumables','Stationery','IT consumable','Electrical','Hardware','Housekeeping','Safety',...d.items.map(i=>i.category)],
  units:['nos','pair','ream','pkt','roll','ltr','mtr','set',...d.items.map(i=>i.unit)],
  assetKinds:['CPU','Monitor','Air conditioner','Sofa','Chair','Table','Cupboard',...d.assets.map(a=>a.kind)],
  asrs:d.assets.map(a=>a.asr),assetIds:d.assets.map(a=>a.assetNo),serials:d.assets.map(a=>a.serialNo),
  rooms:[...d.assets.map(a=>a.location),...d.people.map(p=>p.room)],
  acTypes:['Split','Window','Tower',...d.assets.map(a=>a.acType)],
  capacities:['1','1.5','2','2.5',...d.assets.map(a=>a.capacity)],
  materials:['Wood','Steel',...d.assets.map(a=>a.material)],
  assetRequestTypes:['Transfer','Change of asset','Room change','Return to store'],
  designations:d.people.map(p=>p.designation),sections:d.people.map(p=>p.section),
 };
 return Object.fromEntries(Object.entries(fields).map(([key,values])=>[key,unique([...(d.catalogs?.[key]||[]),...values])]));
}
export function visibleData(d,u) {
 const incharge=u.role==='admin'||d.settings.storeInchargeId===u.personId;
 const assetRequests=d.assetRequests||[];
 d={...d,assetRequests,catalogs:catalogueOptions(d),items:d.items.map(i=>({...i,reservedQty:reservedStock(d,i.id),availableQty:availableStock(d,i.id)}))};
 if(['store','admin'].includes(u.role))return d;
 const assets=d.assets.filter(a=>a.holderId===u.personId),ids=new Set(assets.map(a=>a.id));
 return {...d,people:d.people.filter(p=>p.id===u.personId),
  assetRecipients:d.people.filter(p=>p.status==='active').map(({id,name,personnelNo,room})=>({id,name,personnelNo,room})),
  assets,events:d.events.filter(e=>ids.has(e.assetId)),slips:d.slips.filter(s=>s.personId===u.personId),
  assetRequests:incharge?assetRequests:assetRequests.filter(r=>r.requesterId===u.personId),
  moves:[],audit:null,audits:[]};
}
