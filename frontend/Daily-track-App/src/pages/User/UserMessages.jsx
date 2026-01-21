import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import socket from '../../services/socket';
import {
    Search, Send, Phone, Video, Info, Paperclip,
    Smile, User as UserIcon, MessageSquare, CheckCheck,
    ChevronLeft, Trash2, Bell, Copy, Star, Reply, Flag, Check, MoreVertical
} from 'lucide-react';
import { UserContext } from '../../context/userContext';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import MessagingService from '../../services/messagingService';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl } from '../../utils/helper';

// --- Animation Variants ---
const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
};

const listItemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 120 } }
};

const messageVariants = {
    hidden: { y: 10, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 150, damping: 20 } }
};

// --- Helpers ---
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

const UserMessages = () => {
    // --- State & Context ---
    const { user } = useContext(UserContext);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [showChatOptions, setShowChatOptions] = useState(false); // Dropdown State
    const [mutedConversations, setMutedConversations] = useState([]); // Track muted conversations
    const [selectedMessageId, setSelectedMessageId] = useState(null); // For message context menu
    const [messageContextPos, setMessageContextPos] = useState({ x: 0, y: 0 }); // Context menu position
    const [starredMessages, setStarredMessages] = useState([]); // Track starred messages

    // --- Refs ---
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // --- Helpers ---
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOtherUserTyping]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Check if click is on the portal menu itself
            const menuElement = document.querySelector('[style*="position: fixed"]');
            if (menuElement && menuElement.contains(e.target)) {
                return;
            }
            setSelectedMessageId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // --- Socket.io Logic ---
    useEffect(() => {
        if (!user || !user._id) return;

        socket.connect();
        socket.emit('join', user._id);

        socket.on('receiveMessage', (data) => {
            // Check if this message belongs to the chat currently open
            const isCurrentChat = selectedConversation &&
                (data.conversationId === selectedConversation.conversationId ||
                    data.senderId === selectedConversation.participantId);

            // 1. If it IS the current chat, add to message list immediately
            if (isCurrentChat) {
                setMessages((prev) => [
                    ...prev,
                    {
                        _id: data._id || Date.now().toString(),
                        senderId: data.senderId,
                        senderName: data.senderName || '',
                        recipientId: data.recipientId,
                        content: data.content,
                        read: false,
                        timestamp: new Date()
                    }
                ]);
                scrollToBottom();
                setIsOtherUserTyping(false);
            }

            // 2. ALWAYS update the conversation list (Preview + Unread Count)
            setConversations((prev) => {
                const updated = prev.map(conv => {
                    if (conv.participantId === data.senderId || conv.conversationId === data.conversationId) {
                        return {
                            ...conv,
                            lastMessage: data.content,
                            timestamp: new Date(),
                            // Increment unread count ONLY if we are NOT looking at this chat
                            unread: isCurrentChat ? 0 : (conv.unread || 0) + 1
                        };
                    }
                    return conv;
                });
                return updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });
        });

        socket.on('typing', (data) => {
            if (selectedConversation && data.senderId === selectedConversation.participantId) {
                setIsOtherUserTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsOtherUserTyping(false);
                }, 3000);
            }
        });

        return () => {
            socket.off('receiveMessage');
            socket.off('typing');
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
                setConversations(conversations.map(conv => {
                    const otherParticipant = conv.participants.find(p => p._id !== user._id) || conv.participants[0];
                    return {
                        _id: conv._id,
                        conversationId: conv._id,
                        participantId: otherParticipant._id,
                        participantName: otherParticipant.name,
                        participantEmail: otherParticipant.email,
                        participantImage: otherParticipant.profileImageUrl,
                        participantRole: otherParticipant.role,
                        participantStatus: otherParticipant.status, // Include status
                        participantIsOnline: otherParticipant.isOnline, // Include online status
                        lastMessage: conv.lastMessage || 'Start a conversation...',
                        timestamp: conv.lastMessageTime || new Date(),
                        unread: conv.unreadCounts?.[user._id] || 0
                    };
                }));
            } else {
                // Fallback: fetch user list for new conversations
                const response = await axiosInstance.get('/api/users/for-messaging');
                if (response.data && response.data.users) {
                    setConversations(response.data.users.map(u => ({
                        _id: u._id,
                        participantId: u._id,
                        participantName: u.name,
                        participantEmail: u.email,
                        participantImage: u.profileImageUrl,
                        participantRole: u.role,
                        participantStatus: u.status, // Include status
                        participantIsOnline: u.isOnline, // Include online status
                        lastMessage: 'Start a conversation...',
                        timestamp: new Date(),
                        unread: 0
                    })));
                }
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            // ... fallback logic
        } finally {
            setIsLoadingConversations(false);
        }
    }, [user]);

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

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation._id);
            setShowChatOptions(false); // Close dropdown on switch
        }
    }, [selectedConversation, fetchMessages]);

    // --- ACTIONS ---

    // 1. Mark as Read (Persistent)
    const markAsRead = async (conv) => {
        try {
            // A. Immediate UI update
            setConversations(prev => prev.map(c =>
                c._id === conv._id ? { ...c, unread: 0 } : c
            ));

            // B. Persistent Backend update
            await axiosInstance.put(`/api/messages/read/${conv._id}`, {
                userId: user._id
            });

        } catch (error) {
            console.error("Failed to mark read", error);
        }
    };

    // 2. Clear Chat (Persistent)
    const handleClearChat = async () => {
        if (!selectedConversation) return;
        if (!window.confirm("Are you sure? This deletes all messages.")) return;

        try {
            const targetId = selectedConversation.conversationId || selectedConversation._id;
            await axiosInstance.delete(`/api/messages/clear/${targetId}`);
            setMessages([]);
            setShowChatOptions(false);
            toast.success("Chat cleared");
        } catch (error) {
            toast.error("Failed to clear chat");
        }
    };

    // 2.5. Mute/Unmute Chat
    const handleMuteChat = async () => {
        if (!selectedConversation) return;

        try {
            const isMuted = mutedConversations.includes(selectedConversation._id);

            if (isMuted) {
                // Unmute
                setMutedConversations(prev => prev.filter(id => id !== selectedConversation._id));
                // Save to localStorage
                const saved = JSON.parse(localStorage.getItem('mutedConversations') || '[]');
                const updated = saved.filter(id => id !== selectedConversation._id);
                localStorage.setItem('mutedConversations', JSON.stringify(updated));
                toast.success("Notifications enabled");
            } else {
                // Mute
                setMutedConversations(prev => [...prev, selectedConversation._id]);
                // Save to localStorage
                const saved = JSON.parse(localStorage.getItem('mutedConversations') || '[]');
                localStorage.setItem('mutedConversations', JSON.stringify([...saved, selectedConversation._id]));
                toast.success("Chat muted - notifications disabled");
            }
            setShowChatOptions(false);
        } catch (error) {
            toast.error("Failed to update mute status");
        }
    };

    // Load muted conversations from localStorage on mount
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('mutedConversations') || '[]');
        setMutedConversations(saved);
        const starred = JSON.parse(localStorage.getItem('starredMessages') || '[]');
        setStarredMessages(starred);
    }, []);

    // Message Actions
    const handleDeleteMessage = async (messageId) => {
        try {
            await axiosInstance.delete(`/api/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            toast.success("Message deleted");
            setSelectedMessageId(null);
        } catch (error) {
            toast.error("Failed to delete message");
        }
    };

    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content);
        toast.success("Message copied to clipboard");
        setSelectedMessageId(null);
    };

    const handleStarMessage = (messageId) => {
        if (starredMessages.includes(messageId)) {
            const updated = starredMessages.filter(id => id !== messageId);
            setStarredMessages(updated);
            localStorage.setItem('starredMessages', JSON.stringify(updated));
            toast.success("Unstarred");
        } else {
            const updated = [...starredMessages, messageId];
            setStarredMessages(updated);
            localStorage.setItem('starredMessages', JSON.stringify(updated));
            toast.success("Starred");
        }
        setSelectedMessageId(null);
    };

    const handleReplyMessage = (message) => {
        setMessageText(`@${typeof message.senderId === 'object' ? message.senderId.name : 'User'}: ${message.content}\n\n`);
        setSelectedMessageId(null);
        toast.success("Reply mode enabled");
    };

    const handleForwardMessage = (msg) => {
        setSelectedMessageId(null);
        toast.info("Forward feature coming soon");
    };

    const handlePinMessage = (msg) => {
        setSelectedMessageId(null);
        toast.info("Pin feature coming soon");
    };

    const handleSelectMessage = (msgId) => {
        setSelectedMessageId(null);
        toast.info("Selection feature coming soon");
    };

    const handleReportMessage = (msg) => {
        setSelectedMessageId(null);
        toast.success("Message reported");
    };

    const handleShowContextMenu = (e, messageId) => {
        e.preventDefault();
        e.stopPropagation();

        // Calculate menu position with viewport boundary detection
        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 180; // Approximate menu width
        const menuHeight = 300; // Approximate menu height

        // Adjust if menu goes beyond right edge
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }

        // Adjust if menu goes beyond bottom edge
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }

        setSelectedMessageId(messageId);
        setMessageContextPos({ x, y });
    };

    // 3. Send Message
    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedConversation) return;

        try {
            const payload = {
                senderId: user._id,
                recipientId: selectedConversation.participantId,
                content: messageText
            };
            if (selectedConversation._id && selectedConversation._id !== selectedConversation.participantId) {
                payload.conversationId = selectedConversation._id;
            }

            const response = await axiosInstance.post('/api/messages/send', payload);

            if (!selectedConversation._id || selectedConversation._id === selectedConversation.participantId) {
                setSelectedConversation(prev => ({
                    ...prev,
                    _id: response.data.conversationId,
                    conversationId: response.data.conversationId
                }));
            }

            socket.emit('sendMessage', {
                _id: response.data._id,
                senderId: user._id,
                senderName: user.name,
                recipientId: selectedConversation.participantId,
                content: messageText,
                conversationId: payload.conversationId || response.data.conversationId,
                timestamp: new Date()
            });

            setMessages(prev => [...prev, {
                _id: response.data._id || Date.now().toString(),
                senderId: user._id,
                recipientId: selectedConversation.participantId,
                content: messageText,
                read: false,
                timestamp: new Date()
            }]);
            setMessageText('');
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        }
    }, [messageText, selectedConversation, user]);

    const handleTyping = (e) => {
        setMessageText(e.target.value);
        if (selectedConversation) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            socket.emit('typing', {
                senderId: user._id,
                recipientId: selectedConversation.participantId
            });
            typingTimeoutRef.current = setTimeout(() => { }, 1000);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.participantEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
        <DashboardLayout activeMenu="Messages">
            <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-[#050505] rounded-[30px] border border-white/5 overflow-hidden shadow-2xl relative">

                {/* --- SIDEBAR --- */}
                <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 flex-col bg-[#0a0a0a]/80 backdrop-blur-2xl ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-white/5 space-y-4">
                        <h2 className="text-xl font-bold text-white tracking-tight">Chats</h2>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search people..."
                                className="w-full bg-[#151515] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/30 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <motion.div variants={listContainerVariants} initial="visible" animate="visible" className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {isLoadingConversations ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-gray-500 font-medium">Loading conversations...</p>
                            </div>
                        ) : filteredConversations.length > 0 ? (
                            filteredConversations.map((conv) => (
                                <motion.button
                                    key={conv._id}
                                    variants={listItemVariants}
                                    onClick={() => {
                                        setSelectedConversation(conv);
                                        if (conv.unread > 0) markAsRead(conv);
                                    }}
                                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all relative group ${selectedConversation?._id === conv._id
                                            ? 'bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/10'
                                            : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        {conv.participantImage ? (
                                            <img src={getImageUrl(conv.participantImage)} alt={conv.participantName} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-gray-400 font-bold">
                                                {conv.participantName.charAt(0)}
                                            </div>
                                        )}
                                        {/* Status Indicator */}
                                        <div className={`
                                            absolute bottom-0 right-0 z-20 rounded-full border-2 border-[#050505]
                                            flex items-center justify-center w-3.5 h-3.5 transition-all duration-200
                                            ${getStatusColor(conv.participantStatus || 'offline')}
                                        `} title={getStatusLabel(conv.participantStatus || 'offline')} />

                                        {/* Unread Badge */}
                                        <AnimatePresence>
                                            {conv.unread > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-lg border border-[#0a0a0a]"
                                                >
                                                    {conv.unread}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4 className={`text-sm font-semibold truncate ${selectedConversation?._id === conv._id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                {conv.participantName}
                                            </h4>
                                            <span className="text-[10px] text-gray-600 font-mono">
                                                {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${conv.unread > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                    {selectedConversation?._id === conv._id && (
                                        <motion.div layoutId="active-bar" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                    )}
                                </motion.button>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                <MessageSquare className="w-10 h-10 mb-2" />
                                <p className="text-xs">No conversations found</p>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* --- CHAT AREA --- */}
                <div className={`flex-1 flex-col bg-[#050505] relative z-0 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* HEADER - z-50 ensures dropdown is on top */}
                            <div className="h-20 px-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]/50 backdrop-blur-md relative z-50">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>

                                    <div className="relative">
                                        {selectedConversation.participantImage ? (
                                            <img src={getImageUrl(selectedConversation.participantImage)} alt={selectedConversation.participantName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border border-white/10">
                                                {selectedConversation.participantName.charAt(0)}
                                            </div>
                                        )}
                                        {/* Status Indicator */}
                                        <div className={`
                                            absolute bottom-0 right-0 z-20 rounded-full border-2 border-[#0a0a0a]
                                            flex items-center justify-center w-3 h-3 transition-all duration-200
                                            ${getStatusColor(selectedConversation.participantStatus || 'offline')}
                                        `} title={getStatusLabel(selectedConversation.participantStatus || 'offline')} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white tracking-wide">{selectedConversation.participantName}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${selectedConversation.participantStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`}></span>
                                            <p className={`text-[11px] font-medium tracking-wide ${selectedConversation.participantStatus === 'online' ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                {getStatusLabel(selectedConversation.participantStatus || 'offline')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="hidden sm:block p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Phone className="w-4 h-4" /></button>
                                    <button className="hidden sm:block p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Video className="w-4 h-4" /></button>
                                    <div className="hidden sm:block w-px h-6 bg-white/10 mx-2"></div>

                                    {/* --- DROPDOWN MENU --- */}
                                    <div className="relative z-50">
                                        <button
                                            onClick={() => setShowChatOptions(!showChatOptions)}
                                            className={`p-2.5 rounded-xl transition-all duration-200 border border-transparent ${showChatOptions
                                                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                        <AnimatePresence>
                                            {showChatOptions && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 top-full mt-2 w-56 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right"
                                                >
                                                    <div className="p-1.5 space-y-1">
                                                        <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chat Settings</div>
                                                        <button
                                                            onClick={handleClearChat}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors group"
                                                        >
                                                            <div className="p-1.5 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col items-start">
                                                                <span>Clear Chat</span>
                                                                <span className="text-[10px] text-red-400/60 font-normal">Delete all messages</span>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={handleMuteChat}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors group ${mutedConversations.includes(selectedConversation._id)
                                                                    ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                                                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <div className={`p-1.5 rounded-lg transition-colors ${mutedConversations.includes(selectedConversation._id)
                                                                    ? 'bg-yellow-500/20'
                                                                    : 'bg-white/5 group-hover:bg-white/10'
                                                                }`}>
                                                                <Bell className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col items-start">
                                                                <span>{mutedConversations.includes(selectedConversation._id) ? 'Unmute' : 'Mute'}</span>
                                                                <span className="text-[10px] text-gray-500 font-normal">{mutedConversations.includes(selectedConversation._id) ? 'Notifications enabled' : 'Stop notifications'}</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* --- MESSAGE LIST (z-0 to stay under header) --- */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/5 via-transparent to-transparent relative z-0">
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, idx) => {
                                        const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                                        const isMe = senderId === user._id;

                                        return (
                                            <motion.div key={msg._id || idx} variants={messageVariants} initial="hidden" animate="visible" className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%] group`}>
                                                    <div
                                                        onContextMenu={(e) => handleShowContextMenu(e, msg._id)}
                                                        onClick={() => setSelectedMessageId(null)}
                                                        className={`px-5 py-3 rounded-2xl shadow-sm backdrop-blur-sm cursor-context-menu ${isMe ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none shadow-orange-500/10' : 'bg-[#1a1a1a] border border-white/10 text-gray-200 rounded-tl-none hover:border-white/20 transition-colors'}`}
                                                    >
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1.5 px-1">
                                                        <span className="text-[10px] text-gray-500 font-mono opacity-70">{formatMessageDate(msg.timestamp)}</span>
                                                        {starredMessages.includes(msg._id) && <span className="text-yellow-500">★</span>}
                                                        {isMe && <CheckCheck className="w-3 h-3 text-orange-500/80 ml-1" />}
                                                    </div>
                                                </div>

                                                {/* Message Context Menu - Rendered via Portal */}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                {isOtherUserTyping && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
                                        <div className="bg-[#1a1a1a] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* --- INPUT --- */}
                            <div className="p-4 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 relative z-10">
                                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-[#151515] border border-white/10 rounded-2xl p-2 focus-within:border-orange-500/40 focus-within:bg-[#1a1a1a] transition-all shadow-lg">
                                    <div className="flex pb-1">
                                        <input ref={fileInputRef} type="file" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"><Paperclip className="w-5 h-5" /></button>
                                        <button type="button" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"><Smile className="w-5 h-5" /></button>
                                    </div>
                                    <textarea
                                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-3 max-h-32 resize-none custom-scrollbar"
                                        placeholder="Type a message..." rows="1" value={messageText} onChange={handleTyping}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                                    />
                                    <div className="pb-1 pr-1">
                                        <button type="submit" disabled={!messageText.trim()} className="p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center"><Send className="w-4 h-4" /></button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#050505]">
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.8 }} className="relative group cursor-pointer">
                                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full group-hover:bg-orange-500/30 transition-all duration-500" />
                                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 flex items-center justify-center relative shadow-2xl group-hover:scale-105 transition-transform duration-300">
                                    <MessageSquare className="w-10 h-10 text-orange-500/80" />
                                </div>
                            </motion.div>
                            <div className="text-center mt-8 space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">Your Workspace Messages</h3>
                                <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Select a conversation from the sidebar or start a new chat to collaborate with your team in real-time.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>

        {selectedMessageId && ReactDOM.createPortal(
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden min-w-max"
                    style={{ top: `${messageContextPos.y}px`, left: `${messageContextPos.x}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-1 space-y-0.5">
                        {messages.find(m => m._id === selectedMessageId) && (() => {
                            const msg = messages.find(m => m._id === selectedMessageId);
                            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                            const isMe = senderId === user._id;
                            return (
                                <>
                                    <button onClick={() => { handleReplyMessage(msg); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <Reply className="w-3.5 h-3.5" /> Reply
                                    </button>
                                    <button onClick={() => handleCopyMessage(msg.content)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <Copy className="w-3.5 h-3.5" /> Copy
                                    </button>
                                    <button onClick={() => handleForwardMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <MoreVertical className="w-3.5 h-3.5 rotate-90" /> Forward
                                    </button>
                                    <button onClick={() => handlePinMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <Flag className="w-3.5 h-3.5" /> Pin
                                    </button>
                                    <div className="h-px bg-white/5 my-0.5"></div>
                                    <button onClick={() => handleStarMessage(msg._id)} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${starredMessages.includes(msg._id) ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-300 hover:bg-white/5'}`}>
                                        <Star className="w-3.5 h-3.5" /> {starredMessages.includes(msg._id) ? 'Unstar' : 'Star'}
                                    </button>
                                    <button onClick={() => handleSelectMessage(msg._id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded transition-colors">
                                        <Check className="w-3.5 h-3.5" /> Select
                                    </button>
                                    <div className="h-px bg-white/5 my-0.5"></div>
                                    <button onClick={() => handleReportMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-orange-400 hover:bg-orange-500/10 rounded transition-colors">
                                        <Flag className="w-3.5 h-3.5" /> Report
                                    </button>
                                    {isMe && (
                                        <button onClick={() => handleDeleteMessage(msg._id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </motion.div>
            </AnimatePresence>,
            document.body
        )}
        </>
    );
}

export default UserMessages;