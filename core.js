/* =====================================================================
   SQL Gurukul — Core: state, XP, streak, spaced repetition, registry
   Loaded FIRST. Everything lives under the global `SG` namespace so
   content files (data-*.js) can self-register levels & cards.
   (Ported from kubegurukul/core.js — SQL & MySQL edition)
   ===================================================================== */

/* kuch purane browsers/webviews mein scrollIntoView nahi hota — app na toote */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView)
  Element.prototype.scrollIntoView = function () {};

const SG = {
  STORE_KEY: 'sqlgurukul-v1',
  XP_PER_ITEM: 10,
  PERFECT_BONUS: 20,
  TERMINAL_XP: 30,       // base XP for completing an SQL mission
  HINT_COST: 5,          // XP shaved off a terminal mission per hint
  CARD_XP: 5,            // XP per due flashcard reviewed
  POP_XP: 5,             // bonus XP per correct pop-quiz answer
  SRS_INTERVALS: [1, 3, 7, 16, 35],   // days — SM-2-lite boxes

  levelSets: {},         // trackId -> [level, ...]  (filled by data-*.js)
  tracks: [],            // filled by data-core.js
  state: null,
  session: null,
};

/* ---------------- level registry (extensibility hook) ----------------
   A data file calls:  SG.registerLevels('beginner', [ {...}, {...} ])
   Multiple calls append — so you can add ONE new level from ANY file. */
SG.registerLevels = function (trackId, levels) {
  if (!SG.levelSets[trackId]) SG.levelSets[trackId] = [];
  SG.levelSets[trackId].push(...levels);
};

/* Naya level track ke BEECH mein daalna ho (aur boss ko aakhir mein rakhna ho):
     SG.registerLevelsAfter('intermediate', 'indexes', [ {...} ])
   Agar `afterId` nahi mila toh normal append ho jaata hai. */
SG.registerLevelsAfter = function (trackId, afterId, levels) {
  if (!SG.levelSets[trackId]) SG.levelSets[trackId] = [];
  const arr = SG.levelSets[trackId];
  const i = arr.findIndex(l => l.id === afterId);
  if (i < 0) arr.push(...levels);
  else arr.splice(i + 1, 0, ...levels);
};

/* Maujooda level ko BADHANA (naya video, wahi topic — naya level nahi banana):
     SG.extendLevel('isolation', { objectives:[], lesson:[], stages:[], success:[],
                                   cards:[], interview:[questions], homework:'' })
   Har cheez us level ke aakhir mein judti hai. Level na mile toh ERROR —
   chupchaap kuch na hona sabse bura bug hota. */
SG.extendLevel = function (levelId, add) {
  let lvl = null;
  Object.keys(SG.levelSets).forEach(t => (SG.levelSets[t] || []).forEach(l => { if (l.id === levelId) lvl = l; }));
  if (!lvl) throw new Error(`SG.extendLevel: level '${levelId}' nahi mila — file order check karo`);
  ['objectives', 'lesson', 'stages', 'success', 'cards'].forEach(k => {
    if (add[k] && add[k].length) lvl[k] = (lvl[k] || []).concat(add[k]);
  });
  if (add.interview && add.interview.length) {
    lvl.interview = lvl.interview || { title: 'Interview Round', instructions: '', questions: [] };
    lvl.interview.questions = lvl.interview.questions.concat(add.interview);
  }
  if (add.homework) lvl.homework = (lvl.homework || '') + add.homework;
  return lvl;
};

/* ---------------- persistence ---------------- */
SG.defaultState = function () {
  return {
    xp: 0,
    completed: [],        // level ids
    stars: {},            // levelId -> 1..3
    dojo: {},             // cardId -> { box, due (ms), front, back, tag }
    streak: { last: null, count: 0, best: 0 },
    levelStarts: 0,       // for pop-quiz cadence
  };
};

SG.loadState = function () {
  try {
    const s = JSON.parse(localStorage.getItem(SG.STORE_KEY));
    if (s && typeof s.xp === 'number' && Array.isArray(s.completed)) {
      // forward-compat: fill any missing keys added in later versions
      return Object.assign(SG.defaultState(), s);
    }
  } catch (e) { /* corrupted store — start fresh */ }
  return SG.defaultState();
};
SG.saveState = function () { localStorage.setItem(SG.STORE_KEY, JSON.stringify(SG.state)); };
SG.state = SG.loadState();

