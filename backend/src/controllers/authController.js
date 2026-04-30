const User = require("../models/User");
const Organization = require("../models/Organization");
const generateToken = require("../utils/generateToken");

const signup = async (req, res, next) => {
  try {
    const { name, email, password, organizationName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const org = await Organization.create({
      name: organizationName || `${name} Org`,
      members: [],
    });

    const user = await User.create({
      name,
      email,
      password,
      role: "admin",
      organizationId: org._id,
    });

    org.members.push(user._id);
    await org.save();

    const token = generateToken({
      userId: String(user._id),
      organizationId: String(user.organizationId),
      role: user.role,
      email: user.email,
    });

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({
      userId: String(user._id),
      organizationId: String(user.organizationId),
      role: user.role,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { signup, login };