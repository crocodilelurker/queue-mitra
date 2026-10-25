// LLM-Powered Medical Voice Translation and Symptom Extraction Service
// Connects to OpenRouter's free model endpoints (e.g. meta-llama/llama-3.2-3b-instruct:free, google/gemma-2-9b-it:free)
// Seamlessly falls back to local clinical rules if no API key is provided or if network is offline.

import env from "../config/env.js";

const DEFAULT_FREE_MODEL = "meta-llama/llama-3.2-3b-instruct:free";

const SYSTEM_PROMPT = `You are a clinical multilingual medical translator and hospital triage AI for a government hospital in India.
Your task is to take a patient's spoken symptom complaint (spoken in Hindi, Telugu, English, or conversational Hinglish / Telugish), and generate a clean, structured JSON clinical analysis.

HOSPITAL DEPARTMENTS:
- MED (General Medicine, Rooms 1 & 2, Floor 1): fever, cough, cold, flu, BP, sugar, headache, vomiting, diarrhea, stomach pain, weakness, body aches, adult medical ailments.
- CHD (Children, Room 3, Floor 1): illness in infants/children under 14 years.
- WOM (Women & Pregnancy, Room 4, Floor 1): pregnancy check-ups, maternity, gynaecology, menstrual distress.
- ORT (Bones & Joints, Room 5, Floor 1): fracture, knee/joint/spine/back pain, sprains, arthritis.
- ENT (Ear, Nose & Throat, Room 6, Floor 1): sore throat, ear ache, ear discharge, nasal congestion, tonsils.
- EYE (Eyes, Room 7, Floor 1): red eyes, eye pain, blurry vision, cataract, spectacles check.
- SKN (Skin, Room 8, Floor 1): skin rashes, itching, fungal infection, allergy, boils, pimples.

CRITICAL EMERGENCY RED FLAGS (Emergency Casualty, Floor 0 - immediate priority):
- Severe chest pain / suspected heart attack / left arm radiating pain
- Acute breathlessness / gasping / cannot breathe
- Unconsciousness / fainting / unresponsive
- Profuse bleeding / deep cut / severe accident
- Sudden facial drooping / slurred speech / paralysis (stroke)
- Pregnancy with active bleeding or extreme distress
- Critically unwell or unresponsive infant / child with seizures

INSTRUCTIONS:
1. Detect the patient's language ('hi', 'te', or 'en').
2. Translate the spoken complaint into fluent, professional clinical English for doctors.
3. Keep or write a patient-friendly summary in the patient's spoken language.
4. Extract symptom names, duration (e.g. "for 3 days", "since morning"), and severity ("Mild", "Moderate", "Severe").
5. If an emergency red flag is detected, set "isEmergency": true and provide the emergency reason.
6. Suggest the most appropriate OPD department code (MED, CHD, WOM, ORT, ENT, EYE, SKN).
7. Return ONLY valid JSON matching the exact schema below, with no markdown code blocks or surrounding text.

OUTPUT SCHEMA:
{
  "detectedLanguage": "hi" | "te" | "en",
  "roughTranslation": "Clinical English translation of the symptom",
  "patientText": "Patient's complaint punctuated in their spoken language",
  "extractedSymptoms": ["Fever", "Cough"],
  "duration": "for 3 days" | "since morning" | "Not specified",
  "severity": "Mild" | "Moderate" | "Severe",
  "isEmergency": false,
  "emergencyReason": null,
  "suggestedDepartmentCode": "MED" | "CHD" | "WOM" | "ORT" | "ENT" | "EYE" | "SKN",
  "confidence": 0.95,
  "preConsultationAdvice": "Comforting advice in the patient's language while waiting"
}`;

/**
 * Clean LLM response string to extract pure JSON
 */
function cleanJsonOutput(text) {
  if (!text) return null;
  let clean = text.trim();
  // Strip markdown code fences if present
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch {
    // Attempt extracting the first JSON object using regex
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Call OpenRouter Free Model to translate and triage patient speech
 * @param {Object} params
 * @param {string} params.text - Spoken transcript
 * @param {number} [params.age]
 * @param {string} [params.gender]
 * @param {string} [params.hintLanguage]
 */
export async function analyzeVoiceWithLLM({ text, age, gender, hintLanguage }) {
  const apiKey = env.openRouterApiKey;
  if (!apiKey || apiKey.trim() === "") {
    return null; // Signals fallback to local clinical engine
  }

  const model = env.openRouterModel || DEFAULT_FREE_MODEL;

  const userPrompt = `Patient Voice Input: "${text}"
${age ? `Age: ${age}` : ""}
${gender ? `Gender: ${gender}` : ""}
${hintLanguage ? `Hint Language: ${hintLanguage}` : ""}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast response

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5001",
        "X-Title": "Queue Mitra Hospital",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[OpenRouter] Request returned status ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const parsed = cleanJsonOutput(rawContent);

    if (!parsed || !parsed.roughTranslation) {
      return null;
    }

    return parsed;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("[OpenRouter] LLM inference failed or timed out, falling back to local engine:", error.message);
    return null;
  }
}
