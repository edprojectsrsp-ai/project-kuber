import { useState } from 'react';
import { toast } from 'sonner';
import type { Asset } from '@/lib/store/types';
import { personName, useRegister } from '@/lib/store/use-register';
import { ItemIcon } from './item-icon';
import { Field } from './form-field';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

export function AssetLifecycleDialog({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const register = useRegister();
  const reactivating = asset.status === 'deactivated';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = (register.assetRequests || []).some(request => request.assetId === asset.id && ['requested','pending-approval'].includes(request.status));
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent>
    <DialogHeader>
      <div className="flex items-center gap-3"><ItemIcon name={asset.kind} badge className="size-12"/>
        <DialogTitle>{reactivating ? 'Reactivate' : 'Deactivate'} {asset.assetNo}</DialogTitle></div>
      <DialogDescription>{reactivating
        ? 'Return this asset to the unallocated list. Allocate it through the usual change request and approval process.'
        : 'Remove this asset from active allocation and retain its description, room and full history in the Deactivated tab.'}</DialogDescription>
    </DialogHeader>
    <p className="text-sm">{asset.kind} · {asset.make} {asset.model}</p>
    <p className="text-sm text-muted-foreground">{personName(register.people, asset.holderId)} · Room {asset.location || 'Not recorded'}</p>
    {!reactivating && pending && <p className="text-sm">Pending change requests for this asset will be cancelled.</p>}
    <Field label="Reason"><Textarea aria-label="Asset status reason" required value={reason} onChange={event => setReason(event.target.value)} placeholder={reactivating ? 'Reason for returning this asset to service' : 'Reason for deactivation'}/></Field>
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
      <Button disabled={busy || !reason.trim()} onClick={async () => {
        setBusy(true);
        try {
          if(reactivating)await register.reactivateAsset(asset.id,reason);
          else await register.deactivateAsset(asset.id,reason);
          toast.success(reactivating ? 'Asset reactivated and moved to Unallocated' : 'Asset moved to Deactivated');
          onClose();
        } catch(error) { toast.error((error as Error).message); }
        finally { setBusy(false); }
      }}>{busy ? 'Saving…' : reactivating ? 'Reactivate asset' : 'Deactivate asset'}</Button>
    </DialogFooter>
  </DialogContent></Dialog>;
}
