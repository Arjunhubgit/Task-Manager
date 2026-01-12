require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messagingRoutes = require("./routes/messagingRoutes");
const hostRoutes = require("./routes/hostRoutes");
const inviteRoutes = require("./routes/inviteRoutes");

const app = express();

// Middleware to handle CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
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

// Server uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Socket.io Setup ---
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

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

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 8000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));


