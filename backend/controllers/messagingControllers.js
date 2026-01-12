const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Get all conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email profileImageUrl role')
      .sort({ lastMessageTime: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// Get messages for a conversation
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, recipientId, content, attachments } = req.body;
    let conv = conversationId;
    // If no conversationId, create/find direct conversation
    if (!conv) {
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
        $expr: { $eq: [{ $size: "$participants" }, 2] }
      });
      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, recipientId],
          lastMessage: content,
          lastMessageTime: new Date(),
          unreadCounts: { [recipientId]: 1 }
        });
        await conversation.save();
      }
      conv = conversation._id;
    }
    // Create message
    const message = new Message({
      conversationId: conv,
      senderId,
      recipientId,
      content,
      attachments: attachments || [],
      timestamp: new Date()
    });
    await message.save();
    // Update conversation
    await Conversation.findByIdAndUpdate(conv, {
      lastMessage: content,
      lastMessageTime: new Date(),
      $inc: { [`unreadCounts.${recipientId}`]: 1 }
    });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Mark message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findByIdAndUpdate(messageId, { read: true }, { new: true });
    if (message) {
      await Conversation.findByIdAndUpdate(message.conversationId, {
        $set: { [`unreadCounts.${message.recipientId}`]: 0 }
      });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Get unread messages for a user
exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = req.params.userId;
    const unreadMessages = await Message.find({ recipientId: userId, read: false });
    res.json({ unreadCount: unreadMessages.length, messages: unreadMessages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    await Message.findByIdAndDelete(messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Delete a conversation
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};
