import { useSession } from '@/lib/session';
import { useState } from "react";
import { useRegister } from "@/lib/store/use-register";
import { PageHeader } from "./page-header";
import { SearchField } from "./search-field";
import { Card, CardContent } from "./ui/card";
import { AssetStatusBadge } from "./status-badge";
import { ItemIcon } from "./catalog-controls";
export function MyAssets({ compact = false }: { compact?: boolean }) {
  const assets = useRegister((s) => s.assets);
  const user = useSession(s=>s.user)!;
  const [q, setQ] = useState("");
  const filtered = assets.filter(a=>a.holderId===user.personId).filter((a) =>
    [a.kind, a.assetNo, a.make, a.model, a.location, a.serialNo]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {!compact && (
        <PageHeader
          eyebrow="My register"
          title="My assets"
          description="Your allocated assets and rooms. Use Contact store / Request asset change below for transfers, replacements or room changes."
        />
      )}
      {compact && <h2 className="text-lg font-semibold">My assets</h2>}
      {!compact && (
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search type, asset number, make, model, room or serial…"
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-xl bg-accent p-3 text-primary">
                  <ItemIcon name={a.kind} className="size-6" />
                </span>
                <span className="text-sm text-muted-foreground">{a.kind}</span>
              </div>
              <p className="text-lg font-semibold">{a.assetNo}</p>
              <p className="text-sm">
                {a.make} {a.model}
              </p>
              <p className="text-sm text-muted-foreground">
                ASR {a.asr || "—"} · Room {a.location || "—"} · ID {a.assetNo}
              </p>
              {a.acType && <p className="text-sm">{a.acType} · {a.capacity} tonnes</p>}
              {a.material && <p className="text-sm">Material {a.material}</p>}
              {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
              <AssetStatusBadge status={a.status} />
            </CardContent>
          </Card>
        ))}
      </div>
      {!filtered.length && (
        <p className="text-sm text-muted-foreground">
          {q
            ? "No assets match your search."
            : "No assets are currently allocated to you."}
        </p>
      )}
    </div>
  );
}
