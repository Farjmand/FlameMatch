import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { GENDERS, ORIENTATIONS } from "@/lib/types";

const VALID_GENDERS = new Set<string>(GENDERS);
const VALID_ORIENTATIONS = new Set<string>(ORIENTATIONS);

function validatePreferences(body: Record<string, unknown>) {
  const errors: string[] = [];

  if ("orientation" in body) {
    if (!VALID_ORIENTATIONS.has(body.orientation as string)) {
      errors.push(`orientation must be one of: ${ORIENTATIONS.join(", ")}`);
    }
  }

  if ("interested_in" in body) {
    if (!Array.isArray(body.interested_in) || (body.interested_in as unknown[]).some((g) => !VALID_GENDERS.has(g as string))) {
      errors.push(`interested_in must be an array of valid genders`);
    }
  }

  if ("age_min" in body) {
    const v = body.age_min as number;
    if (typeof v !== "number" || v < 18 || v > 99) errors.push("age_min must be between 18 and 99");
  }

  if ("age_max" in body) {
    const v = body.age_max as number;
    if (typeof v !== "number" || v < 18 || v > 99) errors.push("age_max must be between 18 and 99");
  }

  if (
    "age_min" in body &&
    "age_max" in body &&
    typeof body.age_min === "number" &&
    typeof body.age_max === "number" &&
    body.age_min > body.age_max
  ) {
    errors.push("age_min must not exceed age_max");
  }

  return errors;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orientation, interested_in, age_min, age_max } = body;

  const errs = validatePreferences({ orientation, interested_in, age_min, age_max });
  if (errs.length) return NextResponse.json({ error: errs[0] }, { status: 400 });

  const { error } = await supabase.from("preferences").insert({
    user_id: user.id,
    orientation,
    interested_in,
    age_min: age_min ?? 18,
    age_max: age_max ?? 99,
  });

  if (error) {
    console.error("preferences insert error", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orientation, interested_in, age_min, age_max } = body;

  const errs = validatePreferences({ orientation, interested_in, age_min, age_max });
  if (errs.length) return NextResponse.json({ error: errs[0] }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (orientation !== undefined) updates.orientation = orientation;
  if (interested_in !== undefined) updates.interested_in = interested_in;
  if (age_min !== undefined) updates.age_min = age_min;
  if (age_max !== undefined) updates.age_max = age_max;

  const { error } = await supabase.from("preferences").update(updates).eq("user_id", user.id);
  if (error) {
    console.error("preferences update error", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
