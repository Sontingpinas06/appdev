import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { showToast } from '../store/toast';

type Mode = 'login' | 'register';
type FieldErrors = Partial<Record<'identifier' | 'loginPassword' | 'name' | 'email' | 'password' | 'confirm', string>>;

/** Mirrors the server policy: at least 8 characters containing a letter and a number. */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 0-4 strength score plus a short label for the register meter. */
function passwordStrength(value: string): { score: number; label: string } {
    if (!value) return { score: 0, label: '' };
    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score, label: labels[score] };
}

export default function Login() {
    const [mode, setMode] = useState<Mode>('login');
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');

    const loginFirstField = useRef<HTMLInputElement>(null);
    const regFirstField = useRef<HTMLInputElement>(null);

    const { user, status, login, register } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const redirectTo = (location.state as { from?: string } | null)?.from || '/';

    // Focus the first field of the form the user just switched to.
    useEffect(() => {
        const target = mode === 'login' ? loginFirstField : regFirstField;
        target.current?.focus();
    }, [mode]);

    if (status === 'ready' && user) {
        return <Navigate to={redirectTo} replace />;
    }

    function switchMode(next: Mode) {
        setMode(next);
        setErrors({});
    }

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const identifier = String(form.get('identifier') ?? '').trim();
        const password = String(form.get('password') ?? '');

        const nextErrors: FieldErrors = {};
        if (!identifier) nextErrors.identifier = 'Enter your email or student ID';
        if (!password) nextErrors.loginPassword = 'Enter your password';
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setErrors({});
        setBusy(true);
        const ok = await login(identifier, password);
        setBusy(false);
        if (ok) navigate(redirectTo, { replace: true });
    }

    async function handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const name = String(form.get('name') ?? '').trim();
        const email = String(form.get('email') ?? '').trim();
        const password = String(form.get('password') ?? '');
        const confirm = String(form.get('confirmPassword') ?? '');

        const nextErrors: FieldErrors = {};
        if (name.length < 2) nextErrors.name = 'Enter your full name';
        if (!EMAIL_RULE.test(email)) nextErrors.email = 'Enter a valid school email address';
        if (!PASSWORD_RULE.test(password)) {
            nextErrors.password = 'Use 8+ characters with at least one letter and one number';
        }
        if (confirm !== password) nextErrors.confirm = 'Passwords do not match';
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            showToast('Fix the highlighted fields', 'error');
            return;
        }

        setErrors({});
        setBusy(true);
        const ok = await register({
            name,
            email,
            password,
            studentId: String(form.get('studentId') ?? '').trim() || undefined,
            gender: form.get('gender') as 'Male' | 'Female'
        });
        setBusy(false);
        if (ok) navigate(redirectTo, { replace: true });
    }

    const strength = passwordStrength(regPassword);
    const strengthPct = `${(strength.score / 4) * 100}%`;

    return (
        <section className="section active">
            <div className="container">
                <div className="auth-split">
                    {/* Brand panel */}
                    <aside className="auth-brand" aria-hidden="true">
                        <div className="auth-brand-logo">
                            <i className="fas fa-graduation-cap"></i>
                        </div>
                        <h2>BCP Uniform Guide</h2>
                        <p className="auth-brand-tagline">
                            One account for sizing, ordering and pickup tracking.
                        </p>
                        <ul className="auth-benefits">
                            <li>
                                <i className="fas fa-camera"></i>
                                <div>
                                  <strong>Scan once, order often</strong>
                                  <span>Your measurements drive every recommendation.</span>
                                </div>
                            </li>
                            <li>
                                <i className="fas fa-receipt"></i>
                                <div>
                                  <strong>Track every order</strong>
                                  <span>From awaiting payment to ready for pickup.</span>
                                </div>
                            </li>
                            <li>
                                <i className="fas fa-shield-halved"></i>
                                <div>
                                  <strong>Secure sessions</strong>
                                  <span>Refresh-token rotation with httpOnly cookies.</span>
                                </div>
                            </li>
                        </ul>
                    </aside>

                    {/* Auth panel */}
                    <div className="auth-panel">
                        <div className="section-header auth-heading">
                            <h2>
                                <i className="fas fa-user-circle"></i>{' '}
                                {mode === 'login' ? 'Student Login' : 'Create Your Account'}
                            </h2>
                            <p>
                                {mode === 'login'
                                    ? 'Login to access your profile and measurements'
                                    : 'Register with your school email and student ID'}
                            </p>
                        </div>

                        <div className="sizing-container">
                            <div className="method-selector" role="tablist" aria-label="Sign in or register">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === 'login'}
                                    className={`method-btn${mode === 'login' ? ' active' : ''}`}
                                    onClick={() => switchMode('login')}
                                >
                                    <i className="fas fa-sign-in-alt"></i>
                                    <span>Login</span>
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === 'register'}
                                    className={`method-btn${mode === 'register' ? ' active' : ''}`}
                                    onClick={() => switchMode('register')}
                                >
                                    <i className="fas fa-user-plus"></i>
                                    <span>Create Account</span>
                                </button>
                            </div>

                            <div
                                className={`measurement-form${mode === 'login' ? ' active' : ''}`}
                                role="tabpanel"
                            >
                                <div className="form-card">
                                    <h3>Welcome back</h3>
                                    <form onSubmit={handleLogin} noValidate>
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
                                                ref={loginFirstField}
                                                aria-invalid={Boolean(errors.identifier)}
                                                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                                            />
                                            {errors.identifier && (
                                                <small className="field-error" id="identifier-error" role="alert">
                                                    <i className="fas fa-circle-exclamation"></i> {errors.identifier}
                                                </small>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="loginPassword">
                                                <i className="fas fa-lock"></i> Password
                                            </label>
                                            <div className="password-field">
                                                <input
                                                    type={showLoginPassword ? 'text' : 'password'}
                                                    id="loginPassword"
                                                    name="password"
                                                    required
                                                    autoComplete="current-password"
                                                    placeholder="Enter your password"
                                                    aria-invalid={Boolean(errors.loginPassword)}
                                                    aria-describedby={
                                                        errors.loginPassword ? 'loginPassword-error' : undefined
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle"
                                                    aria-label={
                                                        showLoginPassword ? 'Hide password' : 'Show password'
                                                    }
                                                    aria-pressed={showLoginPassword}
                                                    onClick={() => setShowLoginPassword((v) => !v)}
                                                >
                                                    <i
                                                        className={`fas ${
                                                            showLoginPassword ? 'fa-eye-slash' : 'fa-eye'
                                                        }`}
                                                    ></i>
                                                </button>
                                            </div>
                                            {errors.loginPassword && (
                                                <small className="field-error" id="loginPassword-error" role="alert">
                                                    <i className="fas fa-circle-exclamation"></i>{' '}
                                                    {errors.loginPassword}
                                                </small>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-large btn-block"
                                            disabled={busy}
                                        >
                                            {busy ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i> Signing in…
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-sign-in-alt"></i> Login
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <div
                                className={`measurement-form${mode === 'register' ? ' active' : ''}`}
                                role="tabpanel"
                            >
                                <div className="form-card">
                                    <h3>Register</h3>
                                    <form onSubmit={handleRegister} noValidate>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="regName">
                                                    <i className="fas fa-user"></i> Full Name
                                                </label>
                                                <input
                                                    type="text"
                                                    id="regName"
                                                    name="name"
                                                    required
                                                    minLength={2}
                                                    placeholder="Enter full name"
                                                    ref={regFirstField}
                                                    aria-invalid={Boolean(errors.name)}
                                                    aria-describedby={errors.name ? 'regName-error' : undefined}
                                                />
                                                {errors.name && (
                                                    <small className="field-error" id="regName-error" role="alert">
                                                        <i className="fas fa-circle-exclamation"></i> {errors.name}
                                                    </small>
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="regStudentId">
                                                    <i className="fas fa-id-card"></i> Student ID (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    id="regStudentId"
                                                    name="studentId"
                                                    placeholder="e.g., 2024-10001"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="regEmail">
                                                    <i className="fas fa-envelope"></i> School Email
                                                </label>
                                                <input
                                                    type="email"
                                                    id="regEmail"
                                                    name="email"
                                                    required
                                                    placeholder="you@bcp.edu.ph"
                                                    aria-invalid={Boolean(errors.email)}
                                                    aria-describedby={errors.email ? 'regEmail-error' : undefined}
                                                />
                                                {errors.email && (
                                                    <small className="field-error" id="regEmail-error" role="alert">
                                                        <i className="fas fa-circle-exclamation"></i> {errors.email}
                                                    </small>
                                                )}
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
                                                <div className="password-field">
                                                    <input
                                                        type={showRegPassword ? 'text' : 'password'}
                                                        id="regPassword"
                                                        name="password"
                                                        required
                                                        minLength={8}
                                                        autoComplete="new-password"
                                                        placeholder="At least 8 characters"
                                                        value={regPassword}
                                                        onChange={(e) => setRegPassword(e.target.value)}
                                                        aria-invalid={Boolean(errors.password)}
                                                        aria-describedby={
                                                            errors.password ? 'regPassword-error' : 'strength-meter'
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        aria-label={
                                                            showRegPassword ? 'Hide password' : 'Show password'
                                                        }
                                                        aria-pressed={showRegPassword}
                                                        onClick={() => setShowRegPassword((v) => !v)}
                                                    >
                                                        <i
                                                            className={`fas ${
                                                                showRegPassword ? 'fa-eye-slash' : 'fa-eye'
                                                            }`}
                                                        ></i>
                                                    </button>
                                                </div>
                                                <div className="strength-meter" id="strength-meter">
                                                    <div className="strength-track">
                                                        <span
                                                            className={`strength-fill strength-${strength.score}`}
                                                            style={{ width: strengthPct }}
                                                        ></span>
                                                    </div>
                                                    <small className="strength-label">
                                                        {strength.label
                                                            ? `Strength: ${strength.label}`
                                                            : '8+ characters with a letter and a number'}
                                                    </small>
                                                </div>
                                                {errors.password && (
                                                    <small className="field-error" id="regPassword-error" role="alert">
                                                        <i className="fas fa-circle-exclamation"></i> {errors.password}
                                                    </small>
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="regConfirm">
                                                    <i className="fas fa-lock"></i> Confirm Password
                                                </label>
                                                <div className="password-field">
                                                    <input
                                                        type={showConfirm ? 'text' : 'password'}
                                                        id="regConfirm"
                                                        name="confirmPassword"
                                                        required
                                                        minLength={8}
                                                        autoComplete="new-password"
                                                        placeholder="Repeat your password"
                                                        value={regConfirm}
                                                        onChange={(e) => setRegConfirm(e.target.value)}
                                                        aria-invalid={Boolean(errors.confirm)}
                                                        aria-describedby={
                                                            errors.confirm ? 'regConfirm-error' : undefined
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        aria-label={
                                                            showConfirm ? 'Hide password' : 'Show password'
                                                        }
                                                        aria-pressed={showConfirm}
                                                        onClick={() => setShowConfirm((v) => !v)}
                                                    >
                                                        <i
                                                            className={`fas ${
                                                                showConfirm ? 'fa-eye-slash' : 'fa-eye'
                                                            }`}
                                                        ></i>
                                                    </button>
                                                </div>
                                                {regConfirm && !errors.confirm && regConfirm === regPassword && (
                                                    <small className="field-hint">
                                                        <i className="fas fa-circle-check"></i> Passwords match
                                                    </small>
                                                )}
                                                {errors.confirm && (
                                                    <small className="field-error" id="regConfirm-error" role="alert">
                                                        <i className="fas fa-circle-exclamation"></i> {errors.confirm}
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-large btn-block"
                                            disabled={busy}
                                        >
                                            {busy ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i> Creating account…
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-user-plus"></i> Create Account
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
