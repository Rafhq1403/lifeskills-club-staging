/* ============================================
   Shared UI interactions: mobile nav, sidebar, tabs,
   accordions, modals — and the accessibility layer
   underneath all of them.

   The a11y work here is deliberately done by *upgrading
   existing markup at runtime* rather than by editing the
   ~26 modal call sites, 13 tables and 16 page headers by
   hand. Two reasons: a hand-edit that misses one page
   silently reintroduces the bug, and every dashboard here
   renders its rows from an API response after load — so
   anything keyed to markup that exists at parse time would
   skip exactly the content that matters. Everything below
   is therefore either delegated, observed, or re-runnable
   (see refreshA11y).
   ============================================ */

/* ============================================
   Numbers and dates

   Arabic has two digit sets, and the app was using both at once — a single
   screen could show "٩٠ دقيقة" beside "12 دقائق متبقية" and "0 من 6". The
   cause is that `ar-SA` resolves to Eastern Arabic numerals (١٢٣), while
   hardcoded strings and bare toLocaleString() produced Western ones (123).

   Standardised on Western digits, because Saudi official, commercial and
   school-facing print overwhelmingly uses them, and because this codebase's
   own `.num` rule (direction:ltr + monospace, see base.css) only makes sense
   for them. `-u-nu-latn` selects the digits; `-ca-gregory` pins the calendar,
   since `ar-SA` otherwise resolves to Umm al-Qura on some ICU builds and
   would silently start printing Hijri dates.

   Everything routes through here, so reversing the decision is one constant.
   ============================================ */
const AR_LOCALE = 'ar-u-nu-latn-ca-gregory';
const EN_LOCALE = 'en-US';

const localeFor = (lang) => ((lang || (window.getLang && getLang())) === 'en' ? EN_LOCALE : AR_LOCALE);

/* Thousands separators. Never call toLocaleString() with no locale — it
   follows the *system* locale, so the same build renders 148,800 on one
   machine and ١٤٨٬٨٠٠ on another. */
function formatNumber(value, lang) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(localeFor(lang)) : '';
}

function formatDate(value, options = { month: 'short', day: 'numeric' }, lang) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(localeFor(lang), options);
}

function formatDateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }, lang) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(localeFor(lang), options);
}

/* ============================================
   Announcements (aria-live)
   ============================================ */

/* Two regions, not one: a polite region that waits for the
   screen reader to finish its current sentence (loaded,
   saved, filtered) and an assertive one that interrupts
   (failures). Sharing a single region would force every
   error to queue behind whatever chatter preceded it. */
function liveRegion(politeness) {
  const id = `live-region-${politeness}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'sr-only';
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
  }
  return el;
}

/* announce('تم الحفظ', 'Saved') — picks the message matching
   the reader's current language, since the page only ever
   renders one of the two. Call after any async action that
   changes the page without moving focus: saving a grade,
   marking attendance, loading a roster. */
function announce(ar, en, { assertive = false } = {}) {
  const message = (window.getLang && getLang() === 'en') ? en : ar;
  if (!message) return;
  const region = liveRegion(assertive ? 'assertive' : 'polite');
  // Re-setting identical textContent is not a DOM change, so the
  // same message twice in a row (two failed saves) would be
  // announced once. Clearing first forces the second one out.
  region.textContent = '';
  window.requestAnimationFrame(() => { region.textContent = message; });
}

/* Every form error box on the site follows the same id
   convention (`<something>-error`) and is filled by its
   page's catch block with `textContent = err.message`.
   Marking them as alerts means all 13 announce themselves
   the moment a page writes to one — no page-level changes,
   and no risk of a new form being added without this. */
function upgradeErrorRegions(root) {
  root.querySelectorAll('[id$="-error"]:not([data-a11y-alert])').forEach((el) => {
    el.dataset.a11yAlert = '1';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
  });
}

/* ============================================
   Focus helpers
   ============================================ */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/* Visible focusables only. `offsetParent` is not usable as the
   visibility test here — it is null for anything inside a
   position:fixed ancestor, which is precisely what every modal
   is — so this measures rendered boxes instead. */
function focusableWithin(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

/* ============================================
   Modals

   Pages open and close modals with
   `backdrop.classList.add|remove('open')` in ~26 places.
   Rather than rewrite those call sites (and require every
   future one to remember), a MutationObserver watches the
   class attribute and layers the dialog behaviour on top:
   labelling, scroll lock, focus trap, Escape, and returning
   focus to whatever opened it.
   ============================================ */

const modalStack = [];
let bodyOverflowBeforeLock = null;

function upgradeModal(backdrop) {
  const dialog = backdrop.querySelector('.modal');
  if (!dialog || dialog.dataset.a11yReady) return;
  dialog.dataset.a11yReady = '1';

  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  // Focus target of last resort, for a dialog whose content is
  // still loading and has nothing focusable in it yet.
  dialog.setAttribute('tabindex', '-1');

  // Name the dialog from its own heading. The heading holds both
  // languages as sibling <span data-lang-only>, but the inactive
  // one is display:none and so contributes nothing to the
  // accessible name — the dialog is announced in whichever
  // language the reader is actually seeing.
  const heading = dialog.querySelector('h1, h2, h3, h4');
  if (heading) {
    if (!heading.id) heading.id = `${backdrop.id || 'modal'}-title`;
    dialog.setAttribute('aria-labelledby', heading.id);
  }

  new MutationObserver(() => {
    const isOpen = backdrop.classList.contains('open');
    const wasOpen = modalStack.some((entry) => entry.backdrop === backdrop);
    if (isOpen && !wasOpen) onModalOpened(backdrop, dialog);
    else if (!isOpen && wasOpen) onModalClosed(backdrop);
  }).observe(backdrop, { attributes: true, attributeFilter: ['class'] });
}

function onModalOpened(backdrop, dialog) {
  modalStack.push({ backdrop, dialog, returnFocusTo: document.activeElement });

  if (modalStack.length === 1) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  // Skip the close/cancel control when choosing where to land —
  // opening a dialog focused on its own dismiss button is
  // technically valid and practically hostile.
  const targets = focusableWithin(dialog);
  const firstMeaningful = targets.find((el) => !isDismissControl(el)) || targets[0] || dialog;
  firstMeaningful.focus();
}

function onModalClosed(backdrop) {
  const index = modalStack.findIndex((entry) => entry.backdrop === backdrop);
  if (index === -1) return;
  const [entry] = modalStack.splice(index, 1);

  if (!modalStack.length) {
    document.body.style.overflow = bodyOverflowBeforeLock || '';
    bodyOverflowBeforeLock = null;
  }

  // Only restore focus if the opener is still in the document and
  // still focusable — a row's "Edit" button is frequently gone by
  // now, because saving the dialog re-rendered the table it lived in.
  const target = entry.returnFocusTo;
  if (target && document.contains(target) && target.getClientRects().length > 0) {
    target.focus();
  }
}

function isDismissControl(el) {
  return /cancel|close/i.test(el.id || '') || el.hasAttribute('data-modal-close');
}

/* Escape dismisses by *clicking the dialog's own cancel button*
   rather than by stripping the `open` class directly. Several
   pages hang cleanup off that button (resetting a form, clearing
   the row id being edited), and a dialog closed behind their back
   would reopen holding the previous record's state. Only where a
   dialog genuinely has no dismiss control does this fall back to
   removing the class. */
function requestModalClose(backdrop) {
  const dismiss = Array.from(backdrop.querySelectorAll('button, a')).find(isDismissControl);
  if (dismiss) dismiss.click();
  else backdrop.classList.remove('open');
}

document.addEventListener('keydown', (e) => {
  if (!modalStack.length) return;
  const { backdrop, dialog } = modalStack[modalStack.length - 1];

  if (e.key === 'Escape') {
    e.preventDefault();
    requestModalClose(backdrop);
    return;
  }

  if (e.key !== 'Tab') return;

  const items = focusableWithin(dialog);
  if (!items.length) {
    e.preventDefault();
    dialog.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];

  if (!dialog.contains(document.activeElement)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/* ============================================
   Tables

   68 <th> across 13 tables, none with a scope. Without it a
   screen reader reading a cell in isolation cannot say which
   column it belongs to, which is most of what a data table is
   for. Header rows are static markup; bodies are rendered from
   the API, so this runs again on refreshA11y().
   ============================================ */
function upgradeTables(root) {
  // Guarded per-cell rather than per-table on purpose. At least one table
  // here renders its header cells from the API rather than shipping them in
  // the markup, so a table-level "already done" flag would permanently skip
  // the columns that arrived after the first pass — which is exactly what it
  // did: five headers, one scoped. Setting an attribute that is already set
  // is free, so there is nothing to save by flagging the table.
  root.querySelectorAll('thead th:not([scope])').forEach((th) => {
    th.setAttribute('scope', 'col');
  });
}

/* ============================================
   Landmarks & skip link
   ============================================ */

/* Resolution order, most explicit first. Pages mark their content
   region with data-main; the fallbacks cover the two shells this
   site actually uses (dashboard and marketing) so a page that
   forgets the attribute still gets a working skip link. */
function findMainRegion() {
  return document.querySelector('[data-main]')
    || document.querySelector('main')
    || document.querySelector('.dashboard-content')
    || document.querySelector('section');
}

function installSkipLink() {
  const main = findMainRegion();
  if (!main || document.querySelector('.skip-link')) return;

  if (!main.id) main.id = 'main-content';
  main.setAttribute('tabindex', '-1');
  if (main.tagName !== 'MAIN') main.setAttribute('role', 'main');

  const link = document.createElement('a');
  link.className = 'skip-link';
  link.href = `#${main.id}`;
  link.innerHTML =
    '<span data-lang-only="ar">تخطَّ إلى المحتوى</span><span data-lang-only="en">Skip to content</span>';
  // Moving the hash alone scrolls without moving focus in several
  // browsers, so the next Tab would resume from the skip link
  // rather than inside the content — focus the region explicitly.
  link.addEventListener('click', (e) => {
    e.preventDefault();
    main.focus();
    main.scrollIntoView();
  });
  document.body.insertBefore(link, document.body.firstChild);
}

