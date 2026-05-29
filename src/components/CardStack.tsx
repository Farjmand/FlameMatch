"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/app/discover/page";
import ProfileCard from "./ProfileCard";
import MatchToast from "./MatchToast";

type Props = {
  initialCandidates: Candidate[];
};

type MatchResult = { matchId: string; partner: Candidate };

export default function CardStack({ initialCandidates }: Props) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const top = candidates[0];

  async function swipe(liked: boolean) {
    if (!top) return;
    const swiped = top;
    setCandidates((prev) => prev.slice(1));
    setDragX(0);

    const res = await fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swiped_id: swiped.id, liked }),
    });

    if (res.ok && liked) {
      const data = await res.json();
      if (data.matched) {
        setMatch({ matchId: data.matchId, partner: swiped });
      }
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    setDragging(true);
    cardRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp() {
    setDragging(false);
    if (dragX > 80) swipe(true);
    else if (dragX < -80) swipe(false);
    else setDragX(0);
  }

  if (!top) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-rose-50 p-4 text-center">
        <div className="text-6xl mb-4">🔥</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">No more flames nearby</h2>
        <p className="text-gray-400 mb-6">Check back later — new people join every day</p>
        <button
          onClick={() => router.refresh()}
          className="bg-rose-500 text-white rounded-xl px-6 py-3 font-semibold hover:bg-rose-600 transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  const rotation = (dragX / 300) * 15;
  const likeOpacity = Math.min(Math.max(dragX / 100, 0), 1);
  const nopeOpacity = Math.min(Math.max(-dragX / 100, 0), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm h-[520px]">
        {/* Background cards for stack depth */}
        {candidates[2] && (
          <div className="absolute inset-0 rounded-3xl bg-gray-200 shadow-md scale-95 translate-y-4 opacity-50" />
        )}
        {candidates[1] && (
          <div className="absolute inset-0 rounded-3xl bg-gray-100 shadow-lg scale-97 translate-y-2 opacity-75" />
        )}

        {/* Top card with drag */}
        <div
          ref={cardRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
          style={{
            transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
            transition: dragging ? "none" : "transform 0.3s ease",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <ProfileCard candidate={top} />

          {/* Like / nope overlays */}
          <div
            className="absolute top-8 left-8 border-4 border-green-400 text-green-400 text-2xl font-bold rounded-xl px-3 py-1 rotate-[-20deg]"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </div>
          <div
            className="absolute top-8 right-8 border-4 border-red-400 text-red-400 text-2xl font-bold rounded-xl px-3 py-1 rotate-[20deg]"
            style={{ opacity: nopeOpacity }}
          >
            NOPE
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-8 mt-8">
        <button
          onClick={() => swipe(false)}
          className="w-16 h-16 rounded-full bg-white shadow-lg text-2xl flex items-center justify-center hover:scale-110 transition"
          aria-label="Dislike"
        >
          ✕
        </button>
        <button
          onClick={() => swipe(true)}
          className="w-16 h-16 rounded-full bg-white shadow-lg text-2xl flex items-center justify-center hover:scale-110 transition"
          aria-label="Like"
        >
          ❤️
        </button>
      </div>

      {match && (
        <MatchToast match={match} onDismiss={() => setMatch(null)} />
      )}
    </div>
  );
}
