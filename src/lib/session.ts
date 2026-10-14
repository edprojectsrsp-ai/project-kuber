import { create } from 'zustand';
export type SessionUser={personId:string;personnelNo:string;name:string;role:'store'|'employee'|'admin';mustChange:boolean};
export const useSession=create<{user:SessionUser|null;setUser:(user:SessionUser|null)=>void}>(set=>({user:null,setUser:user=>set({user})}));
export async function api<T=any>(url:string,body?:unknown):Promise<T>{
 const r=await fetch('/api'+url,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json();if(!r.ok){if(r.status===401)useSession.getState().setUser(null);throw new Error(data.error||'Unable to save.');}return data;
}
