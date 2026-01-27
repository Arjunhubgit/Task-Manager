const AuditLog = require("../models/AuditLog");

const logActivity = async (adminId, action, target, details = {}, req = null) => {
  try {
    const ipAddress = req ? req.headers['x-forwarded-for'] || req.socket.remoteAddress : null;
    
    await AuditLog.create({
      adminId,
      action,
      target,
      details,
      ipAddress
    });
    console.log(`[AUDIT] Admin ${adminId} performed ${action} on ${target}`);
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't crash the app if logging fails
  }
};

module.exports = { logActivity };