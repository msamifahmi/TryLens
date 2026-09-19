<?php
require_once __DIR__ . '/../config.php';

$products = read_json_file('products.json');

// GET /api/products.php?id=f3  -> detail satu produk
if (isset($_GET['id'])) {
    $found = null;
    foreach ($products as $p) {
        if ($p['id'] === $_GET['id']) {
            $found = $p;
            break;
        }
    }
    if ($found === null) {
        json_response(['error' => 'Produk tidak ditemukan'], 404);
    }
    json_response($found);
}

// GET /api/products.php?category=Pria|Wanita|Anak|Promo|Semua&merchantId=m1
$category = $_GET['category'] ?? 'Semua';
$merchantId = $_GET['merchantId'] ?? null;

$result = $products;

if ($category !== 'Semua') {
    if ($category === 'Promo') {
        $result = array_filter($result, fn($p) => !empty($p['oldPrice']));
    } else {
        $result = array_filter($result, fn($p) => $p['cat'] === $category);
    }
}

if ($merchantId) {
    $result = array_filter($result, fn($p) => ($p['merchantId'] ?? null) === $merchantId);
}

json_response(array_values($result));
