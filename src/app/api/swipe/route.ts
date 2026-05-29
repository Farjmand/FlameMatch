import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { swiped_id, liked } = await request.json();
  if (!swiped_id || !UUID_RE.test(swiped_id)) {
    return NextResponse.json({ error: "swiped_id must be a valid UUID" }, { status: 400 });
  }

  const { error: swipeError } = await supabase.from("swipes").insert({
    swiper_id: user.id,
    swiped_id,
    liked,
  });
  if (swipeError) {
    console.error("swipe insert error", swipeError);
    return NextResponse.json({ error: "Failed to record swipe" }, { status: 400 });
  }

  if (!liked) return NextResponse.json({ matched: false });

  const { data: reverseSwipe } = await supabase
    .from("swipes")
    .select("liked")
    .eq("swiper_id", swiped_id)
    .eq("swiped_id", user.id)
    .eq("liked", true)
    .maybeSingle();

  if (!reverseSwipe) return NextResponse.json({ matched: false });

  // Enforce user_a < user_b (byte order) to match the Postgres text unique constraint
  const [userA, userB] = [user.id, swiped_id].sort();

  const { data: newMatch, error: matchError } = await supabase
    .from("matches")
    .insert({ user_a: userA, user_b: userB })
    .select("id")
    .single();

  if (matchError) {
    // Race condition: match already exists, look it up
    const { data: existing, error: lookupError } = await supabase
      .from("matches")
      .select("id")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .single();

    if (lookupError || !existing) {
      console.error("match lookup error after race", lookupError);
      return NextResponse.json({ error: "Failed to retrieve match" }, { status: 500 });
    }
    return NextResponse.json({ matched: true, matchId: existing.id });
  }

  return NextResponse.json({ matched: true, matchId: newMatch.id });
}
