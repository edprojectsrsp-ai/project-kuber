import { useSession } from "@/lib/session";
import { EmployeeHome } from "@/components/employee-home";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowDownToLine,
  ArrowLeftRight,
  ClipboardList,
  MonitorSmartphone,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SlipStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { personName, useRegister } from "@/lib/store/use-register";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const people = useRegister((s) => s.people);
  const assets = useRegister((s) => s.assets);
  const items = useRegister((s) => s.items);
  const slips = useRegister((s) => s.slips);
  const events = useRegister((s) => s.events);
  const office = useRegister((s) => s.settings.officeName);

  const openSlips = slips.filter((s) => s.status === "open");
  const awaiting = slips.filter((s) => s.status === "issued");
  const low = items.filter((i) => i.qty <= i.minQty).sort((a, b) => a.qty - b.qty);
  const inStore = assets.filter((a) => a.status === "in-store");
  const live = slips
    .filter((s) => s.status === "open" || s.status === "approved" || s.status === "issued")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const user=useSession(s=>s.user)!;
  if(user.role === "employee")return <EmployeeHome/>;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow={office}
        title="Store register"
        description="See who holds each machine, what is left in the store, and which requests are waiting to be given."
        actions={
          <>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/slips">New issue slip</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/stock">Receive stock</Link>
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Open slips"
          value={openSlips.length}
          hint="Waiting to issue"
          to="/slips"
          icon={ClipboardList}
        />
        <Stat
          label="Awaiting receipt"
          value={awaiting.length}
          hint="Issued, not signed"
          to="/slips"
          icon={ClipboardList}
        />
        <Stat
          label="Low stock"
          value={low.length}
          hint="At or below minimum"
          to="/stock"
          icon={Archive}
        />
        <Stat
          label="Assets in store"
          value={inStore.length}
          hint="Unassigned machines"
          to="/assets"
          icon={MonitorSmartphone}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold">Live slips</h2>
              <Link to="/slips" className="text-sm text-primary hover:underline">
                All slips
              </Link>
            </div>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open or issued slips.</p>
            ) : (
              <ul className="divide-y divide-border">
                {live.map((slip) => (
                  <li key={slip.id}>
                    <Link
                      to="/slips/$slipId"
                      params={{ slipId: slip.id }}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{slip.number}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {personName(people, slip.personId)} · {slip.purpose}
                        </p>
                      </div>
                      <SlipStatusBadge status={slip.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold">Low stock</h2>
              <Link to="/stock" className="text-sm text-primary hover:underline">
                Catalogue
              </Link>
            </div>
            {low.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items are above minimum.</p>
            ) : (
              <ul className="space-y-3">
                {low.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Min {item.minQty} {item.unit}</p>
                    </div>
                    <p className="font-mono text-sm tabular-nums text-danger">
                      {item.qty} {item.unit}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 font-serif text-xl font-semibold">Recent asset moves</h2>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transfers recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {events.slice(0, 5).map((ev) => {
                  const asset = assets.find((a) => a.id === ev.assetId);
                  return (
                    <li key={ev.id} className="flex gap-3">
                      <ArrowLeftRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{asset?.assetNo ?? "Asset"}</span>
                          {" · "}
                          {ev.type === "swapped"
                            ? "swapped"
                            : ev.type === "returned"
                              ? "unallocated / returned"
                              : ev.type === "assigned"
                                ? "assigned"
                                : ev.type}
                          {" · "}
                          {personName(people, ev.fromHolderId)}
                          {" → "}
                          {personName(people, ev.toHolderId)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(ev.at)}
                          {ev.note ? ` · ${ev.note}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 font-serif text-xl font-semibold">On this desk</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3 rounded-lg bg-muted/70 px-3 py-3">
                <ClipboardList className="mt-0.5 size-4 text-primary" />
                <span>
                  User asks for material. Write a slip, issue from stock, then close it when they
                  confirm receipt — same as signing the paper indent.
                </span>
              </li>
              <li className="flex gap-3 rounded-lg bg-muted/70 px-3 py-3">
                <ArrowDownToLine className="mt-0.5 size-4 text-primary" />
                <span>
                  After purchase arrives, receive it here. SAP requisition stays outside this
                  register.
                </span>
              </li>
              <li className="flex gap-3 rounded-lg bg-muted/70 px-3 py-3">
                <MonitorSmartphone className="mt-0.5 size-4 text-primary" />
                <span>
                  Computers and printers move between people. Transfer, swap two machines, or run a
                  quarterly review on the Assets page.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  to,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  to: "/slips" | "/stock" | "/assets";
  icon: typeof ClipboardList;
}) {
  return (
    <Link to={to} className="block">
      <Card className="h-full transition-[transform,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-border-hover)] active:scale-[0.98]">
        <CardContent className="flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
