const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

const {
  getDashboardData,
  getUserDashboardData,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  createTaskFromAI,
  generateSubtasks // 💡 Import the new AI controller
} = require("../controllers/taskControllers");

const router = express.Router();

// Task Management Routes

// 1. Dashboard Data
router.get("/dashboard-data", protect, adminOnly, getDashboardData); // Added adminOnly for safety based on controller name
router.get("/user-dashboard-data", protect, getUserDashboardData);

// 2. AI Task Creation (New Route)
// Must be placed before the dynamic /:id routes to avoid conflict
router.post("/ai-create", protect, adminOnly, createTaskFromAI); 
router.post("/ai-generate-subtasks", protect, generateSubtasks);

// 3. CRUD Operations
router.get("/", protect, getTasks); // Get all tasks (Admin: all, User: assigned)
router.post("/", protect, adminOnly, createTask); // Manual task creation (Admin only)

router.get("/:id", protect, getTaskById); // Get task by ID
router.put("/:id", protect, updateTask); // Update task details
router.delete("/:id", protect, adminOnly, deleteTask); // Delete a task (Admin only)

// 4. Status & Checklist Updates
router.put("/:id/status", protect, updateTaskStatus); 
router.put("/:id/todo", protect, updateTaskChecklist); 

module.exports = router;