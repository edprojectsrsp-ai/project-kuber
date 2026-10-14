import { useState } from 'react';
import { create } from 'zustand';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
type Request={title:string;initial:string;secret:boolean;resolve:(value:string|null)=>void};
const usePrompt=create<{request:Request|null;set:(request:Request|null)=>void}>(set=>({request:null,set:request=>set({request})}));
export function askText(title:string,initial='',secret=false):Promise<string|null>{return new Promise(resolve=>usePrompt.getState().set({title,initial,secret,resolve}));}
function PromptForm({request,finish}:{request:Request;finish:(v:string|null)=>void}){const [value,setValue]=useState(request.initial);return <form onSubmit={e=>{e.preventDefault();finish(value);}} className="space-y-4"><DialogHeader><DialogTitle>{request.title}</DialogTitle><DialogDescription>{request.secret?'The employee can change this password later from their profile.':'This will be recorded with the change.'}</DialogDescription></DialogHeader><Input aria-label={request.title} type={request.secret?'password':'text'} autoComplete={request.secret?'new-password':'off'} value={value} onChange={e=>setValue(e.target.value)} autoFocus/><DialogFooter><Button type="button" variant="outline" onClick={()=>finish(null)}>Cancel</Button><Button type="submit">Continue</Button></DialogFooter></form>;}
export function PromptHost(){const request=usePrompt(s=>s.request);const finish=(v:string|null)=>{request?.resolve(v);usePrompt.getState().set(null);};return <Dialog open={!!request} onOpenChange={v=>{if(!v)finish(null);}}>{request&&<DialogContent><PromptForm key={request.title} request={request} finish={finish}/></DialogContent>}</Dialog>;}
