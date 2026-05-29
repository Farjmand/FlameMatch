import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

type MatchPreview = {
  match_id: string;
  created_at: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  latest_message: string | null;
};

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: matches } = await supabase.rpc("get_matches_with_preview");
  const rows = (matches ?? []) as MatchPreview[];

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50">
      <div className="max-w-lg mx-auto pt-8 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Flames 🔥</h1>

        {rows.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <div className="text-5xl mb-4">💤</div>
            <p>No matches yet. Keep swiping!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((m) => (
              <li key={m.match_id}>
                <Link
                  href={`/matches/${m.match_id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="w-14 h-14 rounded-full bg-rose-100 overflow-hidden flex-shrink-0">
                    {m.partner_avatar ? (
                      <img
                        src={m.partner_avatar}
                        alt={m.partner_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🔥</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">{m.partner_name}</p>
                    <p className="text-sm text-gray-400 truncate">
                      {m.latest_message ?? "Say hello!"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
