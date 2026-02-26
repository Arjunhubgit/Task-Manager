require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const { startConversationCleanup } = require("./utils/conversationCleanup");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messagingRoutes = require("./routes/messagingRoutes");
const hostRoutes = require("./routes/hostRoutes");
const inviteRoutes = require("./routes/inviteRoutes");

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) =>
  allowedOrigins.includes("*") || allowedOrigins.includes(origin);

// Middleware to handle CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Database Connection
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/invites", inviteRoutes);
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));

// Server uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start conversation cleanup job
startConversationCleanup();

// --- Socket.io Setup ---
const http = require("http").createServer(app);
const io = require("socket.io")(http, { 
  cors: { 
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      return callback("Not allowed by CORS", false);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  transports: ['websocket', 'polling'],
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user to their own room for private messaging
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room.`);
  });

  // Handle sending a message
  socket.on("sendMessage", (data) => {
    // data: { recipientId, message }
    io.to(data.recipientId).emit("receiveMessage", data);
    // Optionally, save message to DB here
  });

  // Handle typing indicator
  socket.on("typing", (data) => {
    // data: { senderId, recipientId }
    io.to(data.recipientId).emit("typing", data);
  });

  // Handle user status change - broadcast to all connected clients
  socket.on("updateUserStatus", (data) => {
    // data: { userId, status }
    console.log(`User ${data.userId} status changed to: ${data.status}`);
    // Broadcast to all connected clients
    io.emit("userStatusChanged", {
      userId: data.userId,
      status: data.status,
      timestamp: new Date()
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Start Server
const PORT = process.env.PORT || 8000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));


