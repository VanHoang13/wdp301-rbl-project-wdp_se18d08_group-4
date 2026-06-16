"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Send,
  Phone,
  MapPin,
  Info,
  MoreVertical,
  Plus,
  Image as ImageIcon,
  Smile,
  CheckCheck,
  Navigation,
} from "lucide-react";
import { conversationsApi, ordersApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatVND, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ChatConversation,
  type ChatMessage,
  type OrderChatContext,
  QUICK_REPLIES,
  chatBlockReason,
  formatChatTime,
  formatRelativeTime,
  groupMessagesByDate,
  orderAllowsChat,
  orderStatusChatLabel,
  shortAddress,
} from "./order-chat-utils";

const BLUE = "#2563EB";
const NAVY = "#0F1E3D";

interface OrderChatWorkspaceProps {
  initialOrderId?: string | null;
  orderDetailPath?: (orderId: string) => string;
}

export function OrderChatWorkspace({
  initialOrderId = null,
  orderDetailPath = (id) => `/don-hang/${id}`,
}: OrderChatWorkspaceProps) {
  const role = getStoredUser()?.role ?? "customer";
  const isProvider = role === "provider";

  const [convs, setConvs] = useState<ChatConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(initialOrderId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [order, setOrder] = useState<OrderChatContext | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await conversationsApi.list();
      if (res.success && Array.isArray(res.data)) {
        setConvs(res.data as ChatConversation[]);
      }
    } catch {
      setConvs([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadOrder = useCallback(async (orderId: string) => {
    const res = await ordersApi.get(orderId);
    if (res.success && res.data) setOrder(res.data as OrderChatContext);
    else setOrder(null);
  }, []);

  const loadMessages = useCallback(async (orderId: string) => {
    setLoadingMessages(true);
    try {
      const res = await conversationsApi.getMessages(orderId);
      const d = res.data as { messages?: ChatMessage[] };
      setMessages(d?.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    if (initialOrderId) setActiveOrderId(initialOrderId);
  }, [initialOrderId]);

  useEffect(() => {
    if (!activeOrderId) return;
    loadOrder(activeOrderId);
    loadMessages(activeOrderId);
    const t = setInterval(() => loadMessages(activeOrderId), 8000);
    return () => clearInterval(t);
  }, [activeOrderId, loadOrder, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const activeConv = convs.find((c) => c.order_id === activeOrderId);

  const partnerName = useMemo(() => {
    if (isProvider) {
      return (
        order?.customer?.full_name ??
        order?.pickup_contact_name ??
        activeConv?.counterpart?.full_name ??
        "Khách hàng"
      );
    }
    return (
      order?.provider?.full_name ??
      order?.provider_name ??
      activeConv?.counterpart?.full_name ??
      "Nhà xe"
    );
  }, [isProvider, order, activeConv]);

  const partnerPhone = useMemo(() => {
    if (isProvider) {
      return order?.customer?.phone ?? order?.pickup_contact_phone ?? activeConv?.counterpart?.phone;
    }
    return order?.provider?.phone ?? order?.provider_phone ?? activeConv?.counterpart?.phone;
  }, [isProvider, order, activeConv]);

  const canSend = orderAllowsChat(order);
  const blockReason = chatBlockReason(order);
  const dropoff = order?.dropoff_address ?? order?.delivery_address ?? "";
  const totalPrice = order?.final_price ?? order?.total_price ?? order?.estimated_price ?? 0;
  const messageGroups = groupMessagesByDate(messages);

  const send = async (content?: string) => {
    if (!activeOrderId || !canSend) return;
    const body = (content ?? text).trim();
    if (!body) return;
    setSending(true);
    try {
      await conversationsApi.sendMessage(activeOrderId, body);
      setText("");
      await loadMessages(activeOrderId);
      await loadConvs();
    } finally {
      setSending(false);
    }
  };

  const selectConv = (orderId: string) => setActiveOrderId(orderId);

  return (
    <div className="flex h-[calc(100vh-72px)] min-h-[560px] bg-[#F4F6FA] rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* ── Cột trái: danh sách ── */}
      <aside
        className={cn(
          "w-full lg:w-[300px] shrink-0 border-r border-gray-200 bg-white flex flex-col",
          activeOrderId ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tin nhắn gần đây</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Chưa có hội thoại. Mở chat từ đơn hàng đang chạy.
            </div>
          ) : (
            convs.map((conv) => {
              const active = conv.order_id === activeOrderId;
              const name = conv.counterpart?.full_name ?? (isProvider ? "Khách hàng" : "Nhà xe");
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConv(conv.order_id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-gray-50 transition-colors",
                    active ? "bg-blue-50/80" : "hover:bg-gray-50",
                  )}
                >
                  <div className="relative shrink-0">
                    {conv.counterpart?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conv.counterpart.avatar_url}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#2563EB] flex items-center justify-center text-white">
                        {isProvider ? (
                          <span className="font-bold text-sm">{name[0]?.toUpperCase() ?? "K"}</span>
                        ) : (
                          <Truck size={20} />
                        )}
                      </div>
                    )}
                    {active && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-gray-900 truncate">{name}</span>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.last_message_preview || "Bắt đầu trò chuyện"}
                    </p>
                    <p className="text-[10px] text-[#2563EB] font-medium mt-1">
                      #{conv.order_id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Cột giữa: chat ── */}
      <section
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-[#FAFBFC]",
          !activeOrderId ? "hidden lg:flex" : "flex",
        )}
      >
        {!activeOrderId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6 text-center">
            Chọn cuộc trò chuyện bên trái hoặc mở từ chi tiết đơn hàng
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
              <button
                type="button"
                className="lg:hidden text-sm text-[#2563EB] font-semibold"
                onClick={() => setActiveOrderId(null)}
              >
                ← Danh sách
              </button>
              <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0">
                {isProvider ? (
                  <span className="font-bold">{partnerName[0]?.toUpperCase() ?? "K"}</span>
                ) : (
                  <Truck size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 truncate">{partnerName}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#2563EB] uppercase">
                    Đối tác
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  #{activeOrderId.slice(0, 8).toUpperCase()} · {orderStatusChatLabel(order?.status ?? "accepted")}
                </p>
              </div>
              <Link
                href={orderDetailPath(activeOrderId)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 no-underline"
              >
                <Info size={14} /> Chi tiết đơn
              </Link>
              {partnerPhone && (
                <a
                  href={`tel:${partnerPhone}`}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-[#2563EB] hover:bg-blue-50"
                >
                  <Phone size={16} />
                </a>
              )}
              <button type="button" className="w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-50 hidden sm:flex items-center justify-center">
                <MoreVertical size={16} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <p className="text-center text-[11px] text-gray-400 leading-relaxed px-4">
                Tin nhắn được mã hóa. Không chia sẻ thông tin cá nhân qua chat.
              </p>

              {loadingMessages ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-2/3 rounded-2xl" />
                  <Skeleton className="h-12 w-1/2 rounded-2xl ml-auto" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Chưa có tin nhắn.</p>
                  <p className="text-xs text-gray-400 mt-1">Gửi lời chào cho {partnerName}.</p>
                </div>
              ) : (
                messageGroups.map((group) => (
                  <div key={group.label} className="space-y-4">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wide px-3 py-1 rounded-full bg-white border border-gray-100">
                        {group.label}
                      </span>
                    </div>
                    {group.items.map((m) => (
                      <MessageBubble key={m.id} message={m} partnerName={partnerName} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {!canSend && blockReason && (
              <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 text-xs text-amber-800 text-center">
                {blockReason}
              </div>
            )}

            {canSend && (
              <div className="px-3 py-2 border-t border-gray-100 bg-white">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={sending}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#2563EB] hover:text-[#2563EB]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <button type="button" className="w-9 h-9 shrink-0 rounded-lg text-gray-400 hover:bg-gray-50 flex items-center justify-center">
                    <Plus size={18} />
                  </button>
                  <button type="button" className="w-9 h-9 shrink-0 rounded-lg text-gray-400 hover:bg-gray-50 flex items-center justify-center hidden sm:flex">
                    <ImageIcon size={18} />
                  </button>
                  <div className="flex-1 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 bg-transparent text-sm outline-none min-w-0"
                    />
                    <button type="button" className="text-gray-400 hover:text-gray-600 hidden sm:block">
                      <Smile size={18} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => send()}
                    disabled={sending || !text.trim()}
                    className="shrink-0 flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send size={16} /> Gửi
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Nhấn Enter để gửi tin nhắn. UniMove đảm bảo mọi cuộc hội thoại đều được bảo mật.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Cột phải: thông tin chuyến ── */}
      <aside
        className={cn(
          "hidden xl:flex w-[300px] shrink-0 border-l border-gray-200 bg-white flex-col",
          !activeOrderId && "xl:hidden",
        )}
      >
        {activeOrderId && order && (
          <>
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Thông tin chuyến đi
              </h3>
              <div className="relative h-28 rounded-xl bg-[#1a2332] overflow-hidden mb-4">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_40%_50%,#2563EB_0%,transparent_55%)]" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-full text-[10px] font-semibold text-gray-700">
                  <Navigation size={12} className="text-[#2563EB]" /> Xe đang tới
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shadow-lg">
                    <Truck size={14} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Điểm bốc hàng</p>
                  <p className="text-xs font-semibold text-gray-900 leading-snug">
                    {shortAddress(order.pickup_address)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Điểm giao hàng</p>
                  <p className="text-xs font-semibold text-gray-900 leading-snug">
                    {shortAddress(dropoff)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Loại xe</p>
                    <p className="text-xs font-bold text-gray-800">
                      {order.provider?.vehicle_type ?? order.vehicle_size ?? "Tiêu chuẩn"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Phí vận chuyển</p>
                    <p className="text-sm font-extrabold text-[#2563EB]">
                      {totalPrice > 0 ? formatVND(totalPrice) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 mt-auto">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                <p className="text-xs text-gray-600 mb-3">Cần hỗ trợ gấp về đơn hàng này?</p>
                {partnerPhone ? (
                  <a
                    href={`tel:${partnerPhone}`}
                    className="block w-full py-2.5 rounded-xl border-2 border-[#2563EB] text-[#2563EB] text-sm font-bold hover:bg-white transition-colors no-underline"
                  >
                    Gọi {isProvider ? "khách hàng" : "nhà xe"}
                  </a>
                ) : (
                  <a
                    href="tel:19001234"
                    className="block w-full py-2.5 rounded-xl border-2 border-[#2563EB] text-[#2563EB] text-sm font-bold hover:bg-white transition-colors no-underline"
                  >
                    Gọi Tổng Đài
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function MessageBubble({
  message: m,
  partnerName,
}: {
  message: ChatMessage;
  partnerName: string;
}) {
  const isSystem =
    m.message_type === "system" ||
    m.message_type === "orderUpdate" ||
    m.message_type === "location";

  if (isSystem || m.message_type === "location") {
    return (
      <div className="max-w-md mx-auto rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex gap-3">
        <MapPin size={18} className="text-[#2563EB] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {m.location_name || m.content}
          </p>
          {m.location_name && m.content !== m.location_name && (
            <p className="text-xs text-gray-600 mt-1">{m.content}</p>
          )}
          <button type="button" className="text-xs font-bold text-[#2563EB] mt-2">
            Xem bản đồ
          </button>
        </div>
      </div>
    );
  }

  const mine = m.is_mine ?? false;

  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
          <Truck size={14} className="text-gray-500" />
        </div>
      )}
      <div className={cn("max-w-[75%]", mine && "items-end flex flex-col")}>
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
            mine
              ? "bg-[#0F1E3D] text-white rounded-br-md"
              : "bg-white border border-gray-100 text-gray-800 rounded-bl-md",
          )}
        >
          {m.content}
        </div>
        <div className={cn("flex items-center gap-1.5 mt-1 px-1", mine && "flex-row-reverse")}>
          <span className="text-[10px] text-gray-400">
            {formatChatTime(m.created_at)}
            {!mine && ` · ${m.sender?.full_name ?? partnerName}`}
          </span>
          {mine && (
            <CheckCheck size={12} className={m.is_read ? "text-[#2563EB]" : "text-gray-300"} />
          )}
        </div>
      </div>
      {mine && (
        <div
          className="w-8 h-8 rounded-full shrink-0 mt-1 flex items-center justify-center text-white text-xs font-bold"
          style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}
        >
          {(getStoredUser()?.full_name ?? "B")[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}
