// Shared domain types for the BCP Uniform Guide client.

export type Gender = 'Male' | 'Female' | 'Unisex';

export interface SizeOption {
    id: number;
    size: string;
    price: number;
    stock: number;
    height_min: number;
    height_max: number;
    weight_min: number;
    weight_max: number;
    chest_min: number;
    chest_max: number;
    waist_min: number;
    waist_max: number;
}

export interface Uniform {
    id: number;
    name: string;
    category: string;
    gender: Gender;
    description: string;
    icon: string;
    sizes: SizeOption[];
}

export interface Measurements {
    studentName?: string;
    studentId?: string;
    gender: 'Male' | 'Female';
    height: number;
    weight: number;
    chest: number | null;
    waist: number | null;
    method: 'manual' | 'photo_scan';
}

export interface Recommendation {
    uniformId: number;
    uniformName: string;
    category: string;
    icon: string;
    recommendedSize: string;
    sizeId: number;
    price: number;
    stock: number;
    confidence: number;
}

export interface RecommendationResponse {
    measurements: Measurements;
    recommendations: Recommendation[];
}

export interface ScanResult {
    /** Which provider produced the numbers (e.g. 'sandbox'). */
    provider: string;
    /** True when no real AI provider is configured and numbers are simulated. */
    simulated: boolean;
    mimeType: string;
    /** First 16 hex chars of the image hash; identical photos scan identically. */
    imageHash: string;
}

export interface ScanResponse {
    measurements: Measurements;
    scan: ScanResult;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    studentId?: string | null;
    gender: Gender;
    role: 'student' | 'admin';
    height?: number | null;
    weight?: number | null;
    chest?: number | null;
    waist?: number | null;
    createdAt?: string;
}

// ---------------------------------------------------------------------------
// Cart & orders
// ---------------------------------------------------------------------------

export interface CartItem {
    uniformId: number;
    sizeId: number;
    uniformName: string;
    category: string;
    icon: string;
    sizeLabel: string;
    price: number;
    /** Stock at the moment it was added; checkout re-validates on the server. */
    stock: number;
    quantity: number;
}

export type OrderStatus = 'pending' | 'paid' | 'ready' | 'completed' | 'cancelled';

export type PaymentMethod = 'cash_on_pickup' | 'online';

/** How the gateway settled (or will settle) an online payment. */
export type GatewayMethod = 'card' | 'gcash' | 'paymaya' | 'maya' | 'qrph';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

export interface Payment {
    id: string;
    orderId: string;
    /** 'sandbox' (in-app test gateway) or 'paymongo'. */
    provider: string;
    status: PaymentStatus;
    /** Gateway method once settled: card, gcash, paymaya, qrph, ... */
    method?: string | null;
    amount: number;
    failureReason?: string | null;
    paidAt?: string | null;
    createdAt: string;
}

export interface OrderItem {
    id: number;
    uniformId: number;
    sizeId: number;
    uniformName: string;
    category?: string | null;
    icon?: string | null;
    sizeLabel: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    /** Latest checkout attempt, when one exists. */
    payment?: Payment | null;
    notes?: string | null;
    createdAt: string;
    items: OrderItem[];
    /** Present for admins (order list with ?scope=all or GET /orders/:id). */
    user?: {
        id: string;
        name: string;
        email: string;
        studentId?: string | null;
    };
}

export interface StockConflict {
    sizeId: number;
    requested?: number;
    available: number;
    reason?: string;
}
