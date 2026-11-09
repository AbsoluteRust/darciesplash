// app/api/emotes/lookup/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) return NextResponse.json({}, { status: 500 });

  const res = await fetch(`${botUrl}/api/emotes/lookup`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return NextResponse.json({});
  return NextResponse.json(await res.json());
}