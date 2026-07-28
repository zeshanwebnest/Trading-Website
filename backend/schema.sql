-- Vault Easy — backend schema
-- Run once against a fresh database (see backend/README.md for setup steps).

CREATE DATABASE IF NOT EXISTS vault_easy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vault_easy;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Login (an application record doubles as the applicant's account)
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Personal
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  dob DATE NOT NULL,
  nationality VARCHAR(80) NOT NULL,
  addr_street VARCHAR(190) NOT NULL,
  addr_city VARCHAR(100) NOT NULL,
  addr_country VARCHAR(100) NOT NULL,
  addr_postal VARCHAR(20) NULL,

  -- Identity
  cnic_number VARCHAR(15) NOT NULL,
  cnic_expiry DATE NOT NULL,
  cnic_front_path VARCHAR(255) NOT NULL,
  cnic_back_path VARCHAR(255) NOT NULL,

  -- KYC profile
  occupation VARCHAR(150) NOT NULL,
  source_of_funds VARCHAR(100) NOT NULL,
  annual_income VARCHAR(50) NOT NULL,
  trading_experience VARCHAR(50) NOT NULL,
  is_pep TINYINT(1) NOT NULL DEFAULT 0,

  -- Bank details
  bank_name VARCHAR(150) NOT NULL,
  account_title VARCHAR(150) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  swift_code VARCHAR(30) NULL,

  -- Supporting documents
  proof_of_address_path VARCHAR(255) NOT NULL,
  additional_doc_path VARCHAR(255) NULL,

  -- Review state — see backend/README.md for the state machine.
  -- 'under_review' the moment a submission lands; there is no separate
  -- transient "submitted" row state, since submission and entering the
  -- review queue happen in the same instant.
  status ENUM('under_review', 'verified', 'rejected') NOT NULL DEFAULT 'under_review',
  rejection_reason VARCHAR(500) NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,

  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES admin_users(id)
) ENGINE=InnoDB;
