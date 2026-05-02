/**
 * ProtectedRoute Component
 * Route protection wrapper that checks authentication
 */

import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppSelector } from '../../store/hooks';
import { selectIsAuthenticated, selectIsRehydrated } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const isAuthenticated = useAppSelector((state: any) => selectIsAuthenticated(state));
    const isRehydrated = useAppSelector((state: any) => selectIsRehydrated(state));
    const location = useLocation();

    // Show loading spinner while rehydrating from localStorage
    if (!isRehydrated) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#f0f2f5',
                }}
            >
                <Spin size="large" tip="Loading..." />
            </div>
        );
    }

    // After rehydration, check authentication
    if (!isAuthenticated) {
        // Redirect to login page with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;