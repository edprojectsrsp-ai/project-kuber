export type PersonStatus = "active" | "retired";
export type AssetStatus = "in-use" | "in-store" | "unallocated" | "condemned" | "deactivated";
export type SlipStatus = "open" | "approved" | "issued" | "closed" | "cancelled";
export type AssetEventType =
  | "created"
  | "assigned"
  | "transferred"
  | "swapped"
  | "returned"
  | "updated"
  | "deactivated"
  | "reactivated"
  | "condemned";

export interface Person {
  id: string;
  personnelNo: string;
  sailPersonnelNo?: string;
  address?: string;
  mobile?: string;
  officeIntercom?: string;
  residenceIntercom?: string;
  officeBsnl?: string;
  residenceBsnl?: string;
  email?: string;
  name: string;
  designation: string;
  section: string;
  room?: string;
  status: PersonStatus;
}

export interface Asset {
  id: string;
  assetNo: string;
  kind: string;
  make: string;
  model: string;
  serialNo: string;
  asr?: string;
  acType?: string;
  capacity?: string;
  material?: string;
  holderId: string | null;
  location: string;
  status: AssetStatus;
  notes: string;
  updatedAt: string;
  deactivatedAt?: string;
  deactivationReason?: string;
  deactivatedBy?: string;
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
  icon?: string;
  qty: number;
  sampleBalance?: boolean;
  reservedQty?: number;
  availableQty?: number;
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
  approvedQty?: number;
  issuedQty?: number;
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
  updatedAt?: string;
  approvalNote?: string;
}

export interface Settings {
  officeName: string;
  storekeeper: string;
  storeInchargeId?: string;
}

export interface AssetRequest {
  id: string;
  assetId: string;
  assetLabel: string;
  requesterId: string;
  requesterName: string;
  fromHolderId: string | null;
  fromLocation: string;
  toHolderId: string | null;
  toName: string;
  room: string;
  requestType: string;
  reason: string;
  status: 'requested' | 'pending-approval' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  preparedBy?: string;
  storeNote?: string;
  replacementId?: string;
  replacementLabel?: string;
  reviewNote?: string;
  reviewedAt?: string;
  resolutionNote?: string;
}

export interface RegisterData {
  people: Person[];
  assets: Asset[];
  events: AssetEvent[];
  items: InventoryItem[];
  archivedItems?: InventoryItem[];
  assetRequests?: AssetRequest[];
  assetRecipients?: Pick<Person, 'id' | 'name' | 'personnelNo' | 'room'>[];
  moves: StockMove[];
  slips: Slip[];
  settings: Settings;
  slipSeq: number;
  catalogs?:Record<string,string[]>;
  audit?: {id:string;status:string;startedAt:string;finishedAt?:string;by:string;baseline:Asset[];results:Record<string,string>;note?:string}|null;
  audits?: unknown[];
}

export const ASSET_KINDS = [
  "CPU",
  "Laptop",
  "Monitor",
  "Air conditioner",
  "Sofa",
  "Chair",
  "Table",
  "Cupboard",
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
