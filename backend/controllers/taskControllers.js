const Task = require("../models/Task");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Groq = require("groq-sdk"); // 
const jwt = require("jsonwebtoken");

// Initialize Groq Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Config: Use Llama 3 for best speed/intelligence balance
const AI_MODEL = "llama-3.3-70b-versatile, llama-3.3-70b-instant, groq/compound, groq/compound-mini"; // Fallback to instant if needed

// =====================================================================
// --- HELPER: AI PRIORITY & SUMMARY ---
// =====================================================================

const sendTaskNotifications = async (task, creatorId, type = 'task_assigned') => {
    try {
        const creatorUser = await User.findById(creatorId);
        const creatorName = creatorUser?.name || 'Admin';

        for (const userId of task.assignedTo) {
            // Don't notify the person who performed the action
            if (userId.toString() !== creatorId.toString()) {
                const notification = new Notification({
                    userId,
                    type,
                    title: type === 'task_assigned' ? 'New task assigned' : 'Task updated',
                    message: type === 'task_assigned' 
                        ? `You have been assigned "${task.title}" by ${creatorName}` 
                        : `The task "${task.title}" has been updated by ${creatorName}`,
                    relatedTaskId: task._id,
                    relatedUserId: creatorId,
                });
                await notification.save();
                console.log(`✅ Notification (${type}) created for user ${userId}`);
            }
        }
    } catch (error) {
        console.error("Error in sendTaskNotifications:", error.message);
    }
};

