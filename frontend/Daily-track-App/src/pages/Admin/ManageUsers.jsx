import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet, LuUserPlus } from 'react-icons/lu'; // Professional icons
import UserCard from '../../components/cards/UserCard'; 
import Modal from '../../components/Modal'; // Existing Modal component
import Input from '../../components/inputs/input'; // Existing Input component
import AdminInviteManager from "../../components/AdminInviteManager";


const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightUserId, setHighlightUserId] = useState(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // New states for Add Member feature
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  // --- Fetch All Users ---
  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      
      if (response.data) {
        console.log("Fetched users data:", response.data); // Debug log
        setUsers(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load team members.");
      setLoading(false);
    }
  };

  // --- Add Member Logic ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      // Calls the POST /api/users endpoint
      const response = await axiosInstance.post(API_PATHS.USERS.CREATE_USER, formData);
      if (response.data) {
        toast.success(response.data.message || "Member added successfully!");
        setIsAddModalOpen(false);
        setFormData({ name: "", email: "", password: "" }); // Reset form
        getAllUsers(); // Refresh the team list
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to add member.";
      toast.error(msg);
    }
  };

  // --- Delete User Logic ---
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;

    try {
      const response = await axiosInstance.delete(`${API_PATHS.USERS.DELETE_USER}/${userId}`);
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== userId));
      toast.success(response.data.message || "User removed successfully");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to remove user.";
      toast.error(msg);
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
        toast.error("Failed to download report.");
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  // Real-time polling for user status updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      getAllUsers();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const highlightId = searchParams.get('highlight') || location.state?.highlightUserId;
    if (highlightId) {
      setHighlightUserId(highlightId);
      setTimeout(() => {
        const element = document.getElementById(`user-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
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
            
            <div className="flex items-center gap-3">
              {/* --- New Add Member Button --- */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 rounded-xl hover:bg-blue-500/20 transition-all active:scale-95 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
              >
                <LuUserPlus className="text-lg" />
                <span>Add Member</span>
              </button>
              
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl hover:bg-emerald-500/20 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] active:scale-95"
              >
                <LuFileSpreadsheet className="text-lg" />
                <span>Download Report</span>
              </button>
            </div>
        </div>

        {/* --- Add Member Modal --- */}
        <Modal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          title="Add New Team Member"
        >
          <form onSubmit={handleAddMember} className="space-y-4">
            <Input 
              label="Full Name"
              placeholder="Enter user's full name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <Input 
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <Input 
              label="Temporary Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-all active:scale-95"
              >
                Create Account
              </button>
            </div>
          </form>
        </Modal>

        <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-lg mb-6">
            <AdminInviteManager />
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