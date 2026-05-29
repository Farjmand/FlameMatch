"use client";

import Link from "next/link";
import type { Candidate } from "@/app/discover/page";

type Props = {
  match: { matchId: string; partner: Candidate };
  onDismiss: () => void;
};

export default function MatchToast({ match, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">🔥</div>
        <h2 className="text-3xl font-bold text-rose-500 mb-2">It&apos;s a Flame!</h2>
        <p className="text-gray-500 mb-6">You and {match.partner.display_name} liked each other</p>

        {match.partner.avatar_url && (
          <img
            src={match.partner.avatar_url}
            alt={match.partner.display_name}
            className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-rose-200"
          />
        )}

        <div className="space-y-3">
          <Link
            href={`/matches/${match.matchId}`}
            className="block w-full bg-rose-500 text-white rounded-xl py-3 font-semibold hover:bg-rose-600 transition"
          >
            Start chatting
          </Link>
          <button
            onClick={onDismiss}
            className="block w-full text-gray-400 hover:text-gray-600 text-sm"
          >
            Keep swiping
          </button>
        </div>
      </div>
    </div>
  );
}
