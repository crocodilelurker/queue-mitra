// Emergency-Safe Symptom Triage & Department Suggestion Service
// Strictly enforces the Hackcache p2.pdf rules:
// 1. Critical warning signs trigger immediate emergency guidance (112, 108, Casualty directions).
// 2. The app NEVER classifies a case as "safe" or diagnoses conditions.
// 3. For OPD cases, it offers department suggestions with plain-language reasons and pre-treatment comforting advice.

export const EMERGENCY_WARNING_SIGNS = [
  {
    key: "chest_pain",
    terms: ["chest pain", "heart attack", "left arm pain", "सीने में दर्द", "छाती में दर्द", "நெஞ்சு வலி", "மாரடைப்பு"],
    reasonEn: "Severe chest pain or suspected cardiac symptoms",
    reasonHi: "गंभीर सीने में दर्द या हृदय संबंधी लक्षण",
    reasonTa: "கடுமையான நெஞ்சு வலி அல்லது இதய அறிகுறிகள்",
  },
  {
    key: "breathing_difficulty",
    terms: ["trouble breathing", "cannot breathe", "gasping", "breathless", "सांस लेने में तकलीफ", "सांस फूलना", "மூச்சுத்திணறல்", "மூச்சு விட சிரமம்"],
    reasonEn: "Difficulty breathing or acute breathlessness",
    reasonHi: "सांस लेने में गंभीर कठिनाई",
    reasonTa: "சுவாசிப்பதில் கடுமையான சிரமம்",
  },
  {
    key: "heavy_bleeding",
    terms: ["heavy bleeding", "bleeding profusely", "blood loss", "भारी रक्तस्राव", "खून बहना", "ரத்தப்போக்கு", "அதிக ரத்தப்போக்கு"],
    reasonEn: "Heavy bleeding or severe wound",
    reasonHi: "अत्यधिक खून बहना",
    reasonTa: "அதிக இரத்தப்போக்கு",
  },
  {
    key: "unconscious",
    terms: ["unconscious", "fainted", "fainting", "passed out", "not waking up", "बेहोश", "बेहोशी", "மயக்கம்", "நினைவிழந்த நிலை"],
    reasonEn: "Unconsciousness, fainting, or unresponsiveness",
    reasonHi: "बेहोशी या जागने में असमर्थता",
    reasonTa: "மயக்கம் அல்லது நினைவிழந்த நிலை",
  },
  {
    key: "stroke_symptoms",
    terms: ["face drooping", "slurred speech", "sudden paralysis", "drooping face", "लकवा", "चेहरे का टेढ़ापन", "பக்கவாதம்", "முகம் ஒருபுறம் சாய்தல்"],
    reasonEn: "Sudden facial drooping, speech difficulty, or weakness (Stroke signs)",
    reasonHi: "अचानक चेहरे का टेढ़ापन या पक्षाघात के लक्षण",
    reasonTa: "திடீர் பக்கவாத அறிகுறிகள்",
  },
  {
    key: "severe_injury",
    terms: ["severe injury", "accident", "head injury", "deep cut", "गंभीर चोट", "दुर्घटना", "सिर की चोट", "விபத்து", "கடுமையான காயம்"],
    reasonEn: "Severe physical trauma or accident",
    reasonHi: "गंभीर दुर्घटना या चोट",
    reasonTa: "கடுமையான காயம் அல்லது விபத்து",
  },
  {
    key: "maternal_emergency",
    terms: ["pregnant bleeding", "severe labour pain", "pregnancy emergency", "गर्भावस्था में खून", "गर्भवती महिला को तेज दर्द", "கர்ப்பகால ரத்தப்போக்கு"],
    reasonEn: "Pregnant woman with bleeding or severe distress",
    reasonHi: "गर्भवती महिला में रक्तस्राव या तीव्र पीड़ा",
    reasonTa: "கர்ப்பிணிப் பெண்ணுக்கு இரத்தப்போக்கு அல்லது கடுமையான வலி",
  },
  {
    key: "child_critical",
    terms: ["child not breathing", "blue lips baby", "seizure child", "बच्चा बेहोश", "बच्चे को सांस नहीं आ रही", "குழந்தைக்கு மூச்சுத்திணறல்"],
    reasonEn: "Critically unwell infant or child",
    reasonHi: "अत्यंत अस्वस्थ बच्चा या शिशु",
    reasonTa: "மிகவும் உடல்நலம் குன்றிய குழந்தை",
  },
];

