import { useNavigate } from 'react-router-dom';

const stats = [
    { icon: 'fa-tshirt', value: '11', label: 'Uniform Items' },
    { icon: 'fa-boxes', value: '500+', label: 'Items in Stock' },
    { icon: 'fa-users', value: '1000+', label: 'Students Served' },
    { icon: 'fa-star', value: '98%', label: 'Accuracy Rate' }
];

const features = [
    { icon: 'fa-robot', title: 'AI Sizing', text: 'Intelligent size recommendations' },
    { icon: 'fa-box', title: 'Live Stock', text: 'Real-time availability' },
    { icon: 'fa-tag', title: 'Transparent Pricing', text: 'Clear pricing details' }
];

export default function Home() {
    const navigate = useNavigate();

    return (
        <section className="section active">
            <div className="container">
                <div className="hero">
                    <div className="hero-content">
                        <h1>Welcome to BCP Uniform Guide</h1>
                        <p className="hero-subtitle">AI-Powered Body Scan Sizing for Perfect Fit</p>
                        <p className="hero-description">
                            Get precise size recommendations using our advanced AI technology. Simply enter
                            your measurements or upload a photo for instant sizing suggestions.
                        </p>
                        <div className="hero-buttons">
                            <button className="btn btn-primary" onClick={() => navigate('/sizing')}>
                                <i className="fas fa-camera"></i> Start Body Scan
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/catalog')}>
                                <i className="fas fa-tshirt"></i> Browse Catalog
                            </button>
                        </div>
                    </div>
                    <div className="hero-image">
                        <div className="feature-cards">
                            {features.map((feature) => (
                                <div className="feature-card" key={feature.title}>
                                    <i className={`fas ${feature.icon}`}></i>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

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
        </section>
    );
}
