import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    sendPasswordResetEmail,
    getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();
    const fileInputRef = useRef(null);

    const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [resetSent, setResetSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const from = location.state?.from || '/';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
        setSuccess(null);
    };

    // Sync mode with URL
    useEffect(() => {
        if (location.pathname === '/signup' || location.pathname === '/register') {
            setMode('register');
        } else if (location.pathname === '/forgot-password') {
            setMode('forgot');
        } else {
            setMode('login');
        }
    }, [location.pathname]);



    // Generate referral code
    const generateReferralCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    // Create or update user in Firestore
    const saveUserToFirestore = async (firebaseUser, additionalData = {}) => {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New user - create document
            const userData = {
                email: firebaseUser.email,
                name: additionalData.name || firebaseUser.displayName || 'User',
                phone: additionalData.phone || '',
                profilePic: firebaseUser.photoURL || '',
                authProvider: additionalData.authProvider || 'email',
                verificationType: 'none',
                isBanned: false,
                referralCode: generateReferralCode(),
                referredBy: null,
                storageUsed: 0,
                dailyUploadCount: 0,
                lastUploadDate: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            await setDoc(userRef, userData);
            return { id: firebaseUser.uid, ...userData, isNewUser: true };
        } else {
            // Existing user - return data
            return { id: firebaseUser.uid, ...userSnap.data(), isNewUser: false };
        }
    };

    // Handle Email/Password Login
    const handleEmailLogin = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const userData = await saveUserToFirestore(userCredential.user);
            setUser(userData);
            navigate(from, { replace: true });
        } catch (err) {
            throw new Error(getFirebaseErrorMessage(err.code));
        }
    };

    // Handle Email/Password Registration
    const handleEmailRegister = async () => {
        if (formData.password !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            const userData = await saveUserToFirestore(userCredential.user, {
                name: formData.name,
                phone: formData.phone,
                authProvider: 'email'
            });

            setUser(userData);
            navigate('/onboarding', { state: { from }, replace: true });
        } catch (err) {
            throw new Error(getFirebaseErrorMessage(err.code));
        }
    };

    // Redirect if already logged in
    useEffect(() => {
        if (auth.currentUser) {
            console.log('User already logged in, redirecting...');
            navigate(from, { replace: true });
        }
    }, [from, navigate]);

    // Handle Google Redirect Result
    useEffect(() => {
        const handleRedirectResultAction = async () => {
            console.log('Checking for redirect result...');
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    console.log('Redirect result found:', result.user.email);
                    setSocialLoading('google');
                    // Check if user existed before
                    const userRef = doc(db, 'users', result.user.uid);
                    const userSnap = await getDoc(userRef);
                    const isNewUser = !userSnap.exists();

                    const userData = await saveUserToFirestore(result.user, {
                        authProvider: 'google'
                    });
                    setUser(userData);

                    if (isNewUser) {
                        console.log('New user, navigating to onboarding');
                        navigate('/onboarding', { state: { from }, replace: true });
                    } else {
                        console.log('Existing user, navigating to', from);
                        navigate(from, { replace: true });
                    }
                } else {
                    console.log('No redirect result found.');
                }
            } catch (err) {
                console.error('Redirect result error:', err);
                setError(getFirebaseErrorMessage(err.code));
            } finally {
                setSocialLoading(null);
            }
        };

        handleRedirectResultAction();
    }, [auth, from, navigate, setUser]);

    // Handle Google Sign-In
    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            setSocialLoading('google');
            console.log('Starting Google Sign-In with Popup...');
            const result = await signInWithPopup(auth, googleProvider);

            if (result) {
                console.log('Google Sign-In successful:', result.user.email);
                const userRef = doc(db, 'users', result.user.uid);
                const userSnap = await getDoc(userRef);
                const isNewUser = !userSnap.exists();

                const userData = await saveUserToFirestore(result.user, {
                    authProvider: 'google'
                });
                setUser(userData);

                if (isNewUser) {
                    navigate('/onboarding', { state: { from }, replace: true });
                } else {
                    navigate(from, { replace: true });
                }
            }
        } catch (err) {
            console.error('Google sign-in error:', err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(getFirebaseErrorMessage(err.code));
            }
        } finally {
            setSocialLoading(null);
        }
    };

    // Handle Forgot Password
    const handleForgotPassword = async () => {
        if (!formData.email) {
            setError('Please enter your email address');
            return;
        }

        try {
            setLoading(true);
            await sendPasswordResetEmail(auth, formData.email);
            setResetSent(true);
            setCountdown(60);
            setError(null);
        } catch (err) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    // Countdown timer for resend
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    // Form submission handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'login') {
                await handleEmailLogin();
            } else if (mode === 'register') {
                await handleEmailRegister();
            } else if (mode === 'forgot') {
                await handleForgotPassword();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Firebase error message mapping
    const getFirebaseErrorMessage = (code) => {
        const messages = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Please enter a valid email address',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/popup-closed-by-user': 'Sign-in popup was closed',
            'auth/account-exists-with-different-credential': 'An account already exists with this email'
        };
        return messages[code] || 'Something went wrong. Please try again.';
    };

    // Switch modes
    const switchMode = (newMode) => {
        setError(null);
        setSuccess(null);
        setResetSent(false);

        if (newMode === 'register') navigate('/signup');
        else if (newMode === 'forgot') navigate('/forgot-password');
        else navigate('/login');
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logo}>
                    <svg viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z"
                            stroke="url(#loginGradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <defs>
                            <linearGradient id="loginGradient" x1="3" y1="6" x2="21" y2="18" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#F09433" />
                                <stop offset="0.25" stopColor="#E6683C" />
                                <stop offset="0.5" stopColor="#DC2743" />
                                <stop offset="0.75" stopColor="#CC2366" />
                                <stop offset="1" stopColor="#BC1888" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className={styles.logoText}>ReelBox</span>
                </div>

                {/* Title */}
                <h1 className={styles.title}>
                    {mode === 'login' && 'Welcome Back'}
                    {mode === 'register' && 'Create Account'}
                    {mode === 'forgot' && (resetSent ? 'Check Your Inbox' : 'Reset Password')}
                </h1>
                <p className={styles.subtitle}>
                    {mode === 'login' && 'Login to continue watching reels'}
                    {mode === 'register' && 'Join to share your moments'}
                    {mode === 'forgot' && (resetSent ? `We've sent a recovery link to ${formData.email}` : 'Enter your email to receive reset link')}
                </p>


                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {mode === 'forgot' && resetSent ? (
                        <div className={styles.resetSentView}>
                            <div className={styles.mailIconWrapper}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <p className={styles.resetMessage}>
                                Didn't receive the email? Check your spam folder or try resending.
                            </p>
                            <button
                                type="button"
                                className={styles.resendBtn}
                                onClick={handleForgotPassword}
                                disabled={countdown > 0 || loading}
                            >
                                {loading ? 'Sending...' : (countdown > 0 ? `Resend in ${countdown}s` : 'Resend Link')}
                            </button>
                            <button
                                type="button"
                                className={styles.backToLoginBtn}
                                onClick={() => switchMode('login')}
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Name (Register only) */}
                            {mode === 'register' && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                            )}

                            {/* Email */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            {/* Phone (Register only - optional) */}
                            {mode === 'register' && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="phone">Phone Number (Optional)</label>
                                    <div className={styles.phoneInput}>
                                        <span className={styles.phonePrefix}>+91</span>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="9876543210"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Password */}
                            {mode !== 'forgot' && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="password">Password</label>
                                    <div className={styles.passwordWrapper}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter password"
                                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            className={styles.visibilityBtn}
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Confirm Password (Register only) */}
                            {mode === 'register' && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <div className={styles.passwordWrapper}>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Confirm password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className={styles.visibilityBtn}
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showConfirmPassword ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Forgot Password Link */}
                            {mode === 'login' && (
                                <div className={styles.forgotPassword}>
                                    <button
                                        type="button"
                                        className={styles.forgotPasswordLink}
                                        onClick={() => switchMode('forgot')}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {/* Error Message above button */}
                            {error && (
                                <div className={styles.error}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner"></div>
                                        {mode === 'login' && 'Logging in...'}
                                        {mode === 'register' && 'Creating account...'}
                                        {mode === 'forgot' && 'Sending...'}
                                    </>
                                ) : (
                                    <>
                                        {mode === 'login' && 'Login'}
                                        {mode === 'register' && 'Create Account'}
                                        {mode === 'forgot' && 'Send Reset Link'}
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </form>

                {/* Social Login (not for forgot password) */}
                {mode !== 'forgot' && (
                    <>
                        <div className={styles.divider}>
                            <span>or continue with</span>
                        </div>

                        <div className={styles.socialButtons}>
                            <button
                                type="button"
                                className={`${styles.socialBtn} ${styles.googleBtn}`}
                                onClick={handleGoogleSignIn}
                                disabled={socialLoading !== null}
                            >
                                {socialLoading === 'google' ? (
                                    <div className="spinner"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                Google
                            </button>
                        </div>
                    </>
                )}

                {/* Toggle Mode */}
                <p className={styles.toggleText}>
                    {mode === 'login' && (
                        <>
                            Don't have an account?{' '}
                            <button type="button" className={styles.toggleBtn} onClick={() => switchMode('register')}>
                                Sign Up
                            </button>
                        </>
                    )}
                    {mode === 'register' && (
                        <>
                            Already have an account?{' '}
                            <button type="button" className={styles.toggleBtn} onClick={() => switchMode('login')}>
                                Login
                            </button>
                        </>
                    )}
                    {mode === 'forgot' && (
                        <>
                            Remember your password?{' '}
                            <button type="button" className={styles.toggleBtn} onClick={() => switchMode('login')}>
                                Login
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default Login;
