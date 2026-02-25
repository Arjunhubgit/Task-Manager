const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const ConversationPreference = require("../models/ConversationPreference");
const Notification = require("../models/Notification");
const { toIdString, createNotification } = require("../utils/notificationService");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const MESSAGE_AI_MODEL = "llama-3.3-70b-versatile";

const fetchFn = (...args) => {
  if (typeof fetch === "function") {
    return fetch(...args);
  }
  return import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));
};

let zoomTokenCache = {
  accessToken: null,
  expiresAt: 0,
};

const getZoomAccessToken = async () => {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    const err = new Error("Zoom credentials are not configured");
    err.code = "ZOOM_CONFIG_MISSING";
    throw err;
  }

  const now = Date.now();
  if (zoomTokenCache.accessToken && now < zoomTokenCache.expiresAt - 60_000) {
    return zoomTokenCache.accessToken;
  }

  const authHeader = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
    ZOOM_ACCOUNT_ID
  )}`;
  const tokenResponse = await fetchFn(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    const err = new Error(tokenData.reason || tokenData.error || "Failed to get Zoom access token");
    err.code = "ZOOM_TOKEN_FAILED";
    throw err;
  }

  zoomTokenCache = {
    accessToken: tokenData.access_token,
    expiresAt: now + Number(tokenData.expires_in || 3600) * 1000,
  };

  return zoomTokenCache.accessToken;
};

const ensureUserScope = (req, userId) => {
  const requesterId = toIdString(req.user?._id);
  const requestedId = toIdString(userId);
  const isPrivileged = req.user?.role === "admin" || req.user?.role === "host";
  return Boolean(requesterId && requestedId && (requesterId === requestedId || isPrivileged));
};

const ensureConversationAccess = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { status: 404, message: "Conversation not found", conversation: null };
  }
  const allowed = conversation.participants.some((participantId) => toIdString(participantId) === toIdString(userId));
  if (!allowed) {
    return { status: 403, message: "Not authorized for this conversation", conversation: null };
  }
  return { status: 200, message: "", conversation };
};

const normalizePreferences = (doc) => ({
  muted: Boolean(doc?.muted),
  pinned: Boolean(doc?.pinned),
  starredMessageIds: (doc?.starredMessageIds || []).map((item) => toIdString(item)),
  pinnedMessageIds: (doc?.pinnedMessageIds || []).map((item) => toIdString(item)),
  selectedMessageIds: (doc?.selectedMessageIds || []).map((item) => toIdString(item)),
});

const getFallbackSummary = (messages = []) => {
  if (!messages.length) {
    return {
      summary: "No messages available in this conversation.",
      keyDecisions: [],
      actionItems: [],
    };
  }
  const latest = messages.slice(-6).map((item) => item.content).filter(Boolean);
  const keyDecisions = latest.slice(-3);
  const actionItems = latest
    .filter((line) => /todo|action|next|follow|deadline|will|need/i.test(line))
    .slice(0, 5)
    .map((item) => item.trim());

  return {
    summary: `Recent discussion contains ${messages.length} messages. Review latest points and confirm owners for pending actions.`,
    keyDecisions,
    actionItems,
  };
};

const getFallbackReplySuggestions = (tone = "neutral") => {
  const byTone = {
    friendly: [
      "Thanks for the update. I will take this forward and share progress by end of day.",
      "Great point. I can handle this next and circle back with a quick status.",
      "Understood. Let us align on priority and I will start immediately.",
    ],
    professional: [
      "Acknowledged. I will proceed with this task and provide an update shortly.",
      "Thanks for the clarification. I will prioritize this and report progress.",
      "Noted. I will take ownership of this item and confirm completion.",
    ],
    neutral: [
      "Got it. I will work on this next and update you soon.",
      "Understood. I am starting this now and will share progress.",
      "Thanks. I will take this item and confirm when done.",
    ],
  };
  return byTone[tone] || byTone.neutral;
};

const parseMessageIdArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => toIdString(item))
    .filter((item) => mongoose.Types.ObjectId.isValid(item))
    .map((item) => new mongoose.Types.ObjectId(item));

// Get all conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!ensureUserScope(req, userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name email profileImageUrl role status isOnline lastLogoutTime")
      .sort({ lastMessageTime: -1 });

    const conversationIds = conversations.map((conversation) => conversation._id);
    const preferenceDocs = await ConversationPreference.find({
      userId: req.user._id,
      conversationId: { $in: conversationIds },
    }).lean();

    const preferenceMap = preferenceDocs.reduce((acc, doc) => {
      acc[toIdString(doc.conversationId)] = normalizePreferences(doc);
      return acc;
    }, {});

    const payload = conversations.map((conversation) => ({
      ...conversation.toObject(),
      preferences: preferenceMap[toIdString(conversation._id)] || normalizePreferences(null),
    }));

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// Get messages for a conversation
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email profileImageUrl role status isOnline lastLogoutTime")
      .populate("recipientId", "name email profileImageUrl role status isOnline lastLogoutTime")
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId: senderIdFromBody, recipientId, content, attachments } = req.body;
    const senderId = toIdString(req.user?._id);

    if (senderIdFromBody && toIdString(senderIdFromBody) !== senderId) {
      return res.status(403).json({ error: "Sender mismatch" });
    }

    if (!senderId || !recipientId || !content) {
      return res
        .status(400)
        .json({ error: "Missing required fields: senderId, recipientId, content" });
    }

    let conv = conversationId;

    if (!conv) {
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
        $expr: { $eq: [{ $size: "$participants" }, 2] },
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, recipientId],
          lastMessage: content,
          lastMessageTime: new Date(),
          unreadCounts: {
            [senderId]: 0,
            [recipientId]: 1,
          },
        });
        await conversation.save();
      }
      conv = conversation._id;
    } else {
      const access = await ensureConversationAccess(conv, senderId);
      if (access.status !== 200) {
        return res.status(access.status).json({ error: access.message });
      }
    }

    const message = new Message({
      conversationId: conv,
      senderId,
      recipientId,
      content,
      attachments: attachments || [],
      timestamp: new Date(),
    });

    await message.save();
    await message.populate("senderId", "name email profileImageUrl role");
    await message.populate("recipientId", "name email profileImageUrl role");

    await Conversation.findByIdAndUpdate(conv, {
      lastMessage: content,
      lastMessageTime: new Date(),
      $inc: { [`unreadCounts.${recipientId}`]: 1 },
    });

    await createNotification({
      userId: recipientId,
      type: "message",
      title: "New message received",
      message: `${req.user?.name || "A teammate"}: ${String(content).slice(0, 120)}`,
      relatedUserId: senderId,
      relatedConversationId: conv,
      eventKey: `message:${message._id}`,
    });

    res.json({
      ...message.toObject(),
      conversationId: conv,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Mark message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (toIdString(message.recipientId) !== toIdString(req.user._id)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    message.read = true;
    await message.save();

    await Conversation.findByIdAndUpdate(message.conversationId, {
      $set: { [`unreadCounts.${toIdString(req.user._id)}`]: 0 },
    });

    await Notification.updateMany(
      {
        userId: req.user._id,
        type: "message",
        relatedConversationId: message.conversationId,
        read: false,
      },
      { $set: { read: true } }
    );

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark message as read" });
  }
};

// Get unread messages for a user
exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!ensureUserScope(req, userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const activeConversationIds = await Conversation.find({ participants: userId }).distinct("_id");
    if (!activeConversationIds.length) {
      return res.json({ unreadCount: 0, messages: [] });
    }

    const unreadMessages = await Message.find({
      recipientId: userId,
      read: false,
      conversationId: { $in: activeConversationIds },
    });

    res.json({ unreadCount: unreadMessages.length, messages: unreadMessages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch unread messages" });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (toIdString(message.senderId) !== toIdString(req.user._id)) {
      return res.status(403).json({ error: "Only sender can delete this message" });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// Delete a conversation
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    await ConversationPreference.deleteMany({ conversationId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};

exports.clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: null,
      $set: { [`unreadCounts.${toIdString(req.user._id)}`]: 0 },
    });

    res.status(200).json({ message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({ error: "Failed to clear chat history" });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${toIdString(req.user._id)}`]: 0 },
    });

    await Message.updateMany(
      { conversationId, recipientId: req.user._id, read: false },
      { $set: { read: true } }
    );

    await Notification.updateMany(
      {
        userId: req.user._id,
        type: "message",
        relatedConversationId: conversationId,
        read: false,
      },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark conversation as read" });
  }
};

