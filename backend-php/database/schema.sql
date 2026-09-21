-- =============================================================================
--  TryLens Partner — skema database (MySQL 8 / MariaDB 10.5+)
--  Cara pakai:  mysql -u root -p < schema.sql   lalu   mysql -u root -p trylens < seed.sql
--
--  Peta tabel  →  menu Dashboard Mitra
--    users, auth_tokens ............... Partner Login / Register
--    plans, subscriptions ............. Onboarding, Checkout, Subscription (bulanan/tahunan; Current Plan / Upgrade)
--    stores, store_links .............. Store Management → Store Profile / Store Preview
--    store_settings ................... Settings → Store Settings
--    products, collections(+_products)  Store Management → Products / Frames, Collections
--    vto_settings ..................... Virtual Try-On → VTO Settings / Frame Library (products.vto_enabled)
--    consultations(+_frames) .......... Dashboard → Permintaan Konsultasi (+ hasil scan wajah, tanpa foto)
--    ad_orders, invoices .............. Pembelian iklan mingguan & tagihan (langganan + iklan)
--    analytics_events + *_daily_stats . Dashboard, Analytics, Try-On Analytics
--    banner_ads, highlighted_brands,
--    sponsored_frames ................. Promotion
--    notification_preferences,
--    notifications .................... Settings → Notifications, ikon lonceng
--
--  Aturan bisnis yang HARUS ditegakkan di lapisan API (PHP), bukan hanya di UI:
--    * Fitur Pro (advanced analytics, featured store, sponsored frame) → cek v_store_entitlements
--    * Batas frame per paket → plans.max_frames; iklan (banner / Highlighted Brand / Sponsored Frame) dibeli PER MINGGU lewat ad_orders
--    * Halaman dashboard hanya untuk akun dengan langganan aktif + toko yang sudah di-setup → v_partner_stage
-- =============================================================================

CREATE DATABASE IF NOT EXISTS trylens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trylens;

-- ---------------------------------------------------------------------------
-- 1. Akun & autentikasi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(120)  NOT NULL,
  email             VARCHAR(190)  NOT NULL,
  password_hash     VARCHAR(255)  NOT NULL COMMENT 'password_hash($pw, PASSWORD_BCRYPT) dari PHP',
  phone             VARCHAR(30)   NULL,
  role              ENUM('partner','admin') NOT NULL DEFAULT 'partner',
  status            ENUM('active','suspended') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME      NULL,
  last_login_at     DATETIME      NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Token sesi API (simpan HASH token, bukan token mentahnya).
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL COMMENT 'SHA-256 dari token',
  user_agent  VARCHAR(255) NULL,
  ip_address  VARCHAR(45)  NULL,
  expires_at  DATETIME     NOT NULL,
  revoked_at  DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_tokens_hash (token_hash),
  KEY idx_auth_tokens_user (user_id, expires_at),
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Paket & langganan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                   VARCHAR(20)  NOT NULL COMMENT 'basic | pro',
  name                   VARCHAR(60)  NOT NULL,
  price_monthly_idr      INT UNSIGNED NOT NULL,
  price_yearly_idr       INT UNSIGNED NOT NULL COMMENT 'tahunan = hemat 2 bulan',
  max_frames             INT UNSIGNED NULL COMMENT 'NULL = tanpa batas',
  has_advanced_analytics TINYINT(1) NOT NULL DEFAULT 0,
  has_featured_store     TINYINT(1) NOT NULL DEFAULT 0,
  has_sponsored_frame    TINYINT(1) NOT NULL DEFAULT 0,
  is_active              TINYINT(1) NOT NULL DEFAULT 1,
  sort_order             TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id              BIGINT UNSIGNED NOT NULL,
  plan_id              INT UNSIGNED    NOT NULL,
  billing_interval     ENUM('month','year') NOT NULL DEFAULT 'month',
  status               ENUM('pending','active','past_due','canceled','expired') NOT NULL DEFAULT 'pending',
  started_at           DATETIME NULL,
  current_period_start DATETIME NULL,
  current_period_end   DATETIME NULL,
  next_billing_at      DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  pending_plan_id      INT UNSIGNED NULL COMMENT 'paket tujuan bila downgrade dijadwalkan',
  canceled_at          DATETIME NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Hanya SATU langganan berstatus 'active' per user (NULL untuk status lain → tidak bentrok).
  active_user_id       BIGINT UNSIGNED AS (IF(status = 'active', user_id, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_one_active_subscription (active_user_id),
  KEY idx_subscriptions_user (user_id, status),
  KEY idx_subscriptions_billing (status, next_billing_at),
  CONSTRAINT fk_subs_user    FOREIGN KEY (user_id)         REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_subs_plan    FOREIGN KEY (plan_id)         REFERENCES plans (id),
  CONSTRAINT fk_subs_pending FOREIGN KEY (pending_plan_id) REFERENCES plans (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. Toko
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            BIGINT UNSIGNED NULL COMMENT 'pemilik; NULL = toko terdaftar tapi belum diklaim mitra',
  public_id          VARCHAR(20)  NOT NULL COMMENT 'ID di URL publik, mis. m1 → /toko/m1',
  name               VARCHAR(120) NOT NULL,
  description        TEXT         NULL,
  city               VARCHAR(80)  NOT NULL,
  province           VARCHAR(60)  NOT NULL,
  address            VARCHAR(255) NULL,
  whatsapp           VARCHAR(20)  NULL COMMENT 'format 62812…',
  phone              VARCHAR(30)  NULL,
  initials           VARCHAR(4)   NOT NULL DEFAULT 'TL',
  brand_color        CHAR(7)      NOT NULL DEFAULT '#427AB5',
  rating_avg         DECIMAL(2,1) NULL,
  frame_count_label  VARCHAR(20)  NULL COMMENT 'label statis di kartu mitra, mis. 120+ frame',
  status             ENUM('draft','active','hidden','suspended') NOT NULL DEFAULT 'draft',
  setup_completed_at DATETIME     NULL COMMENT 'NULL = onboarding belum selesai (tahap setup)',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stores_public (public_id),
  UNIQUE KEY uq_stores_owner (user_id),
  KEY idx_stores_province (province, status),
  CONSTRAINT fk_stores_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS store_links (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('instagram','x','tokopedia','shopee','website') NOT NULL,
  url      VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_platform (store_id, platform),
  CONSTRAINT fk_store_links_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS store_settings (
  store_id            BIGINT UNSIGNED NOT NULL,
  is_visible          TINYINT(1) NOT NULL DEFAULT 1,
  show_contact_button TINYINT(1) NOT NULL DEFAULT 1,
  operating_hours     VARCHAR(120) NULL,
  auto_reply          TEXT NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  CONSTRAINT fk_store_settings_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 4. Frame (produk) & koleksi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id             BIGINT UNSIGNED NOT NULL,
  public_id            VARCHAR(20)  NOT NULL COMMENT 'ID di URL publik, mis. f6 → /produk/f6',
  sku                  VARCHAR(40)  NULL,
  name                 VARCHAR(160) NOT NULL,
  style                ENUM('aviator','round','square','cateye','rect','browline') NOT NULL,
  color_key            VARCHAR(20)  NOT NULL DEFAULT 'black',
  category             ENUM('Pria','Wanita','Anak') NOT NULL,
  price_idr            INT UNSIGNED NOT NULL,
  compare_at_price_idr INT UNSIGNED NULL COMMENT 'harga coret; NULL = tidak diskon',
  stock                INT UNSIGNED NOT NULL DEFAULT 0,
  is_published         TINYINT(1)   NOT NULL DEFAULT 1,
  is_new               TINYINT(1)   NOT NULL DEFAULT 0,
  vto_enabled          TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'Virtual Try-On aktif untuk frame ini',
  is_flash_sale        TINYINT(1)   NOT NULL DEFAULT 0,
  flash_sold_pct       TINYINT UNSIGNED NULL COMMENT '% stok flash sale terjual',
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_public (public_id),
  KEY idx_products_store (store_id, is_published),
  KEY idx_products_category (category, is_published),
  KEY idx_products_style (style),
  KEY idx_products_flash (is_flash_sale, flash_sold_pct),
  CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT chk_products_price CHECK (price_idr > 0),
  CONSTRAINT chk_products_compare CHECK (compare_at_price_idr IS NULL OR compare_at_price_idr >= price_idr)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS collections (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id     BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(120) NOT NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order   INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_collections_store (store_id, sort_order),
  CONSTRAINT fk_collections_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id),
  KEY idx_cp_product (product_id),
  CONSTRAINT fk_cp_collection FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_product    FOREIGN KEY (product_id)    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 5. Virtual Try-On
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vto_settings (
  store_id    BIGINT UNSIGNED NOT NULL,
  enabled     TINYINT(1) NOT NULL DEFAULT 1,
  allow_share TINYINT(1) NOT NULL DEFAULT 1,
  lens_tint   ENUM('clear','brown','gray','blue') NOT NULL DEFAULT 'clear',
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  CONSTRAINT fk_vto_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 6. Iklan & Premium — dibeli PER MINGGU (di luar langganan)
--    Harga acuan/minggu: banner mulai Rp500.000 · Highlighted Brand Rp350.000 per slot ·
--    Sponsored Frame Rp200.000–800.000 per frame. Harga tercatat di ad_orders (unit_price_idr)
--    agar perubahan tarif tidak mengubah pesanan lama.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_orders (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no       VARCHAR(30)  NOT NULL COMMENT 'mis. AO-20260920-0002',
  user_id        BIGINT UNSIGNED NOT NULL,
  store_id       BIGINT UNSIGNED NOT NULL,
  type           ENUM('banner','highlighted','sponsored') NOT NULL,
  placement      VARCHAR(20)  NULL COMMENT 'banner: mitra|beranda · sponsored: kategori|pencarian|beranda',
  slot_no        TINYINT UNSIGNED NULL COMMENT 'khusus highlighted',
  weeks          TINYINT UNSIGNED NOT NULL,
  quantity       TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'sponsored: jumlah frame (maks. 3)',
  unit_price_idr INT UNSIGNED NOT NULL COMMENT 'harga per minggu (per frame untuk sponsored)',
  total_idr      INT UNSIGNED NOT NULL,
  starts_on      DATE NOT NULL,
  ends_on        DATE NOT NULL,
  status         ENUM('pending_payment','paid','canceled','refunded') NOT NULL DEFAULT 'pending_payment',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at        DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ad_orders_no (order_no),
  KEY idx_ad_orders_store (store_id, type, status),
  KEY idx_ad_orders_serving (type, status, starts_on, ends_on),
  CONSTRAINT fk_ao_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE,
  CONSTRAINT fk_ao_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT chk_ao_weeks CHECK (weeks BETWEEN 1 AND 8),
  CONSTRAINT chk_ao_total CHECK (total_idr = unit_price_idr * weeks * quantity),
  CONSTRAINT chk_ao_dates CHECK (ends_on = starts_on + INTERVAL (weeks * 7 - 1) DAY)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS banner_ads (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id      BIGINT UNSIGNED NOT NULL,
  ad_order_id   BIGINT UNSIGNED NULL,
  placement     ENUM('mitra','beranda') NOT NULL DEFAULT 'mitra',
  title         VARCHAR(40)  NOT NULL,
  subtitle      VARCHAR(80)  NULL,
  cta_label     VARCHAR(20)  NOT NULL DEFAULT 'Lihat Koleksi',
  cta_url       VARCHAR(255) NULL,
  image_url     VARCHAR(255) NULL,
  status        ENUM('draft','pending_review','active','paused','ended','rejected') NOT NULL DEFAULT 'pending_review',
  reject_reason VARCHAR(255) NULL,
  starts_on     DATE NOT NULL,
  ends_on       DATE NOT NULL,
  impressions   INT UNSIGNED NOT NULL DEFAULT 0,
  clicks        INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_banner_store (store_id, status),
  KEY idx_banner_serving (status, starts_on, ends_on),
  CONSTRAINT fk_banner_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT fk_banner_order FOREIGN KEY (ad_order_id) REFERENCES ad_orders (id) ON DELETE SET NULL,
  CONSTRAINT chk_banner_dates CHECK (ends_on >= starts_on)
) ENGINE=InnoDB;

-- Highlighted Brand / Featured Store (hanya paket Pro yang boleh memesan; satu slot aktif = satu toko).
CREATE TABLE IF NOT EXISTS highlighted_brands (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id  BIGINT UNSIGNED NOT NULL,
  ad_order_id BIGINT UNSIGNED NULL,
  slot_no   TINYINT UNSIGNED NOT NULL,
  status    ENUM('active','ended','canceled') NOT NULL DEFAULT 'active',
  starts_at DATETIME NOT NULL,
  ends_at   DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_slot_no TINYINT UNSIGNED AS (IF(status = 'active', slot_no, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_one_active_per_slot (active_slot_no),
  KEY idx_hl_serving (status, ends_at),
  KEY idx_hl_store (store_id),
  CONSTRAINT fk_hl_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT fk_hl_order FOREIGN KEY (ad_order_id) REFERENCES ad_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sponsored Frame (hanya Pro; maks. 3 frame per pesanan — ditegakkan di API).
CREATE TABLE IF NOT EXISTS sponsored_frames (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  ad_order_id BIGINT UNSIGNED NULL,
  placement   ENUM('kategori','pencarian','beranda') NOT NULL DEFAULT 'pencarian',
  status      ENUM('active','paused','ended') NOT NULL DEFAULT 'active',
  starts_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at     DATETIME NULL,
  impressions INT UNSIGNED NOT NULL DEFAULT 0,
  clicks      INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_sf_store (store_id, status),
  KEY idx_sf_product (product_id),
  CONSTRAINT fk_sf_store   FOREIGN KEY (store_id)   REFERENCES stores (id)   ON DELETE CASCADE,
  CONSTRAINT fk_sf_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_sf_order   FOREIGN KEY (ad_order_id) REFERENCES ad_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. Tagihan (langganan ATAU pesanan iklan) — menu Subscription → Billing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_no      VARCHAR(30)  NOT NULL COMMENT 'mis. INV-20260920-0001 (unik global)',
  kind            ENUM('subscription','ad_order') NOT NULL DEFAULT 'subscription',
  user_id         BIGINT UNSIGNED NOT NULL,
  subscription_id BIGINT UNSIGNED NULL,
  plan_id         INT UNSIGNED    NULL,
  ad_order_id     BIGINT UNSIGNED NULL,
  description     VARCHAR(160) NOT NULL,
  amount_idr      INT UNSIGNED NOT NULL,
  status          ENUM('pending','paid','failed','expired','refunded') NOT NULL DEFAULT 'pending',
  payment_method  VARCHAR(30)  NULL COMMENT 'QRIS, VA BCA, VA Mandiri, E-wallet, Kartu',
  provider_ref    VARCHAR(80)  NULL COMMENT 'ID transaksi dari payment gateway',
  issued_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at          DATETIME     NULL,
  paid_at         DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_no (invoice_no),
  KEY idx_invoices_user (user_id, issued_at),
  KEY idx_invoices_sub (subscription_id),
  KEY idx_invoices_order (ad_order_id),
  CONSTRAINT fk_inv_user  FOREIGN KEY (user_id)         REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_sub   FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_plan  FOREIGN KEY (plan_id)         REFERENCES plans (id),
  CONSTRAINT fk_inv_order FOREIGN KEY (ad_order_id)     REFERENCES ad_orders (id) ON DELETE CASCADE,
  CONSTRAINT chk_inv_kind CHECK (
    (kind = 'subscription' AND subscription_id IS NOT NULL AND plan_id IS NOT NULL AND ad_order_id IS NULL) OR
    (kind = 'ad_order'     AND ad_order_id IS NOT NULL AND subscription_id IS NULL))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 8. Konsultasi konsumen → Mitra (kartu "Permintaan Konsultasi")
--    Konsumen TIDAK perlu akun: identitas minimum = nama panggilan + WhatsApp.
--    Hasil scan wajah (AR) hanya disimpan sebagai label & rasio — TIDAK ADA foto/video yang disimpan.
--    Pelanggan bertipe 'customer' (punya akun) disiapkan untuk fase berikutnya.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultations (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code               VARCHAR(12)  NOT NULL COMMENT 'kode konsultasi untuk konsumen, mis. TL-48291',
  store_id           BIGINT UNSIGNED NOT NULL,
  customer_name      VARCHAR(80)  NOT NULL COMMENT 'nama panggilan',
  customer_whatsapp  VARCHAR(20)  NOT NULL COMMENT 'format 62812…',
  identity           ENUM('guest','customer') NOT NULL DEFAULT 'guest',
  category           ENUM('konsultasi','ketersediaan','produk','minat_beli') NOT NULL DEFAULT 'konsultasi',
  message            TEXT NOT NULL,
  face_source        ENUM('ar','manual') NULL COMMENT 'ar = hasil pemindaian kamera; manual = dipilih pengguna',
  face_shape         ENUM('oval','round','square','heart','oblong') NULL,
  face_width         ENUM('small','medium','large') NULL,
  face_width_mm      SMALLINT UNSIGNED NULL COMMENT 'perkiraan kasar dari jarak pupil (±10%)',
  ratio_length       DECIMAL(4,2) NULL COMMENT 'panjang wajah / lebar pipi',
  ratio_jaw          DECIMAL(4,2) NULL COMMENT 'lebar rahang / lebar pipi',
  ratio_forehead     DECIMAL(4,2) NULL COMMENT 'lebar dahi / lebar pipi',
  recommended_styles SET('aviator','round','square','cateye','rect','browline') NULL,
  status             ENUM('new','contacted','closed','ignored') NOT NULL DEFAULT 'new',
  contacted_at       DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_consultations_code (code),
  KEY idx_consult_inbox (store_id, status, created_at),
  KEY idx_consult_category (store_id, category, created_at),
  CONSTRAINT fk_consult_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT chk_consult_face CHECK ((face_source IS NULL) = (face_shape IS NULL))
) ENGINE=InnoDB;

-- Frame yang dilihat/dicoba konsumen sebelum meminta konsultasi (hanya frame milik toko tujuan).
CREATE TABLE IF NOT EXISTS consultation_frames (
  consultation_id BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NOT NULL,
  seen_order      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (consultation_id, product_id),
  KEY idx_cf_product (product_id),
  CONSTRAINT fk_cf_consult FOREIGN KEY (consultation_id) REFERENCES consultations (id) ON DELETE CASCADE,
  CONSTRAINT fk_cf_product FOREIGN KEY (product_id)      REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 9. Analitik
--    analytics_events = data mentah (tulis-berat). Job harian meringkasnya ke *_daily_stats,
--    lalu event > 90 hari boleh dihapus. Dashboard membaca *_daily_stats (cepat).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NULL,
  event_type  ENUM('store_view','product_view','vto_start','vto_capture','contact_click','link_click',
                   'wishlist_add','banner_impression','banner_click','sponsored_impression','sponsored_click',
                   'face_scan','consult_submit') NOT NULL,
  session_id  CHAR(32) NOT NULL,
  source      ENUM('search','home','instagram','marketplace','direct','other') NOT NULL DEFAULT 'direct',
  device      ENUM('mobile','desktop','tablet') NOT NULL DEFAULT 'mobile',
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ev_store_time (store_id, occurred_at),
  KEY idx_ev_type_time (store_id, event_type, occurred_at),
  KEY idx_ev_product (product_id, event_type),
  CONSTRAINT fk_ev_store   FOREIGN KEY (store_id)   REFERENCES stores (id)   ON DELETE CASCADE,
  CONSTRAINT fk_ev_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS store_daily_stats (
  store_id        BIGINT UNSIGNED NOT NULL,
  stat_date       DATE NOT NULL,
  store_views     INT UNSIGNED NOT NULL DEFAULT 0,
  unique_visitors INT UNSIGNED NOT NULL DEFAULT 0,
  product_views   INT UNSIGNED NOT NULL DEFAULT 0,
  vto_sessions    INT UNSIGNED NOT NULL DEFAULT 0,
  contact_clicks  INT UNSIGNED NOT NULL DEFAULT 0,
  link_clicks     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, stat_date),
  CONSTRAINT fk_sds_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_daily_stats (
  product_id     BIGINT UNSIGNED NOT NULL,
  stat_date      DATE NOT NULL,
  views          INT UNSIGNED NOT NULL DEFAULT 0,
  vto_sessions   INT UNSIGNED NOT NULL DEFAULT 0,
  wishlist_adds  INT UNSIGNED NOT NULL DEFAULT 0,
  contact_clicks INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, stat_date),
  KEY idx_pds_date (stat_date),
  CONSTRAINT fk_pds_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 10. Notifikasi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id       BIGINT UNSIGNED NOT NULL,
  event_key     ENUM('new_lead','billing','weekly_report','promo') NOT NULL,
  email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  wa_enabled    TINYINT(1) NOT NULL DEFAULT 0,
  in_app_enabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, event_key),
  CONSTRAINT fk_np_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(30)  NOT NULL,
  title      VARCHAR(160) NOT NULL,
  body       VARCHAR(255) NULL,
  link       VARCHAR(190) NULL,
  read_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, read_at, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 11. View bantu untuk API
-- ---------------------------------------------------------------------------

-- Tahap akun (alur Partner Login → onboarding → setup → dashboard).
CREATE OR REPLACE VIEW v_partner_stage AS
SELECT u.id AS user_id,
       u.email,
       (s.id IS NOT NULL)                       AS has_active_subscription,
       (st.setup_completed_at IS NOT NULL)      AS store_setup_done,
       CASE
         WHEN s.id IS NULL                      THEN 'onboarding'
         WHEN st.setup_completed_at IS NULL     THEN 'setup'
         ELSE 'dashboard'
       END AS stage
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
LEFT JOIN stores st       ON st.user_id = u.id
WHERE u.role = 'partner';

-- Hak fitur & batas tiap toko berdasarkan paket aktif pemiliknya.
CREATE OR REPLACE VIEW v_store_entitlements AS
SELECT st.id AS store_id,
       st.user_id,
       p.code AS plan_code,
       p.max_frames,
       p.has_advanced_analytics,
       p.has_featured_store,
       p.has_sponsored_frame,
       s.billing_interval,
       s.next_billing_at,
       s.cancel_at_period_end
FROM stores st
JOIN subscriptions s ON s.user_id = st.user_id AND s.status = 'active'
JOIN plans p         ON p.id = s.plan_id;
