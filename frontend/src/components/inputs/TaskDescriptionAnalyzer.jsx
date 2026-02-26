import React, { useState } from 'react';
import { LuSparkles, LuLoader } from 'react-icons/lu';
import axiosInstance from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import AITaskSuggestionPanel from './AITaskSuggestionPanel';

/**
 * TaskDescriptionAnalyzer Component
 * Analyzes task description and shows AI suggestions
 * Works with the regular task creation form
 */
const TaskDescriptionAnalyzer = ({ 
  title, 
  description, 
  onApplySuggestions,
  userRole = "admin"
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const handleAnalyze = async () => {
    if (!description || description.trim().length < 20) {
      toast.error("Please provide a detailed description (at least 20 characters)");
      return;
    }

    setAnalyzing(true);
    try {
      // Call backend to analyze task
      const response = await axiosInstance.post('/api/tasks/ai-analyze', {
        title: title || 'Untitled',
        description,
        userRole
      });

      if (response.data && response.data.analysis) {
        setAiAnalysis(response.data.analysis);
        setShowPanel(true);
        toast.success("AI analysis complete!");
      } else {
        toast.error("No analysis returned from server");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error.response?.data?.message || "Failed to analyze task");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptSuggestions = (changes) => {
    // Apply AI suggestions to the form
    if (onApplySuggestions) {
      onApplySuggestions(changes);
    }
    setShowPanel(false);
    toast.success("AI suggestions applied!");
  };

  const handleDismiss = () => {
    setShowPanel(false);
  };

  if (showPanel && aiAnalysis) {
    return (
      <AITaskSuggestionPanel
        aiAnalysis={aiAnalysis}
        taskTitle={title}
        onAccept={handleAcceptSuggestions}
        onDismiss={handleDismiss}
        isLoading={false}
      />
    );
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-white/10 shadow-lg">
      <div className="flex items-center gap-2 mb-3 text-[#EA8D23]">
        <LuSparkles className="text-lg animate-pulse" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">AI Task Analyzer</h3>
      </div>
      
      <p className="text-xs text-gray-400 mb-3">
        Get AI-powered suggestions for priority, complexity, effort estimate, and task breakdown.
      </p>

      <button
        onClick={handleAnalyze}
        disabled={analyzing || !description || description.trim().length < 20}
        className="w-full bg-[#EA8D23] hover:bg-[#d67e1b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {analyzing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <LuSparkles className="w-4 h-4" />
            Analyze with AI
          </>
        )}
      </button>

      {!description || description.trim().length < 20 && (
        <p className="text-xs text-amber-400 mt-2">
          ⚠️ Add a detailed description to enable AI analysis
        </p>
      )}
    </div>
  );
};

export default TaskDescriptionAnalyzer;
