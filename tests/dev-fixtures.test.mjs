/* Exercises js/dev-fixtures.js in Node with a minimal browser stub.
   Verifies every route resolves and that the shapes match what the pages read. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'dev-fixtures.js');

function makeEnvAt(pathname, search) {
  const store = { dev_fixtures: '1' };
  const listeners = {};
  const win = {
    location: { search, pathname },
    apiFetch: async () => { throw new Error('real apiFetch should not be called'); },
  };
  const doc = {
    addEventListener: (evt, fn) => { (listeners[evt] ||= []).push(fn); },
    createElement: () => ({ style: { cssText: '' }, setAttribute() {}, set innerHTML(v) {}, }),
    body: { appendChild() {}, style: {} },
  };
  const sandbox = {
    window: win,
    document: doc,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    URLSearchParams,
    console: { info() {}, warn() {}, log() {} },
    setTimeout,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Error,
    Promise,
    decodeURIComponent,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(SRC, 'utf8'), sandbox, { filename: 'dev-fixtures.js' });
  return win;
}

/* An explicit ?as= pins the role regardless of which page the module thinks
   it is on — see ROLE_BY_PAGE in dev-fixtures.js. */
const makeEnv = (role) => makeEnvAt('/index.html', `?as=${role}`);

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
};

const GET = (win, p) => win.apiFetch(p);
const POST = (win, p, body) => win.apiFetch(p, { method: 'POST', body: JSON.stringify(body) });
const PATCH = (win, p, body) => win.apiFetch(p, { method: 'PATCH', body: JSON.stringify(body) });

// ---------------------------------------------------------------- teacher
{
  const win = makeEnv('teacher');
  const me = await GET(win, '/auth/me');
  check('me.role is teacher', me.role === 'teacher', JSON.stringify(me));
  check('me has full_name', typeof me.full_name === 'string');

  const classes = await GET(win, '/teacher/classes');
  check('classes is a non-empty array', Array.isArray(classes) && classes.length > 0);
  check('class has enrolled/progress/capacity',
    classes.every((c) => 'enrolled' in c && 'progress' in c && 'capacity' in c));
  check('class has bilingual names', classes.every((c) => c.name_ar && c.name_en));

  const stats = await GET(win, '/teacher/stats');
  for (const k of ['overall_completion', 'badges_awarded', 'avg_grade', 'attendance_rate', 'at_risk_students']) {
    check(`stats.${k} present`, k in stats, JSON.stringify(stats));
  }
  check('attendance_rate is a sane percentage',
    stats.attendance_rate >= 0 && stats.attendance_rate <= 100, String(stats.attendance_rate));

  const pending = await GET(win, '/teacher/submissions?status_filter=pending');
  check('pending submissions non-empty', pending.length > 0);
  check('submission carries nested assignment + student',
    pending.every((s) => s.assignments?.title && s.students?.full_name),
    JSON.stringify(pending[0]));

  // The grading flow the modal drives: grade one, it leaves the pending list.
  const before = pending.length;
  const graded = await POST(win, `/teacher/submissions/${pending[0].id}/grade`, { grade: 91, feedback: 'ممتاز' });
  check('grade returns the updated row', graded.status === 'graded' && graded.grade === 91);
  const after = await GET(win, '/teacher/submissions?status_filter=pending');
  check('graded submission leaves pending list', after.length === before - 1, `${before} -> ${after.length}`);

  const roster = await GET(win, '/teacher/classes/cls-1/roster');
  check('roster non-empty', roster.length > 0);
  check('roster row shape',
    roster.every((r) => r.student_id && r.full_name && r.username && 'badges_count' in r));

  const att = await GET(win, '/teacher/classes/cls-1/attendance?session_date=2026-08-29');
  check('attendance has session_date + roster', !!att.session_date && Array.isArray(att.roster));
  check('attendance roster rows have attended field', att.roster.every((r) => 'attended' in r));

  const saved = await POST(win, '/teacher/classes/cls-1/attendance',
    { session_date: '2026-08-29', records: [{ student_id: 'stu-1', attended: true }] });
  check('attendance save returns ok', saved.ok === true);
  const att2 = await GET(win, '/teacher/classes/cls-1/attendance?session_date=2026-08-29');
  check('attendance persisted', att2.roster.find((r) => r.student_id === 'stu-1').attended === true);

  const assignments = await GET(win, '/teacher/assignments');
  check('assignments have submitted/graded counts',
    assignments.every((a) => 'submitted' in a && 'graded' in a));
  const materials = await GET(win, '/teacher/materials');
  check('materials list', materials.length > 0);
  // materials is title/description/file_name — NOT bilingual. The pages read
  // m.title directly, so a *_ar/_en guess here renders as "undefined".
  check('materials use the real non-bilingual columns',
    materials.every((m) => typeof m.title === 'string' && 'description' in m && 'file_url' in m),
    JSON.stringify(materials[0]));
  check('materials have no bilingual title columns',
    materials.every((m) => !('title_ar' in m) && !('title_en' in m)));
}

// ---------------------------------------------------------------- student
{
  const win = makeEnv('student');
  const me = await GET(win, '/auth/me');
  check('student me.role', me.role === 'student');

  const program = await GET(win, '/student/program');
  check('program.subscription present', !!program.subscription);
  check('subscription nests plan/class/school',
    !!program.subscription.subscription_plans?.name_ar &&
    !!program.subscription.classes?.teachers?.full_name &&
    !!program.subscription.students?.schools?.name_ar);
  check('badges_earned <= badges_total', program.badges_earned <= program.badges_total);

  const att = await GET(win, '/student/attendance');
  for (const k of ['attended', 'sessions_held', 'rate', 'recent']) check(`attendance.${k}`, k in att);
  check('attendance rate 0..100', att.rate >= 0 && att.rate <= 100, String(att.rate));
  check('attended never exceeds sessions_held', att.attended <= att.sessions_held,
    `${att.attended}/${att.sessions_held}`);
  check('recent capped at 8', att.recent.length <= 8);

  const badges = await GET(win, '/student/badges');
  check('badges carry earned flag + strand', badges.every((b) => 'earned' in b && b.skill_strands));
  check('some badges earned', badges.some((b) => b.earned));

  const upcoming = await GET(win, '/student/assignments');
  const subs = await GET(win, '/student/submissions');
  check('submissions nest assignment title', subs.every((s) => s.assignments?.title));

  if (upcoming.length) {
    const n = subs.length;
    await POST(win, `/student/assignments/${upcoming[0].id}/submit`, { content: 'تجربة' });
    const subs2 = await GET(win, '/student/submissions');
    check('submitting adds a submission', subs2.length === n + 1);
    const upcoming2 = await GET(win, '/student/assignments');
    check('submitted assignment leaves upcoming', upcoming2.length === upcoming.length - 1);
    let dup = null;
    try { await POST(win, `/student/assignments/${upcoming[0].id}/submit`, { content: 'x' }); }
    catch (e) { dup = e.message; }
    check('double submit rejected', !!dup, String(dup));
  }

  const skills = await GET(win, '/student/skills');
  check('skills have block/completed counts',
    skills.every((s) => 'block_count' in s && 'completed_count' in s));
  const sessions = await GET(win, `/student/skills/${skills[0].id}/sessions`);
  check('sessions ordered with counts', sessions.length > 0 && sessions.every((s) => 'block_count' in s));
  check('Session 4 is the seeded one',
    sessions.some((s) => s.title_en === 'Listen Like a Detective'));
}

// ---------------------------------------------------------------- admin
{
  const win = makeEnv('admin');
  const me = await GET(win, '/auth/me');
  check('admin me.role', me.role === 'admin');
  check('admin has permissions', Array.isArray(me.permissions) && me.permissions.length > 0);
  check('admin permissions cover the gated UI keys',
    ['schools.view', 'content.view', 'users.view', 'finance.view', 'billing.view']
      .every((k) => me.permissions.includes(k)));

  const ov = await GET(win, '/admin/overview');
  check('overview keys', ['students_enrolled', 'active_classrooms', 'overall_completion'].every((k) => k in ov));

  const schools = await GET(win, '/admin/schools');
  check('schools have grade_bands + revenue', schools.every((s) => s.grade_bands && 'revenue_this_month' in s));

  const detail = await GET(win, `/admin/schools/${schools[0].id}`);
  check('school detail shape',
    detail.school && Array.isArray(detail.classes) && Array.isArray(detail.teachers) && Array.isArray(detail.students));

  const fin = await GET(win, '/admin/finance/overview');
  check('finance keys',
    ['total_revenue_this_month', 'schools_count', 'next_invoice_date', 'schools'].every((k) => k in fin));
  check('finance shares sum to 100 per school',
    fin.schools.every((s) => s.school_share_percent + s.platform_share_percent === 100));
  check('finance amounts reconcile to revenue',
    fin.schools.every((s) => Math.abs((s.school_share_amount + s.platform_share_amount) - s.revenue_this_month) < 0.01));
  check('total equals sum of rows',
    Math.abs(fin.total_revenue_this_month - fin.schools.reduce((t, s) => t + s.revenue_this_month, 0)) < 0.01);

  const emps = await GET(win, '/admin/employees');
  const n = emps.length;
  check('employee row shape',
    emps.every((e) => e.user_id && e.full_name && 'is_active' in e && e.role_name_ar && e.role_name_en));
  await POST(win, '/admin/employees', { full_name: 'تجربة', email: 't@x.sa', role_id: 'operational_user' });
  check('creating an employee grows the list', (await GET(win, '/admin/employees')).length === n + 1);
  await PATCH(win, `/admin/employees/${emps[0].user_id}/role`, { role_id: 'billing_finance' });
  const after = await GET(win, '/admin/employees');
  check('role change persists',
    after.find((e) => e.user_id === emps[0].user_id).role_id === 'billing_finance');
  await PATCH(win, `/admin/employees/${emps[0].user_id}/status`, { is_active: false });
  check('status change persists',
    (await GET(win, '/admin/employees')).find((e) => e.user_id === emps[0].user_id).is_active === false);

  check('roles list', (await GET(win, '/admin/roles')).length > 0);
  const adminSkills = await GET(win, '/admin/skills');
  check('admin skills carry effective_status',
    adminSkills.every((s) => 'effective_status' in s && 'session_count' in s));

  const plans = await GET(win, '/catalog/plans');
  check('three plans', plans.length === 3);
  check('plans priced by duration',
    plans.every((p) => p.months && p.price_monthly && p.price_total));
  check('longer commitment costs less per month',
    plans[0].price_monthly > plans[1].price_monthly && plans[1].price_monthly > plans[2].price_monthly);
  check('grade bands', (await GET(win, '/catalog/grade-bands')).length === 4);
}

// -------------------------------------------------- role derived from page
{
  // No ?as= — each gated page must adopt its own role, or requireAuth()
  // would redirect the visitor straight back off the page they opened.
  const byPage = {
    '/teacher-dashboard.html': 'teacher',
    '/student-dashboard.html': 'student',
    '/student-skill.html': 'student',
    '/admin-dashboard.html': 'admin',
    '/employees.html': 'admin',
    '/finance-dashboard.html': 'admin',
    '/school-details.html': 'admin',
    '/skills.html': 'admin',
  };
  for (const [pathname, expected] of Object.entries(byPage)) {
    const win = makeEnvAt(pathname, '');
    const me = await GET(win, '/auth/me');
    check(`${pathname} resolves role ${expected}`, me.role === expected, `got ${me.role}`);
  }
  // An explicit ?as= still wins, so the redirect itself stays testable.
  const forced = await GET(makeEnvAt('/student-dashboard.html', '?as=admin'), '/auth/me');
  check('explicit ?as= overrides the page default', forced.role === 'admin', forced.role);
}

// ------------------------------------------------------- unmapped endpoint
{
  const win = makeEnv('teacher');
  let msg = null;
  try { await GET(win, '/teacher/nope'); } catch (e) { msg = e.message; }
  check('unmapped endpoint throws a named error', !!msg && msg.includes('/teacher/nope'), String(msg));
}

// ------------------------------------------------------------ flag is off
{
  const store = {};
  const win = { location: { search: '' }, apiFetch: 'ORIGINAL' };
  const sandbox = {
    window: win, document: { addEventListener() {}, body: {} },
    localStorage: { getItem: () => null, setItem: (k, v) => { store[k] = v; }, removeItem() {} },
    URLSearchParams, console: { info() {}, warn() {} }, setTimeout, Date, Math, JSON,
    Object, Array, Set, Error, Promise, decodeURIComponent,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(SRC, 'utf8'), sandbox, { filename: 'dev-fixtures.js' });
  check('with the flag off, apiFetch is left untouched', win.apiFetch === 'ORIGINAL');
  check('with the flag off, no globals are added', win.__realApiFetch === undefined);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
