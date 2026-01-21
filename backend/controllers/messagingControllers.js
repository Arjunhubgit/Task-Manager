const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Get all conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email profileImageUrl role status isOnline lastLogoutTime')
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
      .populate('senderId', 'name email profileImageUrl role status isOnline lastLogoutTime')
      .populate('recipientId', 'name email profileImageUrl role status isOnline lastLogoutTime')
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
    
    // Validate required fields
    if (!senderId || !recipientId || !content) {
      return res.status(400).json({ error: 'Missing required fields: senderId, recipientId, content' });
    }

    let conv = conversationId;
    
    // If no conversationId, create/find direct conversation
    if (!conv) {
      // Try to find existing conversation - order doesn't matter in $all
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
        $expr: { $eq: [{ $size: "$participants" }, 2] }
      });
      
      if (!conversation) {
        // Create new conversation with both participants
        conversation = new Conversation({
          participants: [senderId, recipientId],
          lastMessage: content,
          lastMessageTime: new Date(),
          unreadCounts: { 
            [senderId]: 0,
            [recipientId]: 1 
          }
        });
        await conversation.save();
      }
      conv = conversation._id;
    }
    
    // Create message with populated data
    const message = new Message({
      conversationId: conv,
      senderId,
      recipientId,
      content,
      attachments: attachments || [],
      timestamp: new Date()
    });
    
    await message.save();
    
    // Populate sender and recipient info
    await message.populate('senderId', 'name email profileImageUrl role');
    await message.populate('recipientId', 'name email profileImageUrl role');
    
    // Update conversation with last message info and unread count
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

exports.clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Delete all messages matching this conversation ID
    await Message.deleteMany({ conversationId });

    // Optional: Reset the last message preview to show the chat is empty
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: null, // Removes the text preview
      // lastMessageTime: new Date() // Keep timestamp to keep it at top, or remove line to let it drop
    });

    res.status(200).json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body; // We need to know WHICH user read it

    // Update the unreadCounts map specifically for this user to 0
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId}`]: 0 }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
};