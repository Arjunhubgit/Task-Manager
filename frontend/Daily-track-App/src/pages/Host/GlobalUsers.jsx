import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/userContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import toast from 'react-hot-toast';


import { Users, Search, Shield, UserCheck, UserX, Mail, Calendar, Activity, Filter, Download, RefreshCw } from 'lucide-react';

const GlobalUsers = () => {
	const navigate = useNavigate();
	const { user } = useContext(UserContext);
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterRole, setFilterRole] = useState('all');
	const [filterStatus, setFilterStatus] = useState('all');

	useEffect(() => {
		fetchAllUsers();
	}, []);

	const fetchAllUsers = async () => {
		try {
			setLoading(true);
			const response = await axiosInstance.get(API_PATHS.HOST.GET_ALL_USERS_GLOBAL);
			setUsers(response.data?.data || []);
		} catch (error) {
			console.error('Error fetching users:', error);
			toast.error('Failed to load users');
		} finally {
			setLoading(false);
		}
	};


	// Filter users based on search and filters
	const filteredUsers = users.filter(u => {
		const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			u.email?.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesRole = filterRole === 'all' || u.role === filterRole;
		const matchesStatus = filterStatus === 'all' || 
			(filterStatus === 'online' && (u.status === 'online' || u.isOnline)) ||
			(filterStatus === 'offline' && (u.status !== 'online' && !u.isOnline));
		return matchesSearch && matchesRole && matchesStatus;
	});

	const stats = {
		total: users.length,
		admins: users.filter(u => u.role === 'admin').length,
		members: users.filter(u => u.role === 'member').length,
		hosts: users.filter(u => u.role === 'host').length,
		online: users.filter(u => u.status === 'online' || u.isOnline).length,
	};

	const getRoleBadge = (role) => {
		const badges = {
			admin: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
			host: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
			member: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
		};
		return badges[role] || badges.member;
	};

	const getStatusBadge = (u) => {
		const isOnline = u.status === 'online' || u.isOnline;
		return isOnline 
			? 'bg-green-500/20 text-green-300 border-green-500/30'
			: 'bg-gray-500/20 text-gray-400 border-gray-500/30';
	};

	return (
		<DashboardLayout activeMenu="Global Users">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<Users className="w-8 h-8 text-[#EA8D23]" />
					<h1 className="text-4xl font-bold text-white">Global Users Manager</h1>
				</div>
				<p className="text-gray-400 text-lg">View and manage all users across the entire system</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
				<div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
					<p className="text-gray-400 text-xs mb-1">Total Users</p>
					<p className="text-2xl font-bold text-white">{stats.total}</p>
				</div>
				<div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
					<p className="text-gray-400 text-xs mb-1">Admins</p>
					<p className="text-2xl font-bold text-white">{stats.admins}</p>
				</div>
				<div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
					<p className="text-gray-400 text-xs mb-1">Hosts</p>
					<p className="text-2xl font-bold text-white">{stats.hosts}</p>
				</div>
				<div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
					<p className="text-gray-400 text-xs mb-1">Members</p>
					<p className="text-2xl font-bold text-white">{stats.members}</p>
				</div>
				<div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
					<p className="text-gray-400 text-xs mb-1">Online Now</p>
					<p className="text-2xl font-bold text-white flex items-center gap-2">
						{stats.online}
						<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
					</p>
				</div>
			</div>

			{/* Filters and Search */}
			<div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
				<div className="flex flex-col md:flex-row gap-4">
					{/* Search */}
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Search by name or email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA8D23]/50"
						/>
					</div>

					{/* Role Filter */}
					<select
						value={filterRole}
						onChange={(e) => setFilterRole(e.target.value)}
						className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#EA8D23]/50"
					>
						<option value="all">All Roles</option>
						<option value="admin">Admins</option>
						<option value="host">Hosts</option>
						<option value="member">Members</option>
					</select>

					{/* Status Filter */}
					<select
						value={filterStatus}
						onChange={(e) => setFilterStatus(e.target.value)}
						className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#EA8D23]/50"
					>
						<option value="all">All Status</option>
						<option value="online">Online</option>
						<option value="offline">Offline</option>
					</select>

					{/* Refresh Button */}
					<button
						onClick={fetchAllUsers}
						className="flex items-center gap-2 bg-[#EA8D23]/10 border border-[#EA8D23]/30 text-[#EA8D23] px-4 py-2.5 rounded-lg hover:bg-[#EA8D23]/20 transition-all"
					>
						<RefreshCw className="w-5 h-5" />

						Refresh
					</button>
				</div>
			</div>

			{/* Users Table */}
			{loading ? (
				<div className="flex items-center justify-center h-96 bg-white/5 rounded-xl border border-white/10">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#EA8D23] mx-auto mb-4"></div>
						Loading users...
					</div>
				</div>
			) : (
				<div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-white/5 border-b border-white/10">
								<tr>
									<th className="text-left p-4 text-gray-400 font-semibold text-sm">User</th>
									<th className="text-left p-4 text-gray-400 font-semibold text-sm">Email</th>
									<th className="text-left p-4 text-gray-400 font-semibold text-sm">Role</th>
									<th className="text-left p-4 text-gray-400 font-semibold text-sm">Status</th>
									<th className="text-left p-4 text-gray-400 font-semibold text-sm">Joined</th>
									<th className="text-left p-4 text-gray-400 font-semibold text-sm">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredUsers.length === 0 ? (
									<tr>
										<td colSpan="6" className="text-center p-8 text-gray-400">
											No users found matching your criteria
										</td>
									</tr>
								) : (
									filteredUsers.map((u) => (
										<tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
											<td className="p-4">
												<div className="flex items-center gap-3">
													<div className="relative">
														<img
															src={u.profileImageUrl || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
															alt={u.name}
															className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
														/>
														{(u.status === 'online' || u.isOnline) && (
															<span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]"></span>
														)}
													</div>
													<div>
														<p className="text-white font-semibold">{u.name}</p>
														<p className="text-gray-500 text-xs">{u._id}</p>
													</div>
												</div>
											</td>
											<td className="p-4">
												<div className="flex items-center gap-2 text-gray-300">
													<Mail className="w-4 h-4 text-gray-500" />
													{u.email}
												</div>
											</td>
											<td className="p-4">
												<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(u.role)}`}>
													{u.role === 'admin' && <Shield className="w-3 h-3" />}
													{u.role === 'host' && <Activity className="w-3 h-3" />}
													{u.role === 'member' && <UserCheck className="w-3 h-3" />}
													{u.role?.toUpperCase()}
												</span>
											</td>
											<td className="p-4">
												<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(u)}`}>
													{(u.status === 'online' || u.isOnline) ? 'Online' : 'Offline'}
												</span>
											</td>
											<td className="p-4 text-gray-400 text-sm">
												<div className="flex items-center gap-2">
													<Calendar className="w-4 h-4 text-gray-500" />
													{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
												</div>
											</td>
											<td className="p-4">
												<button
													onClick={() => navigate(`/host/users/${u._id}`)}
													className="text-[#EA8D23] hover:text-[#EA8D23]/80 text-sm font-semibold transition-colors"
												>
													View Details
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Results Summary */}
			<div className="mt-4 text-center text-gray-400 text-sm">
				Showing {filteredUsers.length} of {users.length} users
			</div>
		</DashboardLayout>
	);
};

export default GlobalUsers;
