const Notification = require("../models/Notification");
const Task = require("../models/Task");

const HIDDEN_NOTIFICATION_TYPES = ["task_assigned"];
const DEADLINE_SOON_WINDOW_HOURS = 24;

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.toString) return value.toString();
  return String(value);
};

const uniqueIds = (ids = []) => [...new Set(ids.map((id) => toIdString(id)).filter(Boolean))];

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isVisibleNotificationType = (type) => !HIDDEN_NOTIFICATION_TYPES.includes(type);

const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedTaskId,
  relatedUserId,
  relatedConversationId,
  eventKey,
}) => {
  if (!userId || !type || !title || !message) return null;

  const normalizedUserId = toIdString(userId);
  const normalizedEventKey = typeof eventKey === "string" ? eventKey.trim() : "";

  if (normalizedEventKey) {
    const existing = await Notification.findOne({
      userId: normalizedUserId,
      eventKey: normalizedEventKey,
    });

    if (existing) return existing;
  }

  const payload = {
    userId: normalizedUserId,
    type,
    title,
    message,
    relatedTaskId,
    relatedUserId,
    relatedConversationId,
  };

  if (normalizedEventKey) payload.eventKey = normalizedEventKey;

  return Notification.create(payload);
};

const createNotificationsForUsers = async (
  users = [],
  notificationData,
  { skipUserId } = {}
) => {
  const recipientIds = uniqueIds(users);
  const skipId = toIdString(skipUserId);
  const created = [];

  for (const recipientId of recipientIds) {
    if (skipId && recipientId === skipId) continue;

    const payload =
      typeof notificationData === "function"
        ? notificationData(recipientId)
        : notificationData;

    if (!payload) continue;

    const notification = await createNotification({
      userId: recipientId,
      ...payload,
    });

    if (notification) created.push(notification);
  }

  return created;
};

const buildTaskCompletionCopy = ({ task, completedByName, completedAt = new Date() }) => {
  const dueAt = new Date(task?.dueDate).getTime();
  const doneAt = new Date(completedAt).getTime();
  const hasDueDate = Number.isFinite(dueAt);
  const hasDoneAt = Number.isFinite(doneAt);
  const isOnTime = hasDueDate && hasDoneAt ? doneAt <= dueAt : null;

  if (isOnTime === true) {
    return {
      title: "Task completed on time",
      message: `${completedByName} completed "${task.title}" before due date (${formatDateTime(
        task.dueDate
      )}).`,
    };
  }

  if (isOnTime === false) {
    return {
      title: "Task completed after deadline",
      message: `${completedByName} completed "${task.title}" after due date (${formatDateTime(
        task.dueDate
      )}).`,
    };
  }

  return {
    title: "Task completed",
    message: `${completedByName} marked "${task.title}" as completed.`,
  };
};

const buildTaskStatusUpdateCopy = ({
  taskTitle,
  previousStatus,
  nextStatus,
  updatedByName,
}) => ({
  title: "Task status updated",
  message: `${updatedByName} changed "${taskTitle}" from ${previousStatus} to ${nextStatus}.`,
});

const ensureDeadlineNotificationsForUser = async (userId) => {
  const normalizedUserId = toIdString(userId);
  if (!normalizedUserId) return;

  const now = Date.now();
  const dueSoonLimit = now + DEADLINE_SOON_WINDOW_HOURS * 60 * 60 * 1000;

  const tasks = await Task.find({
    assignedTo: normalizedUserId,
    status: { $ne: "Completed" },
    dueDate: { $exists: true, $ne: null },
  }).select("_id title dueDate priority");

  for (const task of tasks) {
    const dueAt = new Date(task.dueDate).getTime();
    if (!Number.isFinite(dueAt)) continue;

    if (dueAt <= now) {
      await createNotification({
        userId: normalizedUserId,
        type: "deadline_reminder",
        title: "Task overdue",
        message: `"${task.title}" is overdue (due ${formatDateTime(task.dueDate)}).`,
        relatedTaskId: task._id,
        eventKey: `deadline-overdue:${task._id}:${new Date(task.dueDate).toISOString()}`,
      });
      continue;
    }

    if (dueAt <= dueSoonLimit) {
      const hoursLeft = Math.max(1, Math.ceil((dueAt - now) / (60 * 60 * 1000)));

      await createNotification({
        userId: normalizedUserId,
        type: "deadline_reminder",
        title: "Deadline approaching",
        message: `"${task.title}" is due in ${hoursLeft} hour${
          hoursLeft > 1 ? "s" : ""
        } (${formatDateTime(task.dueDate)}).`,
        relatedTaskId: task._id,
        eventKey: `deadline-soon:${task._id}:${new Date(task.dueDate).toISOString()}`,
      });
    }
  }
};

module.exports = {
  HIDDEN_NOTIFICATION_TYPES,
  isVisibleNotificationType,
  createNotification,
  createNotificationsForUsers,
  buildTaskCompletionCopy,
  buildTaskStatusUpdateCopy,
  ensureDeadlineNotificationsForUser,
  toIdString,
  uniqueIds,
};
