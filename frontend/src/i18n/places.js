import { departmentForRoom } from '../api/departments.js'

// Names and landmarks for every place in the building, in every language, keyed by place id.
// The backend sends one name in English; these match the floor plans drawn in components/map/floorPlans.js
// (walking in from the main gate, "left" and "right" are as you face the far end of the corridor).
// [name, landmark]
const PLACES = {
  main_entrance_0: {
    en: ['Main gate', 'Front of the building. The security desk is here.'],
    hi: ['मुख्य गेट', 'इमारत के सामने। यहाँ सुरक्षा डेस्क है।'],
    te: ['ప్రధాన గేటు', 'భవనం ముందు భాగం. ఇక్కడ సెక్యూరిటీ డెస్క్ ఉంది.'],
    ta: ['முதன்மை வாயில்', 'கட்டடத்தின் முன்பகுதி. இங்கே பாதுகாப்பு மேசை உள்ளது.'],
  },
  wheelchair_point_0: {
    en: ['Wheelchairs', 'Just inside the main gate, on the left.'],
    hi: ['व्हीलचेयर', 'मुख्य गेट से अंदर आते ही बाईं ओर।'],
    te: ['వీల్‌చైర్లు', 'ప్రధాన గేటు లోపలికి రాగానే ఎడమ వైపు.'],
    ta: ['சக்கர நாற்காலிகள்', 'முதன்மை வாயிலுக்குள் நுழைந்ததும் இடது பக்கம்.'],
  },
  ramp_0: {
    en: ['Ramp', 'Just inside the main gate, on the right. A gentle slope with no steps.'],
    hi: ['रैंप', 'मुख्य गेट से अंदर आते ही दाईं ओर। ढलान वाला रास्ता, कोई सीढ़ी नहीं।'],
    te: ['ర్యాంప్', 'ప్రధాన గేటు లోపలికి రాగానే కుడి వైపు. మెట్లు లేని వాలు దారి.'],
    ta: ['சாய்வுப் பாதை', 'முதன்மை வாயிலுக்குள் நுழைந்ததும் வலது பக்கம். படிகள் இல்லாத சாய்வுப் பாதை.'],
  },
  emergency_casualty_0: {
    en: ['Emergency (Casualty)', 'First door on the left after the main gate. Red sign and a red line on the floor.'],
    hi: ['इमरजेंसी (कैजुअल्टी)', 'मुख्य गेट के बाद बाईं ओर पहला दरवाज़ा। लाल बोर्ड और फ़र्श पर लाल लाइन।'],
    te: ['అత్యవసర విభాగం (క్యాజువాలిటీ)', 'ప్రధాన గేటు తర్వాత ఎడమ వైపు మొదటి తలుపు. ఎరుపు బోర్డు, నేలపై ఎరుపు గీత.'],
    ta: ['அவசர சிகிச்சைப் பிரிவு (கேஷுவால்டி)', 'முதன்மை வாயிலுக்குப் பிறகு இடது பக்கம் முதல் கதவு. சிவப்புப் பலகை, தரையில் சிவப்புக் கோடு.'],
  },
  help_desk_0: {
    en: ['Help desk', 'Left side of the corridor, opposite the blue chairs.'],
    hi: ['हेल्प डेस्क (पूछताछ)', 'गलियारे में बाईं ओर, नीली कुर्सियों के सामने।'],
    te: ['సహాయ కేంద్రం', 'కారిడార్‌లో ఎడమ వైపు, నీలి కుర్చీల ఎదురుగా.'],
    ta: ['உதவி மையம்', 'நடைபாதையின் இடது பக்கம், நீல நாற்காலிகளுக்கு எதிரே.'],
  },
  reg_counters_0: {
    en: ['Registration counters', 'Left side, after the help desk. Counters 1 to 4.'],
    hi: ['पंजीकरण काउंटर', 'बाईं ओर, हेल्प डेस्क के बाद। काउंटर 1 से 4।'],
    te: ['నమోదు కౌంటర్లు', 'ఎడమ వైపు, సహాయ కేంద్రం తర్వాత. కౌంటర్లు 1 నుండి 4.'],
    ta: ['பதிவு கவுண்டர்கள்', 'இடது பக்கம், உதவி மையத்துக்குப் பிறகு. கவுண்டர் 1 முதல் 4.'],
  },
  pharmacy_0: {
    en: ['Pharmacy (medicines)', 'Left side, at the far end of the corridor.'],
    hi: ['दवा खिड़की (फ़ार्मेसी)', 'बाईं ओर, गलियारे के आख़िर में।'],
    te: ['మందుల కౌంటర్ (ఫార్మసీ)', 'ఎడమ వైపు, కారిడార్ చివరలో.'],
    ta: ['மருந்தகம்', 'இடது பக்கம், நடைபாதையின் கடைசியில்.'],
  },
  stairs_0: {
    en: ['Stairs', 'First door on the right after the main gate.'],
    hi: ['सीढ़ियाँ', 'मुख्य गेट के बाद दाईं ओर पहला दरवाज़ा।'],
    te: ['మెట్లు', 'ప్రధాన గేటు తర్వాత కుడి వైపు మొదటి తలుపు.'],
    ta: ['படிக்கட்டு', 'முதன்மை வாயிலுக்குப் பிறகு வலது பக்கம் முதல் கதவு.'],
  },
  lift_0: {
    en: ['Lift', 'Right side, next to the stairs.'],
    hi: ['लिफ़्ट', 'दाईं ओर, सीढ़ियों के बगल में।'],
    te: ['లిఫ్ట్', 'కుడి వైపు, మెట్ల పక్కన.'],
    ta: ['மின்தூக்கி (லிஃப்ட்)', 'வலது பக்கம், படிக்கட்டின் அருகில்.'],
  },
  toilets_0: {
    en: ['Toilets', 'Right side, after the lift. A wheelchair toilet is here.'],
    hi: ['शौचालय', 'दाईं ओर, लिफ़्ट के बाद। व्हीलचेयर वाला शौचालय भी है।'],
    te: ['మరుగుదొడ్లు', 'కుడి వైపు, లిఫ్ట్ తర్వాత. వీల్‌చైర్ మరుగుదొడ్డి కూడా ఉంది.'],
    ta: ['கழிப்பறை', 'வலது பக்கம், லிஃப்டுக்குப் பிறகு. சக்கர நாற்காலி கழிப்பறையும் உள்ளது.'],
  },
  drinking_water_0: {
    en: ['Drinking water', 'Right side, a steel water cooler after the toilets.'],
    hi: ['पीने का पानी', 'दाईं ओर, शौचालय के बाद स्टील का वाटर कूलर।'],
    te: ['తాగునీరు', 'కుడి వైపు, మరుగుదొడ్ల తర్వాత స్టీల్ వాటర్ కూలర్.'],
    ta: ['குடிநீர்', 'வலது பக்கம், கழிப்பறைக்குப் பிறகு எஃகு குடிநீர் குளிர்விப்பான்.'],
  },
  xray_0: {
    en: ['X-ray', 'Right side, with a yellow sign outside.'],
    hi: ['एक्स-रे', 'दाईं ओर, बाहर पीला बोर्ड लगा है।'],
    te: ['ఎక్స్-రే', 'కుడి వైపు, బయట పసుపు బోర్డు ఉంది.'],
    ta: ['எக்ஸ்-ரே', 'வலது பக்கம், வெளியே மஞ்சள் பலகை உள்ளது.'],
  },
  laboratory_0: {
    en: ['Laboratory (blood tests)', 'Right side, at the far end of the corridor.'],
    hi: ['लैब (खून की जाँच)', 'दाईं ओर, गलियारे के आख़िर में।'],
    te: ['ల్యాబ్ (రక్త పరీక్షలు)', 'కుడి వైపు, కారిడార్ చివరలో.'],
    ta: ['ஆய்வகம் (இரத்தப் பரிசோதனை)', 'வலது பக்கம், நடைபாதையின் கடைசியில்.'],
  },
  lift_1: {
    en: ['Lift', 'The lift opens into the OPD corridor, on the right.'],
    hi: ['लिफ़्ट', 'लिफ़्ट ओपीडी गलियारे में दाईं ओर खुलती है।'],
    te: ['లిఫ్ట్', 'లిఫ్ట్ OPD కారిడార్‌లో కుడి వైపు తెరుచుకుంటుంది.'],
    ta: ['மின்தூக்கி (லிஃப்ட்)', 'லிஃப்ட் OPD நடைபாதையில் வலது பக்கம் திறக்கும்.'],
  },
  stairs_1: {
    en: ['Stairs', 'Right side, next to the lift.'],
    hi: ['सीढ़ियाँ', 'दाईं ओर, लिफ़्ट के बगल में।'],
    te: ['మెట్లు', 'కుడి వైపు, లిఫ్ట్ పక్కన.'],
    ta: ['படிக்கட்டு', 'வலது பக்கம், லிஃப்டின் அருகில்.'],
  },
  toilets_1: {
    en: ['Toilets', 'Left side, opposite the stairs.'],
    hi: ['शौचालय', 'बाईं ओर, सीढ़ियों के सामने।'],
    te: ['మరుగుదొడ్లు', 'ఎడమ వైపు, మెట్ల ఎదురుగా.'],
    ta: ['கழிப்பறை', 'இடது பக்கம், படிக்கட்டுக்கு எதிரே.'],
  },
  waiting_hall_a_1: {
    en: ['Waiting Hall A', 'Left side, opposite the lift. Benches and a TV that shows tokens.'],
    hi: ['वेटिंग हॉल A', 'बाईं ओर, लिफ़्ट के सामने। बेंच और टोकन दिखाने वाला टीवी।'],
    te: ['వెయిటింగ్ హాల్ A', 'ఎడమ వైపు, లిఫ్ట్ ఎదురుగా. బెంచీలు, టోకెన్లు చూపే టీవీ.'],
    ta: ['காத்திருப்பு அறை A', 'இடது பக்கம், லிஃப்டுக்கு எதிரே. இருக்கைகளும் டோக்கன் காட்டும் டிவியும்.'],
  },
  help_desk_1: {
    en: ['Help desk', 'Right side, just after the lift.'],
    hi: ['हेल्प डेस्क (पूछताछ)', 'दाईं ओर, लिफ़्ट के ठीक बाद।'],
    te: ['సహాయ కేంద్రం', 'కుడి వైపు, లిఫ్ట్ దాటగానే.'],
    ta: ['உதவி மையம்', 'வலது பக்கம், லிஃப்டைத் தாண்டியதும்.'],
  },
  nurses_station_2: {
    en: ["Nurses' station", 'Right side, next to the lift. Nurses are here day and night.'],
    hi: ['नर्स स्टेशन', 'दाईं ओर, लिफ़्ट के बगल में। नर्स दिन-रात यहाँ रहती हैं।'],
    te: ['నర్సుల స్టేషన్', 'కుడి వైపు, లిఫ్ట్ పక్కన. నర్సులు రాత్రింబవళ్లు ఇక్కడ ఉంటారు.'],
    ta: ['செவிலியர் நிலையம்', 'வலது பக்கம், லிஃப்டின் அருகில். செவிலியர்கள் இரவும் பகலும் இங்கே இருப்பார்கள்.'],
  },
  lift_2: {
    en: ['Lift', "The lift opens next to the nurses' station."],
    hi: ['लिफ़्ट', 'लिफ़्ट नर्स स्टेशन के बगल में खुलती है।'],
    te: ['లిఫ్ట్', 'లిఫ్ట్ నర్సుల స్టేషన్ పక్కన తెరుచుకుంటుంది.'],
    ta: ['மின்தூக்கி (லிஃப்ட்)', 'லிஃப்ட் செவிலியர் நிலையத்தின் அருகில் திறக்கும்.'],
  },
  stairs_2: {
    en: ['Stairs', 'Next to the lift, under the fire exit sign.'],
    hi: ['सीढ़ियाँ', 'लिफ़्ट के बगल में, फ़ायर एग्ज़िट बोर्ड के नीचे।'],
    te: ['మెట్లు', 'లిఫ్ట్ పక్కన, ఫైర్ ఎగ్జిట్ బోర్డు కింద.'],
    ta: ['படிக்கட்டு', 'லிஃப்டின் அருகில், தீ வெளியேறும் பலகைக்குக் கீழே.'],
  },
  ward_4: {
    en: ['Ward 4 (Medicine)', 'Left side, at the far end of the corridor.'],
    hi: ['वार्ड 4 (मेडिसिन)', 'बाईं ओर, गलियारे के आख़िर में।'],
    te: ['వార్డు 4 (మెడిసిన్)', 'ఎడమ వైపు, కారిడార్ చివరలో.'],
    ta: ['வார்டு 4 (மருத்துவம்)', 'இடது பக்கம், நடைபாதையின் கடைசியில்.'],
  },
  ward_5: {
    en: ['Ward 5 (Surgery)', 'Right side, at the far end of the corridor.'],
    hi: ['वार्ड 5 (सर्जरी)', 'दाईं ओर, गलियारे के आख़िर में।'],
    te: ['వార్డు 5 (సర్జరీ)', 'కుడి వైపు, కారిడార్ చివరలో.'],
    ta: ['வார்டு 5 (அறுவை சிகிச்சை)', 'வலது பக்கம், நடைபாதையின் கடைசியில்.'],
  },
  ward_6: {
    en: ['Ward 6 (Children)', 'Left side, in the middle of the corridor. Colourful door.'],
    hi: ['वार्ड 6 (बच्चे)', 'बाईं ओर, गलियारे के बीच में। रंग-बिरंगा दरवाज़ा।'],
    te: ['వార్డు 6 (పిల్లలు)', 'ఎడమ వైపు, కారిడార్ మధ్యలో. రంగుల తలుపు.'],
    ta: ['வார்டு 6 (குழந்தைகள்)', 'இடது பக்கம், நடைபாதையின் நடுவில். வண்ணமயமான கதவு.'],
  },
}

