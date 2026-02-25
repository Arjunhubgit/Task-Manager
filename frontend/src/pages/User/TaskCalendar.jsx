import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const statusColors = {
  Pending: "bg-amber-500/40 border-amber-400/60",
  "In Progress": "bg-cyan-500/40 border-cyan-400/60",
  Completed: "bg-emerald-500/40 border-emerald-400/60",
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

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

const TaskCalendar = () => {
  const [tasks, setTasks] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS);
      setTasks(response.data?.tasks || []);
    } catch {
      toast.error("Failed to load calendar tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task?.dueDate) return acc;
      const key = toDateKey(task.dueDate);
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const monthGrid = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const leadDays = start.getDay();
    const totalDays = end.getDate();

    const cells = [];
    for (let i = 0; i < leadDays; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentMonth]);

  const selectedKey = toDateKey(selectedDate);
  const selectedTasks = tasksByDate[selectedKey] || [];

  const updateStatus = async (taskId, status) => {
    try {
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK_STATUS(taskId), { status });
      setTasks((prev) => prev.map((task) => (task._id === taskId ? { ...task, status } : task)));
      toast.success(`Task set to ${status}`);
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <DashboardLayout activeMenu="Task Calendar">
      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-5">
        <motion.div variants={sectionVariants} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Task Calendar</h2>
            <p className="text-sm text-gray-400">Plan week/month execution by due dates.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            >
              Prev
            </button>
            <div className="px-3 py-1.5 rounded-lg border border-white/10 text-white">{monthLabel}</div>
            <button
              className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
        </motion.div>

        <motion.div variants={sectionVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <motion.div
            variants={sectionVariants}
            whileHover={{ y: -2 }}
            className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
          >
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-xs text-gray-500 text-center py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-24 rounded-lg border border-white/5 bg-black/10" />;
                }
                const key = toDateKey(date);
                const dateTasks = tasksByDate[key] || [];
                const isSelected = key === selectedKey;
                const isToday = key === toDateKey(new Date());
                return (
                  <motion.button
                    key={key}
                    className={`h-24 rounded-lg border p-2 text-left transition-colors ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5"
                    }`}
                    onClick={() => setSelectedDate(date)}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isToday ? "text-orange-300" : "text-gray-300"}`}>
                        {date.getDate()}
                      </span>
                      {dateTasks.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/20 text-gray-200">
                          {dateTasks.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dateTasks.slice(0, 3).map((task) => (
                        <span
                          key={task._id}
                          className={`w-2.5 h-2.5 rounded-full border ${
                            task?.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed"
                              ? "bg-red-500/60 border-red-400/70"
                              : task.priority === "High"
                              ? "bg-orange-500/60 border-orange-400/70"
                              : task.priority === "Medium"
                              ? "bg-cyan-500/60 border-cyan-400/70"
                              : "bg-emerald-500/60 border-emerald-400/70"
                          }`}
                        />
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.aside
            variants={sectionVariants}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
          >
            <h3 className="text-lg font-semibold text-white">
              {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            {isLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading tasks...</p>
            ) : selectedTasks.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No tasks due on this date.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <AnimatePresence initial={false}>
                  {selectedTasks.map((task, index) => (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.22)" }}
                    className="rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <p className="text-sm font-semibold text-white">{task.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full border ${statusColors[task.status] || "bg-white/10 border-white/20"}`}>
                        {task.status}
                      </span>
                      <span className="text-[10px] text-gray-400">{task.priority}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="text-xs px-2 py-1 rounded border border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                        onClick={() => updateStatus(task._id, "In Progress")}
                      >
                        Start
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                        onClick={() => updateStatus(task._id, "Completed")}
                      >
                        Complete
                      </button>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </motion.aside>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default TaskCalendar;
