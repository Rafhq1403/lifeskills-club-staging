/* ============================================
   نادي مهارات الحياة — Mock data & business rules
   Parents subscribe and pay directly through the
   website. Frontend-only prototype — backend will
   replace this.
   ============================================ */

// The program itself is now the same for every subscriber, regardless of
// which billing plan they choose — what used to vary per-track (days/week,
// features) is now one fixed list, shown once rather than duplicated per
// pricing card.
//
// Delivery model decided 1 Sep 2026: two 90-minute sessions a week, groups of
// fourteen, three mixed-age bands. Keep these in step with migration 0006.
const PROGRAM_FEATURES = [
  { ar: 'جلستان في الأسبوع', en: '2 sessions a week' },
  { ar: 'مجموعة من 14 طالباً مع معلم مخصص', en: 'Group of 14 with a dedicated teacher' },
  { ar: 'جلسات مدتها 90 دقيقة', en: '90-minute sessions' },
  { ar: 'أنشطة تطبيقية وعملية', en: 'Hands-on activities' },
  { ar: 'مهارات مصمّمة حسب الفئة العمرية', en: 'Skill-set tailored to each age group' }
];

// Marketing copy for each billing plan — everything transactional (name,
// price, months, which one is "recommended") lives in the
// subscription_plans table and is fetched live via GET /catalog/plans; this
// is just the one-line description a DB column isn't the right place for.
// Pages merge these by id with the live API response (see pricing.html,
// enroll.html).
const PLAN_MARKETING_COPY = {
  monthly: {
    descAr: 'ابدأ بدون التزام طويل — ادفع شهراً بشهر.',
    descEn: 'Start with no long-term commitment — pay month to month.'
  },
  six_month: {
    descAr: 'وفّر أكثر مع التزام لمدة 6 أشهر — الخيار الأكثر توازناً.',
    descEn: 'Save more with a 6-month commitment — the most balanced choice.'
  },
  annual: {
    descAr: 'أفضل قيمة شهرية مع اشتراك سنوي كامل.',
    descEn: 'The best per-month value with a full annual subscription.'
  }
};

// Three skill strands with an age-appropriate topic per grade band — the
// public marketing grid. Since migration 0008 this static data is its only
// source (the curriculum_topics table was retired), and both index.html and
// pricing.html render from it so they cannot drift. Bands are the three
// mixed-age groups from 0006. Replace with nine-domain content in Phase 1.
const CURRICULUM_STRANDS = [
  {
    id: 'collaboration',
    nameAr: 'التعاون والقيادة',
    nameEn: 'Collaboration & leadership',
    descAr: 'من المشاركة وأدوار المجموعة إلى قيادة الفرق وإرشاد الآخرين.',
    descEn: 'From sharing and group roles to leading teams and mentoring others.',
    byGrade: {
      g3_6: { ar: 'مشاريع جماعية، التغذية الراجعة', en: 'Team projects, feedback' },
      g7_9: { ar: 'قيادة الفرق، حل النزاعات', en: 'Leading teams, conflict resolution' },
      g10_12: { ar: 'مشروع قيادي ختامي، الإرشاد', en: 'Capstone leadership, mentoring' }
    }
  },
  {
    id: 'criticalThinking',
    nameAr: 'التفكير النقدي',
    nameEn: 'Critical thinking',
    descAr: 'من طرح الأسئلة إلى اكتشاف الافتراضات وتقييم وجهات النظر بإنصاف.',
    descEn: 'Asking good questions, spotting assumptions, and weighing evidence fairly.',
    byGrade: {
      g3_6: { ar: 'العصف الذهني، الإعلانات مقابل الحقائق', en: 'Brainstorming, ads vs. facts' },
      g7_9: { ar: 'تقييم المصادر، اتخاذ القرار', en: 'Sources, decisions' },
      g10_12: { ar: 'دراسات حالة، القراءة التحليلية للبيانات', en: 'Case studies, data literacy' }
    }
  },
  {
    id: 'moneyEntrepreneurship',
    nameAr: 'المال وريادة الأعمال',
    nameEn: 'Money & entrepreneurship',
    descAr: 'من الاحتياجات مقابل الرغبات إلى إدارة مشروع صغير وفهم الائتمان.',
    descEn: 'From needs vs. wants to running a mini-business and understanding credit.',
    byGrade: {
      g3_6: { ar: 'الميزانية، متجر الفصل', en: 'Budgeting, class store' },
      g7_9: { ar: 'الأعمال المصرفية، عرض مشروع مصغّر', en: 'Banking, mini-business pitch' },
      g10_12: { ar: 'الائتمان، الاستثمار', en: 'Credit, investing' }
    }
  }
];

// Program cards shown on the marketing site (one per grade band). The focus
// line describes what changes between stages, since the domains are the same.
const PROGRAMS = [
  { id: 'p3_6', ageGroup: 'g3_6', nameAr: 'مرحلة الاستكشاف', nameEn: 'Exploration Stage', ageLabel: '3–6',
    focusAr: 'ألعاب وقصص وحركة — القواعد والإنصاف قبل المفاهيم المجرّدة.',
    focusEn: 'Games, stories and movement — rules and fairness before abstractions.' },
  { id: 'p7_9', ageGroup: 'g7_9', nameAr: 'مرحلة البناء', nameEn: 'Building Stage', ageLabel: '7–9',
    focusAr: 'الهوية والانتماء — الخلاف والتغذية الراجعة تصبح شخصية، فيُتدرَّب عليها هنا.',
    focusEn: 'Identity and belonging — disagreement and feedback get personal, so they are practised here.' },
  { id: 'p10_12', ageGroup: 'g10_12', nameAr: 'مرحلة الاستقلالية', nameEn: 'Independence Stage', ageLabel: '10–12',
    focusAr: 'عواقب حقيقية — المال والسمعة والمستقبل القريب. دراسات حالة لا ألعاب.',
    focusEn: 'Real consequences — money, reputation, the near future. Cases, not games.' }
];

// The nine skill domains of the Life Skills Lab curriculum — matches
// skill_strands in the database (0002), minus Money & entrepreneurship, which
// is held for Season 2. One line each, written for a parent.
const SKILL_DOMAINS = [
  { id: 'self_awareness', icon: '🪞', nameAr: 'الوعي بالذات', nameEn: 'Self-awareness',
    descAr: 'أن يعرف الطفل مشاعره ونقاط قوته وما يحرّكه.', descEn: 'Knowing your feelings, your strengths, and what drives you.' },
  { id: 'self_management', icon: '🧭', nameAr: 'إدارة الذات', nameEn: 'Self-management',
    descAr: 'تنظيم الوقت والمشاعر والانتباه عندما يشتدّ الضغط.', descEn: 'Managing time, emotions and attention when it gets hard.' },
  { id: 'communication', icon: '🗣️', nameAr: 'التواصل', nameEn: 'Communication',
    descAr: 'الإصغاء بدقة، والتعبير بوضوح واحترام.', descEn: 'Listening precisely, and speaking clearly and respectfully.' },
  { id: 'relationships', icon: '🤝', nameAr: 'العلاقات', nameEn: 'Relationships',
    descAr: 'بناء الثقة، وحلّ الخلاف دون أذى.', descEn: 'Building trust, and resolving disagreement without harm.' },
  { id: 'collaboration', icon: '🧑‍🤝‍🧑', nameAr: 'التعاون والقيادة', nameEn: 'Collaboration & leadership',
    descAr: 'العمل في فريق، وقيادته عندما يحين الدور.', descEn: 'Working in a team — and leading it when it is your turn.' },
  { id: 'critical_thinking', icon: '🧠', nameAr: 'التفكير النقدي', nameEn: 'Critical thinking',
    descAr: 'التمييز بين الرأي والدليل قبل إصدار الحكم.', descEn: 'Telling opinion from evidence before deciding.' },
  { id: 'decision_making', icon: '⚖️', nameAr: 'اتخاذ القرار', nameEn: 'Decision-making',
    descAr: 'الموازنة بين الخيارات وتحمّل نتائجها.', descEn: 'Weighing the options and owning the outcome.' },
  { id: 'initiative', icon: '🚀', nameAr: 'المبادرة والتنفيذ', nameEn: 'Initiative and execution',
    descAr: 'تحويل الفكرة إلى خطوات، وإنجازها.', descEn: 'Turning an idea into steps — and finishing them.' },
  { id: 'reflection', icon: '🔁', nameAr: 'التأمل ونقل التعلّم', nameEn: 'Reflection and transfer',
    descAr: 'استخلاص الدرس، ونقله إلى موقف جديد.', descEn: 'Drawing out the lesson, and using it somewhere new.' }
];

window.PROGRAM_FEATURES = PROGRAM_FEATURES;
window.PLAN_MARKETING_COPY = PLAN_MARKETING_COPY;
window.CURRICULUM_STRANDS = CURRICULUM_STRANDS;
window.PROGRAMS = PROGRAMS;
window.SKILL_DOMAINS = SKILL_DOMAINS;
