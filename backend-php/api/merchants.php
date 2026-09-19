<?php
require_once __DIR__ . '/../config.php';

$merchants = read_json_file('merchants.json');

if (isset($_GET['id'])) {
    $found = null;
    foreach ($merchants as $m) {
        if ($m['id'] === $_GET['id']) {
            $found = $m;
            break;
        }
    }
    if ($found === null) {
        json_response(['error' => 'Toko tidak ditemukan'], 404);
    }
    json_response($found);
}

json_response($merchants);
