import type { Measurements, RecommendationResponse, Uniform } from '../types';

const BASE = '/api';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...init
        });
    } catch {
        throw new ApiError(0, 'Cannot reach the server. Please try again later.');
    }

    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const body = await response.json();
            if (body?.message) message = body.message;
        } catch {
            // Non-JSON error body: keep the generic message.
        }
        throw new ApiError(response.status, message);
    }

    return (await response.json()) as T;
}

export function getUniforms(): Promise<Uniform[]> {
    return request<Uniform[]>('/uniforms');
}

export function getRecommendations(
    measurements: Measurements
): Promise<RecommendationResponse> {
    return request<RecommendationResponse>('/uniforms/recommendations', {
        method: 'POST',
        body: JSON.stringify(measurements)
    });
}
