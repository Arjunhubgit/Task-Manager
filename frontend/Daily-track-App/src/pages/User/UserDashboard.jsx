import React, { useState, useEffect, useContext, useMemo } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../../hooks/useUserAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuArrowRight } from "react-icons/lu";
import TaskListTable from "../../components/TaskListTable";
import CustomPieChart from "../../components/charts/CustomPieChart";
import CustomBarChart from "../../components/charts/CustomBarChart";
import DashboardStats from "../../components/cards/DashboardStats"; // Re-use the card component

// Constant for Chart Colors - Moved out of the component for performance
const CHART_COLORS = ['#06b6d4', '#f97316', '#f43f5e', '#8b5cf6'];

const UserDashboard = () => {
  // 1. Authentication and Context Hooks
  useUserAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // 2. State Initialization
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 3. Data Preparation Logic (Optimized using useMemo)
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

    // Stats for the header (also using useMemo for derived state)
    const statsForHeader = {
      total: taskDistribution.All || 0,
      pending: taskDistribution.Pending || 0,
      inProgress: taskDistribution.InProgress || 0,
      completed: taskDistribution.Completed || 0,
    };

    return { pieChartData: pieData, barChartData: barData, statsForHeader };
  }, [dashboardData]);

  const onSeeMore = () => {
    // Navigates to the standard user's task list
    navigate("/user/tasks"); 
  };

  // 4. Data Fetching Logic (Robust and Clear)
  const getDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // NOTE: This API path should be updated to a user-specific path (e.g., GET_USER_DASHBOARD_DATA)
      // and the backend should return data relevant ONLY to the authenticated user.
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

  // 5. Side Effect for Data Fetching
  useEffect(() => {
    getDashboardData();
  }, []);

  // 6. Loading and Error States
  if (isLoading) {
    return (
      <DashboardLayout activeMenu="Dashboard">
        <div className="text-white text-center py-10">Loading User Dashboard...</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activeMenu="Dashboard">
        <div className="text-red-500 text-center py-10 border border-red-500/20 p-4 rounded-lg">
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  // 7. Render Logic
  return (
    <DashboardLayout activeMenu="Dashboard">
      
      {/* 1. Dashboard Stats Card */}
      <DashboardStats user={user} stats={chartData.statsForHeader} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Pie Chart Card (Task Distribution) */}
        <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <h5 className="text-lg font-semibold text-white">Your Task Distribution</h5>
          </div>
          <div className="flex justify-center">
             <CustomPieChart data={chartData.pieChartData} colors={CHART_COLORS} />
          </div>
        </div>

        {/* Bar Chart Card (Task Priority Level) */}
        <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <h5 className="text-lg font-semibold text-white">Your Task Priority Level</h5>
          </div>
          <div className="flex justify-center">
            <CustomBarChart data={chartData.barChartData} />
          </div>
        </div>
      </div>

      {/* Recent Tasks Table Section */}
      <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h5 className="text-xl font-bold text-white tracking-tight">Your Recent Tasks</h5>
          <button 
            className="flex items-center gap-2 text-sm text-[#EA8D23] hover:text-white transition-colors" 
            onClick={onSeeMore}
          >
            See All Tasks <LuArrowRight className="text-lg" />
          </button>
        </div>
        <div className="overflow-x-auto">
            <TaskListTable tableData={dashboardData?.recentTasks || []} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;