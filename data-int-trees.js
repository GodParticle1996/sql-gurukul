/* =====================================================================
   TRACK 5 — 🔬 Database Internals · "Intermediate System Design" ka DB wala hissa — file 2/3
   NAYA level db-trees — Notion (har cheez ek block, block ke andar block): tree ko table mein kaise rakhein.
   Topic app mein pehle nahi tha (cte level mein sirf WITH RECURSIVE ka syntax hai) → naya level,
   db-ordering-views ke baad (dono "product ka data kaise rakhein" wale sawaal).
   Numbers: docker-labs/07-trees — 200,000 blocks, Postgres 16.2 + MySQL 8.0.46, asli run.
   System Gurukul ki Notion story (data-st-14-notion.js) isi level ka naam leti hai.
   ===================================================================== */
(function () {

/* Slider model — lab 07 ke Postgres numbers (page 5 ka subtree = 21,845 blocks) */
const TREE = ['parent_id (adjacency)', 'materialized path', 'closure table'];
const MOVE_ROWS = [1, 21845, 43690];     // ek page move: kitni rows likhni padin (closure: 21,845 hatao + 21,845 jodo)
const EXPORT_PAGES = [71007, 358, 88];   // poora subtree padhna: kitne 8 kB pages
const TREE_MB = [20, 30, 153];           // 2 lakh blocks, indexes samet
const treeW = v => v.moves * MOVE_ROWS[v.model];
const treeR = v => v.exports * EXPORT_PAGES[v.model];
const inr = x => Math.round(x).toLocaleString('en-IN');

VISUALS['db-trees'] = {
  t: 'Tree ko table mein — teen tareeke',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good" data-hs="adj"><span class="bx-label">🔗 Adjacency list</span>
        <div class="dg-cap"><code>parent_id</code> — har block sirf apna parent jaanta hai<br>move = <b>1 row</b> · poora subtree = recursive CTE</div></div>
      <div class="dg-box is-accent" data-hs="path"><span class="bx-label">🛤️ Materialized path</span>
        <div class="dg-cap"><code>'1/5/21/87'</code> — poora raasta ek column mein<br>subtree = <code>LIKE '1/5/%'</code> · move = subtree ki har row</div></div>
      <div class="dg-box is-gold" data-hs="closure"><span class="bx-label">🧮 Closure table</span>
        <div class="dg-cap">har (ancestor, descendant) jodi ek row<br>subtree = ek index range · jagah 8.5× · move = 2 × subtree</div></div>
    </div>
    <div class="dg-legend"><span class="dg-pill bad" data-hs="cycle">🔁 Jaal</span>
      <span>page ko uske hi bachche ke andar daal diya → <code>parent_id</code> ka chakra → upar ki walk kabhi khatam nahi</span></div>`,
};

SG.registerLevelsAfter('internals', 'db-ordering-views', [
{
  id: 'db-trees',
  icon: '🌳',
  title: 'Page Ke Andar Page — Tree Ko Table Mein Kaise Rakhein',
  badge: 'Vriksh Vaidya',
  objectives: [
    '<b>Teen tareeke:</b> <code>parent_id</code> (adjacency), materialized path, closure table — har tareeka kya sasta karta hai, kya mehenga',
    '<b>Recursive CTE</b> se upar ki walk (permission check) aur neeche ka poora subtree — Postgres aur MySQL 8 dono par',
    'Workload se model chuno: drag-and-drop har minute (Notion) vs "saare descendants" har page par (category tree, org chart)',
    '<b>Chakra ka jaal:</b> page ko uske hi bachche mein daal diya — kaise pakdo, kaise roko',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>DocSpace</b> (Notion jaisa editor). Har cheez ek <b>block</b> hai — page, heading, toggle, todo. Page ke andar page, toggle ke
     andar toggle. 2 lakh blocks, gehraai ~9. DocSpace ke teen roz ke sawaal:</p>
     <ol>
       <li><b>Permission check (upar ki taraf):</b> block 90000 dikhane se pehle block 90000 ke upar ke saare pages chahiye. Kisi ek page par
         share hai toh block 90000 dikhao.</li>
       <li><b>Export / copy (neeche ki taraf):</b> page 5 aur page 5 ke andar ka sab kuch — 21,845 blocks.</li>
       <li><b>Drag-and-drop (move):</b> page 5 ko page 5 ke saare bachchon ke saath doosre workspace mein.</li>
     </ol>
     <h3>👨‍👩‍👧 Misaal: khandaan ki vanshavali</h3>
     <table>
       <tr><th>Tareeka</th><th>Vanshavali mein</th><th>Table mein (block 90000)</th></tr>
       <tr><td><b>1. Adjacency list</b></td><td>har insaan sirf apne pitaji ka naam yaad rakhe</td><td><code>parent_id = 22500</code></td></tr>
       <tr><td><b>2. Materialized path</b></td><td>har insaan apna poora vansh likhe: "Dada / Pitaji / Main"</td><td><code>path = '1/5/21/87/351/1406/5625/22500/90000'</code></td></tr>
       <tr><td><b>3. Closure table</b></td><td>ek register: har (purvaj, vanshaj) jodi ki ek line</td><td>9 rows: (1, 90000), (5, 90000) … (22500, 90000)</td></tr>
     </table>
     <p>Adjacency mein upar ya neeche chalne ke liye <b>recursive CTE</b> chahiye — Postgres mein 8.4 se, MySQL mein 8.0 se:</p>
     <pre>WITH RECURSIVE up AS (
  SELECT id, parent_id FROM blocks WHERE id = 90000
  UNION ALL
  SELECT b.id, b.parent_id FROM blocks b JOIN up ON b.id = up.parent_id
)
SELECT id FROM up;          -- 9 rows: 90000 → 22500 → … → 1</pre>`,

    `<h3>📏 Asli naap — lab 07 (Postgres)</h3>
     <table>
       <tr><th></th><th>parent_id</th><th>path</th><th>closure</th></tr>
       <tr><td>Jagah (2 lakh blocks)</td><td>20 MB</td><td>30 MB</td><td>153 MB (17 lakh rows)</td></tr>
       <tr><td>Upar ki walk (9 ancestors)</td><td>36 pages</td><td>4 pages</td><td>12 pages</td></tr>
       <tr><td>Poora subtree (21,845 blocks)</td><td><b>71,007 pages</b></td><td>358 pages</td><td>88 pages</td></tr>
       <tr><td>Page move</td><td><b>1 row</b></td><td>21,845 rows</td><td>21,845 hatao + 21,845 jodo</td></tr>
     </table>
     <ol>
       <li><b>Upar chalna</b> teeno tareekon mein sasta — gehraai sirf ~9.</li>
       <li><b>Neeche chalna</b> parent_id mein mehenga — recursive CTE har level par har block ke bachche dhoondhti hai.</li>
       <li><b>Move</b> parent_id mein ek row; path aur closure mein poora subtree dobara likhna padta hai.</li>
     </ol>
     <p>Notion har block mein <b>parent ka pointer</b> (aur bachchon ki ordered list) rakhta hai — yaani adjacency. Drag-and-drop har minute
     hota hai, aur permission ke liye upar ki chhoti walk. Poore page ka export kabhi-kabhi hota hai — export background job mein chalta hai.</p>
     <h3>🔁 Jaal: page ko uske hi bachche mein daal diya</h3>
     <p><code>parent_id</code> par koi constraint chakra nahi rokta. Page 5 ko page 21 (jo page 5 ke andar hai) mein daala → page 5 ka parent
     page 21, page 21 ka parent page 5. Upar ki walk kabhi workspace tak nahi pahunchti — Postgres mein bina guard wali recursive query
     <b>kabhi khatam nahi</b> hoti, MySQL 1,001 chakkar par rok deta hai (<code>ERROR 3636</code>).</p>
     <p class="tip">🎯 <b>Asli baat:</b> move se <b>pehle</b> poochho "naya parent mere hi subtree mein toh nahi?" — closure mein ek lookup,
     path mein ek <code>LIKE</code>, parent_id mein naye parent se upar ki walk. Aur tree ka model <b>workload</b> tay karta hai, fashion nahi.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: workload ke hisaab se tree ka model',
      instructions: 'Model aur workload badlo. Har minute kitni rows likhi jaati hain aur kitne pages padhe jaate hain, dekho.',
      scenario: `DocSpace (Notion jaisa): 2 lakh blocks. Ek page move = page 5 jaisa bada page (21,845 blocks). Ek export = usi page ka poora
        subtree. Numbers lab 07 ke asli Postgres run se. Budget: likhna <b>≤ 10,000 rows/minute</b>, padhna <b>≤ 5,00,000 pages/minute</b>.`,
      knobs: [
        { id: 'model', label: 'Tree ka model (0 = parent_id · 1 = path · 2 = closure)', min: 0, max: 2, step: 1, value: 1 },
        { id: 'moves', label: 'Page move (drag-and-drop) har minute', min: 0, max: 1200, step: 100, value: 600 },
        { id: 'exports', label: 'Poore page ka export / copy har minute', min: 0, max: 20, step: 1, value: 5 },
      ],
      readouts: [
        { id: 'w', label: 'Rows likhi / minute', fn: treeW, good: x => x <= 10000, format: inr,
          sub: (x, v) => `ek move = ${inr(MOVE_ROWS[v.model])} ${MOVE_ROWS[v.model] === 1 ? 'row' : 'rows'}` },
        { id: 'r', label: '8 kB pages padhe / minute', fn: treeR, good: x => x <= 500000, format: inr,
          sub: (x, v) => `ek export = ${inr(EXPORT_PAGES[v.model])} pages` },
        { id: 'mb', label: 'Jagah (2 lakh blocks)', unit: 'MB', fn: v => TREE_MB[v.model], good: x => x <= 100 },
      ],
      bar: (v, r) => ({
        pct: Math.max(r.w / 10000, r.r / 500000) * 50,
        bad: r.w > 10000 || r.r > 500000,
        label: `${TREE[v.model]} · ${inr(r.w)} rows + ${inr(r.r)} pages / minute`,
      }),
      verdict: (v, r) => {
        const name = TREE[v.model];
        if (r.w > 10000) return { tone: 'bad', text: `🔥 <b>${name}</b>: har move par ${inr(MOVE_ROWS[v.model])} rows dobara likhni padti hain → <b>${inr(r.w)} rows/minute</b>. Drag-and-drop wale app mein database sirf rewrite karta rahega.` };
        if (r.r > 500000) return { tone: 'bad', text: `🔥 <b>${name}</b>: har export ${inr(EXPORT_PAGES[v.model])} pages padhta hai (recursive CTE har level par bachche dhoondhti hai) → <b>${inr(r.r)} pages/minute</b>.` };
        if (v.moves < 600 || v.exports < 5) return { tone: 'warn', text: `⚠️ Is halke workload par <b>${name}</b> chal jaata hai — par DocSpace ka asli workload hai ≥ 600 moves aur ≥ 5 exports har minute. Knobs wapas badhao.` };
        return { tone: 'good', text: `✅ <b>${name}</b>: move = ${inr(MOVE_ROWS[v.model])} row, export = ${inr(EXPORT_PAGES[v.model])} pages — dono budget ke andar.` };
      },
      goal: {
        text: 'DocSpace ka workload — <b>≥ 600 moves</b> aur <b>≥ 5 exports</b> har minute — budget ke andar chalao: likhna <b>≤ 10,000 rows/min</b>, padhna <b>≤ 5,00,000 pages/min</b>.',
        check: (v, r) => v.moves >= 600 && v.exports >= 5 && r.w <= 10000 && r.r <= 500000,
      },
      insight: `Tree ka model <b>workload</b> tay karta hai. DocSpace / Notion: move har minute, export kabhi-kabhi → <b>parent_id</b>.
        Ulta workload (category tree, org chart: move saal mein do baar, "saare descendants" har page par) → <b>closure</b> ya <b>path</b>.
        Knobs ulta ghuma ke dekho: moves 0, exports 20 → closure sabse sasta.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: page ko uske hi bachche ke andar daal diya',
      instructions: 'Ek-ek kadam. parent_id aur upar ki walk dekho.',
      scenario: 'Workspace 1 → page 5 → page 21 → … (page 21 page 5 ke andar hai). User page 5 ko uthake page 21 mein drop karta hai.',
      lanes: [
        { id: 'user', label: '🖱️ User' },
        { id: 'db', label: '🗄️ blocks.parent_id' },
        { id: 'walk', label: '🔎 Permission check (upar ki walk)' },
      ],
      state: n => [
        { k: 'page 5 ka parent', v: n >= 2 && n < 5 ? '21 ❌ (chakra)' : '1 (workspace)' },
        { k: 'page 21 ka parent', v: '5' },
      ],
      steps: [
        { lane: 'user', t: 'Page 5 ko page 21 ke andar drop', note: 'Page 21 khud page 5 ke andar hai — user ko yeh baat pata nahi.' },
        { lane: 'db', t: 'UPDATE blocks SET parent_id = 21 WHERE id = 5 → 1 row', note: 'Database ne chupchaap maan liya. parent_id par koi constraint chakra nahi rokta.', bad: true },
        { lane: 'walk', t: 'Page 21 ke ancestors: 21 → 5 → 21 → 5 → …', note: 'Page 21 ka parent page 5, page 5 ka parent page 21. Upar ki walk kabhi workspace tak nahi pahunchti.', bad: true,
          ask: {
            q: 'Postgres mein bina guard wali recursive CTE (WITH RECURSIVE) is data par kab rukegi?',
            choices: [
              'Kabhi nahi — chakra hamesha ghoomta rahega (MySQL 1,001 chakkar par ERROR 3636 deta hai)',
              'Pehle chakkar ke baad',
              'Postgres khud chakra pakad ke rok deta hai',
              '100 rows ke baad',
            ],
            answer: 0,
            explain: 'Postgres recursive CTE ko khud nahi rokta. MySQL ka <code>cte_max_recursion_depth</code> (default 1000) query ko 1,001 chakkar par ERROR 3636 se rokta hai — par data dono engines mein toota hua hai.',
          } },
        { lane: 'walk', t: 'CYCLE id SET chakkar USING raasta → 3 rows ke baad ruki', note: 'Postgres 14+ ka CYCLE clause (MySQL mein "dekhe hue ids" ki list) query ko bachata hai. Data abhi bhi toota hua hai.', good: true },
        { lane: 'db', t: 'Data theek (page 5 ka parent wapas 1) + aage se move se PEHLE check', note: 'Check: naya parent (21) page 5 ke subtree mein hai? Closure: ek lookup. Path: page 21 ka path "1/5/" se shuru? parent_id: page 21 se upar walk, raaste mein page 5 mila → move mana.', good: true,
          ask: {
            q: 'Sirf parent_id wale model mein yeh check kitna mehenga hai?',
            choices: [
              'Naye parent (21) se upar ki walk — gehraai jitne lookups (lab: ~9, 36 pages)',
              'Page 5 ka poora subtree padhna (21,845 blocks)',
              'Poori table scan',
              'Namumkin',
            ],
            answer: 0,
            explain: 'Upar ki walk sasti hai — permission check jaisi. Mehenga hota neeche ka subtree padhna, aur check ko subtree ki zaroorat hi nahi.',
          } },
        { lane: 'user', t: '"Page ko uske apne andar nahi rakh sakte" — move mana', note: 'Data kabhi toota hi nahi. Do log ek saath ulta move karein (X ko Y mein, Y ko X mein) toh dono ke check pass ho sakte hain — isliye move ke waqt workspace par lock (db-advisory level) ya SERIALIZABLE.', good: true },
      ],
      insight: `parent_id ka sabse bada jaal: database <b>chakra nahi rokta</b>. Move se pehle "naya parent mere subtree mein toh nahi?"
        check karo — aur check + UPDATE ko ek saath chalne wale doosre move se bachao (workspace ka lock).`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: 2 lakh blocks, teen model',
      project: '07-trees',
      exercise: 'ex1-trees',
      goal: '200,000 blocks teen tareekon se rakho. Upar ki walk, poora subtree aur page move dono engines par naapo — phir chakra banao.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/07-trees\ndocker compose up -d' },
        { text: 'Postgres.', cmd: './run.sh pg sql/ex1-trees.pg.sql',
          expect: [
            '=== 1. Teen tareeke — kitni rows, kitni jagah ===',
            ' adjacency (parent_id) |  200000 | 20 MB',
            ' materialized path     |  200000 | 30 MB',
            ' closure table         | 1712628 | 153 MB',
            '',
            '=== 2. Permission check: block 90000 dikhane se pehle uske saare ancestors (upar ki taraf chalo) ===',
            '          tareeka          | rows_mile | pages_padhe |  ms',
            ' adjacency + recursive CTE |         9 |          36 | 0.05',
            ' materialized path (1 row) |         9 |           4 | 0.01',
            ' closure table             |         9 |          12 | 0.01',
            '',
            '=== 3. Page 5 aur uske andar sab kuch (neeche ki taraf — page export / delete / copy) ===',
            ' adjacency + recursive CTE |     21845 |       71007 | 20.74',
            ' materialized path LIKE    |     21845 |         358 |  2.38',
            ' closure table             |     21845 |          88 |  1.02',
            '',
            '=== 4. Drag-and-drop: page 5 (poore subtree ke saath) ko workspace 1 se workspace 3 mein le jao ===',
            ' adjacency: parent_id badlo   |          1 |   0.6',
            ' path: har descendant ka path |      21845 |  96.0',
            ' closure: purane rishte hatao |      21845 | 220.5',
            ' closure: naye rishte jodo    |      21845 | 784.5',
            '',
            '=== 5. Jaal: page 5 ko uske hi bachche (page 21) ke andar daal do ===',
            ' id | parent_id | chakkar',
            ' 21 |         5 | f',
            '  5 |        21 | f',
            ' 21 |         5 | t',
            ' closure: 21 page 5 ke andar hai? | path: 21 page 5 ke andar hai?',
            ' t                                | t',
          ].join('\n') },
        { text: 'MySQL.', cmd: './run.sh my sql/ex1-trees.my.sql',
          expect: [
            '| adjacency (parent_id) |  200000 |    16.0 |',
            '| materialized path     |  200000 |    32.1 |',
            '| closure table         | 1712628 |   191.5 |',
            '| adjacency + recursive CTE |         9 |         28 |  0.2 |',
            '| materialized path (1 row) |         1 |          1 |  0.2 |',
            '| closure table             |         9 |         10 |  0.2 |',
            '| adjacency + recursive CTE |     21845 |      87381 | 27.5 |',
            '| materialized path LIKE    |     21845 |      21847 |  5.6 |',
            '| closure table             |     21845 |      21846 |  2.1 |',
            '| adjacency: parent_id badlo   |          1 |   5.8 |',
            '| path: har descendant ka path |      21845 | 708.9 |',
            '| closure: purane rishte hatao |      21845 | 895.2 |',
            '| closure: naye rishte jodo    |      21845 | 202.5 |',
            'ERROR 3636 (HY000) at line 97: Recursive query aborted after 1001 iterations. Try increasing @@cte_max_recursion_depth to a larger value.',
            '|   21 |         5 | 21   |',
            '|    5 |        21 | 21,5 |',
          ].join('\n') },
      ],
      observe: {
        q: 'Page 5 (21,845 blocks) ko doosre workspace mein le jaane par parent_id model ne 1 row likhi, path model ne 21,845. Kyun?',
        choices: [
          'Path model mein har block apna poora raasta rakhta hai — page 5 ke neeche ke har block ke raaste ka shuruaati hissa ("1/5" → "3/5") badla',
          'Path model mein index nahi tha',
          'parent_id model ne galti se kam rows likhi',
          'Postgres ka bug',
        ],
        answer: 0,
        explain: 'parent_id model mein sirf page 5 ka parent_id badla — page 5 ke bachche page 5 ko hi parent maante hain, bachchon ki rows ko kuch badalna nahi padta. Path model mein "1/5/…" har descendant ki row mein likha tha.',
      },
      lesson: 'Model chunne se pehle ginti karo: move kitni baar hota hai, subtree read kitni baar. Lab ke numbers se hisaab lagao.',
    },
    {
      type: 'bins',
      title: 'Kaunsa model?',
      instructions: 'Har feature ke liye tree ka sahi model chuno.',
      bins: [
        { id: 'adj', label: '🔗 parent_id (adjacency)' },
        { id: 'path', label: '🛤️ Materialized path' },
        { id: 'closure', label: '🧮 Closure table' },
      ],
      items: [
        { text: 'Notion jaisa editor — blocks har minute drag-and-drop, permission ke liye upar ki walk', bin: 'adj', explain: 'Move = 1 row. Upar ki walk sasti (gehraai ~9). Poore page ka export kabhi-kabhi, background job mein.' },
        { text: 'Google Drive jaise folders — log folders baar-baar ek jagah se doosri jagah le jaate hain', bin: 'adj', explain: 'Folder move = 1 row. Path ya closure mein folder ke andar ki har file ki row dobara likhni padti.' },
        { text: 'Comment thread (reply ka reply) — comment kabhi move nahi hota, poora thread kram mein dikhana hai', bin: 'path', explain: '<code>ORDER BY path</code> se poora thread ek range read mein, sahi kram mein. Comment move hota hi nahi, toh path dobara likhne ka kharcha nahi.' },
        { text: 'Har product page par breadcrumb: Home › Electronics › Phones', bin: 'path', explain: 'Poora raasta ek hi row ke ek column mein — koi walk nahi.' },
        { text: 'Org chart: "CEO ke neeche sabki salary ka total" roz ki report, reorg saal mein do baar', bin: 'closure', explain: 'Subtree read roz, move saal mein do baar. Closure mein subtree ek index range (lab: 88 pages vs recursive CTE 71,007).' },
        { text: 'Org chart: "mere neeche sirf 2 level tak ke log" — depth ke saath', bin: 'closure', explain: 'Closure table ki har row mein depth hota hai: <code>WHERE ancestor = ? AND depth &lt;= 2</code> — ek index range.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Tree ki samajh',
      questions: [
        { q: 'Page 5 ka poora subtree (21,845 blocks) padhne mein Postgres ne kitne 8 kB pages padhe — parent_id (recursive CTE) vs closure table?', choices: ['71,007 vs 88', '88 vs 71,007', 'Dono ~350', 'Dono 21,845'], answer: 0, explain: 'Recursive CTE har level par har block ke bachche index se dhoondhti hai. Closure table mein subtree ek hi index range hai.' },
        { q: 'Closure table ki keemat?', choices: ['2 lakh blocks ke liye 17 lakh rows (153 MB) — aur har move par subtree jitni rows hatao + jodo', 'Koi keemat nahi', 'Sirf CPU', 'Sirf MySQL mein chalti hai'], answer: 0, explain: 'Har block × block ki gehraai jitni rows. Lab 07: 1,712,628 rows — 153 MB (Postgres) / 191.5 MB (MySQL).' },
        { q: 'MySQL 5.7 par recursive CTE (WITH RECURSIVE)?', choices: ['Nahi — CTE (recursive bhi) MySQL 8.0 se aaye', 'Haan, hamesha se', 'Sirf InnoDB mein', 'Sirf stored procedure ke andar'], answer: 0, explain: 'MySQL 5.7 par tree ke liye stored procedure / app mein loop, ya path / closure model.' },
        { q: 'Materialized path par <code>LIKE \'1/5/%\'</code> ko Postgres mein index se chalane ke liye kya chahiye?', choices: ['<code>text_pattern_ops</code> wala index (ya "C" collation)', 'Kuch nahi — har B-tree chalega', 'GIN index', 'Hash index'], answer: 0, explain: 'Non-C collation mein normal B-tree LIKE prefix search nahi karta — lab 07 ne <code>text_pattern_ops</code> wala index banaya.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Tree in SQL',
    instructions: 'Product design + database round. 🎤',
    questions: [
      { q: 'Interviewer: "Notion jaisa editor banao. Blocks ka tree kaise store karoge?"',
        choices: [
          'parent_id + parent_id par index; permission ke liye recursive CTE se upar ki chhoti walk; bhaari export background job mein; move se pehle chakra check',
          'Poora document ek JSON column mein',
          'Closure table, kyunki reads tez hain',
          'Har page ki alag table',
        ],
        answer: 0, explain: 'Drag-and-drop har minute hota hai — move ka sasta hona sabse zaroori. Lab 07: parent_id move = 1 row, closure move = 43,690 rows.' },
      { q: 'Interviewer: "Category tree par \'saari sub-categories\' wali query har page load par chalti hai, categories mahine mein ek baar badalti hain. Kya karoge?"',
        choices: [
          'Closure table (ya materialized path) — reads har page par, writes kabhi-kabhi',
          'Har request par recursive CTE, koi cache nahi',
          'Categories code mein hardcode karo',
          'parent_id hi hamesha best hai',
        ],
        answer: 0, explain: 'Workload ulta hai: subtree read bahut, move bahut kam. Lab 07: closure subtree = 88 pages vs recursive CTE 71,007.' },
    ],
  },
  success: [
    'Main parent_id, materialized path aur closure table ka farak asli numbers ke saath samjha sakta hoon',
    'Main recursive CTE se ancestors aur poora subtree nikaal sakta hoon (Postgres aur MySQL 8)',
    'Main workload dekh ke tree ka model chun sakta hoon',
    'Main chakra wala jaal pakad aur rok sakta hoon',
  ],
  homework: `<p>Apne project mein koi tree dhoondo — comments, categories, folders, org chart. Model kaunsa hai? Move kitni baar hota hai,
    subtree read kitni baar? Lab 07 ke numbers se hisaab lagao.</p>
    <pre>-- parent_id wale tree par ek node ke saare ancestors
-- Postgres 14+: CYCLE clause chakra se bachata hai. MySQL 8: CYCLE nahi — "dekhe hue ids" ki list (lab 07 ki MySQL script).
WITH RECURSIVE up AS (
  SELECT id, parent_id, 1 AS depth FROM nodes WHERE id = 42
  UNION ALL
  SELECT n.id, n.parent_id, up.depth + 1 FROM nodes n JOIN up ON n.id = up.parent_id
) CYCLE id SET chakkar USING raasta
SELECT * FROM up;</pre>`,
  cards: [
    { front: 'Tree ke teen model ek line mein?', back: '<b>parent_id</b>: move sasta, subtree mehenga. <b>Path</b>: subtree ek LIKE, move = subtree rewrite. <b>Closure</b>: subtree ek range, jagah 8.5× + move = 2 × subtree.' },
    { front: 'Notion blocks ka model?', back: 'Har block mein parent ka pointer (+ bachchon ki list) — adjacency. Drag-and-drop har minute; permission ke liye upar ki chhoti walk.' },
    { front: 'parent_id tree ka sabse bada jaal?', back: 'Chakra: page ko uske hi bachche mein daal diya. Database nahi rokta. Move se pehle "naya parent mere subtree mein?" check.' },
    { front: 'Recursive CTE ko chakra se kaise bachao?', back: 'Postgres 14+: <code>CYCLE id SET chakkar USING raasta</code>. MySQL 8: "dekhe hue ids" ki list + <code>FIND_IN_SET</code>; <code>cte_max_recursion_depth</code> (1000) aakhri deewar.' },
  ],
},
]);

})();
