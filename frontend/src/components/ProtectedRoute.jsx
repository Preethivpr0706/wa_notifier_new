// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../api/authService';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Initial check
        const checkAuth = () => {
            const authenticated = authService.isAuthenticated();
            setIsAuthenticated(authenticated);
            setIsLoading(false);
        };

        checkAuth();

        // Listen for storage changes (for multi-tab scenarios)
        const handleStorageChange = (e) => {
            if (e.key === 'token' || e.key === null) { // null means localStorage.clear() was called
                checkAuth();
            }
        };

        // Listen for custom auth events
        const handleAuthLogout = () => {
            setIsAuthenticated(false);
        };

        // Add event listeners
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth:logout', handleAuthLogout);

        // Cleanup
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth:logout', handleAuthLogout);
        };
    }, []);

    // Optional: Show loading state
    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />;
    }

    return children ? children : <Outlet />;
}

export default ProtectedRoute; 