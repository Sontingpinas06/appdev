import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning';

interface ToastState {
    message: string;
    type: ToastType;
    visible: boolean;
    show: (message: string, type?: ToastType) => void;
    hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set) => ({
    message: '',
    type: 'success',
    visible: false,
    show: (message, type = 'success') => {
        if (timer) clearTimeout(timer);
        set({ message, type, visible: true });
        timer = setTimeout(() => set({ visible: false }), 3000);
    },
    hide: () => {
        if (timer) clearTimeout(timer);
        set({ visible: false });
    }
}));

/** Convenience wrapper so components do not need to import the store directly. */
export const showToast = (message: string, type: ToastType = 'success') =>
    useToastStore.getState().show(message, type);
