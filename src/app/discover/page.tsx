import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import CardStack from "@/components/CardStack";

export type Candidate = {
  id: string;
  display_name: string;
  birth_date: string;
  gender: string;
  bio: string | null;
  avatar_url: string | null;
};

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: candidateIds } = await supabase.rpc("get_candidates");

  let candidates: Candidate[] = [];
  if (candidateIds && candidateIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, birth_date, gender, bio, avatar_url")
      .in("id", candidateIds);
    candidates = (data ?? []) as Candidate[];
  }

  return <CardStack initialCandidates={candidates} />;
}
