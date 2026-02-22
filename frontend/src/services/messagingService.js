import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';

/**
 * Messaging Service
 * Handles all message and conversation related API calls
 */

class MessagingService {
    /**
     * Get all conversations for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} List of conversations
     */
    static async getConversations(userId) {
        try {
            const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_CONVERSATIONS(userId));
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            throw error;
        }
    }

    /**
     * Get messages for a specific conversation
     * @param {string} conversationId - Conversation ID
     * @param {number} page - Page number for pagination
     * @param {number} limit - Number of messages per page
     * @returns {Promise<Object>} Messages and pagination info
     */
    static async getConversationMessages(conversationId, page = 1, limit = 50) {
        try {
            const response = await axiosInstance.get(
                API_PATHS.MESSAGES.GET_CONVERSATION_MESSAGES(conversationId),
                { params: { page, limit } }
            );
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch conversation messages:', error);
            throw error;
        }
    }

    /**
     * Send a message to a user
     * @param {string} recipientId - Recipient user ID
     * @param {string} content - Message content
     * @param {Array} attachments - Optional file attachments
     * @returns {Promise<Object>} Sent message object
     */
    static async sendMessage(recipientId, content, attachments = []) {
        try {
            const messageData = {
                recipientId,
                content,
                attachments,
                timestamp: new Date().toISOString()
            };

            const response = await axiosInstance.post(
                API_PATHS.MESSAGES.SEND_MESSAGE,
                messageData
            );
            return response.data;
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Get unread messages count for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Unread count and list
     */
    static async getUnreadMessages(userId) {
        try {
            const response = await axiosInstance.get(
                API_PATHS.MESSAGES.GET_UNREAD_MESSAGES(userId)
            );
            return response.data || { unreadCount: 0, messages: [] };
        } catch (error) {
            console.error('Failed to fetch unread messages:', error);
            throw error;
        }
    }

    /**
     * Mark a message as read
     * @param {string} messageId - Message ID
     * @returns {Promise<Object>} Updated message
     */
    static async markMessageAsRead(messageId) {
        try {
            const response = await axiosInstance.put(
                API_PATHS.MESSAGES.MARK_MESSAGE_AS_READ(messageId)
            );
            return response.data;
        } catch (error) {
            console.error('Failed to mark message as read:', error);
            throw error;
        }
    }

    /**
     * Mark all messages in a conversation as read
     * @param {string} conversationId - Conversation ID
     * @returns {Promise<Object>} Success response
     */
    static async markConversationAsRead(conversationId) {
        try {
            // Batch operation - mark all messages in conversation as read
            const response = await axiosInstance.put(
                `/api/messages/conversation/${conversationId}/read-all`
            );
            return response.data;
        } catch (error) {
            console.error('Failed to mark conversation as read:', error);
            throw error;
        }
    }

    /**
     * Delete a message
     * @param {string} messageId - Message ID
     * @returns {Promise<Object>} Success response
     */
    static async deleteMessage(messageId) {
        try {
            const response = await axiosInstance.delete(
                API_PATHS.MESSAGES.DELETE_MESSAGE(messageId)
            );
            return response.data;
        } catch (error) {
            console.error('Failed to delete message:', error);
            throw error;
        }
    }

    /**
     * Delete entire conversation
     * @param {string} conversationId - Conversation ID
     * @returns {Promise<Object>} Success response
     */
    static async deleteConversation(conversationId) {
        try {
            const response = await axiosInstance.delete(
                API_PATHS.MESSAGES.DELETE_CONVERSATION(conversationId)
            );
            return response.data;
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            throw error;
        }
    }

    /**
     * Search messages within conversations
     * @param {string} userId - User ID
     * @param {string} searchTerm - Search query
     * @returns {Promise<Array>} Search results
     */
    static async searchMessages(userId, searchTerm) {
        try {
            const response = await axiosInstance.get(
                `/api/messages/search`,
                { params: { userId, q: searchTerm } }
            );
            return response.data || [];
        } catch (error) {
            console.error('Failed to search messages:', error);
            throw error;
        }
    }

    /**
     * Upload file attachment for message
     * @param {File} file - File to upload
     * @returns {Promise<Object>} File upload response with URL
     */
    static async uploadAttachment(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosInstance.post(
                '/api/messages/upload-attachment',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to upload attachment:', error);
            throw error;
        }
    }

    /**
     * Get or create a direct conversation between two users
     * @param {string} userId - Current user ID
     * @param {string} recipientId - Other user ID
     * @returns {Promise<Object>} Conversation object
     */
    static async getOrCreateDirectConversation(userId, recipientId) {
        try {
            const response = await axiosInstance.post(
                '/api/messages/direct-conversation',
                { userId, recipientId }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to get or create conversation:', error);
            throw error;
        }
    }

    /**
     * Subscribe to real-time message updates (WebSocket)
     * @param {string} conversationId - Conversation ID
     * @param {Function} onMessage - Callback for new messages
     * @returns {Function} Unsubscribe function
     */
    static subscribeToMessages(conversationId, onMessage) {
        // TODO: Implement WebSocket connection for real-time updates
        // For now, return a dummy unsubscribe function
        console.log(`Subscribing to messages for conversation: ${conversationId}`);
        return () => {
            console.log(`Unsubscribing from messages for conversation: ${conversationId}`);
        };
    }
}

export default MessagingService;
