import Notification from "../models/Notification.js";
import { emit, rooms } from "../socket/index.js";

export async function sendSimulatedSms({ ticket, type, metadata = {} }) {
  if (!ticket || !ticket.patient) return null;

  const mobile = ticket.patient.mobile || "9876543210";
  const firstName = ticket.patient.firstName || "Patient";
  const tokenNumber = ticket.tokenNumber;
  const deptName = metadata.deptName || ticket.department?.name || "OPD";
  const room = metadata.room || ticket.room || "Consultation Room";
  const floor = metadata.floor ?? ticket.department?.floor ?? 1;
  const doctorName = metadata.doctorName || "Doctor";
  const delayMinutes = metadata.delayMinutes || 15;

  let message = { en: "", hi: "", ta: "", te: "" };

  switch (type) {
    case "registered":
      message = {
        en: `Queue Mitra CDH: Welcome ${firstName}. Token: ${tokenNumber} (${deptName}, ${room}). Estimated wait: ${metadata.estimatedWaitMinutes || 15} mins. Track live: /my-turn/${ticket.publicId}`,
        hi: `कतार मित्र CDH: स्वागत है ${firstName}। टोकन: ${tokenNumber} (${deptName}, ${room})। अनुमानित समय: ${metadata.estimatedWaitMinutes || 15} मिनट। ट्रैक करें: /my-turn/${ticket.publicId}`,
        ta: `கியூ மித்ரா CDH: வணக்கம் ${firstName}. டோக்கன்: ${tokenNumber} (${deptName}, ${room}). நேரடி கண்காணிப்பு: /my-turn/${ticket.publicId}`,
        te: `క్యూ మిత్ర CDH: స్వాగతం ${firstName}. టోకెన్: ${tokenNumber} (${deptName}, ${room}). అంచనా సమయం: ${metadata.estimatedWaitMinutes || 15} నిమిషాలు. లైవ్ ట్రాక్: /my-turn/${ticket.publicId}`,
      };
      break;

    case "near_turn":
      message = {
        en: `Queue Mitra Alert: Your turn is close! Only 3 people ahead of you. Please head to ${room} on Floor ${floor} now.`,
        hi: `कतार मित्र अलर्ट: आपकी बारी पास आ गई है! आपसे आगे सिर्फ 3 लोग हैं। कृपया अभी मंजिल ${floor} पर ${room} के बाहर पहुंचें।`,
        ta: `கியூ மித்ரா எச்சரிக்கை: உங்கள் முறை நெருங்கிவிட்டது! உங்களுக்கு முன் 3 பேர் மட்டுமே. உடனே தளம் ${floor}-ல் உள்ள ${room}-க்கு செல்லவும்.`,
        te: `క్యూ మిత్ర అలర్ట్: మీ వంతు దగ్గర పడింది! మీ ముందు కేవలం 3 మంది మాత్రమే ఉన్నారు. దయచేసి వెంటనే అంతస్తు ${floor} లోని ${room} వద్దకు వెళ్లండి.`,
      };
      break;

    case "called":
      message = {
        en: `NOW CALLING: Token ${tokenNumber}! Please enter ${room} immediately. ${doctorName} is waiting for you.`,
        hi: `बुलावा: टोकन ${tokenNumber}! कृपया तुरंत ${room} में प्रवेश करें। ${doctorName} आपकी प्रतीक्षा कर रहे हैं।`,
        ta: `அழைப்பு: டோக்கன் ${tokenNumber}! உடனடியாக ${room}-க்குள் செல்லவும். ${doctorName} காத்திருக்கிறார்.`,
        te: `పిలుపు: టోకెన్ ${tokenNumber}! దయచేసి వెంటనే ${room} లోకి వెళ్లండి. ${doctorName} మీ కోసం వేచి ఉన్నారు.`,
      };
      break;

    case "doctor_delay":
      message = {
        en: `Update from CDH: Doctor in ${room} is running approximately ${delayMinutes} minutes behind schedule. Your estimated wait has been updated.`,
        hi: `सीडीएच सूचना: ${room} में डॉक्टर लगभग ${delayMinutes} मिनट की देरी से हैं। आपका अनुमानित समय अपडेट कर दिया गया है।`,
        ta: `சிடிஹெச் தகவல்: ${room}-ல் உள்ள மருத்துவர் சுமார் ${delayMinutes} நிமிடங்கள் தாமதமாக உள்ளார். காத்திருப்பு நேரம் புதுப்பிக்கப்பட்டது.`,
        te: `CDH సమాచారం: ${room} లో డాక్టర్ దాదాపు ${delayMinutes} నిమిషాలు ఆలస్యంగా ఉన్నారు. మీ వేచి ఉండే సమయం అప్‌డేట్ చేయబడింది.`,
      };
      break;

    case "transferred":
      message = {
        en: `Department Transfer: Your consultation has been routed to ${deptName}. Your new token is ${tokenNumber}. Please head to ${room}.`,
        hi: `विभाग स्थानांतरण: आपका परामर्श ${deptName} में स्थानांतरित कर दिया गया है। नया टोकन ${tokenNumber} है। कृपया ${room} जाएं।`,
        ta: `பிரிவு மாற்றம்: உங்கள் ஆலோசனை ${deptName}-க்கு மாற்றப்பட்டது. புதிய டோக்கன் ${tokenNumber}. தயவுசெய்து ${room}-க்கு செல்லவும்.`,
        te: `విభాగం బదిలీ: మీ సంప్రదింపు ${deptName} కి మార్చబడింది. మీ కొత్త టోకెన్ ${tokenNumber}. దయచేసి ${room} కి వెళ్లండి.`,
      };
      break;

    default:
      message = {
        en: `Queue Mitra CDH notification for token ${tokenNumber}`,
        hi: `टोकन ${tokenNumber} के लिए कतार मित्र सूचना`,
        ta: `டோக்கன் ${tokenNumber} க்கான கியூ மித்ரா அறிவிப்பு`,
        te: `టోకెన్ ${tokenNumber} కొరకు క్యూ మిత్ర సమాచారం`,
      };
  }

  const record = await Notification.create({
    ticket: ticket._id,
    publicId: ticket.publicId,
    tokenNumber,
    mobile,
    type,
    message,
    sentAt: new Date(),
  });

  // Push SMS alert live to patient's active screen
  emit(rooms.ticket(ticket.publicId), "ticket:sms", {
    id: record._id,
    type,
    tokenNumber,
    message,
    sentAt: record.sentAt,
  });

  return record;
}

export async function getNotifications(publicIdOrMobile) {
  const query = publicIdOrMobile.includes("-")
    ? { publicId: publicIdOrMobile }
    : { mobile: publicIdOrMobile };

  return Notification.find(query).sort({ sentAt: -1 }).limit(20).lean();
}
