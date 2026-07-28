<?php
/** GET /backend/admin-detail.php?id=<application id> — full review view. */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('GET');
require_admin();

$id = (int) ($_GET['id'] ?? 0);
if (!$id) respond(400, ['error' => 'Missing id']);

$db = get_db();
$stmt = $db->prepare('SELECT a.*, admin.full_name AS reviewed_by_name
  FROM applications a
  LEFT JOIN admin_users admin ON admin.id = a.reviewed_by
  WHERE a.id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!$row) respond(404, ['error' => 'Application not found']);
unset($row['password_hash']);

respond(200, $row);
