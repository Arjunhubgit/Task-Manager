const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");


// @desc    Create a new admin (Host only)
// @route   POST /api/users/admin
// @access  Private (Host)
const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hostId = req.user._id; // Current HOST user

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password." });
    }

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the admin with parent HOST id
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      parentHostId: hostId, // Set the parent HOST
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        parentHostId: user.parentHostId,
        message: "Admin created successfully!",
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create a new member (Admin only)
// @route   POST /api/users/
// @access  Private (Admin)
const createMember = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const adminId = req.user._id; // Current ADMIN user

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password." });
    }

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // 3. Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the member with parent ADMIN id
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "member",
      parentAdminId: adminId, // Set the parent ADMIN
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        parentAdminId: user.parentAdminId,
        message: "Member added successfully!",
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all users (Admin gets their members, Host gets all admins)
// @route   GET /api/users/
// @access  Private (Admin/Host)
const getUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = {};

    // If ADMIN, get only their members
    if (currentUser.role === "admin") {
      query = { parentAdminId: currentUser._id, role: "member" };
    }
    // If HOST, get all admins
    else if (currentUser.role === "host") {
      query = { parentHostId: currentUser._id, role: "admin" };
    }
    // If MEMBER, they shouldn't access this route
    else if (currentUser.role === "member") {
      return res.status(403).json({ message: "Members cannot view user list" });
    }

    const users = await User.find(query).select("-password");

    // Add task counts to each user and check for logout timeout
    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Completed",
        });

        // Check if user logged out more than 5 minutes ago and auto-set status to invisible
        let userStatus = user.status;
        if (user.lastLogoutTime) {
          const now = new Date();
          const timeSinceLogout = (now - new Date(user.lastLogoutTime)) / 1000 / 60; // Convert to minutes
          
          // If logged out more than 5 minutes ago and status is not already invisible, set it to invisible
          if (timeSinceLogout > 5 && user.status !== 'invisible') {
            await User.findByIdAndUpdate(user._id, { status: 'invisible' });
            userStatus = 'invisible';
          }
        }

        return {
          ...user._doc, // Include all existing user data
          status: userStatus,
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      })
    );

    res.json(usersWithTaskCounts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)

const deleteUser = async (req, res) => {
  try {
    // Attempt to delete
    const user = await User.findByIdAndDelete(req.params.id);

    // Check if the user was actually found and deleted
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found. They may have already been removed." 
      });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error during deletion", 
      error: error.message 
    });
  }
};

// @desc    Update user status or other fields
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status if provided
    if (status && !['online', 'idle', 'dnd', 'invisible'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        ...(status && { status })
      },
      { new: true } // Return updated document
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      success: true, 
      message: "User updated successfully",
      user 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error during update", 
      error: error.message 
    });
  }
};

// @desc    Get users for messaging (Admin and Member)
// @route   GET /api/users/for-messaging
// @access  Private (Admin and Member)
const getUsersForMessaging = async (req, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    let users;
    if (currentUser.role === 'admin') {
      // Admins can message all members (except themselves)
      users = await User.find({ _id: { $ne: currentUser._id }, role: 'member' }).select('-password');
    } else {
      // Members can message all admins (except themselves)
      users = await User.find({ _id: { $ne: currentUser._id }, role: 'admin' }).select('-password');
    }
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users globally (Host only - Super Admin access)
// @route   GET /api/host/users/global
// @access  Private (Host)
const getAllUsersGlobal = async (req, res) => {
  try {
    // Fetch both Admins and Members
    const users = await User.find({ role: { $in: ['admin', 'member'] } }).select("-password");

    // Add task counts and status handling
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Completed",
        });

        // Check if user logged out more than 5 minutes ago and auto-set status to invisible
        let userStatus = user.status;
        if (user.lastLogoutTime) {
          const now = new Date();
          const timeSinceLogout = (now - new Date(user.lastLogoutTime)) / 1000 / 60;
          
          if (timeSinceLogout > 5 && user.status !== 'invisible') {
            await User.findByIdAndUpdate(user._id, { status: 'invisible' });
            userStatus = 'invisible';
          }
        }

        return {
          ...user._doc,
          status: userStatus,
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      })
    );

    res.json({
      success: true,
      totalUsers: usersWithDetails.length,
      data: usersWithDetails,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Make sure to add it to your exports!
module.exports = { getUsers, getUserById, deleteUser, createMember, updateUser, getUsersForMessaging, getAllUsersGlobal, createAdmin };

