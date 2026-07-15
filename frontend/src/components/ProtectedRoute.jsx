import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ user, requiredRole, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
