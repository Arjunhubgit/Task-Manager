import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { LuTrash2, LuSparkles, LuCalendar, LuFlag } from "react-icons/lu"; 
import SelectUsers from '../../components/inputs/SelectUsers';
import TodoListInput from '../../components/inputs/TodoListInput.jsx';
import AddAttachmentsInput from '../../components/inputs/AddAttachmentsInput';
import AIChatInput from '../../components/inputs/AIChatInput';

const CreateTask = () => {
  const location = useLocation();
  const { taskId } = location.state || {};
  const navigate = useNavigate();

  // 1. ADDED 'priority' to initial state
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium", // Default to Medium
    assignedTo: [],
    todoChecklist: [],
    attachments: [],
  });
  
  const [currentTask, setCurrentTask] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);

  const handleValueChange = (key, value) => {
    setTaskData((prevData) => ({ ...prevData, [key]: value }));
  };

  const clearData = () => {
    setTaskData({
      title: "",
      description: "",
      dueDate: null,
      priority: "Medium",
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
    });
  };

  const createTask = async () => {
    setLoading(true);
    try {
      const todoList = taskData.todoChecklist?.map((item) => ({
        text: item,
        completed: false,
      }));

      // If user selected a priority manually, it will be sent here
      // The backend only uses AI if priority is missing or empty
      await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, {
        ...taskData,
        dueDate: new Date(taskData.dueDate).toISOString(),
        todoChecklist: todoList,
      });

      toast.success("Task Created Successfully");
      clearData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Error creating task.");
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    setLoading(true);

    try {
      const todoList = taskData.todoChecklist?.map((item) => {
        if (typeof item === 'object' && item.text) return item;
        return { text: item, completed: false };
      });

      await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TASK(taskId),
        {
          ...taskData,
          dueDate: new Date(taskData.dueDate).toISOString(),
          todoChecklist: todoList,
        }
      );

      toast.success("Task Updated Successfully");
      navigate('/admin/manage-tasks');
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Error updating task.");
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async () => {
    setLoading(true);
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));
      toast.success("Task Deleted Successfully");
      setOpenDeleteAlert(false);
      navigate('/admin/manage-tasks');
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Error deleting task.");
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!taskData.title.trim()) { setError("Title is required."); return; }
    if (!taskData.description.trim()) { setError("Description is required."); return; }
    if (!taskData.dueDate) { setError("Due date is required."); return; }
    if (taskData.assignedTo?.length === 0) { setError("Task not assigned to any member"); return; }
    if (taskData.todoChecklist?.length === 0) { setError("Add at least one todo task"); return; }

    if (taskId) { updateTask(); return; }
    createTask();
  };

  const getTaskDetailsByID = useCallback(async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));
      if (response.data) {
        const taskInfo = response.data;
        setCurrentTask(taskInfo);
        // 2. LOAD EXISTING PRIORITY
        setTaskData((prevState) => ({
          title: taskInfo.title,
          description: taskInfo.description,
          dueDate: taskInfo.dueDate ? moment(taskInfo.dueDate).format("YYYY-MM-DD") : null,
          priority: taskInfo.priority || "Medium", // Load it here
          assignedTo: taskInfo?.assignedTo?.map((item) => item?._id) || [],
          todoChecklist: taskInfo?.todoChecklist?.map((item) => item?.text) || [],
          attachments: taskInfo?.attachments || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) getTaskDetailsByID(taskId);
  }, [taskId, getTaskDetailsByID]); 

  const inputClass = "w-full bg-[#050505] border border-white/10 text-gray-200 text-sm rounded-lg p-3 focus:outline-none focus:border-[#EA8D23]/50 focus:ring-1 focus:ring-[#EA8D23]/50 transition-all placeholder-gray-600";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide";

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="mt-5 max-w-5xl mx-auto">
        
        {!taskId && <AIChatInput onTaskCreated={() => {
          toast.success("Task created via AI! You can view it in Manage Tasks.");
          clearData();
        }} />}
        
        <div className="bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden relative">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EA8D23] to-transparent opacity-50"></div>

            <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                    {taskId ? "Update Task Details" : "Create New Task"}
                    </h2>
                    
                    {taskId && (
                    <button
                        className="group flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
                        onClick={() => setOpenDeleteAlert(true)}
                    >
                        <LuTrash2 className="text-sm group-hover:scale-110 transition-transform" />
                        <span>Delete Task</span>
                    </button>
                    )}
                </div>

                <div className="space-y-6">
                    
                    <div>
                        <label className={labelClass}>Task Title</label>
                        <input
                            placeholder='e.g., Redesign Homepage UI'
                            className={inputClass}
                            value={taskData.title}
                            onChange={(e) => handleValueChange("title", e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea
                            placeholder="Describe the task and its importance..."
                            className={`${inputClass} min-h-[120px] resize-y`}
                            value={taskData.description}
                            onChange={({ target }) => handleValueChange("description", target.value)}
                        />
                    </div>

                    {/* Only show AI banner if creating new task */}
                    {!taskId && (
                      <div className="p-4 bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-xl flex items-start gap-3 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
                          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 relative z-10">
                              <LuSparkles className="w-5 h-5" />
                          </div>
                          <div className="relative z-10">
                              <h4 className="text-blue-300 text-sm font-semibold">AI Powered Prioritization</h4>
                              <p className="text-xs text-gray-400 mt-0.5">
                                  Our AI will automatically assign a priority. You can manually override it below.
                              </p>
                          </div>
                      </div>
                    )}
                    
                    {/* 3. UPDATED GRID: Added Priority Field */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Due Date */}
                        <div className="relative">
                            <label className={labelClass}>Due Date</label>
                            <div className="relative">
                                <input
                                    className={`${inputClass} pl-10`}
                                    value={taskData.dueDate}
                                    onChange={({ target }) => handleValueChange("dueDate", target.value)}
                                    type="date"
                                />
                                <LuCalendar className="absolute left-3 top-3.5 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* PRIORITY SELECTOR */}
                        <div className="relative">
                            <label className={labelClass}>Priority</label>
                            <div className="relative">
                                <select
                                    className={`${inputClass} pl-10 appearance-none cursor-pointer`}
                                    value={taskData.priority}
                                    onChange={({ target }) => handleValueChange("priority", target.value)}
                                >
                                    <option value="High">High Priority</option>
                                    <option value="Medium">Medium Priority</option>
                                    <option value="Low">Low Priority</option>
                                </select>
                                <LuFlag className="absolute left-3 top-3.5 text-gray-500 pointer-events-none" />
                                {/* Custom arrow to replace default */}
                                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500 text-xs">▼</div>
                            </div>
                        </div>

                    </div>
                    
                    {/* Assigned To - Moved to its own row for better spacing */}
                    <div>
                        <label className={labelClass}>Assigned To</label>
                        <SelectUsers
                            selectedUsers={taskData.assignedTo}
                            setSelectedUsers={(value) => handleValueChange("assignedTo", value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className={labelClass}>Todo Checklist</label>
                            <TodoListInput
                                todoList={taskData?.todoChecklist}
                                setTodoList={(value) => handleValueChange("todoChecklist", value)}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Attachments</label>
                            <AddAttachmentsInput
                                attachments={taskData?.attachments}
                                setAttachments={(value) => handleValueChange("attachments", value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                             <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                             <p className="text-sm font-medium text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                            className="bg-[#EA8D23] hover:bg-[#d67e1b] text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(234,141,35,0.3)] hover:shadow-[0_0_25px_rgba(234,141,35,0.5)] active:scale-95 transition-all"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {taskId ? "Update Task" : "Create Task"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {openDeleteAlert && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpenDeleteAlert(false)}></div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 relative z-10">
            <h3 className="text-lg font-bold text-white mb-2">Delete Task?</h3>
            <p className="text-gray-400 mb-6 text-sm">
              This action cannot be undone. The task will be permanently removed from the system.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                onClick={() => setOpenDeleteAlert(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                onClick={deleteTask}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout >
  );
};

export default CreateTask;