import { AssetRequests } from '@/components/asset-requests';
import { ItemIcon,CatalogSelect } from '@/components/catalog-controls';
import { useSession } from "@/lib/session";
import { MyAssets } from "@/components/employee-home";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, MonitorSmartphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { AuditBoard } from "@/components/audit-board";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
import { AssetStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/format";
import { personName, useRegister } from "@/lib/store/use-register";
import { ASSET_KINDS, type Asset } from "@/lib/store/types";

export const Route = createFileRoute("/assets")({ validateSearch:(s:Record<string,unknown>):{view?:string}=>({view:s.view==="store"?"store":undefined}), component: AssetsPage });

function AssetsPage() {
  const assets = useRegister((s) => s.assets);
  const kinds=useRegister(s=>s.catalogs?.assetKinds||[...ASSET_KINDS]);
  const people = useRegister((s) => s.people);
  const {view}=Route.useSearch();
  useEffect(()=>{setHolder(view==="store"?"store":"all");if(view==="store")setMode("register");},[view]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [holder, setHolder] = useState("all");
  const [mode, setMode] = useState<"audit" | "register">("register");
  const [editing, setEditing] = useState<Asset | null | "new">(null);
  const [transfer, setTransfer] = useState<Asset | null>(null);
  const [swapA, setSwapA] = useState<string>("");
  const [detail, setDetail] = useState<Asset | null>(null);
  const [openSwap, setOpenSwap] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return assets
      .filter((a) => (kind === "all" ? true : a.kind === kind))
      .filter((a) => {
        if (holder === "all") return true;
        if (holder === "store") return !a.holderId && a.status !== "condemned";
        return a.holderId === holder;
      })
      .filter((a) => {
        if (!query) return true;
        const who = personName(people, a.holderId).toLowerCase();
        return `${a.assetNo} ${a.asr || ""} ${a.kind} ${a.make} ${a.model} ${a.acType || ""} ${a.capacity || ""} ${a.material || ""} ${a.notes} ${a.serialNo} ${who} ${a.location}`
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.assetNo.localeCompare(b.assetNo));
  }, [assets, kind, holder, q, people]);

  const user=useSession(s=>s.user)!;
  if(user.role === "employee")return <div className="space-y-6"><MyAssets/><AssetRequests/></div>;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Register"
        title="Assets"
        description="Maintain ASR, description, make, ID, room and allocation for computers, air conditioners and furniture."
        actions={
          <>
            <Button variant="outline" disabled={user.role !== "admin"} onClick={() => setOpenSwap(true)}>
              <ArrowLeftRight className="size-4" />
              Swap two
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add asset
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "audit" | "register")}>
          <TabsList>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="register">All assets</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className={mode === "audit" ? "hidden" : "flex flex-col gap-3 sm:flex-row"}>
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Search number, make, person"
            className="sm:flex-1"
          />
          <select aria-label="Filter asset type" className="h-10 rounded-xl border bg-card px-3 text-sm" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All kinds</option>{kinds.map(k=><option value={k} key={k}>{k}</option>)}</select>
          <Select value={holder} onValueChange={setHolder}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Holder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="store">In store</SelectItem>
              {people
                .filter((p) => p.status === "active")
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode === "audit" ? (
        <AuditBoard />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="No assets match"
          hint="Add assets using their ASR and identification details."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add asset
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Asset no.</th>
                  <th className="px-4 py-3 font-medium">Kind / make</th>
                  <th className="px-4 py-3 font-medium">With</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr key={asset.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-mono font-medium hover:underline"
                        onClick={() => setDetail(asset)}
                      >
                        {asset.assetNo}
                      </button>
                      <p className="text-xs text-muted-foreground">ASR {asset.asr || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ItemIcon name={asset.kind} className="mr-2 inline size-4"/>{asset.kind} · {asset.make} {asset.model}
                    </td>
                    <td className="px-4 py-3">{personName(people, asset.holderId)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{asset.location || "—"}</td>
                    <td className="px-4 py-3">
                      <AssetStatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setTransfer(asset)}>
                          Transfer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(asset)}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {filtered.map((asset) => (
              <li key={asset.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="text-left" onClick={() => setDetail(asset)}>
                        <p className="font-mono font-medium">{asset.assetNo}</p>
                        <p className="text-sm text-muted-foreground">
                          {asset.kind} · {asset.make} {asset.model}
                        </p>
                      </button>
                      <AssetStatusBadge status={asset.status} />
                    </div>
                    <p className="text-sm">
                      {personName(people, asset.holderId)}
                      {asset.location ? ` · ${asset.location}` : ""}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" variant="outline" onClick={() => setTransfer(asset)}>
                        Transfer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(asset)}>
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <AssetRequests/>
      <AssetDialog
        asset={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
      <TransferDialog asset={transfer} onClose={() => setTransfer(null)} />
      <SwapDialog
        open={openSwap}
        initialA={swapA}
        onClose={() => {
          setOpenSwap(false);
          setSwapA("");
        }}
      />
      <AssetDetailDialog
        asset={detail}
        onClose={() => setDetail(null)}
        onTransfer={() => {
          if (detail) setTransfer(detail);
          setDetail(null);
        }}
        onSwap={() => {
          if (detail) setSwapA(detail.id);
          setDetail(null);
          setOpenSwap(true);
        }}
      />
    </div>
  );
}

function AssetDialog({
  asset,
  open,
  onClose,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}) {
  const people = useRegister((s) => s.people);
  const addAsset = useRegister((s) => s.addAsset);
  const updateAsset = useRegister((s) => s.updateAsset);
  const activePeople = people.filter((p) => p.status === "active");
  const [assetNo, setAssetNo] = useState("");
  const [kind, setKind] = useState<string>(ASSET_KINDS[0]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [holderId, setHolderId] = useState("store");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [asr, setAsr] = useState("");
  const [acType, setAcType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [material, setMaterial] = useState("");
  const [busy, setBusy] = useState(false);
  const user = useSession(s=>s.user)!;
  const canAllocate = !asset || user.role === 'admin';
  const isAc = /air.?condition|^ac$/i.test(kind);
  const isFurniture = !/CPU|Monitor|Laptop|Printer|UPS|Scanner|Projector|Network switch/i.test(kind) && !isAc;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={() => {
          setAssetNo(asset?.assetNo ?? "");
          setKind(asset?.kind ?? ASSET_KINDS[0]);
          setMake(asset?.make ?? "");
          setModel(asset?.model ?? "");
          setSerialNo(asset?.serialNo ?? "");
          setHolderId(asset?.holderId ?? "store");
          setLocation(asset?.location ?? "");
          setNotes(asset?.notes ?? "");
          setAsr(asset?.asr ?? "");
          setAcType(asset?.acType ?? "");
          setCapacity(asset?.capacity ?? "");
          setMaterial(asset?.material ?? "");
        }}
      >
        <DialogHeader>
          <DialogTitle>{asset ? "Edit asset" : "Add asset"}</DialogTitle>
          <DialogDescription>
            Enter the asset identification and room. Use an asset change request for transfers and room changes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ASR"><CatalogSelect label="ASR" kind="asrs" value={asr} onChange={setAsr}/></Field>
          <Field label="ID"><CatalogSelect label="Asset ID" kind="assetIds" value={assetNo} onChange={setAssetNo}/></Field>
          <Field label="Kind">
            <CatalogSelect label="Asset type" kind="assetKinds" value={kind} onChange={setKind}/>
          </Field>
          <Field label="Make" htmlFor="as-make">
            <CatalogSelect label="Make" kind="makes" value={make} onChange={setMake}/>
          </Field>
          <Field label="Description / name" htmlFor="as-model">
            <Input id="as-model" value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          <Field label="Serial no."><CatalogSelect label="Serial no." kind="serials" value={serialNo} onChange={setSerialNo}/></Field>
          {isAc && <>
            <Field label="Air conditioner type"><CatalogSelect label="AC type" kind="acTypes" value={acType} onChange={setAcType}/></Field>
            <Field label="Capacity (tonnes)"><CatalogSelect label="Capacity" kind="capacities" value={capacity} onChange={setCapacity}/></Field>
          </>}
          {isFurniture && <Field label="Material"><CatalogSelect label="Material" kind="materials" value={material} onChange={setMaterial}/></Field>}
          <Field label="With">
            <Select disabled={!canAllocate} value={holderId} onValueChange={v=>{setHolderId(v);if(v!=="store")setLocation(people.find(p=>p.id===v)?.room||"");}}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="store">Store (unassigned)</SelectItem>
                {activePeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Room no." className="sm:col-span-2">
            <CatalogSelect label="Room no." kind="rooms" disabled={!canAllocate} value={location} onChange={setLocation}/>
          </Field>
          <Field label="Remarks" htmlFor="as-notes" className="sm:col-span-2">
            <Textarea id="as-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (!assetNo.trim()) {
                toast.error("Asset number is required");
                return;
              }
              if (!kind || !asr || !make || !model.trim() || !location || (isAc && (!acType || !capacity)) || (isFurniture && !material)) {
                toast.error("Complete ASR, type, description, make, room and the relevant specifications.");return;
              }
              setBusy(true);
              try {
              const holder = holderId === "store" ? null : holderId;
              const status = holder ? "in-use" : "in-store";
              if (asset) {
                await updateAsset(asset.id, {
                  assetNo: assetNo.trim(),
                  kind,
                  asr, acType: isAc ? acType : '', capacity: isAc ? capacity : '', material: isFurniture ? material : '',
                  make: make.trim(),
                  model: model.trim(),
                  serialNo: serialNo.trim(),
                  holderId: holder,
                  location: location.trim(),
                  notes: notes.trim(),
                  status,
                });
                toast.success("Asset updated");
              } else {
                await addAsset({
                  assetNo: assetNo.trim(),
                  kind,
                  asr, acType: isAc ? acType : '', capacity: isAc ? capacity : '', material: isFurniture ? material : '',
                  make: make.trim(),
                  model: model.trim(),
                  serialNo: serialNo.trim(),
                  holderId: holder,
                  location: location.trim(),
                  notes: notes.trim(),
                  status,
                });
                toast.success("Asset added");
              }
              onClose();
              } catch(error) { toast.error((error as Error).message); } finally { setBusy(false); }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const allPeople = useRegister((s) => s.people);
  const people = allPeople.filter((p) => p.status === "active");
  const transferAsset = useRegister((s) => s.transferAsset);
  const [to, setTo] = useState("store");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={Boolean(asset)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setTo(asset?.holderId ?? "store");
          setNote("");
          setLocation(asset?.location ?? "");
        }}
      >
        <DialogHeader>
          <DialogTitle>Transfer {asset?.assetNo}</DialogTitle>
          <DialogDescription>
            Propose a transfer or return to store. Allocation changes take effect after in-charge approval.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Now with">
            <p className="text-sm">{asset ? personName(allPeople, asset.holderId) : ""}</p>
          </Field>
          <Field label="Move to">
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="store">Store</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Room no."><CatalogSelect label="Room no." kind="rooms" value={location} onChange={setLocation}/></Field>
          <Field label="Note" htmlFor="tr-note">
            <Input
              id="tr-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Retirement, new issue, cabin shift…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy}
            onClick={async () => {
              if (!asset) return;
              if (!location.trim()) { toast.error("Select a room number."); return; }
              setBusy(true);
              try {
                const next = to === "store" ? null : to;
                await transferAsset(asset.id, next, note.trim(), location.trim());
                toast.success(`${asset.assetNo} submitted for in-charge approval`);
                onClose();
              } catch(error) { toast.error((error as Error).message); } finally { setBusy(false); }
            }}
          >
            Submit for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SwapDialog({
  open,
  initialA,
  onClose,
}: {
  open: boolean;
  initialA: string;
  onClose: () => void;
}) {
  const assets = useRegister((s) => s.assets);
  const people = useRegister((s) => s.people);
  const swapAssets = useRegister((s) => s.swapAssets);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [note, setNote] = useState("Holders swapped");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setA(initialA || assets[0]?.id || "");
          setB(assets[1]?.id || "");
          setNote("Holders swapped");
        }}
      >
        <DialogHeader>
          <DialogTitle>Swap two machines</DialogTitle>
          <DialogDescription>
            Each person keeps their seat; only the asset numbers move. Typical at quarterly review.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="First asset">
            <Select value={a} onValueChange={setA}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.assetNo} · {personName(people, x.holderId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Second asset">
            <Select value={b} onValueChange={setB}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.assetNo} · {personName(people, x.holderId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Note" htmlFor="sw-note">
            <Input id="sw-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!a || !b || a === b) {
                toast.error("Pick two different assets");
                return;
              }
              await swapAssets(a, b, note.trim());
              toast.success("Holders swapped");
              onClose();
            }}
          >
            Swap holders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetDetailDialog({
  asset,
  onClose,
  onTransfer,
  onSwap,
}: {
  asset: Asset | null;
  onClose: () => void;
  onTransfer: () => void;
  onSwap: () => void;
}) {
  const people = useRegister((s) => s.people);
  const events = useRegister((s) => s.events);
  const history = asset ? events.filter((e) => e.assetId === asset.id) : [];

  return (
    <Dialog open={Boolean(asset)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {asset ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono">{asset.assetNo}</DialogTitle>
              <DialogDescription>
                {asset.kind} · {asset.make} {asset.model}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 text-sm">
              <p><span className="text-muted-foreground">ASR</span> {asset.asr || "—"}</p>
              {asset.acType && <p>AC type {asset.acType} · {asset.capacity} tonnes</p>}
              {asset.material && <p>Material {asset.material}</p>}
              <p>
                <span className="text-muted-foreground">Serial</span> {asset.serialNo || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">With</span> {personName(people, asset.holderId)}
              </p>
              <p>
                <span className="text-muted-foreground">Location</span> {asset.location || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Updated</span> {formatDate(asset.updatedAt)}
              </p>
              {asset.notes ? <p className="text-muted-foreground">{asset.notes}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onTransfer}>
                Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={onSwap}>
                Swap
              </Button>
            </div>
            <div>
              <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">History</p>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No moves recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((ev) => (
                    <li key={ev.id} className="text-sm">
                      <Badge variant="outline" className="mr-2 normal-case">
                        {ev.type}
                      </Badge>
                      {personName(people, ev.fromHolderId)} → {personName(people, ev.toHolderId)}
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTime(ev.at)}
                        {ev.note ? ` · ${ev.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
