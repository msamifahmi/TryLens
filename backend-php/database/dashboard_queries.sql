-- =============================================================================
--  Query acuan untuk endpoint API dashboard Mitra (sudah diuji terhadap seed.sql).
--  Ganti :store_id / :user_id dengan parameter PDO (prepared statement).
--  Tanggal acuan di seed = 2026-09-20; di produksi pakai CURDATE().
-- =============================================================================
USE trylens;

-- 1) Tahap akun setelah login → menentukan redirect (onboarding / setup / dashboard)
SELECT stage FROM v_partner_stage WHERE user_id = :user_id;

-- 2) Kartu "PAKET ANDA" + hak fitur (Basic vs Pro) + siklus tagihan
SELECT plan_code, billing_interval, max_frames,
       has_advanced_analytics, has_featured_store, has_sponsored_frame,
       next_billing_at, cancel_at_period_end
FROM v_store_entitlements WHERE store_id = :store_id;

-- 3) Kartu KPI dashboard: periode ini vs periode sebelumnya (contoh 30 hari)
SELECT
  SUM(CASE WHEN stat_date >  CURDATE() - INTERVAL 30 DAY THEN store_views END)    AS store_views,
  SUM(CASE WHEN stat_date <= CURDATE() - INTERVAL 30 DAY THEN store_views END)    AS store_views_prev,
  SUM(CASE WHEN stat_date >  CURDATE() - INTERVAL 30 DAY THEN vto_sessions END)   AS vto_sessions,
  SUM(CASE WHEN stat_date <= CURDATE() - INTERVAL 30 DAY THEN vto_sessions END)   AS vto_sessions_prev,
  SUM(CASE WHEN stat_date >  CURDATE() - INTERVAL 30 DAY THEN product_views END)  AS product_views,
  SUM(CASE WHEN stat_date <= CURDATE() - INTERVAL 30 DAY THEN product_views END)  AS product_views_prev,
  SUM(CASE WHEN stat_date >  CURDATE() - INTERVAL 30 DAY THEN contact_clicks END) AS contact_clicks,
  SUM(CASE WHEN stat_date <= CURDATE() - INTERVAL 30 DAY THEN contact_clicks END) AS contact_clicks_prev
FROM store_daily_stats
WHERE store_id = :store_id AND stat_date > CURDATE() - INTERVAL 60 DAY;

-- 4) Grafik "Ikhtisar Kunjungan": total per bulan (6 bulan terakhir)
SELECT DATE_FORMAT(stat_date, '%Y-%m') AS bulan, SUM(store_views) AS kunjungan
FROM store_daily_stats
WHERE store_id = :store_id AND stat_date >= DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH, '%Y-%m-01')
GROUP BY bulan ORDER BY bulan;

-- 5) Frame teratas (tile di bawah grafik & Product Performance — Pro)
SELECT p.public_id, p.name,
       SUM(d.views) AS views, SUM(d.vto_sessions) AS vto, SUM(d.wishlist_adds) AS wishlist, SUM(d.contact_clicks) AS contacts
FROM product_daily_stats d
JOIN products p ON p.id = d.product_id
WHERE p.store_id = :store_id AND d.stat_date > CURDATE() - INTERVAL 30 DAY
GROUP BY p.id ORDER BY vto DESC LIMIT 6;

-- 6) [TIDAK DIPAKAI sejak Update 9 — konsultasi lewat WhatsApp optik; query 6–6f dibiarkan hanya sebagai arsip]
--    Kartu "Permintaan Konsultasi" (belum ditanggapi) + hasil scan wajah
SELECT c.id, c.code, c.customer_name, c.identity, c.category, c.message, c.created_at,
       c.face_shape, c.face_width, c.recommended_styles,
       (SELECT COUNT(*) FROM consultation_frames f WHERE f.consultation_id = c.id) AS frames_viewed
FROM consultations c
WHERE c.store_id = :store_id AND c.status = 'new'
ORDER BY c.created_at DESC LIMIT 3;

-- 6b) Halaman Permintaan: hitungan per jenis (chip filter) untuk status tertentu
SELECT category, COUNT(*) AS jumlah FROM consultations
WHERE store_id = :store_id AND status = 'new' GROUP BY category;

-- 6c) Detail: frame yang dilihat konsumen
SELECT p.public_id, p.name, p.style, p.price_idr
FROM consultation_frames cf JOIN products p ON p.id = cf.product_id
WHERE cf.consultation_id = :consultation_id ORDER BY cf.seen_order;

-- 6d) Detail: rekomendasi dari katalog toko sesuai gaya hasil scan (FIND_IN_SET pada kolom SET)
SELECT p.public_id, p.name, p.style
FROM products p JOIN consultations c ON c.id = :consultation_id
WHERE p.store_id = c.store_id AND p.is_published = 1 AND FIND_IN_SET(p.style, c.recommended_styles) > 0
ORDER BY p.created_at DESC LIMIT 4;

