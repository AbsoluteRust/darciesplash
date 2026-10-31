import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");

    if (!botUrl) return NextResponse.json({ error: "Missing PI_BOT_URL" }, { status: 500 });

    const res = await fetch(`${botUrl}/api/auth/send-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "Failed to communicate with bot" }, { status: 500 });
  }
}