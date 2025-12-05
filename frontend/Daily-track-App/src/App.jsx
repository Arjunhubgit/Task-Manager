import React, { useContext } from 'react';
import {
  BrowserRouter as Router, Route, Routes, Navigate
} from 'react-router-dom';
import Dashboard from './pages/Admin/Dashboard';
import ManageTask from './pages/Admin/ManageTask';
import CreateTask from './pages/Admin/CreateTask';
import ManageUser from './pages/Admin/ManageUsers';
import UserDashboard from './pages/User/UserDashboard';
import MyTasks from './pages/User/MyTasks';
import ViewTaskDetails from './pages/User/ViewTaskDetails';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import PrivateRoute from './Routes/PrivateRoute';
import UserProvider, { UserContext } from '../src/context/userContext.jsx';
import { Toaster } from 'react-hot-toast';


const App = () => {
  return (
    <UserProvider>
      <div>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path='login' element={<Login />} />
            <Route path='signUp' element={<SignUp />} />

            {/* Admin Routes (Guarded by PrivateRoute) */}
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route path='admin/dashboard' element={<Dashboard />} />
              <Route path='admin/tasks' element={<ManageTask />} />
              <Route path='admin/create-task' element={<CreateTask />} />
              <Route path='admin/users' element={<ManageUser />} />
            </Route>

            {/* User Routes (Guarded by PrivateRoute) */}
            <Route element={<PrivateRoute allowedRoles={['member']} />}>
              <Route path='user/dashboard' element={<UserDashboard />} />
              {/* IMPROVEMENT: Changed path from 'user/my-tasks' to the cleaner 'user/tasks'. 
                This now matches the 'See All' link in UserDashboard.jsx.
              */}
              <Route path='user/tasks' element={<MyTasks />} /> 
              
              {/* IMPROVEMENT: Changed path from 'user/task-details/:id' to the cleaner
                RESTful path 'user/tasks/:taskId'. This improves consistency.
              */}
              <Route path="user/tasks/:taskId" element={<ViewTaskDetails />} /> 

            </Route>

            {/* Root/Fallback Route */}
            <Route path='/' element={<Root />} />
            <Route path='*' element={<NotFound />} /> {/* Added a proper catch-all route */}
          </Routes>
        </Router>
      </div>
      <Toaster 
        toastOptions={{
          className: '',
          style: {
            fontSize: '13px',
            backkground: '#fff'
          },
        }}
      />
    </UserProvider >
  );
}

export default App;

// --- Helper Components ---

const Root = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return <div>Loading user context...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Navigate to the appropriate dashboard based on role
  return user.role === 'admin' ? 
    <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/dashboard" replace />;
};

const NotFound = () => (
  <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-white flex-col">
    <h1 className="text-4xl font-bold text-[#EA8D23]">404</h1>
    <p className="text-lg mt-2">Page Not Found</p>
    <Navigate to="/" />
  </div>
);