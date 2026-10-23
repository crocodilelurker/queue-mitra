import { Server } from "socket.io";
import env from "../config/env.js";
import { verifyToken } from "../services/authService.js";

let io = null;

export const rooms = {
  department: (departmentId) => `department:${departmentId}`,
  ticket: (publicId) => `ticket:${publicId}`,
  // Staff and board rooms are per hospital so flags and calls never leak between hospitals.
  staff: (hospitalId) => `staff:${hospitalId}`,
  board: (hospitalId) => `board:${hospitalId}`,
};

function readCookie(header = "", name) {
  const match = header.split(";").find((part) => part.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Auth is optional: patients and the board connect anonymously,
  // doctors connect with their token and are put in the staff room.
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
    if (user?.role === "doctor" && user.hospital) {
      socket.join(rooms.staff(user.hospital));
    }

    socket.on("department:join", (departmentId) => socket.join(rooms.department(departmentId)));
    socket.on("department:leave", (departmentId) => socket.leave(rooms.department(departmentId)));
    socket.on("ticket:join", (publicId) => socket.join(rooms.ticket(publicId)));
    socket.on("ticket:leave", (publicId) => socket.leave(rooms.ticket(publicId)));
    socket.on("board:join", (hospitalId) => socket.join(rooms.board(hospitalId)));
  });

  return io;
}

// Emitting is a no-op when sockets aren't running (e.g. in the seed script).
export function emit(roomNames, event, payload) {
  if (!io) return;
  io.to(roomNames).emit(event, payload);
}