// Department keyword mapping for non-emergency suggestion
const DEPARTMENT_KEYWORDS = {
  MED: {
    code: "MED",
    name: "General Medicine",
    rooms: ["Room 1", "Room 2"],
    floor: 1,
    description: "fever, cough, cold, BP, sugar, weakness, stomach ache",
    keywords: [
      "fever", "cough", "cold", "flu", "bp", "blood pressure", "sugar", "diabetes", "headache",
      "weakness", "vomiting", "stomach ache", "loose motion", "diarrhea", "typhoid", "malaria",
      "बुखार", "खांसी", "जुकाम", "सिरदर्द", "कमजोरी", "पेट दर्द", "उल्टी", "दस्त", "बीपी", "शुगर",
      "காய்ச்சல்", "இருமல்", "சளி", "தலைவலி", "நீரிழிவு", "வயிற்று வலி",
    ],
  },
  CHD: {
    code: "CHD",
    name: "Children",
    rooms: ["Room 3"],
    floor: 1,
    description: "illness in children under 14 years of age",
    keywords: [
      "child", "baby", "infant", "toddler", "pediatric", "under 14", "growth", "vaccination",
      "बच्चा", "शिशु", "बाल रोग", "टीकाकरण", "छोटा बच्चा",
      "குழந்தை", "சிறுவர்", "தடுப்பூசி",
    ],
  },
  WOM: {
    code: "WOM",
    name: "Women and pregnancy",
    rooms: ["Room 4"],
    floor: 1,
    description: "pregnancy check-ups, women's health, maternity",
    keywords: [
      "pregnancy", "pregnant", "period", "menstrual", "women", "gynaec", "uterus", "antenatal",
      "गर्भावस्था", "गर्भवती", "महिला स्वास्थ्य", "मासिक धर्म",
      "கர்ப்பம்", "பெண்கள் நலம்", "மாதவிடாய்",
    ],
  },
  ORT: {
    code: "ORT",
    name: "Bones and joints",
    rooms: ["Room 5"],
    floor: 1,
    description: "pain in knee, back, joints, fractures, sprain",
    keywords: [
      "bone", "joint", "knee", "back pain", "fracture", "sprain", "arthritis", "shoulder pain",
      "swollen ankle", "walking difficulty", "spine",
      "हड्डी", "जोड़ों का दर्द", "घुटने का दर्द", "कमर दर्द", "मोच", "फ्रैक्चर",
      "எலும்பு", "மூட்டு வலி", "முழங்கால் வலி", "முதுகு வலி", "சுளுக்கு",
    ],
  },
  ENT: {
    code: "ENT",
    name: "Ear, nose and throat",
    rooms: ["Room 6"],
    floor: 1,
    description: "ear pain, blocked nose, throat pain, voice problem",
    keywords: [
      "throat", "sore throat", "throat pain", "ear", "ear pain", "nose", "blocked nose", "sinus",
      "tonsils", "hearing", "voice loss", "hoarseness",
      "गला", "गले में दर्द", "कान", "कान में दर्द", "नाक", "टॉन्सिल", "साइनस",
      "தொண்டை", "தொண்டை வலி", "காது", "காது வலி", "மூக்கு",
    ],
  },
  EYE: {
    code: "EYE",
    name: "Eyes",
    rooms: ["Room 7"],
    floor: 1,
    description: "blurry vision, red or painful eyes, spectacles",
    keywords: [
      "eye", "vision", "blur", "blurry", "red eye", "spectacles", "glasses", "cataract", "squint",
      "आंख", "आंखों में जलन", "धुंधला", "चश्मा", "मोतियाबिंद", "आंख लाल",
      "கண்", "பார்வை மங்கல்", "கண் வலி", "கண்ணாடி",
    ],
  },
  SKN: {
    code: "SKN",
    name: "Skin",
    rooms: ["Room 8"],
    floor: 1,
    description: "rash, itching, skin allergy, fungal infection",
    keywords: [
      "skin", "rash", "itching", "allergy", "fungal", "boils", "pimple", "eczema", "ringworm",
      "त्वचा", "खुजली", "चकत्ते", "दाद", "खाज", "एलर्जी", "मुंहासे",
      "தோல்", "அரிப்பு", "தடிப்பு", "தோல் ஒவ்வாமை",
    ],
  },
};