exports.getConversationPreferences = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    const preferences = await ConversationPreference.findOne({
      userId: req.user._id,
      conversationId,
    }).lean();

    res.status(200).json({
      success: true,
      preferences: normalizePreferences(preferences),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversation preferences" });
  }
};

exports.updateConversationPreferences = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    const {
      muted,
      pinned,
      starMessageId,
      unstarMessageId,
      pinMessageId,
      unpinMessageId,
      selectMessageId,
      unselectMessageId,
      selectedMessageIds,
    } = req.body || {};

    const preference =
      (await ConversationPreference.findOne({ userId: req.user._id, conversationId })) ||
      new ConversationPreference({ userId: req.user._id, conversationId });

    if (typeof muted === "boolean") preference.muted = muted;
    if (typeof pinned === "boolean") preference.pinned = pinned;

    const starredSet = new Set((preference.starredMessageIds || []).map((id) => toIdString(id)));
    const pinnedSet = new Set((preference.pinnedMessageIds || []).map((id) => toIdString(id)));
    const selectedSet = new Set((preference.selectedMessageIds || []).map((id) => toIdString(id)));

    if (mongoose.Types.ObjectId.isValid(toIdString(starMessageId))) {
      starredSet.add(toIdString(starMessageId));
    }
    if (mongoose.Types.ObjectId.isValid(toIdString(unstarMessageId))) {
      starredSet.delete(toIdString(unstarMessageId));
    }

    if (mongoose.Types.ObjectId.isValid(toIdString(pinMessageId))) {
      pinnedSet.add(toIdString(pinMessageId));
    }
    if (mongoose.Types.ObjectId.isValid(toIdString(unpinMessageId))) {
      pinnedSet.delete(toIdString(unpinMessageId));
    }

    if (mongoose.Types.ObjectId.isValid(toIdString(selectMessageId))) {
      selectedSet.add(toIdString(selectMessageId));
    }
    if (mongoose.Types.ObjectId.isValid(toIdString(unselectMessageId))) {
      selectedSet.delete(toIdString(unselectMessageId));
    }

    if (Array.isArray(selectedMessageIds)) {
      selectedSet.clear();
      parseMessageIdArray(selectedMessageIds).forEach((id) => selectedSet.add(toIdString(id)));
    }

    preference.starredMessageIds = parseMessageIdArray([...starredSet]);
    preference.pinnedMessageIds = parseMessageIdArray([...pinnedSet]);
    preference.selectedMessageIds = parseMessageIdArray([...selectedSet]);

    await preference.save();

    res.status(200).json({
      success: true,
      preferences: normalizePreferences(preference),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update conversation preferences" });
  }
};

