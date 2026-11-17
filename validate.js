#!/usr/bin/env node
/* =====================================================================
   SQL Gurukul — Content Validator + Mission Runner

   Browser kholne se PEHLE yeh chalao:

       node validate.js                  # sab kuch
       node validate.js windowfn         # sirf ek level

   Do hisse hain:

   1. STRUCTURE — har level/stage ka shape, quiz answer index, fill ke
      blanks vs tokens, hotspot targets jo diagram mein hain hi nahi
      (softlock!), incident ke toote hue `next`, duplicate level ids,
      missing VISUALS, ranks ka order, index.html ke script tags.

   2. MISSIONS — har terminal mission ke HINTS ko **asli SQL engine** par
      chala ke dekhta hai ki uske saare `tasks` aur `success()` sach mein
      poore hote hain. sqlcli.js ek asli MySQL simulator hai, isliye yeh
      jhooth nahi bol sakta: agar hint ki query galat hai ya check() ka
      regex history se match nahi karta, yeh wahin pakad lega.

   Koi dependency nahi. Sirf node.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = __dirname;
const problems = [];
const warnings = [];
const E = (where, msg) => problems.push(`${where}: ${msg}`);
const W = (where, msg) => warnings.push(`${where}: ${msg}`);

/* =====================================================================
   Mini DOM shim — sqlcli.js ka renderer isi par chalta hai
   ===================================================================== */
function makeEl(tag) {
  const e = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [],
    _handlers: {},
    style: {},
    dataset: {},
    value: '',
    disabled: false,
    textContent: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    addEventListener(ev, fn) { (this._handlers[ev] = this._handlers[ev] || []).push(fn); },
    removeEventListener() {},
    remove() {},
    focus() {},
    scrollIntoView() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector(sel) {
      /* renderer sirf .term-out aur input dhoondhta hai */
      if (!this._q) this._q = {};
      if (!this._q[sel]) this._q[sel] = makeEl(sel.includes('input') ? 'input' : 'div');
      return this._q[sel];
    },
    querySelectorAll() { return []; },
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return e._html || ''; },
    set(v) { e._html = v; },
  });
  return e;
}

/* =====================================================================
   Load app files headlessly
   ===================================================================== */
/* core.js khud `const SG = {...}` declare karta hai — isliye hum SG inject NAHI
   karte (woh shadow ho jaata). Load ke baad usse context se uthaate hain. */
const sandbox = {
  console, module: { exports: {} },
  window: {}, navigator: { userAgent: 'node' },
  document: { createElement: makeEl, createTextNode: () => makeEl('text'), getElementById: () => null, body: makeEl('body') },
  setTimeout: (fn) => { try { fn(); } catch (e) { /* renderer ke async bits */ } return 0; },
  clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Math, Date, JSON,
};
vm.createContext(sandbox);

const LOAD_ORDER = ['core.js', 'data-core.js', 'visuals.js', 'games.js', 'labs.js', 'sqlcli.js', 'dockerlab.js',
  'data-beginner.js', 'data-intermediate.js', 'data-advanced.js', 'data-scale.js',
  'data-int-wal.js', 'data-int-mvcc.js', 'data-int-partitioning.js', 'data-int-columnar.js',
  'data-int-sharding.js', 'data-int-migration.js', 'data-int-ops.js', 'data-int-trees.js', 'data-int-advisory.js', 'data-sds-replay.js', 'data-sds-dedup.js', 'data-sds-query-cost.js', 'data-sds-seat-claim.js', 'data-sds-request-replay.js', 'data-sds-spatial-query.js', 'data-sds-judge.js', 'data-sds-method.js'];

for (const f of LOAD_ORDER) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) { E('load', `${f} missing`); continue; }
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f }); }
  catch (e) { E(f, `load failed — ${e.message}`); }
}
if (problems.length) { problems.forEach(p => console.log('   ✗ ' + p)); process.exit(1); }

vm.runInContext(';globalThis.__V = typeof VISUALS !== "undefined" ? VISUALS : {};' +
                'globalThis.__R = typeof RANKS !== "undefined" ? RANKS : null;' +
                'globalThis.__SG = typeof SG !== "undefined" ? SG : null;', sandbox);
const VISUALS = sandbox.__V || {};
const RANKS = sandbox.__R;
const SGx = sandbox.__SG;
if (!SGx) { console.log('   ✗ SG namespace load hi nahi hua'); process.exit(1); }
/* XP/DOM side-effects ko chup karao — validator sirf logic dekhta hai */
SGx.addXP = () => {}; SGx.spendXP = () => {}; SGx.saveState = () => {};

/* hotspot targets: har visual ke data-hs nikaalo */
const hsTargets = {};
Object.entries(VISUALS).forEach(([id, v]) => {
  hsTargets[id] = [...String((v && v.html) || '').matchAll(/data-hs="([^"]+)"/g)].map(m => m[1]);
});

const ONLY = process.argv[2] || null;

/* =====================================================================
   1. STRUCTURE
   ===================================================================== */
const seen = new Set();
let levelCount = 0, stageCount = 0, cardCount = 0, ivCount = 0, termCount = 0;
const byType = {};

if (!SGx.tracks.length) E('tracks', 'koi track register nahi hua');
SGx.tracks.forEach(t => {
  ['id', 'icon', 'name', 'blurb', 'certTitle', 'certSub', 'motto', 'formula'].forEach(k => {
    if (!t[k]) E(`track/${t.id || '?'}`, `field "${k}" missing`);
  });
  if (!(SGx.levelSets[t.id] || []).length) E(`track/${t.id}`, 'koi level register nahi hua');
});
Object.keys(SGx.levelSets).forEach(id => {
  if (!SGx.tracks.some(t => t.id === id)) E(`levelSet/${id}`, 'is track ka data-core.js mein entry nahi hai');
});

