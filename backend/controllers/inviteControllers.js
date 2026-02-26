const AdminInvite = require("../models/AdminInvite");
const User = require("../models/User");
const crypto = require("crypto");
const {
  createNotification,
  createNotificationsForUsers,
} = require("../utils/notificationService");

// Helper function to generate unique invite code
const generateInviteCode = () => {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
};

// @desc    Generate a new invite link for an admin
// @route   POST /api/invites/generate
// @access  Private (Admin only)
const generateInviteLink = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { description, maxUses, expiresInDays } = req.body;

    // 1. Validation - user must be ADMIN
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can generate invite links" });
    }

    // 2. Generate unique code
    let inviteCode;
    let isUnique = false;
    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existing = await AdminInvite.findOne({ inviteCode });
      isUnique = !existing;
    }

    // 3. Calculate expiry date if provided
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // 4. Generate invite link
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${baseUrl}/signup?invite=${inviteCode}`;

    // 5. Create invite record
    const invite = await AdminInvite.create({
      adminId,
      inviteCode,
      inviteLink,
      maxUses: maxUses || null,
      expiresAt,
      description: description || `Invite from ${req.user.name}`,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: invite._id,
        inviteCode: invite.inviteCode,
        inviteLink: invite.inviteLink,
        description: invite.description,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt,
        isActive: invite.isActive,
        timesUsed: invite.timesUsed,
        createdAt: invite.createdAt,
      },
      message: "Invite link generated successfully!",
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get all invite links for current admin
// @route   GET /api/invites/my-invites
// @access  Private (Admin only)
const getMyInvites = async (req, res) => {
  try {
    const adminId = req.user._id;

    // 1. Validation
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view invites" });
    }

    // 2. Get all invites for this admin
    const invites = await AdminInvite.find({ adminId })
      .sort({ createdAt: -1 })
      .populate("usedBy.userId", "name email");

    res.json({
      success: true,
      total: invites.length,
      data: invites,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Verify and get details of an invite
// @route   GET /api/invites/verify/:inviteCode
// @access  Public
const verifyInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    // 1. Find the invite
    const invite = await AdminInvite.findOne({ 
      inviteCode: inviteCode.toUpperCase() 
    }).populate("adminId", "name email");

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: "Invalid invite code" 
      });
    }

    // 2. Check if invite is active
    if (!invite.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: "This invite has been deactivated" 
      });
    }

    // 3. Check if invite has expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
      return res.status(400).json({ 
        success: false, 
        message: "This invite has expired" 
      });
    }

    // 4. Check if max uses has been reached
    if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
      await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
      return res.status(400).json({ 
        success: false, 
        message: "This invite has reached its usage limit" 
      });
    }

    // 5. Return invite details
    res.json({
      success: true,
      data: {
        _id: invite._id,
        inviteCode: invite.inviteCode,
        adminId: invite.adminId._id,
        adminName: invite.adminId.name,
        adminEmail: invite.adminId.email,
        description: invite.description,
        isValid: true,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Join a team using invite code for a logged-in member
// @route   POST /api/invites/join
// @access  Private (Member only)
const joinTeamWithInvite = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const memberId = req.user?._id;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invite code is required",
      });
    }

    if (!memberId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "member") {
      return res.status(403).json({
        success: false,
        message: "Only members can join a team with an invite code",
      });
    }

    const member = await User.findById(memberId).select("-password");
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const invite = await AdminInvite.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
    }).populate("adminId", "_id name email");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code",
      });
    }

    if (!invite.isActive) {
      return res.status(400).json({
        success: false,
        message: "This invite has been deactivated",
      });
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
      return res.status(400).json({
        success: false,
        message: "This invite has expired",
      });
    }

    const targetAdminId = invite.adminId?._id?.toString();
    if (!targetAdminId) {
      return res.status(400).json({
        success: false,
        message: "Invalid invite owner",
      });
    }

    if (
      member.parentAdminId &&
      member.parentAdminId.toString() === targetAdminId
    ) {
      return res.status(400).json({
        success: false,
        message: "You are already in this team",
      });
    }

    const alreadyUsedByMember = (invite.usedBy || []).some(
      (usage) => usage.userId && usage.userId.toString() === memberId.toString()
    );

    if (
      invite.maxUses &&
      invite.timesUsed >= invite.maxUses &&
      !alreadyUsedByMember
    ) {
      await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
      return res.status(400).json({
        success: false,
        message: "This invite has reached its usage limit",
      });
    }

    if (!alreadyUsedByMember) {
      invite.timesUsed += 1;
      invite.usedBy.push({ userId: member._id });

      if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
        invite.isActive = false;
      }

      await invite.save();
    }

    member.parentAdminId = invite.adminId._id;
    member.role = "member";
    await member.save();

    await createNotification({
      userId: targetAdminId,
      type: "team_member",
      title: "New team member joined",
      message: `${member.name} joined your team using an invite code.`,
      relatedUserId: member._id,
    });

    const teammateIds = await User.find({
      parentAdminId: targetAdminId,
      role: "member",
      _id: { $ne: member._id },
    }).select("_id");

    await createNotificationsForUsers(
      teammateIds.map((teammate) => teammate._id),
      {
        type: "team_member",
        title: "New teammate joined",
        message: `${member.name} joined your team.`,
        relatedUserId: member._id,
      }
    );

    res.json({
      success: true,
      message: "Joined team successfully!",
      data: {
        user: {
          _id: member._id,
          role: member.role,
          parentAdminId: member.parentAdminId,
        },
        admin: {
          _id: invite.adminId._id,
          name: invite.adminId.name,
          email: invite.adminId.email,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Deactivate an invite link
// @route   PUT /api/invites/:inviteId/deactivate
// @access  Private (Admin only - owner)
const deactivateInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const adminId = req.user._id;

    // 1. Find invite
    const invite = await AdminInvite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    // 2. Check if user is the owner
    if (invite.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "You can only manage your own invites" });
    }

    // 3. Deactivate
    invite.isActive = false;
    await invite.save();

    res.json({
      success: true,
      message: "Invite deactivated successfully",
      data: invite,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Delete an invite link
// @route   DELETE /api/invites/:inviteId
// @access  Private (Admin only - owner)
const deleteInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const adminId = req.user._id;

    // 1. Find invite
    const invite = await AdminInvite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    // 2. Check if user is the owner
    if (invite.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "You can only delete your own invites" });
    }

    // 3. Delete
    await AdminInvite.findByIdAndDelete(inviteId);

    res.json({
      success: true,
      message: "Invite deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

module.exports = {
  generateInviteLink,
  getMyInvites,
  verifyInvite,
  joinTeamWithInvite,
  deactivateInvite,
  deleteInvite,
};