// OPD rooms: "Room 3" plus the department working there today (departments are created live by the admin).
const ROOM_WORD = { en: 'Room', hi: 'कमरा', te: 'గది', ta: 'அறை' }
const ROOM_SIDE = {
  // [left/right, position counted from the Waiting Hall end]
  en: ['First door on the left after the Waiting Hall.', 'Second door on the left.', 'Third door on the left.', 'Last door on the left, at the end of the corridor.',
    'First door on the right after the help desk.', 'Second door on the right.', 'Third door on the right.', 'Last door on the right, at the end of the corridor.'],
  hi: ['वेटिंग हॉल के बाद बाईं ओर पहला दरवाज़ा।', 'बाईं ओर दूसरा दरवाज़ा।', 'बाईं ओर तीसरा दरवाज़ा।', 'बाईं ओर आख़िरी दरवाज़ा, गलियारे के अंत में।',
    'हेल्प डेस्क के बाद दाईं ओर पहला दरवाज़ा।', 'दाईं ओर दूसरा दरवाज़ा।', 'दाईं ओर तीसरा दरवाज़ा।', 'दाईं ओर आख़िरी दरवाज़ा, गलियारे के अंत में।'],
  te: ['వెయిటింగ్ హాల్ తర్వాత ఎడమ వైపు మొదటి తలుపు.', 'ఎడమ వైపు రెండవ తలుపు.', 'ఎడమ వైపు మూడవ తలుపు.', 'ఎడమ వైపు చివరి తలుపు, కారిడార్ చివరలో.',
    'సహాయ కేంద్రం తర్వాత కుడి వైపు మొదటి తలుపు.', 'కుడి వైపు రెండవ తలుపు.', 'కుడి వైపు మూడవ తలుపు.', 'కుడి వైపు చివరి తలుపు, కారిడార్ చివరలో.'],
  ta: ['காத்திருப்பு அறைக்குப் பிறகு இடது பக்கம் முதல் கதவு.', 'இடது பக்கம் இரண்டாவது கதவு.', 'இடது பக்கம் மூன்றாவது கதவு.', 'இடது பக்கம் கடைசிக் கதவு, நடைபாதையின் முடிவில்.',
    'உதவி மையத்துக்குப் பிறகு வலது பக்கம் முதல் கதவு.', 'வலது பக்கம் இரண்டாவது கதவு.', 'வலது பக்கம் மூன்றாவது கதவு.', 'வலது பக்கம் கடைசிக் கதவு, நடைபாதையின் முடிவில்.'],
}

