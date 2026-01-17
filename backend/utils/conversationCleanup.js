const Conversation = require('../models/Conversation');

/**
 * Start the conversation cleanup job
 * Runs every 30 minutes to delete conversations older than 24 hours
 */
const startConversationCleanup = () => {
  // Run cleanup immediately on startup
  cleanupOldConversations();

  // Run cleanup every 30 minutes (1800000 ms)
  setInterval(cleanupOldConversations, 30 * 60 * 1000);

  console.log('[Cleanup] Conversation cleanup job started - runs every 30 minutes');
};

/**
 * Delete conversations that are older than 24 hours
 */
const cleanupOldConversations = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await Conversation.deleteMany({
      createdAt: { $lt: twentyFourHoursAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`[Cleanup] Successfully deleted ${result.deletedCount} conversation(s) older than 24 hours`);
    }
  } catch (error) {
    console.error('[Cleanup] Error deleting old conversations:', error.message);
  }
};

module.exports = { startConversationCleanup, cleanupOldConversations };
