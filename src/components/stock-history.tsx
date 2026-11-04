import { useState } from "react";
import { toast } from "sonner";
import { useRegister } from "@/lib/store/use-register";
import type { InventoryItem } from "@/lib/store/types";
import { formatDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { QuantityControl } from "./catalog-controls";

export function StockHistory({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!item}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-auto">
        {item && <HistoryForm key={item.id} id={item.id} />}
      </DialogContent>
    </Dialog>
  );
}
function HistoryForm({ id }: { id: string }) {
  const item = useRegister((s) => s.items.find((i) => i.id === id))!;
  const moves = useRegister((s) => s.moves).filter((m) => m.itemId === id);
  const [count, setCount] = useState(item.qty),
    [note, setNote] = useState(""),
    [adjusting, setAdjusting] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{item.name} · stock history</DialogTitle>
        <DialogDescription>
          {item.make} · {item.qty} {item.unit} on shelf
        </DialogDescription>
      </DialogHeader>
      <Button variant="outline" onClick={() => setAdjusting((v) => !v)}>
        Record physical count
      </Button>
      {adjusting && (
        <form
          className="space-y-3 rounded-xl bg-muted p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await useRegister.getState().adjustStock(id, count, note);
              setNote("");
              setAdjusting(false);
              toast.success(
                "Physical count recorded with an adjustment movement",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <QuantityControl
            label="Physical count"
            min={0}
            value={count}
            onChange={setCount}
          />
          <Input
            required
            aria-label="Adjustment reason"
            placeholder="Reason for stock adjustment"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button disabled={busy || !note.trim()}>Save count</Button>
        </form>
      )}
      <div className="space-y-2">
        {[...moves]
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((m) => (
            <div
              className="flex items-start justify-between gap-3 rounded-xl border p-3"
              key={m.id}
            >
              <div>
                <p className="text-sm">{m.note || "Stock movement"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(m.at)}
                </p>
              </div>
              <strong
                className={
                  m.type === "in" ? "text-emerald-600" : "text-orange-600"
                }
              >
                {m.type === "in" ? "+" : "−"}
                {m.qty} {item.unit}
              </strong>
            </div>
          ))}
        {!moves.length && (
          <p className="text-sm text-muted-foreground">
            No stock movements yet.
          </p>
        )}
      </div>
    </div>
  );
}
