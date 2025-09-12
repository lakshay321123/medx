// app/api/chat/[...all]/route.ts
export const runtime = 'edge';
export { GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD } from '../stream/route';
