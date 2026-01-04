const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    
    // CHANGE: Remove 'required: true' so Google users can exist without a password
    password: { type: String, required: false }, 
    
    profileImageUrl: { type: String, default: null },
    role: { type: String, enum: ["admin", "member"], default: "member" }, 
    
    // OPTIONAL: Add a field to track if they are a Google user
    googleId: { type: String, default: null },

    isOnline: { 
        type: Boolean, 
        default: false 
    },

    // User activity status: online, idle, dnd (do not disturb), invisible
    status: {
        type: String,
        enum: ['online', 'idle', 'dnd', 'invisible'],
        default: 'offline'
    },

    // Track last logout time to auto-set status to invisible after 5 mins
    lastLogoutTime: {
        type: Date,
        default: null
    },

    // Track last activity time for timeout logic
    lastActivityTime: {
        type: Date,
        default: () => new Date()
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);