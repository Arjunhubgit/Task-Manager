import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/cards/TaskCards";
import { AnimatePresence, motion as Motion } from "framer-motion";
import toast from "react-hot-toast";
import MemberProductivityService from "../../services/memberProductivityService";
import {
  LuBrain,
  LuDownload,
  LuFilter,
  LuListChecks,
  LuSearch,
  LuShieldAlert,
  LuTags,
  LuWandSparkles,
  LuX
} from "react-icons/lu";

const VIEW_CONFIG = {
  all: { status: "All", menuLabel: "My Tasks", title: "My Tasks", isOverdue: false },
  pending: { status: "Pending", menuLabel: "My Tasks", title: "Pending Tasks", isOverdue: false },
  inprogress: { status: "In Progress", menuLabel: "My Tasks", title: "In Progress Tasks", isOverdue: false },
  completed: { status: "Completed", menuLabel: "My Tasks", title: "Completed Tasks", isOverdue: false },
  overdue: { status: "All", menuLabel: "My Tasks", title: "Overdue Tasks", isOverdue: true },
};

const STATUS_TO_VIEW = {
  All: "all",
  Pending: "pending",
  "In Progress": "inprogress",
  Completed: "completed",
};

const normalizeViewKey = (value = "") => value.toLowerCase().replace(/[\s_-]/g, "");

const getViewKeyFromSearch = (search = "") => {
  const params = new URLSearchParams(search);
  const normalized = normalizeViewKey(params.get("view") || "");
  return VIEW_CONFIG[normalized] ? normalized : "all";
};

const isTaskOverdue = (task) => {
  if (!task?.dueDate || task.status === "Completed") return false;
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < Date.now();
};

const getDueScope = (task, dueFilter) => {
  if (dueFilter === "all") return true;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  if (!dueDate) return false;
  if (dueFilter === "today") return dueDate >= todayStart && dueDate <= todayEnd;
  if (dueFilter === "week") return dueDate >= todayStart && dueDate <= weekEnd;
  if (dueFilter === "overdue") return isTaskOverdue(task);
  return true;
};

const getHealthFlags = (task) => {
  const updatedAt = task?.updatedAt ? new Date(task.updatedAt) : null;
  const createdAt = task?.createdAt ? new Date(task.createdAt) : null;
  const checklist = task?.todoChecklist || [];
  const completedTodoCount = task?.completedTodoCount || 0;
  const stale =
    task?.status !== "Completed" &&
    updatedAt &&
    Date.now() - updatedAt.getTime() > 3 * 24 * 60 * 60 * 1000;
  const blocked =
    task?.status !== "Completed" &&
    checklist.length > 0 &&
    completedTodoCount === 0 &&
    createdAt &&
    Date.now() - createdAt.getTime() > 2 * 24 * 60 * 60 * 1000;
  const overloaded =
    task?.status !== "Completed" &&
    task?.priority === "High" &&
    getDueScope(task, "today") &&
    (task?.progress || 0) < 40;
  return { stale, blocked, overloaded };
};

