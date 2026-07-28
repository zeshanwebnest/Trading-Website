<?php
/** POST /backend/admin-logout.php */
require __DIR__ . '/config.php';
require_method('POST');
$_SESSION = [];
session_destroy();
respond(200, ['ok' => true]);