/* Boss level HAMESHA track ke aakhir mein. `SG.registerLevels` append karta hai,
   isliye baad mein joda gaya level chup-chaap boss ke PEECHE chala jaata hai —
   aur track ka certificate boss ke pehle mil jaata hai. Beech mein daalne ke liye
   `SG.registerLevelsAfter(track, afterId, [...])` use karo. */
SGx.tracks.forEach(t => {
  const arr = SGx.levelSets[t.id] || [];
  const bossIdx = arr.findIndex(l => /^boss/i.test(l.id) || /BOSS/.test(l.title || ''));
  if (bossIdx > -1 && bossIdx !== arr.length - 1) {
    E(`track/${t.id}`, `boss level "${arr[bossIdx].id}" aakhir mein nahi hai — ` +
      `uske baad: ${arr.slice(bossIdx + 1).map(l => l.id).join(', ')}. ` +
      `SG.registerLevelsAfter() use karo.`);
  }
});

const checkQuestions = (qs, at) => (qs || []).forEach((q, i) => {
  if (q.terminal) return;
  if (!q.q) E(at, `q${i}: text missing`);
  if (!Array.isArray(q.choices) || q.choices.length < 2) { E(at, `q${i}: kam se kam 2 choices chahiye`); return; }
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length)
    E(at, `q${i}: answer index galat (${q.answer}, choices ${q.choices.length})`);
  if (new Set(q.choices).size !== q.choices.length) E(at, `q${i}: duplicate choices`);
  if (!q.explain) E(at, `q${i}: explain missing`);
});

const terminalStages = [];   // [{ at, stage }]
const labStages = [];        // [{ at, stage }] — slider/splitter/indexlab/flow

