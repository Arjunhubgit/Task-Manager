import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { toast } from 'react-hot-toast'; // Used for notifications
import { LuFileText, LuLink, LuClock, LuCalendar, LuUser, LuMessageSquare, LuSend, LuSparkles, LuX, LuChevronDown, LuChevronUp } from 'react-icons/lu'; // Added AI icons
import { motion, AnimatePresence } from 'framer-motion';

// --- Task Status Logic (Reused for consistent styling) ---
const getStatusTagColor = (status) => {
  switch (status) {
    case "In Progress":
      // Vibrant Cyan for In Progress
      return "text-cyan-500 bg-cyan-900/40 border border-cyan-500/20";
    case "Completed":
      // Strong Violet for Completed
      return "text-violet-500 bg-violet-900/40 border border-violet-500/10";
    case "Pending":
      // Amber/Orange for Pending
      return "text-amber-500 bg-amber-900/40 border border-amber-500/10";
    default:
      return "text-gray-400 bg-gray-700/50 border border-gray-600/50";
  }
};
// --- END Status Logic ---

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.06 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const _FRAMER_MOTION_LOADED = Boolean(motion);

const ViewTaskDetails = () => {
  const { id: taskId } = useParams(); // Fetches taskId from the route params
  
  // 1. State Management
  const [taskInfo, setTaskInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // AI Features State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [showAiSummary, setShowAiSummary] = useState(false);

  // 2. Data Fetching Logic (Memoized with useCallback)
  const getTaskDetailsByID = useCallback(async () => {
    if (!taskId) {
      setError("Invalid task ID");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // API call structure matching the video and best practices
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));
      
      if (response.data) { // Backend returns task directly in response.data
        setTaskInfo(response.data);
      } else {
        throw new Error("Task data not found in response.");
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to load task details";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // 3. Handlers
  const handleTodoCheck = useCallback(async (index) => {
    if (!taskInfo || !taskId) return;
    
    // 3a. Optimistic UI Update
    const updatedChecklist = taskInfo.todoChecklist.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    const originalChecklist = taskInfo.todoChecklist;
    setTaskInfo(prev => ({ ...prev, todoChecklist: updatedChecklist }));
    
    try {
      // API call to update the specific task's checklist
      // NOTE: Ensure your API_PATHS.TASKS.UPDATE_TODO_CHECKLIST is defined and functional.
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(taskId), {
        todoChecklist: updatedChecklist,
      });
      toast.success("Checklist updated!");
    } catch (err) {
      // 3b. Pessimistic Rollback
      setTaskInfo(prev => ({ ...prev, todoChecklist: originalChecklist }));
      console.error("Error updating checklist:", err);
      toast.error("Failed to update checklist.");
    }
  }, [taskInfo, taskId]);

  const handleLinkClick = useCallback((link) => {
    if (link) {
      // Securely open link in new tab
      window.open(link, "_blank", "noopener,noreferrer"); 
    }
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!taskId || !commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.ADD_TASK_COMMENT(taskId), {
        text: commentText.trim(),
      });

      const createdComment = response.data?.comment;
      if (createdComment) {
        setTaskInfo((prev) => ({
          ...prev,
          comments: [...(prev?.comments || []), createdComment],
        }));
      }

      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentText, isSubmittingComment, taskId]);

  // AI Features Handlers
  const handleAIAnalysis = useCallback(async () => {
    if (!taskId || aiLoading) return;

    setAiLoading(true);
    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.AI_ASSIST(taskId), {
        mode: "summary", // summary, subtasks, or next_step
      });
      setAiAnalysis(response.data);
      setAiPanelOpen(true);
      toast.success('AI analysis complete');
    } catch (err) {
      console.error("Error getting AI analysis:", err);
      toast.error("Failed to get AI analysis");
    } finally {
      setAiLoading(false);
    }
  }, [taskId, aiLoading]);

  const handleAutoSummarize = useCallback(async () => {
    if (!taskId || aiLoading) return;

    setAiLoading(true);
    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.AUTO_SUMMARIZE_TASK(taskId));
      setAiSummary(response.data?.summary || response.data?.aiSummary);
      setShowAiSummary(true);
      toast.success('Summary generated');
    } catch (err) {
      console.error("Error generating summary:", err);
      toast.error("Failed to generate summary");
    } finally {
      setAiLoading(false);
    }
  }, [taskId, aiLoading]);

  const handleAIChat = useCallback(async () => {
    if (!taskId || !aiChatInput.trim() || aiLoading) return;

    const userMessage = { role: 'user', content: aiChatInput };
    setAiChatMessages((prev) => [...prev, userMessage]);
    const currentInput = aiChatInput;
    setAiChatInput('');
    setAiLoading(true);

    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.AI_ASSIST(taskId), {
        mode: "next_step", // Use next_step mode for conversational assistance
        question: currentInput.trim(),
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data?.content || response.data?.response || 'AI response received',
      };
      setAiChatMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Error in AI chat:", err);
      const errorMsg = {
        role: 'assistant',
        content: 'Sorry, I could not process your question. Please try again.',
      };
      setAiChatMessages((prev) => [...prev, errorMsg]);
      toast.error("Failed to get AI response");
    } finally {
      setAiLoading(false);
    }
  }, [taskId, aiChatInput, aiLoading]);

  // 4. Side Effect (Fetch data on mount or taskId change)
  useEffect(() => {
    getTaskDetailsByID();
  }, [taskId]);

  // 5. Derived State (Cached UI variables)
  const statusTagClass = useMemo(() => {
    return taskInfo ? getStatusTagColor(taskInfo.status) : '';
  }, [taskInfo]);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedComments = useMemo(() => {
    return [...(taskInfo?.comments || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [taskInfo?.comments]);
  
  // 6. Conditional Render Guards
  if (isLoading && !taskInfo) {
    return (
      <DashboardLayout activeMenu="My Tasks">
        <motion.div
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
          className="text-white text-center py-10"
        >
          Loading Task Details...
        </motion.div>
      </DashboardLayout>
    );
  }

  if (error || !taskInfo) {
    return (
      <DashboardLayout activeMenu="My Tasks">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-center py-10 border border-red-500/20 p-4 rounded-lg"
        >
          <p className="mb-4">{error || "Task details could not be found."}</p>
          {error && <p className="text-sm text-gray-400 mt-2">Task ID: {taskId}</p>}
        </motion.div>
      </DashboardLayout>
    );
  }

  // 7. Render (Themed and Structured UI)
  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="w-full">
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="p-4 md:p-8 bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl my-5"
        >
        </motion.div>
        {/* Title and Status Header */}
        <motion.div
          variants={sectionVariants}
          className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 mb-6"
        >
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 md:mb-0">
            {taskInfo.title}
          </h2>
          {/* Status Tag - High Contrast Neon */}
          <div className={`text-xs font-bold py-1 px-4 rounded-full uppercase ${statusTagClass}`}>
            {taskInfo.status}
          </div>
          
          {/* AI Assist Button */}
          <button
            onClick={handleAIAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-[#EA8D23] to-[#d67e1b] hover:from-[#d67e1b] hover:to-[#b86815] text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuSparkles className={`text-sm ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Analyzing...' : 'AI Assist'}
          </button>
        </motion.div>

        {/* AI Analysis Panel */}
        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-5 bg-gradient-to-br from-[#1a1a1a] to-[#252525] rounded-xl border border-[#EA8D23]/30 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LuSparkles className="text-[#EA8D23] text-lg animate-pulse" />
                  <h3 className="text-sm font-bold text-[#EA8D23] uppercase tracking-wider">
                    AI Assistant
                  </h3>
                </div>
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="p-1 hover:bg-white/5 rounded transition-colors"
                >
                  <LuX className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* AI Summary Display */}
              {aiAnalysis?.mode === 'summary' && aiAnalysis?.content && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-black/30 rounded-lg border border-white/5"
                >
                  <p className="text-xs text-gray-400 mb-2 font-semibold">AI Summary</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{aiAnalysis.content}</p>
                </motion.div>
              )}

              {/* Auto-Summarize Button */}
              {!showAiSummary && (
                <button
                  onClick={handleAutoSummarize}
                  disabled={aiLoading}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-2 bg-black/30 border border-white/10 hover:border-[#EA8D23]/50 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[#EA8D23]/30 border-t-[#EA8D23] rounded-full animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <LuSparkles className="text-sm" />
                      Generate AI Summary
                    </>
                  )}
                </button>
              )}

              {/* AI Generated Summary Display */}
              {showAiSummary && aiSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-black/30 rounded-lg border border-[#EA8D23]/20"
                >
                  <p className="text-xs text-[#EA8D23] mb-2 font-semibold">Generated Summary</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                </motion.div>
              )}

              {/* AI Chat Section */}
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-2 mb-3 p-3 bg-black/20 rounded-lg border border-white/5">
                  {aiChatMessages.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-4">
                      Ask the AI assistant questions about this task...
                    </p>
                  ) : (
                    aiChatMessages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-xs p-2 rounded ${
                          msg.role === 'user'
                            ? 'bg-violet-500/20 border border-violet-500/30 text-violet-100 ml-4'
                            : 'bg-[#EA8D23]/10 border border-[#EA8D23]/30 text-gray-100 mr-4'
                        }`}
                      >
                        <strong className="text-xs">{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                    placeholder="Ask about this task..."
                    maxLength={200}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#EA8D23]/50"
                  />
                  <button
                    onClick={handleAIChat}
                    disabled={!aiChatInput.trim() || aiLoading}
                    className="px-3 py-2 bg-[#EA8D23]/20 border border-[#EA8D23]/40 hover:bg-[#EA8D23]/30 text-[#EA8D23] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LuSend className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Details Grid - 2/3 for content, 1/3 for metadata */}
        <motion.div variants={sectionVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white/80">
          
          {/* Column 1 (2/3 width) - Description and Attachments */}
          <div className="lg:col-span-2 space-y-8">
            <motion.section variants={sectionVariants} whileHover={{ y: -2 }}>
              <h3 className="text-xl font-semibold mb-3 text-white">Description</h3>
              <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{taskInfo.description}</p>
            </motion.section>
            
            {/* Attachments Section */}
            {taskInfo.attachments && taskInfo.attachments.length > 0 && (
              <motion.section variants={sectionVariants} whileHover={{ y: -2 }}>
                <h3 className="text-xl font-semibold mb-3 text-white flex items-center gap-2">
                   <LuFileText className="text-lg text-[#06b6d4]" /> Task Attachments
                </h3>
                <ul className="space-y-3 bg-gray-800/40 p-4 rounded-lg border border-white/5">
                  {taskInfo.attachments.map((link, index) => (
                    <li key={index} className="flex items-center">
                      <button 
                        onClick={() => handleLinkClick(link)}
                        className="text-sm text-[#f97316] hover:text-white transition-colors flex items-center gap-2 truncate max-w-full"
                      >
                        <LuLink className="min-w-fit" />
                        {link.length > 70 ? `${link.substring(0, 67)}...` : link}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* ToDo Checklist Card */}
            {taskInfo.todoChecklist && taskInfo.todoChecklist.length > 0 && (
              <motion.section
                variants={sectionVariants}
                whileHover={{ y: -2 }}
                className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md"
              >
                <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                  ToDo Checklist
                </h3>
                <ul className="space-y-3">
                  {taskInfo.todoChecklist.map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="flex items-start text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleTodoCheck(index)}
                        className="form-checkbox h-4 w-4 text-violet-500 bg-gray-700 border-gray-600 rounded cursor-pointer mt-1 flex-shrink-0"
                      />
                      <span className={`ml-3 ${item.completed ? 'line-through text-white/40' : 'text-white/90'}`}>
                        {item.text}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.section>
            )}
          </div>
          
          {/* Column 2 (1/3 width) - Metadata and Comments */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* AI Analysis Card */}
            {aiAnalysis && (
              <motion.div
                variants={sectionVariants}
                whileHover={{ y: -2 }}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] p-5 rounded-xl border border-[#EA8D23]/30 shadow-md"
              >
                <h4 className="text-lg font-bold mb-4 text-[#EA8D23] flex items-center gap-2">
                  <LuSparkles className="text-lg" /> AI Analysis
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-black/30 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Mode: {aiAnalysis.mode?.toUpperCase()}</p>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap line-clamp-5">
                      {aiAnalysis.content || 'No content available'}
                    </p>
                  </div>
                  
                  {/* Complexity & Model Info */}
                  <div className="grid grid-cols-2 gap-2">
                    {aiAnalysis.complexity && (
                      <div className="p-2 bg-black/20 rounded border border-white/5">
                        <p className="text-xs text-gray-400 font-semibold">Complexity</p>
                        <p className={`text-xs font-bold mt-1 ${
                          aiAnalysis.complexity === 'complex' ? 'text-red-400' :
                          aiAnalysis.complexity === 'medium' ? 'text-amber-400' :
                          'text-green-400'
                        }`}>
                          {aiAnalysis.complexity.charAt(0).toUpperCase() + aiAnalysis.complexity.slice(1)}
                        </p>
                      </div>
                    )}
                    {aiAnalysis.model && (
                      <div className="p-2 bg-black/20 rounded border border-white/5">
                        <p className="text-xs text-gray-400 font-semibold">Model</p>
                        <p className="text-xs text-[#EA8D23] font-bold mt-1 truncate">
                          {aiAnalysis.model === 'llama-3.1-8b-instant' ? '8B' : '70B'}
                        </p>
                      </div>
                    )}
                  </div>

                  {aiAnalysis.source && (
                    <p className="text-xs text-white/40 text-center">
                      Source: {aiAnalysis.source}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Metadata Card */}
            <motion.div
                variants={sectionVariants}
                whileHover={{ y: -2 }}
                className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md"
            >
                <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <LuCalendar className="text-lg text-amber-500" /> Task Timeline
                </h4>
                <div className="space-y-3 text-sm">
                    <p className="flex justify-between items-center">
                        <strong className="text-white">Priority:</strong> 
                        <span className="capitalize text-lg font-medium text-[#f43f5e]">{taskInfo.priority}</span>
                    </p>
                    <div className="h-px bg-white/10"></div>
                    <p className="flex justify-between items-center">
                        <strong className="text-white flex items-center gap-1"><LuClock /> Due Date:</strong> 
                        <span className="text-white/70">{formatDate(taskInfo.dueDate)}</span>
                    </p>
                    <p className="flex justify-between items-center">
                        <strong className="text-white flex items-center gap-1"><LuUser /> Assigned By:</strong> 
                        <span className="text-white/70">{taskInfo.createdBy?.name || 'Admin'}</span>
                    </p>
                </div>
            </motion.div>

            <motion.div
              variants={sectionVariants}
              whileHover={{ y: -2 }}
              className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md"
            >
              <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <LuMessageSquare className="text-lg text-violet-400" /> Comments
              </h4>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {sortedComments.length === 0 && (
                  <p className="text-sm text-white/50">No comments yet. Add the first comment for this task.</p>
                )}

                <AnimatePresence initial={false}>
                  {sortedComments.map((comment, index) => (
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">
                        {comment.userId?.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-white/40">{formatDateTime(comment.createdAt)}</p>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{comment.text}</p>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment about this task..."
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-white/40">{commentText.length}/2000</p>
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-500/20 border border-violet-500/40 px-3 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LuSend className="text-sm" />
                    {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </motion.div>

          </div>

        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ViewTaskDetails;
