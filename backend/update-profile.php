<?php
/**
 * POST /backend/update-profile.php — an applicant editing their own basic
 * details. Deliberately limited to the same fields the dashboard's Edit
 * Profile form exposes — CNIC, bank details, and status are not editable
 * here, since changing identity/bank info after submission is a
 * re-verification case, not a casual profile edit.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('POST');
$applicantId = require_applicant();

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$get = fn($k) => trim((string) ($input[$k] ?? ''));

$fullName = $get('fullName');
$email = strtolower($get('email'));
$phone = $get('phone');
$dob = $get('dob');
$nationality = $get('nationality');
$addrStreet = $get('addrStreet');
$addrCity = $get('addrCity');
$addrPostal = $get('addrPostal');

$errors = [];
if (mb_strlen($fullName) < 3) $errors['fullName'] = 'Enter your full legal name.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';
if (!preg_match('/^[+\d][\d\s-]{6,17}$/', $phone)) $errors['phone'] = 'Enter a valid phone number.';
if ($nationality === '') $errors['nationality'] = 'Nationality is required.';
if ($addrStreet === '') $errors['addrStreet'] = 'Street address is required.';
if ($addrCity === '') $errors['addrCity'] = 'City is required.';

if ($errors) {
  respond(422, ['error' => 'Validation failed', 'fields' => $errors]);
}

$db = get_db();

$dupe = $db->prepare('SELECT id FROM applications WHERE email = ? AND id != ?');
$dupe->execute([$email, $applicantId]);
if ($dupe->fetch()) {
  respond(409, ['error' => 'Another account already uses this email.', 'fields' => ['email' => 'Already in use.']]);
}

$stmt = $db->prepare('UPDATE applications SET
  full_name = :full_name, email = :email, phone = :phone, dob = :dob,
  nationality = :nationality, addr_street = :addr_street, addr_city = :addr_city,
  addr_postal = :addr_postal
  WHERE id = :id');
$stmt->execute([
  'full_name' => $fullName,
  'email' => $email,
  'phone' => $phone,
  'dob' => $dob,
  'nationality' => $nationality,
  'addr_street' => $addrStreet,
  'addr_city' => $addrCity,
  'addr_postal' => $addrPostal ?: null,
  'id' => $applicantId,
]);

respond(200, ['ok' => true]);
