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
  languages: ["hi", "en", "te"],
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
      te: { name: "సాధారణ వైద్య విభాగం", description: "జ్వరం, దగ్గు, బీపీ, షుగర్" },
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
      te: { name: "పిల్లల వైద్య విభాగం", description: "14 సంవత్సరాల లోపు పిల్లల అనారోగ్యం" },
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
      te: { name: "మహిళలు మరియు ప్రసూతి విభాగం", description: "గర్భధారణ పరీక్షలు, మహిళల ఆరోగ్యం" },
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
      te: { name: "ఎముకలు మరియు కీళ్ల విభాగం", description: "మోకాలు, నడుము నొప్పి, ఫ్రాక్చర్" },
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
      te: { name: "చెవి, ముక్కు మరియు గొంతు విభాగం", description: "చెవి నొప్పి, ముక్కు దిబ్బడ, గొంతు నొప్పి" },
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
      te: { name: "కంటి వైద్య విభాగం", description: "మసక దృష్టి, ఎర్రబడిన లేదా నొప్పిగల కళ్లు" },
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
      te: { name: "చర్మ వ్యాధుల విభాగం", description: "దద్దుర్లు, దురద, చర్మ సమస్యలు" },
    },
  },
];

const doctors = [
  { name: "Dr. Anita Sharma", email: "anita@queuemitra.test", dept: "MED", room: "Room 1", specialty: "Internal Medicine", consultationFee: 20 },
  { name: "Dr. Rakesh Verma", email: "rakesh@queuemitra.test", dept: "MED", room: "Room 2", specialty: "General Physician", consultationFee: 20 },
  { name: "Dr. Meena Iyer", email: "meena@queuemitra.test", dept: "CHD", room: "Room 3", specialty: "Pediatrics & Child Care", consultationFee: 20 },
  { name: "Dr. Sunita Rao", email: "sunita@queuemitra.test", dept: "WOM", room: "Room 4", specialty: "Obstetrics & Gynaecology", consultationFee: 30 },
  { name: "Dr. Imran Khan", email: "imran@queuemitra.test", dept: "ORT", room: "Room 5", specialty: "Orthopedic Surgery", consultationFee: 30 },
  { name: "Dr. Priya Nair", email: "priya@queuemitra.test", dept: "ENT", room: "Room 6", specialty: "ENT Specialist", consultationFee: 20 },
  { name: "Dr. Arjun Mehta", email: "arjun@queuemitra.test", dept: "EYE", room: "Room 7", specialty: "Ophthalmology", consultationFee: 20 },
  { name: "Dr. Kavita Joshi", email: "kavita@queuemitra.test", dept: "SKN", room: "Room 8", specialty: "Dermatology", consultationFee: 25 },
];

