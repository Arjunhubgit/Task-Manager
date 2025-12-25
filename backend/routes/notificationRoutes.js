const express = require("express");
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notificationControllers");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all notifications for the current user
router.get("/user/:userId", getUserNotifications);

// Get unread notification count
router.get("/unread/:userId", getUnreadCount);

// Mark a notification as read
router.put("/:notificationId/read", markNotificationAsRead);

// Mark all notifications as read
router.put("/user/:userId/read-all", markAllNotificationsAsRead);

// Delete a notification
router.delete("/:notificationId", deleteNotification);

// Delete all notifications for a user
router.delete("/user/:userId/delete-all", deleteNotification); // Note: Can be implemented later

module.exports = router;
