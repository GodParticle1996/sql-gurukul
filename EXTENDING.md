# SQL Gurukul 🛕 — Extending Guide

Yeh app **ever-extending** banaya gaya hai. Naya level, track, game ya card add
karna sirf **data files** ka kaam hai — engine ko chhoona nahi padta.

> ⚠️ Yeh guide asli engine code se likha gaya hai. Har schema neeche `games.js`,
> `app.js`, `core.js` aur `sqlcli.js` se verify kiya gaya hai. Agar kabhi doubt ho
> toh source hi sach hai — par yahan jo likha hai woh chalta hai.

---

## 0. File Map

```
sqlgurukul/
├── index.html              ← script load order (CRITICAL — neeche dekho)
├── style.css               ← MySQL teal theme + .dg-* diagram primitives
├── core.js                 ← SG namespace, state, XP, ranks, streak, SRS, registry
├── data-core.js            ← RANKS[] + SG.tracks[] + FACTORY_DB + SG.factoryDB()
├── visuals.js              ← VISUALS[id] = { t, html } — 28 concept diagrams
├── games.js                ← SG.renderers — bins/fill/order/match/quiz/hotspot/incident
├── labs.js                 ← SG.renderers — slider/splitter/indexlab/flow
├── sqlcli.js               ← SG.renderers.terminal — MySQL simulator
├── dockerlab.js            ← SG.renderers.docker — asli containers wala stage (IIFE)
├── data-beginner.js        ← Track 1
├── data-intermediate.js    ← Track 2
├── data-advanced.js        ← Track 3
├── data-scale.js           ← Track 4
├── data-int-*.js           ← Track 5 🔬 Database Internals (9 files, IIFE) + purane levels ke extendLevel
├── docker-labs/NN-name/    ← asli Postgres 16 + MySQL 8 labs (docker-compose, run.sh, scripts, README)
├── validate.js             ← content checker + mission runner (node validate.js)
├── app.js                  ← screens: home/track/level/interview/dojo/certs
├── gallery.html            ← saare diagrams ek page par
└── README.md
```

### Load order (index.html) — KABHI mat badalna

```
core.js → data-core.js → visuals.js → games.js → labs.js → sqlcli.js → dockerlab.js
       → data-beginner.js → data-intermediate.js → data-advanced.js → data-scale.js
       → data-int-wal.js → data-int-mvcc.js → data-int-partitioning.js → data-int-columnar.js
       → data-int-sharding.js → data-int-migration.js → data-int-ops.js → data-int-trees.js
       → data-int-advisory.js → app.js
```

**Kyun?**
- `games.js` `SG.renderers = {}` banata hai aur top-level `const el/escapeHtml/shake`
  declare karta hai → `sqlcli.js` usme `.terminal` jodta hai, `app.js` un consts ko use karta hai.
- `data-core.js` `SG.factoryDB()` deta hai jise data files load-time par call karti hain.
- `app.js` boot karta hai → **last** mein.

⚠️ **`const el/escapeHtml/shake` ko app.js mein redeclare mat karna** — classic
scripts ek hi global lexical scope share karte hain → `SyntaxError: Identifier 'el'
has already been declared` → app crash.

---

## 1. Naya Level Add Karna

### Step 1 — VISUALS entry (visuals.js)

```js
mynewlevel: {                      // key = level id
  t: 'Chhota title',
  html: `
    <div class="dg-flow">
      <div class="dg-node is-accent" data-hs="node1"><span class="ni">🔍</span><span class="nl">Node 1</span><span class="ns">subtitle</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-good" data-hs="node2"><span class="ni">📋</span><span class="nl">Node 2</span></div>
    </div>
    <div class="dg-cap">Neeche ka explanation.</div>`,
},
```

- Key **level `id`** se exactly match honi chahiye (`app.js` `VISUALS[level.id]` padhta hai).
- Hotspot game ke liye clickable node par `data-hs="uniqueid"` lagao.
- Sirf `.dg-*` primitives use karo (§5).

