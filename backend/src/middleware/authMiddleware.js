const jwt = require("jsonwebtoken");
const User = require("../models/User");

const normalizeDecodedUser = (decoded) => {
  const userId = decoded?.userId
    ? String(decoded.userId)
    : decoded?._id
      ? String(decoded._id)
      : decoded?.id
        ? String(decoded.id)
        : "";

  const organizationId = decoded?.organizationId ? String(decoded.organizationId) : decoded?.orgId ? String(decoded.orgId) : "";
  const role = decoded?.role ? String(decoded.role) : "";
  const email = decoded?.email ? String(decoded.email) : "";

  return {
    userId,
    _id: userId,
    organizationId,
    role,
    email,
  };
};

const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = normalizeDecodedUser(decoded);
    if (!user.userId || !user.organizationId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const dbUser = await User.findOne({ _id: user.userId, organizationId: user.organizationId })
      .select("_id role email")
      .lean();

    if (!dbUser || !dbUser.role) {
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log("DB ROLE:", dbUser.role);

    req.user = {
      ...user,
      role: String(dbUser.role),
      email: String(dbUser.email || user.email || ""),
    };

    return next();
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const permit = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

module.exports = { protect, permit };