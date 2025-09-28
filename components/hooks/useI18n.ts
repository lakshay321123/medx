"use client";

import { usePrefs } from "@/components/providers/PreferencesProvider";

const DICT: Record<string, Record<string, string>> = {
  en: {
    Preferences: "Preferences",
    General: "General",
    Notifications: "Notifications",
    Personalization: "Personalization",
    Connectors: "Connectors",
    Schedules: "Schedules",
    "Data controls": "Data controls",
    Security: "Security",
    Account: "Account",
    Theme: "Theme",
    "Accent color": "Accent color",
    Language: "Language",
    Voice: "Voice",
    "Legal & Privacy": "Legal & Privacy",
    Introduction: "Introduction",
    "Intro.copy":
      "Second Opinion provides AI-assisted health insights to complement conversations with licensed clinicians. These terms explain how we handle information, service limits, and your cookie/data choices.",
    "Medical Advice Disclaimer": "Medical Advice Disclaimer",
    "Disclaimer.copy":
      "The chat experience does not replace personalized care from a qualified professional. Always consult your clinician for medical questions. Don’t ignore or delay care because of something you read here.",
    "AI Limitations": "AI Limitations",
    "Limitations.copy":
      "AI can misunderstand context or present outdated research. Double-check important findings, especially before making care decisions.",
    "Consent.checkbox":
      "I agree to the Legal & Privacy terms, including handling of my data and cookie preferences as described above.",
    "Reject Non-Essential": "Reject Non-Essential",
    Accept: "Accept",
    Cancel: "Cancel",
    "Save changes": "Save changes",
    "Adjust how MedX behaves and personalizes your care.":
      "Adjust how MedX behaves and personalizes your care.",
    "Select how the interface adapts to your system.":
      "Select how the interface adapts to your system.",
    "Choose your preferred conversational language.":
      "Choose your preferred conversational language.",
    "Preview and select the voice used for spoken responses.":
      "Preview and select the voice used for spoken responses.",
    "We use cookies to improve your experience. See our":
      "We use cookies to improve your experience. See our",
    "Cookie Policy": "Cookie Policy",
    "Accept all": "Accept all",
    "Reject non-essential": "Reject non-essential",
    Manage: "Manage",
    "New chat": "New chat",
    Search: "Search",
    Directory: "Directory",
    "Medical Profile": "Medical Profile",
    Timeline: "Timeline",
    Alerts: "Alerts",
    Wellness: "Wellness",
    Therapy: "Therapy",
    Research: "Research",
    Clinical: "Clinical",
    "AI Doc": "AI Doc",
    "Type a message": "Type a message",
    Send: "Send",
    "Start a new conversation": "Start a new conversation",
    "Ask about wellness, therapy, research or clinical topics.":
      "Ask about wellness, therapy, research or clinical topics.",
    Upload: "Upload",
    "Wellness Mode: ON": "Wellness Mode: ON",
    "Clinical Mode: ON": "Clinical Mode: ON",
    "Therapy Mode: ON": "Therapy Mode: ON",
    "AI Doc: ON": "AI Doc: ON",
    "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.":
      "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.",
    "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.":
      "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.",
    "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.":
      "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.",
    "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.":
      "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.",
    "Clinical reasoning on demand. Built for doctors, nurses, and medical students.":
      "Clinical reasoning on demand. Built for doctors, nurses, and medical students.",
    "Depth when it matters. Structured differentials, red flags, and management—professional grade.":
      "Depth when it matters. Structured differentials, red flags, and management—professional grade.",
    "Evidence-ready, clinician-first.": "Evidence-ready, clinician-first.",
    "Precision over prose. Concise clinical answers with clear next steps.":
      "Precision over prose. Concise clinical answers with clear next steps.",
    "Therapy guidance, made clear. Tools and support; not for emergencies.":
      "Therapy guidance, made clear. Tools and support; not for emergencies.",
    "Calm, structured support. Practical techniques and next steps.":
      "Calm, structured support. Practical techniques and next steps.",
    "Clarity for tough days. Grounded guidance, actionable exercises.":
      "Clarity for tough days. Grounded guidance, actionable exercises.",
    "Steady help, simple words. Skills you can use today.":
      "Steady help, simple words. Skills you can use today.",
    "Your records, organized. Upload, store, and retrieve securely.":
      "Your records, organized. Upload, store, and retrieve securely.",
    "All your reports in one place. Fast search, clear summaries.":
      "All your reports in one place. Fast search, clear summaries.",
    "Medical files that make sense. Structured, searchable, shareable.":
      "Medical files that make sense. Structured, searchable, shareable.",
    "From paper to clarity. Digitize reports; get clean overviews.":
      "From paper to clarity. Digitize reports; get clean overviews.",
    "Research: On — web evidence": "Research: On — web evidence",
    "Research: Off — enable web evidence": "Research: Off — enable web evidence",
  },
  hi: {
    Preferences: "प्राथमिकताएँ",
    General: "जनरल",
    Notifications: "सूचनाएँ",
    Personalization: "व्यक्तिकरण",
    Connectors: "कनेक्टर्स",
    Schedules: "अनुसूचियाँ",
    "Data controls": "डाटा नियंत्रण",
    Security: "सुरक्षा",
    Account: "खाता",
    Theme: "थीम",
    "Accent color": "एक्सेंट रंग",
    Language: "भाषा",
    Voice: "आवाज़",
    "Legal & Privacy": "कानूनी व गोपनीयता",
    Introduction: "परिचय",
    "Intro.copy":
      "सेकंड ओपिनियन लाइसेंस प्राप्त चिकित्सकों के साथ बातचीत को पूरक करने हेतु एआई-आधारित स्वास्थ्य जानकारी देता है। यहाँ हम डाटा उपयोग, सेवा सीमाएँ और कुकी/डाटा विकल्प समझाते हैं।",
    "Medical Advice Disclaimer": "चिकित्सीय सलाह अस्वीकरण",
    "Disclaimer.copy":
      "चैट अनुभव व्यक्तिगत चिकित्सा सलाह का स्थानापन्न नहीं है। किसी भी स्थिति में अपने चिकित्सक से परामर्श करें; यहाँ पढ़ी बातों के कारण देखभाल में देरी/अनदेखी न करें।",
    "AI Limitations": "एआई सीमाएँ",
    "Limitations.copy":
      "एआई संदर्भ समझने में चूक या पुराना शोध दिखा सकता है; विशेषकर निर्णय लेने से पहले महत्वपूर्ण निष्कर्षों को दोबारा जाँचें।",
    "Consent.checkbox":
      "ऊपर वर्णित अनुसार मेरे डाटा व कुकी वरीयताओं के साथ कानूनी व गोपनीयता शर्तों से सहमत हूँ।",
    "Reject Non-Essential": "गैर-आवश्यक अस्वीकार",
    Accept: "स्वीकार",
    Cancel: "रद्द करें",
    "Save changes": "परिवर्तन सहेजें",
    "Adjust how MedX behaves and personalizes your care.":
      "MedX के व्यवहार और निजीकरण समायोजित करें।",
    "Select how the interface adapts to your system.":
      "इंटरफ़ेस सिस्टम से कैसे मेल खाए, चुनें।",
    "Choose your preferred conversational language.":
      "अपनी पसंदीदा भाषा चुनें।",
    "Preview and select the voice used for spoken responses.":
      "आवाज़ का पूर्वावलोकन और चयन करें।",
    "We use cookies to improve your experience. See our":
      "हम आपके अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग करते हैं। हमारा",
    "Cookie Policy": "कुकी नीति",
    "Accept all": "सभी स्वीकार करें",
    "Reject non-essential": "गैर-आवश्यक अस्वीकार करें",
    Manage: "प्रबंधित करें",
    "New chat": "नई चैट",
    Search: "खोजें",
    Directory: "निर्देशिका",
    "Medical Profile": "मेडिकल प्रोफ़ाइल",
    Timeline: "टाइमलाइन",
    Alerts: "अलर्ट",
    Wellness: "वेलनेस",
    Therapy: "थेरेपी",
    Research: "रिसर्च",
    Clinical: "क्लिनिकल",
    "AI Doc": "एआई डॉक",
    "Type a message": "संदेश लिखें",
    Send: "भेजें",
    "Start a new conversation": "नई बातचीत शुरू करें",
    "Ask about wellness, therapy, research or clinical topics.":
      "वेलनेस, थेरेपी, रिसर्च या क्लिनिकल विषय पूछें।",
    Upload: "अपलोड",
    "Wellness Mode: ON": "वेलनेस मोड: चालू",
    "Clinical Mode: ON": "क्लिनिकल मोड: चालू",
    "Therapy Mode: ON": "थेरेपी मोड: चालू",
    "AI Doc: ON": "एआई डॉक: चालू",
    "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.":
      "आपका स्वास्थ्य, सरल बनाया गया। रिपोर्ट, सुझाव, दवाएँ, आहार और फिटनेस—साफ भाषा में समझाया गया।",
    "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.":
      "स्वास्थ्य की हर बात, बिना भारी शब्दों के। लैब रिपोर्ट से रोज़मर्रा की आदतों तक—दवाएँ, आहार, फिटनेस—आसानी से अपनाने लायक।",
    "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.":
      "दैनिक देखभाल के लिए स्पष्टता। रिपोर्ट, मार्गदर्शन, दवाएँ, आहार और फिटनेस—एक नज़र में समझें।",
    "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.":
      "आपका पूरा स्वास्थ्य, डिकोड किया हुआ। रिपोर्ट, सुझाव, दवाएँ, आहार और फिटनेस—संक्षिप्त और उपयोगी।",
    "Clinical reasoning on demand. Built for doctors, nurses, and medical students.":
      "क्लिनिकल विचार तुरंत। डॉक्टर, नर्स और मेडिकल छात्रों के लिए तैयार।",
    "Depth when it matters. Structured differentials, red flags, and management—professional grade.":
      "ज़रूरत पड़ने पर गहराई। संरचित डिफरेंशियल, रेड फ्लैग और प्रबंधन—प्रोफेशनल स्तर।",
    "Evidence-ready, clinician-first.": "साक्ष्य तैयार, क्लिनिशियन-प्रथम।",
    "Precision over prose. Concise clinical answers with clear next steps.":
      "प्रिसिजन, सिर्फ़ बातों से आगे। संक्षिप्त क्लिनिकल उत्तर और स्पष्ट अगले कदम।",
    "Therapy guidance, made clear. Tools and support; not for emergencies.":
      "थेरेपी मार्गदर्शन, साफ़-साफ़। उपकरण और समर्थन; आपात स्थितियों के लिए नहीं।",
    "Calm, structured support. Practical techniques and next steps.":
      "शांत, संरचित सहारा। व्यावहारिक तकनीकें और अगले कदम।",
    "Clarity for tough days. Grounded guidance, actionable exercises.":
      "कठिन दिनों के लिए स्पष्टता। ठोस मार्गदर्शन, उपयोगी अभ्यास।",
    "Steady help, simple words. Skills you can use today.":
      "स्थिर मदद, सरल शब्द। आज ही उपयोग में आने वाले कौशल।",
    "Your records, organized. Upload, store, and retrieve securely.":
      "आपके रिकॉर्ड, व्यवस्थित। सुरक्षित रूप से अपलोड करें, संग्रहीत करें और प्राप्त करें।",
    "All your reports in one place. Fast search, clear summaries.":
      "आपकी सारी रिपोर्ट एक जगह। तेज़ खोज, साफ़ सारांश।",
    "Medical files that make sense. Structured, searchable, shareable.":
      "समझ आने वाली मेडिकल फ़ाइलें। संरचित, खोजने योग्य, साझा करने योग्य।",
    "From paper to clarity. Digitize reports; get clean overviews.":
      "कागज़ से स्पष्टता तक। रिपोर्ट डिजिटाइज़ करें; साफ़ अवलोकन पाएं।",
    "Research: On — web evidence": "रिसर्च: चालू — वेब साक्ष्य",
    "Research: Off — enable web evidence": "रिसर्च: बंद — वेब साक्ष्य चालू करें",
  },
  ar: {
    Preferences: "التفضيلات",
    General: "عام",
    Notifications: "الإشعارات",
    Personalization: "التخصيص",
    Connectors: "الموصلات",
    Schedules: "الجداول",
    "Data controls": "ضوابط البيانات",
    Security: "الأمان",
    Account: "الحساب",
    Theme: "السمة",
    "Accent color": "لون مميز",
    Language: "اللغة",
    Voice: "الصوت",
    "Legal & Privacy": "القانون والخصوصية",
    Introduction: "مقدمة",
    "Intro.copy":
      "يوفر Second Opinion رؤى صحية مدعومة بالذكاء الاصطناعي لتكميل محادثاتك مع الأطباء المرخّصين. تشرح هذه البنود كيفية معالجة البيانات وحدود الخدمة وخيارات ملفات تعريف الارتباط.",
    "Medical Advice Disclaimer": "إخلاء المسؤولية الطبية",
    "Disclaimer.copy":
      "لا تُعد الدردشة بديلاً عن رعاية شخصية من مختص مؤهل. استشر طبيبك دائماً؛ لا تُهمِل أو تؤخّر الرعاية بسبب ما تقرأه هنا.",
    "AI Limitations": "قيود الذكاء الاصطناعي",
    "Limitations.copy":
      "قد يسيء الذكاء الاصطناعي فهم السياق أو يعرض أبحاثاً قديمة؛ تحقّق من النتائج المهمة قبل قرارات الرعاية.",
    "Consent.checkbox":
      "أوافق على شروط القانون والخصوصية، بما في ذلك معالجة بياناتي وتفضيلات ملفات الارتباط كما هو موضح أعلاه.",
    "Reject Non-Essential": "رفض غير الأساسية",
    Accept: "موافقة",
    Cancel: "إلغاء",
    "Save changes": "حفظ التغييرات",
    "Adjust how MedX behaves and personalizes your care.":
      "اضبط سلوك MedX وتخصيص تجربتك.",
    "Select how the interface adapts to your system.":
      "اختر كيفية تكيف الواجهة مع نظامك.",
    "Choose your preferred conversational language.":
      "اختر لغتك المفضلة.",
    "Preview and select the voice used for spoken responses.":
      "عاين واختر الصوت.",
    "We use cookies to improve your experience. See our":
      "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. اطّلع على",
    "Cookie Policy": "سياسة ملفات تعريف الارتباط",
    "Accept all": "قبول الكل",
    "Reject non-essential": "رفض غير الضرورية",
    Manage: "إدارة",
    "New chat": "محادثة جديدة",
    Search: "بحث",
    Directory: "الدليل",
    "Medical Profile": "الملف الطبي",
    Timeline: "الجدول الزمني",
    Alerts: "التنبيهات",
    Wellness: "العافية",
    Therapy: "العلاج",
    Research: "البحث",
    Clinical: "سريري",
    "AI Doc": "مستند ذكي",
    "Type a message": "اكتب رسالة",
    Send: "إرسال",
    "Start a new conversation": "ابدأ محادثة جديدة",
    "Ask about wellness, therapy, research or clinical topics.":
      "اسأل عن العافية أو العلاج أو البحث أو السريري.",
    Upload: "تحميل",
    "Wellness Mode: ON": "وضع العافية: مفعل",
    "Clinical Mode: ON": "الوضع السريري: مفعل",
    "Therapy Mode: ON": "وضع العلاج: مفعل",
    "AI Doc: ON": "مستند ذكي: مفعل",
    "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.":
      "صحتك ببساطة. التقارير والنصائح والأدوية والحمية واللياقة — بلغة واضحة.",
    "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.":
      "كل ما يخص الصحة بلا مصطلحات معقدة. من تقارير المختبر إلى العادات اليومية—الأدوية، الغذاء، اللياقة—بسهولة للتنفيذ.",
    "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.":
      "وضوح للرعاية اليومية. التقارير والإرشاد والأدوية والحمية واللياقة—تفهم من النظرة الأولى.",
    "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.":
      "كل صحتك، مفككة بوضوح. التقارير والنصائح والأدوية والحمية واللياقة—مختصرة وقابلة للتطبيق.",
    "Clinical reasoning on demand. Built for doctors, nurses, and medical students.":
      "تفكير سريري عند الطلب. مصمم للأطباء والممرضين وطلاب الطب.",
    "Depth when it matters. Structured differentials, red flags, and management—professional grade.":
      "العمق عندما يلزم. تفريقات منظمة، علامات خطورة، وخطط علاج بمستوى احترافي.",
    "Evidence-ready, clinician-first.": "جاهز بالأدلة، موجه للطاقم السريري أولاً.",
    "Precision over prose. Concise clinical answers with clear next steps.":
      "دقة قبل الإطناب. إجابات سريرية موجزة بخطوات تالية واضحة.",
    "Therapy guidance, made clear. Tools and support; not for emergencies.":
      "إرشاد علاجي واضح. أدوات ودعم؛ ليس للطوارئ.",
    "Calm, structured support. Practical techniques and next steps.":
      "دعم هادئ ومنظم. تقنيات عملية وخطوات تالية.",
    "Clarity for tough days. Grounded guidance, actionable exercises.":
      "وضوح للأيام الصعبة. إرشاد راسخ وتمارين قابلة للتنفيذ.",
    "Steady help, simple words. Skills you can use today.":
      "مساندة ثابتة، بكلمات بسيطة. مهارات يمكنك استخدامها اليوم.",
    "Your records, organized. Upload, store, and retrieve securely.":
      "سجلاتك منظمة. ارفع وخزن واسترجع بأمان.",
    "All your reports in one place. Fast search, clear summaries.":
      "كل تقاريرك في مكان واحد. بحث سريع وملخصات واضحة.",
    "Medical files that make sense. Structured, searchable, shareable.":
      "ملفات طبية مفهومة. منظمة، قابلة للبحث، قابلة للمشاركة.",
    "From paper to clarity. Digitize reports; get clean overviews.":
      "من الورق إلى الوضوح. رقمن التقارير لتحصل على رؤى واضحة.",
    "Research: On — web evidence": "البحث: مفعل — أدلة ويب",
    "Research: Off — enable web evidence": "البحث: متوقف — فعّل أدلة الويب",
  },
  it: {
    Preferences: "Preferenze",
    General: "Generale",
    Notifications: "Notifiche",
    Personalization: "Personalizzazione",
    Connectors: "Connettori",
    Schedules: "Programmazioni",
    "Data controls": "Controlli dati",
    Security: "Sicurezza",
    Account: "Account",
    Theme: "Tema",
    "Accent color": "Colore accento",
    Language: "Lingua",
    Voice: "Voce",
    "Legal & Privacy": "Legale e Privacy",
    Introduction: "Introduzione",
    "Intro.copy":
      "Second Opinion offre approfondimenti sanitari assistiti dall’AI a supporto delle conversazioni con clinici abilitati. Questi termini spiegano gestione dati, limiti del servizio e scelte sui cookie.",
    "Medical Advice Disclaimer": "Avvertenza medica",
    "Disclaimer.copy":
      "La chat non sostituisce l’assistenza personalizzata di un professionista. Consulta sempre il tuo medico; non ignorare o ritardare cure per quanto letto qui.",
    "AI Limitations": "Limitazioni dell’AI",
    "Limitations.copy":
      "L’AI può fraintendere il contesto o mostrare ricerche obsolete; verifica i risultati importanti prima delle decisioni cliniche.",
    "Consent.checkbox":
      "Accetto i termini Legali e di Privacy, inclusa la gestione dei miei dati e delle preferenze cookie come sopra descritto.",
    "Reject Non-Essential": "Rifiuta non essenziali",
    Accept: "Accetta",
    Cancel: "Annulla",
    "Save changes": "Salva modifiche",
    "Adjust how MedX behaves and personalizes your care.":
      "Regola il comportamento e la personalizzazione di MedX.",
    "Select how the interface adapts to your system.":
      "Scegli come l’interfaccia si adatta al sistema.",
    "Choose your preferred conversational language.":
      "Scegli la lingua preferita.",
    "Preview and select the voice used for spoken responses.":
      "Anteprima e scelta della voce.",
    "We use cookies to improve your experience. See our":
      "Utilizziamo i cookie per migliorare la tua esperienza. Consulta la nostra",
    "Cookie Policy": "Informativa sui cookie",
    "Accept all": "Accetta tutto",
    "Reject non-essential": "Rifiuta i non essenziali",
    Manage: "Gestisci",
    "New chat": "Nuova chat",
    Search: "Cerca",
    Directory: "Directory",
    "Medical Profile": "Profilo medico",
    Timeline: "Cronologia",
    Alerts: "Avvisi",
    Wellness: "Benessere",
    Therapy: "Terapia",
    Research: "Ricerca",
    Clinical: "Clinico",
    "AI Doc": "AI Doc",
    "Type a message": "Scrivi un messaggio",
    Send: "Invia",
    "Start a new conversation": "Inizia una nuova conversazione",
    "Ask about wellness, therapy, research or clinical topics.":
      "Chiedi su benessere, terapia, ricerca o clinico.",
    Upload: "Carica",
    "Wellness Mode: ON": "Modalità Benessere: attiva",
    "Clinical Mode: ON": "Modalità Clinica: attiva",
    "Therapy Mode: ON": "Modalità Terapia: attiva",
    "AI Doc: ON": "AI Doc: attivo",
    "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.":
      "La tua salute, resa semplice. Referti, consigli, farmaci, diete e fitness—spiegati con un linguaggio chiaro.",
    "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.":
      "Tutto sulla salute, senza gergo. Dai referti di laboratorio alle abitudini quotidiane—farmaci, dieta, fitness—facili da mettere in pratica.",
    "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.":
      "Chiarezza per la cura quotidiana. Referti, guide, farmaci, dieta e fitness—comprensibili a colpo d’occhio.",
    "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.":
      "Tutta la tua salute, decodificata. Referti, consigli, farmaci, dieta e fitness—concisi e azionabili.",
    "Clinical reasoning on demand. Built for doctors, nurses, and medical students.":
      "Ragionamento clinico on demand. Pensato per medici, infermieri e studenti di medicina.",
    "Depth when it matters. Structured differentials, red flags, and management—professional grade.":
      "Profondità quando serve. Differentiali strutturati, segnali di allarme e gestione—livello professionale.",
    "Evidence-ready, clinician-first.": "Pronto all’evidenza, pensato prima per i clinici.",
    "Precision over prose. Concise clinical answers with clear next steps.":
      "Precisione prima della prosa. Risposte cliniche concise con passi successivi chiari.",
    "Therapy guidance, made clear. Tools and support; not for emergencies.":
      "Orientamento terapeutico, reso chiaro. Strumenti e supporto; non per le emergenze.",
    "Calm, structured support. Practical techniques and next steps.":
      "Supporto calmo e strutturato. Tecniche pratiche e prossimi passi.",
    "Clarity for tough days. Grounded guidance, actionable exercises.":
      "Chiarezza per i giorni difficili. Guida solida ed esercizi applicabili.",
    "Steady help, simple words. Skills you can use today.":
      "Aiuto costante, parole semplici. Abilità da usare subito.",
    "Your records, organized. Upload, store, and retrieve securely.":
      "I tuoi documenti organizzati. Carica, archivia e recupera in modo sicuro.",
    "All your reports in one place. Fast search, clear summaries.":
      "Tutti i tuoi referti in un unico posto. Ricerca rapida, riepiloghi chiari.",
    "Medical files that make sense. Structured, searchable, shareable.":
      "Documenti medici che hanno senso. Strutturati, ricercabili, condivisibili.",
    "From paper to clarity. Digitize reports; get clean overviews.":
      "Dalla carta alla chiarezza. Digitalizza i referti e ottieni panoramiche pulite.",
    "Research: On — web evidence": "Ricerca: attiva — evidenze web",
    "Research: Off — enable web evidence": "Ricerca: disattiva — abilita evidenze web",
  },
  zh: {
    Preferences: "偏好设置",
    General: "通用",
    Notifications: "通知",
    Personalization: "个性化",
    Connectors: "连接器",
    Schedules: "计划",
    "Data controls": "数据控制",
    Security: "安全",
    Account: "账户",
    Theme: "主题",
    "Accent color": "强调色",
    Language: "语言",
    Voice: "语音",
    "Legal & Privacy": "法律与隐私",
    Introduction: "简介",
    "Intro.copy":
      "Second Opinion 提供由 AI 辅助的健康洞见，用以补充与持证临床医生的交流。本文说明数据处理、服务限制及 Cookie/数据选项。",
    "Medical Advice Disclaimer": "医疗声明",
    "Disclaimer.copy":
      "聊天不替代专业个性化医疗建议；任何健康问题请咨询医生，请勿因阅读内容而延误或忽视就医。",
    "AI Limitations": "AI 限制",
    "Limitations.copy":
      "AI 可能误解语境或显示过时研究；做出医疗决策前请复核重要发现。",
    "Consent.checkbox":
      "我同意法律与隐私条款，包括按上述说明处理我的数据与 Cookie 偏好。",
    "Reject Non-Essential": "拒绝非必要",
    Accept: "同意",
    Cancel: "取消",
    "Save changes": "保存更改",
    "Adjust how MedX behaves and personalizes your care.":
      "调整 MedX 行为与个性化。",
    "Select how the interface adapts to your system.":
      "选择界面适配方式。",
    "Choose your preferred conversational language.":
      "选择偏好的语言。",
    "Preview and select the voice used for spoken responses.":
      "预览并选择语音。",
    "We use cookies to improve your experience. See our":
      "我们使用 Cookie 改善您的体验。查看我们的",
    "Cookie Policy": "Cookie 政策",
    "Accept all": "全部接受",
    "Reject non-essential": "拒绝非必要",
    Manage: "管理",
    "New chat": "新建对话",
    Search: "搜索",
    Directory: "目录",
    "Medical Profile": "医疗档案",
    Timeline: "时间线",
    Alerts: "提醒",
    Wellness: "健康",
    Therapy: "治疗",
    Research: "研究",
    Clinical: "临床",
    "AI Doc": "智能文档",
    "Type a message": "输入消息",
    Send: "发送",
    "Start a new conversation": "开始新会话",
    "Ask about wellness, therapy, research or clinical topics.":
      "询问健康、治疗、研究或临床话题。",
    Upload: "上传",
    "Wellness Mode: ON": "健康模式：开启",
    "Clinical Mode: ON": "临床模式：开启",
    "Therapy Mode: ON": "治疗模式：开启",
    "AI Doc: ON": "智能文档：开启",
    "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.":
      "让健康变得简单。报告、提示、用药、饮食和健身——用清晰语言解释。",
    "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.":
      "没有行话的健康信息。从化验报告到日常习惯——用药、饮食、健身——轻松付诸行动。",
    "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.":
      "日常护理更清楚。报告、指导、用药、饮食和健身——一目了然。",
    "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.":
      "你的健康尽在掌握。报告、提示、用药、饮食和健身——精简且可执行。",
    "Clinical reasoning on demand. Built for doctors, nurses, and medical students.":
      "按需获得临床推理。为医生、护士和医学生打造。",
    "Depth when it matters. Structured differentials, red flags, and management—professional grade.":
      "需要时的深度。结构化鉴别诊断、危险信号和处置——专业级。",
    "Evidence-ready, clinician-first.": "证据随时就绪，面向临床人士。",
    "Precision over prose. Concise clinical answers with clear next steps.":
      "精准胜于长篇。简洁的临床回答和明确的下一步。",
    "Therapy guidance, made clear. Tools and support; not for emergencies.":
      "清晰的治疗指导。提供工具与支持；非紧急使用。",
    "Calm, structured support. Practical techniques and next steps.":
      "冷静有序的支持。实用技巧与下一步建议。",
    "Clarity for tough days. Grounded guidance, actionable exercises.":
      "艰难日子的清晰指引。扎实的指导和可操作的练习。",
    "Steady help, simple words. Skills you can use today.":
      "持续帮助，语言简单。立即可用的技巧。",
    "Your records, organized. Upload, store, and retrieve securely.":
      "整理好的健康记录。安全上传、存储与提取。",
    "All your reports in one place. Fast search, clear summaries.":
      "所有报告集中在一起。快速搜索，清晰摘要。",
    "Medical files that make sense. Structured, searchable, shareable.":
      "有意义的医疗文件。结构化、可搜索、可分享。",
    "From paper to clarity. Digitize reports; get clean overviews.":
      "从纸质到清晰。数字化报告，获得清爽概览。",
    "Research: On — web evidence": "研究：开启 — 网络证据",
    "Research: Off — enable web evidence": "研究：关闭 — 启用网络证据",
  },
  es: {
    Preferences: "Preferencias",
    General: "General",
    Notifications: "Notificaciones",
    Personalization: "Personalización",
    Connectors: "Conectores",
    Schedules: "Programaciones",
    "Data controls": "Controles de datos",
    Security: "Seguridad",
    Account: "Cuenta",
    Theme: "Tema",
    "Accent color": "Color de acento",
    Language: "Idioma",
    Voice: "Voz",
    "Legal & Privacy": "Legal y Privacidad",
    Introduction: "Introducción",
    "Intro.copy":
      "Second Opinion ofrece información sanitaria asistida por IA para complementar conversaciones con clínicos titulados. Aquí explicamos el manejo de datos, límites del servicio y tus opciones de cookies.",
    "Medical Advice Disclaimer": "Aviso médico",
    "Disclaimer.copy":
      "El chat no sustituye la atención personalizada de un profesional. Consulta siempre a tu médico; no ignores ni retrases la atención por lo leído aquí.",
    "AI Limitations": "Limitaciones de la IA",
    "Limitations.copy":
      "La IA puede malinterpretar el contexto o mostrar investigaciones desactualizadas; verifica hallazgos importantes antes de decidir.",
    "Consent.checkbox":
      "Acepto los términos Legales y de Privacidad, incluido el tratamiento de mis datos y preferencias de cookies como se describe arriba.",
    "Reject Non-Essential": "Rechazar no esenciales",
    Accept: "Aceptar",
    Cancel: "Cancelar",
    "Save changes": "Guardar cambios",
    "Adjust how MedX behaves and personalizes your care.":
      "Ajusta el comportamiento y la personalización de MedX.",
    "Select how the interface adapts to your system.":
      "Elige cómo se adapta la interfaz.",
    "Choose your preferred conversational language.":
      "Elige tu idioma preferido.",
    "Preview and select the voice used for spoken responses.":
      "Previsualiza y selecciona la voz.",
    "We use cookies to improve your experience. See our":
      "Utilizamos cookies para mejorar tu experiencia. Consulta nuestra",
    "Cookie Policy": "Política de cookies",
    "Accept all": "Aceptar todo",
    "Reject non-essential": "Rechazar no esenciales",
    Manage: "Gestionar",
    "New chat": "Nueva conversación",
    Search: "Buscar",
    Directory: "Directorio",
    "Medical Profile": "Perfil médico",
    Timeline: "Cronología",
    Alerts: "Alertas",
    Wellness: "Bienestar",
    Therapy: "Terapia",
    Research: "Investigación",
    Clinical: "Clínico",
    "AI Doc": "Doc IA",
    "Type a message": "Escribe un mensaje",
    Send: "Enviar",
    "Start a new conversation": "Inicia una nueva conversación",
    "Ask about wellness, therapy, research or clinical topics.":
      "Pregunta sobre bienestar, terapia, investigación o clínica.",
    Upload: "Subir",
    "Wellness Mode: ON": "Modo Bienestar: activo",
    "Clinical Mode: ON": "Modo Clínico: activo",
    "Therapy Mode: ON": "Modo Terapia: activo",
    "AI Doc: ON": "Doc IA: activo",
    "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.":
      "Tu salud, hecha sencilla. Informes, consejos, medicamentos, dietas y ejercicio—explicados con lenguaje claro.",
    "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.":
      "Todo sobre salud sin jerga. De informes de laboratorio a hábitos diarios—medicación, dieta, ejercicio—listo para poner en práctica.",
    "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.":
      "Claridad para el cuidado diario. Informes, guías, medicamentos, dieta y ejercicio—comprensibles de un vistazo.",
    "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.":
      "Toda tu salud, descifrada. Informes, consejos, medicamentos, dieta y ejercicio—concisos y accionables.",
    "Clinical reasoning on demand. Built for doctors, nurses, and medical students.":
      "Razonamiento clínico a demanda. Diseñado para médicos, enfermería y estudiantes de medicina.",
    "Depth when it matters. Structured differentials, red flags, and management—professional grade.":
      "Profundidad cuando importa. Diferenciales estructurados, señales de alarma y manejo—nivel profesional.",
    "Evidence-ready, clinician-first.": "Listo con evidencia, pensado primero para clínicos.",
    "Precision over prose. Concise clinical answers with clear next steps.":
      "Precisión sobre prosa. Respuestas clínicas concisas con pasos siguientes claros.",
    "Therapy guidance, made clear. Tools and support; not for emergencies.":
      "Orientación terapéutica, explicada con claridad. Herramientas y apoyo; no para emergencias.",
    "Calm, structured support. Practical techniques and next steps.":
      "Apoyo sereno y estructurado. Técnicas prácticas y próximos pasos.",
    "Clarity for tough days. Grounded guidance, actionable exercises.":
      "Claridad para los días difíciles. Guía sólida y ejercicios accionables.",
    "Steady help, simple words. Skills you can use today.":
      "Ayuda constante, palabras sencillas. Habilidades que puedes usar hoy mismo.",
    "Your records, organized. Upload, store, and retrieve securely.":
      "Tus registros, organizados. Sube, guarda y recupera con seguridad.",
    "All your reports in one place. Fast search, clear summaries.":
      "Todos tus informes en un solo lugar. Búsqueda rápida, resúmenes claros.",
    "Medical files that make sense. Structured, searchable, shareable.":
      "Archivos médicos comprensibles. Estructurados, buscables y compartibles.",
    "From paper to clarity. Digitize reports; get clean overviews.":
      "Del papel a la claridad. Digitaliza informes; obtén panoramas limpios.",
    "Research: On — web evidence": "Investigación: activada — evidencia web",
    "Research: Off — enable web evidence": "Investigación: desactivada — habilita evidencia web",
  },
};

export function useT() {
  const { lang } = usePrefs();
  const dict = DICT[lang] ?? DICT.en;
  return (key: string) => dict[key] ?? key;
}
