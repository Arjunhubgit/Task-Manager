const mongoose = require("mongoose");

const AdminInviteSchema = new mongoose.Schema(
  {
    // Reference to the ADMIN who created this invite
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Unique invite code that members use to join
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Full invite link (URL format)
    inviteLink: {
      type: String,
      required: true,
    },

    // How many members can use this invite (null = unlimited)
    maxUses: {
      type: Number,
      default: null, // null means unlimited
    },

    // How many times this invite has been used
    timesUsed: {
      type: Number,
      default: 0,
    },

    // When the invite expires (null = never expires)
    expiresAt: {
      type: Date,
      default: null,
    },

    // Is the invite currently active
    isActive: {
      type: Boolean,
      default: true,
    },

    // Description of the invite (e.g., "Invite for Q1 Project Team")
    description: {
      type: String,
      default: null,
    },

    // Array of user IDs who used this invite
    usedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usedAt: {
          type: Date,
          default: () => new Date(),
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster lookup
AdminInviteSchema.index({ inviteCode: 1 });
AdminInviteSchema.index({ adminId: 1 });
AdminInviteSchema.index({ inviteLink: 1 });

module.exports = mongoose.model("AdminInvite", AdminInviteSchema);
