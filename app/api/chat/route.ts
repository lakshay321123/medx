// app/api/chat/route.ts
export const runtime = 'edge';
// Re-export every HTTP handler from the stream route so both paths work
export * from './stream/route';
