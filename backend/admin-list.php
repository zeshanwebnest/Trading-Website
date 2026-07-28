<?php
/**
 * GET /backend/admin-list.php?status=under_review
 * The verification queue. Admin-only — enforced by require_admin(), not by
 * anything the front-end does or doesn't show.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('GET');
require_admin();

$status = $_GET['status'] ?? '';
$validStatuses = ['under_review', 'verified', 'rejected'];

$db = get_db();
if (in_array($status, $validStatuses, true)) {
  $stmt = $db->prepare('SELECT a.id, a.full_name, a.email, a.status, a.submitted_at, a.reviewed_at,
      admin.full_name AS reviewed_by_name
    FROM applications a
    LEFT JOIN admin_users admin ON admin.id = a.reviewed_by
    WHERE a.status = ?
    ORDER BY a.submitted_at DESC');
  $stmt->execute([$status]);
} else {
  $stmt = $db->query('SELECT a.id, a.full_name, a.email, a.status, a.submitted_at, a.reviewed_at,
      admin.full_name AS reviewed_by_name
    FROM applications a
    LEFT JOIN admin_users admin ON admin.id = a.reviewed_by
    ORDER BY a.submitted_at DESC');
}

respond(200, ['applications' => $stmt->fetchAll()]);
