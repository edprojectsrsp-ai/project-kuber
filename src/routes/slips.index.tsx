import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Plus, Pencil } from "lucide-react";
import { useSession } from "@/lib/session";
import { useRegister, personLabel } from "@/lib/store/use-register";
import type { Slip } from "@/lib/store/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
import { SlipStatusBadge } from "@/components/status-badge";
import { ApprovalDialog } from "@/components/approval-dialog";
import { RequestDialog } from "@/components/request-dialog";
import { ItemIcon } from "@/components/catalog-controls";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/slips/")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({
    tab: ["open", "issued", "closed", "cancelled", "history", "all"].includes(
      String(s.tab),
    )
      ? String(s.tab)
      : undefined,
  }),
  component: SlipsPage,
});
const tabs = [
  ["all", "All requests"],
  ["open", "Open"],
  ["issued", "Awaiting receipt"],
  ["closed", "Received"],
  ["cancelled", "Cancelled"],
  ["history", "Material ledger"],
];
function SlipsPage() {
  const user = useSession((s) => s.user)!;
  const { slips, people, items } = useRegister();
  const { tab = "all" } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(""),
    [request, setRequest] = useState(false),
    [editing, setEditing] = useState<Slip>(),
    [review, setReview] = useState<Slip | null>(null);
  const matches = (s: Slip, t: string) =>
    t === "all" ||
    (t === "history"
      ? ["issued", "closed"].includes(s.status)
      : t === "open"
        ? ["open", "approved"].includes(s.status)
        : s.status === t);
  const filtered = slips
    .filter(
      (s) =>
        matches(s, tab) &&
        [
          s.number,
          s.purpose,
          s.status,
          personLabel(people, s.personId),
          ...s.lines.map((l) => {
            const i = items.find((i) => i.id === l.itemId);
            return [i?.name, i?.make, i?.category, i?.unit].join(" ");
          }),
          s.issuedAt,
          s.createdAt,
          formatDate(s.issuedAt || s.createdAt),
          formatDate(s.createdAt),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      (tab === "history"
        ? b.issuedAt || b.createdAt
        : b.createdAt
      ).localeCompare(
        tab === "history" ? a.issuedAt || a.createdAt : a.createdAt,
      ),
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={user.role === "employee" ? "My store" : "Store desk"}
        title="Requests & material ledger"
        description="Open → awaiting receipt → received. The ledger records each item issued, with its date."
        actions={
          user.role === "employee" ? (
            <Button onClick={() => setRequest(true)}>
              <Plus className="size-4" />
              Request material
            </Button>
          ) : undefined
        }
      />
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Request status"
      >
        {tabs.map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() =>
              void navigate({ to: "/slips", search: { tab: key } })
            }
            className={
              "rounded-xl px-3 py-2 text-sm transition " +
              (tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:bg-muted")
            }
          >
            {label}{" "}
            <span className="ml-1 text-xs opacity-70">
              {slips.filter((s) => matches(s, key)).length}
            </span>
          </button>
        ))}
      </div>
      <SearchField
        value={q}
        onChange={setQ}
        placeholder="Search item, make, person, personnel number, slip or date…"
      />
      {tab === "history" ? (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                {[
                  "Issued on",
                  "Item / make",
                  "Recipient",
                  "Quantity",
                  "Request",
                ].map((h) => (
                  <th className="p-4" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((s) =>
                s.lines
                  .filter((l) => (l.issuedQty ?? l.approvedQty ?? l.qty) > 0)
                  .map((l) => {
                    const i = items.find((i) => i.id === l.itemId);
                    return (
                      <tr className="border-t" key={s.id + l.itemId}>
                        <td className="whitespace-nowrap p-4">
                          {formatDateTime(s.issuedAt || s.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <ItemIcon name={i?.name} icon={i?.icon} />
                            <span>
                              {i?.name}
                              <small className="block text-muted-foreground">
                                {i?.make}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {personLabel(people, s.personId)}
                        </td>
                        <td className="p-4 font-semibold">
                          {l.issuedQty ?? l.approvedQty ?? l.qty} {i?.unit}
                        </td>
                        <td className="p-4">
                          <Link
                            className="text-primary underline"
                            to="/slips/$slipId"
                            params={{ slipId: s.id }}
                          >
                            {s.number}
                          </Link>
                        </td>
                      </tr>
                    );
                  }),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  className="space-y-1"
                  to="/slips/$slipId"
                  params={{ slipId: s.id }}
                >
                  <p className="font-semibold">
                    {s.number}{" "}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {personLabel(people, s.personId)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(s.createdAt)}
                    {s.updatedAt ? " · edited" : ""}
                  </p>
                </Link>
                <SlipStatusBadge status={s.status} />
              </div>
              <p className="mt-4 text-sm">
                {s.lines
                  .map((l) => {
                    const i = items.find((i) => i.id === l.itemId);
                    return (
                      (s.status === "issued" || s.status === "closed"
                        ? (l.issuedQty ?? l.approvedQty ?? l.qty)
                        : l.qty) +
                      " " +
                      (i?.unit || "") +
                      " " +
                      (i?.name || "Item") +
                      (i?.make ? " · " + i.make : "")
                    );
                  })
                  .join(" / ")}
              </p>
              {s.purpose && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.purpose}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/slips/$slipId" params={{ slipId: s.id }}>
                    View request
                  </Link>
                </Button>
                {["open", "approved"].includes(s.status) &&
                  s.personId === user.personId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(s)}
                    >
                      <Pencil className="size-3.5" />
                      Edit requirement
                    </Button>
                  )}
                {["open", "approved"].includes(s.status) &&
                  user.role !== "employee" && (
                    <Button size="sm" onClick={() => setReview(s)}>
                      Review & issue
                    </Button>
                  )}
                {s.status === "issued" && s.personId === user.personId && (
                  <Button size="sm" className="receipt-pulse" asChild>
                    <Link to="/slips/$slipId" params={{ slipId: s.id }}>
                      Confirm receipt
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {!filtered.length && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 size-8" />
          No matching records.
        </div>
      )}
      <RequestDialog
        open={request || !!editing}
        slip={editing}
        onClose={() => {
          setRequest(false);
          setEditing(undefined);
        }}
      />
      <ApprovalDialog slip={review} onClose={() => setReview(null)} />
    </div>
  );
}
