// Voice Symptom Translation & Clinical Extraction Service
// Designed for patient voice input (Hindi, Telugu, English + Hinglish/Telugish)
// 1. Detects spoken language/script accurately.
// 2. Performs reliable offline clinical symptom translation + online fallback.
// 3. Extracts clinical entities (symptoms, duration, severity, body parts).
// 4. Integrates with Emergency-Safe Triage to detect critical red flags immediately.

import { analyzeSymptoms, DEPARTMENT_KEYWORDS } from "./triageService.js";
import { analyzeVoiceWithLLM } from "./llmService.js";
import env from "../config/env.js";

// Script regex checks
const HAS_DEVANAGARI = /[\u0900-\u097F]/;
const HAS_TELUGU = /[\u0C00-\u0C7F]/;

// Latin Hinglish signature words
const HINGLISH_WORDS = new Set([
  "mujhe", "mere", "meri", "mera", "ko", "hai", "hain", "tha", "thi", "dard", "bukhar",
  "khansi", "jukam", "pet", "sar", "sir", "gala", "aankh", "kaan", "chhati", "seene",
  "ulti", "dast", "chakkar", "kamzor", "se", "mein", "aur", "bahut", "tez", "din",
  "hafte", "subah", "raat", "ho", "raha", "rahi", "lag", "aaya"
]);

// Latin Telugish signature words
const TELUGISH_WORDS = new Set([
  "naku", "naaku", "na", "undi", "undhi", "unnayi", "jwaram", "daggu", "jalubu", "noppi",
  "kadupu", "tala", "thala", "gunde", "chevi", "gonthu", "kallu", "kaallu", "chala",
  "ekkuva", "ga", "lo", "nundi", "nunchi", "rojulu", "varam", "vaanthulu", "virechanalu",
  "dhommu", "swasa", "aayadum", "cheyandi", "osthondi", "vasthundi", "padipoyanu"
]);

