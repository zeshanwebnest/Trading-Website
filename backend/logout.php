<?php
/** POST /backend/logout.php — ends the applicant's session. */
require __DIR__ . '/config.php';
require_method('POST');
$_SESSION = [];
session_destroy();
respond(200, ['ok' => true]);