-- 6e) Tandai sudah dihubungi (tombol WhatsApp) / selesai / abaikan
UPDATE consultations SET status = 'contacted', contacted_at = NOW() WHERE id = :consultation_id AND store_id = :store_id AND status = 'new';

-- 6f) Konsumen (tanpa login) mengirim permintaan — dijalankan endpoint publik dengan rate-limit per IP
--   INSERT INTO consultations (code, store_id, customer_name, customer_whatsapp, category, message,
--                              face_source, face_shape, face_width, face_width_mm, recommended_styles)
--   VALUES (:code, :store_id, :name, :wa, :category, :message, :src, :shape, :width, :mm, :styles);   -- :styles mis. 'square,rect'
--   INSERT INTO consultation_frames (consultation_id, product_id, seen_order) VALUES (LAST_INSERT_ID(), :product_id, 1);

-- 7) "Promosi Aktif" (banner, Highlighted Brand, Sponsored Frame yang sedang tayang)
SELECT 'banner' AS jenis, b.title AS nama, b.starts_on AS sejak, b.impressions FROM banner_ads b
 WHERE b.store_id = :store_id AND b.status = 'active'
UNION ALL
SELECT 'highlighted', CONCAT('Highlighted Brand - Slot ', h.slot_no), h.starts_at, NULL FROM highlighted_brands h
 WHERE h.store_id = :store_id AND h.status = 'active' AND h.ends_at > NOW()
UNION ALL
SELECT 'sponsored', CONCAT('Sponsored: ', p.name), s.starts_at, s.impressions FROM sponsored_frames s
 JOIN products p ON p.id = s.product_id WHERE s.store_id = :store_id AND s.status = 'active';

-- 8) Cek kuota sebelum menambah frame (API harus menolak bila sudah penuh; NULL = tanpa batas)
SELECT (e.max_frames IS NULL OR COUNT(p.id) < e.max_frames) AS boleh_tambah_frame
FROM v_store_entitlements e LEFT JOIN products p ON p.store_id = e.store_id
WHERE e.store_id = :store_id GROUP BY e.store_id, e.max_frames;

-- 9) Iklan premium hanya untuk Pro (cek sebelum membuat pesanan highlighted / sponsored)
SELECT has_featured_store AS boleh_highlighted, has_sponsored_frame AS boleh_sponsored
FROM v_store_entitlements WHERE store_id = :store_id;

-- 9b) Slot Highlighted Brand yang masih kosong (6 slot)
SELECT n.slot AS slot_kosong
FROM (SELECT 1 AS slot UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) n
LEFT JOIN highlighted_brands h ON h.slot_no = n.slot AND h.status = 'active' AND h.ends_at > NOW()
WHERE h.id IS NULL;

-- 10) Aktivasi langganan setelah pembayaran sukses (satu transaksi). :interval = 'month' | 'year'
--   START TRANSACTION;
--   UPDATE subscriptions SET status = 'canceled', canceled_at = NOW() WHERE user_id = :user_id AND status = 'active';  -- bila upgrade
--   INSERT INTO subscriptions (user_id, plan_id, billing_interval, status, started_at, current_period_start, current_period_end, next_billing_at)
--     VALUES (:user_id, :plan_id, :interval, 'active', NOW(), NOW(), NOW() + INTERVAL 1 MONTH, NOW() + INTERVAL 1 MONTH);  -- 12 MONTH bila tahunan
--   INSERT INTO invoices (invoice_no, kind, user_id, subscription_id, plan_id, description, amount_idr, status, payment_method, paid_at)
--     VALUES (:invoice_no, 'subscription', :user_id, LAST_INSERT_ID(), :plan_id, :desc, :amount, 'paid', :method, NOW());
--   COMMIT;

-- 11) Aktivasi pesanan iklan setelah pembayaran sukses. Harga dihitung ULANG di server, jangan percaya angka dari klien.
--   INSERT INTO ad_orders (order_no, user_id, store_id, type, placement, slot_no, weeks, quantity, unit_price_idr, total_idr, starts_on, ends_on, status, paid_at)
--     VALUES (:order_no, :user_id, :store_id, :type, :placement, :slot, :weeks, :qty, :unit, :unit * :weeks * :qty, :starts_on, :starts_on + INTERVAL (:weeks * 7 - 1) DAY, 'paid', NOW());
--   INSERT INTO invoices (invoice_no, kind, user_id, ad_order_id, description, amount_idr, status, payment_method, paid_at)
--     VALUES (:invoice_no, 'ad_order', :user_id, LAST_INSERT_ID(), :desc, :unit * :weeks * :qty, 'paid', :method, NOW());
--   -- lalu: banner → INSERT banner_ads (status 'pending_review'); highlighted → INSERT highlighted_brands (unik per slot aktif);
--   --       sponsored → INSERT sponsored_frames per frame (maks. 3).
