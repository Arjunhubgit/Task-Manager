import React, { useState, useEffect, useContext } from "react";
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
import DashboardStats from "../../components/cards/DashboardStats";


const Dashboard = () => {
  useUserAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);

  // Updated Neon Color Palette for Charts
  const COLORS = ['#06b6d4', '#f97316', '#f43f5e', '#8b5cf6'];

  const prepareChartData = (data) => {
    const taskDistribution = data?.taskDistribution || null;
    const taskPriorityLevels = data?.taskPriorityLevels || null;

    const taskDistributionData = [
      { status: "Pending", count: taskDistribution?.Pending || 0 },
      { status: "In Progress", count: taskDistribution?.InProgress || 0 },
      { status: "Completed", count: taskDistribution?.Completed || 0 },
    ];
    setPieChartData(taskDistributionData);

    const PriorityLevelData = [
      { priority: "Low", count: taskPriorityLevels?.Low || 0 },
      { priority: "Medium", count: taskPriorityLevels?.Medium || 0 },
      { priority: "High", count: taskPriorityLevels?.High || 0 },
    ];
    setBarChartData(PriorityLevelData);
  };

  const onSeeMore = () => {
    navigate("/admin/tasks");
  };

  const getDashboardData = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_DASHBOARD_DATA);
      if (response.data) {
        setDashboardData(response.data);
        prepareChartData(response.data?.charts || null);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  const statsForHeader = {
    total: dashboardData?.charts?.taskDistribution?.All || 0,
    pending: dashboardData?.charts?.taskDistribution?.Pending || 0,
    inProgress: dashboardData?.charts?.taskDistribution?.InProgress || 0,
    completed: dashboardData?.charts?.taskDistribution?.Completed || 0,
  };

  return (
    <DashboardLayout activeMenu="Dashboard">

      {/* --- FIX: CSS Injection to Hide Scrollbar --- 
         This hides the scrollbar visual from the parent container 
         without needing to edit DashboardLayout.jsx 
      */}
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        ::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        html, body, div {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* Main Content Wrapper */}
      <div className="w-full flex flex-col gap-6 pb-6">

        {/* 1. Dashboard Stats Header */}
        <DashboardStats user={user} stats={statsForHeader} />

        {/* 2. Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pie Chart Card */}
          <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h5 className="text-lg font-semibold text-white">Task Distribution</h5>
            </div>
            <div className="flex justify-center h-[300px]">
              <CustomPieChart data={pieChartData} colors={COLORS} />
            </div>
          </div>

          {/* Bar Chart Card */}
          <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h5 className="text-lg font-semibold text-white">Task Priority Level</h5>
            </div>
            <div className="flex justify-center h-[300px]">
              <CustomBarChart data={barChartData} />
            </div>
          </div>
        </div>

        {/* 3. Recent Tasks Table Section */}
        <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h5 className="text-xl font-bold text-white tracking-tight">Recent Tasks</h5>
            <button
              className="flex items-center gap-2 text-sm text-[#EA8D23] hover:text-white transition-colors"
              onClick={onSeeMore}
            >
              See All <LuArrowRight className="text-lg" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <TaskListTable tableData={dashboardData?.recentTasks || []} />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;