/* ============================================
   Backend API client — shared by every page that
   talks to the API.
   ============================================ */

// TODO: point this at the real deployed API URL once a deployment target is chosen.
// Matches whatever host the page itself was loaded from (localhost vs 127.0.0.1)
// rather than hardcoding one — the auth cookie is SameSite=Lax, so a mismatch
// here (page on 127.0.0.1, API hardcoded to localhost) makes every API call
// cross-site and silently drops the cookie, breaking login right after it succeeds.
const API_BASE = `http://${window.location.hostname}:8090`;

async function apiFetch(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let body = null;
  try {
    body = await response.json();
  } catch (e) {
    // no JSON body (e.g. a network-level failure surfaced as a non-JSON response)
  }
  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }
  return body;
}

/* FastAPI's `detail` is a plain string for HTTPException, but a *list* of
   {loc, msg, type} objects for pydantic validation errors (422) — without
   this, new Error(anArray) silently stringifies to "[object Object]". */
function extractErrorMessage(body, status) {
  const detail = body && body.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg || JSON.stringify(e)).join('; ');
  }
  return `Request failed (${status})`;
}

const ROLE_DASHBOARD = { teacher: 'teacher-dashboard.html', student: 'student-dashboard.html', admin: 'admin-dashboard.html' };

/* Dashboard pages call this on load: redirects to login if there's no
   session, or if the session's role doesn't match the page. Returns the
   /auth/me payload (id, email, role, full_name) otherwise.

   expectedRole is a role string, or an array when a page legitimately serves
   more than one — the facilitator tools (curriculum library, session prep,
   classroom mode, schedule, cohort pulse) are used by teachers and reviewed
   by admins, so gating them on a single role would lock out one of them. */
async function requireAuth(expectedRole) {
  let me;
  try {
    me = await apiFetch('/auth/me');
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }
  const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
  if (!allowed.includes(me.role)) {
    window.location.href = ROLE_DASHBOARD[me.role] || 'login.html';
    return null;
  }
  return me;
}

/* Public marketing pages (index.html, pricing.html) call this on load to
   check for an existing session without redirecting anyone away — returns
   the /auth/me payload if there's a valid session (any role), or null
   otherwise. Never throws, so anonymous visitors are unaffected. The
   session itself already survives navigation via the httpOnly cookies set
   at login; this just lets a public page's UI reflect that instead of
   showing "Login" to someone who already is. */
async function getSessionOrNull() {
  try {
    return await apiFetch('/auth/me');
  } catch (err) {
    return null;
  }
}

/* Call as early as possible (right after this script tag, before the page's
   own content script runs) on any page that also calls
   showLoginOrDashboardLink() below — hides the nav "Login" link until the
   async session check resolves, so a logged-in visitor never sees a flash
   of "Login" before it swaps to "Dashboard". Only called explicitly by the
   pages that opt into this (index.html, pricing.html) — never automatic on
   script load, since other pages (request-demo.html, signup.html) have
   their own contextual "Log in" links that don't get revealed again if
   nothing calls showLoginOrDashboardLink there. */
function hideLoginLinkUntilChecked() {
  document.querySelectorAll('a[href="login.html"]').forEach((el) => el.classList.add('hidden'));
}

/* Reveals the nav "Login" link — swapped to the visitor's own dashboard if
   `me` is a live session (any role), or left as "Login" if `me` is null.
   Pairs with hideLoginLinkUntilChecked() above. */
function showLoginOrDashboardLink(me) {
  document.querySelectorAll('a[href="login.html"]').forEach((el) => {
    if (me) {
      el.href = ROLE_DASHBOARD[me.role] || 'index.html';
      el.innerHTML = '<span data-lang-only="ar">لوحتي</span><span data-lang-only="en">Dashboard</span>';
    }
    el.classList.remove('hidden');
  });
  if (window.getLang && window.applyLanguage) applyLanguage(getLang());
}

async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    // ignore — we're leaving the session either way
  }
  window.location.href = 'index.html';
}

/* Dev-mode payment token stand-in. The real flow requires Moyasar.js to
   tokenize card details in the browser (never send raw PAN/CVV to our own
   backend) — that needs a Moyasar publishable key we don't have configured
   yet. Until then, the backend's own MOYASAR_SECRET_KEY dev-mode bypass
   accepts any token value and simulates a successful charge, so this keeps
   the two sides consistent and the flow testable end-to-end locally. */
function getPaymentToken() {
  return 'dev-mode-token';
}
