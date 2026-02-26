import React, { useEffect, useState } from 'react';
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { LuSparkles, LuSend } from "react-icons/lu";
import AITaskSuggestionPanel from './AITaskSuggestionPanel';

const AIChatInput = ({ onTaskCreated, onTaskDraftGenerated }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
        const normalized = Array.isArray(response?.data)
          ? response.data.map((member) => ({
              _id: member?._id,
              name: member?.name,
              email: member?.email,
            })).filter((member) => member._id && member.name)
          : [];
        setTeamMembers(normalized);
      } catch (error) {
        console.error("Failed to fetch team members for AI assignment:", error);
      }
    };

    fetchTeamMembers();
  }, []);

  const handleAISubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK_FROM_AI, {
        prompt,
        teamMembers,
      });
      
      if (response.data.task) {
        // Show suggestions panel with the AI analysis
        setPendingTask({
          ...response.data.task,
          aiAnalysis: response.data.task.aiAnalysis || {},
        });
        setShowSuggestions(true);
        setPrompt("");
        toast.success("AI analyzed your task! Review suggestions below.");
      } else {
        toast.success("Task created automatically!");
        setPrompt("");
        if (onTaskCreated) onTaskCreated(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create task via AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestions = async (changes) => {
    try {
      // Merge accepted changes with pending task
      const updatedTask = {
        ...pendingTask,
        ...changes,
      };

      // Preferred flow: fill create form as draft, then user selects assignees and submits.
      if (onTaskDraftGenerated) {
        onTaskDraftGenerated(updatedTask);
        setShowSuggestions(false);
        setPendingTask(null);
        toast.success("AI draft applied with suggested assignees. Review and click Create Task.");
        return;
      }

      // Fallback flow (if draft callback is not provided): create directly.
      const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, updatedTask);
      setShowSuggestions(false);
      setPendingTask(null);
      toast.success("Task created with AI enhancements!");
      
      if (onTaskCreated) onTaskCreated(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save task with suggestions.");
    }
  };

  const handleDismissSuggestions = () => {
    toast.info("You can still edit suggestions later");
    setShowSuggestions(false);
    setPendingTask(null);
  };

  if (showSuggestions && pendingTask) {
    return (
      <AITaskSuggestionPanel
        aiAnalysis={pendingTask.aiAnalysis}
        taskTitle={pendingTask.title}
        onAccept={handleAcceptSuggestions}
        onDismiss={handleDismissSuggestions}
        isLoading={false}
      />
    );
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-white/10 shadow-lg">
      <div className="flex items-center gap-2 mb-3 text-[#EA8D23]">
        <LuSparkles className="text-lg animate-pulse" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">AI Task Assistant</h3>
      </div>
      
      <form onSubmit={handleAISubmit} className="relative">
        <input
          type="text"
          placeholder="e.g., 'Plan the marketing launch for next Tuesday with high priority'"
          className="w-full bg-black/30 border border-white/10 text-gray-200 text-sm rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-[#EA8D23]/50 transition-all placeholder-gray-500"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !prompt}
          className="absolute right-2 top-1.5 p-1.5 bg-[#EA8D23] hover:bg-[#d67e1b] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LuSend className="w-4 h-4" />
          )}
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2 ml-1">
        Try: "Create a budget report task for next Friday" or "Remind me to call John tomorrow"
      </p>
    </div>
  );
};

export default AIChatInput;
