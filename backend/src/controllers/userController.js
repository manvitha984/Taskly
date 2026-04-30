const User = require("../models/User");
const Organization = require("../models/Organization");

const allowedRoles = new Set(["admin", "leader", "user"]);

const sanitizeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  organizationId: u.organizationId,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ organizationId: req.user.organizationId }).select(
      "_id name email role organizationId createdAt updatedAt"
    );
    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const finalRole = role || "user";
    if (!allowedRoles.has(finalRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const orgId = req.user.organizationId;
    const org = await Organization.findById(orgId).select("_id");
    if (!org) return res.status(400).json({ message: "Organization not found" });

    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
      organizationId: orgId,
    });

    await Organization.updateOne({ _id: orgId }, { $addToSet: { members: user._id } });

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!allowedRoles.has(role)) return res.status(400).json({ message: "Invalid role" });

    const orgId = req.user.organizationId;
    const user = await User.findOne({ _id: req.params.id, organizationId: orgId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent removing the last admin in an org
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ organizationId: orgId, role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot remove the last admin from the organization" });
      }
    }

    user.role = role;
    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getUsers, createUser, updateUserRole };