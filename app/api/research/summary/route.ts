import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pmid = searchParams.get('pmid') || '';
  const bullets = [
    'Key finding one',
    'Key finding two',
    'Key finding three',
    'Key finding four',
    'Key finding five'
  ];
  const link = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  return NextResponse.json({ bullets, link });
}
