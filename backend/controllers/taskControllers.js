const Task = require("../models/Task");
// 🛠️ FINAL FIX: Safely import fetch, handling both default export and standard import
const fetched = require('node-fetch');
const fetch = fetched.default || fetched; 

const { URLSearchParams } = require('url'); 

// Generate JWT Token (Assuming this function is in authControllers.js, but keeping here for context)
// NOTE: Ensure your authControllers.js version is the source of truth for token generation.
const jwt = require("jsonwebtoken");
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" }); // Updated to 30d for convenience
};

// --- AI INTEGRATION: Gemini API Service (Enhanced Logging) ---

const getAIPriorityAndSummary = async (taskDescription, userRole) => {
    const apiKey = process.env.GEMINI_API_KEY || ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    if (!apiKey) {
        console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables. Cannot call AI.");
        return null; // Fail fast if API key is missing
    }
    
    const prioritySchema = {
        type: "object",
        properties: {
            suggestedPriority: {
                type: "string",
                description: "Suggested priority level for the task. Must be one of: High, Medium, or Low.",
            },
            aiSummary: {
                type: "string",
                description: "A one-sentence, actionable summary of the task.",
            },
        },
        required: ["suggestedPriority", "aiSummary"],
    };

    const prompt = `Analyze the following task description for a ${userRole} and determine the appropriate priority (High, Medium, or Low). The user is a professional managing their daily work. 
    Task Description: "${taskDescription}"
    
    If the task involves a hard deadline, critical client work, or immediate blockers, assign 'High'. 
    If it's routine, maintenance, or non-urgent, use 'Low'. Otherwise, use 'Medium'.`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        // 🚨 FIX APPLIED HERE: Using generationConfig instead of config 🚨
        generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: prioritySchema,
        },
    };

    try {
        const response = await fetch(apiUrl, { // Use the corrected 'fetch' function
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 1. Log the Response Status for initial check
        console.log(`[Gemini Debug] Response Status: ${response.status}`);

        const result = await response.json();

        if (!response.ok) {
            // 2. Log API service error details (e.g., 400 or 500 error from Google)
            console.error(`[Gemini Debug] HTTP Error [${response.status}]:`, JSON.stringify(result, null, 2));
            return null; 
        }

        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            try {
                // 3. Attempt to parse and return
                const parsedResult = JSON.parse(jsonText);
                console.log(`[Gemini Debug] Successfully Parsed AI Output: ${JSON.stringify(parsedResult)}`);
                return parsedResult;
            } catch (parseError) {
                // 4. Log JSON parsing errors (common if AI output doesn't match schema)
                console.error("CRITICAL ERROR: Gemini API JSON PARSE FAILED.");
                console.error("[Gemini Debug] Raw Text:", jsonText);
                console.error("[Gemini Debug] Parse Error:", parseError);
                return null; 
            }
        }
        
        // 5. Log if content structure is unexpected (e.g., missing candidates)
        console.error("Gemini API failed to return structured text. Raw Result:", JSON.stringify(result, null, 2));
        return null; 

    } catch (error) {
        console.error("Gemini API Network Error (Check connectivity/DNS):", error);
        return null; 
    }
};

// --- CORE CONTROLLERS (Rest of the file remains unchanged) ---

