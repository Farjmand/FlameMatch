import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ChatRoom from "@/components/ChatRoom";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type MatchMeta = {
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("id, user_a, user_b")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || (match.user_a !== user.id && match.user_b !== user.id)) {
    return notFound();
  }

  const partnerId = match.user_a === user.id ? match.user_b : match.user_a;

  const [{ data: partnerProfile }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", partnerId)
      .single(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  const meta: MatchMeta = {
    matchId,
    partnerId,
    partnerName: partnerProfile?.display_name ?? "Unknown",
    partnerAvatar: partnerProfile?.avatar_url ?? null,
  };

  return (
    <ChatRoom
      initialMessages={(messages ?? []) as Message[]}
      meta={meta}
      currentUserId={user.id}
    />
  );
}
