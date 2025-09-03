"use client";

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

type Tab = 'google' | 'email' | 'signup' | 'guest';

export default function SignUpModal({ forceOpen = false }: { forceOpen?: boolean }) {
  const { status } = useSession();
  const [open, setOpen] = useState<boolean>(forceOpen);
  const [tab, setTab] = useState<Tab>('google');

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (status === 'authenticated') setOpen(false);
  }, [status]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  async function handleLoginEmail() {
    await signIn('emailpass', { email: loginEmail, password: loginPassword, redirect: true });
  }

  async function handleSignup() {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: signupEmail, password: signupPassword }),
    });
    if (res.ok) {
      await signIn('emailpass', { email: signupEmail, password: signupPassword, redirect: true });
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || 'Sign-up failed');
    }
  }

  async function handleGuest() {
    await signIn('guest', { redirect: true });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-[480px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Welcome to MedX</h2>

        <div className="flex gap-2 mb-4">
          <button className={tab === 'google' ? 'btn-primary' : 'btn'} onClick={() => setTab('google')}>Google</button>
          <button className={tab === 'email' ? 'btn-primary' : 'btn'} onClick={() => setTab('email')}>Sign in</button>
          <button className={tab === 'signup' ? 'btn-primary' : 'btn'} onClick={() => setTab('signup')}>Create account</button>
          <button className={tab === 'guest' ? 'btn-primary' : 'btn'} onClick={() => setTab('guest')}>Guest</button>
        </div>

        {tab === 'google' && (
          <div className="space-y-3">
            <button className="w-full btn-primary" onClick={() => signIn('google')}>Continue with Google</button>
          </div>
        )}

        {tab === 'email' && (
          <div className="space-y-3">
            <input className="input w-full" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <input className="input w-full" placeholder="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            <button className="w-full btn-primary" onClick={handleLoginEmail}>Sign in</button>
          </div>
        )}

        {tab === 'signup' && (
          <div className="space-y-3">
            <input className="input w-full" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="input w-full" placeholder="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
            <input className="input w-full" placeholder="Password (min 8)" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
            <button className="w-full btn-primary" onClick={handleSignup}>Create account</button>
          </div>
        )}

        {tab === 'guest' && (
          <div className="space-y-3">
            <p className="text-sm opacity-80">Use MedX without creating an account. You can upgrade later.</p>
            <button className="w-full btn" onClick={handleGuest}>Continue as Guest</button>
          </div>
        )}

      </div>
    </div>
  );
}
