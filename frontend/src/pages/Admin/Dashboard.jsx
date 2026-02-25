import React, { useState, useEffect, useContext, useMemo } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../../hooks/useUserAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import {
  LuArrowRight,
  LuCalendarDays,
  LuCheckCheck,
  LuClipboardList,
  LuDownload,
  LuFilter,
  LuSearch,
  LuTrendingUp,
  LuUser,
} from "react-icons/lu";
import TaskListTable from "../../components/TaskListTable";
import CustomPieChart from "../../components/charts/CustomPieChart";
import CustomBarChart from "../../components/charts/CustomBarChart";
import DashboardStats from "../../components/cards/DashboardStats";

const ACTIVITY_WINDOWS = {
  daily: { label: "Daily", hint: "Last 24 hours", durationMs: 24 * 60 * 60 * 1000 },
  weekly: { label: "Weekly", hint: "Last 7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
  monthly: { label: "Monthly", hint: "Last 30 days", durationMs: 30 * 24 * 60 * 60 * 1000 },
};

const ACTIVITY_FILTERS = [
  { value: "all", label: "All Events" },
  { value: "assigned", label: "Assigned" },
  { value: "completed", label: "Completed" },
];

const formatActivityTimestamp = (timestamp) => {
  if (!timestamp) return "-";

  return new Date(timestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeCsvValue = (value = "") => `"${String(value ?? "").replace(/"/g, '""')}"`;

const Dashboard = () => {
  useUserAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);

  const [activityTasks, setActivityTasks] = useState([]);
  const [activityWindow, setActivityWindow] = useState("daily");
  const [activityType, setActivityType] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");
  const [visibleActivityRows, setVisibleActivityRows] = useState(8);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  // Updated Neon Color Palette for Charts
  const COLORS = ["#06b6d4", "#f97316", "#f43f5e", "#8b5cf6"];

  const prepareChartData = (data) => {
    const taskDistribution = data?.taskDistribution || null;
    const taskPriorityLevels = data?.taskPriorityLevels || null;

    const taskDistributionData = [
      { status: "Pending", count: taskDistribution?.Pending || 0 },
      { status: "In Progress", count: taskDistribution?.InProgress || 0 },
      { status: "Completed", count: taskDistribution?.Completed || 0 },
    ];
    setPieChartData(taskDistributionData);

    const priorityLevelData = [
      { priority: "Low", count: taskPriorityLevels?.Low || 0 },
      { priority: "Medium", count: taskPriorityLevels?.Medium || 0 },
      { priority: "High", count: taskPriorityLevels?.High || 0 },
    ];
    setBarChartData(priorityLevelData);
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

  const getTaskActivityData = async () => {
    setIsActivityLoading(true);
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS);
      if (response?.data?.tasks) {
        setActivityTasks(response.data.tasks);
      }
    } catch (error) {
      console.error("Error fetching task activity:", error);
    } finally {
      setIsActivityLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();
    getTaskActivityData();
  }, []);

  useEffect(() => {
    setVisibleActivityRows(8);
  }, [activityWindow, activityType, activitySearch]);

  const scopedActivityEvents = useMemo(() => {
    const now = Date.now();
    const durationMs = ACTIVITY_WINDOWS[activityWindow]?.durationMs || ACTIVITY_WINDOWS.daily.durationMs;
    const windowStart = now - durationMs;
    const searchQuery = activitySearch.trim().toLowerCase();

    const events = (activityTasks || []).flatMap((task) => {
      const assignees = Array.isArray(task?.assignedTo) && task.assignedTo.length > 0
        ? task.assignedTo
        : [{ _id: "unassigned", name: "Unassigned" }];

      const assignedTimestamp = new Date(task?.createdAt).getTime();
      const completedTimestamp = new Date(task?.updatedAt || task?.createdAt).getTime();

      return assignees.flatMap((assignee, index) => {
        const assigneeId = assignee?._id || `unassigned-${index}`;
        const assigneeName = assignee?.name || "Unknown";
        const baseItem = {
          taskTitle: task?.title || "Untitled",
          userName: assigneeName,
          priority: task?.priority || "Medium",
          status: task?.status || "Pending",
        };

        const taskEvents = [];

        if (Number.isFinite(assignedTimestamp)) {
          taskEvents.push({
            id: `${task?._id || task?.id}-${assigneeId}-assigned`,
            ...baseItem,
            eventType: "assigned",
            eventLabel: "Assigned",
            timestamp: assignedTimestamp,
          });
        }

        if (task?.status === "Completed" && Number.isFinite(completedTimestamp)) {
          taskEvents.push({
            id: `${task?._id || task?.id}-${assigneeId}-completed`,
            ...baseItem,
            eventType: "completed",
            eventLabel: "Completed",
            timestamp: completedTimestamp,
          });
        }

        return taskEvents;
      });
    });

    return events
      .filter((item) => {
        const withinWindow = item.timestamp >= windowStart;
        const matchesSearch =
          !searchQuery ||
          item.taskTitle.toLowerCase().includes(searchQuery) ||
          item.userName.toLowerCase().includes(searchQuery);

        return withinWindow && matchesSearch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activityTasks, activityWindow, activitySearch]);

  const filteredActivityEvents = useMemo(() => {
    if (activityType === "all") return scopedActivityEvents;
    return scopedActivityEvents.filter((item) => item.eventType === activityType);
  }, [scopedActivityEvents, activityType]);

  const activitySummary = useMemo(() => {
    const assignedEvents = scopedActivityEvents.filter((item) => item.eventType === "assigned");
    const completedEvents = scopedActivityEvents.filter((item) => item.eventType === "completed");

    const completedByUser = completedEvents.reduce((acc, item) => {
      acc[item.userName] = (acc[item.userName] || 0) + 1;
      return acc;
    }, {});

    const assignedByUser = assignedEvents.reduce((acc, item) => {
      acc[item.userName] = (acc[item.userName] || 0) + 1;
      return acc;
    }, {});

    const topFinisher = Object.entries(completedByUser).sort((a, b) => b[1] - a[1])[0] || null;
    const topAssignee = Object.entries(assignedByUser).sort((a, b) => b[1] - a[1])[0] || null;

    const assignedCount = assignedEvents.length;
    const completedCount = completedEvents.length;
    const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

    return {
      assignedCount,
      completedCount,
      completionRate,
      topFinisher,
      topAssignee,
    };
  }, [scopedActivityEvents]);

  const visibleActivityEvents = filteredActivityEvents.slice(0, visibleActivityRows);
  const canLoadMoreActivityRows = visibleActivityRows < filteredActivityEvents.length;

  const exportActivityCsv = () => {
    if (!filteredActivityEvents.length) return;

    const header = ["Event", "Task Title", "User", "Task Status", "Priority", "Timestamp"];
    const rows = filteredActivityEvents.map((item) => [
      item.eventLabel,
      item.taskTitle,
      item.userName,
      item.status,
      item.priority,
      formatActivityTimestamp(item.timestamp),
    ]);

    const csvContent = [
      header.map(escapeCsvValue).join(","),
      ...rows.map((row) => row.map(escapeCsvValue).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `task-activity-${activityWindow}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

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

        {/* 3. Activity Intelligence Section */}
        <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6 pb-4 border-b border-white/5">
            <div>
              <h5 className="text-xl font-bold text-white tracking-tight">Task Activity Intelligence</h5>
              <p className="text-sm text-gray-400 mt-1">
                Monitor assigned and completed events by team member and task title.
              </p>
            </div>

            <div className="inline-flex bg-black/40 border border-white/10 rounded-xl p-1 w-full xl:w-auto">
              {Object.entries(ACTIVITY_WINDOWS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setActivityWindow(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activityWindow === key
                      ? "bg-gradient-to-r from-[#EA8D23]/80 to-purple-500/70 text-white shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {value.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-orange-300">Assigned</p>
                <LuClipboardList className="text-orange-300" />
              </div>
              <p className="text-2xl font-bold text-white">{activitySummary.assignedCount}</p>
              <p className="text-xs text-gray-400 mt-1">{ACTIVITY_WINDOWS[activityWindow].hint}</p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Completed</p>
                <LuCheckCheck className="text-emerald-300" />
              </div>
              <p className="text-2xl font-bold text-white">{activitySummary.completedCount}</p>
              <p className="text-xs text-gray-400 mt-1">{ACTIVITY_WINDOWS[activityWindow].hint}</p>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-cyan-300">Completion Rate</p>
                <LuTrendingUp className="text-cyan-300" />
              </div>
              <p className="text-2xl font-bold text-white">{activitySummary.completionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Completed vs assigned</p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-purple-300">Top Finisher</p>
                <LuUser className="text-purple-300" />
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {activitySummary.topFinisher ? activitySummary.topFinisher[0] : "No completions yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1 truncate">
                {activitySummary.topFinisher
                  ? `${activitySummary.topFinisher[1]} completions`
                  : activitySummary.topAssignee
                    ? `Most assigned: ${activitySummary.topAssignee[0]}`
                    : "No activity data"}
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search by task title or member name..."
                className="w-full bg-black/40 border border-white/10 text-gray-200 placeholder:text-gray-500 rounded-xl py-2.5 pl-10 pr-3 outline-none focus:border-[#EA8D23]/70"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <LuFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="bg-black/40 border border-white/10 text-gray-200 rounded-xl py-2.5 pl-10 pr-8 outline-none focus:border-[#EA8D23]/70"
                >
                  {ACTIVITY_FILTERS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0f0f0f]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={exportActivityCsv}
                disabled={!filteredActivityEvents.length}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-gray-200 hover:border-[#EA8D23]/50 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <LuDownload className="text-sm" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="min-w-full bg-[#111111]/60">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-left">
                  <th className="px-5 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Event</th>
                  <th className="px-5 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Task Title</th>
                  <th className="px-5 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Team Member</th>
                  <th className="px-5 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Priority</th>
                  <th className="px-5 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">When</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {isActivityLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                      Loading activity data...
                    </td>
                  </tr>
                ) : visibleActivityEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 text-sm italic">
                      No task activity found for {ACTIVITY_WINDOWS[activityWindow].label.toLowerCase()} view.
                    </td>
                  </tr>
                ) : (
                  visibleActivityEvents.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                            item.eventType === "completed"
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              : "bg-orange-500/10 text-orange-300 border border-orange-500/20"
                          }`}
                        >
                          <LuCalendarDays className="text-xs" />
                          {item.eventLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-200 font-medium max-w-[280px] truncate">
                        {item.taskTitle}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-300">{item.userName}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                            item.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : item.status === "In Progress"
                                ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                            item.priority === "High"
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                              : item.priority === "Medium"
                                ? "bg-orange-500/10 text-orange-300 border-orange-500/20"
                                : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {formatActivityTimestamp(item.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 mt-4 text-xs text-gray-400">
            <p>
              Showing {Math.min(visibleActivityRows, filteredActivityEvents.length)} of {filteredActivityEvents.length} events
            </p>
            {canLoadMoreActivityRows && (
              <button
                onClick={() => setVisibleActivityRows((prev) => prev + 8)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-200 hover:border-[#EA8D23]/60 hover:text-white transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        </div>

        {/* 4. Recent Tasks Table Section */}
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
