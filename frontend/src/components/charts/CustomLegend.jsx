import React from 'react';

const CustomLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap justify-center gap-6 mt-6">
      {
        payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2 group cursor-default">
            {/* Colored Dot with Glow */}
            <div
              className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-transform duration-300 group-hover:scale-125"
              style={{ 
                backgroundColor: entry.color, 
                color: entry.color // Used for shadow currentColor
              }}
            ></div>
            <span className="text-sm text-gray-400 font-medium group-hover:text-gray-200 transition-colors">
              {entry.value}
            </span>
          </div>
        ))
      }
    </div>
  );
};

export default CustomLegend;