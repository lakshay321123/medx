import { useEffect, useState } from "react";

export function useTherapyProfile(userId?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/therapy/profile?userId=${userId}`)
      .then(r => r.json())
      .then(j => { setData(j.profile || null); setErr(null); })
      .catch(e => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [userId]);

  return { data, loading, err };
}
