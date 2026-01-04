import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { Menu, X, LayoutDashboard, Settings, Users, CheckSquare, LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { UserContext } from '../../context/userContext'; // Import User Context
import Logo_img2 from '../../assets/images/logo2.png';
import SearchBar from '../navbar/SearchBar';
import NotificationsBell from '../navbar/NotificationsBell';
import QuickCreateButton from '../navbar/QuickCreateButton';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';

// --- Sub-Component for Logo and Brand ---
const Brand = () => (
    <div className="flex items-center gap-3 flex-shrink-0 group cursor-pointer">
        <div className="relative">
            <div className="absolute inset-0 bg-orange-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
            <img src={Logo_img2} alt="Task Manager Logo" className="relative w-9 h-9 rounded-lg border border-white/10" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight hidden sm:block">
            CHRONO<span className="text-[#EA8D23]">FLOW</span>
        </h2>
    </div>
);

// --- Static Desktop Links Data ---
const DESKTOP_LINKS = [
    { label: "Dashboard", href: "#", icon: LayoutDashboard },
    { label: "My Tasks", href: "#", icon: CheckSquare },
    { label: "Team", href: "#", icon: Users },
    { label: "Settings", href: "#", icon: Settings },
];

const Navbar = ({ activeMenu, onMenuToggle, isMobileMenuOpen }) => {
    const { user, clearUser } = useContext(UserContext); // Get user data and logout function
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [userStatus, setUserStatus] = useState('online'); // 'online', 'idle', 'dnd', 'invisible'
    const profileRef = useRef(null);

    const handleMenuToggle = useCallback(() => {
        if (onMenuToggle) {
            onMenuToggle();
        }
    }, [onMenuToggle]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Determine online status: user must be logged in AND status must be 'online'
    const isOnline = !!user && userStatus === 'online';
    
    return (
        <nav className="flex items-center justify-between px-4 sm:px-6 py-4 h-16 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[100] transition-all duration-300">
            
            {/* Left Section: Mobile Toggle and Brand */}
            <div className="flex items-center gap-4">
                <button
                    className='lg:hidden text-gray-400 hover:text-[#EA8D23] focus:outline-none p-2 rounded-full transition-colors duration-200 hover:bg-white/5'
                    onClick={handleMenuToggle}
                    aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6 text-red-500" /> : <Menu className="w-6 h-6" />}
                </button>
                <Brand />
            </div>
            


            {/* Right Section: Quick Create, Notifications, and User Profile */}
            <div className="flex items-center gap-3" ref={profileRef}>
                {user && (
                    <>
                        
                        {/* Search Bar - Hidden on mobile */}
                        <div className="hidden lg:flex">
                            <SearchBar />
                        </div>
                        
                        {/* Quick Create Button */}
                        <QuickCreateButton />

                        {/* Notifications Bell */}
                        <NotificationsBell />
                    </>
                )}
                
                {user ? (
                    <div className="relative">
                        {/* Profile Button */}
                        <button 
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-300 group active:scale-95 hover:shadow-lg hover:shadow-orange-500/10"
                        >
                            {/* Avatar Container */}
                            <div className="relative">
                                {user.profileImageUrl ? (
                                    <img 
                                        src={user.profileImageUrl} 
                                        alt={user.name} 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/20 group-hover:border-orange-500/50 transition-colors"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border-2 border-orange-500/20 text-[#EA8D23]">
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                )}

                                {/* STATUS INDICATOR */}
                                <div className={`
                                    absolute bottom-0 right-0 z-20 rounded-full border-3 border-[#050505]
                                    flex items-center justify-center w-3.5 h-3.5 transition-all duration-200
                                    ${userStatus === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/60' : ''}
                                    ${userStatus === 'idle' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/60' : ''}
                                    ${userStatus === 'dnd' ? 'bg-red-500 shadow-lg shadow-red-500/60' : ''}
                                    ${userStatus === 'invisible' ? 'bg-gray-600 shadow-lg shadow-gray-600/40' : ''}
                                `} />
                            </div>

                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`
                            absolute right-0 top-full mt-3 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 transform transition-all duration-300 origin-top-right
                            ${isProfileOpen ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-3 invisible pointer-events-none'}
                        `}>
                            {/* User Info Section */}
                            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                <p className="text-sm font-medium text-white">Signed in as</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                            </div>

                            {/* Status Selection Section */}
                            <div className="p-3 border-b border-white/5">
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide px-2 mb-2">Status</p>
                                
                                {/* Online */}
                                <button
                                    onClick={async () => {
                                        setUserStatus('online');
                                        // Send status update to backend
                                        try {
                                            await axiosInstance.put(`${API_PATHS.USERS.UPDATE_USER(user._id)}`, {
                                                status: 'online'
                                            });
                                        } catch (error) {
                                            console.error('Failed to update status:', error);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-1.5 ${
                                        userStatus === 'online'
                                            ? 'bg-emerald-500/15 text-emerald-300'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></div>
                                    <span className="text-sm font-medium">Online</span>
                                </button>

                                {/* Idle */}
                                <button
                                    onClick={async () => {
                                        setUserStatus('idle');
                                        // Send status update to backend
                                        try {
                                            await axiosInstance.put(`${API_PATHS.USERS.UPDATE_USER(user._id)}`, {
                                                status: 'idle'
                                            });
                                        } catch (error) {
                                            console.error('Failed to update status:', error);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-1.5 ${
                                        userStatus === 'idle'
                                            ? 'bg-yellow-500/15 text-yellow-300'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                                    <span className="text-sm font-medium">Idle</span>
                                </button>

                                {/* Do Not Disturb */}
                                <button
                                    onClick={async () => {
                                        setUserStatus('dnd');
                                        // Send status update to backend
                                        try {
                                            await axiosInstance.put(`${API_PATHS.USERS.UPDATE_USER(user._id)}`, {
                                                status: 'dnd'
                                            });
                                        } catch (error) {
                                            console.error('Failed to update status:', error);
                                        }
                                    }}
                                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-1.5 ${
                                        userStatus === 'dnd'
                                            ? 'bg-red-500/15 text-red-300'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 mt-0.5"></div>
                                    <div>
                                        <span className="text-sm font-medium block">Do Not Disturb</span>
                                        <span className="text-xs text-gray-500 block mt-0.5">You won't receive notifications</span>
                                    </div>
                                </button>

                                {/* Invisible */}
                                <button
                                    onClick={async () => {
                                        setUserStatus('invisible');
                                        // Send status update to backend
                                        try {
                                            await axiosInstance.put(`${API_PATHS.USERS.UPDATE_USER(user._id)}`, {
                                                status: 'invisible'
                                            });
                                        } catch (error) {
                                            console.error('Failed to update status:', error);
                                        }
                                    }}
                                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                                        userStatus === 'invisible'
                                            ? 'bg-gray-500/15 text-gray-300'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="w-3 h-3 rounded-full bg-gray-500 flex-shrink-0 mt-0.5"></div>
                                    <div>
                                        <span className="text-sm font-medium block">Invisible</span>
                                        <span className="text-xs text-gray-500 block mt-0.5">You appear offline</span>
                                    </div>
                                </button>
                            </div>

                            {/* Profile & Settings */}
                            <div className="p-1">
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                    <UserIcon className="w-4 h-4" /> Profile
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                    <Settings className="w-4 h-4" /> Settings
                                </button>
                            </div>

                            {/* Sign Out */}
                            <div className="p-1 border-t border-white/5">
                                <button 
                                    onClick={clearUser}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" /> Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                    
                ) : (
                    // Fallback for when no user is logged in (Offline State)
                    <div className="flex items-center gap-3">
                         <div className="px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            <span className="text-xs font-medium text-gray-400">Offline</span>
                         </div>
                         <a href="/login" className="text-sm text-[#EA8D23] hover:text-orange-400 font-medium transition-colors">Login</a>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;