import { Badge } from "@/components/ui/badge";
import type { AssetStatus, SlipStatus } from "@/lib/store/types";

export function SlipStatusBadge({ status }: { status: SlipStatus }) {
  const label =
    status === "open"
      ? "Open"
      : status === "approved" ? "Approved" : status === "issued"
        ? "Awaiting receipt"
        : status === "closed"
          ? "Closed"
          : "Cancelled";
  return <Badge variant={status === "approved" ? "issued" : status}>{label}</Badge>;
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  if (status === "unallocated") return <Badge variant="open">Unallocated · verify</Badge>;
  if (status === "in-store") return <Badge variant="store">In store</Badge>;
  if (status === "condemned") return <Badge variant="danger">Condemned</Badge>;
  return <Badge variant="closed">In use</Badge>;
}
