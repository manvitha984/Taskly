const User = require("../models/User");
const Organization = require("../models/Organization");
const generateToken = require("../utils/generateToken");

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const authPayload = (user) => ({
  userId: String(user._id),
  organizationId: String(user.organizationId),
  role: String(user.role),
  email: String(user.email || ""),
});

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId,
});

const isDupKeyError = (err) => {
  const code = err?.code;
  return code === 11000 || code === 11001;
};

const logAuthError = (label, meta) => {
  try {
    console.error(label, meta);
  } catch {
    console.error(label);
  }
};

const signup = async (req, res) => {
  let normalizedEmail = "";
  try {
    const { name, email, password, organizationName } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    normalizedEmail = normalizeEmail(email);
    const pw = typeof password === "string" ? password : "";

    if (!trimmedName || !normalizedEmail || !pw) {
      return res.status(400).json({ message: "Validation error" });
    }
    if (pw.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: normalizedEmail }).select("_id").lean();
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const org = await Organization.create({
      name: typeof organizationName === "string" && organizationName.trim() ? organizationName.trim() : `${trimmedName} Org`,
      members: [],
    });

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: pw,
      role: "admin",
      organizationId: org._id,
    });

    await Organization.updateOne({ _id: org._id }, { $addToSet: { members: user._id } });

    const token = generateToken(authPayload(user));

    return res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (err) {
    logAuthError("AUTH SIGNUP ERROR", { code: err?.code, name: err?.name, email: normalizedEmail });
    if (isDupKeyError(err)) return res.status(409).json({ message: "Email already exists" });
    return res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  let normalizedEmail = "";
  try {
    const { email, password } = req.body;

    normalizedEmail = normalizeEmail(email);
    const pw = typeof password === "string" ? password : "";

    if (!normalizedEmail || !pw) {
      return res.status(400).json({ message: "Validation error" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    const ok = Boolean(user && (await user.comparePassword(pw)));

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(authPayload(user));

    return res.json({
      token,
      user: publicUser(user),
    });
  } catch (err) {
    logAuthError("AUTH LOGIN ERROR", { code: err?.code, name: err?.name, email: normalizedEmail });
    return res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  const userId = String(req.user?.userId || "");
  const orgId = String(req.user?.organizationId || "");
  try {
    if (!userId || !orgId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { currentPassword, newPassword } = req.body || {};
    const current = typeof currentPassword === "string" ? currentPassword : "";
    const next = typeof newPassword === "string" ? newPassword : "";

    if (!current || !next) {
      return res.status(400).json({ message: "Validation error" });
    }
    if (next.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ _id: userId, organizationId: orgId }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await user.comparePassword(current);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    user.password = next;
    await user.save();

    return res.json({ message: "Password updated" });
  } catch (err) {
    logAuthError("AUTH CHANGE PASSWORD ERROR", { code: err?.code, name: err?.name, userId, orgId });
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login, changePassword };