// Multilingual Medical Dictionary (Maps Hindi, Telugu, Transliterations to English medical terms)
const SYMPTOM_LEXICON = [
  // --- General Medicine (Fever, Cold, Cough, Vitals) ---
  {
    category: "fever",
    standardEn: "fever",
    terms: [
      "bukhar", "tez bukhar", "taap", "fever", "high fever", "chills",
      "बुखार", "तेज बुखार", "ताप", "कपकपी",
      "jwaram", "thapam", "chali jwaram", "teevramaina jwaram",
      "జ్వరం", "తీవ్రమైన జ్వరం", "చలి జ్వరం", "తాపం"
    ],
  },
  {
    category: "cough",
    standardEn: "cough",
    terms: [
      "khansi", "khasi", "sukhi khansi", "balgam wali khansi", "cough", "dry cough", "persistent cough",
      "खांसी", "सूखी खांसी", "बलगम",
      "daggu", "podupu daggu", "teevramaina daggu", "coughing",
      "దగ్గు", "పొడి దగ్గు", "తెమడ", "తీవ్రమైన దగ్గు"
    ],
  },
  {
    category: "cold",
    standardEn: "cold and runny nose",
    terms: [
      "jukam", "zukam", "sardi", "naak behna", "chheenk", "cold", "runny nose", "flu",
      "जुकाम", "सर्दी", "नाक बहना", "छींक",
      "jalubu", "mookku karadam", "runny nose", "heema",
      "జలుబు", "ముక్కు కారడం", "తుమ్ములు"
    ],
  },
  {
    category: "bp_sugar",
    standardEn: "blood pressure and diabetes checkup",
    terms: [
      "bp", "high bp", "low bp", "blood pressure", "sugar", "diabetes",
      "बीपी", "ब्लड प्रेशर", "शुगर", "मधुमेह",
      "bp", "blood pressure", "sugar", "madhumeham",
      "బీపీ", "షుగర్", "రక్తపోటు", "మధుమేహం"
    ],
  },
  {
    category: "headache",
    standardEn: "headache",
    terms: [
      "sar dard", "sir dard", "sar me dard", "headache", "migraine", "heavy head",
      "सिरदर्द", "सर दर्द", "सिर में दर्द", "आधा सीसी",
      "tala noppi", "thala noppi", "talanoppi", "head pain",
      "తల నొప్పి", "తలనొప్పి", "తల భారంగా ఉండటం"
    ],
  },
  {
    category: "dizziness",
    standardEn: "dizziness and fainting",
    terms: [
      "chakkar", "chakkar aana", "giddiness", "dizziness", "fainting",
      "चक्कर", "चक्कर आना", "घबराहट",
      "kallu thiragadam", "thala thiragadam", "giddiness", "faint",
      "కళ్లు తిరగడం", "తల తిరగడం", "మత్తుగా ఉండటం"
    ],
  },
  {
    category: "weakness",
    standardEn: "generalized weakness and fatigue",
    terms: [
      "kamzori", "thakan", "susti", "weakness", "tiredness", "body ache",
      "कमजोरी", "थकान", "सुस्ती", "बदन दर्द",
      "neerasam", "alasata", "angam noppulu", "weakness",
      "నీరసం", "అలసట", "శరీర నొప్పులు"
    ],
  },
  {
    category: "stomach_pain",
    standardEn: "stomach ache and abdominal pain",
    terms: [
      "pet dard", "pet me dard", "stomach ache", "belly pain", "abdominal pain", "cramps",
      "पेट दर्द", "पेट में दर्द", "मरोड़",
      "kadupu noppi", "kadupulo noppi", "potta noppi", "stomach pain",
      "కడుపు నొప్పి", "కడుపులో నొప్పి", "కడుపుబ్బరం"
    ],
  },
  {
    category: "vomiting",
    standardEn: "vomiting and nausea",
    terms: [
      "ulti", "jee machalna", "vomiting", "nausea",
      "उल्टी", "जी मिचलाना", "कै",
      "vaanthulu", "vanthulu", "vomitings", "nausea",
      "వాంతులు", "వికారం"
    ],
  },
  {
    category: "diarrhea",
    standardEn: "diarrhea and loose motion",
    terms: [
      "dast", "loose motion", "diarrhea", "pet kharab",
      "दस्त", "लूज मोशन", "पेचिश",
      "virechanalu", "loose motions", "motion",
      "విరేచనాలు", "లూజ్ మోషన్స్"
    ],
  },

  // --- Bones & Joints (ORT) ---
  {
    category: "joint_pain",
    standardEn: "joint and knee pain",
    terms: [
      "jodon me dard", "ghutne me dard", "knee pain", "joint pain", "swollen ankle", "arthritis",
      "जोड़ों में दर्द", "घुटने का दर्द", "जोड़ों का दर्द", "गठिया",
      "keella noppulu", "keella noppi", "mokali noppi", "mokallu noppi",
      "కీళ్ల నొప్పులు", "మోకాలి నొప్పి", "కీళ్ల వాపు"
    ],
  },
  {
    category: "back_pain",
    standardEn: "lower back and spine pain",
    terms: [
      "kamar dard", "peeth dard", "back pain", "lower back pain", "spine pain",
      "कमर दर्द", "पीठ दर्द", "रीढ़ की हड्डी में दर्द",
      "nadumu noppi", "veepu noppi", "spine pain", "backache",
      "నడుము నొప్పి", "వెన్ను నొప్పి"
    ],
  },
  {
    category: "fracture_sprain",
    standardEn: "suspected fracture or severe sprain",
    terms: [
      "moch", "haddi toot gayi", "fracture", "sprain", "bone injury",
      "मोच", "हड्डी टूटना", "फ्रैक्चर",
      "benuku", "emuka virigindi", "fracture", "sprain",
      "బెణుకు", "ఎముక విరిగింది", "ఫ్రాక్చర్"
    ],
  },

  // --- Ear, Nose & Throat (ENT) ---
  {
    category: "throat_pain",
    standardEn: "sore throat and pain while swallowing",
    terms: [
      "gale me dard", "gala kharab", "sore throat", "throat pain", "tonsils",
      "गले में दर्द", "गला खराब", "टॉन्सिल", "खराश",
      "gonthu noppi", "gonthu manta", "throat pain", "tonsillitis",
      "గొంతు నొప్పి", "గొంతు మంట", "టాన్సిల్స్"
    ],
  },
  {
    category: "ear_pain",
    standardEn: "ear pain and hearing discomfort",
    terms: [
      "kaan dard", "kaan me dard", "kaan behna", "ear pain", "ear ache", "ear discharge",
      "कान में दर्द", "कान दर्द", "कान बहना",
      "chevi noppi", "chevi lo noppi", "chevi caradam", "ear ache",
      "చెవి నొప్పి", "చెవిలో చీము", "చెవి పోటు"
    ],
  },
  {
    category: "blocked_nose",
    standardEn: "nasal congestion and sinus pressure",
    terms: [
      "naak band", "sinus", "blocked nose", "sinusitis",
      "नाक बंद", "साइनस",
      "mookku dibbada", "mukku dibbada", "sinus",
      "ముక్కు దిబ్బడ", "సైనస్"
    ],
  },

  // --- Eyes (EYE) ---
  {
    category: "eye_issue",
    standardEn: "eye irritation, redness or blurry vision",
    terms: [
      "aankh laal", "aankh me dard", "dhundhla dikhna", "red eye", "eye pain", "blurred vision", "spectacles", "cataract",
      "आंख लाल", "आंखों में दर्द", "धुंधला दिखना", "मोतियाबिंद", "चश्मा",
      "kallu errabadatam", "kanti noppi", "masaka choopu", "eye irritation",
      "కళ్లు ఎర్రబడటం", "కంటి నొప్పి", "మసక దృష్టి", "కంటి శుక్లం"
    ],
  },

  // --- Skin (SKN) ---
  {
    category: "skin_problem",
    standardEn: "skin rash, itching or allergy",
    terms: [
      "khujli", "daane", "chakatte", "skin rash", "itching", "skin allergy", "fungal", "pimples",
      "खुजली", "चकत्ते", "दाने", "त्वचा रोग", "एलर्जी", "मुंहासे",
      "durada", "daddurlu", "skin allergy", "machalu", "rash",
      "దురద", "దద్దుర్లు", "చర్మ వ్యాధి", "అలర్జీ"
    ],
  },

  // --- Children (CHD) ---
  {
    category: "child_health",
    standardEn: "pediatric illness in child",
    terms: [
      "bachha", "chota bachha", "baby", "infant", "child fever", "pediatric", "vaccine",
      "बच्चा", "छोटा बच्चा", "शिशु", "टीका",
      "pilla", "pillalu", "chinna pillalu", "paapa", "babu",
      "పిల్లలు", "చిన్నారి", "శిశువు", "పాప", "బాబు"
    ],
  },

  // --- Women / Maternity (WOM) ---
  {
    category: "pregnancy_women",
    standardEn: "pregnancy or women's health consultation",
    terms: [
      "garbhvati", "pregnancy", "period problem", "menstrual", "women health", "pregnancy checkup",
      "गर्भवती", "गर्भावस्था", "मासिक धर्म", "महिला स्वास्थ्य",
      "garbhini", "garbham", "period problem", "mahilala samasya",
      "గర్భిణీ", "గర్భం", "రుతుక్రమ సమస్య", "మహిళల ఆరోగ్యం"
    ],
  },

  // --- Critical Emergency Red Flags (CASUALTY) ---
  {
    category: "chest_pain_emergency",
    standardEn: "severe chest pain or heart attack signs",
    isEmergency: true,
    terms: [
      "chest pain", "heart attack", "chhati me tez dard", "seene me dard", "left arm pain",
      "सीने में तेज दर्द", "दिल का दौरा", "हार्ट अटैक",
      "gunde noppi", "chhati noppi", "heart attack", "gundello manta",
      "గుండె నొప్పి", "ఛాతీ నొప్పి", "గుండెల్లో విపరీతమైన నొప్పి"
    ],
  },
  {
    category: "breathing_emergency",
    standardEn: "acute breathlessness and respiratory distress",
    isEmergency: true,
    terms: [
      "cannot breathe", "breathless", "gasping", "saans phoolna", "saans nahi aa rahi",
      "सांस नहीं आ रही", "सांस फूलना", "दम घुटना",
      "swasa aadadam ledu", "swasa kastam", "dhammu", "ayasam ekkuva",
      "శ్వాస ఆడకపోవడం", "ఆయాసం", "శ్వాస తీసుకోవడం కష్టంగా ఉండటం"
    ],
  },
  {
    category: "unconscious_emergency",
    standardEn: "unconsciousness or sudden collapse",
    isEmergency: true,
    terms: [
      "unconscious", "passed out", "behoshi", "behosha",
      "बेहोश", "बेहोशी", "गिर पड़ा",
      "spruha ledu", "padipoyadu", "spruha tappindi", "kallu thirigi padipoyadu",
      "స్పృహ తప్పడం", "స్పృహ లేదు", "కళ్లు తిరిగి పడిపోవడం"
    ],
  },
  {
    category: "heavy_bleeding_emergency",
    standardEn: "severe injury or heavy bleeding",
    isEmergency: true,
    terms: [
      "heavy bleeding", "profuse bleeding", "khoon behna", "bahut khoon", "accident",
      "खून बहना", "भारी रक्तस्राव", "दुर्घटना", "गंभीर चोट",
      "raktham karadam", "teevramaina gayam", "accident", "rakthasravam",
      "విపరీతమైన రక్తస్రావం", "రక్తం కారడం", "తీవ్రమైన గాయం", "ప్రమాదం"
    ],
  },
];

