/* ============================================================
   cm-cards.js — the one card renderer shared by Classroom Mode
   (the facilitator's cockpit) and projector.html (what the
   class sees). Both must render a card identically; the
   projector only styles it larger and omits the controls.

   Pure: no DOM lookups, no globals read. Everything it needs
   arrives in `ctx`:
     lang      'ar' | 'en'
     revealed  how many sequential items have been revealed
     controls  true on the cockpit (renders the "Reveal next"
               button), false on the projector
     next      { ar, en } — next session title, for mission cards
   ============================================================ */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  const STAGES = {
    prep: ['التحضير', 'Prep'], checkin: ['التهيئة', 'Check-in'], hook: ['التمهيد', 'Hook'],
    explain: ['الشرح', 'Explain'], experiment: ['التجريب', 'Experiment'], challenge: ['التحدي', 'Challenge'],
    debrief: ['الاستخلاص', 'Debrief'], reflect: ['التأمل', 'Reflect'], evidence: ['الشواهد', 'Evidence'],
    mission: ['المهمة', 'Mission'],
  };

  // Students mostly have no devices in the room (decided 2 Sep 2026), so
  // "student_device" cards are answered on paper: the prompt goes on the
  // projector, the answers go on printed slips.
  const AUD = {
    projector: { ar: 'على شاشة العرض', en: 'On the projector', cls: 'badge-primary' },
    facilitator: { ar: 'خاص بالميسّر — لا يُعرض', en: 'Facilitator only — not projected', cls: 'badge-warning' },
    student_device: { ar: 'يجيب الطلاب على أوراقهم', en: 'Students answer on their slips', cls: 'badge-success' },
  };

  function revealControl(n, ctx) {
    if (!ctx.controls || ctx.revealed >= n - 1) return '';
    const L = (a, e) => (ctx.lang === 'ar' ? a : e);
    return `<div class="cm-reveal">
      <button class="btn btn-secondary btn-sm" id="cmRevealBtn">${L('اكشف التالي', 'Reveal next')}</button>
      <span class="caption text-muted num">${ctx.revealed + 1} / ${n}</span>
      <span class="caption text-muted">${L('لا تكشف ما بعده؛ الاكتشاف هو جوهر الدرس', "Don't reveal ahead — the discovery is the lesson")}</span>
    </div>`;
  }

  /* Each card type renders as what it is. */
  function stageBody(c, ctx) {
    ctx = Object.assign({ lang: 'ar', revealed: 0, controls: false, next: null }, ctx || {});
    const L = (a, e) => (ctx.lang === 'ar' ? a : e);
    const P = (a, e) => L(c[a], c[e]);
    const revealed = ctx.revealed;
    let h = '';
    if (c.statement_ar) h += `<div class="cm-statement">${esc(P('statement_ar', 'statement_en'))}</div>`;
    if (c.lead_ar) h += `<p class="cm-lead">${esc(P('lead_ar', 'lead_en'))}</p>`;

    if (c.flow_ar) {
      h += '<div class="cm-flow">' + L(c.flow_ar, c.flow_en).map((f, n) =>
        `<div class="cm-flow-item"><span class="n">${n + 1}</span>
         <div class="h">${esc(f[0])}</div><div class="d">${esc(f[1])}</div></div>`).join('') + '</div>';
    }
    if (c.opts_ar) {
      h += '<div class="cm-opts">' + L(c.opts_ar, c.opts_en).map((o) => `<span class="cm-opt">${esc(o)}</span>`).join('') + '</div>';
    }
    if (c.rounds_ar) {
      const rs = L(c.rounds_ar, c.rounds_en);
      h += '<div class="cm-rounds">' + rs.map((r, n) =>
        `<div class="cm-round ${n > revealed ? 'cm-hidden' : ''}"><span class="t">${esc(r[0])}</span>
         <span class="x"><b>${esc(r[1])}</b>${esc(r[2])}</span></div>`).join('') + '</div>';
      h += revealControl(rs.length, ctx);
    }
    if (c.rule_ar) {
      h += `<div class="cm-rule"><div class="k">${esc(P('rule_k_ar', 'rule_k_en'))}</div>
          <div class="v">${esc(P('rule_ar', 'rule_en'))}</div></div>`;
    }
    if (c.lead2_ar) h += `<p class="cm-lead">${esc(P('lead2_ar', 'lead2_en'))}</p>`;
    if (c.questions_ar) {
      const qs = L(c.questions_ar, c.questions_en);
      // Reflection prompts are answered privately, so they are all shown at once.
      // Discussion questions are revealed one at a time: showing Q3 while Q1 is
      // being discussed makes students rehearse instead of listen.
      const seq = c.type === 'discussion';
      h += '<div class="cm-qs">' + qs.map((q, n) =>
        `<div class="cm-q ${seq && n > revealed ? 'cm-hidden' : ''}"><span class="n">${n + 1}</span><span class="x">${esc(q)}</span></div>`).join('') + '</div>';
      if (seq) h += revealControl(qs.length, ctx);
    }
    if (c.checks_ar) {
      h += '<div class="cm-checks">' + L(c.checks_ar, c.checks_en).map((k) =>
        `<div class="cm-check"><span class="box"></span><span class="x">${esc(k)}</span></div>`).join('') + '</div>';
    }
    if (c.scale_ar) {
      h += '<div class="cm-scale">' + L(c.scale_ar, c.scale_en).map((s, n) =>
        `<span class="cm-lvl"><span class="n">${n + 1}</span>${esc(s)}</span>`).join('') + '</div>';
    }
    if (c.mission_ar) {
      h += `<div class="cm-mission"><div class="k">${L('تطبيق واقعي', 'Real-life mission')}</div>
          <div class="v">${esc(P('mission_ar', 'mission_en'))}</div></div>`;
      if (ctx.next) {
        h += `<div class="cm-next-up"><span class="icon-chip sm primary">➡️</span>
          <span>${L('الجلسة القادمة', 'Next session')}: <strong>${esc(L(ctx.next.ar, ctx.next.en))}</strong></span></div>`;
      }
    }
    return h;
  }

  /* ── Database row → card ──────────────────────────────────────────────
     skill_content_blocks rows carry the facilitator columns
     (instructions, materials, adaptation, offline_fallback, safety_note)
     and a `content` JSON. For a card to render as what it is, `content`
     must hold the structured keys the renderer reads — statement, lead,
     flow, rounds, rule, opts, questions, checks, scale, mission — plus
     `stage` (the fine-grained session stage; learning_stage is coarser).
     That is the authoring contract (documented in migration 0009). Rows
     authored as prose only (`body_ar/en`) still render, as a lead. */
  const STRUCTURED = ['statement', 'lead', 'lead2', 'flow', 'opts', 'rounds', 'rule_k', 'rule', 'questions', 'checks', 'scale', 'mission'];
  const STAGE_FOR_TYPE = { teacher_briefing: 'prep', evidence: 'evidence', reflection: 'reflect', conclusion: 'mission' };
  function fromBlock(row) {
    const content = row.content || {};
    const card = {
      id: row.id,
      type: row.block_type,
      aud: row.audience || 'projector',
      dur: row.duration_seconds || null,
      stage: content.stage || STAGE_FOR_TYPE[row.block_type] || ({ introduce: 'explain', practice: 'experiment', apply: 'challenge', demonstrate: 'reflect' }[row.learning_stage]) || 'explain',
      t_ar: row.title_ar, t_en: row.title_en,
      i_ar: row.instructions_ar, i_en: row.instructions_en,
      m_ar: row.materials_ar, m_en: row.materials_en,
      a_ar: row.adaptation_ar, a_en: row.adaptation_en,
      off_ar: row.offline_fallback_ar, off_en: row.offline_fallback_en,
      s_ar: row.safety_note_ar, s_en: row.safety_note_en,
      p_ar: content.facilitator_prompts_ar, p_en: content.facilitator_prompts_en,
      fam_ar: content.family_message_ar, fam_en: content.family_message_en,
      ev: row.evidence_type && row.evidence_type !== 'none' ? row.evidence_type : undefined,
      completion_rule: row.completion_rule,
      is_required: row.is_required,
    };
    let structured = false;
    STRUCTURED.forEach((k) => {
      if (content[k + '_ar'] !== undefined || content[k + '_en'] !== undefined) {
        card[k + '_ar'] = content[k + '_ar']; card[k + '_en'] = content[k + '_en'];
        structured = true;
      }
    });
    if (!structured && (content.body_ar || content.body_en)) {
      card.lead_ar = content.body_ar; card.lead_en = content.body_en;
    }
    return card;
  }

  /* A whole session from the API: { session, skill, blocks[] } → the
     SESSION shape the cockpit, projector and print pack all consume. */
  function fromSession(payload) {
    const s = payload.session || {}, sk = payload.skill || {};
    return {
      id: s.id, skill_id: sk.id,
      title_ar: s.title_ar, title_en: s.title_en,
      skill_title_ar: sk.title_ar, skill_title_en: sk.title_en,
      next_ar: payload.next ? payload.next.title_ar : null,
      next_en: payload.next ? payload.next.title_en : null,
      cards: (payload.blocks || []).slice().sort((a, b) => a.order_index - b.order_index).map(fromBlock),
    };
  }

  window.CM = { STAGES, AUD, stageBody, esc, fromBlock, fromSession };
})();
