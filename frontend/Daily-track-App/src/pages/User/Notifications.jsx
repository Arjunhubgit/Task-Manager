import React, { useContext, useEffect, useState, useCallback } from "react";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import {
  Bell,
  Check,
  CheckCircle2,
  Trash2,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Clock,
  Loader,
  Filter,
  X,
} from "lucide-react";

// Notification Type Icons
const getNotificationIcon = (type) => {
  const iconClass = "w-5 h-5";
  const iconMap = {
    task_assigned: <AlertCircle className={`${iconClass} text-blue-400`} />,
    task_completed: <CheckCircle className={`${iconClass} text-green-400`} />,
    comment: <MessageSquare className={`${iconClass} text-purple-400`} />,
    team_member: <UserPlus className={`${iconClass} text-orange-400`} />,
    status_update: <AlertCircle className={`${iconClass} text-yellow-400`} />,
    deadline_reminder: <Clock className={`${iconClass} text-red-400`} />,
  };
  return iconMap[type] || <Bell className={`${iconClass} text-gray-400`} />;
};

// Notification Type Colors
const getTypeColor = (type) => {
  const colors = {
    task_assigned: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    task_completed: "from-green-500/10 to-green-600/5 border-green-500/20",
    comment: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    team_member: "from-orange-500/10 to-orange-600/5 border-orange-500/20",
    status_update: "from-yellow-500/10 to-yellow-600/5 border-yellow-500/20",
    deadline_reminder: "from-red-500/10 to-red-600/5 border-red-500/20",
  };
  return colors[type] || "from-gray-500/10 to-gray-600/5 border-gray-500/20";
};

