import React, { useState, useCallback } from 'react';
import { Menu, X, LayoutDashboard, Settings, Users, CheckSquare } from "lucide-react";
import SideMenu from './SideMenu'; // Assuming SideMenu is now the one we previously optimized
import Logo_img from '../../assets/images/logo1.png';

// --- Sub-Component for Logo and Brand ---
const Brand = () => (
    <div className="flex items-center gap-3 flex-shrink-0">
        <img src={Logo_img} alt="Task Manager Logo" className="w-9 h-9 rounded-lg shadow-md border border-gray-100" />
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight hidden sm:block">
            TaskManager
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
    // Use the props for mobile menu control instead of internal state
    const handleMenuToggle = useCallback(() => {
        if (onMenuToggle) {
            onMenuToggle();
        }
    }, [onMenuToggle]);

    return (
        <>
            <nav className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-lg shadow-lg border-b border-blue-100 sticky top-0 z-[100] transition-all duration-300">
                
                {/* Left Section: Mobile Toggle and Brand */}
                <div className="flex items-center gap-4">
                    
                    {/* Mobile Menu Toggle Button (Visible on screens < 1024px) */}
                    {/* Using z-index 100 on the nav will ensure this is always visible over content */}
                    <button
                        className='lg:hidden text-gray-700 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 p-2 rounded-full transition-colors duration-200'
                        onClick={handleMenuToggle}
                        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6 text-red-500" />
                        ) : (
                            <Menu className="w-6 h-6 text-blue-600" />
                        )}
                    </button>
                    
                    <Brand />
                </div>
                
                {/* Right Section: Desktop Navigation Links */}
                <div className="hidden lg:flex items-center gap-8">
                    {DESKTOP_LINKS.map(link => (
                        <a 
                            key={link.label}
                            href={link.href} 
                            className={`
                                text-sm font-semibold tracking-wide transition-colors duration-200 
                                ${activeMenu === link.label 
                                    ? "text-blue-600 border-b-2 border-blue-600 pb-0.5" 
                                    : "text-gray-600 hover:text-blue-500"
                                }
                            `}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            </nav>

            
            {/* Mobile menu handling is now moved to DashboardLayout */}
        </>
    );
};

export default Navbar;