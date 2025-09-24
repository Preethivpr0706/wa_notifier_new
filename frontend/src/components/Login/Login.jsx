// src/components/Login/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import './Login.css';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // If user is already logged in, redirect to dashboard
    useEffect(() => {
        if (authService.isAuthenticated()) {
            navigate('/');
        }
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear any existing tokens before new login attempt
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        setError(null);
        setIsLoading(true);

        try {
            const response = await authService.login(formData);
            
            // Store token and user data
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect to campaigns page
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
            // Clear password field on error
            setFormData(prev => ({
                ...prev,
                password: ''
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-page-container">
                <div className="login-left-section">
                    <div className="login-brand-content">
                        <div className="login-logo-container">
                            <img 
                                src="/images/askmeister.jpg" 
                                alt="Company Logo" 
                                className="login-logo-image"
                            />
                        </div>
                        <div className="login-brand-name-container">
                            <img 
                                src="/images/brand-name.jpg" 
                                alt="Brand Name" 
                                className="login-brand-name-image"
                            />
                        </div>
                        <div className="login-welcome-text">
                            <h2 className="login-welcome-title">Welcome to Your Dashboard</h2>
                            <p className="login-welcome-description">
                                Manage your campaigns, track performance, and grow your business with our comprehensive platform.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="login-right-section">
                    <div className="login-form-card">
                        <div className="login-form-header">
                            <h1 className="login-form-title">Sign In</h1>
                            <p className="login-form-subtitle">Access your account to continue</p>
                        </div>

                        {error && (
                            <div className="login-error-alert">
                                <span className="login-error-text">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-main-form">
                            <div className="login-form-group">
                                <label htmlFor="email" className="login-form-label">
                                    Email Address
                                </label>
                                <div className="login-input-group">
                                    <Mail size={20} className="login-input-icon" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter your email address"
                                        className="login-form-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="login-form-group">
                                <label htmlFor="password" className="login-form-label">
                                    Password
                                </label>
                                <div className="login-input-group login-password-group">
                                    <Lock size={20} className="login-input-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Enter your password"
                                        className="login-form-input login-password-input"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="login-password-toggle"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="login-submit-button"
                                disabled={isLoading}
                            >
                                <span className="login-button-text">
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </span>
                                {isLoading && (
                                    <div className="login-loading-spinner"></div>
                                )}
                            </button>
                        </form>

                        <div className="login-form-footer">
                            <p className="login-footer-text">
                                Don't have an account? 
                                <span className="login-contact-admin">Contact your administrator</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;