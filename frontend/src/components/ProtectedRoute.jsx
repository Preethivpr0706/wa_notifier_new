// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../api/authService';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  useEffect(() => {
    // Check authentication status when component mounts
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;