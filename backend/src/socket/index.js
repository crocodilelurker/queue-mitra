import { Server } from "socket.io";
import { corsOrigin } from "../config/cors.js";
import { verifyToken } from "../services/authService.js";

let io = null;

export const rooms = {
  department: (departmentId) => `department:${departmentId}`,
  ticket: (publicId) => `ticket:${publicId}`,
  // Staff and board rooms are per hospital so flags and calls never leak between hospitals.
  staff: (hospitalId) => `staff:${hospitalId}`,
  board: (hospitalId) => `board:${hospitalId}`,
};

const STAFF_ROOM_ROLES = ["doctor", "staff", "admin", "superadmin"];

function readCookie(header = "", name) {
  const match = header.split(";").find((part) => part.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 64;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  // Auth is optional: patients and the board connect anonymously,
  // signed-in doctors, staff and admins are put in their hospital's staff room.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || readCookie(socket.handshake.headers.cookie, "token");
    if (token) {
      try {
        socket.data.user = await verifyToken(token);
      } catch {
        // Treat an invalid token as an anonymous connection.
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (STAFF_ROOM_ROLES.includes(user?.role) && user.hospital) {
      socket.join(rooms.staff(String(user.hospital)));
    }

    socket.on("department:join", (id) => validId(id) && socket.join(rooms.department(id)));
    socket.on("department:leave", (id) => validId(id) && socket.leave(rooms.department(id)));
    socket.on("ticket:join", (publicId) => validId(publicId) && socket.join(rooms.ticket(publicId)));
    socket.on("ticket:leave", (publicId) => validId(publicId) && socket.leave(rooms.ticket(publicId)));
    socket.on("board:join", (hospitalId) => validId(hospitalId) && socket.join(rooms.board(hospitalId)));
    socket.on("board:leave", (hospitalId) => validId(hospitalId) && socket.leave(rooms.board(hospitalId)));
  });

  return io;
}

// Emitting is a no-op when sockets aren't running (e.g. in scripts).
export function emit(roomNames, event, payload) {
  if (!io) return;
  const list = (Array.isArray(roomNames) ? roomNames : [roomNames]).map(String);
  io.to(list).emit(event, payload);
}

// Every connected screen, signed in or not (setup finished, factory reset).
export function emitAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

// Generic "something changed, refetch" signal for dashboards and the board.
export function notifyHospital(hospitalId, reason, extra = {}) {
  if (!hospitalId) return;
  emit([rooms.staff(hospitalId), rooms.board(hospitalId)], "hospital:updated", {
    hospitalId: String(hospitalId),
    reason,
    at: new Date().toISOString(),
    ...extra,
  });
}

export function closeSocket() {
  return new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
  });
}
