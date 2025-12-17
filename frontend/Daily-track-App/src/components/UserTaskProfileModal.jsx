import React from 'react';
import moment from "moment";
import { LuX, LuMail, LuBriefcase, LuCalendarClock } from "react-icons/lu";

const UserTaskProfileModal = ({ isOpen, onClose, user, tasks, loading }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Modal Container */}
      {/* FIX: Added 'h-[85vh]' to force a specific height on desktop so scrolling works */}
      <div className="bg-[#1a1a1a] relative top-10 w-full max-w-4xl h-[85vh] md:h-[80vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fadeIn">
        
        {/* LEFT SIDE: User Profile */}
        {/* FIX: Added 'overflow-y-auto' so profile scrolls on small screens if needed */}
        <div className="w-full md:w-1/3 bg-white/5 p-6 md:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-white/10 relative shrink-0">
             {/* Close Button (Mobile Only) */}
            <button onClick={onClose} className="absolute top-4 left-4 md:hidden text-gray-400 hover:text-white p-2">
                <LuX size={20} />
            </button>

            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#EA8D23] overflow-hidden mb-4 shadow-lg shadow-orange-500/20 shrink-0">
                <img 
                    src={user.profileImageUrl || "https://ui-avatars.com/api/?name=" + user.name} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                />
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-white text-center truncate w-full">{user.name}</h2>
            <div className="flex items-center gap-2 text-gray-400 mt-1 text-sm">
                <LuMail className="shrink-0" />
                <span className="truncate">{user.email}</span>
            </div>
            
            <div className="mt-6 w-full space-y-4">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Role</p>
                    <p className="text-white font-medium capitalize mt-1 flex items-center gap-2">
                        <LuBriefcase className="text-[#EA8D23]" />
                        {user.role || 'Member'}
                    </p>
                </div>
                
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Workload</p>
                    <p className="text-2xl font-bold text-white mt-1">{tasks.length} <span className="text-sm font-normal text-gray-400">Tasks</span></p>
                </div>
            </div>
        </div>

        {/* RIGHT SIDE: Task List */}
        {/* FIX: Added 'min-h-0' and 'overflow-hidden' to ensure the flex child respects parent height */}
        <div className="w-full md:w-2/3 flex flex-col h-full bg-[#121212] min-h-0 overflow-hidden">
             {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <LuCalendarClock className="text-[#EA8D23]" />
                    Assigned Tasks
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                    <LuX size={24} />
                </button>
            </div>

            {/* Scrollable List */}
            {/* FIX: 'overflow-y-auto' combined with 'flex-1' will now work because parent has fixed height/min-h-0 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
                        <div className="w-6 h-6 border-2 border-[#EA8D23] border-t-transparent rounded-full animate-spin"></div>
                        <p>Loading tasks...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                        <LuBriefcase size={40} className="mb-2"/>
                        <p>No tasks assigned to this user.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task._id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-[#EA8D23]/30 transition-all group hover:bg-white/[0.07]">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-white font-medium group-hover:text-[#EA8D23] transition-colors line-clamp-1 mr-2">{task.title}</h4>
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold shrink-0 ${
                                    task.priority === 'High' ? 'bg-red-500/20 text-red-400' : 
                                    task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                }`}>
                                    {task.priority}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm line-clamp-2 mb-3">{task.description}</p>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded ${
                                        task.status === 'Completed' ? 'text-green-400 bg-green-400/10' : 
                                        task.status === 'In Progress' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 bg-gray-400/10'
                                    }`}>
                                        {task.status}
                                    </span>
                                </div>
                                <span className="font-mono">{task.dueDate ? moment(task.dueDate).format("MMM Do") : 'No Due Date'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserTaskProfileModal;