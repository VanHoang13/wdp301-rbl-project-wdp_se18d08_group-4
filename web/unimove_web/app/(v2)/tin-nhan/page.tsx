"use client";

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare, Send, ArrowLeft, Package, Bell,
  RefreshCw, ChevronRight, Star, AlertCircle, CheckCircle, User,
} from "lucide-react";
import { conversationsApi, notificationsApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";

const BRAND = "#2563EB";

/* ─── Types ─── */
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

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  read?: boolean;
  is_read?: boolean;
  created_at: string;
}

/* ─── Helpers ─── */
function Avatar({ name, url, size = 40 }: { name?: string; url?: string; size?: number }) {
  const initials = (name ?? "?").split(" ").slice(-2).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  if (url) return (
    <img src={url} alt={name} className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
      style={{ width: size, height: size, backgroundColor: BRAND }}>
      {initials}
    </div>
  );
}

function mapType(t: string): "order" | "promo" | "system" | "review" {
  if (t?.includes("order") || t?.includes("quote")) return "order";
  if (t?.includes("review")) return "review";
  if (t?.includes("promo")) return "promo";
  return "system";
}
const TYPE_META = {
  order:  { icon: Package,      bg: "#EFF6FF", color: BRAND },
  promo:  { icon: Star,         bg: "#FFFBEB", color: "#D97706" },
  system: { icon: AlertCircle,  bg: "#F0FDF4", color: "#16A34A" },
  review: { icon: CheckCircle,  bg: "#FFF1F2", color: "#E11D48" },
};

/* ─── Main ─── */
function TinNhanContent() {
  const searchParams   = useSearchParams();
  const initialOrderId = searchParams.get("orderId");
  const initialTab     = searchParams.get("tab") === "thong-bao" ? 1 : 0;

  const [me,           setMe]           = useState<string>("");
  const [tab,          setTab]          = useState(initialTab);
  const [convs,        setConvs]        = useState<Conversation[]>([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(initialOrderId);
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [notifs,       setNotifs]       = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMe(getStoredUser()?.id ?? ""); }, []);

  const loadConvs = useCallback(() => {
    setLoadingList(true);
    conversationsApi.list().then(r => {
      if (r.success && Array.isArray(r.data)) setConvs(r.data as Conversation[]);
    }).finally(() => setLoadingList(false));
  }, []);

  const loadNotifs = useCallback(() => {
    setNotifLoading(true);
    notificationsApi.list({ pageSize: 50 }).then(r => {
      if (r.success && r.data) {
        const d = r.data as { notifications?: Notification[] } | Notification[];
        setNotifs(Array.isArray(d) ? d : (d?.notifications ?? []));
      }
    }).finally(() => setNotifLoading(false));
  }, []);

  const openConvo = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
    setMessages([]);
    setLoadingMsgs(true);
    conversationsApi.getMessages(orderId).then(r => {
      const d = r.data as { messages?: ChatMessage[] };
      setMessages(d?.messages ?? []);
      setConvs(prev => prev.map(c => c.order_id === orderId ? { ...c, unread_count: 0 } : c));
    }).finally(() => setLoadingMsgs(false));
  }, []);

  useEffect(() => {
    loadConvs();
    loadNotifs();
  }, [loadConvs, loadNotifs]);

  useEffect(() => {
    if (initialOrderId) openConvo(initialOrderId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = convs.find(c => c.order_id === activeOrderId);

  const send = async () => {
    if (!activeOrderId || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      content: text,
      sender_id: me,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const r = await conversationsApi.sendMessage(activeOrderId, text);
      if (r.success && r.data) {
        const real = r.data as ChatMessage;
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...optimistic, ...real } : m));
        setConvs(prev => prev.map(c =>
          c.order_id === activeOrderId
            ? { ...c, last_message_preview: text, last_message_at: real.created_at ?? optimistic.created_at }
            : c
        ));
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* ─── Empty states ─── */
  const EmptyConvos = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
        <MessageSquare size={28} className="text-gray-300" />
      </div>
      <p className="font-bold text-gray-800 mb-1 text-sm">Chưa có tin nhắn</p>
      <Link href="/dat-chuyen" className="text-xs text-[#2563EB] font-semibold no-underline mt-1">
        Đặt chuyến để bắt đầu
      </Link>
    </div>
  );

  const NoChatSelected = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }}>
        <MessageSquare size={32} style={{ color: BRAND }} />
      </div>
      <p className="font-bold text-gray-800 mb-1.5">Chọn cuộc trò chuyện</p>
      <p className="text-sm text-gray-400">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu chat</p>
    </div>
  );

  return (
    <div
      className="flex overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm"
      style={{ height: "calc(100vh - 68px)" }}
    >

      {/* ── Left panel ── */}
      <div
        className={`flex flex-col border-r border-gray-100 ${activeOrderId ? "hidden lg:flex" : "flex"}`}
        style={{ width: 320, minWidth: 320 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tin nhắn</h2>
            <p className="text-xs text-gray-400 mt-0.5">Chat & thông báo đơn hàng</p>
          </div>
          <button
            onClick={tab === 0 ? loadConvs : loadNotifs}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-2 border-b border-gray-50 shrink-0">
          {(["Tin nhắn", "Thông báo"] as const).map((label, i) => (
            <button
              key={label}
              onClick={() => setTab(i)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={tab === i
                ? { backgroundColor: BRAND + "15", color: BRAND }
                : { color: "#9CA3AF" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* List area */}
        <div className="flex-1 overflow-y-auto">
          {tab === 0 ? (
            loadingList ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 items-center animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 rounded bg-gray-100" />
                      <div className="h-3 w-full rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : convs.length === 0 ? (
              <EmptyConvos />
            ) : (
              <div className="divide-y divide-gray-50">
                {convs.map(conv => {
                  const isActive = activeOrderId === conv.order_id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => openConvo(conv.order_id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
                      style={{ backgroundColor: isActive ? BRAND + "10" : undefined }}
                    >
                      <Avatar name={conv.counterpart?.full_name} url={conv.counterpart?.avatar_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-sm truncate ${conv.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                            {conv.counterpart?.full_name ?? "Nhà xe"}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {conv.last_message_at ? timeAgo(conv.last_message_at) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${conv.unread_count > 0 ? "font-semibold text-gray-700" : "text-gray-400"}`}>
                            {conv.last_message_preview || "Chưa có tin nhắn"}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
                              style={{ width: 18, height: 18, backgroundColor: BRAND }}>
                              {conv.unread_count > 9 ? "9+" : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      {!conv.unread_count && <ChevronRight size={14} className="text-gray-200 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            notifLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 items-center animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-gray-100" />
                      <div className="h-3 w-full rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Bell size={28} className="text-gray-300" />
                </div>
                <p className="font-bold text-gray-800 text-sm">Chưa có thông báo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifs.map(n => {
                  const kind = mapType(n.type);
                  const meta = TYPE_META[kind];
                  const Icon = meta.icon;
                  const unread = !(n.read ?? n.is_read);
                  return (
                    <button
                      key={n.id}
                      onClick={() => unread && notificationsApi.markRead(n.id)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
                      style={{ borderLeft: unread ? `3px solid ${BRAND}` : "3px solid transparent" }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: meta.bg, color: meta.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${unread ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{n.body || n.message}</p>
                        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Right panel: chat ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeOrderId ? "flex" : "hidden lg:flex"}`}>
        {!activeOrderId ? (
          <NoChatSelected />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0 bg-white">
              <button
                onClick={() => setActiveOrderId(null)}
                className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar
                name={activeConv?.counterpart?.full_name}
                url={activeConv?.counterpart?.avatar_url}
                size={38}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {activeConv?.counterpart?.full_name ?? "Nhà xe"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Package size={11} className="text-gray-400" />
                  <p className="text-xs text-gray-400 truncate">
                    Đơn #{activeOrderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ backgroundColor: "#FAFAFA" }}>
              {loadingMsgs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"} animate-pulse`}>
                      <div className="h-9 rounded-2xl bg-gray-200" style={{ width: `${40 + i * 20}%` }} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
                    <MessageSquare size={22} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">Chưa có tin nhắn</p>
                  <p className="text-xs text-gray-400">Hãy bắt đầu cuộc trò chuyện!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === me;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <Avatar
                          name={activeConv?.counterpart?.full_name}
                          url={activeConv?.counterpart?.avatar_url}
                          size={28}
                        />
                      )}
                      <div className={`max-w-[72%] ${!isMe ? "ml-2" : "mr-0"}`}>
                        <div
                          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={isMe
                            ? { backgroundColor: BRAND, color: "#fff", borderBottomRightRadius: 4 }
                            : { backgroundColor: "#fff", color: "#1F2937", border: "1px solid #F3F4F6", borderBottomLeftRadius: 4 }
                          }
                        >
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-gray-400 mt-1 ${isMe ? "text-right" : "text-left"}`}>
                          {timeAgo(msg.created_at)}
                        </p>
                      </div>
                      {isMe && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-2 self-end mb-5"
                          style={{ backgroundColor: BRAND + "20" }}>
                          <User size={13} style={{ color: BRAND }} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Nhập tin nhắn... (Enter để gửi)"
                  rows={1}
                  className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-1 max-h-32"
                  style={{ lineHeight: "1.5" }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 shrink-0"
                  style={{ backgroundColor: BRAND }}
                >
                  {sending
                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <Send size={15} />
                  }
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">Shift+Enter để xuống dòng</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TinNhanPage() {
  return (
    <Suspense fallback={
      <div className="flex overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm animate-pulse" style={{ height: "calc(100vh - 68px)" }}>
        <div className="flex flex-col border-r border-gray-100" style={{ width: 320 }}>
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-5 w-24 rounded bg-gray-100 mb-1" />
            <div className="h-3 w-36 rounded bg-gray-100" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 rounded bg-gray-100" />
                  <div className="h-3 w-full rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 hidden lg:flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-100" />
        </div>
      </div>
    }>
      <TinNhanContent />
    </Suspense>
  );
}
