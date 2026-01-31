

import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context
import UserProvider, { UserContext } from '../src/context/userContext.jsx';

// Components
import PrivateRoute from './Routes/PrivateRoute';

// Auth Pages
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import HostLogin from './pages/Auth/HostLogin';

// Admin Pages
import Dashboard from './pages/Admin/Dashboard';
import ManageTask from './pages/Admin/ManageTask';
import CreateTask from './pages/Admin/CreateTask';
import ManageUser from './pages/Admin/ManageUsers';
import AdminMessages from './pages/Admin/AdminMessages'; // Keeping this as it was in your snippet
import Reports from './pages/Admin/Reports';
import TeamPerformance from './pages/Admin/TeamPerformance';
import AdminNotifications from './pages/Admin/Notifications';

// User Pages
import UserDashboard from './pages/User/UserDashboard';
import MyTasks from './pages/User/MyTasks';
import ViewTaskDetails from './pages/User/ViewTaskDetails';
import UserMessages from './pages/User/UserMessages'; // Keeping this as it was in your snippet
import UserNotifications from './pages/User/Notifications';

// Host Pages
import HostDashboard from './pages/Host/HostDashboard';
import GlobalTaskManager from './pages/Host/GlobalTaskManager';
import GlobalUsers from './pages/Host/GlobalUsers';
import UserDetailPage from './pages/Host/UserDetailPage';
import GodMode from './pages/Host/GodMode';
import HostNotifications from './pages/Host/Notifications';
import ReloadingIcon from './components/ReloadingIcon.jsx';
import AuditLogs from "../src/pages/Host/Auditlogs.jsx";

const App = () => {
  return (
   <UserProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path='login' element={<Login />} />
          <Route path='host-login' element={<HostLogin />} />
          <Route path='signUp' element={<SignUp />} />

          {/* Admin Protected */}
          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route path='admin/dashboard' element={<Dashboard />} />
            {/* THIS ROUTE MUST EXIST FOR THE REDIRECT TO WORK */}
            <Route path='admin/tasks' element={<ManageTask />} />
            <Route path='admin/create-task' element={<CreateTask />} />
            <Route path='admin/users' element={<ManageUser />} />
            <Route path='admin/messages' element={<AdminMessages />} />
            <Route path='admin/reports' element={<Reports />} />
            <Route path='admin/performance' element={<TeamPerformance />} />
            <Route path='admin/notifications' element={<AdminNotifications />} />
          </Route>

          {/* User Protected */}
          <Route element={<PrivateRoute allowedRoles={['member']} />}>
            <Route path='user/dashboard' element={<UserDashboard />} />
            <Route path='user/tasks' element={<MyTasks />} />
            <Route path='user/task/:id' element={<ViewTaskDetails />} />
            <Route path='user/messages' element={<UserMessages />} />
            <Route path='user/notifications' element={<UserNotifications />} />
          </Route>

          {/* Host Protected */}
          <Route element={<PrivateRoute allowedRoles={['host']} />}>
            <Route path='host/dashboard' element={<HostDashboard />} />
            <Route path='host/tasks' element={<GlobalTaskManager />} />
            <Route path='host/users' element={<GlobalUsers />} />
            <Route path='host/users/:id' element={<UserDetailPage />} />
            <Route path='host/god-mode' element={<GodMode />} />
            <Route path='host/notifications' element={<HostNotifications />} />
            <Route path="/host/audit-logs" element={<AuditLogs />} />
          </Route>

          <Route path='/' element={<Root />} />
        </Routes>
      </Router>
      <Toaster />
    </UserProvider>
  );
}

// --- Helper Components ---

const Root = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return <ReloadingIcon isLoading={loading} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Navigate to the appropriate dashboard based on role
  if (user.role === 'host') {
    return <Navigate to="/host/dashboard" replace />;
  }
  return user.role === 'admin' ? 
    <Navigate to="/admin/dashboard" replace /> : 
    <Navigate to="/user/dashboard" replace />;
};

const NotFound = () => (
  <div className="flex items-center justify-center h-screen bg-[#050505] text-white flex-col gap-4">
    <h1 className="text-6xl font-bold text-[#EA8D23]">404</h1>
    <p className="text-xl text-gray-400">Page Not Found</p>
    <Navigate to="/" />
  </div>
);

export default App;
