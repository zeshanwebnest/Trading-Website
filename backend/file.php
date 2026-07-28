<?php
/**
 * GET /backend/file.php?id=<application id>&field=cnic_front
 * Streams one uploaded document — the only way any uploaded file is ever
 * served. There is no direct URL to the file on disk: uploads/ sits behind
 * a .htaccess that denies all direct web access, so this auth check is the
 * one and only path to viewing a document.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('GET');

$applicationId = (int) ($_GET['id'] ?? 0);
$field = $_GET['field'] ?? '';
$allowedFields = ['cnic_front_path', 'cnic_back_path', 'proof_of_address_path', 'additional_doc_path'];
$column = $field . '_path';

if (!$applicationId || !in_array($column, $allowedFields, true)) {
  respond(400, ['error' => 'Invalid request']);
}

$db = get_db();
$stmt = $db->prepare("SELECT id, $column AS path FROM applications WHERE id = ?");
$stmt->execute([$applicationId]);
$row = $stmt->fetch();

if (!$row || !$row['path']) {
  respond(404, ['error' => 'File not found']);
}

// Authorization: either the admin reviewing this application, or the
// applicant it belongs to. No one else — checked here, not in the browser.
$isOwner = !empty($_SESSION['applicant_id']) && (int) $_SESSION['applicant_id'] === $applicationId;
$isAdmin = !empty($_SESSION['admin_id']);
if (!$isOwner && !$isAdmin) {
  respond(403, ['error' => 'Forbidden']);
}

$path = UPLOAD_ROOT . '/' . $row['path'];
if (!is_file($path)) {
  respond(404, ['error' => 'File missing on disk']);
}

$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$mimeByExt = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'pdf' => 'application/pdf'];

header('Content-Type: ' . ($mimeByExt[$ext] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($path));
header('Content-Disposition: inline; filename="' . basename($path) . '"');
header('Cache-Control: private, no-store');
readfile($path);
exit;