const CHECKPOINT_NAMES = {
  CP_MAIN_ENTRANCE: { en: 'Main gate', hi: 'मुख्य गेट', te: 'ప్రధాన గేటు', ta: 'முதன்மை வாயில்' },
  CP_HELP_DESK: { en: 'Help desk (blue chairs)', hi: 'हेल्प डेस्क (नीली कुर्सियाँ)', te: 'సహాయ కేంద్రం (నీలి కుర్చీలు)', ta: 'உதவி மையம் (நீல நாற்காலிகள்)' },
  CP_LIFT_G: { en: 'Ground floor lift', hi: 'भूतल की लिफ़्ट', te: 'గ్రౌండ్ ఫ్లోర్ లిఫ్ట్', ta: 'தரைத்தள லிஃப்ட்' },
  CP_PHARMACY: { en: 'Pharmacy', hi: 'दवा खिड़की', te: 'మందుల కౌంటర్', ta: 'மருந்தகம்' },
  CP_WAITING_HALL_A: { en: 'Waiting Hall A', hi: 'वेटिंग हॉल A', te: 'వెయిటింగ్ హాల్ A', ta: 'காத்திருப்பு அறை A' },
  CP_WATER_COOLER_1: { en: 'First floor corridor', hi: 'पहली मंज़िल का गलियारा', te: 'మొదటి అంతస్తు కారిడార్', ta: 'முதல் தள நடைபாதை' },
  CP_NURSES_STATION_2: { en: "Nurses' station", hi: 'नर्स स्टेशन', te: 'నర్సుల స్టేషన్', ta: 'செவிலியர் நிலையம்' },
}

