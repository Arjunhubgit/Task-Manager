import React, { useState, useCallback } from 'react';
import { Menu, X, LayoutDashboard, Settings, Users, CheckSquare } from "lucide-react";
import Logo_img2 from '../../assets/images/logo2.png';

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
    
    const handleMenuToggle = useCallback(() => {
        if (onMenuToggle) {
            onMenuToggle();
        }
    }, [onMenuToggle]);

    return (
        <nav className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[100] transition-all duration-300">
            
            {/* Left Section: Mobile Toggle and Brand */}
            <div className="flex items-center gap-4">
                
                {/* Mobile Menu Toggle */}
                <button
                    className='lg:hidden text-gray-400 hover:text-[#EA8D23] focus:outline-none p-2 rounded-full transition-colors duration-200 hover:bg-white/5'
                    onClick={handleMenuToggle}
                    aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isMobileMenuOpen}
                >
                    {isMobileMenuOpen ? (
                        <X className="w-6 h-6 text-red-500" />
                    ) : (
                        <Menu className="w-6 h-6" />
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
                            relative text-sm font-medium tracking-wide transition-all duration-300 px-2 py-1
                            ${activeMenu === link.label 
                                ? "text-[#EA8D23]" 
                                : "text-gray-400 hover:text-white"
                            }
                        `}
                    >
                        {link.label}
                        {/* Active Underline Glow */}
                        {activeMenu === link.label && (
                            <span className="absolute bottom-[-1.25rem] left-0 w-full h-[2px] bg-[#EA8D23] shadow-[0_0_10px_#EA8D23]"></span>
                        )}
                    </a>
                ))}
            </div>
        </nav>
    );
};

export default Navbar;