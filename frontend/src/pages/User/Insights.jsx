import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import MemberProductivityService from "../../services/memberProductivityService";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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

const MetricCard = ({ title, value, hint }) => (
  <motion.div
    variants={sectionVariants}
    whileHover={{ y: -2, scale: 1.01 }}
    transition={{ duration: 0.2 }}
    className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
  >
    <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
  </motion.div>
);

const Insights = () => {
  const [range, setRange] = useState("7d");
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadInsights = async (selectedRange) => {
    try {
      setIsLoading(true);
      const response = await MemberProductivityService.getInsights(selectedRange);
      setPayload(response);
    } catch {
      toast.error("Failed to load insights");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights(range);
  }, [range]);

  const heatmapRows = useMemo(() => {
    const data = payload?.throughputHeatmap || [];
    return data.slice(-14);
  }, [payload]);

  const metrics = payload?.metrics || {};
  const suggestions = payload?.suggestions || [];

  return (
    <DashboardLayout activeMenu="Insights">
      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-5">
        <motion.div variants={sectionVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Personal Insights</h2>
            <p className="text-sm text-gray-400">Track output quality and improve execution habits.</p>
          </div>
          <div className="flex items-center gap-2">
            {["7d", "30d"].map((value) => (
              <button
                key={value}
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  range === value
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
                onClick={() => setRange(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
            className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 text-center text-gray-400"
          >
            Loading insights...
          </motion.div>
        ) : (
          <>
            <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard title="Completed" value={metrics.completedCount ?? 0} hint={`Range ${metrics.range || range}`} />
              <MetricCard title="On-Time Ratio" value={`${metrics.onTimeCompletionRatio ?? 0}%`} />
              <MetricCard title="Avg Cycle Time" value={`${metrics.avgCycleTimeHours ?? 0}h`} />
              <MetricCard title="Daily Throughput" value={metrics.averageDailyThroughput ?? 0} />
            </motion.div>

            <motion.div variants={sectionVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <motion.div
                variants={sectionVariants}
                whileHover={{ y: -2 }}
                className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
              >
                <h3 className="text-lg font-semibold text-white mb-3">Completion Trend</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payload?.completionTrend || []} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#0B1220",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "0.75rem",
                          color: "#E5E7EB",
                        }}
                      />
                      <Line type="monotone" dataKey="completed" stroke="#06B6D4" strokeWidth={3} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                variants={sectionVariants}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
              >
                <h3 className="text-lg font-semibold text-white mb-3">AI Improvement Tips</h3>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500">No suggestions available yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {suggestions.map((tip, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                        className="text-sm text-gray-200 rounded-lg border border-white/10 bg-black/20 p-2"
                      >
                        {tip}
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </motion.div>

            <motion.div
              variants={sectionVariants}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-4"
            >
              <h3 className="text-lg font-semibold text-white mb-3">Daily Throughput Heatmap</h3>
              {heatmapRows.length === 0 ? (
                <p className="text-sm text-gray-500">No completion activity in this range.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                  <AnimatePresence initial={false}>
                    {heatmapRows.map((cell, index) => (
                    <motion.div
                      key={cell.date}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.22)" }}
                      className="rounded-lg border border-white/10 bg-black/20 p-2"
                    >
                      <p className="text-[10px] text-gray-500">{cell.date}</p>
                      <p className="text-sm font-semibold text-white mt-1">{cell.value}</p>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Insights;
