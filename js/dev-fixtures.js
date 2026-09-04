/* ============================================
   Dev fixtures — run the whole frontend with no backend

   WHY THIS EXISTS
   Eight of the sixteen pages are behind requireAuth(), so with the API
   unreachable they redirect to login and cannot be looked at, styled or
   reviewed at all. That blocked UI work on exactly the screens that carry
   most of the product.

   WHAT IT IS
   An opt-in stand-in for apiFetch() that answers from an in-memory dataset
   shaped to match the real endpoints — field for field, taken from
   backend/app/routers/*.py and the columns in supabase/migrations/. Writes
   mutate the dataset, so grading a submission really does clear it from the
   pending list and the modals behave the way they will against live data.

   IT IS INERT UNLESS ASKED FOR. With the flag off this file defines nothing
   and patches nothing, so shipping it changes no production code path. The
   real apiFetch is untouched in js/api.js.

     ?fixtures=1     turn on  (sticky — survives navigation)
     ?fixtures=0     turn off
     ?as=teacher     view as teacher | student | admin

   WHEN SUPABASE ACCESS ARRIVES
   Turn it off and everything talks to the real API again. The fixtures are
   also a contract check: where a page breaks against live data but worked
   here, this file and the backend disagree about a shape, and one of the two
   is wrong. Keep it until the schema settles, then delete it — it has no
   other callers.
   ============================================ */

(function () {
  const FLAG = 'dev_fixtures';
  const ROLE_KEY = 'dev_fixtures_role';

  const params = new URLSearchParams(window.location.search);
  if (params.has('fixtures')) {
    if (params.get('fixtures') === '0') localStorage.removeItem(FLAG);
    else localStorage.setItem(FLAG, '1');
  }
  if (params.has('as')) localStorage.setItem(ROLE_KEY, params.get('as'));

  // The staging site (GitHub Pages) has no backend: demo mode is on there
  // unless someone turned it off explicitly with ?fixtures=0 in this browser.
  if (/\.github\.io$/.test(window.location.hostname) && localStorage.getItem(FLAG) === null) {
    localStorage.setItem(FLAG, '1');
  }

  // The whole module stops here when the flag is off. Nothing is defined,
  // nothing is patched, no global is added.
  if (localStorage.getItem(FLAG) !== '1') return;

  /* Each dashboard is gated on one role, and requireAuth() redirects anyone
     holding a different one. Without this, opening the student dashboard while
     the stored role is "teacher" would bounce straight back to the teacher
     dashboard and look broken. So a role-specific page adopts its own role
     unless this navigation asked for one explicitly with ?as= — which still
     lets you send an admin at a teacher page to see the redirect itself. */
  const ROLE_BY_PAGE = {
    'teacher-dashboard.html': 'teacher',
    'student-dashboard.html': 'student',
    'student-skill.html': 'student',
    'student-path.html': 'student',
    'admin-dashboard.html': 'admin',
    'employees.html': 'admin',
    'finance-dashboard.html': 'admin',
    'school-details.html': 'admin',
    'skills.html': 'admin',
    // facilitator tools — teacher by default, still reachable as admin via ?as=admin
    'curriculum.html': 'teacher',
    'session-prep.html': 'teacher',
    'classroom-mode.html': 'teacher',
    'schedule.html': 'teacher',
    'teacher-cohort.html': 'teacher',
    'student-growth.html': 'teacher',
    'print-pack.html': 'teacher',
  };
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const role = params.has('as')
    ? params.get('as')
    : (ROLE_BY_PAGE[page] || localStorage.getItem(ROLE_KEY) || 'teacher');

  /* ============================================
     Dates, relative to today so the data never looks stale
     ============================================ */
  const DAY = 86400000;
  const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();
  const isoDate = (offsetDays) => iso(offsetDays).slice(0, 10);

  /* ============================================
     Reference data — ids match supabase/migrations where they exist
     ============================================ */
  const GRADE_BANDS = [
    { id: 'g3_6', label_ar: 'الصفوف 3-6', label_en: 'Grades 3-6', min_grade: 3, max_grade: 6 },
    { id: 'g7_9', label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9', min_grade: 7, max_grade: 9 },
    { id: 'g10_12', label_ar: 'الصفوف 10-12', label_en: 'Grades 10-12', min_grade: 10, max_grade: 12 },
  ];

  // The nine domains seeded by 0002_seed_skill_domains.sql.
  const STRANDS = [
    { id: 'a0000000-0000-4000-8000-000000000001', name_ar: 'الوعي بالذات', name_en: 'Self-awareness' },
    { id: 'a0000000-0000-4000-8000-000000000002', name_ar: 'التواصل', name_en: 'Communication' },
    { id: 'a0000000-0000-4000-8000-000000000003', name_ar: 'التفكير النقدي', name_en: 'Critical thinking' },
    { id: 'a0000000-0000-4000-8000-000000000004', name_ar: 'التعاون والقيادة', name_en: 'Collaboration and leadership' },
    { id: 'a0000000-0000-4000-8000-000000000005', name_ar: 'المال وريادة الأعمال', name_en: 'Money and entrepreneurship' },
    { id: 'a0000000-0000-4000-8000-000000000006', name_ar: 'إدارة الذات', name_en: 'Self-management' },
    { id: 'a0000000-0000-4000-8000-000000000007', name_ar: 'العلاقات', name_en: 'Relationships' },
    { id: 'a0000000-0000-4000-8000-000000000008', name_ar: 'اتخاذ القرار', name_en: 'Decision-making' },
    { id: 'a0000000-0000-4000-8000-000000000009', name_ar: 'المبادرة والتنفيذ', name_en: 'Initiative and execution' },
    { id: 'a0000000-0000-4000-8000-000000000010', name_ar: 'التأمل ونقل التعلّم', name_en: 'Reflection and transfer' },
  ];

  // Duration commitments, not attendance tracks — see DATABASE-DESIGN.md §1.
  const PLANS = [
    { id: 'monthly', name_ar: 'شهري', name_en: 'Monthly', months: 1, price_monthly: 600, price_total: 600, is_recommended: false },
    { id: 'six_month', name_ar: 'ستة أشهر', name_en: 'Six months', months: 6, price_monthly: 540, price_total: 3240, is_recommended: true },
    { id: 'annual', name_ar: 'سنوي', name_en: 'Annual', months: 12, price_monthly: 480, price_total: 5760, is_recommended: false },
  ];

  const SCHOOLS = [
    { id: 'sch-1', name_ar: 'مدرسة الرواد الأهلية', name_en: 'Al-Rowad National School', code: 'RWD1', city: 'الرياض', status: 'active', revenue_share_percent: 40, created_at: iso(-180) },
    { id: 'sch-2', name_ar: 'مدارس الفرسان', name_en: 'Al-Fursan Schools', code: 'FRS2', city: 'جدة', status: 'active', revenue_share_percent: 35, created_at: iso(-120) },
    { id: 'sch-3', name_ar: 'مدرسة اليمامة', name_en: 'Al-Yamamah School', code: 'YMM3', city: 'الدمام', status: 'active', revenue_share_percent: 40, created_at: iso(-60) },
  ];

  const STUDENT_NAMES = [
    'سارة القحطاني', 'عبدالله الحربي', 'ليان الدوسري', 'محمد العتيبي', 'جود الشهري',
    'ريان المطيري', 'دانة الغامدي', 'فيصل الزهراني', 'شهد البقمي', 'خالد السبيعي',
    'رغد العنزي', 'يوسف الشمري',
  ];

  const students = STUDENT_NAMES.map((full_name, i) => ({
    id: `stu-${i + 1}`,
    user_id: `stu-${i + 1}`,
    full_name,
    username: `student${i + 1}`,
    grade: i < 7 ? 7 : 8,
    school_id: 'sch-1',
    grade_band_id: 'g7_9',
    class_id: i < 7 ? 'cls-1' : 'cls-2',
  }));

  const classes = [
    { id: 'cls-1', name_ar: 'المجموعة أ — الصف السابع', name_en: 'Cohort A — Grade 7', school_id: 'sch-1', teacher_id: 'teacher-1', grade_band_id: 'g7_9', capacity: 14, grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' } },
    { id: 'cls-2', name_ar: 'المجموعة ب — الصف الثامن', name_en: 'Cohort B — Grade 8', school_id: 'sch-1', teacher_id: 'teacher-1', grade_band_id: 'g7_9', capacity: 14, grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' } },
  ];

  // School demo requests (school_leads, migration 0007) — the partnership
  // funnel's inbox on the admin dashboard. Mutated in place by the PATCH
  // fixture so status changes stick for the session.
  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const LEADS = [
    { id: 'lead-1', school_name: 'مدارس الرواد الأهلية', city: 'الرياض', contact_name: 'أحمد الصالح', job_title: 'مدير المدرسة', email: 'ahmed@rowad.edu.sa', phone: '0501234567', grade_bands: ['g7_9', 'g10_12'], estimated_students: 40, message: 'نرغب في البدء مع الصف السابع هذا الفصل.', language: 'ar', status: 'new', notes: null, assigned_to: null, converted_school_id: null, created_at: daysAgo(0.2), updated_at: daysAgo(0.2) },
    { id: 'lead-2', school_name: 'Manarat International School', city: 'Jeddah', contact_name: 'Sarah Whitfield', job_title: 'Head of Enrichment', email: 'sarah@manarat.example', phone: '0559876543', grade_bands: ['g3_6', 'g7_9'], estimated_students: 60, message: null, language: 'en', status: 'contacted', notes: 'Call booked Tuesday 10:00.', assigned_to: null, converted_school_id: null, created_at: daysAgo(3), updated_at: daysAgo(1) },
    { id: 'lead-3', school_name: 'مدارس النخبة', city: 'الدمام', contact_name: 'نورة العتيبي', job_title: 'وكيلة الأنشطة', email: 'noura@nukhba.edu.sa', phone: null, grade_bands: ['g3_6'], estimated_students: 14, message: null, language: 'ar', status: 'qualified', notes: null, assigned_to: null, converted_school_id: null, created_at: daysAgo(9), updated_at: daysAgo(2) },
    { id: 'lead-4', school_name: 'Al-Noor International', city: 'Riyadh', contact_name: 'Khalid Mansour', job_title: 'Principal', email: 'khalid@alnoor.example', phone: '0533334444', grade_bands: ['g7_9'], estimated_students: 28, message: null, language: 'en', status: 'converted', notes: null, assigned_to: null, converted_school_id: 'sch-1', created_at: daysAgo(30), updated_at: daysAgo(12) },
  ];

  // Season 1 and Session 4, verbatim from 0004_seed_season1_session04.sql, so
  // what shows here is what the database will hold once it is applied.
  const SEASON_1 = {
    id: 'c5000000-0000-4000-8000-000000000001',
    title_ar: 'مختبر مهارات الحياة — الموسم الأول: قُد نفسك، وابنِ فريقك',
    title_en: 'Life Skills Lab — Season 1: Lead Yourself, Build Your Team',
    description_ar: 'برنامج من 12 جلسة أسبوعية مدة كل منها 90 دقيقة، لطلاب الصفوف 7-9.',
    description_en: 'Twelve weekly 90-minute sessions for Grades 7-9.',
    status: 'published',
    strand_id: null,
    created_at: iso(-40),
    publish_at: null,
  };

  // The real Season 1, matching the authored content (authoring/sessions/*.yaml).
  const sid = (n) => `c5100000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
  const SESSIONS = [
    { id: sid(1), skill_id: SEASON_1.id, title_ar: 'اعرف قوّتك', title_en: 'Know Your Strength', order_index: 1, strand_id: STRANDS[0].id },
    { id: sid(2), skill_id: SEASON_1.id, title_ar: 'توقّف ثم اختر', title_en: 'Pause, Then Choose', order_index: 2, strand_id: STRANDS[5].id },
    { id: sid(3), skill_id: SEASON_1.id, title_ar: 'ابدأ صغيراً', title_en: 'Start Small', order_index: 3, strand_id: STRANDS[8].id },
    { id: sid(4), skill_id: SEASON_1.id, title_ar: 'استمع كالمحقّق', title_en: 'Listen Like a Detective', order_index: 4, strand_id: STRANDS[1].id },
    { id: sid(5), skill_id: SEASON_1.id, title_ar: 'أوصِل فكرتك', title_en: 'Make Your Point', order_index: 5, strand_id: STRANDS[1].id },
    { id: sid(6), skill_id: SEASON_1.id, title_ar: 'كلمة تبني', title_en: 'Words That Build', order_index: 6, strand_id: STRANDS[6].id },
    { id: sid(7), skill_id: SEASON_1.id, title_ar: 'لكل دور وزنه', title_en: 'Every Role Counts', order_index: 7, strand_id: STRANDS[6].id },
    { id: sid(8), skill_id: SEASON_1.id, title_ar: 'قرّروا معاً', title_en: 'Decide Together', order_index: 8, strand_id: STRANDS[7].id },
  ];

  /* The list above is a fallback. When the generated session-fixtures.js loads
     (it calls this at the end of its own file), the demo sessions are rebuilt
     from it in place — same array, so every handler that reads or pushes to
     SESSIONS keeps working — with the authored titles and path order. Before
     this, the schedule and "next session" card showed names and positions from
     before the curriculum was renamed and re-sequenced: demo data drifting from
     the product within a week of edits. Now it cannot lag the YAML. */
  window.__syncDemoSessions = (fx) => {
    if (!fx) return;
    const byId = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));
    const fresh = Object.values(fx)
      .map((s) => ({
        id: s.id, skill_id: s.skill_id, title_ar: s.title_ar, title_en: s.title_en,
        order_index: s.order_index, strand_id: (byId[s.id] || {}).strand_id || null,
      }))
      .sort((a, b) => a.order_index - b.order_index);
    SESSIONS.splice(0, SESSIONS.length, ...fresh);
  };

  const BADGES = [
    { id: 'bdg-1', name_ar: 'المستمع النشط', name_en: 'Active Listener', icon: '👂', strand_id: STRANDS[1].id },
    { id: 'bdg-2', name_ar: 'صوت الفريق', name_en: 'Team Voice', icon: '🗣️', strand_id: STRANDS[1].id },
    { id: 'bdg-3', name_ar: 'المرآة الصادقة', name_en: 'Honest Mirror', icon: '🪞', strand_id: STRANDS[0].id },
    { id: 'bdg-4', name_ar: 'صانع القرار', name_en: 'Decision Maker', icon: '🧭', strand_id: STRANDS[7].id },
    { id: 'bdg-5', name_ar: 'المبادر', name_en: 'Initiator', icon: '🚀', strand_id: STRANDS[8].id },
    { id: 'bdg-6', name_ar: 'بانِي الجسور', name_en: 'Bridge Builder', icon: '🌉', strand_id: STRANDS[6].id },
    { id: 'bdg-7', name_ar: 'المفكّر الناقد', name_en: 'Critical Thinker', icon: '🔍', strand_id: STRANDS[2].id },
    { id: 'bdg-8', name_ar: 'منظّم الذات', name_en: 'Self-Manager', icon: '⏱️', strand_id: STRANDS[5].id },
    { id: 'bdg-9', name_ar: 'القائد الخادم', name_en: 'Servant Leader', icon: '🤝', strand_id: STRANDS[3].id },
    { id: 'bdg-10', name_ar: 'ناقل الأثر', name_en: 'Transfer Champion', icon: '🌱', strand_id: STRANDS[9].id },
  ].map((b) => ({ ...b, skill_strands: STRANDS.find((s) => s.id === b.strand_id) || null }));

  /* Mutable state — writes below change these, so the UI updates the way it
     will against a real database. */
  const db = {
    assignments: [
      { id: 'asg-1', class_id: 'cls-1', title: 'يوميات الاستماع — أسبوع واحد', description: 'سجّل ثلاث محادثات لخّصت فيها رأي الطرف الآخر.', due_date: isoDate(4), created_at: iso(-6), classes: { name_ar: 'المجموعة أ — الصف السابع', name_en: 'Cohort A — Grade 7' } },
      { id: 'asg-2', class_id: 'cls-1', title: 'خريطة نقاط القوة', description: 'ارسم خريطة لنقاط قوتك الخمس مع مثال لكل واحدة.', due_date: isoDate(-2), created_at: iso(-14), classes: { name_ar: 'المجموعة أ — الصف السابع', name_en: 'Cohort A — Grade 7' } },
      { id: 'asg-3', class_id: 'cls-2', title: 'مقابلة مع فرد من العائلة', description: 'أجرِ مقابلة قصيرة ولخّص ما سمعته دون إبداء رأيك.', due_date: isoDate(9), created_at: iso(-3), classes: { name_ar: 'المجموعة ب — الصف الثامن', name_en: 'Cohort B — Grade 8' } },
    ],
    submissions: [
      { id: 'sub-1', assignment_id: 'asg-2', student_id: 'stu-1', content_url: 'خريطة نقاط القوة — سارة', status: 'submitted', grade: null, feedback: null, submitted_at: iso(-1) },
      { id: 'sub-2', assignment_id: 'asg-2', student_id: 'stu-3', content_url: 'خريطة نقاط القوة — ليان', status: 'submitted', grade: null, feedback: null, submitted_at: iso(-1) },
      { id: 'sub-3', assignment_id: 'asg-2', student_id: 'stu-4', content_url: 'خريطة نقاط القوة — محمد', status: 'late', grade: null, feedback: null, submitted_at: iso(0) },
      { id: 'sub-4', assignment_id: 'asg-1', student_id: 'stu-2', content_url: 'يوميات الاستماع — عبدالله', status: 'submitted', grade: null, feedback: null, submitted_at: iso(0) },
      { id: 'sub-5', assignment_id: 'asg-2', student_id: 'stu-5', content_url: 'خريطة نقاط القوة — جود', status: 'graded', grade: 88, feedback: 'تلخيص دقيق. حاول أن تضيف سؤال متابعة في المرة القادمة.', submitted_at: iso(-3) },
      { id: 'sub-6', assignment_id: 'asg-2', student_id: 'stu-6', content_url: 'خريطة نقاط القوة — ريان', status: 'graded', grade: 74, feedback: 'جيد. المثال الثالث يحتاج تفصيلاً أكثر.', submitted_at: iso(-3) },
    ],
    // 12 met sessions; the signed-in student missed one.
    attendance: [],
    badgesEarned: ['bdg-1', 'bdg-3', 'bdg-7'],
    // `materials` is title/description/file_name — NOT bilingual, unlike
    // almost every other table. DATABASE-DESIGN.md §"known gaps" flags this
    // as a real problem in an Arabic-first product; the fixtures reproduce
    // the schema as it is rather than the schema we would prefer.
    materials: [
      { id: 'mat-1', title: 'دليل الميسّر — الموسم الأول', description: 'الإحاطة الكاملة للجلسات 1-12، مع بطاقات الرصد.', file_url: '#', file_name: 'facilitator-guide-s1.pdf', grade_band_id: 'g7_9', created_at: iso(-30), grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' } },
      { id: 'mat-2', title: 'بطاقات الرصد — قابلة للطباعة', description: 'أربعة مؤشرات لكل طالب، صفحة واحدة لكل مجموعة.', file_url: '#', file_name: 'observation-cards.pdf', grade_band_id: 'g7_9', created_at: iso(-21), grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' } },
      { id: 'mat-3', title: 'خطاب أولياء الأمور', description: 'نموذج موافقة التصوير والنشر.', file_url: '#', file_name: 'guardian-letter.docx', grade_band_id: null, created_at: iso(-45), grade_bands: null },
    ],
    employees: [
      { user_id: 'emp-1', full_name: 'راشد القحطاني', email: 'rashed@lifeskillslab.sa', is_active: true, last_login_at: iso(0), created_at: iso(-200), role_id: 'super_admin', role_name_ar: 'مدير عام', role_name_en: 'Super Admin' },
      { user_id: 'emp-2', full_name: 'منى العسيري', email: 'muna@lifeskillslab.sa', is_active: true, last_login_at: iso(-1), created_at: iso(-150), role_id: 'instructional_creator', role_name_ar: 'مصمّم تعليمي', role_name_en: 'Instructional Creator' },
      { user_id: 'emp-3', full_name: 'طلال الرشيد', email: 'talal@lifeskillslab.sa', is_active: true, last_login_at: iso(-4), created_at: iso(-90), role_id: 'operational_user', role_name_ar: 'مسؤول تشغيل', role_name_en: 'Operational User' },
      { user_id: 'emp-4', full_name: 'هند الفهد', email: 'hind@lifeskillslab.sa', is_active: false, last_login_at: iso(-40), created_at: iso(-75), role_id: 'billing_finance', role_name_ar: 'المالية والفوترة', role_name_en: 'Billing & Finance' },
    ],
    skills: [SEASON_1],
  };

  // 12 held sessions, weekly. The signed-in student (stu-1) missed one.
  for (let week = 12; week >= 1; week--) {
    const d = isoDate(-week * 7);
    students.forEach((s) => {
      db.attendance.push({
        student_id: s.id, class_id: s.class_id, session_date: d,
        attended: !(s.id === 'stu-1' && week === 5) && !(s.id === 'stu-9' && week < 3),
      });
    });
  }

  const ROLES = [
    { id: 'super_admin', name_ar: 'مدير عام', name_en: 'Super Admin', description_ar: 'صلاحية كاملة', description_en: 'Full access', is_system: true },
    { id: 'instructional_creator', name_ar: 'مصمّم تعليمي', name_en: 'Instructional Creator', description_ar: 'إنشاء ونشر المحتوى', description_en: 'Create and publish content', is_system: true },
    { id: 'operational_user', name_ar: 'مسؤول تشغيل', name_en: 'Operational User', description_ar: 'المدارس والمجموعات', description_en: 'Schools and cohorts', is_system: true },
    { id: 'billing_finance', name_ar: 'المالية والفوترة', name_en: 'Billing & Finance', description_ar: 'الإيرادات والفواتير', description_en: 'Revenue and invoices', is_system: true },
  ];

  const ALL_PERMISSIONS = [
    'schools.view', 'schools.create', 'schools.edit',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'users.view', 'users.create', 'users.manage_roles',
    'finance.view', 'billing.view',
  ];

  /* ============================================
     Identity
     ============================================ */
  const ME = {
    teacher: { id: 'teacher-1', email: 'noura@alrowad.edu.sa', role: 'teacher', full_name: 'أ. نورة العتيبي', permissions: [] },
    student: { id: 'stu-1', email: 'student1@students.lifeskillsclub.internal', role: 'student', full_name: 'سارة القحطاني', permissions: [] },
    admin: {
      id: 'emp-1', email: 'rashed@lifeskillslab.sa', role: 'admin', full_name: 'راشد القحطاني',
      permissions: ALL_PERMISSIONS, employee_role: 'super_admin',
      employee_role_label_ar: 'مدير عام', employee_role_label_en: 'Super Admin',
    },
  };

  /* ============================================
     Derived reads — mirror the real routers' math
     ============================================ */
  const studentById = (id) => students.find((s) => s.id === id);
  const assignmentById = (id) => db.assignments.find((a) => a.id === id);

  function pendingSubmissions() {
    return db.submissions
      .filter((s) => s.status === 'submitted' || s.status === 'late')
      .map((s) => ({
        ...s,
        assignments: { title: assignmentById(s.assignment_id)?.title, class_id: assignmentById(s.assignment_id)?.class_id, classes: assignmentById(s.assignment_id)?.classes },
        students: { full_name: studentById(s.student_id)?.full_name, username: studentById(s.student_id)?.username },
      }));
  }

  function teacherStats() {
    const graded = db.submissions.filter((s) => s.status === 'graded' && s.grade != null);
    const attended = db.attendance.filter((a) => a.attended).length;
    return {
      // progress_by_class: graded slots over (assignments x enrolled)
      overall_completion: Math.round((graded.length / (db.assignments.length * students.length)) * 100),
      badges_awarded: 34,
      avg_grade: graded.length ? Math.round(graded.reduce((t, s) => t + s.grade, 0) / graded.length) : null,
      attendance_rate: Math.round((attended / db.attendance.length) * 100),
      at_risk_students: 2,
    };
  }

  function classesWithProgress() {
    return classes.map((c) => {
      const enrolled = students.filter((s) => s.class_id === c.id).length;
      const classAssignments = db.assignments.filter((a) => a.class_id === c.id);
      const slots = enrolled * classAssignments.length;
      const gradedSlots = db.submissions.filter(
        (s) => s.status === 'graded' && classAssignments.some((a) => a.id === s.assignment_id)
      ).length;
      return { ...c, enrolled, progress: slots ? Math.round((gradedSlots / slots) * 100) : 0, capacity: c.capacity };
    });
  }

  function studentAttendance() {
    const mine = db.attendance.filter((a) => a.student_id === 'stu-1');
    const held = new Set(db.attendance.filter((a) => a.class_id === 'cls-1').map((a) => a.session_date)).size;
    const attended = mine.filter((a) => a.attended).length;
    return {
      attended, sessions_held: held,
      rate: held ? Math.round((attended / held) * 100) : null,
      recent: mine.slice(-8).reverse().map((a) => ({ session_date: a.session_date, attended: a.attended })),
    };
  }

  function financeOverview() {
    const rows = SCHOOLS.map((s, i) => {
      const revenue = [148800, 97200, 43200][i];
      const share = s.revenue_share_percent;
      return {
        school_id: s.id, name_ar: s.name_ar, name_en: s.name_en, code: s.code,
        revenue_this_month: revenue,
        school_share_percent: share, platform_share_percent: 100 - share,
        school_share_amount: Math.round((revenue * share) / 100 * 100) / 100,
        platform_share_amount: Math.round((revenue * (100 - share)) / 100 * 100) / 100,
      };
    });
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    return {
      total_revenue_this_month: rows.reduce((t, r) => t + r.revenue_this_month, 0),
      schools_count: SCHOOLS.length,
      next_invoice_date: nextMonth.toISOString().slice(0, 10),
      schools: rows,
    };
  }

  /* ============================================
     Route table. Keys are "METHOD /path", with :param segments.
     ============================================ */
  const routes = {
    'GET /auth/me': () => ME[role],
    'POST /auth/login': () => ({ role, redirect: { teacher: 'teacher-dashboard.html', student: 'student-dashboard.html', admin: 'admin-dashboard.html' }[role] }),
    'POST /auth/logout': () => ({ ok: true }),
    'POST /auth/forgot-password': () => ({ ok: true }),
    'POST /auth/reset-password': () => ({ ok: true }),

    'GET /catalog/plans': () => PLANS,
    'GET /catalog/grade-bands': () => GRADE_BANDS,
    'POST /leads': (body) => ({ ok: true, id: 'lead-demo', school_name: body.school_name, status: 'new' }),
    'POST /enroll': (body) => ({
      order_id: 'ord-demo', status: 'paid', email_sent: true,
      children: (body.children || []).map((c, i) => ({ name: c.name, username: `student${100 + i}`, student_id: `stu-new-${i}`, invite_link: null })),
    }),

    // Teacher
    'GET /teacher/classes': () => classesWithProgress(),
    'GET /teacher/stats': () => teacherStats(),
    'GET /teacher/materials': () => db.materials,
    'GET /teacher/assignments': () => db.assignments.map((a) => ({
      ...a,
      submitted: db.submissions.filter((s) => s.assignment_id === a.id).length,
      graded: db.submissions.filter((s) => s.assignment_id === a.id && s.status === 'graded').length,
    })),
    'GET /teacher/submissions': (_b, _p, query) =>
      query.get('status_filter') === 'graded'
        ? db.submissions.filter((s) => s.status === 'graded').map((s) => ({
            ...s,
            assignments: { title: assignmentById(s.assignment_id)?.title, classes: assignmentById(s.assignment_id)?.classes },
            students: { full_name: studentById(s.student_id)?.full_name, username: studentById(s.student_id)?.username },
          }))
        : pendingSubmissions(),
    'GET /teacher/classes/:id/roster': (_b, p) =>
      students.filter((s) => s.class_id === p.id).map((s) => ({
        student_id: s.id, full_name: s.full_name, username: s.username, grade: s.grade,
        badges_count: Math.floor(Math.random() * 4) + 1,
      })),
    'GET /teacher/classes/:id/attendance': (_b, p, query) => {
      const date = query.get('session_date') || isoDate(0);
      const marked = db.attendance.filter((a) => a.class_id === p.id && a.session_date === date);
      return {
        session_date: date,
        roster: students.filter((s) => s.class_id === p.id).map((s) => ({
          student_id: s.id, full_name: s.full_name, username: s.username,
          attended: marked.find((a) => a.student_id === s.id)?.attended ?? null,
        })),
      };
    },
    'POST /teacher/classes/:id/attendance': (body, p) => {
      (body.records || []).forEach((r) => {
        const existing = db.attendance.find(
          (a) => a.student_id === r.student_id && a.class_id === p.id && a.session_date === body.session_date
        );
        if (existing) existing.attended = r.attended;
        else db.attendance.push({ student_id: r.student_id, class_id: p.id, session_date: body.session_date, attended: r.attended });
      });
      return { ok: true };
    },
    'POST /teacher/submissions/:id/grade': (body, p) => {
      const sub = db.submissions.find((s) => s.id === p.id);
      if (!sub) throw new Error('Submission not found or not yours to grade');
      Object.assign(sub, { status: 'graded', grade: body.grade, feedback: body.feedback });
      return sub;
    },

    // Student
    'GET /student/program': () => ({
      subscription: {
        id: 'sub-demo', student_id: 'stu-1', plan_id: 'six_month', status: 'active', class_id: 'cls-1',
        subscription_plans: { name_ar: 'ستة أشهر', name_en: 'Six months', months: 6 },
        classes: {
          name_ar: classes[0].name_ar, name_en: classes[0].name_en,
          grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' },
          teachers: { full_name: 'أ. نورة العتيبي' },
        },
        students: { schools: { name_ar: SCHOOLS[0].name_ar, name_en: SCHOOLS[0].name_en, city: SCHOOLS[0].city } },
      },
      badges_earned: db.badgesEarned.length,
      badges_total: BADGES.length,
    }),
    'GET /student/attendance': () => studentAttendance(),
    'GET /student/badges': () => BADGES.map((b) => ({
      ...b, earned: db.badgesEarned.includes(b.id),
      awarded_at: db.badgesEarned.includes(b.id) ? iso(-14) : null,
    })),
    'GET /student/assignments': () => {
      const submitted = new Set(db.submissions.filter((s) => s.student_id === 'stu-1').map((s) => s.assignment_id));
      return db.assignments.filter((a) => a.class_id === 'cls-1' && !submitted.has(a.id));
    },
    'GET /student/submissions': () => db.submissions
      .filter((s) => s.student_id === 'stu-1')
      .map((s) => ({ ...s, assignments: { title: assignmentById(s.assignment_id)?.title } })),
    'POST /student/assignments/:id/submit': (body, p) => {
      if (db.submissions.some((s) => s.assignment_id === p.id && s.student_id === 'stu-1')) {
        throw new Error('You already submitted this assignment');
      }
      const row = { id: `sub-${Date.now()}`, assignment_id: p.id, student_id: 'stu-1', content_url: body.content, status: 'submitted', grade: null, feedback: null, submitted_at: iso(0) };
      db.submissions.push(row);
      return row;
    },
    'GET /student/skills': () => db.skills.map((s) => ({
      ...s, grade_bands: [GRADE_BANDS[2]], block_count: 10, completed_count: 6,
    })),
    'GET /student/skills/:id': (_b, p) => ({
      ...db.skills.find((s) => s.id === p.id), grade_bands: [GRADE_BANDS[2]], blocks: [],
    }),
    'GET /student/skills/:id/sessions': () => SESSIONS.map((s, i) => ({
      ...s, block_count: 10, completed_count: i < 3 ? 10 : i === 3 ? 4 : 0,
    })),
    'GET /student/sessions/:id': (_b, p) => ({
      ...SESSIONS.find((s) => s.id === p.id), skills: { title_ar: SEASON_1.title_ar, title_en: SEASON_1.title_en }, blocks: [],
    }),
    'POST /student/skills/blocks/:id/complete': (body, p) => ({ block_id: p.id, student_id: 'stu-1', data: body.data || {} }),

    // Admin
    'GET /admin/overview': () => ({
      students_enrolled: 248, active_classrooms: 14, overall_completion: 71,
      school_name_ar: SCHOOLS[0].name_ar, school_name_en: SCHOOLS[0].name_en,
      revenue_this_month: 289200,
    }),
    'GET /admin/schools': () => SCHOOLS.map((s, i) => ({
      ...s, grade_bands: [GRADE_BANDS[2]], revenue_this_month: [148800, 97200, 43200][i],
    })),
    'GET /admin/schools/:id': (_b, p) => {
      const school = SCHOOLS.find((s) => s.id === p.id) || SCHOOLS[0];
      return {
        school: { ...school, grade_bands: [GRADE_BANDS[2]], revenue_this_month: 148800 },
        classes: classesWithProgress().map((c) => ({ ...c, teachers: { full_name: 'أ. نورة العتيبي' } })),
        teachers: [{
          user_id: 'teacher-1', full_name: 'أ. نورة العتيبي', status: 'active', grade_band_id: 'g7_9',
          classes_assigned: 2, profiles: { email: 'noura@alrowad.edu.sa' },
          grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' },
        }],
        students: students.map((s) => ({
          ...s, grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' },
          subscriptions: [{ status: 'active', classes: { name_ar: classes.find((c) => c.id === s.class_id).name_ar, name_en: classes.find((c) => c.id === s.class_id).name_en }, subscription_plans: { name_ar: 'ستة أشهر', name_en: 'Six months' } }],
        })),
      };
    },
    'POST /admin/schools': (body) => {
      const school = { id: `sch-${Date.now()}`, name_ar: body.name_ar, name_en: null, city: body.city, code: 'NEW1', status: 'active', revenue_share_percent: 40, created_at: iso(0) };
      SCHOOLS.push(school);
      return { ...school, grade_bands: GRADE_BANDS.filter((g) => body.grade_band_ids.includes(g.id)) };
    },
    'POST /admin/schools/:id/programs': (body) => {
      const cls = { id: `cls-${Date.now()}`, name_ar: body.name_ar, name_en: body.name_en, teacher_id: body.teacher_id, capacity: body.capacity || 20, grade_bands: { label_ar: 'الصفوف 7-9', label_en: 'Grades 7-9' } };
      classes.push(cls);
      return { ...cls, auto_assigned: 0 };
    },
    'PATCH /admin/schools/:schoolId/programs/:classId/teacher': () => ({ ok: true }),
    // The live sessions, from the generated fixtures (js/session-fixtures.js)
    // when the page loads them; otherwise the Season 1 anchor alone.
    'GET /teacher/sessions': () => window.SESSION_FIXTURES
      ? Object.values(window.SESSION_FIXTURES).map(({ cards, ...s }) => s).sort((a, b) => a.order_index - b.order_index)
      : [{
        id: 'c5100000-0000-4000-8000-000000000004', skill_id: 'c5000000-0000-4000-8000-000000000001', order_index: 4,
        title_ar: 'استمع كالمحقّق', title_en: 'Listen Like a Detective',
        skill_title_ar: 'مختبر مهارات الحياة — الموسم الأول: قُد نفسك، ابنِ فريقك', skill_title_en: 'Life Skills Lab — Season 1: Lead Yourself, Build Your Team',
      }],
    'GET /teacher/sessions/:id': (_b, p) => {
      const s = window.SESSION_FIXTURES && window.SESSION_FIXTURES[p.id];
      if (!s) throw new Error('Session not found in the fixtures');
      return s;
    },
    'GET /admin/leads': () => LEADS.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    'PATCH /admin/leads/:id': (body, p) => {
      const lead = LEADS.find((l) => l.id === p.id);
      if (!lead) throw new Error('Lead not found');
      Object.assign(lead, body, { updated_at: new Date().toISOString() });
      return lead;
    },
    'POST /admin/teachers/invite': () => ({ ok: true, invite_link: 'https://example.invalid/invite/demo' }),

    'GET /admin/materials': () => db.materials,
    'POST /admin/materials': () => {
      const row = { id: `mat-${Date.now()}`, title: 'مادة جديدة', description: '', file_url: '#', file_name: 'upload.pdf', grade_band_id: null, created_at: iso(0), grade_bands: null };
      db.materials.unshift(row);
      return row;
    },
    'DELETE /admin/materials/:id': (_b, p) => {
      db.materials = db.materials.filter((m) => m.id !== p.id);
      return { ok: true };
    },

    'GET /admin/roles': () => ROLES,
    'GET /admin/employees': () => db.employees,
    'POST /admin/employees': (body) => {
      const r = ROLES.find((x) => x.id === body.role_id) || ROLES[0];
      db.employees.unshift({
        user_id: `emp-${Date.now()}`, full_name: body.full_name, email: body.email, is_active: true,
        last_login_at: null, created_at: iso(0), role_id: r.id, role_name_ar: r.name_ar, role_name_en: r.name_en,
      });
      return { ok: true, invite_link: 'https://example.invalid/invite/demo', email_sent: true };
    },
    'PATCH /admin/employees/:id/role': (body, p) => {
      const emp = db.employees.find((e) => e.user_id === p.id);
      const r = ROLES.find((x) => x.id === body.role_id);
      if (emp && r) Object.assign(emp, { role_id: r.id, role_name_ar: r.name_ar, role_name_en: r.name_en });
      return { ok: true };
    },
    'PATCH /admin/employees/:id/status': (body, p) => {
      const emp = db.employees.find((e) => e.user_id === p.id);
      if (emp) emp.is_active = body.is_active;
      return { ok: true };
    },

    'GET /admin/finance/overview': () => financeOverview(),

    // Authoring
    'GET /admin/skills': () => db.skills.map((s) => ({
      ...s, grade_bands: [GRADE_BANDS[1]], block_count: SESSIONS.length * 10, session_count: SESSIONS.length, effective_status: s.status,
    })),
    'GET /admin/skills/:id': (_b, p) => {
      const s = db.skills.find((x) => x.id === p.id) || db.skills[0];
      return { ...s, grade_bands: [GRADE_BANDS[1]], effective_status: s.status, blocks: [] };
    },
    'GET /admin/skills/:id/sessions': () => SESSIONS.map((s) => ({ ...s, block_count: 10 })),
    'GET /admin/skills/:skillId/sessions/:sessionId': (_b, p) => ({
      ...SESSIONS.find((s) => s.id === p.sessionId), blocks: [],
    }),
    'POST /admin/skills': (body) => {
      const s = { id: `skl-${Date.now()}`, ...body, status: 'draft', created_at: iso(0), publish_at: null };
      db.skills.unshift(s);
      return s;
    },
    'PATCH /admin/skills/:id': (body, p) => {
      const s = db.skills.find((x) => x.id === p.id);
      if (s) Object.assign(s, body);
      return s;
    },
    'POST /admin/skills/:id/publish': (_b, p) => {
      const s = db.skills.find((x) => x.id === p.id);
      if (s) s.status = 'published';
      return s;
    },
    'POST /admin/skills/:id/unpublish': (_b, p) => {
      const s = db.skills.find((x) => x.id === p.id);
      if (s) s.status = 'draft';
      return s;
    },
    'POST /admin/skills/:skillId/sessions': (body) => {
      const s = { id: `ses-${Date.now()}`, ...body, order_index: SESSIONS.length + 1 };
      SESSIONS.push(s);
      return s;
    },
  };

  /* ============================================
     Dispatcher
     ============================================ */
  function match(method, path) {
    const wanted = path.split('/').filter(Boolean);
    for (const key of Object.keys(routes)) {
      const [routeMethod, routePath] = key.split(' ');
      if (routeMethod !== method) continue;
      const parts = routePath.split('/').filter(Boolean);
      if (parts.length !== wanted.length) continue;
      const params = {};
      const ok = parts.every((part, i) => {
        if (part.startsWith(':')) { params[part.slice(1)] = decodeURIComponent(wanted[i]); return true; }
        return part === wanted[i];
      });
      if (ok) return { handler: routes[key], params, key };
    }
    return null;
  }

  const realApiFetch = window.apiFetch;

  window.apiFetch = async function devApiFetch(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const [rawPath, queryString] = path.split('?');
    const query = new URLSearchParams(queryString || '');
    const found = match(method, rawPath);

    // Deliberately loud rather than silently empty: an unmapped endpoint is a
    // gap in this file, and a page rendering blank would look like a UI bug.
    if (!found) {
      console.warn(`[dev-fixtures] no fixture for ${method} ${rawPath} — add one in js/dev-fixtures.js`);
      throw new Error(`[fixtures] ${method} ${rawPath} is not mocked yet`);
    }

    let body = {};
    if (options.body && typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch (e) { body = {}; }
    }

    // A small delay keeps the skeleton loaders and aria-live announcements on
    // their real code path — with an instant resolve they never render.
    await new Promise((r) => setTimeout(r, 120));
    return found.handler(body, found.params, query);
  };

  /* ============================================
     Banner — nobody should mistake this for real data
     ============================================ */
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'position:fixed', 'inset-inline:0', 'bottom:0', 'z-index:90',
      'background:#7C2D12', 'color:#FFF7ED', 'font-size:12px', 'font-weight:600',
      'padding:6px 14px', 'display:flex', 'gap:14px', 'align-items:center',
      'justify-content:center', 'flex-wrap:wrap', 'box-shadow:0 -2px 12px rgba(0,0,0,0.25)',
    ].join(';');

    const link = (label, href) => `<a href="${href}" style="color:#FDBA74;text-decoration:underline">${label}</a>`;
    const here = window.location.pathname.split('/').pop() || 'index.html';
    bar.innerHTML =
      `<span>⚠︎ بيانات تجريبية — لا تتصل بقاعدة البيانات · Demo data — not connected to the database</span>` +
      `<span>عرض كـ / view as: ${link('teacher', `${here}?as=teacher`)} · ${link('student', `${here}?as=student`)} · ${link('admin', `${here}?as=admin`)}</span>` +
      `<span>${link('exit demo mode', `${here}?fixtures=0`)}</span>`;
    document.body.appendChild(bar);

    // Keep the banner from covering the last row of a scrolled page — and the
    // sidebar separately, since it is its own full-height scroll container and
    // parks "log out" at the bottom, exactly where the banner sits.
    document.body.style.paddingBottom = '38px';
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.paddingBottom = '46px';
  });

  console.info(
    `%c[dev-fixtures] active as "${role}" — the real apiFetch is preserved as window.__realApiFetch`,
    'color:#7C2D12;font-weight:bold'
  );
  window.__realApiFetch = realApiFetch;
})();