### Step 2 — Level object (data-{track}.js)

```js
SG.registerLevels('beginner', [
  {
    id: 'mynewlevel',              // MUST match VISUALS key
    icon: '🎯',
    title: 'My New Level',
    badge: 'Badge Naam',
    objectives: [                  // array of HTML STRINGS
      '<b>Objective 1</b> — kya seekhoge',
    ],
    lesson: [                      // array of HTML STRINGS (objects NAHI)
      `<h3>📖 Heading</h3>
       <p>Hinglish explanation... <code>inline code</code>.</p>
       <pre>SELECT * FROM t;</pre>
       <table><tr><th>A</th><th>B</th></tr><tr><td>x</td><td>y</td></tr></table>`,
      `<h3>⚡ War story wala</h3>
       <div class="war-story"><b>⚡ Real incident:</b> production se sacchi kahani —
       kya toota, kyun, kya seekha.</div>`,
    ],
    stages: [ /* §2 */ ],
    interview: {
      title: 'Interview Round — X',
      instructions: 'Round ka intro. 🎤',
      questions: [
        { q: 'Sawal?', choices: ['a','b','c','d'], answer: 1, explain: '...' },
        { terminal: { /* §2 ka terminal stage — same shape */ } },
      ],
    },
    success: [ 'Main ... kar sakta hoon' ],       // completion checklist
    homework: `<p>Optional real-MySQL practice</p><pre>SELECT 1;</pre>`,
    cards: [ { front: 'Sawal?', back: 'Jawab. <b>HTML</b> allowed.' } ],
  },
]);
```

## Interactive labs (`labs.js`)

Chaar aur stage types hain jo `games.js` se alag file mein rehte hain. Inka
maksad alag hai: yahan "sahi jawab yaad karo" nahi hai — yahan tum ek knob
ghumate ho aur number **khud** badalta hai.

```js
/* 🎚️ SLIDER — knob ghumao, numbers live badlein */
{
  type: 'slider',
  title, instructions, scenario: 'HTML',
  knobs:    [{ id, label, min, max, step, value, unit, help }],
  readouts: [{ id, label, unit, fn: vals => number,
               good: (x, vals) => bool, format: x => str, sub: (x, vals) => 'HTML' }],
  bar:      (vals, r) => ({ pct, bad, label }),        // optional
  verdict:  (vals, r) => ({ tone: 'good|bad|warn', text: 'HTML' }),  // live coaching
  goal:     { text: 'HTML', check: (vals, r) => bool },
  wrongWay: (vals, r) => bool,        // optional — "galat disha" par mistake note
  insight:  'HTML — goal poora hone par',
}

/* 🔀 SPLITTER — god-table ke columns ko tables mein baanto */
{
  type: 'splitter',
  table: 'orders_flat',
  columns: [{ name, pk?, target: '<targetId>', why: 'HTML', wrongHint?, help? }],
  targets: [{ id, label, hint }],
  checks:  [{ ok: placement => bool, broken: 'HTML', fixed: 'HTML' }],
  insight: 'HTML',
}

/* 📊 INDEXLAB — index banao, EXPLAIN live badle */
{
  type: 'indexlab',
  table: { name, rows, pk, columns: [{ name, distinct }] },
  query: { sql, where: [{ col, op: 'eq'|'range' }], orderBy?, select?, limit? },
  goal:  { text, rowsUnder, check: (plan, idxCols) => bool },
  insight: 'HTML',
}

/* 🎬 FLOW — ek-ek kadam, play/pause, beech mein sawaal */
{
  type: 'flow',
  lanes: [{ id, label }],
  state: n => [{ k, v }],             // optional — upar live counters
  steps: [{ lane, t, note, bad?, good?,
            ask?: { q, choices, answer, explain } }],
  insight: 'HTML',
}
```

