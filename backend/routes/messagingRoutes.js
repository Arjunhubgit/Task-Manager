const express = require('express');
const router = express.Router();
const messagingControllers = require('../controllers/messagingControllers');
const { protect } = require('../middlewares/authMiddleware');

// Get all conversations for a user
router.get('/conversations/:userId', protect, messagingControllers.getConversations);

// Get messages for a conversation
router.get('/conversation/:conversationId', protect, messagingControllers.getConversationMessages);
router.get('/conversation/:conversationId/preferences', protect, messagingControllers.getConversationPreferences);
router.put('/conversation/:conversationId/preferences', protect, messagingControllers.updateConversationPreferences);

// Send a message
router.post('/send', protect, messagingControllers.sendMessage);
router.post('/zoom-meeting', protect, messagingControllers.createZoomMeeting);
router.post('/:conversationId/ai-summary', protect, messagingControllers.getConversationAiSummary);
router.post('/:conversationId/ai-reply-suggestions', protect, messagingControllers.getAiReplySuggestions);

// Mark a message as read
router.put('/:messageId/read', protect, messagingControllers.markMessageAsRead);

// Get unread messages for a user
router.get('/unread/:userId', protect, messagingControllers.getUnreadMessages);

// Delete a message
router.delete('/:messageId', protect, messagingControllers.deleteMessage);

// Delete a conversation
router.delete('/conversation/:conversationId', protect, messagingControllers.deleteConversation);

// Clear chat history for a conversation
router.delete('/clear/:conversationId', protect, messagingControllers.clearChat);

// unread count
router.put('/read/:conversationId', protect, messagingControllers.markConversationAsRead);

module.exports = router;
