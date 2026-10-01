import { create } from 'zustand';
import {
    postLogin,
    postLogout,
    postRefresh,
    postRegister,
    setAccessToken,
    setRefreshHandler
} from '../api/client';
import type { AuthUser } from '../types';
import { showToast } from './toast';

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    studentId?: string;
    gender: 'Male' | 'Female';
}

type Status = 'loading' | 'ready';

interface AuthState {
    user: AuthUser | null;
    status: Status;
    login: (identifier: string, password: string) => Promise<boolean>;
    register: (input: RegisterInput) => Promise<boolean>;
    logout: () => Promise<void>;
    /** Exchanges the refresh cookie for a new access token (or clears the session). */
    refreshAccessToken: () => Promise<string | null>;
    /** Called once on app start to restore a session from the refresh cookie. */
    restoreSession: () => Promise<void>;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong';
}

/** Clear PWA runtime caches that store user-specific data (orders, uniforms). */
async function clearUserCaches() {
    if (!('caches' in window)) return;
    const names = ['orders-cache', 'uniforms-cache'];
    for (const name of names) {
        try {
            const cache = await caches.open(name);
            await cache.keys().then((keys) => Promise.all(keys.map((req) => cache.delete(req))));
        } catch {
            // Cache might not exist yet; ignore.
        }
    }
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    status: 'loading',

    login: async (identifier, password) => {
        try {
            const session = await postLogin(identifier, password);
            setAccessToken(session.accessToken);
            set({ user: session.user, status: 'ready' });
            showToast(`Welcome back, ${session.user.name}!`, 'success');
            return true;
        } catch (error) {
            showToast(messageOf(error), 'error');
            return false;
        }
    },

    register: async (input) => {
        try {
            const session = await postRegister(input);
            setAccessToken(session.accessToken);
            set({ user: session.user, status: 'ready' });
            showToast(`Account created. Welcome, ${session.user.name}!`, 'success');
            return true;
        } catch (error) {
            showToast(messageOf(error), 'error');
            return false;
        }
    },

    logout: async () => {
        try {
            await postLogout();
        } catch {
            // Clear the local session regardless.
        }
        // Clear PWA runtime caches that hold user-specific data.
        await clearUserCaches();
        setAccessToken(null);
        set({ user: null, status: 'ready' });
        showToast('Logged out successfully', 'success');
    },

    refreshAccessToken: async () => {
        try {
            const session = await postRefresh();
            setAccessToken(session.accessToken);
            set({ user: session.user, status: 'ready' });
            return session.accessToken;
        } catch {
            setAccessToken(null);
            set({ user: null });
            return null;
        }
    },

    restoreSession: async () => {
        await get().refreshAccessToken();
        set({ status: 'ready' });
    }
}));

// Lets the API client retry a failed request once after a silent refresh.
setRefreshHandler(() => useAuthStore.getState().refreshAccessToken());
