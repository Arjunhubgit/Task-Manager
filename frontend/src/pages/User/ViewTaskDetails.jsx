import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { toast } from 'react-hot-toast'; // Used for notifications
import { LuFileText, LuLink, LuClock, LuCalendar, LuUser, LuMessageSquare, LuSend } from 'react-icons/lu'; // Added necessary icons
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

  // 2. Data Fetching Logic (Memoized with useCallback)
  const getTaskDetailsByID = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // API call structure matching the video and best practices
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));
      
      if (response.data) { // Backend returns task directly in response.data
        setTaskInfo(response.data);
      } else {
        throw new Error("Task data not found.");
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
      setError("Failed to load task details. Check permissions or task existence.");
      toast.error("Failed to fetch task details.");
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

  // 4. Side Effect (Fetch data on mount or taskId change)
  useEffect(() => {
    getTaskDetailsByID();
  }, [getTaskDetailsByID]);

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
          {error || "Task details could not be found."}
        </motion.div>
      </DashboardLayout>
    );
  }

  // 7. Render (Themed and Structured UI)
  return (
    <DashboardLayout activeMenu="My Tasks">
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="p-4 md:p-8 bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl my-5"
      >
        
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
        </motion.div>

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

            <motion.section
              variants={sectionVariants}
              whileHover={{ y: -2 }}
              className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md"
            >
              <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <LuMessageSquare className="text-lg text-violet-400" /> Comments
              </h3>

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
            </motion.section>
          </div>
          
          {/* Column 2 (1/3 width) - Metadata and Checklist */}
          <div className="space-y-6 lg:col-span-1">
            
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

            {/* ToDo Checklist Card */}
            {taskInfo.todoChecklist && taskInfo.todoChecklist.length > 0 && (
              <motion.div
                variants={sectionVariants}
                whileHover={{ y: -2 }}
                className="bg-gray-800/50 p-5 rounded-xl border border-white/5 shadow-md"
              >
                <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                     ToDo Checklist
                </h4>
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
              </motion.div>
            )}
          </div>

        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default ViewTaskDetails;