**Indexlab ka cost model `labs.js` mein hai** (`planFor`), content mein nahi —
taaki har stage ek hi sach par chale. Woh asli B-tree ke niyam follow karta hai:
left-most prefix, range ke baad index rukna, covering detection, aur
`ORDER BY` tabhi muft jab woh index ke kram mein aage ho.

**Validator inhe sach mein chalata hai:**

| Check | Kya pakadta hai |
|---|---|
| Slider **solvability sweep** | har knob combination try karke — goal kabhi poora hota bhi hai? |
| Slider **start check** | goal shuruaati position par hi poora toh nahi? |
| Indexlab **permutation sweep** | koi index goal poora karta hai? bina index ke toh nahi? |
| Splitter **walk-through** | har column sahi target par daal ke dekhta hai ki lab poora hota hai |
| Splitter **checks** | sahi placement par har check green hona chahiye |
| Flow **step-through** | poora flow step karke dekhta hai ki woh khatam hota hai |
| Flow **ask** | aakhri step par `ask` = softlock; har `answer` index range mein |
| **Render** | sabko mini-DOM par render karke `undefined`/`NaN` dhoondta hai |

---

**Field-name traps (engine inhi naamo ko padhta hai):**

| Field | Sahi shape | Galat |
|-------|-----------|-------|
| `lesson` | `['<h3>..</h3>', ...]` HTML strings | `[{ h, b }]` |
| `cards` | `[{ front, back }]` | `[{ t, b }]` |
| `objectives` / `success` | array of HTML strings | objects |
| `homework` | ek HTML string | array |

War story ke liye `<div class="war-story">` — `callout:` naam ka field nahi hai.

**Do aur trap jo mission likhte waqt kaatti hain:**

1. **`success()` ko `tasks` se sync rakho.** Agar `success()` tasks se *kam*
   check kare toh `sim.done` jaldi lag jaata hai aur baaki hints **chalti hi
   nahi** — player ko adhoora checklist dikhta hai. Isliye tasks ek `const`
   mein rakho aur `success` unhi se banao:

   ```js
   const allOf = tasks => s => tasks.every(t => t.check(s));
   const T_MY = [ { text, check }, ... ];
   // stage mein:
   tasks: T_MY,
   success: allOf(T_MY),
   ```

2. **Composite index `indexes` mein nahi milta.** `sqlcli` ke `table.indexes`
   mein sirf index ka **pehla column** hota hai. Poori definition
   `table.indexDefs` mein hai (`[{ name, cols }]`) — composite check hamesha
   wahin karo:

   ```js
   check: s => (s.db.tables.X.indexDefs || [])
     .some(d => d.cols.length >= 2 && /colA/i.test(d.cols[0]))
   ```

### Step 3 — Verify (browser kholne se pehle)

```bash
cd sqlgurukul
node --check data-beginner.js

# Cross-file redeclaration bhi pakdo:
cat core.js data-core.js visuals.js games.js sqlcli.js \
    data-beginner.js data-intermediate.js data-advanced.js app.js > /tmp/c.js
node --check /tmp/c.js
```

---

## 2. Game Types

Har game `SG.renderers[type]` se render hota hai. Sab stages par `title` hota hai;
`instructions` optional hai.

### `quiz` — MCQ
```js
{ type: 'quiz', title: '...', questions: [
  { q: 'Sawal?', choices: ['A','B','C','D'], answer: 2, explain: 'Kyun C sahi hai',
    context: 'optional pre-formatted text (SQL output)' },
]}
```
- `answer` **0-indexed**. `context` `<pre>` block ban ke choices ke upar aata hai.

### `bins` — categories mein sort karo
```js
{ type: 'bins', title: '...', instructions: '...',
  bins:  [ { id: 'where', label: '🎯 WHERE' }, { id: 'having', label: '📊 HAVING' } ],
  items: [ { text: 'Rows chhaan-na', bin: 'where', explain: 'Kyun...' } ],
}
```
- Har item ka `bin` kisi bin ke `id` se match kare; har bin mein ≥1 item ho.
- `explain` **har item par zaroori** — sahi drop par wahi feedback banta hai.