// @desc    Get all tasks (Admin: all, User: only assigned tasks)
// @route   GET /api/tasks/
// @access  Private
const getTasks = async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status) {
            filter.status = status;
        }

        let tasks;
        if (req.user.role === "admin") {
            tasks = await Task.find(filter).populate(
                "assignedTo",
                "name email profileImageUrl"
            );
        } else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate(
                "assignedTo",
                "name email profileImageUrl"
            );
        }
        
        // Add completed todoChecklist count to each task
        tasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoChecklist.filter(
                    (item) => item.completed
                ).length;
                return { ...task._doc, completedTodoCount: completedCount };
            })
        );

        // Status summary count
        const allTasks = await Task.countDocuments(
            req.user.role === "admin" ? {} : { assignedTo: req.user._id }
        );

        const pendingTasks = await Task.countDocuments({
            ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
            status: "Pending"
        });
        const inProgressTasks = await Task.countDocuments({
            ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
            status: "In Progress"
        });
        const completedTasks = await Task.countDocuments({
            ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
            status: "Completed"
        });
        
        res.json({
            tasks,
            statusSummary: {
                all: allTasks, 
                pendingTasks,
                inProgressTasks,
                completedTasks
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Create a new task (Admin only)
// @route   POST /api/tasks/
// @access  Private (Admin)
const createTask = async (req, res) => {
    try {
        let {
            title,
            description,
            priority, // Can now be undefined if AI is used
            dueDate,
            assignedTo,
            todoChecklist,
            attachments,
            aiSummary = undefined // Ensure this is initialized from the request body or as undefined
        } = req.body;

        if (!Array.isArray(assignedTo)) {
            return res.status(400)
                .json({ message: "AssignedTo must be an array of user IDs" });
        }
        
        // ----------------------------------------------------
        // AI PRIORITIZATION LOGIC
        // ----------------------------------------------------
        // Only run AI if priority is not manually set by the user/client
        if (!priority && description) {
            console.log("[Task Creation] Priority missing. Calling Gemini AI for analysis...");
            const aiResult = await getAIPriorityAndSummary(description, req.user.role);

            if (aiResult) {
                // Overwrite the priority if the AI provided a valid one
                priority = aiResult.suggestedPriority; 
                aiSummary = aiResult.aiSummary; // Capture the AI Summary
                console.log(`[Task Creation] AI suggested priority: ${priority}`);
            } else {
                // Fallback if AI fails (due to network, API key, or parsing error)
                priority = 'Medium';
                console.log("[Task Creation] AI failed to provide a result, defaulting to Medium priority.");
            }
        }
        // ----------------------------------------------------
        
        const task = new Task({
            title,
            description,
            priority: priority || 'Medium', // Ensure a priority is always set
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attachments,
            aiSummary // <--- Saving the AI summary
        });
        await task.save();
        res.status(201).json({ message: "Task created successfully", task });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return res
                    .status(400)
                    .json({ message: "assignedTo must be an array of user IDs" });
            }
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();
        res.json({ message: "Task updated successfully", updatedTask });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Delete a task (Admin only)
// @route   DELETE /api/tasks/:id
// @access  Private (Admin)
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
// @route   PUT /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const isAssigned = task.assignedTo.some(
            (userId) => userId.toString() === req.user._id.toString()
        );

        if (!isAssigned && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        task.status = req.body.status || task.status;

        if (task.status === "Completed") {
            task.todoChecklist.forEach((item) => (item.completed = true));
            task.progress = 100;
        }
        await task.save();
        res.json({ message: "Task status updated", task });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update task checklist
// @route   PUT /api/tasks/:id/todo 
// @access  Private
const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        if (!task.assignedTo.some(id => id.equals(req.user._id)) && req.user.role !== "admin") {
            return res
                .status(403)
                .json({ message: "Not authorized to update checklist" });
        }

        // Update checklist
        task.todoChecklist = todoChecklist;

        // Auto-update progress based on checklist completion
        const completedCount = task.todoChecklist.filter(
            (item) => item.completed
        ).length;
        const totalItems = task.todoChecklist.length;
        task.progress =
            totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        // Auto-mark task as completed if all items are checked
        if (task.progress === 100) {
            task.status = "Completed";
        } else if (task.progress > 0) {
            task.status = "In Progress";
        } else {
            task.status = "Pending";
        }

        await task.save();

        const updatedTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );

        res.json({ message: "Task checklist updated", task: updatedTask });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get dashboard data (Admin)
// @route   GET /api/tasks/dashboard-data
// @access  Private (Admin)
const getDashboardData = async (req, res) => {
    try {
        // Fetch statistics
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });

        // Ensure all possible statuses are included
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response key
            acc[formattedKey] =
                taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks; // Add total count to taskDistribution

        // Ensure all priority levels are included
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 },
                },
            },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] =
                taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        // Fetch recent 10 tasks (✅ now including priority)
        const recentTasks = await Task.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title description status priority dueDate assignedTo createdAt");

        // Final response
        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Dashboard data (User)
// @route   GET /api/tasks/user-dashboard-data
// @access  Private (User)
const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user._id; // only fetch data for the logged-in user
        // Fetch statistics
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({
            assignedTo: userId,
            status: "Pending",
        });
        const completedTasks = await Task.countDocuments({
            assignedTo: userId,
            status: "Completed",
        });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });
        // task distribution by status
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $match: { assignedTo: userId },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);
        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response key
            acc[formattedKey] =
                taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks; // Add total count to taskDistribution

        // task distribution by priority
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $match: { assignedTo: userId },
            },
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 },
                },
            },
        ]);
        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] =
                taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        // Fetch recent 10 tasks for the user (✅ now including priority)
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title description status priority dueDate createdAt");

        // Final response
        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });     
 } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
    
module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData
};