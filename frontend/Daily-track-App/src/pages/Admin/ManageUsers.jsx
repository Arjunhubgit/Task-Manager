import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet } from 'react-icons/lu'; 
import UserCard from '../../components/cards/UserCard'; 

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch All Users ---
  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Delete User Logic ---
  const handleDeleteUser = async (userId) => {
    // 1. Confirm before deleting
    if (!window.confirm("Are you sure you want to remove this user? This action cannot be undone.")) {
        return;
    }

    try {
        // 2. Call API (Ensure DELETE_USER is defined in your apiPaths.js)
        // Assuming your API path is something like /api/users/:id
        await axiosInstance.delete(`${API_PATHS.USERS.DELETE_USER}/${userId}`);
        
        // 3. Update UI immediately (Optimistic update)
        setUsers((prevUsers) => prevUsers.filter((user) => user._id !== userId));
        
        toast.success("User removed successfully");
    } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to remove user. Please try again.");
    }
  };

  // --- Download Report Logic ---
  const handleDownloadReport = async () => {
    try {
        const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_USERS, {
            responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "user_details.xlsx"); 
        document.body.appendChild(link);
        link.click();
        
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Report downloaded successfully");
    } catch (error) {
        console.error("Error downloading expense details:", error);
        toast.error("Failed to download expense details.");
    }
  };

  useEffect(() => {
    getAllUsers();
    return () => {}; 
  }, []);

  return (
    <DashboardLayout activeMenu="Team Members">
      <div className="my-5">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Team Members</h2>
                <p className="text-sm text-gray-400 mt-1">Manage your team and view their task progress.</p>
            </div>
            
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl hover:bg-emerald-500/20 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] active:scale-95"
            >
              <LuFileSpreadsheet className="text-lg" />
              <span>Download Report</span>
            </button>
        </div>

        {/* --- Content Grid --- */}
        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse"></div>
              ))}
           </div>
        ) : users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <UserCard 
                key={user._id} 
                userInfo={user} 
                onDelete={() => handleDeleteUser(user._id)} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
             <div className="text-6xl mb-4 grayscale">👥</div>
             <p className="text-gray-400 text-lg">No team members found.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ManageUsers;