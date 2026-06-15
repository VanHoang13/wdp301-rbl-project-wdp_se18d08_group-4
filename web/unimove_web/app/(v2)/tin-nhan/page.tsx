"use client";

import React, { useState } from "react";
import { MessageSquare, Search, Plus, Send } from "lucide-react";

interface Conversation {
  id: string;
  driver_name: string;
  driver_initial: string;
  last_message: string;
  timestamp: string;
  unread: number;
  order_id: string;
}

const MOCK_CONVS: Conversation[] = [
  { id: "1", driver_name: "Nguyễn Văn An", driver_initial: "A", last_message: "Tôi đang trên đường đến điểm đón!", timestamp: "09:42", unread: 2, order_id: "ABC123" },
  { id: "2", driver_name: "Trần Minh Dũng", driver_initial: "D", last_message: "Đã giao hàng thành công, cảm ơn bạn!", timestamp: "Hôm qua", unread: 0, order_id: "XYZ789" },
];

export default function TinNhanPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_CONVS.filter(c =>
    !search || c.driver_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 pb-6 pt-5 max-w-2xl mx-auto lg:max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trò chuyện với tài xế của bạn</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Tìm cuộc trò chuyện..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-[#2563EB]" />
          </div>
          <p className="font-bold text-gray-900 mb-1">Chưa có tin nhắn</p>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Tin nhắn với tài xế sẽ xuất hiện ở đây khi bạn đặt chuyến
          </p>
          <a href="/dat-chuyen">
            <button className="px-6 py-2.5 rounded-full text-white text-sm font-bold bg-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:brightness-110 transition-all">
              Đặt chuyến ngay
            </button>
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {filtered.map(conv => (
            <button key={conv.id} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-gray-50/60 transition-colors">
              {/* Avatar */}
              <div className="shrink-0 w-11 h-11 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-base">
                {conv.driver_initial}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm text-gray-900">{conv.driver_name}</span>
                  <span className="text-xs text-gray-400">{conv.timestamp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate max-w-[200px]">{conv.last_message}</p>
                  {conv.unread > 0 && (
                    <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">Đơn #{conv.order_id}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}