// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../api/authService';

function ProtectedRoute({ children }) {
    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />;
    }

    // If there are children, render them, otherwise render the Outlet
    return children ? children : <Outlet />;
}

export default ProtectedRoute;
