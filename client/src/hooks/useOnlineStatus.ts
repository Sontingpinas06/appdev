import { useEffect, useState } from 'react';

/**
 * Tracks browser online/offline state. Returns true when online.
 * Listens to the native `online`/`offline` events and does a quick
 * HEAD /health ping on mount to detect captive portals / flaky Wi-Fi.
 */
export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState(navigator.onLine);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    // Optional: background heartbeat to catch flaky connections behind a
    // captive portal where navigator.onLine === true but the API is down.
    // Kept lightweight (HEAD /health every 30s).
    useEffect(() => {
        if (!online) return;
        const intv = setInterval(async () => {
            try {
                await fetch('/health', { method: 'HEAD', cache: 'no-cache' });
            } catch {
                setOnline(false);
            }
        }, 30_000);
        return () => clearInterval(intv);
    }, [online]);

    return online;
}