export default function MedXPreview() {
  const { useState, useMemo, useEffect } = require("react");

  const GlobeIcon = ({ className = "" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="2">
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="currentColor"></path>
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="currentColor"></path>
    </svg>
  );

  const ChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const SendIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );

  const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <polyline points="7 9 12 4 17 9" />
      <line x1="12" y1="4" x2="12" y2="16" />
    </svg>
  );

  const flagFor = (code) => ({ IND: "🇮🇳", USA: "🇺🇸", GBR: "🇬🇧" }[code] || "🌐");

  const MODES = [
    { key: "wellness", label: "Wellness", icon: "💙" },
    { key: "therapy", label: "Therapy", icon: "🧠" },
    { key: "research", label: "Research", icon: "📚" },
    { key: "doctor", label: "Doctor", icon: "🩺" },
    { key: "ai_doc", label: "AI Doc", icon: "🧪" },
  ];

  const COUNTRIES = [{ code: "IND" }, { code: "USA" }, { code: "GBR" }];

  const nextState = (key, s) => {
    if (key === "ai_doc") {
      return { primary: s.aiDoc ? s.primary || "wellness" : "", research: false, aiDoc: !s.aiDoc };
    }
    if (s.aiDoc) {
      // Clicking anything else while AI Doc is on -> disable aiDoc and switch
      if (key === "research") {
        return { primary: s.primary || "wellness", research: true, aiDoc: false };
      }
      return { primary: key, research: key === "therapy" ? false : s.research, aiDoc: false };
    }
    if (key === "research") {
      if (s.primary === "therapy") return s; // therapy disables research
      return { ...s, research: !s.research };
    }
    return { ...s, primary: key, research: key === "therapy" ? false : s.research };
  };

  const App = () => {
    const [dark, setDark] = useState(true);
    const [country, setCountry] = useState("IND");
    const [message, setMessage] = useState("");
    const [ui, setUi] = useState({ primary: "wellness", research: false, aiDoc: false });

    const appBg = useMemo(
      () =>
        dark
          ? "bg-[linear-gradient(180deg,#06122E_0%,#071534_15%,#0A1C45_100%)] text-white"
          : "bg-gradient-to-b from-sky-50 via-indigo-50 to-violet-100 text-slate-900",
      [dark]
    );
    const headerBg = dark ? "bg-slate-900/60 border-slate-800" : "bg-white/70 border-slate-200/70";
    const paneSurface = dark ? "bg-slate-900/60 ring-white/10" : "bg-white/80 ring-black/5";
    const composerSurface = dark ? "bg-slate-900/70 border-slate-800" : "bg-white/80 border-slate-200/70";
    const sidebarSurface = dark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200/60";
    const textClass = dark ? "text-white" : "text-slate-900";
    const placeholderClass = dark ? "placeholder:text-white/70" : "placeholder:text-slate-400";

    // Lightweight checks to avoid regressions
    useEffect(() => {
      const assert = (name, cond) => console[cond ? "log" : "error"](`TEST ${cond ? "PASS" : "FAIL"}: ${name}`);
      let s = { primary: "wellness", research: false, aiDoc: false };
      assert("init wellness", s.primary === "wellness" && !s.research && !s.aiDoc);
      s = nextState("ai_doc", s);
      assert("ai_doc on clears others", s.aiDoc === true && s.primary === "" && s.research === false);
      let s2 = nextState("wellness", s);
      assert("switch to wellness disables ai_doc", s2.aiDoc === false && s2.primary === "wellness");
      let s3 = { primary: "doctor", research: false, aiDoc: true };
      s3 = nextState("research", s3);
      assert("research from ai_doc keeps primary & enables research", s3.aiDoc === false && s3.primary === "doctor" && s3.research === true);
      let s4 = { primary: "wellness", research: true, aiDoc: false };
      s4 = nextState("therapy", s4);
      assert("therapy turns research off", s4.primary === "therapy" && s4.research === false);
    }, []);

    const isActive = (key) => (key === "ai_doc" ? ui.aiDoc : key === "research" ? ui.research : ui.primary === key);
    const disabled = (key) => (key === "research" ? ui.primary === "therapy" || (ui.aiDoc && key !== "ai_doc") : false);

    return (
      <div className={"h-full min-h-screen flex flex-col " + appBg}>
        {/* Header */}
        <header className={`sticky top-0 z-10 h-[62px] flex items-center justify-between px-4 border-b backdrop-blur-sm text-sm ${headerBg} ${textClass}`}>
          {/* Brand */}
          <div className="flex items-center gap-1 font-semibold text-base">
            <span className="text-lg">🫶</span>Second <span className="text-blue-300 ml-1">Opinion</span>
          </div>

          {/* Modes */}
          <div className="hidden md:flex items-center gap-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setUi((s) => nextState(m.key, s))}
                disabled={disabled(m.key)}
                className={`px-2.5 py-1 rounded-md border transition-colors ${
                  isActive(m.key)
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : dark
                    ? "bg-slate-800/70 border-slate-700 text-white hover:bg-slate-800"
                    : "bg-white/70 border-slate-200 text-slate-900 hover:bg-slate-100"
                } ${disabled(m.key) ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className="mr-1">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Theme + Country */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className={`px-2.5 py-1 rounded-md border ${dark ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"}`}
            >
              {dark ? "🌙" : "☀️"}
            </button>

            {/* Country pill — CLOSED: globe + 3-letter code only. OPEN list shows flags */}
            <div className={`relative flex items-center border rounded-full pl-2 pr-6 py-1 gap-1 shadow-sm ${
              dark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-slate-200"
            } ${textClass}`}>
              <GlobeIcon className="w-4 h-4 stroke-current" />
              <span className="text-xs font-medium">{country}</span>
              <select
                aria-label="Select country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`appearance-none bg-transparent outline-none text-sm pl-1 pr-6 py-0.5 rounded-full focus:ring-2 focus:ring-blue-500 hover:bg-blue-800/10 text-transparent ${textClass}`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                    {flagFor(c.code)} {c.code}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">
                <ChevronDown />
              </span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 grid grid-cols-12 relative">
          {/* Sidebar */}
          <aside className={`col-span-3 lg:col-span-2 backdrop-blur-sm p-3 flex flex-col gap-3 text-sm border-r ${sidebarSurface} ${textClass}`}>
            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 shadow-sm">
              <span className="text-lg leading-none">＋</span> New chat
            </button>

            <input
              className={`w-full mt-2 rounded-md border px-2 py-1.5 ${placeholderClass} focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${dark ? "bg-slate-800 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"}`}
              placeholder="Search chats"
            />

            <nav className="mt-2 grid gap-1">
              {['Chat', 'AI Doc', 'Medical Profile', 'Timeline', 'Alerts', 'Settings'].map((item) => (
                <a key={item} className={`px-2 py-1.5 rounded-md hover:bg-blue-800/10 cursor-pointer ${textClass} border border-transparent hover-border-blue-200/30`}>{item}</a>
              ))}
            </nav>

            <div className="mt-auto pt-2">
              <button className={`w-full border rounded-md px-2 py-1.5 text-left hover:bg-blue-800/10 ${textClass}`}>⚙️ Preferences</button>
            </div>
          </aside>

          {/* Main pane */}
          <main className="col-span-9 lg:col-span-10 overflow-y-auto pb-28">
            <div className={`m-6 rounded-2xl p-6 ring-1 ${paneSurface}`}>
              <h1 className="text-3xl font-semibold">Get a quick second opinion</h1>
              <ul className="mt-3 list-disc pl-6 space-y-1 text-base opacity-90">
                <li>Upload labs, prescriptions, or scans</li>
                <li>Ask questions in plain English</li>
                <li>{ui.aiDoc ? "AI Doc is active — Click any other mode to switch back" : ui.research ? "Research assist: ON" : "Research assist: OFF"}</li>
              </ul>
            </div>
          </main>

          {/* Composer (sticky bottom) */}
          <div className={`absolute bottom-0 left-[25%] right-6 px-6 pb-4`}>
            <div className={`rounded-xl border ${composerSurface}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button className={`p-2 rounded-md ${dark ? "bg-slate-800/50 hover:bg-slate-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} flex items-center justify-center transition`} title="Upload file">
                  <UploadIcon />
                </button>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about your report…"
                  className={`flex-1 bg-transparent outline-none px-1 py-1.5 text-sm ${textClass} ${placeholderClass}`}
                />
                <button className={`p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition`} title="Send">
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return <App />;
}
