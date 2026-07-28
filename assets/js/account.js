/* ==========================================================================
   Vault Easy — Open Account wizard + Client Dashboard
   Front-end only: this is a working UI/UX prototype of the registration and
   dashboard flow. There is no backend yet, so submitted data (including
   CNIC/bank fields) is saved to this browser's localStorage only — not
   encrypted, not sent anywhere, and cleared if the user clears site data.
   It exists so the flow and design can be reviewed before any real,
   security-reviewed backend is built to replace this storage layer.
   ========================================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = 'vaultEasyAccount';

  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

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

    const collectRecord = () => ({
      personal: {
        fullName: getVal('fullName'), email: getVal('email'), phone: getVal('phone'), dob: getVal('dob'),
        nationality: getVal('nationality'),
        address: { street: getVal('addrStreet'), city: getVal('addrCity'), country: getSelectedText('addrCountry'), postal: getVal('addrPostal') },
      },
      identity: {
        cnicNumber: getVal('cnicNumber'), cnicExpiry: getVal('cnicExpiry'),
        cnicFrontName: getFileName('cnicFront'), cnicBackName: getFileName('cnicBack'),
      },
      kyc: {
        occupation: getVal('occupation'), sourceOfFunds: getSelectedText('sourceOfFunds'),
        annualIncome: getSelectedText('annualIncome'), tradingExperience: getSelectedText('tradingExperience'),
        isPEP: (document.querySelector('input[name="pep"]:checked') || {}).value === 'yes',
      },
      bank: {
        bankName: getVal('bankName'), accountTitle: getVal('accountTitle'),
        accountNumber: getVal('accountNumber'), swiftCode: getVal('swiftCode'),
      },
      documents: { proofOfAddressName: getFileName('proofOfAddress'), additionalDocName: getFileName('additionalDoc') },
    });

    const renderRows = (listId, entries) => {
      const list = document.getElementById(listId);
      if (!list) return;
      list.innerHTML = entries.map(([label, value]) =>
        `<li><span>${escapeHTML(label)}</span><span>${escapeHTML(value || '—')}</span></li>`
      ).join('');
    };

    const buildReview = () => {
      const r = collectRecord();
      renderRows('review-personal', [
        ['Full name', r.personal.fullName], ['Email', r.personal.email], ['Phone', r.personal.phone],
        ['Date of birth', r.personal.dob], ['Nationality', r.personal.nationality],
        ['Address', `${r.personal.address.street}, ${r.personal.address.city}, ${r.personal.address.country} ${r.personal.address.postal}`.trim()],
      ]);
      renderRows('review-identity', [
        ['CNIC number', r.identity.cnicNumber], ['CNIC expiry', r.identity.cnicExpiry],
        ['CNIC front', r.identity.cnicFrontName], ['CNIC back', r.identity.cnicBackName],
      ]);
      renderRows('review-kyc', [
        ['Occupation', r.kyc.occupation], ['Source of funds', r.kyc.sourceOfFunds],
        ['Annual income', r.kyc.annualIncome], ['Trading experience', r.kyc.tradingExperience],
        ['Politically exposed person', r.kyc.isPEP ? 'Yes' : 'No'],
      ]);
      renderRows('review-bank', [
        ['Bank name', r.bank.bankName], ['Account title', r.bank.accountTitle],
        ['Account number / IBAN', r.bank.accountNumber], ['SWIFT / branch code', r.bank.swiftCode],
      ]);
      renderRows('review-docs', [
        ['Proof of address', r.documents.proofOfAddressName], ['Additional document', r.documents.additionalDocName],
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

    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateStep(steps[steps.length - 1])) return;
      const record = collectRecord();
      record.status = 'Submitted';
      record.submittedAt = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch (err) {
        // Private browsing / storage quota — the demo still completes the
        // on-screen flow, it just won't be there for the dashboard to read.
      }
      openSuccessModal();
    });

    showStep(0);
  }

  /* =====================================================================
     Client dashboard (dashboard.html)
     ===================================================================== */
  const dashShell = document.querySelector('.dash-shell');
  if (dashShell) {
    let account = null;
    try { account = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (err) { account = null; }

    const emptyState = document.getElementById('dash-empty-state');
    const content = document.getElementById('dash-content');

    if (!account) {
      if (emptyState) emptyState.style.display = 'block';
      if (content) content.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (content) content.style.display = 'grid';

      const profileList = document.getElementById('profile-overview-list');
      if (profileList) {
        const a = account.personal, id = account.identity, kyc = account.kyc, bank = account.bank;
        const maskedCnic = id.cnicNumber ? id.cnicNumber.replace(/\d(?=\d{4})/g, '•') : '—';
        const maskedAccount = bank.accountNumber ? bank.accountNumber.replace(/.(?=.{4})/g, '•') : '—';
        profileList.innerHTML = [
          ['Full name', a.fullName], ['Email', a.email], ['Phone', a.phone],
          ['Date of birth', a.dob], ['Nationality', a.nationality],
          ['Address', `${a.address.street}, ${a.address.city}, ${a.address.country} ${a.address.postal}`.trim()],
          ['CNIC number', maskedCnic], ['Occupation', kyc.occupation],
          ['Bank', bank.bankName], ['Account number', maskedAccount],
        ].map(([label, value]) => `<li><span>${escapeHTML(label)}</span><span>${escapeHTML(value || '—')}</span></li>`).join('');
      }

      const statusBadge = document.getElementById('status-badge');
      if (statusBadge) statusBadge.textContent = account.status || 'Submitted';

      const docList = document.getElementById('doc-list');
      if (docList) {
        const docs = [
          ['CNIC (front)', account.identity.cnicFrontName],
          ['CNIC (back)', account.identity.cnicBackName],
          ['Proof of address', account.documents.proofOfAddressName],
          ['Additional document', account.documents.additionalDocName],
        ].filter(([, name]) => name);
        docList.innerHTML = docs.map(([label, name]) => `
          <li class="doc-item">
            <span class="doc-item-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              <span><b>${escapeHTML(label)}</b><small>${escapeHTML(name)}</small></span>
            </span>
            <button type="button" class="btn btn-ghost btn-sm">Replace</button>
          </li>`).join('');
      }

      const editForm = document.getElementById('edit-profile-form');
      if (editForm) {
        const a = account.personal;
        ['fullName', 'email', 'phone', 'dob', 'nationality'].forEach((field) => {
          const el = editForm.querySelector('#edit-' + field);
          if (el) el.value = a[field] || '';
        });
        const streetEl = editForm.querySelector('#edit-addrStreet');
        if (streetEl) streetEl.value = a.address.street || '';
        const cityEl = editForm.querySelector('#edit-addrCity');
        if (cityEl) cityEl.value = a.address.city || '';
        const postalEl = editForm.querySelector('#edit-addrPostal');
        if (postalEl) postalEl.value = a.address.postal || '';

        editForm.addEventListener('submit', (e) => {
          e.preventDefault();
          account.personal.fullName = editForm.querySelector('#edit-fullName').value;
          account.personal.email = editForm.querySelector('#edit-email').value;
          account.personal.phone = editForm.querySelector('#edit-phone').value;
          account.personal.dob = editForm.querySelector('#edit-dob').value;
          account.personal.nationality = editForm.querySelector('#edit-nationality').value;
          account.personal.address.street = editForm.querySelector('#edit-addrStreet').value;
          account.personal.address.city = editForm.querySelector('#edit-addrCity').value;
          account.personal.address.postal = editForm.querySelector('#edit-addrPostal').value;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(account)); } catch (err) { /* ignore */ }
          const note = document.getElementById('edit-save-note');
          if (note) {
            note.classList.add('is-visible');
            setTimeout(() => note.classList.remove('is-visible'), 2400);
          }
        });
      }
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
  }
})();
