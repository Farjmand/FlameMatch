import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { GENDERS } from "@/lib/types";

const VALID_GENDERS = new Set<string>(GENDERS);

function validateProfile(body: Record<string, unknown>) {
  const errors: string[] = [];

  if ("display_name" in body) {
    if (typeof body.display_name !== "string" || body.display_name.trim().length === 0) {
      errors.push("display_name must be a non-empty string");
    } else if (body.display_name.length > 64) {
      errors.push("display_name must be 64 characters or fewer");
    }
  }

  if ("gender" in body) {
    if (!VALID_GENDERS.has(body.gender as string)) {
      errors.push(`gender must be one of: ${GENDERS.join(", ")}`);
    }
  }

  if ("birth_date" in body) {
    if (typeof body.birth_date !== "string" || isNaN(Date.parse(body.birth_date as string))) {
      errors.push("birth_date must be a valid date string");
    }
  }

  if ("bio" in body && body.bio !== null) {
    if (typeof body.bio !== "string" || body.bio.length > 500) {
      errors.push("bio must be a string of 500 characters or fewer");
    }
  }

  return errors;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { display_name, birth_date, gender, bio } = body;

  const errs = validateProfile({ display_name, birth_date, gender, bio });
  if (errs.length) return NextResponse.json({ error: errs[0] }, { status: 400 });

  if (!display_name || !birth_date || !gender) {
    return NextResponse.json({ error: "display_name, birth_date, and gender are required" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: (display_name as string).trim(),
    birth_date,
    gender,
    bio: bio ?? null,
  });

  if (error) {
    console.error("profile insert error", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { display_name, birth_date, gender, bio, avatar_url } = body;

  const errs = validateProfile({ display_name, birth_date, gender, bio });
  if (errs.length) return NextResponse.json({ error: errs[0] }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (display_name !== undefined) updates.display_name = (display_name as string).trim();
  if (birth_date !== undefined) updates.birth_date = birth_date;
  if (gender !== undefined) updates.gender = gender;
  if (bio !== undefined) updates.bio = bio;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("profile update error", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