SGx.tracks.forEach(track => {
  (SGx.levelSets[track.id] || []).forEach(lvl => {
    levelCount++;
    const L = `${track.id}/${lvl.id}`;
    if (ONLY && lvl.id !== ONLY) { /* structure sabka check hota hai, missions filter hote hain */ }

    ['id', 'icon', 'title', 'badge'].forEach(k => { if (!lvl[k]) E(L, `required field "${k}" missing`); });
    if (seen.has(lvl.id)) E(L, 'duplicate level id');
    seen.add(lvl.id);
    if (!Array.isArray(lvl.objectives) || !lvl.objectives.length) E(L, 'objectives missing');
    if (!Array.isArray(lvl.lesson) || !lvl.lesson.length) E(L, 'lesson missing');
    if (!Array.isArray(lvl.stages) || !lvl.stages.length) { E(L, 'stages missing'); return; }
    if (!VISUALS[lvl.id]) E(L, `VISUALS['${lvl.id}'] missing (app.js isse level intro par dikhata hai)`);
    if (!lvl.cards || !lvl.cards.length) W(L, 'koi flashcard nahi');
    else lvl.cards.forEach((c, i) => { cardCount++; if (!c.front || !c.back) E(L, `card${i}: front/back missing`); });
    if (!lvl.interview) W(L, 'koi interview round nahi');
    if (!lvl.success) W(L, 'koi success checklist nahi');

    lvl.stages.forEach((st, si) => {
      stageCount++;
      const S = `${L}/stage${si}[${st.type}]`;
      byType[st.type] = (byType[st.type] || 0) + 1;
      if (!st.title) E(S, 'title missing');

      if (['slider', 'splitter', 'indexlab', 'flow', 'docker'].includes(st.type) && (!ONLY || lvl.id === ONLY)) labStages.push({ at: S, stage: st });

      switch (st.type) {
        case 'quiz':
          if (!(st.questions || []).length) E(S, 'koi question nahi');
          checkQuestions(st.questions, S);
          break;

        case 'bins': {
          const ids = (st.bins || []).map(b => b.id);
          if (ids.length < 2) E(S, 'kam se kam 2 bins chahiye');
          (st.bins || []).forEach((b, i) => { if (!b.label) E(S, `bin${i}: label missing`); });
          if (!(st.items || []).length) E(S, 'koi item nahi');
          (st.items || []).forEach(it => {
            if (!it.text) E(S, 'item: text missing');
            if (!ids.includes(it.bin)) E(S, `item "${it.text}": bin "${it.bin}" exist nahi karta`);
            if (!it.explain) E(S, `item "${it.text}": explain missing`);
          });
          ids.forEach(id => { if (!(st.items || []).some(i => i.bin === id)) W(S, `bin "${id}" khaali hai`); });
          break;
        }

        case 'order':
          if (!(st.steps || []).length) E(S, 'koi step nahi (field ka naam "steps" hai)');
          (st.steps || []).forEach((s, i) => {
            if (!s.text) E(S, `step${i}: text missing`);
            if (!s.explain) E(S, `step${i}: explain missing`);
          });
          break;

        case 'match': {
          if (!(st.pairs || []).length) E(S, 'koi pair nahi');
          (st.pairs || []).forEach((p, i) => {
            if (!p.left || !p.right) E(S, `pair${i}: left/right missing`);
            if (!p.explain) E(S, `pair${i}: explain missing (feedback mein "undefined" chhapega)`);
          });
          const rights = (st.pairs || []).map(p => p.right);
          if (new Set(rights).size !== rights.length) E(S, 'do pairs ka right text bilkul same hai — ambiguous');
          break;
        }

        case 'fill': {
          if (!st.template) { E(S, 'template missing'); break; }
          const slots = [...String(st.template).matchAll(/\{(\d+)\}/g)].map(m => +m[1]);
          const blanks = st.blanks || [];
          const tokens = st.tokens || [];
          if (!blanks.length) { E(S, 'koi blank nahi'); break; }
          if (!slots.length) E(S, 'template mein koi {n} placeholder nahi');
          const uniq = [...new Set(slots)].sort((a, b) => a - b);
          uniq.forEach(n => { if (!blanks[n]) E(S, `slot {${n}} ka blank missing`); });
          blanks.forEach((b, i) => {
            if (!uniq.includes(i)) W(S, `blank${i} template mein use hi nahi hua`);
            if (!b.answer) E(S, `blank${i}: answer missing`);
            else if (!tokens.includes(b.answer)) E(S, `blank${i}: answer "${b.answer}" tokens mein nahi hai — stage unsolvable`);
            if (!b.explain) E(S, `blank${i}: explain missing`);
          });
          if (new Set(tokens).size !== tokens.length) E(S, 'tokens mein duplicate string hai');
          if (tokens.length <= blanks.length) W(S, 'koi distractor token nahi');
          break;
        }

        case 'hotspot': {
          const vid = st.visual || lvl.id;
          if (!VISUALS[vid]) { E(S, `visual "${vid}" exist nahi karta`); break; }
          const avail = hsTargets[vid] || [];
          if (!avail.length) { E(S, `visual "${vid}" mein koi data-hs region nahi`); break; }
          if (!(st.questions || []).length) E(S, 'koi question nahi');
          (st.questions || []).forEach((q, i) => {
            if (!q.q) E(S, `q${i}: text missing`);
            if (!avail.includes(q.target)) E(S, `q${i}: target "${q.target}" diagram mein nahi (available: ${avail.join(', ')}) — SOFTLOCK`);
            if (!q.explain) E(S, `q${i}: explain missing`);
          });
          break;
        }

        case 'incident': {
          if (!st.pager) W(S, 'pager missing');
          const nodes = st.nodes || {};
          const start = st.start;
          if (!start || !nodes[start]) { E(S, `start node "${start}" exist nahi karta`); break; }
          let sawEnd = false;
          const reachable = new Set([start]);
          const queue = [start];
          while (queue.length) {
            const id = queue.shift();
            const n = nodes[id];
            if (!n) { E(S, `node "${id}" exist nahi karta`); continue; }
            if (n.end) { sawEnd = true; if (!n.summary) E(S, `end node "${id}": summary missing`); continue; }
            if (!n.text) E(S, `node "${id}": text missing`);
            const choices = n.choices || [];
            if (!choices.length) { E(S, `node "${id}": koi choice nahi aur end bhi nahi — DEAD END`); continue; }
            const goods = choices.filter(c => c.good);
            if (!goods.length) E(S, `node "${id}": koi good:true choice nahi — user aage badh hi nahi sakta`);
            choices.forEach((c, ci) => {
              if (!c.t) E(S, `node "${id}" choice${ci}: text field "t" missing (text nahi, t)`);
              if (!c.explain) E(S, `node "${id}" choice${ci}: explain missing`);
              if (c.good) {
                if (!c.next) E(S, `node "${id}" choice${ci}: good:true par next missing`);
                else if (!nodes[c.next]) E(S, `node "${id}" choice${ci}: next "${c.next}" exist nahi karta`);
                else if (!reachable.has(c.next)) { reachable.add(c.next); queue.push(c.next); }
              }
            });
          }
          if (!sawEnd) E(S, 'koi reachable end node nahi — incident kabhi khatam nahi hoga');
          Object.keys(nodes).forEach(id => { if (!reachable.has(id)) W(S, `node "${id}" kahin se reachable nahi`); });
          break;
        }

        case 'terminal': {
          termCount++;
          if (!st.goal) E(S, 'goal missing — mission par "undefined" chhapega');
          if (!st.db || !st.db.tables) E(S, 'db missing (SG.factoryDB() use karo)');
          if (!(st.tasks || []).length) E(S, 'tasks missing — mission kabhi complete nahi hoga');
          (st.tasks || []).forEach((t, i) => {
            if (typeof t === 'string') E(S, `task${i}: string hai, { text, check } object chahiye`);
            else {
              if (!t.text) E(S, `task${i}: text missing`);
              if (typeof t.check !== 'function') E(S, `task${i}: check() missing`);
            }
          });
          if (typeof st.success !== 'function') E(S, 'success() missing');
          if (!st.hints || !st.hints.length) W(S, 'koi hint nahi — atka hua user kabhi nikal nahi paayega');
          if (!ONLY || lvl.id === ONLY) terminalStages.push({ at: S, stage: st, lvl });
          break;
        }

        /* ---------- INTERACTIVE LABS ---------- */
        case 'slider': {
          if (!(st.knobs || []).length) E(S, 'knobs missing — slider ke bina lab khaali hai');
          (st.knobs || []).forEach((k, i) => {
            if (!k.id || !k.label) E(S, `knob${i}: id/label missing`);
            if (typeof k.min !== 'number' || typeof k.max !== 'number') E(S, `knob${i}: min/max number hone chahiye`);
            else if (k.min >= k.max) E(S, `knob${i}: min >= max`);
            if (k.value != null && (k.value < k.min || k.value > k.max)) E(S, `knob${i}: default value range ke bahar`);
          });
          if (!(st.readouts || []).length) E(S, 'readouts missing');
          (st.readouts || []).forEach((o, i) => {
            if (!o.id || !o.label) E(S, `readout${i}: id/label missing`);
            if (typeof o.fn !== 'function') E(S, `readout${i}: fn() missing`);
          });
          if (!st.goal || typeof st.goal.check !== 'function' || !st.goal.text) E(S, 'goal { text, check } missing');
          if (!st.insight) E(S, 'insight missing — goal poora hone par kuch dikhega hi nahi');
          /* SOLVABILITY: har knob combination sweep karke dekho ki goal
             kabhi poora hota bhi hai — warna player hamesha atka rahega */
          if (st.knobs && st.goal && typeof st.goal.check === 'function') {
            const knobs = st.knobs;
            let reachable = false, startsSolved = false;
            const combos = [];
            (function sweep(i, acc) {
              if (combos.length > 20000) return;
              if (i === knobs.length) { combos.push(Object.assign({}, acc)); return; }
              const k = knobs[i];
              const step = k.step || 1;
              const n = Math.min(24, Math.floor((k.max - k.min) / step) + 1);
              for (let j = 0; j < n; j++) {
                acc[k.id] = Math.min(k.max, k.min + j * ((k.max - k.min) / Math.max(1, n - 1)));
                sweep(i + 1, acc);
              }
            })(0, {});
            const evalAt = v => {
              const r = {};
              (st.readouts || []).forEach(o => { try { r[o.id] = o.fn(v); } catch (e) { r[o.id] = NaN; } });
              return r;
            };
            for (const c of combos) {
              let ok = false;
              try { ok = !!st.goal.check(c, evalAt(c)); } catch (e) { E(S, 'goal.check() crash: ' + e.message); break; }
              if (ok) { reachable = true; break; }
            }
            if (!reachable) E(S, 'goal kabhi poora nahi hota — slider ki range mein koi aisi jagah hai hi nahi (UNSOLVABLE)');
            const start = {};
            knobs.forEach(k => (start[k.id] = k.value != null ? k.value : k.min));
            try { startsSolved = !!st.goal.check(start, evalAt(start)); } catch (e) { /* upar report ho chuka */ }
            if (startsSolved) E(S, 'goal shuruaati position par hi poora hai — player ko kuch karna hi nahi padega');
          }
          break;
        }

        case 'splitter': {
          if (!st.table) E(S, 'table (naam) missing');
          if (!(st.columns || []).length) E(S, 'columns missing');
          if (!(st.targets || []).length) E(S, 'targets missing');
          const tids = new Set((st.targets || []).map(t => t.id));
          (st.targets || []).forEach((t, i) => { if (!t.id || !t.label) E(S, `target${i}: id/label missing`); });
          (st.columns || []).forEach((c, i) => {
            if (!c.name) E(S, `column${i}: name missing`);
            if (!c.target) E(S, `column${i} (${c.name}): target missing`);
            else if (!tids.has(c.target)) E(S, `column${i} (${c.name}): target "${c.target}" kisi bhi table se match nahi — column kabhi place nahi hoga (SOFTLOCK)`);
            if (!c.why) E(S, `column${i} (${c.name}): why missing — sahi jagah daalne par kuch samjhaya hi nahi jaayega`);
          });
          /* har target mein kam se kam ek column jaana chahiye, warna woh box bekaar hai */
          tids.forEach(t => {
            if (!(st.columns || []).some(c => c.target === t)) W(S, `target "${t}" mein koi column nahi jaata — woh khaali box hai`);
          });
          (st.checks || []).forEach((ch, i) => {
            if (typeof ch.ok !== 'function') E(S, `check${i}: ok() missing`);
            if (!ch.broken || !ch.fixed) E(S, `check${i}: broken/fixed text missing`);
          });
          /* CHECKS SOLVABILITY: poori sahi placement par har check green hona chahiye */
          if ((st.checks || []).length && (st.columns || []).length) {
            const done = {};
            st.columns.forEach(c => (done[c.name] = c.target));
            st.checks.forEach((ch, i) => {
              let ok = false;
              try { ok = !!ch.ok(done); } catch (e) { E(S, `check${i}.ok() crash: ${e.message}`); return; }
              if (!ok) E(S, `check${i} sahi placement ke baad bhi red hai — player ko lagega usne galat kiya`);
              let empty = true;
              try { empty = !!ch.ok({}); } catch (e) { empty = false; }
              if (empty) W(S, `check${i} shuru mein hi green hai — usse kuch pata nahi chalta`);
            });
          }
          if (!st.insight) E(S, 'insight missing');
          break;
        }

        case 'indexlab': {
          if (!st.table || !st.table.name) E(S, 'table { name, rows, columns } missing');
          if (!st.table || typeof st.table.rows !== 'number') E(S, 'table.rows number hona chahiye');
          if (!st.table || !(st.table.columns || []).length) E(S, 'table.columns missing — chunne ko kuch nahi hoga');
          if (!st.query || !st.query.sql) E(S, 'query.sql missing');
          if (!st.query || !Array.isArray(st.query.where)) E(S, 'query.where array missing');
          const cols = new Set(((st.table || {}).columns || []).map(c => c.name));
          ((st.query || {}).where || []).forEach((w, i) => {
            if (!w.col || !w.op) E(S, `where${i}: col/op missing`);
            else if (!['eq', 'range'].includes(w.op)) E(S, `where${i}: op sirf 'eq' ya 'range' ho sakta hai`);
            if (w.col && !cols.has(w.col)) E(S, `where${i}: column "${w.col}" table.columns mein nahi — player use index mein daal hi nahi sakta`);
          });
          if (st.query && st.query.orderBy && !cols.has(st.query.orderBy)) E(S, `query.orderBy "${st.query.orderBy}" table.columns mein nahi`);
          if (!st.goal || typeof st.goal.check !== 'function' || !st.goal.text) E(S, 'goal { text, check } missing');
          if (!st.insight) E(S, 'insight missing');
          /* SOLVABILITY: saare column permutations (chhoti lambai tak) try karke
             dekho ki koi index goal poora karta bhi hai */
          if (st.goal && typeof st.goal.check === 'function' && st.table && (st.table.columns || []).length) {
            const names = st.table.columns.map(c => c.name);
            let solvable = false, emptySolved = false;
            try { emptySolved = !!st.goal.check(SGx.planFor(st, []), []); } catch (e) { E(S, 'goal.check() crash: ' + e.message); }
            const perms = [];
            (function build(cur) {
              if (cur.length) perms.push(cur.slice());
              if (cur.length >= Math.min(4, names.length)) return;
              names.forEach(n => { if (!cur.includes(n)) build(cur.concat(n)); });
            })([]);
            for (const p of perms) {
              let ok = false;
              try { ok = !!st.goal.check(SGx.planFor(st, p), p); } catch (e) { break; }
              if (ok) { solvable = true; break; }
            }
            if (!solvable) E(S, 'koi bhi index goal poora nahi karta (UNSOLVABLE) — goal.check ya cost model dobara dekho');
            if (emptySolved) E(S, 'goal bina kisi index ke hi poora hai — player ko kuch karna hi nahi padega');
          }
          break;
        }

        case 'docker': {
          if (!st.project) E(S, 'project missing');
          else {
            const pdir = path.join(DIR, 'docker-labs', st.project);
            if (!fs.existsSync(pdir)) E(S, `docker-labs/${st.project} folder nahi hai`);
            else if (st.exercise) {
              const rp = path.join(pdir, 'README.md');
              const readme = fs.existsSync(rp) ? fs.readFileSync(rp, 'utf8') : '';
              if (!readme.includes(st.exercise)) E(S, `exercise "${st.exercise}" project README mein nahi mila`);
            }
          }
          if (!st.goal) E(S, 'goal missing');
          if ((st.steps || []).length < 2) E(S, 'kam se kam 2 steps chahiye');
          (st.steps || []).forEach((sp, i) => { if (!sp.text) E(S, `step${i}: text missing`); });
          const obs = st.observe;
          if (!obs || !Array.isArray(obs.choices) || obs.choices.length < 2) E(S, 'observe sawaal (2+ choices) missing');
          else if (typeof obs.answer !== 'number' || obs.answer < 0 || obs.answer >= obs.choices.length)
            E(S, 'observe: answer index range ke bahar');
          else if (!obs.explain) E(S, 'observe: explain missing');
          break;
        }

        case 'flow': {
          if (!(st.lanes || []).length) E(S, 'lanes missing');
          if (!(st.steps || []).length) E(S, 'steps missing');
          const lids = new Set((st.lanes || []).map(l => l.id));
          (st.lanes || []).forEach((l, i) => { if (!l.id || !l.label) E(S, `lane${i}: id/label missing`); });
          (st.steps || []).forEach((sp, i) => {
            if (!sp.lane) E(S, `step${i}: lane missing`);
            else if (!lids.has(sp.lane)) E(S, `step${i}: lane "${sp.lane}" exist nahi karta — woh step DIKHEGA HI NAHI`);
            if (!sp.t) E(S, `step${i}: t (text) missing`);
            if (!sp.note) E(S, `step${i}: note missing — us kadam par kuch samjhaya nahi jaayega`);
            if (sp.ask) {
              if (!sp.ask.q || !Array.isArray(sp.ask.choices)) E(S, `step${i}.ask: q/choices missing`);
              else if (typeof sp.ask.answer !== 'number' || sp.ask.answer < 0 || sp.ask.answer >= sp.ask.choices.length)
                E(S, `step${i}.ask: answer index range ke bahar`);
              if (!sp.ask.explain) E(S, `step${i}.ask: explain missing`);
            }
          });
          /* aakhri step par ask nahi hona chahiye — warna finish() kabhi nahi chalta */
          const last = (st.steps || [])[(st.steps || []).length - 1];
          if (last && last.ask) E(S, 'aakhri step par ask hai — flow kabhi khatam nahi hoga (SOFTLOCK)');
          if (!(st.steps || []).some(sp => sp.ask)) W(S, 'koi ask nahi — flow sirf dekhne ki cheez ban jaayega, khelne ki nahi');
          if (st.state && typeof st.state !== 'function') E(S, 'state() function hona chahiye');
          if (!st.insight) E(S, 'insight missing');
          break;
        }

        default: E(S, `unknown stage type "${st.type}"`);
      }
    });

    if (lvl.interview) {
      const qs = (lvl.interview.questions || []);
      ivCount += qs.length;
      checkQuestions(qs, `${L}/interview`);
      qs.forEach((q, i) => {
        if (q.terminal) {
          termCount++;
          const S = `${L}/interview[${i}][terminal]`;
          if (!q.terminal.goal) E(S, 'goal missing');
          if (typeof q.terminal.success !== 'function') E(S, 'success() missing');
          if (!ONLY || lvl.id === ONLY) terminalStages.push({ at: S, stage: q.terminal, lvl });
        }
      });
    }
  });
});

