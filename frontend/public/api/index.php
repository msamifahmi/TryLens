<?php
// API katalog TryLens versi PHP + SQLite untuk hosting shared (tanpa Node.js).
// Kontrak SAMA dengan backend-node: /api/health, /api/catalog, /api/admin/*, /media/<id>/<berkas>, /admin.
// Hanya katalog TryLens (produk + toko). Akun/langganan Mitra tidak ada di sini → klien otomatis memakai mode demo untuk area Mitra.
// Data (database, unggahan, konfigurasi) disimpan DI LUAR public_html: <folder-domain>/trylens-data/ (bisa diganti env TRYLENS_DATA).
declare(strict_types=1);

const STYLES = ['aviator', 'round', 'square', 'cateye', 'rect', 'browline'];
const COLORS = ['brown', 'black', 'gold', 'tort', 'clear', 'blue', 'navy', 'red'];
const CATS = ['Pria', 'Wanita', 'Anak'];
const MAX_PHOTO = 5 * 1024 * 1024;
const MAX_GLB = 12 * 1024 * 1024;
const VARIANTS = ['main', 'side', 'detail', 'close'];
const PLATFORMS = [
    'tokopedia' => ['Tokopedia', ['tokopedia.com', 'tokopedia.link']],
    'shopee' => ['Shopee', ['shopee.co.id', 'shopee.com', 'shp.ee']],
    'lazada' => ['Lazada', ['lazada.co.id', 'lazada.com', 's.lazada.co.id']],
    'tiktokshop' => ['TikTok Shop', ['tiktok.com']],
    'website' => ['Website toko', null],
];
const SIZE_FIELDS = [
    'lensWidthMm' => ['Lebar lensa', 30, 70, 'lens_width_mm'], 'lensHeightMm' => ['Tinggi lensa', 20, 65, 'lens_height_mm'],
    'bridgeMm' => ['Lebar jembatan', 8, 30, 'bridge_mm'], 'templeMm' => ['Panjang gagang', 100, 160, 'temple_mm'],
    'frameWidthMm' => ['Lebar total frame', 100, 180, 'frame_width_mm'], 'weightG' => ['Berat (gram)', 1, 80, 'weight_g'],
];
const RIG_NODES = ['GlassesRoot', 'Bridge', 'LeftLensCenter', 'RightLensCenter', 'LeftTemple', 'RightTemple'];
const RIG_META = ['frameWidthMm', 'lensWidthMm', 'lensHeightMm', 'bridgeWidthMm', 'templeLengthMm', 'realWorldScale'];

class HttpErr extends Exception { public int $status; public function __construct(string $m, int $s = 400) { parent::__construct($m); $this->status = $s; } }

function out($data, int $status = 200, array $headers = []): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    foreach ($headers as $k => $v) header("$k: $v");
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $m, int $s = 400): never { out(['error' => $m], $s); }
function now(): string { return gmdate('Y-m-d\TH:i:s.000\Z'); }
function str($v, int $max): string { return is_string($v) ? mb_substr(trim($v), 0, $max) : ''; }
function b01($v): int { return ($v === true || $v === 1 || $v === '1' || $v === 'true') ? 1 : 0; }
function has(array $a, string $k): bool { return array_key_exists($k, $a); }

/* ------------------------------------------------------------------ lokasi data & konfigurasi */
$DATA = getenv('TRYLENS_DATA') ?: dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__)) . '/trylens-data';
if (!is_dir($DATA) && !@mkdir($DATA, 0750, true)) fail("Folder data tidak bisa dibuat: $DATA", 500);
$UPLOADS = "$DATA/uploads";
$cfg = is_file("$DATA/config.php") ? (array)(include "$DATA/config.php") : [];
$ADMIN_TOKEN = (string)($cfg['adminToken'] ?? getenv('ADMIN_TOKEN') ?: '');

/* ------------------------------------------------------------------ basis data */
function db(): PDO {
    global $DATA;
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) fail('Ekstensi pdo_sqlite tidak aktif di PHP hosting ini.', 500);
    $pdo = new PDO('sqlite:' . $DATA . '/trylens.db', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS merchants (id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', province TEXT NOT NULL DEFAULT '', initials TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#427AB5', whatsapp TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', link_instagram TEXT, link_x TEXT, link_tokopedia TEXT, link_shopee TEXT,
      published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL REFERENCES merchants(id), name TEXT NOT NULL, style TEXT NOT NULL, color_key TEXT NOT NULL, category TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price > 0), old_price INTEGER CHECK (old_price IS NULL OR old_price > price), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), description TEXT NOT NULL DEFAULT '',
      buy_tokopedia TEXT, buy_shopee TEXT, buy_lazada TEXT, buy_tiktokshop TEXT, buy_website TEXT,
      lens_width_mm REAL, lens_height_mm REAL, bridge_mm REAL, temple_mm REAL, frame_width_mm REAL, weight_g REAL, material TEXT,
      vto INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1, photos INTEGER NOT NULL DEFAULT 0, has_model INTEGER NOT NULL DEFAULT 0, rig TEXT,
      media_v INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
    CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('hero','topbar','login')), image TEXT, image_v INTEGER NOT NULL DEFAULT 0, headline TEXT NOT NULL, sub TEXT NOT NULL DEFAULT '',
      cta TEXT NOT NULL DEFAULT '', action TEXT NOT NULL DEFAULT 'feed', link TEXT, theme TEXT NOT NULL DEFAULT 'blue', illustration TEXT NOT NULL DEFAULT 'face',
      sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_fails (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS flash_items (product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE, price INTEGER NOT NULL CHECK (price > 0),
      quota INTEGER NOT NULL CHECK (quota > 0), sold INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stats (day TEXT NOT NULL, kind TEXT NOT NULL, product_id TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, product_id));
    CREATE TABLE IF NOT EXISTS stat_rl (ip TEXT PRIMARY KEY, win INTEGER NOT NULL, n INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS stats_hour (day TEXT NOT NULL, hour INTEGER NOT NULL, kind TEXT NOT NULL, product_id TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, hour, kind, product_id));
    ");
    migrate_v43($pdo);
    seed_if_empty($pdo);
    migrate_banners($pdo);
    seed_banners($pdo);
    apply_catalog_update($pdo);
    seed_flash($pdo);
    return $pdo;
}

/** Katalog bawaan (6 toko + 24 produk) dimasukkan SEKALI saat basis data baru dibuat (seed.json dibuat `npm run gen-seed`). */
function seed_if_empty(PDO $pdo): void {
    if ($pdo->query("SELECT 1 FROM counters WHERE name='seeded'")->fetch()) return;
    $f = __DIR__ . '/seed.json';
    $seed = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    $t = now();
    $pdo->beginTransaction();
    if (is_array($seed)) {
        $m = $pdo->prepare('INSERT OR IGNORE INTO merchants(id,name,city,province,initials,color,whatsapp,phone,link_instagram,link_x,link_tokopedia,link_shopee,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)');
        foreach ($seed['merchants'] ?? [] as $x) $m->execute([$x['id'], $x['name'], $x['city'], $x['province'] ?? '', $x['initials'], $x['color'], $x['whatsapp'] ?? '', $x['phone'] ?? '', $x['links']['instagram'] ?? null, $x['links']['x'] ?? null, $x['links']['tokopedia'] ?? null, $x['links']['shopee'] ?? null, $t, $t]);
        $p = $pdo->prepare("INSERT OR IGNORE INTO products(id,merchant_id,name,style,color_key,category,price,old_price,stock,description,vto,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,10,'',?,1,?,?)");
        foreach ($seed['products'] ?? [] as $x) $p->execute([$x['id'], $x['merchantId'], $x['name'], $x['style'], $x['colorKey'], $x['cat'], $x['price'], $x['oldPrice'] ?? null, !empty($x['vto']) ? 1 : 0, $t, $t]);
    }
    $pdo->exec("INSERT OR IGNORE INTO counters(name,value) VALUES('seeded',1)");
    $pdo->commit();
}

/**
 * Pembaruan katalog sekali-jalan: file `katalog-update.json` (di samping index.html) diterapkan otomatis SEKALI per nomor `version`
 * (dicatat di tabel counters), lewat validasi yang sama dengan admin. Setelah itu perubahan di /admin tidak ditimpa lagi.
 * Naikkan `version` di file itu bila ingin menerapkan ulang. Tombol "Terapkan katalog" di /admin tetap bisa dipakai manual.
 */
function apply_catalog_update(PDO $pdo): void {
    $f = dirname(__DIR__) . '/katalog-update.json';
    if (!is_file($f)) return;
    $u = json_decode((string)file_get_contents($f), true);
    if (!is_array($u)) return;
    $counter = function (string $name) use ($pdo): int { $r = $pdo->query("SELECT value FROM counters WHERE name=" . $pdo->quote($name))->fetch(); return $r ? (int)$r['value'] : 0; };
    $mark = fn(string $name, int $v) => $pdo->prepare("INSERT INTO counters(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value")->execute([$name, $v]);
    // 1) Tambalan produk (nama, kategori, tautan, dst.): sekali per `version`.
    foreach ([['products', 'version', 'katalog_update'], ['products2', 'version2', 'katalog_update2']] as [$pk, $vk, $ck]) {
    $v = (int)($u[$vk] ?? 0);
    if (is_array($u[$pk] ?? null) && $v >= 1 && $counter($ck) < $v) {
        $pdo->beginTransaction();
        try {
            foreach ($u[$pk] as $x) {
                $id = (string)($x['id'] ?? '');
                $q = $pdo->prepare('SELECT * FROM products WHERE id=?'); $q->execute([$id]); $prev = $q->fetch();
                if (!$prev) continue;
                unset($x['id']);
                try { $o = clean_product($x, $prev); } catch (HttpErr $e) { continue; }
                $pdo->prepare('UPDATE products SET ' . implode(',', array_map(fn($c) => "$c=?", PCOLS)) . ',updated_at=? WHERE id=?')
                    ->execute(array_merge(array_map(fn($c) => $o[$c] ?? null, PCOLS), [now(), $id]));
            }
            $mark($ck, $v);
            $pdo->commit();
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); }
    }
    }
    // 2) Deskripsi: sekali per `descriptionsVersion`, hanya mengisi produk yang deskripsinya masih kosong (tulisan admin tidak ditimpa).
    $dv = (int)($u['descriptionsVersion'] ?? 0);
    if (is_array($u['descriptions'] ?? null) && $dv >= 1 && $counter('katalog_desc') < $dv) {
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare("UPDATE products SET description=?, updated_at=? WHERE id=? AND (description IS NULL OR description='')");
            foreach ($u['descriptions'] as $id => $t) { $t = str((string)$t, 800); if ($t !== '') $st->execute([$t, now(), (string)$id]); }
            $mark('katalog_desc', $dv);
            $pdo->commit();
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); }
    }
}

/**
 * Isi awal Flash Sale (Update 44): SEKALI, hanya bila daftar Flash Sale masih kosong — supaya section Flash Sale tidak hilang
 * setelah pindah ke Flash Sale yang diatur admin. Mengosongkan daftar lewat /admin setelahnya tidak memunculkannya lagi.
 */
function seed_flash(PDO $pdo): void {
    if ($pdo->query("SELECT 1 FROM counters WHERE name='flash_seeded'")->fetch()) return;
    $f = __DIR__ . '/seed.json';
    $seed = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    $empty = !$pdo->query('SELECT 1 FROM flash_items LIMIT 1')->fetch();
    if ($empty && is_array($seed['flash'] ?? null)) {
        $t = now();
        $get = $pdo->prepare('SELECT price FROM products WHERE id=?');
        $q = $pdo->prepare('INSERT OR IGNORE INTO flash_items(product_id,price,quota,sold,active,created_at,updated_at) VALUES(?,?,?,?,1,?,?)');
        foreach ($seed['flash'] as $x) {
            $get->execute([(string)$x['id']]); $reg = (int)($get->fetchColumn() ?: 0);
            $pct = min(90, max(1, (int)($x['pct'] ?? 20)));
            $price = (int)(round($reg * (100 - $pct) / 100 / 1000) * 1000);
            if ($reg <= 0 || $price < 1000 || $price >= $reg) continue;
            $quota = max(1, (int)($x['quota'] ?? 40)); $sold = min($quota - 1, max(0, (int)($x['sold'] ?? 0)));
            $q->execute([(string)$x['id'], $price, $quota, $sold, $t, $t]);
        }
    }
    $pdo->exec("INSERT OR IGNORE INTO counters(name,value) VALUES('flash_seeded',1)");
}
/** Update 43: kolom Highlighted Brand (tanggal terakhir tayang, zona WIB) di toko. Aman dijalankan berulang. */
function migrate_v43(PDO $pdo): void {
    $cols = array_column($pdo->query('PRAGMA table_info(merchants)')->fetchAll(), 'name');
    if (!in_array('highlight_until', $cols, true)) $pdo->exec('ALTER TABLE merchants ADD COLUMN highlight_until TEXT');
}
/** Tanggal hari ini menurut WIB (UTC+7), format YYYY-MM-DD. */
function today_wib(int $offsetDays = 0): string { return gmdate('Y-m-d', time() + 7 * 3600 + $offsetDays * 86400); }
function valid_day(string $d): bool { return (bool)preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m) && checkdate((int)$m[2], (int)$m[3], (int)$m[1]); }

const BANNER_ACTIONS = ['try', 'merchant', 'feed', 'promo', 'link', 'none'];
const BANNER_KINDS = ['hero', 'topbar', 'login'];
/** DB lama (PR #13) punya tabel banners tanpa jenis 'login' dan tanpa kolom gambar: bangun ulang sambil menyalin isinya. */
function migrate_banners(PDO $pdo): void {
    $sql = (string)$pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='banners'")->fetchColumn();
    if ($sql === '' || str_contains($sql, "'login'")) return;
    $pdo->beginTransaction();
    try {
        $pdo->exec('ALTER TABLE banners RENAME TO banners_old');
        $pdo->exec("CREATE TABLE banners (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('hero','topbar','login')), image TEXT, image_v INTEGER NOT NULL DEFAULT 0, headline TEXT NOT NULL, sub TEXT NOT NULL DEFAULT '',
          cta TEXT NOT NULL DEFAULT '', action TEXT NOT NULL DEFAULT 'feed', link TEXT, theme TEXT NOT NULL DEFAULT 'blue', illustration TEXT NOT NULL DEFAULT 'face',
          sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
        $pdo->exec('INSERT INTO banners(id,kind,headline,sub,cta,action,link,theme,illustration,sort,published,created_at,updated_at) SELECT id,kind,headline,sub,cta,action,link,theme,illustration,sort,published,created_at,updated_at FROM banners_old');
        $pdo->exec('DROP TABLE banners_old');
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); error_log('trylens: migrasi banners gagal: ' . $e->getMessage()); }
}
const BANNER_THEMES = ['blue', 'navy', 'sky', 'gold'];
const BANNER_ILLUS = ['face', 'collection', 'compare', 'promo'];
/** Iklan bawaan (4 slide beranda + 1 teks atas) dimasukkan SEKALI; menghapus semuanya lewat admin tidak memunculkannya lagi. */
function seed_banners(PDO $pdo): void {
    if ($pdo->query("SELECT 1 FROM counters WHERE name='banners_seeded'")->fetch()) return;
    $t = now();
    $rows = [
        ['hero', 'Coba Kacamata Sebelum Beli', 'Lihat langsung bagaimana frame terlihat di wajahmu dengan virtual try-on.', 'Coba Sekarang', 'try', null, 'blue', 'face'],
        ['hero', 'Ribuan Frame dari Optik Lokal', 'Temukan pilihan frame dari toko optik dan UMKM di kotamu.', 'Jelajahi Toko', 'merchant', null, 'navy', 'collection'],
        ['hero', 'Temukan Frame yang Cocok untukmu', 'Bandingkan gaya, bentuk, dan harga dalam satu tempat.', 'Mulai Eksplorasi', 'feed', null, 'sky', 'compare'],
        ['hero', 'Promo Frame Pilihan', 'Temukan penawaran menarik dari merchant TryLens.', 'Lihat Promo', 'promo', null, 'gold', 'promo'],
        ['topbar', 'Coba kacamata secara virtual — gratis, tanpa install aplikasi', '', '', 'feed', null, 'blue', 'face'],
    ];
    $pdo->beginTransaction();
    $q = $pdo->prepare('INSERT INTO banners(kind,headline,sub,cta,action,link,theme,illustration,sort,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)');
    foreach ($rows as $i => $r) $q->execute([$r[0], $r[1], $r[2], $r[3], $r[4], $r[5], $r[6], $r[7], $i + 1, $t, $t]);
    $pdo->exec("INSERT OR IGNORE INTO counters(name,value) VALUES('banners_seeded',1)");
    $pdo->commit();
}
function banner_out(array $r): array {
    return ['id' => (int)$r['id'], 'kind' => $r['kind'], 'image' => $r['image'] ? '/media/banner/' . (int)$r['id'] . '.' . $r['image'] . '?v=' . (int)$r['image_v'] : null, 'headline' => $r['headline'], 'sub' => $r['sub'], 'cta' => $r['cta'], 'action' => $r['action'], 'link' => $r['link'],
        'theme' => $r['theme'], 'illustration' => $r['illustration'], 'sort' => (int)$r['sort'], 'published' => (bool)$r['published'], 'updatedAt' => $r['updated_at']];
}
/** Tautan iklan: alamat dalam situs ("/…") atau https penuh. */
function clean_banner_link($v): ?string {
    $v = trim((string)$v); if ($v === '' || strlen($v) > 300) return null;
    if ($v[0] === '/' && !str_starts_with($v, '//') && !preg_match('/[\s\\\\]/', $v)) return $v;
    $u = parse_url($v);
    return ($u && ($u['scheme'] ?? '') === 'https' && !empty($u['host']) && !preg_match('/\s/', $v)) ? $v : null;
}
function clean_banner(array $b, ?array $prev): array {
    $o = $prev ?? ['kind' => 'hero', 'headline' => '', 'sub' => '', 'cta' => '', 'action' => 'feed', 'link' => null, 'theme' => 'blue', 'illustration' => 'face', 'sort' => 0, 'published' => 1];
    $need = function (bool $c, string $m) { if (!$c) throw new HttpErr($m); };
    if (!$prev && has($b, 'kind')) $o['kind'] = (string)$b['kind'];
    $need(in_array($o['kind'], BANNER_KINDS, true), 'Jenis iklan tidak dikenal.');
    if (has($b, 'headline')) $o['headline'] = str($b['headline'], $o['kind'] === 'topbar' ? 140 : 80);
    $need(mb_strlen($o['headline']) >= 3, 'Judul iklan minimal 3 karakter.');
    if (has($b, 'sub')) $o['sub'] = str($b['sub'], 160);
    if (has($b, 'cta')) $o['cta'] = str($b['cta'], 24);
    if (has($b, 'action')) $o['action'] = (string)$b['action'];
    $need(in_array($o['action'], BANNER_ACTIONS, true), 'Aksi tombol tidak dikenal.');
    if (has($b, 'link')) { $l = trim((string)$b['link']); $o['link'] = $l === '' ? null : clean_banner_link($l); $need($l === '' || $o['link'] !== null, 'Tautan harus berupa alamat dalam situs (mis. /merchant) atau https penuh.'); }
    $need($o['action'] !== 'link' || $o['link'], 'Aksi "Buka tautan" memerlukan tautan.');
    if (has($b, 'theme')) $o['theme'] = (string)$b['theme'];
    $need(in_array($o['theme'], BANNER_THEMES, true), 'Warna latar tidak dikenal.');
    if (has($b, 'illustration')) $o['illustration'] = (string)$b['illustration'];
    $need(in_array($o['illustration'], BANNER_ILLUS, true), 'Gambar ilustrasi tidak dikenal.');
    if (has($b, 'sort')) $o['sort'] = (int)$b['sort'];
    if (has($b, 'published')) $o['published'] = b01($b['published']);
    return $o;
}

/* ------------------------------------------------------------------ validasi */
function host_ok(string $host, ?array $allowed): bool {
    if (!$allowed) return true;
    foreach ($allowed as $h) if ($host === $h || str_ends_with($host, ".$h")) return true;
    return false;
}
function clean_url(?array $hosts, $raw): ?string {
    $v = trim((string)$raw);
    if ($v === '' || strlen($v) > 300) return null;
    if (!preg_match('~^https?://~i', $v)) $v = "https://$v";
    $u = parse_url($v);
    if (!$u || strtolower($u['scheme'] ?? '') !== 'https' || empty($u['host']) || !host_ok(strtolower($u['host']), $hosts)) return null;
    return $v;
}
function merchant_out(array $r): array {
    $links = [];
    foreach (['instagram', 'x', 'tokopedia', 'shopee'] as $k) if (!empty($r["link_$k"])) $links[$k] = $r["link_$k"];
    return ['id' => $r['id'], 'name' => $r['name'], 'city' => $r['city'], 'province' => $r['province'], 'initials' => $r['initials'], 'color' => $r['color'], 'whatsapp' => $r['whatsapp'], 'phone' => $r['phone'],
        'links' => (object)$links, 'published' => (bool)$r['published'], 'highlightUntil' => $r['highlight_until'] ?? null, 'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at']];
}
function clean_merchant(array $b, ?array $prev): array {
    $o = $prev ?? ['color' => '#427AB5', 'published' => 1, 'city' => '', 'province' => '', 'whatsapp' => '', 'phone' => '', 'initials' => '', 'name' => '',
        'link_instagram' => null, 'link_x' => null, 'link_tokopedia' => null, 'link_shopee' => null, 'highlight_until' => null];
    if (has($b, 'name')) $o['name'] = str($b['name'], 80);
    if (mb_strlen($o['name']) < 2) throw new HttpErr('Nama toko minimal 2 karakter.');
    foreach (['city' => 80, 'province' => 60, 'phone' => 30] as $k => $max) if (has($b, $k)) $o[$k] = str($b[$k], $max);
    if (has($b, 'whatsapp')) {
        $w = preg_replace('/\D/', '', (string)$b['whatsapp']);
        $w = preg_replace('/^0/', '62', $w);
        if ($w !== '' && !preg_match('/^62\d{8,13}$/', $w)) throw new HttpErr('WhatsApp harus nomor Indonesia (mis. 6281234567890).');
        $o['whatsapp'] = $w;
    }
    if (has($b, 'color')) {
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', (string)$b['color'])) throw new HttpErr('Warna harus berbentuk #RRGGBB.');
        $o['color'] = $b['color'];
    }
    if (has($b, 'initials')) $o['initials'] = strtoupper(str($b['initials'], 3));
    if ($o['initials'] === '') { $o['initials'] = ''; foreach (preg_split('/\s+/', $o['name']) as $w) $o['initials'] .= mb_substr($w, 0, 1); $o['initials'] = strtoupper(mb_substr($o['initials'], 0, 2)); }
    if (isset($b['links']) && is_array($b['links'])) {
        $hosts = ['instagram' => ['instagram.com'], 'x' => ['x.com', 'twitter.com'], 'tokopedia' => PLATFORMS['tokopedia'][1], 'shopee' => PLATFORMS['shopee'][1]];
        foreach ($hosts as $k => $h) {
            if (!has($b['links'], $k)) continue;
            if (!$b['links'][$k]) { $o["link_$k"] = null; continue; }
            $u = clean_url($h, $b['links'][$k]);
            if (!$u) throw new HttpErr("Tautan $k tidak valid (harus https dan domain yang sesuai).");
            $o["link_$k"] = $u;
        }
    }
    if (has($b, 'highlightUntil')) {
        $h = trim((string)($b['highlightUntil'] ?? ''));
        if ($h !== '' && !valid_day($h)) throw new HttpErr('Tanggal Highlighted Brand tidak valid (YYYY-MM-DD).');
        $o['highlight_until'] = $h === '' ? null : $h;
    }
    if (has($b, 'published')) $o['published'] = b01($b['published']);
    return $o;
}
function product_out(array $r): array {
    $buy = []; $size = [];
    foreach (PLATFORMS as $k => $_) if (!empty($r["buy_$k"])) $buy[$k] = $r["buy_$k"];
    foreach (SIZE_FIELDS as $k => $d) if ($r[$d[3]] !== null) $size[$k] = $r[$d[3]] + 0;
    if (!empty($r['material'])) $size['material'] = $r['material'];
    return ['id' => $r['id'], 'merchantId' => $r['merchant_id'], 'name' => $r['name'], 'style' => $r['style'], 'colorKey' => $r['color_key'], 'category' => $r['category'],
        'price' => (int)$r['price'], 'oldPrice' => $r['old_price'] === null ? null : (int)$r['old_price'], 'stock' => (int)$r['stock'], 'description' => $r['description'],
        'buy' => (object)$buy, 'size' => $size ? $size : null, 'vto' => (bool)$r['vto'], 'published' => (bool)$r['published'], 'photos' => (int)$r['photos'], 'hasModel' => (bool)$r['has_model'],
        'rig' => $r['rig'] ? json_decode($r['rig'], true) : null, 'mediaV' => (int)$r['media_v'], 'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at']];
}
function clean_product(array $b, ?array $prev): array {
    $o = $prev ?? ['stock' => 10, 'description' => '', 'vto' => 0, 'published' => 1, 'old_price' => null, 'name' => '', 'merchant_id' => '', 'style' => '', 'color_key' => '', 'category' => '', 'price' => 0, 'material' => null];
    foreach (PLATFORMS as $k => $_) $o["buy_$k"] ??= null;
    foreach (SIZE_FIELDS as $d) $o[$d[3]] ??= null;
    $need = function (bool $c, string $m) { if (!$c) throw new HttpErr($m); };
    if (has($b, 'name')) $o['name'] = str($b['name'], 80);
    $need(mb_strlen($o['name']) >= 2, 'Nama produk minimal 2 karakter.');
    if (has($b, 'merchantId')) $o['merchant_id'] = (string)$b['merchantId'];
    $q = db()->prepare('SELECT 1 FROM merchants WHERE id=?'); $q->execute([$o['merchant_id']]);
    $need($o['merchant_id'] !== '' && (bool)$q->fetch(), 'Toko (merchantId) tidak ditemukan.');
    if (has($b, 'style')) $o['style'] = $b['style'];
    $need(in_array($o['style'], STYLES, true), 'Gaya tidak dikenal. Pilih: ' . implode(', ', STYLES) . '.');
    if (has($b, 'colorKey')) $o['color_key'] = $b['colorKey'];
    $need(in_array($o['color_key'], COLORS, true), 'Warna tidak dikenal. Pilih: ' . implode(', ', COLORS) . '.');
    if (has($b, 'category')) $o['category'] = $b['category'];
    $need(in_array($o['category'], CATS, true), 'Kategori tidak dikenal. Pilih: ' . implode(', ', CATS) . '.');
    if (has($b, 'price')) $o['price'] = (int)round((float)$b['price']);
    $need($o['price'] >= 1000 && $o['price'] <= 100000000, 'Harga tidak valid (1.000–100.000.000).');
    if (has($b, 'oldPrice')) $o['old_price'] = $b['oldPrice'] ? (int)round((float)$b['oldPrice']) : null;
    $need($o['old_price'] === null || $o['old_price'] > $o['price'], 'Harga coret harus lebih besar dari harga jual.');
    if (has($b, 'stock')) { $need(is_numeric($b['stock']), 'Stok tidak valid.'); $o['stock'] = (int)round((float)$b['stock']); }
    $need($o['stock'] >= 0 && $o['stock'] <= 99999, 'Stok tidak valid.');
    if (has($b, 'description')) $o['description'] = str($b['description'], 800);
    if (isset($b['buy']) && is_array($b['buy'])) foreach (PLATFORMS as $k => $p) {
        if (!has($b['buy'], $k)) continue;
        if (!$b['buy'][$k]) { $o["buy_$k"] = null; continue; }
        $u = clean_url($p[1], $b['buy'][$k]);
        $need($u !== null, "Tautan {$p[0]} tidak valid" . ($p[1] ? " (https dan domain {$p[1][0]})." : ' (harus https).'));
        $o["buy_$k"] = $u;
    }
    if (has($b, 'size')) {
        foreach (SIZE_FIELDS as $d) $o[$d[3]] = null;
        $o['material'] = null;
        if (is_array($b['size'])) {
            foreach (SIZE_FIELDS as $k => $d) {
                $v = $b['size'][$k] ?? null;
                if ($v === null || $v === '') continue;
                $n = round((float)$v * 10) / 10;
                $need(is_numeric($v) && $n >= $d[1] && $n <= $d[2], "{$d[0]} harus antara {$d[1]} dan {$d[2]}.");
                $o[$d[3]] = $n;
            }
            $mat = str($b['size']['material'] ?? '', 60);
            if ($mat !== '') $o['material'] = $mat;
        }
    }
    if (has($b, 'vto')) $o['vto'] = b01($b['vto']);
    if (has($b, 'published')) $o['published'] = b01($b['published']);
    return $o;
}
const PCOLS = ['merchant_id', 'name', 'style', 'color_key', 'category', 'price', 'old_price', 'stock', 'description', 'buy_tokopedia', 'buy_shopee', 'buy_lazada', 'buy_tiktokshop', 'buy_website',
    'lens_width_mm', 'lens_height_mm', 'bridge_mm', 'temple_mm', 'frame_width_mm', 'weight_g', 'material', 'vto', 'published'];

