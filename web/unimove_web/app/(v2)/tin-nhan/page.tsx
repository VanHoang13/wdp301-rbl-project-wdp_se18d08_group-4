'use client'

import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare, Send, ArrowLeft, Package, Truck,
  RefreshCw, ChevronRight, User, ShoppingBag,
} from 'lucide-react'
import { conversationsApi, marketplaceApi } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { timeAgo } from '@/lib/utils'

const BRAND = '#1E40AF'

/* ── Types ──────────────────────────────────────────────────── */

type ChatTab = 'chuyen-tro' | 'pass-do'

interface OrderConv {
  id: string
  order_id: string
  last_message_preview?: string
  last_message_at?: string
  unread_count: number
  counterpart?: { full_name?: string; avatar_url?: string }
}

interface MarketConv {
  id: string
  listing_id: string
  buyer_id: string
  listing_title?: string
  listing_image?: string
  counterpart?: { id?: string; full_name?: string; avatar_url?: string }
  last_message?: string
  last_message_at?: string
  unread_count: number
  is_seller: boolean
}

interface ChatMessage {
  id: string
  content?: string
  text?: string
  sender_id?: string
  from_buyer?: boolean
  created_at: string
}

/* ── Helpers ─────────────────────────────────────────────────── */

function Avatar({ name, url, size = 40 }: { name?: string; url?: string; size?: number }) {
  const initials = (name ?? '?').split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  if (url) return (
    <img src={url} alt={name} className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }} />
  )
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
      style={{ width: size, height: size, backgroundColor: BRAND }}>
      {initials}
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────── */

function SkeletonRow() {
  return (
    <div className="flex gap-3 items-center px-4 py-3.5 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-gray-100" />
        <div className="h-3 w-full rounded bg-gray-100" />
      </div>
    </div>
  )
}

/* ── Empty placeholders ──────────────────────────────────────── */

function EmptyChat({ tab }: { tab: ChatTab }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
        {tab === 'chuyen-tro'
          ? <Truck size={28} className="text-gray-300" />
          : <ShoppingBag size={28} className="text-gray-300" />
        }
      </div>
      <p className="font-bold text-gray-800 mb-1 text-sm">
        {tab === 'chuyen-tro' ? 'Chưa có tin nhắn' : 'Chưa có hội thoại'}
      </p>
      <Link
        href={tab === 'chuyen-tro' ? '/dat-chuyen' : '/cho-sinh-vien'}
        className="text-xs font-semibold no-underline mt-1"
        style={{ color: BRAND }}
      >
        {tab === 'chuyen-tro' ? 'Đặt chuyến để bắt đầu' : 'Khám phá chợ sinh viên'}
      </Link>
    </div>
  )
}

function NoChatSelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
        <MessageSquare size={32} style={{ color: BRAND }} />
      </div>
      <p className="font-bold text-gray-800 mb-1.5">Chọn cuộc trò chuyện</p>
      <p className="text-sm text-gray-400">Chọn một cuộc trò chuyện từ danh sách bên trái</p>
    </div>
  )
}

/* ── Main content ────────────────────────────────────────────── */

