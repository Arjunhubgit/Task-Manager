const Task = require("../models/Task");
const User = require("../models/User"); 
const fetched = require('node-fetch');
const fetch = fetched.default || fetched; 
const { URLSearchParams } = require('url');

// --- NEW IMPORT FOR CHAT-TO-TASK FEATURE ---
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");


// @desc    Generate subtasks for a given task title/description
// @route   POST /api/tasks/ai-generate-subtasks
// @access  Private
const generateSubtasks = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "AI Service not configured" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Use flash for speed
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            text: { type: SchemaType.STRING },
                            completed: { type: SchemaType.BOOLEAN }
                        }
                    }
                }
            }
        });

        const prompt = `
            Act as a project manager. Break down the following task into 3-6 actionable, bite-sized subtasks.
            Task: "${title}"
            Context: "${description || ''}"
            
            Return ONLY a JSON array of objects with "text" and "completed" (false) fields.
        `;

        const result = await model.generateContent(prompt);
        const subtasks = JSON.parse(result.response.text());

        res.json(subtasks);

    } catch (error) {
        console.error("AI Subtask Error:", error);
        res.status(500).json({ message: "Failed to generate subtasks" });
    }
};

const jwt = require("jsonwebtoken");
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" }); 
};

// =====================================================================
// --- HELPER: AI PRIORITY & SUMMARY (Used inside createTask) ---
// =====================================================================

const getAIPriorityAndSummary = async (taskDescription, userRole) => {
    const apiKey = process.env.GEMINI_API_KEY || ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    if (!apiKey) {
        console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables. Cannot call AI.");
        return null; 
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
        generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: prioritySchema,
        },
    };

    try {
        const response = await fetch(apiUrl, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`[Gemini Debug] Response Status: ${response.status}`);

        const result = await response.json();

        if (!response.ok) {
            console.error(`[Gemini Debug] HTTP Error [${response.status}]:`, JSON.stringify(result, null, 2));
            return null; 
        }

        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            try {
                const parsedResult = JSON.parse(jsonText);
                console.log(`[Gemini Debug] Successfully Parsed AI Output: ${JSON.stringify(parsedResult)}`);
                return parsedResult;
            } catch (parseError) {
                console.error("CRITICAL ERROR: Gemini API JSON PARSE FAILED.");
                console.error("[Gemini Debug] Raw Text:", jsonText);
                return null; 
            }
        }
        
        console.error("Gemini API failed to return structured text. Raw Result:", JSON.stringify(result, null, 2));
        return null; 

    } catch (error) {
        console.error("Gemini API Network Error:", error);
        return null; 
    }
};

// =====================================================================
// --- CORE CONTROLLERS ---
// =====================================================================

// @desc    Get all tasks (Admin: all, User: only assigned tasks) with Pagination
// @route   GET /api/tasks/
// @access  Private
const getTasks = async (req, res) => {
    try {
        const { status, assignedTo } = req.query; // <--- MODIFICATION 1: Extract assignedTo
        
        let filter = {};
        if (status) {
            filter.status = status;
        }
        // <--- MODIFICATION 2: Add assignedTo to filter if it exists
        if (assignedTo) {
            filter.assignedTo = assignedTo;
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

        // Status summary count (Existing logic preserved)
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
            priority, 
            dueDate,
            assignedTo,
            todoChecklist,
            attachments,
            aiSummary = undefined 
        } = req.body;

        if (!Array.isArray(assignedTo)) {
            return res.status(400)
                .json({ message: "AssignedTo must be an array of user IDs" });
        }

        // Critical Fix: Ensure at least one user is assigned
        if (assignedTo.length === 0) {
             return res.status(400).json({ message: "Task must be assigned to at least one user." });
        }
        
        // ----------------------------------------------------
        // AI PRIORITIZATION LOGIC
        // ----------------------------------------------------
        if (!priority && description) {
            console.log("[Task Creation] Priority missing. Calling Gemini AI for analysis...");
            const aiResult = await getAIPriorityAndSummary(description, req.user.role);

            if (aiResult) {
                priority = aiResult.suggestedPriority; 
                aiSummary = aiResult.aiSummary; 
                console.log(`[Task Creation] AI suggested priority: ${priority}`);
            } else {
                priority = 'Medium';
                console.log("[Task Creation] AI failed to provide a result, defaulting to Medium priority.");
            }
        }
        // ----------------------------------------------------
        
        const task = new Task({
            title,
            description,
            priority: priority || 'Medium', 
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attachments,
            aiSummary 
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
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });

        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); 
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks; 

        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        // --- FIX IS HERE ---
        const recentTasks = await Task.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title description status priority dueDate assignedTo createdAt")
            .populate("assignedTo", "name email profileImageUrl"); // <--- ADD THIS LINE

        res.status(200).json({
            statistics: { totalTasks, pendingTasks, completedTasks, overdueTasks },
            charts: { taskDistribution, taskPriorityLevels },
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
        const userId = req.user._id; 
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });
        
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); 
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks; 

        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]);
        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title description status priority dueDate createdAt");

        res.status(200).json({
            statistics: { totalTasks, pendingTasks, completedTasks, overdueTasks },
            charts: { taskDistribution, taskPriorityLevels },
            recentTasks,
        });     
 } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// =====================================================================
