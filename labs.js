/* =====================================================================
   SQL Gurukul — INTERACTIVE LABS
   slider | splitter | indexlab | flow

   Yeh chaar renderers baaki games se ek cheez mein alag hain:
   inme koi "sahi jawab yaad karo" nahi hai — inme tum ek knob ghumate ho
   aur number KHUD badalta hai. Sabak padhaya nahi jaata, mehsoos hota hai.

   Har renderer wahi contract follow karta hai:
       (stage, arena, onDone) → onDone({ firstTry, total })

   Naya lab stage likhne se pehle EXTENDING.md ka "Interactive labs" section padho.
   ===================================================================== */

(function () {
  const el = SG.el, shake = SG.shake;
  const fmt = n => (n == null || isNaN(n)) ? '—'
    : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const ms = n => n == null ? '—' : (n >= 1000 ? (n / 1000).toFixed(2) + ' s' : n >= 10 ? Math.round(n) + ' ms' : (+n).toFixed(1) + ' ms');

  /* ============================================================
     LAB 1: SLIDER — knob ghumao, numbers live badlein
     ============================================================ */
  SG.renderers.slider = function renderSlider(stage, arena, onDone) {
    const vals = {};
    stage.knobs.forEach(k => (vals[k.id] = k.value != null ? k.value : k.min));
    let solved = false, mistake = false;

    if (stage.scenario) arena.appendChild(el('div', 'lab-scenario', stage.scenario));

    const goalBox = el('div', 'lab-goal');
    goalBox.innerHTML = `<span class="lab-goal-tag">🎯 KAAM</span> ${stage.goal.text}`;
    arena.appendChild(goalBox);

    const knobWrap = el('div', 'lab-knobs');
    const knobEls = {};
    stage.knobs.forEach(k => {
      const row = el('div', 'lab-knob');
      row.innerHTML =
        `<div class="lk-top"><span class="lk-label">${k.label}</span>` +
        `<span class="lk-val" data-for="${k.id}">${fmt(vals[k.id])}${k.unit ? ' ' + k.unit : ''}</span></div>`;
      const input = el('input', 'lk-range');
      input.type = 'range';
      input.min = String(k.min); input.max = String(k.max);
      input.step = String(k.step || 1); input.value = String(vals[k.id]);
      input.addEventListener('input', () => {
        vals[k.id] = parseFloat(input.value);
        row.querySelector('.lk-val').textContent = fmt(vals[k.id]) + (k.unit ? ' ' + k.unit : '');
        recompute();
      });
      row.appendChild(input);
      if (k.help) row.appendChild(el('div', 'lk-help', k.help));
      knobEls[k.id] = input;
      knobWrap.appendChild(row);
    });
    arena.appendChild(knobWrap);

    const outWrap = el('div', 'lab-readouts');
    arena.appendChild(outWrap);
    const verdict = el('div', 'lab-verdict');
    arena.appendChild(verdict);
    const feedback = el('div', 'feedback');
    arena.appendChild(feedback);

    function recompute() {
      const r = {};
      stage.readouts.forEach(o => { r[o.id] = o.fn(vals); });
      outWrap.innerHTML = '';
      stage.readouts.forEach(o => {
        const ok = o.good ? o.good(r[o.id], vals) : null;
        const card = el('div', 'lab-out' + (ok === true ? ' is-good' : ok === false ? ' is-bad' : ''));
        const shown = o.format ? o.format(r[o.id]) : (o.unit === 'ms' ? ms(r[o.id]) : fmt(r[o.id]) + (o.unit ? ' ' + o.unit : ''));
        card.innerHTML = `<div class="lo-label">${o.label}</div><div class="lo-val">${shown}</div>` +
          (o.sub ? `<div class="lo-sub">${o.sub(r[o.id], vals)}</div>` : '');
        outWrap.appendChild(card);
      });
      if (stage.bar) {
        const b = stage.bar(vals, r);
        const track = el('div', 'lab-bar');
        track.innerHTML = `<div class="lb-fill${b.bad ? ' is-bad' : ''}" style="width:${Math.max(1, Math.min(100, b.pct))}%"></div>` +
          `<div class="lb-cap">${b.label}</div>`;
        outWrap.appendChild(track);
      }
      if (stage.verdict) {
        const v = stage.verdict(vals, r);
        verdict.className = 'lab-verdict ' + (v.tone || '');
        verdict.innerHTML = v.text;
      }
      if (!solved && stage.goal.check(vals, r)) {
        solved = true;
        feedback.className = 'feedback good';
        feedback.innerHTML = `✅ <b>Mil gaya.</b><br>${stage.insight}`;
        const next = el('button', 'btn', 'Aage badho →');
        next.onclick = () => onDone({ firstTry: mistake ? 0 : 1, total: 1 });
        arena.appendChild(next);
        next.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!mistake) SG.addXP(SG.XP_PER_ITEM);
      }
    }

    /* pehli baar galat jagah se shuru karna "mistake" nahi hai —
       mistake tab hai jab player ne goal ke ULTA jaake dekh liya */
    if (stage.wrongWay && typeof setInterval === 'function') {
      let warned = false;
      const watch = setInterval(() => {
        if (solved) { clearInterval(watch); return; }
        const r = {};
        stage.readouts.forEach(o => { r[o.id] = o.fn(vals); });
        if (!warned && stage.wrongWay(vals, r)) {
          warned = true; mistake = true;
          SG.noteMistake(stage.title, stage.insight);
        }
      }, 700);
    }

    recompute();
  };

  /* ============================================================
     LAB 2: SPLITTER — god-table ke columns ko sahi tables mein baanto
     ============================================================ */
  SG.renderers.splitter = function renderSplitter(stage, arena, onDone) {
    const place = {};                      // column -> targetId
    let firstTry = 0;
    const wrongOnce = new Set();
    let selected = null;
    const total = stage.columns.length;

    if (stage.scenario) arena.appendChild(el('div', 'lab-scenario', stage.scenario));

    const src = el('div', 'sp-source');
    src.innerHTML = `<div class="sp-title">📋 ${stage.table} <span class="sp-sub">— sab kuch ek hi table mein</span></div>`;
    const pool = el('div', 'sp-cols');
    stage.columns.forEach((c, i) => {
      const chip = el('div', 'sp-col' + (c.pk ? ' is-pk' : ''), c.name + (c.pk ? ' 🔑' : ''));
      chip.dataset.id = String(i);
      chip._col = c;
      chip.title = c.help || '';
      chip.addEventListener('click', () => {
        if (chip.classList.contains('done')) return;
        pool.querySelectorAll('.sp-col').forEach(x => x.classList.remove('sel'));
        selected = selected === chip ? null : chip;
        if (selected) chip.classList.add('sel');
      });
      pool.appendChild(chip);
    });
    src.appendChild(pool);
    arena.appendChild(src);

    const tgtRow = el('div', 'sp-targets');
    stage.targets.forEach(t => {
      const box = el('div', 'sp-target');
      box.innerHTML = `<div class="sp-tname">${t.label}</div>` + (t.hint ? `<div class="sp-thint">${t.hint}</div>` : '');
      const list = el('div', 'sp-tcols');
      box.appendChild(list);
      box.addEventListener('click', () => { if (selected) attempt(selected, t.id, list); });
      tgtRow.appendChild(box);
    });
    arena.appendChild(tgtRow);

    const checksBox = el('div', 'sp-checks');
    arena.appendChild(checksBox);
    const feedback = el('div', 'feedback');
    arena.appendChild(feedback);

    function attempt(chip, tid, list) {
      const c = chip._col;
      if (c.target === tid) {
        if (!wrongOnce.has(c.name)) { firstTry++; SG.addXP(SG.XP_PER_ITEM); }
        place[c.name] = tid;
        chip.classList.remove('sel');
        chip.classList.add('done');
        chip.style.pointerEvents = 'none';
        const moved = el('div', 'sp-col is-placed', c.name + (c.pk ? ' 🔑' : ''));
        list.appendChild(moved);
        selected = null;
        feedback.className = 'feedback good';
        feedback.innerHTML = `💡 ${c.why}`;
        refreshChecks();
        if (Object.keys(place).length === total) finish();
      } else {
        if (!wrongOnce.has(c.name)) {
          wrongOnce.add(c.name);
          SG.noteMistake(`<code>${c.name}</code> kis table mein jaata hai?`, c.why);
        }
        shake(chip);
        feedback.className = 'feedback bad';
        feedback.innerHTML = `❌ ${c.wrongHint || 'Yahan nahi. Socho — yeh column KIS cheez ke baare mein ek fact hai?'}`;
      }
    }

    function refreshChecks() {
      checksBox.innerHTML = '';
      (stage.checks || []).forEach(ch => {
        const ok = ch.ok(place);
        const row = el('div', 'sp-check ' + (ok ? 'is-good' : 'is-bad'));
        row.innerHTML = `<span class="sc-icon">${ok ? '✅' : '⚠️'}</span><span>${ok ? ch.fixed : ch.broken}</span>`;
        checksBox.appendChild(row);
      });
    }

    function finish() {
      feedback.className = 'feedback good';
      feedback.innerHTML = `✅ <b>Table tut gayi — sahi tareeke se.</b><br>${stage.insight}`;
      const next = el('button', 'btn', 'Aage badho →');
      next.onclick = () => onDone({ firstTry, total });
      arena.appendChild(next);
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    refreshChecks();
  };

  /* ============================================================
     LAB 3: INDEXLAB — index banao, EXPLAIN live badle

     Cost model yahin hai (content sirf table + query deta hai), taaki
     har stage ek hi sach par chale. Niyam wahi jo asli B-tree ke hain:
       • left-most prefix — index columns kram se hi match hote hain
       • RANGE ke baad index ruk jaata hai (uske aage sirf filter)
       • ORDER BY tabhi muft hai jab woh index ke kram mein aage ho
       • covering — saare chahiye columns index mein → heap chhua hi nahi
     ============================================================ */
  function planFor(stage, idx) {
    const q = stage.query;
    const rows = stage.table.rows;
    const eqCols = q.where.filter(w => w.op === 'eq').map(w => w.col);
    const rangeCols = q.where.filter(w => w.op === 'range').map(w => w.col);
    const sel = {};                                   // har column ki selectivity
    (stage.table.columns || []).forEach(c => (sel[c.name] = c.distinct ? Math.max(1, c.distinct) : 2));

    if (!idx.length) {
      return { type: 'ALL', key: null, used: [], rowsExamined: rows, covering: false,
        filesort: !!q.orderBy, note: 'Koi index nahi — poori table padhni padi.' };
    }

    /* left-most prefix walk */
    const used = [];
    let stopped = null;
    for (const col of idx) {
      if (eqCols.includes(col)) { used.push(col); continue; }
      if (rangeCols.includes(col)) { used.push(col); stopped = 'range'; break; }
      if (q.orderBy && col === q.orderBy && !stopped) { used.push(col); stopped = 'sort'; break; }
      break;
    }

    let narrowed = rows;
    used.forEach(c => {
      if (eqCols.includes(c)) narrowed = narrowed / (sel[c] || 2);
      else if (rangeCols.includes(c)) narrowed = narrowed / 8;      // range ~12% chhoodta hai
    });
    narrowed = Math.max(1, Math.round(narrowed));

    /* ORDER BY muft hai agar woh index mein equality columns ke turant baad hai */
    const eqPrefixLen = idx.findIndex(c => !eqCols.includes(c));
    const sortFree = !q.orderBy || (eqPrefixLen > -1 && idx[eqPrefixLen] === q.orderBy)
      || (eqPrefixLen === -1 && false);

    const need = new Set((q.select || []).concat(q.where.map(w => w.col), q.orderBy ? [q.orderBy] : []));
    const covering = [...need].every(c => idx.includes(c) || c === stage.table.pk);

    const limited = q.limit && sortFree ? Math.min(narrowed, q.limit) : narrowed;
    const examined = used.length ? (sortFree ? limited : narrowed) : rows;

    return {
      type: used.length === 0 ? 'ALL' : (rangeCols.includes(used[used.length - 1]) ? 'range' : 'ref'),
      key: used.length ? 'ix_lab' : null,
      used, rowsExamined: examined, covering,
      filesort: !!q.orderBy && !sortFree,
      note: used.length === 0
        ? 'Index ka pehla column query mein use hi nahi ho raha — isliye woh laga hi nahi.'
        : stopped === 'range'
          ? `Index <code>${used[used.length - 1]}</code> tak chala — RANGE ke baad woh <b>ruk</b> jaata hai.`
          : covering ? 'Saare chahiye columns index mein hain — <b>heap chhua hi nahi</b> (Using index).'
            : 'Index se rows mili, phir har row ka asli data table se uthaana pada.',
    };
  }

  SG.renderers.indexlab = function renderIndexLab(stage, arena, onDone) {
    let idx = [];
    let solved = false, mistake = false;

    if (stage.scenario) arena.appendChild(el('div', 'lab-scenario', stage.scenario));

    const qBox = el('div', 'ix-query');
    qBox.innerHTML = `<div class="ix-qlabel">Yeh query chalni hai (isse badal nahi sakte):</div><pre>${stage.query.sql}</pre>`;
    arena.appendChild(qBox);

    const goalBox = el('div', 'lab-goal');
    goalBox.innerHTML = `<span class="lab-goal-tag">🎯 KAAM</span> ${stage.goal.text}`;
    arena.appendChild(goalBox);

    const build = el('div', 'ix-build');
    arena.appendChild(build);
    const poolBox = el('div', 'ix-pool');
    arena.appendChild(poolBox);
    const planBox = el('div', 'ix-plan');
    arena.appendChild(planBox);
    const feedback = el('div', 'feedback');
    arena.appendChild(feedback);

    function draw() {
      build.innerHTML = `<div class="ix-blabel">Tumhara index — <b>kram maayne rakhta hai</b>:</div>`;
      const chips = el('div', 'ix-chips');
      if (!idx.length) chips.appendChild(el('div', 'ix-empty', 'abhi koi index nahi — neeche se column chuno'));
      idx.forEach((c, i) => {
        const chip = el('div', 'ix-chip', `${i + 1}. ${c}`);
        const x = el('span', 'ix-x', '✕');
        x.onclick = e => { e.stopPropagation(); idx.splice(i, 1); draw(); };
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      build.appendChild(chips);
      if (idx.length) {
        build.appendChild(el('div', 'ix-sql', `CREATE INDEX ix_lab ON ${stage.table.name}(${idx.join(', ')});`));
      }

      poolBox.innerHTML = '<div class="ix-blabel">Available columns:</div>';
      const pchips = el('div', 'ix-chips');
      (stage.table.columns || []).forEach(c => {
        if (idx.includes(c.name)) return;
        const chip = el('div', 'ix-chip is-avail', c.name);
        if (c.distinct) chip.appendChild(el('span', 'ix-card', `${fmt(c.distinct)} alag`));
        chip.onclick = () => { idx.push(c.name); draw(); };
        pchips.appendChild(chip);
      });
      poolBox.appendChild(pchips);

      const p = planFor(stage, idx);
      const pct = Math.max(0.4, (p.rowsExamined / stage.table.rows) * 100);
      const good = p.rowsExamined <= (stage.goal.rowsUnder || 100);
      planBox.innerHTML =
        `<div class="ix-ptitle">EXPLAIN — live</div>` +
        `<div class="ix-grid">` +
        `<div><span>type</span><b class="${p.type === 'ALL' ? 'is-bad' : 'is-good'}">${p.type}</b></div>` +
        `<div><span>key</span><b>${p.key || 'NULL'}</b></div>` +
        `<div><span>rows examined</span><b class="${good ? 'is-good' : 'is-bad'}">${fmt(p.rowsExamined)}</b></div>` +
        `<div><span>Extra</span><b>${p.covering ? 'Using index' : ''}${p.filesort ? (p.covering ? '; ' : '') + 'Using filesort' : ''}${!p.covering && !p.filesort ? '—' : ''}</b></div>` +
        `</div>` +
        `<div class="lab-bar"><div class="lb-fill${good ? '' : ' is-bad'}" style="width:${Math.min(100, pct)}%"></div>` +
        `<div class="lb-cap">${fmt(p.rowsExamined)} / ${fmt(stage.table.rows)} rows chhui</div></div>` +
        `<div class="ix-note">${p.note}</div>`;

      if (!solved && stage.goal.check(p, idx)) {
        solved = true;
        feedback.className = 'feedback good';
        feedback.innerHTML = `✅ <b>Ho gaya.</b><br>${stage.insight}`;
        const next = el('button', 'btn', 'Aage badho →');
        next.onclick = () => onDone({ firstTry: mistake ? 0 : 1, total: 1 });
        arena.appendChild(next);
        next.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!mistake) SG.addXP(SG.XP_PER_ITEM);
      } else if (!solved && idx.length >= 2 && p.type === 'ALL' && !mistake) {
        mistake = true;
        SG.noteMistake(stage.title, stage.insight);
      }
    }
    draw();
  };
  SG.planFor = planFor;                  // validator isse plan check karta hai

  /* ============================================================
     LAB 4: FLOW — do transactions, ek-ek kadam, play/pause
     ============================================================ */
  SG.renderers.flow = function renderFlow(stage, arena, onDone) {
    let i = -1, playing = false, timer = null;
    let firstTry = 0, finished = false, completed = false;
    const answered = new Set(), wrongSteps = new Set();
    const questionCount = stage.steps.filter(s => s.ask).length;

    if (stage.scenario) arena.appendChild(el('div', 'lab-scenario', stage.scenario));

    const laneRow = el('div', 'fl-lanes');
    const laneEls = {};
    stage.lanes.forEach(l => {
      const box = el('div', 'fl-lane');
      box.innerHTML = `<div class="fl-lname">${l.label}</div>`;
      const body = el('div', 'fl-lbody');
      box.appendChild(body);
      laneEls[l.id] = body;
      laneRow.appendChild(box);
    });
    arena.appendChild(laneRow);

    const stateBox = el('div', 'fl-state');
    arena.appendChild(stateBox);
    const noteBox = el('div', 'fl-note');
    arena.appendChild(noteBox);
    const askBox = el('div', 'fl-ask');
    arena.appendChild(askBox);

    const ctl = el('div', 'fl-ctl');
    const bPlay = el('button', 'btn small', '▶ Chalao');
    const bStep = el('button', 'btn small ghost', 'Ek kadam →');
    const bBack = el('button', 'btn small ghost', '← Peeche');
    ctl.append(bBack, bStep, bPlay);
    arena.appendChild(ctl);

    const feedback = el('div', 'feedback');
    arena.appendChild(feedback);

    bPlay.onclick = () => { playing ? pause() : play(); };
    bStep.onclick = () => { pause(); step(1); };
    bBack.onclick = () => { pause(); step(-1); };

    function play() {
      if (typeof setInterval !== 'function') { step(1); return; }
      playing = true; bPlay.textContent = '⏸ Roko';
      timer = setInterval(() => { if (!step(1)) pause(); }, 1400);
    }
    function pause() { playing = false; bPlay.textContent = '▶ Chalao'; if (timer && typeof clearInterval === 'function') clearInterval(timer); timer = null; }

    function step(dir) {
      if (completed || (dir > 0 && i >= 0 && stage.steps[i].ask && !answered.has(i))) return false;
      const n = i + dir;
      if (n < -1 || n >= stage.steps.length) return false;
      i = n;
      render();
      const s = stage.steps[i];
      if (s && s.ask) { pause(); showAsk(s); return false; }
      if (i === stage.steps.length - 1) { pause(); finish(); }
      return true;
    }

    function render() {
      askBox.innerHTML = '';
      Object.values(laneEls).forEach(b => (b.innerHTML = ''));
      stage.steps.forEach((s, si) => {
        if (si > i) return;
        const box = laneEls[s.lane];
        if (!box) return;
        const item = el('div', 'fl-step' + (s.bad ? ' is-bad' : s.good ? ' is-good' : '') + (si === i ? ' is-now' : ''));
        item.innerHTML = `<span class="fs-n">${si + 1}</span><span>${s.t}</span>`;
        box.appendChild(item);
      });
      const s = stage.steps[i];
      noteBox.innerHTML = s ? `<b>Kadam ${i + 1}.</b> ${s.note}` : '<b>Shuru karne ke liye "Ek kadam" ya "Chalao" dabao.</b>';
      noteBox.className = 'fl-note' + (s && s.bad ? ' is-bad' : s && s.good ? ' is-good' : '');
      if (stage.state) {
        const st = stage.state(Math.max(0, i + 1));
        stateBox.innerHTML = st.map(x => `<div class="fl-cell"><span>${x.k}</span><b>${x.v}</b></div>`).join('');
      }
      bBack.disabled = i < 0;
      bStep.disabled = i >= stage.steps.length - 1 || !!(s && s.ask && !answered.has(i));
      bPlay.disabled = i >= stage.steps.length - 1 || !!(s && s.ask && !answered.has(i));
    }

    function showAsk(s) {
      const a = s.ask;
      askBox.innerHTML = `<div class="fa-q">🤔 ${a.q}</div>`;
      const questionStep = i;
      function nextButton() {
        const go = el('button', 'btn small', 'Aage →');
        go.onclick = () => {
          if (i !== questionStep || !answered.has(questionStep)) return;
          askBox.innerHTML = '';
          if (i === stage.steps.length - 1) finish(); else step(1);
        };
        askBox.appendChild(go);
      }
      if (answered.has(questionStep)) {
        askBox.appendChild(el('div', 'feedback good', `💡 ${a.explain}`));
        nextButton(); return;
      }
      const box = el('div', 'choices');
      const optionFeedback = el('div', 'feedback');
      a.choices.forEach((c, ci) => {
        const b = el('button', 'choice', c);
        b.onclick = () => {
          if (i !== questionStep || answered.has(questionStep)) return;
          if (ci === a.answer) {
            answered.add(questionStep);
            if (!wrongSteps.has(questionStep)) { firstTry++; SG.addXP(SG.XP_PER_ITEM); }
            box.querySelectorAll('.choice').forEach(x => (x.disabled = true));
            b.classList.add('correct');
            optionFeedback.className = 'feedback good'; optionFeedback.innerHTML = `💡 ${a.explain}`;
            nextButton();
          } else {
            if (!wrongSteps.has(questionStep)) SG.noteMistake(a.q, `<b>${a.choices[a.answer]}</b><br>${a.explain}`);
            wrongSteps.add(questionStep); b.classList.add('wrong'); b.disabled = true; shake(b);
            optionFeedback.className = 'feedback bad';
            optionFeedback.innerHTML = a.choiceExplanations && a.choiceExplanations[ci] || 'Is choice ko current step ke state se dobara compare karo.';
          }
        };
        box.appendChild(b);
      });
      askBox.append(box, optionFeedback);
      askBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function finish() {
      if (finished || answered.size !== questionCount) return;
      finished = true;
      feedback.className = 'feedback good';
      feedback.innerHTML = `✅ <b>Poora flow dekh liya.</b><br>${stage.insight}`;
      const next = el('button', 'btn', 'Aage badho →');
      next.onclick = () => { if (completed) return; completed = true; next.disabled = true; onDone({ firstTry, total: Math.max(1, questionCount) }); };
      arena.appendChild(next);
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    render();
  };
})();
