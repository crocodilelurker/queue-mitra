import { processVoiceInput } from "../services/voiceTranslationService.js";
import ApiError from "../utils/ApiError.js";

/**
 * POST /api/voice/translate
 * Translates speech/mic transcript from patient's spoken language (Hindi, Telugu, English, etc.)
 * into clinical English & normalized complaint text, and returns department suggestion / triage.
 */
export async function translateVoiceInput(req, res, next) {
  try {
    const { text, transcript, speechText, sourceLanguage, language, targetLanguage, age, gender } = req.body ?? {};
    const inputContent = (text || transcript || speechText || "").trim();

    if (!inputContent) {
      throw ApiError.badRequest("Speech text or transcript is required");
    }

    const result = await processVoiceInput({
      text: inputContent,
      sourceLanguage: sourceLanguage || language,
      targetLanguage: targetLanguage || "en",
      age,
      gender,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
