export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { orchestrate, ClientState } from '@/lib/aidoc/orchestrator';
import { hello, SAFETY } from '@/lib/aidoc/style';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserId } from '@/lib/getUserId';

function noStore() {
  return { 'Cache-Control': 'no-store, max-age=0' };
}

async function getName(): Promise<string | undefined> {
  try {
    const uid = await getUserId();
    if (!uid) return undefined;
    const { data } = await supabaseAdmin()
      .from('profiles')
      .select('full_name')
      .eq('id', uid)
      .maybeSingle();
    const full = data?.full_name?.trim();
    return full ? full.split(' ')[0] : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  const client_state: ClientState = body.client_state || {};
  const thread_id = body.thread_id || '';

  const name = await getName();
  const lower = text.toLowerCase();

  // boot greeting
  if (!text) {
    const msg = hello(name);
    return NextResponse.json({ messages: [{ role: 'assistant', content: msg }], new_state: { step: 'idle' } }, { headers: noStore() });
  }

  // research intent
  if (/latest treatment|guidelines|trial/.test(lower)) {
    return NextResponse.json(
      {
        messages: [{ role: 'assistant', content: `Sure — switching to research mode. ${SAFETY}` }],
        handoff: { mode: 'research' },
        new_state: client_state,
      },
      { headers: noStore() }
    );
  }

  // danger ask
  if (/do i have/.test(lower)) {
    return NextResponse.json(
      {
        messages: [{ role: 'assistant', content: `I can't say for sure. A specialist visit would help. ${SAFETY}` }],
        new_state: { step: 'resolved' },
      },
      { headers: noStore() }
    );
  }

  // medication request
  if (/what medicine|which medicine|medication should/i.test(lower)) {
    return NextResponse.json(
      {
        messages: [
          {
            role: 'assistant',
            content: `I can't prescribe. Over-the-counter options per label may help, but please speak to a clinician. ${SAFETY}`,
          },
        ],
        new_state: { step: 'resolved' },
      },
      { headers: noStore() }
    );
  }

  const result = orchestrate(text, client_state, name);
  return NextResponse.json(result, { headers: noStore() });
}
