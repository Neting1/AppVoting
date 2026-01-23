import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 border border-gray-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-8">
            You do not have permission to access this area. This section is restricted to administrators only.
          </p>
          <Link 
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-8">Twinhill Enterprise Security</p>
      </div>
    );
  }

  return <>{children}</>;
};