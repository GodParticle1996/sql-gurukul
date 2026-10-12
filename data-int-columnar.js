/* =====================================================================
   TRACK 5 — 🔬 Database Internals · file 4/6
   db-minmax          — "data kahan NAHI hai": min/max pruning, BRIN, columnar (lab 04 ex1)
   db-ordering-views  — drag karke beech mein daalna + live summary (lab 04 ex3)
   Videos: Snowflake architecture (micro-partitions), Airtable ka naya engine
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   Snowflake-jaisa pruning model
   50,000 files (micro-partitions), har file ~100 MB (sab columns milake).
   Data poora kram mein ho toh ek din = 50,000 / 365 ≈ 137 files.
   "Bikhra hua" % = kitni files ka min/max poora saal cover karta hai.
   Columnar: query jitne columns maange, utna hi hissa padho (300 columns ki table).
   --------------------------------------------------------------------- */
const FILES = 50000, PER_DAY = Math.round(FILES / 365), FILE_GB = 0.1, COLS = 300;
const filesRead = v => Math.round(PER_DAY + (v.mess / 100) * (FILES - PER_DAY));
const gbRead = v => Math.round(filesRead(v) * FILE_GB * (v.cols / COLS) * 100) / 100;

/* Materialized view refresh model: 100M orders, ek REFRESH = 20 second ka poora kaam */
const REFRESH_S = 20;
const mvLoad = v => Math.round(REFRESH_S / (v.every * 60) * 1000) / 10;

VISUALS['db-minmax'] = {
  t: 'Min/max — "data yahan NAHI hai"',
  html: `
    <div class="dg-flow">
      <span class="dg-pill" data-hs="skip">📦 file 1 · 1–9 Jan</span>
      <span class="dg-pill">📦 file 2 · 9–18 Jan</span>
      <span class="dg-pill good" data-hs="hit">📦 file 7 · 1–5 Mar ✅</span>
      <span class="dg-pill">📦 file 8 · 5–12 Mar</span>
      <span class="dg-pill bad" data-hs="messy">📦 file 9 · 1 Jan–31 Dec 😩</span>
    </div>
    <div class="dg-cap">Query: <code>WHERE order_date = '3 March'</code>. Sirf label (min/max) padh ke files 1, 2, 8 chhod do.
      Bikhri hui file 9 ka label kuch nahi batata — use kholna padega.</div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📇 Index (B-tree)</span>
        <div class="dg-cap">batata hai data <b>kahan HAI</b> — har row ka pata. Bada.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🏷️ Min/max (BRIN, Snowflake metadata)</span>
        <div class="dg-cap">batata hai data <b>kahan NAHI hai</b> — har block ka range. Bahut chhota.</div></div>
    </div>
    <div class="dg-legend"><span class="dg-pill acc" data-hs="columnar">🧱 Columnar</span>
      <span>300 columns mein se 3 chahiye? Columnar store sirf woh 3 columns padhta hai. Row store poori row.</span></div>`,
};