function TinNhanContent() {
  const searchParams = useSearchParams()
  const initialTab   = searchParams.get('tab') === 'pass-do' ? 'pass-do' : 'chuyen-tro'

  const [me, setMe]             = useState('')
  const [tab, setTab]           = useState<ChatTab>(initialTab as ChatTab)

  /* Chuyển trọ state */
  const [orderConvs, setOrderConvs]   = useState<OrderConv[]>([])
  const [orderLoading, setOrderLoading] = useState(true)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  /* Pass đồ state */
  const [marketConvs, setMarketConvs]     = useState<MarketConv[]>([])
  const [marketLoading, setMarketLoading] = useState(true)
  const [activeMarket, setActiveMarket]   = useState<MarketConv | null>(null)

  /* Shared chat state */
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMe(getStoredUser()?.id ?? '') }, [])

  /* ── Loaders ── */
  const loadOrderConvs = useCallback(() => {
    setOrderLoading(true)
    conversationsApi.list().then(r => {
      if (r.success && Array.isArray(r.data)) setOrderConvs(r.data as OrderConv[])
    }).finally(() => setOrderLoading(false))
  }, [])

  const loadMarketConvs = useCallback(() => {
    setMarketLoading(true)
    marketplaceApi.myConversations().then(r => {
      if (r.success && Array.isArray(r.data)) setMarketConvs(r.data as MarketConv[])
    }).finally(() => setMarketLoading(false))
  }, [])

  useEffect(() => { loadOrderConvs(); loadMarketConvs() }, [loadOrderConvs, loadMarketConvs])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ── Open order conversation ── */
  const openOrderConv = useCallback((orderId: string) => {
    setActiveOrderId(orderId)
    setActiveMarket(null)
    setMessages([])
    setLoadingMsgs(true)
    conversationsApi.getMessages(orderId).then(r => {
      const d = r.data as { messages?: ChatMessage[] }
      setMessages(d?.messages ?? [])
      setOrderConvs(prev => prev.map(c => c.order_id === orderId ? { ...c, unread_count: 0 } : c))
    }).finally(() => setLoadingMsgs(false))
  }, [])

  /* ── Open marketplace conversation ── */
  const openMarketConv = useCallback((conv: MarketConv) => {
    setActiveMarket(conv)
    setActiveOrderId(null)
    setMessages([])
    setLoadingMsgs(true)
    const buyerId = conv.is_seller ? conv.buyer_id : (me || conv.buyer_id)
    marketplaceApi.getMessages(conv.listing_id, buyerId).then(r => {
      const d = r.data as { messages?: ChatMessage[] }
      setMessages(d?.messages ?? [])
      setMarketConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
    }).finally(() => setLoadingMsgs(false))
  }, [me])

  /* ── Send message ── */
  const send = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const optimistic: ChatMessage = { id: `opt-${Date.now()}`, content: text, text, sender_id: me, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])

    try {
      if (activeOrderId) {
        const r = await conversationsApi.sendMessage(activeOrderId, text)
        if (r.success && r.data) {
          const real = r.data as ChatMessage
          setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...optimistic, ...real } : m))
        }
      } else if (activeMarket) {
        const buyerId = activeMarket.is_seller ? activeMarket.buyer_id : (me || activeMarket.buyer_id)
        await marketplaceApi.sendMessage(activeMarket.listing_id, buyerId, text)
        setMarketConvs(prev => prev.map(c =>
          c.id === activeMarket.id ? { ...c, last_message: text, last_message_at: optimistic.created_at } : c
        ))
      }
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  /* ── Derived ── */
  const activeOrderConv  = orderConvs.find(c => c.order_id === activeOrderId)
  const hasActiveChat    = !!activeOrderId || !!activeMarket

  const isMessageMine = (msg: ChatMessage) => {
    if (activeOrderId) return msg.sender_id === me
    if (activeMarket)  return activeMarket.is_seller ? !msg.from_buyer : msg.from_buyer
    return false
  }

  const msgText = (msg: ChatMessage) => msg.content || msg.text || ''

  /* ── Chat header info ── */
  const chatTitle = activeOrderId
    ? (activeOrderConv?.counterpart?.full_name ?? 'Nhà xe')
    : (activeMarket?.counterpart?.full_name ?? 'Người dùng')
  const chatSubtitle = activeOrderId
    ? `Đơn #${activeOrderId.slice(0, 8).toUpperCase()}`
    : (activeMarket?.listing_title ?? 'Chợ sinh viên')
  const chatAvatar = activeOrderId ? activeOrderConv?.counterpart : activeMarket?.counterpart

  return (
    <div
      className="flex overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm"
      style={{ height: 'calc(100vh - 68px)' }}
    >
      {/* ── Left panel ── */}
      <div
        className={`flex flex-col border-r border-gray-100 ${hasActiveChat ? 'hidden lg:flex' : 'flex'}`}
        style={{ width: 320, minWidth: 320 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tin nhắn</h2>
            <p className="text-xs text-gray-400 mt-0.5">Chat với tài xế & người mua/bán</p>
          </div>
          <button
            onClick={tab === 'chuyen-tro' ? loadOrderConvs : loadMarketConvs}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-2 border-b border-gray-50 shrink-0">
          {([
            { key: 'chuyen-tro', label: 'Chuyển trọ', Icon: Truck },
            { key: 'pass-do',    label: 'Pass đồ',    Icon: ShoppingBag },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={tab === key
                ? { backgroundColor: BRAND + '15', color: BRAND }
                : { color: '#9CA3AF' }
              }
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'chuyen-tro' ? (
            orderLoading ? (
              <div className="divide-y divide-gray-50">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
            ) : orderConvs.length === 0 ? (
              <EmptyChat tab="chuyen-tro" />
            ) : (
              <div className="divide-y divide-gray-50">
                {orderConvs.map(conv => {
                  const isActive = activeOrderId === conv.order_id
                  return (
                    <button
                      key={conv.id}
                      onClick={() => openOrderConv(conv.order_id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
                      style={{ backgroundColor: isActive ? BRAND + '10' : undefined }}
                    >
                      <Avatar name={conv.counterpart?.full_name} url={conv.counterpart?.avatar_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {conv.counterpart?.full_name ?? 'Nhà xe'}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                            {conv.last_message_preview || 'Chưa có tin nhắn'}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
                              style={{ width: 18, height: 18, backgroundColor: BRAND }}>
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      {!conv.unread_count && <ChevronRight size={14} className="text-gray-200 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            /* Pass đồ list */
            marketLoading ? (
              <div className="divide-y divide-gray-50">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
            ) : marketConvs.length === 0 ? (
              <EmptyChat tab="pass-do" />
            ) : (
              <div className="divide-y divide-gray-50">
                {marketConvs.map(conv => {
                  const isActive = activeMarket?.id === conv.id
                  return (
                    <button
                      key={conv.id}
                      onClick={() => openMarketConv(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
                      style={{ backgroundColor: isActive ? BRAND + '10' : undefined }}
                    >
                      {/* Listing thumbnail or avatar */}
                      <div className="relative shrink-0">
                        {conv.listing_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={conv.listing_image} alt={conv.listing_title}
                            className="w-11 h-11 rounded-xl object-cover" />
                        ) : (
                          <Avatar name={conv.counterpart?.full_name} url={conv.counterpart?.avatar_url} size={44} />
                        )}
                        {/* Role badge */}
                        <span
                          className="absolute -bottom-1 -right-1 rounded-full px-1 py-0.5 text-[8px] font-bold text-white"
                          style={{ backgroundColor: conv.is_seller ? '#16A34A' : BRAND }}
                        >
                          {conv.is_seller ? 'Bán' : 'Mua'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {conv.counterpart?.full_name ?? 'Người dùng'}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mb-0.5">
                          📦 {conv.listing_title ?? 'Sản phẩm'}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                            {conv.last_message || 'Chưa có tin nhắn'}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
                              style={{ width: 18, height: 18, backgroundColor: BRAND }}>
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Right panel: chat view ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${hasActiveChat ? 'flex' : 'hidden lg:flex'}`}>
        {!hasActiveChat ? (
          <NoChatSelected />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0 bg-white">
              <button
                onClick={() => { setActiveOrderId(null); setActiveMarket(null) }}
                className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar name={chatAvatar?.full_name} url={chatAvatar?.avatar_url} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{chatTitle}</p>
                <div className="flex items-center gap-1.5">
                  {activeOrderId
                    ? <Package size={11} className="text-gray-400" />
                    : <ShoppingBag size={11} className="text-gray-400" />
                  }
                  <p className="text-xs text-gray-400 truncate">{chatSubtitle}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ backgroundColor: '#FAFAFA' }}>
              {loadingMsgs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
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
                  const isMe = isMessageMine(msg)
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && <Avatar name={chatAvatar?.full_name} url={chatAvatar?.avatar_url} size={28} />}
                      <div className={`max-w-[72%] ${!isMe ? 'ml-2' : 'mr-0'}`}>
                        <div
                          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={isMe
                            ? { backgroundColor: BRAND, color: '#fff', borderBottomRightRadius: 4 }
                            : { backgroundColor: '#fff', color: '#1F2937', border: '1px solid #F3F4F6', borderBottomLeftRadius: 4 }
                          }
                        >
                          {msgText(msg)}
                        </div>
                        <p className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {timeAgo(msg.created_at)}
                        </p>
                      </div>
                      {isMe && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-2 self-end mb-5"
                          style={{ backgroundColor: BRAND + '20' }}>
                          <User size={13} style={{ color: BRAND }} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-[#1E40AF] focus-within:ring-1 focus-within:ring-[#1E40AF] transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Nhập tin nhắn... (Enter để gửi)"
                  rows={1}
                  className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-1 max-h-32"
                  style={{ lineHeight: '1.5' }}
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
  )
}

export default function TinNhanPage() {
  return (
    <Suspense fallback={
      <div className="flex overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm animate-pulse" style={{ height: 'calc(100vh - 68px)' }}>
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
  )
}
