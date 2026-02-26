import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import MemberProductivityService from "../../services/memberProductivityService";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuBrain,
  LuCalendarClock,
  LuClockAlert,
  LuListChecks,
  LuMessageSquare,
  LuRefreshCcw,
  LuTimerReset,
} from "react-icons/lu";

// Skeleton Loader Component
const SkeletonLoader = ({ count = 3, height = "h-20" }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`rounded-xl border border-white/10 bg-white/5 ${height} animate-pulse`} />
    ))}
  </div>
);

// Section Skeleton
const SectionSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
      <div className="h-5 w-8 bg-white/10 rounded-full animate-pulse" />
    </div>
    <SkeletonLoader count={3} height="h-24" />
  </motion.div>
);

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", when: "beforeChildren", staggerChildren: 0.06 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};
const _FRAMER_MOTION_LOADED = Boolean(motion);

const sectionConfig = [
  { key: "overdue", title: "Overdue", accent: "text-red-300 border-red-500/30 bg-red-500/10", icon: LuClockAlert },
  { key: "today", title: "Due Today", accent: "text-orange-300 border-orange-500/30 bg-orange-500/10", icon: LuCalendarClock },
  { key: "tomorrow", title: "Due Tomorrow", accent: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10", icon: LuTimerReset },
  { key: "quickWins", title: "Quick Wins", accent: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", icon: LuListChecks },
];

const MyDay = () => {
  const navigate = useNavigate();
  const windowTypeRef = useRef("today");
  const fetchTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const [agenda, setAgenda] = useState({
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
    quickWins: [],
  });
  const [windowType, setWindowType] = useState("today");
  const [isLoadingInitially, setIsLoadingInitially] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [dayPlan, setDayPlan] = useState([]);
  const [planSummary, setPlanSummary] = useState("");

  const fetchAgenda = useCallback(async (isInitial = false) => {
    // Prevent multiple simultaneous requests
    if (!isInitial && isRefreshingRef.current) return;
    
    if (isInitial) {
      setIsLoadingInitially(true);
    } else {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
    }

    try {
      const response = await MemberProductivityService.getAgenda(windowTypeRef.current);
      setAgenda({
        overdue: response?.overdue || [],
        today: response?.today || [],
        tomorrow: response?.tomorrow || [],
        later: response?.later || [],
        quickWins: response?.quickWins || [],
      });
    } catch {
      toast.error("Failed to load your day plan");
    } finally {
      if (isInitial) {
        setIsLoadingInitially(false);
      } else {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    windowTypeRef.current = windowType;
    // Clear previous timeout if it exists
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    // Debounce window type changes by 300ms
    fetchTimeoutRef.current = setTimeout(() => {
      fetchAgenda(false);
    }, 300);
    
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [windowType]);

  // Initial load
  useEffect(() => {
    fetchAgenda(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allActionableTasks = useMemo(
    () => [...agenda.overdue, ...agenda.today, ...agenda.tomorrow, ...agenda.later],
    [agenda]
  );

  const runPlanMyDay = async () => {
    try {
      setIsPlanning(true);
      const response = await MemberProductivityService.planDay();
      setDayPlan(response?.plan || []);
      setPlanSummary(response?.summary || "");
      if ((response?.plan || []).length === 0) {
        toast("No tasks available for AI planning right now.");
      } else {
        toast.success("AI day plan generated");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to generate AI day plan");
    } finally {
      setIsPlanning(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK_STATUS(taskId), { status });
      toast.success(`Moved task to ${status}`);
      fetchAgenda();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update task status");
    }
  };

  const toggleChecklistItem = async (task, checklistIndex) => {
    try {
      const updatedChecklist = (task.todoChecklist || []).map((item, index) =>
        index === checklistIndex ? { ...item, completed: !item.completed } : item
      );
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(task._id), {
        todoChecklist: updatedChecklist,
      });
      toast.success("Checklist updated");
      fetchAgenda();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update checklist");
    }
  };

  const addQuickComment = async (taskId) => {
    const input = window.prompt("Add a quick progress comment:");
    if (!input || !input.trim()) return;
    try {
      await axiosInstance.post(API_PATHS.TASKS.ADD_TASK_COMMENT(taskId), { text: input.trim() });
      toast.success("Comment added");
      fetchAgenda();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add comment");
    }
  };

  const snoozeReminder = async (task) => {
    try {
      const currentDue = task?.dueDate ? new Date(task.dueDate) : new Date();
      currentDue.setDate(currentDue.getDate() + 1);
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK(task._id), {
        dueDate: currentDue.toISOString(),
      });
      toast.success("Task snoozed by 1 day");
      fetchAgenda();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to snooze task");
    }
  };

  return (
    <DashboardLayout activeMenu="My Day">
      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={sectionVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">My Day</h2>
            <p className="text-sm text-gray-400">Plan and execute today without context switching.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`px-3 py-2 rounded-lg text-sm border ${
                windowType === "today" ? "border-orange-500/40 bg-orange-500/15 text-orange-300" : "border-white/10 text-gray-300"
              }`}
              onClick={() => setWindowType("today")}
            >
              Today Window
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm border ${
                windowType === "week" ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 text-gray-300"
              }`}
              onClick={() => setWindowType("week")}
            >
              Week Window
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5 transition-colors"
              onClick={() => fetchAgenda(false)}
              disabled={isRefreshing}
            >
              <LuRefreshCcw className={isRefreshing ? "animate-spin" : ""} /> 
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            {isLoadingInitially ? (
              // Show skeleton loaders only on initial load
              <>
                <SectionSkeleton />
                <SectionSkeleton />
                <SectionSkeleton />
                <SectionSkeleton />
              </>
            ) : (
              // Show actual content with refresh overlay if refreshing
              <div className={isRefreshing ? "relative opacity-70 pointer-events-none" : ""}>
                {sectionConfig.map(({ key, title, accent, icon: Icon }) => (
                  <motion.section
                    key={key}
                    variants={sectionVariants}
                    whileHover={isRefreshing ? {} : { y: -2 }}
                    className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4 mb-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        {React.createElement(Icon, { className: "text-orange-400" })}
                        {title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${accent}`}>
                        {(agenda[key] || []).length}
                      </span>
                    </div>

                    {(agenda[key] || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No tasks in this section.</p>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                          {(agenda[key] || []).map((task, index) => (
                          <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, delay: index * 0.03 }}
                            whileHover={isRefreshing ? {} : { y: -2, borderColor: "rgba(255,255,255,0.22)" }}
                            className="rounded-xl border border-white/10 bg-black/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                className="text-left flex-1"
                                onClick={() => navigate(`/user/task/${task._id}`)}
                                title="Open task details"
                                disabled={isRefreshing}
                              >
                                <p className="font-semibold text-white">{task.title}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : "N/A"} | Priority: {task.priority}
                                </p>
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-xs px-2 py-1 rounded border border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => updateTaskStatus(task._id, "In Progress")}
                                  disabled={isRefreshing}
                                >
                                  Start
                                </button>
                                <button
                                  className="text-xs px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => updateTaskStatus(task._id, "Completed")}
                                  disabled={isRefreshing}
                                >
                                  Complete
                                </button>
                              </div>
                            </div>

                            {(task.todoChecklist || []).slice(0, 2).map((todo, idx) => (
                              <label key={`${task._id}-${idx}`} className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={Boolean(todo.completed)}
                                  onChange={() => toggleChecklistItem(task, idx)}
                                  disabled={isRefreshing}
                                />
                                <span className={todo.completed ? "line-through text-gray-500" : ""}>{todo.text}</span>
                              </label>
                            ))}

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/10 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => addQuickComment(task._id)}
                                disabled={isRefreshing}
                              >
                                <LuMessageSquare /> Comment
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => snoozeReminder(task)}
                                disabled={isRefreshing}
                              >
                                <LuTimerReset /> Snooze 1d
                              </button>
                            </div>
                          </motion.div>
                        ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.section>
                ))}
              </div>
            )}
            {isRefreshing && !isLoadingInitially && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <div className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10">
                  <div className="animate-spin">
                    <LuRefreshCcw className="text-cyan-400" size={24} />
                  </div>
                  <p className="text-sm text-gray-300">Updating tasks...</p>
                </div>
              </motion.div>
            )}
          </div>

          <aside className="space-y-4">
            {isLoadingInitially ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
              >
                <div className="h-6 w-24 bg-white/10 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-10 w-full bg-white/10 rounded mt-3 animate-pulse" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                variants={sectionVariants}
                whileHover={isRefreshing ? {} : { y: -2 }}
                className={`rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4 ${isRefreshing ? "opacity-70 pointer-events-none" : ""}`}
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LuBrain className="text-cyan-400" />
                  Plan My Day
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  AI orders your next actions using due dates, priority, and progress risk.
                </p>
                <button
                  className="mt-3 w-full px-3 py-2 rounded-lg border border-cyan-500/40 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={runPlanMyDay}
                  disabled={isPlanning || isRefreshing}
                >
                  {isPlanning ? "Generating..." : "Generate Plan"}
                </button>
                {planSummary && <p className="text-xs text-cyan-200/80 mt-3">{planSummary}</p>}
                {dayPlan.length > 0 && (
                  <ol className="mt-3 space-y-2">
                    {dayPlan.map((item, index) => (
                      <motion.li
                        key={`${item.rank}-${item.taskId || item.title}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.04 }}
                        className="text-xs text-gray-300 border border-white/10 rounded-lg p-2"
                      >
                        <p className="font-semibold text-white">{item.rank}. {item.title}</p>
                        <p className="text-gray-400 mt-1">{item.reason}</p>
                      </motion.li>
                    ))}
                  </ol>
                )}
              </motion.div>
            )}

            {!isLoadingInitially && allActionableTasks.length === 0 && !isRefreshing && (
              <motion.div
                variants={sectionVariants}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-4 text-sm text-gray-400"
              >
                No tasks in your agenda. Open <span className="text-cyan-300">Task Calendar</span> and add a weekly focus block.
              </motion.div>
            )}
          </aside>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default MyDay;