### `order` — sahi sequence
```js
{ type: 'order', title: '...', steps: [
  { text: 'FROM — table utha', explain: 'Sabse pehle source.' },
  { text: 'WHERE — rows chhaan', explain: '...' },
]}
```
- Field `steps` hai (`items` nahi). Array ka order hi sahi jawab hai.

### `match` — jodi milao
```js
{ type: 'match', title: '...', pairs: [
  { left: '📨 SQS', right: 'Buffer + retry', explain: 'Kyun yeh jodi bani' },
]}
```
- `explain` chhoda toh feedback mein `undefined` chhapega.
- Do pairs ka `right` bilkul same text mat rakho (ambiguous).

### `fill` — SQL blanks mein tokens drag karo
```js
{ type: 'fill', title: '...', instructions: '...',
  template: `SELECT buildNum FROM bx50Builds
{0} active = 1
{1} duration {2};`,
  tokens: ['WHERE', 'ORDER BY', 'DESC', 'HAVING', 'ASC'],   // distractors zaroor
  blanks: [
    { answer: 'WHERE',    explain: 'Kyun...' },
    { answer: 'ORDER BY', explain: 'Kyun...' },
    { answer: 'DESC',     explain: 'Kyun...' },
  ],
}
```
- `{0}`, `{1}` ka number = `blanks[]` ka **index**.
- Har `blanks[i].answer` `tokens[]` mein hona chahiye.
- Ek index template mein **kai baar** likh sakte ho — sab slots ek saath bharte hain.
- `tokens` mein duplicate strings mat rakho.
- Template ek JS template literal hai: `${...}` ko `\${...}` likhna padega.

### `hotspot` — diagram par click
```js
{ type: 'hotspot', title: '...', visual: 'mynewlevel', questions: [
  { q: 'Rows kaun chhaan-ta hai?', target: 'where', explain: 'WHERE — ...' },
]}
```
- `visual` = VISUALS key. `target` = us visual ke `data-hs` ki value.
- ⚠️ `target` visual mein **exist karna chahiye**, warna sawal unanswerable hai.

### `incident` — 3AM decision tree
```js
{ type: 'incident', title: '...', instructions: '...',
  pager: '<b>#alerts</b> — 3:07 AM<br>Kya hua...',    // HTML
  start: 'first',                                     // top-level, koi `tree` wrapper NAHI
  nodes: {
    first: {
      sitrep: 'Optional situation HTML',
      text: 'Pehla kadam?',
      choices: [
        { t: 'Sahi kadam', good: true, next: 'second', explain: 'Kyun sahi' },
        { t: 'Galat kadam', good: false, explain: 'Kyun galat' },
      ],
    },
    second: { end: true, text: 'Incident band 🧯', summary: 'Kya seekha (HTML)' },
  },
}
```
- Choice ka text field **`t`** hai (`text` nahi). Sahi = `good: true` + `next`.
- Har non-end node par ≥1 `good: true` choice ho, aur har `good` ka `next` exist kare.
- Kam se kam ek `{ end: true, text, summary }` node reachable ho.

### `terminal` — MySQL mission
```js
{ type: 'terminal', title: '🖥️ Mission: ...', instructions: '...',
  goal: 'Mission ka HTML — kya karna hai.',    // goal ZAROORI (warna "undefined" chhapega)
  db: SG.factoryDB(),                          // fresh deep clone
  // ya tweak karke:
  // db: SG.factoryDB(db => { db.tables.bx50Data.rows.push({...}); }),
  tasks: [                                     // { text, check } objects — strings NAHI
    { text: 'SHOW TABLES chalao',
      check: s => s.history.some(h => /^show\s+tables$/i.test(h)) },
    { text: 'Naya operator add karo',
      check: s => s.db.tables.operators.rows.some(r => r.opId === 'OP-106') },
  ],
  success: s => /* ... */ true,
  successText: '🎉 Kya seekha — HTML.',
  hints: ['pehla hint', 'doosra hint'],        // har hint −5 XP
  responses: [ /* optional, neeche §4 */ ],
}
```