const MyTasks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiDrawer, setAiDrawer] = useState({
    open: false,
    task: null,
    mode: "summary",
    loading: false,
    result: "",
  });

  const activeViewKey = useMemo(() => getViewKeyFromSearch(location.search), [location.search]);
  const activeView = VIEW_CONFIG[activeViewKey] || VIEW_CONFIG.all;
  const activeTab = activeView.isOverdue ? "All" : activeView.status;

  const priorityFilter = (params.get("priority") || "all").toLowerCase();
  const dueFilter = (params.get("due") || "all").toLowerCase();
  const checklistFilter = params.get("checklist") === "1";
  const commentsFilter = params.get("comments") === "1";

  const setSearchParam = useCallback(
    (patch) => {
      const next = new URLSearchParams(location.search);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === "all" || value === false) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      navigate(`/user/tasks${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [location.search, navigate]
  );

  const getAllTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          status: activeView.isOverdue || activeView.status === "All" ? "" : activeView.status,
        },
      });

      const tasks = response.data?.tasks || [];
      setAllTasks(tasks);
      const statusSummary = response.data?.statusSummary || {};
      setTabs([
        { label: "All", count: statusSummary.all || 0 },
        { label: "Pending", count: statusSummary.pendingTasks || 0 },
        { label: "In Progress", count: statusSummary.inProgressTasks || 0 },
        { label: "Completed", count: statusSummary.completedTasks || 0 },
      ]);
    } catch (error) {
      toast.error("Failed to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  }, [activeView.isOverdue, activeView.status]);

  useEffect(() => {
    getAllTasks();
  }, [getAllTasks]);

  useEffect(() => {
    if (location.state?.targetTaskId) {
      setHighlightedTaskId(location.state.targetTaskId);
      window.history.replaceState({}, document.title);
    } else {
      setHighlightedTaskId(null);
    }
  }, [location.state]);

  const filteredTasks = useMemo(() => {
    let tasks = [...allTasks];
    if (activeView.isOverdue) tasks = tasks.filter(isTaskOverdue);
    if (priorityFilter !== "all") {
      tasks = tasks.filter((task) => task.priority?.toLowerCase() === priorityFilter);
    }
    tasks = tasks.filter((task) => getDueScope(task, dueFilter));
    if (checklistFilter) {
      tasks = tasks.filter((task) => (task.todoChecklist || []).length > 0);
    }
    if (commentsFilter) {
      tasks = tasks.filter((task) => (task.comments || []).length > 0);
    }
    if (highlightedTaskId) {
      const found = tasks.find((task) => task._id === highlightedTaskId);
      return found ? [found] : [];
    }
    return tasks;
  }, [
    allTasks,
    activeView.isOverdue,
    priorityFilter,
    dueFilter,
    checklistFilter,
    commentsFilter,
    highlightedTaskId,
  ]);

  const handleTabChange = (tabLabel) => {
    const nextView = STATUS_TO_VIEW[tabLabel] || "all";
    setSearchParam({ view: nextView });
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const bulkUpdateStatus = async (status) => {
    if (selectedTaskIds.length === 0) {
      toast("Select at least one task for bulk update.");
      return;
    }
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK_STATUS(taskId), { status })
        )
      );
      toast.success(`Updated ${selectedTaskIds.length} tasks to ${status}`);
      setSelectedTaskIds([]);
      getAllTasks();
    } catch (error) {
      toast.error("Bulk status update failed");
    }
  };

  const bulkAddTag = async () => {
    if (selectedTaskIds.length === 0) {
      toast("Select tasks first.");
      return;
    }
    const input = window.prompt("Add tag to selected tasks:");
    const tag = String(input || "").trim();
    if (!tag) return;
    try {
      await Promise.all(
        selectedTaskIds.map(async (taskId) => {
          const task = allTasks.find((item) => item._id === taskId);
          const nextTags = Array.from(new Set([...(task?.tags || []), tag]));
          return axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK(taskId), { tags: nextTags });
        })
      );
      toast.success(`Tag "${tag}" added`);
      getAllTasks();
    } catch (error) {
      toast.error("Failed to add tag");
    }
  };

  const exportFilteredTasks = () => {
    if (filteredTasks.length === 0) {
      toast("No tasks to export.");
      return;
    }
    const rows = [
      ["Title", "Priority", "Status", "Due Date", "Progress", "Tags"],
      ...filteredTasks.map((task) => [
        task.title,
        task.priority,
        task.status,
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "",
        String(task.progress || 0),
        (task.tags || []).join("|"),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "filtered_my_tasks.csv");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openAiDrawer = (task) => {
    setAiDrawer({
      open: true,
      task,
      mode: "summary",
      loading: false,
      result: "",
    });
  };

  const runAiAssist = async (mode) => {
    if (!aiDrawer.task?._id) return;
    try {
      setAiDrawer((prev) => ({ ...prev, loading: true, mode }));
      const response = await MemberProductivityService.aiAssist(aiDrawer.task._id, mode);
      setAiDrawer((prev) => ({
        ...prev,
        loading: false,
        result: response?.content || "No AI output available.",
      }));
    } catch (error) {
      setAiDrawer((prev) => ({ ...prev, loading: false }));
      toast.error("Failed to run AI assist");
    }
  };

  const goToTask = (taskId) => {
    navigate(`/user/task/${taskId}`);
  };

  return (
    <DashboardLayout activeMenu={activeView.menuLabel}>
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{activeView.title}</h2>
            <p className="text-sm text-gray-400">Filter, bulk manage, and optimize your personal execution queue.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5"
              onClick={exportFilteredTasks}
            >
              <LuDownload />
              Export Filtered
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 text-red-300 bg-red-500/10"
              onClick={() => setHighlightedTaskId(null)}
            >
              <LuX />
              Clear Focus
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 text-sm text-gray-300">
              <LuFilter /> Filters
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setSearchParam({ priority: e.target.value })}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={dueFilter}
              onChange={(e) => setSearchParam({ due: e.target.value })}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="all">Any Due Date</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
              <option value="overdue">Overdue</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={checklistFilter}
                onChange={(e) => setSearchParam({ checklist: e.target.checked ? "1" : "" })}
              />
              Has Checklist
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={commentsFilter}
                onChange={(e) => setSearchParam({ comments: e.target.checked ? "1" : "" })}
              />
              Has Comments
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-200 bg-cyan-500/10 text-sm"
              onClick={() => bulkUpdateStatus("In Progress")}
            >
              Bulk Start
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-200 bg-emerald-500/10 text-sm"
              onClick={() => bulkUpdateStatus("Completed")}
            >
              Bulk Complete
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-200 bg-violet-500/10 text-sm"
              onClick={bulkAddTag}
            >
              <LuTags />
              Add Tag
            </button>
            <span className="text-xs text-gray-500 self-center">{selectedTaskIds.length} selected</span>
          </div>

          <TaskStatusTabs tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] p-10 text-center text-gray-400">Loading tasks...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task) => {
                const flags = getHealthFlags(task);
                const isHighlighted = task._id === highlightedTaskId;
                return (
                  <Motion.div
                    key={task._id}
                    layout
                    className={`relative ${isHighlighted ? "md:col-span-2" : ""}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <div className="absolute top-2 right-2 z-20">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task._id)}
                        onChange={() => toggleTaskSelection(task._id)}
                      />
                    </div>
                    <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1">
                      {flags.stale && <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/40 bg-yellow-500/15 text-yellow-200">Stale</span>}
                      {flags.blocked && <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-200">Blocked</span>}
                      {flags.overloaded && <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-100">Overloaded</span>}
                    </div>
                    <div className={`${isHighlighted ? "p-[2px] rounded-2xl bg-gradient-to-r from-cyan-500/70 to-indigo-500/70" : ""}`}>
                      <TaskCard
                        title={task.title}
                        description={task.description}
                        priority={task.priority}
                        status={task.status}
                        progress={task.progress}
                        createdAt={task.createdAt}
                        dueDate={task.dueDate}
                        assignedTo={task.assignedTo?.map((item) => item.profileImageUrl)}
                        attachmentCount={task.attachments?.length || 0}
                        completedTodoCount={task.completedTodoCount || 0}
                        todoChecklist={task.todoChecklist || []}
                        onClick={() => goToTask(task._id)}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-cyan-500/30 text-cyan-200 bg-cyan-500/10"
                        onClick={() => openAiDrawer(task)}
                      >
                        <LuWandSparkles /> AI Helper
                      </button>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2">
                        {(task.tags || []).slice(0, 3).map((tag) => (
                          <span key={`${task._id}-${tag}`} className="px-1.5 py-0.5 rounded border border-white/10 bg-black/30">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-gray-500">
            <LuSearch className="mx-auto mb-2 text-2xl" />
            No tasks found for current filters.
          </div>
        )}
      </div>

      <AnimatePresence>
        {aiDrawer.open && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[120] flex justify-end"
            onClick={() => setAiDrawer((prev) => ({ ...prev, open: false }))}
          >
            <Motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              className="w-full max-w-md bg-[#101010] border-l border-white/10 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LuBrain className="text-cyan-300" /> AI Task Helper
                </h3>
                <button className="text-gray-400 hover:text-white" onClick={() => setAiDrawer((prev) => ({ ...prev, open: false }))}>
                  <LuX />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">{aiDrawer.task?.title}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="text-xs px-2 py-1 rounded border border-white/10 text-gray-200 hover:bg-white/5" onClick={() => runAiAssist("summary")}>
                  Summary
                </button>
                <button className="text-xs px-2 py-1 rounded border border-white/10 text-gray-200 hover:bg-white/5" onClick={() => runAiAssist("subtasks")}>
                  Subtasks
                </button>
                <button className="text-xs px-2 py-1 rounded border border-white/10 text-gray-200 hover:bg-white/5" onClick={() => runAiAssist("next_step")}>
                  Next Step
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 min-h-40 whitespace-pre-wrap text-sm text-gray-200">
                {aiDrawer.loading ? "Generating AI response..." : aiDrawer.result || "Run an AI mode to get guidance."}
              </div>
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <LuShieldAlert />
                AI advice is assistive only. Verify before taking critical actions.
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default MyTasks;
