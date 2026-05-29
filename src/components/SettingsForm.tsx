"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { SettingsData } from "@/lib/types";
import { GENDERS, ORIENTATIONS } from "@/lib/types";

type Props = {
  readonly initialData: SettingsData;
  readonly userId: string;
};

export default function SettingsForm({ initialData, userId }: Props) {
  const [data, setData] = useState<SettingsData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterested(gender: string) {
    const list = data.interested_in;
    set(
      "interested_in",
      list.includes(gender) ? list.filter((g) => g !== gender) : [...list, gender]
    );
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const [profileRes, prefsRes] = await Promise.all([
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: data.display_name,
          birth_date: data.birth_date,
          gender: data.gender,
          bio: data.bio,
        }),
      }),
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orientation: data.orientation,
          interested_in: data.interested_in,
          age_min: data.age_min,
          age_max: data.age_max,
        }),
      }),
    ]);

    setSaving(false);

    if (profileRes.ok && prefsRes.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    const failed = profileRes.ok ? prefsRes : profileRes;
    const d = await failed.json();
    setError(d.error);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (data.photos.length >= 6) {
      setError("Maximum 6 photos allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const position = data.photos.length;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${position}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl;

    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, position }),
    });

    if (res.ok) {
      set("photos", [...data.photos, { id: `new-${Date.now()}`, url, position }]);
    } else {
      const d = await res.json();
      setError(d.error);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function deletePhoto(photoId: string) {
    const res = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photoId }),
    });
    if (res.ok) set("photos", data.photos.filter((p) => p.id !== photoId));
  }

  function saveLabel() {
    if (saving) return "Saving…";
    if (saved) return "Saved!";
    return "Save changes";
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-orange-50 to-rose-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

        <form onSubmit={save} className="space-y-6">
          {/* Profile */}
          <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Profile</h2>

            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                Display name
              </label>
              <input
                id="display_name"
                type="text"
                required
                value={data.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                required
                value={data.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                value={data.bio}
                onChange={(e) => set("bio", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              />
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Preferences</h2>

            <div>
              <label htmlFor="orientation" className="block text-sm font-medium text-gray-700 mb-1">
                Orientation
              </label>
              <select
                id="orientation"
                required
                value={data.orientation}
                onChange={(e) => set("orientation", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Interested in</p>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleInterested(g)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                      data.interested_in.includes(g)
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
              <p className="text-sm font-medium text-gray-700 mb-1">
                Age range: {data.age_min} – {data.age_max}
              </p>
              <div className="flex gap-3 items-center">
                <input
                  id="age_min"
                  type="number"
                  aria-label="Minimum age"
                  min={18}
                  max={data.age_max}
                  value={data.age_min}
                  onChange={(e) => set("age_min", Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                />
                <span className="text-gray-400">to</span>
                <input
                  id="age_max"
                  type="number"
                  aria-label="Maximum age"
                  min={data.age_min}
                  max={99}
                  value={data.age_max}
                  onChange={(e) => set("age_max", Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Photos ({data.photos.length}/6)</h2>

            <div className="grid grid-cols-3 gap-3">
              {data.photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label="Delete photo"
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {data.photos.length < 6 && (
                <label
                  htmlFor="photo_upload"
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-rose-400 transition"
                >
                  <span className="text-2xl text-gray-300">{uploading ? "…" : "+"}</span>
                  <input
                    id="photo_upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload photo"
                    onChange={uploadPhoto}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </section>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-rose-500 text-white rounded-xl py-3 font-semibold hover:bg-rose-600 disabled:opacity-50 transition"
          >
            {saveLabel()}
          </button>
        </form>

        {/* Sign out */}
        <form action="/logout" method="POST" className="mt-4">
          <button
            type="submit"
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
