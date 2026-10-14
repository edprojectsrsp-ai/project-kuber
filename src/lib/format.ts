import { format, isValid, parseISO } from "date-fns";

export function formatDate(iso: string) {
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, "d MMM yyyy");
}

export function formatDateTime(iso: string) {
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, "d MMM yyyy, h:mm a");
}

export function qtyLabel(qty: number, unit: string) {
  return `${qty} ${unit}`;
}
