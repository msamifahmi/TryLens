-- =============================================================================
--  TryLens Partner — skema database (MySQL 8 / MariaDB 10.5+)
--  Cara pakai:  mysql -u root -p < schema.sql   lalu   mysql -u root -p trylens < seed.sql
--
--  Peta tabel  →  menu Dashboard Mitra
--    users, auth_tokens ............... Partner Login / Register
--    plans, subscriptions, invoices ... Onboarding, Checkout, Subscription (Current Plan / Billing / Upgrade)
--    stores, store_links .............. Store Management → Store Profile / Store Preview
--    store_settings ................... Settings → Store Settings
--    products, collections(+_products)  Store Management → Products / Frames, Collections
--    vto_settings ..................... Virtual Try-On → VTO Settings / Frame Library (products.vto_enabled)
--    leads ............................ Dashboard → Permintaan Terbaru
--    analytics_events + *_daily_stats . Dashboard, Analytics, Try-On Analytics
--    banner_ads, highlighted_brands,
--    sponsored_frames ................. Promotion
--    notification_preferences,
--    notifications .................... Settings → Notifications, ikon lonceng
--
--  Aturan bisnis yang HARUS ditegakkan di lapisan API (PHP), bukan hanya di UI:
--    * Fitur Pro (advanced analytics, featured store, sponsored frame) → cek v_store_entitlements
--    * Batas frame & banner aktif per paket → plans.max_frames / plans.max_active_banners
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
-- 2. Paket, langganan, invoice
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                   VARCHAR(20)  NOT NULL COMMENT 'basic | pro',
  name                   VARCHAR(60)  NOT NULL,
  price_idr              INT UNSIGNED NOT NULL,
  billing_interval       ENUM('month','year') NOT NULL DEFAULT 'month',
  max_frames             INT UNSIGNED NULL COMMENT 'NULL = tanpa batas',
  max_active_banners     TINYINT UNSIGNED NOT NULL DEFAULT 1,
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

CREATE TABLE IF NOT EXISTS invoices (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_no      VARCHAR(30)  NOT NULL COMMENT 'mis. INV-20260920-0001',
  user_id         BIGINT UNSIGNED NOT NULL,
  subscription_id BIGINT UNSIGNED NOT NULL,
  plan_id         INT UNSIGNED    NOT NULL,
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
  CONSTRAINT fk_inv_user FOREIGN KEY (user_id)         REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_sub  FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_plan FOREIGN KEY (plan_id)         REFERENCES plans (id)
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
-- 6. Promosi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banner_ads (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id      BIGINT UNSIGNED NOT NULL,
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
  CONSTRAINT chk_banner_dates CHECK (ends_on >= starts_on)
) ENGINE=InnoDB;

-- Featured Store / Highlighted Brand (khusus Pro).
CREATE TABLE IF NOT EXISTS highlighted_brands (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id  BIGINT UNSIGNED NOT NULL,
  status    ENUM('active','ended','canceled') NOT NULL DEFAULT 'active',
  starts_at DATETIME NOT NULL,
  ends_at   DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hl_serving (status, ends_at),
  KEY idx_hl_store (store_id),
  CONSTRAINT fk_hl_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sponsored Frame (khusus Pro; maks. 3 frame aktif per toko — ditegakkan di API).
CREATE TABLE IF NOT EXISTS sponsored_frames (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  status      ENUM('active','paused','ended') NOT NULL DEFAULT 'active',
  starts_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at     DATETIME NULL,
  impressions INT UNSIGNED NOT NULL DEFAULT 0,
  clicks      INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_sf_store (store_id, status),
  KEY idx_sf_product (product_id),
  CONSTRAINT fk_sf_store   FOREIGN KEY (store_id)   REFERENCES stores (id)   ON DELETE CASCADE,
  CONSTRAINT fk_sf_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. Permintaan pelanggan (leads) — kartu "Permintaan Terbaru"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id         BIGINT UNSIGNED NOT NULL,
  product_id       BIGINT UNSIGNED NULL,
  customer_name    VARCHAR(120) NOT NULL,
  customer_contact VARCHAR(60)  NULL,
  topic            VARCHAR(160) NOT NULL,
  message          TEXT NOT NULL,
  source           ENUM('whatsapp','phone','form') NOT NULL DEFAULT 'whatsapp',
  status           ENUM('new','responded','ignored','closed') NOT NULL DEFAULT 'new',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at     DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_leads_inbox (store_id, status, created_at),
  CONSTRAINT fk_leads_store   FOREIGN KEY (store_id)   REFERENCES stores (id)   ON DELETE CASCADE,
  CONSTRAINT fk_leads_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 8. Analitik
--    analytics_events = data mentah (tulis-berat). Job harian meringkasnya ke *_daily_stats,
--    lalu event > 90 hari boleh dihapus. Dashboard membaca *_daily_stats (cepat).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NULL,
  event_type  ENUM('store_view','product_view','vto_start','vto_capture','contact_click','link_click',
                   'wishlist_add','banner_impression','banner_click','sponsored_impression','sponsored_click') NOT NULL,
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
-- 9. Notifikasi
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
-- 10. View bantu untuk API
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
       p.max_active_banners,
       p.has_advanced_analytics,
       p.has_featured_store,
       p.has_sponsored_frame,
       s.next_billing_at,
       s.cancel_at_period_end
FROM stores st
JOIN subscriptions s ON s.user_id = st.user_id AND s.status = 'active'
JOIN plans p         ON p.id = s.plan_id;