// Time duration patterns in Hindi, Telugu, and English
const DURATION_PATTERNS = [
  { re: /(?:(\d+)|ek|do|teen|char|paanch)\s*(?:din|days?|rojulu)\s*(?:se|nundi|nunchi|ago)?/i, type: "days" },
  { re: /(?:(\d+)|ek|do)\s*(?:hafte|weeks?|varalu)\s*(?:se|nundi|nunchi|ago)?/i, type: "weeks" },
  { re: /(?:aaj|ee roju|today|subah|morning|udayam)/i, type: "today" },
  { re: /(?:kal|ninna|yesterday)/i, type: "yesterday" },
];

/**
 * Detect language of the input text
 * @param {string} text
 * @returns {'hi'|'te'|'en'}
 */
export function detectLanguage(text = "") {
  if (!text || typeof text !== "string") return "en";

  if (HAS_DEVANAGARI.test(text)) return "hi";
  if (HAS_TELUGU.test(text)) return "te";

  // Check latin transliterated words
  const words = text.toLowerCase().split(/\s+/);
  let hiScore = 0;
  let teScore = 0;

  for (const w of words) {
    if (HINGLISH_WORDS.has(w)) hiScore++;
    if (TELUGISH_WORDS.has(w)) teScore++;
  }

  if (hiScore > 0 && hiScore >= teScore) return "hi";
  if (teScore > 0 && teScore > hiScore) return "te";

  return "en";
}

