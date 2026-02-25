import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import socket from "../services/socket";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [notifications, setNotifications] = useState([]); // Notifications state
    const userId = user?._id;
    const currentStatus = user?.status || "online";
    const normalizeUser = (userData) => {
        if (!userData) return null;
        const status = userData.status || "online";
        return {
            ...userData,
            status,
            isOnline: typeof userData.isOnline === "boolean" ? userData.isOnline : status !== "invisible"
        };
    };

    useEffect(() => {
        if (user) return;

        const accessToken = localStorage.getItem("token");
        if (!accessToken) {
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
                setUser(normalizeUser(response.data));
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [user]);

    // Broadcast presence so admin/team pages update status in real-time on login.
    useEffect(() => {
        if (!userId) return;

        const emitPresence = () => {
            socket.emit("join", userId);
            socket.emit("updateUserStatus", {
                userId,
                status: currentStatus
            });
        };

        if (!socket.connected) {
            socket.connect();
        }

        emitPresence();
        socket.on("connect", emitPresence);

        return () => {
            socket.off("connect", emitPresence);
        };
    }, [userId, currentStatus]);

    // --- FIXED: Fetch and Poll Notifications ---
    useEffect(() => {
        if (!user || !user._id) return;

        const fetchNotifications = async () => {
            try {
                const response = await axiosInstance.get(
                    API_PATHS.NOTIFICATIONS.GET_USER_NOTIFICATIONS(user._id)
                );
                // Backend returns { success: true, data: [...] }
                if (response.data && response.data.success) {
                    setNotifications(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        fetchNotifications(); // Initial fetch

        // Setup polling to check for new notifications every 10 seconds
        const pollInterval = setInterval(fetchNotifications, 10000);

        return () => clearInterval(pollInterval);
    }, [user]);

    const updateUser = (userData) => {
        setUser(normalizeUser(userData));
        if (userData && userData.token) {
            localStorage.setItem("token", userData.token);
            localStorage.setItem("role", userData.role);
        }
        setLoading(false);
    };

    // Update user status and sync with context
    const updateUserStatus = (newStatus) => {
        if (!user || !user._id) return;

        setUser((prev) => (
            prev
                ? {
                    ...prev,
                    status: newStatus,
                    isOnline: newStatus !== "invisible"
                }
                : prev
        ));

        if (!socket.connected) {
            socket.connect();
        }
        socket.emit("updateUserStatus", {
            userId: user._id,
            status: newStatus
        });
    };

    const clearUser = async () => {
    try {
        // 1. Call the logout API first to update the DB status to 'invisible'
        if (localStorage.getItem("token")) {
            await axiosInstance.post(API_PATHS.AUTH.LOGOUT);
        }
    } catch (err) {
        console.error('Logout API call failed:', err);
    } finally {
        if (user?._id) {
            socket.emit("updateUserStatus", {
                userId: user._id,
                status: "invisible"
            });
        }
        socket.disconnect();
        // 2. Clear local data regardless of API success
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setLoading(false);
    }
}
    // Mark notification as read (Optimistic UI update)
    const markNotificationAsRead = async (id) => {
        setNotifications(prev =>
            prev.map(n => n._id === id ? { ...n, read: true } : n)
        );
        
        try {
            await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_AS_READ(id));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    // Delete notification
    const deleteNotification = async (id) => {
        setNotifications(prev => prev.filter(n => n._id !== id));
        
        try {
            await axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE_NOTIFICATION(id));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    // Mark all as read
    const markAllNotificationsAsRead = async () => {
        if (!user || !user._id) return;
        
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        
        try {
            await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_ALL_AS_READ(user._id));
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    // Delete all notifications
    const deleteAllNotifications = async () => {
        if (!user || !user._id) return;
        
        setNotifications([]);
        
        try {
            await axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE_ALL_NOTIFICATIONS(user._id));
        } catch (error) {
            console.error("Error deleting all notifications:", error);
            // Refresh notifications on error
            const response = await axiosInstance.get(
                API_PATHS.NOTIFICATIONS.GET_USER_NOTIFICATIONS(user._id)
            );
            if (response.data && response.data.success) {
                setNotifications(response.data.data);
            }
        }
    };

    const generateNotificationDigest = async () => {
        if (!user || !user._id) return { digest: "", highlights: [] };
        try {
            const response = await axiosInstance.post(
                API_PATHS.NOTIFICATIONS.GENERATE_DIGEST(user._id),
                {}
            );
            return {
                digest: response.data?.digest || "",
                highlights: response.data?.highlights || [],
            };
        } catch (error) {
            console.error("Error generating notification digest:", error);
            return { digest: "", highlights: [] };
        }
    };

    return (
        <UserContext.Provider value={{ 
            user, 
            updateUser,
            updateUserStatus,
            loading, 
            clearUser,
            notifications,
            markNotificationAsRead,
            deleteNotification,
            markAllNotificationsAsRead,
            deleteAllNotifications,
            generateNotificationDigest
        }}>
            {children}
        </UserContext.Provider>
    );
};

export default UserProvider;
