import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import socket from '../../services/socket';
import { Search, Send, MoreVertical, Phone, Video, Info, Paperclip, Smile, X } from 'lucide-react';
import { UserContext } from '../../context/userContext';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layouts/DashboardLayout';

const AdminMessages = () => {
    const { user } = useContext(UserContext);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Socket.io setup
    useEffect(() => {
        if (!user || !user._id) return;
        socket.connect();
        socket.emit('join', user._id);
        socket.on('receiveMessage', (data) => {
            console.log('[Admin] receiveMessage:', data);
            // Only add message if it's for the current conversation
            if (selectedConversation && data.senderId === selectedConversation.participantId) {
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
            }
        });
        socket.on('typing', (data) => {
            console.log('[Admin] typing:', data);
        });
        return () => {
            socket.off('receiveMessage');
            socket.off('typing');
            socket.disconnect();
        };
    }, [user, selectedConversation]);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        if (!user || !user._id) return;
        
        try {
            setIsLoadingConversations(true);
            // Use the new endpoint for messaging
            const response = await axiosInstance.get('/api/users/for-messaging');
            if (response.data && response.data.users) {
                const users = response.data.users;
                setConversations(users.map(u => ({
                    _id: u._id,
                    participantId: u._id,
                    participantName: u.name,
                    participantEmail: u.email,
                    participantImage: u.profileImageUrl,
                    lastMessage: 'Start a conversation...',
                    timestamp: new Date(),
                    unread: 0
                })));
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            toast.error('Failed to load conversations');
        } finally {
            setIsLoadingConversations(false);
        }
    }, [user]);

    // Fetch messages for selected conversation
    const fetchMessages = useCallback(async (conversationId) => {
        if (!conversationId) return;
        
        try {
            setIsLoading(true);
            // Placeholder for messages API
            // const response = await axiosInstance.get(`/api/messages/conversation/${conversationId}`);
            // setMessages(response.data);
            setMessages([]);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Load messages when conversation selected
    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation._id);
        }
    }, [selectedConversation, fetchMessages]);

    // Send message
    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();
        
        if (!messageText.trim() || !selectedConversation) return;
        
        try {
            // Send to API
            const payload = {
                senderId: user._id,
                recipientId: selectedConversation.participantId,
                content: messageText
            };
            if (selectedConversation.conversationId || selectedConversation._id) {
                payload.conversationId = selectedConversation.conversationId || selectedConversation._id;
            }
            console.log('[Admin] sending message payload:', payload);
            await axiosInstance.post('/api/messages/send', payload);
            // Emit socket event for real-time update
            socket.emit('sendMessage', {
                senderId: user._id,
                senderName: user.name,
                recipientId: selectedConversation.participantId,
                content: messageText,
                conversationId: payload.conversationId
            });
            console.log('[Admin] socket emit sendMessage:', {
                senderId: user._id,
                senderName: user.name,
                recipientId: selectedConversation.participantId,
                content: messageText,
                conversationId: payload.conversationId
            });
            // Add to local state immediately
            setMessages([...messages, {
                _id: Date.now().toString(),
                senderId: user._id,
                senderName: user.name,
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
    }, [messageText, selectedConversation, user, messages]);

    const filteredConversations = conversations.filter(conv =>
        conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.participantEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="h-screen flex flex-col bg-[#050505]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl">
                    <h1 className="text-2xl font-bold text-white">Messages</h1>
                    <p className="text-sm text-gray-400 mt-1">Chat with your team members</p>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Conversations Sidebar */}
                    <div className="w-80 border-r border-white/10 flex flex-col bg-[#0A0A0A]">
                        {/* Search */}
                        <div className="p-4 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {isLoadingConversations ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-400 text-sm">Loading conversations...</p>
                                </div>
                            ) : filteredConversations.length > 0 ? (
                                filteredConversations.map((conversation) => (
                                    <button
                                        key={conversation._id}
                                        onClick={() => setSelectedConversation(conversation)}
                                        className={`w-full flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${
                                            selectedConversation?._id === conversation._id ? 'bg-white/10 border-l-2 border-l-orange-500' : ''
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            {conversation.participantImage ? (
                                                <img
                                                    src={conversation.participantImage}
                                                    alt={conversation.participantName}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm">
                                                    {conversation.participantName.charAt(0)}
                                                </div>
                                            )}
                                            {conversation.unread > 0 && (
                                                <span className="absolute top-0 right-0 w-5 h-5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                                                    {conversation.unread}
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{conversation.participantName}</p>
                                            <p className="text-xs text-gray-400 truncate">{conversation.lastMessage}</p>
                                        </div>

                                        {/* Timestamp */}
                                        <span className="text-xs text-gray-500 flex-shrink-0">
                                            {new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500 text-sm">No conversations found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    {selectedConversation ? (
                        <div className="flex-1 flex flex-col">
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {selectedConversation.participantImage ? (
                                        <img
                                            src={selectedConversation.participantImage}
                                            alt={selectedConversation.participantName}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold">
                                            {selectedConversation.participantName.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-white font-semibold">{selectedConversation.participantName}</p>
                                        <p className="text-xs text-gray-400">{selectedConversation.participantEmail}</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Voice call">
                                        <Phone className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Video call">
                                        <Video className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Conversation info">
                                        <Info className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4 bg-[#050505]">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-400 text-sm">Loading messages...</p>
                                    </div>
                                ) : messages.length > 0 ? (
                                    messages.map((message) => (
                                        <div
                                            key={message._id}
                                            className={`flex ${message.senderId === user._id ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-xs px-4 py-2.5 rounded-2xl ${
                                                    message.senderId === user._id
                                                        ? 'bg-orange-500 text-white rounded-br-none'
                                                        : 'bg-white/10 text-gray-100 rounded-bl-none'
                                                }`}
                                            >
                                                <p className="text-sm break-words">{message.content}</p>
                                                <p className={`text-xs mt-1 ${
                                                    message.senderId === user._id ? 'text-orange-100' : 'text-gray-400'
                                                }`}>
                                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="px-6 py-4 border-t border-white/10 bg-[#0A0A0A]">
                                <form onSubmit={handleSendMessage} className="flex gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                            // Handle file upload
                                            console.log('File selected:', e.target.files);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-orange-400"
                                        title="Attach file"
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>

                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={messageText}
                                        onChange={(e) => {
                                            setMessageText(e.target.value);
                                            if (selectedConversation) {
                                                socket.emit('typing', {
                                                    senderId: user._id,
                                                    recipientId: selectedConversation.participantId
                                                });
                                                console.log('[Admin] socket emit typing:', {
                                                    senderId: user._id,
                                                    recipientId: selectedConversation.participantId
                                                });
                                            }
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                                    />

                                    <button
                                        type="button"
                                        className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-orange-400"
                                        title="Emoji"
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!messageText.trim()}
                                        className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
                                        title="Send message"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-[#050505]">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-500" />
                                </div>
                                <p className="text-gray-400 text-lg font-medium">Select a conversation to start chatting</p>
                                <p className="text-gray-500 text-sm mt-2">Choose from your conversations list or search for a team member</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminMessages;
