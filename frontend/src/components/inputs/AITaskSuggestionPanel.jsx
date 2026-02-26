import React, { useState, useEffect, useMemo } from 'react';
import { 
  LuSparkles, 
  LuX, 
  LuCheck, 
  LuTag, 
  LuCircleCheckBig, 
  LuCircleAlert,
  LuClock,
  LuZap,
  LuUsers,
} from 'react-icons/lu';
import { 
  formatAISuggestions, 
  getComplexityLabel, 
  formatTimeEstimate 
} from '../../services/groqServices';

/**
 * AITaskSuggestionPanel Component (Phase 1)
 * 
 * Displays AI-generated suggestions for a task:
 * - Priority & complexity
 * - Estimated hours
 * - Suggested tags
 * - Recommended subtasks
 * - Risk factors
 * 
 * Props:
 * - aiAnalysis: Full AI analysis object from backend
 * - onAccept: Callback when user accepts suggestions (returns accepted data)
 * - onDismiss: Callback when user dismisses panel
 * - isLoading: Show loading state while fetching suggestions
 */
const AITaskSuggestionPanel = ({ 
  aiAnalysis, 
  onAccept, 
  onDismiss, 
  isLoading = false,
  taskTitle = 'Untitled Task',
}) => {
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [acceptedChanges, setAcceptedChanges] = useState({
    priority: false,
    tags: false,
    subtasks: false,
    complexity: false,
    assignees: false,
  });

  const suggestions = useMemo(() => formatAISuggestions(aiAnalysis), [aiAnalysis]);

  if (!suggestions || !aiAnalysis) {
    return null;
  }

  useEffect(() => {
    setSelectedTags(suggestions.tags || []);
    setSelectedSubtasks((suggestions.subtasks || []).map((st, idx) => idx));
    setSelectedAssignees(
      (suggestions.suggestedAssignees || [])
        .map((member) => member?.id)
        .filter(Boolean)
    );
  }, [aiAnalysis]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setAcceptedChanges(prev => ({ ...prev, tags: true }));
  };

  const handleSubtaskToggle = (index) => {
    setSelectedSubtasks(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
    setAcceptedChanges(prev => ({ ...prev, subtasks: true }));
  };

  const handleAssigneeToggle = (memberId) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
    setAcceptedChanges((prev) => ({ ...prev, assignees: true }));
  };

  const handleAccept = () => {
    const changes = {
      priority: suggestions.priority,
      complexity: suggestions.complexity,
      estimatedHours: suggestions.estimatedHours,
      tags: selectedTags,
      subtasks: suggestions.subtasks?.filter((_, idx) => selectedSubtasks.includes(idx)),
      assignedTo: selectedAssignees,
      riskFactors: suggestions.riskFactors,
      reasoning: suggestions.reasoning,
    };
    onAccept?.(changes);
  };

  const complexityBadge = getComplexityLabel(suggestions.complexity);
  const hasRisks = suggestions.riskFactors?.length > 0;

  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-[#1a1a1a] to-[#252525] rounded-xl border border-[#EA8D23]/30 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LuSparkles className="text-[#EA8D23] text-lg animate-pulse" />
          <h3 className="text-sm font-bold text-[#EA8D23] uppercase tracking-wider">
            AI Suggestions
          </h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/5 rounded transition-colors"
            title="Dismiss suggestions"
          >
            <LuX className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 gap-2">
          <div className="w-4 h-4 border-2 border-[#EA8D23]/30 border-t-[#EA8D23] rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Analyzing task...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Priority & Complexity Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="p-3 bg-black/30 rounded-lg border border-white/5">
              <p className="text-xs text-gray-400 mb-1 font-semibold">Priority</p>
              <p className={`text-sm font-bold ${
                suggestions.priority === 'High' ? 'text-red-400' :
                suggestions.priority === 'Medium' ? 'text-amber-400' :
                'text-green-400'
              }`}>
                {suggestions.priority}
              </p>
            </div>

            {/* Complexity */}
            <div className="p-3 bg-black/30 rounded-lg border border-white/5">
              <p className="text-xs text-gray-400 mb-1 font-semibold">Complexity</p>
              <p className="text-sm font-bold" style={{ color: complexityBadge.color }}>
                {complexityBadge.label}
              </p>
            </div>
          </div>

          {/* Estimated Time */}
          {suggestions.estimatedHours && (
            <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center gap-2">
              <LuClock className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs text-gray-400">Estimated Effort</p>
                <p className="text-sm font-semibold text-gray-200">
                  {formatTimeEstimate(suggestions.estimatedHours)}
                </p>
              </div>
            </div>
          )}

          {/* Reasoning */}
          {suggestions.reasoning && (
            <div className="p-3 bg-black/30 rounded-lg border border-white/5">
              <p className="text-xs text-gray-400 mb-1 font-semibold">Why?</p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {suggestions.reasoning}
              </p>
            </div>
          )}

          {/* Risk Factors */}
          {hasRisks && (
            <div className="p-3 bg-red-950/20 rounded-lg border border-red-400/30">
              <div className="flex items-center gap-2 mb-2">
                <LuCircleAlert className="w-4 h-4 text-red-400" />
                <p className="text-xs font-semibold text-red-300">Potential Risks</p>
              </div>
              <ul className="space-y-1">
                {suggestions.riskFactors.map((risk, idx) => (
                  <li key={idx} className="text-xs text-red-200 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Tags */}
          {suggestions.tags?.length > 0 && (
            <div className="p-3 bg-black/30 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <LuTag className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-semibold text-gray-300">Suggested Tags</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-[#EA8D23] text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <LuCheck className="w-3 h-3 inline ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Subtasks */}
          {suggestions.subtasks?.length > 0 && (
            <div className="p-3 bg-black/30 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <LuCircleCheckBig className="w-4 h-4 text-green-400" />
                <p className="text-xs font-semibold text-gray-300">
                  Suggested Subtasks ({selectedSubtasks.length}/{suggestions.subtasks.length})
                </p>
              </div>
              <ul className="space-y-2">
                {suggestions.subtasks.map((subtask, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSubtaskToggle(idx)}
                    className={`p-2 rounded cursor-pointer transition-all flex items-start gap-2 ${
                      selectedSubtasks.includes(idx)
                        ? 'bg-[#EA8D23]/20 border border-[#EA8D23]/50'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubtasks.includes(idx)}
                      onChange={() => handleSubtaskToggle(idx)}
                      className="mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-200">{subtask.text}</p>
                      {subtask.estimatedHours && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <LuZap className="w-3 h-3 inline mr-1" />
                          {formatTimeEstimate(subtask.estimatedHours)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Assignees */}
          {suggestions.suggestedAssignees?.length > 0 && (
            <div className="p-3 bg-black/30 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <LuUsers className="w-4 h-4 text-cyan-400" />
                <p className="text-xs font-semibold text-gray-300">
                  Suggested Assignees ({selectedAssignees.length}/{suggestions.suggestedAssignees.length})
                </p>
              </div>
              <div className="space-y-2">
                {suggestions.suggestedAssignees.map((member) => {
                  const memberId = member?.id;
                  if (!memberId) return null;
                  const isSelected = selectedAssignees.includes(memberId);
                  return (
                    <button
                      key={memberId}
                      type="button"
                      onClick={() => handleAssigneeToggle(memberId)}
                      className={`w-full text-left p-2 rounded border transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleAssigneeToggle(memberId)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-200">{member?.name}</p>
                          {member?.email && <p className="text-xs text-gray-500">{member.email}</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAccept}
              className="flex-1 bg-[#EA8D23] hover:bg-[#d67e1b] text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LuCheck className="w-4 h-4" />
              Accept Suggestions
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2 rounded-lg transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center pt-1">
            You can adjust these suggestions before creating the task.
          </p>
        </div>
      )}
    </div>
  );
};

export default AITaskSuggestionPanel;
