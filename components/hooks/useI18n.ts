"use client";
import { usePrefs } from "@/components/providers/PreferencesProvider";

const DICTIONARY: Record<string, Record<string, string>> = {
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
  },
};

export function useT() {
  const { lang } = usePrefs();
  const dict = DICTIONARY[lang] ?? DICTIONARY.en;
  return (key: string) => dict[key] ?? key;
}