/* The sidebar and top nav already mark the current page with
   .active, which is styling only — aria-current is what tells a
   screen reader "you are here". */
function markCurrentNavLinks(root) {
  root.querySelectorAll('.sidebar-nav a.active, .nav-links a.active').forEach((a) => {
    a.setAttribute('aria-current', 'page');
  });
}

/* ============================================
   Re-runnable pass

   Call after rendering API-driven content so newly inserted
   tables and error boxes get the same treatment as the markup
   that shipped with the page.
   ============================================ */
function refreshA11y(root = document) {
  upgradeErrorRegions(root);
  upgradeTables(root);
  markCurrentNavLinks(root);
  root.querySelectorAll('.modal-backdrop').forEach(upgradeModal);
}

/* Every dashboard renders its content from the API after load, and some
   render table *headers* that way too — so a one-shot pass at DOMContentLoaded
   misses whatever arrives afterwards, and no page is going to remember to call
   refreshA11y() by hand at each of its render sites. Watching the document
   instead keeps this correct without touching a single page script. Work is
   coalesced into one animation frame so a render loop that appends fifty rows
   costs one pass, not fifty. */
function watchForNewContent() {
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      refreshA11y();
    });
  }).observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', () => {
  // Built up front, not on first use: a live region has to be in the DOM
  // before text is put into it, or screen readers treat the whole thing as
  // new content and stay silent. Creating it and filling it a frame later
  // is exactly the case that goes unannounced.
  liveRegion('polite');
  liveRegion('assertive');

  installSkipLink();
  refreshA11y();
  watchForNewContent();

  // Public site mobile menu
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (burger && mobileMenu) {
    if (!mobileMenu.id) mobileMenu.id = 'mobile-menu';
    burger.setAttribute('aria-controls', mobileMenu.id);
    burger.setAttribute('aria-expanded', 'false');

    const setMenuOpen = (open) => {
      mobileMenu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      // The glyph is the button's entire content, so without a label
      // the button announces as "☰". Both languages are stored as
      // data-aria-* so i18n.js keeps them in sync on a later language
      // switch; the live value is set here directly rather than by
      // calling applyLanguage(), which would fire a `langchange` event
      // — and make every page listening for one re-render its data
      // each time somebody opened the menu.
      burger.textContent = open ? '✕' : '☰';
      const labelAr = open ? 'إغلاق القائمة' : 'فتح القائمة';
      const labelEn = open ? 'Close menu' : 'Open menu';
      burger.setAttribute('data-aria-ar', labelAr);
      burger.setAttribute('data-aria-en', labelEn);
      burger.setAttribute('aria-label', (window.getLang && getLang() === 'en') ? labelEn : labelAr);
    };

    setMenuOpen(false);
    burger.addEventListener('click', () => setMenuOpen(!mobileMenu.classList.contains('open')));
    mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenuOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        setMenuOpen(false);
        burger.focus();
      }
    });
  }

  // Dashboard sidebar (mobile)
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  function setSidebarOpen(open) {
    if (sidebar) sidebar.classList.toggle('open', open);
    if (backdrop) backdrop.classList.toggle('open', open);
    if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(open));
  }

  if (sidebarToggle && sidebar) {
    if (!sidebar.id) sidebar.id = 'dashboard-sidebar';
    sidebarToggle.setAttribute('aria-controls', sidebar.id);
    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.addEventListener('click', () => {
      setSidebarOpen(true);
      // The drawer is off-canvas until now; send focus into it so a
      // keyboard user is actually taken to what they just opened.
      const first = focusableWithin(sidebar)[0];
      if (first) first.focus();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        setSidebarOpen(false);
        sidebarToggle.focus();
      }
    });
  }
  if (backdrop) backdrop.addEventListener('click', () => setSidebarOpen(false));

  // Generic tabs: [data-tabs] container with .tab[data-tab-target] and panels [data-tab-panel]
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const tabs = Array.from(group.querySelectorAll('.tab'));
    const strip = tabs.length ? tabs[0].parentElement : null;
    if (strip) strip.setAttribute('role', 'tablist');

    function selectTab(tab) {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.classList.toggle('active', selected);
        t.setAttribute('aria-selected', String(selected));
        // Roving tabindex: one stop for the whole strip, then arrow
        // keys move between tabs — the ARIA pattern for tablists.
        t.setAttribute('tabindex', selected ? '0' : '-1');
      });
      const target = tab.getAttribute('data-tab-target');
      group.querySelectorAll('[data-tab-panel]').forEach((p) => {
        p.classList.toggle('hidden', p.getAttribute('data-tab-panel') !== target);
      });
    }

    tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      const panel = group.querySelector(`[data-tab-panel="${tab.getAttribute('data-tab-target')}"]`);
      if (panel) {
        if (!panel.id) panel.id = `tabpanel-${tab.getAttribute('data-tab-target')}`;
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
      }
      const selected = tab.classList.contains('active');
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');

      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (e) => {
        // Arrow keys follow reading order, so in Arabic (RTL) the
        // left arrow advances rather than retreats.
        const rtl = document.documentElement.dir === 'rtl';
        const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
        const back = rtl ? 'ArrowRight' : 'ArrowLeft';
        let next = null;
        if (e.key === forward) next = tabs[(index + 1) % tabs.length];
        else if (e.key === back) next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          selectTab(next);
          next.focus();
        }
      });
    });
  });

  // Generic accordion: [data-accordion-trigger] toggles sibling [data-accordion-panel]
  document.querySelectorAll('[data-accordion-trigger]').forEach((trigger, index) => {
    const item = trigger.closest('[data-accordion-item]');
    const panel = item && item.querySelector('.accordion-panel');
    if (panel) {
      if (!panel.id) panel.id = `accordion-panel-${index}`;
      trigger.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', (trigger.id ||= `accordion-trigger-${index}`));
    }
    trigger.setAttribute('aria-expanded', String(item ? item.classList.contains('open') : false));

    trigger.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('[data-accordion-item]').forEach((i) => {
        i.classList.remove('open');
        const t = i.querySelector('[data-accordion-trigger]');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Fade sections in on scroll: [data-observe] gets .in-view once visible
  const observeTargets = document.querySelectorAll('[data-observe]');
  if (observeTargets.length) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      observeTargets.forEach((el) => observer.observe(el));
    } else {
      observeTargets.forEach((el) => el.classList.add('in-view'));
    }
  }
});

window.announce = announce;
window.refreshA11y = refreshA11y;
window.focusableWithin = focusableWithin;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
