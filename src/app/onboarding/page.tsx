"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const GENDERS = ["man", "woman", "non-binary", "trans-man", "trans-woman", "other"];
const ORIENTATIONS = ["straight", "gay", "lesbian", "bisexual", "pansexual", "asexual", "other"];

type Step1Data = { display_name: string; birth_date: string; gender: string; bio: string };
type Step2Data = { orientation: string; interested_in: string[]; age_min: number; age_max: number };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [step1, setStep1] = useState<Step1Data>({
    display_name: "",
    birth_date: "",
    gender: "",
    bio: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    orientation: "",
    interested_in: [],
    age_min: 18,
    age_max: 50,
  });

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(step1),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep(2);
  }

  async function submitStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(step2),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep(3);
  }

  async function submitStep3(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];

    if (!file) {
      router.push("/discover");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Please log in again."); setLoading(false); return; }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/0.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { setError(uploadError.message); setLoading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: publicUrl, position: 0 }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); setLoading(false); return; }

    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: publicUrl }),
    });

    router.push("/discover");
  }

  function toggleInterestedIn(gender: string) {
    setStep2((prev) => ({
      ...prev,
      interested_in: prev.interested_in.includes(gender)
        ? prev.interested_in.filter((g) => g !== gender)
        : [...prev.interested_in, gender],
    }));
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-rose-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 mx-1 rounded-full transition-colors ${
                s <= step ? "bg-rose-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-6 text-gray-800">About you</h2>
            <form onSubmit={submitStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                <input
                  type="text"
                  required
                  value={step1.display_name}
                  onChange={(e) => setStep1((p) => ({ ...p, display_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth date</label>
                <input
                  type="date"
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  value={step1.birth_date}
                  onChange={(e) => setStep1((p) => ({ ...p, birth_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  required
                  value={step1.gender}
                  onChange={(e) => setStep1((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="">Select…</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  value={step1.bio}
                  onChange={(e) => setStep1((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 text-white rounded-lg py-2.5 font-semibold hover:bg-rose-600 disabled:opacity-50 transition"
              >
                {loading ? "Saving…" : "Continue"}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold mb-6 text-gray-800">Your preferences</h2>
            <form onSubmit={submitStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
                <select
                  required
                  value={step2.orientation}
                  onChange={(e) => setStep2((p) => ({ ...p, orientation: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="">Select…</option>
                  {ORIENTATIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Interested in</p>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleInterestedIn(g)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                        step2.interested_in.includes(g)
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white text-gray-600 border-gray-300 hover:border-rose-400"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age range: {step2.age_min} – {step2.age_max}
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    min={18}
                    max={step2.age_max}
                    value={step2.age_min}
                    onChange={(e) => setStep2((p) => ({ ...p, age_min: Number(e.target.value) }))}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="number"
                    min={step2.age_min}
                    max={99}
                    value={step2.age_max}
                    onChange={(e) => setStep2((p) => ({ ...p, age_max: Number(e.target.value) }))}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || step2.interested_in.length === 0 || !step2.orientation}
                className="w-full bg-rose-500 text-white rounded-lg py-2.5 font-semibold hover:bg-rose-600 disabled:opacity-50 transition"
              >
                {loading ? "Saving…" : "Continue"}
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold mb-6 text-gray-800">Add a photo</h2>
            <form onSubmit={submitStep3} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <p className="text-gray-500 mb-3 text-sm">Upload your best photo (max 5 MB)</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block mx-auto text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-600 hover:file:bg-rose-100"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 text-white rounded-lg py-2.5 font-semibold hover:bg-rose-600 disabled:opacity-50 transition"
              >
                {loading ? "Uploading…" : "Finish"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/discover")}
                className="w-full text-gray-400 text-sm hover:text-gray-600"
              >
                Skip for now
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
