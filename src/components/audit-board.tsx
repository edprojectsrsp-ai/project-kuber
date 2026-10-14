import { askText } from "@/components/text-prompt";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/form-field";
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
import { personLabel, useRegister } from "@/lib/store/use-register";
import type { Asset } from "@/lib/store/types";

const AUDIT_KINDS = ["CPU", "Monitor", "Printer"] as const;

function heldOf(assets: Asset[], personId: string, kind: string) {
  return assets.find((a) => a.holderId === personId && a.kind === kind && a.status !== "condemned");
}

export function AuditBoard() {
  const assets = useRegister((s) => s.assets);
  const people = useRegister((s) => s.people);
  const audit=useRegister(s=>s.audit);
  const startAudit=useRegister(s=>s.startAudit);
  const finishAudit=useRegister(s=>s.finishAudit);
  const markAudit=useRegister(s=>s.markAudit);
  const [slot, setSlot] = useState<{ personId: string; kind: string } | null>(null);
  const [loose, setLoose] = useState<Asset | null>(null);

  const active = useMemo(
    () =>
      people
        .filter((p) => p.status === "active" && p.id !== "p_admin")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  );

  const spare = assets
    .filter((a) => !a.holderId && a.status !== "condemned" && AUDIT_KINDS.includes(a.kind as (typeof AUDIT_KINDS)[number]))
    .slice()
    .sort((a, b) => a.assetNo.localeCompare(b.assetNo));

  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{audit?.status === "open" ? "Audit in progress" : "Physical asset audit"}</p><p className="text-xs text-muted-foreground">{audit?.status === "open" ? `${Object.keys(audit.results).length} / ${audit.baseline.length} recorded` : "Keep a dated record of verified machines and discrepancies."}</p></div>{audit?.status === "open" ? <Button variant="outline" onClick={async()=>{const note=await askText("Exception note (required if any assets remain unchecked):", "");if(note!==null){await finishAudit(note);toast.success("Audit finished");}}}>Finish audit</Button> : <Button onClick={async()=>{await startAudit();toast.success("Audit started");}}>Start audit</Button>}</CardContent></Card>
      {audit?.status === "open" && <div className="rounded-xl border border-border bg-card p-4"><p className="mb-3 text-sm font-medium">Verify physical presence</p><div className="max-h-64 space-y-2 overflow-auto">{audit.baseline.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{a.assetNo} · {a.kind} <span className="text-muted-foreground">{audit.results[a.id] || "Unchecked"}</span></span><span className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>markAudit(a.id,"verified")}>Verified</Button><Button size="sm" variant="ghost" onClick={()=>markAudit(a.id,"missing")}>Missing</Button></span></div>)}</div></div>}
      <p className="max-w-2xl text-sm text-muted-foreground">
        One CPU, one monitor and one printer per person. Change a slot and the previous person
        goes blank for that machine. If the new person already has one, their old one becomes
        unallocated and needs its location verified.
      </p>

      <ul className="space-y-3">
        {active.map((person) => (
          <li key={person.id}>
            <Card>
              <CardContent className="grid gap-3 p-4">
                <div>
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {person.personnelNo || "No personnel no."} · {person.designation}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {AUDIT_KINDS.map((kind) => {
                    const asset = heldOf(assets, person.id, kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setSlot({ personId: person.id, kind })}
                        className="rounded-xl bg-muted px-3 py-3 text-left transition-colors hover:bg-accent"
                      >
                        <p className="text-xs font-medium text-muted-foreground">{kind}</p>
                        {asset ? (
                          <>
                            <p className="mt-1 font-medium">{asset.assetNo}</p>
                            <p className="text-sm text-muted-foreground">
                              {asset.make} · Room {asset.location}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">Unallocated</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {spare.length > 0 ? (
        <Card>
          <CardContent className="grid gap-3 p-4">
            <p className="font-medium">Unallocated</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {spare.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => setLoose(asset)}
                    className="w-full rounded-xl bg-muted px-3 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <p className="font-medium">
                      {asset.assetNo} · {asset.kind}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {asset.make} · Room {asset.location}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <SlotDialog slot={slot} onClose={() => setSlot(null)} />
      <LooseDialog asset={loose} onClose={() => setLoose(null)} />
    </div>
  );
}

function consequences(assets: Asset[], asset: Asset, toHolderId: string | null, people: { id: string; name: string }[]) {
  const lines: string[] = [];
  const name = (id: string | null) => people.find((p) => p.id === id)?.name ?? "Unallocated";
  if (asset.holderId !== toHolderId) {
    if (asset.holderId) {
      lines.push(`${name(asset.holderId)} will no longer have ${asset.assetNo}. That ${asset.kind.toLowerCase()} shows blank.`);
    }
    if (toHolderId) {
      lines.push(`${asset.assetNo} will show on ${name(toHolderId)}.`);
      const displaced = assets.find(
        (a) => a.id !== asset.id && a.kind === asset.kind && a.holderId === toHolderId && a.status !== "condemned",
      );
      if (displaced) {
        lines.push(`${name(toHolderId)}’s current ${displaced.assetNo} will become unallocated.`);
      }
    } else {
      lines.push(`${asset.assetNo} will be unallocated. The number stays in the register with no person.`);
    }
  } else {
    lines.push("Same person. Only the room number changes.");
  }
  return lines;
}

function SlotDialog({
  slot,
  onClose,
}: {
  slot: { personId: string; kind: string } | null;
  onClose: () => void;
}) {
  const assets = useRegister((s) => s.assets);
  const people = useRegister((s) => s.people);
  const auditAssign = useRegister((s) => s.auditAssign);
  const [choice, setChoice] = useState("keep");
  const [room, setRoom] = useState("");

  const person = people.find((p) => p.id === slot?.personId);
  const current = slot ? heldOf(assets, slot.personId, slot.kind) : undefined;
  const options = assets
    .filter((a) => slot && a.kind === slot.kind && a.status !== "condemned")
    .slice()
    .sort((a, b) => a.assetNo.localeCompare(b.assetNo));

  const selected =
    choice === "clear" ? current : choice === "keep" ? current : options.find((a) => a.id === choice);
  const preview =
    selected && person
      ? consequences(assets, selected, choice === "clear" ? null : person.id, people)
      : [];

  return (
    <Dialog open={Boolean(slot)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setChoice(current ? "keep" : options[0]?.id ?? "clear");
          setRoom(current?.location ?? "");
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {person?.name} · {slot?.kind}
          </DialogTitle>
          <DialogDescription>
            {person?.personnelNo ? `Personnel no. ${person.personnelNo}. ` : ""}
            Pick the machine that should sit with this person, or leave the slot blank.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Machine" htmlFor="au-asset">
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger id="au-asset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {current ? <SelectItem value="keep">Keep {current.assetNo}</SelectItem> : null}
                {current ? <SelectItem value="clear">Unallocated — leave blank</SelectItem> : null}
                {options
                  .filter((a) => a.id !== current?.id)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.assetNo} · {a.make}
                      {a.holderId ? ` · now ${personLabel(people, a.holderId)}` : " · unallocated"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Room number" htmlFor="au-room">
            <Input
              id="au-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="EE cabin"
            />
          </Field>
          {preview.length > 0 ? (
            <ul className="space-y-1 rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
              {preview.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!person) return;
              if (choice === "clear") {
                if (!current) return;
                await auditAssign(current.id, null, room);
              } else {
                const asset = choice === "keep" ? current : options.find((a) => a.id === choice);
                if (!asset) {
                  toast.error("Choose a machine");
                  return;
                }
                await auditAssign(asset.id, person.id, room);
              }
              toast.success("Audit saved");
              onClose();
            }}
          >
            Save audit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LooseDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const people = useRegister((s) => s.people);
  const assets = useRegister((s) => s.assets);
  const auditAssign = useRegister((s) => s.auditAssign);
  const active = people.filter((p) => p.status === "active");
  const [personId, setPersonId] = useState("");
  const [room, setRoom] = useState("");

  const preview =
    asset && personId ? consequences(assets, asset, personId, people) : [];

  return (
    <Dialog open={Boolean(asset)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setPersonId(active[0]?.id ?? "");
          setRoom(asset?.location ?? "");
        }}
      >
        <DialogHeader>
          <DialogTitle>Allocate {asset?.assetNo}</DialogTitle>
          <DialogDescription>
            {asset?.kind} · {asset?.make}. It is unallocated until you put it on a person.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Person" htmlFor="au-person">
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger id="au-person">
                <SelectValue placeholder="Choose person" />
              </SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {personLabel(people, p.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Room number" htmlFor="au-loose-room">
            <Input id="au-loose-room" value={room} onChange={(e) => setRoom(e.target.value)} />
          </Field>
          {preview.length > 0 ? (
            <ul className="space-y-1 rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
              {preview.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!asset || !personId) return;
              await auditAssign(asset.id, personId, room);
              toast.success("Allocated");
              onClose();
            }}
          >
            Allocate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