/* ------------------------------------------------------------------ berkas */
function is_jpeg(string $b): bool { return strlen($b) > 4 && ord($b[0]) === 0xFF && ord($b[1]) === 0xD8 && ord($b[2]) === 0xFF; }
function inspect_glb(string $buf): array {
    $f = fn($e) => ['ok' => false, 'error' => $e];
    $n = strlen($buf);
    if ($n < 20) return $f('Berkas terlalu kecil untuk .glb');
    if ($n > MAX_GLB) return $f('Ukuran .glb melebihi ' . (int)(MAX_GLB / 1048576) . ' MB');
    $u = fn($o) => unpack('V', substr($buf, $o, 4))[1];
    if ($u(0) !== 0x46546c67) return $f('Bukan berkas .glb (header glTF tidak ditemukan)');
    if ($u(4) !== 2) return $f('Hanya glTF 2.0 yang didukung');
    if ($u(8) !== $n) return $f('Panjang berkas tidak cocok dengan header (berkas terpotong?)');
    $jl = $u(12);
    if ($u(16) !== 0x4e4f534a || 20 + $jl > $n) return $f('Chunk JSON glTF rusak');
    $g = json_decode(substr($buf, 20, $jl), true);
    if (!is_array($g)) return $f('JSON glTF tidak dapat dibaca');
    if (empty($g['meshes']) || !is_array($g['meshes'])) return $f('Model tidak berisi mesh');
    $nodes = $g['nodes'] ?? [];
    $names = array_filter(array_map(fn($x) => $x['name'] ?? null, $nodes));
    $missing = array_values(array_diff(RIG_NODES, $names));
    $meta = null;
    foreach ($nodes as $x) if (($x['name'] ?? '') === 'GlassesRoot') { $meta = $x['extras']['trylens'] ?? null; break; }
    $metaMissing = $meta ? array_values(array_filter(RIG_META, fn($k) => !((float)($meta[$k] ?? 0) > 0))) : RIG_META;
    $complete = !$missing && !$metaMissing;
    return ['ok' => true, 'rig' => ['complete' => $complete, 'state' => $complete ? 'ok' : (count($missing) === count(RIG_NODES) && !$meta ? 'none' : 'partial'), 'missingNodes' => $missing, 'missingMeta' => $metaMissing,
        'meta' => $meta, 'nodeCount' => count($nodes), 'size' => $n, 'frameWidthMm' => $meta ? ((float)($meta['frameWidthMm'] ?? 0) ?: null) : null],
        'warnings' => $complete ? [] : ['Rig TryLens tidak lengkap: Coba Virtual memakai penempatan cadangan (kurang akurat).']];
}
function banner_file(int $id, string $ext): string { global $UPLOADS; return "$UPLOADS/_banner/$id.$ext"; }
/** Jenis gambar dari byte awal berkas (bukan dari nama): jpg | png | webp | null. */
function image_ext(string $b): ?string {
    if (strlen($b) > 12 && str_starts_with($b, "\xFF\xD8\xFF")) return 'jpg';
    if (str_starts_with($b, "\x89PNG\r\n\x1A\n")) return 'png';
    if (strlen($b) > 12 && substr($b, 0, 4) === 'RIFF' && substr($b, 8, 4) === 'WEBP') return 'webp';
    return null;
}
function pdir(string $id): string { global $UPLOADS; return "$UPLOADS/$id"; }
function count_photos(string $id): int { $n = 0; while ($n < 4 && is_file(pdir($id) . '/' . VARIANTS[$n] . '.jpg')) $n++; return $n; }
function refresh_media(string $id, ?array $rig, bool $rigGiven): void {
    $hasModel = is_file(pdir($id) . '/model.glb') ? 1 : 0;
    $cur = db()->prepare('SELECT rig FROM products WHERE id=?'); $cur->execute([$id]);
    $rigJson = !$hasModel ? null : ($rigGiven ? ($rig ? json_encode($rig) : null) : ($cur->fetch()['rig'] ?? null));
    db()->prepare('UPDATE products SET photos=?, has_model=?, rig=?, media_v=media_v+1, updated_at=? WHERE id=?')->execute([count_photos($id), $hasModel, $rigJson, now(), $id]);
    if ($hasModel && $rig) db()->prepare('UPDATE products SET vto=1 WHERE id=?')->execute([$id]);
    if (!$hasModel) db()->prepare('UPDATE products SET vto=0 WHERE id=?')->execute([$id]);
}
function rrmdir(string $d): void { if (!is_dir($d)) return; foreach (scandir($d) as $f) if ($f !== '.' && $f !== '..') { $p = "$d/$f"; is_dir($p) ? rrmdir($p) : @unlink($p); } @rmdir($d); }

/* ------------------------------------------------------------------ flash sale (pengaturan acara dari admin; frame didaftarkan Mitra) */
const FLASH_THEMES = ['brand', 'sunset', 'ocean', 'berry', 'midnight'];
function flash_defaults(): array { return ['enabled' => true, 'title' => 'Flash Sale', 'subtitle' => 'Diskon kilat frame pilihan dari optik lokal', 'theme' => 'brand', 'endsAt' => null, 'minDiscount' => 10, 'maxPerMerchant' => 4]; }
function flash_get(): array {
    $r = db()->query("SELECT v FROM settings WHERE k='flash_sale'")->fetchColumn();
    $j = $r ? json_decode((string)$r, true) : null;
    return array_merge(flash_defaults(), is_array($j) ? $j : []);
}
function flash_clean(array $b, array $prev): array {
    $o = $prev; $need = function (bool $c, string $m) { if (!$c) throw new HttpErr($m); };
    if (has($b, 'enabled')) $o['enabled'] = $b['enabled'] === true || $b['enabled'] === 1 || $b['enabled'] === '1' || $b['enabled'] === 'true';
    if (has($b, 'title')) $o['title'] = str($b['title'], 40);
    $need(mb_strlen($o['title']) >= 3, 'Judul flash sale minimal 3 karakter.');
    if (has($b, 'subtitle')) $o['subtitle'] = str($b['subtitle'], 100);
    if (has($b, 'theme')) $o['theme'] = (string)$b['theme'];
    $need(in_array($o['theme'], FLASH_THEMES, true), 'Tema warna tidak dikenal.');
    if (has($b, 'endsAt')) {
        $e = $b['endsAt'];
        if ($e === null || $e === '') $o['endsAt'] = null;
        else { $t = is_string($e) ? strtotime($e) : false; $need($t !== false, 'Waktu berakhir tidak valid.'); $o['endsAt'] = gmdate('c', $t); }
    }
    if (has($b, 'minDiscount')) { $v = $b['minDiscount']; $need(is_numeric($v) && $v >= 0 && $v <= 90, 'Diskon minimum 0–90%.'); $o['minDiscount'] = (int)$v; }
    if (has($b, 'maxPerMerchant')) { $v = $b['maxPerMerchant']; $need(is_numeric($v) && $v >= 1 && $v <= 20, 'Batas frame per toko 1–20.'); $o['maxPerMerchant'] = (int)$v; }
    return $o;
}

/**
 * Frame Flash Sale yang diatur admin (tabel flash_items). Setiap baris diberi status `live` + alasan bila tidak tayang,
 * supaya admin tahu PERSIS kenapa sebuah frame tidak muncul. Urutan: kuota paling banyak terpakai dulu.
 */
