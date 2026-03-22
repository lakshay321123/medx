export type UILang = "en" | "hi" | "es" | "it";

const strings: Record<string, Record<UILang, string>> = {
  "Ask about your health": { en: "Ask about your health", hi: "अपने स्वास्थ्य के बारे में पूछें", es: "Pregunta sobre tu salud", it: "Chiedi della tua salute" },
  "New chat": { en: "New chat", hi: "नई चैट", es: "Nuevo chat", it: "Nuova chat" },
  "Medical profile": { en: "Medical profile", hi: "चिकित्सा प्रोफ़ाइल", es: "Perfil médico", it: "Profilo medico" },
  "Timeline": { en: "Timeline", hi: "समयरेखा", es: "Cronología", it: "Cronologia" },
  "Directory": { en: "Directory", hi: "निर्देशिका", es: "Directorio", it: "Directory" },
  "Search": { en: "Search", hi: "खोजें", es: "Buscar", it: "Cerca" },
  "Health Score": { en: "Health Score", hi: "स्वास्थ्य स्कोर", es: "Puntuación de salud", it: "Punteggio salute" },
  "Generate Score": { en: "Generate Score", hi: "स्कोर बनाएं", es: "Generar puntuación", it: "Genera punteggio" },
  "Daily Check-in": { en: "Daily Check-in", hi: "दैनिक चेक-इन", es: "Control diario", it: "Check-in giornaliero" },
  "How are you feeling?": { en: "How are you feeling?", hi: "आप कैसा महसूस कर रहे हैं?", es: "¿Cómo te sientes?", it: "Come ti senti?" },
  "Save": { en: "Save", hi: "सहेजें", es: "Guardar", it: "Salva" },
  "Cancel": { en: "Cancel", hi: "रद्द करें", es: "Cancelar", it: "Annulla" },
  "Export Health Report": { en: "Export Health Report", hi: "स्वास्थ्य रिपोर्ट निर्यात करें", es: "Exportar informe de salud", it: "Esporta rapporto sanitario" },
  "Wellness": { en: "Wellness", hi: "कल्याण", es: "Bienestar", it: "Benessere" },
  "Therapy": { en: "Therapy", hi: "थेरेपी", es: "Terapia", it: "Terapia" },
  "Research": { en: "Research", hi: "अनुसंधान", es: "Investigación", it: "Ricerca" },
  "Clinical": { en: "Clinical", hi: "क्लिनिकल", es: "Clínico", it: "Clinico" },
  "AI Doc": { en: "AI Doc", hi: "एआई डॉक", es: "AI Doc", it: "AI Doc" },
  "Medication Reminders": { en: "Medication Reminders", hi: "दवा अनुस्मारक", es: "Recordatorios de medicación", it: "Promemoria farmaci" },
  "Family Members": { en: "Family Members", hi: "परिवार के सदस्य", es: "Miembros de la familia", it: "Membri della famiglia" },
  "Connected Devices": { en: "Connected Devices", hi: "जुड़े उपकरण", es: "Dispositivos conectados", it: "Dispositivi connessi" },
};

export function t(key: string, lang: UILang = "en"): string {
  return strings[key]?.[lang] || strings[key]?.en || key;
}
