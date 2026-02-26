const Task = require("../models/Task");
const User = require("../models/User");
const Groq = require("groq-sdk"); // 
const jwt = require("jsonwebtoken");
const { logActivity } = require("../utils/auditLogger");
const TaskAIService = require("../utils/TaskAIService");
const {
    createNotificationsForUsers,
    buildTaskCompletionCopy,
    buildTaskStatusUpdateCopy,
    uniqueIds,
} = require("../utils/notificationService");

// Initialize Groq Client
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Config: Use Llama 3 for best speed/intelligence balance
const AI_MODEL = "llama-3.3-70b-versatile";

// =====================================================================
// --- AI MODEL ROUTING (Smart Model Selection) ---
// =====================================================================

/**
 * Assess task complexity based on various factors
 * Returns: 'simple' | 'medium' | 'complex'
 */
const assessTaskComplexity = (task) => {
    let complexityScore = 0;

    // Description length (simple = short, complex = long)
    if (task.description) {
        const descLength = task.description.length;
        if (descLength > 500) complexityScore += 2;
        else if (descLength > 200) complexityScore += 1;
    }

    // Number of assignees (more people = more complex)
    if (task.assignedTo && task.assignedTo.length > 1) complexityScore += 1;

    // Priority (high = more complex)
    if (task.priority === 'High') complexityScore += 2;
    else if (task.priority === 'Medium') complexityScore += 1;

    // Checklists (many subtasks = more complex)
    if (task.todoChecklist && task.todoChecklist.length > 5) complexityScore += 2;
    else if (task.todoChecklist && task.todoChecklist.length > 0) complexityScore += 1;

    // Dependencies/Attachments indicate complexity
    if (task.attachments && task.attachments.length > 2) complexityScore += 1;

    // Comments indicate ongoing discussion/complexity
    if (task.comments && task.comments.length > 5) complexityScore += 1;

    // Determine complexity level
    if (complexityScore >= 5) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'simple';
};

/**
 * Select optimal AI model based on task complexity
 * Balances speed, quality, and cost
 */
const selectAIModel = (taskComplexity) => {
    const models = {
        simple: 'llama-3.1-8b-instant',      // 💰 Cost-efficient, fast
        medium: 'llama-3.3-70b-versatile',   // 🎯 Balanced (default)
        complex: 'llama-3.3-70b-versatile',  // 🧠 Best reasoning
    };
    return models[taskComplexity] || 'llama-3.3-70b-versatile';
};

// =====================================================================
// --- HELPER: AI PRIORITY & SUMMARY ---
// =====================================================================

const getActorName = async (actorId) => {
    const actor = await User.findById(actorId).select("name");
    return actor?.name || "A team member";
};

const getTaskRecipients = (task) =>
    uniqueIds([...(task.assignedTo || []), task.createdBy].filter(Boolean));

const canUserAccessTask = (task, user) => {
    if (!task || !user) return false;
    if (user.role === "admin") return true;
    if (task.createdBy?.toString() === user._id.toString()) return true;
    return (task.assignedTo || []).some((userId) => userId.toString() === user._id.toString());
};

const notifyTaskStatusUpdate = async (task, actorId, previousStatus, nextStatus, actorName) => {
    const recipients = getTaskRecipients(task);
    const content = buildTaskStatusUpdateCopy({
        taskTitle: task.title,
        previousStatus,
        nextStatus,
        updatedByName: actorName,
    });

    await createNotificationsForUsers(
        recipients,
        {
            type: "status_update",
            title: content.title,
            message: content.message,
            relatedTaskId: task._id,
            relatedUserId: actorId,
            eventKey: `status:${task._id}:${previousStatus}:${nextStatus}:${Date.now()}`
        },
        { skipUserId: actorId }
    );
};

const notifyTaskCompleted = async (task, actorId, actorName) => {
    const recipients = getTaskRecipients(task);
    const content = buildTaskCompletionCopy({
        task,
        completedByName: actorName,
        completedAt: task.updatedAt || new Date(),
    });

    await createNotificationsForUsers(
        recipients,
        (recipientId) => ({
            type: "task_completed",
            title: content.title,
            message: content.message,
            relatedTaskId: task._id,
            relatedUserId: actorId,
            eventKey: `task-completed:${task._id}:${recipientId}:${task.updatedAt || Date.now()}`
        }),
        { skipUserId: actorId }
    );
};

