<?php
require_once __DIR__ . '/../config.php';

$userId = safe_user_id($_GET['user'] ?? 'guest');
$filename = "wishlist_{$userId}.json";

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = read_json_file($filename);
    if (empty($data)) {
        json_response(['items' => new stdClass()]);
    }
    json_response($data);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $items = (isset($body['items']) && is_array($body['items'])) ? $body['items'] : [];
    $payload = ['items' => $items];
    write_json_file($filename, $payload);
    json_response(['ok' => true] + $payload);
}

json_response(['error' => 'Method tidak didukung'], 405);
