import { NextResponse } from "next/server";
import { getMessagingContacts } from "@/lib/network/messaging-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = getMessagingContacts(auth.user.id);
  return NextResponse.json({ contacts });
}
