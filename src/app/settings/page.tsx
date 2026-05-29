import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SettingsForm from "@/components/SettingsForm";
import type { SettingsData } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: prefs }, { data: photos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, birth_date, gender, bio")
      .eq("id", user.id)
      .single(),
    supabase
      .from("preferences")
      .select("orientation, interested_in, age_min, age_max")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("photos")
      .select("id, url, position")
      .eq("user_id", user.id)
      .order("position"),
  ]);

  const settings: SettingsData = {
    display_name: profile?.display_name ?? "",
    birth_date: profile?.birth_date ?? "",
    gender: profile?.gender ?? "",
    bio: profile?.bio ?? "",
    orientation: prefs?.orientation ?? "",
    interested_in: prefs?.interested_in ?? [],
    age_min: prefs?.age_min ?? 18,
    age_max: prefs?.age_max ?? 99,
    photos: photos ?? [],
  };

  return <SettingsForm initialData={settings} userId={user.id} />;
}
