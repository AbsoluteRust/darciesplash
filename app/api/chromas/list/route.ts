import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const chromas = (await kv.get("chromas")) || [];
  return NextResponse.json(chromas);
}