**`sim` object jo `check()` aur `success()` ko milta hai:**

| Field | Kya |
|-------|-----|
| `s.db` | live database (`s.db.tables.X.rows`, `.columns`, `.indexes`; `s.db.views`) |
| `s.history` | typed statements (whitespace-normalized, trailing `;` hata hua) |
| `s.lastResult` | aakhri SELECT ka `{ cols, rows }` |
| `s.lastError` | aakhri error message (ya `null`) |
| `s.committed` / `s.rolledBack` | `true` jab user ne COMMIT / ROLLBACK kiya |
| `s.hintsUsed` | kitne hints liye |

💡 **Behtar mission `s.db` ki state check karta hai, sirf `s.history` nahi** —
"user ne yeh type kiya" se "user ne yeh theek kiya" zyada sikhata hai. History check
tab use karo jab kaam read-only ho (SELECT/EXPLAIN).

---

## 3. Naya Track Add Karna

### Step 1 — data-core.js mein entry

`SG.tracks` ek **array** hai — order hi unlock order hai:

```js
SG.tracks = [
  { id: 'beginner', ... },
  {
    id: 'nosql',
    icon: '🍃',
    name: 'NoSQL — Document Path',
    blurb: 'Track card par dikhne wali ek line.',
    certTitle: 'DOCUMENT DARVESH',
    certSub: 'Certificate of NoSQL Foundations',
    motto: 'Schema-less ka matlab think-less nahi hota.',
    formula: 'Collection ⊃ Documents ⊃ Fields',
  },
];
```

`levels` yahan **nahi** likhte — woh `SG.levelSets[trackId]` se lazily resolve hote
hain, jise `SG.registerLevels()` bharta hai. Track tabhi unlock hota hai jab pichhla
track 100% complete ho (`SG.trackUnlocked`).

### Step 2 — `data-nosql.js` banao, `SG.registerLevels('nosql', [...])` call karo.
### Step 3 — index.html mein `<script src="data-nosql.js"></script>` **app.js se pehle**.
### Step 4 — Har naye level ke liye `VISUALS` entry.

---

## 4. SQL Simulator Extend Karna (sqlcli.js)

### Option A — mission-level scripted response (engine chhue bina)

Jo SQL engine support **nahi** karta, uske liye stage par `responses` do. Yeh
**parser se pehle** match hote hain:

```js
responses: [
  {
    re: /row_number\s*\(\s*\)\s*over\s*\(\s*partition\s+by\s+client/i,
    out: `+----+---------+----+
| id | client  | rn |
+----+---------+----+
...`,                          // string ya (sim, match) => string
    // err: true,              // red output ke liye
    // mutate: (sim, m) => { sim.db.tables.x.rows.push(...) },
  },
]
```

⚠️ Yeh **aakhri raasta** hai. Abhi poore app mein iska ek bhi use nahi hai —
window functions, CTEs, UNION, CASE, correlated EXISTS sab engine sach mein
chalata hai. Naya SQL feature chahiye toh pehle Option B try karo; scripted
output learner ko jhooti confidence deta hai (uski galat query bhi "sahi" output
de sakti hai).

Engine mein jo abhi nahi hai: recursive CTE (`WITH RECURSIVE`), `INTERSECT`/`EXCEPT`,
stored procedures/triggers, JSON functions, `GROUP_CONCAT`, window frame clauses
(`ROWS BETWEEN …` parse hota hai par ignore hota hai).

### Option B — engine mein sach mein add karo

`exec(norm)` ke dispatch `switch (first)` mein naya statement, ya `execSelect` mein
naya clause. Helpers jo andar available hain:

