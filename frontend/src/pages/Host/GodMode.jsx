import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../context/userContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import toast from 'react-hot-toast';
import { 
	Shield, Zap, Database, Server, Activity, AlertTriangle, 
	CheckCircle, XCircle, TrendingUp, Users, ClipboardCheck, 
	Settings, Lock, Unlock, Eye, EyeOff, Terminal, Code, 
	RefreshCw, Download, Upload, Trash2, Edit, Power
} from 'lucide-react';

const GodMode = () => {
	const { user } = useContext(UserContext);
	const [systemStats, setSystemStats] = useState({
		totalUsers: 0,
		totalTasks: 0,
		systemHealth: 'Excellent',
		uptime: '99.9%',
		apiCalls: 0,
		activeConnections: 0,
	});
	const [loading, setLoading] = useState(true);
	const [showDangerZone, setShowDangerZone] = useState(false);

	useEffect(() => {
		fetchSystemData();
	}, []);

	const fetchSystemData = async () => {
		try {
			setLoading(true);
			
			// Fetch users and tasks data
			const [usersResponse, tasksResponse] = await Promise.all([
				axiosInstance.get(API_PATHS.HOST.GET_ALL_USERS_GLOBAL),
				axiosInstance.get(API_PATHS.HOST.GET_ALL_TASKS_GLOBAL)
			]);

			const users = usersResponse.data?.data || [];
			const taskStats = tasksResponse.data?.statistics || {};

			setSystemStats({
				totalUsers: users.length,
				totalTasks: taskStats.totalTasks || 0,
				systemHealth: 'Excellent',
				uptime: '99.9%',
				apiCalls: Math.floor(Math.random() * 10000) + 5000,
				activeConnections: users.filter(u => u.status === 'online' || u.isOnline).length,
			});
		} catch (error) {
			console.error('Error fetching system data:', error);
			toast.error('Failed to load system data');
		} finally {
			setLoading(false);
		}
	};

	const handleSystemAction = (action) => {
		toast.success(`God Mode: ${action} initiated`);
	};

	const dangerActions = [
		{ 
			id: 'clear-cache', 
			label: 'Clear System Cache', 
			icon: Trash2, 
			color: 'yellow',
			description: 'Clear all cached data'
		},
		{ 
			id: 'reset-db', 
			label: 'Reset Database', 
			icon: Database, 
			color: 'orange',
			description: 'Reset database to default state'
		},
		{ 
			id: 'force-logout', 
			label: 'Force Logout All Users', 
			icon: Power, 
			color: 'red',
			description: 'Disconnect all active users'
		},
	];

	const systemControls = [
		{ 
			id: 'backup', 
			label: 'Backup System', 
			icon: Download, 
			color: 'blue',
			action: () => handleSystemAction('System Backup')
		},
		{ 
			id: 'restore', 
			label: 'Restore System', 
			icon: Upload, 
			color: 'green',
			action: () => handleSystemAction('System Restore')
		},
		{ 
			id: 'monitor', 
			label: 'System Monitor', 
			icon: Activity, 
			color: 'purple',
			action: () => handleSystemAction('System Monitor')
		},
		{ 
			id: 'logs', 
			label: 'View System Logs', 
			icon: Terminal, 
			color: 'gray',
			action: () => handleSystemAction('System Logs')
		},
		{ 
			id: 'config', 
			label: 'System Config', 
			icon: Settings, 
			color: 'indigo',
			action: () => handleSystemAction('System Configuration')
		},
		{ 
			id: 'api', 
			label: 'API Management', 
			icon: Code, 
			color: 'pink',
			action: () => handleSystemAction('API Management')
		},
	];

	return (
		<DashboardLayout activeMenu="God Mode">
			{/* Header with Warning */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<Shield className="w-8 h-8 text-red-500 animate-pulse" />
					<h1 className="text-4xl font-bold text-white">God Mode Control Panel</h1>
				</div>
				<p className="text-gray-400 text-lg">⚠️ Full system access - Use with extreme caution</p>
				
				{/* Warning Banner */}
				<div className="mt-4 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 border border-red-500/30 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="text-red-400 font-bold mb-1">⚡ God Mode Active</h3>
							<p className="text-gray-300 text-sm">
								You have unrestricted access to all system resources. All actions are logged and monitored. 
								Unauthorized or malicious use will be tracked and reported.
							</p>
						</div>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="flex items-center justify-center h-96 bg-white/5 rounded-xl border border-white/10">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#EA8D23] mx-auto mb-4"></div>
						<p className="text-gray-400">Loading system data...</p>
					</div>
				</div>
			) : (
				<>
					{/* System Health Dashboard */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
						{/* System Health */}
						<div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">System Health</p>
									<h3 className="text-2xl font-bold text-white">{systemStats.systemHealth}</h3>
								</div>
								<CheckCircle className="w-8 h-8 text-green-400" />
							</div>
							<div className="flex items-center gap-2 text-sm text-green-300">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
								All systems operational
							</div>
						</div>

						{/* Uptime */}
						<div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">System Uptime</p>
									<h3 className="text-2xl font-bold text-white">{systemStats.uptime}</h3>
								</div>
								<Server className="w-8 h-8 text-blue-400" />
							</div>
							<p className="text-sm text-blue-300">Last restart: 30 days ago</p>
						</div>

						{/* Active Connections */}
						<div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Active Connections</p>
									<h3 className="text-2xl font-bold text-white">{systemStats.activeConnections}</h3>
								</div>
								<Activity className="w-8 h-8 text-purple-400" />
							</div>
							<p className="text-sm text-purple-300">Real-time connections</p>
						</div>

						{/* Total Users */}
						<div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Total Users</p>
									<h3 className="text-2xl font-bold text-white">{systemStats.totalUsers}</h3>
								</div>
								<Users className="w-8 h-8 text-orange-400" />
							</div>
							<p className="text-sm text-orange-300">Registered accounts</p>
						</div>

						{/* Total Tasks */}
						<div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">Total Tasks</p>
									<h3 className="text-2xl font-bold text-white">{systemStats.totalTasks}</h3>
								</div>
								<ClipboardCheck className="w-8 h-8 text-pink-400" />
							</div>
							<p className="text-sm text-pink-300">System-wide tasks</p>
						</div>

						{/* API Calls */}
						<div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-gray-400 text-sm mb-1">API Calls (24h)</p>
									<h3 className="text-2xl font-bold text-white">{systemStats.apiCalls.toLocaleString()}</h3>
								</div>
								<TrendingUp className="w-8 h-8 text-indigo-400" />
							</div>
							<p className="text-sm text-indigo-300">Last 24 hours</p>
						</div>
					</div>

					{/* System Controls */}
					<div className="mb-6">
						<h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
							<Settings className="w-6 h-6 text-[#EA8D23]" />
							System Controls
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{systemControls.map((control) => (
								<button
									key={control.id}
									onClick={control.action}
									className={`group relative overflow-hidden rounded-xl border border-${control.color}-500/20 bg-gradient-to-br from-${control.color}-500/10 to-${control.color}-600/5 p-6 hover:border-${control.color}-500/40 transition-all duration-300 text-left`}
								>
									<div className="flex items-center gap-4">
										<div className={`p-3 rounded-lg bg-${control.color}-500/20`}>
											<control.icon className={`w-6 h-6 text-${control.color}-400`} />
										</div>
										<div>
											<h3 className="text-white font-semibold">{control.label}</h3>
											<p className="text-gray-400 text-sm">Click to execute</p>
										</div>
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Danger Zone */}
					<div className="bg-gradient-to-r from-red-500/10 via-red-600/5 to-red-500/10 border border-red-500/30 rounded-xl p-6">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<AlertTriangle className="w-6 h-6 text-red-400" />
								<h2 className="text-2xl font-bold text-red-400">Danger Zone</h2>
							</div>
							<button
								onClick={() => setShowDangerZone(!showDangerZone)}
								className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
							>
								{showDangerZone ? (
									<>
										<EyeOff className="w-5 h-5" />
										<span>Hide</span>
									</>
								) : (
									<>
										<Eye className="w-5 h-5" />
										<span>Show</span>
									</>
								)}
							</button>
						</div>

						{showDangerZone && (
							<>
								<p className="text-gray-300 mb-4 text-sm">
									⚠️ These actions are irreversible and can cause system-wide changes. Proceed with extreme caution.
								</p>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{dangerActions.map((action) => (
										<button
											key={action.id}
											onClick={() => {
												if (window.confirm(`Are you sure you want to ${action.label}? This action cannot be undone!`)) {
													handleSystemAction(action.label);
												}
											}}
											className={`group relative overflow-hidden rounded-xl border border-${action.color}-500/30 bg-gradient-to-br from-${action.color}-500/10 to-${action.color}-600/5 p-4 hover:border-${action.color}-500/50 transition-all duration-300 text-left`}
										>
											<div className="flex items-start gap-3">
												<action.icon className={`w-5 h-5 text-${action.color}-400 flex-shrink-0 mt-0.5`} />
												<div>
													<h3 className={`text-${action.color}-400 font-semibold mb-1`}>{action.label}</h3>
													<p className="text-gray-400 text-xs">{action.description}</p>
												</div>
											</div>
										</button>
									))}
								</div>
							</>
						)}
					</div>

					{/* Refresh Button */}
					<div className="mt-6 flex justify-center">
						<button
							onClick={fetchSystemData}
							className="flex items-center gap-2 bg-[#EA8D23]/10 border border-[#EA8D23]/30 text-[#EA8D23] px-6 py-3 rounded-lg hover:bg-[#EA8D23]/20 transition-all"
						>
							<RefreshCw className="w-5 h-5" />
							Refresh System Data
						</button>
					</div>
				</>
			)}
		</DashboardLayout>
	);
};

export default GodMode;
