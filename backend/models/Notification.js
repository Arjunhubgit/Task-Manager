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
        "deadline_reminder"
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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
