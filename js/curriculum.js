/* ============================================================
   curriculum.js — the Year 1 sequenced path.
   Eight skill units in order; each unlocks when the previous
   is complete. Shared by the student/family path view and the
   admin curriculum map. Arabic names are a first polished
   draft — refine to taste, they live only here.
   Sessions per unit: 6 (≈ 3 weeks at 2/week). Year = 48.
   ============================================================ */
(function () {
  // Domain accent tokens (mirror css/tokens.css families where they exist).
  const DOMAIN = {
    self:    { ar: 'الوعي بالذات',        en: 'Self-awareness',            color: '#6366F1' },
    manage:  { ar: 'إدارة الذات',          en: 'Self-management',           color: '#0D9488' },
    comm:    { ar: 'التواصل',              en: 'Communication',             color: '#2563EB' },
    rel:     { ar: 'العلاقات',             en: 'Relationships',             color: '#DB2777' },
    collab:  { ar: 'التعاون والقيادة',     en: 'Collaboration & leadership', color: '#D97706' },
    think:   { ar: 'التفكير النقدي',       en: 'Critical thinking',         color: '#7C3AED' },
    decide:  { ar: 'اتخاذ القرار',         en: 'Decision-making',           color: '#0891B2' },
    init:    { ar: 'المبادرة والتنفيذ',    en: 'Initiative & execution',    color: '#16A34A' },
  };

  // The built sessions (Season 1 in the DB) mapped onto their unit.
  // A session id here is a real, teachable session; a plain string is a
  // planned title not yet authored.
  const S = (n) => `c5100000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

  const UNITS = [
    { order: 1, semester: 1, weeks: [1, 3], domain: 'self',
      name_ar: 'اعرف نفسك', name_en: 'Know Yourself',
      outcome_ar: 'يسمّي قوّة ومشاعر وقيمة، ولكلٍّ دليل من موقف حقيقي.',
      outcome_en: 'Name a strength, a feeling, and a value — each with real evidence.',
      sessions: [
        { id: S(1), title_ar: 'اعرف قوّتك', title_en: 'Know Your Strength' },
        { title_ar: 'ما الذي يهمّني', title_en: 'What I Value' },
        { title_ar: 'مشاعري بالاسم', title_en: 'Naming My Feelings' },
        { title_ar: 'قصّتي', title_en: 'My Story' },
        { title_ar: 'ما يميّزني', title_en: 'What Makes Me, Me' },
        { title_ar: 'ميثاق المجموعة', title_en: 'Our Group Charter' },
      ] },
    { order: 2, semester: 1, weeks: [4, 6], domain: 'manage',
      name_ar: 'أدِر نفسك', name_en: 'Manage Yourself',
      outcome_ar: 'يلاحظ إشارة جسده، ويتوقّف، ويسمّي شعوره، ثم يختار ردّه.',
      outcome_en: "Notice the body's signal, pause, name the feeling, then choose a response.",
      sessions: [
        { id: S(2), title_ar: 'توقّف ثم اختر', title_en: 'Pause, Then Choose' },
        { id: S(3), title_ar: 'ابدأ صغيراً', title_en: 'Start Small' },
        { title_ar: 'ركّز في زحمة المشتّتات', title_en: 'Focus in the Noise' },
        { title_ar: 'عادة صغيرة تدوم', title_en: 'A Small Habit That Lasts' },
        { title_ar: 'حين أخطئ', title_en: 'When I Slip' },
        { title_ar: 'خطّتي لأسبوع', title_en: 'My Week, Planned' },
      ] },
    { order: 3, semester: 1, weeks: [7, 9], domain: 'comm',
      name_ar: 'أنصِت وعبِّر', name_en: 'Listen & Express',
      outcome_ar: 'يُعيد صياغة رأي زميله بدقة، ويوصل فكرته بوضوح، ويعطي ملاحظة تبني.',
      outcome_en: "Restate a peer's view, make one clear point, and give feedback that builds.",
      sessions: [
        { id: S(4), title_ar: 'استمع كالمحقّق', title_en: 'Listen Like a Detective' },
        { id: S(5), title_ar: 'أوصِل فكرتك', title_en: 'Make Your Point' },
        { id: S(6), title_ar: 'كلمة تبني', title_en: 'Words That Build' },
        { title_ar: 'اسأل سؤالاً أفضل', title_en: 'Ask a Better Question' },
        { title_ar: 'لغة الجسد', title_en: 'What Bodies Say' },
        { title_ar: 'عرّف بنفسك', title_en: 'Introduce Yourself Well' },
      ] },
    { order: 4, semester: 1, weeks: [10, 12], domain: 'rel',
      name_ar: 'ابنِ علاقاتك', name_en: 'Build Relationships',
      outcome_ar: 'يقرأ شعور غيره، ويضع حدّاً بلطف، ويصلح صداقة بعد موقف صعب.',
      outcome_en: 'Read how someone feels, hold a boundary kindly, and repair a friendship.',
      sessions: [
        { title_ar: 'أن ترى بعين غيرك', title_en: 'In Their Shoes' },
        { title_ar: 'حدودي بلطف', title_en: 'A Kind Boundary' },
        { title_ar: 'ثقة تُبنى', title_en: 'Building Trust' },
        { title_ar: 'حين نختلف', title_en: 'When We Clash' },
        { title_ar: 'أصلح ما انكسر', title_en: 'Repair It' },
        { title_ar: 'صديق يُعتمد عليه', title_en: 'A Friend You Can Count On' },
      ] },
    { order: 5, semester: 2, weeks: [13, 15], domain: 'collab',
      name_ar: 'اعمل ضمن فريق', name_en: 'Work as a Team',
      outcome_ar: 'يأخذ دوراً دون أن يستولي على غيره، ويطلب من زميله ما يوفّره دوره.',
      outcome_en: 'Take a role without taking over, and ask a teammate for what their role provides.',
      sessions: [
        { id: S(7), title_ar: 'لكل دور وزنه', title_en: 'Every Role Counts' },
        { title_ar: 'هدف واحد للفريق', title_en: 'One Team Goal' },
        { title_ar: 'أقود ثم أتبع', title_en: 'Lead, Then Follow' },
        { title_ar: 'حين يتعثّر الفريق', title_en: 'When the Team Stalls' },
        { title_ar: 'نحتفل بالإسهام', title_en: 'Credit Where It’s Due' },
        { title_ar: 'مشروع الفريق', title_en: 'The Team Project' },
      ] },
    { order: 6, semester: 2, weeks: [16, 18], domain: 'think',
      name_ar: 'فكّر بعمق', name_en: 'Think It Through',
      outcome_ar: 'يطرح سؤالاً أدقّ، ويفصل الادّعاء عن دليله، وينتبه لانحياز أول انطباع.',
      outcome_en: 'Ask a sharper question, separate a claim from its evidence, and spot first-impression bias.',
      sessions: [
        { title_ar: 'ادّعاء أم دليل؟', title_en: 'Claim or Evidence?' },
        { title_ar: 'اسأل «لماذا» خمساً', title_en: 'Five Whys' },
        { title_ar: 'الانطباع الأول يخدع', title_en: 'First Impressions Lie' },
        { title_ar: 'وجهة نظر أخرى', title_en: 'The Other Side' },
        { title_ar: 'حقيقة أم رأي؟', title_en: 'Fact or Opinion?' },
        { title_ar: 'محقّق الأخبار', title_en: 'The News Detective' },
      ] },
    { order: 7, semester: 2, weeks: [19, 21], domain: 'decide',
      name_ar: 'قرّر بحكمة', name_en: 'Decide Well',
      outcome_ar: 'يتّفق على ما يهم قبل الجدال، ويوازن الخيارات، ويُغلق القرار.',
      outcome_en: 'Agree what matters before arguing, weigh the options, and close the decision.',
      sessions: [
        { id: S(8), title_ar: 'قرّروا معاً', title_en: 'Decide Together' },
        { title_ar: 'ما الذي يهم؟', title_en: 'What Matters Most?' },
        { title_ar: 'ثمن كل خيار', title_en: 'The Cost of Each Choice' },
        { title_ar: 'قرار لا رجعة فيه', title_en: 'Sleep On It, Then Commit' },
        { title_ar: 'حين أخطأ قراري', title_en: 'When My Choice Was Wrong' },
        { title_ar: 'قرار يخصّني', title_en: 'A Decision That’s Mine' },
      ] },
    { order: 8, semester: 2, weeks: [22, 24], domain: 'init',
      name_ar: 'بادِر ونفّذ', name_en: 'Take Initiative',
      outcome_ar: 'يضع هدفاً يهمّه، ويخطو أصغر خطوة، وينفّذ، ويرى أثره في غيره.',
      outcome_en: 'Set a goal, take the smallest real step, follow through, and see its value to others.',
      sessions: [
        { title_ar: 'من فكرة إلى خطوة', title_en: 'From Idea to Step' },
        { title_ar: 'اطلب المساعدة بذكاء', title_en: 'Ask for Help Well' },
        { title_ar: 'شاهد على خطّتي', title_en: 'A Witness to My Plan' },
        { title_ar: 'حين يتعثّر المشروع', title_en: 'When It Doesn’t Work' },
        { title_ar: 'قيمة لمن حولي', title_en: 'Value for Others' },
        { title_ar: 'أطلق مبادرتك', title_en: 'Launch Your Initiative' },
      ] },
  ];

  UNITS.forEach((u) => {
    u.domain_info = DOMAIN[u.domain];
    u.built = u.sessions.filter((s) => s.id).length;   // authored & teachable
    u.total = u.sessions.length;
  });

  window.CURRICULUM = {
    units: UNITS,
    domains: DOMAIN,
    sessionsPerYear: UNITS.reduce((a, u) => a + u.total, 0),
    builtSessions: UNITS.reduce((a, u) => a + u.built, 0),
  };
})();
