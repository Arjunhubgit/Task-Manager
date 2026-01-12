import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [notifications, setNotifications] = useState([]); // Notifications state

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
                setUser(response.data);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                clearUser();
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [user]);

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
        setUser(userData);
        if (userData && userData.token) {
            localStorage.setItem("token", userData.token);
            localStorage.setItem("role", userData.role);
        }
        setLoading(false);
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

    return (
        <UserContext.Provider value={{ 
            user, 
            updateUser, 
            loading, 
            clearUser,
            notifications,
            markNotificationAsRead,
            deleteNotification,
            markAllNotificationsAsRead
        }}>
            {children}
        </UserContext.Provider>
    );
};

export default UserProvider;