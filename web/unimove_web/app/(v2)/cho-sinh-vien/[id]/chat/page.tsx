"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, Lock, CircleCheck, Truck } from "lucide-react";
import { marketplaceApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatVND, timeAgo, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Message {
  id: string;
  content?: string;
  text?: string;
  from_buyer?: boolean;
  sender_id?: string;
  created_at: string;
  is_deal_confirm?: boolean;
  is_deal_cancel?: boolean;
}

interface Listing {
  id: string;
  title: string;
  price?: number;
  area?: string;
  city?: string;
  images?: string[];
  status: string;
  seller_id?: string;
  deal_confirmed?: boolean;
  transport_booked?: boolean;
  seller?: { full_name: string; avatar_url?: string };
  profiles?: { id?: string; full_name?: string; avatar_url?: string };
}

const QUICK_REPLIES = ["Còn không bạn?", "Bớt chút nhé", "Khi nào lấy được?"];

function dedupeMessages(list: Message[]): Message[] {
  const seen = new Set<string>();
  return list.filter((m, i) => {
    const key =
      m.id ||
      `${m.created_at ?? ""}|${m.text ?? m.content ?? ""}|${m.from_buyer ?? ""}|${i}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function messageKey(m: Message, index: number): string {
  return m.id ? `${m.id}-${index}` : `msg-${index}-${m.created_at ?? ""}`;
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function MarketplaceChatPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentUser = getStoredUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  const sellerId = listing?.seller_id ?? listing?.profiles?.id;
  const isOwner = !!currentUser?.id && currentUser.id === sellerId;
  const buyerId =
    currentUser?.id && sellerId && currentUser.id !== sellerId ? currentUser.id : "";

  const chatTitle =
    listing?.seller?.full_name ?? listing?.profiles?.full_name ?? "Người bán";
  const chatInitial = chatTitle[0]?.toUpperCase() ?? "?";

  const loadMessages = useCallback(async () => {
    if (!buyerId) return;
    try {
      const mr = await marketplaceApi.getMessages(id, buyerId);
      if (mr.success && mr.data) {
        const d = mr.data as { messages?: Message[] } | Message[];
        const raw = Array.isArray(d) ? d : (d?.messages ?? []);
        setMessages(dedupeMessages(raw));
        setLoadError(null);
      }
    } catch {
      setLoadError("Không tải được tin nhắn. Kiểm tra kết nối và thử lại.");
    }
  }, [id, buyerId]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await marketplaceApi.get(id);
        if (!cancelled && r.success && r.data) setListing(r.data as Listing);
      } catch {
        if (!cancelled) setLoadError("Không tải được thông tin tin đăng.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, currentUser]);

  useEffect(() => {
    if (!listing || !buyerId) return;
    void loadMessages();
  }, [listing, buyerId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async (content?: string) => {
    const body = (content ?? text).trim();
    if (!body || !listing || !buyerId) return;
    setSending(true);
    try {
      const r = await marketplaceApi.sendMessage(id, buyerId, body);
      if (r.success) {
        if (!content) setText("");
        await loadMessages();
      }
    } catch {
      toast("Gửi tin nhắn thất bại", "error");
    } finally {
      setSending(false);
    }
  };

  const priceLabel =
    !listing?.price || listing.price === 0 ? "Miễn phí" : formatVND(listing.price);
  const location = listing?.area ?? listing?.city;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-4 lg:px-0 lg:py-6">
      <div
        className="flex min-h-[min(720px,calc(100dvh-10rem))] flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F0F4FF] shadow-sm"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#E2E8F0] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/cho-sinh-vien/${id}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0F172A] no-underline hover:bg-[#DBEAFE]"
              aria-label="Quay lại tin đăng"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-extrabold text-[#0047FF]">
              {listing?.seller?.avatar_url || listing?.profiles?.avatar_url ? (
                <img
                  src={listing.seller?.avatar_url ?? listing.profiles?.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                chatInitial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-[#0F172A]">{chatTitle}</p>
              <p className="truncate text-[11px] text-[#64748B]">
                {listing?.deal_confirmed
                  ? "Đã chốt — có thể đặt xe"
                  : "Chờ người bán chốt đơn"}
              </p>
            </div>
          </div>
        </div>

        {/* Product banner */}
        {listing && (
          <div className="mx-3 mt-3 rounded-xl border border-[#E2E8F0] bg-white p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EEF2FF]">
                {listing.images?.[0] ? (
                  <img
                    src={listing.images[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg">📦</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0F172A]">{listing.title}</p>
                <p
                  className={cn(
                    "text-sm font-extrabold",
                    !listing.price || listing.price === 0
                      ? "text-[#16A34A]"
                      : "text-[#0047FF]"
                  )}
                >
                  {priceLabel}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logistics banner — buyer */}
        {listing && !isOwner && !listing.deal_confirmed && (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#EEF2FF] px-3 py-2.5">
            <Lock size={16} className="mt-0.5 shrink-0 text-[#64748B]" />
            <p className="text-[11px] leading-relaxed text-[#64748B]">
              Chờ người bán chốt đơn trong chat — sau đó bạn mới đặt được xe.
            </p>
          </div>
        )}

        {listing && !isOwner && listing.deal_confirmed && !listing.transport_booked && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-[#0047FF]/20 bg-[#DBEAFE] px-3 py-2.5">
            <CircleCheck size={16} className="shrink-0 text-[#0047FF]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0F172A]">Đã chốt đơn — đặt xe lấy đồ</p>
              {location && (
                <p className="text-[11px] text-[#64748B]">Lấy tại {location} → giao về nhà bạn</p>
              )}
            </div>
            <Link
              href="/dat-chuyen"
              className="shrink-0 rounded-lg bg-[#0047FF] px-2.5 py-1.5 text-[11px] font-bold text-white no-underline"
            >
              <span className="inline-flex items-center gap-1">
                <Truck size={12} />
                Đặt xe
              </span>
            </Link>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-3">
          {loadError && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-800">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadMessages()}
                className="mt-2 font-semibold text-[#0047FF] underline"
              >
                Thử lại
              </button>
            </div>
          )}
          {messages.length === 0 && !loadError && (
            <div className="py-12 text-center">
              <p className="text-sm text-[#64748B]">Bắt đầu trò chuyện về sản phẩm này</p>
            </div>
          )}
          {messages.map((m, i) => {
            const mine = isOwner ? m.from_buyer === false : m.from_buyer === true;
            const msgText = m.content ?? m.text ?? "";

            if (m.is_deal_confirm || m.is_deal_cancel) {
              return (
                <div key={messageKey(m, i)} className="flex justify-center py-2">
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl border px-3.5 py-2.5 text-center text-xs font-semibold leading-relaxed",
                      m.is_deal_confirm
                        ? "border-[#16A34A]/35 bg-[#16A34A]/10 text-[#0F172A]"
                        : "border-[#10B981]/35 bg-[#10B981]/10 text-[#0F172A]"
                    )}
                  >
                    {msgText}
                  </div>
                </div>
              );
            }

            return (
              <div key={messageKey(m, i)} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] px-3.5 py-2.5",
                    mine
                      ? "rounded-2xl rounded-br-md bg-[#0047FF] text-white"
                      : "rounded-2xl rounded-bl-md border border-[#E2E8F0] bg-white text-[#0F172A]"
                  )}
                >
                  <p className="text-sm leading-snug">{msgText}</p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      mine ? "text-white/70" : "text-[#64748B]"
                    )}
                  >
                    {formatMessageTime(m.created_at) || timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {!isOwner && (
          <div className="shrink-0 overflow-x-auto px-3 pb-1">
            <div className="flex gap-2">
              {QUICK_REPLIES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => sendMsg(chip)}
                  disabled={sending || !buyerId}
                  className="shrink-0 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:border-[#0047FF]/30 hover:bg-[#EEF2FF] disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-3 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMsg()}
              placeholder="Nhắn tin thương lượng..."
              disabled={!buyerId}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0047FF] focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => sendMsg()}
              disabled={!text.trim() || sending || !buyerId}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0047FF] text-white transition hover:bg-[#0039CC] disabled:opacity-50"
              aria-label="Gửi tin nhắn"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
