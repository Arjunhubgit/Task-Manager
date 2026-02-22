import React, { useContext, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA, SIDE_MENU_HOST_DATA } from "../../utils/data";
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from "../../utils/helper";

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
        relative group w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-300 ease-out font-medium
        ${isCollapsed ? "justify-center" : "justify-start"}
        ${isActive
          ? "bg-gradient-to-r from-orange-500/20 to-orange-400/10 text-[#EA8D23] border border-orange-500/30 shadow-[0_0_20px_rgba(234,141,35,0.15)]"
          : "text-gray-400 border border-transparent hover:bg-white/8 hover:text-gray-100 hover:border-white/10"
        }
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
        <item.icon className={`w-5 h-5 ${isActive ? "text-[#EA8D23]" : "text-gray-400 group-hover:text-orange-400"}`} />
      </div>

      {/* Label */}
      {!isCollapsed && (
        <span className="tracking-normal text-sm font-medium">{item.label}</span>
      )}

      {/* Active Indicator (Glow Dot) */}
      {isActive && !isCollapsed && (
        <div className="ml-auto w-2 h-2 rounded-full bg-[#EA8D23] shadow-[0_0_10px_#EA8D23]" />
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
    if (user?.role === "admin") return SIDE_MENU_DATA;
    if (user?.role === "host") return SIDE_MENU_HOST_DATA;
    return SIDE_MENU_USER_DATA;
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

  // Dynamic Profile Image - Use getImageUrl helper to handle all URL types
  const profileImage = getImageUrl(user?.profileImageUrl) ||
    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

  // --- Unified Menu Body ---
  const menuBody = (
    <nav className={`
        h-screen flex flex-col transition-all duration-300 ease-in-out relative
        bg-[#050505] border-r border-white/10
        ${isCollapsed ? "w-20 items-center" : "w-64"}
    `}>
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-orange-600/5 blur-[50px] pointer-events-none" />

      {/* Top Spacing */}
      <div className={`h-8 ${isCollapsed ? '' : ''}`} />

      {/* Menu Items Container */}
      <ul className="relative z-10 flex-1 flex flex-col gap-2 w-full px-2 overflow-y-auto pr-1 custom-scrollbar">
        {sideMenuData.map((item) => (
          <li key={item.label} className="w-full">
            <MenuItem item={item} activeMenu={activeMenu} onClick={handleClick} isCollapsed={isCollapsed} />
          </li>
        ))}
      </ul>

      {/* Divider */}
      <div className="w-full px-3 py-4">
        <div className="h-px bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
      </div>

      {/* Profile Section */}
      <div className={`
        relative z-10 w-full px-2 pb-6 flex flex-col
        ${isCollapsed ? 'items-center' : ''}
      `}>
        <div className={`
          ${isCollapsed ? 'w-full flex justify-center mb-3' : 'w-full mb-4'}
        `}>
          {/* <div className={`
            relative rounded-full p-[2px] bg-gradient-to-tr from-orange-500/50 to-purple-900/50 flex-shrink-0
            ${isCollapsed ? "w-11 h-11" : "w-12 h-12"}
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
        </div> */}

          {!isCollapsed && (
            <div className="w-full text-center">
              <h5 className="font-bold text-gray-200 text-sm leading-tight">{user?.name || "User"}</h5>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">{user?.email || "Guest"}</span>
                {user?.role === "admin" && (
                  <span className="bg-orange-500/10 text-[#EA8D23] border border-orange-500/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                    Admin
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


    </nav>
  );

  return (
    <>
      {/* Desktop Wrapper */}
      {!isMobile && (
        <>
          <div className={`
            hidden lg:flex fixed top-[4.5rem] z-50 transition-all duration-300 ease-in-out
            ${isCollapsed ? "left-[65px]" : "left-[256px]"}
          `}>
            <button
              onClick={() => setIsCollapsed(s => !s)}
              className="p-2 bg-[#050505] border border-white/20 rounded-full text-gray-400 hover:text-[#EA8D23] hover:border-[#EA8D23] shadow-lg transition-all duration-300 hover:scale-110"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 z-50" /> : <ChevronLeft className="w-4 h-4 z-50" />}
            </button>
          </div>

          <div className={`
            hidden lg:flex h-screen sticky top-0 transition-all duration-300 ease-in-out flex-shrink-0
            ${isCollapsed ? 'w-[80px]' : 'w-[264px]'}
          `}>
            {menuBody}
          </div>
        </>
      )}

      {/* Mobile Wrapper */}
      {isMobile && (
        <div className="w-64 h-full bg-[#050505] shadow-2xl shadow-black/50 border-r border-white/10 flex flex-col">
          {menuBody}
        </div>
      )}
    </>
  );
};

export default SideMenu;