import React, { useCallback, useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import Progress from "../../components/Progress";
import TodoListInput from "../../components/inputs/TodoListInput";
import AddAttachmentsInput from "../../components/inputs/AddAttachmentsInput";
import { LuCalendarClock, LuCircleCheckBig, LuClock3, LuFlag, LuListTodo, LuPlus } from "react-icons/lu";

const DUE_FILTERS = [
  { value: "all", label: "All Due Dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "next7", label: "Next 7 Days" },
  { value: "later", label: "Later" },
];

const statusTagClass = {
  Pending: "text-orange-300 bg-orange-500/10 border border-orange-500/30",
  "In Progress": "text-cyan-300 bg-cyan-500/10 border border-cyan-500/30",
  Completed: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30",
};

const priorityTagClass = {
  High: "text-rose-300 bg-rose-500/10 border border-rose-500/30",
  Medium: "text-amber-300 bg-amber-500/10 border border-amber-500/30",
  Low: "text-blue-300 bg-blue-500/10 border border-blue-500/30",
};

const getDayBoundaries = () => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { todayStart, todayEnd, weekEnd };
};

const getDueBucket = (task) => {
  if (!task?.dueDate) return "later";

  const { todayStart, todayEnd, weekEnd } = getDayBoundaries();
  const dueDate = new Date(task.dueDate);
  const dueEnd = new Date(dueDate);
  dueEnd.setHours(23, 59, 59, 999);

  if (task.status !== "Completed" && dueEnd < todayStart) return "overdue";
  if (dueEnd >= todayStart && dueEnd <= todayEnd) return "today";
  if (dueEnd > todayEnd && dueEnd <= weekEnd) return "next7";
  return "later";
};

const formatDueLabel = (dueDate) => {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const SelfTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [dueFilter, setDueFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workingTaskId, setWorkingTaskId] = useState(null);
  const [error, setError] = useState("");
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    todoChecklist: [],
    attachments: [],
  });

  const fetchSelfTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          scope: "self",
          status: filterStatus === "All" ? "" : filterStatus,
        },
      });

      const fetchedTasks = response.data?.tasks || [];
      const summary = response.data?.statusSummary || {};

      setTasks(fetchedTasks);
      setTabs([
        { label: "All", count: summary.all || 0 },
        { label: "Pending", count: summary.pendingTasks || 0 },
        { label: "In Progress", count: summary.inProgressTasks || 0 },
        { label: "Completed", count: summary.completedTasks || 0 },
      ]);
    } catch (fetchError) {
      console.error("Error fetching self tasks:", fetchError);
      toast.error("Unable to load self tasks right now.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchSelfTasks();
  }, [fetchSelfTasks]);

  const dueBucketCounts = useMemo(
    () =>
      tasks.reduce(
        (acc, task) => {
          const bucket = getDueBucket(task);
          acc[bucket] += 1;
          return acc;
        },
        { overdue: 0, today: 0, next7: 0, later: 0 }
      ),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (dueFilter === "all") return true;
        return getDueBucket(task) === dueFilter;
      })
      .filter((task) => {
        if (!query) return true;
        const title = String(task?.title || "").toLowerCase();
        const description = String(task?.description || "").toLowerCase();
        return title.includes(query) || description.includes(query);
      })
      .sort((a, b) => {
        if (a.status === "Completed" && b.status !== "Completed") return 1;
        if (a.status !== "Completed" && b.status === "Completed") return -1;
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dueA - dueB;
      });
  }, [tasks, dueFilter, searchText]);

  const summaryCards = useMemo(() => {
    const allCount = tabs.find((item) => item.label === "All")?.count || 0;
    const completedCount = tabs.find((item) => item.label === "Completed")?.count || 0;
    const inProgressCount = tabs.find((item) => item.label === "In Progress")?.count || 0;
    const completionRate = allCount > 0 ? Math.round((completedCount / allCount) * 100) : 0;

    return {
      allCount,
      completedCount,
      inProgressCount,
      completionRate,
      overdueCount: dueBucketCounts.overdue,
    };
  }, [tabs, dueBucketCounts.overdue]);

  const updateDraft = (key, value) => {
    setTaskDraft((prev) => ({ ...prev, [key]: value }));
  };

  const clearDraft = () => {
    setTaskDraft({
      title: "",
      description: "",
      dueDate: "",
      priority: "Medium",
      todoChecklist: [],
      attachments: [],
    });
  };

  const createSelfTask = async () => {
    setError("");
    if (!taskDraft.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!taskDraft.dueDate) {
      setError("Due date is required.");
      return;
    }

    try {
      setSubmitting(true);
      await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, {
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim(),
        dueDate: new Date(taskDraft.dueDate).toISOString(),
        priority: taskDraft.priority,
        scope: "self",
        todoChecklist: (taskDraft.todoChecklist || []).map((item) => ({
          text: item,
          completed: false,
        })),
        attachments: taskDraft.attachments || [],
      });

      toast.success("Self task created");
      clearDraft();
      fetchSelfTasks();
    } catch (createError) {
      console.error("Error creating self task:", createError);
      toast.error(createError?.response?.data?.message || "Failed to create self task.");
    } finally {
      setSubmitting(false);
    }
  };

  const runTaskAction = async (taskId, action) => {
    try {
      setWorkingTaskId(taskId);
      await action();
      fetchSelfTasks();
    } catch (actionError) {
      console.error("Error updating self task:", actionError);
      toast.error(actionError?.response?.data?.message || "Failed to update task.");
    } finally {
      setWorkingTaskId(null);
    }
  };

  const setStatus = (taskId, status) =>
    runTaskAction(taskId, async () => {
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK_STATUS(taskId), { status });
      toast.success(`Task moved to ${status}`);
    });

  const toggleChecklistItem = (task, index) =>
    runTaskAction(task._id, async () => {
      const updatedChecklist = (task.todoChecklist || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item
      );
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(task._id), {
        todoChecklist: updatedChecklist,
      });
    });

  const inputClass =
    "w-full bg-[#050505] border border-white/10 text-gray-200 text-sm rounded-lg p-3 focus:outline-none focus:border-[#EA8D23]/50 focus:ring-1 focus:ring-[#EA8D23]/50 transition-all placeholder-gray-600";

  return (
    <DashboardLayout activeMenu="Self Tasks">
      <div className="space-y-6">
        <section className="bg-[#1a1a1a]/50 border border-white/10 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Self Tasks</h1>
              <p className="text-sm text-gray-400 mt-1">
                Create personal admin tasks and track progress without mixing with team work.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-xl font-bold text-white">{summaryCards.allCount}</p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                <p className="text-xs text-cyan-200 uppercase tracking-wide">In Progress</p>
                <p className="text-xl font-bold text-cyan-200">{summaryCards.inProgressCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-xs text-emerald-200 uppercase tracking-wide">Completion</p>
                <p className="text-xl font-bold text-emerald-200">{summaryCards.completionRate}%</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <p className="text-xs text-rose-200 uppercase tracking-wide">Overdue</p>
                <p className="text-xl font-bold text-rose-200">{summaryCards.overdueCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1a1a1a]/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <LuPlus className="text-[#EA8D23]" />
            <h2 className="text-lg font-semibold text-white">Quick Create Self Task</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1.5">Title</label>
              <input
                className={inputClass}
                placeholder="e.g., Prepare weekly planning notes"
                value={taskDraft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1.5">Due Date</label>
              <input
                className={inputClass}
                type="date"
                value={taskDraft.dueDate}
                onChange={(event) => updateDraft("dueDate", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1.5">Description</label>
              <textarea
                className={`${inputClass} min-h-[110px] resize-y`}
                placeholder="Add context for your own execution plan..."
                value={taskDraft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1.5">Priority</label>
              <select
                className={inputClass}
                value={taskDraft.priority}
                onChange={(event) => updateDraft("priority", event.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Self tasks are auto-assigned to your admin account.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1.5">Checklist</label>
              <TodoListInput
                todoList={taskDraft.todoChecklist}
                setTodoList={(value) => updateDraft("todoChecklist", value)}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1.5">Attachments (Optional)</label>
              <AddAttachmentsInput
                attachments={taskDraft.attachments}
                setAttachments={(value) => updateDraft("attachments", value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#EA8D23] hover:bg-[#d67e1b] text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={createSelfTask}
              disabled={submitting}
            >
              <LuPlus />
              {submitting ? "Creating..." : "Create Self Task"}
            </button>
          </div>
        </section>

        <section className="bg-[#1a1a1a]/50 border border-white/10 rounded-2xl p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Personal Progress Board</h2>
              <input
                className={`${inputClass} lg:max-w-sm`}
                placeholder="Search self tasks..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = filterStatus === tab.label;
                return (
                  <button
                    key={tab.label}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      isActive
                        ? "border-[#EA8D23]/50 bg-[#EA8D23]/15 text-[#EA8D23]"
                        : "border-white/10 text-gray-300 hover:border-white/20"
                    }`}
                    onClick={() => setFilterStatus(tab.label)}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {DUE_FILTERS.map((filter) => {
                const isActive = dueFilter === filter.value;
                const count =
                  filter.value === "all"
                    ? tasks.length
                    : dueBucketCounts[filter.value] || 0;
                return (
                  <button
                    key={filter.value}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                      isActive
                        ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                        : "border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                    onClick={() => setDueFilter(filter.value)}
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-400">Loading self tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No self tasks found for this filter combination.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const dueBucket = getDueBucket(task);
                const todoList = task.todoChecklist || [];
                const isBusy = workingTaskId === task._id;

                return (
                  <article
                    key={task._id}
                    className={`rounded-xl border p-4 ${
                      dueBucket === "overdue" && task.status !== "Completed"
                        ? "border-rose-500/40 bg-rose-500/5"
                        : dueBucket === "today" && task.status !== "Completed"
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{task.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{task.description || "No description added."}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusTagClass[task.status] || statusTagClass.Pending}`}>
                          {task.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${priorityTagClass[task.priority] || priorityTagClass.Medium}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <LuCalendarClock />
                        Due: {formatDueLabel(task.dueDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LuClock3 />
                        {dueBucket === "overdue"
                          ? "Overdue"
                          : dueBucket === "today"
                            ? "Due today"
                            : dueBucket === "next7"
                              ? "Due this week"
                              : "Later"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LuListTodo />
                        {(task.completedTodoCount || 0)}/{todoList.length} checklist done
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LuFlag />
                        {task.attachments?.length || 0} attachments
                      </span>
                    </div>

                    <div className="mt-3">
                      <Progress progress={task.progress || 0} status={task.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 disabled:opacity-50"
                        onClick={() => setStatus(task._id, "In Progress")}
                        disabled={isBusy || task.status === "In Progress"}
                      >
                        Start
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 disabled:opacity-50"
                        onClick={() => setStatus(task._id, "Completed")}
                        disabled={isBusy || task.status === "Completed"}
                      >
                        <span className="inline-flex items-center gap-1">
                          <LuCircleCheckBig /> Complete
                        </span>
                      </button>
                    </div>

                    {todoList.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {todoList.map((item, index) => (
                          <label key={`${task._id}-${index}`} className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={Boolean(item.completed)}
                              disabled={isBusy}
                              onChange={() => toggleChecklistItem(task, index)}
                            />
                            <span className={item.completed ? "line-through text-gray-500" : ""}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default SelfTasks;
