"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Message, MatchMeta } from "@/app/matches/[id]/page";

type Props = {
  initialMessages: Message[];
  meta: MatchMeta;
  currentUserId: string;
};

export default function ChatRoom({ initialMessages, meta, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match:${meta.matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${meta.matchId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meta.matchId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    const res = await fetch(`/api/messages/${meta.matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    if (res.ok) {
      const confirmed: Message = await res.json();
      setMessages((prev) => {
        // If Realtime already added the confirmed message, just drop the optimistic entry
        if (prev.some((m) => m.id === confirmed.id)) {
          return prev.filter((m) => m.id !== optimistic.id);
        }
        return prev.map((m) => (m.id === optimistic.id ? confirmed : m));
      });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shadow-sm">
        <Link href="/matches" className="text-gray-400 hover:text-gray-600 mr-1">
          ←
        </Link>
        {meta.partnerAvatar && (
          <img
            src={meta.partnerAvatar}
            alt={meta.partnerName}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <span className="font-semibold text-gray-800">{meta.partnerName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                  isMine
                    ? "bg-rose-500 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex gap-2 px-4 py-3 border-t bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-rose-500 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