export async function seedData({ reset = false } = {}) {
  const Patient = (await import("../models/Patient.js")).default;
  const Appointment = (await import("../models/Appointment.js")).default;
  const Bill = (await import("../models/Bill.js")).default;

  if (reset) {
    await Promise.all([
      Ticket.deleteMany({}),
      Counter.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      Bill.deleteMany({}),
    ]);
    console.log("Cleared tickets, counters, patients, appointments, and bills");
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

  const docUsers = [];
  for (const doc of doctors) {
    let u = await User.findOne({ email: doc.email });
    if (!u) {
      u = await User.create({
        name: doc.name,
        email: doc.email,
        password: SAMPLE_PASSWORD,
        role: "doctor",
        hospital: cdh._id,
        department: byCode[doc.dept]._id,
        room: doc.room,
        specialty: doc.specialty,
        consultationFee: doc.consultationFee,
        status: { state: "available" },
      });
    } else {
      u.specialty = doc.specialty;
      u.consultationFee = doc.consultationFee;
      u.status.state = "available";
      await u.save();
    }
    docUsers.push(u);
  }
  console.log(`Doctors: ${doctors.length} (password for all: ${SAMPLE_PASSWORD})`);

  let admin = await User.findOne({ email: "admin@queuemitra.test" });
  if (!admin) {
    admin = await User.create({
      name: "Asha Kulkarni",
      email: "admin@queuemitra.test",
      password: SAMPLE_PASSWORD,
      role: "admin",
      hospital: cdh._id,
    });
  }
  console.log(`Admin user: ${admin.name} (${admin.email})`);

  // Seed sample patients
  const samplePatients = [
    { patientId: "CDH-P-1001", firstName: "Ramesh", lastName: "Kumar", gender: "male", age: 52, mobile: "9876543211", bloodGroup: "O+", city: "Jammu", emergencyContact: { name: "Suman Kumar", relation: "Wife", phone: "9876543212" } },
    { patientId: "CDH-P-1002", firstName: "Priya", lastName: "Sharma", gender: "female", age: 29, mobile: "9876543213", bloodGroup: "B+", city: "Jammu", emergencyContact: { name: "Rohit Sharma", relation: "Husband", phone: "9876543214" } },
    { patientId: "CDH-P-1003", firstName: "Aarav", lastName: "Verma", gender: "male", age: 7, mobile: "9876543215", bloodGroup: "A+", city: "Samba", emergencyContact: { name: "Rajesh Verma", relation: "Father", phone: "9876543216" } },
    { patientId: "CDH-P-1004", firstName: "Lakshmi", lastName: "Devi", gender: "female", age: 68, mobile: "9876543217", bloodGroup: "AB+", city: "Kathua", emergencyContact: { name: "Vikas Sharma", relation: "Son", phone: "9876543218" } },
    { patientId: "CDH-P-1005", firstName: "Sunil", lastName: "Gupta", gender: "male", age: 45, mobile: "9876543219", bloodGroup: "O-", city: "Jammu", emergencyContact: { name: "Pooja Gupta", relation: "Wife", phone: "9876543220" } },
    { patientId: "CDH-P-1006", firstName: "Fatima", lastName: "Begum", gender: "female", age: 34, mobile: "9876543221", bloodGroup: "B-", city: "Udhampur", emergencyContact: { name: "Farooq Ahmed", relation: "Husband", phone: "9876543222" } },
    { patientId: "CDH-P-1007", firstName: "Harish", lastName: "Chander", gender: "male", age: 61, mobile: "9876543223", bloodGroup: "A-", city: "Jammu", emergencyContact: { name: "Amit Chander", relation: "Son", phone: "9876543224" } },
    { patientId: "CDH-P-1008", firstName: "Ananya", lastName: "Singh", gender: "female", age: 24, mobile: "9876543225", bloodGroup: "O+", city: "Jammu", emergencyContact: { name: "Vikram Singh", relation: "Brother", phone: "9876543226" } },
  ];

  const seededPatients = [];
  for (const p of samplePatients) {
    const existing = await Patient.findOne({ patientId: p.patientId });
    if (!existing) {
      const created = await Patient.create({
        ...p,
        hospital: cdh._id,
        address: { city: p.city, state: "Jammu and Kashmir", pincode: "180001" },
      });
      seededPatients.push(created);
    } else {
      seededPatients.push(existing);
    }
  }
  console.log(`Patients seeded in registry: ${seededPatients.length}`);

  // Seed sample appointments for today
  const today = new Date().toISOString().slice(0, 10);
  const sampleAppointments = [
    { appointmentId: "APT-2026-1001", patientIndex: 0, dept: "MED", docIndex: 0, slotTime: "09:00 AM", type: "walk_in", status: "completed", complaint: "High fever and persistent cough", diagnosis: "Acute upper respiratory tract infection", followUpDate: "2026-10-31" },
    { appointmentId: "APT-2026-1002", patientIndex: 1, dept: "WOM", docIndex: 3, slotTime: "09:30 AM", type: "scheduled", status: "completed", complaint: "Routine second-trimester prenatal check", diagnosis: "Healthy pregnancy progression", followUpDate: "2026-11-20" },
    { appointmentId: "APT-2026-1003", patientIndex: 2, dept: "CHD", docIndex: 2, slotTime: "10:00 AM", type: "walk_in", status: "in_queue", complaint: "Child fever, throat pain and weakness" },
    { appointmentId: "APT-2026-1004", patientIndex: 3, dept: "EYE", docIndex: 6, slotTime: "10:30 AM", type: "scheduled", status: "in_queue", complaint: "Blurry vision and cataract examination" },
    { appointmentId: "APT-2026-1005", patientIndex: 4, dept: "ORT", docIndex: 4, slotTime: "11:00 AM", type: "scheduled", status: "booked", complaint: "Chronic knee pain and difficulty walking" },
    { appointmentId: "APT-2026-1006", patientIndex: 5, dept: "SKN", docIndex: 7, slotTime: "11:30 AM", type: "walk_in", status: "booked", complaint: "Skin rash and severe itching on arms" },
  ];

  for (const a of sampleAppointments) {
    const existing = await Appointment.findOne({ appointmentId: a.appointmentId });
    if (existing) continue;

    const patient = seededPatients[a.patientIndex] || seededPatients[0];
    const dept = byCode[a.dept];
    const doc = docUsers[a.docIndex] || docUsers[0];

    await Appointment.create({
      appointmentId: a.appointmentId,
      hospital: cdh._id,
      patient: patient._id,
      patientId: patient.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      patientMobile: patient.mobile,
      patientGender: patient.gender,
      patientAge: patient.age,
      doctor: doc._id,
      doctorName: doc.name,
      department: dept._id,
      departmentCode: dept.code,
      appointmentDate: today,
      slotTime: a.slotTime,
      type: a.type,
      status: a.status,
      complaint: a.complaint,
      diagnosis: a.diagnosis || "",
      followUpDate: a.followUpDate,
    });
  }
  console.log(`Appointments seeded: ${sampleAppointments.length}`);

  // Seed sample bills
  const sampleBills = [
    { invoiceNumber: "INV-2026-1001", patientIndex: 0, dept: "MED", fee: 20, discountOrWaiver: 0, netAmount: 20, paymentStatus: "paid", paymentMode: "cash" },
    { invoiceNumber: "INV-2026-1002", patientIndex: 1, dept: "WOM", fee: 30, discountOrWaiver: 0, netAmount: 30, paymentStatus: "paid", paymentMode: "upi" },
    { invoiceNumber: "INV-2026-1003", patientIndex: 2, dept: "CHD", fee: 20, discountOrWaiver: 0, netAmount: 20, paymentStatus: "paid", paymentMode: "cash" },
    { invoiceNumber: "INV-2026-1004", patientIndex: 3, dept: "EYE", fee: 20, discountOrWaiver: 20, netAmount: 0, paymentStatus: "waived", paymentMode: "exemption", waiverReason: "Senior Citizen" },
    { invoiceNumber: "INV-2026-1005", patientIndex: 4, dept: "ORT", fee: 30, discountOrWaiver: 0, netAmount: 30, paymentStatus: "pending", paymentMode: "cash" },
  ];

  for (const b of sampleBills) {
    const existing = await Bill.findOne({ invoiceNumber: b.invoiceNumber });
    if (existing) continue;

    const patient = seededPatients[b.patientIndex] || seededPatients[0];
    await Bill.create({
      invoiceNumber: b.invoiceNumber,
      hospital: cdh._id,
      patient: patient._id,
      patientId: patient.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      patientMobile: patient.mobile,
      departmentCode: b.dept,
      serviceDate: today,
      fee: b.fee,
      discountOrWaiver: b.discountOrWaiver,
      netAmount: b.netAmount,
      paymentStatus: b.paymentStatus,
      paymentMode: b.paymentMode,
      waiverReason: b.waiverReason || "None",
    });
  }
  console.log(`Bills seeded: ${sampleBills.length}`);

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