| Helper | Kya |
|--------|-----|
| `tokenize(sql)` | tokens: `word` `str` `num` `op` `arith` `star` `lparen` `rparen` `comma` |
| `cursor(toks)` | `.peek() .next() .kw('X') .isKw('X') .expectKw('X') .expect('type') .eof()` |
| `parseExpr(c)` | poora boolean expression (WHERE/HAVING) → `ctx => bool` |
| `parseArith(c)` | arithmetic/operand → `ctx => value` (CASE, functions, subqueries bhi) |
| `SCALAR_FNS` | `{ NAME: args => value }` — naya function add karne ki sabse aasan jagah |
| `parseAggCall(c)` | `FN(*/expr)` parse karke agg item deta hai (aggCollector mein jaata hai) |
| `grabParen(c)` | `(` ke andar ka balanced token slice |
| `asTable(name, res)` | query result ko table jaisa object (CTE/derived table) |
| `getTable(name)` | table ya view (case-insensitive), warna ERROR 1146 |
| `printResult(cols, rows)` | mysql-style ASCII table |
| `err('ERROR 1064 ...')` | SQL error phenko (red print ho jaata hai) |
| `sim.db` | live database — freely mutate |

Naya statement add karne ke baad **`help` wali list mein bhi line jodo**, warna
user ko pata hi nahi chalega.

⚠️ Errors hamesha `err()` se phenko (jo `e.sqlerr = true` lagata hai). Baaki koi
bhi exception "simulator error" ke roop mein dikhta hai — woh bug ka signal hai.

---

## 5. Diagram Primitives (style.css)

| Class | Kya |
|-------|-----|
| `.dg-flow` / `.dg-col` / `.dg-split` / `.dg-grid` / `.dg-stack` | layout containers |
| `.dg-box` | bordered container (`.is-good` `.is-gold` `.is-bad` `.is-accent` `.is-muted`) |
| `.bx-label` | `.dg-box` ke andar label |
| `.dg-node` | ek node — andar `<span class="ni">emoji</span><span class="nl">naam</span><span class="ns">subtitle</span>` |
| `.dg-pill` | chhota badge (`.good` `.bad` `.gold` `.acc`) |
| `.dg-arrow` / `.dg-down` | arrows (`.flow` `.bad` modifiers) |
| `.dg-link` | connector wrapper |
| `.dg-ladder` + `.dg-rung` | tiered ladder — andar `<span class="lv">`, `<span class="cmd">`, `<span class="q">` (`.a` `.g` color variants) |
| `.dg-cap` | neeche ka caption |
| `.dg-legend` + `.dg-dot` | legend row |
| `.pulse` / `.dg-float` | animations |
| `data-hs="id"` | node ko hotspot-clickable banata hai |

---

## 6. Content Style (kyun yeh app kaam karta hai)

- **Hinglish** — "kyun" hamesha explain karo, sirf "kya" nahi.
- **War story har level mein** — asli production incident, `<div class="war-story">` mein.
  Content ke saare incidents `KPMinWSL/aas-api` ke migrations aur model comments se aaye hain.
- **Bug pehle dikhao, phir fix** — best terminal missions learner se galti *karwate*
  hain (`WHERE ip = NULL` chalao, `Empty set` dekho, phir `IS NULL` seekho).
- **Interview round** har level par — ek hands-on terminal question zaroor.
- **4-5 flashcards** — Revision Dojo mein jaate hain, isliye self-contained likho.

---

## 7. Checklist (naya level bhejne se pehle)

- [ ] `VISUALS[id]` bana, aur har `hotspot` ka `target` uske `data-hs` se match karta hai
- [ ] `node --check` saari files par + combined file par pass
- [ ] Har `fill` ke saare `blanks[i].answer` `tokens[]` mein hain
- [ ] Har `terminal` mission mein `goal` hai, aur `success()` sach mein achievable hai
      (khud solution likh ke test karo)
- [ ] `success()` **order-independent** hai — user queries kisi bhi kram mein chala sakta hai,
      isliye `s.lastResult` par depend mat karo jab tak aakhri query hi na check karni ho