const notifyTaskComment = async (task, actorId, actorName, commentText, commentId) => {
    const recipients = getTaskRecipients(task);
    const trimmed = String(commentText || "").trim();
    const preview = trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;

    await createNotificationsForUsers(
        recipients,
        {
            type: "comment",
            title: "New task comment",
            message: `${actorName} commented on "${task.title}": "${preview}"`,
            relatedTaskId: task._id,
            relatedUserId: actorId,
            eventKey: `task-comment:${task._id}:${commentId}`,
        },
        { skipUserId: actorId }
    );
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
        const { status, assignedTo, priority, dueFrom, dueTo, hasChecklist, hasComments, tags } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (priority) filter.priority = priority;
        if (tags) {
            filter.tags = { $in: String(tags).split(",").map((tag) => tag.trim()).filter(Boolean) };
        }
        if (dueFrom || dueTo) {
            filter.dueDate = {};
            if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
            if (dueTo) filter.dueDate.$lte = new Date(dueTo);
        }
        if (hasChecklist === "true") {
            filter.todoChecklist = { $exists: true, $not: { $size: 0 } };
        }
        if (hasComments === "true") {
            filter.comments = { $exists: true, $not: { $size: 0 } };
        }

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
        const task = await Task.findById(req.params.id)
            .populate("assignedTo", "name email profileImageUrl")
            .populate("createdBy", "name email profileImageUrl")
            .populate("comments.userId", "name email profileImageUrl role");
        if (!task) return res.status(404).json({ message: "Task not found" });
        
        // Permission check: User can view task if they created it, are assigned to it, or are admin
        const user = req.user;
        const createdByMatch = task.createdBy && task.createdBy._id.toString() === user._id.toString();
        const assignedToMatch = task.assignedTo && task.assignedTo.some(u => u._id.toString() === user._id.toString());
        const isAdmin = user.role === "admin";
        
        if (isAdmin || createdByMatch || assignedToMatch) {
            return res.json(task);
        }
        
        console.warn(`Access denied for user ${user._id}. Creator: ${task.createdBy?._id}, Assigned to: ${task.assignedTo?.map(u => u._id).join(', ')}, User role: ${user.role}`);
        return res.status(403).json({ message: "You don't have permission to view this task" });
    } catch (error) {
        console.error("Error in getTaskById:", error);
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
        
        // Initialize AI analysis object
        let aiAnalysis = { lastAnalyzedAt: new Date() };
        let aiSuggestedTags = [];
        let complexity = "Medium";
        let estimatedHours = null;
        let suggestedSubtasks = [];
        
        // Use TaskAIService for comprehensive analysis if description provided
        if (description) {
            try {
                // Get full task analysis
                const analysis = await TaskAIService.analyzeTask(title, description, req.user.role);
                if (analysis) {
                    priority = priority || analysis.priority;
                    aiSummary = aiSummary || analysis.summary;
                    complexity = analysis.complexity;
                    estimatedHours = analysis.estimatedHours;
                    aiAnalysis = {
                        priority: analysis.priority,
                        reasoning: analysis.reasoning,
                        riskFactors: analysis.riskFactors || [],
                        successCriteria: [],
                        lastAnalyzedAt: new Date(),
                    };
                    
                    // Get suggested tags
                    const suggestedTags = await TaskAIService.suggestTaskTags(title, description, []);
                    aiSuggestedTags = suggestedTags;
                    
                    // Get suggested subtasks if description is detailed enough
                    if (description.length > 50) {
                        const decomposition = await TaskAIService.suggestDecomposition(title, description);
                        suggestedSubtasks = decomposition.subtasks || [];
                        aiAnalysis.successCriteria = decomposition.successCriteria || [];
                    }
                }
            } catch (aiError) {
                console.error("AI analysis error during task creation:", aiError.message);
                // Gracefully fallback to basic analysis
                priority = priority || 'Medium';
            }
        }
        
        const task = new Task({
            title, 
            description, 
            priority: priority || 'Medium', 
            dueDate, 
            assignedTo,
            createdBy: req.user._id, 
            todoChecklist, 
            attachments, 
            aiSummary,
            complexity,
            estimatedHours,
            aiSuggestedTags,
            suggestedSubtasks,
            aiAnalysis,
            lastAISummary: new Date(),
        });
        await task.save();

        // Log activity
        await logActivity(
            req.user._id,
            "CREATE_TASK",
            `Task: ${task.title}`,
            { taskId: task._id, priority, assignedTo },
            req
        );

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

        const previousStatus = task.status;
        const previousDueDate = task.dueDate ? new Date(task.dueDate).getTime() : null;
        const previousAssignees = uniqueIds(task.assignedTo).sort();

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.status = req.body.status || task.status;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;
        if (Array.isArray(req.body.tags)) {
            task.tags = req.body.tags.map((tag) => String(tag).trim()).filter(Boolean);
        }

        if (task.status === "Completed" && !task.completedAt) {
            task.completedAt = new Date();
        } else if (task.status !== "Completed") {
            task.completedAt = null;
        }

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) return res.status(400).json({ message: "assignedTo must be an array" });
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();
        const actorName = await getActorName(req.user._id);
        const nextDueDate = updatedTask.dueDate ? new Date(updatedTask.dueDate).getTime() : null;
        const nextAssignees = uniqueIds(updatedTask.assignedTo).sort();

        const dueDateChanged = previousDueDate !== nextDueDate;
        const assigneesChanged =
            previousAssignees.length !== nextAssignees.length ||
            previousAssignees.some((id, index) => id !== nextAssignees[index]);

        // � Log activity
        await logActivity(
            req.user._id,
            "UPDATE_TASK",
            `Task: ${updatedTask.title}`,
            { taskId: updatedTask._id },
            req
        );

        // �🔔 Notify assigned members of the update
        if (previousStatus !== updatedTask.status) {
            if (updatedTask.status === "Completed") {
                await notifyTaskCompleted(updatedTask, req.user._id, actorName);
            } else {
                await notifyTaskStatusUpdate(
                    updatedTask,
                    req.user._id,
                    previousStatus,
                    updatedTask.status,
                    actorName
                );
            }
        } else if (dueDateChanged || assigneesChanged) {
            await createNotificationsForUsers(
                getTaskRecipients(updatedTask),
                {
                    type: "status_update",
                    title: "Task details updated",
                    message: `${actorName} updated details for "${updatedTask.title}".`,
                    relatedTaskId: updatedTask._id,
                    relatedUserId: req.user._id,
                    eventKey: `task-details:${updatedTask._id}:${Date.now()}`,
                },
                { skipUserId: req.user._id }
            );
        }

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
        await logActivity(
        req.user._id,        // Who did it?
        "DELETE_TASK",       // What did they do?
        `Task: ${task.title}`, // What was affected?
        { taskId: task._id }, // Extra details
        req // Pass request object for IP logging
    );
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

        const isAssigned = task.assignedTo.some((userId) => userId.toString() === req.user._id.toString());
        if (!isAssigned && req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });

        const oldStatus = task.status;
        task.status = req.body.status || task.status;

        if (task.status === "Completed") {
            task.todoChecklist.forEach((item) => (item.completed = true));
            task.progress = 100;
            task.completedAt = new Date();
        } else {
            task.completedAt = null;
        }

        await task.save();

        if (oldStatus !== task.status) {
            const actorName = await getActorName(req.user._id);

            if (task.status === "Completed") {
                await notifyTaskCompleted(task, req.user._id, actorName);
            } else {
                await notifyTaskStatusUpdate(task, req.user._id, oldStatus, task.status, actorName);
            }
        }

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

        if (!task.assignedTo.some((id) => id.equals(req.user._id)) && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        const oldStatus = task.status;
        task.todoChecklist = todoChecklist;
        const completedCount = task.todoChecklist.filter((item) => item.completed).length;
        task.progress = task.todoChecklist.length > 0 ? Math.round((completedCount / task.todoChecklist.length) * 100) : 0;

        if (task.progress === 100) task.status = "Completed";
        else if (task.progress > 0) task.status = "In Progress";
        else task.status = "Pending";

        task.completedAt = task.status === "Completed" ? new Date() : null;

        await task.save();
        const actorName = await getActorName(req.user._id);

        if (oldStatus !== task.status) {
            if (task.status === "Completed") {
                await notifyTaskCompleted(task, req.user._id, actorName);
            } else {
                await notifyTaskStatusUpdate(task, req.user._id, oldStatus, task.status, actorName);
            }
        }

        const updatedTask = await Task.findById(req.params.id).populate("assignedTo", "name email profileImageUrl");
        res.json({ message: "Task checklist updated", task: updatedTask });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const startOfDay = (dateInput) => {
    const value = new Date(dateInput);
    value.setHours(0, 0, 0, 0);
    return value;
};

const endOfDay = (dateInput) => {
    const value = new Date(dateInput);
    value.setHours(23, 59, 59, 999);
    return value;
};

const fallbackTaskAssist = (task, mode, question = "") => {
    const q = String(question || "").trim().toLowerCase();
    if (q) {
        if (/(due|deadline|submit|submission|when)/.test(q)) {
            return task.dueDate
                ? `This task is due on ${new Date(task.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.`
                : "No due date is set for this task yet.";
        }
        if (/(priority|urgent|importance)/.test(q)) {
            return `Priority is ${task.priority || "Not set"}.`;
        }
        if (/(status|progress)/.test(q)) {
            return `Current status is ${task.status || "Not set"} with ${task.progress || 0}% progress.`;
        }
    }

    if (mode === "summary") {
        return `Task "${task.title}" is currently ${task.status.toLowerCase()} with ${task.progress || 0}% progress. Focus on the next checklist item and due date commitments.`;
    }
    if (mode === "subtasks") {
        const checklist = (task.todoChecklist || []).map((item, index) => `${index + 1}. ${item.text}`);
        if (checklist.length > 0) {
            return `Suggested execution order:\n${checklist.join("\n")}`;
        }
        return `1. Clarify deliverable for "${task.title}"\n2. Break work into 3 small steps\n3. Execute and update status`;
    }
    return `Next step: complete the highest-impact pending checklist item on "${task.title}" and post a short progress update comment.`;
};

// @desc    Add task comment
const addTaskComment = async (req, res) => {
    try {
        const { text } = req.body;
        const commentText = String(text || "").trim();

        if (!commentText) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (!canUserAccessTask(task, req.user)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        task.comments.push({
            userId: req.user._id,
            text: commentText,
        });

        await task.save();

        const createdComment = task.comments[task.comments.length - 1];
        const actorName = await getActorName(req.user._id);
        await notifyTaskComment(task, req.user._id, actorName, commentText, createdComment._id);

        await task.populate("comments.userId", "name email profileImageUrl role");
        const populatedComment = task.comments.id(createdComment._id);

        res.status(201).json({
            message: "Comment added successfully",
            comment: populatedComment,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get task comments
const getTaskComments = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate(
            "comments.userId",
            "name email profileImageUrl role"
        );
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (!canUserAccessTask(task, req.user)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        res.status(200).json({
            success: true,
            data: task.comments || [],
        });
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
        const inProgressTasks = await Task.countDocuments({ assignedTo: userId, status: "In Progress" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasksCount = await Task.countDocuments({ 
            assignedTo: userId, 
            status: { $ne: "Completed" }, 
            dueDate: { $lt: now } 
        });
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const dueTodayCount = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $gte: todayStart, $lte: todayEnd },
        });
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
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

        const riskRadar = await Task.find({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $gte: now, $lte: threeDaysFromNow },
            $or: [{ priority: "High" }, { progress: { $lt: 50 } }],
        })
            .sort({ dueDate: 1, priority: -1 })
            .limit(5)
            .select("title dueDate priority progress status aiSummary");

        const priorityScore = { High: 3, Medium: 2, Low: 1 };
        const actionableTasks = await Task.find({
            assignedTo: userId,
            status: { $ne: "Completed" },
        })
            .select("title dueDate priority progress status aiSummary")
            .limit(25);

        const nextBestTask = actionableTasks
            .map((task) => {
                const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                const hoursToDue = Number.isFinite(dueTime) ? (dueTime - now.getTime()) / (1000 * 60 * 60) : 9999;
                const overduePenalty = hoursToDue < 0 ? 100 : 0;
                const urgencyBonus = hoursToDue <= 24 ? 40 : hoursToDue <= 72 ? 20 : 0;
                const progressPenalty = Math.max(0, 60 - (task.progress || 0));
                const score =
                    overduePenalty +
                    urgencyBonus +
                    (priorityScore[task.priority] || 1) * 10 +
                    progressPenalty;
                return { ...task.toObject(), score };
            })
            .sort((a, b) => b.score - a.score)[0] || null;

        // 4. Recent Tasks
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title description status priority dueDate createdAt aiSummary");

        res.status(200).json({ 
            statistics: { 
                totalTasks, 
                pendingTasks, 
                inProgressTasks,
                completedTasks, 
                overdueTasks: overdueTasksCount 
            }, 
            todaySnapshot: {
                dueToday: dueTodayCount,
                overdue: overdueTasksCount,
                inProgress: inProgressTasks,
                completionRate,
            },
            charts: { taskDistribution, taskPriorityLevels }, 
            recentTasks,
            upcomingTasks,      // NEW
            overdueTasksList,    // NEW
            nextBestTask,
            riskRadar,
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
    const { prompt, assignedTo, teamMembers } = req.body;
    if (!prompt) return res.status(400).json({ message: "Prompt is required" });

    // ✅ Check if Groq is configured
    if (!groq) {
      return res.status(500).json({ 
        message: "AI service not configured. Please set GROQ_API_KEY in environment variables." 
      });
    }

    const normalizedTeamMembers = Array.isArray(teamMembers)
      ? teamMembers
          .map((member) => {
            const id = member?._id || member?.id;
            const name = String(member?.name || "").trim();
            const email = String(member?.email || "").trim();
            if (!id || !name) return null;
            return {
              id: String(id),
              name,
              email,
              nameKey: name.toLowerCase(),
              emailKey: email.toLowerCase(),
            };
          })
          .filter(Boolean)
      : [];

    const teamMembersContext =
      normalizedTeamMembers.length > 0
        ? normalizedTeamMembers
            .map((member, index) => `${index + 1}. ${member.name} (${member.email || "no-email"})`)
            .join("\n")
        : "No team members provided.";

    const aiPrompt = `
      You are an expert Project Manager. Create a detailed JSON task from this user request: "${prompt}".
      
      Return ONLY a valid JSON object with these fields:
      {
        "title": "Clear, actionable task title",
        "description": "Detailed description of what needs to be done",
        "priority": "High|Medium|Low",
        "dueDate": "YYYY-MM-DD format date string or null",
        "todoChecklist": ["subtask 1", "subtask 2", "subtask 3"],
        "estimatedHours": number (rough estimate),
        "tags": ["tag1", "tag2", "tag3"],
        "suggestedAssignees": ["name from the provided team member list only"]
      }

      Assignment rules:
      - Use only names from this team member list.
      - If no suitable assignee is clear, return an empty array for "suggestedAssignees".
      - Do not invent names.

      Team members:
      ${teamMembersContext}
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

      const normalizedAssignees = Array.isArray(assignedTo)
        ? assignedTo.map((id) => String(id).trim()).filter(Boolean)
        : [];

      const suggestedAssigneeNames = Array.isArray(taskData.suggestedAssignees)
        ? taskData.suggestedAssignees.map((name) => String(name || "").trim()).filter(Boolean)
        : [];

      const suggestedAssigneeDetails = [];
      const suggestedAssigneeIds = [];
      suggestedAssigneeNames.forEach((name) => {
        const searchKey = name.toLowerCase();
        const match = normalizedTeamMembers.find((member) =>
          member.nameKey === searchKey ||
          member.emailKey === searchKey ||
          member.nameKey.includes(searchKey) ||
          searchKey.includes(member.nameKey)
        );
        if (match && !suggestedAssigneeIds.includes(match.id)) {
          suggestedAssigneeIds.push(match.id);
          suggestedAssigneeDetails.push({
            id: match.id,
            name: match.name,
            email: match.email,
          });
        }
      });

      const finalAssigneeIds = normalizedAssignees.length > 0
        ? normalizedAssignees
        : suggestedAssigneeIds;

      // ✅ Generate comprehensive AI analysis using TaskAIService
      const aiAnalysis = await TaskAIService.analyzeTask(
        taskData.title || "New Task",
        taskData.description || prompt,
        req.user.role
      );

      // Merge AI analysis with generated task data
      const enrichedTask = {
        title: taskData.title || "New Task",
        description: taskData.description || prompt,
        priority: aiAnalysis.priority || taskData.priority || "Medium",
        complexity: aiAnalysis.complexity || "Medium",
        estimatedHours: aiAnalysis.estimatedHours || taskData.estimatedHours || 2,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : new Date(Date.now() + 7 * 86400000),
        todoChecklist: (taskData.todoChecklist || []).map(item => ({
          text: item,
          completed: false
        })),
        tags: taskData.tags || aiAnalysis.suggestedTags || [],
        status: "Pending",
        assignedTo: finalAssigneeIds,
        createdBy: req.user._id,
        aiAnalysis: {
          summary: aiAnalysis.summary,
          reasoning: aiAnalysis.reasoning,
          riskFactors: aiAnalysis.riskFactors || [],
          priority: aiAnalysis.priority,
          complexity: aiAnalysis.complexity,
          estimatedHours: aiAnalysis.estimatedHours,
          suggestedTags: aiAnalysis.suggestedTags || [],
          suggestedAssignees: suggestedAssigneeDetails,
        }
      };

      // ✅ Return task data with AI analysis for frontend to review
      res.status(201).json({
        task: enrichedTask,
        aiAnalysis: enrichedTask.aiAnalysis
      });

    } catch (aiError) {
      console.error("Groq Create Task Error:", aiError);
      res.status(500).json({ 
        message: "AI processing failed. Please check your GROQ_API_KEY and try again.",
        error: aiError.message 
      });
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

// @desc    Member agenda grouped by urgency
// @route   GET /api/tasks/member/agenda
// @access  Private (Member)
const getMemberAgenda = async (req, res) => {
    try {
        const windowType = req.query.window === "week" ? "week" : "today";
        const userId = req.user._id;
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowEnd = endOfDay(tomorrowStart);

        const rangeEnd = new Date(todayEnd);
        rangeEnd.setDate(rangeEnd.getDate() + (windowType === "week" ? 7 : 2));

        const agendaTasks = await Task.find({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $exists: true, $ne: null, $lte: rangeEnd },
        })
            .sort({ dueDate: 1, priority: -1 })
            .select("title description dueDate priority status progress todoChecklist comments aiSummary tags createdAt updatedAt");

        const grouped = {
            overdue: [],
            today: [],
            tomorrow: [],
            later: [],
            quickWins: [],
        };

        agendaTasks.forEach((taskDoc) => {
            const task = taskDoc.toObject();
            const due = task.dueDate ? new Date(task.dueDate) : null;
            if (!due) return;

            if (due < todayStart) grouped.overdue.push(task);
            else if (due >= todayStart && due <= todayEnd) grouped.today.push(task);
            else if (due >= tomorrowStart && due <= tomorrowEnd) grouped.tomorrow.push(task);
            else grouped.later.push(task);

            const todoCount = Array.isArray(task.todoChecklist) ? task.todoChecklist.length : 0;
            if (
                task.status === "Pending" &&
                (task.priority === "Low" || todoCount <= 3) &&
                due <= rangeEnd
            ) {
                grouped.quickWins.push(task);
            }
        });

        grouped.quickWins = grouped.quickWins.slice(0, 6);

        res.status(200).json({
            success: true,
            window: windowType,
            ...grouped,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch member agenda", error: error.message });
    }
};

const createInsightsSuggestions = async (context) => {
    const fallback = [
        "Start each day by finishing one overdue or near-due task first.",
        "Break high-priority tasks into smaller checklist items to increase momentum.",
        "Post a short status update when blocked to reduce cycle time.",
    ];

    if (!process.env.GROQ_API_KEY) return fallback;
    try {
        const prompt = `
            You are a productivity coach.
            Given these metrics: ${JSON.stringify(context)}
            Return JSON only: { "suggestions": ["...", "...", "..."] }
            Keep each suggestion practical and under 20 words.
        `;
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You output valid JSON only." },
                { role: "user", content: prompt },
            ],
            model: AI_MODEL,
            response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            return parsed.suggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
        }
    } catch (error) {
        console.error("Insights suggestion generation failed:", error.message);
    }
    return fallback;
};

// @desc    Member personal insights
// @route   GET /api/tasks/member/insights
// @access  Private (Member)
const getMemberInsights = async (req, res) => {
    try {
        const userId = req.user._id;
        const rangeParam = req.query.range === "30d" ? "30d" : "7d";
        const days = rangeParam === "30d" ? 30 : 7;
        const end = endOfDay(new Date());
        const start = startOfDay(new Date());
        start.setDate(start.getDate() - (days - 1));

        const tasks = await Task.find({
            assignedTo: userId,
            createdAt: { $lte: end },
        }).select("title status priority dueDate createdAt updatedAt completedAt progress");

        const dateKeys = [];
        const trendLookup = {};
        for (let i = 0; i < days; i += 1) {
            const current = startOfDay(start);
            current.setDate(start.getDate() + i);
            const key = current.toISOString().slice(0, 10);
            dateKeys.push(key);
            trendLookup[key] = 0;
        }

        let completedCount = 0;
        let onTimeCompleted = 0;
        let cycleTimeTotalMs = 0;
        let cycleSamples = 0;

        tasks.forEach((taskDoc) => {
            const task = taskDoc.toObject();
            const completionDate = task.completedAt || (task.status === "Completed" ? task.updatedAt : null);
            if (task.status !== "Completed" || !completionDate) return;

            const completedAt = new Date(completionDate);
            const key = completedAt.toISOString().slice(0, 10);
            if (trendLookup[key] !== undefined) {
                trendLookup[key] += 1;
            }

            completedCount += 1;
            if (task.dueDate && completedAt.getTime() <= new Date(task.dueDate).getTime()) {
                onTimeCompleted += 1;
            }

            if (task.createdAt) {
                cycleTimeTotalMs += completedAt.getTime() - new Date(task.createdAt).getTime();
                cycleSamples += 1;
            }
        });

        const completionTrend = dateKeys.map((key) => ({
            date: key,
            completed: trendLookup[key] || 0,
        }));
        const throughputHeatmap = completionTrend.map((item) => ({
            date: item.date,
            value: item.completed,
        }));

        const onTimeCompletionRatio = completedCount > 0 ? Math.round((onTimeCompleted / completedCount) * 100) : 0;
        const avgCycleTimeHours = cycleSamples > 0 ? Number((cycleTimeTotalMs / cycleSamples / (1000 * 60 * 60)).toFixed(1)) : 0;
        const averageDailyThroughput = Number(
            (completionTrend.reduce((sum, item) => sum + item.completed, 0) / days).toFixed(2)
        );

        const metrics = {
            range: rangeParam,
            totalTasks: tasks.length,
            completedCount,
            onTimeCompletionRatio,
            avgCycleTimeHours,
            averageDailyThroughput,
        };

        const suggestions = await createInsightsSuggestions(metrics);

        res.status(200).json({
            success: true,
            metrics,
            completionTrend,
            throughputHeatmap,
            suggestions,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch member insights", error: error.message });
    }
};

// @desc    AI assist for a member task
// @route   POST /api/tasks/:id/ai-assist
// @access  Private
const aiAssistTask = async (req, res) => {
    try {
        const { id } = req.params;
        const mode = String(req.body.mode || "").trim();
        const question = String(req.body.question || "").trim();
        const allowedModes = ["summary", "subtasks", "next_step"];
        if (!allowedModes.includes(mode)) {
            return res.status(400).json({ message: "Invalid mode. Use summary, subtasks, or next_step." });
        }

        const task = await Task.findById(id).select(
            "title description priority status dueDate progress todoChecklist aiSummary comments createdBy assignedTo"
        );
        if (!task) return res.status(404).json({ message: "Task not found" });
        
        // Allow AI assist for any user who can view the task
        // (admin, creator, or assigned user)
        if (!canUserAccessTask(task, req.user)) {
            console.warn(`[AI_ASSIST] Authorization denied:`, {
                userId: req.user._id,
                taskId: id,
                taskcreatedBy: task.createdBy,
                taskAssignedTo: task.assignedTo,
                userRole: req.user.role
            });
            return res.status(403).json({ message: "Not authorized to access this task" });
        }

        const fallback = fallbackTaskAssist(task, mode, question);
        if (!process.env.GROQ_API_KEY) {
            return res.status(200).json({ mode, content: fallback, source: "fallback" });
        }

        // 🎯 Smart Model Selection based on task complexity
        const taskComplexity = assessTaskComplexity(task);
        const selectedModel = selectAIModel(taskComplexity);

        const hasQuestion = Boolean(question);
        const taskContext = {
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            progress: task.progress || 0,
            todoChecklist: task.todoChecklist || [],
            aiSummary: task.aiSummary || "",
            commentsCount: Array.isArray(task.comments) ? task.comments.length : 0,
        };

        const prompt = `
            You are a senior productivity assistant helping an assigned team member.
            Task JSON: ${JSON.stringify(taskContext)}
            Mode: ${mode}
            User question: ${hasQuestion ? JSON.stringify(question) : '"(none)"'}

            Rules:
            - Keep response concise and actionable.
            - Use plain text.
            - If user question is present, answer that exact question first using task data.
            - If asked about due/submission date, return the dueDate from task data clearly.
            - If asked about status/progress/priority, answer with exact values from task data.
            - Only if there is no user question:
              - If mode=subtasks, return a numbered list (3-6 steps).
              - If mode=next_step, provide exactly one next best action.
              - If mode=summary, provide a short summary.
            - If requested information is missing, say it is not available.
        `;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You produce practical productivity guidance." },
                    { role: "user", content: prompt },
                ],
                model: selectedModel,
            });
            const content = completion.choices?.[0]?.message?.content?.trim() || fallback;
            return res.status(200).json({
                mode,
                content,
                model: selectedModel,
                complexity: taskComplexity,
                source: "ai",
            });
        } catch (aiError) {
            console.error("Task AI assist failed:", aiError.message);
            return res.status(200).json({
                mode,
                content: fallback,
                source: "fallback",
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Failed to run AI assist", error: error.message });
    }
};

// @desc    AI daily plan for member
// @route   POST /api/tasks/member/plan-day
// @access  Private (Member)
const planMemberDay = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const weekEnd = endOfDay(now);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const tasks = await Task.find({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $exists: true, $ne: null, $lte: weekEnd },
        })
            .sort({ dueDate: 1, priority: -1, progress: 1 })
            .limit(25)
            .select("title dueDate priority status progress aiSummary");

        if (tasks.length === 0) {
            return res.status(200).json({
                success: true,
                plan: [],
                summary: "No upcoming tasks found for this week.",
                source: "fallback",
            });
        }

        const fallbackPlan = tasks.slice(0, 6).map((task, index) => ({
            rank: index + 1,
            taskId: task._id,
            title: task.title,
            reason: `Due ${new Date(task.dueDate).toLocaleDateString()} with ${task.priority} priority.`,
        }));

        if (!process.env.GROQ_API_KEY) {
            return res.status(200).json({
                success: true,
                plan: fallbackPlan,
                summary: "Prioritized by due date, priority, and current progress.",
                source: "fallback",
            });
        }

        const prompt = `
            Build a focused workday plan for this member.
            Tasks: ${JSON.stringify(tasks)}
            Return JSON only:
            {
              "summary": "short guidance",
              "plan": [
                { "title": "...", "reason": "..." }
              ]
            }
            Include max 6 plan items in priority order.
        `;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You output valid JSON only." },
                    { role: "user", content: prompt },
                ],
                model: AI_MODEL,
                response_format: { type: "json_object" },
            });
            const parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
            const parsedPlan = Array.isArray(parsed.plan) ? parsed.plan : [];
            const normalizedPlan = parsedPlan
                .map((item, index) => {
                    const title = String(item?.title || "").trim();
                    if (!title) return null;
                    const match = tasks.find((task) => task.title === title) || tasks[index];
                    return {
                        rank: index + 1,
                        taskId: match?._id || null,
                        title,
                        reason: String(item?.reason || "Prioritized for momentum and deadlines.").trim(),
                    };
                })
                .filter(Boolean)
                .slice(0, 6);

            return res.status(200).json({
                success: true,
                plan: normalizedPlan.length > 0 ? normalizedPlan : fallbackPlan,
                summary:
                    String(parsed.summary || "").trim() ||
                    "Prioritized by urgency, priority, and low progress risk.",
                source: "ai",
            });
        } catch (aiError) {
            console.error("Plan day AI failed:", aiError.message);
            return res.status(200).json({
                success: true,
                plan: fallbackPlan,
                summary: "Prioritized by due date, priority, and current progress.",
                source: "fallback",
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Failed to generate day plan", error: error.message });
    }
};

// @desc    Auto-summarize a task using AI (Phase 1)
// @route   POST /tasks/:id/auto-summarize
// @access  Private
const autoSummarizeTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check authorization - allow if user can access the task
        if (!canUserAccessTask(task, req.user)) {
            console.warn(`[AUTO_SUMMARIZE] Authorization denied:`, {
                userId: req.user._id,
                taskId: req.params.id,
                taskCreatedBy: task.createdBy,
                taskAssignedTo: task.assignedTo,
                userRole: req.user.role
            });
            return res.status(403).json({ message: "Not authorized to access this task" });
        }

        // Check if task has been analyzed recently (within 1 hour) to avoid redundant calls
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (task.lastAISummary && new Date(task.lastAISummary) > oneHourAgo) {
            return res.status(200).json({ 
                message: "Task summary already current", 
                summary: task.aiSummary,
                cached: true,
            });
        }

        // Generate fresh summary
        const summary = await TaskAIService.generateTaskSummary(task);
        const riskAssessment = await TaskAIService.assessTaskRisk(task, []);

        // Update task with new summary
        task.aiSummary = summary;
        task.lastAISummary = new Date();
        if (task.aiAnalysis) {
            task.aiAnalysis.reasoning = riskAssessment;
        }
        await task.save();

        // Log activity
        await logActivity(
            req.user._id,
            "TASK_AUTO_SUMMARIZE",
            `Task ${task.title} was auto-summarized`,
            { taskId: task._id }
        );

        res.status(200).json({
            message: "Task summarized successfully",
            summary: task.aiSummary,
            riskAssessment,
            cached: false,
        });
    } catch (error) {
        console.error("Auto-summarize error:", error.message);
        res.status(500).json({ message: "Failed to summarize task", error: error.message });
    }
};

// @desc    Analyze task description without saving (for UI preview)
// @route   POST /api/tasks/ai-analyze
// @access  Private
const analyzeTaskDescription = async (req, res) => {
    try {
        const { title, description, userRole } = req.body;

        if (!description || description.trim().length < 10) {
            return res.status(400).json({ 
                message: "Description too short. Provide at least 10 characters." 
            });
        }

        // Use TaskAIService to analyze
        const analysis = await TaskAIService.analyzeTask(
            title || 'Untitled Task',
            description,
            userRole || 'user'
        );

        // Also get suggested subtasks if description is detailed
        let decomposition = { subtasks: [], successCriteria: [] };
        if (description.length > 50) {
            decomposition = await TaskAIService.suggestDecomposition(
                title || 'Task',
                description
            );
            if (analysis.aiAnalysis) {
                analysis.aiAnalysis.successCriteria = decomposition.successCriteria;
            }
        }

        // Merge suggested subtasks into analysis
        const finalAnalysis = {
            ...analysis,
            suggestedSubtasks: decomposition.subtasks,
        };

        res.status(200).json({
            message: "Task analyzed successfully",
            analysis: finalAnalysis
        });
    } catch (error) {
        console.error("Task analysis error:", error.message);
        res.status(500).json({ 
            message: "Failed to analyze task", 
            error: error.message 
        });
    }
};

module.exports = {
    getTasks, getTaskById, createTask, updateTask, deleteTask,
    updateTaskStatus, updateTaskChecklist, addTaskComment, getTaskComments,
    getDashboardData, getUserDashboardData,
    createTaskFromAI, generateSubtasks, getAllTasksGlobal,
    getMemberAgenda, getMemberInsights, aiAssistTask, planMemberDay,
    autoSummarizeTask, analyzeTaskDescription
};
