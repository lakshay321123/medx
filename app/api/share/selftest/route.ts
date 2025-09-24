import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/admin';

function buildAbsoluteUrl(slug: string) {
  const headerStore = headers();
  const proto = headerStore.get('x-forwarded-proto') ?? 'https';
  const host =
    headerStore.get('x-forwarded-host') ??
    headerStore.get('host') ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ??
    null;

  if (!host) {
    return `/s/${slug}`;
  }

  const normalizedHost = host.replace(/\/$/, '');
  return `${proto}://${normalizedHost}/s/${slug}`;
}

export async function GET() {
  const diagEnabled = process.env.SHOW_SHARE_DIAG === '1';
  if (!diagEnabled) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  } as const;

  const supabase = supabaseAdmin();
  const slug = `__selftest-${Date.now()}`;

  const insertResult = await supabase
    .from('shared_answers')
    .insert({ slug, plain_text: 'ok', md_text: 'ok' })
    .select('slug')
    .maybeSingle();

  const insertOk = !insertResult.error;

  let selectOk = false;
  if (insertOk) {
    const { data, error } = await supabase
      .from('shared_answers')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    selectOk = !error && !!data;
  }

  const absoluteUrl = buildAbsoluteUrl(slug);

  return NextResponse.json({
    env: envStatus,
    insertOk,
    selectOk,
    absoluteUrl,
    slug,
  });
}
