/* =====================================================================
   TRACK 5 — 🔬 Database Internals · file 1/6
   db-wal · db-checkpoint
   Video: Ben Dicken (PlanetScale) — "WAL: write-ahead log" (s3hKYMOpp3E)
   Lab:   docker-labs/01-wal  (asli Postgres 16 + MySQL 8, numbers README mein)

   Poori file IIFE mein hai — data-scale.js jaise files top-level par
   `const allOf` wagairah declare karti hain; yahan kuch bhi global nahi.
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   Cost model — slider aur quiz dono isi par chalte hain.
   Ek transaction ka time = rows × 0.01 ms (memory ka kaam)
                          + fsync_ms  (sirf tab jab durability "safe" ho)
   Lab 01 ka asli number: Postgres 5000 commits / 4436 ms ≈ 0.9 ms per fsync.
   --------------------------------------------------------------------- */
const ROW_MS = 0.01;
const txnMs = v => v.batch * ROW_MS + (v.relaxed ? 0 : v.fsync);
const rowsPerSec = v => Math.round(v.batch * 1000 / txnMs(v));
const lossMs = v => (v.relaxed ? 600 : 0);

/* checkpoint model — 10 MB/s WAL likhne wali app, 20,000 "garam" pages (160 MB)
   har checkpoint ke baad pehli baar chhune par POORA page WAL mein jaata hai */
const HOT_MB = 160, REPLAY_MBps = 100;
const walBacklogMb = v => v.rate * 60 * v.every;
const recoverySec = v => Math.round(walBacklogMb(v) / REPLAY_MBps);
const fpiPct = v => Math.round((HOT_MB / v.every) / (v.rate * 60) * 100);

VISUALS['db-wal'] = {
  t: 'WAL — pehle diary, phir almari',
  html: `
    <div class="dg-flow">
      <div class="dg-node is-accent" data-hs="app"><span class="ni">📱</span><span class="nl">App</span><span class="ns">UPDATE … ₹500</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node" data-hs="buffer"><span class="ni">🧠</span><span class="nl">Memory</span><span class="ns">page badla = dirty</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-good" data-hs="wal"><span class="ni">📒</span><span class="nl">WAL / redo log</span><span class="ns">1 line + fsync</span></div>
      <div class="dg-arrow good flow"></div>
      <div class="dg-node is-good" data-hs="ok"><span class="ni">✅</span><span class="nl">COMMIT OK</span><span class="ns">ab bijli jaaye toh bhi pakka</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <div class="dg-node is-muted" data-hs="later"><span class="ni">🗄️</span><span class="nl">Data files</span><span class="ns">dirty page — baad mein</span></div>
    </div>
    <div class="dg-cap">Client ko jawab <b>diary (WAL) pakki hone ke baad</b> milta hai — data files ka kaam
      seconds ya minutes baad hota hai. Postgres ise <b>WAL</b> kehta hai, MySQL InnoDB <b>redo log</b>.</div>`,
};

VISUALS['db-checkpoint'] = {
  t: 'Checkpoint — diary mein ek line kheencho',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">WAL …</span>
      <span class="dg-pill good" data-hs="ckpt">✂️ CHECKPOINT (yahan tak sab data files mein)</span>
      <span class="dg-pill acc" data-hs="replay">entry 1</span>
      <span class="dg-pill acc">entry 2</span>
      <span class="dg-pill acc">entry 3</span>
      <span class="dg-pill bad" data-hs="crash">💥 crash</span>
    </div>
    <div class="dg-cap">Restart par database sirf <b>checkpoint ke baad</b> wali entries dobara chalata hai
      (<code>redo starts at …</code> → <code>redo done at …</code>). Checkpoint ke pehle ka WAL
      <b>recycle</b> ho jaata hai.</div>
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">⏱️ Checkpoint bahut jaldi-jaldi</span>
        <div class="dg-cap">recovery tez ✅<br>par har baar garam pages <b>poore</b> WAL mein (full page write) ❌</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🐢 Checkpoint bahut der se</span>
        <div class="dg-cap">kam likhna ✅<br>par crash ke baad <b>minutes</b> tak replay + WAL disk bharti ❌</div></div>
    </div>`,
};

SG.registerLevels('internals', [

/* =====================================================================
   I1 — WAL / redo log
   ===================================================================== */
{
  id: 'db-wal',
  icon: '📒',
  title: 'WAL — "Success" Dikhaya, Phir Bijli Gayi',
  badge: 'Bahi-Khata Baba',
  objectives: [
    '<b>COMMIT OK</b> milne ke baad bijli jaaye toh bhi data kaise bachta hai',
    'Ek UPDATE ke andar ka poora kram: memory → WAL → fsync → jawab → data file',
    'MySQL (redo log + binlog) aur Postgres (WAL) — naam alag, kaam ek',
    'Durability ki setting kab dheeli kar sakte ho — aur uski asli keemat',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>PaisaPay</b> wallet app. Riya ne Aman ko <b>₹500</b> bheje. App ne "✅ Success" dikhaya.
     2 second baad data center ki <b>bijli chali gayi</b>.</p>
     <p>Restart ke baad Riya ka balance kya hona chahiye? <b>₹500 kam.</b> Kyunki app ne "Success" bol diya tha —
     database ne ek <b>vaada</b> kiya tha.</p>
     <p>Mushkil: database ki table disk par ek B-tree hai. Ek chhota sa UPDATE bhi disk par kai jagah
     likhta hai — table ka page, har index ka page. 5 indexes = 6 alag jagah <b>random</b> writes.
     Har COMMIT par itna likhna bahut dheema hai.</p>

     <h3>🏪 Misaal: Sharma ji ki dukaan</h3>
     <p>Sharma ji ke paas do cheezein hain:</p>
     <table>
       <tr><th></th><th>📒 Bahi-khata (diary)</th><th>🗄️ Almari ki files</th></tr>
       <tr><td>Kya hai</td><td>har len-den ki ek line, hamesha <b>aakhri page ke neeche</b></td><td>har customer ki alag file</td></tr>
       <tr><td>Likhne ka time</td><td>5 second</td><td>2 minute (file dhoondho, kholo, badlo)</td></tr>
     </table>
     <p>Rush ke waqt Sharma ji pehle <b>bahi-khata mein ek line</b> likhte hain aur customer ko "ho gaya" bolte hain.
     Almari ki files raat ko update hoti hain. Bijli gayi? Sharma ji bahi-khata padh ke files theek kar lete hain.</p>
     <p class="tip">🎯 <b>Asli baat:</b> database bhi yahi karta hai. Bahi-khata = <b>WAL</b> (write-ahead log).
     Almari = <b>data files</b>. Client ko jawab <b>WAL disk par pakka hone ke baad</b> milta hai, data files baad mein.</p>`,

    `<h3>🔍 Ek UPDATE ke andar — kadam dar kadam</h3>
     <pre>UPDATE wallets SET balance = balance - 500 WHERE user_id = 38;
COMMIT;</pre>
     <ol>
       <li><b>Page memory mein:</b> database Riya ki row wala page disk se memory mein laata hai
         (Postgres: <code>shared_buffers</code>, MySQL: <code>buffer pool</code>).</li>
       <li><b>Memory mein badlaav:</b> balance 2000 → 1500. Ab memory wala page disk wale page se alag hai —
         is page ko <b>dirty page</b> kehte hain.</li>
       <li><b>WAL mein ek line:</b> sirf badlaav — "page X, row 38, balance 1500". Poori table nahi, poora page nahi.
         Lab 01 mein ek row ka UPDATE = <b>344 bytes</b> WAL. Har line ko ek number milta hai: <b>LSN</b>.</li>
       <li><b>fsync:</b> database operating system ko bolta hai "WAL file ko disk par pakka karo, cache mein mat rakho".
         Disk "ho gaya" bolti hai.</li>
       <li><b>COMMIT OK</b> client ko jaata hai. Ab bijli jaaye toh WAL disk par hai.</li>
       <li><b>Baad mein</b> (seconds / minutes): dirty page data file mein likha jaata hai.</li>
     </ol>
     <table>
       <tr><th></th><th>MySQL (InnoDB)</th><th>Postgres</th></tr>
       <tr><td>Diary ka naam</td><td><b>redo log</b> (+ alag <b>binlog</b> replication ke liye)</td><td><b>WAL</b> (<code>pg_wal/</code>, 16 MB ki files)</td></tr>
       <tr><td>Page size</td><td>16 kB</td><td>8 kB</td></tr>
       <tr><td>Durability knob</td><td><code>innodb_flush_log_at_trx_commit</code> (1 / 2 / 0) + <code>sync_binlog</code></td><td><code>synchronous_commit</code> (on / off)</td></tr>
       <tr><td>Har COMMIT par fsync</td><td>2 (redo + binlog) jab dono = 1</td><td>1</td></tr>
     </table>
     <p class="tip">🎯 Indexes ka bill bhi yahin aata hai: lab 01 mein 50,000 rows — 0 index = <b>6 MB</b> WAL,
     5 indexes = <b>28 MB</b> WAL. Har index ek aur B-tree hai, aur har B-tree ka badlaav WAL mein jaata hai.</p>`,

    `<h3>⚖️ Durability dheeli karna — kab theek, kab kabhi nahi</h3>
     <p>Lab 01 ke asli numbers (5,000 alag-alag COMMIT):</p>
     <table>
       <tr><th>Setting</th><th>Commits/sec</th><th>Crash par kya ja sakta hai</th></tr>
       <tr><td>Postgres <code>synchronous_commit = on</code></td><td>1,127</td><td>kuch nahi</td></tr>
       <tr><td>Postgres <code>synchronous_commit = off</code></td><td>100,000</td><td>aakhri ~0.6 second ke commits</td></tr>
       <tr><td>MySQL <code>flush_log=1, sync_binlog=1</code></td><td>155</td><td>kuch nahi</td></tr>
       <tr><td>MySQL <code>flush_log=2, sync_binlog=0</code></td><td>9,078</td><td>aakhri ~1 second ke commits</td></tr>
     </table>
     <p><b>Faisla kaise lo:</b></p>
     <ul>
       <li>💸 <b>Paisa, order, booking</b> — setting kabhi dheeli nahi. "Success" bola toh data pakka.</li>
       <li>📊 <b>Click events, analytics, cache jaisi tables</b> — 1 second ka data khona chalta hai → dheeli setting theek.
         (Postgres mein <code>synchronous_commit</code> <b>ek session ya ek transaction</b> ke liye bhi badal sakte ho —
         poore server ke liye nahi.)</li>
       <li>🧺 <b>Pehle batching try karo:</b> 1,000 rows ek transaction mein = 1 fsync. Data bhi safe, speed bhi.</li>
     </ul>
     <div class="war-story"><b>⚡ Real pattern:</b> ek team ne "database slow hai" sun ke MySQL par
     <code>innodb_flush_log_at_trx_commit = 0</code> kar diya — speed 50× badhi. Mahino baad ek kernel panic hua aur
     aakhri second ke <b>payment records</b> gayab mile, jabki payment gateway ne paisa kaat liya tha.
     Asli ilaaj tha: 1-1 row ki jagah <b>batch mein INSERT</b>.</div>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: fsync ka bill — speed bhi, data bhi',
      instructions: 'Knobs ghumao. Numbers turant badlenge.',
      scenario: `PaisaPay ki <b>transactions ledger</b> table. Har second <b>20,000 rows</b> likhni hain.
        Abhi app har row ke baad COMMIT karti hai (batch = 1), durability <b>safe</b> hai,
        aur disk ka ek fsync <b>1 ms</b> leta hai.`,
      knobs: [
        { id: 'batch', label: 'Ek transaction mein kitni rows (batch)', min: 1, max: 200, step: 1, value: 1,
          help: '1 = har row ke baad COMMIT' },
        { id: 'relaxed', label: 'Durability: 0 = safe (fsync har COMMIT), 1 = dheeli', min: 0, max: 1, step: 1, value: 0 },
        { id: 'fsync', label: 'Disk ka ek fsync', min: 0.2, max: 8, step: 0.2, value: 1, unit: 'ms',
          help: 'NVMe ≈ 0.2 ms · cloud disk ≈ 1–2 ms · purani disk ≈ 8 ms' },
      ],
      readouts: [
        { id: 'txn', label: 'Ek transaction ka time', unit: 'ms', fn: v => Math.round(txnMs(v) * 100) / 100 },
        { id: 'rps', label: 'Rows likhi / second', unit: '', fn: v => rowsPerSec(v),
          good: x => x >= 20000, sub: x => x >= 20000 ? 'target poora' : 'target: 20,000' },
        { id: 'loss', label: 'Crash par kho sakte hain', unit: 'ms ke commits', fn: v => lossMs(v),
          good: x => x === 0, sub: x => x === 0 ? 'kuch nahi — har COMMIT disk par pakka' : '⚠️ "Success" bola, phir bhi data gaya' },
      ],
      bar: v => { const r = rowsPerSec(v); return { pct: Math.min(100, r / 200), bad: r < 20000 || lossMs(v) > 0, label: `${r.toLocaleString('en-IN')} rows/s` }; },
      verdict: v => {
        if (v.relaxed) return { tone: 'bad', text: '🔥 <b>Durability dheeli karke speed mili</b> — par yeh ledger hai. Crash par aakhri ~0.6 second ke payments gayab, jabki user ko "Success" dikh chuka hai.' };
        if (rowsPerSec(v) < 20000) return { tone: 'warn', text: `⚠️ Har transaction mein ${v.fsync} ms ka fsync hai. Batch ${v.batch} par sirf ${rowsPerSec(v).toLocaleString('en-IN')} rows/s. <b>Ek fsync mein zyada rows</b> bhejo.` };
        return { tone: 'good', text: '✅ <b>Batching ne kaam kiya:</b> fsync utne hi hain jitne transactions — par ab har fsync ke saath bahut saari rows pakki hoti hain. Data safe, speed poori.' };
      },
      goal: { text: '<b>20,000 rows/s</b> — aur crash par <b>0</b> data loss.', check: (v, r) => r.rps >= 20000 && r.loss === 0 },
      wrongWay: v => v.relaxed === 1,
      insight: `fsync ka kharch <b>har transaction</b> par lagta hai, har row par nahi.
        Isliye pehla kadam hamesha <b>batching</b> hai (multi-row INSERT, ek transaction mein 100–1000 rows).
        Durability dheeli karna aakhri hathiyar hai — aur sirf un tables ke liye jahan 1 second ka data khona chalta hai.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: ₹500 ka UPDATE, phir bijli gayi',
      instructions: 'Ek-ek kadam chalao. Beech mein do sawaal aayenge.',
      scenario: 'Riya (user 38) ka balance ₹2000 hai. Riya ₹500 bhejti hai.',
      lanes: [
        { id: 'app', label: '📱 App' },
        { id: 'mem', label: '🧠 Memory (buffer)' },
        { id: 'wal', label: '📒 WAL (disk)' },
        { id: 'data', label: '🗄️ Data file (disk)' },
      ],
      state: n => [
        { k: 'memory mein balance', v: n >= 2 ? '₹1500 (dirty)' : '₹2000' },
        { k: 'WAL mein', v: n >= 3 ? 'LSN 0/4D1A…: row 38 → 1500' : '—' },
        { k: 'data file mein', v: n >= 8 ? '₹1500' : '₹2000' },
      ],
      steps: [
        { lane: 'app', t: 'UPDATE wallets SET balance = balance - 500 WHERE user_id = 38', note: 'Query database tak pahunchi.' },
        { lane: 'mem', t: 'Riya ka page memory mein, balance 2000 → 1500', note: 'Badlaav <b>sirf memory</b> mein hua. Memory wala page ab disk wale page se alag hai — <b>dirty page</b>.' },
        { lane: 'wal', t: 'WAL mein ek chhoti line likhi (~344 bytes)', note: 'WAL mein <b>sirf badlaav</b> jaata hai, poora page nahi. WAL file ke <b>aakhir mein</b> jodna = sequential write, sabse sasta.' },
        { lane: 'app', t: 'COMMIT;', note: 'App ab pakka jawab maang rahi hai.',
          ask: {
            q: 'COMMIT OK bhejne se pehle database ko KAUNSI cheez disk par pakki karni ZAROORI hai?',
            choices: [
              'Sirf WAL ki line (fsync)',
              'Riya ka data page (data file)',
              'WAL bhi aur data page bhi',
              'Kuch nahi — memory kaafi hai',
            ],
            answer: 0,
            explain: 'WAL ki line disk par pakki ho gayi toh crash ke baad database <b>WAL se badlaav dobara</b> kar sakta hai. Data page abhi likhna zaroori nahi — data page ka kaam baad mein, sasta, aur ek saath kai badlaav ke saath hota hai.',
          } },
        { lane: 'wal', t: 'fsync → disk: "pakka"', note: 'Yahi woh ~1 ms hai jo har COMMIT ka bill hai.', good: true },
        { lane: 'app', t: '✅ COMMIT OK — "₹500 bhej diye"', note: 'Vaada ho gaya. Ab database ko yeh vaada kisi bhi haal mein nibhana hai.', good: true },
        { lane: 'data', t: '💥 BIJLI GAYI — memory saaf', note: 'Memory mein jo dirty page tha (₹1500), <b>woh gaya</b>. Data file mein abhi bhi ₹2000 likha hai.', bad: true,
          ask: {
            q: 'Restart ke baad database Riya ka balance kaise theek karega?',
            choices: [
              'WAL padh ke — "row 38 → 1500" wali line data page par dobara lagayega',
              'Riya se dobara payment karwayega',
              'Data file ka ₹2000 hi sahi maanega',
              'Backup se restore karega',
            ],
            answer: 0,
            explain: 'Isi ko <b>crash recovery</b> (redo) kehte hain. WAL mein har committed badlaav hai — database pichhle checkpoint se WAL <b>replay</b> karta hai aur data pages ko wahan le aata hai jahan crash se pehle memory mein the.',
          } },
        { lane: 'data', t: 'Restart → WAL replay → data file mein ₹1500', note: 'Riya ka balance wapas sahi. Lab 01 (ex3) mein yahi asli Postgres par <code>kill -9</code> karke dekhoge.', good: true },
      ],
      insight: `Poora khel ek niyam par tika hai: <b>pehle log, phir jawab, data baad mein</b>.
        Isi niyam ka naam hai <b>write-ahead</b> log. MySQL mein wahi kaam <b>redo log</b> karta hai.`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: WAL ka size aur COMMIT ka bill',
      project: '01-wal',
      exercise: 'ex2-commit-cost',
      goal: 'Apni machine par dekho ki (1) indexes WAL ko kitna badhate hain, aur (2) har COMMIT ka fsync kitna mehnga hai — Postgres aur MySQL dono par.',
      why: 'Slider ka model andaaze par tha. Ab asli number tumhari disk se aayenge.',
      steps: [
        { text: 'Folder mein jaao aur dono databases chalao.', cmd: 'cd sqlgurukul/docker-labs/01-wal\ndocker compose up -d' },
        { text: 'ex1: 50,000 rows, 0 / 1 / 5 indexes — kitna WAL / redo bana?', cmd: './run.sh pg sql/ex1-wal-basics.pg.sql\n./run.sh my sql/ex1-wal-basics.my.sql',
          expect: 'Postgres (WAL)                 MySQL (InnoDB redo log)\n  0 index |  6268 kB             0 index |  6.5 MB\n  1 index |    11 MB             1 index |  8.6 MB\n  5 index |    28 MB             5 index | 16.8 MB\n\nEk UPDATE ka WAL record (sirf badlaav, poori row nahi): 344 bytes' },
        { text: 'ex2: 5,000 alag COMMIT — safe vs dheeli setting.', cmd: './run.sh pg sql/ex2-commit-cost.pg.sql\n./run.sh my sql/ex2-commit-cost.my.sql',
          expect: 'Postgres\n synchronous_commit=on  | 4436 ms |   1,127 commits/sec\n synchronous_commit=off |   50 ms | 100,000 commits/sec\n\nMySQL\n safe    (flush_log_at_trx_commit=1, sync_binlog=1) | 32284 ms |   155 commits/sec\n relaxed (flush_log_at_trx_commit=2, sync_binlog=0) |   551 ms | 9,078 commits/sec' },
      ],
      observe: {
        q: 'MySQL "safe" mode Postgres "on" se lagbhag 7× dheema aaya. Sabse badi wajah kya hai?',
        choices: [
          'MySQL har COMMIT par DO logs pakke karta hai — redo log aur binlog (sync_binlog = 1)',
          'MySQL ka page 16 kB hai isliye',
          'MySQL mein index zyada the',
          'Postgres fsync karta hi nahi',
        ],
        answer: 0,
        explain: 'MySQL mein replication ke liye alag <b>binlog</b> hai. <code>sync_binlog = 1</code> + <code>innodb_flush_log_at_trx_commit = 1</code> = har COMMIT par <b>do</b> fsync (aur beech mein dono logs ko ek saath pakka karne ka kaam). Isiliye MySQL mein batching ka faayda aur bhi bada hai.',
      },
      lesson: 'Numbers tumhari disk par depend karte hain — NVMe par sab tez, cloud disk par dheema. Par <b>pattern</b> hamesha wahi: safe setting = har COMMIT ek fsync ka intezaar.',
    },
    {
      type: 'bins',
      title: 'Kaunsi table, kaunsi setting?',
      instructions: 'Har table ko sahi dabbe mein daalo.',
      bins: [
        { id: 'safe', label: '🔒 Safe (fsync har COMMIT)' },
        { id: 'relax', label: '💨 Dheeli chalegi (1 sec ka loss OK)' },
        { id: 'batch', label: '🧺 Safe rakho, par BATCH mein likho' },
      ],
      items: [
        { text: 'wallet_transactions — har payment', bin: 'safe', explain: 'Paisa. "Success" ke baad data khona = user ka paisa gayab. Setting kabhi dheeli nahi.' },
        { text: 'orders — Swiggy jaisa order place', bin: 'safe', explain: 'User ne order dekh liya, restaurant ko bhej diya — order record khona = jhagda aur refund.' },
        { text: 'page_views — har click ka event', bin: 'relax', explain: 'Crash par 1 second ke clicks gaye toh analytics mein farak nahi padta. Postgres mein sirf is session ke liye <code>SET synchronous_commit = off</code>.' },
        { text: 'search_cache — dobara ban sakti hai', bin: 'relax', explain: 'Cache table source se dobara ban jaati hai. Durability ka bill bekaar hai.' },
        { text: 'Raat ka import: 50 lakh rows CSV se', bin: 'batch', explain: '50 lakh alag COMMIT = 50 lakh fsync. 1,000 rows ek transaction mein = 5,000 fsync. Data bhi safe, speed 100× tak.' },
        { text: 'IoT sensor readings — har second 20,000', bin: 'batch', explain: 'Readings chahiye (billing unse hoti hai), par ek-ek COMMIT disk ko maar dega. App readings ko 100–500 ke batch mein bheje.' },
      ],
    },
    {
      type: 'quiz',
      title: 'WAL ki samajh',
      questions: [
        { q: 'Database client ko "COMMIT OK" kab bhejta hai?', choices: ['Data file mein page likhne ke baad', 'WAL ki line disk par pakki (fsync) hone ke baad', 'Query memory mein chalte hi', 'Agle checkpoint ke baad'], answer: 1, explain: 'WAL pakka = vaada pakka. Data file ka kaam baad mein hota hai.' },
        { q: 'WAL mein ek row ke UPDATE ke liye kya likha jaata hai?', choices: ['Poori table', 'Poora 8 kB page (hamesha)', 'Sirf badlaav — kaunsa page, kaunsi row, naya value', 'Kuch nahi'], answer: 2, explain: 'Lab 01: ek row ka UPDATE = 344 bytes. (Checkpoint ke baad kisi page ko <b>pehli baar</b> chhuo toh Postgres poora page likhta hai — woh agle level mein.)' },
        { q: 'Table par 5 indexes hain. INSERT ka WAL kyun badhta hai?', choices: ['Indexes WAL mein nahi jaate', 'Har index ek alag B-tree hai — har B-tree ka badlaav bhi WAL mein jaata hai', 'WAL mein index ka naam likha jaata hai bas', 'Sirf MySQL mein badhta hai'], answer: 1, explain: 'Lab 01: 0 index = 6 MB, 5 indexes = 28 MB (Postgres). Faltu index = har write par faltu WAL aur faltu disk kaam.' },
        { q: 'MySQL mein "binlog" kis kaam aata hai?', choices: ['Crash recovery', 'Replication aur point-in-time restore (replica aur CDC tools isi ko padhte hain)', 'Query cache', 'Index banane'], answer: 1, explain: 'Crash recovery InnoDB ka <b>redo log</b> karta hai. Binlog server-level log hai — replicas aur Debezium jaise tools binlog padhte hain. Isiliye MySQL mein do logs, do fsync.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — WAL',
    instructions: 'Senior backend interview. Seedha, saaf jawab. 🎤',
    questions: [
      { q: 'Interviewer: "Database har COMMIT par poori table disk par kyun nahi likh deta — seedha aur simple?"', choices: ['Likhta hai, bas cache mein', 'Random writes bahut mehenge hain; WAL ek sequential append hai — ek fsync mein vaada pakka, data pages baad mein ek saath', 'Disk itni badi nahi hoti', 'OS mana karta hai'], answer: 1, explain: 'Ek row ke badlaav ke liye table + har index ke page = kai random I/O. WAL = file ke aakhir mein ek chhoti line + ek fsync.' },
      { q: 'Interviewer: "Bulk import 10× dheema hai, CPU khaali hai. Pehla shak?"', choices: ['CPU kam hai', 'Har row ka alag COMMIT — har COMMIT ek fsync ka intezaar; batch mein likho', 'Network', 'Index zyada hain toh import band karo'], answer: 1, explain: 'Commit latency = fsync latency. CPU khaali aur disk "busy" dikhe toh fsync-bound hone ka pakka lakshan.' },
      { q: 'Interviewer: "synchronous_commit = off karne se kya risk hai — data corruption?"', choices: ['Haan, database kharab ho jaata hai', 'Nahi — database consistent rehta hai, bas aakhri kuch sau ms ke committed transactions kho sakte hain', 'Koi risk nahi', 'Replication band ho jaata hai'], answer: 1, explain: 'Postgres ka <code>synchronous_commit = off</code> corruption nahi karta — sirf "COMMIT OK" aur disk ke beech ka chhota gap. (MySQL <code>innodb_flush_log_at_trx_commit = 2</code> par OS crash mein ~1 second.)' },
    ],
  },
  success: [
    'Main bata sakta hoon ki COMMIT OK se pehle disk par kya pakka hota hai',
    'Main MySQL redo log + binlog aur Postgres WAL ka farak samjha sakta hoon',
    'Main durability setting table ke hisaab se chun sakta hoon — aur pehle batching try karta hoon',
    'Maine asli DB par WAL ka size aur commit ka bill naapa hai',
  ],
  homework: `<p>Apne kisi project ka sabse bada "import" ya "sync" job dhoondo. Kya woh har row ke baad COMMIT karta hai?
    Ek branch mein use 500 rows ke batch mein badlo aur time naapo.</p>
    <pre>-- Postgres: abhi kitna WAL ban raha hai?
SELECT pg_current_wal_lsn();          -- 1 minute baad dobara chalao
SELECT pg_size_pretty(pg_wal_lsn_diff('&lt;baad wala&gt;', '&lt;pehle wala&gt;'));</pre>`,
  cards: [
    { front: 'WAL ka poora niyam ek line mein?', back: '<b>Pehle log (fsync), phir client ko jawab, data pages baad mein.</b>' },
    { front: 'Dirty page kya hai?', back: 'Memory wala page jo badal gaya hai par abhi data file mein nahi likha gaya. Crash mein dirty page ka badlaav WAL se wapas aata hai.' },
    { front: 'MySQL mein har COMMIT par do fsync kyun?', back: '<b>redo log</b> (crash recovery) + <b>binlog</b> (replication) — <code>innodb_flush_log_at_trx_commit=1</code> aur <code>sync_binlog=1</code>.' },
    { front: 'Import dheema hai, CPU khaali — pehla ilaaj?', back: '<b>Batching</b>: 100–1000 rows ek transaction mein. fsync har transaction par lagta hai, har row par nahi.' },
    { front: 'Postgres mein durability sirf ek kaam ke liye dheeli kaise karein?', back: '<code>SET synchronous_commit = off</code> — session ya transaction level par. Server-wide nahi.' },
  ],
},

/* =====================================================================
   I2 — Checkpoint & crash recovery
   ===================================================================== */
{
  id: 'db-checkpoint',
  icon: '✂️',
  title: 'Checkpoint — Diary Kitni Lambi Padhni Padegi?',
  badge: 'Line Kheenchne Wala',
  objectives: [
    'Checkpoint kya pakka karta hai — aur crash ke baad kitna WAL dobara chalta hai',
    'Checkpoint ka dono taraf ka bill: jaldi-jaldi = zyada likhna, der se = lambi recovery',
    'Postgres full page writes aur MySQL redo log capacity — do alag jaal',
    'Crash ke waqt adhoori transaction ka kya hota hai (Postgres vs MySQL)',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p>Sharma ji ki bahi-khata <b>10 saal</b> purani ho gayi. Bijli gayi. Ab almari theek karne ke liye kya
     <b>10 saal ki diary</b> padhni padegi? Dukaan subah tak band rahegi.</p>
     <p>Isliye Sharma ji har raat bahi-khata mein ek <b>line kheenchte</b> hain: "yahan tak ki saari entries almari
     ki files mein pahunch gayi". Bijli jaaye toh sirf <b>line ke baad</b> ki entries padhni hain. Line ke pehle ke
     pages phaad ke dobara use kar sakte hain.</p>
     <p class="tip">🎯 <b>Asli baat:</b> database mein yeh line = <b>checkpoint</b>. Checkpoint ke waqt database saare
     dirty pages data files mein likhta hai. Crash ke baad replay <b>pichhle checkpoint</b> se shuru hota hai
     (lab 01: <code>redo starts at 0/187C638</code>). Checkpoint se pehle ka WAL <b>recycle</b> ho jaata hai.</p>

     <h3>⚖️ Checkpoint kitni der mein?</h3>
     <table>
       <tr><th></th><th>Jaldi-jaldi (har 1 min)</th><th>Der se (har 60 min)</th></tr>
       <tr><td>Crash recovery</td><td>✅ seconds</td><td>❌ minutes (saara WAL replay)</td></tr>
       <tr><td>Disk par likhna</td><td>❌ zyada (neeche dekho)</td><td>✅ kam</td></tr>
       <tr><td>WAL ke liye disk</td><td>✅ kam</td><td>❌ zyada</td></tr>
     </table>
     <p><b>"Zyada likhna" kyun?</b> Postgres mein checkpoint ke baad kisi page ko <b>pehli baar</b> badlo toh
     Postgres WAL mein <b>poora 8 kB page</b> likhta hai (<b>full page write</b>). Wajah: bijli ke waqt disk
     aadha page likh sakti hai (torn page) — poore page ki copy se woh theek hota hai. Jitne zyada checkpoints,
     utni baar "pehli baar" — utna zyada WAL.</p>`,

    `<h3>🔧 Dono engines ke knobs</h3>
     <table>
       <tr><th></th><th>Postgres</th><th>MySQL (InnoDB)</th></tr>
       <tr><td>Kab checkpoint</td><td><code>checkpoint_timeout</code> (default 5 min) ya <code>max_wal_size</code> (default 1 GB) bhar gaya</td><td>lagataar thoda-thoda (<b>fuzzy checkpoint</b>) — redo log kitna bhara hai us hisaab se</td></tr>
       <tr><td>Log ka size</td><td><code>max_wal_size</code></td><td><code>innodb_redo_log_capacity</code> (8.0.30+, default 100 MB)</td></tr>
       <tr><td>Galat setting ka lakshan</td><td>log mein: <code>checkpoints are occurring too frequently</code></td><td>redo log bhar gaya → <b>saari writes kuch second ruk jaati hain</b> (sync flush)</td></tr>
     </table>
     <h3>💥 Crash ke waqt adhoori transaction?</h3>
     <p>Crash hua jab ek transaction ne 1,000 rows badli thi par COMMIT nahi hua tha.</p>
     <ul>
       <li><b>Postgres:</b> WAL replay un rows ko bhi wapas laata hai — par un rows ka transaction <b>kabhi commit hua hi nahi</b>,
         isliye koi query un rows ko dekhti nahi (MVCC). Baad mein VACUUM saaf karta hai.</li>
       <li><b>MySQL:</b> pehle redo replay, phir <b>undo log</b> se adhoori transaction <b>rollback</b>. Badi adhoori transaction =
         restart ke baad lamba rollback.</li>
     </ul>
     <div class="war-story"><b>⚡ Real pattern:</b> ek e-commerce MySQL par har ~40 minute mein <b>5–8 second</b> ke liye saare
     INSERT ruk jaate the. CPU normal, disk normal. Wajah: redo log bahut chhota (48 MB, purana default) aur sale ke waqt
     writes bahut zyada — redo log bharte hi InnoDB ko dirty pages <b>zabardasti</b> flush karne pade aur writes ruki.
     Ilaaj: redo log capacity badhai (8.0.30+ mein server chalte hue badal sakte ho).</div>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: checkpoint ka sweet spot',
      instructions: 'Dono knobs ghumao — recovery time aur extra likhna dono dekho.',
      scenario: `Ek Postgres jo har second <b>10 MB WAL</b> likhta hai. Database mein <b>20,000 garam pages</b> (160 MB) hain
        jo har checkpoint ke baad dobara badalte hain. Crash ke baad replay <b>100 MB/s</b> se hota hai.
        Team chahti hai: recovery <b>1 minute</b> se kam, aur full page writes ka extra WAL <b>25%</b> se kam.`,
      knobs: [
        { id: 'every', label: 'Checkpoint har kitne minute (checkpoint_timeout)', min: 1, max: 60, step: 1, value: 60 },
        { id: 'rate', label: 'App ka WAL likhna', min: 1, max: 30, step: 1, value: 10, unit: 'MB/s' },
      ],
      readouts: [
        { id: 'backlog', label: 'Crash par replay karna padega (worst case)', unit: 'MB', fn: v => walBacklogMb(v) },
        { id: 'rec', label: 'Recovery time', unit: 's', fn: v => recoverySec(v), good: x => x <= 60,
          sub: x => x <= 60 ? 'database jaldi wapas' : '⚠️ utni der app band' },
        { id: 'fpi', label: 'Full page writes ka extra WAL', unit: '%', fn: v => fpiPct(v), good: x => x <= 25,
          sub: x => x <= 25 ? 'theek' : '⚠️ har checkpoint ke baad garam pages poore likhe ja rahe hain' },
      ],
      bar: v => ({ pct: Math.min(100, recoverySec(v) / 6), bad: recoverySec(v) > 60, label: `recovery ≈ ${recoverySec(v)} s` }),
      verdict: v => {
        if (recoverySec(v) > 60) return { tone: 'bad', text: `🔥 Checkpoint har ${v.every} min = crash ke baad <b>${walBacklogMb(v).toLocaleString('en-IN')} MB</b> WAL replay. App <b>${recoverySec(v)} second</b> band rahegi.` };
        if (fpiPct(v) > 25) return { tone: 'warn', text: `⚠️ Recovery tez hai, par har ${v.every} min mein 160 MB garam pages dobara poore WAL mein jaa rahe hain — <b>${fpiPct(v)}%</b> extra likhna. Disk aur replicas dono par bojh.` };
        return { tone: 'good', text: '✅ <b>Sweet spot.</b> Recovery ek minute ke andar, aur extra WAL kaabu mein.' };
      },
      goal: { text: 'Recovery <b>≤ 60 s</b> aur extra WAL <b>≤ 25%</b>.', check: (v, r) => r.rec <= 60 && r.fpi <= 25 },
      insight: `Checkpoint ek <b>trade-off</b> hai, knob nahi jise ek taraf poora ghuma do. Default (5 min / 1 GB) zyadatar
        apps ke liye theek hai. Write-heavy database par <code>max_wal_size</code> badhana padta hai — warna Postgres
        log mein "checkpoints are occurring too frequently" likhta hai.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: kill -9 ke baad Postgres kya karta hai',
      instructions: 'Lab 01 (ex3) ke asli log lines, ek-ek kadam.',
      scenario: 'Ek script lagataar INSERT kar rahi hai. Beech mein Postgres ko <code>kill -9</code> (bijli gayi).',
      lanes: [
        { id: 'pg', label: '🐘 Postgres' },
        { id: 'wal', label: '📒 WAL' },
        { id: 'data', label: '🗄️ Data files' },
      ],
      steps: [
        { lane: 'pg', t: 'CHECKPOINT at 0/187C638', note: 'Is LSN tak ke saare badlaav data files mein pahunch gaye. Line kheench di.' },
        { lane: 'wal', t: 'INSERTs … WAL 0/187C638 → 0/4D1AB58', note: 'Hazaaron rows. Har COMMIT ki line WAL mein pakki. Data pages sirf memory mein (dirty).' },
        { lane: 'pg', t: '💥 kill -9', note: 'Memory saaf. Dirty pages gaye. Clean shutdown nahi hua.', bad: true },
        { lane: 'pg', t: 'LOG: database system was not properly shut down; automatic recovery in progress', note: 'Restart par Postgres ko pata chalta hai ki pichhli baar clean shutdown nahi hua.',
          ask: {
            q: 'Postgres WAL ko kahan se padhna shuru karega?',
            choices: ['Pichhle checkpoint ke LSN (0/187C638) se', 'WAL ki pehli file se', 'Crash wale LSN se', 'Backup se'],
            answer: 0,
            explain: 'Checkpoint ke pehle ka sab data files mein pakka hai. Replay sirf checkpoint ke <b>baad</b> ka — isi liye checkpoint recovery ko chhota rakhta hai.',
          } },
        { lane: 'wal', t: 'LOG: redo starts at 0/187C638', note: 'Replay shuru.' },
        { lane: 'data', t: 'har WAL record data page par dobara laga', note: 'Jo page memory mein badla tha par disk tak nahi pahuncha — WAL record se wahi badlaav dobara.' },
        { lane: 'wal', t: 'LOG: redo done at 0/4D1AB58 … elapsed: 0.19 s', note: '~57 MB WAL, 0.19 second. Checkpoint 1 ghante purana hota toh GBs replay karne padte.', good: true,
          ask: {
            q: 'Crash ke waqt ek transaction ke 500 INSERT ho chuke the par COMMIT nahi hua tha. Postgres mein un 500 rows ka kya hoga?',
            choices: [
              'Rows replay hongi, par transaction commit nahi hua — koi query un rows ko nahi dekhegi, VACUUM baad mein hatayega',
              '500 rows sabko dikhengi',
              'Postgres restart hi nahi hoga',
              'Postgres un rows ko commit kar dega',
            ],
            answer: 0,
            explain: 'Postgres mein row ki visibility transaction ke status par depend karti hai (MVCC). Commit ka record hi nahi hai → rows "invisible". MySQL alag karta hai: redo ke baad <b>undo log</b> se adhoori transaction rollback.',
          } },
        { lane: 'pg', t: 'LOG: database system is ready to accept connections', note: 'Lab 01: <b>31,272 rows bachi, 0 duplicate</b> — har committed row wapas.', good: true },
      ],
      insight: `Crash recovery koi jaadu nahi — <b>checkpoint se WAL ka replay</b> hai. Isiliye: WAL kabhi mat hatao
        (<code>pg_wal/</code> ya <code>ib_redo*</code> files "space bachane" ke liye delete karna = database ki maut),
        aur checkpoint ka interval sochke rakho.`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: kill -9 aur WAL replay',
      project: '01-wal',
      exercise: 'ex3-crash-recovery',
      goal: 'Postgres ko lagataar INSERT ke beech <b>kill -9</b> karo aur dekho ki restart par WAL replay har committed row wapas laata hai.',
      steps: [
        { text: 'Table taiyar karo.', cmd: 'cd sqlgurukul/docker-labs/01-wal\n./run.sh pg sql/ex3-crash-setup.pg.sql' },
        { text: 'Writer chalao (background mein), 4 second ruko, phir bijli kaat do.', cmd: './run.sh pg sql/ex3-crash-writer.pg.sql &\nsleep 4\ndocker compose kill -s SIGKILL postgres' },
        { text: 'Postgres wapas chalao aur recovery ke log dekho.', cmd: 'docker compose start postgres\ndocker compose logs postgres | grep -E "not properly|redo starts|redo done|ready"',
          expect: 'LOG:  database system was not properly shut down; automatic recovery in progress\nLOG:  redo starts at 0/187C638\nLOG:  redo done at 0/4D1AB58 system usage: ... elapsed: 0.19 s\nLOG:  database system is ready to accept connections' },
        { text: 'Kitni rows bachi, koi duplicate?', cmd: './run.sh pg sql/ex3-crash-check.pg.sql',
          expect: ' rows_bache | aakhri_id          duplicate_ids\n      31272 |     31272                      0' },
      ],
      observe: {
        q: '"redo starts at" aur "redo done at" ke beech jitna WAL hai, woh kis cheez se tay hota hai?',
        choices: [
          'Pichhle checkpoint ke baad kitna WAL likha gaya',
          'Table kitni badi hai',
          'Kitne indexes hain',
          'Server mein kitni RAM hai',
        ],
        answer: 0,
        explain: 'Replay pichhle checkpoint se crash tak. Checkpoint jitna purana, replay utna lamba. Table ka size seedha farak nahi daalta — sirf checkpoint ke baad ke badlaav.',
      },
      lesson: 'Crash ke baad duplicate 0 aaye kyunki har row apne transaction ke saath hi pakki hui — ya poori, ya bilkul nahi.',
    },
    {
      type: 'incident',
      title: '🚨 3 AM: har 40 minute mein writes ruk jaati hain',
      instructions: 'MySQL ka ek asli pattern. Sahi kadam chuno.',
      pager: '<b>#db-alerts</b> — 3:12 AM<br>checkout-service: INSERT latency p99 <b>7.8 s</b> (normal 20 ms). 40 minute pehle bhi yahi hua tha, 6 second baad apne aap theek.',
      start: 'look',
      nodes: {
        look: {
          sitrep: 'CPU 35%. Koi lambi query nahi. Replica lag normal. Sale chal rahi hai — writes normal se 4× zyada.',
          text: 'Sabse pehle kya dekhoge?',
          choices: [
            { t: '<code>SHOW ENGINE INNODB STATUS</code> — LOG section: "Log sequence number" vs "Last checkpoint at" ka farak', good: true, next: 'redo', explain: 'Writes ruk rahi hain aur apne aap theek ho rahi hain — redo log ke bharne ka shak. LOG section mein checkpoint kitna peeche hai woh dikhta hai.' },
            { t: 'Server restart', good: false, explain: 'Restart par crash recovery aur thanda buffer pool — aur problem 40 minute baad wapas.' },
            { t: 'Saare indexes drop', good: false, explain: 'Indexes ka isse seedha lena-dena nahi — aur production mein bina soche drop karna nayi aag hai.' },
          ],
        },
        redo: {
          sitrep: 'Log sequence number aur Last checkpoint ka farak lagbhag poori redo capacity (48 MB) ke barabar. <code>innodb_redo_log_capacity</code> = 48 MB.',
          text: 'Iska matlab?',
          choices: [
            { t: 'Redo log bhar gaya — InnoDB ko dirty pages zabardasti flush karne pade (sync flush), tab tak writes ruki', good: true, next: 'fix', explain: 'Redo log circular hai. Checkpoint aage badhe bina purana hissa reuse nahi ho sakta. Bhar gaya = naye writes ko jagah nahi = ruko.' },
            { t: 'Disk kharab hai', good: false, explain: 'Disk kharab hoti toh har waqt dheema hota, har 40 minute mein 6 second nahi.' },
          ],
        },
        fix: {
          text: 'Ilaaj?',
          choices: [
            { t: '<code>SET GLOBAL innodb_redo_log_capacity = 2*1024*1024*1024;</code> (8.0.30+ mein bina restart) — aur sale ke peak ke hisaab se size tay karo', good: true, next: 'end', explain: 'Bada redo log = checkpoint ko zyada jagah = sync flush nahi. Keemat: crash recovery thodi lambi. Yahi trade-off slider mein dekha.' },
            { t: '<code>innodb_flush_log_at_trx_commit = 0</code>', good: false, explain: 'Yeh fsync ki setting hai, redo ke bharne ki nahi — aur payments par data loss ka risk.' },
          ],
        },
        end: { end: true, text: 'Writes smooth 🧯', summary: 'Writes ka baar-baar kuch second rukna + CPU normal = <b>log bhar raha hai</b> (MySQL redo capacity, Postgres mein <code>max_wal_size</code> / "checkpoints too frequent"). Log ka size peak write load ke hisaab se rakho.' },
      },
    },
    {
      type: 'quiz',
      title: 'Checkpoint ki samajh',
      questions: [
        { q: 'Checkpoint ke waqt database kya pakka karta hai?', choices: ['Saari queries khatam', 'Us LSN tak ke saare dirty pages data files mein likh diye', 'Backup ban gaya', 'WAL delete ho gaya'], answer: 1, explain: 'Checkpoint = "yahan tak data files up-to-date". Crash replay yahin se shuru.' },
        { q: 'Postgres mein checkpoints bahut jaldi-jaldi hon toh WAL kyun badhta hai?', choices: ['Checkpoint khud bahut bada record hai', 'Checkpoint ke baad har page ke pehle badlaav par poora 8 kB page WAL mein jaata hai (full page write)', 'WAL compress nahi hota', 'Badhta nahi'], answer: 1, explain: 'Full page writes torn pages se bachate hain. Har checkpoint ke baad garam pages phir se "pehli baar".' },
        { q: 'Disk bhar rahi hai. Koi <code>pg_wal/</code> ki purani files delete kar de toh?', choices: ['Space bach jaayega, koi dikkat nahi', 'Crash recovery / replicas ke liye zaroori WAL gaya — database start hi nahi ho sakta ya data kharab', 'Postgres khud bana lega', 'Sirf logs gaye'], answer: 1, explain: 'WAL database ka dil hai. Space chahiye toh <code>max_wal_size</code>, atke replication slots, ya archiving dekho — files haath se kabhi mat hatao.' },
        { q: 'MySQL mein crash ke waqt adhoori transaction kaise hatati hai?', choices: ['Redo replay ke baad undo log se rollback', 'Hatti hi nahi', 'binlog se', 'DBA haath se'], answer: 0, explain: 'InnoDB: redo (sab wapas laao) → undo (jo commit nahi hua use palto). Postgres: MVCC ki wajah se adhoori rows bas invisible rehti hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Checkpoint',
    instructions: 'SRE / DBA round. 🎤',
    questions: [
      { q: 'Interviewer: "Postgres log mein \'checkpoints are occurring too frequently\' aa raha hai. Kya karoge?"', choices: ['checkpoint_timeout 1 min kar do', 'max_wal_size badhao taaki WAL size ki wajah se checkpoint jaldi na ho — aur disk space check karo', 'fsync band karo', 'Ignore karo'], answer: 1, explain: 'Yeh warning tab aati hai jab <code>max_wal_size</code> bhar ke checkpoint trigger kar raha hai. Bada max_wal_size = kam checkpoints = kam full page writes; keemat: thodi lambi recovery aur zyada WAL disk.' },
      { q: 'Interviewer: "Checkpoint har 1 hour kar do — sabse kam likhna padega na?"', choices: ['Haan, hamesha behtar', 'Likhna kam, par crash ke baad ek ghante ka WAL replay — minutes ka downtime aur zyada WAL disk', 'Postgres allow nahi karta', 'Replication toot jaata hai'], answer: 1, explain: 'Trade-off: write amplification vs recovery time. RTO (kitni der mein wapas) ke hisaab se tay karo.' },
    ],
  },
  success: [
    'Main bata sakta hoon ki crash ke baad replay kahan se shuru hota hai aur kyun',
    'Main checkpoint ke jaldi/der dono taraf ke bill samjha sakta hoon',
    'Main "writes har kuch minute mein rukti hain" ko log capacity se jod sakta hoon',
    'Maine asli Postgres ko kill -9 karke WAL replay dekha hai',
  ],
  homework: `<pre>-- Postgres: checkpoints kaise ho rahe hain? (PG 16)
SELECT checkpoints_timed, checkpoints_req, buffers_checkpoint FROM pg_stat_bgwriter;
-- checkpoints_req (WAL bharne se) &gt;&gt; checkpoints_timed → max_wal_size chhota hai

-- MySQL: redo kitna bhara hai?
SHOW GLOBAL STATUS LIKE 'Innodb_redo_log_%';</pre>`,
  cards: [
    { front: 'Crash recovery kahan se shuru hota hai?', back: '<b>Pichhle checkpoint</b> ke LSN se — "redo starts at …".' },
    { front: 'Full page write kya hai aur kyun?', back: 'Checkpoint ke baad page ke pehle badlaav par Postgres poora 8 kB page WAL mein likhta hai — torn (aadha likha) page se bachne ke liye.' },
    { front: 'MySQL writes har kuch minute kuch second ruk-ti hain, CPU normal — shak?', back: 'Redo log capacity chhoti — log bharte hi <b>sync flush</b>. <code>innodb_redo_log_capacity</code> badhao.' },
    { front: 'Adhoori transaction crash ke baad: Postgres vs MySQL?', back: 'Postgres: rows replay par invisible (commit record nahi). MySQL: redo ke baad <b>undo</b> se rollback.' },
  ],
},

]);
})();
