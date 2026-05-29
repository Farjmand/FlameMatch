import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export default async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Count unread matches (matches with no messages yet are "new")
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const { count: msgCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in(
      "match_id",
      // We only fetch match ids in a subquery — simplest approach for a badge
      // is total unread: matches with 0 messages
      []
    );

  void msgCount; // badge is simplified to total match count for now

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-40">
      <Link
        href="/discover"
        className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-rose-500 transition"
      >
        <span className="text-2xl">🔥</span>
        <span className="text-xs">Discover</span>
      </Link>

      <Link
        href="/matches"
        className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-rose-500 transition relative"
      >
        <span className="text-2xl">💬</span>
        {(count ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        )}
        <span className="text-xs">Matches</span>
      </Link>

      <Link
        href="/settings"
        className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-rose-500 transition"
      >
        <span className="text-2xl">⚙️</span>
        <span className="text-xs">Settings</span>
      </Link>
    </nav>
  );
}
