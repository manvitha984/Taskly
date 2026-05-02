const { Server } = require("socket.io");
const socketAuth = require("./middleware/socketAuth");

let io = null;

const initSocket = (httpServer) => {
  if (io) {
    console.log("[socket] initSocket called but already initialized");
    return io;
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const allowedOrigins = new Set([clientUrl, "http://localhost:3000", "http://127.0.0.1:3000"]);

  io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.has(String(origin))) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
    transports: ["polling", "websocket"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  console.log("[socket] initialized", { clientUrl, path: "/socket.io", transports: ["polling", "websocket"] });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const user = socket?.data?.user || null;
    const orgId = user?.organizationId;

    console.log("[socket] connected", {
      socketId: socket.id,
      userId: user?.userId,
      orgId,
      role: user?.role,
    });

    if (!orgId) {
      console.log("[socket] disconnect (missing orgId)", { socketId: socket.id });
      socket.disconnect(true);
      return;
    }

    const room = `org_${orgId}`;
    socket.join(room);
    console.log("[socket] room-joined", { socketId: socket.id, room });

    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected", { socketId: socket.id, reason });
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIo };