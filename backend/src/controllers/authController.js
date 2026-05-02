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

const signup = async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = normalizeEmail(email);

    if (!trimmedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
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
      password,
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
    console.error("ERROR:", err);
    if (isDupKeyError(err)) return res.status(409).json({ message: "Email already exists" });
    return res.status(500).json({ message: "Server error", error: err?.message || String(err) });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const pw = typeof password === "string" ? password : "";

    if (!normalizedEmail || !pw) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
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
    console.error("ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err?.message || String(err) });
  }
};

module.exports = { signup, login };