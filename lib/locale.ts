'use client';
import { useEffect, useState } from 'react';

export function useLocale(){
  const [locale, setLocale] = useState<{ countryCode: string | null }>({ countryCode: null });
  useEffect(()=>{
    try {
      const cc = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1];
      setLocale({ countryCode: cc || null });
    } catch {
      setLocale({ countryCode: null });
    }
  },[]);
  return { locale };
}
