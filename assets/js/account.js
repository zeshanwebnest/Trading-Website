/* ==========================================================================
   Vault Easy — Open Account wizard + Client Dashboard
   Talks to the real PHP/MySQL backend under /backend — registration, login,
   and profile data all go through the API (see backend/README.md), not
   localStorage. Requires the site to be served over http(s), e.g. via
   XAMPP's Apache, not opened directly as a file:// path.
   ========================================================================== */
(() => {
  'use strict';

  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const api = async (url, options = {}) => {
    const res = await fetch(url, { credentials: 'include', ...options });
    let data = {};
    try { data = await res.json(); } catch (err) { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  };

  /* =====================================================================
     Registration wizard (open-account.html)
     ===================================================================== */
  const regForm = document.getElementById('reg-form');
  if (regForm) {
    const shell = regForm.closest('.reg-shell');
    const steps = Array.from(regForm.querySelectorAll('.reg-step'));
    const progressSteps = Array.from(document.querySelectorAll('.reg-progress-step'));
    let current = 0;

    const showStep = (index) => {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
      progressSteps.forEach((p, i) => {
        p.classList.toggle('is-active', i === index);
        p.classList.toggle('is-done', i < index);
      });
      if (shell) shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
      current = index;
    };

    const setError = (field, message) => {
      const wrap = field.closest('.form-field, .upload-field, [data-radio-group]');
      if (!wrap) return;
      wrap.classList.add('has-error');
      const err = wrap.querySelector('.field-error');
      if (err && message) err.textContent = message;
    };
    const clearError = (field) => {
      const wrap = field.closest('.form-field, .upload-field, [data-radio-group]');
      if (wrap) wrap.classList.remove('has-error');
    };

    const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isValidPhone = (v) => /^[+\d][\d\s-]{6,17}$/.test(v);
    const isValidCNIC = (v) => /^\d{5}-\d{7}-\d{1}$/.test(v);
    const isAdult = (dobStr) => {
      const dob = new Date(dobStr);
      if (Number.isNaN(dob.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
      return age >= 18;
    };

    // CNIC auto-format as the user types: 5 digits - 7 digits - 1 digit
    const cnicInput = document.getElementById('cnicNumber');
    if (cnicInput) {
      cnicInput.addEventListener('input', () => {
        const d = cnicInput.value.replace(/\D/g, '').slice(0, 13);
        cnicInput.value = [d.slice(0, 5), d.slice(5, 12), d.slice(12, 13)].filter(Boolean).join('-');
      });
    }

    // File upload UI: reflect the chosen file on its dropzone
    document.querySelectorAll('.upload-field input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const wrap = input.closest('.upload-field');
        const box = wrap.querySelector('.upload-box');
        const preview = wrap.querySelector('.upload-preview');
        const file = input.files[0];
        if (!file) { wrap.classList.remove('has-file'); box.classList.remove('has-file'); return; }
        if (file.size > 5 * 1024 * 1024) {
          setError(input, 'File must be smaller than 5MB.');
          input.value = '';
          wrap.classList.remove('has-file');
          box.classList.remove('has-file');
          return;
        }
        clearError(input);
        wrap.classList.add('has-file');
        box.classList.add('has-file');
        if (preview) preview.textContent = file.name;
      });
    });

    const validators = {
      fullName: (el) => (el.value.trim().length >= 3 ? '' : 'Enter your full legal name.'),
      email: (el) => (isValidEmail(el.value.trim()) ? '' : 'Enter a valid email address.'),
      phone: (el) => (isValidPhone(el.value.trim()) ? '' : 'Enter a valid phone number.'),
      password: (el) => (el.value.length >= 8 ? '' : 'Password must be at least 8 characters.'),
      confirmPassword: (el) => {
        const pw = document.getElementById('password');
        return el.value === (pw ? pw.value : '') ? '' : 'Passwords do not match.';
      },
      dob: (el) => (el.value && isAdult(el.value) ? '' : 'You must be at least 18 years old.'),
      nationality: (el) => (el.value.trim() ? '' : 'Nationality is required.'),
      addrStreet: (el) => (el.value.trim() ? '' : 'Street address is required.'),
      addrCity: (el) => (el.value.trim() ? '' : 'City is required.'),
      addrCountry: (el) => (el.value ? '' : 'Select a country.'),
      cnicNumber: (el) => (isValidCNIC(el.value.trim()) ? '' : 'Format: 12345-1234567-1'),
      cnicExpiry: (el) => {
        if (!el.value) return 'CNIC expiry date is required.';
        return new Date(el.value) > new Date() ? '' : 'CNIC must not be expired.';
      },
      cnicFront: (el) => (el.files.length ? '' : 'Upload the front of your CNIC.'),
      cnicBack: (el) => (el.files.length ? '' : 'Upload the back of your CNIC.'),
      occupation: (el) => (el.value.trim() ? '' : 'Occupation is required.'),
      sourceOfFunds: (el) => (el.value ? '' : 'Select a source of funds.'),
      annualIncome: (el) => (el.value ? '' : 'Select an income range.'),
      tradingExperience: (el) => (el.value ? '' : 'Select your experience level.'),
      bankName: (el) => (el.value.trim() ? '' : 'Bank name is required.'),
      accountTitle: (el) => (el.value.trim() ? '' : 'Account title is required.'),
      accountNumber: (el) => (el.value.trim().length >= 6 ? '' : 'Enter a valid account number / IBAN.'),
      proofOfAddress: (el) => (el.files.length ? '' : 'Upload a proof of address document.'),
    };

    const validateStep = (stepEl) => {
      let ok = true;
      stepEl.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.type === 'radio' || el.type === 'checkbox') return;
        const validator = validators[el.id];
        if (!validator) return;
        const msg = validator(el);
        if (msg) { setError(el, msg); ok = false; } else { clearError(el); }
      });
      const pepGroup = stepEl.querySelector('[data-radio-group="pep"]');
      if (pepGroup) {
        const checked = stepEl.querySelector('input[name="pep"]:checked');
        pepGroup.classList.toggle('has-error', !checked);
        if (!checked) ok = false;
      }
      const consent = stepEl.querySelector('#consentCheck');
      if (consent) {
        const row = consent.closest('.consent-row');
        row.classList.toggle('has-error', !consent.checked);
        if (!consent.checked) ok = false;
      }
      return ok;
    };

    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const getFileName = (id) => { const el = document.getElementById(id); return el && el.files[0] ? el.files[0].name : ''; };
    const getSelectedText = (id) => { const el = document.getElementById(id); return el && el.selectedOptions[0] ? el.selectedOptions[0].textContent : ''; };

    const renderRows = (listId, entries) => {
      const list = document.getElementById(listId);
      if (!list) return;
      list.innerHTML = entries.map(([label, value]) =>
        `<li><span>${escapeHTML(label)}</span><span>${escapeHTML(value || '—')}</span></li>`
      ).join('');
    };

    const buildReview = () => {
      renderRows('review-personal', [
        ['Full name', getVal('fullName')], ['Email', getVal('email')], ['Phone', getVal('phone')],
        ['Date of birth', getVal('dob')], ['Nationality', getVal('nationality')],
        ['Address', `${getVal('addrStreet')}, ${getVal('addrCity')}, ${getSelectedText('addrCountry')} ${getVal('addrPostal')}`.trim()],
      ]);
      renderRows('review-identity', [
        ['CNIC number', getVal('cnicNumber')], ['CNIC expiry', getVal('cnicExpiry')],
        ['CNIC front', getFileName('cnicFront')], ['CNIC back', getFileName('cnicBack')],
      ]);
      renderRows('review-kyc', [
        ['Occupation', getVal('occupation')], ['Source of funds', getSelectedText('sourceOfFunds')],
        ['Annual income', getSelectedText('annualIncome')], ['Trading experience', getSelectedText('tradingExperience')],
        ['Politically exposed person', (document.querySelector('input[name="pep"]:checked') || {}).value === 'yes' ? 'Yes' : 'No'],
      ]);
      renderRows('review-bank', [
        ['Bank name', getVal('bankName')], ['Account title', getVal('accountTitle')],
        ['Account number / IBAN', getVal('accountNumber')], ['SWIFT / branch code', getVal('swiftCode')],
      ]);
      renderRows('review-docs', [
        ['Proof of address', getFileName('proofOfAddress')], ['Additional document', getFileName('additionalDoc')],
      ]);
    };

    document.querySelectorAll('[data-action="next"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!validateStep(steps[current])) return;
        if (current === steps.length - 2) buildReview();
        if (current < steps.length - 1) showStep(current + 1);
      });
    });
    document.querySelectorAll('[data-action="back"]').forEach((btn) => {
      btn.addEventListener('click', () => { if (current > 0) showStep(current - 1); });
    });

    const openSuccessModal = () => {
      const modal = document.getElementById('success-modal');
      if (!modal) return;
      modal.classList.add('is-open');
      const countdownEl = modal.querySelector('#redirect-countdown');
      let seconds = 4;
      let redirectTimer = null;

      const closeModal = () => {
        modal.classList.remove('is-open');
        if (redirectTimer) clearTimeout(redirectTimer);
        document.removeEventListener('keydown', onKeydown);
      };
      const onKeydown = (e) => { if (e.key === 'Escape') closeModal(); };

      const closeBtn = modal.querySelector('#modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal, { once: true });
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }, { once: true });
      document.addEventListener('keydown', onKeydown);

      const tick = () => {
        if (countdownEl) countdownEl.textContent = String(seconds);
        if (seconds <= 0) {
          window.location.href = 'https://www.hybridsolutions.com/downloads/Mobile/VertexFXTraderPro.apk';
          return;
        }
        seconds -= 1;
        redirectTimer = setTimeout(tick, 1000);
      };
      tick();
    };

    const submitError = (message) => {
      let banner = document.getElementById('reg-submit-error');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'reg-submit-error';
        banner.className = 'callout is-danger';
        banner.style.marginTop = '20px';
        steps[steps.length - 1].insertBefore(banner, steps[steps.length - 1].querySelector('.reg-actions'));
      }
      banner.textContent = message;
      banner.style.display = 'block';
    };

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateStep(steps[steps.length - 1])) return;

      const submitBtn = regForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account…'; }

      const isPEPChecked = document.querySelector('input[name="pep"]:checked');
      const formData = new FormData();
      ['fullName', 'email', 'phone', 'password', 'dob', 'nationality', 'addrStreet', 'addrCity',
        'addrCountry', 'addrPostal', 'cnicNumber', 'cnicExpiry', 'occupation', 'sourceOfFunds',
        'annualIncome', 'tradingExperience', 'bankName', 'accountTitle', 'accountNumber', 'swiftCode',
      ].forEach((id) => formData.append(id, getVal(id)));
      formData.append('isPEP', isPEPChecked ? isPEPChecked.value : 'no');
      ['cnicFront', 'cnicBack', 'proofOfAddress', 'additionalDoc'].forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.files[0]) formData.append(id, el.files[0]);
      });

      const { ok, status, data } = await api('backend/register.php', { method: 'POST', body: formData });

      if (ok) {
        openSuccessModal();
        return;
      }

      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }

      if (status === 409 && data.fields && data.fields.email) {
        showStep(0);
        setError(document.getElementById('email'), data.fields.email);
        submitError('An account with this email already exists — sign in instead, or use a different email.');
        return;
      }
      if (status === 422 && data.fields) {
        submitError('Some details need fixing before this can be submitted. Please check earlier steps.');
        return;
      }
      submitError(data.error || 'Something went wrong. Please try again.');
    });

    showStep(0);
  }

  /* =====================================================================
     Client dashboard (dashboard.html)
     ===================================================================== */
  const dashRoot = document.getElementById('dash-root');
  if (dashRoot) {
    const loginPanel = document.getElementById('dash-login');
    const emptyState = document.getElementById('dash-empty-state');
    const content = document.getElementById('dash-content');
    const showOnly = (el) => {
      [loginPanel, emptyState, content].forEach((node) => {
        if (node) node.style.display = node === el ? (el === content ? 'grid' : 'block') : 'none';
      });
    };

    const fieldLabel = (value) => value || '—';

    const renderAccount = (a) => {
      const profileList = document.getElementById('profile-overview-list');
      if (profileList) {
        const maskedCnic = a.cnic_number ? a.cnic_number.replace(/\d(?=\d{4})/g, '•') : '—';
        const maskedAccount = a.account_number ? a.account_number.replace(/.(?=.{4})/g, '•') : '—';
        profileList.innerHTML = [
          ['Full name', a.full_name], ['Email', a.email], ['Phone', a.phone],
          ['Date of birth', a.dob], ['Nationality', a.nationality],
          ['Address', `${a.addr_street}, ${a.addr_city}, ${a.addr_country} ${a.addr_postal || ''}`.trim()],
          ['CNIC number', maskedCnic], ['Occupation', a.occupation],
          ['Bank', a.bank_name], ['Account number', maskedAccount],
        ].map(([label, value]) => `<li><span>${escapeHTML(label)}</span><span>${escapeHTML(fieldLabel(value))}</span></li>`).join('');
      }

      const statusBadge = document.getElementById('status-badge');
      const statusLabels = { under_review: 'Under Review', verified: 'Verified', rejected: 'Rejected' };
      if (statusBadge) statusBadge.textContent = statusLabels[a.status] || a.status;

      const tracker = document.getElementById('verify-tracker');
      if (tracker) {
        const stepEls = tracker.querySelectorAll('.verify-step');
        stepEls.forEach((el) => el.classList.remove('is-current', 'is-complete'));
        if (a.status === 'rejected') {
          stepEls[0].classList.add('is-complete');
          tracker.dataset.rejected = 'true';
        } else {
          stepEls[0].classList.add('is-complete');
          if (a.status === 'verified') {
            stepEls[1].classList.add('is-complete');
            stepEls[2].classList.add('is-complete');
          } else {
            stepEls[1].classList.add('is-current');
          }
        }
      }
      const rejectionNote = document.getElementById('rejection-note');
      if (rejectionNote) {
        if (a.status === 'rejected' && a.rejection_reason) {
          rejectionNote.style.display = 'block';
          rejectionNote.querySelector('span').textContent = a.rejection_reason;
        } else {
          rejectionNote.style.display = 'none';
        }
      }

      const docList = document.getElementById('doc-list');
      if (docList) {
        const docs = [
          ['CNIC (front)', 'cnic_front', a.cnic_front_path],
          ['CNIC (back)', 'cnic_back', a.cnic_back_path],
          ['Proof of address', 'proof_of_address', a.proof_of_address_path],
          ['Additional document', 'additional_doc', a.additional_doc_path],
        ].filter(([, , path]) => path);
        docList.innerHTML = docs.map(([label, field, path]) => `
          <li class="doc-item">
            <span class="doc-item-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              <span><b>${escapeHTML(label)}</b><small>${escapeHTML(path.split('/').pop())}</small></span>
            </span>
            <a class="btn btn-ghost btn-sm" href="backend/file.php?id=${a.id}&field=${field}" target="_blank" rel="noopener">View</a>
          </li>`).join('');
      }

      const editForm = document.getElementById('edit-profile-form');
      if (editForm) {
        ['fullName', 'email', 'phone', 'dob', 'nationality'].forEach((field) => {
          const el = editForm.querySelector('#edit-' + field);
          const key = field.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
          if (el) el.value = a[key] || '';
        });
        editForm.querySelector('#edit-addrStreet').value = a.addr_street || '';
        editForm.querySelector('#edit-addrCity').value = a.addr_city || '';
        editForm.querySelector('#edit-addrPostal').value = a.addr_postal || '';
      }
    };

    const loadAccount = async () => {
      const { ok, data } = await api('backend/me.php');
      if (ok) {
        showOnly(content);
        renderAccount(data);
      } else {
        showOnly(loginPanel || emptyState);
      }
    };

    const loginForm = document.getElementById('dash-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const { ok, data } = await api('backend/login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (ok) {
          if (errorEl) errorEl.style.display = 'none';
          loadAccount();
        } else if (errorEl) {
          errorEl.textContent = data.error || 'Sign-in failed.';
          errorEl.style.display = 'block';
        }
      });
    }

    const logoutBtn = document.getElementById('dash-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await api('backend/logout.php', { method: 'POST' });
        loadAccount();
      });
    }

    const editForm = document.getElementById('edit-profile-form');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          fullName: editForm.querySelector('#edit-fullName').value,
          email: editForm.querySelector('#edit-email').value,
          phone: editForm.querySelector('#edit-phone').value,
          dob: editForm.querySelector('#edit-dob').value,
          nationality: editForm.querySelector('#edit-nationality').value,
          addrStreet: editForm.querySelector('#edit-addrStreet').value,
          addrCity: editForm.querySelector('#edit-addrCity').value,
          addrPostal: editForm.querySelector('#edit-addrPostal').value,
        };
        const { ok, data } = await api('backend/update-profile.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const note = document.getElementById('edit-save-note');
        if (ok) {
          if (note) { note.textContent = '✓ Changes saved'; note.classList.add('is-visible'); setTimeout(() => note.classList.remove('is-visible'), 2400); }
          loadAccount();
        } else if (note) {
          note.textContent = data.error || 'Could not save changes.';
          note.style.color = 'var(--danger, #d97a6c)';
          note.classList.add('is-visible');
        }
      });
    }

    const navButtons = document.querySelectorAll('.dash-nav button');
    const panels = document.querySelectorAll('.dash-panel');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        navButtons.forEach((b) => b.classList.remove('is-active'));
        panels.forEach((p) => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        const target = document.getElementById(btn.dataset.panel);
        if (target) target.classList.add('is-active');
      });
    });

    loadAccount();
  }

  /* =====================================================================
     Admin panel (admin.html)
     ===================================================================== */
  const adminLoginPanel = document.getElementById('admin-login');
  if (adminLoginPanel) {
    const queuePanel = document.getElementById('admin-queue');
    const detailPanel = document.getElementById('admin-detail');
    const logoutBtn = document.getElementById('admin-logout');
    let activeStatusFilter = '';
    let activeApplicationId = null;

    const showAdminView = (view) => {
      [adminLoginPanel, queuePanel, detailPanel].forEach((el) => { el.style.display = 'none'; });
      view.style.display = 'block';
      logoutBtn.style.display = view === adminLoginPanel ? 'none' : 'inline-flex';
    };

    const statusLabel = { under_review: 'Under Review', verified: 'Verified', rejected: 'Rejected' };

    const loadQueue = async () => {
      const qs = activeStatusFilter ? `?status=${activeStatusFilter}` : '';
      const { ok, data } = await api('backend/admin-list.php' + qs);
      if (!ok) { showAdminView(adminLoginPanel); return; }

      const body = document.getElementById('admin-queue-body');
      const emptyMsg = document.getElementById('admin-queue-empty');
      const rows = data.applications || [];
      emptyMsg.style.display = rows.length ? 'none' : 'block';
      body.innerHTML = rows.map((row) => `
        <tr data-id="${row.id}">
          <td class="who">${escapeHTML(row.full_name)}</td>
          <td>${escapeHTML(row.email)}</td>
          <td>${escapeHTML(new Date(row.submitted_at).toLocaleString())}</td>
          <td><span class="status-badge is-${row.status}">${statusLabel[row.status] || row.status}</span></td>
          <td>${escapeHTML(row.reviewed_by_name || '—')}</td>
        </tr>`).join('');

      body.querySelectorAll('tr').forEach((tr) => {
        tr.addEventListener('click', () => loadDetail(Number(tr.dataset.id)));
      });
      showAdminView(queuePanel);
    };

    const docLink = (label, field, id, path) => {
      if (!path) return '';
      return `<a href="backend/file.php?id=${id}&field=${field}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
        ${escapeHTML(label)}</a>`;
    };

    const renderList = (listId, entries) => {
      document.getElementById(listId).innerHTML = entries.map(([label, value]) =>
        `<li><span>${escapeHTML(label)}</span><span>${escapeHTML(value === null || value === undefined || value === '' ? '—' : String(value))}</span></li>`
      ).join('');
    };

    const loadDetail = async (id) => {
      const { ok, data: a } = await api(`backend/admin-detail.php?id=${id}`);
      if (!ok) return;
      activeApplicationId = id;

      document.getElementById('detail-name').textContent = a.full_name;
      const statusBadge = document.getElementById('detail-status');
      statusBadge.textContent = statusLabel[a.status] || a.status;
      statusBadge.className = 'status-badge is-' + a.status;

      renderList('detail-personal', [
        ['Email', a.email], ['Phone', a.phone], ['Date of birth', a.dob], ['Nationality', a.nationality],
        ['Address', `${a.addr_street}, ${a.addr_city}, ${a.addr_country} ${a.addr_postal || ''}`.trim()],
      ]);
      renderList('detail-identity-text', [
        ['CNIC number', a.cnic_number], ['CNIC expiry', a.cnic_expiry],
      ]);
      document.getElementById('detail-identity-docs').innerHTML =
        docLink('View CNIC front', 'cnic_front', id, a.cnic_front_path) +
        docLink('View CNIC back', 'cnic_back', id, a.cnic_back_path);
      renderList('detail-kyc', [
        ['Occupation', a.occupation], ['Source of funds', a.source_of_funds],
        ['Annual income', a.annual_income], ['Trading experience', a.trading_experience],
        ['Politically exposed person', a.is_pep == 1 ? 'Yes' : 'No'],
      ]);
      renderList('detail-bank', [
        ['Bank name', a.bank_name], ['Account title', a.account_title],
        ['Account number / IBAN', a.account_number], ['SWIFT / branch code', a.swift_code],
      ]);
      document.getElementById('detail-supporting-docs').innerHTML =
        docLink('View proof of address', 'proof_of_address', id, a.proof_of_address_path) +
        docLink('View additional document', 'additional_doc', id, a.additional_doc_path);

      const reviewedInfo = document.getElementById('detail-reviewed-info');
      if (a.reviewed_at) {
        reviewedInfo.style.display = 'block';
        renderList('detail-reviewed-list', [
          ['Reviewed by', a.reviewed_by_name], ['Reviewed at', new Date(a.reviewed_at).toLocaleString()],
          ...(a.status === 'rejected' ? [['Reason', a.rejection_reason]] : []),
        ]);
      } else {
        reviewedInfo.style.display = 'none';
      }

      const decisionPanel = document.getElementById('detail-decision-panel');
      const decisionNote = document.getElementById('decision-note');
      const decisionActions = document.getElementById('decision-actions');
      document.getElementById('reject-form').style.display = 'none';
      document.getElementById('decision-error').style.display = 'none';
      if (a.status === 'under_review') {
        decisionNote.textContent = 'Review the documents above, then approve or reject this application.';
        decisionActions.style.display = 'flex';
      } else {
        decisionNote.textContent = `This application has already been ${statusLabel[a.status].toLowerCase()} — no further action needed.`;
        decisionActions.style.display = 'none';
      }
      decisionPanel.style.display = 'block';

      showAdminView(detailPanel);
    };

    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value;
      const errorEl = document.getElementById('admin-login-error');
      const { ok, data } = await api('backend/admin-login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (ok) {
        errorEl.style.display = 'none';
        loadQueue();
      } else {
        errorEl.textContent = data.error || 'Sign-in failed.';
        errorEl.style.display = 'block';
      }
    });

    logoutBtn.addEventListener('click', async () => {
      await api('backend/admin-logout.php', { method: 'POST' });
      showAdminView(adminLoginPanel);
    });

    document.querySelectorAll('.pill-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pill-filter').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeStatusFilter = btn.dataset.status;
        loadQueue();
      });
    });

    document.getElementById('admin-back-to-queue').addEventListener('click', loadQueue);

    document.getElementById('btn-approve').addEventListener('click', async () => {
      const { ok, data } = await api('backend/admin-decision.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeApplicationId, decision: 'approve' }),
      });
      if (ok) loadDetail(activeApplicationId);
      else {
        const err = document.getElementById('decision-error');
        err.textContent = data.error || 'Could not approve this application.';
        err.style.display = 'block';
      }
    });

    document.getElementById('btn-show-reject').addEventListener('click', () => {
      document.getElementById('reject-form').style.display = 'block';
    });
    document.getElementById('btn-cancel-reject').addEventListener('click', () => {
      document.getElementById('reject-form').style.display = 'none';
    });
    document.getElementById('btn-confirm-reject').addEventListener('click', async () => {
      const reason = document.getElementById('reject-reason').value.trim();
      const err = document.getElementById('decision-error');
      if (!reason) {
        err.textContent = 'A rejection reason is required.';
        err.style.display = 'block';
        return;
      }
      const { ok, data } = await api('backend/admin-decision.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeApplicationId, decision: 'reject', reason }),
      });
      if (ok) loadDetail(activeApplicationId);
      else {
        err.textContent = data.error || 'Could not reject this application.';
        err.style.display = 'block';
      }
    });

    // Land on the queue directly if a session is already active (e.g. a
    // page refresh) instead of always showing the login form first.
    loadQueue();
  }
})();