const roomNumber = (place) => Number(String(place.id).replace('room_', ''))

/** "Room 3 (Children)" in the patient's language. `short` leaves out the department. */
export function placeNameFor(place, lang, t, { short = false } = {}) {
  if (!place) return ''
  if (place.category === 'opd_room') {
    const n = roomNumber(place)
    const label = `${ROOM_WORD[lang] || ROOM_WORD.en} ${n}`
    if (short) return label
    const dept = departmentForRoom(`Room ${n}`)
    const deptName = dept ? (lang !== 'en' && dept.translations?.[lang]?.name) || dept.name : ''
    return deptName ? `${label} (${deptName})` : label
  }
  return PLACES[place.id]?.[lang]?.[0] || PLACES[place.id]?.en?.[0] || place.name || t?.place || ''
}

/** Landmark sentence for a place, in the patient's language. */
export function landmarkFor(place, lang) {
  if (!place) return ''
  if (place.category === 'opd_room') {
    const n = roomNumber(place)
    return (ROOM_SIDE[lang] || ROOM_SIDE.en)[n - 1] || ''
  }
  const own = PLACES[place.id]?.[lang]?.[1] || PLACES[place.id]?.en?.[1]
  if (own) return own
  const lm = place.landmark
  return typeof lm === 'string' ? lm : lm?.[lang] || lm?.en || ''
}

export function checkpointNameFor(checkpoint, lang) {
  return CHECKPOINT_NAMES[checkpoint.id]?.[lang] || checkpoint.name
}
