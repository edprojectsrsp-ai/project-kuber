import { useState } from "react";
import { toast } from "sonner";
import { useRegister, personLabel } from "@/lib/store/use-register";
import type { Slip } from "@/lib/store/types";
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
import { ItemIcon, QuantityControl } from "./catalog-controls";
export function ApprovalDialog({
  slip,
  onClose,
}: {
  slip: Slip | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!slip}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      {slip && (
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <IssueForm key={slip.id} slipId={slip.id} onClose={onClose} />
        </DialogContent>
      )}
    </Dialog>
  );
}
function IssueForm({
  slipId,
  onClose,
}: {
  slipId: string;
  onClose: () => void;
}) {
  const slip = useRegister((s) => s.slips.find((x) => x.id === slipId))!;
  const items = useRegister((s) => s.items),
    people = useRegister((s) => s.people),
    issue = useRegister((s) => s.issueSlip);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
      Object.fromEntries(
        slip.lines.map((l) => {
          const i = items.find((i) => i.id === l.itemId);
          return [
            l.itemId,
            Math.min(
              l.approvedQty ?? l.qty,
              (i?.availableQty ?? i?.qty ?? 0) +
                (slip.status === "approved" ? (l.approvedQty ?? l.qty) : 0),
            ),
          ];
        }),
      ),
    ),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = slip.lines.map((l) => {
    const item = items.find((i) => i.id === l.itemId);
    const qty = quantities[l.itemId] ?? 0,
      available =
        (item?.availableQty ?? item?.qty ?? 0) +
        (slip.status === "approved" ? (l.approvedQty ?? l.qty) : 0);
    return {
      line: l,
      item,
      qty,
      available,
      after: (item?.qty ?? 0) - qty,
      invalid:
        !Number.isSafeInteger(qty) || qty < 0 || qty > l.qty || qty > available,
    };
  });
  const valid =
    rows.some((r) => r.qty > 0) &&
    rows.every((r) => !r.invalid) &&
    ["open", "approved"].includes(slip.status);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await issue(
            slip.id,
            rows.map((r) => ({ itemId: r.line.itemId, qty: r.qty })),
            note,
          );
          toast.success("Material issued · awaiting user receipt");
          onClose();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Review & issue material</DialogTitle>
        <DialogDescription>
          {slip.number} · {personLabel(people, slip.personId)}. Issue a smaller
          quantity if needed.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {rows.map(({ line, item, qty, available, after, invalid }) => (
          <div key={line.itemId} className="approval-item">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-accent p-3 text-primary">
                <ItemIcon name={item?.name} icon={item?.icon} badge className="size-9" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">
                  {item?.name || "Item unavailable"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item?.make} · requested {line.qty} {item?.unit}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {available} available
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Quantity to issue (0 = skip)
                </p>
                <QuantityControl
                  min={0}
                  max={Math.min(line.qty, available)}
                  value={qty}
                  label={"Issue " + item?.name}
                  onChange={(n) =>
                    setQuantities((s) => ({ ...s, [line.itemId]: n }))
                  }
                />
              </div>
              <div
                className={
                  "stock-forecast " + (after < 10 ? "stock-forecast-warn" : "")
                }
              >
                <span className="text-xs">Left on shelf after issue</span>
                <p className="text-xl font-semibold">
                  {after}{" "}
                  <span className="text-xs font-normal">{item?.unit}</span>
                </p>
              </div>
            </div>
            {invalid && (
              <p role="alert" className="mt-3 text-xs text-destructive">
                Choose a whole number within requested and available quantities.
              </p>
            )}
            {!invalid && after < 10 && (
              <p className="mt-3 text-xs text-warn">
                {after < 5 ? "Very low stock" : "Low stock"} after this issue.
              </p>
            )}
            {qty < line.qty && (
              <p className="mt-2 text-xs text-muted-foreground">
                {line.qty - qty} {item?.unit} will not be issued. A further
                request can be raised later.
              </p>
            )}
          </div>
        ))}
      </div>
      <label className="block text-xs font-medium">
        Note to user (optional)
        <Input
          className="mt-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: one bundle available for now"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Confirm when handing over the material. Stock reduces immediately; the
        user then confirms receipt.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={busy}
        >
          Back
        </Button>
        <Button disabled={!valid || busy}>
          {busy ? "Issuing…" : "Confirm & issue"}
        </Button>
      </DialogFooter>
    </form>
  );
}
