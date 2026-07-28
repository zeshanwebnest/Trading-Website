<?php
/** POST /backend/login.php — applicant sign-in. */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('POST');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$email = strtolower(trim($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($email === '' || $password === '') {
  respond(422, ['error' => 'Email and password are required.']);
}

$db = get_db();
$stmt = $db->prepare('SELECT id, password_hash FROM applications WHERE email = ?');
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || !password_verify($password, $row['password_hash'])) {
  respond(401, ['error' => 'Incorrect email or password.']);
}

session_regenerate_id(true);
$_SESSION['applicant_id'] = (int) $row['id'];

respond(200, ['ok' => true]);