/**
 * Extract medical symptoms, severity, and duration from patient spoken text
 */
export function extractClinicalDetails(text = "") {
  const query = text.toLowerCase();
  const matchedCategories = [];
  const matchedTerms = [];
  let isEmergencyFlag = false;

  for (const item of SYMPTOM_LEXICON) {
    for (const term of item.terms) {
      if (query.includes(term.toLowerCase())) {
        if (!matchedCategories.includes(item.standardEn)) {
          matchedCategories.push(item.standardEn);
          matchedTerms.push(term);
        }
        if (item.isEmergency) {
          isEmergencyFlag = true;
        }
        break;
      }
    }
  }

  // Detect duration
  let durationText = "";
  const numMap = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5,
    "ఒక": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
    "oka": 1, "rendu": 2, "moodu": 3, "nalugu": 4, "aidu": 5,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5
  };

  const dayMatch = query.match(/(\d+|एक|दो|तीन|चार|पांच|ఒక|రెండు|మూడు|నాలుగు|ఐదు|ek|do|teen|char|paanch|oka|rendu|moodu|nalugu|aidu|one|two|three)\s*(?:दिन|दिनों|రోజులు|రోజుల|din|dino|days?|rojulu|rojula)/i);
  if (dayMatch) {
    const rawNum = dayMatch[1].toLowerCase();
    const count = numMap[rawNum] || rawNum;
    durationText = `for ${count} days`;
  } else if (/एक हफ्ते|ఒక వారం|ek hafte|one week|oka vaaram|1 week/i.test(query)) {
    durationText = "for 1 week";
  } else if (/आज सुबह|ఈ రోజు ఉదయం|aaj subah|ee roju udayam|since morning|this morning/i.test(query)) {
    durationText = "since this morning";
  } else if (/कल से|నిన్నటి నుండి|kal se|ninna nundi|since yesterday/i.test(query)) {
    durationText = "since yesterday";
  }

  // Detect severity
  let severity = "Moderate";
  if (/tez|bahut|chala|gambhir|తేలిక|తీవ్రమైన|విపరీతమైన|ఎక్కువ|చాలా|तेज|बहुत|गंभीर|severe|intense|badi|ekkuva|heavy|high/i.test(query)) {
    severity = "Severe";
  } else if (/thoda|light|mild|konchem|హల్కా|కొంచెం|हल्का|थोड़ा/i.test(query)) {
    severity = "Mild";
  }

  return {
    symptoms: matchedCategories,
    extractedTerms: matchedTerms,
    duration: durationText,
    severity,
    isEmergency: isEmergencyFlag,
  };
}

