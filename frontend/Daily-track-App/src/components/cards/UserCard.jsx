import React from 'react';
import { LuTrash2 } from 'react-icons/lu';

// --- Sub-Component: StatCard ---
const StatCard = ({ label, count, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "In Progress":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case "Completed":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    }
  };

  return (
    <div
      className={`
        flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-300
        hover:scale-105 hover:bg-opacity-20 cursor-default
        ${getStatusColor()}
      `}
    >
      <span className="text-xl font-bold leading-none mb-1">{count}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
};

// --- Main Component: UserCard ---
// We destructure 'onDelete' from props here
const UserCard = ({ userInfo, onDelete }) => {

  const userStatus = userInfo?.status || 'offline';
  
  // Map status to color styles
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return { bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/50', ring: 'ring-emerald-500/30' };
      case 'idle':
        return { bg: 'bg-yellow-500', shadow: 'shadow-yellow-500/50', ring: 'ring-yellow-500/30' };
      case 'dnd':
        return { bg: 'bg-red-500', shadow: 'shadow-red-500/50', ring: 'ring-red-500/30' };
      case 'invisible':
        return { bg: 'bg-gray-500', shadow: 'shadow-gray-500/50', ring: 'ring-gray-500/30' };
      default:
        return { bg: 'bg-gray-600', shadow: 'shadow-gray-600/50', ring: 'ring-gray-600/30' };
    }
  };

  const statusColor = getStatusColor(userStatus);

  return (
    <div
      className="
        relative group flex flex-col p-5 bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/5 rounded-2xl 
        shadow-lg transition-all duration-300
        hover:border-[#EA8D23]/50 hover:shadow-[0_0_20px_rgba(234,141,35,0.1)]
      "
    >

      {/* --- Top Section: Profile Info --- */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">

          {/* Avatar with Status Indicator */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <div className="absolute inset-0 bg-orange-500 rounded-full blur-md opacity-20 group-hover:opacity-50 transition-opacity duration-300"></div>
            <img
              src={userInfo?.profileImageUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
              alt={`${userInfo?.name || "User"}'s avatar`}
              className="w-full h-full rounded-full object-cover border border-white/10 relative z-10"
            />
            {/* Status Indicator Dot */}
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1a1a1a] z-20 ${statusColor.bg} shadow-lg ${statusColor.shadow}`}></div>
          </div>

          {/* User Name & Email */}
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-gray-100 truncate group-hover:text-[#EA8D23] transition-colors duration-300">
              {userInfo?.name || "Unknown User"}
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[180px]" title={userInfo?.email}>
              {userInfo?.email || "No email provided"}
            </p>
          </div>
        </div>

        {/* Role Badge */}
        <span
          className={` absolute top-18
            text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border
            ${userInfo?.role === 'admin'
              ? 'text-[#EA8D23] bg-orange-500/10 border-orange-500/20'
              : 'text-gray-400 bg-white/5 border-white/10'
            }
          `}
        >
          {userInfo?.role || "Member"}
        </span>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="
          absolute top-1 right-1 p-2 z-20
          text-gray-500 bg-black/50 backdrop-blur-sm border border-white/5
          hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20
          rounded-lg transition-all duration-300 
          opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0
        "
          title="Delete User"
        >
          <LuTrash2 size={18} />
        </button>
      </div>

      {/* --- Divider --- */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4"></div>

      {/* --- Bottom Section: Task Statistics --- */}
      <div className="flex items-center gap-3">
        <StatCard
          label="Pending"
          count={userInfo?.pendingTasks || 0}
          status="Pending"
        />
        <StatCard
          label="In Progress"
          count={userInfo?.inProgressTasks || 0}
          status="In Progress"
        />
        <StatCard
          label="Done"
          count={userInfo?.completedTasks || 0}
          status="Completed"
        />
      </div>




    </div>
  );
};

export default UserCard;