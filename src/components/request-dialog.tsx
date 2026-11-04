import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { useRegister } from "@/lib/store/use-register";
import type { Slip, SlipLine } from "@/lib/store/types";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ItemIcon, QuantityControl } from "./catalog-controls";
export function RequestDialog({
  open,
  onClose,
  slip,
}: {
  open: boolean;
  onClose: () => void;
  slip?: Slip;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        {open && (
          <RequestForm key={slip?.id || "new"} slip={slip} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
function RequestForm({ slip, onClose }: { slip?: Slip; onClose: () => void }) {
  const user = useSession((s) => s.user)!;
  const items = useRegister((s) => s.items);
  const [lines, setLines] = useState<SlipLine[]>(
      slip ? slip.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })) : [],
    ),
    [purpose, setPurpose] = useState(slip?.purpose || ""),
    [q, setQ] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const results = items.filter(
    (i) =>
      !lines.some((l) => l.itemId === i.id) &&
      [i.name, i.make, i.category, i.unit]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (slip)
            await useRegister
              .getState()
              .updateSlip(slip.id, { purpose, lines });
          else
            await useRegister
              .getState()
              .createSlip({ personId: user.personId, purpose, lines });
          toast.success(
            slip ? "Requirement updated" : "Request sent to the store",
          );
          onClose();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {slip ? "Edit requirement" : "Request material"}
        </DialogTitle>
        <DialogDescription>
          You can change your requirement until the storekeeper issues material.
        </DialogDescription>
      </DialogHeader>
      <Input
        aria-label="Search material"
        placeholder="Find by item name, make or category…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2">
        {results.map((i) => (
          <button
            type="button"
            key={i.id}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
            onClick={() => {
              setLines((s) => [...s, { itemId: i.id, qty: 1 }]);
              setQ("");
            }}
          >
            <ItemIcon name={i.name} icon={i.icon} />
            <span className="flex-1 text-sm">
              {i.name}
              <small className="block text-muted-foreground">
                {i.make} · {i.availableQty ?? i.qty} {i.unit} available
              </small>
            </span>
            <Plus className="size-4" />
          </button>
        ))}
        {!results.length && (
          <p className="p-3 text-sm text-muted-foreground">
            No other items match your search.
          </p>
        )}
      </div>
      {lines.map((l, n) => {
        const i = items.find((i) => i.id === l.itemId);
        return (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3"
            key={l.itemId}
          >
            <span className="text-sm font-medium">
              {i?.name}
              <small className="block text-muted-foreground">
                {i?.make} · {i?.unit}
              </small>
            </span>
            <div className="flex gap-2">
              <QuantityControl
                value={l.qty}
                label={"Request " + i?.name}
                onChange={(qty) =>
                  setLines((s) =>
                    s.map((x, k) => (k === n ? { ...x, qty } : x)),
                  )
                }
              />
              <Button
                aria-label={"Remove " + i?.name}
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setLines((s) => s.filter((_, k) => k !== n))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
      <Textarea
        aria-label="Purpose"
        placeholder="Purpose / note (optional)"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || !lines.length}>
          {busy ? "Saving…" : slip ? "Save requirement" : "Send request"}
        </Button>
      </DialogFooter>
    </form>
  );
}
