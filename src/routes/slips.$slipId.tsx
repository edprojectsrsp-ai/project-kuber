import { askText } from "@/components/text-prompt";
import { useSession } from "@/lib/session";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SlipStatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatDateTime, qtyLabel } from "@/lib/format";
import { personName, useRegister } from "@/lib/store/use-register";

export const Route = createFileRoute("/slips/$slipId")({ component: SlipDetail });

function SlipDetail() {
  const user=useSession(s=>s.user)!;
  const approveSlip=useRegister(s=>s.approveSlip);
  const reportReceipt=useRegister(s=>s.reportReceipt);
  const { slipId } = Route.useParams();
  const navigate = useNavigate();
  const slip = useRegister((s) => s.slips.find((x) => x.id === slipId));
  const people = useRegister((s) => s.people);
  const items = useRegister((s) => s.items);
  const issueSlip = useRegister((s) => s.issueSlip);
  const confirmSlip = useRegister((s) => s.confirmSlip);
  const cancelSlip = useRegister((s) => s.cancelSlip);
  const person = people.find((p) => p.id === slip?.personId);

  if (!slip) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="font-serif text-2xl font-semibold">Slip not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/slips">Back to slips</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link to="/slips">
          <ArrowLeft className="size-4" />
          All slips
        </Link>
      </Button>

      <article className="relative overflow-hidden rounded-xl bg-card px-5 py-6 shadow-[var(--shadow-border)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-primary" />
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-input pb-5">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Store issue slip
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold">{slip.number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Written {formatDateTime(slip.createdAt)}</p>
          </div>
          <SlipStatusBadge status={slip.status} />
        </header>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Requested by</dt>
            <dd className="mt-1 font-medium">{personName(people, slip.personId)}</dd>
            <dd className="text-sm text-muted-foreground">
              {person ? `${person.designation} · ${person.section}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Purpose</dt>
            <dd className="mt-1">{slip.purpose}</dd>
          </div>
        </dl>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Make</th>
              <th className="py-2 text-right font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {slip.lines.map((line, i) => {
              const item = items.find((x) => x.id === line.itemId);
              return (
                <tr key={`${line.itemId}-${i}`} className="border-b border-border/70">
                  <td className="py-3">{item?.name ?? "Removed item"}</td>
                  <td className="py-3 text-muted-foreground">{item?.make || "—"}</td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    {item ? qtyLabel(line.qty, item.unit) : line.qty}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-muted/70 px-4 py-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Issued by store</p>
            <p className="mt-1 font-medium">
              {slip.issuedBy ? slip.issuedBy : "Not yet issued"}
            </p>
            {slip.issuedAt ? (
              <p className="text-xs text-muted-foreground">{formatDateTime(slip.issuedAt)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Stock is still in the rack.</p>
            )}
          </div>
          <div className="rounded-lg bg-muted/70 px-4 py-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Received by user</p>
            <p className="mt-1 font-medium">
              {slip.receivedAt ? personName(people, slip.personId) : "Awaiting confirmation"}
            </p>
            {slip.receivedAt ? (
              <p className="text-xs text-muted-foreground">{formatDateTime(slip.receivedAt)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Close the slip after they take the material.</p>
            )}
          </div>
        </div>
      </article>

      {slip.receiptProblem && <p className="rounded-xl bg-warn-soft p-4 text-sm text-warn">Receipt problem: {slip.receiptProblem}</p>}
      {slip.status === "issued" && slip.personId === user.personId && <Button variant="outline" onClick={async()=>{const reason=await askText("Describe the missing or incorrect material:");if(reason?.trim()){await reportReceipt(slip.id,reason);toast.success("Problem reported to the storekeeper");}}}>Report a receipt problem</Button>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {user.role !== "employee" && ["open","approved"].includes(slip.status) ? (
          <>
            <Button
              className="sm:flex-1"
              onClick={async () => {
                const result = slip.status === "open" ? await approveSlip(slip.id) : await issueSlip(slip.id);
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }
                toast.success(slip.status === "open" ? "Request approved" : "Material issued — stock deducted");
              }}
            >
              {slip.status === "open" ? "Approve request" : "Issue material"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Cancel slip</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this slip?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stock is unchanged because it has not been issued. The slip will stay in the
                    register as cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep slip</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const result = await cancelSlip(slip.id);
                      if (!result.ok) toast.error(result.message);
                      else {
                        toast.success("Slip cancelled");
                        void navigate({ to: "/slips" });
                      }
                    }}
                  >
                    Cancel slip
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
        {slip.status === "issued" && slip.personId === user.personId ? (
          <Button
            className="sm:flex-1"
            onClick={async () => {
              await confirmSlip(slip.id);
              toast.success("Receipt confirmed — slip closed");
            }}
          >
            Confirm I received the material
          </Button>
        ) : null}
      </div>
    </div>
  );
}
