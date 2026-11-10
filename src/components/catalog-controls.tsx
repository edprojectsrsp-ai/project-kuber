import { useId, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useRegister } from "@/lib/store/use-register";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export { ItemIcon, ITEM_ICONS, ICON_STYLES } from "./item-icon";

export function QuantityControl({
  value,
  onChange,
  min = 1,
  max,
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        className="w-20 text-center tabular-nums"
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        required
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "" ? min : Number(e.target.value))
        }
        onBlur={() =>
          onChange(Math.max(min, Number.isFinite(value) ? value : min))
        }
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Increase ${label}`}
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
export function CatalogSelect({
  kind,
  value,
  onChange,
  label,
  allowCreate = true,
  disabled = false,
}: {
  kind: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  allowCreate?: boolean;
  disabled?: boolean;
}) {
  const options = useRegister((s) => s.catalogs?.[kind] || []),
    add = useRegister((s) => s.addCatalogOption);
  const [creating, setCreating] = useState(false),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <select
        disabled={disabled}
        aria-label={label}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => {
          if (e.target.value === "__new__") {
            setDraft("");
            setCreating(true);
          } else onChange(e.target.value);
        }}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {[...new Set([...options, value].filter(Boolean))].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
        {allowCreate && <option value="__new__">＋ Add new {label.toLowerCase()}…</option>}
      </select>
      {creating && (
        <div className="flex gap-2">
          <Input
            aria-label={`New ${label}`}
            autoFocus
            placeholder={`New ${label.toLowerCase()}`}
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            type="button"
            disabled={!draft.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const v = await add(kind, draft.trim());
                onChange(v);
                setCreating(false);
                toast.success(`${label} saved`);
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCreating(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
export function ItemNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const id = useId();
  const items = useRegister((s) => s.items);
  return (
    <>
      <Input
        aria-label="Item name"
        required
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing or enter a new name"
      />
      <datalist id={id}>
        {[...new Set(items.map((i) => i.name))].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
}
