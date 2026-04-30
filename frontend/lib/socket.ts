import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentToken: string | null = null;

const socketBaseUrl = () => {
  const api = String(process.env.NEXT_PUBLIC_API_URL || "");
  if (!api) return "";
  return api.endsWith("/api") ? api.slice(0, -4) : api;
};

const attachBaseDebugHandlers = (s: Socket) => {
  s.off("connect");
  s.off("disconnect");
  s.off("connect_error");
  s.off("reconnect_attempt");

  s.on("connect", () => {
    console.log("[socket-client] connected", { id: s.id, url: socketBaseUrl() });
  });

  s.on("disconnect", (reason) => {
    console.log("[socket-client] disconnected", { reason });
  });

  s.on("connect_error", (err) => {
    console.log("[socket-client] connect_error", { message: err?.message });
  });

  s.io.on("reconnect_attempt", (attempt) => {
    console.log("[socket-client] reconnect_attempt", { attempt });
  });
};

export const getSocket = (token: string) => {
  if (!token) throw new Error("Socket token missing");

  if (socket && currentToken === token) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  const baseUrl = socketBaseUrl();
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is missing (cannot derive socket base URL)");

  socket = io(baseUrl, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });

  attachBaseDebugHandlers(socket);
  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = null;
};