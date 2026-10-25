// Templates the admin can pick from while adding departments (names, plain-words descriptions,
// translations and an icon key). Nothing here is created automatically: a department exists only
// after the admin adds it. `suggestedRoom` is the OPD room in the sample building where it usually sits.
import { PLACES } from "./hospitalMapData.js";

export const DEPARTMENT_CATALOG = [
  {
    code: "MED",
    name: "General Medicine",
    description: "fever, cough, BP, sugar",
    icon: "stethoscope",
    suggestedRoom: "Room 1",
    floor: 1,
    avgConsultMinutes: 6,
    seatingCapacity: 25,
    translations: {
      hi: { name: "सामान्य चिकित्सा", description: "बुखार, खांसी, बीपी, शुगर" },
      te: { name: "సాధారణ వైద్య విభాగం", description: "జ్వరం, దగ్గు, బీపీ, షుగర్" },
      ta: { name: "பொது மருத்துவம்", description: "காய்ச்சல், இருமல், ரத்த அழுத்தம், சர்க்கரை" },
    },
  },
  {
    code: "CHD",
    name: "Children",
    description: "illness in children under 14",
    icon: "baby",
    suggestedRoom: "Room 3",
    floor: 1,
    avgConsultMinutes: 8,
    seatingCapacity: 20,
    translations: {
      hi: { name: "बाल रोग विभाग", description: "14 वर्ष से कम उम्र के बच्चों की बीमारी" },
      te: { name: "పిల్లల వైద్య విభాగం", description: "14 సంవత్సరాల లోపు పిల్లల అనారోగ్యం" },
      ta: { name: "குழந்தைகள் நலப்பிரிவு", description: "14 வயதுக்குட்பட்ட குழந்தைகளின் நோய்கள்" },
    },
  },
  {
    code: "WOM",
    name: "Women and pregnancy",
    description: "pregnancy check-ups, women's health",
    icon: "pregnant",
    suggestedRoom: "Room 4",
    floor: 1,
    avgConsultMinutes: 10,
    seatingCapacity: 20,
    translations: {
      hi: { name: "महिला एवं प्रसूति रोग", description: "गर्भावस्था जांच, महिला स्वास्थ्य" },
      te: { name: "మహిళలు మరియు ప్రసూతి విభాగం", description: "గర్భధారణ పరీక్షలు, మహిళల ఆరోగ్యం" },
      ta: { name: "மகளிர் மற்றும் மகப்பேறு", description: "கர்ப்பகால பரிசோதனை, பெண்கள் நலம்" },
    },
  },
  {
    code: "ORT",
    name: "Bones and joints",
    description: "pain in knee, back, fracture",
    icon: "bone",
    suggestedRoom: "Room 5",
    floor: 1,
    avgConsultMinutes: 8,
    seatingCapacity: 15,
    translations: {
      hi: { name: "हड्डी एवं जोड़ रोग", description: "घुटने, पीठ का दर्द, फ्रैक्चर" },
      te: { name: "ఎముకలు మరియు కీళ్ల విభాగం", description: "మోకాలు, నడుము నొప్పి, ఫ్రాక్చర్" },
      ta: { name: "எலும்பு மற்றும் மூட்டு", description: "முழங்கால், முதுகு வலி, எலும்பு முறிவு" },
    },
  },
  {
    code: "ENT",
    name: "Ear, nose and throat",
    description: "ear pain, blocked nose, throat pain",
    icon: "ear",
    suggestedRoom: "Room 6",
    floor: 1,
    avgConsultMinutes: 7,
    seatingCapacity: 15,
    translations: {
      hi: { name: "कान, नाक एवं गला", description: "कान दर्द, बंद नाक, गले में दर्द" },
      te: { name: "చెవి, ముక్కు మరియు గొంతు విభాగం", description: "చెవి నొప్పి, ముక్కు దిబ్బడ, గొంతు నొప్పి" },
      ta: { name: "காது, மூக்கு மற்றும் தொண்டை", description: "காது வலி, மூக்கடைப்பு, தொண்டை வலி" },
    },
  },
  {
    code: "EYE",
    name: "Eyes",
    description: "blurry vision, red or painful eyes",
    icon: "eye",
    suggestedRoom: "Room 7",
    floor: 1,
    avgConsultMinutes: 7,
    seatingCapacity: 15,
    translations: {
      hi: { name: "नेत्र रोग विभाग", description: "धुंधली दृष्टि, लाल या दर्दनाक आंखें" },
      te: { name: "కంటి వైద్య విభాగం", description: "మసక దృష్టి, ఎర్రబడిన లేదా నొప్పిగల కళ్లు" },
      ta: { name: "கண் மருத்துவ பிரிவு", description: "பார்வை மங்கல், கண் சிவத்தல் அல்லது வலி" },
    },
  },
  {
    code: "SKN",
    name: "Skin",
    description: "rash, itching, skin problems",
    icon: "skin",
    suggestedRoom: "Room 8",
    floor: 1,
    avgConsultMinutes: 6,
    seatingCapacity: 15,
    translations: {
      hi: { name: "त्वचा रोग विभाग", description: "चकत्ते, खुजली, त्वचा की समस्याएं" },
      te: { name: "చర్మ వ్యాధుల విభాగం", description: "దద్దుర్లు, దురద, చర్మ సమస్యలు" },
      ta: { name: "தோல் மருத்துவ பிரிவு", description: "தோல் தடிப்பு, அரிப்பு, தோல் பிரச்சனைகள்" },
    },
  },
];

export const ICONS = [...new Set(DEPARTMENT_CATALOG.map((d) => d.icon))];

export function catalogEntry(code) {
  return DEPARTMENT_CATALOG.find((d) => d.code === String(code ?? "").toUpperCase()) ?? null;
}

// OPD rooms in the building map that a department can be assigned to.
export const OPD_ROOMS = PLACES.filter((p) => p.category === "opd_room").map((p) => ({
  id: p.id,
  name: p.name,
  floor: p.floor,
  landmark: p.landmark,
}));

// "Room 1", "room 1", "room_1" -> the canonical room ({ id, name, ... }) or null.
export function resolveRoom(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  return OPD_ROOMS.find((r) => r.name.toLowerCase() === v || r.id === v || r.id === v.replace(/\s+/g, "_")) ?? null;
}
