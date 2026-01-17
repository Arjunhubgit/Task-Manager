const express = require("express");
const { adminOnly, protect, hostOnly, adminOrHost, canManageMember, canManageAdmin } = require("../middlewares/authMiddleware");
const { getUsers, getUserById, deleteUser, createMember, updateUser, getUsersForMessaging, createAdmin } = require("../controllers/userControllers");

const router = express.Router();

// ===== HOST ROUTES (Manage Admins) =====
router.post("/admin", protect, hostOnly, createAdmin); // HOST creates ADMIN
router.get("/", protect, adminOrHost, getUsers); // HOST gets their admins, ADMIN gets their members

// ===== ADMIN ROUTES (Manage Members) =====
router.post("/", protect, adminOnly, createMember); // ADMIN creates MEMBER
router.delete("/:id", protect, adminOrHost, canManageMember, deleteUser); // ADMIN/HOST deletes user
router.put("/:id", protect, canManageMember, updateUser); // Update user status

// ===== GENERAL ROUTES =====
router.get("/for-messaging", protect, getUsersForMessaging); // Get users for messaging (admin/member)
router.get("/:id", protect, getUserById); // Get user by ID

module.exports = router;