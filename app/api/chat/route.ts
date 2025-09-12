// app/api/chat/route.ts
export const runtime = 'edge';
export { GET, POST, OPTIONS, HEAD } from './stream/route';
