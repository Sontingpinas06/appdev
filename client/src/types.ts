// Shared domain types for the BCP Uniform Guide client.

export type Gender = 'Male' | 'Female' | 'Unisex';

export interface SizeOption {
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
    price: number;
    stock: number;
    confidence: number;
}

export interface RecommendationResponse {
    measurements: Measurements;
    recommendations: Recommendation[];
}
