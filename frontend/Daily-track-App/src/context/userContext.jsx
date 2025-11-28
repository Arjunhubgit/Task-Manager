import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
// import { set } from "mongoose";


export const UserContext = createContext();

const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // New state to track loading

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
    return (
        <UserContext.Provider value={{ user, updateUser, loading, clearUser }}>
            {children}
        </UserContext.Provider>
    );
};

export default UserProvider;