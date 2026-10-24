import { connectDB, disconnectDB } from "../config/db.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Bill from "../models/Bill.js";
import Ticket from "../models/Ticket.js";
import Counter from "../models/Counter.js";

async function clean() {
  await connectDB();
  console.log("Purging all mock data from database...");
  
  const [patients, apts, bills, tickets, counters] = await Promise.all([
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Bill.deleteMany({}),
    Ticket.deleteMany({}),
    Counter.deleteMany({})
  ]);

  console.log(`Deleted:
  - Patients: ${patients.deletedCount}
  - Appointments: ${apts.deletedCount}
  - Bills: ${bills.deletedCount}
  - Tickets: ${tickets.deletedCount}
  - Counters: ${counters.deletedCount}`);

  console.log("Database successfully cleaned. 0 mock records remain.");
  await disconnectDB();
}

clean().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
