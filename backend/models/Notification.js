const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_completed",
        "comment",
        "team_member",
        "status_update",
        "deadline_reminder",
        "message",
        "mention"
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    relatedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    },
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    relatedConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation"
    },
    eventKey: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

notificationSchema.index(
  { userId: 1, eventKey: 1 },
  {
    unique: true,
    partialFilterExpression: { eventKey: { $type: "string" } },
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
