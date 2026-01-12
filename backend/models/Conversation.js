const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
});

module.exports = mongoose.model('Conversation', ConversationSchema);
