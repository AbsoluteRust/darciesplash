import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  
  const rawAdminIds = process.env.ADMIN_IDS || "MISSING_ENV_VAR";
  const adminIds = rawAdminIds.split(",").map(id => id.trim());
  const userId = session?.user?.id || "NOT_LOGGED_IN";
  
  const isAdmin = !!session?.user?.id && adminIds.includes(session.user.id);
  
  return NextResponse.json({ 
    isAdmin,
    debug: {
      yourSessionId: userId,
      adminIdsFound: adminIds,
      rawAdminIds: rawAdminIds
    }
  });
}