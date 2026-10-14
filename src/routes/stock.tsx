import { askText } from "@/components/text-prompt";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
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
import { formatDateTime, qtyLabel } from "@/lib/format";
import { useRegister } from "@/lib/store/use-register";
import { ITEM_CATEGORIES, UNITS, type InventoryItem } from "@/lib/store/types";

export const Route = createFileRoute("/stock")({ component: StockPage });

function StockPage() {
  const items = useRegister((s) => s.items);
  const moves = useRegister((s) => s.moves);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const adjustStock=useRegister(s=>s.adjustStock);
  const countItem=async (item:InventoryItem)=>{const raw=await askText(`Physical quantity counted for ${item.name}:`,String(item.qty));if(raw===null)return;const note=await askText("Reason for stock adjustment:");if(!note?.trim())return;await adjustStock(item.id,Number(raw),note);toast.success("Stock count recorded");};
  const [receiveFor, setReceiveFor] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null | "new">(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items
      .filter((i) => (cat === "all" ? true : i.category === cat))
      .filter((i) => {
        if (!query) return true;
        return `${i.name} ${i.make} ${i.category}`.toLowerCase().includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, q, cat]);

  const lowCount = items.filter((i) => i.qty <= i.minQty).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Stock"
        description="Purchase stays in SAP. When material reaches the store, add it here. The quantity shown is what is left right now."
        actions={
          <>
            <Button variant="outline" onClick={() => setReceiveFor(items[0] ?? null)} disabled={items.length === 0}>
              Receive stock
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              New item
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search name or make"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ITEM_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lowCount > 0 ? (
        <p className="text-sm text-warn">
          {lowCount} item{lowCount === 1 ? "" : "s"} at or below minimum — refill when the next
          purchase comes in.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No items in this list"
          hint="Add a catalogue item, then receive stock when material arrives from purchase."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              New item
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Make</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">On hand</th>
                  <th className="px-4 py-3 font-medium text-right">Minimum</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.make || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-mono tabular-nums ${item.qty <= item.minQty ? "text-danger" : ""}`}
                      >
                        {qtyLabel(item.qty, item.unit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {item.minQty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setReceiveFor(item)}>
                          Receive
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={()=>countItem(item)}>Count</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {filtered.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.make ? `${item.make} · ` : ""}
                          {item.category}
                        </p>
                      </div>
                      {item.qty <= item.minQty ? <Badge variant="danger">Low</Badge> : null}
                    </div>
                    <p className="font-mono text-lg tabular-nums">
                      {qtyLabel(item.qty, item.unit)}
                      <span className="ml-2 text-xs text-muted-foreground">min {item.minQty}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => setReceiveFor(item)}>
                        Receive
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(item)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={()=>countItem(item)}>Count</Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Recent in / out</h2>
        <Card>
          <CardContent className="p-0">
            {moves.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No movements yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {moves.slice(0, 12).map((m) => {
                  const item = items.find((i) => i.id === m.itemId);
                  return (
                    <li key={m.id} className="flex items-baseline justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <p>
                          <span className={m.type === "in" ? "text-ok" : "text-danger"}>
                            {m.type === "in" ? "In" : "Out"}
                          </span>
                          {" · "}
                          {item?.name ?? "Item"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDateTime(m.at)}
                          {m.note ? ` · ${m.note}` : ""}
                        </p>
                      </div>
                      <p className="font-mono tabular-nums">
                        {m.type === "in" ? "+" : "−"}
                        {m.qty} {item?.unit ?? ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <ReceiveDialog item={receiveFor} onClose={() => setReceiveFor(null)} />
      <ItemDialog
        item={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ReceiveDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const items = useRegister((s) => s.items);
  const receiveStock = useRegister((s) => s.receiveStock);
  const [itemId, setItemId] = useState(item?.id ?? "");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  const open = Boolean(item);
  const selectedId = itemId || item?.id || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        onOpenAutoFocus={() => {
          setItemId(item?.id ?? "");
          setQty("1");
          setNote("");
        }}
      >
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
          <DialogDescription>
            Use this when material physically arrives from purchase or is returned. Record the delivery or return reference in the note.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Item">
            <Select value={selectedId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Quantity received" htmlFor="recv-qty">
            <Input
              id="recv-qty"
              type="number"
              min={1}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Field label="Bill / note" htmlFor="recv-note">
            <Input
              id="recv-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Purchase bill no."
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
              if (!selectedId || !Number.isFinite(n) || n <= 0) {
                toast.error("Enter a quantity greater than zero");
                return;
              }
              await receiveStock(selectedId, n, note.trim());
              toast.success("Stock received");
              onClose();
            }}
          >
            Add to stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  item,
  open,
  onClose,
}: {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const addItem = useRegister((s) => s.addItem);
  const updateItem = useRegister((s) => s.updateItem);
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0]);
  const [unit, setUnit] = useState<string>(UNITS[0]);
  const [minQty, setMinQty] = useState("2");
  const [qty, setQty] = useState("0");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setName(item?.name ?? "");
          setMake(item?.make ?? "");
          setCategory(item?.category ?? ITEM_CATEGORIES[0]);
          setUnit(item?.unit ?? UNITS[0]);
          setMinQty(String(item?.minQty ?? 2));
          setQty(String(item?.qty ?? 0));
        }}
      >
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New catalogue item"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Change the name, make, or minimum. To add quantity, use Receive stock."
              : "Define the type once. Opening quantity is optional."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" htmlFor="item-name">
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Make" htmlFor="item-make">
              <Input id="item-make" value={make} onChange={(e) => setMake(e.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit">
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Minimum" htmlFor="item-min">
              <Input
                id="item-min"
                type="number"
                min={0}
                inputMode="numeric"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </Field>
          </div>
          {!item ? (
            <Field label="Opening quantity" htmlFor="item-qty">
              <Input
                id="item-qty"
                type="number"
                min={0}
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Field>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!name.trim()) {
                toast.error("Name is required");
                return;
              }
              const min = Math.max(0, Number(minQty) || 0);
              if (item) {
                await updateItem(item.id, {
                  name: name.trim(),
                  make: make.trim(),
                  category,
                  unit,
                  minQty: min,
                });
                toast.success("Item updated");
              } else {
                await addItem({
                  name: name.trim(),
                  make: make.trim(),
                  category,
                  unit,
                  minQty: min,
                  qty: Math.max(0, Number(qty) || 0),
                });
                toast.success("Item added");
              }
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
