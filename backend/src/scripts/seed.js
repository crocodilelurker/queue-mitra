// Seeds the sample hospital (City District Hospital), its departments (first floor, OPD rooms 1-8),
// staff PIN, seating capacities, multilingual translations, and doctors.
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
  staffPin: "1234",
  languages: ["en", "hi", "ta"],
};

const departments = [
  {
    code: "MED",
    name: "General Medicine",
    description: "fever, cough, BP, sugar",
    floor: 1,
    rooms: ["Room 1", "Room 2"],
    avgConsultMinutes: 6,
    seatingCapacity: 25,
    translations: {
      hi: { name: "सामान्य चिकित्सा", description: "बुखार, खांसी, बीपी, शुगर" },
      ta: { name: "பொது மருத்துவம்", description: "காய்ச்சல், இருமல், ரத்த அழுத்தம், சர்க்கரை" },
    },
  },
  {
    code: "CHD",
    name: "Children",
    description: "illness in children under 14",
    floor: 1,
    rooms: ["Room 3"],
    avgConsultMinutes: 8,
    seatingCapacity: 20,
    translations: {
      hi: { name: "बाल रोग विभाग", description: "14 वर्ष से कम उम्र के बच्चों की बीमारी" },
      ta: { name: "குழந்தைகள் நலப்பிரிவு", description: "14 வயதுக்குட்பட்ட குழந்தைகளின் நோய்கள்" },
    },
  },
  {
    code: "WOM",
    name: "Women and pregnancy",
    description: "pregnancy check-ups, women's health",
    floor: 1,
    rooms: ["Room 4"],
    avgConsultMinutes: 10,
    seatingCapacity: 20,
    translations: {
      hi: { name: "महिला एवं प्रसूति रोग", description: "गर्भावस्था जांच, महिला स्वास्थ्य" },
      ta: { name: "மகளிர் மற்றும் மகப்பேறு", description: "கர்ப்பகால பரிசோதனை, பெண்கள் நலம்" },
    },
  },
  {
    code: "ORT",
    name: "Bones and joints",
    description: "pain in knee, back, fracture",
    floor: 1,
    rooms: ["Room 5"],
    avgConsultMinutes: 8,
    seatingCapacity: 15,
    translations: {
      hi: { name: "हड्डी एवं जोड़ रोग", description: "घुटने, पीठ का दर्द, फ्रैक्चर" },
      ta: { name: "எலும்பு மற்றும் மூட்டு", description: "முழங்கால், முதுகு வலி, எலும்பு முறிவு" },
    },
  },
  {
    code: "ENT",
    name: "Ear, nose and throat",
    description: "ear pain, blocked nose, throat pain",
    floor: 1,
    rooms: ["Room 6"],
    avgConsultMinutes: 7,
    seatingCapacity: 15,
    translations: {
      hi: { name: "कान, नाक एवं गला", description: "कान दर्द, बंद नाक, गले में दर्द" },
      ta: { name: "காது, மூக்கு மற்றும் தொண்டை", description: "காது வலி, மூக்கடைப்பு, தொண்டை வலி" },
    },
  },
  {
    code: "EYE",
    name: "Eyes",
    description: "blurry vision, red or painful eyes",
    floor: 1,
    rooms: ["Room 7"],
    avgConsultMinutes: 7,
    seatingCapacity: 15,
    translations: {
      hi: { name: "नेत्र रोग विभाग", description: "धुंधली दृष्टि, लाल या दर्दनाक आंखें" },
      ta: { name: "கண் மருத்துவ பிரிவு", description: "பார்வை மங்கல், கண் சிவத்தல் அல்லது வலி" },
    },
  },
  {
    code: "SKN",
    name: "Skin",
    description: "rash, itching, skin problems",
    floor: 1,
    rooms: ["Room 8"],
    avgConsultMinutes: 6,
    seatingCapacity: 15,
    translations: {
      hi: { name: "त्वचा रोग विभाग", description: "चकत्ते, खुजली, त्वचा की समस्याएं" },
      ta: { name: "தோல் மருத்துவ பிரிவு", description: "தோல் தடிப்பு, அரிப்பு, தோல் பிரச்சனைகள்" },
    },
  },
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

export async function seedData({ reset = false } = {}) {
  if (reset) {
    await Promise.all([Ticket.deleteMany({}), Counter.deleteMany({})]);
    console.log("Cleared tickets and counters");
  }

  const cdh = await Hospital.findOneAndUpdate({ code: hospital.code }, hospital, {
    upsert: true,
    returnDocument: "after",
  });
  console.log(`Hospital: ${cdh.name} (${cdh.code}) | Staff PIN: ${cdh.staffPin}`);

  const byCode = {};
  for (const dept of departments) {
    byCode[dept.code] = await Department.findOneAndUpdate(
      { hospital: cdh._id, code: dept.code },
      { ...dept, hospital: cdh._id },
      { upsert: true, returnDocument: "after" }
    );
  }
  console.log(`Departments seeded: ${departments.length}`);

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

  // Create default staff kiosk account
  const staffEmail = `staff-${cdh.code.toLowerCase()}@queuemitra.test`;
  const existingStaff = await User.findOne({ email: staffEmail });
  if (!existingStaff) {
    await User.create({
      name: `${cdh.code} Registration & Enquiry Staff`,
      email: staffEmail,
      password: "staffPassword123!",
      role: "staff",
      hospital: cdh._id,
    });
    console.log(`Staff account created: ${staffEmail}`);
  }
}

async function seed() {
  await connectDB();
  const reset = process.argv.includes("--reset");
  await seedData({ reset });
  await disconnectDB();
}

if (process.argv[1]?.endsWith("seed.js")) {
  seed().catch(async (err) => {
    console.error(err);
    await disconnectDB();
    process.exit(1);
  });
}
