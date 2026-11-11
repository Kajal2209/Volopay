export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteContent {
  title: string;
  from: { name: string; email?: string };
  client: { name: string; company?: string; email?: string };
  currency: string;
  items: LineItem[];
  taxPercent: number;
  discount: number;
  timeline?: string;
  terms?: string;
  notes?: string;
  /** YYYY-MM-DD */
  validUntil?: string;
}

export interface Quote extends QuoteContent {
  id: string;
  workspaceKey: string;
  editId: string;
  shareId: string;
  status: QuoteStatus;
  acceptedBy?: { name: string; at: string };
  declinedReason?: string;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  key: string;
  createdAt: string;
}

export type PublicQuote = Omit<Quote, "editId" | "workspaceKey" | "id">;

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}
