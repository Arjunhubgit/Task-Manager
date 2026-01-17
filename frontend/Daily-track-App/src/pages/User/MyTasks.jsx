import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { LuFileSpreadsheet, LuSearch, LuX } from 'react-icons/lu';
import TaskStatusTabs from '../../components/TaskStatusTabs';
import TaskCard from '../../components/cards/TaskCards';
import { motion, AnimatePresence } from 'framer-motion';

const MyTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [displayedTasks, setDisplayedTasks] = useState([]); // State for filtered view
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [highlightedTaskId, setHighlightedTaskId] = useState(null); // ID for "Blowup" effect

  const navigate = useNavigate();
  const location = useLocation();

  // Fetch all tasks
  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          status: filterStatus === "All" ? "" : filterStatus,
        },
      });

      const tasks = response.data?.tasks?.length > 0 ? response.data.tasks : [];
      setAllTasks(tasks);
      
      // If we aren't currently highlighting a specific task, show all fetched tasks
      if (!highlightedTaskId) {
        setDisplayedTasks(tasks);
      }

      // Map statusSummary data
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

  const handleClick = (taskId) => {
    navigate(`/user/task/${taskId}`);
  };

  // --- NEW: Handle Incoming "Blowup" Request from Dashboard ---
  useEffect(() => {
    // Check if we have a targetTaskId in the navigation state and if tasks are loaded
    if (location.state?.targetTaskId && allTasks.length > 0) {
      const targetId = location.state.targetTaskId;
      
      // Find the specific task
      const targetTask = allTasks.find(t => t._id === targetId);
      
      if (targetTask) {
        setDisplayedTasks([targetTask]); // Filter to show ONLY this task
        setHighlightedTaskId(targetId);  // Trigger the specific animation
      }
      
      // Clear the state so refreshing doesn't re-trigger this
      window.history.replaceState({}, document.title);
    } else if (!highlightedTaskId) {
      // If no highlight is active, ensure displayed tasks match fetched tasks
      setDisplayedTasks(allTasks);
    }
  }, [location.state, allTasks, highlightedTaskId]);

  // Download task report
  const handleDownloadReport = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_TASKS, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "task_details.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
    }
  };

  // Re-fetch when filter tab changes
  useEffect(() => {
    // If a highlight is active, ignore tab changes until user clears search
    if (!highlightedTaskId) {
      getAllTasks();
    }
  }, [filterStatus]);

  // Initial fetch
  useEffect(() => {
    getAllTasks();
  }, []);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="my-5">
        <div className="flex flex-col lg:flex-row lg:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl md:text-xl font-medium">My Tasks</h2>
            
            {/* --- NEW: Clear Search Button (Visible only when filtering) --- */}
            <AnimatePresence>
              {highlightedTaskId && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => {
                    setHighlightedTaskId(null);
                    setDisplayedTasks(allTasks);
                    setFilterStatus("All");
                  }}
                  className="flex items-center gap-2 text-xs font-bold bg-red-500/10 text-red-400 px-4 py-2 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all shadow-lg shadow-red-500/5"
                >
                  <LuX className="text-sm" /> Clear Search & Show All
                </motion.button>
              )}
            </AnimatePresence>

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
            {/* Disable tabs if searching to prevent confusion */}
            <div className={highlightedTaskId ? "opacity-50 pointer-events-none grayscale" : ""}>
               <TaskStatusTabs
                tabs={tabs}
                activeTab={filterStatus}
                setActiveTab={setFilterStatus}
              />
            </div>
           
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
          <AnimatePresence mode='popLayout'>
            {displayedTasks?.map((item) => {
              const isHighlighted = item._id === highlightedTaskId;

              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={isHighlighted ? { scale: 0.5, opacity: 0 } : { opacity: 0, y: 20 }}
                  animate={isHighlighted ? { 
                    scale: 1, 
                    opacity: 1,
                    boxShadow: "0px 0px 50px rgba(6, 182, 212, 0.2)", // Cyan glow
                    zIndex: 50
                  } : { 
                    scale: 1, 
                    opacity: 1,
                    y: 0,
                    zIndex: 1
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: isHighlighted ? 120 : 100, 
                    damping: 15,
                    layout: { duration: 0.3 }
                  }}
                  className={isHighlighted ? "relative md:col-span-2 mx-auto w-full max-w-2xl" : ""}
                >
                  {/* --- NEW: "Found It" Badge --- */}
                  {isHighlighted && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg shadow-cyan-500/20 z-50 flex items-center gap-1 ring-4 ring-[#0a0a0a]"
                    >
                      <LuSearch className="text-sm" /> FOUND IT!
                    </motion.div>
                  )}

                  {/* Highlight Border Effect */}
                  <div className={`relative rounded-2xl transition-all duration-500 ${isHighlighted ? "p-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600" : ""}`}>
                    <div className="bg-[#1a1a1a] rounded-2xl h-full">
                        <TaskCard
                          title={item.title}
                          description={item.description}
                          priority={item.priority}
                          status={item.status}
                          progress={item.progress}
                          createdAt={item.createdAt}
                          dueDate={item.dueDate}
                          assignedTo={item.assignedTo?.map((item) => item.profileImageUrl)}
                          attachmentCount={item.attachments?.length || 0}
                          completedTodoCount={item.completedTodoCount || 0}
                          todoChecklist={item.todoChecklist || []}
                          onClick={() => handleClick(item._id)}
                        />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {displayedTasks.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>No tasks found matching your criteria.</p>
            {highlightedTaskId && (
               <button onClick={() => { setHighlightedTaskId(null); setDisplayedTasks(allTasks); }} className="text-cyan-400 text-sm mt-2 hover:underline">
                 View all tasks
               </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyTasks;