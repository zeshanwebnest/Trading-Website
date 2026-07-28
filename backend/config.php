<?php
/**
 * Vault Easy — backend configuration.
 * Local XAMPP defaults below. Change these when moving to real hosting —
 * never commit real production credentials into this file; use environment
 * variables or a git-ignored config on a real server instead.
 */

const DB_HOST = '127.0.0.1';
const DB_NAME = 'vault_easy';
const DB_USER = 'root';
const DB_PASS = '';

// Absolute filesystem path to backend/uploads — kept outside any directory
// Apache would ever serve directly; files are only ever read by PHP after
// an auth check (see file.php), never linked to or served as static assets.
define('UPLOAD_ROOT', __DIR__ . '/uploads');

const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
  'application/pdf' => 'pdf',
];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB, matches the front-end limit

session_set_cookie_params([
  'httponly' => true,
  'samesite' => 'Lax',
  // 'secure' should be forced true once this runs behind HTTPS on real
  // hosting — left off here so the session cookie still works over plain
  // http://localhost during local XAMPP development.
]);
session_start();

header('Content-Type: application/json');

/** Send a JSON response and stop. */
function respond(int $status, array $data): void {
  http_response_code($status);
  echo json_encode($data);
  exit;
}

/** Reject anything but the expected HTTP method early. */
function require_method(string $method): void {
  if ($_SERVER['REQUEST_METHOD'] !== $method) {
    respond(405, ['error' => 'Method not allowed']);
  }
}

/** The one place "am I logged in as an applicant" is decided. */
function require_applicant(): int {
  if (empty($_SESSION['applicant_id'])) {
    respond(401, ['error' => 'Not signed in']);
  }
  return (int) $_SESSION['applicant_id'];
}

/**
 * The one place "am I an admin" is decided. Every admin-only endpoint calls
 * this before touching any data — this is the actual enforcement boundary,
 * not whatever a button in the browser does or doesn't show.
 */
function require_admin(): int {
  if (empty($_SESSION['admin_id'])) {
    respond(401, ['error' => 'Admin sign-in required']);
  }
  return (int) $_SESSION['admin_id'];
}
