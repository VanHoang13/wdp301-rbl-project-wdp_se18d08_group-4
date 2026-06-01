-- ============================================================
-- BƯỚC 4/4 — Tối ưu MVP: xóa bảng không dùng, gỡ cột trùng lặp
-- Chạy SAU khi step1, step2, step3 đã Success
-- BACKUP trước khi chạy!
-- ============================================================

-- ============================================================
-- PHẦN A: Gỡ cột trùng lặp (giữ order_items + order_images)
-- ============================================================

ALTER TABLE orders DROP COLUMN IF EXISTS items;
ALTER TABLE orders DROP COLUMN IF EXISTS images;

-- Chỉ dùng push_tokens (multi-device), không dùng fcm_token trên profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS fcm_token;


-- ============================================================
-- PHẦN B: Xóa bảng KHÔNG dùng cho MVP (7 bảng)
-- Flow Accept/Decline dùng order_provider_responses, không dùng bidding
-- ============================================================

DROP TABLE IF EXISTS provider_bids CASCADE;
DROP TABLE IF EXISTS geofence_events CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;


-- ============================================================
-- PHẦN C: Xóa bảng DEFER — Phase 2 (bỏ comment nếu muốn giữ)
-- ============================================================

DROP TABLE IF EXISTS feedback_responses CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS abuse_reports CASCADE;
-- announcements: giữ lại nếu admin cần broadcast; bỏ comment dòng dưới để xóa
-- DROP TABLE IF EXISTS announcements CASCADE;


-- ============================================================
-- PHẦN D: Comment đánh dấu bảng MVP trên DB (metadata)
-- ============================================================

COMMENT ON TABLE profiles IS '[MVP-CORE] Tài khoản cơ bản';
COMMENT ON TABLE customer_profiles IS '[MVP-CORE] Thông tin sinh viên';
COMMENT ON TABLE provider_profiles IS '[MVP-CORE] Thông tin nhà cung cấp';
COMMENT ON TABLE provider_documents IS '[MVP-CORE] Giấy tờ xác minh';
COMMENT ON TABLE orders IS '[MVP-CORE] Đơn chuyển trọ';
COMMENT ON TABLE order_items IS '[MVP-CORE] Chi tiết đồ đạc';
COMMENT ON TABLE order_images IS '[MVP-CORE] Ảnh đơn hàng';
COMMENT ON TABLE order_status_history IS '[MVP-CORE] Lịch sử trạng thái';
COMMENT ON TABLE order_provider_responses IS '[MVP-CORE] Provider accept/decline';
COMMENT ON TABLE service_packages IS '[MVP-CORE] Gói dịch vụ provider';
COMMENT ON TABLE payments IS '[MVP-CORE] Thanh toán PayOS';
COMMENT ON TABLE refunds IS '[MVP-CORE] Hoàn tiền';
COMMENT ON TABLE provider_earnings IS '[MVP-CORE] Doanh thu provider';
COMMENT ON TABLE provider_locations IS '[MVP-CORE] Vị trí realtime';
COMMENT ON TABLE order_tracking_events IS '[MVP-CORE] Sự kiện tracking';
COMMENT ON TABLE conversations IS '[MVP-CORE] Chat room theo đơn';
COMMENT ON TABLE messages IS '[MVP-CORE] Tin nhắn';
COMMENT ON TABLE notifications IS '[MVP-CORE] Thông báo user';
COMMENT ON TABLE push_tokens IS '[MVP-CORE] FCM tokens';
COMMENT ON TABLE notification_templates IS '[MVP-CORE] Mẫu thông báo';
COMMENT ON TABLE reviews IS '[MVP-CORE] Đánh giá';
COMMENT ON TABLE provider_reviews_summary IS '[MVP-CORE] Tổng hợp rating';
COMMENT ON TABLE disputes IS '[MVP-CORE] Tranh chấp';
COMMENT ON TABLE dispute_messages IS '[MVP-CORE] Tin nhắn dispute';
COMMENT ON TABLE platform_settings IS '[MVP-CORE] Cấu hình platform';

COMMENT ON TABLE promotions IS '[MVP-OPTIONAL] Mã giảm giá — UI Phase 2';
COMMENT ON TABLE promotion_usage IS '[MVP-OPTIONAL] Lịch sử dùng mã';
COMMENT ON TABLE provider_withdrawals IS '[MVP-OPTIONAL] Rút tiền — admin xử lý tay trước';
COMMENT ON TABLE payment_transactions IS '[MVP-OPTIONAL] Log chi tiết — backend only';
COMMENT ON TABLE location_history IS '[MVP-OPTIONAL] Replay route — Phase 2';
COMMENT ON TABLE routes IS '[MVP-OPTIONAL] Tuyến đường — Phase 2';
COMMENT ON TABLE distance_matrix IS '[MVP-OPTIONAL] Cache Maps — Phase 2';
COMMENT ON TABLE provider_availability IS '[MVP-OPTIONAL] Lịch rảnh — dùng is_available trước';
COMMENT ON TABLE shared_move_groups IS '[MVP-OPTIONAL] Gộp đơn — Phase 2';
COMMENT ON TABLE referrals IS '[MVP-OPTIONAL] Giới thiệu — Phase 2';
COMMENT ON TABLE review_votes IS '[MVP-OPTIONAL] Vote review hữu ích';
COMMENT ON TABLE notification_preferences IS '[MVP-OPTIONAL] Cài đặt thông báo';
COMMENT ON TABLE announcements IS '[MVP-OPTIONAL] Thông báo hệ thống';


-- ============================================================
-- PHẦN E: Verify — chạy sau khi script Success
-- ============================================================

SELECT COUNT(*) AS total_public_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT
    obj_description(c.oid) AS mvp_tag,
    c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND obj_description(c.oid) LIKE '[MVP-%'
ORDER BY mvp_tag, table_name;