/* orphan visuals */
const usedVisuals = new Set(seen);
SGx.tracks.forEach(t => (SGx.levelSets[t.id] || []).forEach(l =>
  (l.stages || []).forEach(s => { if (s.visual) usedVisuals.add(s.visual); })));
Object.keys(VISUALS).forEach(k => { if (!usedVisuals.has(k)) W('visuals', `VISUALS['${k}'] kisi level se linked nahi`); });

/* ranks */
if (!Array.isArray(RANKS) || !RANKS.length) W('RANKS', 'RANKS nahi mila');
else for (let i = 1; i < RANKS.length; i++) {
  if (RANKS[i].xp <= RANKS[i - 1].xp) E('RANKS', `"${RANKS[i].name}" ka xp badhta nahi`);
}

/* script tags */
['index.html', 'gallery.html'].forEach(page => {
  const p = path.join(DIR, page);
  if (!fs.existsSync(p)) { W(page, 'file missing'); return; }
  const html = fs.readFileSync(p, 'utf8');
  const need = page === 'index.html' ? LOAD_ORDER.concat('app.js') : ['visuals.js'];
  need.forEach(sname => { if (!html.includes(`src="${sname}"`)) E(page, `<script src="${sname}"> missing`); });
});

/* =====================================================================
   2. MISSIONS — asli SQL engine par hints chala ke dekho
   ===================================================================== */
const SQL_START = /^(SELECT|INSERT|UPDATE|DELETE|SHOW|DESCRIBE|DESC|EXPLAIN|CREATE|ALTER|DROP|BEGIN|START|COMMIT|ROLLBACK|WITH|USE|SET|TRUNCATE|help)\b/i;

/* Hint se saare SQL statements nikaalo.
   Hints kai shape mein hote hain:
     "SELECT ...;"
     "SELECT ...;   ← chhoti si baat"          (trailing prose)
     "BEGIN;  phir  UPDATE ...;  phir  COMMIT" (ek hint mein kai statements)
   User inhe ek-ek karke type karta hai, isliye validator bhi wahi karta hai. */
function sqlsFromHint(hint, stage) {
  /* Mission apne khud ke non-SQL commands define kar sakti hai (`responses`),
     jaise `session-b lock 2`. Unhe bhi valid maano. */
  const resp = (stage && stage.responses) || [];
  const isCmd = q => SQL_START.test(q) || resp.some(r => { try { return r.re.test(q); } catch (e) { return false; } });
  let h = String(hint).trim();
  h = h.replace(/\u2190/g, '\n');                      // ← ke baad prose
  h = h.replace(/\s+phir\s+dobara\s+/gi, '\n');
  h = h.replace(/\s+phir\s+/gi, '\n');
  const out = [];
  h.split(/\n+/).forEach(chunk => {
    chunk.split(/;\s*/).forEach(part => {
      /* NOTE: trailing "(...)" ko strip MAT karo — CREATE TABLE / INSERT
         legitimately ")" par khatam hote hain. Prose wale brackets `;` split
         se pehle hi alag ho jaate hain. */
      let q = part.split(' \u2014 ')[0].split(' \u2013 ')[0].trim();
      /* "DIAGNOSE: SELECT ..." / "Session B ko bolo: session-b lock 2" jaise leading
         labels hata do — convention: command hamesha TAIL par hota hai. */
      if (!isCmd(q)) {
        const ci = q.lastIndexOf(': ');
        if (ci > -1) {
          const tail = q.slice(ci + 2).trim();
          if (isCmd(tail)) q = tail;
        }
      }
      if (q && isCmd(q)) out.push(q);
    });
  });
  return out;
}

/* =====================================================================
   LAB RENDER — slider/splitter/indexlab/flow ko ASLI renderer par chalao.
   Structure check yeh nahi pakad sakta: ek galat field ka matlab hai
   crash ya "undefined" screen par. Isliye har lab yahan sach mein render
   hota hai, aur uske saare interactive raaste chalaaye jaate hain.
   ===================================================================== */
function clickFinish(arena) {
  /* renderers onDone() ko tabhi bulate hain jab player "Aage badho →" dabata hai.
     Headless test ko woh button khud dabana padta hai. */
  const btn = arena.children.filter(c => c.className === 'btn').pop();
  if (btn && btn.onclick) { btn.onclick(); return true; }
  return false;
}

/* =====================================================================
   SCRIPT LEAK — content Hinglish hai, yaani LATIN script mein.
   Devanagari/Cyrillic/Arabic ka ek bhi character matlab typing ke waqt
   galti se doosri script ghus gayi ("girा", "rukа"). Aankh se yeh lagbhag
   nahi dikhta — isliye machine se pakdo.
   ===================================================================== */
function scriptLeakCheck() {
  const NON_LATIN = /[\u0400-\u04FF\u0900-\u097F\u0600-\u06FF]/;
  LOAD_ORDER.forEach(f => {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) return;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(NON_LATIN);
      if (m) E(`${f}:${i + 1}`, `non-Latin character '${m[0]}' (U+${m[0].charCodeAt(0).toString(16).toUpperCase()}): ${line.trim().slice(0, 70)}`);
    });
  });
}

function renderLab(at, stage) {
  const arena = makeEl('div');
  let done = null;
  try {
    SGx.renderers[stage.type](stage, arena, r => { done = r; });
  } catch (e) {
    E(at, `lab renderer crash — ${e.message}`);
    return;
  }
  if (!arena.children.length) { E(at, 'lab renderer ne kuch render hi nahi kiya'); return; }
  const html = JSON.stringify(arena.children.map(c => (c.innerHTML || '') + ' ' + (c.textContent || '')));
  ['undefined', '[object Object]', 'NaN'].forEach(bad => {
    if (html.includes(bad)) E(at, `render mein "${bad}" dikh raha hai — koi field galat ya missing hai`);
  });

  /* DOCKER: saare steps tick karke observe ka sahi jawab do — lab poora hona chahiye */
  if (stage.type === 'docker') {
    const all = [];
    (function collect(n) { (n.children || []).forEach(c => { all.push(c); collect(c); }); })(arena);
    const hasCls = (n, c) => String(n.className || '').split(' ').indexOf(c) > -1;
    all.filter(n => hasCls(n, 'dk-tick')).forEach(b => { if (b.onclick) b.onclick(); });
    /* saare ticks ke baad hi sawaal render hota hai — isliye tree dobara collect karo */
    const after = [];
    (function collectA(n) { (n.children || []).forEach(c => { after.push(c); collectA(c); }); })(arena);
    const opts = after.filter(n => hasCls(n, 'dk-opt'));
    const right = opts.filter(b => String(b.dataset.i) === String(stage.observe.answer))[0];
    if (!right) { E(at, 'docker lab: saare steps tick karne par bhi observe ka sahi option nahi mila'); return; }
    if (right.onclick) right.onclick();
    const all2 = [];
    (function collect2(n) { (n.children || []).forEach(c => { all2.push(c); collect2(c); }); })(arena);
    const dn = all2.filter(n => hasCls(n, 'dk-done'))[0];
    if (dn && dn.onclick) dn.onclick();
    if (!done) E(at, 'docker lab SOFTLOCK — sahi jawab par bhi poora nahi hua');
    else if (done.firstTry !== 1) E(at, `docker lab: sahi jawab par firstTry ${done.firstTry}`);
    return;
  }

  /* SPLITTER: har column ko uske sahi target par daal ke dekho ki lab
     sach mein poora hota hai (aur onDone chalta hai) */
  if (stage.type === 'splitter') {
    const arena2 = makeEl('div');
    let fin = null;
    try { SGx.renderers.splitter(stage, arena2, r => { fin = r; }); } catch (e) { E(at, `splitter crash — ${e.message}`); return; }
    const src = arena2.children.find(c => c.className === 'sp-source');
    const tgts = arena2.children.find(c => c.className === 'sp-targets');
    if (!src || !tgts) { E(at, 'splitter ne source/targets render nahi kiye'); return; }
    const chips = (src.children[0] && src.children[0].children) || [];
    stage.columns.forEach((col, ci) => {
      const chip = chips[ci];
      const ti = stage.targets.findIndex(t => t.id === col.target);
      if (!chip || ti < 0) return;
      try {
        (chip._handlers.click || []).forEach(fn => fn({ stopPropagation() {} }));
        (tgts.children[ti]._handlers.click || []).forEach(fn => fn({ stopPropagation() {} }));
      } catch (e) { E(at, `column "${col.name}" place karte waqt crash — ${e.message}`); }
    });
    if (!fin) clickFinish(arena2);
    if (!fin) E(at, 'saare columns sahi jagah daalne par bhi lab poora nahi hua (SOFTLOCK)');
    else if (fin.total !== stage.columns.length) E(at, `lab poora hua par total ${fin.total} hai, columns ${stage.columns.length} — scoring galat`);
  }

  /* FLOW: poore flow ko step karke dekho ki woh khatam hota hai */
  if (stage.type === 'flow') {
    const arena2 = makeEl('div');
    let fin = null;
    try { SGx.renderers.flow(stage, arena2, r => { fin = r; }); } catch (e) { E(at, `flow crash — ${e.message}`); return; }
    const ctl = arena2.children.find(c => c.className === 'fl-ctl');
    if (!ctl) { E(at, 'flow ne controls render nahi kiye'); return; }
    const stepBtn = ctl.children[1];
    const answered = new Set();
    for (let n = 0; n < stage.steps.length + 6 && !fin; n++) {
      try { if (stepBtn.onclick) stepBtn.onclick(); } catch (e) { E(at, `step ${n} par crash — ${e.message}`); break; }
      /* agar ask khula hai toh sahi jawab daba do */
      const ask = arena2.children.find(c => c.className === 'fl-ask');
      const box = ask && ask.children.filter(c => c.className === 'choices').pop();
      if (box && !answered.has(box)) {
        answered.add(box);
        /* kaunsa choice sahi hai yeh yahan se pata nahi — isliye ek-ek karke
           dabao jab tak "Aage →" na aa jaaye. Yeh sabhi galat jawaabon ka
           raasta bhi chala deta hai, jo apne aap mein ek achha test hai. */
        let advanced = false;
        for (let c = 0; c < box.children.length && !advanced; c++) {
          try { if (box.children[c].onclick) box.children[c].onclick(); }
          catch (e) { E(at, `ask ka choice ${c} dabane par crash — ${e.message}`); advanced = true; break; }
          const go = ask.children.find(x => x.className === 'btn small');
          if (go && go.onclick) { try { go.onclick(); } catch (e) { E(at, `ask ke baad "Aage" par crash — ${e.message}`); } advanced = true; }
        }
        if (!advanced) { E(at, 'ask ka koi bhi jawab flow ko aage nahi badhata (SOFTLOCK)'); break; }
      }
    }
    if (!fin) clickFinish(arena2);
    if (!fin) { E(at, 'poora flow step karne par bhi khatam nahi hua (SOFTLOCK)'); if (process.env.DBG) console.log('DBG steps=', stage.steps.length, 'ctlkids=', ctl.children.map(c=>c.textContent)); }
  }
}

function runMission(entry) {
  const { at, stage } = entry;
  const arena = makeEl('div');
  let simRef = null;

  /* success()/check() ko sim milta hai — usse pakadne ke liye renderer chalao */
  let inputEl = null, keydown = null;
  try {
    SGx.renderers.terminal(stage, arena, () => {});
  } catch (e) {
    E(at, `renderer crash — ${e.message}`);
    return;
  }

  /* terminal element dhoondo → uska input aur keydown handler */
  const term = arena.children.find(c => c.className === 'terminal');
  if (!term) { E(at, 'renderer ne terminal element nahi banaya'); return; }
  inputEl = term.querySelector('input');
  keydown = (inputEl._handlers.keydown || [])[0];
  if (!keydown) { E(at, 'terminal input par keydown handler nahi mila'); return; }

  const type = sql => { inputEl.value = sql; keydown({ key: 'Enter', preventDefault() {} }); };

  /* sim tak pahunchne ke liye ek harmless statement chalao aur success() ko probe karo */
  const probe = { fresh: null, after: null };

  /* fresh state par success() true nahi hona chahiye — ise check karne ke liye
     hum ek no-op chalate hain aur tasks ke through sim ka andaza lagate hain.
     Seedha access ke liye: stage.success ko wrap karke sim pakad lo. */
  const origSuccess = stage.success;
  stage.success = function (s) { simRef = s; return origSuccess.apply(this, arguments); };

  type('SHOW TABLES');
  let freshOk = true;
  try { if (simRef && origSuccess(simRef)) freshOk = false; } catch (e) { freshOk = false; E(at, `success() fresh state par crash — ${e.message}`); }
  if (!freshOk) E(at, 'success() shuru mein hi true hai — mission bina kuch kiye complete ho jaayega');

  /* hints chalao */
  const ran = [];
  (stage.hints || []).forEach(h => {
    sqlsFromHint(h, stage).forEach(sql => {
      ran.push(sql);
      try { type(sql); } catch (e) { E(at, `hint ki query ne engine crash kiya: "${sql}" → ${e.message}`); }
    });
  });

  stage.success = origSuccess;
  const sim = simRef;
  if (!sim) { E(at, 'sim capture nahi hua'); return; }

  /* Engine errors — par kai missions JAAN-BOOJH ke error karwate hain
     (constraint todna, injection dikhana). Aise hints ko warning mat do. */
  if (sim.lastError && ran.length) {
    const intentional = /fail|error|todo|todna|galat|1062|1048|1064|1146|1054|duplicate|reject/i;
    const hintText = (stage.hints || []).join(' ') + ' ' + String(stage.goal || '');
    if (!intentional.test(hintText)) {
      W(at, `aakhri hint ki query ne error diya: "${ran[ran.length - 1]}" → ${sim.lastError}`);
    }
  }

  /* tasks */
  const bad = [];
  (stage.tasks || []).forEach((t, i) => {
    if (typeof t.check !== 'function') return;
    let r = false;
    try { r = !!t.check(sim); } catch (e) { E(at, `task${i}.check() crash — ${e.message}`); return; }
    if (!r) bad.push(`task${i} "${t.text}"`);
  });
  if (bad.length) E(at, `hints chalane par bhi yeh tasks poore nahi hue → ${bad.join(' · ')}`);

  let s = false;
  try { s = !!origSuccess(sim); } catch (e) { E(at, `success() crash — ${e.message}`); }
  if (!s) E(at, `hints chalane par bhi success() false hai (chalayi gayi: ${ran.length} queries)`);
}

scriptLeakCheck();
labStages.forEach(l => renderLab(l.at, l.stage));
terminalStages.forEach(runMission);

/* =====================================================================
   REPORT
   ===================================================================== */
console.log(`
📊 SQL Gurukul — content report
──────────────────────────────────────────────────────────`);
SGx.tracks.forEach(t => {
  const n = (SGx.levelSets[t.id] || []).length;
  console.log(`  ${t.icon} ${t.name.padEnd(38)} ${String(n).padStart(2)} levels`);
});
console.log(`──────────────────────────────────────────────────────────
  ${levelCount} levels · ${stageCount} stages · ${termCount} terminal missions · ${ivCount} interview Qs · ${cardCount} flashcards · ${Object.keys(VISUALS).length} diagrams
  stage types: ${Object.entries(byType).map(([k, v]) => `${k}:${v}`).join(' · ')}
  missions run: ${terminalStages.length} · labs rendered: ${labStages.length}${ONLY ? `  (filter: ${ONLY})` : ''}
`);

if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warnings (app chalega, par dekh lo):`);
  warnings.forEach(w => console.log('   · ' + w));
  console.log('');
}
if (problems.length) {
  console.log(`❌ ${problems.length} PROBLEM${problems.length > 1 ? 'S' : ''} — yeh theek karne padenge:`);
  problems.forEach(p => console.log('   ✗ ' + p));
  console.log('');
  process.exit(1);
}
console.log('✅ Koi problem nahi. Content khelne laayak hai.\n');
