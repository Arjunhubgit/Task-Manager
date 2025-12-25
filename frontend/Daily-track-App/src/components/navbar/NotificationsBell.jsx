import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, MessageSquare, UserPlus, Clock, X } from 'lucide-react';

const NotificationsBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: 'task_assigned',
            title: 'New task assigned',
            message: 'You have been assigned "Complete project proposal"',
            icon: AlertCircle,
            read: false,
            timestamp: '5 mins ago',
        },
        {
            id: 2,
            type: 'comment',
            title: 'New comment',
            message: 'Sarah commented on your task',
            icon: MessageSquare,
            read: false,
            timestamp: '15 mins ago',
        },
        {
            id: 3,
            type: 'task_completed',
            title: 'Task completed',
            message: 'Mike marked "Design review" as completed',
            icon: CheckCircle,
            read: true,
            timestamp: '1 hour ago',
        },
        {
            id: 4,
            type: 'team_member',
            title: 'Team member added',
            message: 'Alice Johnson joined the team',
            icon: UserPlus,
            read: true,
            timestamp: '2 hours ago',
        },
    ]);

    const notificationsRef = useRef(null);
    const unreadCount = notifications.filter(n => !n.read).length;

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const handleDeleteNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const handleMarkAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'task_assigned':
                return 'text-orange-500 bg-orange-500/10';
            case 'comment':
                return 'text-cyan-500 bg-cyan-500/10';
            case 'task_completed':
                return 'text-emerald-500 bg-emerald-500/10';
            case 'team_member':
                return 'text-pink-500 bg-pink-500/10';
            default:
                return 'text-gray-500 bg-gray-500/10';
        }
    };

    return (
        <div className="relative" ref={notificationsRef}>
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-red-500/50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {/* Notifications Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-96 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="font-semibold text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-orange-500 hover:text-orange-400 transition-colors font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const Icon = notification.icon;
                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer ${
                                            !notification.read ? 'bg-white/[0.04]' : ''
                                        }`}
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(notification.type)}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-gray-200'}`}>
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                    {!notification.read && (
                                                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-600 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {notification.timestamp}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteNotification(notification.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 transition-all"
                                                    >
                                                        <X className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-white/5 bg-white/[0.02]">
                            <button className="w-full text-center py-2 text-xs text-orange-500 hover:text-orange-400 font-medium transition-colors hover:bg-white/5 rounded-lg">
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsBell;
