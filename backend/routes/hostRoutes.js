const express = require("express");
const { protect, hostOnly } = require("../middlewares/authMiddleware");
const { getAllUsersGlobal } = require("../controllers/userControllers");
const { getAllTasksGlobal, updateTask, deleteTask } = require("../controllers/taskControllers");

const router = express.Router();

// All host routes require both protect and hostOnly middleware
router.use(protect, hostOnly);

// =====================================================================
// --- HOST GLOBAL USERS ROUTES ---
// =====================================================================

// @desc    Get all users globally (Admins & Members)
// @route   GET /api/host/users/global
// @access  Private (Host only)
router.get("/users/global", getAllUsersGlobal);

// =====================================================================
// --- HOST GLOBAL TASKS ROUTES ---
// =====================================================================

// @desc    Get all tasks in the system
// @route   GET /api/host/tasks/global
// @access  Private (Host only)
router.get("/tasks/global", getAllTasksGlobal);

// @desc    Update any task in the system (by Host)
// @route   PUT /api/host/tasks/:id
// @access  Private (Host only)
router.put("/tasks/:id", updateTask);

// @desc    Delete any task in the system (by Host)
// @route   DELETE /api/host/tasks/:id
// @access  Private (Host only)
router.delete("/tasks/:id", deleteTask);

module.exports = router;
