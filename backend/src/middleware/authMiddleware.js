const jwt = require("jsonwebtoken");

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

const protect = (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = normalizeDecodedUser(decoded);
    if (!user.userId || !user.organizationId || !user.role) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
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