/* ---------------- DOM helpers ---------------- */
SG.el = function (tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
SG.shuffle = function (arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
SG.shake = function (node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
};
SG.escapeHtml = function (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/* ---------------- XP & ranks ---------------- */
SG.currentRank = function () {
  let r = RANKS[0];
  for (const rank of RANKS) if (SG.state.xp >= rank.xp) r = rank;
  return r;
};
SG.nextRank = function () { return RANKS.find(r => r.xp > SG.state.xp) || null; };
SG.addXP = function (n) {
  if (SG.session && SG.session.replay) return;
  if (n <= 0) return;
  SG.state.xp += n;
  SG.touchStreak();
  SG.saveState();
  if (typeof renderTopbar === 'function') renderTopbar();
  SG.floatXP(n);
};
SG.floatXP = function (n) {
  const bar = document.getElementById('topbar');
  const f = SG.el('div', 'xp-float', `+${n} XP`);
  bar.appendChild(f);
  setTimeout(() => f.remove(), 1200);
};

/* ---------------- daily streak ---------------- */
SG.todayStr = function () {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
SG.touchStreak = function () {
  const s = SG.state.streak;
  const today = SG.todayStr();
  if (s.last === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  s.count = (s.last === yesterday) ? s.count + 1 : 1;
  s.best = Math.max(s.best, s.count);
  s.last = today;
  SG.saveState();
};
SG.streakAlive = function () {
  const s = SG.state.streak;
  if (!s.last) return false;
  const today = SG.todayStr();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  return s.last === today || s.last === yesterday;
};

/* ---------------- Revision Dojo: SM-2-lite spaced repetition ----------
   Card = { box, due, front, back, tag }.  box indexes SRS_INTERVALS.
   - level complete  -> level.cards enter the deck (due tomorrow)
   - wrong answer    -> auto "mistake card" (due tomorrow, box 0)
   - review correct  -> box+1 (capped), due = now + interval[box]
   - review wrong    -> box = 0, due tomorrow                      */
SG.DAY = 24 * 60 * 60 * 1000;

SG.addCard = function (id, front, back, tag) {
  if (SG.state.dojo[id]) return; // already in the deck
  SG.state.dojo[id] = { box: 0, due: Date.now() + SG.DAY, front, back, tag: tag || '' };
  SG.saveState();
};

/* called by game renderers on a wrong answer — turns the mistake into a card */
SG.noteMistake = function (front, back, tag) {
  if (SG.session && SG.session.replay) return;
  if (!front || !back) return;
  // stable id from the front text so the same mistake never duplicates
  let h = 0;
  for (let i = 0; i < front.length; i++) h = ((h << 5) - h + front.charCodeAt(i)) | 0;
  SG.addCard('mistake-' + Math.abs(h), front, back, tag || '🙈 Galti se seekho');
};

SG.enrollLevelCards = function (level) {
  (level.cards || []).forEach((c, i) =>
    SG.addCard(`${level.id}-c${i}`, c.front, c.back, `${level.icon} ${level.title}`));
};

SG.dueCards = function () {
  const now = Date.now();
  return Object.entries(SG.state.dojo)
    .filter(([, c]) => c.due <= now)
    .map(([id, c]) => ({ id, ...c }));
};

SG.reviewCard = function (id, remembered) {
  const c = SG.state.dojo[id];
  if (!c) return;
  if (remembered) {
    c.box = Math.min(c.box + 1, SG.SRS_INTERVALS.length - 1);
    c.due = Date.now() + SG.SRS_INTERVALS[c.box] * SG.DAY;
  } else {
    c.box = 0;
    c.due = Date.now() + SG.DAY;
  }
  SG.saveState();
};

/* ---------------- pop-quiz question harvesting ----------------
   Pulls MCQs from already-completed levels (quiz stages + interview). */
SG.harvestQuestions = function () {
  const qs = [];
  SG.tracks.forEach(t => (SG.levelSets[t.id] || []).forEach(lvl => {
    if (!SG.state.completed.includes(lvl.id)) return;
    (lvl.stages || []).forEach(st => {
      if (st.type === 'quiz') (st.questions || []).forEach(q => qs.push({ ...q, from: lvl }));
    });
    if (lvl.interview) (lvl.interview.questions || []).forEach(q => {
      if (q.choices) qs.push({ ...q, from: lvl });
    });
  }));
  return qs;
};

/* ---------------- track helpers ---------------- */
SG.trackOf = function (level) {
  return SG.tracks.find(t => (SG.levelSets[t.id] || []).includes(level));
};
SG.levelsOf = function (track) { return SG.levelSets[track.id] || []; };
SG.trackProgress = function (track) {
  const levels = SG.levelsOf(track);
  const done = levels.filter(l => SG.state.completed.includes(l.id)).length;
  return { done, total: levels.length, complete: done === levels.length && levels.length > 0 };
};
SG.trackUnlocked = function (track) {
  if (track.alwaysUnlocked) return true;
  const idx = SG.tracks.indexOf(track);
  if (idx <= 0) return true;
  return SG.trackProgress(SG.tracks[idx - 1]).complete;
};
