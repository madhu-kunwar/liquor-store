export const LIQUOR_CATEGORIES = [
  { name: "Whiskey", slug: "whiskey", color: "#92400e" },
  { name: "Vodka", slug: "vodka", color: "#1e40af" },
  { name: "Rum", slug: "rum", color: "#7f1d1d" },
  { name: "Gin", slug: "gin", color: "#14532d" },
  { name: "Beer", slug: "beer", color: "#d97706" },
  { name: "Wine", slug: "wine", color: "#7c3aed" },
  { name: "Tequila", slug: "tequila", color: "#065f46" },
  { name: "Brandy", slug: "brandy", color: "#92400e" },
  { name: "Non-Alcoholic", slug: "non-alcoholic", color: "#374151" },
] as const;

export const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent to Supplier",
  PARTIAL_RECEIVED: "Partially Received",
  RECEIVED: "Fully Received",
  CANCELLED: "Cancelled",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  ADJUSTMENT: "Manual Adjustment",
  WASTAGE: "Wastage",
  RETURN: "Return",
  TRANSFER: "Transfer",
};

export const UNIT_LABELS: Record<string, string> = {
  CASE: "Case",
  PACK: "Pack",
  BOTTLE: "Bottle",
  CAN: "Can",
  KEG: "Keg",
};