/**
 * Generate rough English clinical translation and clean localized write-ups
 */
export function buildRoughTranslation({ text, detectedLang, details }) {
  const { symptoms, duration, severity } = details;

  if (symptoms.length === 0) {
    // If no specific medical term mapped, fallback to cleaned input
    return {
      translatedEnglish: text.trim(),
      patientText: text.trim(),
      clinicalSummary: `Reported complaint: ${text.trim()}`,
    };
  }

  // Formulate concise English translation for doctor / hospital records
  const symptomList = symptoms.join(", ");
  const translatedEnglish = `${severity !== "Moderate" ? `${severity} ` : ""}${symptomList}${duration ? ` ${duration}` : ""}.`;

  // Localized patient view text
  const localizedHi = `${duration ? `${duration.replace("for ", "").replace("days", "दिन")} से ` : ""}${symptoms.join(", ")} की समस्या`;
  const localizedTe = `${duration ? `${duration.replace("for ", "").replace("days", "రోజుల")} నుండి ` : ""}${symptoms.join(", ")} సమస్య`;

  const patientText =
    detectedLang === "te"
      ? (HAS_TELUGU.test(text) ? text.trim() : localizedTe)
      : detectedLang === "hi"
      ? (HAS_DEVANAGARI.test(text) ? text.trim() : localizedHi)
      : text.trim();

  return {
    translatedEnglish,
    patientText,
    clinicalSummary: `Symptoms: ${symptoms.map(s => s.toUpperCase()).join(", ")} | Duration: ${duration || "Not specified"} | Severity: ${severity}`,
  };
}

/**
 * Optional online translation fetch with strict timeout (1.5s)
 * Safe fallback to local lexicon if offline or rate-limited.
 */
