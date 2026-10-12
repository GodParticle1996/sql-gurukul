/* =====================================================================
   TRACK 5 — 🔬 Database Internals · file 3/6
   (a) scale/partitioning ko BADHAYA — pruning ke jaal + DELETE vs DROP asli numbers (lab 03 ex1)
   (b) naya level db-partition-key  — partition key ke 5 jaal (lab 03 ex2)
   (c) naya level db-partition-live — chalti 20 TB table ko partition karna (lab 03 ex3)
   Video: Jimmy Angelakos (EDB) — "PostgreSQL Partitioning in Production" (edQZauVU-ws)
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   (a) PARTITIONING — pruning kab hota hai, kab nahi
   --------------------------------------------------------------------- */
SG.extendLevel('partitioning', {
  objectives: [
    '<b>Asli numbers:</b> pruning ka faayda, aur woh do galtiyan jo pruning chupchaap band kar deti hain',
  ],
  lesson: [
    `<h3>🔬 Asli containers par (lab 03, ex1) — 2,000,000 readings, 12 mahine</h3>
     <pre>Postgres                         partitions  pages   ms
March avg        | flat table          1        1550   33.3
March avg        | partitioned         1        1082   23.7
date_trunc March | partitioned        12       12744  252.3   ❌
sensor_id = 42   | partitioned        12       12744   66.6   ❌

Retention: January hatao        ms     WAL      table size baad
flat: DELETE WHERE ts &lt; Feb    99   18 MB    142 MB (wahi!)
partitioned: DETACH + DROP       1   18 kB    131 MB

MySQL: DELETE 8090 ms · DROP PARTITION 288 ms</pre>
     <ol>
       <li><b>Pruning tabhi jab WHERE mein partition key SEEDHI ho.</b> <code>date_trunc('month', ts) = …</code>
         (Postgres) ya <code>MONTH(ts) = 3</code> (MySQL) likha — database ko pata hi nahi chalta ki March kaunsa
         partition hai. Saare 12 padhe. Sahi: <code>ts &gt;= '2025-03-01' AND ts &lt; '2025-04-01'</code>.</li>
       <li><b>Filter kisi aur column par</b> (<code>sensor_id</code>) — saare 12 partitions.</li>
       <li><b>Achhe index ke saath pruning ka faayda chhota hai</b> (1550 → 1082 pages). Asli faayda
         <b>maintenance</b> mein: DELETE ne 18 MB WAL banaya aur table ka size wahi raha; DROP ne file hi hata di.</li>
     </ol>
     <p>MySQL mein <code>EXPLAIN</code> ka <b>partitions</b> column seedha batata hai kaunse partitions padhe gaye.
     Postgres mein plan mein partition tables ke naam dikhte hain.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsi query sirf March padhegi?',
      instructions: '<code>readings</code> table mahine ke hisaab se partitioned hai (<code>ts</code> par RANGE). Har query ko sahi dabbe mein daalo.',
      bins: [
        { id: 'one', label: '🎯 Sirf 1 partition (pruning hua)' },
        { id: 'all', label: '😩 Saare 12 partitions' },
      ],
      items: [
        { text: "WHERE ts &gt;= '2025-03-01' AND ts &lt; '2025-04-01'", bin: 'one', explain: 'Partition key par seedhi range — planner boundaries se milaata hai.' },
        { text: "WHERE ts BETWEEN '2025-03-05' AND '2025-03-06'", bin: 'one', explain: 'Seedhi range, March ke andar — sirf March partition.' },
        { text: "WHERE date_trunc('month', ts) = '2025-03-01'", bin: 'all', explain: 'ts par function lag gaya — planner boundaries se milaa nahi sakta. Lab: 12 partitions, 252 ms.' },
        { text: 'WHERE MONTH(ts) = 3   (MySQL)', bin: 'all', explain: 'Wahi jaal MySQL mein. EXPLAIN partitions: p2025_01,…,p2025_12.' },
        { text: 'WHERE sensor_id = 42', bin: 'all', explain: 'Filter partition key par hai hi nahi. Har partition mein sensor 42 ho sakta hai.' },
        { text: "WHERE ts::date = '2025-03-03'", bin: 'all', explain: 'Cast bhi ek function hai. Likho: <code>ts &gt;= \'2025-03-03\' AND ts &lt; \'2025-03-04\'</code>.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: pruning aur retention',
      project: '03-partitioning',
      exercise: 'ex1-pruning',
      goal: 'Ek hi 2 million readings — flat table aur 12 monthly partitions. Pruning, pruning ke jaal, aur DELETE vs DROP khud naapo.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/03-partitioning\ndocker compose up -d' },
        { text: 'Postgres.', cmd: './run.sh pg sql/ex1-pruning.pg.sql',
          expect: '             sawaal             | partitions_padhe |      kaunse      | pages_padhe |  ms\n March avg        | flat        |                1 | readings_flat    |        1550 |  33.3\n March avg        | partitioned |                1 | readings_2025_03 |        1082 |  23.7\n date_trunc March | partitioned |               12 | sab 12           |       12744 | 252.3\n sensor_id = 42   | partitioned |               12 | sab 12           |       12744 |  66.6\n\n           tareeka           | ms | wal_bana | table_size_baad\n (pehle) flat table ka size  |    |          | 142 MB\n flat: DELETE WHERE ts < Feb | 99 | 18 MB    | 142 MB\n partitioned: DETACH + DROP  |  1 | 18 kB    | 131 MB' },
        { text: 'MySQL.', cmd: './run.sh my sql/ex1-pruning.my.sql',
          expect: '| sawaal                         | rows_padhi | ms   |\n| March avg        | flat        |    2000018 |  343 |\n| March avg        | partitioned |     169864 |   34 |\n| MONTH(ts) = 3    | partitioned |    2000012 |  390 |\n| sensor_id = 42   | partitioned |    2000012 |  253 |\n\n| tareeka                     | ms   | disk_par_file     |\n| (pehle) flat file           | NULL | 132 MB            |\n| flat: DELETE WHERE ts < Feb | 8090 | 132 MB            |\n| partitioned: DROP PARTITION |  288 | 208 MB (11 files) |' },
      ],
      observe: {
        q: 'Postgres mein DELETE ke baad flat table 142 MB hi kyun rahi?',
        choices: [
          'DELETE rows ko dead mark karta hai — jagah table ke andar reuse ke liye, file chhoti nahi hoti',
          'DELETE fail ho gaya',
          'Index ki wajah se',
          'WAL ki wajah se',
        ],
        answer: 0,
        explain: 'MVCC level wali baat: DELETE bhi purani copy chhodta hai, VACUUM jagah reuse ke liye khaali karta hai. DROP partition = file hi gayi, disk turant wapas.',
      },
      lesson: 'Retention (purana data hatana) partitioning ka sabse bada, sabse pakka faayda hai. Pruning bonus hai — aur sirf tab jab queries partition key seedhi likhein.',
    },
  ],
  cards: [
    { front: 'date_trunc(\'month\', ts) = … wali query partitioned table par dheemi kyun?', back: 'Partition key par <b>function</b> = pruning band, saare partitions padhe. Seedhi range likho: <code>ts &gt;= … AND ts &lt; …</code>.' },
  ],
});

/* ---------------------------------------------------------------------
   (b) db-partition-key — slider model
   1000 sensors → ~500M rows/saal ≈ 1.37M rows/din (video ka dimensioning example).
   Kanooni retention: 6 saal = 2190 din. Project ke beech locations 25 → 200 (8×).
   --------------------------------------------------------------------- */
const ROWS_PER_DAY = 1.37e6, KEEP_DAYS = 2190, GROWTH = 8;
const nParts = v => Math.ceil(KEEP_DAYS / v.days);
const rowsToday = v => Math.round(ROWS_PER_DAY * v.days);
const rowsLater = v => Math.round(ROWS_PER_DAY * GROWTH * v.days);
const fmtM = x => (x / 1e6).toFixed(1) + 'M';

VISUALS['db-partition-key'] = {
  t: 'Partition key — teen sawaal',
  html: `
    <div class="dg-flow">
      <div class="dg-node is-good" data-hs="filter"><span class="ni">🎯</span><span class="nl">Queries isi par filter karti hain?</span><span class="ns">warna pruning nahi</span></div>
      <div class="dg-node is-good" data-hs="many"><span class="ni">🔢</span><span class="nl">Bahut saari values?</span><span class="ns">status (3 values) = mota partition</span></div>
      <div class="dg-node is-good" data-hs="stable"><span class="ni">🪨</span><span class="nl">Kabhi badalti nahi?</span><span class="ns">badli = row doosri table mein</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ RANGE (date, location)</span>
        <div class="dg-cap">tuple compare — <b>pehla column</b> hi faisla karta hai. (20 Jan, loc 80) → "loc &lt; 50" wale partition mein</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Sub-partitioning</span>
        <div class="dg-cap">pehle RANGE (date), phir har mahine ke andar RANGE/LIST (location)</div></div>
    </div>`,
};

VISUALS['db-partition-live'] = {
  t: '20 TB chalti table — ek transaction, milliseconds',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">1. RENAME → daily_totals_legacy</span><span class="dg-arrow flow"></span>
      <span class="dg-pill acc">2. naya parent PARTITION BY RANGE</span><span class="dg-arrow flow"></span>
      <span class="dg-pill acc">3. indexes parent par</span><span class="dg-arrow flow"></span>
      <span class="dg-pill acc">4. naye mahine ka partition</span><span class="dg-arrow flow"></span>
      <span class="dg-pill good" data-hs="attach">5. legacy ATTACH (bina scan)</span>
    </div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Seedha ATTACH</span>
        <div class="dg-cap">Postgres poori legacy padhta hai — <b>table locked</b>. 20 TB = ghante.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ CHECK … NOT VALID → VALIDATE → ATTACH</span>
        <div class="dg-cap">scan <b>halka lock</b> mein (app chalu), ATTACH scan skip karta hai</div></div>
      <div class="dg-box is-gold"><span class="bx-label">⚠️ pg_constraint hack (video)</span>
        <div class="dg-cap">scan hi nahi — "main guarantee deta hoon". Galat nikla toh <b>chupchaap galat jawab</b>.</div></div>
    </div>`,
};

SG.registerLevels('internals', [

/* =====================================================================
   I4 — Partition key
   ===================================================================== */
{
  id: 'db-partition-key',
  icon: '🔑',
  title: 'Partition Key — Paanch Jaal, Paanch Asli Errors',
  badge: 'Key Ka Kaarigar',
  objectives: [
    'Partitions kitne bade hon — <b>ingest rate, retention, growth</b> se hisaab',
    'Achhi partition key ke teen sawaal — aur RANGE / LIST / HASH kab',
    'Paanch jaal jo production mein kaat-te hain — har ek ka asli error message',
    'MySQL aur Postgres mein partition key ke niyam ka farak',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>FarmSense</b> — 1,000 sensors har minute reading bhejte hain → <b>~50 crore rows/saal</b>. Kanoon kehta hai
     <b>6 saal</b> rakho. Team ne jaldi mein <code>PARTITION BY RANGE (reading_date)</code> <b>har din</b> ka partition bana diya.
     6 saal = <b>2,190 partitions</b>. Ab har query ka planning time hi 200 ms.</p>
     <p>Video ki pehli seekh: <b>partition banane se pehle hisaab</b> — kitni rows aati hain, kitna rakhna hai, aur
     aage kitna badhega (FarmSense: 25 locations se 200 hone wale hain).</p>

     <h3>🔑 Achhi key ke teen sawaal</h3>
     <ol>
       <li><b>Queries isi column par filter karti hain?</b> Nahi toh pruning nahi — har query saare partitions.</li>
       <li><b>Bahut saari values hain?</b> <code>status</code> (3 values) ya <code>gender</code> = kuch partitions mote, kuch khaali.</li>
       <li><b>Value kabhi badalti nahi?</b> Badli toh row ek partition se doosre mein <b>move</b> (andar se DELETE + INSERT).</li>
     </ol>
     <table>
       <tr><th>Method</th><th>Kab</th><th>Misaal</th></tr>
       <tr><td><b>RANGE</b></td><td>time-series, retention</td><td>har mahine ka partition</td></tr>
       <tr><td><b>LIST</b></td><td>kuch fixed values, har ek bada</td><td>region: north / south / west</td></tr>
       <tr><td><b>HASH</b></td><td>bahut saari values, barabar baantna</td><td>customer_id → 8 partitions</td></tr>
     </table>
     <p class="tip">🎯 <b>Asli baat:</b> partitioning <b>sharding nahi</b> hai (sab ek hi machine par), <b>index ka badal nahi</b> hai,
     aur normal tables ka "tuning trick" nahi hai. Partitioning bade, badhte, time-wise data ke maintenance ka auzaar hai.</p>`,

    `<h3>🪤 Paanch jaal (lab 03 ex2 ke asli errors)</h3>
     <table>
       <tr><th>Jaal</th><th>Postgres</th><th>MySQL</th></tr>
       <tr><td>1. Row ka partition hi nahi bana</td><td><code>no partition of relation "orders" found for row</code></td><td><code>ERROR 1526: Table has no partition for value</code></td></tr>
       <tr><td>1b. DEFAULT partition mein Feb ki row, ab Feb partition banao</td><td><code>updated partition constraint for default partition … would be violated</code></td><td>(MAXVALUE ko REORGANIZE — pmax ki rows copy)</td></tr>
       <tr><td>2. PRIMARY KEY mein partition key nahi</td><td><code>unique constraint on partitioned table must include all partitioning columns</code></td><td><code>ERROR 1503: A PRIMARY KEY must include all columns in the table's partitioning function</code></td></tr>
       <tr><td>3. Partition key UPDATE</td><td>row <code>orders_2025_02</code> → <code>orders_2025_01</code></td><td>row <code>p2025_02</code> → <code>p2025_01</code></td></tr>
       <tr><td>4. RANGE (date, location)</td><td><code>partition "t_multi_b" would overlap partition "t_multi_a"</code></td><td>location 80 gayi "location &lt; 50" wale partition mein</td></tr>
       <tr><td>5. HASH (status)</td><td>80000 / 20000 / 0 / 0</td><td>80256 / 9807 / 10107 / 0</td></tr>
     </table>
     <p><b>Jaal 2 ka matlab:</b> dono engines <code>id</code> ko <b>poori table mein</b> unique guarantee nahi de sakte — sirf
     har partition ke andar. Isliye PK <code>(id, created)</code> banti hai. Global unique chahiye toh id aisi banao jo
     khud unique ho (agle levels: sharded IDs).</p>
     <p><b>Jaal 4 ka matlab:</b> <code>(date, location)</code> ko database <b>dictionary ke shabd</b> ki tarah compare karta hai.
     "20 Jan, 80" &lt; "1 Feb, 50" — kyunki pehla hissa (date) chhota hai. Location ka number dekha hi nahi gaya.
     "Har mahine ke andar location se baanto" chahiye toh <b>sub-partitioning</b>.</p>
     <div class="war-story"><b>⚡ Real pattern:</b> team ne <code>DEFAULT</code> partition "safety" ke liye banaya aur mahino
     tak naye partitions banana bhool gayi. Sab kuch DEFAULT mein jaata raha. Jab cron theek hua, naya partition banana
     fail — DEFAULT mein us mahine ki rows pehle se thi. Ilaaj: <b>agle 3 mahine ke partitions pehle se</b> (cron / pg_partman),
     aur DEFAULT partition par alert.</div>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: partition kitne din ka ho?',
      instructions: 'Knob ghumao. Aaj aur 8× growth ke baad — dono dekho.',
      scenario: `FarmSense: aaj <b>1.37 million rows/din</b>. Retention <b>6 saal</b> (2,190 din). Locations 25 → 200 hone wale hain,
        yaani rows <b>8×</b>. Team ka niyam: partitions <b>500 se kam</b> (planning tez rahe), aur ek partition <b>100 million rows</b>
        se chhota (VACUUM aur index build ghanton na le) — <b>growth ke baad bhi</b>.`,
      knobs: [
        { id: 'days', label: 'Ek partition kitne din ka', min: 1, max: 90, step: 1, value: 1 },
      ],
      readouts: [
        { id: 'parts', label: 'Kul partitions (6 saal)', unit: '', fn: v => nParts(v), good: x => x <= 500,
          sub: x => x <= 500 ? 'planning theek' : '⚠️ har query ko itne partitions sochne padenge' },
        { id: 'today', label: 'Ek partition — aaj', unit: 'rows', fn: v => rowsToday(v), format: fmtM },
        { id: 'later', label: 'Ek partition — 8× growth ke baad', unit: 'rows', fn: v => rowsLater(v), format: fmtM, good: x => x <= 100e6,
          sub: x => x <= 100e6 ? 'VACUUM / index build sambhal lega' : '⚠️ ek partition hi ek badi table ban gaya' },
      ],
      bar: v => ({ pct: Math.min(100, nParts(v) / 22), bad: nParts(v) > 500, label: `${nParts(v)} partitions` }),
      verdict: v => {
        if (nParts(v) > 500) return { tone: 'bad', text: `🔥 <b>${nParts(v)} partitions.</b> Har query ka planning time badhega, aur har mahine sainkdon naye partitions ka cron.` };
        if (rowsLater(v) > 100e6) return { tone: 'warn', text: `⚠️ Aaj theek (${fmtM(rowsToday(v))}), par growth ke baad ek partition = <b>${fmtM(rowsLater(v))}</b> rows. Wahi "ek badi table" wali problem ek partition ke andar.` };
        return { tone: 'good', text: '✅ Partitions ginti mein, aur har partition growth ke baad bhi sambhalne layak.' };
      },
      goal: { text: 'Partitions <b>≤ 500</b> aur growth ke baad bhi ek partition <b>≤ 100M</b> rows.', check: (v, r) => r.parts <= 500 && r.later <= 100e6 },
      insight: `Size tay karne ke liye <b>teen number</b> chahiye: rows/din, retention, growth. Video ki salah: project ke
        <b>beech mein dobara hisaab</b> lagao — locations 25 se 200 hote hi monthly partitions haftawar karne pad sakte hain.`,
    },
    {
      type: 'match',
      title: 'Error dekho, jaal pehchano',
      pairs: [
        { left: 'no partition of relation "orders" found for row', right: 'Us date ka partition bana hi nahi — cron se pehle se banao', explain: 'Postgres khud partition nahi banata. pg_partman ya cron: agle 3 mahine hamesha taiyar.' },
        { left: 'unique constraint on partitioned table must include all partitioning columns', right: 'PK mein partition key (created) daalo — (id, created)', explain: 'Unique sirf har partition ke andar check ho sakta hai. MySQL: ERROR 1503.' },
        { left: 'partition "t_multi_b" would overlap partition "t_multi_a"', right: 'Multi-column RANGE tuple ki tarah compare hota hai — sub-partitioning chahiye', explain: 'Pehla column (date) hi range tay karta hai.' },
        { left: 'updated partition constraint for default partition would be violated', right: 'DEFAULT partition mein us range ki rows pehle se hain', explain: 'Pehle un rows ko DEFAULT se nikaalo, ya partitions pehle se banao taaki DEFAULT khaali rahe.' },
        { left: 'ERROR 1526: Table has no partition for value from column_list', right: 'MySQL mein bhi wahi — MAXVALUE partition ya pehle se partitions', explain: 'MySQL ka catch-all: VALUES LESS THAN (MAXVALUE). Naya mahina = REORGANIZE (pmax ki rows copy).' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: paanch jaal',
      project: '03-partitioning',
      exercise: 'ex2-key-traps',
      goal: 'Har jaal ka asli error dono engines par khud dekho — aur har jaal ka ilaaj chala ke dekho.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/03-partitioning\ndocker compose up -d' },
        { text: 'Postgres ke jaal.', cmd: './run.sh pg sql/ex2-key-traps.pg.sql',
          expect: '--- JAAL 1 ---\nERROR:  no partition of relation "orders" found for row\n--- JAAL 2 ---\nERROR:  unique constraint on partitioned table must include all partitioning columns\n--- JAAL 3 ---\n pehle: orders_2025_02  →  baad: orders_2025_01\n--- JAAL 4 ---\nERROR:  partition "t_multi_b" would overlap partition "t_multi_a"\n location_80_kahan_gayi: t_multi_a     (sub-partitioning: t_sub_2025_01_b)\n--- JAAL 5 ---\n orders_by_status_2 | 80000\n orders_by_status_3 | 20000\n orders_by_customer_0..3 | ~25000 har ek' },
        { text: 'MySQL ke jaal.', cmd: './run.sh my sql/ex2-key-traps.my.sql',
          expect: 'ERROR 1503 (HY000): A PRIMARY KEY must include all columns in the table\'s partitioning function\nERROR 1526 (HY000): Table has no partition for value from column_list\n| pa | 2025-01-20 | 80 |\n| orders_by_status | p0 | 0 | p1 | 80256 | p2 | 9807 | p3 | 10107 |' },
      ],
      observe: {
        q: 'HASH (status) mein 4 partitions ka bantwaara 80000 / 20000 / 0 / 0 aaya. Asli wajah?',
        choices: [
          'status mein sirf 3 values hain aur 80% "delivered" — hash kitna bhi achha ho, 3 values 4 dabbon mein barabar nahi ban sakti',
          'Hash function kharab hai',
          'Partitions kam the',
          'ANALYZE nahi chala',
        ],
        answer: 0,
        explain: 'Hash sirf values ko baant-ta hai. Values hi 3 hain (aur ek hi 80%) toh ek partition mota, baaki khaali. customer_id (50,000 values) par wahi 4 partitions ~25,000 har ek.',
      },
      lesson: 'Har jaal ka error message yaad rakhne ki zaroorat nahi — bas teen sawaal: filter hota hai? bahut values? kabhi badalti nahi?',
    },
    {
      type: 'quiz',
      title: 'Partition key ki samajh',
      questions: [
        { q: '<code>orders</code> ko <code>PARTITION BY LIST (status)</code> kiya (placed/shipped/delivered). Sabse badi problem?', choices: ['Koi nahi', 'Status badalta hai — har status change par row ek partition se doosre mein move (DELETE + INSERT); aur delivered partition sabse mota', 'LIST allowed nahi', 'Pruning tez hogi'], answer: 1, explain: 'Key kabhi badalni nahi chahiye, aur values ka bantwaara barabar hona chahiye. Status dono sharton par fail.' },
        { q: 'Postgres mein <code>id</code> ko poori partitioned table mein unique chahiye. Kya karoge?', choices: ['UNIQUE (id) laga do', 'PK (id, created) + id aisi banao jo khud unique ho (sequence / snowflake-style id)', 'Partitioning hata do', 'Trigger se check'], answer: 1, explain: 'Global unique index partitioned table par nahi ban sakta (dono engines). Unique id generator par bharosa karo.' },
        { q: 'Har mahine ke andar location ke hisaab se bhi baantna hai. Sahi?', choices: ['RANGE (date, location)', 'RANGE (date) + har mahine ka partition RANGE/LIST (location) se sub-partitioned', 'HASH (date)', 'Do alag tables'], answer: 1, explain: 'Multi-column RANGE tuple-compare karta hai — pehla column hi faisla karta hai. Sub-partitioning har level ko alag rakhta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Partition key',
    instructions: 'Data platform round. 🎤',
    questions: [
      { q: 'Interviewer: "Events table 2 TB, 90 din rakhni hai, queries hamesha last 24 ghante. Partitioning design?"', choices: ['HASH (user_id)', 'RANGE (event_time) daily partitions — 90 partitions, purana DROP, queries sirf aaj/kal ke partitions', 'LIST (event_type)', 'Partitioning ki zaroorat nahi'], answer: 1, explain: 'Filter + retention dono time par. 90 partitions planning ke liye theek. DROP PARTITION = retention muft.' },
      { q: 'Interviewer: "Partitioning se query tez nahi hui. Kyun ho sakta hai?"', choices: ['Partitioning hamesha tez karta hai', 'Query partition key seedhi filter nahi karti (function / doosra column) — saare partitions padhe; ya index pehle se kaam kar raha tha', 'Partitions zyada the', 'MySQL use kiya'], answer: 1, explain: 'EXPLAIN mein dekho kitne partitions padhe (MySQL: partitions column). Pruning nahi = faayda nahi.' },
    ],
  },
  success: [
    'Main partition ka size rows/din, retention aur growth se tay kar sakta hoon',
    'Main partition key ke teen sawaal aur RANGE / LIST / HASH ka chunav samjha sakta hoon',
    'Main paanch jaal unke error message se pehchaan sakta hoon',
    'Maine asli DB par har jaal chalaya hai',
  ],
  homework: `<p>Apne project ki sabse badi table ke liye teen number likho: rows/din, kitne din rakhna hai, 2 saal mein kitna badhega.
    Kya partitioning chahiye? Kaunsi key? Kitne din ka partition?</p>`,
  cards: [
    { front: 'Achhi partition key ke teen sawaal?', back: '1) Queries isi par filter karti hain? 2) Bahut saari values? 3) Kabhi badalti nahi?' },
    { front: 'RANGE (date, location) ka jaal?', back: 'Tuple compare — <b>pehla column</b> (date) hi faisla karta hai. Chahiye: <b>sub-partitioning</b>.' },
    { front: 'Partitioned table par PK ka niyam (dono engines)?', back: 'PK / UNIQUE mein <b>partition key</b> hona zaroori — (id, created).' },
    { front: 'Partition size kaise tay karein?', back: '<b>rows/din × din</b> = rows/partition; <b>retention ÷ din</b> = kitne partitions. Growth ke baad bhi dono sambhalne layak.' },
  ],
},

/* =====================================================================
   I5 — Live partitioning (20 TB)
   ATTACH model: table size (TB) aur disk read speed (MB/s).
   method 0 = seedha ATTACH (scan lock ke andar)
          1 = NOT VALID + VALIDATE (scan halka lock) → ATTACH
          2 = pg_constraint hack (scan hi nahi, par data verified nahi)
   ===================================================================== */
{
  id: 'db-partition-live',
  icon: '🚚',
  title: '20 TB Ki Chalti Table — Bina App Roke Partition Karo',
  badge: 'Live Surgeon',
  objectives: [
    'Chalti badi table ko partition karne ki <b>teen shartein</b>: lock nahi, 2× disk nahi, adhoora view nahi',
    'Video ka plan: rename → naya parent → legacy ko partition ki tarah ATTACH — ek transaction, milliseconds',
    '<b>NOT VALID + VALIDATE</b> (safe) vs <b>pg_constraint hack</b> (video) — kab kaunsa',
    'MySQL ka jawaab: <b>EXCHANGE PARTITION … WITHOUT VALIDATION</b> — aur video ke aakhri step ka chhupa jaal',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p>Ek OLTP table <b>20 TB</b> ki ho gayi. VACUUM <b>ek mahine</b> se chal raha hai (MVCC level yaad hai?). Queries dheemi.
     Ek chhupi wajah bhi: Postgres table ko <b>1 GB ki files</b> mein rakhta hai → 20 TB = <b>20,000 files</b>, aur har page
     padhne par sahi file dhoondhni padti hai.</p>
     <p>Team partitioning chahti hai. Teen shartein:</p>
     <ol>
       <li>❌ Table par <b>lock nahi</b> (checkout chalta rahe)</li>
       <li>❌ <b>2× disk nahi</b> (20 TB copy karne ki jagah nahi)</li>
       <li>❌ <b>Adhoora view nahi</b> (aadha data nayi table mein, aadha purani mein — app ko galat jawab)</li>
     </ol>
     <p><b>Seedha tareeka</b> (naya partitioned table + <code>INSERT … SELECT</code> 20 TB) teeno sharten todta hai.</p>

     <h3>🧠 Video ka plan: purani table ko hi partition bana do</h3>
     <pre>BEGIN;
ALTER TABLE daily_totals RENAME TO daily_totals_legacy;           -- indexes bhi rename
CREATE TABLE daily_totals (LIKE daily_totals_legacy) PARTITION BY RANGE (total_date);
CREATE INDEX ON daily_totals (total_date);                         -- parent par
CREATE TABLE daily_totals_2025_07 PARTITION OF daily_totals
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');                -- naya data yahan
ALTER TABLE daily_totals ATTACH PARTITION daily_totals_legacy
  FOR VALUES FROM ('2019-01-01') TO ('2025-07-01');                -- purana data wahin ka wahin
COMMIT;</pre>
     <p>Koi row copy nahi hui. App ke liye <code>daily_totals</code> naam wahi hai. Naya data naye partitions mein jaata hai.
     <b>Ek hi jaal:</b> ATTACH ko pakka karna hai ki legacy ki <b>har row</b> range ke andar hai — iske liye Postgres
     <b>poori legacy padhta hai</b>, aur tab tak table <b>locked</b>. 20 TB = ghante.</p>`,

    `<h3>🔓 ATTACH ka scan kaise bachayein</h3>
     <p>Agar legacy par pehle se ek <b>pakka (validated) CHECK constraint</b> ho jo range batata hai, toh ATTACH scan skip karta hai.</p>
     <table>
       <tr><th>Tareeka</th><th>App kitni der ruki (lab, 218 MB)</th><th>Background scan</th><th>Kab</th></tr>
       <tr><td>1. Seedha ATTACH</td><td>139 ms (20 TB par <b>ghante</b>)</td><td>—</td><td>chhoti table</td></tr>
       <tr><td>2. <code>CHECK … NOT VALID</code> → <code>VALIDATE CONSTRAINT</code> → ATTACH</td><td><b>6 ms</b></td><td>123 ms, <b>halka lock</b> (<code>ShareUpdateExclusiveLock</code>) — INSERT/UPDATE chalte rahe</td><td>✅ default choice</td></tr>
       <tr><td>3. <code>NOT VALID</code> + <code>UPDATE pg_constraint SET convalidated = true</code> (video)</td><td>7 ms</td><td>kuch nahi</td><td>jab VALIDATE ka scan bhi mehenga ho <b>aur</b> data par pakka bharosa ho</td></tr>
     </table>
     <p>⚠️ Hack ka khatra (lab 03 "Khud try karo" #3): legacy mein ek row <code>2030-01-01</code> ki daal di, hack se ATTACH ho gaya.
     <code>WHERE total_date = '2030-01-01'</code> → <b>0 rows</b> (pruning ne legacy ko skip kiya), <code>count(*)</code> → row hai.
     <b>Koi error nahi, bas galat jawab.</b></p>

     <h3>🪤 Video ka aakhri step — ek chhupi baat</h3>
     <p>Video kehta hai: "ab apni speed se data move karo — <code>DELETE FROM legacy … RETURNING</code> ko naye table mein INSERT".
     Par legacy ki range <code>2019 → July 2025</code> hai — nikaali hui rows <b>wapas legacy mein hi gir jaati hain</b>
     (lab: 30,000 June rows → <code>daily_totals_legacy</code>). June ka naya partition bhi nahi ban sakta
     (<code>would overlap partition "daily_totals_legacy"</code>).</p>
     <p><b>Sahi batch</b> (ek transaction, lab mein 88 ms): legacy <b>DETACH</b> → June partition banao → June rows move karo →
     legacy ko <b>chhoti range</b> (<code>… TO '2025-06-01'</code>) ke saath wapas ATTACH. Raat ko ek-ek mahina.</p>

     <h3>🐬 MySQL mein?</h3>
     <p><code>NOT VALID</code> constraint nahi hota. Jawaab: <b>EXCHANGE PARTITION</b> — khaali partitioned table ka ek partition
     legacy table se <b>swap</b> (files ki adla-badli, copy nahi). <code>WITHOUT VALIDATION</code> = hack ka officially supported roop.
     Lab: seedha <code>ALTER … PARTITION BY</code> = <b>9.3 s</b> writes band; EXCHANGE WITHOUT VALIDATION + RENAME = <b>331 ms</b>.
     Par legacy se ek mahina alag karna (<code>REORGANIZE PARTITION</code>) <b>poori legacy dobara likhta hai</b> (9 s) — MySQL mein
     legacy ko retention poora hone tak waise hi rehne do, phir ek baar <code>DROP PARTITION</code>.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: ATTACH ka tareeka chuno',
      instructions: 'Tareeka aur disk speed badlo. App kitni der ruki, scan kitna chala, data pakka hai ya nahi — teeno dekho.',
      scenario: `Legacy table <b>20 TB</b>. Checkout team ki shart: app <b>1 second se zyada</b> na ruke. DBA team ki shart:
        data par "bharosa" nahi — <b>verify</b> hona chahiye. Background kaam <b>24 ghante</b> ke andar khatam ho.`,
      knobs: [
        { id: 'm', label: 'Tareeka: 0 = seedha ATTACH · 1 = NOT VALID + VALIDATE · 2 = pg_constraint hack', min: 0, max: 2, step: 1, value: 0 },
        { id: 'mbps', label: 'Disk read speed (scan)', min: 100, max: 1000, step: 50, value: 150, unit: 'MB/s' },
      ],
      readouts: [
        { id: 'scanH', label: 'Poora scan', unit: 'ghante', fn: v => Math.round(20e6 / v.mbps / 3600 * 10) / 10 },
        { id: 'lockS', label: 'App kitni der RUKI', unit: 's', fn: v => (v.m === 0 ? Math.round(20e6 / v.mbps) : 0.01), good: x => x <= 1,
          sub: (x, v) => v.m === 0 ? '⚠️ poora scan sabse bhaari lock ke andar' : 'sirf rename + attach (milliseconds)' },
        { id: 'bgH', label: 'Background kaam (app chalu)', unit: 'ghante', fn: v => (v.m === 1 ? Math.round(20e6 / v.mbps / 3600 * 10) / 10 : 0), good: x => x <= 24 },
        { id: 'ok', label: 'Data verified?', unit: '', fn: v => (v.m === 2 ? 0 : 1), format: x => (x ? 'haan ✅' : 'nahi ⚠️'), good: x => x === 1 },
      ],
      verdict: v => {
        if (v.m === 0) return { tone: 'bad', text: `🔥 Seedha ATTACH = <b>${Math.round(20e6 / v.mbps / 3600 * 10) / 10} ghante</b> checkout band. Scan lock ke andar ho raha hai.` };
        if (v.m === 2) return { tone: 'warn', text: '⚠️ App 10 ms ruki, scan zero — par data <b>verify nahi</b> hua. Ek bhi galat row = pruning chupchaap galat jawab degi. DBA team ki shart toot-ti hai.' };
        if (20e6 / v.mbps / 3600 > 24) return { tone: 'warn', text: `⚠️ Tareeka sahi hai, par ${v.mbps} MB/s par VALIDATE ${Math.round(20e6 / v.mbps / 3600)} ghante lega. Tez disk / kam load waala samay chahiye — ya tab video wala hack sochna padega.` };
        return { tone: 'good', text: '✅ Scan <b>halke lock</b> mein background mein chala, app chalti rahi. ATTACH ne constraint dekh ke scan skip kiya — milliseconds.' };
      },
      goal: { text: 'App <b>≤ 1 s</b> ruke, data <b>verified</b>, background <b>≤ 24 ghante</b>.', check: (v, r) => r.lockS <= 1 && r.ok === 1 && r.bgH <= 24 },
      wrongWay: v => v.m === 0,
      insight: `Default jawab <b>tareeka 1</b> hai: <code>ADD CONSTRAINT … NOT VALID</code> (turant) → <code>VALIDATE CONSTRAINT</code>
        (poora scan, par writes chalu) → ATTACH (scan skip). Video ka hack sirf tab jab VALIDATE bhi mumkin na ho — aur tab bhi
        pehle data khud jaancho (min/max date, future dates).`,
    },
    {
      type: 'order',
      title: 'Live partitioning — sahi kram lagao',
      steps: [
        { text: '(App chalte hue) legacy par CHECK (range) … NOT VALID', explain: 'Constraint turant ban jaata hai — koi scan nahi.' },
        { text: '(App chalte hue) VALIDATE CONSTRAINT — poora scan, halka lock', explain: 'ShareUpdateExclusiveLock: INSERT/UPDATE/SELECT chalte rehte hain.' },
        { text: 'BEGIN; table ko daily_totals_legacy rename (indexes bhi)', explain: 'Yahan se transaction ke aakhir tak table par bhaari lock — isliye baaki kaam milliseconds ka hona chahiye.' },
        { text: 'Naya daily_totals PARTITION BY RANGE (total_date) + indexes parent par', explain: 'Parent par index = har partition par apne aap. Legacy ka matching index attach hota hai, dobara nahi banta.' },
        { text: 'Naye mahine (July) ka partition', explain: 'Naya data kal se yahan jaayega.' },
        { text: 'ATTACH legacy FOR VALUES FROM (earliest) TO (\'2025-07-01\'); COMMIT;', explain: 'Validated constraint range ko imply karta hai → scan skip → milliseconds.' },
        { text: 'Raat ko batch: DETACH legacy → ek mahina move → legacy chhoti range se wapas ATTACH', explain: 'Legacy ki range chhoti kiye bina move ki gayi rows wapas legacy mein hi girti hain.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: teen ATTACH, aur video ka chhupa jaal',
      project: '03-partitioning',
      exercise: 'ex3-live',
      goal: '2,373,000 rows ki legacy table ko teen tareeke se partition karo (Postgres DDL rollback ho jaata hai, isliye teeno same table par). Phir June ka data move karke dekho.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/03-partitioning\ndocker compose up -d' },
        { text: 'Postgres — teen tareeke + lock modes + move ka jaal.', cmd: './run.sh pg sql/ex3-live.pg.sql',
          expect: ' validate_ke_dauraan_lock → ShareUpdateExclusiveLock\n rename_attach_ke_dauraan_lock → AccessExclusiveLock\n\n 1. seedha ATTACH (scan rename-transaction ke andar)    |         139 |                  0\n 2. pehle NOT VALID + VALIDATE (app chalu), phir ATTACH |           6 |                123\n 3. NOT VALID + pg_constraint hack, phir ATTACH (video) |           7 |                  0\n\nERROR:  partition "daily_totals_2025_06" would overlap partition "daily_totals_legacy"\n june_ki_rows_kahan  | count\n daily_totals_legacy | 30000\n\nEk mahine ka batch: 88 ms\n daily_totals_legacy  | 2343000 | 2019-01-01 | 2025-05-31\n daily_totals_2025_06 |   30000 | 2025-06-01 | 2025-06-30' },
        { text: 'MySQL — ALTER copy vs EXCHANGE PARTITION.', cmd: './run.sh my sql/ex3-live.my.sql',
          expect: '| 1. ALTER TABLE ... PARTITION BY (copy)      |        9342 |             0 |\n| 2. EXCHANGE PARTITION (with validation)     |         606 |         16654 |\n| 3. EXCHANGE ... WITHOUT VALIDATION + RENAME |         331 |         16654 |\n\nREORGANIZE PARTITION p_legacy INTO (…)  →  9097 ms' },
      ],
      observe: {
        q: 'Tareeka 2 mein VALIDATE ne 123 ms poori table padhi — phir bhi "app ruki" sirf 6 ms. Kyun?',
        choices: [
          'VALIDATE sirf ShareUpdateExclusiveLock leta hai (writes chalu), aur rename+ATTACH wali transaction ne validated constraint dekh ke scan skip kiya',
          'VALIDATE cache se padhta hai',
          'ATTACH ne background mein scan kiya',
          '6 ms galat number hai',
        ],
        answer: 0,
        explain: 'Scan ko <b>bhaari lock wali transaction se bahar</b> nikaal diya. Bhaari lock sirf rename + attach ke milliseconds ke liye.',
      },
      lesson: 'Lab ki table RAM mein thi (218 MB, 139 ms). 20 TB disk se padhna ghanton ka kaam hai — wahi ghante tareeka 1 mein checkout band rakhte.',
    },
    {
      type: 'quiz',
      title: 'Live partitioning ki samajh',
      questions: [
        { q: 'Legacy ko ATTACH karte waqt Postgres poori table kyun padhta hai?', choices: ['Index banane ke liye', 'Pakka karne ke liye ki har row partition ki range ke andar hai', 'VACUUM ke liye', 'Stats ke liye'], answer: 1, explain: 'Galat range ki row = pruning galat jawab degi. Validated CHECK constraint ho toh scan skip.' },
        { q: '<code>VALIDATE CONSTRAINT</code> ke dauraan app kya kar sakti hai?', choices: ['Kuch nahi, table locked', 'SELECT, INSERT, UPDATE, DELETE — sab (ShareUpdateExclusiveLock)', 'Sirf SELECT', 'Sirf INSERT'], answer: 1, explain: 'Isi liye NOT VALID → VALIDATE live tables ke liye standard tareeka hai.' },
        { q: 'MySQL mein Postgres ke "NOT VALID + hack" jaisa kaam kaunsa command karta hai?', choices: ['ALTER TABLE … PARTITION BY', 'EXCHANGE PARTITION … WITH TABLE … WITHOUT VALIDATION', 'REORGANIZE PARTITION', 'OPTIMIZE TABLE'], answer: 1, explain: 'Swap bina har row check kiye. Structure bilkul same hona chahiye (PK mein partition column bhi).' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Live partitioning',
    instructions: 'Staff engineer round. 🎤',
    questions: [
      { q: 'Interviewer: "5 TB table, zero downtime, partitioning chahiye. Plan?"', choices: ['pg_dump, naya table, restore', 'NOT VALID CHECK → VALIDATE (app chalu) → ek transaction: rename, partitioned parent, indexes, naya partition, legacy ATTACH → raat ko batches mein mahine nikaalo (detach/move/re-attach)', 'Naya table + trigger se dual write', 'Downtime window lo'], answer: 1, explain: 'Koi copy nahi, bhaari lock sirf milliseconds, legacy dheere-dheere khaali.' },
      { q: 'Interviewer: "pg_constraint mein convalidated = true set karna — theek hai?"', choices: ['Hamesha theek', 'Sirf aakhri raasta — catalog chhoona supported nahi; data khud verify karo (min/max, future dates); galat row = chupchaap galat query results', 'Kabhi nahi chalta', 'Sirf MySQL mein'], answer: 1, explain: 'Video ke presenter ne bhi yahi kaha: "normally pg_catalog mat chhuo". Pehle VALIDATE sochna.' },
    ],
  },
  success: [
    'Main live partitioning ki teen shartein aur video ka rename-attach plan samjha sakta hoon',
    'Main VALIDATE (safe) aur pg_constraint hack ka farak aur khatra bata sakta hoon',
    'Main legacy se data move karne ka sahi batch (detach → move → chhoti range se attach) likh sakta hoon',
    'Main MySQL ka EXCHANGE PARTITION wala raasta jaanta hoon',
  ],
  homework: `<pre>-- Kaunse lock mode kya rokte hain? Ek session mein:
BEGIN; ALTER TABLE t VALIDATE CONSTRAINT c;   -- (commit mat karo)
-- doosre session mein:
SELECT relation::regclass, mode, granted FROM pg_locks WHERE relation = 't'::regclass;
INSERT INTO t ...;   -- chalta hai?</pre>`,
  cards: [
    { front: 'ATTACH PARTITION ka scan kaise skip karein?', back: 'Legacy par pehle <b>validated CHECK</b> jo range imply kare: <code>ADD CONSTRAINT … NOT VALID</code> → <code>VALIDATE CONSTRAINT</code>.' },
    { front: 'VALIDATE CONSTRAINT kaunsa lock leta hai?', back: '<b>ShareUpdateExclusiveLock</b> — reads aur writes chalte rehte hain.' },
    { front: 'Legacy partition se data move karne ka jaal?', back: 'Legacy ki range abhi bhi us mahine ko cover karti hai → rows wapas legacy mein. Pehle DETACH, move, phir <b>chhoti range</b> se ATTACH.' },
    { front: 'MySQL mein bina copy legacy table partition kaise bane?', back: '<code>EXCHANGE PARTITION p WITH TABLE legacy WITHOUT VALIDATION</code> + <code>RENAME</code> (ek LOCK TABLES ke andar).' },
  ],
},

]);
})();
