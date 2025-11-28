import React, { useContext } from 'react';
import {
  BrowserRouter as Router,Route, Routes, Outlet, Navigate
} from 'react-router-dom';
// import PrivateRoute from './Routes/PrivateRoute';
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
import UserProvider, { UserContext } from '../src/context/userContext.jsx'; // Assuming UserProvider is defined in your context folder
import { Toaster } from 'react-hot-toast';
// import Scene3D from './components/Scene3D';



// import Root from './pages/Root';


const App = () => {
  return (
    <UserProvider>
      <div>
        <Router>
          <Routes>
            <Route path='login' element={<Login />} />
            <Route path='signUp' element={<SignUp />} />

            {/* Admin Routes */}
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route path='admin/dashboard' element={<Dashboard />} />
              <Route path='admin/tasks' element={<ManageTask />} />
              <Route path='admin/create-task' element={<CreateTask />} />
              <Route path='admin/users' element={<ManageUser />} />
            </Route>
            {/* User Routes */}
            <Route element={<PrivateRoute allowedRoles={['member']} />}>
              <Route path='user/dashboard' element={<UserDashboard />} />
              <Route path='user/my-tasks' element={<MyTasks />} />
              <Route path="user/task-details/:id" element={<ViewTaskDetails />} />

            </Route>
            {/* Fallback Route */}
            <Route path='/' element={<Root />} />
            {/* <Route path='*' element={<div>Page Not Found</div>} /> */}

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

const Root = () => {
  const { user, loading } = useContext(UserContext);

  // While checking for a user, show a loading message or return null
  if (loading) {
    return <div>Loading...</div>; // Or return null;
  }

  // If done loading and there's no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If a user exists, redirect them to their respective dashboard
  return user.role === 'admin' ? 
    <Navigate to="/admin/dashboard" /> : <Navigate to="/user/dashboard" />;
};