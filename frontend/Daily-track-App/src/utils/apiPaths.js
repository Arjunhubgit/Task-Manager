export const BASE_URL = "http://localhost:8000"; 

export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    GET_PROFILE: "/api/auth/profile",
    GOOGLE_LOGIN: "/api/auth/google-login",
    HOST_LOGIN: "/api/auth/host-login",
    LOGOUT: "/api/auth/logout",
  },

  USERS: {
    GET_ALL_USERS: "/api/users",
    GET_USER_BY_ID: (userId) => `/api/users/${userId}`,
    CREATE_USER: "/api/users",
    UPDATE_USER: (userId) => `/api/users/${userId}`,
    DELETE_USER: (userId) => `/api/users/${userId}`,
  },

  TASKS: {
    GET_DASHBOARD_DATA: "/api/tasks/dashboard-data",
    GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data",
    GET_ALL_TASKS: "/api/tasks",
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`,
    CREATE_TASK: "/api/tasks",
    UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`,
    DELETE_TASK: (taskId) => `/api/tasks/${taskId}`,
    UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`,
    UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`,

     // --- AI ROUTES ---
    CREATE_TASK_FROM_AI: "/api/tasks/ai-create", 
    GENERATE_SUBTASKS: "/api/tasks/ai-generate-subtasks", // <--- ADD THIS LINE
    // ----------------
  },
  
  REPORTS: {
    EXPORT_TASKS: "/api/reports/export/tasks",
    EXPORT_USERS: "/api/reports/export/users",
    GET_AUDIT_LOGS: "/api/reports/audit-logs"
  },

  NOTIFICATIONS: {
    GET_USER_NOTIFICATIONS: (userId) => `/api/notifications/user/${userId}`,
    GET_UNREAD_COUNT: (userId) => `/api/notifications/unread/${userId}`,
    MARK_AS_READ: (notificationId) => `/api/notifications/${notificationId}/read`,
    MARK_ALL_AS_READ: (userId) => `/api/notifications/user/${userId}/read-all`,
    DELETE_NOTIFICATION: (notificationId) => `/api/notifications/${notificationId}`,
    DELETE_ALL_NOTIFICATIONS: (userId) => `/api/notifications/user/${userId}/delete-all`,
  },

  MESSAGES: {
    GET_CONVERSATIONS: (userId) => `/api/messages/conversations/${userId}`,
    GET_CONVERSATION_MESSAGES: (conversationId) => `/api/messages/conversation/${conversationId}`,
    SEND_MESSAGE: "/api/messages/send",
    GET_UNREAD_MESSAGES: (userId) => `/api/messages/unread/${userId}`,
    MARK_MESSAGE_AS_READ: (messageId) => `/api/messages/${messageId}/read`,
    DELETE_MESSAGE: (messageId) => `/api/messages/${messageId}`,
    DELETE_CONVERSATION: (conversationId) => `/api/messages/conversation/${conversationId}`,
  },

  IMAGE: {
    UPLOAD_IMAGE: "/api/auth/upload-image",
  },

  HOST: {
    GET_ALL_USERS_GLOBAL: "/api/host/users/global",
    GET_ALL_TASKS_GLOBAL: "/api/host/tasks/global",
    UPDATE_TASK: (taskId) => `/api/host/tasks/${taskId}`,
    DELETE_TASK: (taskId) => `/api/host/tasks/${taskId}`,
  },
};