const getAIPriorityAndSummary = async (taskDescription, userRole) => {
    if (!process.env.GROQ_API_KEY) return null;

    const prompt = `
        Analyze this task for a ${userRole}.
        Task: "${taskDescription}"
        
        1. Determine priority (High, Medium, Low).
           - High: Deadlines, critical, blockers.
           - Low: Routine, maintenance.
           - Medium: Everything else.
        2. Create a 1-sentence summary.
        
        Return JSON ONLY:
        { "suggestedPriority": "High/Medium/Low", "aiSummary": "..." }
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You output valid JSON only." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Groq Priority Error:", error.message);
        return null;
    }
};

// =====================================================================
// --- CORE CONTROLLERS ---
// =====================================================================

// @desc    Get all tasks
const getTasks = async (req, res) => {
    try {
        const { status, assignedTo } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (assignedTo) filter.assignedTo = assignedTo;

        let tasks;
        if (req.user.role === "admin") {
            tasks = await Task.find(filter).populate("assignedTo", "name email profileImageUrl");
        } else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate("assignedTo", "name email profileImageUrl");
        }
        
        tasks = await Promise.all(tasks.map(async (task) => {
            const completedCount = task.todoChecklist.filter(item => item.completed).length;
            return { ...task._doc, completedTodoCount: completedCount };
        }));

        const allTasks = await Task.countDocuments(req.user.role === "admin" ? {} : { assignedTo: req.user._id });
        const pendingTasks = await Task.countDocuments({ ...(req.user.role !== "admin" && { assignedTo: req.user._id }), status: "Pending" });
        const inProgressTasks = await Task.countDocuments({ ...(req.user.role !== "admin" && { assignedTo: req.user._id }), status: "In Progress" });
        const completedTasks = await Task.countDocuments({ ...(req.user.role !== "admin" && { assignedTo: req.user._id }), status: "Completed" });
        
        res.json({
            tasks,
            statusSummary: { all: allTasks, pendingTasks, inProgressTasks, completedTasks },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// @desc    Get task by ID
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate("assignedTo", "name email profileImageUrl");
        if (!task) return res.status(404).json({ message: "Task not found" });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Create a new task
const createTask = async (req, res) => {
    try {
        let { title, description, priority, dueDate, assignedTo, todoChecklist, attachments, aiSummary } = req.body;

        if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
             return res.status(400).json({ message: "Task must be assigned to at least one user." });
        }
        
        if (!priority && description) {
            const aiResult = await getAIPriorityAndSummary(description, req.user.role);
            if (aiResult) {
                priority = aiResult.suggestedPriority; 
                aiSummary = aiResult.aiSummary; 
            } else {
                priority = 'Medium';
            }
        }
        
        const task = new Task({
            title, description, priority: priority || 'Medium', dueDate, assignedTo,
            createdBy: req.user._id, todoChecklist, attachments, aiSummary 
        });
        await task.save();

        // 🔔 Notify Assignees
        await sendTaskNotifications(task, req.user._id, 'task_assigned');

        res.status(201).json({ message: "Task created successfully", task });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update task details
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Keep track of old assignees to check for new ones if needed
        const oldAssignees = task.assignedTo.map(id => id.toString());

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) return res.status(400).json({ message: "assignedTo must be an array" });
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();

        // 🔔 Notify assigned members of the update
        await sendTaskNotifications(updatedTask, req.user._id, 'status_update');

        res.json({ message: "Task updated successfully", updatedTask });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// @desc    Delete a task
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });
        await task.deleteOne(); 
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update task status
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const isAssigned = task.assignedTo.some(userId => userId.toString() === req.user._id.toString());
        if (!isAssigned && req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });

        task.status = req.body.status || task.status;
        if (task.status === "Completed") {
            task.todoChecklist.forEach(item => item.completed = true);
            task.progress = 100;
        }
        await task.save();
        res.json({ message: "Task status updated", task });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update checklist
const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (!task.assignedTo.some(id => id.equals(req.user._id)) && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        task.todoChecklist = todoChecklist;
        const completedCount = task.todoChecklist.filter(item => item.completed).length;
        task.progress = task.todoChecklist.length > 0 ? Math.round((completedCount / task.todoChecklist.length) * 100) : 0;

        if (task.progress === 100) task.status = "Completed";
        else if (task.progress > 0) task.status = "In Progress";
        else task.status = "Pending";

        await task.save();
        const updatedTask = await Task.findById(req.params.id).populate("assignedTo", "name email profileImageUrl");
        res.json({ message: "Task checklist updated", task: updatedTask });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Dashboard data (Admin)
const getDashboardData = async (req, res) => {
    try {
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const overdueTasks = await Task.countDocuments({ status: { $ne: "Completed" }, dueDate: { $lt: new Date() } });

        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
        const taskDistribution = taskStatuses.reduce((acc, status) => {
            acc[status.replace(/\s+/g, "")] = taskDistributionRaw.find(i => i._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks; 

        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);
        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find(i => i._id === priority)?.count || 0;
            return acc;
        }, {});

        const recentTasks = await Task.find().sort({ createdAt: -1 }).limit(10)
            .select("title description status priority dueDate assignedTo createdAt")
            .populate("assignedTo", "name email profileImageUrl");

        res.status(200).json({ statistics: { totalTasks, pendingTasks, completedTasks, overdueTasks }, charts: { taskDistribution, taskPriorityLevels }, recentTasks });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Dashboard data (User)
const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user._id; 
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3); // Window for "Upcoming" tasks

        // 1. General Statistics
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasksCount = await Task.countDocuments({ 
            assignedTo: userId, 
            status: { $ne: "Completed" }, 
            dueDate: { $lt: now } 
        });
        
        // 2. Chart Distributions
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            { $match: { assignedTo: userId } }, 
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const taskDistribution = taskStatuses.reduce((acc, status) => {
            acc[status.replace(/\s+/g, "")] = taskDistributionRaw.find(i => i._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks; 

        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            { $match: { assignedTo: userId } }, 
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ]);
        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find(i => i._id === priority)?.count || 0;
            return acc;
        }, {});

        // 3. NEW: Urgency Lists
        // Overdue Tasks List
        const overdueTasksList = await Task.find({ 
            assignedTo: userId, 
            status: { $ne: "Completed" }, 
            dueDate: { $lt: now } 
        }).limit(5).select("title dueDate priority aiSummary");

        // Upcoming Tasks (Next 72 hours)
        const upcomingTasks = await Task.find({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $gte: now, $lte: threeDaysFromNow }
        }).sort({ dueDate: 1 }).limit(5).select("title dueDate priority aiSummary");

        // 4. Recent Tasks
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title description status priority dueDate createdAt aiSummary");

        res.status(200).json({ 
            statistics: { 
                totalTasks, 
                pendingTasks, 
                completedTasks, 
                overdueTasks: overdueTasksCount 
            }, 
            charts: { taskDistribution, taskPriorityLevels }, 
            recentTasks,
            upcomingTasks,      // NEW
            overdueTasksList    // NEW
        });     
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// =====================================================================
// --- NEW CONTROLLER: CREATE TASK FROM AI (Groq) ---
// =====================================================================

const createTaskFromAI = async (req, res) => {
  try {
    const { prompt, assignedTo } = req.body; // Accept assignedTo from body
    if (!prompt) return res.status(400).json({ message: "Prompt is required" });

    const aiPrompt = `
      You are an expert Project Manager. Create a detailed JSON task from this user request: "${prompt}".
      ... (rest of your AI prompt logic) ...
    `;

    try {
      const completion = await groq.chat.completions.create({
          messages: [
              { role: "system", content: "You output valid JSON only." },
              { role: "user", content: aiPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" }
      });

      const taskData = JSON.parse(completion.choices[0]?.message?.content || "{}");

      const newTask = await Task.create({
        title: taskData.title || "New Task",
        description: taskData.description || prompt,
        priority: taskData.priority || "Medium",
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : new Date(Date.now() + 7 * 86400000),
        todoChecklist: taskData.todoChecklist || [],
        status: "Pending",
        assignedTo: assignedTo || [req.user._id], // Use provided assignees or default to creator
        createdBy: req.user._id
      });

      // 🔔 Notify Assignees
      await sendTaskNotifications(newTask, req.user._id, 'task_assigned');

      res.status(201).json(newTask);

    } catch (aiError) {
      console.error("Groq Create Task Error:", aiError);
      res.status(500).json({ message: "AI processing failed" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
};

// =====================================================================
// --- NEW CONTROLLER: GENERATE SUBTASKS (Groq) ---
// =====================================================================

const generateSubtasks = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!process.env.GROQ_API_KEY) return res.status(500).json({ message: "AI not configured" });

        const prompt = `
            Act as a project manager. Break down this task into 3-6 actionable subtasks.
            Task: "${title}"
            Context: "${description || ''}"
            
            Return ONLY a JSON object with a "subtasks" array:
            { "subtasks": [ { "text": "Subtask 1", "completed": false }, ... ] }
        `;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You output valid JSON only." },
                { role: "user", content: prompt }
            ],
            model: AI_MODEL,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
        const subtasks = result.subtasks || []; // Extract array safely

        res.json(subtasks);
    } catch (error) {
        console.error("Groq Subtask Error:", error);
        res.status(500).json({ message: "Failed to generate subtasks" });
    }
};

// @desc    Get all tasks globally (Host only - God Mode)
// @route   GET /api/host/tasks/global
// @access  Private (Host)
const getAllTasksGlobal = async (req, res) => {
    try {
        const { status, priority } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        // Fetch ALL tasks in the system regardless of assignee
        const tasks = await Task.find(filter)
            .populate("assignedTo", "name email profileImageUrl role")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        // Enhance tasks with checklist completion count
        const enhancedTasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoChecklist.filter(item => item.completed).length;
                return {
                    ...task._doc,
                    completedTodoCount: completedCount,
                    totalTodoCount: task.todoChecklist.length,
                };
            })
        );

        // Get statistics
        const totalTasks = await Task.countDocuments({});
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const inProgressTasks = await Task.countDocuments({ status: "In Progress" });

        res.status(200).json({
            success: true,
            statistics: {
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks,
            },
            data: enhancedTasks,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getTasks, getTaskById, createTask, updateTask, deleteTask,
    updateTaskStatus, updateTaskChecklist, getDashboardData, getUserDashboardData,
    createTaskFromAI, generateSubtasks, getAllTasksGlobal
};