
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (token && token.startsWith("Bearer")) {
      token = token.split(" ")[1]; // Extract token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } else {
      res.status(401).json({ message: "Not authorized, no token" });
    }
  } catch (error) {
    res.status(401).json({ message: "Token failed", error: error.message });
  }
};


// Middleware for Admin-only access
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied, admin only" });
  }
};

// Middleware for Host-only access (God Mode)
const hostOnly = (req, res, next) => {
  if (req.user && req.user.role === "host") {
    next();
  } else {
    res.status(403).json({ message: "Access denied, host only" });
  }
};

// Middleware for Admin or Host access
const adminOrHost = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "host")) {
    next();
  } else {
    res.status(403).json({ message: "Access denied, admin or host only" });
  }
};

// Middleware to check if Admin can manage specific member (member belongs to this admin)
const canManageMember = async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const memberId = req.params.id;
      const member = await User.findById(memberId);
      
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Check if member belongs to this admin
      if (member.parentAdminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only manage your own members" });
      }
      next();
    } else if (req.user.role === "host") {
      // HOST can manage anyone
      next();
    } else {
      res.status(403).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Middleware to check if Host can manage specific admin (admin belongs to this host)
const canManageAdmin = async (req, res, next) => {
  try {
    if (req.user.role === "host") {
      const adminId = req.params.id;
      const admin = await User.findById(adminId);
      
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Check if admin belongs to this host
      if (admin.parentHostId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only manage your own admins" });
      }
      next();
    } else {
      res.status(403).json({ message: "Access denied, host only" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { protect, adminOnly, hostOnly, adminOrHost, canManageMember, canManageAdmin };

