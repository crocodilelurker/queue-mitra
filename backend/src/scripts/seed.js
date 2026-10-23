// Seeds the sample hospital (City District Hospital), its departments (first floor, OPD rooms 1-8)
// and one sample doctor per room.
// All data is made up. Usage: npm run seed  (add -- --reset to also clear tickets and counters)
import { connectDB, disconnectDB } from "../config/db.js";
import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";

const SAMPLE_PASSWORD = "doctor123";

const hospital = {
  code: "CDH",
  name: "City District Hospital",
  type: "government",
  address: { line: "Hospital Road", city: "Jammu", state: "Jammu and Kashmir", pincode: "180001" },
  contact: { phone: "0191-0000000", emergencyPhone: "108" },
  floors: 3,
  languages: ["en", "hi"],
};

const departments = [
  { code: "MED", name: "General Medicine", description: "fever, cough, BP, sugar", floor: 1, rooms: ["Room 1", "Room 2"], avgConsultMinutes: 6 },
  { code: "CHD", name: "Children", description: "illness in children under 14", floor: 1, rooms: ["Room 3"], avgConsultMinutes: 8 },
  { code: "WOM", name: "Women and pregnancy", description: "pregnancy check-ups, women's health", floor: 1, rooms: ["Room 4"], avgConsultMinutes: 10 },
  { code: "ORT", name: "Bones and joints", description: "pain in knee, back, fracture", floor: 1, rooms: ["Room 5"], avgConsultMinutes: 8 },
  { code: "ENT", name: "Ear, nose and throat", description: "ear pain, blocked nose, throat pain", floor: 1, rooms: ["Room 6"], avgConsultMinutes: 7 },
  { code: "EYE", name: "Eyes", description: "blurry vision, red or painful eyes", floor: 1, rooms: ["Room 7"], avgConsultMinutes: 7 },
  { code: "SKN", name: "Skin", description: "rash, itching, skin problems", floor: 1, rooms: ["Room 8"], avgConsultMinutes: 6 },
];

const doctors = [
  { name: "Dr. Anita Sharma", email: "anita@queuemitra.test", dept: "MED", room: "Room 1" },
  { name: "Dr. Rakesh Verma", email: "rakesh@queuemitra.test", dept: "MED", room: "Room 2" },
  { name: "Dr. Meena Iyer", email: "meena@queuemitra.test", dept: "CHD", room: "Room 3" },
  { name: "Dr. Sunita Rao", email: "sunita@queuemitra.test", dept: "WOM", room: "Room 4" },
  { name: "Dr. Imran Khan", email: "imran@queuemitra.test", dept: "ORT", room: "Room 5" },
  { name: "Dr. Priya Nair", email: "priya@queuemitra.test", dept: "ENT", room: "Room 6" },
  { name: "Dr. Arjun Mehta", email: "arjun@queuemitra.test", dept: "EYE", room: "Room 7" },
  { name: "Dr. Kavita Joshi", email: "kavita@queuemitra.test", dept: "SKN", room: "Room 8" },
];

async function seed() {
  await connectDB();

  if (process.argv.includes("--reset")) {
    await Promise.all([Ticket.deleteMany({}), Counter.deleteMany({})]);
    console.log("Cleared tickets and counters");
  }

  const cdh = await Hospital.findOneAndUpdate({ code: hospital.code }, hospital, {
    upsert: true,
    returnDocument: "after",
  });
  console.log(`Hospital: ${cdh.name} (${cdh.code})`);

  const byCode = {};
  for (const dept of departments) {
    byCode[dept.code] = await Department.findOneAndUpdate(
      { hospital: cdh._id, code: dept.code },
      { ...dept, hospital: cdh._id },
      { upsert: true, returnDocument: "after" }
    );
  }
  console.log(`Departments: ${departments.length}`);

  for (const doc of doctors) {
    const existing = await User.findOne({ email: doc.email });
    if (existing) continue;
    await User.create({
      name: doc.name,
      email: doc.email,
      password: SAMPLE_PASSWORD,
      role: "doctor",
      hospital: cdh._id,
      department: byCode[doc.dept]._id,
      room: doc.room,
      status: { state: "available" },
    });
  }
  console.log(`Doctors: ${doctors.length} (password for all: ${SAMPLE_PASSWORD})`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
