<?php
/**
 * Shared file-upload handling. Every uploaded document (CNIC front/back,
 * proof of address, etc.) goes through save_upload() so validation and
 * storage rules are enforced in exactly one place, not re-implemented per
 * field.
 */

/**
 * Validate and store one uploaded file under UPLOAD_ROOT/$subfolder.
 * Returns the stored (randomized) filename on success, or calls respond()
 * with a 422 error and stops the request on failure.
 */
function save_upload(string $fieldName, string $subfolder): string {
  if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] === UPLOAD_ERR_NO_FILE) {
    respond(422, ['error' => "Missing file: $fieldName"]);
  }
  $file = $_FILES[$fieldName];

  if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(422, ['error' => "Upload failed for $fieldName"]);
  }
  if ($file['size'] > MAX_UPLOAD_BYTES) {
    respond(422, ['error' => "$fieldName must be smaller than 5MB"]);
  }

  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($finfo, $file['tmp_name']);
  finfo_close($finfo);

  if (!isset(ALLOWED_UPLOAD_TYPES[$mime])) {
    respond(422, ['error' => "$fieldName must be a JPG, PNG, or PDF"]);
  }

  $dir = UPLOAD_ROOT . '/' . $subfolder;
  if (!is_dir($dir)) {
    mkdir($dir, 0750, true);
  }

  // Randomized filename — never trust or reuse the original name, both to
  // avoid path-traversal tricks and so a filename alone can't be guessed.
  $ext = ALLOWED_UPLOAD_TYPES[$mime];
  $storedName = bin2hex(random_bytes(16)) . '.' . $ext;
  $dest = $dir . '/' . $storedName;

  if (!move_uploaded_file($file['tmp_name'], $dest)) {
    respond(500, ['error' => "Could not save $fieldName"]);
  }

  return $subfolder . '/' . $storedName;
}
