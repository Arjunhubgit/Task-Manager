import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { toast } from 'react-hot-toast'; // Used for notifications
import { LuFileText, LuLink, LuClock, LuCalendar, LuUser } from 'react-icons/lu'; // Added necessary icons

// --- Task Status Logic (Reused for consistent styling) ---
const getStatusTagColor = (status) => {
  switch (status) {
    case "In Progress":
      // Vibrant Cyan for In Progress
      return "text-cyan-500 bg-cyan-900/40 border border-cyan-500/20";
    case "Completed":
      // Strong Violet for Completed
      return "text-violet-500 bg-violet-900/40 border border-violet-500/10";
    case "Pending":
      // Amber/Orange for Pending
      return "text-amber-500 bg-amber-900/40 border border-amber-500/10";
    default:
      return "text-gray-400 bg-gray-700/50 border border-gray-600/50";
  }
};
// --- END Status Logic ---

const ViewTaskDetails = () => {
  const { taskId } = useParams(); // Fetches taskId from the route params
  
  // 1. State Management
  const [taskInfo, setTaskInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Data Fetching Logic (Memoized with useCallback)
  const getTaskDetailsByID = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // API call structure matching the video and best practices
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));
      
      if (response.data) { // Backend returns task directly in response.data
        setTaskInfo(response.data);
      } else {
        throw new Error("Task data not found.");
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
      setError("Failed to load task details. Check permissions or task existence.");
      toast.error("Failed to fetch task details.");
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // 3. Handlers
  const handleTodoCheck = useCallback(async (index) => {
    if (!taskInfo || !taskId) return;
    
    // 3a. Optimistic UI Update
    const updatedChecklist = taskInfo.todoChecklist.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    const originalChecklist = taskInfo.todoChecklist;
    setTaskInfo(prev => ({ ...prev, todoChecklist: updatedChecklist }));
    
    try {
      // API call to update the specific task's checklist
      // NOTE: Ensure your API_PATHS.TASKS.UPDATE_TODO_CHECKLIST is defined and functional.
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(taskId), {
        todoChecklist: updatedChecklist,
      });
      toast.success("Checklist updated!");
    } catch (err) {
      // 3b. Pessimistic Rollback
      setTaskInfo(prev => ({ ...prev, todoChecklist: originalChecklist }));
      console.error("Error updating checklist:", err);
      toast.error("Failed to update checklist.");
    }
  }, [taskInfo, taskId]);

  const handleLinkClick = useCallback((link) => {
    if (link) {
      // Securely open link in new tab
      window.open(link, "_blank", "noopener,noreferrer"); 
    }
  }, []);

  // 4. Side Effect (Fetch data on mount or taskId change)
  useEffect(() => {
    getTaskDetailsByID();
  }, [getTaskDetailsByID]);

  // 5. Derived State (Cached UI variables)
  const statusTagClass = useMemo(() => {
    return taskInfo ? getStatusTagColor(taskInfo.status) : '';
  }, [taskInfo]);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // 6. Conditional Render Guards
  if (isLoading && !taskInfo) {
    return (
      <DashboardLayout activeMenu="My Tasks">
        <div className="text-white text-center py-10">Loading Task Details...</div>
      </DashboardLayout>
    );
  }

  if (error || !taskInfo) {
    return (
      <DashboardLayout activeMenu="My Tasks">
        <div className="text-red-500 text-center py-10 border border-red-500/20 p-4 rounded-lg">
          {error || "Task details could not be found."}
        </div>
      </DashboardLayout>
    );
  }

  // 7. Render (Themed and Structured UI)
  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="p-4 md:p-8 bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl my-5">
        
        {/* Title and Status Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 mb-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 md:mb-0">
            {taskInfo.title}
          </h2>
          {/* Status Tag - High Contrast Neon */}
          <div className={`text-xs font-bold py-1 px-4 rounded-full uppercase ${statusTagClass}`}>
            {taskInfo.status}
          </div>
        </div>

        {/* Task Details Grid - 2/3 for content, 1/3 for metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white/80">
          
          {/* Column 1 (2/3 width) - Description and Attachments */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h3 className="text-xl font-semibold mb-3 text-white">Description</h3>
              <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{taskInfo.description}</p>
            </section>
            
            {/* Attachments Section */}
            {taskInfo.attachments && taskInfo.attachments.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-3 text-white flex items-center gap-2">
                   <LuFileText className="text-lg text-[#06b6d4]" /> Task Attachments
                </h3>
                <ul className="space-y-3 bg-gray-800/40 p-4 rounded-lg border border-white/5">
                  {taskInfo.attachments.map((link, index) => (
                    <li key={index} className="flex items-center">
                      <button 
                        onClick={() => handleLinkClick(link)}
                        className="text-sm text-[#f97316] hover:text-white transition-colors flex items-center gap-2 truncate max-w-full"
                      >
                        <LuLink className="min-w-fit" />
                        {link.length > 70 ? `${link.substring(0, 67)}...` : link}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          
          {/* Column 2 (1/3 width) - Metadata and Checklist */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Metadata Card */}
            <div className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md">
                <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <LuCalendar className="text-lg text-amber-500" /> Task Timeline
                </h4>
                <div className="space-y-3 text-sm">
                    <p className="flex justify-between items-center">
                        <strong className="text-white">Priority:</strong> 
                        <span className="capitalize text-lg font-medium text-[#f43f5e]">{taskInfo.priority}</span>
                    </p>
                    <div className="h-px bg-white/10"></div>
                    <p className="flex justify-between items-center">
                        <strong className="text-white flex items-center gap-1"><LuClock /> Due Date:</strong> 
                        <span className="text-white/70">{formatDate(taskInfo.dueDate)}</span>
                    </p>
                    <p className="flex justify-between items-center">
                        <strong className="text-white flex items-center gap-1"><LuUser /> Assigned By:</strong> 
                        <span className="text-white/70">{taskInfo.createdBy?.name || 'Admin'}</span>
                    </p>
                </div>
            </div>

            {/* ToDo Checklist Card */}
            {taskInfo.todoChecklist && taskInfo.todoChecklist.length > 0 && (
              <div className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md">
                <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                     ToDo Checklist
                </h4>
                <ul className="space-y-3">
                  {taskInfo.todoChecklist.map((item, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleTodoCheck(index)}
                        className="form-checkbox h-4 w-4 text-violet-500 bg-gray-700 border-gray-600 rounded cursor-pointer mt-1 flex-shrink-0"
                      />
                      <span className={`ml-3 ${item.completed ? 'line-through text-white/40' : 'text-white/90'}`}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default ViewTaskDetails;