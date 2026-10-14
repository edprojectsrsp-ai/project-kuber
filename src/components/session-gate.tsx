import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { api,useSession } from '@/lib/session';
import { refreshRegister } from '@/lib/store/use-register';
import { LedgerMark } from './mark';
import { LoginPortrait } from './login-portrait';
import { Button } from './ui/button';
import { Input } from './ui/input';
type Portal='store'|'employee'|'admin';
const names={store:'Storekeeper',employee:'User',admin:'Administrator'};
export function SessionGate({children}:{children:ReactNode}){
 const user=useSession(s=>s.user),setUser=useSession(s=>s.setUser);
 const [portal,setPortal]=useState<Portal|null>(null),[checking,setChecking]=useState(true),[ready,setReady]=useState(false),[no,setNo]=useState(''),[password,setPassword]=useState(''),[recovering,setRecovering]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{api('/me').then(r=>setUser(r.user)).catch(()=>{}).finally(()=>setChecking(false));},[setUser]);
 useEffect(()=>{setReady(false);if(!user)return;let active=true;const load=()=>refreshRegister().then(()=>{if(active){setReady(true);setError('');}}).catch(e=>{if(active)setError(e.message);});void load();const t=setInterval(load,4000);return()=>{active=false;clearInterval(t);};},[user?.personId]);
 const select=(choice:Portal|null)=>{setPortal(choice);setNo('');setPassword('');setError('');setRecovering(false);setSent(false);};
 if(checking)return <div className="grid min-h-dvh place-items-center text-muted-foreground">Opening Store Ledger…</div>;
 if(user&&ready)return <>{children}</>;
 if(user)return <div className="grid min-h-dvh place-items-center"><div className="text-center"><p>{error||'Loading shared register…'}</p>{error&&<Button onClick={()=>refreshRegister().then(()=>setReady(true))}>Retry</Button>}</div></div>;
 if(!user&&!portal)return <div className="grid min-h-dvh place-items-center px-5 py-12"><section className="page-rise w-full max-w-xl text-center"><LedgerMark className="mx-auto mb-5 size-14"/><h1 className="text-3xl font-semibold sm:text-4xl">Welcome to Store Ledger</h1><p className="mt-3 text-sm text-muted-foreground">Choose how you want to sign in.</p><div className="mt-9 grid grid-cols-2 gap-4 sm:gap-5">{(['store','employee'] as const).map(kind=><button key={kind} type="button" onClick={()=>select(kind)} className="group rounded-3xl border border-border/70 bg-card px-4 py-7 shadow-[var(--shadow-border)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-border-hover)] active:scale-[0.98] sm:py-9"><LoginPortrait kind={kind} className="mx-auto mb-5 size-24 sm:size-28"/><span className="block text-lg font-semibold sm:text-xl">{names[kind]}</span><span className="mt-2 block text-xs text-muted-foreground sm:text-sm">{kind==='store'?'Manage stock and materials':'Request and receive materials'}</span><span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">Sign in <ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></span></button>)}</div><button type="button" onClick={()=>select('admin')} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ShieldCheck className="size-4"/>Administrator sign-in</button><p className="mt-6 text-xs text-muted-foreground">Projects Department · One shared register</p></section></div>;
 const kind=portal||'employee';
 return <div className="grid min-h-dvh place-items-center p-5"><div className="page-rise w-full max-w-sm">{!user&&<button type="button" onClick={()=>select(null)} className="mb-4 inline-flex min-h-11 items-center gap-2 px-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/>Choose another role</button>}<form className="space-y-5 rounded-3xl bg-card p-7 shadow-[var(--shadow-border)] sm:p-8" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{if(recovering){await api('/password-help',{personnelNo:no,portal});setSent(true);}else{const r=await api('/login',{personnelNo:no,password,portal});setUser(r.user);}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <div className="text-center"><LoginPortrait kind={kind} className="mx-auto mb-4 size-20"/><h1 className="text-2xl font-semibold">{recovering?'Forgot password':`${names[kind]} login`}</h1><p className="mt-2 text-sm text-muted-foreground">{recovering?'Request help from your administrator.':'Welcome back to Store Ledger.'}</p></div>
 {!user&&<label className="block space-y-2 text-sm font-medium">Username<Input autoComplete="username" placeholder={kind==='admin'?'Administrator username':'Personnel number'} value={no} onChange={e=>setNo(e.target.value)} required autoFocus/></label>}
 {!recovering&&<label className="block space-y-2 text-sm font-medium">Password<Input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>}

 {sent&&<p role="status" className="rounded-xl bg-ok-soft p-3 text-sm text-ok">If your account exists, the administrator can now see your reset request. Contact them to receive a temporary password.</p>}
 {recovering&&kind==='admin'&&<p className="text-xs text-muted-foreground">If you cannot access the administrator account, contact the person maintaining this server.</p>}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} className="w-full">{busy?'Please wait…':recovering?'Request password reset':'Sign in'}</Button>
 {!user&&<p className="text-center text-xs leading-relaxed text-muted-foreground">Demo username: {kind==='admin'?'admin':kind==='store'?'103900':'104821'}<br/>Initial password: Kuber@2026</p>}
 <button type="button" onClick={()=>{setRecovering(!recovering);setSent(false);setError('');}} className="block w-full min-h-11 text-center text-sm text-primary">{recovering?'Back to sign in':'Forgot password?'}</button>
 </form></div></div>;
}
