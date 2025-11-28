import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { LuTrash2, LuSparkles } from "react-icons/lu"; // Added LuSparkles icon
import SelectUsers from '../../components/inputs/SelectUsers';
import TodoListInput from '../../components/inputs/TodoListInput.jsx';
import AddAttachmentsInput from '../../components/inputs/AddAttachmentsInput';

const CreateTask = () => {
  const location = useLocation();
  const { taskId } = location.state || {};
  const navigate = useNavigate();

  // Initial state now omits 'priority' since it's set by AI
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    dueDate: "",
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
    // reset form
    setTaskData({
      title: "",
      description: "",
      dueDate: null,
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
    });
  };

  // Create Task
  const createTask = async () => {
    setLoading(true);

    try {
      const todoList = taskData.todoChecklist?.map((item) => ({
        text: item,
        completed: false,
      }));

      // NOTE: We deliberately omit sending the 'priority' field here to trigger the AI backend logic.
      const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, {
        ...taskData,
        dueDate: new Date(taskData.dueDate).toISOString(),
        todoChecklist: todoList,
      });

      toast.success("Task Created Successfully (AI Prioritized)");
      clearData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Error creating task.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update Task
  const updateTask = async () => {
    setLoading(true);

    try {
      const todoList = taskData.todoChecklist?.map((item) => {
        // Check if item is already an object with 'text' and 'completed' properties
        if (typeof item === 'object' && item.text) {
          return item;
        }
        // Otherwise, treat it as a string and create an object
        return {
          text: item,
          completed: false,
        };
      });

      const response = await axiosInstance.put(
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

  // Delete Task
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

    // Input validation
    if (!taskData.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!taskData.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!taskData.dueDate) {
      setError("Due date is required.");
      return;
    }

    if (taskData.assignedTo?.length === 0) {
      setError("Task not assigned to any member");
      return;
    }

    if (taskData.todoChecklist?.length === 0) {
      setError("Add at least one todo task");
      return;
    }

    if (taskId) {
      updateTask();
      return;
    }

    createTask();
  };

  // get task details by id
  const getTaskDetailsByID = useCallback(async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));

      if (response.data) {
        const taskInfo = response.data;
        setCurrentTask(taskInfo);

        setTaskData((prevState) => ({
          title: taskInfo.title,
          description: taskInfo.description,
          // Removed manual priority from state update here
          dueDate: taskInfo.dueDate
            ? moment(taskInfo.dueDate).format("YYYY-MM-DD")
            : null,
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
    if (taskId) {
      getTaskDetailsByID(taskId);
    }
    // Added dependency array for cleaner React hook usage
  }, [taskId, getTaskDetailsByID]); 

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
          <div className="form-card col-span-3 p-6 bg-white/70 backdrop-blur-xl border border-blue-200 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {taskId ? "Update Task" : "Create New Task"}
            </h2>
            
            {taskId && (
              <button
                className="flex items-center gap-1.5 text-[13px] font-medium text-red-600 rounded px-2 py-1 border border-rose-100 hover:border-rose-300 cursor-pointer mb-4"
                onClick={() => setOpenDeleteAlert(true)}
              >
                <LuTrash2 className="text-base" />
                Delete Task
              </button>
            )}

            {/* Task Title */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Task Title
              </label>
              <input
                placeholder='Create App UI'
                className="form-input mt-1"
                value={taskData.title}
                onChange={(e) => handleValueChange("title", e.target.value)}
              />
            </div>
            
            {/* Description */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-600">
                Description
              </label>
              <textarea
                placeholder="Describe the task and its importance to enable AI prioritization."
                className="form-input mt-1"
                rows={4}
                value={taskData.description}
                onChange={({ target }) =>
                  handleValueChange("description", target.value)
                }
              />
            </div>

            {/* AI Notification Block (Replaces manual priority dropdown) */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                <LuSparkles className="w-6 h-6 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                    Priority will be automatically determined by **AI (Gemini)** based on your description when the task is created.
                </p>
            </div>
            
            <div className="grid grid-cols-12 gap-4 mt-4">
              {/* Removed: Manual Priority SelectDropdown */}
              
              {/* Due Date (Expanded to take 6 columns since Priority is gone) */}
              <div className="col-span-6 md:col-span-4">
                <label className="text-sm font-medium text-gray-600">
                  Due Date
                </label>
                <input
                  className="form-input mt-1"
                  value={taskData.dueDate}
                  onChange={({ target }) =>
                    handleValueChange("dueDate", target.value)
                  }
                  type="date"
                />
              </div>
              
              {/* Assigned To */}
              <div className="col-span-12 md:col-span-6">
                <label className="text-sm font-medium text-gray-600">
                  Assigned To
                </label>
                <SelectUsers
                  selectedUsers={taskData.assignedTo}
                  setSelectedUsers={(value) => {
                    handleValueChange("assignedTo", value);
                  }}
                />
              </div>
            </div>

            {/* TODO Checklist */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-600">
                TODO Checklist
              </label>
              <TodoListInput
                todoList={taskData?.todoChecklist}
                setTodoList={(value) =>
                  handleValueChange("todoChecklist", value)
                }
              />
            </div>

            {/* Attachments */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-600">
                Add Attachments
              </label>
              <AddAttachmentsInput
                attachments={taskData?.attachments}
                setAttachments={(value) =>
                  handleValueChange("attachments", value)
                }
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-red-500 mt-5 p-3 bg-red-50 border border-red-200 rounded-lg">{error}</p>
            )}

            <div className="flex justify-end mt-7">
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {taskId ? "UPDATE TASK" : "CREATE TASK"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {openDeleteAlert && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Task?</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setOpenDeleteAlert(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
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