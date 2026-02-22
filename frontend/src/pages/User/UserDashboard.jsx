import React, { useState, useEffect, useContext, useMemo } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../../hooks/useUserAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuArrowRight, LuCircleAlert, LuClock, LuCircleCheckBig, LuActivity } from "react-icons/lu";
import TaskListTable from "../../components/TaskListTable";
import CustomPieChart from "../../components/charts/CustomPieChart";
import CustomBarChart from "../../components/charts/CustomBarChart";
import DashboardStats from "../../components/cards/DashboardStats";
import { motion, AnimatePresence } from "framer-motion";

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 50, damping: 15 }
  },
};

const CHART_COLORS = ['#06b6d4', '#f97316', '#f43f5e', '#8b5cf6'];

const UserDashboard = () => {
  useUserAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Data Logic ---
  const chartData = useMemo(() => {
    const charts = dashboardData?.charts;
    if (!charts) return { pieChartData: [], barChartData: [] };

    const taskDistribution = charts.taskDistribution || {};
    const taskPriorityLevels = charts.taskPriorityLevels || {};

    const pieData = [
      { status: "Pending", count: taskDistribution.Pending || 0 },
      { status: "In Progress", count: taskDistribution.InProgress || 0 },
      { status: "Completed", count: taskDistribution.Completed || 0 },
    ];

    const barData = [
      { priority: "Low", count: taskPriorityLevels.Low || 0 },
      { priority: "Medium", count: taskPriorityLevels.Medium || 0 },
      { priority: "High", count: taskPriorityLevels.High || 0 },
    ];

    const statsForHeader = {
      total: taskDistribution.All || 0,
      pending: taskDistribution.Pending || 0,
      inProgress: taskDistribution.InProgress || 0,
      completed: taskDistribution.Completed || 0,
    };

    return { pieChartData: pieData, barChartData: barData, statsForHeader };
  }, [dashboardData]);

  const onSeeMore = () => navigate("/user/tasks");

  // --- NEW: Navigation Handler with State ---
  const handleTaskClick = (taskId) => {
    // Navigate to MyTasks page and pass the taskId to trigger the "Blowup" effect
    navigate('/user/tasks', { state: { targetTaskId: taskId } });
  };

  const getDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_USER_DASHBOARD_DATA);
      if (response.data) {
        setDashboardData(response.data);
      } else {
        throw new Error("Received empty response data.");
      }
    } catch (err) {
      console.error("Error fetching user dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);
  // --- Loading State ---
  if (isLoading) {
    return (
      <DashboardLayout activeMenu="Dashboard">
        <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-cyan-500/80 animate-pulse font-medium">Synchronizing Dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render ---
  return (
    <DashboardLayout activeMenu="Dashboard">
      <motion.div
        className="max-w-7xl mx-auto space-y-8 pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* 1. Header & Stats */}
        <motion.div variants={itemVariants}>
          <DashboardStats user={user} stats={chartData.statsForHeader} />
        </motion.div>

        {/* 2. Critical Action Center (Urgency) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Overdue Section */}
          <AnimatePresence>
            {dashboardData?.overdueTasksList?.length > 0 && (
              <motion.div 
                variants={itemVariants}
                className="group relative bg-gradient-to-br from-red-900/10 to-red-600/0 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 shadow-xl hover:shadow-red-500/10 transition-all duration-300"
              >
                {/* Glowing Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-red-600/15 rounded-3xl opacity-0 group-hover:opacity-20 blur transition duration-500"></div>
                
                <div className="relative flex items-center gap-3 mb-6">
                  <div className="p-3 bg-red-700/20 rounded-xl text-red-500 animate-pulse">
                    <LuCircleAlert className="text-2xl" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-red-100">Critical Attention Needed</h5>
                    <p className="text-xs text-red-700/90 font-medium">You have {dashboardData.overdueTasksList.length} overdue tasks</p>
                  </div>
                </div>

                <div className="space-y-3 relative">
                  {dashboardData.overdueTasksList.map((task, i) => (
                    <motion.div 
                      key={task._id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleTaskClick(task._id)}
                      className="cursor-pointer bg-[#0a0a0a]/40 border border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 p-4 rounded-xl transition-all group/item flex justify-between items-start"
                    >
                      <div>
                        <h6 className="text-red-50 font-medium text-sm group-hover/item:text-red-400 transition-colors">{task.title}</h6>
                        {task.aiSummary && <p className="text-[11px] text-gray-400 mt-1 italic line-clamp-1">"{task.aiSummary}"</p>}
                      </div>
                      <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded-md border border-red-500/20 whitespace-nowrap">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming Section */}
          <motion.div 
            variants={itemVariants}
            className="group relative bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-lg hover:shadow-cyan-500/5 transition-all"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
               <LuClock className="text-6xl text-cyan-500" />
            </div>

            <div className="relative flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400">
                <LuActivity className="text-2xl" />
              </div>
              <div>
                <h5 className="text-lg font-bold text-white">Upcoming Deadlines</h5>
                <p className="text-xs text-gray-400 font-medium">Tasks due in the next 72 hours</p>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              {dashboardData?.upcomingTasks?.length > 0 ? (
                dashboardData.upcomingTasks.map((task, i) => (
                  <motion.div 
                    key={task._id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    onClick={() => handleTaskClick(task._id)}
                    className="cursor-pointer flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 rounded-xl transition-all"
                  >
                    <div className="max-w-[70%]">
                      <p className="text-gray-200 text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                          task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-green-500'
                        }`}></span>
                        <p className="text-[10px] text-gray-500 truncate">{task.aiSummary || "No AI summary available"}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <span className="text-[10px] text-cyan-200/60 font-mono mb-1">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <LuCircleCheckBig className="text-4xl mb-2 opacity-50" />
                  <p className="text-sm">No immediate deadlines.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* 3. Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <motion.div 
            variants={itemVariants}
            className="bg-[#1a1a1a]/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-lg relative overflow-hidden"
          >
             <div className="flex items-center justify-between mb-6">
                <h5 className="text-lg font-semibold text-white tracking-wide">Task Distribution</h5>
             </div>
             <div className="flex justify-center relative z-10">
                <CustomPieChart data={chartData.pieChartData} colors={CHART_COLORS} />
             </div>
             {/* Decorative BG Blob */}
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div 
            variants={itemVariants}
            className="bg-[#1a1a1a]/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-lg relative overflow-hidden"
          >
             <div className="flex items-center justify-between mb-6">
                <h5 className="text-lg font-semibold text-white tracking-wide">Priority Breakdown</h5>
             </div>
             <div className="flex justify-center relative z-10">
                <CustomBarChart data={chartData.barChartData} />
             </div>
             <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </motion.div>
        </div>

        {/* 4. Recent Tasks Table */}
        <motion.div 
          variants={itemVariants}
          className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full"></div>
              <h5 className="text-2xl font-bold text-white tracking-tight">Recent Activity</h5>
            </div>
            <motion.button 
              whileHover={{ x: 5, color: "#fff" }}
              className="flex items-center gap-2 text-sm text-[#EA8D23] font-medium transition-colors" 
              onClick={onSeeMore}
            >
              View Full History <LuArrowRight className="text-lg" />
            </motion.button>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f]/30">
              <TaskListTable tableData={dashboardData?.recentTasks || []} />
          </div>
        </motion.div>

      </motion.div>
    </DashboardLayout>
  );
};

export default UserDashboard;