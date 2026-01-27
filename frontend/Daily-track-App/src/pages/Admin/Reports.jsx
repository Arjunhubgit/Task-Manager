import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuDownload, LuFilter, LuCalendar,LuClock, LuTrendingUp, LuCircleCheckBig, LuCircleAlert } from "react-icons/lu";
import CustomPieChart from "../../components/charts/CustomPieChart";
import CustomBarChart from "../../components/charts/CustomBarChart";
import DashboardStats from "../../components/cards/DashboardStats";

const Reports = () => {
  const { user } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [teamMembers, setTeamMembers] = useState([]);

  const COLORS = ['#06b6d4', '#f97316', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b'];

  // Fetch dashboard data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_DASHBOARD_DATA);
      if (response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (response.data) {
        setTeamMembers(response.data);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  useEffect(() => {
    fetchReportData();
    fetchTeamMembers();
  }, [dateRange, selectedMember]);

  // Calculate completion rate
  const getCompletionRate = () => {
    const taskDist = dashboardData?.charts?.taskDistribution;
    if (!taskDist) return 0;
    const total = taskDist.All || 0;
    const completed = taskDist.Completed || 0;
    return total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  };

  // Calculate pending overdue (tasks pending for more than 7 days)
  const getPendingOverdue = () => {
    return dashboardData?.charts?.taskDistribution?.Pending || 0;
  };

  // Average tasks per member
  const getAverageTasksPerMember = () => {
    const totalTasks = dashboardData?.charts?.taskDistribution?.All || 0;
    const memberCount = teamMembers.length || 1;
    return (totalTasks / memberCount).toFixed(1);
  };

  // Download report as CSV
  const handleDownloadReport = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `task-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSVContent = () => {
    const taskDist = dashboardData?.charts?.taskDistribution || {};
    const priorityLevels = dashboardData?.charts?.taskPriorityLevels || {};

    let csv = "Task Manager - Analytics Report\n";
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += "TASK DISTRIBUTION\n";
    csv += "Status,Count\n";
    csv += `Pending,${taskDist.Pending || 0}\n`;
    csv += `In Progress,${taskDist.InProgress || 0}\n`;
    csv += `Completed,${taskDist.Completed || 0}\n`;
    csv += `Total,${taskDist.All || 0}\n\n`;

    csv += "PRIORITY DISTRIBUTION\n";
    csv += "Priority,Count\n";
    csv += `Low,${priorityLevels.Low || 0}\n`;
    csv += `Medium,${priorityLevels.Medium || 0}\n`;
    csv += `High,${priorityLevels.High || 0}\n\n`;

    csv += "KEY METRICS\n";
    csv += `Completion Rate,${getCompletionRate()}%\n`;
    csv += `Average Tasks per Member,${getAverageTasksPerMember()}\n`;
    csv += `Team Members,${teamMembers.length}\n`;

    return csv;
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="Reports & Analytics">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading reports...</div>
        </div>
      </DashboardLayout>
    );
  }

  const taskDist = dashboardData?.charts?.taskDistribution || {};
  const priorityLevels = dashboardData?.charts?.taskPriorityLevels || {};

  // Prepare chart data
  const pieChartData = [
    { status: "Pending", count: taskDist.Pending || 0 },
    { status: "In Progress", count: taskDist.InProgress || 0 },
    { status: "Completed", count: taskDist.Completed || 0 },
  ];

  const barChartData = [
    { priority: "Low", count: priorityLevels.Low || 0 },
    { priority: "Medium", count: priorityLevels.Medium || 0 },
    { priority: "High", count: priorityLevels.High || 0 },
  ];

  return (
    <DashboardLayout activeMenu="Reports & Analytics">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-100">Reports & Analytics</h1>
            <p className="text-gray-400 mt-2">Comprehensive task management insights and performance metrics</p>
          </div>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#EA8D23]/10 hover:bg-[#EA8D23]/20 text-[#EA8D23] border border-[#EA8D23]/30 rounded-lg transition-all duration-300 font-medium"
          >
            <LuDownload className="w-5 h-5" />
            Download Report
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <LuCalendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-gray-300 text-sm focus:outline-none flex-1"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <LuFilter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="bg-transparent text-gray-300 text-sm focus:outline-none flex-1"
            >
              <option value="all">All Members</option>
              {teamMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Completion Rate</span>
              <LuCircleCheckBig className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-300">{getCompletionRate()}%</div>
            <p className="text-xs text-gray-500 mt-1">Tasks completed successfully</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Total Tasks</span>
              <LuTrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-300">{taskDist.All || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Across all statuses</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Pending Tasks</span>
              <LuClock className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-3xl font-bold text-rose-300">{getPendingOverdue()}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Avg per Member</span>
              <LuCircleAlert className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-300">{getAverageTasksPerMember()}</div>
            <p className="text-xs text-gray-500 mt-1">Workload distribution</p>
          </div>
        </div>

        {/* Task Status Breakdown Table */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-100 mb-4">Detailed Status Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Count</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { status: "Completed", count: taskDist.Completed, color: "text-green-400" },
                  { status: "In Progress", count: taskDist.InProgress, color: "text-blue-400" },
                  { status: "Pending", count: taskDist.Pending, color: "text-orange-400" },
                ].map((item, idx) => {
                  const percentage = taskDist.All > 0 ? ((item.count / taskDist.All) * 100).toFixed(1) : 0;
                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">{item.status}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-bold ${item.color}`}>{item.count}</span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-400">{percentage}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-white/10 bg-white/5">
                  <td className="py-3 px-4 font-bold text-gray-200">Total</td>
                  <td className="text-center py-3 px-4 font-bold text-[#EA8D23]">{taskDist.All}</td>
                  <td className="text-right py-3 px-4 font-bold text-[#EA8D23]">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-100 mb-4">Summary Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Team Members</p>
              <p className="text-2xl font-bold text-cyan-300">{teamMembers.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Tasks per Member</p>
              <p className="text-2xl font-bold text-orange-300">{getAverageTasksPerMember()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Avg Completion Rate</p>
              <p className="text-2xl font-bold text-green-300">{getCompletionRate()}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">High Priority Tasks</p>
              <p className="text-2xl font-bold text-rose-300">{priorityLevels.High || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
