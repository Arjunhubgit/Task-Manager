import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuTrendingUp, LuUser, LuCircleCheckBig, LuAward } from "react-icons/lu";

const TeamPerformance = () => {
  const { user } = useContext(UserContext);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberStats, setMemberStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("completion");

  // Fetch team members and their stats
  const fetchTeamPerformance = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (response.data) {
        setTeamMembers(response.data);
        // Fetch performance stats for each member
        const stats = {};
        for (const member of response.data) {
          const taskResponse = await axiosInstance.get(API_PATHS.TASKS.GET_TASKS);
          // Filter tasks for this member and calculate stats
          const memberTasks = taskResponse.data || [];
          stats[member._id] = calculateMemberStats(memberTasks, member._id);
        }
        setMemberStats(stats);
      }
    } catch (error) {
      console.error("Error fetching team performance:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for each member
  const calculateMemberStats = (tasks, memberId) => {
    const memberTasks = tasks.filter((task) =>
      task.assignedTo?.includes(memberId) || task.createdBy === memberId
    );

    const completed = memberTasks.filter((t) => t.status === "Completed").length;
    const inProgress = memberTasks.filter((t) => t.status === "In Progress").length;
    const pending = memberTasks.filter((t) => t.status === "Pending").length;
    const high = memberTasks.filter((t) => t.priority === "High").length;

    const total = memberTasks.length;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

    return {
      total,
      completed,
      inProgress,
      pending,
      high,
      completionRate,
      efficiency: (completed + inProgress) / Math.max(total, 1),
    };
  };

  useEffect(() => {
    fetchTeamPerformance();
  }, []);

  // Sort team members based on selected criterion
  const getSortedMembers = () => {
    const membersWithStats = teamMembers.map((member) => ({
      ...member,
      stats: memberStats[member._id] || { total: 0, completed: 0, completionRate: 0, efficiency: 0 },
    }));

    switch (sortBy) {
      case "completion":
        return membersWithStats.sort((a, b) => b.stats.completionRate - a.stats.completionRate);
      case "tasks":
        return membersWithStats.sort((a, b) => b.stats.total - a.stats.total);
      case "efficiency":
        return membersWithStats.sort((a, b) => b.stats.efficiency - a.stats.efficiency);
      case "name":
        return membersWithStats.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return membersWithStats;
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="Team Performance">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading team performance...</div>
        </div>
      </DashboardLayout>
    );
  }

  const sortedMembers = getSortedMembers();

  // Get top performer
  const topPerformer = sortedMembers[0];

  // Calculate team averages
  const teamAverages = {
    completionRate:
      sortedMembers.length > 0
        ? (
            sortedMembers.reduce((sum, m) => sum + parseFloat(m.stats.completionRate), 0) /
            sortedMembers.length
          ).toFixed(1)
        : 0,
    avgTasks:
      sortedMembers.length > 0
        ? (sortedMembers.reduce((sum, m) => sum + m.stats.total, 0) / sortedMembers.length).toFixed(1)
        : 0,
  };

  return (
    <DashboardLayout activeMenu="Team Performance">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-100">Team Performance</h1>
          <p className="text-gray-400 mt-2">Monitor individual and team productivity metrics</p>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Team Members</span>
              <LuUser className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-300">{teamMembers.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active team members</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Avg Completion Rate</span>
              <LuTrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-300">{teamAverages.completionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Across all members</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Avg Tasks per Member</span>
              <LuCircleCheckBig className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-300">{teamAverages.avgTasks}</div>
            <p className="text-xs text-gray-500 mt-1">Total workload distribution</p>
          </div>
        </div>

        {/* Top Performer */}
        {topPerformer && (
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <LuAward className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-gray-100">Top Performer</h2>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={topPerformer.profileImageUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                  alt={topPerformer.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/50"
                />
                <div>
                  <h3 className="text-xl font-bold text-amber-300">{topPerformer.name}</h3>
                  <p className="text-sm text-gray-400">{topPerformer.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{topPerformer.stats.completed} tasks completed</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-300">{topPerformer.stats.completionRate}%</div>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("completion")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              sortBy === "completion"
                ? "bg-[#EA8D23]/20 text-[#EA8D23] border border-[#EA8D23]/50"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Completion Rate
          </button>
          <button
            onClick={() => setSortBy("tasks")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              sortBy === "tasks"
                ? "bg-[#EA8D23]/20 text-[#EA8D23] border border-[#EA8D23]/50"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Total Tasks
          </button>
          <button
            onClick={() => setSortBy("efficiency")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              sortBy === "efficiency"
                ? "bg-[#EA8D23]/20 text-[#EA8D23] border border-[#EA8D23]/50"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Efficiency
          </button>
          <button
            onClick={() => setSortBy("name")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              sortBy === "name"
                ? "bg-[#EA8D23]/20 text-[#EA8D23] border border-[#EA8D23]/50"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Name (A-Z)
          </button>
        </div>

        {/* Team Performance Table */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Member</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Total Tasks</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Completed</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">In Progress</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Pending</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Completion Rate</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, idx) => {
                  const stats = member.stats;
                  const completionRate = parseFloat(stats.completionRate);
                  let statusColor = "text-gray-400";
                  let statusText = "Neutral";

                  if (completionRate >= 80) {
                    statusColor = "text-green-400";
                    statusText = "Excellent";
                  } else if (completionRate >= 60) {
                    statusColor = "text-blue-400";
                    statusText = "Good";
                  } else if (completionRate >= 40) {
                    statusColor = "text-orange-400";
                    statusText = "Average";
                  } else {
                    statusColor = "text-red-400";
                    statusText = "Needs Improvement";
                  }

                  return (
                    <tr key={member._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.profileImageUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-200">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-bold text-gray-300">{stats.total}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-bold text-green-400">{stats.completed}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-bold text-blue-400">{stats.inProgress}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-bold text-orange-400">{stats.pending}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#EA8D23] to-orange-400 transition-all duration-500"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-200 min-w-[3rem]">{completionRate}%</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {sortedMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No team members found</p>
            </div>
          )}
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">High Performers</h2>
            <div className="space-y-3">
              {sortedMembers
                .filter((m) => parseFloat(m.stats.completionRate) >= 80)
                .slice(0, 5)
                .map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-300">{member.name}</span>
                    </div>
                    <span className="text-green-400 font-bold">{member.stats.completionRate}%</span>
                  </div>
                ))}
              {sortedMembers.filter((m) => parseFloat(m.stats.completionRate) >= 80).length === 0 && (
                <p className="text-gray-500 text-sm">No high performers yet</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">Needs Support</h2>
            <div className="space-y-3">
              {sortedMembers
                .filter((m) => parseFloat(m.stats.completionRate) < 50)
                .slice(0, 5)
                .map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-gray-300">{member.name}</span>
                    </div>
                    <span className="text-red-400 font-bold">{member.stats.completionRate}%</span>
                  </div>
                ))}
              {sortedMembers.filter((m) => parseFloat(m.stats.completionRate) < 50).length === 0 && (
                <p className="text-gray-500 text-sm">All team members are performing well</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPerformance;
