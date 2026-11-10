import { create } from 'zustand';
import { api } from '@/lib/session';
import type { Person,Asset,InventoryItem,RegisterData,Settings,SlipLine } from './types';
type PersonDraft=Omit<Person,'id'>;type AssetDraft=Omit<Asset,'id'|'updatedAt'>;type ItemDraft=Omit<InventoryItem,'id'>;
export type IssueResult={ok:true}|{ok:false;message:string};
interface RegisterState extends RegisterData {
 revision:number;syncError:string|null;
 deactivateAsset:(id:string,reason:string)=>Promise<void>;reactivateAsset:(id:string,reason:string)=>Promise<void>;
 requestAssetChange:(draft:{assetId:string;toHolderId:string|null;room:string;requestType:string;reason:string})=>Promise<string>;
 prepareAssetRequest:(id:string,draft:{toHolderId:string|null;room:string;storeNote:string;replacementId?:string})=>Promise<void>;
 approveAssetRequest:(id:string,note:string)=>Promise<void>;rejectAssetRequest:(id:string,note:string)=>Promise<void>;cancelAssetRequest:(id:string)=>Promise<void>;
 addPerson:(draft:PersonDraft)=>Promise<string>;updatePerson:(id:string,patch:Partial<PersonDraft>)=>Promise<void>;
 retirePerson:(id:string,targets:Record<string,string>)=>Promise<void>;
 addAsset:(draft:AssetDraft)=>Promise<string>;updateAsset:(id:string,patch:Partial<AssetDraft>)=>Promise<void>;
 transferAsset:(id:string,to:string|null,note:string,storeLocation?:string)=>Promise<void>;auditAssign:(id:string,to:string|null,room:string)=>Promise<void>;swapAssets:(a:string,b:string,note:string)=>Promise<void>;
 addItem:(draft:ItemDraft)=>Promise<string>;updateItem:(id:string,patch:Partial<ItemDraft>)=>Promise<void>;receiveStock:(id:string,qty:number,note:string)=>Promise<void>;adjustStock:(id:string,qty:number,note:string)=>Promise<void>;
 createSlip:(input:{personId:string;purpose:string;lines:SlipLine[]})=>Promise<string>;
 updateSlip:(id:string,input:{purpose:string;lines:SlipLine[]})=>Promise<string>;
 addCatalogOption:(kind:string,value:string)=>Promise<string>;updateRoom:(id:string,room:string)=>Promise<void>;
 approveSlip:(id:string,lines?:SlipLine[],note?:string)=>Promise<IssueResult>;issueSlip:(id:string,lines?:SlipLine[],note?:string)=>Promise<IssueResult>;giveSlip:(id:string)=>Promise<IssueResult>;confirmSlip:(id:string)=>Promise<void>;cancelSlip:(id:string)=>Promise<IssueResult>;reportReceipt:(id:string,note:string)=>Promise<void>;
 updateSettings:(patch:Partial<Settings>)=>Promise<void>;startAudit:()=>Promise<void>;markAudit:(id:string,result:string)=>Promise<void>;finishAudit:(note:string)=>Promise<void>;
}
const empty:RegisterData={people:[],assets:[],events:[],items:[],moves:[],slips:[],settings:{officeName:'Projects Department',storekeeper:'Storekeeper'},slipSeq:0,audit:null,audits:[]};
let queue:Promise<unknown>=Promise.resolve();let mutating=false;
async function perform(action:string,args:unknown[]){
 mutating=true;
 try{
  const initialPassword=undefined;
  const r=await api('/action',{action,args,revision:useRegister.getState().revision,initialPassword});
  useRegister.setState({...r.data,revision:r.revision,syncError:null});return r.result;
 }catch(e){await refreshRegister(true).catch(()=>{});throw e;}finally{mutating=false;}
}
function mutate(action:string,args:unknown[]):Promise<any>{const next=queue.then(()=>perform(action,args));queue=next.catch(()=>{});return next;}
export const useRegister=create<RegisterState>(()=>({
 ...empty,revision:0,syncError:null,
 deactivateAsset:(...args)=>mutate('deactivateAsset',args),reactivateAsset:(...args)=>mutate('reactivateAsset',args),
 requestAssetChange:(...args)=>mutate('requestAssetChange',args),prepareAssetRequest:(...args)=>mutate('prepareAssetRequest',args),
 approveAssetRequest:(...args)=>mutate('approveAssetRequest',args),rejectAssetRequest:(...args)=>mutate('rejectAssetRequest',args),cancelAssetRequest:(...args)=>mutate('cancelAssetRequest',args),
 addPerson:(...args)=>mutate('addPerson',args),updatePerson:(...args)=>mutate('updatePerson',args),retirePerson:(...args)=>mutate('retirePerson',args),
 addAsset:(...args)=>mutate('addAsset',args),updateAsset:(...args)=>mutate('updateAsset',args),transferAsset:(...args)=>mutate('transferAsset',args),auditAssign:(...args)=>mutate('auditAssign',args),swapAssets:(...args)=>mutate('swapAssets',args),
 addItem:(...args)=>mutate('addItem',args),updateItem:(...args)=>mutate('updateItem',args),receiveStock:(...args)=>mutate('receiveStock',args),adjustStock:(...args)=>mutate('adjustStock',args),
 updateSlip:(...args)=>mutate('updateSlip',args),addCatalogOption:(...args)=>mutate('addCatalogOption',args),updateRoom:(...args)=>mutate('updateRoom',args),
 createSlip:(...args)=>mutate('createSlip',args),approveSlip:(...args)=>mutate('approveSlip',args),issueSlip:(...args)=>mutate('issueSlip',args),giveSlip:(...args)=>mutate('issueSlip',args),confirmSlip:(...args)=>mutate('confirmSlip',args),cancelSlip:(...args)=>mutate('cancelSlip',args),reportReceipt:(...args)=>mutate('reportReceipt',args),
 updateSettings:(...args)=>mutate('updateSettings',args),startAudit:(...args)=>mutate('startAudit',args),markAudit:(...args)=>mutate('markAudit',args),finishAudit:(...args)=>mutate('finishAudit',args),
}));
export async function refreshRegister(force=false){if(mutating&&!force)return;try{const r=await api('/register');if(r.revision>=useRegister.getState().revision||force)useRegister.setState({...r.data,revision:r.revision,syncError:null});}catch(e){useRegister.setState({syncError:(e as Error).message});throw e;}}
export function personName(people:Person[],id:string|null){if(!id)return 'Unallocated';return people.find(p=>p.id===id)?.name??'Unknown';}
export function personLabel(people:Person[],id:string|null){if(!id)return 'Unallocated';const p=people.find(p=>p.id===id);return p?`${p.name} · ${p.personnelNo}`:'Unknown';}
