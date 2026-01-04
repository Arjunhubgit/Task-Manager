import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { LuFileSpreadsheet } from 'react-icons/lu';
import { Trash2, X, CheckCircle2 } from 'lucide-react';
import TaskStatusTabs from '../../components/TaskStatusTabs';
import TaskCard from '../../components/cards/TaskCards';
import toast from 'react-hot-toast';
// --- NEW IMPORT ---
import UserTaskProfileModal from '../../components/UserTaskProfileModal'; 

const ManageTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [highlightTaskId, setHighlightTaskId] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deletingTasks, setDeletingTasks] = useState(false);
  const longPressTimerRef = useRef(null);

  // --- NEW STATE FOR USER PROFILE MODAL ---
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingUserTasks, setLoadingUserTasks] = useState(false);
  // ----------------------------------------

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // fetch all tasks
  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          status: filterStatus === "All" ? "" : filterStatus,
        },
      });

      setAllTasks(response.data?.tasks?.length > 0 ? response.data.tasks : []);

      // Map statusSummary data with fixed labels and order
      const statusSummary = response.data?.statusSummary || {};
      const statusArray = [{
        label: "All",
        count: statusSummary.all || 0
      }, {
        label: "Pending",
        count: statusSummary.pendingTasks || 0
      }, {
        label: "In Progress",
        count: statusSummary.inProgressTasks || 0
      }, {
        label: "Completed",
        count: statusSummary.completedTasks || 0
      },];

      setTabs(statusArray);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleClick = (taskData) => {
    navigate('/admin/create-task', { state: { taskId: taskData._id } });
  };

  // Handle long-press for task selection
  const handleMouseDown = (taskId) => {
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleTaskSelection(taskId);
    }, 500); // 500ms long press
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Toggle individual task selection
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      return newSelected;
    });
  };

  // Select all tasks
  const selectAllTasks = () => {
    if (selectedTasks.size === allTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(allTasks.map(task => task._id)));
    }
  };

  // Delete selected tasks
  const handleDeleteSelected = async () => {
    if (selectedTasks.size === 0) {
      toast.error('No tasks selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedTasks.size} task(s)?`)) {
      return;
    }

    setDeletingTasks(true);
    try {
      const deletePromises = Array.from(selectedTasks).map(taskId =>
        axiosInstance.delete(`${API_PATHS.TASKS.DELETE_TASK(taskId)}`)
      );

      await Promise.all(deletePromises);
      
      // Remove deleted tasks from the list
      setAllTasks(prevTasks => 
        prevTasks.filter(task => !selectedTasks.has(task._id))
      );
      
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
      toast.success(`${selectedTasks.size} task(s) deleted successfully`);
      
      // Refresh tasks to update counts
      getAllTasks();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      toast.error('Failed to delete tasks');
    } finally {
      setDeletingTasks(false);
    }
  };

  // Cancel selection mode
  const cancelSelection = () => {
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  // --- NEW FUNCTION: HANDLE AVATAR CLICK ---
  const handleAvatarClick = async (user) => {
    if (!user) return;

    setSelectedUser(user);
    setIsModalOpen(true);
    setLoadingUserTasks(true);

    try {
      // Fetch tasks specifically assigned to this user
      // Note: This relies on the backend update we did in Step 1
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: { assignedTo: user._id } 
      });
      setUserTasks(response.data?.tasks || []);
    } catch (error) {
      console.error("Error fetching user tasks", error);
      toast.error("Could not load user history");
      setUserTasks([]);
    } finally {
      setLoadingUserTasks(false);
    }
  };
  // -----------------------------------------

  // download task report
  const handleDownloadReport = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_TASKS, {
        responseType: "blob",
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "task_details.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading expense details:", error);
      toast.error("Failed to download expense details. Please try again.");
    }
  };

  useEffect(() => {
    getAllTasks();
  }, [filterStatus]);

  // Add effect to handle highlighting from search
  useEffect(() => {
    const highlightId = searchParams.get('highlight') || location.state?.highlightTaskId;
    if (highlightId) {
      setHighlightTaskId(highlightId);
      // Auto-scroll to highlighted task after a short delay
      setTimeout(() => {
        const element = document.getElementById(`task-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightTaskId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, location]);

  return (
    <DashboardLayout activeMenu="Manage Tasks">
      
      {/* --- RENDER THE NEW MODAL --- */}
      <UserTaskProfileModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        tasks={userTasks}
        loading={loadingUserTasks}
      />

      <div className="my-5">
        {/* Selection Toolbar */}
        {isSelectionMode && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllTasks}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                {selectedTasks.size === allTasks.length && allTasks.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-400">
                {selectedTasks.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedTasks.size === 0 || deletingTasks}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deletingTasks ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={cancelSelection}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl md:text-xl font-medium">My Tasks</h2>
            <button
              className="flex lg:hidden download-btn"
              onClick={handleDownloadReport}
              title="Download Report"
            >
              <LuFileSpreadsheet className="text-lg" />
              Download Report
            </button>
          </div>
          <div className="flex items-center gap-3">
            <TaskStatusTabs
              tabs={tabs}
              activeTab={filterStatus}
              setActiveTab={setFilterStatus}
            />
            {allTasks?.length > 0 && (
              <button
                className="hidden lg:flex download-btn"
                onClick={handleDownloadReport}
                title="Download Report"
              >
                <LuFileSpreadsheet className="text-lg" />
                Download Report
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {allTasks?.map((item) => (
            <div
              key={item._id}
              id={`task-${item._id}`}
              onMouseDown={() => handleMouseDown(item._id)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={() => handleMouseDown(item._id)}
              onTouchEnd={handleMouseUp}
              onClick={(e) => {
                if (isSelectionMode && e.target.closest('[data-selectable]')) {
                  e.stopPropagation();
                } else if (isSelectionMode) {
                  e.stopPropagation();
                  toggleTaskSelection(item._id);
                }
              }}
              className={`transition-all duration-500 relative cursor-grab active:cursor-grabbing ${
                isSelectionMode ? 'cursor-pointer' : ''
              } ${
                highlightTaskId === item._id
                  ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/50 animate-pulse'
                  : ''
              } ${
                selectedTasks.has(item._id)
                  ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/30 bg-blue-500/10'
                  : ''
              }`}
            >
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <div
                  data-selectable
                  className="absolute top-2 right-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskSelection(item._id);
                  }}
                >
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      selectedTasks.has(item._id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-400 hover:border-blue-400'
                    }`}
                  >
                    {selectedTasks.has(item._id) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              <TaskCard
                title={item.title}
                description={item.description}
                priority={item.priority}
                status={item.status}
                progress={item.progress}
                createdAt={item.createdAt}
                dueDate={item.dueDate}
                
                // CRITICAL CHANGE: Pass the full array, not just images
                assignedTo={item.assignedTo} 
                
                attachmentCount={item.attachments?.length || 0}
                completedTodoCount={item.completedTodoCount || 0}
                todoChecklist={item.todoChecklist || []}
                
                onClick={() => handleClick(item)}
                
                // PASS THE NEW HANDLER
                onAvatarClick={handleAvatarClick} 
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTasks;