-- ============================================================
-- BƯỚC 3/3 — Chạy SAU khi step1_enums + step2_main đã Success
-- ============================================================

INSERT INTO notification_templates (template_key, notification_type, title_template, body_template, language, default_priority, send_push, send_email)
VALUES
    ('review_received', 'review_received'::notification_type, 'Bạn có đánh giá mới', 'Khách hàng vừa đánh giá {{rating}} sao cho đơn {{order_number}}.', 'vi', 'normal', true, false),
    ('provider_verified', 'provider_verified'::notification_type, 'Tài khoản đã xác thực', 'Chúc mừng! Bạn có thể bắt đầu nhận đơn hàng.', 'vi', 'high', true, true),
    ('shared_move_suggestion', 'shared_move_suggestion'::notification_type, 'Gộp đơn — Tiết kiệm 40%', 'Có đơn cùng tuyến. Gộp để giảm chi phí!', 'vi', 'normal', true, false),
    ('withdrawal_processed', 'withdrawal_processed'::notification_type, 'Rút tiền thành công', 'Yêu cầu rút {{amount}} VNĐ đã được xử lý.', 'vi', 'high', true, true)
ON CONFLICT (template_key) DO NOTHING;

-- Verify
SELECT template_key, notification_type::text FROM notification_templates
WHERE template_key IN ('review_received', 'provider_verified', 'shared_move_suggestion');
