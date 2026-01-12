const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  generateInviteLink,
  getMyInvites,
  verifyInvite,
  deactivateInvite,
  deleteInvite,
} = require("../controllers/inviteControllers");

const router = express.Router();

// ===== ADMIN ROUTES (Protected) =====
// Generate new invite
router.post("/generate", protect, adminOnly, generateInviteLink);

// Get all invites created by this admin
router.get("/my-invites", protect, adminOnly, getMyInvites);

// Deactivate an invite
router.put("/:inviteId/deactivate", protect, adminOnly, deactivateInvite);

// Delete an invite
router.delete("/:inviteId", protect, adminOnly, deleteInvite);

// ===== PUBLIC ROUTES (No authentication required) =====
// Verify invite code validity (used during signup)
router.get("/verify/:inviteCode", verifyInvite);

module.exports = router;
