import { StockHistory } from "@/components/stock-history";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, List, Plus, PackagePlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { useRegister } from "@/lib/store/use-register";
import type { InventoryItem } from "@/lib/store/types";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
import {
  CatalogSelect,
  ItemNameInput,
  ItemIcon,
  ITEM_ICONS,
  QuantityControl,
} from "@/components/catalog-controls";
import { RequestDialog } from "@/components/request-dialog";
import { Field } from "@/components/form-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/stock")({
  validateSearch: (s: Record<string, unknown>): { filter?: string } => ({
    filter: ["low", "critical", "healthy"].includes(String(s.filter))
      ? String(s.filter)
      : undefined,
  }),
  component: StockPage,
});
export function stockTone(q: number) {
  return q < 5
    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
    : q < 10
      ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
}
function StockPage() {
  const user = useSession((s) => s.user)!;
  const staff = user.role !== "employee";
  const items = useRegister((s) => s.items);
  const { filter } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(""),
    [view, setView] = useState<"grid" | "list">(() =>
      localStorage.getItem("kuber-inventory-view") === "list" ? "list" : "grid",
    ),
    [editing, setEditing] = useState<InventoryItem | "new" | null>(null),
    [receiving, setReceiving] = useState<InventoryItem | null>(null),
    [request, setRequest] = useState(false),
    [history, setHistory] = useState<InventoryItem | null>(null);
  const filtered = items
    .filter((i) => {
      const n = i.availableQty ?? i.qty;
      return (
        (!filter ||
          (filter === "low"
            ? n < 10
            : filter === "critical"
              ? n < 5
              : n >= 10)) &&
        [i.name, i.make, i.category, i.unit, i.qty, n]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Material catalogue"
        title="Inventory"
        description="Red: below 5 · Orange: 5–9 · Green: 10 or more. Stock updates when material is issued."
        actions={
          staff ? (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              New item
            </Button>
          ) : (
            <Button onClick={() => setRequest(true)}>Request material</Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="min-w-48 flex-1"
          value={q}
          onChange={setQ}
          placeholder="Search name, make, category, unit or quantity…"
        />
        <select
          aria-label="Stock availability"
          className="h-10 rounded-xl border bg-card px-3 text-sm"
          value={filter || "all"}
          onChange={(e) =>
            void navigate({
              to: "/stock",
              search: {
                filter: e.target.value === "all" ? undefined : e.target.value,
              },
            })
          }
        >
          <option value="all">All stock</option>
          <option value="low">Low stock · below 10</option>
          <option value="critical">Very low · below 5</option>
          <option value="healthy">Healthy · 10 or more</option>
        </select>
        <div className="flex gap-1 rounded-xl border bg-card p-1">
          {(["grid", "list"] as const).map((v) => (
            <Button
              key={v}
              aria-label={v === "grid" ? "Grid view" : "List view"}
              aria-pressed={view === v}
              size="icon"
              variant={view === v ? "secondary" : "ghost"}
              onClick={() => {
                setView(v);
                localStorage.setItem("kuber-inventory-view", v);
              }}
            >
              {v === "grid" ? (
                <LayoutGrid className="size-4" />
              ) : (
                <List className="size-4" />
              )}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {items.length} items
      </p>
      <div
        className={
          view === "grid"
            ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : "space-y-2"
        }
      >
        {filtered.map((i) => {
          const n = i.availableQty ?? i.qty;
          return (
            <article
              key={i.id}
              className={
                "rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                (view === "list" ? "flex flex-wrap items-center gap-4" : "")
              }
            >
              <div
                className={
                  "flex items-start gap-3 " +
                  (view === "list" ? "min-w-52 flex-1" : "")
                }
              >
                <span className={"rounded-2xl border p-3 " + stockTone(n)}>
                  <ItemIcon name={i.name} icon={i.icon} className="size-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold">{i.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {i.make || "Generic"} · {i.category}
                  </p>
                </div>
              </div>
              <div
                className={
                  "flex items-center justify-between gap-3 " +
                  (view === "grid" ? "mt-6" : "min-w-44")
                }
              >
                <p className="text-3xl font-semibold tabular-nums">
                  {n}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {i.unit}
                  </span>
                </p>
                <span
                  className={
                    "rounded-full border px-2.5 py-1 text-xs font-medium " +
                    stockTone(n)
                  }
                >
                  {n < 5 ? "Very low" : n < 10 ? "Low stock" : "Healthy"}
                </span>
              </div>
              {(i.reservedQty ?? 0) > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {i.qty} on shelf · {i.reservedQty} reserved
                </p>
              )}
              {staff && (
                <div
                  className={
                    "flex gap-2 " +
                    (view === "grid" ? "mt-5 border-t pt-4" : "")
                  }
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReceiving(i)}
                  >
                    <PackagePlus className="size-4" />
                    Receive stock
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setHistory(i)}
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={"Edit " + i.name}
                    onClick={() => setEditing(i)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <p className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No matching inventory items.
        </p>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {editing && (
            <ItemForm
              key={editing === "new" ? "new" : editing.id}
              item={editing === "new" ? undefined : editing}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!receiving}
        onOpenChange={(v) => {
          if (!v) setReceiving(null);
        }}
      >
        <DialogContent>
          {receiving && (
            <ReceiveForm
              key={receiving.id}
              item={receiving}
              onClose={() => setReceiving(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <StockHistory item={history} onClose={() => setHistory(null)} />
      <RequestDialog open={request} onClose={() => setRequest(false)} />
    </div>
  );
}
function ItemForm({
  item,
  onClose,
}: {
  item?: InventoryItem;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
      name: item?.name || "",
      make: item?.make || "",
      category: item?.category || "Stationery",
      unit: item?.unit || "nos",
      minQty: Math.max(1, item?.minQty || 1),
      qty: item?.qty || 0,
      icon: item?.icon || "auto",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (k: string, v: string | number) =>
    setDraft((s) => ({ ...s, [k]: v }));
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (item) {
            const { qty, ...patch } = draft;
            await useRegister.getState().updateItem(item.id, patch);
          } else await useRegister.getState().addItem(draft);
          toast.success(item ? "Item updated" : "Item added to catalogue");
          onClose();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{item ? "Edit item" : "New inventory item"}</DialogTitle>
        <DialogDescription>
          Names are suggested from your catalogue. Add a new make, category or
          unit inline.
        </DialogDescription>
      </DialogHeader>
      <Field label="Name">
        <ItemNameInput value={draft.name} onChange={(v) => set("name", v)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Make">
          <CatalogSelect
            label="Make"
            kind="makes"
            value={draft.make}
            onChange={(v) => set("make", v)}
          />
        </Field>
        <Field label="Category">
          <CatalogSelect
            label="Category"
            kind="categories"
            value={draft.category}
            onChange={(v) => set("category", v)}
          />
        </Field>
        <Field label="Unit">
          <CatalogSelect
            label="Unit"
            kind="units"
            value={draft.unit}
            onChange={(v) => set("unit", v)}
          />
        </Field>
        <Field label="Minimum quantity">
          <QuantityControl
            label="Minimum quantity"
            value={draft.minQty}
            onChange={(v) => set("minQty", v)}
          />
        </Field>
        {!item && (
          <Field label="Opening stock">
            <QuantityControl
              label="Opening stock"
              min={0}
              value={draft.qty}
              onChange={(v) => set("qty", v)}
            />
          </Field>
        )}
      </div>
      <Field label="Item icon">
        <div className="grid grid-cols-7 gap-2">
          <Button
            type="button"
            size="icon"
            variant={draft.icon === "auto" ? "secondary" : "outline"}
            aria-label="Automatic icon"
            aria-pressed={draft.icon === "auto"}
            onClick={() => set("icon", "auto")}
          >
            <ItemIcon name={draft.name} />
          </Button>
          {Object.entries(ITEM_ICONS).map(([key, Icon]) => (
            <Button
              key={key}
              title={key}
              aria-label={key + " icon"}
              aria-pressed={draft.icon === key}
              type="button"
              size="icon"
              variant={draft.icon === key ? "secondary" : "outline"}
              onClick={() => set("icon", key)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy}>{busy ? "Saving…" : "Save item"}</Button>
      </DialogFooter>
    </form>
  );
}
function ReceiveForm({
  item,
  onClose,
}: {
  item: InventoryItem;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await useRegister.getState().receiveStock(item.id, qty, note);
          toast.success("Stock received");
          onClose();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Receive {item.name}</DialogTitle>
        <DialogDescription>
          {item.make} · {item.qty} {item.unit} currently on shelf
        </DialogDescription>
      </DialogHeader>
      <QuantityControl value={qty} onChange={setQty} />
      <Input
        aria-label="Stock receipt reference"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="SAP / receipt reference (optional)"
      />
      <p className="rounded-xl bg-accent p-4 text-sm">
        After receipt:{" "}
        <strong>
          {item.qty + qty} {item.unit}
        </strong>
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy}>Add stock</Button>
      </DialogFooter>
    </form>
  );
}
