import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const deleted = (await kv.get<string[]>("deleted")) || [];
  return NextResponse.json(deleted);
}