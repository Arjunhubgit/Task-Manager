import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
// import { set } from "mongoose";


export const UserContext = createContext();

const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // New state to track loading
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
                // Handle error, e.g., by clearing token and redirecting to login
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [user]);

    // Fetch notifications from backend when user changes
    useEffect(() => {
        if (!user || !user._id) return;

        const fetchNotifications = async () => {
            try {
                const response = await axiosInstance.get(
                    API_PATHS.NOTIFICATIONS.GET_USER_NOTIFICATIONS(user._id)
                );
                // if (response.data.success) {
                //     setNotifications(response.data.data);
                // }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        fetchNotifications();

        // Optionally: Set up polling to check for new notifications every 10 seconds
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

    const clearUser = () => {
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setLoading(false); // Set loading to false when clearing user
    }

    // Add notification function (for local use, real notifications come from backend)
    const addNotification = (notification) => {
        const newNotification = {
            id: Date.now(),
            read: false,
            timestamp: 'just now',
            createdAt: new Date(),
            ...notification,
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    // Mark notification as read
    const markNotificationAsRead = (id) => {
        setNotifications(prev =>
            prev.map(n => n._id === id || n.id === id ? { ...n, read: true } : n)
        );
        
        // Call backend to update
        try {
            axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_AS_READ(id));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    // Delete notification
    const deleteNotification = (id) => {
        setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id));
        
        // Call backend to delete
        try {
            axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE_NOTIFICATION(id));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    // Mark all as read
    const markAllNotificationsAsRead = () => {
        if (!user || !user._id) return;
        
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        
        // Call backend to mark all as read
        try {
            axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_ALL_AS_READ(user._id));
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
            addNotification,
            markNotificationAsRead,
            deleteNotification,
            markAllNotificationsAsRead
        }}>
            {children}
        </UserContext.Provider>
    );
};

export default UserProvider;