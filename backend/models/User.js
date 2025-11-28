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
    googleId: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);