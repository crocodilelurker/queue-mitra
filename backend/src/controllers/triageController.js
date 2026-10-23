import { analyzeSymptoms, EMERGENCY_WARNING_SIGNS } from "../services/triageService.js";
import ApiError from "../utils/ApiError.js";

// POST /api/triage/suggest: analyze symptoms safely and suggest department or flag emergency
export function suggestDepartment(req, res) {
  const { text, age, gender, language } = req.body ?? {};
  if (!text || !text.trim()) {
    throw ApiError.badRequest("Symptom text description is required");
  }

  const result = analyzeSymptoms({
    text,
    age,
    gender,
    language: language || "en",
  });

  res.json(result);
}

// GET /api/triage/warning-signs: lists the emergency signs displayed on registration screen
export function getEmergencySigns(req, res) {
  const { language = "en" } = req.query;
  const signs = EMERGENCY_WARNING_SIGNS.map((s) => ({
    key: s.key,
    reason: s[`reason${language === "hi" ? "Hi" : language === "ta" ? "Ta" : "En"}`] || s.reasonEn,
  }));

  res.json({
    warningHeadline: {
      en: "Any of these signs? Go to Emergency (Casualty) now. You do not need a token.",
      hi: "इनमें से कोई भी लक्षण है? तुरंत इमरजेंसी जाएं। आपको टोकन की जरूरत नहीं है।",
      ta: "இந்த அறிகுறிகள் ஏதேனும் உள்ளதா? உடனடியாக அவசர சிகிச்சைக்கு செல்லவும். டோக்கன் தேவையில்லை.",
    }[language] || "Any of these signs? Go to Emergency immediately.",
    emergencyContacts: {
      ambulance: "108",
      emergency: "112",
    },
    signs,
  });
}
