// src/components/Login/Login.jsx
import { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import { Lock, Mail } from 'lucide-react';
import './Login.css';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
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

    return (
        <div className="login-page">
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Welcome Back</h1>
                    <p>Please sign in to continue</p>
                </div>

                {error && (
                    <div className="error-alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-group">
                            <Mail size={20} className="input-icon" />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-group">
                            <Lock size={20} className="input-icon" />
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Don't have an account? Contact your administrator</p>
                </div>
            </div>
        </div>
        </div>
    );
}

export default Login;
