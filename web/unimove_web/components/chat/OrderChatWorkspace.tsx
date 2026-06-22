"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Send,
  Phone,
  MapPin,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  CheckCheck,
  RefreshCw,
  MessageCircle,
  FileText,
  Paperclip,
  Bell,
  Package,
  Star,
  AlertCircle,
  CheckCircle,
  Settings,
  HelpCircle,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { conversationsApi, notificationsApi, ordersApi, marketplaceApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { cn, formatVND, getOrderStatusLabel, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ChatConversation,
  type ChatMessage,
  type OrderChatContext,
  chatBlockReason,
  formatChatTime,
  groupMessagesByDate,
  orderAllowsChat,
  shortAddress,
  type ActiveChatThread,
  type InboxItem,
  type MarketplaceConversation,
  mergeInboxItems,
  upsertConversation,
  vehicleChatLabel,
} from "./order-chat-utils";

const NAVY = "#0A192F";
const NAVY_LIGHT = "#0F1E3D";
const ACTIVE_LIST_BG = "#FEF9C3";

interface NotificationRow {
  id: string;
  type: string;
  notification_type?: string;
  title: string;
  body: string;
  message?: string;
  read?: boolean;
  is_read?: boolean;
  created_at: string;
  listing_id?: string | null;
  icon?: string | null;
  action_data?: {
    order_id?: string;
    quote_id?: string;
    listing_id?: string;
    buyer_id?: string;
  } | null;
}

type NotifTarget =
  | { kind: "order_chat"; orderId: string }
  | { kind: "quote"; href: string }
  | { kind: "marketplace_thread"; listingId: string; buyerId: string }
  | { kind: "detail" };

function normalizeMarketplaceMessage(
  raw: Record<string, unknown>,
  userId: string,
  buyerId: string,
): ChatMessage {
  const fromBuyer = raw.from_buyer as boolean | undefined;
  const isBuyerUser = userId === buyerId;
  const isMine =
    fromBuyer !== undefined
      ? isBuyerUser
        ? fromBuyer === true
        : fromBuyer === false
      : String(raw.sender_id) === userId;
  return {
    id: String(raw.id),
    content: String(raw.content ?? raw.text ?? ""),
    is_mine: isMine,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    message_type: raw.is_deal_confirm
      ? "deal_confirm"
      : raw.is_deal_cancel
        ? "deal_cancel"
        : raw.is_offer
          ? "offer"
          : undefined,
  };
}

function notifTypeOf(n: NotificationRow) {
  return String(n.type ?? n.notification_type ?? "");
}

function notifVisual(n: NotificationRow) {
  const type = notifTypeOf(n);
  const icon = n.icon ?? "";

  if (type.includes("marketplace") || icon === "chat") {
    return { Icon: MessageCircle, bg: "#DCFCE7", color: "#16A34A" };
  }
  if (type.includes("quote") || icon === "tag") {
    return { Icon: FileText, bg: "#F5F3FF", color: "#7C3AED" };
  }
  if (type.includes("order") || icon === "truck") {
    return { Icon: Package, bg: "#EFF6FF", color: "#2563EB" };
  }
  const kind = mapNotifType(type);
  const meta = NOTIF_META[kind];
  return { Icon: meta.icon, bg: meta.bg, color: meta.color };
}

function resolveNotificationTarget(n: NotificationRow): NotifTarget {
  const type = notifTypeOf(n);
  const action = n.action_data ?? {};
  const orderId = action.order_id;
  const quoteId = action.quote_id;
  const listingId = action.listing_id ?? n.listing_id ?? undefined;

  if (type.includes("marketplace") && listingId && action.buyer_id) {
    return { kind: "marketplace_thread", listingId, buyerId: action.buyer_id };
  }
  if ((type.includes("quote") || quoteId) && orderId && quoteId) {
    return { kind: "quote", href: `/don-hang/${orderId}/bao-gia/${quoteId}` };
  }
  if (orderId) {
    return { kind: "order_chat", orderId };
  }
  return { kind: "detail" };
}

export interface OrderChatWorkspaceProps {
  initialOrderId?: string | null;
  initialWithName?: string | null;
  initialListingId?: string | null;
  initialBuyerId?: string | null;
  initialTab?: "messages" | "notifications";
  enableNotificationsTab?: boolean;
  orderDetailPath?: (orderId: string) => string;
  className?: string;
}

function mapNotifType(t: string): "order" | "promo" | "system" | "review" {
  if (t?.includes("order") || t?.includes("quote")) return "order";
  if (t?.includes("review")) return "review";
  if (t?.includes("promo")) return "promo";
  return "system";
}

const NOTIF_META = {
  order: { icon: Package, bg: "#EFF6FF", color: "#2563EB" },
  promo: { icon: Star, bg: "#FFFBEB", color: "#D97706" },
  system: { icon: AlertCircle, bg: "#F0FDF4", color: "#16A34A" },
  review: { icon: CheckCircle, bg: "#FFF1F2", color: "#E11D48" },
};

function inboxListIcon(item: InboxItem) {
  if (item.kind === "marketplace") {
    return { Icon: MessageCircle, bg: "#DCFCE7", color: "#16A34A" };
  }
  const preview = (item.last_message_preview ?? "").toLowerCase();
  if (preview.includes("đơn") || preview.includes("nhận") || preview.includes("giao")) {
    return { Icon: Truck, bg: "#EFF6FF", color: "#2563EB" };
  }
  if (preview.includes("báo giá") || preview.includes("hóa đơn")) {
    return { Icon: FileText, bg: "#F5F3FF", color: "#7C3AED" };
  }
  return { Icon: MessageCircle, bg: "#F3F4F6", color: "#6B7280" };
}

function partnerInitials(name: string) {
  return name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function OrderChatWorkspace({
  initialOrderId = null,
  initialWithName = null,
  initialListingId = null,
  initialBuyerId = null,
  initialTab = "messages",
  enableNotificationsTab = false,
  orderDetailPath = (id) => `/don-hang/${id}`,
  className,
}: OrderChatWorkspaceProps) {
  const router = useRouter();
  const role = getStoredUser()?.role ?? "customer";
  const userId = getStoredUser()?.id ?? "";
  const isProvider = role === "provider";

  const initialThread = useMemo((): ActiveChatThread | null => {
    if (initialOrderId) return { type: "order", orderId: initialOrderId };
    if (initialListingId && initialBuyerId) {
      return { type: "marketplace", listingId: initialListingId, buyerId: initialBuyerId };
    }
    return null;
  }, [initialOrderId, initialListingId, initialBuyerId]);

  const [sidebarTab, setSidebarTab] = useState<"messages" | "notifications">(
    initialTab === "notifications" && enableNotificationsTab ? "notifications" : "messages",
  );
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeThread, setActiveThread] = useState<ActiveChatThread | null>(initialThread);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [order, setOrder] = useState<OrderChatContext | null>(null);
  const [mpListing, setMpListing] = useState<MarketplaceConversation["listing"]>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const deepLinkedRef = useRef(false);

  const activeOrderId = activeThread?.type === "order" ? activeThread.orderId : null;
  const activeMarketplace =
    activeThread?.type === "marketplace" ? activeThread : null;
  const hasActiveChat = !!activeThread;

  const loadInbox = useCallback(async () => {
    setLoadingList(true);
    try {
      const [orderRes, mpRes] = await Promise.all([
        conversationsApi.list(),
        marketplaceApi.listConversations(),
      ]);
      let orders: ChatConversation[] =
        orderRes.success && Array.isArray(orderRes.data)
          ? (orderRes.data as ChatConversation[])
          : [];
      if (initialOrderId && initialWithName) {
        orders = upsertConversation(orders, initialOrderId, initialWithName);
      }
      const marketplace: MarketplaceConversation[] =
        mpRes.success && Array.isArray(mpRes.data)
          ? (mpRes.data as MarketplaceConversation[])
          : [];
      setInboxItems(mergeInboxItems(orders, marketplace));
    } catch {
      setInboxItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [initialOrderId, initialWithName]);

  const loadNotifs = useCallback(async () => {
    if (!enableNotificationsTab) return;
    setNotifLoading(true);
    try {
      const res = await notificationsApi.list({ pageSize: 50 });
      if (res.success && res.data) {
        const d = res.data as { notifications?: NotificationRow[] } | NotificationRow[];
        setNotifs(Array.isArray(d) ? d : (d?.notifications ?? []));
      }
    } catch {
      setNotifs([]);
    } finally {
      setNotifLoading(false);
    }
  }, [enableNotificationsTab]);

  const loadOrder = useCallback(async (orderId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingOrder(true);
    try {
      const res = await ordersApi.get(orderId);
      if (res.success && res.data) setOrder(res.data as OrderChatContext);
      else if (!opts?.silent) setOrder(null);
    } catch {
      if (!opts?.silent) setOrder(null);
    } finally {
      if (!opts?.silent) setLoadingOrder(false);
    }
  }, []);

  const loadMarketplaceMessages = useCallback(
    async (listingId: string, buyerId: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoadingMessages(true);
      try {
        const res = await marketplaceApi.getMessages(listingId, buyerId);
        if (res.success && res.data) {
          const d = res.data as { messages?: Record<string, unknown>[] };
          const raw = d.messages ?? [];
          setMessages(raw.map((m) => normalizeMarketplaceMessage(m, userId, buyerId)));
          setInboxItems((prev) =>
            prev.map((item) =>
              item.kind === "marketplace" &&
              item.listing_id === listingId &&
              item.buyer_id === buyerId
                ? { ...item, unread_count: 0 }
                : item,
            ),
          );
        }
      } catch {
        if (!opts?.silent) setMessages([]);
      } finally {
        if (!opts?.silent) setLoadingMessages(false);
      }
    },
    [userId],
  );

  const loadMessages = useCallback(async (orderId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingMessages(true);
    try {
      const res = await conversationsApi.getMessages(orderId);
      const d = res.data as { messages?: ChatMessage[] };
      setMessages(d?.messages ?? []);
      setInboxItems((prev) =>
        prev.map((item) =>
          item.kind === "order" && item.order_id === orderId
            ? { ...item, unread_count: 0 }
            : item,
        ),
      );
    } catch {
      if (!opts?.silent) setMessages([]);
    } finally {
      if (!opts?.silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
    loadNotifs();
  }, [loadInbox, loadNotifs]);

  useEffect(() => {
    if (initialThread) setActiveThread(initialThread);
  }, [initialThread]);

  useEffect(() => {
    if (deepLinkedRef.current || loadingList) return;
    if (initialOrderId) {
      deepLinkedRef.current = true;
      setSidebarTab("messages");
      setActiveThread({ type: "order", orderId: initialOrderId });
      return;
    }
    if (initialListingId && initialBuyerId) {
      deepLinkedRef.current = true;
      setSidebarTab("messages");
      setActiveThread({
        type: "marketplace",
        listingId: initialListingId,
        buyerId: initialBuyerId,
      });
    }
  }, [initialOrderId, initialListingId, initialBuyerId, loadingList]);

  useEffect(() => {
    if (!activeThread) return;
    if (activeThread.type === "order") {
      loadOrder(activeThread.orderId);
      loadMessages(activeThread.orderId);
      const t = setInterval(() => {
        loadMessages(activeThread.orderId, { silent: true });
        loadOrder(activeThread.orderId, { silent: true });
      }, 8000);
      return () => clearInterval(t);
    }
    loadMarketplaceMessages(activeThread.listingId, activeThread.buyerId);
    marketplaceApi.get(activeThread.listingId).then((r) => {
      if (r.success && r.data) {
        const l = r.data as {
          id: string;
          title?: string;
          price?: number;
          images?: string[];
          status?: string;
          deal_confirmed?: boolean;
        };
        setMpListing({
          id: l.id,
          title: l.title,
          price: l.price,
          images: l.images,
          status: l.status,
          deal_confirmed: l.deal_confirmed,
        });
      }
    });
    setOrder(null);
    const t = setInterval(() => {
      loadMarketplaceMessages(activeThread.listingId, activeThread.buyerId, { silent: true });
    }, 8000);
    return () => clearInterval(t);
  }, [activeThread, loadOrder, loadMessages, loadMarketplaceMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const activeInboxItem = inboxItems.find((item) => {
    if (!activeThread) return false;
    if (activeThread.type === "order" && item.kind === "order") {
      return item.order_id === activeThread.orderId;
    }
    if (activeThread.type === "marketplace" && item.kind === "marketplace") {
      return (
        item.listing_id === activeThread.listingId && item.buyer_id === activeThread.buyerId
      );
    }
    return false;
  });

  const partnerName = useMemo(() => {
    if (activeMarketplace) {
      return activeInboxItem?.counterpart?.full_name ?? initialWithName ?? "Người bán";
    }
    if (isProvider) {
      return (
        order?.customer?.full_name ??
        order?.pickup_contact_name ??
        (activeInboxItem?.kind === "order" ? activeInboxItem.counterpart?.full_name : undefined) ??
        initialWithName ??
        "Khách hàng"
      );
    }
    return (
      order?.provider?.full_name ??
      order?.provider_name ??
      (activeInboxItem?.kind === "order" ? activeInboxItem.counterpart?.full_name : undefined) ??
      initialWithName ??
      "Nhà xe"
    );
  }, [isProvider, order, activeInboxItem, initialWithName, activeMarketplace]);

  const partnerPhone = useMemo(() => {
    if (activeInboxItem?.counterpart?.phone) return activeInboxItem.counterpart.phone;
    if (isProvider) {
      return order?.customer?.phone ?? order?.pickup_contact_phone;
    }
    return order?.provider?.phone ?? order?.provider_phone;
  }, [isProvider, order, activeInboxItem]);

  const canSendOrder = orderAllowsChat(order);
  const canSendMarketplace = !!activeMarketplace && mpListing?.status !== "closed";
  const canSend = activeMarketplace ? canSendMarketplace : canSendOrder;
  const blockReason = activeMarketplace
    ? mpListing?.status === "closed"
      ? "Tin đã đóng — không thể gửi tin nhắn mới."
      : null
    : chatBlockReason(order);
  const dropoff = order?.dropoff_address ?? order?.delivery_address ?? "";
  const totalPrice = order?.final_price ?? order?.total_price ?? order?.estimated_price ?? 0;
  const messageGroups = groupMessagesByDate(messages);
  const vehicleType = order?.provider?.vehicle_type ?? order?.vehicle_size;
  const vehiclePlate = order?.provider_plate ?? null;

  const mapHref = useMemo(() => {
    if (!order?.pickup_address) return "#";
    const q = encodeURIComponent(`${order.pickup_address} to ${dropoff}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  }, [order?.pickup_address, dropoff]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !activeThread) return;

    if (activeThread.type === "marketplace") {
      if (!canSendMarketplace) return;
      setSending(true);
      try {
        await marketplaceApi.sendMessage(activeThread.listingId, activeThread.buyerId, body);
        setText("");
        await loadMarketplaceMessages(activeThread.listingId, activeThread.buyerId);
        await loadInbox();
      } finally {
        setSending(false);
      }
      return;
    }

    if (!canSendOrder || !activeOrderId) return;
    setSending(true);
    try {
      await conversationsApi.sendMessage(activeOrderId, body);
      setText("");
      await loadMessages(activeOrderId);
      await loadInbox();
    } finally {
      setSending(false);
    }
  };

  const selectInboxItem = (item: InboxItem) => {
    setSidebarTab("messages");
    setSelectedNotifId(null);
    if (item.kind === "order") {
      setActiveThread({ type: "order", orderId: item.order_id });
    } else {
      setActiveThread({
        type: "marketplace",
        listingId: item.listing_id,
        buyerId: item.buyer_id,
      });
    }
  };

  const handleNotificationClick = async (n: NotificationRow) => {
    setSelectedNotifId(n.id);
    const unread = !(n.read ?? n.is_read);
    if (unread) {
      await notificationsApi.markRead(n.id);
      setNotifs((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true, read: true } : x)),
      );
    }

    const target = resolveNotificationTarget(n);
    if (target.kind === "quote") {
      router.push(target.href);
      return;
    }
    if (target.kind === "marketplace_thread") {
      setSidebarTab("messages");
      setActiveThread({
        type: "marketplace",
        listingId: target.listingId,
        buyerId: target.buyerId,
      });
      return;
    }
    if (target.kind === "order_chat") {
      setSidebarTab("messages");
      setActiveThread({ type: "order", orderId: target.orderId });
      return;
    }
    setActiveThread(null);
  };

  const selectedNotif = notifs.find((n) => n.id === selectedNotifId) ?? null;

  const handleRefresh = () => {
    if (sidebarTab === "messages") loadInbox();
    else loadNotifs();
  };

  const hideLeftOnMobile =
    (sidebarTab === "messages" && hasActiveChat) ||
    (sidebarTab === "notifications" && (hasActiveChat || !!selectedNotifId));
  const hasCenterContent = hasActiveChat || (sidebarTab === "notifications" && !!selectedNotif);

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl border border-gray-200 bg-[#F4F6FA] shadow-sm",
        className ?? "h-[calc(100vh-72px-2rem)] min-h-[560px]",
      )}
    >
      {/* ── Cột trái ── */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-gray-200 bg-white lg:w-[280px]",
          hideLeftOnMobile ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tin nhắn</h2>
            <p className="mt-0.5 text-xs text-gray-400">Chat & thông báo đơn hàng</p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9, rotate: 180 }}
            transition={{ duration: 0.35 }}
            onClick={handleRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-50"
          >
            <RefreshCw size={15} />
          </motion.button>
        </div>

        {enableNotificationsTab && (
          <div className="relative mx-3 mb-2 mt-1 flex shrink-0 gap-1 rounded-xl bg-gray-100 p-1">
            {(["messages", "notifications"] as const).map((key) => {
              const label = key === "messages" ? "Tin nhắn" : "Thông báo";
              const active = sidebarTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSidebarTab(key);
                    if (key === "messages") setSelectedNotifId(null);
                  }}
                  className={cn(
                    "relative z-10 flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                    active ? "text-gray-900" : "text-gray-400 hover:text-gray-600",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="chat-sidebar-tab"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {sidebarTab === "messages" ? (
              <motion.div
                key="msg-list"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {loadingList ? (
                  <div className="space-y-2 p-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-[72px] rounded-xl" />
                    ))}
                  </div>
                ) : inboxItems.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                      <MessageSquare size={28} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">Chưa có tin nhắn</p>
                    <Link
                      href="/cho-sinh-vien"
                      className="mt-2 text-xs font-semibold text-[#2563EB] no-underline"
                    >
                      Khám phá Chợ sinh viên
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-0.5 p-2">
                    {inboxItems.map((item, idx) => {
                      const active =
                        !!activeThread &&
                        ((item.kind === "order" &&
                          activeThread.type === "order" &&
                          activeThread.orderId === item.order_id) ||
                          (item.kind === "marketplace" &&
                            activeThread.type === "marketplace" &&
                            activeThread.listingId === item.listing_id &&
                            activeThread.buyerId === item.buyer_id));
                      const name =
                        item.counterpart?.full_name ??
                        (item.kind === "marketplace" ? "Chợ SV" : isProvider ? "Khách hàng" : "Nhà xe");
                      const preview =
                        item.kind === "marketplace" && item.listing?.title
                          ? `${item.listing.title} · ${item.last_message_preview ?? ""}`
                          : item.last_message_preview || "Bắt đầu trò chuyện";
                      const { Icon, bg, color } = inboxListIcon(item);
                      const rowKey =
                        item.kind === "order"
                          ? `order-${item.order_id}`
                          : `mp-${item.listing_id}-${item.buyer_id}`;
                      return (
                        <motion.button
                          key={rowKey}
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.22 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => selectInboxItem(item)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                            active
                              ? "border-amber-200 shadow-sm"
                              : "border-transparent hover:border-gray-100 hover:bg-gray-50/80",
                          )}
                          style={active ? { backgroundColor: ACTIVE_LIST_BG } : undefined}
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: bg, color }}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate text-sm",
                                  item.unread_count > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800",
                                )}
                              >
                                {name}
                              </span>
                              <span className="shrink-0 text-[10px] text-gray-400">
                                {item.last_message_at ? timeAgo(item.last_message_at) : ""}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "mt-0.5 truncate text-xs",
                                item.unread_count > 0 ? "font-medium text-gray-700" : "text-gray-500",
                              )}
                            >
                              {preview}
                            </p>
                          </div>
                          {item.unread_count > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold text-white">
                              {item.unread_count > 9 ? "9+" : item.unread_count}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="notif-list"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {notifLoading ? (
                  <div className="space-y-2 p-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                      <Bell size={28} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">Chưa có thông báo</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {notifs.map((n, idx) => {
                      const { Icon, bg, color } = notifVisual(n);
                      const unread = !(n.read ?? n.is_read);
                      const active = selectedNotifId === n.id;
                      return (
                        <motion.button
                          key={n.id}
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                            active
                              ? "border-amber-200 shadow-sm"
                              : "border-transparent hover:border-gray-100 hover:bg-gray-50/80",
                          )}
                          style={active ? { backgroundColor: ACTIVE_LIST_BG } : undefined}
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: bg, color }}
                          >
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "line-clamp-2 text-sm leading-snug",
                                unread ? "font-bold text-gray-900" : "font-semibold text-gray-700",
                              )}
                            >
                              {n.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {n.body || n.message}
                            </p>
                            <p className="mt-1.5 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                          </div>
                          {unread && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {enableNotificationsTab && (
          <div className="flex shrink-0 items-center justify-around border-t border-gray-100 px-4 py-3">
            <Link
              href="/tai-khoan"
              className="flex items-center gap-2 text-xs font-medium text-gray-500 no-underline transition-colors hover:text-gray-800"
            >
              <Settings size={14} /> Cài đặt
            </Link>
            <Link
              href="/tai-khoan"
              className="flex items-center gap-2 text-xs font-medium text-gray-500 no-underline transition-colors hover:text-gray-800"
            >
              <HelpCircle size={14} /> Trợ giúp
            </Link>
          </div>
        )}
      </aside>

      {/* ── Cột giữa: chat ── */}
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col bg-[#FAFBFC]",
          hasCenterContent ? "flex" : "hidden lg:flex",
        )}
      >
        <AnimatePresence mode="wait">
          {!hasActiveChat && sidebarTab === "notifications" && selectedNotif ? (
            <NotificationDetailPanel
              key={selectedNotif.id}
              notification={selectedNotif}
              onBack={() => setSelectedNotifId(null)}
              onAction={() => {
                const target = resolveNotificationTarget(selectedNotif);
                if (target.kind === "quote") {
                  router.push(target.href);
                } else if (target.kind === "marketplace_thread") {
                  setSidebarTab("messages");
                  setActiveThread({
                    type: "marketplace",
                    listingId: target.listingId,
                    buyerId: target.buyerId,
                  });
                } else if (target.kind === "order_chat") {
                  setSidebarTab("messages");
                  setActiveThread({ type: "order", orderId: target.orderId });
                }
              }}
            />
          ) : !hasActiveChat ? (
            <motion.div
              key="no-chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center px-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }}
              >
                <MessageSquare size={32} className="text-[#2563EB]" />
              </motion.div>
              <p className="font-bold text-gray-800">
                {sidebarTab === "notifications" ? "Chọn một thông báo" : "Chọn cuộc trò chuyện"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-gray-400">
                {sidebarTab === "notifications"
                  ? "Nhấn vào thông báo bên trái để xem chi tiết hoặc mở đơn hàng liên quan"
                  : "Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu chat"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={
                activeThread?.type === "order"
                  ? `order-${activeThread.orderId}`
                  : activeThread?.type === "marketplace"
                    ? `mp-${activeThread.listingId}-${activeThread.buyerId}`
                    : "chat"
              }
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 lg:hidden"
                  onClick={() => {
                    setActiveThread(null);
                    if (sidebarTab === "messages") setSelectedNotifId(null);
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, #2563EB, ${NAVY_LIGHT})` }}
                >
                  {partnerInitials(partnerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900">{partnerName}</p>
                  {activeMarketplace ? (
                    <p className="truncate text-xs text-gray-400">
                      Chợ SV · {mpListing?.title ?? "Tin đăng"}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Đơn #{activeOrderId?.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                </div>
                {partnerPhone && (
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href={`tel:${partnerPhone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <Phone size={16} />
                  </motion.a>
                )}
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 sm:flex"
                >
                  <MoreVertical size={16} />
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
                {loadingMessages ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-2/3 rounded-2xl" />
                    <Skeleton className="h-12 w-1/2 rounded-2xl ml-auto" />
                  </div>
                ) : messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex h-full flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                      <MessageCircle size={28} className="text-gray-400" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">Chưa có tin nhắn</p>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">
                      Hãy bắt đầu cuộc trò chuyện với {partnerName} để
                      {activeMarketplace ? " thương lượng và chốt đơn." : " sắp xếp thời gian vận chuyển tốt nhất."}
                    </p>
                  </motion.div>
                ) : (
                  messageGroups.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <div className="flex justify-center">
                        <span className="rounded-full border border-gray-100 bg-white px-3 py-1 text-[10px] font-bold tracking-wide text-gray-400">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((m, i) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                        >
                          <MessageBubble message={m} partnerName={partnerName} />
                        </motion.div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {!canSend && blockReason && (
                <div className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-800">
                  {blockReason}
                </div>
              )}

              {canSend && (
                <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-200">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder="Nhập tin nhắn... (Enter để gửi)"
                      rows={2}
                      className="w-full resize-none bg-transparent px-4 pt-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                    <div className="flex items-center justify-between px-3 pb-2.5">
                      <div className="flex items-center gap-1">
                        {[
                          { Icon: Paperclip, label: "Đính kèm" },
                          { Icon: Smile, label: "Emoji" },
                          { Icon: ImageIcon, label: "Ảnh" },
                        ].map(({ Icon, label }) => (
                          <button
                            key={label}
                            type="button"
                            aria-label={label}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                          >
                            <Icon size={17} />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="hidden text-[10px] text-gray-400 sm:inline">
                          Shift+Enter để xuống dòng
                        </span>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            type="button"
                            onClick={send}
                            disabled={sending || !text.trim()}
                            className="h-9 gap-1.5 rounded-xl px-4 text-sm font-bold text-white shadow-sm"
                            style={{ backgroundColor: NAVY }}
                          >
                            <Send size={15} /> Gửi
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Cột phải: chi tiết đơn ── */}
      <aside
        className={cn(
          "hidden w-[300px] shrink-0 flex-col border-l border-gray-200 bg-white xl:flex",
          !hasActiveChat && "xl:hidden",
        )}
      >
        <AnimatePresence mode="wait">
          {hasActiveChat && activeMarketplace && (
            <motion.div
              key={`mp-${activeMarketplace.listingId}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="flex h-full flex-col overflow-y-auto p-4"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Chi tiết tin đăng
              </h3>
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-bold text-gray-900">{mpListing?.title ?? "Tin đăng"}</p>
                <p className="mt-2 text-base font-extrabold text-[#2563EB]">
                  {!mpListing?.price || mpListing.price === 0
                    ? "Miễn phí"
                    : formatVND(mpListing.price)}
                </p>
                {mpListing?.deal_confirmed && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">Đã chốt đơn</p>
                )}
              </div>
              <Link
                href={`/cho-sinh-vien/${activeMarketplace.listingId}`}
                className="mt-4 block rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 no-underline transition-colors hover:bg-gray-50"
              >
                Xem tin đăng
              </Link>
            </motion.div>
          )}
          {hasActiveChat && activeOrderId && !activeMarketplace && (
            <motion.div
              key={activeOrderId}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="flex h-full flex-col overflow-y-auto"
            >
              <div className="border-b border-gray-100 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Chi tiết đơn hàng
                </h3>
              </div>

              {loadingOrder ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              ) : order ? (
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Trạng thái
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                      <span className="text-sm font-bold text-gray-900">
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative pl-4">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#2563EB]" />
                      <span className="absolute bottom-0 left-[3px] top-4 w-0.5 bg-gray-200" />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Điểm đi
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">
                        {shortAddress(order.pickup_address, 80)}
                      </p>
                    </div>
                    <div className="relative pl-4">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Điểm đến
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">
                        {shortAddress(dropoff, 80) || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-violet-50/80 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                      Thông tin xe
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <Truck size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {vehicleChatLabel(vehicleType)}
                        </p>
                        {vehiclePlate && (
                          <p className="text-xs font-medium text-gray-500">{vehiclePlate}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {totalPrice > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <p className="text-[10px] text-gray-400">Phí vận chuyển</p>
                      <p className="text-base font-extrabold text-[#2563EB]">{formatVND(totalPrice)}</p>
                    </div>
                  )}

                  <div className="relative h-36 overflow-hidden rounded-xl bg-[#E8EDF5]">
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, #c8d6e8 25%, transparent 25%), linear-gradient(225deg, #c8d6e8 25%, transparent 25%), linear-gradient(45deg, #c8d6e8 25%, transparent 25%), linear-gradient(315deg, #c8d6e8 25%, #dde5ef 25%)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 10px 0, 10px -10px, 0 10px",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin size={28} className="text-[#2563EB]/60" />
                    </div>
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-md no-underline transition-transform hover:scale-105"
                    >
                      Xem bản đồ trực tuyến
                    </a>
                  </div>

                  <Link
                    href={orderDetailPath(activeOrderId)}
                    className="mt-auto block rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 no-underline transition-colors hover:bg-gray-50"
                  >
                    Xem chi tiết đơn
                  </Link>
                </div>
              ) : (
                <p className="p-4 text-sm text-gray-400">Không tải được thông tin đơn.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}

function NotificationDetailPanel({
  notification,
  onBack,
  onAction,
}: {
  notification: NotificationRow;
  onBack?: () => void;
  onAction: () => void;
}) {
  const { Icon, bg, color } = notifVisual(notification);
  const target = resolveNotificationTarget(notification);
  const actionLabel =
    target.kind === "order_chat"
      ? "Mở chat đơn hàng"
      : target.kind === "quote"
        ? "Xem báo giá"
        : target.kind === "marketplace_thread"
          ? "Mở tin nhắn Chợ SV"
          : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 flex-col"
    >
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3.5 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-sm font-bold text-gray-900">Chi tiết thông báo</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: bg, color }}
        >
          <Icon size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{notification.title}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500">
          {notification.body || notification.message}
        </p>
        <p className="mt-4 text-xs text-gray-400">{timeAgo(notification.created_at)}</p>
        {actionLabel && (
          <Button
            type="button"
            onClick={onAction}
            className="mt-6 rounded-xl px-6 text-white"
            style={{ backgroundColor: NAVY }}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </motion.div>
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
      <div className="mx-auto flex max-w-md gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <MapPin size={18} className="mt-0.5 shrink-0 text-[#2563EB]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{m.location_name || m.content}</p>
          {m.location_name && m.content !== m.location_name && (
            <p className="mt-1 text-xs text-gray-600">{m.content}</p>
          )}
        </div>
      </div>
    );
  }

  const mine = m.is_mine ?? false;

  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
          <Truck size={14} className="text-gray-500" />
        </div>
      )}
      <div className={cn("max-w-[75%]", mine && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            mine
              ? "rounded-br-md text-white"
              : "rounded-bl-md border border-gray-100 bg-white text-gray-800",
          )}
          style={mine ? { backgroundColor: NAVY_LIGHT } : undefined}
        >
          {m.content}
        </div>
        <div className={cn("mt-1 flex items-center gap-1.5 px-1", mine && "flex-row-reverse")}>
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
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, #2563EB, ${NAVY_LIGHT})` }}
        >
          {(getStoredUser()?.full_name ?? "B")[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}