// --- NEW CONTROLLER: CREATE TASK FROM AI PROMPT ---
// =====================================================================

// @desc    Create a task automatically from a natural language prompt
// @route   POST /api/tasks/ai-create
// @access  Private
const createTaskFromAI = async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found. Creating basic task from prompt.");
      return createBasicTaskFromPrompt(req, res, prompt);
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // Try gemini-2.0-flash first, fall back to gemini-1.5-pro
      let model;
      try {
        model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                priority: { type: SchemaType.STRING, enum: ["Low", "Medium", "High"] },
                dueDate: { type: SchemaType.STRING, description: "ISO 8601 date string" }, 
                todoChecklist: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      text: { type: SchemaType.STRING },
                      completed: { type: SchemaType.BOOLEAN }
                    }
                  }
                }
              },
              required: ["title", "priority", "dueDate"]
            }
          }
        });
      } catch (modelError) {
        console.warn("gemini-2.0-flash not available, using gemini-1.5-pro");
        model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                priority: { type: SchemaType.STRING, enum: ["Low", "Medium", "High"] },
                dueDate: { type: SchemaType.STRING, description: "ISO 8601 date string" }, 
                todoChecklist: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      text: { type: SchemaType.STRING },
                      completed: { type: SchemaType.BOOLEAN }
                    }
                  }
                }
              },
              required: ["title", "priority", "dueDate"]
            }
          }
        });
      }

      const aiPrompt = `
        You are a smart task manager assistant. Analyze the following request and create a structured task.
        Current Date/Time: ${new Date().toISOString()}.
        
        User Request: "${prompt}"
        
        Rules:
        1. Infer a professional Title from the prompt.
        2. If no priority is mentioned, default to "Medium".
        3. If no due date is mentioned, default to 7 days from now in ISO 8601 format (e.g., 2025-12-13T00:00:00Z).
        4. Create 3-5 relevant sub-tasks for the 'todoChecklist' based on the task description.
        5. Provide a clear description of what needs to be done.
        
        Return ONLY valid JSON, no additional text.
      `;

      const result = await model.generateContent(aiPrompt);
      const taskData = JSON.parse(result.response.text());

      // Create the task in the database
      const newTask = await Task.create({
        title: taskData.title,
        description: taskData.description || prompt,
        priority: taskData.priority || "Medium",
        dueDate: new Date(taskData.dueDate),
        todoChecklist: taskData.todoChecklist || [],
        status: "Pending",
        assignedTo: [req.user._id],
        createdBy: req.user._id
      });

      res.status(201).json(newTask);
    } catch (aiError) {
      console.error("Gemini API Error:", aiError.message);
      // Fallback: Create basic task from prompt
      return createBasicTaskFromPrompt(req, res, prompt);
    }

  } catch (error) {
    console.error("AI Task Creation Error:", error);
    res.status(500).json({ message: "Failed to create task from AI", error: error.message });
  }
};

// Fallback function to create a basic task from the prompt
const createBasicTaskFromPrompt = async (req, res, prompt) => {
  try {
    // Simple parsing of the prompt to extract basic info
    const lines = prompt.split(/[.,!?]/);
    const title = lines[0]?.trim() || "New Task";
    
    // Default todo checklist based on prompt
    const defaultTodos = [
      "Plan and prepare",
      "Execute",
      "Review and finalize"
    ];

    const newTask = await Task.create({
      title: title.substring(0, 100), // Limit title length
      description: prompt,
      priority: "Medium", // Default priority
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      todoChecklist: defaultTodos.map(text => ({ text, completed: false })),
      status: "Pending",
      assignedTo: [req.user._id],
      createdBy: req.user._id
    });

    res.status(201).json(newTask);
  } catch (fallbackError) {
    console.error("Fallback Task Creation Error:", fallbackError);
    res.status(500).json({ 
      message: "Failed to create task", 
      error: fallbackError.message 
    });
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
    getUserDashboardData,
    createTaskFromAI,
    generateSubtasks
};