"use client";
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle(){
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(()=>setMounted(true),[]);
  if(!mounted) return null;
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      aria-pressed={isDark}
      onClick={()=>setTheme(isDark?'light':'dark')}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition bg-slate-100 text-slate-800 border-slate-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus-ring"
    >
      {isDark ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
