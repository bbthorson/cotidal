import { NextRequest, NextResponse } from 'next/server';
import { getAtprotoClient } from '@/lib/atproto/client';
import { z } from 'zod';

const LoginSchema = z.object({
  handle: z.string().min(1).max(253).regex(/^[a-zA-Z0-9._-]+(\.[a-zA-Z0-9._-]+)*$/),
});

export async function POST(request: NextRequest) {
  const client = getAtprotoClient();
  if (!client) {
    return NextResponse.json({ error: 'AT Protocol not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }

  try {
    const url = await client.authorize(parsed.data.handle);
    return NextResponse.json({ url: url.toString() });
  } catch (e) {
    console.error('AT Protocol authorize error:', e);
    return NextResponse.json({ error: 'Failed to initiate authorization' }, { status: 500 });
  }
}
