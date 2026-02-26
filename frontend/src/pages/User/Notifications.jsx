import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import {
  Bell,
  Check,
  CheckCircle2,
  Loader,
  MessageSquare,
  Trash2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const FILTER_PRESETS = [
  { value: "all", label: "All" },
  { value: "needs_action", label: "Needs Action" },
  { value: "mentions", label: "Mentions" },
  { value: "deadlines", label: "Deadlines" },
  { value: "read", label: "Read" },
];

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", when: "beforeChildren", staggerChildren: 0.05 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut" } },
};
const _FRAMER_MOTION_LOADED = Boolean(motion);

const getNotificationIcon = (type) => {
  switch (type) {
    case "message":
      return <MessageSquare className="w-4 h-4 text-cyan-300" />;
    case "deadline_reminder":
      return <AlertCircle className="w-4 h-4 text-red-300" />;
    case "comment":
    case "mention":
      return <MessageSquare className="w-4 h-4 text-violet-300" />;
    default:
      return <Bell className="w-4 h-4 text-orange-300" />;
  }
};

const resolveId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || null;
  return null;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [digest, setDigest] = useState({ text: "", highlights: [], loading: false });

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        API_PATHS.NOTIFICATIONS.GET_USER_NOTIFICATIONS(user._id, selectedFilter)
      );
      if (response.data?.success) {
        // Filter out message-type notifications
        const filteredNotifications = (response.data.data || []).filter(
          (notification) => notification.type !== "message"
        );
        setNotifications(filteredNotifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter, user?._id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_AS_READ(notificationId));
      setNotifications((prev) =>
        prev.map((item) => (item._id === notificationId ? { ...item, read: true } : item))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE_NOTIFICATION(notificationId));
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?._id) return;
    try {
      await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_ALL_AS_READ(user._id));
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDeleteAll = async () => {
    if (!user?._id) return;
    if (!window.confirm("Delete all visible notifications?")) return;
    try {
      await axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE_ALL_NOTIFICATIONS(user._id));
      setNotifications([]);
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
    }
  };

  const openNotificationTarget = async (notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }
    const conversationId = resolveId(notification.relatedConversationId);
    const taskId = resolveId(notification.relatedTaskId);

    if (notification.type === "message" && conversationId) {
      navigate(`/user/messages?conversation=${conversationId}`);
      return;
    }
    if (taskId) {
      if (notification.type === "comment" || notification.type === "mention") {
        navigate(`/user/task/${taskId}#comments`);
      } else {
        navigate(`/user/task/${taskId}`);
      }
      return;
    }
    if (notification.type === "deadline_reminder") {
      navigate("/user/my-day");
    }
  };

  const generateDigest = async () => {
    if (!user?._id) return;
    try {
      setDigest((prev) => ({ ...prev, loading: true }));
      const response = await axiosInstance.post(API_PATHS.NOTIFICATIONS.GENERATE_DIGEST(user._id), {});
      setDigest({
        text: response.data?.digest || "No digest available.",
        highlights: response.data?.highlights || [],
        loading: false,
      });
    } catch (error) {
      setDigest((prev) => ({ ...prev, loading: false }));
      console.error("Failed to generate digest:", error);
    }
  };

  return (
    <DashboardLayout activeMenu="Notifications">
      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-5">
        <motion.div variants={sectionVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Notifications</h2>
            <p className="text-sm text-gray-400">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/30 text-violet-200 bg-violet-500/10 text-sm"
              onClick={generateDigest}
              disabled={digest.loading}
            >
              <Sparkles className="w-4 h-4" />
              {digest.loading ? "Generating..." : "AI Digest"}
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-500/30 text-orange-200 bg-orange-500/10 text-sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark All Read
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-200 bg-red-500/10 text-sm"
              onClick={handleDeleteAll}
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </button>
          </div>
        </motion.div>

        <motion.div variants={sectionVariants} className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-3 flex flex-wrap gap-2">
          {FILTER_PRESETS.map((preset) => (
            <motion.button
              key={preset.value}
              onClick={() => setSelectedFilter(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                selectedFilter === preset.value
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                  : "border-white/10 text-gray-300 hover:bg-white/5"
              }`}
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {preset.label}
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence>
          {digest.text && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            variants={sectionVariants}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-300" />
              AI Digest
            </h3>
            <p className="text-sm text-violet-100/90 mt-2">{digest.text}</p>
            {digest.highlights.length > 0 && (
              <ul className="mt-3 space-y-1">
                {digest.highlights.map((item, index) => (
                  <li key={`${item}-${index}`} className="text-xs text-gray-300">
                    - {item}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        <motion.div variants={sectionVariants} className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center text-gray-500">
              <Loader className="w-6 h-6 animate-spin mb-2" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No notifications for this filter.</div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {notifications.map((notification, index) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.22)" }}
                  className={`rounded-xl border p-3 transition-colors ${
                    notification.read
                      ? "border-white/10 bg-black/20"
                      : "border-orange-500/25 bg-orange-500/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <button
                        className="text-left w-full"
                        onClick={() => openNotificationTarget(notification)}
                      >
                        <p className="text-sm font-semibold text-white">{notification.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
                        </p>
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notification.read && (
                        <button
                          className="p-1.5 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded border border-red-500/30 text-red-300 bg-red-500/10"
                        onClick={() => handleDelete(notification._id)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Notifications;
