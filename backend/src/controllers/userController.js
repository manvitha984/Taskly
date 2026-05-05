const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");
const { getIo } = require("../socket");

const allowedRoles = new Set(["admin", "leader", "user"]);

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const sanitizeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  organizationId: u.organizationId,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

const requireOrgId = (req, res) => {
  const orgId = String(req.user?.organizationId || "");
  if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
    res.status(401).json({ message: "Not authorized" });
    return null;
  }
  return orgId;
};

const isDupKeyError = (err) => {
  const code = err?.code;
  return code === 11000 || code === 11001;
};

const logUserError = (label, meta) => {
  try {
    console.error(label, meta);
  } catch {
    console.error(label);
  }
};

const emitToOrg = (organizationId, eventName, payload) => {
  const room = `org_${organizationId}`;

  try {
    const io = getIo();
    io.to(room).emit(eventName, payload);
  } catch (err) {
    console.log("[socket] emit failed (io not ready?)", {
      eventName,
      room,
      message: err?.message,
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const users = await User.find({ organizationId: orgId })
      .select("_id name email role organizationId createdAt updatedAt")
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    return res.json(Array.isArray(users) ? users : []);
  } catch (err) {
    logUserError("USERS LIST ERROR", { code: err?.code, name: err?.name, userId: req.user?.userId, role: req.user?.role });
    return res.status(500).json({ message: "Server error" });
  }
};

const createUser = async (req, res) => {
  let normalizedEmail = "";
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { name, email, password, role } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    normalizedEmail = normalizeEmail(email);
    const pw = typeof password === "string" ? password : "";

    if (!trimmedName || !normalizedEmail || !pw) {
      return res.status(400).json({ message: "Validation error" });
    }
    if (pw.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const finalRole = role || "user";
    if (!allowedRoles.has(finalRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const org = await Organization.findById(orgId).select("_id").lean();
    if (!org) return res.status(400).json({ message: "Organization not found" });

    const exists = await User.findOne({ email: normalizedEmail }).select("_id").lean();
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: pw,
      role: finalRole,
      organizationId: orgId,
    });

    await Organization.updateOne({ _id: orgId }, { $addToSet: { members: user._id } });

    return res.status(201).json(sanitizeUser(user));
  } catch (err) {
    logUserError("CREATE USER ERROR", {
      code: err?.code,
      name: err?.name,
      email: normalizedEmail,
      userId: req.user?.userId,
      role: req.user?.role,
    });
    if (isDupKeyError(err)) return res.status(409).json({ message: "Email already exists" });
    return res.status(500).json({ message: "Server error" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { role } = req.body;
    if (!allowedRoles.has(role)) return res.status(400).json({ message: "Invalid role" });

    const user = await User.findOne({ _id: req.params.id, organizationId: orgId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ organizationId: orgId, role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot remove the last admin from the organization" });
      }
    }

    user.role = role;
    await user.save();

    emitToOrg(orgId, "user:role-updated", {
      userId: String(user._id),
      role: user.role,
    });

    return res.json(sanitizeUser(user));
  } catch (err) {
    logUserError("UPDATE USER ROLE ERROR", { code: err?.code, name: err?.name, userId: req.user?.userId, role: req.user?.role });
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getUsers, createUser, updateUserRole };