VISUALS['db-ordering-views'] = {
  t: 'Airtable ke do sawaal — kram aur live summary',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">task A · pos 1</span>
      <span class="dg-pill">task B · pos 2</span>
      <span class="dg-pill good" data-hs="frac">task Z · pos 2.5 (sirf 1 row likhi)</span>
      <span class="dg-pill">task C · pos 3</span>
    </div>
    <div class="dg-cap">Integer position = neeche ki <b>saari</b> rows renumber. Fractional = sirf <b>ek</b> row. Precision khatam → rebalance.</div>
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">🗃️ Materialized view</span>
        <div class="dg-cap">jawab save. Padhna turant, par <b>baasi</b> — REFRESH = poori query dobara</div></div>
      <div class="dg-box is-good"><span class="bx-label">⚡ Summary table + trigger</span>
        <div class="dg-cap"><b>hamesha taaza</b> — par har INSERT ab do kaam karta hai, ek row hot-spot</div></div>
    </div>`,
};

SG.registerLevels('internals', [

/* =====================================================================
   I6 — min/max pruning, BRIN, columnar
   ===================================================================== */
{
  id: 'db-minmax',
  icon: '🏷️',
  title: 'Min/Max Pruning — Data Kahan NAHI Hai, Yeh Batao',
  badge: 'Label Padhne Wala',
  objectives: [
    'Snowflake 50,000 files mein se 200 kaise chunta hai — sirf <b>min/max</b> padh ke',
    'Postgres <b>BRIN</b> index: B-tree se 4,400× chhota — aur kab bilkul bekaar',
    'Row store vs columnar: 300 mein se 3 columns chahiye toh kya padhna padta hai',
    'MySQL mein BRIN nahi — clustered PRIMARY KEY se wahi faayda',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>BazaarKart</b> ki orders table: 5 saal, <b>arabon rows</b>. Dashboard poochta hai: "3 March ki bikri?"
     Is table par B-tree index <b>table ka aadha size</b> le raha hai, aur har INSERT par index bhi badalta hai.</p>

     <h3>🏪 Misaal: godown ke dabbe</h3>
     <p>Godown mein <b>50,000 dabbe</b>. Har dabbe par ek label: "is dabbe mein 1 Jan se 9 Jan ke orders".
     3 March ke orders chahiye? Sirf <b>labels padho</b> — jin dabbon ka range 3 March ko cover nahi karta, unhe kholo hi mat.
     ~200 dabbe khule, 49,800 bina chhuye.</p>
     <ul>
       <li><b>Index</b> ek rajister hai jo har cheez ka <b>pata</b> batata hai — "yeh order dabba 4,211 mein, khana 7".</li>
       <li><b>Label (min/max)</b> sirf itna batata hai ki cheez <b>kahan NAHI</b> hai. Par label bahut chhota hai.</li>
     </ul>
     <p class="tip">🎯 <b>Asli baat:</b> Snowflake har file (micro-partition, 50–500 MB) ke <b>har column</b> ka min aur max
     metadata mein rakhta hai. Postgres mein yahi cheez <b>BRIN</b> (Block Range INdex) hai: har 128 pages (1 MB) ka min/max.
     <b>Shart:</b> data <b>kram</b> mein likha ho (jaise orders time ke saath aate hain). Dabbon mein saal bhar ka maal mila-jula ho
     toh har label "1 Jan – 31 Dec" kehega — kuch nahi bachega.</p>`,

    `<h3>🔬 Lab 04 (ex1) ke asli numbers — 5 million orders</h3>
     <pre>table (5M rows)  249 MB
B-tree index     107 MB
BRIN index        24 kB        ← 4,400× chhota

3 March ki bikri            plan                      pages   ms
ordered  + BRIN             Bitmap Heap Scan            261    6.3
shuffled + BRIN             Seq Scan (BRIN bekaar)    31872  368.8
ordered  + B-tree           Index Scan                  129    2.9

sum(amount) — 22 columns ki row  18240 pages  43 ms
sum(amount) —  2 columns ki row    896 pages  17 ms</pre>
     <h3>🧱 Row store vs columnar</h3>
     <p>Postgres aur MySQL <b>row store</b> hain: ek page mein poori-poori rows. <code>sum(amount)</code> ke liye bhi 22 columns wali
     poori row padhni padi — 20× pages. <b>Columnar</b> store (Snowflake, ClickHouse, BigQuery) har column alag rakhta hai:
     300 columns mein se 3 chahiye → sirf 3 columns padho. Aur ek column mein milte-julte values → compression bahut achha.</p>
     <table>
       <tr><th></th><th>Row store (Postgres, MySQL)</th><th>Columnar (Snowflake)</th></tr>
       <tr><td>Ek order poora padhna/badalna</td><td>✅ ek jagah</td><td>❌ 300 jagah</td></tr>
       <tr><td>Arabon rows ka sum ek column par</td><td>❌ poori rows</td><td>✅ sirf woh column</td></tr>
       <tr><td>Kaam</td><td>OLTP (app)</td><td>OLAP (analytics)</td></tr>
     </table>
     <h3>🐬 MySQL mein?</h3>
     <p>BRIN nahi hai. Par InnoDB table <b>khud PRIMARY KEY ke kram</b> mein rakhi hoti hai (clustered index). Lab: PK
     <code>(created, id)</code> → 3 March ki query ne 5,481 rows padhi, 3 ms, <b>koi extra index nahi</b>.
     Keemat: har secondary index mein PK copy hota hai — chauda PK = mote indexes.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: Snowflake ka bill — kitna data padha?',
      instructions: 'Dono knobs ghumao. "Data padha" jitna kam, query utni tez aur sasti.',
      scenario: `Orders table: <b>50,000 files</b>, har file ~100 MB, table mein <b>300 columns</b>.
        Query: "3 March ko har city ki bikri" — sirf <code>order_date, city, amount</code> chahiye.
        Abhi analyst <code>SELECT *</code> likhta hai, aur data <b>60% bikhra</b> hua hai (updates aur late-arriving data ne kram bigaad diya).`,
      knobs: [
        { id: 'mess', label: 'Data kitna bikhra hua (files jinka min/max poora saal)', min: 0, max: 100, step: 5, value: 60, unit: '%',
          help: 'Snowflake mein background re-clustering ise kam karta hai' },
        { id: 'cols', label: 'Query kitne columns padhti hai', min: 1, max: 300, step: 1, value: 300,
          help: '300 = SELECT *' },
      ],
      readouts: [
        { id: 'files', label: 'Files kholni padi', unit: `/ ${FILES.toLocaleString('en-IN')}`, fn: v => filesRead(v),
          sub: x => x <= 500 ? 'min/max ne baaki chhod di' : '⚠️ labels kuch nahi bata rahe' },
        { id: 'gb', label: 'Data padha', unit: 'GB', fn: v => gbRead(v), good: x => x <= 5 },
      ],
      bar: v => ({ pct: Math.min(100, gbRead(v) / 30), bad: gbRead(v) > 5, label: `${gbRead(v)} GB padha` }),
      verdict: v => {
        if (v.mess >= 50 && v.cols >= 100) return { tone: 'bad', text: '🔥 Dono galtiyan saath: bikhre data mein min/max bekaar, aur <code>SELECT *</code> se columnar ka faayda bhi gaya.' };
        if (gbRead(v) > 5) return { tone: 'warn', text: v.mess > 10 ? `⚠️ Columns kam kiye — achha. Par ${v.mess}% files ka range poora saal hai, unhe kholna hi padega. Kram theek karo (re-cluster).` : '⚠️ Files kam khuli — achha. Ab sirf zaroori columns maango.' };
        return { tone: 'good', text: '✅ <b>Pruning + columnar dono.</b> Kram wale data ne files chhanti, aur sirf 3 columns padhe.' };
      },
      goal: { text: 'Data padha <b>≤ 5 GB</b>.', check: (v, r) => r.gb <= 5 },
      insight: `Do alag lever: <b>kram</b> (min/max kitna chhaant sakta hai) aur <b>columns</b> (har file mein se kitna padhna).
        Snowflake ka video: 50,000 files → metadata se ~200. Isiliye Snowflake background mein <b>re-clustering</b> karta hai —
        aur isiliye analytics par <code>SELECT *</code> mehenga hai.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: Snowflake ek query kaise chalata hai',
      instructions: 'Ek-ek kadam.',
      scenario: "<code>SELECT city, sum(amount) FROM orders WHERE order_date = '2024-03-03' GROUP BY city</code>",
      lanes: [
        { id: 'meta', label: '🗂️ Metadata (FoundationDB)' },
        { id: 's3', label: '🪣 Files (S3)' },
        { id: 'wh', label: '🏭 Warehouse (compute)' },
      ],
      steps: [
        { lane: 'meta', t: 'orders ki file list: 50,000 files, har file ka har column ka min/max', note: 'Table = files ki list + har file ke labels. Yeh list ek chhote transactional store (FoundationDB) mein.' },
        { lane: 'meta', t: 'order_date ka min/max milaao → 200 files bachi', note: '49,800 files ka range 3 March ko cover hi nahi karta. Unhe chhua bhi nahi.',
          ask: {
            q: 'Ek file ka order_date min = 1 Jan, max = 31 Dec hai. Us file ka kya hoga?',
            choices: ['Kholni padegi — label ke hisaab se 3 March us file mein ho sakta hai', 'Chhod di jaayegi', 'Error', 'Delete ho jaayegi'],
            answer: 0,
            explain: 'Min/max sirf "yahan nahi hai" pakka bata sakta hai. Range cover kare toh "shayad hai" — file kholo. Isiliye bikhra data pruning ko maar deta hai.',
          } },
        { lane: 's3', t: '200 files mein se sirf order_date, city, amount columns download', note: 'Columnar: har file ke andar har column alag hissa. 300 mein se 3 columns = file ka ~1%.' },
        { lane: 'wh', t: 'Warehouse ke nodes 200 files aapas mein baant ke padhte hain', note: 'Compute alag, storage alag (st-snow wale level yaad hain) — bada warehouse = zyada nodes = tez.' },
        { lane: 'wh', t: 'city ke hisaab se sum → jawab', note: 'Kul data padha: 200 files × ~1 MB = ~200 MB — 5 TB ki table se.', good: true,
          ask: {
            q: 'Ab ek analyst "order_id = 98765" (ek single order) dhoondhta hai. Min/max kaam aayega?',
            choices: [
              'Tabhi jab order_id kram mein likhe gaye hon; point lookup ke liye Snowflake ne baad mein alag "search optimization" banaya',
              'Hamesha, 1 file',
              'Kabhi nahi, Snowflake point query chala hi nahi sakta',
              'Index se',
            ],
            answer: 0,
            explain: 'Min/max range queries ke liye bana hai. Ek row dhoondhna row store + B-tree ka kaam hai — Snowflake ne isliye "search optimization service" aur hybrid tables jode.',
          } },
        { lane: 'meta', t: 'Query khatam — koi file badli nahi', note: 'Files immutable hain (MVCC level). Padhna kabhi likhne se nahi takraata.', good: true },
      ],
      insight: `Snowflake ki speed "fast disk" se nahi, <b>kam padhne</b> se aati hai: metadata se files chhaanto,
        files ke andar sirf zaroori columns. Postgres mein BRIN yahi pehla hissa karta hai.`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: BRIN vs B-tree, kram vs bikhra',
      project: '04-storage',
      exercise: 'ex1-minmax',
      goal: '5 million orders — kram wali aur bikhri table. BRIN ka size, pages padhe, aur chaudi row ka bill khud naapo. MySQL mein clustered PK ka jawaab dekho.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/04-storage\ndocker compose up -d' },
        { text: 'Postgres.', cmd: './run.sh pg sql/ex1-minmax.pg.sql',
          expect: ' table (5M rows) | 249 MB\n B-tree index    | 107 MB\n BRIN index      | 24 kB\n\n ordered  + BRIN   | Bitmap Heap Scan + Bitmap Index Scan |   261 |   6.3\n shuffled + BRIN   | Seq Scan                             | 31872 | 368.8\n ordered  + B-tree | Index Scan                           |   129 |   2.9\n\n range_no | min        | max              range_no | min_shuffled | max_shuffled\n        0 | 2025-01-01 | 2025-01-02              0 | 2025-01-01   | 2025-12-31\n\n wide (22 col)  | 143 MB  | Seq Scan | 18240 | 43.1\n narrow (2 col) | 7168 kB | Seq Scan |   896 | 16.5' },
        { text: 'MySQL.', cmd: './run.sh my sql/ex1-minmax.my.sql',
          expect: '| koi index nahi               |    2000002 |  485 |\n| secondary index (created)    |       5481 |    7 |\n| PK = (created, id) clustered |       5481 |    3 |\n\n| wide (22 col)  |     200002 |  211 |   149.7 |\n| narrow (2 col) |     200002 |   39 |     6.5 |' },
      ],
      observe: {
        q: 'Shuffled table par BRIN hote hue bhi Postgres ne Seq Scan kyun chuna?',
        choices: [
          'Har 128-page range ka min/max 1 Jan – 31 Dec tha — BRIN kisi range ko chhaant hi nahi sakta tha',
          'BRIN index corrupt tha',
          'ANALYZE nahi chala',
          'Postgres BRIN use hi nahi karta',
        ],
        answer: 0,
        explain: 'Section 3 ka output dekho: shuffled ranges sab "2025-01-01 → 2025-12-31". Label kuch nahi batata toh planner seedha poori table padhta hai.',
      },
      lesson: 'BRIN ki jagah: append-only, time ke kram wali badi tables (logs, events, sensor readings). Random updates wali table par nahi.',
    },
    {
      type: 'bins',
      title: 'BRIN yahan kaam karega?',
      instructions: 'Har table ke liye socho: data kram mein aata hai?',
      bins: [
        { id: 'yes', label: '✅ BRIN achha (chhota + kaam ka)' },
        { id: 'no', label: '❌ BRIN bekaar — B-tree lo' },
      ],
      items: [
        { text: 'api_logs — har request ek row, created_at par query', bin: 'yes', explain: 'Rows time ke kram mein judti hain, kabhi update nahi. Har block ka created_at range chhota.' },
        { text: 'sensor_readings — 3 saal, reading_time par range', bin: 'yes', explain: 'Classic BRIN: bada, append-only, time-ordered. B-tree GBs ka hota.' },
        { text: 'users.email par login lookup', bin: 'no', explain: 'Email ka kram insert ke kram se koi lena-dena nahi — har block mein a-z sab. Aur ek row dhoondhni hai: B-tree.' },
        { text: 'orders.customer_id par filter', bin: 'no', explain: 'Ek customer ke orders poori table mein bikhre hain. Min/max har block mein 1 se 10 lakh.' },
        { text: 'payments(created_at) — par purani rows ka status roz UPDATE hota hai', bin: 'no', explain: 'Postgres mein UPDATE = nayi copy nayi jagah (MVCC level) — purane din ki rows naye blocks mein pahunch jaati hain, ranges chaudi ho jaati hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Min/max ki samajh',
      questions: [
        { q: 'BRIN index B-tree se itna chhota kyun hai?', choices: ['Compress hota hai', 'Har row ka pata nahi, sirf har 128 pages ka min aur max rakhta hai', 'Sirf aadhi rows', 'Disk par nahi rehta'], answer: 1, explain: 'Lab: 5M rows par 24 kB vs 107 MB.' },
        { q: 'Snowflake mein analyst <code>SELECT *</code> likhta hai. Sabse bada nuksaan?', choices: ['Koi nahi', 'Columnar ka faayda gaya — 300 columns ke hisse padhne pade, bill zyada', 'Pruning band', 'Query fail'], answer: 1, explain: 'Pruning files chhaant-ta hai; columnar har file ke andar columns. SELECT * doosra lever khatam kar deta hai.' },
        { q: 'MySQL mein BRIN nahi hai. Time-range queries ke liye sabse sasta jugaad?', choices: ['Har column par index', 'PRIMARY KEY (created, id) — InnoDB table khud PK ke kram mein, range query clustered index par', 'Partitioning hamesha', 'Query cache'], answer: 1, explain: 'Lab: 5,481 rows padhi, 3 ms, extra index nahi. Keemat: secondary indexes mein chauda PK.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Min/max aur columnar',
    instructions: 'Data engineering round. 🎤',
    questions: [
      { q: 'Interviewer: "Events table 2 TB, created_at par B-tree 400 GB ka. Kya karoge?"', choices: ['Aur disk', 'Agar events append-only aur time-ordered hain toh BRIN (created_at) — KBs ka index; saath mein retention ke liye partitioning', 'Index hata do', 'MongoDB'], answer: 1, explain: 'BRIN + partitioning = time-series ka sasta combo.' },
      { q: 'Interviewer: "Analytics query Postgres par dheemi — 300 column wali table, query 3 columns. Kya sochoge?"', choices: ['RAM badhao', 'Row store poori rows padhta hai — covering index ya summary table; bada analytics = columnar store (warehouse)', 'VACUUM FULL', 'Isolation level'], answer: 1, explain: 'OLTP aur OLAP alag bane hain. Row store mein 3 columns ke liye bhi poori row.' },
    ],
  },
  success: [
    'Main min/max pruning (Snowflake metadata, BRIN) ko "data kahan nahi hai" se samjha sakta hoon',
    'Main bata sakta hoon BRIN kab kaam karta hai aur kab bilkul bekaar',
    'Main row store vs columnar ka farak aur SELECT * ka bill samjha sakta hoon',
    'Maine asli DB par BRIN aur clustered PK ke numbers naape hain',
  ],
  homework: `<pre>-- Apni sabse badi append-only table par:
CREATE INDEX CONCURRENTLY ON api_logs USING brin (created_at);
SELECT pg_size_pretty(pg_relation_size('api_logs_created_at_idx'));
-- correlation 1 ke paas = kram achha (BRIN kaam karega)
SELECT attname, correlation FROM pg_stats WHERE tablename = 'api_logs';</pre>`,
  cards: [
    { front: 'Index vs min/max — ek line?', back: 'Index batata hai data <b>kahan hai</b>. Min/max batata hai data <b>kahan nahi hai</b>.' },
    { front: 'BRIN kab bekaar?', back: 'Jab data kram mein nahi — har block ka min/max poora range. (pg_stats.correlation 0 ke paas.)' },
    { front: 'Columnar store ka faayda?', back: 'Sirf maange gaye columns padho + ek column mein milte-julte values = achha compression. Analytics ke liye.' },
    { front: 'MySQL mein BRIN jaisa faayda?', back: 'PRIMARY KEY ke aage range column — InnoDB table PK ke kram mein (clustered).' },
  ],
},

/* =====================================================================
   I7 — Ordering (fractional index) + live summary (views)
   ===================================================================== */
{
  id: 'db-ordering-views',
  icon: '🧷',
  title: 'Drag Karke Beech Mein Rakho — Aur Live Summary',
  badge: 'Kram Ka Karigar',
  objectives: [
    '<b>Fractional indexing:</b> drag-and-drop mein 9,998 rows ki jagah 1 row likho — aur precision khatam hone ka jaal',
    '<b>Materialized view</b> vs <b>summary table + trigger</b> vs seedhi query — kab kaunsa',
    'MySQL mein materialized view nahi — uska jawaab',
    'Live summary ka asli bill: baasi data ya dheeme writes',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>TaskBoard</b> (Airtable / Trello jaisa). 10,000 tasks. User ne aakhri task <b>drag karke 3rd position</b> par daala.
     Table mein <code>position int</code> hai — toh 3rd aur uske neeche ki <b>9,998 rows</b> ka position +1 karna pada.
     Ek drag = 9,998 row writes, 2 MB WAL. Aur do log ek saath drag karein toh locks ka jhagda.</p>

     <h3>🧷 Fractional indexing — beech ka number</h3>
     <p>Position ko integer mat rakho — <b>decimal</b> rakho. Task 2 aur task 3 ke beech rakhna hai? Position = <b>2.5</b>.
     Phir 2 aur 2.5 ke beech? <b>2.25</b>. Sirf ek row likhi. Lab 04 (ex3):</p>
     <pre>tareeka                              rows_likhi   wal
integer pos (sab ko renumber)        9998         2237 kB
fractional pos (2 aur 3 ka beech)    1            72 bytes</pre>
     <p><b>Jaal:</b> float8 / DOUBLE mein sirf ~52 baar aadha kar sakte ho. Lab: 52 baar "2 ke theek baad" daalne ke baad beech ka number
     <b>2 hi nikla</b> — do tasks ki position barabar, kram toota.</p>
     <pre>kitni_baar_chala | a | b                  | beech_ka
              52 | 2 | 2.0000000000000004 | 2</pre>
     <p class="tip">🎯 <b>Ilaaj:</b> kabhi-kabhi (raat ko, ya jab gap bahut chhota ho) poori list ko 1, 2, 3… se <b>rebalance</b> karo.
     Ya string keys ("a", "an", "b") jo lambi ho sakti hain par khatam nahi hoti.</p>`,

    `<h3>📊 Live summary — teen tareeke</h3>
     <p>Dashboard: "har city ki kamaai". Orders table 10 crore rows.</p>
     <table>
       <tr><th>Tareeka</th><th>Padhna</th><th>Taazgi</th><th>Keemat</th></tr>
       <tr><td>1. Seedhi query</td><td>har baar poori table</td><td>✅ taaza</td><td>dashboard khula = DB par bojh</td></tr>
       <tr><td>2. <b>Materialized view</b> + REFRESH</td><td>✅ turant</td><td>❌ aakhri REFRESH jitna baasi</td><td>har REFRESH = poori query dobara</td></tr>
       <tr><td>3. <b>Summary table + trigger</b></td><td>✅ turant</td><td>✅ taaza</td><td>har INSERT dheema + ek summary row par sab ka lock</td></tr>
     </table>
     <p>Lab 04 (1M orders, phir 10,000 naye):</p>
     <pre>                       Postgres     MySQL
seedhi query             35.8 ms      137 ms
MV / snapshot REFRESH    66.8 ms      907 ms
5000 INSERT bina trigger   16 ms       60 ms
5000 INSERT + trigger     271 ms      164 ms

Delhi: asli 125567931 · MV 124567931 (baasi) · trigger 125567931 (taaza)</pre>
     <ul>
       <li>Postgres <code>REFRESH MATERIALIZED VIEW CONCURRENTLY</code> padhne walon ko nahi rokta — par <b>unique index</b> maangta hai
         (lab mein error dekha).</li>
       <li><b>MySQL mein materialized view hota hi nahi.</b> Apni snapshot table + cron, ya trigger wali summary table.</li>
       <li>Airtable ka naya engine yahi "incremental" kaam memory mein karta hai: har write par sirf badlaav ka hisaab, poori query dobara nahi.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'flow',
      title: '🎬 Dry run: beech-beech mein daalte raho',
      instructions: 'Ek-ek kadam. Positions dekho.',
      scenario: 'List: A (1), B (2), C (3). User baar-baar naya task <b>B ke theek baad</b> daalta hai.',
      lanes: [
        { id: 'user', label: '🖱️ User' },
        { id: 'db', label: '🗄️ tasks.pos (float8)' },
        { id: 'job', label: '🌙 Raat ka job' },
      ],
      state: n => [
        { k: 'B aur agle task ka gap', v: n < 2 ? '1' : (n < 3 ? '0.5' : (n < 4 ? '0.25' : (n < 6 ? '0.0000000000000004' : (n < 7 ? '0 ❌' : '1 ✅')))) },
      ],
      steps: [
        { lane: 'user', t: 'X ko B aur C ke beech drag', note: 'Beech ka number: (2 + 3) / 2 = 2.5.' },
        { lane: 'db', t: 'UPDATE tasks SET pos = 2.5 WHERE id = X', note: 'Sirf ek row. Baaki 9,999 tasks ko chhua bhi nahi.', good: true },
        { lane: 'db', t: 'Y ko B aur X ke beech → pos 2.25', note: 'Har baar gap aadha hota hai.' },
        { lane: 'user', t: '…50 baar aur "B ke theek baad"', note: 'Gap: 1, 0.5, 0.25, … float8 mein ~52 aadhe tak hi jagah hai.' },
        { lane: 'db', t: 'gap = 0.0000000000000004', note: 'Ab beech ka number 2 aur 2.0000000000000004 ke beech — float8 mein aisa koi number hai hi nahi.', bad: true,
          ask: {
            q: 'Agle drag par (2 + 2.0000000000000004) / 2 ka jawab kya aayega?',
            choices: ['2 — yaani B ki hi position, do tasks barabar', '2.0000000000000002', 'Error', '2.5'],
            answer: 0,
            explain: 'Lab 04 ne yahi dikhaya: 52 baar ke baad beech_ka = 2. Ab ORDER BY pos se do tasks ka kram tay nahi.',
          } },
        { lane: 'db', t: 'Do tasks ki pos = 2 → kram gadbad', note: 'User ko task upar-neeche kudte dikhenge.', bad: true },
        { lane: 'job', t: 'Rebalance: poori list ko 1, 2, 3, … se dobara', note: 'Ek baar saari rows likho (raat ko, ya jab gap bahut chhota ho). Phir se 52 aadhe ki jagah.', good: true,
          ask: {
            q: 'Rebalance ke waqt user drag kar raha ho toh?',
            choices: [
              'Rebalance ek transaction mein ho (ya list lock ho) — warna aadha purana, aadha naya kram dikhega',
              'Kuch nahi hoga',
              'Rebalance kabhi mat karo',
              'Har drag par rebalance karo',
            ],
            answer: 0,
            explain: 'Rebalance kai rows badalta hai — ek transaction mein karo taaki readers ko ya poora purana kram dikhe ya poora naya.',
          } },
        { lane: 'user', t: 'Agla drag phir se sirf 1 row likhta hai', note: 'Rebalance ke baad har gap wapas 1 — aur 52 aadhe ki jagah.', good: true },
      ],
      insight: `Fractional indexing = <b>aam din sasta</b> (1 row), <b>kabhi-kabhi mehenga</b> (rebalance). Integer renumbering = har drag mehenga.
        Yahi trade-off Figma jaise tools ne string keys se sulzhaaya.`,
    },
    {
      type: 'slider',
      title: '🎚️ Lab: materialized view kitni der mein refresh?',
      instructions: 'Knob ghumao — dashboard kitna baasi, DB par kitna bojh.',
      scenario: `10 crore orders. Ek <code>REFRESH MATERIALIZED VIEW</code> = <b>20 second</b> ka poora kaam.
        Sales team kehti hai: dashboard <b>10 minute</b> se zyada purana na ho. DBA kehta hai: refresh DB ka <b>5%</b> se zyada na khaaye.`,
      knobs: [
        { id: 'every', label: 'REFRESH har kitne minute', min: 1, max: 30, step: 1, value: 1 },
      ],
      readouts: [
        { id: 'stale', label: 'Dashboard sabse zyada kitna purana', unit: 'min', fn: v => v.every, good: x => x <= 10 },
        { id: 'load', label: 'Refresh ka DB bojh', unit: '%', fn: v => mvLoad(v), good: x => x <= 5 },
      ],
      bar: v => ({ pct: Math.min(100, mvLoad(v) * 3), bad: mvLoad(v) > 5 || v.every > 10, label: `${v.every} min · ${mvLoad(v)}% bojh` }),
      verdict: v => {
        if (mvLoad(v) > 5) return { tone: 'bad', text: `🔥 Har ${v.every} min mein 20 second ki poori query = DB ka <b>${mvLoad(v)}%</b> sirf refresh mein.` };
        if (v.every > 10) return { tone: 'warn', text: `⚠️ DB aaram mein hai, par dashboard <b>${v.every} minute</b> purana ho sakta hai.` };
        return { tone: 'good', text: '✅ Dono sharten poori. (Aur taaza chahiye? Tab trigger wali summary table — writes ki keemat par.)' };
      },
      goal: { text: 'Taazgi <b>≤ 10 min</b> aur bojh <b>≤ 5%</b>.', check: (v, r) => r.stale <= 10 && r.load <= 5 },
      insight: `Materialized view ka knob <b>taazgi vs bojh</b> hai. Dono sharten na bane (jaise "1 minute taaza" + "5% bojh")
        toh MV galat auzaar hai — tab incremental (trigger / stream) summary chahiye.`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: renumber vs fractional, MV vs trigger',
      project: '04-storage',
      exercise: 'ex3-order-views',
      goal: 'Drag ka bill, float8 ki hadd, aur live summary ke teeno tareeke dono engines par naapo.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/04-storage\ndocker compose up -d' },
        { text: 'Postgres.', cmd: './run.sh pg sql/ex3-order-views.pg.sql',
          expect: ' integer pos (sab ko renumber)     |       9998 | 2237 kB\n fractional pos (2 aur 3 ka beech) |          1 | 72 bytes\n\n kitni_baar_chala | a |         b          | beech_ka\n               52 | 2 | 2.0000000000000004 |        2\n\nERROR:  cannot refresh materialized view "public.city_revenue_mv" concurrently\nHINT:  Create a unique index with no WHERE clause on one or more columns of the materialized view.\n\n 5000 INSERT, bina trigger     |  16\n 5000 INSERT, trigger ke saath | 271\n\n asli (poori query)                      | 125567931\n materialized view (aakhri REFRESH wala) | 124567931\n summary table + trigger                 | 125567931' },
        { text: 'MySQL.', cmd: './run.sh my sql/ex3-order-views.my.sql',
          expect: '| integer pos (sab ko renumber)     |       9998 |\n| fractional pos (2 aur 3 ka beech) |          1 |\n|               52 |    2 | 2.0000000000000004 |        2 |\n\n| tareeka 1: har baar poori query                 |  137 |\n| tareeka 2: snapshot table REFRESH (poori query) |  907 |\n| 5000 INSERT, bina trigger                       |   60 |\n| 5000 INSERT, trigger ke saath                   |  164 |' },
      ],
      observe: {
        q: 'Trigger wali summary table hamesha taaza thi. Phir bhi flash sale mein woh khatarnak kyun ho sakti hai?',
        choices: [
          'Har "Delhi" order usi ek summary row ko UPDATE karta hai — saare INSERT us row ke lock par line mein',
          'Trigger data kho deta hai',
          'Summary table bahut badi ho jaati hai',
          'Trigger sirf MySQL mein chalta hai',
        ],
        answer: 0,
        explain: 'Hot row = locks level wali line. Ilaaj: summary ko kai rows mein baanto (city + shard), ya events queue se batch mein jodo.',
      },
      lesson: 'Taaza summary ki keemat writes chukate hain. Baasi summary ki keemat readers. Business se poocho kaun sa bill manzoor hai.',
    },
    {
      type: 'bins',
      title: 'Kaunsa tareeka?',
      instructions: 'Har dashboard / feature ke liye sahi tareeka chuno.',
      bins: [
        { id: 'query', label: '🔍 Seedhi query (index ke saath)' },
        { id: 'mv', label: '🗃️ Materialized view / snapshot + REFRESH' },
        { id: 'trig', label: '⚡ Summary table + trigger (hamesha taaza)' },
      ],
      items: [
        { text: 'Admin page: ek customer ke pichhle 10 orders', bin: 'query', explain: 'Chhota, index wala sawaal. Save karne ki zaroorat nahi.' },
        { text: 'CEO ka monthly revenue dashboard — din mein 3 baar dekhte hain', bin: 'mv', explain: 'Bhaari query, thoda baasi chalega. Har ghante REFRESH.' },
        { text: 'Wallet balance — har transaction ke turant baad sahi', bin: 'trig', explain: 'Paisa baasi nahi dikh sakta. Balance ek row mein, har ledger entry ke saath (same transaction) update.' },
        { text: 'Leaderboard — top 100, 5 minute purana OK', bin: 'mv', explain: 'Poori ranking bhaari hai; 5 minute ka REFRESH kaafi.' },
        { text: 'Product page par "stock bacha" — oversell nahi hona chahiye', bin: 'trig', explain: 'Stock hamesha taaza aur atomic hona chahiye — ek row, same transaction mein ghatao (locks level ka atomic UPDATE).' },
      ],
    },
    {
      type: 'quiz',
      title: 'Kram aur summary ki samajh',
      questions: [
        { q: 'Fractional indexing mein ek drag kitni rows likhta hai?', choices: ['Saari neeche wali', 'Sirf 1 (jo row drag hui)', '2', 'Poori table'], answer: 1, explain: 'Lab: 9998 vs 1 rows, 2237 kB vs 72 bytes WAL.' },
        { q: 'float8 position ke saath "ek hi jagah" kitni baar daal sakte ho?', choices: ['Anant', '~52 baar — phir beech ka number kinaare ke barabar', '10', '1000'], answer: 1, explain: 'float8 mein 52 bit mantissa. Ilaaj: rebalance ya string keys.' },
        { q: '<code>REFRESH MATERIALIZED VIEW CONCURRENTLY</code> kya maangta hai?', choices: ['Superuser', 'MV par unique index', 'Partitioning', 'Kuch nahi'], answer: 1, explain: 'CONCURRENTLY naye aur purane result ko row-by-row milaata hai — pehchaan ke liye unique index chahiye.' },
        { q: 'MySQL mein materialized view chahiye. Kya karoge?', choices: ['CREATE MATERIALIZED VIEW', 'Apni summary table: cron se REFRESH (INSERT … SELECT) ya trigger se incremental', 'VIEW hi materialized hota hai', 'Namumkin'], answer: 1, explain: 'MySQL VIEW sirf saved query hai — har baar chalta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Ordering & views',
    instructions: 'Product engineering round. 🎤',
    questions: [
      { q: 'Interviewer: "Kanban board ka card order kaise store karoge?"', choices: ['Integer position, har move par renumber', 'Fractional / string position — ek move = ek row; gap khatam hone par us column ka rebalance', 'Poori list ek JSON mein', 'created_at se sort'], answer: 1, explain: 'Renumbering = har drag par sainkdon writes aur locks. Fractional + kabhi-kabhi rebalance.' },
      { q: 'Interviewer: "Dashboard 30 second mein load hota hai. Pehle kya?"', choices: ['Bada server', 'Pehle poocho kitna taaza chahiye — agar minutes baasi chalega toh materialized view / snapshot; seconds mein taaza chahiye toh incremental summary', 'Cache hamesha', 'Index sab par'], answer: 1, explain: 'Taazgi ki zaroorat hi tareeka tay karti hai.' },
    ],
  },
  success: [
    'Main fractional indexing aur uski precision ki hadd (rebalance) samjha sakta hoon',
    'Main MV, trigger summary aur seedhi query mein se taazgi vs bojh dekh ke chun sakta hoon',
    'Main MySQL mein MV ka jawaab jaanta hoon',
    'Maine asli DB par renumber vs fractional aur MV vs trigger naapa hai',
  ],
  homework: `<p>Apne project mein koi "sort order" column dhoondo (menu items, playlist, board). Drag par kitni rows update hoti hain?
    Ek fractional version likho aur rebalance ka SQL bhi:</p>
    <pre>UPDATE tasks t SET pos = r.rn
FROM (SELECT id, row_number() OVER (ORDER BY pos) AS rn FROM tasks WHERE board_id = 7) r
WHERE t.id = r.id;</pre>`,
  cards: [
    { front: 'Fractional indexing ek line mein?', back: 'Do positions ke <b>beech ka number</b> — ek drag = ek row. Gap khatam → <b>rebalance</b>.' },
    { front: 'Materialized view ka bill?', back: 'Padhna turant, par <b>baasi</b>; REFRESH = poori query dobara. CONCURRENTLY ke liye unique index.' },
    { front: 'Trigger summary table ka bill?', back: 'Hamesha taaza, par har write dheema + ek summary row <b>hot-spot</b> (lock line).' },
    { front: 'MySQL mein materialized view?', back: 'Nahi hota. Snapshot table + cron, ya trigger se incremental summary.' },
  ],
},

]);
})();