// Single Notification Card Component
const NotificationCard = ({
  notification,
  onMarkAsRead,
  onDelete,
  isLoading,
}) => {
  const formatDate = (date) => {
    const notifDate = new Date(date);
    const now = new Date();
    const diff = now - notifDate;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return notifDate.toLocaleDateString();
  };

  return (
    <div
      className={`
        relative group rounded-lg border transition-all duration-300 p-5 mb-4
        bg-gradient-to-br ${getTypeColor(notification.type)}
        hover:shadow-lg hover:shadow-orange-500/10
        ${
          notification.read
            ? "opacity-70"
            : "ring-1 ring-orange-500/30 shadow-md shadow-orange-500/10"
        }
      `}
    >
      {/* Background Gradient Accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl -z-10" />

      {/* Content Grid */}
      <div className="flex items-start gap-4">
        {/* Icon Section */}
        <div className="flex-shrink-0 mt-1">
          <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
            {getNotificationIcon(notification.type)}
          </div>
        </div>

        {/* Message Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-100 text-sm leading-tight group-hover:text-white transition-colors">
                {notification.title}
              </h3>
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                {notification.message}
              </p>
            </div>

            {/* Unread Indicator */}
            {!notification.read && (
              <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[#EA8D23] shadow-lg shadow-orange-500/50 mt-1" />
            )}
          </div>

          {/* Meta Information */}
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <time>{formatDate(notification.createdAt)}</time>
            {notification.relatedTaskId && (
              <>
                <span>•</span>
                <span className="text-gray-400">
                  Task: {notification.relatedTaskId.title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300">
        {!notification.read && (
          <button
            onClick={() => onMarkAsRead(notification._id)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 disabled:opacity-50"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
            Mark Read
          </button>
        )}
        <button
          onClick={() => onDelete(notification._id)}
          disabled={isLoading}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all duration-300 disabled:opacity-50"
          title="Delete notification"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
};

// Main Notifications Page Component
const Notifications = () => {
  const { user } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [hasError, setHasError] = useState(false);

  const notificationTypes = [
    { value: "all", label: "All Notifications" },
    { value: "task_assigned", label: "Task Assigned" },
    { value: "task_completed", label: "Task Completed" },
    { value: "comment", label: "Comments" },
    { value: "team_member", label: "Team Members" },
    { value: "status_update", label: "Status Updates" },
    { value: "deadline_reminder", label: "Deadlines" },
  ];

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;

    setIsLoading(true);
    setHasError(false);
    try {
      const response = await axiosInstance.get(
        API_PATHS.NOTIFICATIONS.GET_USER_NOTIFICATIONS(user._id)
      );

      if (response.data.success) {
        setNotifications(response.data.data || []);
        const unread = response.data.data.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?._id]);

  // Mark single notification as read
  const handleMarkAsRead = useCallback(
    async (notificationId) => {
      try {
        const response = await axiosInstance.put(
          API_PATHS.NOTIFICATIONS.MARK_AS_READ(notificationId)
        );

        if (response.data.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif._id === notificationId
                ? { ...notif, read: true }
                : notif
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    []
  );

  // Mark all notifications as read
  const handleMarkAllAsRead = useCallback(async () => {
    if (!user?._id) return;

    try {
      const response = await axiosInstance.put(
        API_PATHS.NOTIFICATIONS.MARK_ALL_AS_READ(user._id)
      );

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [user?._id]);

  // Delete single notification
  const handleDeleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await axiosInstance.delete(
        API_PATHS.NOTIFICATIONS.DELETE_NOTIFICATION(notificationId)
      );

      if (response.data.success) {
        setNotifications((prev) =>
          prev.filter((notif) => notif._id !== notificationId)
        );
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, []);

  // Delete all notifications
  const handleDeleteAll = useCallback(async () => {
    if (!user?._id || notifications.length === 0) return;

    if (
      !window.confirm(
        "Are you sure you want to delete all notifications? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await axiosInstance.delete(
        API_PATHS.NOTIFICATIONS.DELETE_ALL_NOTIFICATIONS(user._id)
      );

      if (response.data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  }, [user?._id, notifications.length]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications
  const filteredNotifications =
    selectedFilter === "all"
      ? notifications
      : notifications.filter((n) => n.type === selectedFilter);

  const unreadNotifications = filteredNotifications.filter((n) => !n.read);

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header Section */}
      <div className="relative border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="px-8 py-8">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-orange-600/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Bell className="w-8 h-8 text-[#EA8D23]" />
                <h1 className="text-4xl font-bold text-white">Notifications</h1>
              </div>
              <p className="text-gray-400 text-sm">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "No unread notifications"}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex items-center gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#EA8D23]">
                  {notifications.length}
                </div>
                <div className="text-xs text-gray-400 mt-1">Total</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {notifications.filter((n) => n.read).length}
                </div>
                <div className="text-xs text-gray-400 mt-1">Read</div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0 || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#EA8D23]/10 border border-[#EA8D23]/30 text-[#EA8D23] hover:bg-[#EA8D23]/20 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark All as Read
              </button>

              <button
                onClick={handleDeleteAll}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6 backdrop-blur">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                <Filter className="w-4 h-4 text-[#EA8D23]" />
                Filter by Type
              </h3>

              <div className="space-y-2">
                {notificationTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedFilter(type.value)}
                    className={`
                      w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium
                      ${
                        selectedFilter === type.value
                          ? "bg-[#EA8D23]/20 border border-[#EA8D23]/50 text-[#EA8D23] shadow-lg shadow-orange-500/20"
                          : "bg-transparent border border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      }
                    `}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader className="w-12 h-12 text-[#EA8D23] animate-spin mb-4" />
                <p className="text-gray-400">Loading notifications...</p>
              </div>
            )}

            {hasError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-medium">
                  Failed to load notifications
                </p>
                <button
                  onClick={fetchNotifications}
                  className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !hasError && filteredNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-lg">
                <Bell className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">
                  {selectedFilter === "all"
                    ? "No notifications yet"
                    : `No ${
                        notificationTypes.find((t) => t.value === selectedFilter)
                          ?.label
                      }`}
                </h3>
                <p className="text-gray-500 text-sm text-center">
                  {selectedFilter === "all"
                    ? "Stay tuned! You'll get notified when there are updates."
                    : "Try selecting a different filter."}
                </p>
              </div>
            )}

            {!isLoading && !hasError && filteredNotifications.length > 0 && (
              <div>
                {/* Unread Section */}
                {unreadNotifications.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-semibold text-gray-300 mb-4 px-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#EA8D23]" />
                      Unread ({unreadNotifications.length})
                    </h2>
                    {unreadNotifications.map((notification) => (
                      <NotificationCard
                        key={notification._id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDeleteNotification}
                        isLoading={isLoading}
                      />
                    ))}
                  </div>
                )}

                {/* Read Section */}
                {filteredNotifications.filter((n) => n.read).length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 mb-4 px-1">
                      Read ({filteredNotifications.filter((n) => n.read).length})
                    </h2>
                    {filteredNotifications
                      .filter((n) => n.read)
                      .map((notification) => (
                        <NotificationCard
                          key={notification._id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={handleDeleteNotification}
                          isLoading={isLoading}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
