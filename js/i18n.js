/* ============================================
   Language switching (Arabic default, RTL)
   Content is authored inline in both languages using
   <span data-lang-only="ar|en"> — this script only
   flips html[lang]/[dir], persists the choice, and
   updates attributes that markup can't hold (placeholders,
   document title, aria-labels).
   ============================================ */
(function () {
  const STORAGE_KEY = 'nml_lang';

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'ar';
  }

  // Re-entrancy guard. Several pages listen for `langchange` and re-render,
  // and a render often calls applyLanguage() itself — which would dispatch
  // `langchange` again and recurse until the stack overflows. When we're
  // already inside a dispatch, still apply the DOM attributes (cheap, correct)
  // but don't fire a second event.
  let dispatching = false;

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(STORAGE_KEY, lang);

    document.querySelectorAll('[data-ph-ar]').forEach((el) => {
      const val = lang === 'ar' ? el.getAttribute('data-ph-ar') : el.getAttribute('data-ph-en');
      if (val !== null) el.setAttribute('placeholder', val);
    });

    document.querySelectorAll('[data-aria-ar]').forEach((el) => {
      const val = lang === 'ar' ? el.getAttribute('data-aria-ar') : el.getAttribute('data-aria-en');
      if (val !== null) el.setAttribute('aria-label', val);
    });

    // e.g. native input validation messages (title attribute), which the
    // browser shows verbatim on a failed pattern/required check.
    document.querySelectorAll('[data-title-ar]').forEach((el) => {
      const val = lang === 'ar' ? el.getAttribute('data-title-ar') : el.getAttribute('data-title-en');
      if (val !== null) el.setAttribute('title', val);
    });

    if (window.PAGE_TITLES) {
      document.title = window.PAGE_TITLES[lang] || document.title;
    }

    document.querySelectorAll('.lang-toggle button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    if (dispatching) return;   // called from within a langchange handler — don't recurse
    dispatching = true;
    try {
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    } finally {
      dispatching = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(getLang());
    document.querySelectorAll('.lang-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
    });
  });

  window.getLang = getLang;
  window.applyLanguage = applyLanguage;
})();
