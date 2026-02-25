import React, { useState, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import socket from '../../services/socket';
import {
    Search, Send, MoreVertical, Phone, Video, Info, Paperclip,
    Smile, User as UserIcon, MessageSquare, Check, CheckCheck,
    Bell, ChevronLeft, Trash2, Copy, Star, Reply, Flag, Sparkles
} from 'lucide-react';
import { UserContext } from '../../context/userContext';
import axiosInstance from '../../utils/axiosInstance';
import MessagingService from '../../services/messagingService';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl } from '../../utils/helper';

// --- SIMPLIFIED ANIMATION VARIANTS FOR PERFORMANCE ---
// Removed staggerChildren and complex spring animations that cause jank
const listItemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } }
};

// Disabled message animations completely - spring animations with scale cause significant scrolling jank
const messageVariants = {
    hidden: { opacity: 1 },
    visible: { opacity: 1 }
};

const _FRAMER_MOTION_LOADED = Boolean(motion);

// Helper function to format message timestamp
const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toLocaleDateString();
    const yesterdayStr = yesterday.toLocaleDateString();
    const todayStr = today.toLocaleDateString();

    if (dateStr === todayStr) return `Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    if (dateStr === yesterdayStr) return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- Status Helper Functions ---
const getStatusColor = (status) => {
    switch (status) {
        case 'online': return 'bg-emerald-500 shadow-lg shadow-emerald-500/60';
        case 'idle': return 'bg-yellow-500 shadow-lg shadow-yellow-500/60';
        case 'dnd': return 'bg-red-500 shadow-lg shadow-red-500/60';
        case 'invisible': return 'bg-gray-600 shadow-lg shadow-gray-600/40';
        default: return 'bg-gray-500 shadow-lg shadow-gray-500/40';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'online': return 'Online';
        case 'idle': return 'Idle';
        case 'dnd': return 'Do Not Disturb';
        case 'invisible': return 'Offline';
        default: return 'Offline';
    }
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const getUnreadCountForUser = (unreadCounts, userId) => {
    if (!unreadCounts || !userId) return 0;
    if (typeof unreadCounts.get === "function") {
        return Number(unreadCounts.get(userId) || 0);
    }
    return Number(unreadCounts[userId] || 0);
};

const UserMessages = () => {
    // --- State & Context ---
    const { user, notifications = [], markNotificationAsRead } = useContext(UserContext);
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [showChatOptions, setShowChatOptions] = useState(false);
    const [conversationPreferences, setConversationPreferences] = useState({});
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [messageContextPos, setMessageContextPos] = useState({ x: 0, y: 0 });
    const [starredMessages, setStarredMessages] = useState([]);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [aiSummary, setAiSummary] = useState("");
    const [aiActionItems, setAiActionItems] = useState([]);
    const [aiReplySuggestions, setAiReplySuggestions] = useState([]);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // --- Refs ---
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const chatOptionsRef = useRef(null);

    const getConversationId = useCallback((conversation) => {
        if (!conversation) return null;
        if (conversation.conversationId && conversation.conversationId !== conversation.participantId) {
            return conversation.conversationId;
        }
        if (conversation._id && conversation._id !== conversation.participantId) {
            return conversation._id;
        }
        return null;
    }, []);

    const getConversationStorageKey = useCallback(
        (conversation) => getConversationId(conversation) || conversation?.participantId || conversation?._id,
        [getConversationId]
    );

    const getPreferenceKey = useCallback(
        (conversation) => getConversationId(conversation) || conversation?._id,
        [getConversationId]
    );

    const selectedConversationKey = useMemo(
        () => getPreferenceKey(selectedConversation),
        [getPreferenceKey, selectedConversation]
    );

    const markRelatedMessageNotificationsAsRead = useCallback(
        (conversationId) => {
            if (!conversationId || !Array.isArray(notifications) || typeof markNotificationAsRead !== 'function') return;
            notifications.forEach((notification) => {
                const relatedConversationId =
                    notification?.relatedConversationId?._id || notification?.relatedConversationId;
                if (
                    notification &&
                    notification.type === 'message' &&
                    !notification.read &&
                    relatedConversationId &&
                    String(relatedConversationId) === String(conversationId)
                ) {
                    markNotificationAsRead(notification._id);
                }
            });
        },
        [notifications, markNotificationAsRead]
    );

    // --- Helpers ---
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOtherUserTyping]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setSelectedMessageId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Close chat settings when clicking outside
    useEffect(() => {
        const handleOutsideChatOptions = (event) => {
            if (chatOptionsRef.current && !chatOptionsRef.current.contains(event.target)) {
                setShowChatOptions(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideChatOptions);
        return () => document.removeEventListener('mousedown', handleOutsideChatOptions);
    }, []);

    // --- Socket.io Logic ---
    useEffect(() => {
        if (!user || !user._id) return;

        socket.connect();
        socket.emit('join', user._id);

        socket.on('receiveMessage', (data) => {
            const isCurrentChat = selectedConversation &&
                (data.conversationId === selectedConversation.conversationId ||
                    data.senderId === selectedConversation.participantId);

            if (isCurrentChat) {
                setMessages(prev => [...prev, data]);
            }

            setConversations((prev) => {
                return prev.map((conv) => {
                    if (conv._id === data.conversationId || conv.participantId === data.senderId) {
                        return {
                            ...conv,
                            lastMessage: data.content,
                            timestamp: data.timestamp
                        };
                    }
                    return conv;
                });
            });
        });

        socket.on('typing', (data) => {
            if (selectedConversation && data.senderId === selectedConversation.participantId) {
                setIsOtherUserTyping(true);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsOtherUserTyping(false), 3000);
            }
        });

        socket.on('userStatusChanged', (data) => {
            setConversations((prev) => {
                return prev.map(conv =>
                    conv.participantId === data.userId
                        ? { ...conv, participantStatus: data.status, statusTimestamp: data.timestamp }
                        : conv
                );
            });

            setSelectedConversation((prev) => {
                if (prev && prev.participantId === data.userId) {
                    return { ...prev, participantStatus: data.status, statusTimestamp: data.timestamp };
                }
                return prev;
            });
        });

        return () => {
            socket.off('receiveMessage');
            socket.off('typing');
            socket.off('userStatusChanged');
            socket.disconnect();
        };
    }, [user, selectedConversation]);

    // --- Fetch Data Logic ---
    const fetchConversations = useCallback(async () => {
        if (!user || !user._id) return;
        try {
            setIsLoadingConversations(true);
            const conversations = await MessagingService.getConversations(user._id);

            if (Array.isArray(conversations) && conversations.length > 0) {
                setConversations(conversations);
                const prefs = {};
                conversations.forEach((conv) => {
                    const key = getPreferenceKey(conv);
                    prefs[key] = conv.preferences || {};
                });
                setConversationPreferences(prefs);
            } else {
                setConversations([]);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setIsLoadingConversations(false);
        }
    }, [user, getPreferenceKey]);

    const fetchMessages = useCallback(async (conversationId) => {
        if (!conversationId) return;
        try {
            setIsLoading(true);
            const messages = await MessagingService.getConversationMessages(conversationId);
            setMessages(Array.isArray(messages) ? messages : []);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            setMessages([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (conv) => {
        const conversationId = getConversationId(conv);
        if (!conversationId) return;
        try {
            setConversations(prev => prev.map(c =>
                getConversationId(c) === conversationId ? { ...c, unread: 0 } : c
            ));

            await axiosInstance.put(`/api/messages/read/${conversationId}`, {});
            markRelatedMessageNotificationsAsRead(conversationId);
            window.dispatchEvent(new CustomEvent("messages:unread-updated", {
                detail: { conversationId }
            }));
        } catch (error) {
            console.error("Failed to mark read", error);
        }
    }, [getConversationId, markRelatedMessageNotificationsAsRead]);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const conversationParam = params.get("conversation");
        if (!conversationParam || conversations.length === 0) return;
        const match = conversations.find(
            (conversation) =>
                conversation._id === conversationParam ||
                conversation.conversationId === conversationParam
        );
        if (match) {
            setSelectedConversation(match);
        }
    }, [location.search, conversations]);

    useEffect(() => {
        if (selectedConversation) {
            const conversationId = getConversationId(selectedConversation);
            if (conversationId) {
                fetchMessages(conversationId);
            }
            setShowChatOptions(false);
            const prefKey = getPreferenceKey(selectedConversation);
            const prefs = conversationPreferences[prefKey] || {};
            setStarredMessages(prefs.starredMessageIds || []);
            setPinnedMessages(prefs.pinnedMessageIds || []);
            setSelectedMessages(prefs.selectedMessageIds || []);
        }
    }, [selectedConversation, fetchMessages, getPreferenceKey, conversationPreferences, markAsRead, getConversationId]);

    // --- Mute/Unmute Chat ---
    const handleMuteChat = async () => {
        if (!selectedConversation) return;

        try {
            const conversationKey = getPreferenceKey(selectedConversation);
            const current = conversationPreferences[conversationKey] || {};
            const isMuted = current.muted || false;

            const response = await MessagingService.updateConversationPreferences(conversationKey, {
                [isMuted ? 'unmute' : 'mute']: true
            });

            setConversationPreferences(prev => ({
                ...prev,
                [conversationKey]: { ...current, muted: !isMuted }
            }));
        } catch {
            toast.error("Failed to update chat preferences");
        }
    };

    // Message Actions
    const handleDeleteMessage = async (messageId) => {
        try {
            await axiosInstance.delete(`/api/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            toast.success("Message deleted");
        } catch {
            toast.error("Failed to delete message");
        }
    };

    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content);
        toast.success("Message copied to clipboard");
        setSelectedMessageId(null);
    };

    const handleStarMessage = (messageId) => {
        if (!selectedConversation) return;
        const conversationKey = getPreferenceKey(selectedConversation);
        const alreadyStarred = starredMessages.includes(messageId);
        MessagingService.updateConversationPreferences(conversationKey, {
            ...(alreadyStarred ? { unstarMessageId: messageId } : { starMessageId: messageId }),
        })
            .then((response) => {
                const result = alreadyStarred
                    ? starredMessages.filter(id => id !== messageId)
                    : [...starredMessages, messageId];
                setStarredMessages(result);
            })
            .catch(() => toast.error("Failed to update starred messages"));
        setSelectedMessageId(null);
    };

    const handleReplyMessage = (message) => {
        setReplyingTo(message);
        setSelectedMessageId(null);
        toast.success("Reply mode enabled");
    };

    const handleForwardMessage = (msg) => {
        const query = window.prompt("Forward to teammate (name contains):");
        if (!query || !query.trim()) return;
        const targetConversation = conversations.find((conversation) =>
            conversation.participantName.toLowerCase().includes(query.toLowerCase()) &&
            conversation._id !== selectedConversation?._id
        );
        if (!targetConversation) {
            toast.error("Teammate not found");
            return;
        }

        const payload = {
            recipientId: targetConversation.participantId,
            content: `[Forwarded] ${msg.content}`,
            conversationId: getConversationId(targetConversation),
        };
        axiosInstance
            .post('/api/messages/send', payload)
            .then(() => toast.success(`Forwarded to ${targetConversation.participantName}`))
            .catch(() => toast.error("Failed to forward message"));
        setSelectedMessageId(null);
    };

    const handlePinMessage = (msg) => {
        if (!selectedConversation) return;
        const conversationKey = getPreferenceKey(selectedConversation);
        const isPinned = pinnedMessages.includes(msg._id);
        MessagingService.updateConversationPreferences(conversationKey, {
            ...(isPinned ? { unpinMessageId: msg._id } : { pinMessageId: msg._id }),
        })
            .then((response) => {
                const result = isPinned
                    ? pinnedMessages.filter(id => id !== msg._id)
                    : [...pinnedMessages, msg._id];
                setPinnedMessages(result);
            })
            .catch(() => toast.error("Failed to pin message"));
        setSelectedMessageId(null);
    };

    const handleSelectMessage = (msgId) => {
        if (!selectedConversation) return;
        const conversationKey = getPreferenceKey(selectedConversation);
        const isSelected = selectedMessages.includes(msgId);
        MessagingService.updateConversationPreferences(conversationKey, {
            ...(isSelected ? { unselectMessageId: msgId } : { selectMessageId: msgId }),
        })
            .then((response) => {
                const result = isSelected
                    ? selectedMessages.filter(id => id !== msgId)
                    : [...selectedMessages, msgId];
                setSelectedMessages(result);
            })
            .catch(() => toast.error("Failed to update message selection"));
        setSelectedMessageId(null);
    };

    const handleReportMessage = () => {
        setSelectedMessageId(null);
        toast.success("Message reported");
    };

    const handleShowContextMenu = (e, messageId) => {
        e.preventDefault();
        e.stopPropagation();

        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 180;
        const menuHeight = 300;

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }

        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }

        setSelectedMessageId(messageId);
        setMessageContextPos({ x, y });
    };

    const renderMessageContent = useCallback((content) => {
        const parts = String(content || "").split(URL_PATTERN);
        return parts.map((part, index) => {
            if (part.match(/^https?:\/\/[^\s]+$/i)) {
                return (
                    <a
                        key={`link-${index}`}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-orange-300 hover:text-orange-200 break-all"
                    >
                        {part}
                    </a>
                );
            }
            return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
        });
    }, []);

    const buildJitsiMeetingLink = useCallback((isVideoCall = false) => {
        const me = user?._id || "";
        const other = selectedConversation?.participantId || "";
        const roomSeed = [me, other].filter(Boolean).sort().join("-");
        const roomName = `chronoflow-${isVideoCall ? "video" : "audio"}-${roomSeed}`.replace(/[^a-zA-Z0-9_-]/g, "");
        return `https://meet.jit.si/${roomName}`;
    }, [selectedConversation?.participantId, user?._id]);

    const sendMessageWithContent = useCallback(async (rawContent) => {
        const content = rawContent?.trim();
        if (!content || !selectedConversation) return;

        const payload = {
            senderId: user._id,
            recipientId: selectedConversation.participantId,
            content
        };

        const existingConversationId = getConversationId(selectedConversation);
        if (existingConversationId) {
            payload.conversationId = existingConversationId;
        }

        const response = await axiosInstance.post('/api/messages/send', payload);
        const resolvedConversationId = payload.conversationId || response.data.conversationId || existingConversationId;

        if (!existingConversationId && resolvedConversationId) {
            setSelectedConversation(prev => (
                prev
                    ? { ...prev, _id: resolvedConversationId, conversationId: resolvedConversationId }
                    : prev
            ));
        }

        socket.emit('sendMessage', {
            _id: response.data._id,
            senderId: user._id,
            senderName: user.name,
            recipientId: selectedConversation.participantId,
            content,
            conversationId: resolvedConversationId,
            timestamp: new Date()
        });

        setMessages(prev => [...prev, {
            _id: response.data._id || Date.now().toString(),
            senderId: user._id,
            recipientId: selectedConversation.participantId,
            content,
            read: false,
            timestamp: new Date()
        }]);

        setConversations(prev => {
            const index = prev.findIndex(c => getConversationStorageKey(c) === getConversationStorageKey(selectedConversation));
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    lastMessage: content,
                    timestamp: new Date()
                };
                return updated;
            }
            return prev;
        });

        scrollToBottom();
    }, [selectedConversation, user, getConversationStorageKey, getConversationId]);

    const handleStartCall = useCallback(async (isVideoCall = false) => {
        if (!selectedConversation) return;

        const callType = isVideoCall ? "Video" : "Audio";
        const meetingLink = buildJitsiMeetingLink(isVideoCall);

        try {
            await sendMessageWithContent(`${callType} call: ${meetingLink}`);
            window.open(meetingLink, '_blank');
        } catch (error) {
            console.error('Failed to start call:', error);
            toast.error(`Failed to start ${callType} call`);
        }
    }, [buildJitsiMeetingLink, selectedConversation, sendMessageWithContent]);

    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        try {
            let contentToSend = messageText;
            if (replyingTo) {
                contentToSend = `[Reply to: ${replyingTo.content}]\n${messageText}`;
            }

            await sendMessageWithContent(contentToSend);
            setMessageText('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    }, [messageText, replyingTo, sendMessageWithContent]);

    const handleClearChat = async () => {
        if (!selectedConversation) return;
        if (!window.confirm("Are you sure? This deletes all messages.")) return;

        try {
            const conversationId = getConversationId(selectedConversation);
            if (conversationId) {
                await axiosInstance.delete(`/api/messages/conversation/${conversationId}`);
                setMessages([]);
                toast.success("Chat cleared");
                setShowChatOptions(false);
            }
        } catch {
            toast.error("Failed to clear chat");
        }
    };

    const handleTyping = (e) => {
        setMessageText(e.target.value);
        if (selectedConversation) {
            socket.emit('typing', {
                senderId: user._id,
                recipientId: selectedConversation.participantId,
                conversationId: getConversationId(selectedConversation)
            });
        }
    };

    const handleSummarizeConversation = async () => {
        if (!selectedConversation) return;
        try {
            setIsAiLoading(true);
            const response = await axiosInstance.post('/api/messages/summarize', {
                conversationId: getConversationId(selectedConversation),
                messages: messages.map(m => ({ content: m.content, senderId: m.senderId }))
            });
            setAiSummary(response.data.summary);
        } catch {
            toast.error("Failed to summarize conversation");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleGenerateReplySuggestions = async (tone = "professional") => {
        if (!selectedConversation) return;
        try {
            setIsAiLoading(true);
            const response = await axiosInstance.post('/api/messages/reply-suggestions', {
                conversationId: getConversationId(selectedConversation),
                tone,
                messages: messages.map(m => ({ content: m.content, senderId: m.senderId }))
            });
            setAiReplySuggestions(response.data.suggestions || []);
        } catch {
            toast.error("Failed to generate suggestions");
        } finally {
            setIsAiLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        (conv?.participantName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv?.participantEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const isSelectedConversationMuted = Boolean(
        selectedConversationKey && conversationPreferences[selectedConversationKey]?.muted
    );

    return (
        <DashboardLayout activeMenu="Messages">
            <div className="flex h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] bg-gradient-to-br from-[#070c14] via-[#0b1421] to-[#060b12] rounded-lg sm:rounded-2xl md:rounded-[20px] border border-white/10 overflow-hidden shadow-[0_24px_80px_rgba(3,7,18,0.55)] relative">

                {/* --- LEFT SIDEBAR --- */}
                <div className={`w-full sm:w-72 md:w-80 lg:w-96 border-r border-white/10 flex-col bg-gradient-to-b from-[#0f1724]/95 via-[#0d1420]/95 to-[#0b111b]/95 backdrop-blur-2xl ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 sm:p-4 md:p-6 border-b border-white/10 space-y-3 sm:space-y-4 bg-white/[0.02]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Chats</h2>
                            <div className="p-1.5 sm:p-2 bg-white/10 rounded-full border border-white/10 text-slate-300">
                                <MoreVertical className="w-3 sm:w-4 h-3 sm:h-4" />
                            </div>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search people..."
                                className="w-full bg-[#0d141f] border border-white/10 rounded-lg sm:rounded-xl py-2 sm:py-3 pl-8 sm:pl-10 pr-3 sm:pr-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-400/40 focus:ring-2 focus:ring-orange-500/20 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1.5 sm:space-y-2 bg-gradient-to-b from-transparent to-black/10">
                        {isLoadingConversations ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-gray-500 font-medium">Loading conversations...</p>
                            </div>
                        ) : filteredConversations.length > 0 ? (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv._id}
                                    onClick={() => {
                                        setSelectedConversation(conv);
                                        if (conv.unread > 0) markAsRead(conv);
                                    }}
                                    className={`w-full flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg sm:rounded-2xl transition-all relative group ${selectedConversation?._id === conv._id
                                        ? 'bg-gradient-to-r from-orange-500/15 via-orange-400/10 to-transparent border border-orange-400/25 shadow-[0_10px_30px_rgba(249,115,22,0.14)]'
                                        : 'hover:bg-white/[0.04] border border-transparent hover:border-white/10'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        {conv.participantImage ? (
                                            <img src={getImageUrl(conv.participantImage)} alt={conv.participantName} className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover border border-white/20" />
                                        ) : (
                                            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/15 flex items-center justify-center text-slate-100 font-bold text-sm sm:text-base">
                                                {(conv?.participantName || '').charAt(0)}
                                            </div>
                                        )}
                                        <div className={`absolute bottom-0 right-0 z-20 rounded-full border-2 border-[#0f1724] flex items-center justify-center w-3.5 h-3.5 transition-all duration-200 ${getStatusColor(conv.participantStatus || 'offline')}`} title={getStatusLabel(conv.participantStatus || 'offline')} />
                                        {conv.unread > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-lg border border-[#101826]">
                                                {conv.unread}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-center mb-0.5 gap-2">
                                            <h4 className={`text-xs sm:text-sm font-semibold truncate ${selectedConversation?._id === conv._id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {conv.participantName}
                                            </h4>
                                            <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono flex-shrink-0">
                                                {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-[10px] sm:text-xs truncate ${conv.unread > 0 ? 'text-white font-medium' : 'text-slate-500'}`}>
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                    {selectedConversation?._id === conv._id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                <MessageSquare className="w-10 h-10 mb-2" />
                                <p className="text-xs">No conversations found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT CHAT AREA --- */}
                <div className={`flex-1 flex-col bg-[#050505] relative z-0 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 sm:h-20 px-3 sm:px-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]/50 backdrop-blur-md relative z-50">
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <button onClick={() => setSelectedConversation(null)} className="md:hidden p-1.5 -ml-1.5 text-gray-400 hover:text-white transition-colors">
                                        <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6" />
                                    </button>

                                    <div className="relative">
                                        {selectedConversation.participantImage ? (
                                            <img src={getImageUrl(selectedConversation.participantImage)} alt={selectedConversation.participantName} className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border border-white/10 text-xs sm:text-sm">
                                                {(selectedConversation?.participantName || '').charAt(0)}
                                            </div>
                                        )}
                                        <div className={`absolute bottom-0 right-0 z-20 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center w-3 h-3 transition-all duration-200 ${getStatusColor(selectedConversation.participantStatus || 'offline')}`} title={getStatusLabel(selectedConversation.participantStatus || 'offline')} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">{selectedConversation?.participantName}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${selectedConversation.participantStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`}></span>
                                            <p className={`text-[9px] sm:text-[11px] font-medium tracking-wide ${selectedConversation.participantStatus === 'online' ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                {getStatusLabel(selectedConversation.participantStatus || 'offline')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleStartCall(false)}
                                        className="hidden sm:block p-1.5 md:p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg md:rounded-xl transition-all"
                                        title="Start audio call"
                                    >
                                        <Phone className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleStartCall(true)}
                                        className="hidden sm:block p-1.5 md:p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg md:rounded-xl transition-all"
                                        title="Start video call"
                                    >
                                        <Video className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                    </button>
                                    <div className="hidden sm:block w-px h-5 md:h-6 bg-white/10 mx-1 md:mx-2"></div>

                                    {/* --- DROPDOWN MENU --- */}
                                    <div className="relative z-50" ref={chatOptionsRef} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowChatOptions((prev) => !prev);
                                            }}
                                            className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 border border-transparent ${showChatOptions
                                                ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <Info className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                        </button>
                                        {showChatOptions && (
                                            <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-[#121212] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right">
                                                <div className="p-1 sm:p-1.5 space-y-0.5 sm:space-y-1">
                                                    <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chat Settings</div>
                                                    <button
                                                        onClick={handleClearChat}
                                                        className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg sm:rounded-xl transition-colors group"
                                                    >
                                                        <div className="p-1 sm:p-1.5 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors flex-shrink-0">
                                                            <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className="truncate">Clear Chat</span>
                                                            <span className="text-[8px] sm:text-[10px] text-red-400/60 font-normal">Delete all messages</span>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={handleMuteChat}
                                                        className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-colors group ${isSelectedConversationMuted
                                                            ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                                                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 ${isSelectedConversationMuted
                                                            ? 'bg-yellow-500/20'
                                                            : 'bg-white/5 group-hover:bg-white/10'
                                                        }`}>
                                                            <Bell className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                        </div>
                                                        <div className="flex flex-col items-start min-w-0">
                                                            <span className="truncate">{isSelectedConversationMuted ? 'Unmute' : 'Mute'}</span>
                                                            <span className="text-[8px] sm:text-[10px] text-gray-500 font-normal truncate">{isSelectedConversationMuted ? 'Notifications enabled' : 'Stop notifications'}</span>
                                                        </div>
                                                    </button>
                                                    <div className="h-px bg-white/5 my-1"></div>
                                                    <button
                                                        onClick={handleSummarizeConversation}
                                                        className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 rounded-lg sm:rounded-xl transition-colors group"
                                                    >
                                                        <div className="p-1 sm:p-1.5 bg-cyan-500/20 rounded-lg">
                                                            <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                        </div>
                                                        <span>Summarize</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleGenerateReplySuggestions("professional")}
                                                        className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-violet-300 hover:text-violet-200 hover:bg-violet-500/10 rounded-lg sm:rounded-xl transition-colors group"
                                                    >
                                                        <div className="p-1 sm:p-1.5 bg-violet-500/20 rounded-lg">
                                                            <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                        </div>
                                                        <span>Suggestions</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(aiSummary || aiReplySuggestions.length > 0 || aiActionItems.length > 0 || isAiLoading) && (
                                <div className="px-3 sm:px-6 py-3 border-b border-white/10 bg-[#0c0c0c]/80">
                                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-violet-200 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                AI Assistant
                                            </p>
                                            {isAiLoading && <span className="text-xs text-violet-300">Generating...</span>}
                                        </div>
                                        {aiSummary && <p className="text-xs text-gray-200 mt-2">{aiSummary}</p>}
                                        {aiReplySuggestions.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {aiReplySuggestions.map((suggestion, idx) => (
                                                    <button
                                                        key={`${suggestion}-${idx}`}
                                                        className="text-xs px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-left"
                                                        onClick={() => setMessageText(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Messages List Area */}
                            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 custom-scrollbar relative z-0" style={{
                                backgroundColor: '#050505',
                                backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.4) 75%, rgba(15, 15, 15, 0.92) 100%)`
                            }}>
                                {isLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-sm text-slate-400">Loading conversation...</p>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, idx) => {
                                            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                                            const isMe = senderId === user._id;

                                            return (
                                                <div key={msg._id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%] sm:max-w-[85%] md:max-w-[75%] group`}>
                                                        <div
                                                            onContextMenu={(e) => handleShowContextMenu(e, msg._id)}
                                                            onClick={() => setSelectedMessageId(null)}
                                                            className={`px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-2xl shadow-sm cursor-context-menu text-xs sm:text-sm ${isMe ? 'bg-orange-500 text-white rounded-tr-none shadow-orange-500/10' : 'bg-[#1a1a1a] border border-white/10 text-gray-200 rounded-tl-none hover:border-white/20 transition-colors'}`}
                                                        >
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1 px-1">
                                                            <span className="text-[8px] sm:text-[10px] text-gray-500 font-mono opacity-70">{formatMessageDate(msg.timestamp)}</span>
                                                            {starredMessages.includes(msg._id) && <span className="text-yellow-200 text-[10px]">STAR</span>}
                                                            {pinnedMessages.includes(msg._id) && <span className="text-cyan-200 text-[10px]">PIN</span>}
                                                            {selectedMessages.includes(msg._id) && <span className="text-violet-200 text-[10px]">SEL</span>}
                                                            {isMe && <CheckCheck className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-orange-200/80 ml-1" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                                {isOtherUserTyping && (
                                    <div className="flex justify-start w-full">
                                        <div className="bg-[#1a1a1a] border border-white/10 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-2xl rounded-tl-none flex items-center gap-1.5">
                                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input Area */}
                            <div className="p-2 sm:p-3 md:p-4 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 relative z-10">
                                {replyingTo && (
                                    <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-2">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-orange-300">Replying to</p>
                                            <p className="text-xs text-orange-100 line-clamp-2">{String(replyingTo.content || "")}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(null)}
                                            className="text-xs text-orange-200 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2 bg-[#151515] border border-white/10 rounded-lg sm:rounded-2xl p-1.5 sm:p-2 focus-within:border-orange-500/40 focus-within:bg-[#1a1a1a] transition-all shadow-lg">
                                    <div className="flex pb-0.5 sm:pb-1">
                                        <input ref={fileInputRef} type="file" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors"><Paperclip className="w-4 sm:w-5 h-4 sm:h-5" /></button>
                                        <button type="button" className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors"><Smile className="w-4 sm:w-5 h-4 sm:h-5" /></button>
                                    </div>
                                    <textarea
                                        className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none py-2 sm:py-3 max-h-32 resize-none custom-scrollbar"
                                        placeholder="Type a message..." rows="1" value={messageText} onChange={handleTyping}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                                    />
                                    <div className="pb-0.5 sm:pb-1 pr-0.5 sm:pr-1">
                                        <button type="submit" disabled={!messageText.trim()} className="p-2 sm:p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg sm:rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center"><Send className="w-3.5 sm:w-4 h-3.5 sm:h-4" /></button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#050505]">
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.8 }} className="relative group cursor-pointer">
                                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full group-hover:bg-orange-500/30 transition-all duration-500" />
                                <div className="w-16 sm:w-24 h-16 sm:h-24 rounded-2xl sm:rounded-[2rem] bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 flex items-center justify-center relative shadow-2xl group-hover:scale-105 transition-transform duration-300">
                                    <MessageSquare className="w-6 sm:w-10 h-6 sm:h-10 text-orange-300/80" />
                                </div>
                            </motion.div>
                            <div className="text-center mt-4 sm:mt-8 space-y-2">
                                <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Your Workspace Messages</h3>
                                <p className="text-gray-500 text-xs sm:text-sm max-w-xs sm:max-w-sm mx-auto leading-relaxed">Select a conversation from the sidebar or start a new chat.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu Portal */}
            {selectedMessageId && ReactDOM.createPortal(
                <div
                    className="fixed bg-[#1a1a1a] border border-white/10 rounded-lg sm:rounded-xl shadow-2xl z-[9999] overflow-hidden min-w-max text-xs sm:text-sm"
                    style={{ top: `${messageContextPos.y}px`, left: `${messageContextPos.x}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-0.5 sm:p-1 space-y-0.5">
                        {messages.find(m => m._id === selectedMessageId) && (() => {
                            const msg = messages.find(m => m._id === selectedMessageId);
                            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                            const isMe = senderId === user._id;
                            return (
                                <>
                                    <button onClick={() => handleReplyMessage(msg)} className="w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <Reply className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> Reply
                                    </button>
                                    <button onClick={() => handleCopyMessage(msg.content)} className="w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <Copy className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> Copy
                                    </button>
                                    <button onClick={() => handleForwardMessage(msg)} className="w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <MoreVertical className="w-3 sm:w-3.5 h-3 sm:h-3.5 rotate-90 flex-shrink-0" /> Forward
                                    </button>
                                    <button onClick={() => handlePinMessage(msg)} className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-colors ${pinnedMessages.includes(msg._id) ? 'text-cyan-300 hover:bg-cyan-500/10' : 'text-gray-300 hover:bg-white/5'}`}>
                                        <Flag className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> {pinnedMessages.includes(msg._id) ? 'Unpin' : 'Pin'}
                                    </button>
                                    <div className="h-px bg-white/5 my-0.5"></div>
                                    <button onClick={() => handleStarMessage(msg._id)} className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-colors ${starredMessages.includes(msg._id) ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-300 hover:bg-white/5'}`}>
                                        <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> {starredMessages.includes(msg._id) ? 'Unstar' : 'Star'}
                                    </button>
                                    <button onClick={() => handleSelectMessage(msg._id)} className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-colors ${selectedMessages.includes(msg._id) ? 'text-violet-300 hover:bg-violet-500/10' : 'text-gray-300 hover:bg-white/5'}`}>
                                        <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> {selectedMessages.includes(msg._id) ? 'Unselect' : 'Select'}
                                    </button>
                                    <div className="h-px bg-white/5 my-0.5"></div>
                                    <button onClick={() => handleReportMessage(msg)} className="w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-orange-400 hover:bg-orange-500/10 rounded transition-colors">
                                        <Flag className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> Report
                                    </button>
                                    {isMe && (
                                        <button onClick={() => handleDeleteMessage(msg._id)} className="w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-red-400 hover:bg-red-500/10 rounded transition-colors">
                                            <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" /> Delete
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default UserMessages;
