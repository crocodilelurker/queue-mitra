import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { findHospital } from "../services/hospitalService.js";
import { serviceDate } from "../utils/date.js";

// GET /api/board/:hospitalCode: Public TV display feed for hospital waiting halls
export async function getBoardData(req, res) {
  const hospital = await findHospital(req.params.hospitalCode);
  const date = serviceDate();

  const departments = await Department.find({ hospital: hospital._id, isActive: true })
    .sort({ floor: 1, code: 1 })
    .lean();

  const boardRooms = [];

  for (const dept of departments) {
    const [calledTickets, waitingTickets, doctors] = await Promise.all([
      Ticket.find({ department: dept._id, serviceDate: date, status: "called" })
        .populate("doctor", "name room status")
        .sort({ calledAt: -1 })
        .lean(),
      Ticket.find({ department: dept._id, serviceDate: date, status: "waiting" })
        .sort({ sequence: 1 })
        .select("tokenNumber")
        .limit(3)
        .lean(),
      User.find({ department: dept._id, role: "doctor" })
        .select("name room status")
        .lean(),
    ]);

    // Format room-by-room status
    for (const roomName of dept.rooms) {
      const activeCall = calledTickets.find((t) => t.room === roomName);
      const roomDoctor = doctors.find((d) => d.room === roomName);

      const delayMinutes =
        roomDoctor?.status?.state === "running_late"
          ? roomDoctor.status.delayMinutes
          : 0;

      const currentToken = activeCall ? activeCall.tokenNumber : null;

      boardRooms.push({
        departmentCode: dept.code,
        departmentName: dept.name,
        departmentTranslations: dept.translations,
        floor: dept.floor,
        room: roomName,
        doctorName: roomDoctor?.name ?? "On Duty Doctor",
        doctorState: roomDoctor?.status?.state ?? "available",
        delayMinutes,
        nowServing: currentToken,
        nextTokens: waitingTickets.map((t) => t.tokenNumber),
        announcementText: currentToken
          ? {
              en: `Token ${currentToken}, please proceed to ${roomName} (${dept.name}) on Floor ${dept.floor}.`,
              hi: `टोकन ${currentToken}, कृपया पहली मंजिल पर ${roomName} (${dept.name}) में जाएं।`,
              ta: `டோக்கன் ${currentToken}, தயவுசெய்து தளம் ${dept.floor}-ல் உள்ள ${roomName}-க்கு செல்லவும்.`,
            }
          : null,
      });
    }
  }

  res.json({
    hospital: {
      code: hospital.code,
      name: hospital.name,
    },
    updatedAt: new Date().toISOString(),
    rooms: boardRooms,
  });
}
