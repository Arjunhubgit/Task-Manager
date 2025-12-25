import React, { useState, useRef, useEffect, useContext } from 'react';
import { Bell, CheckCircle, AlertCircle, MessageSquare, UserPlus, Clock, X } from 'lucide-react';
import { UserContext } from '../../context/userContext';

const NotificationsBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } = useContext(UserContext);

    const notificationsRef = useRef(null);
    const unreadCount = notifications.filter(n => !n.read).length;

    // Map notification types to icons
    const getIconComponent = (notificationType) => {
        const iconMap = {
            'task_assigned': AlertCircle,
            'task_completed': CheckCircle,
            'comment': MessageSquare,
            'team_member': UserPlus,
            'status_update': AlertCircle,
            'deadline_reminder': Clock,
        };
        return iconMap[notificationType] || Bell;
    };

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

    // Format timestamp to relative time
    const formatTimestamp = (createdAt) => {
        if (!createdAt) return 'just now';
        
        const now = new Date();
        const notificationTime = new Date(createdAt);
        const diffMs = now - notificationTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return notificationTime.toLocaleDateString();
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
                                onClick={markAllNotificationsAsRead}
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
                                const notificationId = notification._id || notification.id;
                                const Icon = getIconComponent(notification.type);
                                return (
                                    <div
                                        key={notificationId}
                                        className={`p-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer ${
                                            !notification.read ? 'bg-white/[0.04] border-l-2 border-l-orange-500' : ''
                                        }`}
                                        onClick={() => markNotificationAsRead(notificationId)}
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
                                                        {formatTimestamp(notification.createdAt)}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notificationId);
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
