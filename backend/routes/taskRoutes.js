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
  generateSubtasks // <--- 1. IMPORT THIS
} = require("../controllers/taskControllers");

const router = express.Router();

// Task Management Routes

// 1. Dashboard Data
router.get("/dashboard-data", protect, adminOnly, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);

// 2. AI Routes
router.post("/ai-create", protect, adminOnly, createTaskFromAI);
router.post("/ai-generate-subtasks", protect, adminOnly, generateSubtasks); // <--- 2. ADD THIS ROUTE

// 3. CRUD Operations
router.get("/", protect, getTasks);
router.post("/", protect, adminOnly, createTask);

router.get("/:id", protect, getTaskById);
router.put("/:id", protect, updateTask);
router.delete("/:id", protect, adminOnly, deleteTask);

// 4. Status & Checklist Updates
router.put("/:id/status", protect, updateTaskStatus); 
router.put("/:id/todo", protect, updateTaskChecklist); 

module.exports = router;