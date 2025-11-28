import React, { useContext, useState } from "react";
import { UserContext } from "../../context/userContext";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";

const DashboardLayout = ({ children, activeMenu }) => {
    const { user } = useContext(UserContext);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar 
                activeMenu={activeMenu} 
                onMenuToggle={toggleMobileMenu}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {user && (
                <div className="flex h-[calc(100vh-4rem)]">
                    {/* Desktop Sidebar */}
                    <SideMenu activeMenu={activeMenu} isMobile={false} />

                    {/* Mobile Sidebar with Overlay */}
                    <div 
                        className={`
                            lg:hidden fixed inset-0 z-40
                            ${isMobileMenuOpen ? 'visible' : 'invisible'}
                        `}
                    >
                        {/* Dark overlay */}
                        <div 
                            className={`
                                absolute inset-0 bg-black/50 transition-opacity duration-300
                                ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}
                            `}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        
                        {/* Mobile menu content */}
                        <div 
                            className={`
                                absolute left-0 top-0 h-full transform transition-transform duration-300 ease-in-out
                                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                            `}
                        >
                            <SideMenu 
                                activeMenu={activeMenu} 
                                isMobile={true}
                                onMobileClose={() => setIsMobileMenuOpen(false)}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-auto">
                        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;