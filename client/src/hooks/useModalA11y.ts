import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour for the app's overlay modals:
 *  - Escape closes (unless `enabled` is false, e.g. while a save is running)
 *  - Tab / Shift+Tab cycle inside the dialog
 *  - focus returns to the element that was focused before the modal opened
 *
 * `onClose` and `enabled` are read through refs so an inline callback or a
 * busy-flag flip never re-runs the effect (which would yank focus back to the
 * dialog root mid-interaction). Call unconditionally - before any early
 * return - and pass `open` so React's hook rules stay satisfied.
 */
export function useModalA11y(
    open: boolean,
    enabled: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onClose: () => void
): void {
    const onCloseRef = useRef(onClose);
    const enabledRef = useRef(enabled);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        if (!open) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const container = containerRef.current;
        container?.focus({ preventScroll: true });

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                if (enabledRef.current) {
                    event.preventDefault();
                    onCloseRef.current();
                }
                return;
            }

            if (event.key !== 'Tab' || !container) return;

            const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusables.length === 0) {
                event.preventDefault();
                container.focus({ preventScroll: true });
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || !container.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !container.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, [open, containerRef]);
}
