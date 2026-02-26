import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import {
  LuDownload,
  LuFilter,
  LuCalendar,
  LuClock,
  LuRefreshCcw,
  LuTrendingUp,
  LuCircleCheckBig,
  LuCircleAlert,
  LuUsers,
  LuSparkles,
} from "react-icons/lu";

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time", days: null },
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "This Week", days: 7 },
  { value: "month", label: "This Month", days: 30 },
  { value: "quarter", label: "This Quarter", days: 90 },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEADLINE_RADAR_DAYS = 7;
const BOTTLENECK_AGE_DAYS = 5;
const SLA_RISK_HOURS = 48;
const LIVE_REFRESH_MS = 30000;

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const getAssigneeIds = (assignedTo = []) =>
  Array.isArray(assignedTo) ? assignedTo.map((item) => toId(item)).filter(Boolean) : [];

const extractUsers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
};

const extractTasks = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getRangeStart = (dateRange, now = new Date()) => {
  const selected = DATE_RANGE_OPTIONS.find((item) => item.value === dateRange);
  if (!selected || !selected.days) return null;

  const start = new Date(now);
  if (selected.days === 1) {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  start.setDate(start.getDate() - selected.days + 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getTrendWindows = (dateRange, now = new Date()) => {
  const selected = DATE_RANGE_OPTIONS.find((item) => item.value === dateRange);
  const days = selected?.days || 30;

  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days + 1);
  currentStart.setHours(0, 0, 0, 0);

  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  return {
    currentStart,
    currentEnd: now,
    previousStart,
    previousEnd,
  };
};

const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

const trendValue = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const escapeCsv = (value = "") => `"${String(value ?? "").replace(/"/g, '""')}"`;
const toTimestamp = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};
const getCreatedTimestamp = (task) => toTimestamp(task?.createdAt);
const getCompletedTimestamp = (task) => toTimestamp(task?.completedAt);

const Reports = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const fetchReportsData = useCallback(async (backgroundRefresh = false) => {
    try {
      if (backgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [usersResponse, tasksResponse] = await Promise.all([
        axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS),
        axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS),
      ]);

      setTeamMembers(extractUsers(usersResponse.data));
      setAllTasks(extractTasks(tasksResponse.data));
      setLastUpdatedAt(new Date());
    } catch (fetchError) {
      console.error("Error loading reports data:", fetchError);
      setError("Unable to load report data. Please refresh the page.");
    } finally {
      if (backgroundRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchReportsData(true);
    }, LIVE_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [fetchReportsData]);

  useEffect(() => {
    const handleFocus = () => {
      fetchReportsData(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchReportsData]);

  const rangeStart = useMemo(() => getRangeStart(dateRange), [dateRange]);

  const filteredTasks = useMemo(() => {
    const now = Date.now();
    const startTime = rangeStart ? rangeStart.getTime() : null;

    return allTasks.filter((task) => {
      const createdAt = getCreatedTimestamp(task) ?? now;

      if (startTime && createdAt < startTime) return false;

      if (selectedMember !== "all") {
        const ids = getAssigneeIds(task.assignedTo);
        if (!ids.includes(selectedMember)) return false;
      }

      return true;
    });
  }, [allTasks, rangeStart, selectedMember]);

  const membersInScope = useMemo(() => {
    if (selectedMember !== "all") {
      const selected = teamMembers.find((member) => member._id === selectedMember);
      return selected ? [selected] : [];
    }
    return teamMembers;
  }, [teamMembers, selectedMember]);

  const metrics = useMemo(() => {
    const statusCounts = { Pending: 0, InProgress: 0, Completed: 0, All: filteredTasks.length };

    filteredTasks.forEach((task) => {
      if (task.status === "Pending") statusCounts.Pending += 1;
      if (task.status === "In Progress") statusCounts.InProgress += 1;
      if (task.status === "Completed") statusCounts.Completed += 1;
    });

    const completionRate =
      statusCounts.All > 0 ? (statusCounts.Completed / statusCounts.All) * 100 : 0;

    const now = Date.now();
    const pendingOverdue = filteredTasks.filter(
      (task) =>
        task.status !== "Completed" &&
        task.dueDate &&
        (toTimestamp(task.dueDate) ?? Number.MAX_SAFE_INTEGER) < now
    ).length;

    const avgTasksPerMember =
      membersInScope.length > 0 ? statusCounts.All / membersInScope.length : 0;

    const completedTasks = filteredTasks.filter((task) => task.status === "Completed");
    const completedWithTimestamp = completedTasks.filter((task) => getCompletedTimestamp(task));
    const completedWithDueDate = completedWithTimestamp.filter((task) =>
      Number.isFinite(toTimestamp(task.dueDate))
    );

    const onTimeCompleted = completedWithDueDate.filter((task) => {
      const completedAt = getCompletedTimestamp(task);
      const dueAt = toTimestamp(task.dueDate);
      return Number.isFinite(completedAt) && Number.isFinite(dueAt) && completedAt <= dueAt;
    }).length;

    const onTimeRate =
      completedWithDueDate.length > 0 ? (onTimeCompleted / completedWithDueDate.length) * 100 : 0;

    const highPriorityBacklog = filteredTasks.filter(
      (task) => task.priority === "High" && task.status !== "Completed"
    ).length;

    const resolutionSamples = completedWithTimestamp
      .map((task) => {
        const created = getCreatedTimestamp(task);
        const closed = getCompletedTimestamp(task);
        if (!Number.isFinite(created) || !Number.isFinite(closed) || closed < created) return null;
        return (closed - created) / MS_PER_DAY;
      })
      .filter((value) => Number.isFinite(value));

    const avgResolutionDays =
      resolutionSamples.length > 0
        ? resolutionSamples.reduce((sum, days) => sum + days, 0) / resolutionSamples.length
        : 0;

    const completedTimestampCoverage =
      completedTasks.length > 0 ? (completedWithTimestamp.length / completedTasks.length) * 100 : 0;

    return {
      statusCounts,
      completionRate,
      pendingOverdue,
      avgTasksPerMember,
      onTimeRate,
      highPriorityBacklog,
      avgResolutionDays,
      completedTimestampCoverage,
    };
  }, [filteredTasks, membersInScope]);

  const trendMetrics = useMemo(() => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getTrendWindows(dateRange);
    const rangeDays = Math.max(1, Math.ceil((currentEnd.getTime() - currentStart.getTime()) / MS_PER_DAY));

    const matchesMember = (task) =>
      selectedMember === "all" || getAssigneeIds(task.assignedTo).includes(selectedMember);

    const createdInWindow = (task, start, end) => {
      const createdAt = getCreatedTimestamp(task);
      return Number.isFinite(createdAt) && createdAt >= start.getTime() && createdAt < end.getTime();
    };

    const completedInWindow = (task, start, end) => {
      if (task.status !== "Completed") return false;
      const completedAt = getCompletedTimestamp(task);
      return Number.isFinite(completedAt) && completedAt >= start.getTime() && completedAt < end.getTime();
    };

    const currentCreated = allTasks.filter(
      (task) => matchesMember(task) && createdInWindow(task, currentStart, currentEnd)
    ).length;

    const previousCreated = allTasks.filter(
      (task) => matchesMember(task) && createdInWindow(task, previousStart, previousEnd)
    ).length;

    const currentCompleted = allTasks.filter(
      (task) => matchesMember(task) && completedInWindow(task, currentStart, currentEnd)
    ).length;

    const previousCompleted = allTasks.filter(
      (task) => matchesMember(task) && completedInWindow(task, previousStart, previousEnd)
    ).length;

    return {
      createdTrend: trendValue(currentCreated, previousCreated),
      completedTrend: trendValue(currentCompleted, previousCompleted),
      currentCreated,
      currentCompleted,
      throughputPerDay: currentCompleted / rangeDays,
      rangeDays,
      trendLabel: `${currentStart.toLocaleDateString("en-GB")} - ${currentEnd.toLocaleDateString("en-GB")}`,
    };
  }, [allTasks, dateRange, selectedMember]);

  const leaderboardData = useMemo(() => {
    const searchableMembers = teamMembers.filter((member) => {
      const q = memberSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (member.name || "").toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q)
      );
    });

    const scopedMembers =
      selectedMember === "all"
        ? searchableMembers
        : searchableMembers.filter((member) => member._id === selectedMember);

    return scopedMembers
      .map((member) => {
        const memberTasks = filteredTasks.filter((task) =>
          getAssigneeIds(task.assignedTo).includes(member._id)
        );

        const completed = memberTasks.filter((task) => task.status === "Completed").length;
        const pending = memberTasks.filter((task) => task.status === "Pending").length;
        const inProgress = memberTasks.filter((task) => task.status === "In Progress").length;
        const total = memberTasks.length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return {
          ...member,
          total,
          completed,
          pending,
          inProgress,
          completionRate,
        };
      })
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
        if (b.completed !== a.completed) return b.completed - a.completed;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [teamMembers, filteredTasks, selectedMember, memberSearch]);

  const memberNameMap = useMemo(() => {
    const map = new Map();
    teamMembers.forEach((member) => {
      if (!member?._id) return;
      map.set(String(member._id), member.name || member.email || "Unknown");
    });
    return map;
  }, [teamMembers]);

  const getTaskOwners = useCallback(
    (task) => {
      const assigneeIds = getAssigneeIds(task.assignedTo);
      if (!assigneeIds.length) return "Unassigned";

      const names = assigneeIds.map((id) => memberNameMap.get(id)).filter(Boolean);
      return names.length ? names.join(", ") : "Unknown";
    },
    [memberNameMap]
  );

  const slaMetrics = useMemo(() => {
    const now = Date.now();
    const atRiskThreshold = now + SLA_RISK_HOURS * 60 * 60 * 1000;

    const tasksWithDueDate = filteredTasks.filter((task) => Number.isFinite(toTimestamp(task.dueDate)));

    const completedWithDueDate = tasksWithDueDate.filter(
      (task) => task.status === "Completed" && Number.isFinite(getCompletedTimestamp(task))
    );

    const onTimeCompleted = completedWithDueDate.filter((task) => {
      const completedAt = getCompletedTimestamp(task);
      const dueAt = toTimestamp(task.dueDate);
      return Number.isFinite(completedAt) && completedAt <= dueAt;
    }).length;

    const breachedCompleted = completedWithDueDate.length - onTimeCompleted;

    const openWithDueDate = tasksWithDueDate.filter((task) => task.status !== "Completed");

    const breachedOpen = openWithDueDate.filter((task) => {
      const dueAt = toTimestamp(task.dueDate);
      return Number.isFinite(dueAt) && dueAt < now;
    }).length;

    const atRiskOpen = openWithDueDate.filter((task) => {
      const dueAt = toTimestamp(task.dueDate);
      return Number.isFinite(dueAt) && dueAt >= now && dueAt <= atRiskThreshold;
    }).length;

    return {
      complianceRate:
        completedWithDueDate.length > 0 ? (onTimeCompleted / completedWithDueDate.length) * 100 : 0,
      dueDateCoverage: filteredTasks.length > 0 ? (tasksWithDueDate.length / filteredTasks.length) * 100 : 0,
      openWithDueDate: openWithDueDate.length,
      breachedOpen,
      atRiskOpen,
      breachedCompleted,
    };
  }, [filteredTasks]);

  const deadlineRadarData = useMemo(() => {
    const now = Date.now();
    const horizon = now + DEADLINE_RADAR_DAYS * MS_PER_DAY;
    const priorityRank = { High: 0, Medium: 1, Low: 2 };

    return filteredTasks
      .filter((task) => task.status !== "Completed")
      .map((task) => {
        const dueAt = new Date(task.dueDate).getTime();
        if (!Number.isFinite(dueAt)) return null;
        if (dueAt < now || dueAt > horizon) return null;

        const daysLeft = Math.ceil((dueAt - now) / MS_PER_DAY);

        return {
          id: task._id || task.id || `${task.title || "task"}-${dueAt}`,
          title: task.title || "Untitled task",
          owner: getTaskOwners(task),
          priority: task.priority || "NA",
          dueAt,
          daysLeft,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
        return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
      })
      .slice(0, 10);
  }, [filteredTasks, getTaskOwners]);

  const bottleneckTasks = useMemo(() => {
    const now = Date.now();

    return filteredTasks
      .filter((task) => task.status === "In Progress")
      .map((task) => {
        const createdAt = new Date(task.createdAt).getTime();
        if (!Number.isFinite(createdAt)) return null;

        const ageDays = (now - createdAt) / MS_PER_DAY;
        if (ageDays < BOTTLENECK_AGE_DAYS) return null;

        const dueAt = new Date(task.dueDate).getTime();
        const hasDueDate = Number.isFinite(dueAt);

        return {
          id: task._id || task.id || `${task.title || "task"}-${createdAt}`,
          title: task.title || "Untitled task",
          owner: getTaskOwners(task),
          priority: task.priority || "NA",
          ageDays,
          hasDueDate,
          dueAt: hasDueDate ? dueAt : null,
          overdue: hasDueDate ? dueAt < now : false,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 8);
  }, [filteredTasks, getTaskOwners]);

  const insights = useMemo(() => {
    const list = [];

    if (metrics.completionRate < 50) {
      list.push("Completion rate is below 50%. Consider reducing active WIP or re-prioritizing assignments.");
    }

    if (metrics.pendingOverdue > 0) {
      list.push(`${metrics.pendingOverdue} tasks are overdue. A deadline review can prevent further slippage.`);
    }

    if (metrics.highPriorityBacklog > 0) {
      list.push(
        `${metrics.highPriorityBacklog} high-priority tasks are still open. Escalate blockers for faster closure.`
      );
    }

    if (metrics.onTimeRate > 0 && metrics.onTimeRate < 70) {
      list.push("On-time completion is under 70%. Add milestone checkpoints to improve delivery predictability.");
    }

    if (slaMetrics.atRiskOpen > 0) {
      list.push(
        `${slaMetrics.atRiskOpen} active tasks are due within ${SLA_RISK_HOURS} hours. Prioritize these to prevent SLA breach.`
      );
    }

    if (bottleneckTasks.length > 0) {
      list.push(
        `${bottleneckTasks.length} in-progress tasks are older than ${BOTTLENECK_AGE_DAYS} days. Review blockers and ownership.`
      );
    }

    if (trendMetrics.completedTrend > 0) {
      list.push(`Completed work is trending up by ${pct(trendMetrics.completedTrend)} versus the previous period.`);
    }

    if (trendMetrics.throughputPerDay > 0) {
      list.push(
        `Current throughput is ${trendMetrics.throughputPerDay.toFixed(2)} completed task(s) per day over the selected window.`
      );
    }

    if (metrics.completedTimestampCoverage < 100 && metrics.statusCounts.Completed > 0) {
      list.push(
        `Data quality note: ${pct(metrics.completedTimestampCoverage)} of completed tasks include a reliable completion timestamp.`
      );
    }

    if (list.length === 0) {
      list.push("Team performance is stable. Keep current allocation and continue monitoring trend drift.");
    }

    return list;
  }, [metrics, trendMetrics, slaMetrics.atRiskOpen, bottleneckTasks.length]);

  const handleDownloadCSV = () => {
    const header = ["Metric", "Value"];
    const metricRows = [
      ["Date Range", DATE_RANGE_OPTIONS.find((item) => item.value === dateRange)?.label || "All Time"],
      [
        "Selected Member",
        selectedMember === "all"
          ? "All Members"
          : teamMembers.find((member) => member._id === selectedMember)?.name || "Unknown",
      ],
      ["Total Tasks", metrics.statusCounts.All],
      ["Completed", metrics.statusCounts.Completed],
      ["In Progress", metrics.statusCounts.InProgress],
      ["Pending", metrics.statusCounts.Pending],
      ["Completion Rate", pct(metrics.completionRate)],
      ["Throughput / Day", trendMetrics.throughputPerDay.toFixed(2)],
      ["On-time Rate", pct(metrics.onTimeRate)],
      ["SLA Compliance", pct(slaMetrics.complianceRate)],
      ["Completed Timestamp Coverage", pct(metrics.completedTimestampCoverage)],
      [`SLA At Risk (${SLA_RISK_HOURS}h)`, slaMetrics.atRiskOpen],
      ["SLA Breached (Open)", slaMetrics.breachedOpen],
      [`Bottlenecks (${BOTTLENECK_AGE_DAYS}d+)`, bottleneckTasks.length],
      [`Due in ${DEADLINE_RADAR_DAYS} days`, deadlineRadarData.length],
      ["Overdue Tasks", metrics.pendingOverdue],
      ["High Priority Backlog", metrics.highPriorityBacklog],
      ["Avg Resolution (days)", metrics.avgResolutionDays.toFixed(1)],
    ];

    const memberHeader = ["Member", "Total", "Completed", "In Progress", "Pending", "Completion Rate"];
    const memberRows = leaderboardData.slice(0, 10).map((member) => [
      member.name,
      member.total,
      member.completed,
      member.inProgress,
      member.pending,
      pct(member.completionRate),
    ]);

    const csv = [
      "Task Manager - Analytics Report",
      `Generated,${formatDateTime(new Date())}`,
      `Last Synced,${lastUpdatedAt ? formatDateTime(lastUpdatedAt) : "N/A"}`,
      "",
      header.map(escapeCsv).join(","),
      ...metricRows.map((row) => row.map(escapeCsv).join(",")),
      "",
      memberHeader.map(escapeCsv).join(","),
      ...memberRows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `task-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      lastSyncedAt: lastUpdatedAt ? lastUpdatedAt.toISOString() : null,
      refreshIntervalMs: LIVE_REFRESH_MS,
      filters: {
        dateRange,
        selectedMember,
      },
      metrics,
      trends: trendMetrics,
      sla: slaMetrics,
      bottlenecks: bottleneckTasks,
      dueSoon: deadlineRadarData,
      leaderboard: leaderboardData,
      insights,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `task-report-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setDateRange("all");
    setSelectedMember("all");
    setMemberSearch("");
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

  return (
    <DashboardLayout activeMenu="Reports & Analytics">
      <div className="space-y-6 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-100">Reports & Analytics</h1>
            <p className="text-gray-400 mt-2">Comprehensive task management insights and performance metrics</p>
            <p className="text-xs text-gray-500 mt-2">Trend window: {trendMetrics.trendLabel}</p>
            <p className="text-xs text-gray-500 mt-1">
              Live data: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : "Waiting for first sync"} | Auto refresh every{" "}
              {Math.round(LIVE_REFRESH_MS / 1000)}s
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchReportsData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:border-white/20 transition disabled:opacity-60"
            >
              <LuRefreshCcw className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Syncing..." : "Refresh"}
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#EA8D23]/10 hover:bg-[#EA8D23]/20 text-[#EA8D23] border border-[#EA8D23]/30 rounded-lg transition-all duration-300 font-medium"
            >
              <LuDownload className="w-5 h-5" />
              CSV
            </button>
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition-all duration-300 font-medium"
            >
              <LuDownload className="w-5 h-5" />
              JSON
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <LuCalendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-gray-300 text-sm focus:outline-none flex-1"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#101010]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <LuFilter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="bg-transparent text-gray-300 text-sm focus:outline-none flex-1"
            >
              <option value="all" className="bg-[#101010]">
                All Members
              </option>
              {teamMembers.map((member) => (
                <option key={member._id} value={member._id} className="bg-[#101010]">
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <LuUsers className="w-5 h-5 text-gray-400" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search member in leaderboard"
              className="bg-transparent text-gray-300 text-sm focus:outline-none flex-1"
            />
          </div>

          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:border-white/20 transition"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Completion Rate</span>
              <LuCircleCheckBig className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-300">{pct(metrics.completionRate)}</div>
            <p className="text-xs text-gray-500 mt-1">Tasks completed successfully</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Total Tasks</span>
              <LuTrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-300">{metrics.statusCounts.All}</div>
            <p className="text-xs text-gray-500 mt-1">Across filtered scope</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Throughput / Day</span>
              <LuTrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-blue-300">{trendMetrics.throughputPerDay.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Completed tasks per day</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Overdue Open</span>
              <LuClock className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-3xl font-bold text-rose-300">{metrics.pendingOverdue}</div>
            <p className="text-xs text-gray-500 mt-1">Missed due dates</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Avg per Member</span>
              <LuCircleAlert className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-300">{metrics.avgTasksPerMember.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-1">Workload distribution</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">On-time Rate</span>
              <LuCircleCheckBig className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-300">{pct(metrics.onTimeRate)}</div>
            <p className="text-xs text-gray-500 mt-1">Completed before due date</p>
          </div>

          <div className="bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-500/5 border border-fuchsia-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">High Backlog</span>
              <LuCircleAlert className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div className="text-3xl font-bold text-fuchsia-300">{metrics.highPriorityBacklog}</div>
            <p className="text-xs text-gray-500 mt-1">High priority pending/in-progress</p>
          </div>

          <div className="bg-gradient-to-br from-lime-500/10 to-lime-500/5 border border-lime-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Data Reliability</span>
              <LuCircleCheckBig className="w-5 h-5 text-lime-400" />
            </div>
            <div className="text-3xl font-bold text-lime-300">{pct(metrics.completedTimestampCoverage)}</div>
            <p className="text-xs text-gray-500 mt-1">Completed tasks with reliable timestamp</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Created Tasks Trend</p>
            <p className="text-2xl font-bold text-gray-100">{pct(trendMetrics.createdTrend)}</p>
            <p className="text-xs text-gray-500 mt-1">Current: {trendMetrics.currentCreated} tasks</p>
          </div>
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Completed Tasks Trend</p>
            <p className="text-2xl font-bold text-gray-100">{pct(trendMetrics.completedTrend)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Current: {trendMetrics.currentCompleted} tasks ({trendMetrics.throughputPerDay.toFixed(2)}/day)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">SLA Compliance</h2>
            <p className="text-3xl font-bold text-emerald-300">{pct(slaMetrics.complianceRate)}</p>
            <p className="text-xs text-gray-400 mt-1">Based on completed tasks with due dates</p>
            <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.max(0, Math.min(100, slaMetrics.complianceRate))}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-gray-400 text-xs">At Risk (48h)</p>
                <p className="text-amber-300 font-semibold">{slaMetrics.atRiskOpen}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-gray-400 text-xs">Breached Open</p>
                <p className="text-rose-300 font-semibold">{slaMetrics.breachedOpen}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 col-span-2">
                <p className="text-gray-400 text-xs">Due Date Coverage</p>
                <p className="text-cyan-300 font-semibold">{pct(slaMetrics.dueDateCoverage)}</p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">
              Upcoming Deadline Radar ({DEADLINE_RADAR_DAYS} days)
            </h2>
            <div className="space-y-2">
              {deadlineRadarData.map((task) => (
                <div
                  key={task.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <div className="md:col-span-5">
                    <p className="text-sm text-gray-200">{task.title}</p>
                    <p className="text-xs text-gray-500 truncate">{task.owner}</p>
                  </div>
                  <div className="md:col-span-2 text-xs">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full border ${
                        task.priority === "High"
                          ? "text-rose-300 border-rose-500/30 bg-rose-500/10"
                          : task.priority === "Medium"
                            ? "text-orange-300 border-orange-500/30 bg-orange-500/10"
                            : "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div className="md:col-span-3 text-xs text-gray-400">Due: {formatDate(task.dueAt)}</div>
                  <div className="md:col-span-2 text-right">
                    <span
                      className={`text-xs font-semibold ${
                        task.daysLeft <= 1 ? "text-amber-300" : "text-emerald-300"
                      }`}
                    >
                      {task.daysLeft <= 0 ? "Today" : `${task.daysLeft}d left`}
                    </span>
                  </div>
                </div>
              ))}

              {deadlineRadarData.length === 0 && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                  No open tasks due in the next {DEADLINE_RADAR_DAYS} days.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-100 mb-4">
            Bottleneck Tasks (In Progress for {BOTTLENECK_AGE_DAYS}+ days)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-gray-400">Task</th>
                  <th className="text-left py-3 px-3 text-gray-400">Owner</th>
                  <th className="text-center py-3 px-3 text-gray-400">Age</th>
                  <th className="text-center py-3 px-3 text-gray-400">Priority</th>
                  <th className="text-center py-3 px-3 text-gray-400">Due</th>
                  <th className="text-right py-3 px-3 text-gray-400">Risk</th>
                </tr>
              </thead>
              <tbody>
                {bottleneckTasks.map((task) => (
                  <tr key={task.id} className="border-b border-white/5">
                    <td className="py-3 px-3 text-gray-200">{task.title}</td>
                    <td className="py-3 px-3 text-gray-400">{task.owner}</td>
                    <td className="text-center py-3 px-3 text-amber-300 font-semibold">
                      {task.ageDays.toFixed(1)}d
                    </td>
                    <td className="text-center py-3 px-3 text-gray-300">{task.priority}</td>
                    <td className="text-center py-3 px-3 text-gray-400">
                      {task.hasDueDate ? formatDate(task.dueAt) : "No due date"}
                    </td>
                    <td className="text-right py-3 px-3">
                      <span
                        className={`text-xs font-semibold ${
                          task.overdue ? "text-rose-300" : "text-orange-300"
                        }`}
                      >
                        {task.overdue ? "Overdue" : "Stale"}
                      </span>
                    </td>
                  </tr>
                ))}
                {bottleneckTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No bottleneck tasks found for current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                  { status: "Completed", count: metrics.statusCounts.Completed, color: "text-green-400" },
                  { status: "In Progress", count: metrics.statusCounts.InProgress, color: "text-blue-400" },
                  { status: "Pending", count: metrics.statusCounts.Pending, color: "text-orange-400" },
                ].map((item) => {
                  const percentage =
                    metrics.statusCounts.All > 0 ? (item.count / metrics.statusCounts.All) * 100 : 0;

                  return (
                    <tr key={item.status} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">{item.status}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-bold ${item.color}`}>{item.count}</span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-400">{pct(percentage)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-white/10 bg-white/5">
                  <td className="py-3 px-4 font-bold text-gray-200">Total</td>
                  <td className="text-center py-3 px-4 font-bold text-[#EA8D23]">{metrics.statusCounts.All}</td>
                  <td className="text-right py-3 px-4 font-bold text-[#EA8D23]">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">Team Leaderboard</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 text-gray-400">Member</th>
                    <th className="text-center py-3 px-3 text-gray-400">Total</th>
                    <th className="text-center py-3 px-3 text-gray-400">Completed</th>
                    <th className="text-right py-3 px-3 text-gray-400">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.slice(0, 8).map((member) => (
                    <tr key={member._id} className="border-b border-white/5">
                      <td className="py-3 px-3 text-gray-200">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              member.profileImageUrl ||
                              "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                            }
                            alt={member.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-sm">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 text-gray-300 font-semibold">{member.total}</td>
                      <td className="text-center py-3 px-3 text-emerald-300 font-semibold">{member.completed}</td>
                      <td className="text-right py-3 px-3 text-cyan-300 font-semibold">{pct(member.completionRate)}</td>
                    </tr>
                  ))}

                  {leaderboardData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        No member data for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
              <LuSparkles className="text-[#EA8D23]" />
              Actionable Insights
            </h2>
            <div className="space-y-3">
              {insights.map((item) => (
                <div
                  key={item}
                  className="p-3 rounded-lg border border-white/10 bg-black/20 text-sm text-gray-300 leading-relaxed"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
              Avg resolution time: {metrics.avgResolutionDays.toFixed(1)} days | Completion timestamp coverage:{" "}
              {pct(metrics.completedTimestampCoverage)}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
