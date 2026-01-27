const express = require("express");
const {protect, adminOnly, hostOnly} = require("../middlewares/authMiddleware");
const { exportTasksReport, exportUsersReport } = require("../controllers/reportControllers");
const { getAuditLogs } = require("../controllers/reportControllers");


const router = express.Router();

// Report Management Routes
router.get("/export/tasks", protect, adminOnly, exportTasksReport); // Export tasks as Excel/PDF
router.get("/export/users", protect, adminOnly, exportUsersReport); // Export users task report
router.get("/audit-logs", protect, hostOnly, getAuditLogs); // Get audit logs

module.exports = router;