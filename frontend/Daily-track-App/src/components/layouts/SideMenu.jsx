import React, { useContext, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react'; 

// --- Sub-Component for Menu Item (Reusable for both views) ---
const MenuItem = ({ item, activeMenu, onClick, isCollapsed }) => {
  const isActive = activeMenu === item.label;

  return (
    <button
      key={item.label}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? item.label : undefined} 
      className={`
        w-full flex items-center gap-3 text-sm p-3 rounded-xl transition-all duration-300 ease-in-out font-semibold
        hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${isCollapsed ? "justify-center" : "justify-start"}
        ${isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
          : "text-gray-700 bg-white hover:bg-blue-50 hover:text-blue-700 shadow-sm border border-gray-100"
        }
      `}
      onClick={() => onClick(item.path)}
    >
      <div
        className={`
          p-2 rounded-lg transition-all duration-300 flex-shrink-0
          ${isActive ? "bg-white/20" : "bg-gray-50 group-hover:bg-blue-100/70"}
        `}
      >
        <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-white" : "text-blue-500 group-hover:text-blue-600"}`} />
      </div>
      {!isCollapsed && <span className="tracking-wide">{item.label}</span>}
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
    // Removed mobileOpen logic since this component no longer manages mobile state
  }, [handleLogout, navigate]); 
  
  // Dynamic Profile Image
  const profileImage = user?.profileImageUrl ||
    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

  // Unified Menu Body
  const menuBody = (
    <nav className={`
        bg-white border-r border-gray-200 shadow-2xl/10 h-full p-4 flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20 items-center" : "w-64"}
    `}>
      {/* Profile Section */}
      <header className={`flex items-center gap-3 border-b border-gray-200 pb-4 mb-6 ${isCollapsed ? 'justify-center flex-col' : ''}`}>
        {/* ... Profile structure remains the same ... */}
        <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-md border-2 border-blue-400">
          <img src={profileImage} alt={`${user?.name || "User"}'s profile`} className="w-full h-full object-cover" />
          {user?.role === "admin" && (<div title="Admin" className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white"></div>)}
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <h5 className="font-extrabold text-lg text-gray-900 truncate">{user?.name || "User"}</h5>
              {user?.role === "admin" && (<span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">Admin</span>)}
            </div>
            <p className="text-sm text-gray-500 font-medium truncate">{user?.email || "Guest"}</p>
          </div>
        )}
      </header>

      {/* Menu Items */}
      <ul className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
        {sideMenuData.map((item) => (
          <li key={item.label}>
            <MenuItem item={item} activeMenu={activeMenu} onClick={handleClick} isCollapsed={isCollapsed} />
          </li>
        ))}
      </ul>

      {/* Footer/Logout */}
      <footer className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`w-full flex items-center gap-3 text-sm p-3 rounded-xl transition-all duration-300 ease-in-out font-semibold text-red-600 bg-white hover:bg-red-50 hover:text-red-700 shadow-sm border border-red-100 ${isCollapsed ? "justify-center" : "justify-start"}`}
        >
          <div className="p-2 rounded-lg bg-red-100/70 flex-shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          {!isCollapsed && <span className="tracking-wide">Logout</span>}
        </button>
      </footer>
    </nav>
  );

  // Modified return to handle both mobile and desktop cases
  return (
    <>
      {!isMobile && (
        <>
          <div className={`
            hidden lg:flex fixed top-[4.5rem] z-50 transition-all duration-300 ease-in-out
            ${isCollapsed ? "left-[90px]" : "left-[264px]"}
          `}>
            <button
              onClick={() => setIsCollapsed(s => !s)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 bg-white border border-gray-200 rounded-full text-gray-600 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className={`
            hidden lg:block h-[calc(100vh)] transition-all duration-300 ease-in-out flex-shrink-0
            ${isCollapsed ? 'w-20' : 'w-64'}
          `}>
            <div className="h-full sticky top-0">
              {menuBody}
            </div>
          </div>
        </>
      )}
      
      {isMobile && (
        <div className="w-64 h-full bg-white shadow-xl">
          {menuBody}
        </div>
      )}
    </>
  );
};

export default SideMenu;