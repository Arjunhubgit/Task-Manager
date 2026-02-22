import React from 'react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl shadow-black/50">
        {/* Glow effect indicator */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
          {payload[0].name}
        </p>
        <p className="text-white text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          {payload[0].value}
          <span className="text-xs text-gray-500 font-normal ml-1">Tasks</span>
        </p>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;