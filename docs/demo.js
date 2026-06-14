'use strict';

// Before/after demo toggle
document.querySelectorAll('[data-demo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    document.querySelectorAll(`[data-demo][data-group="${group}"]`).forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    document.querySelectorAll(`[data-pane][data-group="${group}"]`).forEach((p) => {
      p.classList.toggle('active', p.dataset.pane === btn.dataset.demo);
    });
  });
});

// Install tabs
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    document.querySelectorAll(`[data-tab][data-group="${group}"]`).forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    document.querySelectorAll(`[data-tabpane][data-group="${group}"]`).forEach((p) => {
      p.classList.toggle('active', p.dataset.tabpane === btn.dataset.tab);
    });
  });
});

// Copy buttons
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const code = btn.closest('[data-tabpane]')?.querySelector('code')?.textContent ||
                 btn.dataset.copy || '';
    navigator.clipboard.writeText(code.trim()).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
});
