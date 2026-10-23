// The backend returns place names in English only (landmarks are trilingual), so the
// non-English names live here, keyed by place id. OPD rooms are built from department names.
const NAMES = {
  main_entrance_0: { hi: 'मुख्य प्रवेश द्वार', ta: 'முதன்மை நுழைவாயில்' },
  reg_counters_0: { hi: 'पंजीकरण काउंटर', ta: 'பதிவு கவுண்ட்டர்கள்' },
  help_desk_0: { hi: 'हेल्प डेस्क', ta: 'உதவி மையம்' },
  wheelchair_point_0: { hi: 'व्हीलचेयर स्थान', ta: 'சக்கர நாற்காலி இடம்' },
  emergency_casualty_0: { hi: 'इमरजेंसी (कैजुअल्टी)', ta: 'அவசர சிகிச்சை பிரிவு' },
  pharmacy_0: { hi: 'फ़ार्मेसी (दवा काउंटर)', ta: 'மருந்தகம்' },
  drinking_water_0: { hi: 'पीने का पानी', ta: 'குடிநீர்' },
  toilets_0: { hi: 'शौचालय (भूतल)', ta: 'கழிப்பறை (தரைத்தளம்)' },
  laboratory_0: { hi: 'प्रयोगशाला (खून की जांच)', ta: 'ஆய்வகம் (இரத்தப் பரிசோதனை)' },
  xray_0: { hi: 'एक्स-रे', ta: 'எக்ஸ்-ரே' },
  lift_0: { hi: 'लिफ्ट (भूतल)', ta: 'மின்தூக்கி (தரைத்தளம்)' },
  stairs_0: { hi: 'सीढ़ियां (भूतल)', ta: 'படிக்கட்டு (தரைத்தளம்)' },
  ramp_0: { hi: 'रैंप', ta: 'சாய்வு பாதை' },
  lift_1: { hi: 'लिफ्ट (पहली मंजिल)', ta: 'மின்தூக்கி (முதல் தளம்)' },
  stairs_1: { hi: 'सीढ़ियां (पहली मंजिल)', ta: 'படிக்கட்டு (முதல் தளம்)' },
  waiting_hall_a_1: { hi: 'वेटिंग हॉल ए', ta: 'காத்திருப்பு கூடம் ஏ' },
  help_desk_1: { hi: 'ओपीडी फ्लोर हेल्प डेस्क', ta: 'ஓபிடி தள உதவி மையம்' },
  toilets_1: { hi: 'शौचालय (पहली मंजिल)', ta: 'கழிப்பறை (முதல் தளம்)' },
  lift_2: { hi: 'लिफ्ट (दूसरी मंजिल)', ta: 'மின்தூக்கி (இரண்டாம் தளம்)' },
  stairs_2: { hi: 'सीढ़ियां (दूसरी मंजिल)', ta: 'படிக்கட்டு (இரண்டாம் தளம்)' },
  nurses_station_2: { hi: 'नर्स स्टेशन (दूसरी मंजिल)', ta: 'செவிலியர் நிலையம் (இரண்டாம் தளம்)' },
  ward_4: { hi: 'वार्ड 4 (मेडिसिन)', ta: 'வார்டு 4 (மருத்துவம்)' },
  ward_5: { hi: 'वार्ड 5 (सर्जरी)', ta: 'வார்டு 5 (அறுவை சிகிச்சை)' },
  ward_6: { hi: 'वार्ड 6 (बच्चे)', ta: 'வார்டு 6 (குழந்தைகள்)' },
}

const CHECKPOINT_NAMES = {
  CP_MAIN_ENTRANCE: { en: 'Main entrance gate poster', hi: 'मुख्य गेट का पोस्टर', ta: 'முதன்மை நுழைவாயில் சுவரொட்டி' },
  CP_HELP_DESK: { en: 'Help desk (blue chairs)', hi: 'हेल्प डेस्क (नीली कुर्सियां)', ta: 'உதவி மையம் (நீல நாற்காலிகள்)' },
  CP_LIFT_G: { en: 'Ground floor lift wall', hi: 'भूतल लिफ्ट की दीवार', ta: 'தரைத்தள மின்தூக்கி சுவர்' },
  CP_PHARMACY: { en: 'Pharmacy waiting area pillar', hi: 'फ़ार्मेसी प्रतीक्षा क्षेत्र का खंभा', ta: 'மருந்தகம் காத்திருப்பு தூண்' },
  CP_WAITING_HALL_A: { en: 'Waiting Hall A TV board pillar', hi: 'वेटिंग हॉल ए टीवी बोर्ड का खंभा', ta: 'காத்திருப்பு கூடம் ஏ தொலைக்காட்சி தூண்' },
  CP_WATER_COOLER_1: { en: 'First floor water cooler', hi: 'पहली मंजिल पर पानी का कूलर', ta: 'முதல் தளம் குடிநீர் இயந்திரம்' },
  CP_NURSES_STATION_2: { en: "Second floor nurses' station", hi: 'दूसरी मंजिल नर्स स्टेशन', ta: 'இரண்டாம் தளம் செவிலியர் நிலையம்' },
}

export function placeNameFor(place, lang, deptNameOf, roomWord) {
  if (!place) return ''
  if (lang === 'en') return place.name
  if (place.category === 'opd_room') {
    const n = place.id.replace('room_', '')
    const dept = place.departmentCode ? deptNameOf(place.departmentCode) : ''
    return `${roomWord} ${n}${dept ? ` (${dept})` : ''}`
  }
  return NAMES[place.id]?.[lang] || place.name
}

export function checkpointNameFor(checkpoint, lang) {
  return CHECKPOINT_NAMES[checkpoint.id]?.[lang] || checkpoint.name
}
