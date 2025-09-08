import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text = "", boot = false } = await req.json();
  // Only emit canned welcome on explicit boot; never on user greetings
  if (boot === true) {
    return NextResponse.json({
      messages: [
        { role: "assistant", content: "Hi! 👋 How can I help today? You can describe symptoms or upload a report." }
      ]
    });
  }
  // Otherwise: do nothing (caller should use normal chat route)
  return NextResponse.json({ messages: [] });
}
