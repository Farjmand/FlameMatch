import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
const STORAGE_ORIGIN = `${supabaseUrl}/storage/v1/object/public/avatars/`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { url, position } = body;

  if (typeof url !== "string" || !url.startsWith(STORAGE_ORIGIN) || url.includes("..")) {
    return NextResponse.json({ error: "Invalid photo URL" }, { status: 400 });
  }

  const { error } = await supabase.from("photos").insert({
    user_id: user.id,
    url,
    position: typeof position === "number" ? position : 0,
  });

  if (error) {
    console.error("photos insert error", error);
    return NextResponse.json({ error: "Failed to save photo" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "id must be a valid UUID" }, { status: 400 });
  }

  const { error } = await supabase.from("photos").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("photos delete error", error);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
