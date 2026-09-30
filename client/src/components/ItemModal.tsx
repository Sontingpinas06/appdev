import { useRef, useState } from 'react';
import { useCartStore } from '../store/cart';
import { useModalA11y } from '../hooks/useModalA11y';
import type { Uniform } from '../types';

interface Props {
    uniform: Uniform;
    onClose: () => void;
}

export default function ItemModal({ uniform, onClose }: Props) {
    const add = useCartStore((state) => state.add);
    const firstInStock = uniform.sizes.find((size) => size.stock > 0);
    const [selectedSizeId, setSelectedSizeId] = useState<number | null>(firstInStock?.id ?? null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useModalA11y(true, true, dialogRef, onClose);

    const selected = uniform.sizes.find((size) => size.id === selectedSizeId) ?? null;

    const handleAddToCart = () => {
        if (!selected || selected.stock === 0) return;
        add({
            uniformId: uniform.id,
            sizeId: selected.id,
            uniformName: uniform.name,
            category: uniform.category,
            icon: uniform.icon,
            sizeLabel: selected.size,
            price: selected.price,
            stock: selected.stock
        });
        onClose();
    };

    return (
        <div
            className="modal"
            style={{ display: 'block' }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="modal-content" ref={dialogRef} role="dialog" aria-modal="true" aria-label={uniform.name} tabIndex={-1}>
                <span
                    className="close"
                    role="button"
                    tabIndex={0}
                    aria-label="Close dialog"
                    onClick={onClose}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onClose();
                        }
                    }}
                >
                    &times;
                </span>

                <div className="item-image" style={{ height: '200px', marginBottom: '2rem' }}>
                    <i className={`fas ${uniform.icon}`}></i>
                </div>
                <h2>{uniform.name}</h2>
                <div className="item-meta" style={{ margin: '1rem 0' }}>
                    <span>
                        <i className="fas fa-tag"></i> {uniform.category}
                    </span>
                    <span>
                        <i className="fas fa-venus-mars"></i> {uniform.gender}
                    </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    {uniform.description}
                </p>

                <div className="size-selector">
                    <h4>Select a size:</h4>
                    <div className="size-options">
                        {uniform.sizes.map((size) => (
                            <button
                                type="button"
                                className={`size-option${size.stock === 0 ? ' out-of-stock' : ''}${
                                    size.id === selectedSizeId ? ' selected' : ''
                                }`}
                                key={size.id}
                                disabled={size.stock === 0}
                                onClick={() => setSelectedSizeId(size.id)}
                            >
                                <div className="size-name">{size.size}</div>
                                <div className="size-stock">
                                    {size.stock > 0 ? `${size.stock} left` : 'Out of Stock'}
                                </div>
                                <div
                                    className="size-price"
                                >
                                    ₱{size.price.toFixed(2)}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="item-actions" style={{ marginTop: '1.5rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleAddToCart}
                        disabled={!selected || selected.stock === 0}
                    >
                        <i className="fas fa-cart-plus"></i> Add to Cart
                        {selected ? ` — ₱${selected.price.toFixed(2)}` : ''}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>
                        <i className="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