- [ ] Har `incident` node par ≥1 `good` choice, aur ek reachable `end` node
- [ ] Har `bins` item / `match` pair / `order` step par `explain` hai
- [ ] Browser mein poora level khel ke dekho — stages + interview + certificate

---

## 9. Content check karna — `node validate.js`

Browser kholne se **pehle** yeh chalao. Koi dependency nahi:

```bash
node validate.js                # sab kuch
node validate.js composite      # sirf ek level ke missions
```

Yeh do kaam karta hai:

**1. Structure** — har stage ka shape, quiz ka `answer` index range mein hai ya nahi,
`fill` ke `blanks[].answer` `tokens[]` mein hain ya nahi (warna stage **unsolvable**),
`hotspot` ke `target` diagram ke `data-hs` mein hain ya nahi (**softlock**), `incident`
ke toote hue `next` / dead-end nodes / koi reachable `end` node hai ya nahi, duplicate
level ids, missing `VISUALS[levelId]`, ranks ka order, aur `index.html` ke script tags.

**2. Missions — asli SQL engine par** — har terminal mission ke **hints** ko `sqlcli.js`
par sach mein chala ke dekhta hai ki uske saare `tasks` aur `success()` poore hote hain.
Yeh jhooth nahi bol sakta: hint ki query galat hui, ya `check()` ka regex history se
match nahi kiya, toh wahin pakda jaayega.

### ⚠️ Sabse aam bug: `success()` aur `tasks` ka out-of-sync hona

`sqlcli.js` ka `run()` aisa hai:

```js
function run(raw) {
  print('cmd', 'mysql> ' + raw);
  if (sim.done) return;          // ← success() ke baad kuch RECORD hi nahi hota
  sim.history.push(norm);
  ...
}
```

Matlab jaise hi `success()` `true` hota hai, mission **band** ho jaata hai — uske baad
type ki gayi queries `history` mein jaati hi nahi. Toh agar `success()` mein sirf
pehle 3 tasks ki shart hai aur mission mein 4 tasks hain, toh **chautha task kabhi
tick nahi hoga** — user ko "Mission complete 🎉" ke saath ek adhoora checklist dikhega.

> **Niyam:** `success()` mein **saare** tasks ki shart honi chahiye.
> `validate.js` isse apne aap pakad leta hai.

### ⚠️ Doosra aam bug: naya level boss ke PEECHE chala jaana

`SG.registerLevels()` hamesha **append** karta hai. Toh agar tum ek maujooda track mein
naya level jodoge, woh us track ke **boss ke baad** chala jaayega — aur user ko
certificate boss se pehle mil jaayega.

```js
// ❌ boss2 ke baad chala jaayega
SG.registerLevels('intermediate', [ myLevel ]);

// ✅ indexes ke theek baad, boss aakhir mein hi rahega
SG.registerLevelsAfter('intermediate', 'indexes', [ myLevel ]);
```

`validate.js` isse bhi apne aap pakad leta hai ("boss level aakhir mein nahi hai").

### Hints ka convention

Hint ka command hamesha **tail** par ho, taaki user usse seedha copy-paste kar sake:

```js
hints: [
  'SELECT * FROM operators;',                              // ✅ saaf
  "SELECT * FROM operators;   ← 5 rows aayengi",           // ✅ arrow ke baad note
  'OPTIMIZE (dobara chalao): EXPLAIN SELECT ...;',         // ✅ label pehle, command baad
  'BEGIN;  phir  UPDATE ...;  phir  COMMIT;',              // ✅ multi-statement
  'operators table ko ls se dekho',                        // ❌ command beech mein — toot jaayega
]
```

Mission apne custom (non-SQL) commands bhi de sakti hai `responses` se — jaise
`locking` level ka `session-b lock 2`. `validate.js` un commands ko bhi pehchaan
leta hai, kyunki woh stage ke `responses` regexes dekhta hai.

