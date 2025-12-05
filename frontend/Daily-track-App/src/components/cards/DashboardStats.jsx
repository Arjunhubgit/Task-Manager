import React from 'react';
import { IoStatsChart, IoTime, IoCheckmarkDoneCircle, IoAlertCircle } from 'react-icons/io5';

const DashboardStats = ({ user, stats }) => {
  // 1. Helper to format date
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // 2. NEW: Helper to determine greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    // 4 AM to 12 PM -> Morning
    if (hour >= 4 && hour < 12) return "Good Morning";
    
    // 12 PM to 4 PM -> Afternoon
    if (hour >= 12 && hour < 16) return "Good Afternoon";
    
    // 4 PM to 7 PM -> Evening
    if (hour >= 16 && hour < 19) return "Good Evening";
    
    // 7 PM to 4 AM -> Night
    return "Good Night";
  };

  const statItems = [
    { 
      label: "Total Tasks", 
      value: stats?.total || 0, 
      color: "bg-orange-500", 
      text: "text-orange-500",
      icon: IoStatsChart 
    },
    { 
      label: "Pending", 
      value: stats?.pending || 0, 
      color: "bg-purple-500", 
      text: "text-purple-500",
      icon: IoAlertCircle 
    },
    { 
      label: "In Progress", 
      value: stats?.inProgress || 0, 
      color: "bg-cyan-500", 
      text: "text-cyan-500",
      icon: IoTime 
    },
    { 
      label: "Completed", 
      value: stats?.completed || 0, 
      color: "bg-emerald-500", 
      text: "text-emerald-500",
      icon: IoCheckmarkDoneCircle 
    },
  ];

  return (
    <div className="w-full mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-[#050505]/60 backdrop-blur-xl border border-white/10 shadow-2xl p-6 lg:p-8">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          
          {/* Left Side: Greeting */}
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {/* 3. Updated Line: Calls the function */}
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EA8D23] to-purple-500">{user?.name || "User"}!</span>
            </h2>
            <p className="text-gray-400 font-medium text-sm md:text-base flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {currentDate}
            </p>
          </div>

          {/* Right Side: Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto">
            {statItems.map((item, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:scale-105 transition-all duration-300 group"
              >
                <div className={`p-2 rounded-full ${item.color}/20 mb-2 group-hover:rotate-12 transition-transform`}>
                  <item.icon className={`w-5 h-5 ${item.text}`} />
                </div>
                <span className="text-2xl font-bold text-white mb-0.5">{item.value}</span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardStats;