<?php
/** POST /backend/admin-login.php — admin sign-in, a separate credential set
 *  and session key from applicant sign-in (require_admin() checks
 *  $_SESSION['admin_id'], never $_SESSION['applicant_id']). */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('POST');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($input['username'] ?? '');
$password = (string) ($input['password'] ?? '');

if ($username === '' || $password === '') {
  respond(422, ['error' => 'Username and password are required.']);
}

$db = get_db();
$stmt = $db->prepare('SELECT id, password_hash, full_name FROM admin_users WHERE username = ?');
$stmt->execute([$username]);
$row = $stmt->fetch();

if (!$row || !password_verify($password, $row['password_hash'])) {
  respond(401, ['error' => 'Incorrect username or password.']);
}

session_regenerate_id(true);
$_SESSION['admin_id'] = (int) $row['id'];
$_SESSION['admin_name'] = $row['full_name'];

respond(200, ['ok' => true, 'fullName' => $row['full_name']]);
