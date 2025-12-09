import React, { useContext, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Sub-Component for Menu Item ---
const MenuItem = ({ item, activeMenu, onClick, isCollapsed }) => {
  const isActive = activeMenu === item.label;

  return (
    <button
      key={item.label}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? item.label : undefined}
      onClick={() => onClick(item.path)}
      className={`
        relative group w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-out font-medium mb-1
        ${isCollapsed ? "justify-center" : "justify-start"}
        ${isActive
          ? "bg-orange-500/10 text-[#EA8D23] border border-orange-500/20 shadow-[0_0_15px_rgba(234,141,35,0.1)]"
          : "text-gray-400 border border-transparent hover:bg-white/5 hover:text-gray-100 hover:border-white/5"
        }
      `}
    >
      {/* Icon */}
      <div className={`transition-transform duration-300 ${isActive ? "" : "group-hover:scale-110"}`}>
        <item.icon className={`w-5 h-5 ${isActive ? "text-[#EA8D23]" : "text-gray-400 group-hover:text-gray-200"}`} />
      </div>

      {/* Label */}
      {!isCollapsed && (
        <span className="tracking-wide text-sm">{item.label}</span>
      )}

      {/* Active Indicator (Glow Dot) */}
      {isActive && !isCollapsed && (
        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#EA8D23] shadow-[0_0_10px_#EA8D23]" />
      )}
    </button>
  );
};

// --- Main SideMenu Component ---
const SideMenu = ({ activeMenu, isMobile, onMobileClose }) => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  // Desktop state for collapse
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sideMenuData = useMemo(() => {
    return user?.role === "admin" ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA;
  }, [user]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("userToken");
    clearUser();
    navigate("/login");
  }, [clearUser, navigate]);

  const handleClick = useCallback((route) => {
    if (route === "logout") {
      handleLogout();
      return;
    }
    navigate(route);
  }, [handleLogout, navigate]);

  // Dynamic Profile Image
  const profileImage = user?.profileImageUrl ||
    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

  // --- Unified Menu Body ---
  const menuBody = (
    <nav className={`
        h-full flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden
        bg-[#050505] border-r border-white/10
        ${isCollapsed ? "w-20 items-center px-2" : "w-64 px-4"}
    `}>
      {/* Ambient Background Glow (Matching Login Page) */}
      <div className="absolute top-0 left-0 w-full h-32 bg-orange-600/5 blur-[50px] pointer-events-none" />

      {/* Profile Section */}
      <header className={`
        relative z-10 flex items-center gap-3 py-6 mb-4 border-b border-white/10 transition-all duration-300
        ${isCollapsed ? 'justify-center flex-col pb-4' : ''}
      `}>
        <div className={`
          relative rounded-full p-[2px] bg-gradient-to-tr from-orange-500/50 to-purple-900/50
          ${isCollapsed ? "w-10 h-10" : "w-12 h-12"}
        `}>
          <img
            src={profileImage}
            alt="Profile"
            className="w-full h-full rounded-full object-cover border-2 border-[#050505]"
          />
          {user?.role === "admin" && (
            <div title="Admin" className="absolute bottom-0 right-0 w-3 h-3 bg-[#EA8D23] rounded-full border-2 border-[#050505] shadow-[0_0_8px_#EA8D23]"></div>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <h5 className="font-bold text-gray-200 truncate text-sm">{user?.name || "User"}</h5>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 font-medium truncate max-w-[120px]">{user?.email || "Guest"}</span>
              {user?.role === "admin" && (
                <span className="bg-orange-500/10 text-[#EA8D23] border border-orange-500/20 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Menu Items */}
      <ul className="relative z-10 flex flex-col gap-1 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {sideMenuData.map((item) => (
          <li key={item.label}>
            <MenuItem item={item} activeMenu={activeMenu} onClick={handleClick} isCollapsed={isCollapsed} />
          </li>
        ))}
      </ul>

      {/* Footer/Logout */}
      <footer className="z-10 mt-auto py-6 border-t border-white/10 mb-2">
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`
      group w-full flex items-center gap-3 text-sm p-3 rounded-lg transition-all duration-300 ease-in-out font-medium
      text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10
      ${isCollapsed ? "justify-center" : "justify-start"}
    `}
        >
          <div className="transition-transform group-hover:scale-110">
            <LogOut className="w-5 h-5 group-hover:text-red-400" />
          </div>
          {!isCollapsed && <span className="tracking-wide">Logout</span>}
        </button>
      </footer>
    </nav>
  );

  return (
    <>
      {/* Desktop Wrapper */}
      {!isMobile && (
        <>
          <div className={`
            hidden lg:flex fixed top-[4.5rem] z-50 transition-all duration-300 ease-in-out
            ${isCollapsed ? "left-[65px]" : "left-[240px]"}
          `}>
            <button
              onClick={() => setIsCollapsed(s => !s)}
              className="p-1 bg-[#050505] border border-white/20 rounded-full text-gray-400 hover:text-[#EA8D23] hover:border-[#EA8D23] shadow-lg transition-all duration-300"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className={`
            hidden lg:block h-screen sticky top-0 transition-all duration-300 ease-in-out flex-shrink-0
            ${isCollapsed ? 'w-20' : 'w-64'}
          `}>
            {menuBody}
          </div>
        </>
      )}

      {/* Mobile Wrapper */}
      {isMobile && (
        <div className="w-64 h-full bg-[#050505] shadow-2xl shadow-black/50 border-r border-white/10">
          {menuBody}
        </div>
      )}
    </>
  );
};

export default SideMenu;