import type { Measurements, RecommendationResponse, Uniform } from '../types';

const BASE = '/api';

// Access token lives in memory only; the refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null): void {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

/** Registered by the auth store so a 401 can be retried after a silent refresh. */
export function setRefreshHandler(handler: () => Promise<string | null>): void {
    refreshHandler = handler;
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function request<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
    const send = () =>
        fetch(`${BASE}${path}`, {
            ...init,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                ...(init.headers || {})
            }
        });

    let response: Response;
    try {
        response = await send();
    } catch {
        throw new ApiError(0, 'Cannot reach the server. Please try again later.');
    }

    // Silent refresh, then retry the original request once.
    if (response.status === 401 && accessToken && allowRetry && !path.startsWith('/auth/')) {
        const refreshed = refreshHandler ? await refreshHandler() : null;
        if (refreshed) return request<T>(path, init, false);
        accessToken = null;
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

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Uniforms
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface SessionResponse {
    user: import('../types').AuthUser;
    accessToken: string;
}

export function postLogin(identifier: string, password: string): Promise<SessionResponse> {
    return request<SessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
    });
}

export function postRegister(input: {
    name: string;
    email: string;
    password: string;
    studentId?: string;
    gender: 'Male' | 'Female';
}): Promise<SessionResponse> {
    return request<SessionResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input)
    });
}

export function postRefresh(): Promise<SessionResponse> {
    return request<SessionResponse>('/auth/refresh', { method: 'POST' }, false);
}

export function postLogout(): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/logout', { method: 'POST' }, false);
}
