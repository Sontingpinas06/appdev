import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';
import { showToast } from './toast';

interface CartState {
    items: CartItem[];
    /** Adds a line, or increases the quantity of the same size (capped at stock). */
    add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    setQuantity: (sizeId: number, quantity: number) => void;
    remove: (sizeId: number) => void;
    clear: () => void;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            add: (item, quantity = 1) => {
                const items = get().items;
                const existing = items.find((line) => line.sizeId === item.sizeId);

                if (existing) {
                    const next = Math.min(existing.stock, existing.quantity + quantity);
                    if (next <= existing.quantity) {
                        showToast(
                            `Only ${existing.stock} left of ${item.uniformName} (${item.sizeLabel})`,
                            'error'
                        );
                        return;
                    }
                    set({
                        items: items.map((line) =>
                            line.sizeId === item.sizeId ? { ...line, quantity: next } : line
                        )
                    });
                    showToast(`Cart updated: ${item.uniformName} (${item.sizeLabel})`, 'success');
                    return;
                }

                if (quantity > item.stock) {
                    showToast(`Only ${item.stock} left in stock`, 'error');
                    return;
                }
                set({ items: [...items, { ...item, quantity }] });
                showToast(`Added ${item.uniformName} (${item.sizeLabel}) to cart`, 'success');
            },

            setQuantity: (sizeId, quantity) =>
                set({
                    items: get()
                        .items.map((line) =>
                            line.sizeId === sizeId
                                ? {
                                      ...line,
                                      quantity: Math.max(1, Math.min(quantity, line.stock))
                                  }
                                : line
                        )
                }),

            remove: (sizeId) =>
                set({ items: get().items.filter((line) => line.sizeId !== sizeId) }),

            clear: () => set({ items: [] })
        }),
        { name: 'bcpCart' }
    )
);

export const cartCount = (items: CartItem[]): number =>
    items.reduce((total, item) => total + item.quantity, 0);

export const cartTotal = (items: CartItem[]): number =>
    items.reduce((total, item) => total + item.price * item.quantity, 0);
