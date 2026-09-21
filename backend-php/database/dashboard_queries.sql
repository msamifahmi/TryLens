-- =============================================================================
--  Query acuan untuk endpoint API dashboard Mitra (sudah diuji terhadap seed.sql).
--  Ganti :store_id / :user_id dengan parameter PDO (prepared statement).
--  Tanggal acuan di seed = 2026-09-20; di produksi pakai CURDATE().
-- =============================================================================
USE trylens;

-- 1) Tahap akun setelah login → menentukan redirect (onboarding / setup / dashboard)
SELECT stage FROM v_partner_stage WHERE user_id = :user_id;

-- 2) Kartu "PAKET ANDA" + hak fitur (Basic vs Pro)
SELECT plan_code, max_frames, max_active_banners,
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

-- 6) "Permintaan Terbaru" (belum ditanggapi)
SELECT id, customer_name, topic, message, created_at
FROM leads WHERE store_id = :store_id AND status = 'new'
ORDER BY created_at DESC LIMIT 3;
-- Tanggapi / Abaikan:
UPDATE leads SET status = 'responded', responded_at = NOW() WHERE id = :lead_id AND store_id = :store_id;

-- 7) "Promosi Aktif"
SELECT 'banner' AS jenis, title AS nama, starts_on AS sejak, impressions FROM banner_ads
 WHERE store_id = :store_id AND status = 'active'
UNION ALL
SELECT 'featured', 'Featured Store', starts_at, NULL FROM highlighted_brands
 WHERE store_id = :store_id AND status = 'active' AND ends_at > NOW()
UNION ALL
SELECT 'sponsored', CONCAT('Sponsored: ', p.name), s.starts_at, s.impressions FROM sponsored_frames s
 JOIN products p ON p.id = s.product_id WHERE s.store_id = :store_id AND s.status = 'active';

-- 8) Cek kuota sebelum menambah frame (API harus menolak bila sudah penuh; NULL = tanpa batas)
SELECT (e.max_frames IS NULL OR COUNT(p.id) < e.max_frames) AS boleh_tambah_frame
FROM v_store_entitlements e LEFT JOIN products p ON p.store_id = e.store_id
WHERE e.store_id = :store_id GROUP BY e.store_id, e.max_frames;

-- 9) Cek kuota banner aktif sebelum membuat banner baru
SELECT (COUNT(b.id) < e.max_active_banners) AS boleh_buat_banner
FROM v_store_entitlements e
LEFT JOIN banner_ads b ON b.store_id = e.store_id AND b.status IN ('active','pending_review')
WHERE e.store_id = :store_id GROUP BY e.store_id, e.max_active_banners;

-- 10) Aktivasi langganan setelah pembayaran sukses (dalam satu transaksi)
--   START TRANSACTION;
--   UPDATE subscriptions SET status = 'canceled', canceled_at = NOW() WHERE user_id = :user_id AND status = 'active';  -- bila upgrade
--   INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_start, current_period_end, next_billing_at)
--     VALUES (:user_id, :plan_id, 'active', NOW(), NOW(), NOW() + INTERVAL 1 MONTH, NOW() + INTERVAL 1 MONTH);
--   INSERT INTO invoices (invoice_no, user_id, subscription_id, plan_id, amount_idr, status, payment_method, paid_at)
--     VALUES (:invoice_no, :user_id, LAST_INSERT_ID(), :plan_id, :amount, 'paid', :method, NOW());
--   COMMIT;
