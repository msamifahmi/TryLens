<?php
require_once __DIR__ . '/../config.php';

json_response(read_json_file('categories.json'));
