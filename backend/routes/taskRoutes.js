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
  addTaskComment,
  getTaskComments,
  createTaskFromAI,
  generateSubtasks,
  getMemberAgenda,
  getMemberInsights,
  aiAssistTask,
  planMemberDay,
} = require("../controllers/taskControllers");

const router = express.Router();

// Task Management Routes

// 1. Dashboard Data
router.get("/dashboard-data", protect, adminOnly, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/member/agenda", protect, getMemberAgenda);
router.get("/member/insights", protect, getMemberInsights);
router.post("/member/plan-day", protect, planMemberDay);

// 2. AI Routes
router.post("/ai-create", protect, adminOnly, createTaskFromAI);
router.post("/ai-generate-subtasks", protect, adminOnly, generateSubtasks);

// 3. CRUD Operations
router.get("/", protect, getTasks);
router.post("/", protect, adminOnly, createTask);
router.post("/:id/ai-assist", protect, aiAssistTask);

router.get("/:id", protect, getTaskById);
router.put("/:id", protect, updateTask);
router.delete("/:id", protect, adminOnly, deleteTask);
router.get("/:id/comments", protect, getTaskComments);
router.post("/:id/comments", protect, addTaskComment);

// 4. Status & Checklist Updates
router.put("/:id/status", protect, updateTaskStatus); 
router.put("/:id/todo", protect, updateTaskChecklist); 

module.exports = router;
