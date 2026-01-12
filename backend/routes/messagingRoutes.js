const express = require('express');
const router = express.Router();
const messagingControllers = require('../controllers/messagingControllers');

// Get all conversations for a user
router.get('/conversations/:userId', messagingControllers.getConversations);

// Get messages for a conversation
router.get('/conversation/:conversationId', messagingControllers.getConversationMessages);

// Send a message
router.post('/send', messagingControllers.sendMessage);

// Mark a message as read
router.put('/:messageId/read', messagingControllers.markMessageAsRead);

// Get unread messages for a user
router.get('/unread/:userId', messagingControllers.getUnreadMessages);

// Delete a message
router.delete('/:messageId', messagingControllers.deleteMessage);

// Delete a conversation
router.delete('/conversation/:conversationId', messagingControllers.deleteConversation);

module.exports = router;