### Composite index (sqlcli.js)

Engine ab multi-column index samajhta hai aur **left-most prefix rule** lagata hai:

```sql
CREATE INDEX ix ON bx50Sessions(userId, buildNum);

EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';                    -- ref, 1/2
EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101' AND buildNum = 1;   -- ref, 2/2
EXPLAIN SELECT * FROM bx50Sessions WHERE buildNum = 1;                         -- ALL 🐌
```

- Poori definition `table.indexDefs = [{ name, cols: [...] }]` mein jaati hai.
- Legacy `table.indexes` (sirf column naam, single-col) **waise hi** rehta hai —
  purane missions ke `check()` usi par tike hain. Composite index ka sirf
  **leading column** usme jaata hai (jo prefix rule ke hisaab se bilkul sahi hai).
- Naye missions ko composite check karna ho toh `indexDefs` use karo.

## 🔬 Database Internals track — naye patterns

### `SG.extendLevel` — purana level badhao, naya mat banao
Naya video kisi **pehle se maujood** topic par ho (isolation, locks, partitioning, sharding), toh naya level banane ki jagah
purane level ke aakhir mein jodo:

```js
SG.extendLevel('locks', {
  objectives: ['...'], lesson: ['<h3>…</h3>'], stages: [ { type: 'docker', … } ],
  cards: [ { front, back } ], interview: [ { q, choices, answer, explain } ], homework: '<p>…</p>',
});
```
Level na mile toh **error** throw hota hai (file order galat = turant pata chale). Extend karne wali file
us level ki file ke **baad** load honi chahiye.

### Nayi data files IIFE mein
`data-scale.js` jaisi purani files top-level par `const allOf`, `T_POOL` … declare karti hain. Nayi file mein wahi naam
= `SyntaxError: Identifier has already been declared` = poora app band. Isliye `data-int-*.js` poori `(function () { … })();`
ke andar hain, aur apne diagrams wahin jodti hain: `VISUALS['db-wal'] = { t, html };`.

### 🐳 `docker` stage
```js
{
  type: 'docker', title,
  project: '01-wal',                 // docker-labs/<project> — folder hona chahiye
  exercise: 'ex2-commit-cost',       // project ke README mein yeh naam hona chahiye (validator check karta hai)
  goal: 'HTML', why?: 'HTML',
  steps: [{ text, cmd?, expect? }],  // expect = README wala ASLI output (andaaza nahi)
  observe: { q, choices, answer, explain },   // output dekh ke ek sawaal
  lesson?: 'HTML',
}
```
Validator saare steps tick karke `observe` ka sahi option dabata hai aur check karta hai ki stage poora hota hai.

### Naya docker lab banana
1. `docker-labs/NN-naam/` — `docker-compose.yml` (postgres:16 trust + mysql:8.0 empty root, `lab` DB, ports 55432/33306),
   `run.sh` (01 se copy — `NO_DOCKER=1` par local clients), `sql/exN-….pg.sql` + `.my.sql` ya `scripts/*.sh`
   (do connections ek saath chahiye toh bash script, helpers `scripts/lib.sh` mein: `pgq`, `myq`, `myin`).
2. **Pehle chalao, phir likho** — README aur stage ke `expect` mein wahi numbers jo run mein aaye.
3. Jaan-boojh ke error dikhana ho toh theek — `run.sh` MySQL ko `--force` ke saath chalata hai, psql error par rukta nahi.
4. PgBouncer chahiye (labs 09/10): compose mein `edoburu/pgbouncer` + lab ka apna `pgbouncer/pgbouncer.ini` mount. Yaad rakho —
   bouncer ke pooled connections bhi `max_connections` mein ginte hain (lab 09 mein 90 + 20 > 100 = `FATAL`).
5. Laptop par benchmark numbers bahut hilte hain (lab 09: wahi test 8k aur 121k tps). README mein **ek hi run** ka output rakho aur
   tulna usi run ke andar karo.
