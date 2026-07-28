<?php
/**
 * One-time setup script: creates the first admin account.
 * Run once via the browser (http://localhost/vaulteasy/backend/seed-admin.php),
 * then delete this file or move it out of the web root — it has no
 * authentication of its own and would let anyone create an admin account
 * if left in place.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

$username = 'admin';
$password = 'ChangeMe123!';
$fullName = 'Vault Easy Admin';

$db = get_db();
$existing = $db->prepare('SELECT id FROM admin_users WHERE username = ?');
$existing->execute([$username]);

if ($existing->fetch()) {
  respond(200, ['ok' => true, 'message' => "Admin '$username' already exists — nothing changed."]);
}

$stmt = $db->prepare('INSERT INTO admin_users (username, password_hash, full_name) VALUES (?, ?, ?)');
$stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $fullName]);

respond(201, [
  'ok' => true,
  'message' => "Admin account created. Username: $username / Password: $password — change this immediately, and delete seed-admin.php now.",
]);
