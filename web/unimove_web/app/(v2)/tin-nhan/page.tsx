"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search, Send, ArrowLeft } from "lucide-react";
import { conversationsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface Conversation {
  id: string;
  order_id: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  counterpart?: { full_name?: string; avatar_url?: string };
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export default function TinNhanPage() {
  const [search, setSearch] = useState("");
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const loadConvs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conversationsApi.list();
      if (res.success && Array.isArray(res.data)) setConvs(res.data as Conversation[]);
    } catch {
      setConvs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (orderId: string) => {
    const res = await conversationsApi.getMessages(orderId);
    const d = res.data as { messages?: ChatMessage[] };
    setMessages(d?.messages ?? []);
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  useEffect(() => {
    if (activeOrderId) loadMessages(activeOrderId);
  }, [activeOrderId, loadMessages]);

  const filtered = convs.filter((c) =>
    !search || (c.counterpart?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = convs.find((c) => c.order_id === activeOrderId);

  const send = async () => {
    if (!activeOrderId || !text.trim()) return;
    setSending(true);
    try {
      await conversationsApi.sendMessage(activeOrderId, text.trim());
      setText("");
      await loadMessages(activeOrderId);
      await loadConvs();
    } finally {
      setSending(false);
    }
  };

  if (activeOrderId) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <button onClick={() => setActiveOrderId(null)} className="p-2 rounded-xl hover:bg-gray-50">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-semibold text-gray-900">{activeConv?.counterpart?.full_name ?? "Chat"}</p>
            <p className="text-xs text-gray-500">Đơn #{activeOrderId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
          {messages.map((m) => (
            <div key={m.id} className="max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-800">{m.content}</p>
              <p className="text-[10px] text-gray-400 mt-1">{formatDate(m.created_at)}</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-sm"
          />
          <button onClick={send} disabled={sending} className="w-11 h-11 rounded-xl bg-[#2563EB] text-white flex items-center justify-center">
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5 max-w-2xl mx-auto lg:max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
        <p className="text-sm text-gray-500 mt-0.5">Trò chuyện với tài xế / khách hàng</p>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Tìm cuộc trò chuyện..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm bg-white"
        />
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <MessageSquare size={32} className="text-[#2563EB] mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Chưa có tin nhắn</p>
          <Link href="/dat-chuyen" className="text-sm text-[#2563EB] font-semibold">Đặt chuyến ngay</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveOrderId(conv.order_id)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-gray-50/60"
            >
              <div className="w-11 h-11 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold">
                {(conv.counterpart?.full_name ?? "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">{conv.counterpart?.full_name ?? "Người dùng"}</span>
                  {conv.last_message_at && <span className="text-xs text-gray-400">{formatDate(conv.last_message_at)}</span>}
                </div>
                <p className="text-sm text-gray-500 truncate">{conv.last_message_preview || "Chưa có tin nhắn"}</p>
              </div>
              {conv.unread_count > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center">{conv.unread_count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
