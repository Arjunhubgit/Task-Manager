const express = require("express");
const { adminOnly, protect } = require("../middlewares/authMiddleware");
const { getUsers, getUserById, deleteUser, createMember, updateUser } = require("../controllers/userControllers");

const router = express.Router();

// User management routes
router.get("/", protect, adminOnly, getUsers); // Get all users by Admin
router.get("/:id", protect, getUserById); // Get user by ID
router.put("/:id", protect, updateUser); // Update user (e.g., status)
router.delete("/:id", protect, adminOnly, deleteUser); // Delete user by Admin
router.post("/", protect, adminOnly, createMember); // Create new member by Admin

module.exports = router;