exports.getConversationAiSummary = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(200)
      .select("content senderId timestamp")
      .lean();

    const fallback = getFallbackSummary(messages);
    if (!groq) {
      return res.status(200).json({
        success: true,
        ...fallback,
        source: "fallback",
      });
    }

    const transcript = messages
      .map((item) => `${toIdString(item.senderId) === toIdString(req.user._id) ? "Me" : "Teammate"}: ${item.content}`)
      .join("\n")
      .slice(0, 12000);

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You summarize team chat conversations. Return JSON only with summary, keyDecisions (array), actionItems (array).",
          },
          {
            role: "user",
            content: `Conversation transcript:\n${transcript}\n\nReturn JSON with concise output.`,
          },
        ],
        model: MESSAGE_AI_MODEL,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
      return res.status(200).json({
        success: true,
        summary: String(parsed.summary || fallback.summary).trim(),
        keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions.slice(0, 5) : fallback.keyDecisions,
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.slice(0, 8) : fallback.actionItems,
        source: "ai",
      });
    } catch (aiError) {
      console.error("AI conversation summary failed:", aiError.message);
      return res.status(200).json({
        success: true,
        ...fallback,
        source: "fallback",
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to summarize conversation" });
  }
};

exports.getAiReplySuggestions = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const tone = ["friendly", "professional", "neutral"].includes(req.body?.tone) ? req.body.tone : "neutral";
    const access = await ensureConversationAccess(conversationId, req.user._id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.message });
    }

    const recent = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(40)
      .select("content senderId timestamp")
      .lean();

    const fallback = getFallbackReplySuggestions(tone);
    if (!groq || recent.length === 0) {
      return res.status(200).json({
        success: true,
        suggestions: fallback,
        source: "fallback",
      });
    }

    const transcript = recent
      .reverse()
      .map((item) => `${toIdString(item.senderId) === toIdString(req.user._id) ? "Me" : "Teammate"}: ${item.content}`)
      .join("\n")
      .slice(0, 8000);

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You create 3 concise reply suggestions for chat. Return JSON only with key suggestions (array of strings).",
          },
          {
            role: "user",
            content: `Tone: ${tone}\nConversation:\n${transcript}\nReturn 3 suggestions in JSON.`,
          },
        ],
        model: MESSAGE_AI_MODEL,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : fallback;

      return res.status(200).json({
        success: true,
        suggestions: suggestions.length ? suggestions : fallback,
        source: "ai",
      });
    } catch (aiError) {
      console.error("AI reply suggestion failed:", aiError.message);
      return res.status(200).json({
        success: true,
        suggestions: fallback,
        source: "fallback",
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to generate reply suggestions" });
  }
};

exports.createZoomMeeting = async (req, res) => {
  try {
    const { callType = "video", participantName = "" } = req.body || {};
    const isAudioOnly = callType === "audio";
    const accessToken = await getZoomAccessToken();

    const meetingPayload = {
      topic: `${req.user?.name || "ChronoFlow"} ${isAudioOnly ? "Audio" : "Video"} Call${
        participantName ? ` with ${participantName}` : ""
      }`,
      type: 1,
      settings: {
        host_video: !isAudioOnly,
        participant_video: !isAudioOnly,
        join_before_host: true,
        waiting_room: false,
        mute_upon_entry: true,
      },
    };

    const createResponse = await fetchFn("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meetingPayload),
    });

    const createData = await createResponse.json();
    if (!createResponse.ok || !createData.join_url) {
      return res.status(502).json({
        message: createData.message || "Failed to create Zoom meeting",
      });
    }

    res.status(200).json({
      success: true,
      joinUrl: createData.join_url,
      startUrl: createData.start_url,
      meetingId: createData.id,
      password: createData.password || "",
      source: "zoom_api",
    });
  } catch (error) {
    const fallbackJoinUrl = process.env.ZOOM_FALLBACK_JOIN_URL;
    if (fallbackJoinUrl) {
      return res.status(200).json({
        success: true,
        joinUrl: fallbackJoinUrl,
        startUrl: fallbackJoinUrl,
        meetingId: null,
        password: "",
        source: "fallback_env",
      });
    }

    if (error.code === "ZOOM_CONFIG_MISSING") {
      return res.status(400).json({
        message:
          "Zoom integration is not configured on server. Add Zoom credentials or ZOOM_FALLBACK_JOIN_URL in backend/.env",
      });
    }
    console.error("Zoom meeting creation failed:", error);
    res.status(500).json({ message: "Failed to create Zoom meeting" });
  }
};
