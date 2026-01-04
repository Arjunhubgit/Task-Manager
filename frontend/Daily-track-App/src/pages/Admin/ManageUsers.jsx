import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet } from 'react-icons/lu'; 
import UserCard from '../../components/cards/UserCard'; 

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightUserId, setHighlightUserId] = useState(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();

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
  if (!window.confirm("Are you sure you want to remove this user?")) return;

  try {
    // 1. Call API first
    const response = await axiosInstance.delete(`${API_PATHS.USERS.DELETE_USER}/${userId}`);
    
    // 2. Only if successful, remove from UI
    setUsers((prevUsers) => prevUsers.filter((user) => user._id !== userId));
    toast.success(response.data.message || "User removed successfully");
    
  } catch (error) {
    // 3. Catch the 404 error from the backend and show the specific message
    const msg = error.response?.data?.message || "Failed to remove user.";
    toast.error(msg);
    
    // Refresh list to make sure UI is accurate
    getAllUsers();
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

  // Add effect to handle highlighting from search
  useEffect(() => {
    const highlightId = searchParams.get('highlight') || location.state?.highlightUserId;
    if (highlightId) {
      setHighlightUserId(highlightId);
      // Auto-scroll to highlighted user after a short delay
      setTimeout(() => {
        const element = document.getElementById(`user-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightUserId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, location]);

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
              <div
                key={user._id}
                id={`user-${user._id}`}
                className={`transition-all duration-500 ${
                  highlightUserId === user._id
                    ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/50 animate-pulse'
                    : ''
                }`}
              >
                <UserCard 
                  userInfo={user} 
                  onDelete={() => handleDeleteUser(user._id)} 
                />
              </div>
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