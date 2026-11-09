import { useId, useState } from "react";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Package,
  FileText,
  PenTool,
  Mouse,
  Keyboard,
  Cable,
  Plug,
  Droplets,
  Lightbulb,
  Wrench,
  Folder,
  Scissors,
  Notebook,
  Paperclip,
  Brush,
  Shield,
  HardDrive,
  Cpu,
  Monitor,
  Printer,
  Laptop,
  Battery,
  Scan,
  Projector,
  Network,
} from "lucide-react";
import { useRegister } from "@/lib/store/use-register";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const ITEM_ICONS = {
  package: Package,
  paper: FileText,
  pen: PenTool,
  mouse: Mouse,
  keyboard: Keyboard,
  cable: Cable,
  plug: Plug,
  liquid: Droplets,
  bulb: Lightbulb,
  tools: Wrench,
  folder: Folder,
  scissors: Scissors,
  notebook: Notebook,
  clip: Paperclip,
  cleaning: Brush,
  safety: Shield,
  drive: HardDrive,
  cpu: Cpu,
  monitor: Monitor,
  printer: Printer,
  laptop: Laptop,
  battery: Battery,
  scanner: Scan,
  projector: Projector,
  network: Network,
};
export function ItemIcon({
  name = "",
  icon = "auto",
  className = "size-5",
}: {
  name?: string;
  icon?: string;
  className?: string;
}) {
  const n = name.toLowerCase();
  const key =
    icon !== "auto"
      ? icon
      : /cpu|desktop/.test(n)
        ? "cpu"
        : /monitor|screen/.test(n)
          ? "monitor"
          : /printer|toner|cartridge/.test(n)
            ? "printer"
            : /laptop/.test(n)
              ? "laptop"
              : /ups|battery/.test(n)
                ? "battery"
                : /scanner/.test(n)
                  ? "scanner"
                  : /projector/.test(n)
                    ? "projector"
                    : /switch|router|network/.test(n)
                      ? "network"
                      : /paper|a4|ream/.test(n)
                        ? "paper"
                        : /pencil|pen\b|marker/.test(n)
                          ? "pen"
                          : /mouse/.test(n)
                            ? "mouse"
                            : /keyboard/.test(n)
                              ? "keyboard"
                              : /cable|wire/.test(n)
                                ? "cable"
                                : /bulb|light/.test(n)
                                  ? "bulb"
                                  : /file|folder/.test(n)
                                    ? "folder"
                                    : /soap|clean|brush/.test(n)
                                      ? "cleaning"
                                      : "package";
  const Icon = ITEM_ICONS[key as keyof typeof ITEM_ICONS] || Package;
  return <Icon className={className} />;
}
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
