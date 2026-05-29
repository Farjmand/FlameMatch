import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_LENGTH = 2000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  const { body } = await request.json();
  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_BODY_LENGTH} characters or fewer` }, { status: 400 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle();

  if (!match) return NextResponse.json({ error: "Not a match member" }, { status: 403 });

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: user.id, body: body.trim() })
    .select("id, sender_id, body, created_at")
    .single();

  if (error) {
    console.error("message insert error", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 400 });
  }
  return NextResponse.json(message);
}
