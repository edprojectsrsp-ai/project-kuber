import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ClipboardList,
  PackageCheck,
  MonitorSmartphone,
  ArrowUpRight,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { useRegister, personLabel } from "@/lib/store/use-register";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SlipStatusBadge } from "@/components/status-badge";
import { StockNotifications } from "@/components/stock-notifications";
import { MyAssets } from "@/components/employee-home";
import { ItemIcon } from "@/components/catalog-controls";
import { formatDate } from "@/lib/format";
export const Route = createFileRoute("/")({ component: Dashboard });
function Dashboard() {
  const user = useSession((s) => s.user)!;
  const { slips, items, assets, people, settings } = useRegister();
  const staff = user.role !== "employee";
  const open = slips.filter((s) =>
      ["open", "approved"].includes(s.status),
    ).length,
    awaiting = slips.filter((s) => s.status === "issued").length,
    low = items.filter((i) => (i.availableQty ?? i.qty) < 10),
    unallocated = assets.filter(
      (a) => !a.holderId && a.status !== "condemned",
    ).length;
  const recent = [...slips]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const cards = [
    {
      label: "Open requests",
      value: open,
      hint: "Waiting for issue",
      icon: ClipboardList,
      to: "/slips",
      search: { tab: "open" },
    },
    {
      label: "Awaiting receipt",
      value: awaiting,
      hint: staff ? "Issued · user to confirm" : "Please confirm your material",
      icon: PackageCheck,
      to: "/slips",
      search: { tab: "issued" },
    },
    ...(staff
      ? [
          {
            label: "Low stock items",
            value: low.length,
            hint: "Below 10 available",
            icon: Archive,
            to: "/stock",
            search: { filter: "low" },
          },
          {
            label: "Assets in store",
            value: unallocated,
            hint: "Unallocated assets",
            icon: MonitorSmartphone,
            to: "/assets",
            search: { view: "store" },
          },
        ]
      : [
          {
            label: "Received",
            value: slips.filter((s) => s.status === "closed").length,
            hint: "Completed requests",
            icon: Archive,
            to: "/slips",
            search: { tab: "closed" },
          },
          {
            label: "My assets",
            value: assets.length,
            hint: "Allocated to you",
            icon: MonitorSmartphone,
            to: "/assets",
            search: {},
          },
        ]),
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <PageHeader
        eyebrow={settings.officeName}
        title={
          staff
            ? "Your store, at a glance"
            : "Hello, " + user.name.split(" ")[0]
        }
        description={
          staff
            ? "Material, people and assets — one clear view of your store."
            : "Track your requests, confirm material received, and see your assets."
        }
        actions={
          <Button asChild>
            <Link to={staff ? "/stock" : "/slips"}>
              {staff ? "Open inventory" : "Request material"}
            </Link>
          </Button>
        }
      />
      {staff && <StockNotifications banner />}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            search={c.search}
            className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex justify-between text-primary">
              <c.icon className="size-5" />
              <ArrowUpRight className="size-4 opacity-30 transition group-hover:opacity-100" />
            </div>
            <p className="mt-5 text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {c.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{c.hint}</p>
          </Link>
        ))}
      </section>
      {!staff && awaiting > 0 && (
        <Link
          to="/slips"
          search={{ tab: "issued" }}
          className="receipt-pulse block rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800"
        >
          {awaiting} {awaiting === 1 ? "request is" : "requests are"} awaiting
          your receipt confirmation. Tap to review.
        </Link>
      )}
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-5 flex justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent requests</h2>
          <Link
            className="text-sm text-primary"
            to="/slips"
            search={{ tab: "all" }}
          >
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recent.map((s) => (
            <Link
              key={s.id}
              to="/slips/$slipId"
              params={{ slipId: s.id }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 transition hover:bg-muted"
            >
              <div>
                <p className="text-sm font-semibold">
                  {s.number}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {personLabel(people, s.personId)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(s.createdAt)} ·{" "}
                  {s.lines
                    .map((l) => items.find((i) => i.id === l.itemId)?.name)
                    .join(", ")}
                </p>
              </div>
              <SlipStatusBadge status={s.status} />
            </Link>
          ))}
          {!recent.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Your requests will appear here.
            </p>
          )}
        </div>
      </section>
      {staff ? (
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-4 flex justify-between">
            <h2 className="font-semibold">Stock to watch</h2>
            <Link
              className="text-sm text-primary"
              to="/stock"
              search={{ filter: "low" }}
            >
              View low stock
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {low.slice(0, 6).map((i) => (
              <Link
                to="/stock"
                search={{ filter: "low" }}
                key={i.id}
                className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
              >
                <span className="rounded-xl bg-card p-3 text-primary">
                  <ItemIcon name={i.name} icon={i.icon} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.make}</p>
                </div>
                <span
                  className={
                    (i.availableQty ?? i.qty) < 5
                      ? "text-red-600"
                      : "text-orange-600"
                  }
                >
                  {i.availableQty ?? i.qty} {i.unit}
                </span>
              </Link>
            ))}
          </div>
          {!low.length && (
            <p className="text-sm text-muted-foreground">
              All items have at least 10 available.
            </p>
          )}
        </section>
      ) : (
        <MyAssets compact />
      )}
    </div>
  );
}
