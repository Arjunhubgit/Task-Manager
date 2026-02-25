const Notification = require("../models/Notification");
const Groq = require("groq-sdk");
const {
  HIDDEN_NOTIFICATION_TYPES,
  createNotification: createNotificationEntry,
  ensureDeadlineNotificationsForUser,
  toIdString,
} = require("../utils/notificationService");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Create a notification for a user
const createNotification = async (userId, notificationData) => {
  try {
    return await createNotificationEntry({
      userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      relatedTaskId: notificationData.relatedTaskId,
      relatedUserId: notificationData.relatedUserId,
      relatedConversationId: notificationData.relatedConversationId,
      eventKey: notificationData.eventKey,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const ensureUserScope = (req, res, userId) => {
  const requesterId = toIdString(req.user?._id);
  const requestedId = toIdString(userId);

  if (!requesterId || !requestedId || requesterId !== requestedId) {
    res.status(403).json({
      success: false,
      message: "Access denied",
    });
    return false;
  }

  return true;
};

const buildNotificationFilter = (filter) => {
  switch (String(filter || "all")) {
    case "needs_action":
      return { read: false };
    case "deadlines":
      return { type: "deadline_reminder" };
    case "mentions":
      return { type: { $in: ["comment", "mention"] } };
    case "read":
      return { read: true };
    default:
      return {};
  }
};

const buildDigestFallback = (notifications = []) => {
  if (notifications.length === 0) {
    return {
      digest: "You are all caught up. No unread notifications require attention.",
      highlights: [],
    };
  }

  const highlights = notifications.slice(0, 5).map((item) => item.title || item.message).filter(Boolean);
  return {
    digest: `You have ${notifications.length} unread notification${notifications.length > 1 ? "s" : ""}. Prioritize deadline reminders and status updates first.`,
    highlights,
  };
};

// Get all notifications for a user
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter = "all" } = req.query;

    if (!ensureUserScope(req, res, userId)) return;

    await ensureDeadlineNotificationsForUser(userId);

    const notifications = await Notification.find({
      userId,
      type: { $nin: HIDDEN_NOTIFICATION_TYPES },
      ...buildNotificationFilter(filter),
    })
      .populate("relatedTaskId", "title")
      .populate("relatedUserId", "name email")
      .populate("relatedConversationId", "_id")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user._id },
      { read: true },
      { new: true }
    )
      .populate("relatedTaskId", "title")
      .populate("relatedUserId", "name email");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
    });
  }
};

// Mark all notifications as read for a user
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) return;

    await Notification.updateMany(
      { userId, read: false, type: { $nin: HIDDEN_NOTIFICATION_TYPES } },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read",
    });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
    });
  }
};

// Delete all notifications for a user
const deleteAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) return;

    await Notification.deleteMany({
      userId,
      type: { $nin: HIDDEN_NOTIFICATION_TYPES },
    });

    res.status(200).json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting all notifications",
    });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) return;

    await ensureDeadlineNotificationsForUser(userId);

    const count = await Notification.countDocuments({
      userId,
      read: false,
      type: { $nin: HIDDEN_NOTIFICATION_TYPES },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      message: "Error getting unread count",
    });
  }
};

const generateNotificationDigest = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) return;

    await ensureDeadlineNotificationsForUser(userId);

    const unreadNotifications = await Notification.find({
      userId,
      read: false,
      type: { $nin: HIDDEN_NOTIFICATION_TYPES },
    })
      .populate("relatedTaskId", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    const fallback = buildDigestFallback(unreadNotifications);
    if (!groq) {
      return res.status(200).json({
        success: true,
        ...fallback,
        source: "fallback",
      });
    }

    const notificationContext = unreadNotifications
      .map(
        (item, index) =>
          `${index + 1}. [${item.type}] ${item.title} - ${item.message}${
            item.relatedTaskId?.title ? ` (Task: ${item.relatedTaskId.title})` : ""
          }`
      )
      .join("\n")
      .slice(0, 10000);

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You summarize unread notifications for a productivity app. Return valid JSON only with keys digest and highlights.",
          },
          {
            role: "user",
            content: `Unread notifications:\n${notificationContext}\n\nReturn JSON: {"digest":"...","highlights":["..."]}. Keep digest under 70 words and highlights max 5.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
      const digest = typeof parsed.digest === "string" && parsed.digest.trim() ? parsed.digest.trim() : fallback.digest;
      const highlights = Array.isArray(parsed.highlights)
        ? parsed.highlights.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : fallback.highlights;

      return res.status(200).json({
        success: true,
        digest,
        highlights,
        source: "ai",
      });
    } catch (aiError) {
      console.error("Failed to generate notification digest with AI:", aiError.message);
      return res.status(200).json({
        success: true,
        ...fallback,
        source: "fallback",
      });
    }
  } catch (error) {
    console.error("Error generating notification digest:", error);
    res.status(500).json({
      success: false,
      message: "Error generating notification digest",
    });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  generateNotificationDigest,
};
