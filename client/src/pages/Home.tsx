import { useNavigate } from 'react-router-dom';

/**
 * Flagship landing page (Phase 8). Honest numbers only: the catalogue really
 * does seed 11 uniforms across 60 size rows, and the app ships exactly two
 * sizing methods and six theme presets.
 */
const stats = [
    { icon: 'fa-tshirt', value: '11', label: 'Uniform items' },
    { icon: 'fa-ruler-combined', value: '60', label: 'Size variants' },
    { icon: 'fa-camera', value: '2', label: 'Ways to get sized' },
    { icon: 'fa-palette', value: '6', label: 'Theme presets' }
];

const steps = [
    {
        icon: 'fa-stopwatch',
        title: 'Enter your measurements',
        text: 'Type your height, weight and key girths - or upload one photo and let the body scan read them for you.'
    },
    {
        icon: 'fa-wand-magic-sparkles',
        title: 'Get an AI size pick',
        text: 'The server scores every size against your body and returns a ranked pick with a confidence rating.'
    },
    {
        icon: 'fa-bag-shopping',
        title: 'Order and pick up',
        text: 'Reserve live stock, pay online or in cash at the counter, and collect your uniform when it is ready.'
    }
];

const features = [
    { icon: 'fa-robot', title: 'AI sizing', text: 'Confidence-scored recommendations for every item, computed on the server.' },
    { icon: 'fa-boxes', title: 'Live stock', text: 'Availability updates the moment an order is placed or cancelled.' },
    { icon: 'fa-tag', title: 'Transparent pricing', text: 'Clear peso pricing on every size - no surprises at the counter.' },
    { icon: 'fa-shield-halved', title: 'Secure accounts', text: 'Sessions with refresh-token rotation and httpOnly cookies.' }
];

export default function Home() {
    const navigate = useNavigate();

    return (
        <section className="section active">
            <div className="container">
                {/* ---- Hero ---- */}
                <div className="hero">
                    <div className="hero-content">
                        <span className="hero-badge">
                            <i className="fas fa-bolt"></i> AI body-scan sizing
                        </span>
                        <h1>
                            The right fit, <span className="text-highlight">before you buy</span>
                        </h1>
                        <p className="hero-subtitle">BCP uniform sizing without the tape-measure guesswork</p>
                        <p className="hero-description">
                            Enter your measurements or upload a photo. Our server compares you against every
                            stocked size and returns a ranked pick you can order in the same click.
                        </p>
                        <div className="hero-buttons">
                            <button className="btn btn-primary btn-large" onClick={() => navigate('/sizing')}>
                                <i className="fas fa-camera"></i> Start Body Scan
                            </button>
                            <button className="btn btn-secondary btn-large" onClick={() => navigate('/catalog')}>
                                <i className="fas fa-tshirt"></i> Browse Catalog
                            </button>
                        </div>
                        <ul className="hero-points">
                            <li>
                                <i className="fas fa-check"></i> No account needed to try a scan
                            </li>
                            <li>
                                <i className="fas fa-check"></i> Live stock before you order
                            </li>
                            <li>
                                <i className="fas fa-check"></i> Pay online or on pickup
                            </li>
                        </ul>
                    </div>

                    <div className="hero-image">
                        <div className="hero-preview" aria-hidden="true">
                            <div className="preview-head">
                                <i className="fas fa-wand-magic-sparkles"></i> Your size pick
                            </div>
                            <div className="preview-body">
                                <div className="preview-thumb">
                                    <i className="fas fa-tshirt"></i>
                                </div>
                                <div className="preview-meta">
                                    <strong>Polo Shirt - White</strong>
                                    <span>Recommended size</span>
                                </div>
                                <span className="size-badge">M</span>
                            </div>
                            <div className="confidence-bar">
                                <div className="confidence-fill" style={{ width: '94%' }}></div>
                                <small>Confidence: 94%</small>
                            </div>
                        </div>
                        <div className="feature-cards">
                            {features.slice(0, 3).map((feature) => (
                                <div className="feature-card" key={feature.title}>
                                    <i className={`fas ${feature.icon}`}></i>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ---- How it works ---- */}
                <div className="how-it-works">
                    <div className="section-header">
                        <h2>
                            <i className="fas fa-route"></i> How it works
                        </h2>
                        <p>Three steps from measurement to pickup.</p>
                    </div>
                    <div className="steps-grid">
                        {steps.map((step, index) => (
                            <article className="step-card" key={step.title}>
                                <span className="step-num">{index + 1}</span>
                                <div className="step-icon">
                                    <i className={`fas ${step.icon}`}></i>
                                </div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </article>
                        ))}
                    </div>
                </div>

                {/* ---- Feature grid ---- */}
                <div className="features-section">
                    <div className="section-header">
                        <h2>
                            <i className="fas fa-star"></i> Built for the whole counter
                        </h2>
                        <p>What students, parents and staff get out of the box.</p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature) => (
                            <div className="feature-card" key={feature.title}>
                                <i className={`fas ${feature.icon}`}></i>
                                <h3>{feature.title}</h3>
                                <p>{feature.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ---- Stats band ---- */}
                <div className="stats-band">
                    <div className="stats-grid">
                        {stats.map((stat) => (
                            <div className="stat-card" key={stat.label}>
                                <i className={`fas ${stat.icon}`}></i>
                                <h3>{stat.value}</h3>
                                <p>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ---- Closing CTA ---- */}
                <div className="cta-band">
                    <h2>Find your size in under a minute</h2>
                    <p>Run a scan, check live stock, and place the order before the queue forms.</p>
                    <div className="cta-actions">
                        <button className="btn btn-on-primary btn-large" onClick={() => navigate('/sizing')}>
                            <i className="fas fa-camera"></i> Start Body Scan
                        </button>
                        <button className="btn btn-ghost btn-large" onClick={() => navigate('/catalog')}>
                            <i className="fas fa-tshirt"></i> Browse Catalog
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
