import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToastStore } from '../store/toast';

/**
 * Thin, dismissible banner shown when the browser goes offline.
 * Lives in App.tsx so it persists across routes.
 */
export function OfflineBanner() {
    const online = useOnlineStatus();
    const { show } = useToastStore();

    if (online) return null;

    return (
        <div
            className="offline-banner"
            role="status"
            aria-live="polite"
            aria-label="You are offline — changes will sync when reconnected"
        >
            <i className="fas fa-wifi-slash" aria-hidden="true"></i>
            <span>You are offline — changes will sync when reconnected</span>
            <button
                type="button"
                className="offline-banner-dismiss"
                onClick={() => show('Dismissed offline notice', 'warning')}
                aria-label="Dismiss"
            >
                <i className="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
    );
}