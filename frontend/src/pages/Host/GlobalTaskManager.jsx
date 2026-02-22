import React, { useContext, useEffect, useState, useCallback } from 'react';
import { UserContext } from '../../context/userContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { Trash2, Edit3, Eye } from 'lucide-react';

const GlobalTaskManager = () => {
	const { user } = useContext(UserContext);
	const [tasks, setTasks] = useState([]);
	const [filteredTasks, setFilteredTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState('All');
	const [priorityFilter, setPriorityFilter] = useState('All');
	const [selectedTask, setSelectedTask] = useState(null);
	const [showModal, setShowModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingTaskId, setDeletingTaskId] = useState(null);
	const [editingTask, setEditingTask] = useState(null);

	// Fetch all tasks globally
	const fetchAllTasks = useCallback(async () => {
		try {
			setLoading(true);
			const response = await axiosInstance.get(API_PATHS.HOST.GET_ALL_TASKS_GLOBAL);
			const tasksData = response.data?.data || [];
			setTasks(tasksData);
			filterTasks(tasksData, statusFilter, priorityFilter);
		} catch (error) {
			console.error('Error fetching tasks:', error);
			toast.error('Failed to load tasks');
		} finally {
			setLoading(false);
		}
	}, [statusFilter, priorityFilter]);

	const filterTasks = (tasksToFilter, status, priority) => {
		let filtered = tasksToFilter;

		if (status !== 'All') {
			filtered = filtered.filter(t => t.status === status);
		}

		if (priority !== 'All') {
			filtered = filtered.filter(t => t.priority === priority);
		}

		setFilteredTasks(filtered);
	};

	useEffect(() => {
		if (user?.role === 'host') {
			fetchAllTasks();
		}
	}, [user, fetchAllTasks]);

	useEffect(() => {
		filterTasks(tasks, statusFilter, priorityFilter);
	}, [statusFilter, priorityFilter, tasks]);

	const handleEditTask = (task) => {
		setSelectedTask(task);
		setEditingTask({ ...task });
		setShowModal(true);
	};

	const handleDeleteClick = (taskId) => {
		setDeletingTaskId(taskId);
		setShowDeleteModal(true);
	};

	const handleDeleteTask = async () => {
		try {
			await axiosInstance.delete(API_PATHS.HOST.DELETE_TASK(deletingTaskId));
			toast.success('Task deleted successfully');
			setShowDeleteModal(false);
			setDeletingTaskId(null);
			fetchAllTasks();
		} catch (error) {
			console.error('Error deleting task:', error);
			toast.error('Failed to delete task');
		}
	};

	const handleUpdateTask = async () => {
		try {
			if (!editingTask.title || !editingTask.description) {
				toast.error('Title and Description are required');
				return;
			}

			const updateData = {
				title: editingTask.title,
				description: editingTask.description,
				priority: editingTask.priority,
				status: editingTask.status,
				dueDate: editingTask.dueDate,
			};

			await axiosInstance.put(API_PATHS.HOST.UPDATE_TASK(editingTask._id), updateData);
			toast.success('Task updated successfully');
			setShowModal(false);
			setEditingTask(null);
			setSelectedTask(null);
			fetchAllTasks();
		} catch (error) {
			console.error('Error updating task:', error);
			toast.error('Failed to update task');
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'Completed':
				return 'bg-green-500/20 text-green-300 border-green-500/30';
			case 'In Progress':
				return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
			case 'Pending':
				return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
			default:
				return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
		}
	};

	const getPriorityColor = (priority) => {
		switch (priority) {
			case 'High':
				return 'text-red-400';
			case 'Medium':
				return 'text-yellow-400';
			case 'Low':
				return 'text-green-400';
			default:
				return 'text-gray-400';
		}
	};

	return (
		<DashboardLayout activeMenu="Global Tasks">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white mb-2">🌐 Global Task Manager</h1>
				<p className="text-gray-400">Manage all tasks in the system with God Mode access</p>
			</div>

			{/* Filters */}
			<div className="flex gap-4 mb-8 flex-wrap">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none hover:border-[#EA8D23]/50 transition-colors"
				>
					<option value="All">All Status</option>
					<option value="Pending">Pending</option>
					<option value="In Progress">In Progress</option>
					<option value="Completed">Completed</option>
				</select>

				<select
					value={priorityFilter}
					onChange={(e) => setPriorityFilter(e.target.value)}
					className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none hover:border-[#EA8D23]/50 transition-colors"
				>
					<option value="All">All Priority</option>
					<option value="Low">Low</option>
					<option value="Medium">Medium</option>
					<option value="High">High</option>
				</select>

				<div className="flex-1 text-right text-sm text-gray-400">
					Showing {filteredTasks.length} of {tasks.length} tasks
				</div>
			</div>

			{/* Loading State */}
			{loading ? (
				<div className="flex items-center justify-center h-96 bg-white/5 rounded-xl border border-white/10">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#EA8D23] mx-auto mb-4"></div>
						<p className="text-gray-400">Loading tasks...</p>
					</div>
				</div>
			) : filteredTasks.length === 0 ? (
				<div className="flex items-center justify-center h-96 bg-white/5 rounded-xl border border-white/10">
					<div className="text-center">
						<p className="text-2xl mb-2">📭</p>
						<p className="text-gray-400">No tasks found matching your filters</p>
					</div>
				</div>
			) : (
				/* Tasks List */
				<div className="space-y-4">
					{filteredTasks.map((task) => (
						<div
							key={task._id}
							className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300 hover:border-white/20"
						>
							<div className="flex items-start justify-between gap-4">
								{/* Task Info */}
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-bold text-white">{task.title}</h3>
										<span className={`px-2 py-1 rounded text-xs border ${getStatusColor(task.status)}`}>
											{task.status}
										</span>
										<span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}>
											{task.priority}
										</span>
									</div>
									<p className="text-sm text-gray-400 mb-2 line-clamp-2">{task.description}</p>

									{/* Assigned Users */}
									{task.assignedTo && task.assignedTo.length > 0 && (
										<div className="flex items-center gap-2 mb-2">
											<span className="text-xs text-gray-500">Assigned to:</span>
											<div className="flex gap-1 flex-wrap">
												{task.assignedTo.map((user) => (
													<span
														key={user._id}
														className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30"
													>
														{user.name || user.email}
													</span>
												))}
											</div>
										</div>
									)}

									{/* Due Date */}
									{task.dueDate && (
										<p className="text-xs text-gray-500">
											Due: {new Date(task.dueDate).toLocaleDateString()}
										</p>
									)}
								</div>

								{/* Actions */}
								<div className="flex gap-2">
									<button
										onClick={() => handleEditTask(task)}
										className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 transition-all"
										title="Edit task"
									>
										<Edit3 size={18} />
									</button>
									<button
										onClick={() => handleDeleteClick(task._id)}
										className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all"
										title="Delete task"
									>
										<Trash2 size={18} />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Edit Modal */}
			<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Edit Task (God Mode)">
				{editingTask && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-semibold text-gray-300 mb-2">Title</label>
							<input
								type="text"
								value={editingTask.title}
								onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
								className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-[#EA8D23] transition-colors"
								placeholder="Task title"
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
							<textarea
								value={editingTask.description}
								onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
								className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-[#EA8D23] transition-colors h-24 resize-none"
								placeholder="Task description"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-semibold text-gray-300 mb-2">Priority</label>
								<select
									value={editingTask.priority}
									onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
									className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-[#EA8D23] transition-colors"
								>
									<option value="Low">Low</option>
									<option value="Medium">Medium</option>
									<option value="High">High</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-300 mb-2">Status</label>
								<select
									value={editingTask.status}
									onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
									className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-[#EA8D23] transition-colors"
								>
									<option value="Pending">Pending</option>
									<option value="In Progress">In Progress</option>
									<option value="Completed">Completed</option>
								</select>
							</div>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-300 mb-2">Due Date</label>
							<input
								type="date"
								value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''}
								onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
								className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-[#EA8D23] transition-colors"
							/>
						</div>

						<div className="flex gap-3 pt-4">
							<button
								onClick={handleUpdateTask}
								className="flex-1 px-4 py-2 rounded-lg bg-[#EA8D23] text-white font-semibold hover:bg-[#EA8D23]/80 transition-colors"
							>
								Update Task
							</button>
							<button
								onClick={() => setShowModal(false)}
								className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</Modal>

			{/* Delete Confirmation Modal */}
			<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Deletion">
				<div className="space-y-4">
					<p className="text-gray-300">
						Are you sure you want to delete this task? This action cannot be undone. As a Host with God Mode, you have the power to permanently remove this task from the system.
					</p>

					<div className="flex gap-3 pt-4">
						<button
							onClick={handleDeleteTask}
							className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
						>
							Delete Task
						</button>
						<button
							onClick={() => setShowDeleteModal(false)}
							className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			</Modal>
		</DashboardLayout>
	);
};

export default GlobalTaskManager;
