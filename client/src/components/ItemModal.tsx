import type { Uniform } from '../types';

interface Props {
    uniform: Uniform;
    onClose: () => void;
}

export default function ItemModal({ uniform, onClose }: Props) {
    return (
        <div
            className="modal"
            style={{ display: 'block' }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="modal-content">
                <span className="close" onClick={onClose}>
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
                    <h4>Available Sizes &amp; Pricing:</h4>
                    <div className="size-options">
                        {uniform.sizes.map((size) => (
                            <div
                                className={`size-option${size.stock === 0 ? ' out-of-stock' : ''}`}
                                key={size.size}
                            >
                                <div className="size-name">{size.size}</div>
                                <div className="size-stock">
                                    {size.stock > 0 ? `${size.stock} left` : 'Out of Stock'}
                                </div>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                    ₱{size.price.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
