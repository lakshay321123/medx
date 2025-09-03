"use client";

import { useEffect, useState } from "react";

type Tab = "signin" | "signup";
async function fetchMe() { const r = await fetch("/api/me", { cache: "no-store" }); return r.json(); }

export default function SignModal() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("signin");
  const [me, setMe] = useState<any>(null);

  // Sign in state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sign up state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password2, setPassword2] = useState("");

  useEffect(() => {
    (async () => {
      const data = await fetchMe();
      setMe(data.user);
      setOpen(!data.user);
    })();
  }, []);

  async function handleLogin() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(()=>({})); setErr(d?.error || "Login failed"); return; }
    setOpen(false);
    location.reload();
  }

  async function handleSignup() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, username, password: password2 }),
    });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(()=>({})); setErr(d?.error || "Sign-up failed"); return; }
    setIdentifier(username || email); setPassword(password2); await handleLogin();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-[480px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Welcome to MedX</h2>

        <div className="flex gap-2 mb-4">
          <button className={tab==="signin"?"btn-primary":"btn"} onClick={()=>setTab("signin")}>Sign in</button>
          <button className={tab==="signup"?"btn-primary":"btn"} onClick={()=>setTab("signup")}>Create account</button>
        </div>

        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

        {tab === "signin" ? (
          <div className="space-y-3">
            <input className="input w-full" placeholder="Email or Username" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
            <input className="input w-full" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button className="w-full btn-primary" disabled={busy} onClick={handleLogin}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input className="input w-full" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input w-full" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="input w-full" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
            <input className="input w-full" placeholder="Password (min 8)" type="password" value={password2} onChange={e=>setPassword2(e.target.value)} />
            <button className="w-full btn-primary" disabled={busy} onClick={handleSignup}>
              {busy ? "Creating..." : "Create account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
