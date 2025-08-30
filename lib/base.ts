export function api(path: string) {
  // Always call the same origin at runtime; avoids env mismatches
  if (path.startsWith('http')) return path;
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${path.startsWith('/') ? path : `/${path}`}`;
}
