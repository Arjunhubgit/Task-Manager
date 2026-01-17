const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours from creation
});

// Add TTL index for automatic deletion (MongoDB will delete docs after expiresAt)
ConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Conversation', ConversationSchema);
