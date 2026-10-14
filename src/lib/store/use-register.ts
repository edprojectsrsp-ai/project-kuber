import { askText } from "@/components/text-prompt";
import { create } from 'zustand';
import { api } from '@/lib/session';
import type { Person,Asset,InventoryItem,RegisterData,Settings,SlipLine } from './types';
type PersonDraft=Omit<Person,'id'>;type AssetDraft=Omit<Asset,'id'|'updatedAt'>;type ItemDraft=Omit<InventoryItem,'id'>;
export type IssueResult={ok:true}|{ok:false;message:string};
interface RegisterState extends RegisterData {
 revision:number;syncError:string|null;
 addPerson:(draft:PersonDraft)=>Promise<string>;updatePerson:(id:string,patch:Partial<PersonDraft>)=>Promise<void>;
 retirePerson:(id:string,targets:Record<string,string>)=>Promise<void>;
 addAsset:(draft:AssetDraft)=>Promise<string>;updateAsset:(id:string,patch:Partial<AssetDraft>)=>Promise<void>;
 transferAsset:(id:string,to:string|null,note:string)=>Promise<void>;auditAssign:(id:string,to:string|null,room:string)=>Promise<void>;swapAssets:(a:string,b:string,note:string)=>Promise<void>;
 addItem:(draft:ItemDraft)=>Promise<string>;updateItem:(id:string,patch:Partial<ItemDraft>)=>Promise<void>;receiveStock:(id:string,qty:number,note:string)=>Promise<void>;adjustStock:(id:string,qty:number,note:string)=>Promise<void>;
 createSlip:(input:{personId:string;purpose:string;lines:SlipLine[]})=>Promise<string>;
 approveSlip:(id:string)=>Promise<IssueResult>;issueSlip:(id:string)=>Promise<IssueResult>;giveSlip:(id:string)=>Promise<IssueResult>;confirmSlip:(id:string)=>Promise<void>;cancelSlip:(id:string)=>Promise<IssueResult>;reportReceipt:(id:string,note:string)=>Promise<void>;
 updateSettings:(patch:Partial<Settings>)=>Promise<void>;startAudit:()=>Promise<void>;markAudit:(id:string,result:string)=>Promise<void>;finishAudit:(note:string)=>Promise<void>;
}
const empty:RegisterData={people:[],assets:[],events:[],items:[],moves:[],slips:[],settings:{officeName:'Projects Department',storekeeper:'Storekeeper'},slipSeq:0,audit:null,audits:[]};
let queue:Promise<unknown>=Promise.resolve();let mutating=false;
async function perform(action:string,args:unknown[]){
 mutating=true;
 try{
  const initialPassword=action==='addPerson'?await askText('Temporary password for the new employee (at least 10 characters):','',true):undefined;
  if(action==='addPerson'&&!initialPassword)throw new Error('Employee creation cancelled.');
  const r=await api('/action',{action,args,revision:useRegister.getState().revision,initialPassword});
  useRegister.setState({...r.data,revision:r.revision,syncError:null});return r.result;
 }catch(e){await refreshRegister(true).catch(()=>{});throw e;}finally{mutating=false;}
}
function mutate(action:string,args:unknown[]):Promise<any>{const next=queue.then(()=>perform(action,args));queue=next.catch(()=>{});return next;}
export const useRegister=create<RegisterState>(()=>({
 ...empty,revision:0,syncError:null,
 addPerson:(...args)=>mutate('addPerson',args),updatePerson:(...args)=>mutate('updatePerson',args),retirePerson:(...args)=>mutate('retirePerson',args),
 addAsset:(...args)=>mutate('addAsset',args),updateAsset:(...args)=>mutate('updateAsset',args),transferAsset:(...args)=>mutate('transferAsset',args),auditAssign:(...args)=>mutate('auditAssign',args),swapAssets:(...args)=>mutate('swapAssets',args),
 addItem:(...args)=>mutate('addItem',args),updateItem:(...args)=>mutate('updateItem',args),receiveStock:(...args)=>mutate('receiveStock',args),adjustStock:(...args)=>mutate('adjustStock',args),
 createSlip:(...args)=>mutate('createSlip',args),approveSlip:(...args)=>mutate('approveSlip',args),issueSlip:(...args)=>mutate('issueSlip',args),giveSlip:(...args)=>mutate('issueSlip',args),confirmSlip:(...args)=>mutate('confirmSlip',args),cancelSlip:(...args)=>mutate('cancelSlip',args),reportReceipt:(...args)=>mutate('reportReceipt',args),
 updateSettings:(...args)=>mutate('updateSettings',args),startAudit:(...args)=>mutate('startAudit',args),markAudit:(...args)=>mutate('markAudit',args),finishAudit:(...args)=>mutate('finishAudit',args),
}));
export async function refreshRegister(force=false){if(mutating&&!force)return;try{const r=await api('/register');if(r.revision>=useRegister.getState().revision||force)useRegister.setState({...r.data,revision:r.revision,syncError:null});}catch(e){useRegister.setState({syncError:(e as Error).message});throw e;}}
export function personName(people:Person[],id:string|null){if(!id)return 'Unallocated';return people.find(p=>p.id===id)?.name??'Unknown';}
export function personLabel(people:Person[],id:string|null){if(!id)return 'Unallocated';const p=people.find(p=>p.id===id);return p?`${p.name} · ${p.personnelNo}`:'Unknown';}
