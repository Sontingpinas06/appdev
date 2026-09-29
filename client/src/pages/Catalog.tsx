import { useEffect, useMemo, useState } from 'react';
import { getUniforms } from '../api/client';
import ItemModal from '../components/ItemModal';
import type { Uniform } from '../types';

function stockBadge(totalStock: number): { label: string; className: string } {
    if (totalStock > 50) return { label: 'In Stock', className: 'in-stock' };
    if (totalStock > 0) return { label: 'Low Stock', className: 'low-stock' };
    return { label: 'Out of Stock', className: 'out-of-stock' };
}

export default function Catalog() {
    const [uniforms, setUniforms] = useState<Uniform[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [genderFilter, setGenderFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Uniform | null>(null);

    useEffect(() => {
        let cancelled = false;

        getUniforms()
            .then((data) => {
                if (!cancelled) {
                    setUniforms(data);
                    setError(null);
                }
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
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

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-tshirt"></i> Uniform Catalog
                    </h2>
                    <p>Browse our complete uniform collection with live stock and pricing</p>
                </div>

                <div className="filters">
                    <div className="filter-group">
                        <label>
                            <i className="fas fa-filter"></i> Filter by:
                        </label>
                        <select
                            id="genderFilter"
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value)}
                        >
                            <option value="">All Genders</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Unisex">Unisex</option>
                        </select>
                        <select
                            id="categoryFilter"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
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
                            id="searchInput"
                            placeholder="Search uniforms..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div id="catalogGrid" className="catalog-grid">
                    {loading && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading uniforms…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                            <i className="fas fa-triangle-exclamation" style={{ fontSize: '3rem', color: 'var(--danger-color)' }}></i>
                            <h3>Could not load the catalog</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
                        </div>
                    )}

                    {!loading && !error && filtered.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                            <i className="fas fa-search" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}></i>
                            <h3>No uniforms found</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters</p>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        filtered.map((uniform) => {
                            const totalStock = uniform.sizes.reduce((sum, size) => sum + size.stock, 0);
                            const minPrice = Math.min(...uniform.sizes.map((s) => s.price));
                            const badge = stockBadge(totalStock);

                            return (
                                <div
                                    className="catalog-item"
                                    key={uniform.id}
                                    onClick={() => setSelected(uniform)}
                                >
                                    <div className="item-image">
                                        <i className={`fas ${uniform.icon}`}></i>
                                        <span className={`stock-badge ${badge.className}`}>{badge.label}</span>
                                    </div>
                                    <div className="item-details">
                                        <div className="item-header">
                                            <h3>{uniform.name}</h3>
                                            <span className="item-price">₱{minPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="item-meta">
                                            <span>
                                                <i className="fas fa-tag"></i> {uniform.category}
                                            </span>
                                            <span>
                                                <i className="fas fa-venus-mars"></i> {uniform.gender}
                                            </span>
                                        </div>
                                        <p className="item-description">{uniform.description}</p>
                                        <div className="item-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelected(uniform);
                                                }}
                                            >
                                                <i className="fas fa-eye"></i> View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {selected && <ItemModal uniform={selected} onClose={() => setSelected(null)} />}
        </section>
    );
}