export function analyzeSymptoms({ text = "", age, gender, language = "en" }) {
  const query = text.toLowerCase().trim();

  // Step 1: Strict Check for Emergency Warning Signs
  for (const warning of EMERGENCY_WARNING_SIGNS) {
    for (const term of warning.terms) {
      if (query.includes(term.toLowerCase())) {
        return {
          isEmergency: true,
          emergencyWarning: {
            code: warning.key,
            reason: warning[`reason${language === "hi" ? "Hi" : language === "ta" ? "Ta" : "En"}`] || warning.reasonEn,
          },
          directive: {
            en: "URGENT MEDICAL ATTENTION REQUIRED. Please go directly to Emergency (Casualty) on the Ground Floor now. You do NOT need an OPD token.",
            hi: "तत्काल आपातकालीन सहायता की आवश्यकता है। कृपया तुरंत ग्राउंड फ्लोर पर इमरजेंसी (कैजुअल्टी) जाएं। आपको किसी टोकन की आवश्यकता नहीं है।",
            ta: "உடனடி அவசர சிகிச்சை தேவை. தயவுசெய்து உடனடியாக தரைத்தளத்தில் உள்ள அவசர சிகிச்சை பிரிவுக்கு செல்லவும். டோக்கன் தேவையில்லை.",
          }[language] || "URGENT MEDICAL ATTENTION REQUIRED.",
          emergencyContacts: {
            policeAndMedical: "112",
            ambulance: "108",
            hospitalEmergencyPhone: "0191-0000000 (Ext 108)",
          },
          casualtyLocation: {
            placeId: "emergency_casualty_0",
            floor: 0,
            name: "Emergency (Casualty)",
            landmark: "Ground floor, red marked corridor on the left of main entrance",
          },
        };
      }
    }
  }

  // Step 2: Age and Gender Heuristic boosts
  const ageNum = Number(age);
  if (ageNum && ageNum < 14 && (query.includes("fever") || query.includes("pain") || query.includes("cough") || query.includes("vomit"))) {
    const chd = DEPARTMENT_KEYWORDS.CHD;
    return buildSuggestionResponse(chd, "Based on patient's age (under 14), paediatric care is recommended.", 0.95, language);
  }

  if (gender === "female" && (query.includes("pregnant") || query.includes("period") || query.includes("cramp"))) {
    const wom = DEPARTMENT_KEYWORDS.WOM;
    return buildSuggestionResponse(wom, "Based on symptoms, Women and Pregnancy department is recommended.", 0.92, language);
  }

  // Step 3: Match department keywords
  let bestMatch = null;
  let highestScore = 0;

  for (const deptKey of Object.keys(DEPARTMENT_KEYWORDS)) {
    const dept = DEPARTMENT_KEYWORDS[deptKey];
    let score = 0;

    for (const kw of dept.keywords) {
      if (query.includes(kw.toLowerCase())) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = dept;
    }
  }

  // Default to General Medicine if non-emergency but generic symptom
  if (!bestMatch || highestScore === 0) {
    const med = DEPARTMENT_KEYWORDS.MED;
    return buildSuggestionResponse(
      med,
      "For general symptoms, General Medicine (Room 1 & 2) is the primary consultation department.",
      0.65,
      language
    );
  }

  const confidence = Math.min(0.95, 0.7 + highestScore * 0.1);
  return buildSuggestionResponse(
    bestMatch,
    `Your symptoms align with ${bestMatch.name} (${bestMatch.description}).`,
    confidence,
    language
  );
}

function buildSuggestionResponse(department, reason, confidence, language) {
  return {
    isEmergency: false,
    suggestedDepartment: {
      code: department.code,
      name: department.name,
      rooms: department.rooms,
      floor: department.floor,
      description: department.description,
    },
    confidence,
    reason,
    preConsultationAdvice: {
      en: "While waiting for your turn: please take a seat in Waiting Hall A, stay hydrated with drinking water, and approach the Help Desk if symptoms worsen.",
      hi: "अपनी बारी की प्रतीक्षा के दौरान: कृपया वेटिंग हॉल ए में बैठें, पानी पिएं, और यदि तकलीफ बढ़े तो तुरंत हेल्प डेस्क पर बताएं।",
      ta: "காத்திருக்கும் போது: தயவுசெய்து காத்திருப்பு கூடம் ஏ-வில் அமரவும், நீர் அருந்தவும், அசௌகரியம் அதிகமானால் உதவி மையத்தை அணுகவும்.",
    }[language] || "Please take a seat in the waiting area.",
    overrideNotice: "You can change or override this department selection at any time.",
  };
}
