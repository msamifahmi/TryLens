<?php
// Router uji untuk `php -S`: meniru aturan .htaccess (public/.htaccess) tanpa Apache.
$p = ltrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/', '/');
if (preg_match('~^(api/(?!index\.php$|admin\.html$)|media/|admin/?$)~', $p)) { require __DIR__ . '/../../frontend/public/api/index.php'; return true; }
return false;
