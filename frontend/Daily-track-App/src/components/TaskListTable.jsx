import React from 'react'
// import { FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
// import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const TaskListTable = ({ tableData = [] }) => {
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-500 border border-green-200';
      case 'Pending':
        return 'bg-purple-100 text-purple-500 border border-purple-200';
      case 'In Progress':
        return 'bg-cyan-100 text-cyan-500 border border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-500 border border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-500 border border-red-200';
      case 'Medium':
        return 'bg-orange-100 text-orange-500 border border-orange-200';
      case 'Low':
        return 'bg-green-100 text-green-500 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-500 border border-gray-200';
    }
  };

  return (
    <div className='overflow-x-auto p-0 rounded-lg mt-3'>
      <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
        <thead>
          <tr className='text-left'>
            <th className='px-4 py-3 text-gray-800 font-medium text-[13px]'>Task Name</th>
            <th className='px-4 py-3 text-gray-800 font-medium text-[13px]'>Status</th>
            <th className='px-4 py-3 text-gray-800 font-medium text-[13px]'>Priority</th>
            <th className='px-4 py-3 text-gray-800 font-medium text-[13px] hidden md:table-cell'>Created on</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-500 text-sm">No tasks to display</td>
            </tr>
          ) : (
            tableData.map((task) => (
              <tr key={task._id || task.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                <td className="py-4 px-4 text-gray-700 text-[13px] line-clamp-1 overflow-hidden">{task.title || 'Untitled'}</td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 text-sm rounded inline-block ${getStatusBadgeColor(task.status)}`}>{task.status || 'Unknown'}</span>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 text-sm rounded inline-block ${getPriorityBadgeColor(task.priority)}`}>{task.priority || 'N/A'}</span>
                </td>
                <td className="py-4 px-4 text-gray-700 text-[13px] whitespace-nowrap hidden md:table-cell">{task.createdAt ? moment(task.createdAt).format('YYYY-MM-DD') : 'N/A'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskListTable;