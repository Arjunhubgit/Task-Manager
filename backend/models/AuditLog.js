const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true, // e.g., "DELETE_TASK", "BAN_USER"
    },
    target: {
      type: String,
      required: true, // e.g., "Task: Fix Login Bug", "User: john@example.com"
    },
    details: {
      type: Object, // Optional: Store deleted data or previous states
      default: {},
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);