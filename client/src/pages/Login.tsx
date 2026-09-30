import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { showToast } from '../store/toast';

type Mode = 'login' | 'register';

export default function Login() {
    const [mode, setMode] = useState<Mode>('login');
    const [busy, setBusy] = useState(false);

    const { user, status, login, register } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const redirectTo = (location.state as { from?: string } | null)?.from || '/';

    if (status === 'ready' && user) {
        return <Navigate to={redirectTo} replace />;
    }

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        const ok = await login(String(form.get('identifier') ?? '').trim(), String(form.get('password') ?? ''));
        setBusy(false);
        if (ok) navigate(redirectTo, { replace: true });
    }

    async function handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get('password') ?? '');

        if (password !== String(form.get('confirmPassword') ?? '')) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setBusy(true);
        const ok = await register({
            name: String(form.get('name') ?? '').trim(),
            email: String(form.get('email') ?? '').trim(),
            password,
            studentId: String(form.get('studentId') ?? '').trim() || undefined,
            gender: form.get('gender') as 'Male' | 'Female'
        });
        setBusy(false);
        if (ok) navigate(redirectTo, { replace: true });
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-user-circle"></i> {mode === 'login' ? 'Student Login' : 'Create Your Account'}
                    </h2>
                    <p>
                        {mode === 'login'
                            ? 'Login to access your profile and measurements'
                            : 'Register with your school email and student ID'}
                    </p>
                </div>

                <div className="sizing-container">
                    <div className="method-selector">
                        <button
                            type="button"
                            className={`method-btn${mode === 'login' ? ' active' : ''}`}
                            onClick={() => setMode('login')}
                        >
                            <i className="fas fa-sign-in-alt"></i>
                            <span>Login</span>
                        </button>
                        <button
                            type="button"
                            className={`method-btn${mode === 'register' ? ' active' : ''}`}
                            onClick={() => setMode('register')}
                        >
                            <i className="fas fa-user-plus"></i>
                            <span>Create Account</span>
                        </button>
                    </div>

                    <div className={`measurement-form${mode === 'login' ? ' active' : ''}`}>
                        <div className="form-card">
                            <h3>Welcome back</h3>
                            <form onSubmit={handleLogin}>
                                <div className="form-group">
                                    <label htmlFor="identifier">
                                        <i className="fas fa-user"></i> Email or Student ID
                                    </label>
                                    <input
                                        type="text"
                                        id="identifier"
                                        name="identifier"
                                        required
                                        autoComplete="username"
                                        placeholder="Enter your email or student ID"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="loginPassword">
                                        <i className="fas fa-lock"></i> Password
                                    </label>
                                    <input
                                        type="password"
                                        id="loginPassword"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-large" disabled={busy}>
                                    <i className="fas fa-sign-in-alt"></i> {busy ? 'Signing in…' : 'Login'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className={`measurement-form${mode === 'register' ? ' active' : ''}`}>
                        <div className="form-card">
                            <h3>Register</h3>
                            <form onSubmit={handleRegister}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="regName">
                                            <i className="fas fa-user"></i> Full Name
                                        </label>
                                        <input type="text" id="regName" name="name" required minLength={2} placeholder="Enter full name" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="regStudentId">
                                            <i className="fas fa-id-card"></i> Student ID (Optional)
                                        </label>
                                        <input type="text" id="regStudentId" name="studentId" placeholder="e.g., 2024-10001" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="regEmail">
                                            <i className="fas fa-envelope"></i> School Email
                                        </label>
                                        <input type="email" id="regEmail" name="email" required placeholder="you@bcp.edu.ph" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="regGender">
                                            <i className="fas fa-venus-mars"></i> Gender
                                        </label>
                                        <select id="regGender" name="gender" required defaultValue="">
                                            <option value="" disabled>
                                                Select gender
                                            </option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="regPassword">
                                            <i className="fas fa-lock"></i> Password
                                        </label>
                                        <input
                                            type="password"
                                            id="regPassword"
                                            name="password"
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                            placeholder="At least 8 characters"
                                        />
                                        <small>Minimum 8 characters</small>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="regConfirm">
                                            <i className="fas fa-lock"></i> Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            id="regConfirm"
                                            name="confirmPassword"
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                            placeholder="Repeat your password"
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary btn-large" disabled={busy}>
                                    <i className="fas fa-user-plus"></i> {busy ? 'Creating account…' : 'Create Account'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
