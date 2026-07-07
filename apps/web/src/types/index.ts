export type Role = "ADMIN" | "MANAGER" | "STAFF";
export type UnitType = "CASE" | "PACK" | "BOTTLE" | "CAN" | "KEG";
export type MovementType = "PURCHASE" | "SALE" | "ADJUSTMENT" | "WASTAGE" | "RETURN" | "TRANSFER";
export type POStatus = "DRAFT" | "SENT" | "PARTIAL_RECEIVED" | "RECEIVED" | "CANCELLED";
export type PaymentType = "CASH" | "CARD" | "UPI";

export interface Category { id: string; name: string; slug: string; color?: string; }
export interface Supplier { id: string; name: string; contactPerson?: string; email?: string; phone?: string; address?: string; gstNumber?: string; avgLeadDays: number; isActive: boolean; }
export interface ProductVariant { id: string; productId: string; unit: UnitType; size?: string; barcode?: string; costPrice: number; sellingPrice: number; reorderPoint: number; currentStock: number; isActive: boolean; }
export interface Product { id: string; name: string; brand: string; sku: string; categoryId: string; supplierId?: string; description?: string; imageUrl?: string; isActive: boolean; category?: Category; supplier?: Supplier; variants: ProductVariant[]; }
export interface PurchaseOrderItem { id: string; variantId: string; orderedQty: number; receivedQty: number; unitCost: number; variant?: ProductVariant & { product?: Product }; }
export interface PurchaseOrder { id: string; poNumber: string; supplierId: string; status: POStatus; expectedDate?: string; receivedDate?: string; notes?: string; totalAmount: number; supplier?: Supplier; items: PurchaseOrderItem[]; createdAt: string; }
export interface SaleItem { id: string; variantId: string; quantity: number; unitPrice: number; totalPrice: number; variant?: ProductVariant & { product?: Product }; }
export interface Sale { id: string; saleNumber: string; totalAmount: number; paymentType: PaymentType; isVoided: boolean; voidReason?: string; items: SaleItem[]; createdAt: string; }
export interface StockMovement { id: string; variantId: string; type: MovementType; quantity: number; balanceAfter: number; reason?: string; createdAt: string; }
export interface User { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string; }
export interface PaginatedResponse<T> { data: T[]; meta: { total: number; page: number; limit: number; pages?: number }; }
