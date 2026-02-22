import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../context/userContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import toast from 'react-hot-toast';
import { Users, Zap, TrendingUp, AlertCircle, CheckCircle2, Clock, BarChart3, Shield } from 'lucide-react';
import AuditLogs from "./Auditlogs";

const HostDashboard = () => {
	const { user } = useContext(UserContext);
	const [stats, setStats] = useState({
		totalUsers: 0,
		totalAdmins: 0,
		totalMembers: 0,
		totalTasks: 0,
		completedTasks: 0,
		pendingTasks: 0,
		inProgressTasks: 0,
	});
	const [loading, setLoading] = useState(true);
	const [onlineUsers, setOnlineUsers] = useState(0);

	useEffect(() => {
		const fetchHostDashboardData = async () => {
			try {
				setLoading(true);

				// Fetch all users globally
				const usersResponse = await axiosInstance.get(API_PATHS.HOST.GET_ALL_USERS_GLOBAL);
				const users = usersResponse.data?.data || [];

				// Fetch all tasks globally
				const tasksResponse = await axiosInstance.get(API_PATHS.HOST.GET_ALL_TASKS_GLOBAL);
				const taskStats = tasksResponse.data?.statistics || {};

				// Calculate user statistics
				const totalAdmins = users.filter(u => u.role === 'admin').length;
				const totalMembers = users.filter(u => u.role === 'member').length;
				const onlineCount = users.filter(u => u.status === 'online' || u.isOnline).length;

				setStats({
					totalUsers: users.length,
					totalAdmins,
					totalMembers,
					totalTasks: taskStats.totalTasks || 0,
					completedTasks: taskStats.completedTasks || 0,
					pendingTasks: taskStats.pendingTasks || 0,
					inProgressTasks: taskStats.inProgressTasks || 0,
				});
				setOnlineUsers(onlineCount);
			} catch (error) {
				console.error('Error fetching host dashboard data:', error);
				toast.error('Failed to load dashboard data');
			} finally {
				setLoading(false);
			}
		};

		if (user?.role === 'host') {
			fetchHostDashboardData();
		}
	}, [user]);

	const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
	const pendingRate = stats.totalTasks > 0 ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0;

	return (
		<DashboardLayout activeMenu="Host Dashboard">
			{/* Header Section */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<Shield className="w-8 h-8 text-[#EA8D23]" />
					<h1 className="text-4xl font-bold text-white">Host Control Panel</h1>
				</div>
				<p className="text-gray-400 text-lg">Global God Mode - Full System Access & Control</p>
				<p className="text-gray-500 text-sm mt-1">Welcome back, System Host • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
			</div>

			{loading ? (
				<div className="flex items-center justify-center h-96 bg-white/5 rounded-xl border border-white/10">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#EA8D23] mx-auto mb-4"></div>
						<p className="text-gray-400">Loading dashboard data...</p>
					</div>
				</div>
			) : (
				<>
					{/* Key Metrics Row 1 */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						{/* Total Users Card */}
						<div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all duration-300">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Total Users</p>
									<h3 className="text-3xl font-bold text-white">{stats.totalUsers}</h3>
								</div>
								<Users className="w-8 h-8 text-blue-400 opacity-60" />
							</div>
							<div className="flex gap-4 text-sm">
								<div>
									<p className="text-gray-500">Admins</p>
									<p className="text-blue-300 font-semibold">{stats.totalAdmins}</p>
								</div>
								<div>
									<p className="text-gray-500">Members</p>
									<p className="text-blue-300 font-semibold">{stats.totalMembers}</p>
								</div>
								<div>
									<p className="text-gray-500">Online</p>
									<p className="text-green-300 font-semibold">{onlineUsers}</p>
								</div>
							</div>
						</div>

						{/* Total Tasks Card */}
						<div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Total Tasks</p>
									<h3 className="text-3xl font-bold text-white">{stats.totalTasks}</h3>
								</div>
								<BarChart3 className="w-8 h-8 text-purple-400 opacity-60" />
							</div>
							<div className="w-full bg-white/5 rounded-full h-1.5 border border-purple-500/20">
								<div
									className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all duration-500"
									style={{ width: `${completionRate}%` }}
								></div>
							</div>
							<p className="text-xs text-gray-500 mt-2">{completionRate}% completion rate</p>
						</div>

						{/* Completed Tasks Card */}
						<div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all duration-300">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Completed</p>
									<h3 className="text-3xl font-bold text-white">{stats.completedTasks}</h3>
								</div>
								<CheckCircle2 className="w-8 h-8 text-green-400 opacity-60" />
							</div>
							<p className="text-sm text-green-300">✓ Tasks finished</p>
							<div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
								<TrendingUp className="w-3 h-3" />
								{stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% of total` : 'No tasks'}
							</div>
						</div>

						{/* Pending & In Progress Card */}
						<div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6 hover:border-orange-500/40 transition-all duration-300">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Active Tasks</p>
									<h3 className="text-3xl font-bold text-white">{stats.pendingTasks + stats.inProgressTasks}</h3>
								</div>
								<Clock className="w-8 h-8 text-orange-400 opacity-60" />
							</div>
							<div className="space-y-1 text-sm">
								<div className="flex justify-between">
									<p className="text-gray-500">Pending</p>
									<p className="text-orange-300 font-semibold">{stats.pendingTasks}</p>
								</div>
								<div className="flex justify-between">
									<p className="text-gray-500">In Progress</p>
									<p className="text-yellow-300 font-semibold">{stats.inProgressTasks}</p>
								</div>
							</div>
						</div>
					</div>

					{/* System Status Box */}
					<div className="bg-gradient-to-r from-[#EA8D23]/20 via-orange-500/10 to-red-500/10 border border-[#EA8D23]/30 rounded-xl p-6 mb-6 backdrop-blur-sm">
						<div className="flex items-start gap-4">
							<Zap className="w-6 h-6 text-[#EA8D23] flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<h2 className="text-xl font-bold text-[#EA8D23] mb-3">⚡ God Mode Status</h2>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<p className="text-gray-400 text-sm mb-1">System Status</p>
										<p className="text-white font-semibold flex items-center gap-2">
											<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
											Online & Active
										</p>
									</div>
									<div>
										<p className="text-gray-400 text-sm mb-1">Access Level</p>
										<p className="text-[#EA8D23] font-semibold">🔱 Full God Mode</p>
									</div>
									<div>
										<p className="text-gray-400 text-sm mb-1">Capabilities</p>
										<p className="text-white font-semibold">View, Edit, Delete Any Resource</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Global Users Action */}
						<button
							onClick={() => window.location.href = '/host/users'}
							className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 hover:border-blue-500/40 transition-all duration-300 text-left"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							<div className="relative">
								<div className="flex items-center justify-between mb-3">
									<Users className="w-8 h-8 text-blue-400" />
									<span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">New</span>
								</div>
								<h3 className="text-lg font-bold text-white mb-1">Global Users Manager</h3>
								<p className="text-sm text-gray-400">View and manage all {stats.totalUsers} users in the system</p>
								<div className="mt-4 flex items-center gap-2 text-blue-400 text-sm group-hover:gap-3 transition-all">
									<span>Access Manager</span>
									<span>→</span>
								</div>
							</div>
						</button>

						{/* Global Tasks Action */}
						<button
							onClick={() => window.location.href = '/host/tasks'}
							className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-6 hover:border-purple-500/40 transition-all duration-300 text-left"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							<div className="relative">
								<div className="flex items-center justify-between mb-3">
									<BarChart3 className="w-8 h-8 text-purple-400" />
									<span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Active</span>
								</div>
								<h3 className="text-lg font-bold text-white mb-1">Global Task Manager</h3>
								<p className="text-sm text-gray-400">Manage all {stats.totalTasks} tasks with full CRUD operations</p>
								<div className="mt-4 flex items-center gap-2 text-purple-400 text-sm group-hover:gap-3 transition-all">
									<span>View Tasks</span>
									<span>→</span>
								</div>
							</div>
						</button>

						{/* System Analytics Action */}
						<button
							onClick={() => toast.info('Analytics dashboard coming soon')}
							className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 hover:border-emerald-500/40 transition-all duration-300 text-left cursor-pointer"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							<div className="relative">
								<div className="flex items-center justify-between mb-3">
									<AlertCircle className="w-8 h-8 text-emerald-400" />
									<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">Coming</span>
								</div>
								<h3 className="text-lg font-bold text-white mb-1">System Analytics</h3>
								<p className="text-sm text-gray-400">Advanced metrics, reports, and system insights</p>
								<div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm group-hover:gap-3 transition-all">
									<span>View Analytics</span>
									<span>→</span>
								</div>
							</div>
						</button>
					</div>
					<div className="pt-4 border-t border-gray-100 dark:border-gray-800">
						<AuditLogs />
					</div>

					{/* Footer Stats */}
					<div className="mt-8 pt-6 border-t border-white/10">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
							<div>
								<p className="text-gray-500 text-xs mb-1">Completion Rate</p>
								<p className="text-2xl font-bold text-green-400">{completionRate}%</p>
							</div>
							<div>
								<p className="text-gray-500 text-xs mb-1">Pending Rate</p>
								<p className="text-2xl font-bold text-orange-400">{pendingRate}%</p>
							</div>
							<div>
								<p className="text-gray-500 text-xs mb-1">Avg Per User</p>
								<p className="text-2xl font-bold text-blue-400">{stats.totalUsers > 0 ? Math.round(stats.totalTasks / stats.totalUsers) : 0}</p>
							</div>
							<div>
								<p className="text-gray-500 text-xs mb-1">System Load</p>
								<p className="text-2xl font-bold text-purple-400">{Math.round((stats.inProgressTasks / Math.max(stats.totalTasks, 1)) * 100)}%</p>
							</div>
						</div>
					</div>
				</>
			)}
		</DashboardLayout>
	);
};

export default HostDashboard;
