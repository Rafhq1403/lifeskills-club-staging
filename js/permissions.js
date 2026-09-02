/* ============================================
   Frontend permission gating for the employee-role layer
   (Super Admin / Instructional Creator / Operational User /
   Billing & Finance) on top of the coarse admin/teacher/student
   tier. This is UX polish only — the real enforcement is the
   backend require_permission() dependency and the matching RLS
   policies. See memory: after-school-architecture.
   ============================================ */

// Hide every gated element immediately, before requireAuth()'s async
// /auth/me call resolves — otherwise a Billing & Finance (or any
// non-Super-Admin) user briefly sees the full unfiltered menu on every page
// load. This script tag is placed after the sidebar markup on every admin
// page and loads as a normal blocking <script src>, so the elements already
// exist in the DOM and this runs before the browser's first paint of them.
// gateNav(me) below then reveals the ones the resolved user actually holds.
document.querySelectorAll('[data-requires-permission]').forEach((el) => el.classList.add('hidden'));

function hasPermission(me, key) {
  return !!(me && me.permissions && me.permissions.includes(key));
}

// A comma-separated attribute value grants access if the caller holds ANY
// one of the keys — mirrors the backend's require_permission(*keys) OR
// semantics (e.g. the finance dashboard is finance.view OR billing.view).
function hasAnyPermission(me, keysAttr) {
  return keysAttr
    .split(',')
    .map((k) => k.trim())
    .some((k) => hasPermission(me, k));
}

/* Hides every [data-requires-permission] element (sidebar links, page
   sections, action buttons) the caller doesn't hold a matching permission
   for — same spirit as the existing data-lang-only convention, but
   permission-driven instead of language-driven. Safe to call again after
   re-rendering dynamic content. */
function gateNav(me) {
  document.querySelectorAll('[data-requires-permission]').forEach((el) => {
    const keys = el.getAttribute('data-requires-permission');
    el.classList.toggle('hidden', !hasAnyPermission(me, keys));
  });
}

/* Redirects away from a page the caller can't use at all — call right
   after requireAuth('admin') on pages gated behind one permission group
   (e.g. employees.html needs users.view). */
function requirePermission(me, keysAttr, fallback = 'admin-dashboard.html') {
  if (!hasAnyPermission(me, keysAttr)) {
    window.location.href = fallback;
    return false;
  }
  return true;
}
