import { LuActivity, LuLayoutDashboard, LuUsers, LuClipboardCheck, LuSquarePlus, LuLogOut, LuShield, LuMailOpen, LuSettings, LuFileText, LuTrendingUp, LuBell } from "react-icons/lu";
import { FaChartColumn,  } from "react-icons/fa6";
export const SIDE_MENU_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    id: "02",
    label: "Manage Tasks",
    icon: LuClipboardCheck,
    path: "/admin/tasks",
  },
  {
    id: "03",
    label: "Create Task",
    icon: LuSquarePlus,
    path: "/admin/create-task",
  },
  {
    id: "04",
    label: "Team Members",
    icon: LuUsers,
    path: "/admin/users",
  },
  {
    id: "05",
    label: "Reports & Analytics",
    icon: FaChartColumn,
    path: "/admin/reports",
  },
  {
    id: "06",
    label: "Team Performance",
    icon: LuTrendingUp,
    path: "/admin/performance",
  },
  {
    id: "09",
    label: "Notifications",
    icon: LuBell,
    path: "/admin/notifications",
  },
  {
    id: "10",
    label: "Settings",
    icon: LuSettings,
    path: "/admin/settings",
  },
];

export const SIDE_MENU_USER_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/user/dashboard",
  },
  {
    id: "02",
    label: "My Tasks",
    icon: LuClipboardCheck,
    path: "/user/tasks",
  },
];

export const SIDE_MENU_HOST_DATA = [
  {
    id: "01",
    label: "Host Dashboard",
    icon: LuLayoutDashboard,
    path: "/host/dashboard",
  },
  {
    id: "02",
    label: "Global Users",
    icon: LuUsers,
    path: "/host/users",
  },
  {
    id: "03",
    label: "Global Tasks",
    icon: LuClipboardCheck,
    path: "/host/tasks",
  },
  {
    id: "04",
    label: "God Mode",
    icon: LuShield,
    path: "/host/god-mode",
  },
];

export const PRIORITY_DATA = [
  {
    label: "Low",
    value: "Low",
  },
  {
    label: "Medium",
    value: "Medium",
  },
  {
    label: "High",
    value: "High",
  },
];

export const STATUS_DATA = [
  {
    label: "Pending",
    value: "Pending",
  },
  {
    label: "In Progress",
    value: "In Progress",
  },
  {
    label: "Completed",
    value: "Completed",
  },
];