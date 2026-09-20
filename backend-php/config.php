<?php
// Konfigurasi dasar TryLens PHP API.
// Mengaktifkan CORS agar bisa diakses dari frontend React (Vite) yang
// berjalan di origin/port berbeda saat development.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('DATA_DIR', __DIR__ . '/data');

function read_json_file(string $filename) {
    $path = DATA_DIR . '/' . $filename;
    if (!file_exists($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    return json_decode($raw, true) ?: [];
}

function write_json_file(string $filename, $data): void {
    $path = DATA_DIR . '/' . $filename;
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function json_response($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function safe_user_id(string $raw): string {
    $clean = preg_replace('/[^a-zA-Z0-9_-]/', '', $raw);
    return $clean === '' ? 'guest' : $clean;
}
