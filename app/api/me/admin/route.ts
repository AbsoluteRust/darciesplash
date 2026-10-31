import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  
  // Read the server-only ADMIN_IDS variable
  const adminIds = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
  const isAdmin = !!session?.user?.id && adminIds.includes(session.user.id);
  
  return NextResponse.json({ isAdmin });
}