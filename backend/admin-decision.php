<?php
/**
 * POST /backend/admin-decision.php  { "id": 12, "decision": "approve" }
 *                                    { "id": 12, "decision": "reject", "reason": "..." }
 *
 * The one and only place an application's status can change to "verified"
 * or "rejected". require_admin() is checked first, before anything else —
 * this is the real enforcement of "only an admin can verify an account",
 * not a hidden button on the client dashboard.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('POST');
$adminId = require_admin();

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int) ($input['id'] ?? 0);
$decision = $input['decision'] ?? '';
$reason = trim($input['reason'] ?? '');

if (!$id || !in_array($decision, ['approve', 'reject'], true)) {
  respond(400, ['error' => 'Invalid request']);
}
if ($decision === 'reject' && $reason === '') {
  respond(422, ['error' => 'A rejection reason is required.']);
}

$db = get_db();
$existing = $db->prepare('SELECT id, status FROM applications WHERE id = ?');
$existing->execute([$id]);
$app = $existing->fetch();
if (!$app) respond(404, ['error' => 'Application not found']);

$newStatus = $decision === 'approve' ? 'verified' : 'rejected';

$stmt = $db->prepare('UPDATE applications SET
  status = :status,
  rejection_reason = :reason,
  reviewed_by = :admin_id,
  reviewed_at = NOW()
  WHERE id = :id');
$stmt->execute([
  'status' => $newStatus,
  'reason' => $decision === 'reject' ? $reason : null,
  'admin_id' => $adminId,
  'id' => $id,
]);

// A real deployment queues a notification email here — approve/reject only
// matters to the applicant if they're told about it.

respond(200, ['ok' => true, 'status' => $newStatus]);
