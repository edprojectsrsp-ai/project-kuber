import { useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/session';
import { useRegister } from '@/lib/store/use-register';
import type { AssetRequest } from '@/lib/store/types';
import { formatDateTime } from '@/lib/format';
import { CatalogSelect } from './catalog-controls';
import { Field } from './form-field';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

export function AssetRequests() {
  const user = useSession(s => s.user)!;
  const register = useRegister();
  const store = user.role !== 'employee';
  const incharge = user.role === 'admin' || register.settings.storeInchargeId === user.personId;
  const requests = register.assetRequests || [];
  const people = register.assetRecipients || register.people.filter(p => p.status === 'active');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRequest | null>(null);
  const [assetId, setAssetId] = useState('');
  const [to, setTo] = useState(user.personId);
  const [room, setRoom] = useState('');
  const [requestType, setRequestType] = useState('Transfer');
  const [remarks, setRemarks] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [review, setReview] = useState<AssetRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const assets = register.assets.filter(a => a.status !== 'condemned');
  const selectedAsset = register.assets.find(a => a.id === (editing?.assetId || assetId));
  const pending = requests.filter(r => ['requested', 'pending-approval'].includes(r.status));

  async function perform(work: () => Promise<unknown>, message: string) {
    setBusy(true);
    try { await work(); toast.success(message); setOpen(false); setReview(null); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }
  function begin(request?: AssetRequest) {
    setEditing(request || null);
    setAssetId(request?.assetId || ''); setTo(request?.toHolderId || (request ? 'store' : user.personId));
    setRoom(request?.room || ''); setRequestType(request?.requestType || 'Transfer');
    setRemarks(request?.storeNote || ''); setReplacementId(request?.replacementId || ''); setOpen(true);
  }
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Asset change requests</h2>
        <p className="text-sm text-muted-foreground">{pending.length} pending · Store prepares changes and the in-charge approves them.</p></div>
      <Button variant="outline" onClick={() => begin()}>Contact store / Request asset change</Button>
    </div>
    {requests.length === 0 && <p className="text-sm text-muted-foreground">No asset change requests.</p>}
    <div className="grid gap-3">
      {requests.map(request => <Card key={request.id}><CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{request.assetLabel} · {request.requestType}</p>
          <span className="text-sm capitalize">{request.status.replaceAll('-', ' ')}</span></div>
        <p className="text-sm">{request.requesterName} → {request.toName} · Room {request.room}</p>
        <p className="text-sm">{request.reason}</p>
        {request.replacementLabel && <p className="text-sm">Replacement {request.replacementLabel}</p>}
        {request.storeNote && <p className="text-sm text-muted-foreground">Store remarks · {request.storeNote}</p>}
        {request.reviewNote && <p className="text-sm text-muted-foreground">Review remarks · {request.reviewNote}</p>}
        <p className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</p>
        <div className="flex flex-wrap gap-2">
          {store && ['requested','pending-approval'].includes(request.status) && <Button size="sm" variant="outline" onClick={() => begin(request)}>Prepare / amend</Button>}
          {incharge && request.status === 'pending-approval' && request.preparedBy !== user.personId && request.requesterId !== user.personId &&
            <Button size="sm" onClick={() => { setReview(request); setReviewNote(''); }}>Review for approval</Button>}
          {(store || request.requesterId === user.personId) && ['requested','pending-approval'].includes(request.status) &&
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => perform(() => register.cancelAssetRequest(request.id), 'Request cancelled')}>Cancel request</Button>}
        </div>
      </CardContent></Card>)}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? 'Prepare asset change' : 'Request asset change'}</DialogTitle>
        <DialogDescription>Specify the asset, recipient and room. The allocation is updated when a separate in-charge approves.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <Field label="Asset"><select aria-label="Asset for change" className="h-10 w-full rounded-lg border bg-background px-3" value={assetId} disabled={!!editing} onChange={event => {
          setAssetId(event.target.value); const asset = assets.find(a => a.id === event.target.value);
          setTo(asset?.holderId || 'store'); setRoom(asset?.location || '');
        }}><option value="">Select asset</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.kind} · {asset.assetNo} · {asset.model}</option>)}</select></Field>
        <Field label="Request type"><CatalogSelect label="Request type" kind="assetRequestTypes" value={requestType} onChange={value => {setRequestType(value);if(value==='Return to store')setTo('store');}} allowCreate={store} disabled={!!editing}/></Field>
        {editing && <p className="text-sm">Employee remarks · {editing.reason}</p>}
        <Field label="Recipient"><select aria-label="Asset recipient" className="h-10 w-full rounded-lg border bg-background px-3" value={to} onChange={event => {setTo(event.target.value);setRoom(people.find(p => p.id === event.target.value)?.room || room);}}>
          <option value="store">Store (unassigned)</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.personnelNo}</option>)}
        </select></Field>
        <Field label="Room no."><CatalogSelect label="Room no." kind="rooms" value={room} onChange={setRoom} allowCreate={store}/></Field>
        {store && requestType === 'Change of asset' && <Field label="Replacement asset"><select aria-label="Replacement asset" className="h-10 w-full rounded-lg border bg-background px-3" value={replacementId} onChange={event => setReplacementId(event.target.value)}>
          <option value="">Select available replacement</option>{assets.filter(a => !a.holderId && a.kind === selectedAsset?.kind && a.id !== selectedAsset?.id).map(a => <option key={a.id} value={a.id}>{a.assetNo} · {a.make} · {a.model}</option>)}
        </select></Field>}
        <Field label={editing ? 'Store remarks' : 'Remarks / reason'}><Textarea aria-label="Asset change remarks" value={remarks} onChange={event => setRemarks(event.target.value)}/></Field>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Close</Button><Button disabled={busy || !assetId || !room || (!editing && !remarks.trim()) || (store && requestType === 'Change of asset' && !replacementId)} onClick={() => perform(async () => {
        if(editing) await register.prepareAssetRequest(editing.id,{toHolderId:to==='store'?null:to,room,storeNote:remarks,replacementId});
        else {const id=await register.requestAssetChange({assetId,toHolderId:to==='store'?null:to,room,requestType,reason:remarks});if(store&&requestType==='Change of asset')await register.prepareAssetRequest(id,{toHolderId:to==='store'?null:to,room,storeNote:'',replacementId});}
      }, editing || store ? 'Submitted for in-charge approval' : 'Request sent to store')}>{editing || store ? 'Submit for approval' : 'Send to store'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!review} onOpenChange={value => !value && setReview(null)}><DialogContent>
      <DialogHeader><DialogTitle>Review asset change</DialogTitle><DialogDescription>{review?.assetLabel} → {review?.toName} · Room {review?.room}</DialogDescription></DialogHeader>
      <p className="text-sm">{review?.reason}</p>{review?.replacementLabel && <p>Replacement {review.replacementLabel}</p>}
      <p className="text-sm">{review?.storeNote}</p>
      <Field label="Review remarks (required for rejection)"><Textarea aria-label="Review remarks" value={reviewNote} onChange={event => setReviewNote(event.target.value)}/></Field>
      <DialogFooter><Button variant="outline" disabled={busy || !reviewNote.trim()} onClick={() => review && perform(() => register.rejectAssetRequest(review.id,reviewNote),'Request rejected')}>Reject</Button>
        <Button disabled={busy} onClick={() => review && perform(() => register.approveAssetRequest(review.id,reviewNote),'Approved and allocation updated')}>Approve and update</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>;
}
