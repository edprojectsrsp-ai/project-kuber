import { useSession } from "@/lib/session";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
import { SlipStatusBadge } from "@/components/status-badge";
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
import { formatDate } from "@/lib/format";
import { personLabel, personName, useRegister } from "@/lib/store/use-register";
import type { SlipLine, SlipStatus } from "@/lib/store/types";

export const Route = createFileRoute("/slips/")({ component: SlipsPage });

type Filter = "live" | "approved" | "open" | "issued" | "closed" | "all";

function SlipsPage() {
  const user=useSession(s=>s.user)!;
  const approveSlip=useRegister(s=>s.approveSlip);
  const slips = useRegister((s) => s.slips);
  const people = useRegister((s) => s.people);
  const items = useRegister((s) => s.items);
  const [filter, setFilter] = useState<Filter>("live");
  const [q, setQ] = useState("");
  const [personId, setPersonId] = useState("all");
  const [openAsk, setOpenAsk] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const giveSlip = useRegister((s) => s.giveSlip);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return slips.filter((s) => {
      if (filter === "live" && s.status !== "open" && s.status !== "approved" && s.status !== "issued") return false;
      if (filter !== "live" && filter !== "all" && s.status !== filter) return false;
      if (personId !== "all" && s.personId !== personId) return false;
      if (!query) return true;
      const holder = personName(people, s.personId).toLowerCase();
      const no = people.find((p) => p.id === s.personId)?.personnelNo ?? "";
      return `${s.number} ${s.purpose} ${holder} ${no}`.toLowerCase().includes(query);
    });
  }, [slips, filter, q, people, personId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Issues"
        title="Requests"
        description="A person asks for one item. The storekeeper approves and issues it, stock drops, and that person can see their own history."
        actions={
          <Button onClick={() => setOpenAsk(true)}>
            <Plus className="size-4" />
            Ask for material
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="issued">Issued</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search slip or item"
          className="sm:max-w-xs sm:flex-1"
        />
        {user.role !== "employee" && <Select value={personId} onValueChange={setPersonId}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Person" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone’s history</SelectItem>
            {people
              .filter((p) => p.status === "active")
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {personLabel(people, p.id)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No slips here"
          hint="Create a slip when someone asks for material from the store."
          action={
            <Button onClick={() => setOpenAsk(true)}>
              <Plus className="size-4" />
              Ask for material
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((slip) => (
            <li key={slip.id}>
              <Link to="/slips/$slipId" params={{ slipId: slip.id }} className="block">
                <Card className="transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">{slip.number}</p>
                        <SlipStatusBadge status={slip.status as SlipStatus} />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {personLabel(people, slip.personId)} · {slip.purpose}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-sm text-muted-foreground sm:text-right">
                        <p>{formatDate(slip.createdAt)}</p>
                        <p className="tabular-nums">
                          {slip.lines
                            .map((l) => {
                              const item = items.find((i) => i.id === l.itemId);
                              return item ? `${item.name} × ${l.qty}` : "";
                            })
                            .filter(Boolean)
                            .slice(0, 2)
                            .join(", ")}
                        </p>
                      </div>
                      {user.role !== "employee" && ["open","approved"].includes(slip.status) ? (
                        <Button
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const result = slip.status === "open" ? await approveSlip(slip.id) : await giveSlip(slip.id);
                            if (!result.ok) toast.error(result.message);
                            else toast.success(`${slip.status === "open" ? "Approved" : "Issued"} · ${slip.number}`);
                          }}
                        >
                          {slip.status === "open" ? "Approve" : "Issue"}
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AskDialog open={openAsk} onClose={() => setOpenAsk(false)} />
      <NewSlipDialog open={openNew} onClose={() => setOpenNew(false)} />
    </div>
  );
}

function AskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user=useSession(s=>s.user)!;
  const people = useRegister((s) => s.people);
  const items = useRegister((s) => s.items);
  const createSlip = useRegister((s) => s.createSlip);
  const active = people.filter((p) => p.status === "active");
  const [personId, setPersonId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setPersonId(user.role !== "employee" ? active[0]?.id ?? "" : user.personId);
          setItemId(items[0]?.id ?? "");
          setQty("1");
        }}
      >
        <DialogHeader>
          <DialogTitle>Ask for material</DialogTitle>
          <DialogDescription>
            One item. The storekeeper gives it when it is handed over. Stock does not change until then.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {user.role !== "employee" && <Field label="Who" htmlFor="ask-who">
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger id="ask-who">
                <SelectValue placeholder="Person" />
              </SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {personLabel(people, p.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>}
          <Field label="Item" htmlFor="ask-item">
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger id="ask-item">
                <SelectValue placeholder="Item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.qty} {item.unit} in store
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="How many" htmlFor="ask-qty">
            <Input
              id="ask-qty"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const n = Number(qty);
              if (!personId || !itemId || !Number.isFinite(n) || n <= 0) {
                toast.error("Choose a person, an item, and a quantity");
                return;
              }
              await createSlip({
                personId,
                purpose: "Store request",
                lines: [{ itemId, qty: n }],
              });
              toast.success("Request sent to the store");
              onClose();
            }}
          >
            Ask
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewSlipDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const people = useRegister((s) => s.people);
  const items = useRegister((s) => s.items);
  const createSlip = useRegister((s) => s.createSlip);
  const [personId, setPersonId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lines, setLines] = useState<SlipLine[]>([{ itemId: "", qty: 1 }]);
  const activePeople = people.filter((p) => p.status === "active");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-xl"
        onOpenAutoFocus={() => {
          setPersonId(activePeople[0]?.id ?? "");
          setPurpose("");
          setLines([{ itemId: items[0]?.id ?? "", qty: 1 }]);
        }}
      >
        <DialogHeader>
          <DialogTitle>New issue slip</DialogTitle>
          <DialogDescription>
            Stock is deducted only when you issue the slip, not when you write it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Requested by">
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {activePeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Purpose" htmlFor="slip-purpose">
            <Textarea
              id="slip-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Why is this material needed?"
            />
          </Field>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Items</p>
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={line.itemId}
                  onValueChange={(itemId) =>
                    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, itemId } : r)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.qty} {i.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="w-20"
                  value={line.qty}
                  onChange={(e) =>
                    setLines((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, qty: Math.max(1, Number(e.target.value) || 1) } : r,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={lines.length === 1}
                  onClick={() => setLines((rows) => rows.filter((_, i) => i !== idx))}
                  aria-label="Remove line"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setLines((rows) => [...rows, { itemId: items[0]?.id ?? "", qty: 1 }])}
            >
              Add line
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const clean = lines.filter((l) => l.itemId && l.qty > 0);
              if (!personId) {
                toast.error("Select who is requesting");
                return;
              }
              if (clean.length === 0) {
                toast.error("Add at least one item");
                return;
              }
              await createSlip({ personId, purpose: purpose.trim() || "Store issue", lines: clean });
              toast.success("Slip written");
              onClose();
            }}
          >
            Save slip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