function flash_rows(): array {
    $cfg = flash_get();
    $rows = db()->query('SELECT f.*, p.price AS regular, p.name, p.merchant_id, p.published AS ppub, m.published AS mpub FROM flash_items f
        JOIN products p ON p.id=f.product_id JOIN merchants m ON m.id=p.merchant_id')->fetchAll();
    usort($rows, fn($a, $b) => ($b['sold'] / $b['quota'] <=> $a['sold'] / $a['quota']) ?: strcmp($a['created_at'], $b['created_at']));
    $perM = []; $out = [];
    foreach ($rows as $r) {
        $pct = $r['price'] < $r['regular'] ? (int)round((1 - $r['price'] / $r['regular']) * 100) : 0;
        $why = null;
        if (!$cfg['enabled']) $why = 'Flash Sale sedang dimatikan';
        elseif (!$r['active']) $why = 'Dinonaktifkan';
        elseif (!$r['ppub'] || !$r['mpub']) $why = 'Produk atau tokonya disembunyikan';
        elseif ($r['price'] >= $r['regular']) $why = 'Harga kilat tidak lebih murah dari harga normal';
        elseif ($pct < $cfg['minDiscount']) $why = "Diskon $pct% di bawah minimum {$cfg['minDiscount']}%";
        elseif ($r['sold'] >= $r['quota']) $why = 'Kuota habis';
        elseif (($perM[$r['merchant_id']] ?? 0) >= $cfg['maxPerMerchant']) $why = "Melebihi batas {$cfg['maxPerMerchant']} frame per toko";
        if ($why === null) $perM[$r['merchant_id']] = ($perM[$r['merchant_id']] ?? 0) + 1;
        $out[] = ['productId' => $r['product_id'], 'name' => $r['name'], 'merchantId' => $r['merchant_id'], 'price' => (int)$r['price'], 'regular' => (int)$r['regular'], 'pct' => $pct,
            'quota' => (int)$r['quota'], 'sold' => (int)$r['sold'], 'active' => (bool)$r['active'], 'live' => $why === null, 'reason' => $why, 'updatedAt' => $r['updated_at']];
    }
    return $out;
}
function flash_item_clean(array $b, ?array $prev, int $regular): array {
    $o = $prev ? ['price' => (int)$prev['price'], 'quota' => (int)$prev['quota'], 'sold' => (int)$prev['sold'], 'active' => (int)$prev['active']] : ['price' => 0, 'quota' => 20, 'sold' => 0, 'active' => 1];
    $need = function (bool $c, string $m) { if (!$c) throw new HttpErr($m); };
    if (has($b, 'price')) { $need(is_numeric($b['price']), 'Harga kilat tidak valid.'); $o['price'] = (int)round((float)$b['price']); }
    $need($o['price'] >= 1000, 'Harga kilat minimal Rp1.000.');
    $need($o['price'] * 10 >= $regular, 'Harga kilat terlalu murah (diskon lebih dari 90%). Periksa lagi jumlah angka nolnya.');
    $need($o['price'] < $regular, 'Harga kilat harus lebih murah dari harga normal (Rp' . number_format($regular, 0, ',', '.') . ').');
    if (has($b, 'quota')) { $need(is_numeric($b['quota']), 'Kuota tidak valid.'); $o['quota'] = (int)$b['quota']; }
    $need($o['quota'] >= 1 && $o['quota'] <= 9999, 'Kuota 1–9.999.');
    if (has($b, 'sold')) { $need(is_numeric($b['sold']), 'Jumlah terjual tidak valid.'); $o['sold'] = (int)$b['sold']; }
    $need($o['sold'] >= 0 && $o['sold'] <= $o['quota'], 'Jumlah terjual harus 0 sampai kuota.');
    if (has($b, 'active')) $o['active'] = b01($b['active']);
    return $o;
}

/* ------------------------------------------------------------------ statistik pengunjung (angka harian teragregasi, tanpa data pribadi) */
const EVENT_KINDS = ['visit', 'view', 'try', 'buy', 'contact'];
/** Update 45: kejadian tambahan untuk analitik Mitra. 'store' = halaman toko dibuka (product_id berisi id toko). */
const EXTRA_KINDS = ['store', 'capture', 'wish'];
const ALL_KINDS = ['visit', 'view', 'try', 'buy', 'contact', 'store', 'capture', 'wish'];
const STAT_DAYS = [1, 3, 7, 30, 60, 90];

/* ---- data contoh presentasi (Update 46) ----------------------------------------------------------------------
 * TIDAK disimpan di database: dihitung deterministik dari (tanggal, id frame/toko) setiap kali diminta, lalu
 * DIJUMLAHKAN ke angka nyata. Jadi angka selalu "bergulir" mengikuti hari ini dan tetap bertambah +1 saat ada pengunjung.
 * Dimatikan/dinyalakan di /admin → Ringkasan (settings.demo_stats, bawaan: nyala). Rumus identik dengan
 * backend-node/src/demoStats.js (diuji paritas). */
function demo_on(): bool { $v = db()->query("SELECT v FROM settings WHERE k='demo_stats'")->fetchColumn(); return $v === false ? true : $v === '1'; }
function h32(string $s): int { $h = 0x811c9dc5; $n = strlen($s); for ($i = 0; $i < $n; $i++) { $h ^= ord($s[$i]); $h = ($h * 0x01000193) & 0xFFFFFFFF; } return $h; }
function rnd(string $s): float { return h32($s) / 4294967296; }
function day_num(string $d): int { return intdiv(strtotime($d . 'T00:00:00Z'), 86400); }
/** Pengali umum hari itu: akhir pekan ramai, gelombang mingguan, pertumbuhan pelan, dan bagian hari yang sudah lewat (hari ini). */
function demo_day_factor(string $day, string $key): float {
    $n = day_num($day); $dow = ($n + 4) % 7; // 0 = Minggu
    $wk = ($dow === 0 || $dow === 6) ? 1.18 : (($dow === 2 || $dow === 3) ? 0.92 : 1.0);
    $wave = 1 + 0.14 * sin($n / 6.5 + rnd("ph|$key") * 6.283);
    $grow = 1 + 0.0035 * (($n % 400) / 4);
    $noise = 0.78 + 0.44 * rnd("d|$day|$key");
    $f = $day === today_wib() ? demo_today_part() : 1.0;
    return $wk * $wave * $grow * $noise * $f;
}
function demo_today_part(): float { $m = intdiv((time() + 7 * 3600) % 86400, 60); return max(0.04, $m / 1440); }
/** Angka contoh satu frame pada satu hari: [view, try, buy, contact, wish]. */
function demo_product(string $day, string $pid): array {
    $pop = 0.35 + 1.3 * rnd("pop|$pid");
    $view = (int)round(16 * $pop * demo_day_factor($day, $pid));
    $try = (int)round($view * (0.26 + 0.18 * rnd("t|$day|$pid")));
    $buy = (int)round($try * (0.07 + 0.09 * rnd("b|$day|$pid")));
    $contact = (int)round($try * (0.09 + 0.09 * rnd("c|$day|$pid")));
    $wish = (int)round($view * (0.04 + 0.06 * rnd("w|$day|$pid")));
    return ['view' => $view, 'try' => $try, 'buy' => $buy, 'contact' => $contact, 'wish' => $wish];
}
function demo_store(string $day, string $mid): int { return (int)round(34 * (0.55 + 0.9 * rnd("s|$mid")) * demo_day_factor($day, "store|$mid")); }
function demo_visit(string $day): int { return (int)round(260 * demo_day_factor($day, 'visit')); }
/** Bobot per jam (WIB): ramai siang (12) dan malam (20). */
function demo_hour_weights(int $upto = 23): array {
    $w = []; for ($h = 0; $h < 24; $h++) $w[$h] = $h > $upto ? 0.0 : 0.22 + exp(-(($h - 20) / 3.2) ** 2) + 0.6 * exp(-(($h - 12) / 2.4) ** 2);
    $s = array_sum($w) ?: 1; return array_map(fn($x) => $x / $s, $w);
}
/** Sebar total per jenis ke 24 jam (pembulatan sisa ke jam terberat). */
function demo_spread(int $total, array $w): array {
    $o = array_map(fn($x) => (int)floor($total * $x), $w); $rest = $total - array_sum($o);
    if ($rest > 0) { arsort($w); foreach (array_keys($w) as $h) { if ($rest-- <= 0) break; $o[$h]++; } }
    return $o;
}
function days_between(string $from, string $to): array { $o = []; for ($n = day_num($from); $n <= day_num($to); $n++) $o[] = gmdate('Y-m-d', $n * 86400); return $o; }
/** Catat satu kejadian. Mengembalikan false bila diabaikan (bot, batas laju, produk tak dikenal). IP hanya disimpan sebagai hash sementara untuk batas laju. */
function record_event(string $kind, string $pid, string $ip, string $ua): bool {
    global $DATA;
    if (preg_match('/bot|crawl|spider|slurp|headless|lighthouse|preview/i', $ua)) return false;
    if ($kind === 'visit') $pid = '';
    elseif ($kind === 'store') { $q = db()->prepare('SELECT 1 FROM merchants WHERE id=?'); $q->execute([$pid]); if (!$q->fetch()) return false; }
    else { $q = db()->prepare('SELECT 1 FROM products WHERE id=?'); $q->execute([$pid]); if (!$q->fetch()) return false; }
    $h = substr(hash('sha256', $ip . '|' . $DATA), 0, 32); $win = intdiv(time(), 60);
    $pdo = db();
    $pdo->prepare('INSERT INTO stat_rl(ip,win,n) VALUES(?,?,1) ON CONFLICT(ip) DO UPDATE SET n=CASE WHEN win=excluded.win THEN n+1 ELSE 1 END, win=excluded.win')->execute([$h, $win]);
    $n = $pdo->prepare('SELECT n FROM stat_rl WHERE ip=?'); $n->execute([$h]);
    if (random_int(1, 200) === 1) $pdo->prepare('DELETE FROM stat_rl WHERE win<?')->execute([$win - 10]);
    if ((int)$n->fetchColumn() > 60) return false;
    $pdo->prepare('INSERT INTO stats(day,kind,product_id,n) VALUES(?,?,?,1) ON CONFLICT(day,kind,product_id) DO UPDATE SET n=n+1')->execute([today_wib(), $kind, $pid]);
    // per jam (WIB) untuk grafik "1 hari" & jam ramai; disimpan 95 hari
    $pdo->prepare('INSERT INTO stats_hour(day,hour,kind,product_id,n) VALUES(?,?,?,?,1) ON CONFLICT(day,hour,kind,product_id) DO UPDATE SET n=n+1')->execute([today_wib(), (int)gmdate('G', time() + 7 * 3600), $kind, $pid]);
    if (random_int(1, 500) === 1) $pdo->prepare('DELETE FROM stats_hour WHERE day<?')->execute([today_wib(-95)]);
    return true;
}
/**
 * Statistik NYATA satu toko untuk dasbor Mitra (Update 45): total periode + periode sebelumnya, deret harian,
 * 24 jam (WIB) untuk rentang itu, dan angka per frame. Hanya angka teragregasi (tanpa data pribadi).
 */
function merchant_stats(string $mid, int $days): array {
    $pdo = db();
    $q = $pdo->prepare('SELECT id FROM products WHERE merchant_id=?'); $q->execute([$mid]);
    $pids = $q->fetchAll(PDO::FETCH_COLUMN);
    $to = today_wib(); $from = today_wib(-($days - 1)); $pFrom = today_wib(-(2 * $days - 1)); $pTo = today_wib(-$days);
    $in = $pids ? implode(',', array_fill(0, count($pids), '?')) : "''";
    $own = "((kind<>'store' AND kind<>'visit' AND product_id IN ($in)) OR (kind='store' AND product_id=?))";
    $args = fn(array $pre) => array_merge($pre, $pids, [$mid]);
    $zero = array_fill_keys(ALL_KINDS, 0); unset($zero['visit']);
    $tot = function (string $a, string $b) use ($pdo, $own, $args, $zero) {
        $q = $pdo->prepare("SELECT kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? AND $own GROUP BY kind"); $q->execute($args([$a, $b]));
        $o = $zero; foreach ($q->fetchAll() as $r) if (isset($o[$r['kind']])) $o[$r['kind']] = (int)$r['n']; return $o;
    };
    $series = [];
    for ($i = $days - 1; $i >= 0; $i--) $series[today_wib(-$i)] = ['day' => today_wib(-$i)] + $zero;
    $q = $pdo->prepare("SELECT day, kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? AND $own GROUP BY day, kind"); $q->execute($args([$from, $to]));
    foreach ($q->fetchAll() as $r) if (isset($series[$r['day']][$r['kind']])) $series[$r['day']][$r['kind']] = (int)$r['n'];
    $hours = []; for ($h = 0; $h < 24; $h++) $hours[$h] = ['hour' => $h] + $zero;
    $q = $pdo->prepare("SELECT hour, kind, SUM(n) n FROM stats_hour WHERE day BETWEEN ? AND ? AND $own GROUP BY hour, kind"); $q->execute($args([$from, $to]));
    foreach ($q->fetchAll() as $r) if (isset($hours[(int)$r['hour']][$r['kind']])) $hours[(int)$r['hour']][$r['kind']] = (int)$r['n'];
    $prod = [];
    foreach ([[$from, $to, ''], [$pFrom, $pTo, 'prev_']] as [$a, $b, $pre]) {
        $q = $pdo->prepare("SELECT product_id, kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? AND kind<>'store' AND kind<>'visit' AND product_id IN ($in) GROUP BY product_id, kind"); $q->execute(array_merge([$a, $b], $pids));
        foreach ($q->fetchAll() as $r) {
            $prod[$r['product_id']] ??= ['id' => $r['product_id']] + $zero + ['prev_view' => 0, 'prev_try' => 0];
            if ($pre === '') $prod[$r['product_id']][$r['kind']] = (int)$r['n'];
            elseif (in_array($r['kind'], ['view', 'try'], true)) $prod[$r['product_id']]['prev_' . $r['kind']] = (int)$r['n'];
        }
    }
    $first = $pdo->prepare("SELECT MIN(day) FROM stats WHERE $own"); $first->execute($args([]));
    $T = $tot($from, $to); $P = $tot($pFrom, $pTo); $demo = demo_on();
    if ($demo) {
        $add = []; foreach (array_keys($zero) as $k) $add[$k] = 0;
        foreach ($pids as $pid) $prod[$pid] ??= ['id' => $pid] + $zero + ['prev_view' => 0, 'prev_try' => 0];
        foreach (days_between($from, $to) as $d) {
            foreach ($pids as $pid) foreach (demo_product($d, $pid) as $k => $v) { $series[$d][$k] += $v; $T[$k] += $v; $add[$k] += $v; $prod[$pid][$k] += $v; }
            $v = demo_store($d, $mid); $series[$d]['store'] += $v; $T['store'] += $v; $add['store'] += $v;
        }
        foreach (days_between($pFrom, $pTo) as $d) {
            foreach ($pids as $pid) foreach (demo_product($d, $pid) as $k => $v) { $P[$k] += $v; if ($k === 'view' || $k === 'try') $prod[$pid]["prev_$k"] += $v; }
            $P['store'] += demo_store($d, $mid);
        }
        $w = demo_hour_weights($days === 1 ? (int)gmdate('G', time() + 7 * 3600) : 23);
        foreach ($add as $k => $v) foreach (demo_spread($v, $w) as $h => $x) $hours[$h][$k] += $x;
    }
    return ['merchantId' => $mid, 'days' => $days, 'from' => $from, 'to' => $to, 'totals' => $T, 'prev' => $P, 'demo' => $demo,
        'series' => array_values($series), 'hours' => array_values($hours), 'products' => array_values($prod), 'trackingSince' => $first->fetchColumn() ?: null, 'generatedAt' => now()];
}
/** Ringkasan untuk tab Ringkasan di /admin: total periode + periode sebelumnya, deret harian, per produk, per toko. */
function admin_stats(int $days): array {
    $pdo = db();
    $to = today_wib(); $from = today_wib(-($days - 1)); $pFrom = today_wib(-(2 * $days - 1)); $pTo = today_wib(-$days);
    $zero = array_fill_keys(EVENT_KINDS, 0);
    $tot = function (string $a, string $b) use ($pdo, $zero) {
        $q = $pdo->prepare('SELECT kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? GROUP BY kind'); $q->execute([$a, $b]);
        $o = $zero; foreach ($q->fetchAll() as $r) if (isset($o[$r['kind']])) $o[$r['kind']] = (int)$r['n']; return $o;
    };
    $series = [];
    for ($i = $days - 1; $i >= 0; $i--) $series[today_wib(-$i)] = ['day' => today_wib(-$i)] + $zero;
    $q = $pdo->prepare('SELECT day, kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? GROUP BY day, kind'); $q->execute([$from, $to]);
    foreach ($q->fetchAll() as $r) if (isset($series[$r['day']]) && isset($zero[$r['kind']])) $series[$r['day']][$r['kind']] = (int)$r['n'];
    $names = []; foreach ($pdo->query('SELECT p.id, p.name, p.merchant_id, m.name mname FROM products p LEFT JOIN merchants m ON m.id=p.merchant_id')->fetchAll() as $r) $names[$r['id']] = $r;
    $q = $pdo->prepare("SELECT product_id, kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? AND product_id<>'' GROUP BY product_id, kind"); $q->execute([$from, $to]);
    $prod = []; $mer = [];
    foreach ($q->fetchAll() as $r) {
        if (!isset($zero[$r['kind']])) continue;
        $id = $r['product_id']; $p = $names[$id] ?? null;
        $prod[$id] ??= ['id' => $id, 'name' => $p['name'] ?? "$id (dihapus)", 'merchantId' => $p['merchant_id'] ?? null] + $zero;
        $prod[$id][$r['kind']] += (int)$r['n'];
        if ($p && $p['merchant_id']) { $mid = $p['merchant_id']; $mer[$mid] ??= ['id' => $mid, 'name' => $p['mname'] ?? $mid] + $zero; $mer[$mid][$r['kind']] += (int)$r['n']; }
    }
    $T = $tot($from, $to); $P = $tot($pFrom, $pTo); $demo = demo_on();
    if ($demo) {
        foreach ([[$from, $to, true], [$pFrom, $pTo, false]] as [$a, $b, $cur]) foreach (days_between($a, $b) as $d) {
            $v = demo_visit($d); if ($cur) { $series[$d]['visit'] += $v; $T['visit'] += $v; } else $P['visit'] += $v;
            foreach ($names as $id => $p) foreach (demo_product($d, $id) as $k => $v) {
                if (!isset($zero[$k])) continue;
                if (!$cur) { $P[$k] += $v; continue; }
                $series[$d][$k] += $v; $T[$k] += $v;
                $prod[$id] ??= ['id' => $id, 'name' => $p['name'], 'merchantId' => $p['merchant_id']] + $zero; $prod[$id][$k] += $v;
                if ($p['merchant_id']) { $m = $p['merchant_id']; $mer[$m] ??= ['id' => $m, 'name' => $p['mname'] ?? $m] + $zero; $mer[$m][$k] += $v; }
            }
        }
    }
    $score = fn($x) => $x['view'] + 2 * $x['try'] + 3 * $x['buy'] + 3 * $x['contact'];
    $prod = array_values($prod); usort($prod, fn($a, $b) => $score($b) <=> $score($a));
    $mer = array_values($mer); usort($mer, fn($a, $b) => $score($b) <=> $score($a));
    $fl = flash_rows();
    $hl = $pdo->prepare('SELECT COUNT(*) FROM merchants WHERE published=1 AND highlight_until>=?'); $hl->execute([$to]);
    $first = $pdo->query('SELECT MIN(day) FROM stats')->fetchColumn();
    return ['days' => $days, 'from' => $from, 'to' => $to, 'totals' => $T, 'prev' => $P, 'demo' => $demo, 'series' => array_values($series),
        'products' => array_slice($prod, 0, 20), 'merchants' => $mer, 'flashLive' => count(array_filter($fl, fn($x) => $x['live'])), 'flashTotal' => count($fl),
        'highlighted' => (int)$hl->fetchColumn(), 'trackingSince' => $first ?: null];
}

/* ------------------------------------------------------------------ katalog publik */
function public_banners(): array {
    $out = ['hero' => [], 'topbar' => [], 'login' => []];
    foreach (db()->query('SELECT * FROM banners WHERE published=1 ORDER BY sort, id')->fetchAll() as $r) {
        $b = banner_out($r); unset($b['published'], $b['updatedAt'], $b['sort']);
        $out[$r['kind']][] = $b;
    }
    return $out;
}
function public_catalog(): array {
    $merchants = db()->query('SELECT * FROM merchants ORDER BY rowid')->fetchAll();
    $mBy = []; foreach ($merchants as $m) $mBy[$m['id']] = $m;
    $products = []; $hidden = []; $count = [];
    foreach (db()->query('SELECT * FROM products ORDER BY rowid')->fetchAll() as $r) {
        $m = $mBy[$r['merchant_id']] ?? null;
        if (!$r['published'] || !$m || !$m['published']) { $hidden[] = $r['id']; continue; }
        $count[$m['id']] = ($count[$m['id']] ?? 0) + 1;
        $po = product_out($r);
        $disc = $r['old_price'] ? (int)round((1 - $r['price'] / $r['old_price']) * 100) : 0;
        $isNew = time() - strtotime($r['created_at']) < 14 * 86400;
        $products[] = ['id' => $r['id'], 'name' => $r['name'], 'style' => $r['style'], 'colorKey' => $r['color_key'], 'price' => (int)$r['price'], 'oldPrice' => $po['oldPrice'],
            'merchant' => $m['name'], 'merchantId' => $m['id'], 'city' => trim(explode(',', $m['city'])[0]), 'cat' => $r['category'], 'isNew' => $isNew, 'order' => 2000 + count($products),
            'flash' => false, 'flashSold' => 0, 'badge' => $disc ? "-$disc%" : ($isNew ? 'BARU' : null), 'stock' => (int)$r['stock'], 'vto' => (bool)$r['vto'], 'size' => $po['size'],
            'description' => $r['description'], 'buy' => $po['buy'],
            'assets' => ($r['photos'] || $r['has_model']) ? ['base' => '/media/' . $r['id'], 'photos' => (int)$r['photos'], 'model' => (bool)$r['has_model'], 'rigComplete' => (bool)($po['rig']['complete'] ?? false), 'v' => (int)$r['media_v']] : null];
    }
    $om = [];
    foreach ($merchants as $m) {
        if (!$m['published']) continue;
        $o = merchant_out($m);
        $om[] = ['id' => $m['id'], 'name' => $o['name'], 'city' => $o['city'], 'province' => $o['province'], 'count' => ($count[$m['id']] ?? 0) . ' frame', 'rating' => '–', 'initials' => $o['initials'],
            'color' => $o['color'], 'whatsapp' => $o['whatsapp'], 'phone' => $o['phone'], 'links' => $o['links'], 'logo' => null];
    }
    $hq = db()->prepare('SELECT id FROM merchants WHERE published=1 AND highlight_until>=?'); $hq->execute([today_wib()]);
    $flash = [];
    foreach (flash_rows() as $f) if ($f['live']) $flash[] = ['id' => $f['productId'], 'price' => $f['price'], 'regular' => $f['regular'], 'quota' => $f['quota'], 'sold' => $f['sold']];
    return ['products' => $products, 'merchants' => $om, 'hidden' => $hidden, 'highlighted' => $hq->fetchAll(PDO::FETCH_COLUMN), 'flashItems' => $flash, 'banners' => public_banners(), 'flashSale' => flash_get(), 'generatedAt' => now()];
}

/* ------------------------------------------------------------------ auth admin */
function sha(string $s): string { return hash('sha256', $s, true); }
function require_admin(): void {
    global $ADMIN_TOKEN;
    if (strlen($ADMIN_TOKEN) < 24) fail("API admin nonaktif: isi adminToken (≥ 24 karakter) di trylens-data/config.php.", 503);
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    $f = db()->prepare('SELECT * FROM admin_fails WHERE ip=?'); $f->execute([$ip]); $f = $f->fetch();
    if ($f && $f['n'] >= 10 && time() < $f['until']) fail('Terlalu banyak percobaan. Coba lagi nanti.', 429);
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    $given = preg_match('/^Bearer (.+)$/', $h, $m) ? $m[1] : ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
    if (!hash_equals(sha($ADMIN_TOKEN), sha((string)$given))) {
        db()->prepare('INSERT INTO admin_fails(ip,n,until) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET n=n+1, until=excluded.until')->execute([$ip, time() + 600]);
        fail('Token admin salah.', 401);
    }
    db()->prepare('DELETE FROM admin_fails WHERE ip=?')->execute([$ip]);
}

/* ------------------------------------------------------------------ router */
$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';
$body = [];
if (in_array($method, ['POST', 'PATCH', 'PUT'], true) && !preg_match('~/assets/|/banners/\d+/image$~', $path)) {
    $raw = (string)file_get_contents('php://input');
    if ($raw !== '') { $body = json_decode($raw, true); if (!is_array($body)) fail('JSON tidak valid'); }
}

try {
    if ($path === '/admin') {
        header('Content-Type: text/html; charset=utf-8'); header('Cache-Control: no-store');
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
        header('X-Frame-Options: DENY'); header('Referrer-Policy: no-referrer'); header('X-Robots-Tag: noindex, nofollow');
        readfile(__DIR__ . '/admin.html'); exit;
    }
    if ($path === '/api/health') out(['ok' => true, 'time' => now(), 'backend' => 'php-catalog']);
    if ($path === '/api/catalog' && $method === 'GET') out(public_catalog(), 200, ['Cache-Control' => 'public, max-age=30']);

    if (preg_match('~^/media/banner/(\d{1,9})\.(jpg|png|webp)$~', $path, $m)) {
        $p = banner_file((int)$m[1], $m[2]);
        if (!is_file($p)) { http_response_code(404); exit; }
        header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$m[2]]);
        header('Cache-Control: public, max-age=86400'); header('Content-Length: ' . filesize($p));
        header('X-Content-Type-Options: nosniff'); readfile($p); exit;
    }
    if (preg_match('~^/media/([A-Za-z0-9_-]{1,64})/(main|side|detail|close)\.jpg$|^/media/([A-Za-z0-9_-]{1,64})/(model)\.glb$~', $path, $m)) {
        $id = $m[1] !== '' ? $m[1] : $m[3];
        $file = $m[1] !== '' ? $m[2] . '.jpg' : 'model.glb';
        $p = pdir($id) . "/$file";
        if (!is_file($p)) { http_response_code(404); exit; }
        header('Content-Type: ' . (str_ends_with($file, '.glb') ? 'model/gltf-binary' : 'image/jpeg'));
        header('Cache-Control: public, max-age=0, must-revalidate'); header('Content-Length: ' . filesize($p));
        header('X-Content-Type-Options: nosniff'); readfile($p); exit;
    }

    if ($path === '/api/event' && $method === 'POST') {
        if (($_SERVER['HTTP_X_TRYLENS'] ?? '') !== '1') fail('Header X-TryLens wajib ada', 403);
        $kind = (string)($body['kind'] ?? '');
        if (!in_array($kind, ALL_KINDS, true)) fail('Jenis kejadian tidak dikenal.');
        record_event($kind, str($body['productId'] ?? '', 40), (string)($_SERVER['REMOTE_ADDR'] ?? '?'), (string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
        http_response_code(204); header('Cache-Control: no-store'); exit;
    }
    if (preg_match('~^/api/stats/merchant/([A-Za-z0-9_-]{1,40})$~', $path, $m) && $method === 'GET') {
        $q = db()->prepare('SELECT 1 FROM merchants WHERE id=?'); $q->execute([$m[1]]);
        if (!$q->fetch()) fail('Toko tidak ditemukan.', 404);
        $d = (int)($_GET['days'] ?? 30);
        out(merchant_stats($m[1], in_array($d, STAT_DAYS, true) ? $d : 30), 200, ['Cache-Control' => 'no-store']);
    }
    if (!str_starts_with($path, '/api/admin')) fail('Endpoint tidak ditemukan', 404);
    // Anti-CSRF: permintaan yang mengubah data wajib membawa header kustom.
    if (!in_array($method, ['GET', 'HEAD'], true) && ($_SERVER['HTTP_X_TRYLENS'] ?? '') !== '1') fail('Header X-TryLens wajib ada', 403);
    require_admin();
    $a = substr($path, strlen('/api/admin'));
    $pdo = db();
    $getM = function (string $id) use ($pdo) { $q = $pdo->prepare('SELECT * FROM merchants WHERE id=?'); $q->execute([$id]); return $q->fetch() ?: null; };
    $getP = function (string $id) use ($pdo) { $q = $pdo->prepare('SELECT * FROM products WHERE id=?'); $q->execute([$id]); return $q->fetch() ?: null; };
    $validId = fn($id) => (bool)preg_match('/^[A-Za-z0-9_-]{1,40}$/', (string)$id);

    if ($a === '/ping') out(['ok' => true]);

    if ($a === '/merchants' && $method === 'GET') out(['merchants' => array_map('merchant_out', $pdo->query('SELECT * FROM merchants ORDER BY rowid')->fetchAll())]);
    if ($a === '/merchants' && $method === 'POST') {
        $id = isset($body['id']) ? (string)$body['id'] : 'm' . (((int)$pdo->query('SELECT COUNT(*) c FROM merchants')->fetch()['c']) + 1 + random_int(0, 999));
        if (!$validId($id)) fail('ID toko tidak valid (huruf/angka/_/-, ≤ 40).');
        if ($getM($id)) fail('ID toko sudah ada.', 409);
        $o = clean_merchant($body, null); $t = now();
        $pdo->prepare('INSERT INTO merchants(id,name,city,province,initials,color,whatsapp,phone,link_instagram,link_x,link_tokopedia,link_shopee,published,highlight_until,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$id, $o['name'], $o['city'], $o['province'], $o['initials'], $o['color'], $o['whatsapp'], $o['phone'], $o['link_instagram'], $o['link_x'], $o['link_tokopedia'], $o['link_shopee'], $o['published'], $o['highlight_until'], $t, $t]);
        out(['merchant' => merchant_out($getM($id))], 201);
    }
    if (preg_match('~^/merchants/([^/]+)$~', $a, $m)) {
        $prev = $getM($m[1]);
        if (!$prev) fail('Toko tidak ditemukan.', 404);
        if ($method === 'PATCH') {
            $o = clean_merchant($body, $prev);
            $pdo->prepare('UPDATE merchants SET name=?,city=?,province=?,initials=?,color=?,whatsapp=?,phone=?,link_instagram=?,link_x=?,link_tokopedia=?,link_shopee=?,published=?,highlight_until=?,updated_at=? WHERE id=?')
                ->execute([$o['name'], $o['city'], $o['province'], $o['initials'], $o['color'], $o['whatsapp'], $o['phone'], $o['link_instagram'], $o['link_x'], $o['link_tokopedia'], $o['link_shopee'], $o['published'], $o['highlight_until'], now(), $m[1]]);
            out(['merchant' => merchant_out($getM($m[1]))]);
        }
        if ($method === 'DELETE') {
            $c = $pdo->prepare('SELECT COUNT(*) c FROM products WHERE merchant_id=?'); $c->execute([$m[1]]); $n = (int)$c->fetch()['c'];
            if ($n) fail("Toko masih punya $n produk. Pindahkan/hapus dulu, atau sembunyikan toko (published:false).", 409);
            $pdo->prepare('DELETE FROM merchants WHERE id=?')->execute([$m[1]]);
            out(['ok' => true]);
        }
    }

    if ($a === '/products' && $method === 'GET') {
        $rows = array_map('product_out', $pdo->query('SELECT * FROM products ORDER BY rowid')->fetchAll());
        $mid = (string)($_GET['merchantId'] ?? '');
        out(['products' => array_values($mid ? array_filter($rows, fn($p) => $p['merchantId'] === $mid) : $rows)]);
    }
    if ($a === '/products' && $method === 'POST') {
        if (isset($body['id'])) $id = (string)$body['id'];
        else {
            $mx = 23;
            foreach ($pdo->query('SELECT id FROM products')->fetchAll() as $r) if (preg_match('/^f(\d+)$/', $r['id'], $mm)) $mx = max($mx, (int)$mm[1]);
            $id = 'f' . ($mx + 1);
        }
        if (!$validId($id)) fail('ID produk tidak valid (huruf/angka/_/-, ≤ 40).');
        if ($getP($id)) fail('ID produk sudah dipakai.', 409);
        $o = clean_product($body, null); $t = now();
        $cols = implode(',', PCOLS);
        $pdo->prepare("INSERT INTO products(id,$cols,created_at,updated_at) VALUES(?," . implode(',', array_fill(0, count(PCOLS), '?')) . ",?,?)")
            ->execute(array_merge([$id], array_map(fn($c) => $o[$c] ?? null, PCOLS), [$t, $t]));
        out(['product' => product_out($getP($id))], 201);
    }
    if (preg_match('~^/products/([^/]+)$~', $a, $m)) {
        $prev = $getP($m[1]);
        if (!$prev) fail('Produk tidak ditemukan.', 404);
        if ($method === 'GET') out(['product' => product_out($prev)]);
        if ($method === 'PATCH') {
            $o = clean_product($body, $prev);
            $pdo->prepare('UPDATE products SET ' . implode(',', array_map(fn($c) => "$c=?", PCOLS)) . ',updated_at=? WHERE id=?')
                ->execute(array_merge(array_map(fn($c) => $o[$c] ?? null, PCOLS), [now(), $m[1]]));
            out(['product' => product_out($getP($m[1]))]);
        }
        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM flash_items WHERE product_id=?')->execute([$m[1]]);
            $pdo->prepare('DELETE FROM products WHERE id=?')->execute([$m[1]]);
            rrmdir(pdir($m[1]));
            out(['ok' => true]);
        }
    }
    if (preg_match('~^/products/([^/]+)/assets/(photo-[0-3]|model)$~', $a, $m)) {
        $p = $getP($m[1]);
        if (!$p) fail('Produk tidak ditemukan. Buat produknya dulu.', 404);
        $isModel = $m[2] === 'model';
        $idx = $isModel ? -1 : (int)substr($m[2], 6);
        $file = $isModel ? 'model.glb' : VARIANTS[$idx] . '.jpg';
        if ($method === 'PUT') {
            $buf = (string)file_get_contents('php://input');
            $rig = null; $warn = [];
            if ($isModel) {
                $info = inspect_glb($buf);
                if (!$info['ok']) fail($info['error'], 415);
                $rig = $info['rig']; $warn = $info['warnings'];
            } else {
                if (strlen($buf) > MAX_PHOTO) fail('Foto melebihi 5 MB.', 413);
                if (!is_jpeg($buf)) fail('Foto harus JPEG.', 415);
                if ($idx > count_photos($p['id'])) fail('Isi foto utama (photo-0) dulu.');
            }
            if (!is_dir(pdir($p['id'])) && !mkdir(pdir($p['id']), 0750, true)) fail('Folder unggahan tidak bisa dibuat.', 500);
            if (file_put_contents(pdir($p['id']) . "/$file", $buf) === false) fail('Gagal menyimpan berkas.', 500);
            refresh_media($p['id'], $rig, $isModel);
            out(['product' => product_out($getP($p['id'])), 'warnings' => $warn]);
        }
        if ($method === 'DELETE') {
            @unlink(pdir($p['id']) . "/$file");
            if (!$isModel) for ($i = $idx; $i < 3; $i++) { $from = pdir($p['id']) . '/' . VARIANTS[$i + 1] . '.jpg'; if (is_file($from)) rename($from, pdir($p['id']) . '/' . VARIANTS[$i] . '.jpg'); }
            refresh_media($p['id'], null, true);
            out(['product' => product_out($getP($p['id']))]);
        }
    }
    if ($a === '/flash-sale' && $method === 'GET') out(['flashSale' => flash_get()]);
    if ($a === '/flash-sale' && $method === 'PUT') {
        $o = flash_clean($body, flash_get());
        $pdo->prepare("INSERT INTO settings(k,v) VALUES('flash_sale',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v")->execute([json_encode($o)]);
        out(['flashSale' => $o]);
    }
    if ($a === '/stats' && $method === 'GET') { $d = (int)($_GET['days'] ?? 30); out(admin_stats(in_array($d, STAT_DAYS, true) ? $d : 30)); }
    if ($a === '/flash-items' && $method === 'GET') out(['items' => flash_rows()]);
    if ($a === '/demo-stats' && $method === 'GET') out(['enabled' => demo_on()]);
    if ($a === '/demo-stats' && $method === 'PUT') {
        $on = b01($body['enabled'] ?? false);
        $pdo->prepare("INSERT INTO settings(k,v) VALUES('demo_stats',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v")->execute([(string)$on]);
        out(['enabled' => (bool)$on]);
    }
    if (preg_match('~^/flash-items/([^/]+)$~', $a, $m)) {
        $p = $getP($m[1]);
        if (!$p) fail('Produk tidak ditemukan.', 404);
        $q = $pdo->prepare('SELECT * FROM flash_items WHERE product_id=?'); $q->execute([$m[1]]); $prev = $q->fetch() ?: null;
        if ($method === 'PUT') {
            $o = flash_item_clean($body, $prev, (int)$p['price']); $t = now();
            $pdo->prepare('INSERT INTO flash_items(product_id,price,quota,sold,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?)
                ON CONFLICT(product_id) DO UPDATE SET price=excluded.price, quota=excluded.quota, sold=excluded.sold, active=excluded.active, updated_at=excluded.updated_at')
                ->execute([$m[1], $o['price'], $o['quota'], $o['sold'], $o['active'], $t, $t]);
            $it = array_values(array_filter(flash_rows(), fn($x) => $x['productId'] === $m[1]));
            out(['item' => $it[0] ?? null], $prev ? 200 : 201);
        }
        if ($method === 'DELETE') { $pdo->prepare('DELETE FROM flash_items WHERE product_id=?')->execute([$m[1]]); out(['ok' => true]); }
    }
    if ($a === '/banners' && $method === 'GET') out(['banners' => array_map('banner_out', $pdo->query('SELECT * FROM banners ORDER BY kind, sort, id')->fetchAll())]);
    if ($a === '/banners' && $method === 'POST') {
        $o = clean_banner($body, null); $t = now();
        if (!has($body, 'sort')) { $mx = $pdo->prepare('SELECT COALESCE(MAX(sort),0) m FROM banners WHERE kind=?'); $mx->execute([$o['kind']]); $o['sort'] = (int)$mx->fetch()['m'] + 1; }
        $pdo->prepare('INSERT INTO banners(kind,headline,sub,cta,action,link,theme,illustration,sort,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$o['kind'], $o['headline'], $o['sub'], $o['cta'], $o['action'], $o['link'], $o['theme'], $o['illustration'], $o['sort'], $o['published'], $t, $t]);
        $q = $pdo->prepare('SELECT * FROM banners WHERE id=?'); $q->execute([(int)$pdo->lastInsertId()]);
        out(['banner' => banner_out($q->fetch())], 201);
    }
    if (preg_match('~^/banners/(\d+)/image$~', $a, $m)) {
        $id = (int)$m[1]; $q = $pdo->prepare('SELECT * FROM banners WHERE id=?'); $q->execute([$id]); $prev = $q->fetch();
        if (!$prev) fail('Iklan tidak ditemukan.', 404);
        if ($method === 'PUT') {
            $buf = (string)file_get_contents('php://input');
            if (strlen($buf) > 1500 * 1024) fail('Gambar iklan melebihi 1,5 MB. Kecilkan dulu (mis. lewat squoosh.app).', 413);
            $ext = image_ext($buf); if (!$ext) fail('Gambar harus JPG, PNG, atau WebP.', 415);
            @mkdir(dirname(banner_file($id, 'jpg')), 0775, true);
            foreach (['jpg', 'png', 'webp'] as $e) @unlink(banner_file($id, $e));
            file_put_contents(banner_file($id, $ext), $buf);
            $pdo->prepare('UPDATE banners SET image=?, image_v=image_v+1, updated_at=? WHERE id=?')->execute([$ext, now(), $id]);
        } elseif ($method === 'DELETE') {
            foreach (['jpg', 'png', 'webp'] as $e) @unlink(banner_file($id, $e));
            $pdo->prepare('UPDATE banners SET image=NULL, image_v=image_v+1, updated_at=? WHERE id=?')->execute([now(), $id]);
        } else fail('Metode tidak didukung', 405);
        $q->execute([$id]); out(['banner' => banner_out($q->fetch())]);
    }
    if (preg_match('~^/banners/(\d+)$~', $a, $m)) {
        $q = $pdo->prepare('SELECT * FROM banners WHERE id=?'); $q->execute([(int)$m[1]]); $prev = $q->fetch();
        if (!$prev) fail('Iklan tidak ditemukan.', 404);
        if ($method === 'PATCH') {
            $o = clean_banner($body, $prev);
            $pdo->prepare('UPDATE banners SET headline=?,sub=?,cta=?,action=?,link=?,theme=?,illustration=?,sort=?,published=?,updated_at=? WHERE id=?')
                ->execute([$o['headline'], $o['sub'], $o['cta'], $o['action'], $o['link'], $o['theme'], $o['illustration'], $o['sort'], $o['published'], now(), (int)$m[1]]);
            $q->execute([(int)$m[1]]); out(['banner' => banner_out($q->fetch())]);
        }
        if ($method === 'DELETE') { foreach (['jpg', 'png', 'webp'] as $e) @unlink(banner_file((int)$m[1], $e)); $pdo->prepare('DELETE FROM banners WHERE id=?')->execute([(int)$m[1]]); out(['ok' => true]); }
    }
    if ($a === '/export' && $method === 'GET') out(['exportedAt' => now(), 'merchants' => array_map('merchant_out', $pdo->query('SELECT * FROM merchants ORDER BY rowid')->fetchAll()), 'products' => array_map('product_out', $pdo->query('SELECT * FROM products ORDER BY rowid')->fetchAll()), 'banners' => array_map('banner_out', $pdo->query('SELECT * FROM banners ORDER BY kind, sort, id')->fetchAll()), 'flashItems' => flash_rows()]);

    fail('Endpoint tidak ditemukan', 404);
} catch (HttpErr $e) {
    fail($e->getMessage(), $e->status);
} catch (PDOException $e) {
    if (preg_match('/CHECK constraint|FOREIGN KEY|UNIQUE/', $e->getMessage())) fail('Data tidak memenuhi aturan basis data.', 400);
    error_log('trylens: ' . $e->getMessage());
    fail('Terjadi kesalahan di server', 500);
}
