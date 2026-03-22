"use client";

import { useCallback, useState } from "react";
import clsx from "clsx";
import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-so-border transition peer-checked:bg-so-accent dark:bg-so-card" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-so-border bg-so-card p-4 dark:border-so-border dark:bg-so-card">
      <div className="mb-1 text-[13px] font-semibold">{title}</div>
      {sub && <div className="mb-3 text-xs text-so-muted dark:text-so-muted">{sub}</div>}
      {children}
    </div>
  );
}

const TIMEOUT_OPTIONS = [
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

export default function SecurityPanel() {
  const { draft, set } = usePrefsDraft();
  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cfmPw, setCfmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const getVal = (key: string, fallback: unknown) => (draft as Record<string, unknown>)?.[key] ?? fallback;
  const setVal = (key: string, value: unknown) => set(key as keyof typeof draft, value);

  const twoFa = Boolean(getVal("security.2fa", false));
  const loginAlerts = Boolean(getVal("security.loginAlerts", true));
  const sessionTimeout = String(getVal("security.sessionTimeout", "7d"));

  const handlePwChange = useCallback(async () => {
    setPwMsg(null);
    if (!curPw || !newPw || !cfmPw) { setPwMsg({ type: "err", text: "Fill in all fields." }); return; }
    if (newPw.length < 8) { setPwMsg({ type: "err", text: "Minimum 8 characters." }); return; }
    if (newPw !== cfmPw) { setPwMsg({ type: "err", text: "Passwords do not match." }); return; }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPwMsg({ type: "err", text: d?.error || "Failed to update password." });
        return;
      }
      setPwMsg({ type: "ok", text: "Password updated." });
      setCurPw(""); setNewPw(""); setCfmPw("");
      setTimeout(() => setShowPw(false), 2000);
    } catch {
      setPwMsg({ type: "err", text: "Network error." });
    }
  }, [curPw, newPw, cfmPw]);

  const handleRevokeAll = async () => {
    setRevoking(true);
    try {
      await fetch("/api/auth/revoke-sessions", { method: "POST" });
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
    } finally {
      setRevoking(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-so-border bg-white px-3 py-2 text-sm dark:border-so-border dark:bg-so-card dark:text-so-text placeholder:text-so-muted";

  return (
    <div className="space-y-4 p-5">
      <Section title="Password" sub="Update your account password.">
        {!showPw ? (
          <button type="button" onClick={() => setShowPw(true)}
            className="rounded-lg border border-so-border bg-so-card px-3.5 py-1.5 text-sm dark:border-so-border dark:bg-so-card">
            Change password
          </button>
        ) : (
          <div className="space-y-3 max-w-sm">
            <label><span className="sr-only">Current password</span>
              <input type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className={inputCls} />
            </label>
            <label><span className="sr-only">New password</span>
              <input type="password" placeholder="New password (min 8 characters)" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputCls} />
            </label>
            <label><span className="sr-only">Confirm new password</span>
              <input type="password" placeholder="Confirm new password" value={cfmPw} onChange={(e) => setCfmPw(e.target.value)} className={inputCls} />
            </label>
            {pwMsg && <div className={clsx("text-xs", pwMsg.type === "ok" ? "text-emerald-600" : "text-red-600")}>{pwMsg.text}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={handlePwChange}
                className="rounded-lg bg-so-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-so-accent/90">Update</button>
              <button type="button" onClick={() => { setShowPw(false); setPwMsg(null); }}
                className="rounded-lg border border-so-border px-3.5 py-1.5 text-sm dark:border-so-border">Cancel</button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Two-factor authentication" sub="Add an extra layer of security to your account.">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm">Enable 2FA</div>
            <div className="text-xs text-so-muted dark:text-so-muted">
              {twoFa ? "Active — your account is protected." : "Recommended for all accounts."}
            </div>
          </div>
          <Toggle checked={twoFa} onChange={() => setVal("security.2fa", !twoFa)} />
        </div>
      </Section>

      <Section title="Login alerts" sub="Get notified of new sign-ins to your account.">
        <div className="flex items-center justify-between py-2">
          <div className="text-sm">Email me on new login</div>
          <Toggle checked={loginAlerts} onChange={() => setVal("security.loginAlerts", !loginAlerts)} />
        </div>
      </Section>

      <Section title="Session timeout" sub="Automatically sign out after inactivity.">
        <div className="flex flex-wrap gap-2">
          {TIMEOUT_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setVal("security.sessionTimeout", opt.value)}
              className={clsx(
                "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition",
                sessionTimeout === opt.value
                  ? "border-so-accent bg-so-accent text-white"
                  : "border-so-border bg-so-card text-so-text hover:bg-so-bg dark:border-so-border dark:bg-so-card dark:text-so-text"
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Active sessions" sub="Manage devices signed in to your account.">
        <div className="flex items-center justify-between py-2 border-b border-so-border dark:border-so-border">
          <div>
            <div className="text-sm font-medium">This device</div>
            <div className="text-xs text-so-muted dark:text-so-muted">Current session</div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">Active</span>
        </div>
        <div className="pt-3">
          <button type="button" onClick={handleRevokeAll} disabled={revoking}
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
            {revoking ? "Revoking" : "Sign out all other devices"}
          </button>
        </div>
      </Section>
    </div>
  );
}
