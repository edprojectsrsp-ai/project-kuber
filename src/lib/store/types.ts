export type PersonStatus = "active" | "retired";
export type AssetStatus = "in-use" | "in-store" | "unallocated" | "condemned";
export type SlipStatus = "open" | "approved" | "issued" | "closed" | "cancelled";
export type AssetEventType =
  | "created"
  | "assigned"
  | "transferred"
  | "swapped"
  | "returned"
  | "updated"
  | "condemned";

export interface Person {
  id: string;
  personnelNo: string;
  name: string;
  designation: string;
  section: string;
  status: PersonStatus;
}

export interface Asset {
  id: string;
  assetNo: string;
  kind: string;
  make: string;
  model: string;
  serialNo: string;
  holderId: string | null;
  location: string;
  status: AssetStatus;
  notes: string;
  updatedAt: string;
}

export interface AssetEvent {
  id: string;
  assetId: string;
  at: string;
  type: AssetEventType;
  fromHolderId: string | null;
  toHolderId: string | null;
  note: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  make: string;
  unit: string;
  minQty: number;
  qty: number;
}

export interface StockMove {
  id: string;
  itemId: string;
  at: string;
  type: "in" | "out";
  qty: number;
  slipId?: string;
  note: string;
}

export interface SlipLine {
  itemId: string;
  qty: number;
}

export interface Slip {
  id: string;
  number: string;
  personId: string;
  createdAt: string;
  status: SlipStatus;
  lines: SlipLine[];
  purpose: string;
  issuedAt?: string;
  issuedBy?: string;
  receivedAt?: string;
  receiptProblem?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Settings {
  officeName: string;
  storekeeper: string;
}

export interface RegisterData {
  people: Person[];
  assets: Asset[];
  events: AssetEvent[];
  items: InventoryItem[];
  moves: StockMove[];
  slips: Slip[];
  settings: Settings;
  slipSeq: number;
  audit?: {id:string;status:string;startedAt:string;finishedAt?:string;by:string;baseline:Asset[];results:Record<string,string>;note?:string}|null;
  audits?: unknown[];
}

export const ASSET_KINDS = [
  "CPU",
  "Laptop",
  "Monitor",
  "Printer",
  "UPS",
  "Scanner",
  "Projector",
  "Network switch",
] as const;

export const ITEM_CATEGORIES = [
  "Stationery",
  "IT consumable",
  "Electrical",
  "Hardware",
  "Housekeeping",
] as const;

export const UNITS = ["nos", "ream", "pkt", "roll", "ltr", "mtr", "set"] as const;
