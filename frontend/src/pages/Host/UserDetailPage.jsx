import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, Lock, Ban, Shield, Mail, Calendar, Activity, MapPin, Phone, AlertCircle, CheckCircle, Edit2, Save, X } from 'lucide-react';

const UserDetailPage = () => {
	const { id: userId } = useParams();
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState({});
	const [actionLoading, setActionLoading] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const [resetPassword, setResetPassword] = useState('');

	useEffect(() => {
		fetchUserDetails();
	}, [userId]);

	const fetchUserDetails = async () => {
		try {
			setLoading(true);
			const response = await axiosInstance.get(API_PATHS.USERS.GET_USER_BY_ID(userId));
			setUser(response.data?.data || response.data);
			setEditData(response.data?.data || response.data);
		} catch (error) {
			console.error('Error fetching user details:', error);
			toast.error('Failed to load user details');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteUser = async () => {
		try {
			setActionLoading(true);
			await axiosInstance.delete(API_PATHS.USERS.DELETE_USER(userId));
			toast.success('User deleted successfully');
			setTimeout(() => navigate('/host/users'), 1500);
		} catch (error) {
			console.error('Error deleting user:', error);
			toast.error(error.response?.data?.message || 'Failed to delete user');
		} finally {
			setActionLoading(false);
			setShowDeleteConfirm(false);
		}
	};

	const handleResetPassword = async () => {
		try {
			if (!resetPassword || resetPassword.length < 6) {
				toast.error('Password must be at least 6 characters');
				return;
			}
			setActionLoading(true);
			await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(userId), {
				password: resetPassword
			});
			toast.success('Password reset successfully');
			setResetPassword('');
			setShowResetConfirm(false);
			fetchUserDetails();
		} catch (error) {
			console.error('Error resetting password:', error);
			toast.error(error.response?.data?.message || 'Failed to reset password');
		} finally {
			setActionLoading(false);
		}
	};

	const handleToggleBan = async () => {
		try {
			setActionLoading(true);
			const newStatus = user.isBanned ? 'active' : 'banned';
			await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(userId), {
				isBanned: !user.isBanned,
				status: newStatus
			});
			toast.success(`User ${newStatus} successfully`);
			setUser({ ...user, isBanned: !user.isBanned, status: newStatus });
		} catch (error) {
			console.error('Error banning user:', error);
			toast.error(error.response?.data?.message || 'Failed to update user status');
		} finally {
			setActionLoading(false);
		}
	};

	const handleChangeRole = async (newRole) => {
		try {
			setActionLoading(true);
			await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(userId), {
				role: newRole
			});
			toast.success(`User role changed to ${newRole}`);
			setUser({ ...user, role: newRole });
		} catch (error) {
			console.error('Error changing role:', error);
			toast.error(error.response?.data?.message || 'Failed to change user role');
		} finally {
			setActionLoading(false);
		}
	};

	const handleSaveChanges = async () => {
		try {
			setActionLoading(true);
			await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(userId), {
				name: editData.name,
				email: editData.email,
			});
			toast.success('User details updated successfully');
			setUser(editData);
			setIsEditing(false);
		} catch (error) {
			console.error('Error updating user:', error);
			toast.error(error.response?.data?.message || 'Failed to update user');
		} finally {
			setActionLoading(false);
		}
	};

	if (loading) {
		return (
			<DashboardLayout activeMenu="Global Users">
				<div className="flex items-center justify-center h-96">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#EA8D23] mx-auto mb-4"></div>
						<p className="text-gray-400">Loading user details...</p>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	if (!user) {
		return (
			<DashboardLayout activeMenu="Global Users">
				<div className="flex items-center justify-center h-96">
					<p className="text-gray-400">User not found</p>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout activeMenu="Global Users">
			{/* Back Button */}
			<button
				onClick={() => navigate('/host/users')}
				className="flex items-center gap-2 text-[#EA8D23] hover:text-[#EA8D23]/80 mb-6 transition-colors"
			>
				<ArrowLeft className="w-5 h-5" />
				Back to Users
			</button>

			{/* Main Container */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* User Profile Card */}
				<div className="lg:col-span-1">
					<div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-6 sticky top-6">
						{/* Profile Image */}
						<div className="flex justify-center mb-4">
							<div className="relative">
								<img
									src={user.profileImageUrl || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
									alt={user.name}
									className="w-32 h-32 rounded-full object-cover border-4 border-[#EA8D23]/50"
								/>
								{user.isBanned && (
									<div className="absolute inset-0 rounded-full bg-red-500/30 flex items-center justify-center">
										<Ban className="w-8 h-8 text-red-400" />
									</div>
								)}
								{user.status === 'online' && (
									<span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050505]"></span>
								)}
							</div>
						</div>

						{/* User Name and Email */}
						<h2 className="text-2xl font-bold text-white text-center mb-1">{user.name}</h2>
						<p className="text-gray-400 text-center text-sm mb-4">{user.email}</p>

						{/* Role Badge */}
						<div className="flex justify-center mb-4">
							<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
								user.role === 'admin' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
								user.role === 'host' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
								'bg-blue-500/20 text-blue-300 border-blue-500/30'
							}`}>
								{user.role?.toUpperCase()}
							</span>
						</div>

						{/* Status Badge */}
						<div className="flex justify-center mb-6">
							<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
								user.isBanned ? 'bg-red-500/20 text-red-300 border-red-500/30' :
								user.status === 'online' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
								'bg-gray-500/20 text-gray-400 border-gray-500/30'
							}`}>
								{user.isBanned ? 'BANNED' : (user.status === 'online' ? 'ONLINE' : 'OFFLINE')}
							</span>
						</div>

						{/* Quick Stats */}
						<div className="space-y-2 mb-6 pb-6 border-b border-white/10">
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-400">Joined</span>
								<span className="text-white">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-400">ID</span>
								<span className="text-white text-xs truncate">{user._id}</span>
							</div>
						</div>

						{/* Change Role Section */}
						<div className="mb-6">
							<p className="text-sm text-gray-400 mb-3 font-semibold">Change Role</p>
							<div className="space-y-2">
								{user.role !== 'admin' && (
									<button
										onClick={() => handleChangeRole('admin')}
										disabled={actionLoading}
										className="w-full flex items-center justify-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 py-2 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
									>
										<Shield className="w-4 h-4" />
										Make Admin
									</button>
								)}
								{user.role !== 'member' && (
									<button
										onClick={() => handleChangeRole('member')}
										disabled={actionLoading}
										className="w-full flex items-center justify-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 py-2 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
									>
										<Shield className="w-4 h-4" />
										Make Member
									</button>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Details and Actions */}
				<div className="lg:col-span-2 space-y-6">
					{/* User Information Card */}
					<div className="bg-white/5 border border-white/10 rounded-xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-xl font-bold text-white flex items-center gap-2">
								<Activity className="w-5 h-5 text-[#EA8D23]" />
								User Information
							</h3>
							{!isEditing ? (
								<button
									onClick={() => setIsEditing(true)}
									className="flex items-center gap-2 text-[#EA8D23] hover:text-[#EA8D23]/80 transition-colors"
								>
									<Edit2 className="w-4 h-4" />
									Edit
								</button>
							) : null}
						</div>

						{isEditing ? (
							<div className="space-y-4">
								<div>
									<label className="text-sm text-gray-400 block mb-2">Name</label>
									<input
										type="text"
										value={editData.name || ''}
										onChange={(e) => setEditData({ ...editData, name: e.target.value })}
										className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA8D23]/50"
									/>
								</div>
								<div>
									<label className="text-sm text-gray-400 block mb-2">Email</label>
									<input
										type="email"
										value={editData.email || ''}
										onChange={(e) => setEditData({ ...editData, email: e.target.value })}
										className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA8D23]/50"
									/>
								</div>
								<div className="flex gap-3 pt-4">
									<button
										onClick={handleSaveChanges}
										disabled={actionLoading}
										className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/30 text-green-300 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
									>
										<Save className="w-4 h-4" />
										Save Changes
									</button>
									<button
										onClick={() => {
											setIsEditing(false);
											setEditData(user);
										}}
										className="flex-1 flex items-center justify-center gap-2 bg-gray-500/20 border border-gray-500/30 text-gray-300 py-2 rounded-lg hover:bg-gray-500/30 transition-colors"
									>
										<X className="w-4 h-4" />
										Cancel
									</button>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
									<div className="flex items-center gap-2 text-gray-400">
										<Mail className="w-4 h-4" />
										Email
									</div>
									<span className="text-white">{user.email}</span>
								</div>
								<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
									<div className="flex items-center gap-2 text-gray-400">
										<Shield className="w-4 h-4" />
										Role
									</div>
									<span className="text-white capitalize">{user.role}</span>
								</div>
								<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
									<div className="flex items-center gap-2 text-gray-400">
										<Calendar className="w-4 h-4" />
										Joined Date
									</div>
									<span className="text-white">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
								</div>
								<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
									<div className="flex items-center gap-2 text-gray-400">
										<Activity className="w-4 h-4" />
										Status
									</div>
									<span className={`capitalize font-semibold ${user.status === 'online' ? 'text-green-400' : 'text-gray-400'}`}>
										{user.status}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Dangerous Actions */}
					<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
						<div className="flex items-center gap-2 mb-6">
							<AlertCircle className="w-5 h-5 text-red-400" />
							<h3 className="text-xl font-bold text-red-400">Danger Zone</h3>
						</div>

						<div className="space-y-3">
							{/* Reset Password */}
							<button
								onClick={() => setShowResetConfirm(true)}
								className="w-full flex items-center justify-between gap-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 p-4 rounded-lg hover:bg-yellow-500/30 transition-colors"
							>
								<div className="flex items-center gap-2">
									<Lock className="w-5 h-5" />
									<div className="text-left">
										<p className="font-semibold">Reset Password</p>
										<p className="text-xs text-yellow-400/60">Generate a new password for this user</p>
									</div>
								</div>
							</button>

							{/* Ban/Unban User */}
							<button
								onClick={handleToggleBan}
								disabled={actionLoading}
								className={`w-full flex items-center justify-between gap-2 p-4 rounded-lg transition-colors disabled:opacity-50 ${
									user.isBanned
										? 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30'
										: 'bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30'
								}`}
							>
								<div className="flex items-center gap-2">
									<Ban className="w-5 h-5" />
									<div className="text-left">
										<p className="font-semibold">{user.isBanned ? 'Unban User' : 'Ban User'}</p>
										<p className="text-xs text-yellow-400/60">{user.isBanned ? 'Allow user to access system' : 'Prevent user from accessing the system'}</p>
									</div>
								</div>
								<CheckCircle className="w-5 h-5" />
							</button>

							{/* Delete User */}
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="w-full flex items-center justify-between gap-2 bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-lg hover:bg-red-500/30 transition-colors"
							>
								<div className="flex items-center gap-2">
									<Trash2 className="w-5 h-5" />
									<div className="text-left">
										<p className="font-semibold">Delete User</p>
										<p className="text-xs text-red-400/60">Permanently remove this user from the system</p>
									</div>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="bg-[#050505] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
						<h3 className="text-xl font-bold text-white mb-2">Delete User?</h3>
						<p className="text-gray-400 mb-6">
							Are you sure you want to permanently delete <span className="font-semibold text-white">{user.name}</span>? This action cannot be undone.
						</p>
						<div className="flex gap-3">
							<button
								onClick={() => setShowDeleteConfirm(false)}
								className="flex-1 px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteUser}
								disabled={actionLoading}
								className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
							>
								{actionLoading ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reset Password Modal */}
			{showResetConfirm && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="bg-[#050505] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
						<h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
						<p className="text-gray-400 mb-4">
							Enter a new password for <span className="font-semibold text-white">{user.name}</span>:
						</p>
						<input
							type="password"
							value={resetPassword}
							onChange={(e) => setResetPassword(e.target.value)}
							placeholder="New password (min 6 characters)"
							className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA8D23]/50 mb-6"
						/>
						<div className="flex gap-3">
							<button
								onClick={() => {
									setShowResetConfirm(false);
									setResetPassword('');
								}}
								className="flex-1 px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleResetPassword}
								disabled={actionLoading || !resetPassword}
								className="flex-1 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
							>
								{actionLoading ? 'Resetting...' : 'Reset'}
							</button>
						</div>
					</div>
				</div>
			)}
		</DashboardLayout>
	);
};

export default UserDetailPage;
