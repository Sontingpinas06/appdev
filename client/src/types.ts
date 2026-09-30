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
