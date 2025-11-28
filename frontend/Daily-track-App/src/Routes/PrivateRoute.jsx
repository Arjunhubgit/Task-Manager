// PrivateRoute.jsx (Corrected Code)

import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserContext } from '../context/UserContext'; // Import your UserContext

const PrivateRoute = ({ allowedRoles }) => {
  // Use useContext to get the user and loading state
  const { user, loading } = useContext(UserContext);

  // While checking for a user, show a loading message
  if (loading) {
    return <div>Loading...</div>; 
  }

  // If loading is done and there is no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user exists but their role is not in the allowed list, show an error.
  if (!allowedRoles.includes(user.role)) {
    return <div>You do not have permission to view this page.</div>;
  }

  // If the user is logged in and has the correct role, render the child component.
  return <Outlet />;
};

export default PrivateRoute;