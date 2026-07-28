<?php
/**
 * POST /backend/register.php
 * Creates a new application + applicant account, validating everything the
 * front-end already validates — client-side validation is a UX convenience,
 * never a security boundary, so every rule is re-checked here.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/db.php';
require __DIR__ . '/uploads.php';

require_method('POST');

$errors = [];
$f = fn($k) => trim($_POST[$k] ?? '');

$fullName = $f('fullName');
$email = strtolower($f('email'));
$phone = $f('phone');
$password = (string) ($_POST['password'] ?? '');
$dob = $f('dob');
$nationality = $f('nationality');
$addrStreet = $f('addrStreet');
$addrCity = $f('addrCity');
$addrCountry = $f('addrCountry');
$addrPostal = $f('addrPostal');
$cnicNumber = $f('cnicNumber');
$cnicExpiry = $f('cnicExpiry');
$occupation = $f('occupation');
$sourceOfFunds = $f('sourceOfFunds');
$annualIncome = $f('annualIncome');
$tradingExperience = $f('tradingExperience');
$isPEP = ($f('isPEP') === 'yes') ? 1 : 0;
$bankName = $f('bankName');
$accountTitle = $f('accountTitle');
$accountNumber = $f('accountNumber');
$swiftCode = $f('swiftCode');

if (mb_strlen($fullName) < 3) $errors['fullName'] = 'Enter your full legal name.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';
if (!preg_match('/^[+\d][\d\s-]{6,17}$/', $phone)) $errors['phone'] = 'Enter a valid phone number.';
if (mb_strlen($password) < 8) $errors['password'] = 'Password must be at least 8 characters.';

$dobTime = DateTime::createFromFormat('Y-m-d', $dob);
if (!$dobTime || $dobTime->diff(new DateTime())->y < 18) $errors['dob'] = 'You must be at least 18 years old.';
if ($nationality === '') $errors['nationality'] = 'Nationality is required.';
if ($addrStreet === '') $errors['addrStreet'] = 'Street address is required.';
if ($addrCity === '') $errors['addrCity'] = 'City is required.';
if ($addrCountry === '') $errors['addrCountry'] = 'Country is required.';
if (!preg_match('/^\d{5}-\d{7}-\d{1}$/', $cnicNumber)) $errors['cnicNumber'] = 'Format: 12345-1234567-1';

$cnicExpiryTime = DateTime::createFromFormat('Y-m-d', $cnicExpiry);
if (!$cnicExpiryTime || $cnicExpiryTime <= new DateTime()) $errors['cnicExpiry'] = 'CNIC must not be expired.';
if ($occupation === '') $errors['occupation'] = 'Occupation is required.';
if ($sourceOfFunds === '') $errors['sourceOfFunds'] = 'Source of funds is required.';
if ($annualIncome === '') $errors['annualIncome'] = 'Annual income is required.';
if ($tradingExperience === '') $errors['tradingExperience'] = 'Trading experience is required.';
if ($bankName === '') $errors['bankName'] = 'Bank name is required.';
if ($accountTitle === '') $errors['accountTitle'] = 'Account title is required.';
if (mb_strlen($accountNumber) < 6) $errors['accountNumber'] = 'Enter a valid account number / IBAN.';

if ($errors) {
  respond(422, ['error' => 'Validation failed', 'fields' => $errors]);
}

$db = get_db();

$existing = $db->prepare('SELECT id FROM applications WHERE email = ?');
$existing->execute([$email]);
if ($existing->fetch()) {
  respond(409, ['error' => 'An account with this email already exists.', 'fields' => ['email' => 'Already registered.']]);
}

// Uploads validated + stored only after every text field has already passed,
// so a bad text field doesn't leave orphaned files on disk.
$cnicFrontPath = save_upload('cnicFront', 'cnic_front');
$cnicBackPath = save_upload('cnicBack', 'cnic_back');
$proofOfAddressPath = save_upload('proofOfAddress', 'proof_of_address');
$additionalDocPath = isset($_FILES['additionalDoc']) && $_FILES['additionalDoc']['error'] !== UPLOAD_ERR_NO_FILE
  ? save_upload('additionalDoc', 'additional_doc')
  : null;

$stmt = $db->prepare('INSERT INTO applications (
  email, password_hash, full_name, phone, dob, nationality,
  addr_street, addr_city, addr_country, addr_postal,
  cnic_number, cnic_expiry, cnic_front_path, cnic_back_path,
  occupation, source_of_funds, annual_income, trading_experience, is_pep,
  bank_name, account_title, account_number, swift_code,
  proof_of_address_path, additional_doc_path
) VALUES (
  :email, :password_hash, :full_name, :phone, :dob, :nationality,
  :addr_street, :addr_city, :addr_country, :addr_postal,
  :cnic_number, :cnic_expiry, :cnic_front_path, :cnic_back_path,
  :occupation, :source_of_funds, :annual_income, :trading_experience, :is_pep,
  :bank_name, :account_title, :account_number, :swift_code,
  :proof_of_address_path, :additional_doc_path
)');

$stmt->execute([
  'email' => $email,
  'password_hash' => password_hash($password, PASSWORD_DEFAULT),
  'full_name' => $fullName,
  'phone' => $phone,
  'dob' => $dob,
  'nationality' => $nationality,
  'addr_street' => $addrStreet,
  'addr_city' => $addrCity,
  'addr_country' => $addrCountry,
  'addr_postal' => $addrPostal ?: null,
  'cnic_number' => $cnicNumber,
  'cnic_expiry' => $cnicExpiry,
  'cnic_front_path' => $cnicFrontPath,
  'cnic_back_path' => $cnicBackPath,
  'occupation' => $occupation,
  'source_of_funds' => $sourceOfFunds,
  'annual_income' => $annualIncome,
  'trading_experience' => $tradingExperience,
  'is_pep' => $isPEP,
  'bank_name' => $bankName,
  'account_title' => $accountTitle,
  'account_number' => $accountNumber,
  'swift_code' => $swiftCode ?: null,
  'proof_of_address_path' => $proofOfAddressPath,
  'additional_doc_path' => $additionalDocPath,
]);

$applicationId = (int) $db->lastInsertId();

session_regenerate_id(true);
$_SESSION['applicant_id'] = $applicationId;

respond(201, ['ok' => true, 'id' => $applicationId]);
