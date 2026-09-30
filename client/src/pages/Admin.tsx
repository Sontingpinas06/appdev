import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, getOrders, getUniforms, patchOrderStatus, patchStock } from '../api/client';
import { useModalA11y } from '../hooks/useModalA11y';
import { showToast } from '../store/toast';
import type { Order, OrderStatus, Uniform } from '../types';
import { formatDate, paymentSummary, STATUS_LABELS } from './Orders';

type Tab = 'inventory' | 'orders';

function stockBadge(totalStock: number): { label: string; className: string } {
    if (totalStock > 50) return { label: 'In Stock', className: 'in-stock' };
    if (totalStock > 0) return { label: 'Low Stock', className: 'low-stock' };
    return { label: 'Out of Stock', className: 'out-of-stock' };
}

export default function Admin() {
    const [tab, setTab] = useState<Tab>('inventory');
    const [uniforms, setUniforms] = useState<Uniform[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [genderFilter, setGenderFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [search, setSearch] = useState('');

    // Stock editor modal
    const [editing, setEditing] = useState<Uniform | null>(null);
    const [draft, setDraft] = useState<Record<number, number>>({});
    const [saving, setSaving] = useState(false);
    const stockDialogRef = useRef<HTMLDivElement>(null);

    // Esc / focus trap while editing; disabled mid-save so a stock write isn't
    // abandoned halfway through.
    useModalA11y(Boolean(editing), !saving, stockDialogRef, () => setEditing(null));

    async function loadAll() {
        setLoading(true);
        try {
            const [uniformData, orderData] = await Promise.all([
                getUniforms(),
                getOrders('all')
            ]);
            setUniforms(uniformData);
            setOrders(orderData.orders);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAll();
    }, []);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return uniforms.filter((uniform) => {
            const matchesGender = !genderFilter || uniform.gender === genderFilter;
            const matchesCategory = !categoryFilter || uniform.category === categoryFilter;
            const matchesSearch =
                !query ||
                uniform.name.toLowerCase().includes(query) ||
                uniform.description.toLowerCase().includes(query);
            return matchesGender && matchesCategory && matchesSearch;
        });
    }, [uniforms, genderFilter, categoryFilter, search]);

    const stats = useMemo(() => {
        let totalStock = 0;
        let lowStock = 0;
        let value = 0;
        for (const uniform of uniforms) {
            for (const size of uniform.sizes) {
                totalStock += size.stock;
                value += size.stock * size.price;
                if (size.stock > 0 && size.stock <= 20) lowStock += 1;
            }
        }
        return { totalStock, lowStock, value };
    }, [uniforms]);

    function openEditor(uniform: Uniform) {
        setEditing(uniform);
        setDraft(Object.fromEntries(uniform.sizes.map((size) => [size.id, size.stock])));
    }

    async function saveStock() {
        if (!editing) return;
        const changed = editing.sizes.filter((size) => draft[size.id] !== size.stock);
        if (changed.length === 0) {
            setEditing(null);
            return;
        }

        setSaving(true);
        try {
            for (const size of changed) {
                await patchStock({ sizeId: size.id, newStock: draft[size.id] });
            }
            showToast(`Stock updated for ${editing.name}`, 'success');
            setEditing(null);
            const fresh = await getUniforms();
            setUniforms(fresh);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not save stock', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function changeStatus(order: Order, status: OrderStatus) {
        try {
            const { order: updated } = await patchOrderStatus(order.id, status);
            setOrders((current) =>
                current.map((item) => (item.id === order.id ? { ...item, ...updated } : item))
            );
            showToast(`${order.orderNumber} → ${STATUS_LABELS[status].label}`, 'success');
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : 'Could not update the order status';
            showToast(message, 'error');
            const fresh = await getOrders('all').catch(() => null);
            if (fresh) setOrders(fresh.orders);
        }
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-shield-halved"></i> Admin Panel
                    </h2>
                    <p>Inventory and order management, live from the API</p>
                </div>

                <div className="method-selector">
                    <button
                        type="button"
                        className={`method-btn${tab === 'inventory' ? ' active' : ''}`}
                        onClick={() => setTab('inventory')}
                    >
                        <i className="fas fa-warehouse"></i>
                        <span>Inventory</span>
                    </button>
                    <button
                        type="button"
                        className={`method-btn${tab === 'orders' ? ' active' : ''}`}
                        onClick={() => setTab('orders')}
                    >
                        <i className="fas fa-receipt"></i>
                        <span>Orders ({orders.length})</span>
                    </button>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
                    </div>
                )}

                {!loading && error && (
                    <div className="empty-cart">
                        <i className="fas fa-triangle-exclamation"></i>
                        <h3>Could not load admin data</h3>
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && tab === 'inventory' && (
                    <>
                        <div className="stats-grid" style={{ marginTop: '1rem' }}>
                            <div className="stat-card">
                                <i className="fas fa-tshirt"></i>
                                <h3>{uniforms.length}</h3>
                                <p>Catalog items</p>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-boxes-stacked"></i>
                                <h3>{stats.totalStock}</h3>
                                <p>Units in stock</p>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-triangle-exclamation"></i>
                                <h3>{stats.lowStock}</h3>
                                <p>Low stock sizes</p>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-peso-sign"></i>
                                <h3>₱{stats.value.toLocaleString()}</h3>
                                <p>Stock value</p>
                            </div>
                        </div>

                        <div className="filters">
                            <div className="filter-group">
                                <label>
                                    <i className="fas fa-filter"></i> Filter by:
                                </label>
                                <select
                                    value={genderFilter}
                                    onChange={(event) => setGenderFilter(event.target.value)}
                                >
                                    <option value="">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Unisex">Unisex</option>
                                </select>
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    <option value="Upper Wear">Upper Wear</option>
                                    <option value="Lower Wear">Lower Wear</option>
                                    <option value="PE Uniform">PE Uniform</option>
                                </select>
                            </div>
                            <div className="search-box">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Category</th>
                                        <th>Gender</th>
                                        <th>Sizes</th>
                                        <th>Total stock</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((uniform) => {
                                        const totalStock = uniform.sizes.reduce(
                                            (sum, size) => sum + size.stock,
                                            0
                                        );
                                        const badge = stockBadge(totalStock);
                                        return (
                                            <tr key={uniform.id}>
                                                <td>
                                                    <strong>
                                                        <i className={`fas ${uniform.icon}`}></i>{' '}
                                                        {uniform.name}
                                                    </strong>
                                                </td>
                                                <td>{uniform.category}</td>
                                                <td>{uniform.gender}</td>
                                                <td>{uniform.sizes.length}</td>
                                                <td>
                                                    <strong>{totalStock}</strong>
                                                </td>
                                                <td>
                                                    <span className={`stock-badge ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-secondary btn-small"
                                                        onClick={() => openEditor(uniform)}
                                                    >
                                                        <i className="fas fa-pen"></i> Edit stock
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center' }}>
                                                No items match your filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!loading && !error && tab === 'orders' && (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Date</th>
                                    <th>Student</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Payment</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <strong>{order.orderNumber}</strong>
                                        </td>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td>
                                            {order.user?.name || '—'}
                                            {order.user?.email && (
                                                <div className="order-notes">{order.user.email}</div>
                                            )}
                                        </td>
                                        <td>
                                            {order.items.map((item) => (
                                                <div className="order-notes" key={item.id}>
                                                    {item.uniformName} ({item.sizeLabel}) x
                                                    {item.quantity}
                                                </div>
                                            ))}
                                        </td>
                                        <td>
                                            <strong>₱{order.totalAmount.toFixed(2)}</strong>
                                        </td>
                                        <td>
                                            <span
                                                className={`payment-chip ${paymentSummary(order).className}`}
                                            >
                                                {paymentSummary(order).label}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                className="status-select"
                                                value={order.status}
                                                onChange={(event) =>
                                                    void changeStatus(
                                                        order,
                                                        event.target.value as OrderStatus
                                                    )
                                                }
                                            >
                                                {(
                                                    Object.keys(STATUS_LABELS) as OrderStatus[]
                                                ).map((status) => (
                                                    <option value={status} key={status}>
                                                        {STATUS_LABELS[status].label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center' }}>
                                            No orders yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editing && (
                <div
                    className="modal"
                    style={{ display: 'block' }}
                    onClick={(event) => {
                        if (event.target === event.currentTarget && !saving) setEditing(null);
                    }}
                >
                    <div
                        className="modal-content"
                        ref={stockDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="stockEditorTitle"
                        tabIndex={-1}
                    >
                        <span
                            className="close"
                            role="button"
                            tabIndex={0}
                            aria-label="Close dialog"
                            onClick={() => {
                                if (!saving) setEditing(null);
                            }}
                            onKeyDown={(event) => {
                                if ((event.key === 'Enter' || event.key === ' ') && !saving) {
                                    event.preventDefault();
                                    setEditing(null);
                                }
                            }}
                        >
                            &times;
                        </span>
                        <h2 id="stockEditorTitle">
                            <i className="fas fa-warehouse"></i> Stock: {editing.name}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>
                            Set the available quantity for each size. Changes apply immediately.
                        </p>

                        <div className="stock-editor">
                            {editing.sizes.map((size) => (
                                <div className="stock-editor-row" key={size.id}>
                                    <strong>{size.size}</strong>
                                    <span className="order-notes">
                                        ₱{size.price.toFixed(2)} &middot; currently {size.stock}
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100000}
                                        value={draft[size.id] ?? 0}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                [size.id]: Math.max(
                                                    0,
                                                    Number(event.target.value) || 0
                                                )
                                            }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="item-actions" style={{ marginTop: '1.5rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => void saveStock()}
                                disabled={saving}
                            >
                                <i className="fas fa-save"></i>{' '}
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setEditing(null)}
                                disabled={saving}
                            >
                                <i className="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
