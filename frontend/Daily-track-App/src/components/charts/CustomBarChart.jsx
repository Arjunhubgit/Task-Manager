import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

const CustomBarChart = ({ data }) => {
  // --- Cyberpunk Neon Palette ---
  const getBarColor = (entry) => {
    switch (entry?.priority) {
      case 'Low':
        return '#06b6d4'; // Cyan-500 (Cool/Safe)
      case 'Medium':
        return '#f97316'; // Orange-500 (Brand Color)
      case 'High':
        return '#f43f5e'; // Rose-500 (Critical/Alert)
      default:
        return '#64748b';
    }
  };

  // --- Internal Custom Tooltip (Specific to Bar Data Structure) ---
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const priority = payload[0].payload.priority;
      const color = getBarColor({ priority });
      
      return (
        <div className="bg-black/90 backdrop-blur-xl p-3 rounded-lg border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: color }}>
            {priority} Priority
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {payload[0].payload.count}
            </span>
            <span className="text-xs text-gray-500">tickets</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mt-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          {/* Subtle Grid */}
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          
          <XAxis
            dataKey="priority"
            tick={{ fontSize: 12, fill: "#9ca3af" }} // Gray-400
            stroke="none"
            dy={10}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }} // Gray-400
            stroke="none"
          />
          
          <Tooltip
            content={<CustomBarTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.05)" }} // Subtle highlight on hover
          />
          
          <Bar
            dataKey="count"
            nameKey="priority"
            radius={[6, 6, 0, 0]} // Rounded tops
            barSize={40}
            animationDuration={1500}
          >
            {
              data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry)} 
                  // Add a subtle stroke/glow to the bars
                  strokeWidth={0}
                />
              ))
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomBarChart;