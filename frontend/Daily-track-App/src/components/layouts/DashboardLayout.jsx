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
        <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-orange-500/30 selection:text-orange-200">
            
            <Navbar 
                activeMenu={activeMenu} 
                onMenuToggle={toggleMobileMenu}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {user && (
                <div className="flex h-[calc(100vh-4.5rem)]"> {/* Adjusted height for slightly taller navbar */}
                    
                    {/* Desktop Sidebar */}
                    <SideMenu activeMenu={activeMenu} isMobile={false} />

                    {/* Mobile Sidebar with Overlay */}
                    <div 
                        className={`
                            lg:hidden fixed inset-0 z-[110]
                            ${isMobileMenuOpen ? 'visible' : 'invisible'}
                        `}
                    >
                        {/* Dark Backdrop Blur Overlay */}
                        <div 
                            className={`
                                absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300
                                ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}
                            `}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        
                        {/* Mobile menu content */}
                        <div 
                            className={`
                                absolute left-0 top-0 h-full transform transition-transform duration-300 ease-in-out shadow-2xl shadow-orange-900/20
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

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        {/* Subtle background gradient for depth in content area */}
                        <div className="fixed top-20 right-0 w-[30vw] h-[30vw] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none" />
                        
                        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto relative z-10">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;