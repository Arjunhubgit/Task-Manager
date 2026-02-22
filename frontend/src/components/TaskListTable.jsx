import React from 'react';
import moment from 'moment';

const TaskListTable = ({ tableData = [] }) => {
  // --- Neon Badge Color Helpers ---
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed': 
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      case 'Pending': 
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'In Progress': 
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]';
      default: 
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'High': 
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'Medium': 
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Low': 
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: 
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  return (
    <div className='overflow-x-auto rounded-xl mt-4 border border-white/5'>
      <table className='min-w-full bg-[#1a1a1a]/40 backdrop-blur-md overflow-hidden'>
        {/* --- Table Header --- */}
        <thead className="bg-white/5 border-b border-white/10">
          <tr className='text-left'>
            <th className='px-6 py-4 text-gray-400 font-semibold text-xs uppercase tracking-wider'>Task Name</th>
            <th className='px-6 py-4 text-gray-400 font-semibold text-xs uppercase tracking-wider'>Assigned To</th>
            <th className='px-6 py-4 text-gray-400 font-semibold text-xs uppercase tracking-wider'>Status</th>
            <th className='px-6 py-4 text-gray-400 font-semibold text-xs uppercase tracking-wider'>Priority</th>
            <th className='px-6 py-4 text-gray-400 font-semibold text-xs uppercase tracking-wider hidden md:table-cell'>Created On</th>
          </tr>
        </thead>
        
        {/* --- Table Body --- */}
        <tbody className="divide-y divide-white/5">
          {tableData.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500 text-sm italic">
                No tasks available.
              </td>
            </tr>
          ) : (
            tableData.map((task) => (
              <tr 
                key={task._id || task.id} 
                className="hover:bg-white/5 transition-colors duration-200 group"
              >
                {/* Task Title */}
                <td className="py-4 px-6">
                    <p className="text-gray-200 text-sm font-medium line-clamp-1 max-w-xs group-hover:text-[#EA8D23] transition-colors">
                        {task.title || 'Untitled'}
                    </p>
                </td>
                
                {/* Assigned Users (Dark Avatar Group) */}
                <td className="py-4 px-6">
                    <div className="flex -space-x-3 overflow-hidden">
                        {task.assignedTo && task.assignedTo.length > 0 ? (
                            task.assignedTo.map((user, index) => (
                                <img
                                    key={index}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[#1a1a1a] object-cover bg-gray-800"
                                    src={user.profileImageUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                                    alt={user.name || "User"}
                                    title={user.name} 
                                />
                            ))
                        ) : (
                            <span className="text-xs text-gray-600 italic">Unassigned</span>
                        )}
                    </div>
                </td>

                {/* Status - ADDED 'whitespace-nowrap' HERE */}
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap ${getStatusBadgeColor(task.status)}`}>
                    {task.status || 'Unknown'}
                  </span>
                </td>
                
                {/* Priority */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    {/* Tiny Dot Indicator */}
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        task.priority === 'High' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
                        task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <span className={`text-sm ${
                        task.priority === 'High' ? 'text-rose-400' : 
                        task.priority === 'Medium' ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                        {task.priority || 'Normal'}
                    </span>
                  </div>
                </td>

                {/* Date */}
                <td className="py-4 px-6 text-gray-500 text-xm font-mono whitespace-nowrap hidden md:table-cell">
                    {task.createdAt ? moment(task.createdAt).format('DD-MM-YYYY') : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskListTable;