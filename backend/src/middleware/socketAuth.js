const jwt = require("jsonwebtoken");

const extractToken = (socket) => {
  const authToken = socket?.handshake?.auth?.token;
  if (authToken) return String(authToken);

  const header =
    socket?.handshake?.headers?.authorization || socket?.handshake?.headers?.Authorization;

  if (header && typeof header === "string") {
    if (header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
    return header.trim();
  }

  const queryToken = socket?.handshake?.query?.token;
  if (queryToken) return String(queryToken);

  return "";
};

module.exports = (socket, next) => {
  const token = extractToken(socket);

  if (!token) {
    console.log("[socketAuth] missing token", {
      socketId: socket?.id,
      hasAuth: Boolean(socket?.handshake?.auth),
    });
    return next(new Error("Not authorized"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded?.userId ? String(decoded.userId) : "";
    const organizationId = decoded?.organizationId ? String(decoded.organizationId) : "";
    const role = decoded?.role ? String(decoded.role) : "";
    const email = decoded?.email ? String(decoded.email) : "";

    if (!userId || !organizationId) {
      console.log("[socketAuth] invalid payload", {
        socketId: socket?.id,
        userId,
        organizationId,
      });
      return next(new Error("Not authorized"));
    }

    socket.data.user = { userId, organizationId, role, email };

    console.log("[socketAuth] ok", {
      socketId: socket?.id,
      userId,
      organizationId,
      role,
    });

    return next();
  } catch (err) {
    console.log("[socketAuth] jwt verify failed", {
      socketId: socket?.id,
      message: err?.message,
    });
    return next(new Error("Invalid token"));
  }
};