# ChronoFlow
### AI-Powered Task Management for Teams

[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=nodedotjs&logoColor=white)](#)
[![Express](https://img.shields.io/badge/API-Express-000000?logo=express&logoColor=white)](#)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](#)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socketdotio&logoColor=white)](#)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=black)](#)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary-3448C5?logo=cloudinary&logoColor=white)](#)

ChronoFlow is a role-based productivity platform built for modern teams with **real-time messaging**, **AI workflows**, and **smart task operations**.

## Live Links

- Frontend Demo: https://chronoflow-pn4c.onrender.com

## What Makes It Different

- Role hierarchy: **Host -> Admin -> Member**
- AI-assisted task creation, subtasks, summaries, and planning
- Real-time team chat with unread tracking and AI reply suggestions
- Invite-based team onboarding and host-level global control
- Cloudinary-powered avatar persistence (including Google sign-in profiles)

## Core Features

- Authentication
- Email/password login
- Google OAuth login via Firebase
- Profile image upload and Cloudinary storage

- Task & Productivity
- Create, assign, prioritize, and track tasks
- Comments and checklist management
- User dashboard, calendar, My Day planning, and insights

- AI Capabilities
- AI task generation
- AI subtask generation
- AI task analysis and assistance
- AI auto-summary for tasks and chats

- Collaboration
- Real-time messaging with Socket.IO
- Notifications and unread counters
- AI digest for notifications

- Reporting & Governance
- Task and user export reports
- Host audit logs
- Global user/task management for host role

## Screenshots

> Add your screenshots in `docs/screenshots/` and update paths below.

| Login | Dashboard |
|------|------|
| ![Login](./docs/screenshots/login.png) | ![Dashboard](./docs/screenshots/dashboard.png) |

| Task Board | Team Chat |
|------|------|
| ![Tasks](./docs/screenshots/tasks.png) | ![Chat](./docs/screenshots/chat.png) |

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Socket.IO Client
- Backend: Node.js, Express, MongoDB, JWT, Socket.IO
- Integrations: Firebase Auth, Cloudinary, Groq AI, Zoom (optional)

## Local Setup

```bash
# 1) Clone
git clone <your-repo-url>
cd TaskManager

# 2) Install
cd backend && npm install
cd ../frontend && npm install
```

Create `backend/.env` and `frontend/.env` with your credentials.

### Minimal `backend/.env`

```env
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
PORT=8000
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173,http://<your-lan-ip>:5173

GROQ_API_KEY=your_groq_api_key
ADMIN_CODE=your_admin_code
HOST_ID=your_host_id
HOST_PASSWORD=your_host_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Minimal `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Run the app:

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

## API Modules

- `/api/auth`
- `/api/users`
- `/api/tasks`
- `/api/messages`
- `/api/notifications`
- `/api/reports`
- `/api/invites`
- `/api/host`

## Quick Troubleshooting

- CORS error: add your exact frontend origin to `CLIENT_URL` in backend `.env`.
- Socket error: verify `VITE_SOCKET_URL` points to backend and server is running.
- Missing Google avatar: verify Cloudinary env keys and re-login using Google.

## Future Improvements

- Unit/integration test coverage
- CI/CD workflow and release tagging
- PWA/mobile experience
- Advanced analytics and SLA dashboards

## Author

- Name: Arjun Sharma
  
<<<<<<< HEAD
- GitHub: https://github.com/Arjunhubgit
- LinkedIn: https://www.linkedin.com
>>>>>>> 587a66384d1f1407e8bded8e2fd7dbf111f4eee9

## License

Licensed under the [MIT License](./LICENSE).