async function fetchOnlineTranslationSafely(text, sourceLang, targetLang = "en") {
  if (!text || text.length < 3 || sourceLang === targetLang) return null;
  const langPair = `${sourceLang}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 200))}&langpair=${langPair}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.responseData?.translatedText;
    // Discard low match or echo translations
    if (result && !result.toLowerCase().includes("limit") && result.trim() !== text.trim()) {
      return result.trim();
    }
  } catch {
    /* Abort or offline - safely ignore */
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Core Process Function: Takes spoken transcript, translates, normalizes, and triages
 * @param {Object} params
 * @param {string} params.text - Voice speech transcript
 * @param {string} [params.sourceLanguage] - Optional hinted language
 * @param {string} [params.targetLanguage='en'] - Target translation language
 * @param {number} [params.age]
 * @param {string} [params.gender]
 */
export async function processVoiceInput({ text, sourceLanguage, targetLanguage = "en", age, gender }) {
  if (!text || !text.trim()) {
    throw new Error("Speech text transcript is required");
  }

  const rawText = text.trim();
  const detectedLang = sourceLanguage && sourceLanguage !== "auto" ? sourceLanguage : detectLanguage(rawText);

  // Step 0: If OpenRouter free model is configured, process with AI reasoning
  if (env.openRouterApiKey && env.openRouterApiKey.trim()) {
    try {
      const llmResult = await analyzeVoiceWithLLM({
        text: rawText,
        age,
        gender,
        hintLanguage: detectedLang,
      });

      if (llmResult && llmResult.roughTranslation) {
        const deptCode = (llmResult.suggestedDepartmentCode || "MED").toUpperCase();
        const deptInfo = DEPARTMENT_KEYWORDS[deptCode] || DEPARTMENT_KEYWORDS.MED;

        const emergencyContacts = {
          policeAndMedical: "112",
          ambulance: "108",
          hospitalEmergencyPhone: "0191-0000000 (Ext 108)",
        };

        const casualtyLocation = {
          placeId: "emergency_casualty_0",
          floor: 0,
          name: "Emergency (Casualty)",
          landmark: "Ground floor, red marked corridor on the left of main entrance",
        };

        return {
          originalText: rawText,
          detectedLanguage: llmResult.detectedLanguage || detectedLang,
          targetLanguage,
          translatedText: llmResult.roughTranslation,
          patientText: llmResult.patientText || rawText,
          clinicalSummary: `Symptoms: ${(llmResult.extractedSymptoms || []).join(", ").toUpperCase()} | Duration: ${llmResult.duration || "Not specified"} | Severity: ${llmResult.severity || "Moderate"}`,
          extractedSymptoms: llmResult.extractedSymptoms || [],
          duration: llmResult.duration || "Not specified",
          severity: llmResult.severity || "Moderate",
          isEmergency: Boolean(llmResult.isEmergency),
          emergencyWarning: llmResult.isEmergency
            ? { code: "emergency", reason: llmResult.emergencyReason || "Immediate emergency attention required" }
            : null,
          directive: llmResult.isEmergency
            ? "URGENT MEDICAL ATTENTION REQUIRED. Please go directly to Emergency (Casualty) on the Ground Floor now. You do NOT need an OPD token."
            : null,
          emergencyContacts: llmResult.isEmergency ? emergencyContacts : undefined,
          casualtyLocation: llmResult.isEmergency ? casualtyLocation : undefined,
          suggestedDepartment: llmResult.isEmergency
            ? null
            : {
                code: deptInfo.code,
                name: deptInfo.name,
                rooms: deptInfo.rooms,
                floor: deptInfo.floor,
                description: deptInfo.description,
              },
          confidence: llmResult.confidence || 0.95,
          preConsultationAdvice: llmResult.preConsultationAdvice || "Please take a seat in the waiting area.",
          aiModel: env.openRouterModel,
        };
      }
    } catch (err) {
      console.warn("[VoiceTranslation] LLM analysis error, falling back to local clinical rules:", err.message);
    }
  }

  // Step 1: Extract clinical entities and symptoms using local engine fallback
  const details = extractClinicalDetails(rawText);

  // Step 2: Generate rough clinical English translation and local write-up
  const translation = buildRoughTranslation({ text: rawText, detectedLang, details });

  // Step 3: If no known symptoms were detected, attempt quick online translation fallback
  let finalEnglishTranslation = translation.translatedEnglish;
  if (details.symptoms.length === 0 && detectedLang !== "en") {
    const onlineResult = await fetchOnlineTranslationSafely(rawText, detectedLang, "en");
    if (onlineResult) {
      finalEnglishTranslation = onlineResult;
      // Re-extract symptoms on the newly translated English text
      const secondPass = extractClinicalDetails(onlineResult);
      if (secondPass.symptoms.length > 0) {
        details.symptoms = secondPass.symptoms;
        details.isEmergency = details.isEmergency || secondPass.isEmergency;
      }
    }
  }

  // Step 4: Run Safe Triage Analysis
  // Combine raw text + English translation to guarantee triage matches in any language
  const triageQuery = `${rawText} ${finalEnglishTranslation}`;
  const triageResult = analyzeSymptoms({
    text: triageQuery,
    age,
    gender,
    language: detectedLang,
  });

  return {
    originalText: rawText,
    detectedLanguage: detectedLang,
    targetLanguage,
    translatedText: finalEnglishTranslation,
    patientText: translation.patientText,
    clinicalSummary: translation.clinicalSummary,
    extractedSymptoms: details.symptoms,
    duration: details.duration || "Not specified",
    severity: details.severity,
    isEmergency: details.isEmergency || triageResult.isEmergency,
    emergencyWarning: triageResult.emergencyWarning || null,
    directive: triageResult.directive || null,
    suggestedDepartment: triageResult.suggestedDepartment || null,
    confidence: triageResult.confidence || 0.7,
    preConsultationAdvice: triageResult.preConsultationAdvice || null,
  };
}
