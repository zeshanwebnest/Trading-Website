<?php
/** GET /backend/me.php — the logged-in applicant's own record. */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

require_method('GET');
$applicantId = require_applicant();

$db = get_db();
$stmt = $db->prepare('SELECT
  id, email, full_name, phone, dob, nationality,
  addr_street, addr_city, addr_country, addr_postal,
  cnic_number, cnic_expiry, cnic_front_path, cnic_back_path,
  occupation, source_of_funds, annual_income, trading_experience, is_pep,
  bank_name, account_title, account_number, swift_code,
  proof_of_address_path, additional_doc_path,
  status, rejection_reason, submitted_at
FROM applications WHERE id = ?');
$stmt->execute([$applicantId]);
$row = $stmt->fetch();

if (!$row) {
  respond(404, ['error' => 'Application not found']);
}

respond(200, $row);
