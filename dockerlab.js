/* =====================================================================
   SQL Gurukul — DOCKER LAB renderer
   Ek stage jo learner ko laptop par asli services chalwata hai.

   games.js apne top level par `const el, shuffle, shake, escapeHtml`
   declare karti hai — isliye YEH POORI FILE ek IIFE ke andar hai.

   Contract wahi: (stage, arena, onDone) → onDone({ firstTry, total })

   stage = {
     type: 'docker', title,
     project: '01-wal',               // docker-labs/<project>
     exercise: 'ex1-wal-basics',      // project README mein likha naam
     goal: 'HTML — kya karna hai',
     why?: 'HTML — scenario',
     steps: [{ text, cmd?, expect? }],
     observe: { q, choices, answer, explain },
   }

   Har button ki apni CLASS hai (dk-tick, dk-opt, dk-done) — validator
   buttons ko class se pakadta hai, text se kabhi nahi.
   ===================================================================== */
(function () {
  const el = SG.el, escapeHtml = SG.escapeHtml, shake = SG.shake;

  function goalBox(text) {
    const g = el('div', 'lab-goal');
    g.innerHTML = `<span class="lab-goal-tag">GOAL</span> ${text}`;
    return g;
  }

  /* ek MCQ card — sahi par onRight(firstTryBool), galat par shake + Dojo card */
  function askCard(q, cls, tag, onRight) {
    const card = el('div', 'dk-askcard');
    card.appendChild(el('div', 'dk-ask-q', '🤔 ' + q.q));
    const fb = el('div', 'dk-ask-fb');
    let wrong = false, done = false;
    SG.shuffle(q.choices.map((c, i) => ({ c, i }))).forEach(({ c, i }) => {
      const b = el('button', 'dk-optbtn ' + cls, c);
      b.dataset.i = String(i);
      b.onclick = () => {
        if (done || b.disabled) return;
        if (i === q.answer) {
          done = true;
          b.classList.add('right');
          fb.className = 'dk-ask-fb good';
          fb.innerHTML = '✅ ' + (q.explain || 'Sahi!');
          onRight(!wrong);
        } else {
          if (!wrong) SG.noteMistake(q.q, `<b>${q.choices[q.answer]}</b><br>${q.explain || ''}`, tag);
          wrong = true;
          b.classList.add('wrong');
          b.disabled = true;
          shake(card);
          fb.className = 'dk-ask-fb bad';
          fb.innerHTML = '❌ Nahi — output dobara padho aur ek aur try karo.';
        }
      };
      card.appendChild(b);
    });
    card.appendChild(fb);
    return card;
  }

  SG.renderers.docker = function renderDocker(stage, arena, onDone) {
    const steps = stage.steps || [];
    const ticked = steps.map(() => false);
    let asked = false;

    arena.appendChild(goalBox(stage.goal));

    const where = el('div', 'dk-where');
    where.innerHTML = `📁 <code>sqlgurukul/docker-labs/${escapeHtml(stage.project)}</code>` +
      (stage.exercise ? ` · exercise <code>${escapeHtml(stage.exercise)}</code>` : '') +
      `<div class="dk-note">Pehle us folder mein <code>docker compose up -d</code> (asli Postgres 16 + MySQL 8). Docker nahi hai? Apne local Postgres/MySQL par <code>lab</code> database banao aur command ke aage <code>NO_DOCKER=1</code> lagao. Poori details project ke <code>README.md</code> mein.</div>`;
    arena.appendChild(where);
    if (stage.why) arena.appendChild(el('div', 'lab-scenario', stage.why));

    const list = el('ol', 'dk-steps');
    steps.forEach((s, idx) => {
      const li = el('li', 'dk-step');
      li.appendChild(el('div', 'dk-text', s.text));
      if (s.cmd) {
        const row = el('div', 'dk-cmdrow');
        row.appendChild(el('pre', 'dk-cmd', escapeHtml(s.cmd)));
        const copy = el('button', 'btn ghost small dk-copy', '📋 Copy');
        copy.onclick = () => {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(s.cmd);
            copy.textContent = '✅ Copied';
          } catch (e) { copy.textContent = 'Select karke copy karo'; }
        };
        row.appendChild(copy);
        li.appendChild(row);
      }
      if (s.expect) {
        const ex = el('details', 'dk-expect');
        ex.innerHTML = `<summary>👀 Kya dikhna chahiye?</summary><pre>${escapeHtml(s.expect)}</pre>`;
        li.appendChild(ex);
      }
      const tick = el('button', 'btn small dk-tick', '✔ Ho gaya');
      tick.onclick = () => {
        ticked[idx] = !ticked[idx];
        tick.className = 'btn small dk-tick' + (ticked[idx] ? ' good' : '');
        tick.textContent = ticked[idx] ? '✅ Ho gaya' : '✔ Ho gaya';
        li.className = 'dk-step' + (ticked[idx] ? ' done' : '');
        maybeAsk();
      };
      li.appendChild(tick);
      list.appendChild(li);
    });
    arena.appendChild(list);

    const askSlot = el('div', 'dk-ask');
    arena.appendChild(askSlot);
    const skip = el('button', 'btn ghost small dk-skip', 'Abhi laptop paas nahi — sawaal pehle dekh lo');
    skip.onclick = () => { skip.remove(); ask(); };
    arena.appendChild(skip);

    function maybeAsk() { if (ticked.every(Boolean)) { skip.remove(); ask(); } }
    function ask() {
      if (asked) return;
      asked = true;
      askSlot.appendChild(askCard(stage.observe, 'dk-opt', '🐳 Docker lab', first => {
        if (stage.lesson) askSlot.appendChild(el('div', 'dk-lesson', '💡 ' + stage.lesson));
        const done = el('button', 'btn big dk-done', 'Aage badho →');
        done.onclick = () => onDone({ firstTry: first ? 1 : 0, total: 1 });
        askSlot.appendChild(done);
      }));
    }
  };
})();
