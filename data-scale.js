/* =====================================================================
   TRACK 4 — Scale & Internals
   pooling · joinalgo · locks · slowlog · batching ·
   partitioning · replicas · sharding · capdb · boss4

   Yeh track SQL LIKHNE ke baare mein nahi hai — DB CHALANE ke baare mein hai.
   Har level ka shape ek jaisa rakha gaya hai (ADHD-friendly):
     1. Ek chhoti si problem (do line), theory nahi
     2. TURANT ek interactive lab — knob ghumao, number badalta dekho
     3. Chhota lesson (2 page se zyada nahi)
     4. Hands-on mission asli sqlcli par
     5. Ek quiz jo sirf woh poochhe jo abhi kiya
   ===================================================================== */

/* ---- pooling ka cost model — slider aur quiz dono isi par chalte hain ----
   eff = query_ms × (1 + max(0, pool-25)/40)   ← DB par contention
   Yeh curve hi poora sabak hai: pool badhane se capacity badhti hai,
   par har connection DB par ek process/thread hai — 25 ke baad woh
   ek doosre se ladne lagte hain aur har query DHEEMI ho jaati hai.        */
const poolEff = (pool, q) => q * (1 + Math.max(0, pool - 25) / 40);
const poolCap = (pool, q) => Math.round(pool * 1000 / poolEff(pool, q));
const poolWait = (pool, q, rps) => {
  const eff = poolEff(pool, q), cap = pool * 1000 / eff, rho = rps / cap;
  if (rho < 1) { const e = Math.sqrt(2 * (pool + 1)) - 1; return eff * Math.pow(rho, e) / Math.max(0.001, pool * (1 - rho)); }
  return Math.min(10000, (rho - 1) * eff * pool);
};
const poolP99 = (pool, q, rps) => Math.round(3 + poolEff(pool, q) * 1.35 + poolWait(pool, q, rps));

/* ---- success() ko tasks se SYNC rakhne ka pattern ------------------------
   Agar success() tasks se KAM check kare toh sim.done jaldi lag jaata hai
   aur baaki hints chalti hi nahi — player ko adhoora checklist dikhta hai.
   Isliye tasks ek const mein rakho aur success unhi se banao.
   (Yeh bug is file mein ek baar aa chuka hai — validator ne pakda.)         */
const allOf = tasks => s => tasks.every(t => t.check(s));

const T_POOL = [
  { text: 'EXPLAIN chalao — type: ALL dekho', check: s => s.history.some(h => /^explain/i.test(h)) },
  { text: 'SHOW INDEXES se abhi ki haalat dekho', check: s => s.history.some(h => /show\s+index(es)?\s+from/i.test(h)) },
  { text: 'customerLocation par index banao', check: s => (s.db.tables.bx50Data.indexes || []).some(i => i.toLowerCase() === 'customerlocation') },
  { text: 'EXPLAIN dobara — ab type: ref', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
];

const T_LOCK = [
  { text: 'BEGIN se transaction kholo', check: s => s.history.some(h => /^begin/i.test(h)) },
  { text: 'Atomic UPDATE — shart WHERE mein ho', check: s => s.history.some(h => /^update\s+operators[\s\S]*where[\s\S]*shift\s*=\s*'day'/i.test(h)) },
  { text: 'SELECT se natija dekho', check: s => s.history.some(h => /^select[\s\S]*operators/i.test(h)) },
  { text: 'COMMIT karo', check: s => s.committed },
];

const T_JOIN = [
  { text: 'EXPLAIN chalao — JOIN ka plan dekho', check: s => s.history.some(h => /^explain[\s\S]*join/i.test(h)) },
  { text: 'JOIN column (userId) par index banao', check: s => (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'userid') },
  { text: 'EXPLAIN dobara — plan badla?', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
  { text: 'SHOW INDEXES se pakka karo', check: s => s.history.some(h => /show\s+index(es)?\s+from\s+bx50sessions/i.test(h)) },
];

const T_SLOW = [
  { text: 'EXPLAIN chalao — abhi type: ALL', check: s => s.history.some(h => /^explain/i.test(h)) },
  { text: 'buildNum par index banao', check: s => (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'buildnum') },
  { text: 'EXPLAIN dobara — proof lo', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
  { text: 'SELECT * hatao — sirf zaroori columns maango', check: s => s.history.some(h => /^select\s+id\s*,\s*userid/i.test(h)) },
];

const T_BOSS4 = [
  { text: 'EXPLAIN chalao — abhi type: ALL', check: s => s.history.some(h => /^explain/i.test(h)) },
  { text: 'buildNum par index banao', check: s => (s.db.tables.bx50Data.indexes || []).some(i => i.toLowerCase() === 'buildnum') },
  { text: 'EXPLAIN dobara — proof lo', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
  { text: 'BEGIN se transaction kholo', check: s => s.history.some(h => /^begin/i.test(h)) },
  { text: 'Atomic UPDATE — shart WHERE ke andar', check: s => s.history.some(h => /^update\s+operators[\s\S]*where[\s\S]*shift\s*=\s*'day'/i.test(h)) },
  { text: 'COMMIT karo', check: s => s.committed },
];

SG.registerLevels('scale', [

/* =====================================================================
   S1 — Connection pooling
   ===================================================================== */
{
  id: 'pooling',
  icon: '🔌',
  title: 'Connection Pool — CPU 10%, Phir Bhi Sab Timeout',
  badge: 'Pool Pandit',
  objectives: [
    'Pool size <b>kaise</b> chuna jaata hai — aur bada karna muft kyun nahi',
    'Pool exhaustion ke lakshan (aur woh CPU par kyun nahi dikhte)',
    'Ek lambi transaction poore app ko kaise gira deti hai',
    '<b>Pehle service time ghatao, pool baad mein</b>',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p>3 baje raat. Saari API requests timeout ho rahi hain.
     Tum dashboard kholte ho:</p>
     <pre>CPU        10%   😐
Memory     40%   😐
Disk I/O   kam   😐
Health     ✅ green
Requests   ❌ sab timeout</pre>
     <p>Server bilkul <b>aaram se</b> baitha hai — aur phir bhi kuch kaam nahi kar raha.</p>
     <p>Wajah: har request ko DB se baat karne ke liye ek <b>connection</b> chahiye.
     Connections ek chhote se <b>pool</b> mein rakhe hote hain. Jab saare
     connections busy ho jaate hain, nayi requests <b>line mein khadi</b> ho jaati hain —
     kaam nahi kar rahi, sirf <b>intezaar</b> kar rahi hain.</p>
     <p class="tip">🎯 Aur intezaar karta hua thread CPU nahi khaata.
     Isiliye CPU 10% par bhi sab kuch ruk sakta hai. <b>Jo cheezein CPU se pehle
     khatam hoti hain woh concurrency limits hain, compute nahi.</b></p>`,
    `<h3>🧮 Pool ka size — ek chhota formula</h3>
     <pre>capacity (rps) = pool_size × (1000 / query_ms)</pre>
     <p>Yaani: agar ek query 20 ms leti hai, toh <b>ek</b> connection ek second mein
     50 queries kar sakta hai. 20 connections = 1,000 rps.
     Ise <b>Little's Law</b> kehte hain, aur yeh capacity planning ka poora dil hai.</p>
     <p>Formula mein do knobs hain — aur log lagbhag hamesha <b>galat</b> wala ghumate hain:</p>
     <table>
       <tr><th></th><th>pool_size badhao</th><th>query_ms ghatao</th></tr>
       <tr><td>Kaise</td><td>config badlo</td><td>index lagao, N+1 hatao</td></tr>
       <tr><td>Faayda</td><td>linear, par ek hadd tak</td><td>linear, <b>bina kisi hadd ke</b></td></tr>
       <tr><td>Kharch</td><td>DB par memory + contention</td><td>bas thodi mehnat</td></tr>
     </table>
     <h3>⚠️ Pool badhana muft nahi hai</h3>
     <p>Har connection DB ke andar ek <b>process ya thread</b> hai — apni memory,
     apna scheduling, aur doosron ke saath lock contention. Ek hadd ke baad
     har query <b>dheemi</b> hone lagti hai, isliye <b>500 connections aksar
     50 se bure</b> nikalte hain.</p>
     <p class="tip">🎯 Neeche wale lab mein yahi khud dekho — pool ko upar-neeche
     karke p99 ko dekho. Ek <b>sweet spot</b> milega, aur uske dono taraf haalat kharab hai.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: Pool ka sweet spot dhoondo',
      instructions: 'Slider ghumao. Numbers turant badlenge — koi "submit" nahi hai.',
      scenario: `Ek API hai jispar peak par <b>800 requests/second</b> aate hain.
        Har request ek DB query chalati hai jo abhi <b>20 ms</b> leti hai.
        Abhi pool <b>5</b> par set hai — aur sab timeout ho raha hai.`,
      knobs: [
        { id: 'pool', label: 'Connection pool size', min: 5, max: 200, step: 5, value: 5,
          help: 'App ke paas kitne DB connections hain' },
      ],
      readouts: [
        { id: 'eff', label: 'Ek query ka asli time', unit: 'ms',
          fn: v => poolEff(v.pool, 20),
          good: (x) => x <= 25,
          sub: (x) => x > 21 ? `⚠️ ${Math.round(x - 20)} ms extra — contention` : 'contention nahi' },
        { id: 'cap', label: "Capacity (Little's Law)", unit: 'rps',
          fn: v => poolCap(v.pool, 20),
          good: (x) => x >= 800,
          sub: (x, v) => `pool ${v.pool} × (1000 / ${Math.round(poolEff(v.pool, 20))} ms)` },
        { id: 'wait', label: 'pool.acquire() wait', unit: 'ms',
          fn: v => poolWait(v.pool, 20, 800),
          good: (x) => x < 5 },
        { id: 'p99', label: 'p99 latency', unit: 'ms',
          fn: v => poolP99(v.pool, 20, 800),
          good: (x) => x < 60 },
      ],
      bar: (v) => {
        const p = poolP99(v.pool, 20, 800);
        return { pct: Math.min(100, (p / 250) * 100), bad: p >= 60, label: `p99 ${Math.round(p)} ms  (target: 60 ms se kam)` };
      },
      verdict: (v) => {
        const p = poolP99(v.pool, 20, 800), eff = poolEff(v.pool, 20);
        if (poolCap(v.pool, 20) < 800) return { tone: 'bad', text: '🔥 <b>Pool bahut chhota hai.</b> Capacity 800 rps se kam hai, isliye queue badhti ja rahi hai aur requests <code>pool.acquire()</code> par mar rahi hain. Aur dhyaan do — CPU abhi bhi kam hai.' };
        if (eff > 30) return { tone: 'warn', text: `⚠️ <b>Pool bahut bada hai.</b> Har query ab ${Math.round(eff)} ms le rahi hai (asli 20 ms thi) — ${v.pool} connections DB par aapas mein lad rahe hain. Capacity toh hai, par har request dheemi ho gayi.` };
        return { tone: 'good', text: '✅ <b>Sweet spot ke aas-paas.</b> Capacity bhi kaafi hai aur contention bhi nahi.' };
      },
      goal: { text: 'p99 ko <b>60 ms se kam</b> laao.', check: (v) => poolP99(v.pool, 20, 800) < 60 },
      wrongWay: (v) => v.pool >= 150,
      insight: `Dhyaan do ki <b>dono taraf</b> haalat kharab thi.
        Chhota pool = queue aur timeouts. Bada pool = har query dheemi.
        Isiliye "connections badha do" ek reflex nahi hona chahiye —
        pool ek <b>sweet spot</b> hai, ek knob nahi jise poora ghuma dena hai.`,
    },
    {
      type: 'slider',
      title: '🎚️ Lab: Ab doosra knob ghumao',
      instructions: 'Ab pool ke saath query time bhi tumhare haath mein hai. Dono ghuma ke dekho.',
      scenario: `Wahi API, wahi <b>800 rps</b>. Par ab tum <b>query ko tez</b> bhi
        kar sakte ho — index laga ke, N+1 hata ke, ya <code>SELECT *</code> chhod ke.
        <br><br>Dekho ki kaunsa knob zyada kaam karta hai.`,
      knobs: [
        { id: 'pool', label: 'Connection pool size', min: 5, max: 200, step: 5, value: 10 },
        { id: 'q', label: 'Ek query ka time', min: 2, max: 120, step: 2, value: 80,
          help: 'Index lagane se yahi ghatta hai' },
      ],
      readouts: [
        { id: 'cap', label: 'Capacity', unit: 'rps', fn: v => poolCap(v.pool, v.q), good: x => x >= 800 },
        { id: 'p99', label: 'p99 latency', unit: 'ms', fn: v => poolP99(v.pool, v.q, 800), good: x => x < 60 },
        { id: 'cost', label: 'DB par connections', unit: '', fn: v => v.pool,
          good: x => x <= 40,
          sub: x => x > 40 ? '⚠️ har ek DB par ek process hai' : 'theek hai' },
      ],
      bar: (v) => {
        const p = poolP99(v.pool, v.q, 800);
        return { pct: Math.min(100, (p / 300) * 100), bad: p >= 60, label: `p99 ${Math.round(p)} ms` };
      },
      verdict: (v) => {
        if (v.q > 40 && v.pool > 60) return { tone: 'warn', text: '⚠️ Tum <b>dheemi query</b> ko <b>bade pool</b> se dhaap rahe ho. Yeh chalta hai — par tumne DB par 60+ processes daal diye ek aise problem ke liye jiska asli hal ek index tha.' };
        if (v.q <= 20 && v.pool <= 40) return { tone: 'good', text: '✅ <b>Yahi sahi kram hai:</b> pehle query tez ki, phir chhota pool kaafi ho gaya. Kam connections, kam contention, kam risk.' };
        return { tone: '', text: 'Dono knobs ghuma ke dekho — kaunsa kam badlaav mein zyada faayda deta hai?' };
      },
      goal: { text: 'p99 <b>60 ms se kam</b> laao — par pool <b>40 se zyada</b> nahi.', check: (v) => poolP99(v.pool, v.q, 800) < 60 && v.pool <= 40 },
      insight: `Yahi is poore level ka sabak hai:
        <b>pehle service time ghatao, pool badhana uske BAAD ka kadam hai.</b><br><br>
        Query ko 80 ms se 20 ms karna capacity <b>4x</b> kar deta hai —
        bina DB par ek bhi extra connection daale. Pool badhane se woh 4x
        mehnga padta hai (memory + contention) aur ek hadd ke baad milta bhi nahi.`,
    },
    {
      type: 'flow',
      title: '🎬 Ek lambi transaction, aur poora app girta hua',
      instructions: 'Play dabao ya ek-ek kadam chalao. Beech mein do sawaal aayenge.',
      scenario: `Pool mein <b>10</b> connections hain. Ek developer ne report banane ke liye
        <code>BEGIN</code> chala ke transaction khol di — aur <code>COMMIT</code> bhool gaya.`,
      lanes: [
        { id: 'dev', label: '👨‍💻 Report script' },
        { id: 'app', label: '🌐 API requests' },
        { id: 'db', label: '🗄️ Pool (10)' },
      ],
      state: (n) => {
        const held = n >= 2 ? Math.min(9, Math.max(1, n - 1)) : 0;
        return [
          { k: 'busy connections', v: `${Math.min(10, held + (n >= 6 ? 1 : 0))} / 10` },
          { k: 'waiting requests', v: n >= 7 ? String((n - 6) * 40) : '0' },
          { k: 'CPU', v: '10%' },
          { k: 'health check', v: n >= 5 ? '✅ green' : '✅ green' },
        ];
      },
      steps: [
        { lane: 'dev', t: 'BEGIN;', note: 'Transaction khul gayi. Ab yeh script ek connection <b>pakad</b> ke baithi hai — jab tak COMMIT ya ROLLBACK na ho.' },
        { lane: 'dev', t: 'SELECT … 40 lakh rows par report', note: 'Query 4 minute chalegi. Un 4 minute tak woh connection <b>kisi aur ke kaam ka nahi</b> hai.' },
        { lane: 'app', t: '9 normal requests aayin', note: 'Har ek ne ek connection liya. Pool ab 10/10 busy hai — 9 kaam kar rahe hain, 1 report script ke paas hai.' },
        { lane: 'db', t: 'pool: 10 / 10 busy', note: 'Pool poora bhar gaya. Agli request ko connection ka <b>intezaar</b> karna padega.',
          bad: true,
          ask: {
            q: 'Ab agli request aayi. Woh kya karegi?',
            choices: [
              'pool.acquire() par ruk jaayegi — aur woh ruka hua waqt uski latency mein judega',
              'DB seedha ek naya connection bana dega',
              'Woh turant error de degi',
              'Woh doosre server par chali jaayegi',
            ],
            answer: 0,
            explain: 'Pool ka poora kaam hi yeh hai ki connections <b>ginti mein</b> rahein. Free connection na ho toh request <b>line mein</b> lag jaati hai — kaam nahi karti, sirf intezaar karti hai. Aur intezaar CPU nahi khaata — isliye dashboard par sab "theek" dikhta hai.',
          } },
        { lane: 'app', t: '40 requests/sec aa rahe hain, line lag rahi hai', note: 'Har second aur requests aa rahi hain. Queue badhti ja rahi hai.', bad: true },
        { lane: 'app', t: 'GET /health → 200 OK ✅', note: 'Health check <b>green</b> hai — kyunki usne DB chhua hi nahi. Woh sirf itna kehta hai "process zinda hai".', bad: true },
        { lane: 'app', t: 'Pehli request 10s par timeout', note: 'Ab errors shuru. Par woh error <code>pool.acquire() timeout</code> hai — DB ne kuch galat nahi kiya, connection hi nahi mila.', bad: true },
        { lane: 'app', t: 'Client retry karta hai → aur load', note: 'Retry se offered load badhta hai, aur queue aur lambi ho jaati hai. Yeh apne aap ko khaane wala chakkar hai.', bad: true,
          ask: {
            q: 'Tum on-call ho. Sabse pehla kadam?',
            choices: [
              'Lambi chalti hui transaction dhoondo aur use maaro — ek connection chhodne se line chalni shuru ho jaayegi',
              'Server restart kar do',
              'Pool size 200 kar do',
              'CPU dekho, shayad kuch chal raha ho',
            ],
            answer: 0,
            explain: 'Ek connection kisi ne <b>pakad</b> rakha hai — use chhodo. (MySQL mein <code>SHOW PROCESSLIST</code> / <code>KILL</code>, Postgres mein <code>pg_stat_activity</code>.) Pool 200 karne se DB par 200 processes aa jaayenge aur asli wajah wahin ki wahin rahegi. Aur CPU dekhna bekaar hai — woh 10% par hai aur rahega.',
          } },
        { lane: 'dev', t: 'COMMIT;  (ya KILL)', note: 'Connection wapas pool mein aa gaya.', good: true },
        { lane: 'db', t: 'pool: 9 / 10 busy — line chal padi', note: 'Ek connection free hote hi queue nikalne lagi. Recovery utni hi tezi se hoti hai jitni tezi se cheezein bigdi thi.', good: true },
      ],
      insight: `Teen cheezein yaad rakho:<br>
        • Ek <b>lambi transaction</b> ek connection ko poore samay ke liye pakad leti hai —
          isliye transaction ke andar kabhi bhi lamba kaam ya network call mat karo.<br>
        • <b>Health check green rehta hai</b>, kyunki woh DB chhuta hi nahi.
          Ek achha health check ek chhoti si DB query karta hai.<br>
        • Aur asli nishaan ek hi hai — <b>pool.acquire() ka waqt</b>.
          Use metric banao; woh CPU se pehle bolta hai.`,
    },
    {
      type: 'bins',
      title: 'Lakshan pehchano',
      instructions: 'Har lakshan ko sahi wajah ke bin mein daalo.',
      bins: [
        { id: 'pool', label: '🔌 Pool exhaustion' },
        { id: 'slow', label: '🐢 Slow query' },
        { id: 'cpu', label: '🔥 Asli CPU load' },
      ],
      items: [
        { text: 'CPU 10%, memory theek, phir bhi sab timeout', bin: 'pool', explain: 'Classic signature. Threads <b>intezaar</b> kar rahe hain, kaam nahi kar rahe — aur intezaar CPU nahi khaata.' },
        { text: 'Ek hi endpoint slow hai, baaki sab theek', bin: 'slow', explain: 'Pool sabko maarta hai — agar sirf ek endpoint slow hai toh problem <b>us query</b> mein hai. EXPLAIN nikaalo.' },
        { text: 'Har request mein 9.9 second "waiting for connection"', bin: 'pool', explain: 'Yeh seedha naap hai. Isiliye <code>pool.acquire()</code> ka waqt alag se log karo — woh sabse saaf signal hai.' },
        { text: 'Load badhne ke saath CPU bhi 90% tak chadha', bin: 'cpu', explain: 'Yahan CPU sach mein kaam kar raha hai. Ab sawaal hai <b>kaunsi</b> query — profiler ya slow log dekho.' },
        { text: 'Health check green, par users ko 504 mil rahe hain', bin: 'pool', explain: 'Health check ne DB chhua hi nahi. Isliye woh "app zinda hai" bata raha hai, "app kaam kar raha hai" nahi.' },
        { text: 'Ek report query 40 second leti hai, baaki sab tez', bin: 'slow', explain: 'Ek bhaari query. Par dhyaan rakho — agar woh transaction ke andar hai toh woh <b>pool problem bhi ban jaayegi</b>.' },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: pool ka asli ilaaj — query tez karo',
      instructions: 'Pool badhane se pehle dekho ki query itni der le kyun rahi hai.',
      goal: `Ek query poore pool ko roke hue hai.
        <b>(1)</b> <code>EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = 'Tokyo';</code> — <code>type</code> dekho.
        <b>(2)</b> <code>SHOW INDEXES FROM bx50Data;</code> — abhi kya hai?
        <b>(3)</b> Index banao: <code>CREATE INDEX idx_loc ON bx50Data(customerLocation);</code>
        <b>(4)</b> Wahi EXPLAIN dobara — <code>type</code> ab <code>ref</code> hona chahiye.
        <br><br>Yaad rakho: query ka waqt aadha hone ka matlab hai <b>capacity dugni</b> —
        bina DB par ek bhi naya connection daale.`,
      tasks: T_POOL,
      db: SG.factoryDB(),
      success: allOf(T_POOL),
      hints: [
        "EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = 'Tokyo';",
        'SHOW INDEXES FROM bx50Data;',
        'CREATE INDEX idx_loc ON bx50Data(customerLocation);',
        "EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = 'Tokyo';",
      ],
    },
    {
      type: 'quiz',
      title: 'Pool ki samajh',
      questions: [
        {
          q: 'CPU 10%, health green, par sab timeout. Sabse pehle kya dekhoge?',
          choices: [
            'pool.acquire() ka waqt — aur koi lambi chalti hui transaction',
            'CPU profiling',
            'Network latency',
            'Memory leak',
          ],
          answer: 0,
          explain: 'CPU kam hai <b>isliye</b> ki threads kaam nahi kar rahe — woh <b>intezaar</b> kar rahe hain. Jo cheezein CPU se pehle khatam hoti hain woh concurrency limits hain: connection pool, thread pool, downstream rate limit.',
        },
        {
          q: 'Ek query 80 ms se 20 ms ho gayi. Capacity par kya asar?',
          choices: [
            '4x badh gayi — bina DB par ek bhi naya connection daale',
            'Koi asar nahi, capacity pool se aati hai',
            '2x badh gayi',
            'Thoda sa faayda',
          ],
          answer: 0,
          explain: '<code>capacity = pool × (1000 / query_ms)</code>. Query ka waqt aadha = capacity dugni. Aur yeh knob <b>muft</b> hai — pool badhane par DB par memory aur contention dono chadhte hain.',
        },
        {
          q: 'Pool 50 se 500 kar diya. Kya hoga?',
          choices: [
            'Aksar sab kuch DHEEMA ho jaayega — har connection DB par ek process hai, aur 500 aapas mein ladenge',
            '10x capacity',
            'Kuch nahi badlega',
            'Sirf memory badhegi',
          ],
          answer: 0,
          explain: 'Yahi lab mein tumne dekha: ek hadd ke baad <b>har query dheemi</b> hone lagti hai, isliye capacity badhna ruk jaata hai aur latency badhne lagti hai. Isiliye "pool badha do" ek reflex nahi hona chahiye.',
        },
        {
          q: 'Health check green kyun rehta hai jab pool khatam ho?',
          choices: [
            'Kyunki woh DB chhuta hi nahi — sirf "process zinda hai" batata hai',
            'Kyunki health check ka apna connection hota hai',
            'Bug hai',
            'Kyunki DB theek hai',
          ],
          answer: 0,
          explain: 'Zyadatar health checks bas <code>200 OK</code> lauta dete hain. Ek <b>achha</b> health check ek chhoti si DB query karta hai (<code>SELECT 1</code>) — tabhi woh us cheez ko naapta hai jo sach mein toot-ti hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Connection pooling',
    instructions: 'Yeh sawaal lagbhag har backend interview mein aata hai. 🎤',
    questions: [
      {
        q: '"Pool size kaise chunoge?"',
        choices: [
          'Little\'s Law se shuru: capacity = pool × (1000/query_ms). Peak rps aur p99 query time se ek number nikaalunga, phir load test se confirm — aur DB ke max_connections aur CPU cores ka dhyaan rakhunga, kyunki bada pool contention laata hai',
          'Jitna DB allow kare',
          '100 ek achha default hai',
          'CPU cores × 2',
        ],
        answer: 0,
        explain: 'Achha jawab ek <b>formula</b> se shuru hota hai aur ek <b>naap</b> par khatam. "CPU cores × 2" ek jaana-maana rule of thumb hai (aur bura nahi hai) — par woh tab tak adhoora hai jab tak tum query time aur peak rps na jaano.',
      },
      {
        q: '"App ke 10 pods hain, har ek ka pool 50. DB ka max_connections 200 hai. Problem?"',
        choices: [
          '10 × 50 = 500 connections maange jaayenge par DB sirf 200 dega — peak par connection errors aayenge. Total pool DB ki limit se kam hona chahiye, aur autoscaling ke saath yeh hisaab dobara karna padta hai',
          'Koi problem nahi',
          'DB apne aap sambhaal lega',
          'Pool 100 kar do',
        ],
        answer: 0,
        explain: 'Yeh galti scale karte waqt <b>bahut</b> aam hai: har pod ka pool theek dikhta hai, par unka <b>jod</b> DB ki limit paar kar jaata hai. Aur pods autoscale karte hain — isliye yeh hisaab <b>max pods</b> par karna chahiye, aaj ke pods par nahi. (Yahi wajah hai ki PgBouncer jaisa external pooler use hota hai.)',
      },
    ],
  },
  success: [
    'Pool exhaustion ko CPU dekhe bina pehchaan sakte ho',
    "Little's Law se pool size nikaal sakte ho",
    'Jaante ho ki bada pool aksar bura kyun hota hai',
    'Pehle query tez karte ho, pool baad mein badhate ho',
  ],
  homework: `Apne app ka pool config dhoondo (Hikari, pgbouncer, SQLAlchemy — jo bhi ho).
    Teen cheezein likho: (1) pool size, (2) kitne pods/instances chalte hain,
    (3) DB ka max_connections. Ab guna karo — kya jod limit ke andar hai?
    Aur ek metric jodo: <code>pool.acquire()</code> ka waqt.`,
  cards: [
    { front: 'CPU 10%, health green, sab timeout — kya hai?', back: '<b>Pool exhaustion.</b> Threads <b>intezaar</b> kar rahe hain, kaam nahi kar rahe — aur intezaar CPU nahi khaata. Dekho: <code>pool.acquire()</code> ka waqt.' },
    { front: "Little's Law?", back: '<code>capacity (rps) = pool_size × (1000 / query_ms)</code>. Ek 20ms query par ek connection = 50 rps.' },
    { front: 'Pool badhana muft hai?', back: '<b>Nahi.</b> Har connection DB par ek process/thread hai — memory + lock contention. Ek hadd ke baad <b>har query dheemi</b> ho jaati hai; 500 connections aksar 50 se bure.' },
    { front: 'Kaunsa knob pehle ghumao?', back: '<b>query_ms</b>. Query 80→20 ms = capacity <b>4x</b>, bina ek bhi naya connection. Pool badhana uske BAAD ka kadam hai.' },
    { front: 'Health check green kyun?', back: 'Usne <b>DB chhua hi nahi</b>. Achha health check ek chhoti DB query karta hai (<code>SELECT 1</code>).' },
    { front: 'Lambi transaction ka khatra?', back: 'Woh ek connection <b>poore samay</b> pakad leti hai. Isliye transaction ke andar lamba kaam ya network call kabhi nahi.' },
    { front: '10 pods × pool 50, max_connections 200?', back: '500 maange, 200 milenge → peak par errors. Total pool DB limit se kam ho — aur hisaab <b>max pods</b> par karo, aaj ke pods par nahi.' },
  ],
},

/* =====================================================================
   S2 — Locks, races aur MVCC
   (isolation level naam bata chuka hai — yeh level UNHE THEEK karna sikhata hai)
   ===================================================================== */
{
  id: 'locks',
  icon: '🔒',
  title: 'Race Conditions — Aur Unhe Theek Karne Ke Teen Tareeke',
  badge: 'Lock Lohar',
  objectives: [
    'Check-then-act race — controlled interleaving se reproduce karo',
    '<code>SELECT … FOR UPDATE</code> (pessimistic) vs version column (optimistic)',
    'Sabse saaf ilaaj: shart ko <b>UPDATE ke andar</b> daal do',
    'MVCC — readers writers ko block kyun nahi karte',
  ],
  lesson: [
    `<h3>😬 Do lines ke beech ki khaali jagah</h3>
     <pre>SELECT qty FROM stock WHERE id = 7;     -- 1 bacha hai
IF (qty > 0) {
    UPDATE stock SET qty = qty - 1 WHERE id = 7;
}</pre>
     <p>Requests ka unsafe overlap na ho toh code sahi result de sakta hai.
     Agar dono checks kisi decrement se pehle chalein — dono ko <code>qty = 1</code> milta hai,
     dono <code>IF</code> paas karti hain, aur stock <b>−1</b> par chala jaata hai.</p>
     <p class="tip">🎯 Ise <b>check-then-act race</b> kehte hain. Same instant ya two cores
     zaroori nahi; unsafe operation order enough hai. Test barrier se dono reads
     complete karao, phir writes release karo. Isse failure repeatably inspect kar sakte ho.</p>
     <h3>⚠️ Transaction ise nahi rokti</h3>
     <p>Sabse badi galatfehmi: "maine <code>BEGIN</code> laga diya, ab safe hai".
     <b>Nahi.</b> Transaction <b>atomicity</b> deta hai — "sab ya kuch nahi".
     Woh yeh <b>nahi</b> kehta ki "koi aur beech mein na aaye".</p>`,
    `<h3>🛠️ Teen ilaaj</h3>
     <table>
       <tr><th>Tareeka</th><th>Kaise</th><th>Kab</th></tr>
       <tr><td><b>1. Atomic condition</b></td><td><code>UPDATE … WHERE qty &gt; 0</code><br>affected rows dekho</td><td>⭐ <b>sabse saaf</b> — jab shart SQL mein likhi ja sake</td></tr>
       <tr><td><b>2. Pessimistic</b></td><td><code>SELECT … FOR UPDATE</code></td><td>hot row (sab ek hi row par ladte hain)</td></tr>
       <tr><td><b>3. Optimistic</b></td><td><code>UPDATE … WHERE version = ?</code></td><td>takraav kam ho — koi rukta nahi</td></tr>
     </table>
     <p>Pehla sabse achha hai aur log sabse kam use karte hain. Uska jaadu yeh hai
     ki <b>check aur write ek hi statement mein</b> hain — beech mein koi khaali jagah
     bachti hi nahi. DB khud us row par latch leta hai.</p>
     <pre>UPDATE stock SET qty = qty - 1 WHERE id = 7 AND qty > 0;
-- affected rows = 1 → mil gaya
-- affected rows = 0 → stock khatam tha (aur race hui hi nahi)</pre>
     <h3>🪟 MVCC — readers block kyun nahi hote</h3>
     <p>Purane databases mein ek writer poori table ko padhne se rok deta tha.
     Aaj (InnoDB, Postgres) <b>MVCC</b> hai: har row ke kai <b>versions</b> rehte hain.
     Jab tum <code>BEGIN</code> karte ho, tumhe us pal ka ek <b>snapshot</b> mil jaata hai.</p>
     <pre>Writer  : row ka NAYA version banata hai
Reader  : PURANA version padhta rehta hai — bina ruke
COMMIT  : ab se naye readers ko naya version dikhega</pre>
     <p class="tip">🎯 Isliye <b>"readers writers ko block nahi karte, writers readers ko nahi"</b>.
     Par <b>writer writer ko</b> abhi bhi block karta hai — do transactions ek hi
     row ko badalna chahein toh ek ko rukna hi padega. Yahin se lock waits aur
     deadlocks aate hain.</p>`,
  ],
  stages: [
    {
      type: 'flow',
      title: '🎬 Do requests, ek stock — race hote hue dekho',
      instructions: 'Ek-ek kadam chalao. Do sawaal beech mein aayenge.',
      scenario: `Ek hi product bacha hai (<code>qty = 1</code>). Do customers ne
        bilkul ek saath "Buy" dabaya. Dekho ki DB ke andar kya hota hai.`,
      lanes: [
        { id: 'a', label: '🙋 Request A' },
        { id: 'b', label: '🙋‍♂️ Request B' },
        { id: 'db', label: '🗄️ stock row' },
      ],
      state: (n) => [
        { k: 'qty (DB mein)', v: n >= 6 ? '-1  💥' : n >= 5 ? '0' : '1' },
        { k: 'A ne padha', v: n >= 1 ? '1' : '—' },
        { k: 'B ne padha', v: n >= 2 ? '1' : '—' },
      ],
      steps: [
        { lane: 'a', t: 'SELECT qty → 1', note: 'A ko stock mila. Ab woh apne code mein <code>if (qty > 0)</code> check karega.' },
        { lane: 'b', t: 'SELECT qty → 1', note: 'B ne bhi <b>1</b> hi padha — kyunki A ne abhi tak kuch likha hi nahi. Yahin race ka darwaza khulta hai.', bad: true },
        { lane: 'a', t: 'if (1 > 0) ✅', note: 'A ka check paas.',
          ask: {
            q: 'B ka check bhi paas hoga?',
            choices: [
              'Haan — usne bhi 1 padha tha, aur uske paas koi tareeka nahi ki A ka iraada pata chale',
              'Nahi, DB use rok dega',
              'Nahi, kyunki A pehle aaya tha',
              'Depends on isolation level',
            ],
            answer: 0,
            explain: 'B ke paas <b>purani sachchai</b> hai. Application-level <code>if</code> ko yeh pata hi nahi ki A kya karne wala hai. (Aur isolation level badalne se bhi yeh nahi rukta — SERIALIZABLE tak jaana padega, jo mehnga hai.)',
          } },
        { lane: 'b', t: 'if (1 > 0) ✅', note: 'B ka check bhi paas. Ab dono likhenge.', bad: true },
        { lane: 'a', t: 'UPDATE qty = 1 - 1 → 0', note: 'A ne likh diya. Stock ab 0.' },
        { lane: 'b', t: 'UPDATE qty = 1 - 1 → 0 … ya 0 - 1 → -1', note: 'B ne bhi likh diya. Agar usne <code>qty = qty - 1</code> likha toh stock <b>−1</b>. Ek hi item, do orders.', bad: true,
          ask: {
            q: 'Sabse saaf ilaaj kya hai?',
            choices: [
              'Shart ko UPDATE ke andar daalo: UPDATE … SET qty = qty - 1 WHERE id = 7 AND qty > 0',
              'BEGIN … COMMIT laga do',
              'Application mein ek mutex lagao',
              'Retry logic add karo',
            ],
            answer: 0,
            explain: 'Ab check aur write <b>ek hi statement</b> mein hain — beech mein khaali jagah bachti hi nahi, aur DB khud us row par latch le leta hai. <code>BEGIN</code> atomicity deta hai, mutual exclusion nahi. Mutex sirf <b>ek process</b> mein chalta hai (do pods par bekaar). Aur retry tab kaam aata hai jab kuch <b>fail</b> ho — yahan dono requests successful thi, bas natija galat tha.',
          } },
        { lane: 'db', t: 'UPDATE … WHERE id=7 AND qty > 0', note: 'Ab dobara chalao — A ko <code>affected rows = 1</code> milega aur B ko <code>0</code>. B ko turant pata chal jaayega ki stock khatam hai.', good: true },
        { lane: 'db', t: 'qty = 0, dono ko sahi jawab', note: 'Ek order bana, doosre ko saaf "out of stock". Koi lock, koi retry, koi extra code nahi — bas shart sahi jagah par.', good: true },
      ],
      insight: `<b>Check aur act ke beech ki har khaali jagah ek race hai.</b><br>
        Sabse saaf ilaaj us jagah ko <b>khatam</b> karna hai — shart ko
        <code>UPDATE</code> ke andar daal do aur <b>affected rows</b> dekho.
        Lock tab lo jab shart SQL mein likhi hi na ja sake.`,
    },
    {
      type: 'bins',
      title: 'Kaunsa ilaaj kahan',
      instructions: 'Har sthiti ke liye sahi tareeka chuno.',
      bins: [
        { id: 'atomic', label: '⚡ Atomic condition' },
        { id: 'pess', label: '🔒 SELECT … FOR UPDATE' },
        { id: 'opt', label: '🔁 Version column' },
      ],
      items: [
        { text: 'Stock ghatana — qty 0 se neeche na jaaye', bin: 'atomic', explain: '<code>UPDATE … SET qty = qty-1 WHERE id=? AND qty &gt; 0</code>. Ek statement, koi race nahi, koi lock nahi. Sabse saaf.' },
        { text: 'Wallet se paise kaatna, phir teen aur tables update karni hain', bin: 'pess', explain: 'Ek se zyada statement ek saath consistent chahiye — isliye row ko <code>FOR UPDATE</code> se pakdo aur poori transaction ke andar kaam karo.' },
        { text: 'User apni profile edit kar raha hai', bin: 'opt', explain: 'Takraav lagbhag kabhi nahi hoga. Version column se koi rukta nahi, aur dulrbh conflict par "kisi aur ne abhi badla, dobara dekho" dikha do.' },
        { text: 'Counter badhana — page views', bin: 'atomic', explain: '<code>UPDATE … SET views = views + 1</code>. DB khud latch leta hai. Yahan padhne ki zaroorat hi nahi.' },
        { text: 'Sabse popular concert seat — 50,000 log ek saath', bin: 'pess', explain: 'Bhaari contention ek hi row par. Optimistic mein lagbhag sab haarenge aur retry karenge — woh ek retry storm hai. Yahan line mein lagwana (lock) saaf hai.' },
        { text: 'Ek shared document ka title badalna', bin: 'opt', explain: 'Kam takraav, aur haarne ka nuksaan chhota. Rukna ulta bekaar hai.' },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: race ko SQL se hi maar do',
      instructions: 'Transaction kholo, atomic UPDATE chalao, phir COMMIT.',
      goal: `<b>(1)</b> <code>BEGIN;</code>
        <b>(2)</b> Atomic update chalao — shart <b>WHERE ke andar</b>:
        <code>UPDATE operators SET shift = 'night' WHERE opId = 1 AND shift = 'day';</code>
        <b>(3)</b> <code>SELECT opId, name, shift FROM operators WHERE opId = 1;</code> — badla ya nahi?
        <b>(4)</b> <code>COMMIT;</code>
        <br><br>Dhyaan do: shart <code>WHERE</code> mein hai, tumhare code ke <code>if</code> mein nahi.
        Isiliye do requests ek saath aayein toh <b>ek hi</b> jeetegi.`,
      tasks: T_LOCK,
      db: SG.factoryDB(),
      success: allOf(T_LOCK),
      hints: [
        'BEGIN;',
        "UPDATE operators SET shift = 'night' WHERE opId = 1 AND shift = 'day';",
        'SELECT opId, name, shift FROM operators WHERE opId = 1;',
        'COMMIT;',
      ],
    },
    {
      type: 'quiz',
      title: 'Races ki samajh',
      questions: [
        {
          q: 'SELECT aur UPDATE dono ek transaction ke andar hain. Race ruk jaayegi?',
          choices: [
            'Nahi — default isolation par dono transactions purani value padh lengi. Transaction ATOMICITY deta hai, mutual exclusion nahi',
            'Haan, transaction ise rokti hai',
            'Haan, agar rollback ho jaaye',
            'Haan, hamesha',
          ],
          answer: 0,
          explain: 'Yeh sabse aam galatfehmi hai. Transaction ka waada "sab ya kuch nahi" hai — <b>"koi aur beech mein na aaye" nahi</b>. Uske liye chahiye: shart <code>UPDATE</code> ke andar, ya <code>FOR UPDATE</code> lock, ya SERIALIZABLE (mehnga).',
        },
        {
          q: 'Sabse saaf ilaaj kaunsa hai — aur kyun?',
          choices: [
            'Shart ko UPDATE ke andar: check aur write ek hi statement, isliye beech mein khaali jagah bachti hi nahi',
            'FOR UPDATE — woh sabse surakshit hai',
            'Version column — woh sabse tez hai',
            'Application mutex',
          ],
          answer: 0,
          explain: 'Baaki dono <b>sahi</b> hain aur apni jagah zaroori hain. Par atomic condition sabse saaf isliye hai ki usme koi lock manage nahi karna, koi retry nahi likhni, aur koi khaali jagah bachti hi nahi. Use pehle try karo; lock tab lo jab shart SQL mein likhi na ja sake.',
        },
        {
          q: 'MVCC ke saath, ek lambi report query chal rahi hai. Kya woh writes ko rokegi?',
          choices: [
            'Nahi — reader purana snapshot padhta hai aur writer naya version banata rehta hai. Par writer-writer abhi bhi ek doosre ko rokte hain',
            'Haan, poori table lock ho jaayegi',
            'Haan, jab tak COMMIT na ho',
            'Sirf usi row par',
          ],
          answer: 0,
          explain: '"Readers writers ko block nahi karte, writers readers ko nahi" — yahi MVCC ka poora waada hai. Par dhyaan rakho: purane versions <b>kahin</b> rakhne padte hain, isliye ek bahut lambi transaction DB ko woh versions saaf karne se rok deti hai (Postgres mein bloat, MySQL mein history list badhna).',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Races',
    instructions: 'Yeh sawaal lagbhag har backend interview mein hai. 🎤',
    questions: [
      {
        q: '"Do users ek hi item khareedne ki koshish kar rahe hain. Kaise sambhaaloge?"',
        choices: [
          'Shart ko UPDATE ke andar: SET qty = qty-1 WHERE id=? AND qty > 0, phir affected rows dekho. Agar aur bhi steps hain toh transaction + SELECT … FOR UPDATE',
          'BEGIN … COMMIT laga dunga',
          'Application mein mutex',
          'Retry logic',
        ],
        answer: 0,
        explain: 'Achha jawab pehle <b>sabse sasta</b> hal deta hai, aur phir batata hai ki uski hadd kahan hai. Mutex ek <b>single-process</b> hal hai — do pods par woh bekaar hai, aur woh galti isliye chalak hai ki local testing mein woh kaam karti hui dikhti hai.',
      },
      {
        q: '"Optimistic ya pessimistic — kaise chunoge?"',
        choices: [
          'Contention rate se. Kam takraav → optimistic (koi rukta nahi). Ek hot row par sab ladte hain → pessimistic, kyunki optimistic wahan sabko baar-baar haraata hai',
          'Hamesha pessimistic, woh surakshit hai',
          'Hamesha optimistic, woh tez hai',
          'DB ke hisaab se',
        ],
        answer: 0,
        explain: 'Faisla ek hi number se hota hai: <b>kitni baar do requests ek hi row par takraati hain?</b> Optimistic ka faayda "koi rukta nahi" tabhi tak hai jab tak takraav kam hain — hot row par woh sabse CPU aur DB time jalwaata hai aur jeetta ek hi hai.',
      },
    ],
  },
  success: [
    'Check-then-act race pehchaan sakte ho',
    'Jaante ho ki transaction akela ise nahi rokti',
    'Teenon ilaaj chun sakte ho — aur pehla kyun sabse saaf hai',
    'MVCC ka waada aur uski hadd bata sakte ho',
  ],
  homework: `Apne code mein ek jagah dhoondo jahan tum kuch <b>padhte ho, phir uspar
    faisla lete ho, phir likhte ho</b> — stock, quota, "yeh naam liya hua hai?", balance.
    Poochho: kya woh shart <code>UPDATE … WHERE</code> mein daali ja sakti hai?
    Agar haan — woh ek line ka fix hai.`,
  cards: [
    { front: 'Check-then-act race?', back: 'SELECT → <code>if</code> → UPDATE. Do requests ek saath = dono ko purani value milti hai, dono paas ho jaati hain. Test mein nahi dikhta, production mein roz.' },
    { front: 'Transaction se race rukti hai?', back: '<b>Nahi.</b> Transaction <b>atomicity</b> deta hai ("sab ya kuch nahi"), <b>mutual exclusion nahi</b>.' },
    { front: 'Sabse saaf ilaaj?', back: 'Shart ko <b>UPDATE ke andar</b>: <code>SET qty = qty-1 WHERE id=? AND qty &gt; 0</code>, phir <b>affected rows</b> dekho. Check aur write ek hi statement = koi khaali jagah nahi.' },
    { front: 'Pessimistic vs optimistic?', back: 'Faisla <b>contention rate</b> se. Kam takraav → optimistic (<code>WHERE version = ?</code>). Hot row → pessimistic (<code>FOR UPDATE</code>), warna sab retry karke haarte hain.' },
    { front: 'MVCC ka waada?', back: 'Har row ke kai <b>versions</b>. Reader purana snapshot padhta hai, writer naya version banata hai → <b>readers writers ko block nahi karte</b>. Par <b>writer-writer</b> abhi bhi rukte hain.' },
    { front: 'MVCC ki chhupi hui keemat?', back: 'Purane versions <b>kahin rakhne</b> padte hain. Ek bahut lambi transaction unhe saaf hone se rokti hai → Postgres mein bloat, MySQL mein history list badhna.' },
  ],
},

/* =====================================================================
   S3 — Join algorithms & optimizer
   ===================================================================== */
{
  id: 'joinalgo',
  icon: '⚙️',
  title: 'JOIN Andar Se — Aur Optimizer Jhooth Kyun Bolta Hai',
  badge: 'Optimizer Ojha',
  objectives: [
    'Nested loop vs hash join vs merge join — EXPLAIN mein kaunsa',
    'Bina index ke nested loop <b>N × M</b> kyun ho jaata hai',
    'Optimizer <b>anumaan</b> lagata hai — aur galat anumaan sab bigaad deta hai',
    '<code>ANALYZE TABLE</code> kab chalana chahiye',
  ],
  lesson: [
    `<h3>🔁 JOIN ka matlab hai "har row ke liye…"</h3>
     <p>DB ke paas JOIN karne ke teen tareeke hain. EXPLAIN inhi ka naam batata hai —
     aur unka farak <b>samajhna</b> hi tuning ka aadha kaam hai.</p>
     <table>
       <tr><th>Tareeka</th><th>Kaise</th><th>Kab achha</th></tr>
       <tr><td><b>Nested loop</b></td><td>Bahar wali table ki har row ke liye andar wali mein dhoondo</td><td>bahar wali <b>chhoti</b> ho <b>aur</b> andar wali par <b>index</b> ho</td></tr>
       <tr><td><b>Hash join</b></td><td>Chhoti table ki ek hash table banao, phir badi ko ek baar scan karo</td><td>bade JOIN, koi index nahi, equality condition</td></tr>
       <tr><td><b>Merge join</b></td><td>Dono ko sort karo, phir zipper ki tarah milao</td><td>dono pehle se <b>sorted</b> hon (index se)</td></tr>
     </table>
     <p class="tip">🎯 Nested loop ka poora khel ek shart par tika hai:
     <b>andar wali table par index hai ya nahi</b>.
     Index hai → har lookup ~0.1 ms. Index nahi → har lookup ek <b>poora scan</b>.
     10,000 × 10,000 = <b>10 crore</b> row comparisons. Yahi 14-second wala dashboard hai.</p>`,
    `<h3>🎲 Optimizer anumaan lagata hai — aur kabhi-kabhi galat</h3>
     <p>DB ko decide karna hota hai: kaunsa index, kaunsa join algorithm, kaunsi table
     pehle. Woh yeh faisla <b>statistics</b> se leta hai — "is column mein kitni alag
     values hain", "yeh table kitni badi hai".</p>
     <p>Aur woh statistics <b>purani</b> ho sakti hain:</p>
     <pre>EXPLAIN kehta hai:  rows = 12       ← anumaan
Asli chala toh:     rows = 840000   ← sach

Natija: optimizer ne nested loop chuna (kyunki 12 rows lag rahi thi),
        aur woh 8.4 lakh baar chala.</pre>
     <p class="tip">🎯 Isliye <code>EXPLAIN</code> ka <code>rows</code> ek <b>anumaan</b> hai,
     naap nahi. Jab woh asli se bahut alag ho — wahi tumhara bug hai.
     MySQL 8 / Postgres mein <code>EXPLAIN ANALYZE</code> query ko <b>sach mein chala ke</b>
     dono numbers saath dikhata hai. Ilaaj: <code>ANALYZE TABLE</code>
     (statistics refresh) — khaas kar bade bulk load ya migration ke <b>baad</b>.</p>
     <h3>📋 EXPLAIN padhne ka kram</h3>
     <pre>1. type      ← ALL = poora scan. Yahi sabse pehle dekho
2. key       ← NULL = koi index laga hi nahi
3. rows      ← anumaan; asli se milao
4. Extra     ← "Using filesort" / "Using temporary" = chhupa hua kaam
             ← "Using index" = 🏆 covering, heap chhua hi nahi</pre>`,
  ],
  stages: [
    {
      type: 'flow',
      title: '🎬 Nested loop — bina index ke, phir index ke saath',
      instructions: 'Ek-ek kadam chalao. Numbers upar badalte dekho.',
      scenario: `<code>SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id</code>
        <br>orders mein <b>10,000</b> rows hain, customers mein bhi <b>10,000</b>.`,
      lanes: [
        { id: 'plan', label: '🧠 Optimizer' },
        { id: 'exec', label: '⚙️ Execution' },
      ],
      state: (n) => [
        { k: 'row comparisons', v: n >= 6 ? '10,000' : n >= 3 ? '10,00,00,000 💥' : '—' },
        { k: 'inner table par index', v: n >= 5 ? '✅ haan' : '❌ nahi' },
        { k: 'waqt', v: n >= 6 ? '~40 ms' : n >= 4 ? '~14 s 🔥' : '—' },
      ],
      steps: [
        { lane: 'plan', t: 'customers par koi index nahi mila', note: 'Optimizer ne dekha — <code>customers.id</code> par index hai hi nahi. Ab uske paas achhe options nahi bache.' },
        { lane: 'plan', t: 'Plan: NESTED LOOP', note: 'Bahar wali table <code>orders</code>, andar wali <code>customers</code>. Har order ke liye customers mein dhoondna padega.' },
        { lane: 'exec', t: 'orders ki row 1 → customers mein dhoondo', note: 'Index nahi hai, isliye <b>poori customers table</b> scan karni padi — 10,000 rows padhi, ek match nikala.', bad: true },
        { lane: 'exec', t: 'row 2 → dobara poora scan … row 10,000 tak', note: '10,000 × 10,000 = <b>10 crore</b> row comparisons. Yahi woh "dashboard 14 second leta hai" wali baat hai.', bad: true,
          ask: {
            q: 'Sabse chhota badlaav jo ise theek kare?',
            choices: [
              'ANDAR wali table ke JOIN column par index — har lookup poore scan se ek seek ban jaayega',
              'Bahar wali table par index',
              'LIMIT laga do',
              'Bada server lo',
            ],
            answer: 0,
            explain: 'Nested loop mein bahar wali table toh <b>poori padhni hi hai</b> — uspar index ka koi faayda nahi. Asli kharch <b>andar</b> hai: har row ke liye ek lookup. Index lagne se woh lookup O(n) se O(log n) ho jaata hai, aur 10 crore comparisons <b>10,000 seeks</b> ban jaate hain.',
          } },
        { lane: 'exec', t: '14 second baad natija', note: 'Query chali toh sahi — bas 14 second mein. Aur CPU 100% par tha, kyunki yeh sach mein kaam kar raha tha.', bad: true },
        { lane: 'plan', t: 'CREATE INDEX ON customers(id)', note: 'Ab optimizer ke paas ek raasta hai.', good: true },
        { lane: 'exec', t: 'Ab: 10,000 index seeks — ~40 ms', note: 'Wahi query, wahi data, wahi server. Sirf andar wali table par ek index. <b>350x</b> tez.', good: true },
      ],
      insight: `Nested loop bura nahi hai — woh <b>bina index ke</b> bura hai.
        Aur EXPLAIN mein iska nishaan saaf hai: andar wali table par
        <code>type: ALL</code>.<br><br>
        Agar index laga hi na sakte ho (jaise ek bade analytical JOIN mein),
        toh DB ko <b>hash join</b> chunne do — woh chhoti table ki hash table bana ke
        badi ko <b>ek baar</b> scan karta hai. Nested loop se bahut behtar,
        par usme memory lagti hai.`,
    },
    {
      type: 'bins',
      title: 'EXPLAIN padho',
      instructions: 'Har nishaani ko sahi bin mein daalo.',
      bins: [
        { id: 'ok', label: '✅ Theek hai' },
        { id: 'bad', label: '🔥 Isko theek karo' },
      ],
      items: [
        { text: 'type: ALL, key: NULL, rows: 8,40,000', bin: 'bad', explain: 'Poora table scan. Sabse pehla aur sabse aam problem — WHERE/JOIN column par index chahiye.' },
        { text: 'type: ref, key: idx_cust, rows: 12', bin: 'ok', explain: 'Index laga, thodi rows chhui. Yahi target hai.' },
        { text: 'Extra: Using filesort', bin: 'bad', explain: 'ORDER BY ke liye DB ko alag se sort karna pad raha hai. Agar index ka kram ORDER BY se milta ho toh yeh sort <b>muft</b> ho jaata hai.' },
        { text: 'Extra: Using index', bin: 'ok', explain: '🏆 <b>Covering index</b> — saare chahiye columns index mein hi mil gaye, asli table chhui hi nahi. Sabse tez raasta.' },
        { text: 'Extra: Using temporary', bin: 'bad', explain: 'DB ne beech mein ek temp table banayi (aksar GROUP BY / DISTINCT ke liye). Bade data par woh disk par ja sakti hai — tab query girti hai.' },
        { text: 'EXPLAIN rows: 12, par query 8 lakh rows laut rahi hai', bin: 'bad', explain: '<b>Statistics purani hain.</b> Optimizer ne galat anumaan par plan chuna. <code>ANALYZE TABLE</code> chalao — khaas kar bade bulk load ya migration ke baad.' },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: JOIN ko 350x tez karo',
      instructions: 'EXPLAIN se pehle dekho, index lagao, phir EXPLAIN se proof lo.',
      goal: `<b>(1)</b> <code>EXPLAIN SELECT o.name, s.userId FROM operators o JOIN bx50Sessions s ON o.opId = s.userId;</code>
        — dono tables ka <code>type</code> dekho.
        <b>(2)</b> Andar wali table ke JOIN column par index banao:
        <code>CREATE INDEX idx_sess_user ON bx50Sessions(userId);</code>
        <b>(3)</b> Wahi EXPLAIN dobara chalao.
        <b>(4)</b> <code>SHOW INDEXES FROM bx50Sessions;</code> se pakka karo.`,
      tasks: T_JOIN,
      db: SG.factoryDB(),
      success: allOf(T_JOIN),
      hints: [
        'EXPLAIN SELECT o.name, s.userId FROM operators o JOIN bx50Sessions s ON o.opId = s.userId;',
        'CREATE INDEX idx_sess_user ON bx50Sessions(userId);',
        'EXPLAIN SELECT o.name, s.userId FROM operators o JOIN bx50Sessions s ON o.opId = s.userId;',
        'SHOW INDEXES FROM bx50Sessions;',
      ],
    },
    {
      type: 'quiz',
      title: 'Optimizer ki samajh',
      questions: [
        {
          q: 'Nested loop JOIN mein index KAHAN sabse zyada matter karta hai?',
          choices: [
            'ANDAR wali table ke JOIN column par — bahar wali toh poori padhni hi hai',
            'Bahar wali table par',
            'Dono par barabar',
            'ORDER BY wale column par',
          ],
          answer: 0,
          explain: 'Bahar wali table ki har row toh dekhi hi jaayegi — uspar index ka koi faayda nahi. Asli kharch <b>andar</b> hai: har bahar wali row ke liye ek lookup. Index se woh lookup poore scan se ek seek ban jaata hai.',
        },
        {
          q: 'EXPLAIN rows: 12 dikhata hai, par query 8 lakh rows par chal rahi hai. Kya hua?',
          choices: [
            'Statistics purani hain — optimizer ne galat anumaan par plan chuna. ANALYZE TABLE chalao',
            'EXPLAIN mein bug hai',
            'Query galat hai',
            'Index corrupt hai',
          ],
          answer: 0,
          explain: '<code>rows</code> ek <b>anumaan</b> hai, naap nahi. Jab anumaan aur sach bahut alag hon, optimizer ka poora plan galat ho jaata hai (jaise nested loop chunna jahan hash join chahiye tha). Isiliye bade bulk load ya migration ke baad <code>ANALYZE TABLE</code> chalana chahiye.',
        },
        {
          q: '"Extra: Using index" ka kya matlab hai?',
          choices: [
            'Covering index — saare chahiye columns index mein mil gaye, asli table chhui hi nahi. Sabse tez',
            'Index use ho raha hai',
            'Index banaya ja raha hai',
            'Index ki zaroorat hai',
          ],
          answer: 0,
          explain: 'Yeh naam sabse confusing hai. "Using index" ≠ "index use hua". Uska matlab hai <b>index-only scan</b>: query ko jo bhi columns chahiye the woh sab index mein hi the, isliye asli row uthane ki zaroorat hi nahi padi. ("Index use hua" toh <code>key</code> column batata hai.)',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Optimizer',
    instructions: 'EXPLAIN padhna aana hi is round ka imtihaan hai. 🎤',
    questions: [
      {
        q: '"Ek JOIN query achanak dheemi ho gayi, code nahi badla. Kya dekhoge?"',
        choices: [
          'EXPLAIN se plan dekhunga aur rows ka anumaan asli se milaunga — data badhne par optimizer plan badal deta hai. Statistics purani hon toh ANALYZE TABLE',
          'Server resources dekhunga',
          'Query rewrite karunga',
          'Index add kar dunga',
        ],
        answer: 0,
        explain: '"Code nahi badla par query dheemi ho gayi" ka lagbhag hamesha ek hi matlab hota hai: <b>data badla</b>, aur uske saath plan badal gaya. Optimizer ke liye 1,000 rows aur 10 lakh rows do alag problems hain — aur woh purani statistics par galat faisla le sakta hai.',
      },
      {
        q: '"Hash join kab nested loop se behtar hai?"',
        choices: [
          'Jab dono tables badi hon aur JOIN column par index na ho — hash join badi table ko EK baar scan karta hai, jabki nested loop har row ke liye dobara scan karega',
          'Hamesha',
          'Jab memory zyada ho',
          'Chhoti tables par',
        ],
        answer: 0,
        explain: 'Ganit seedha hai: nested loop bina index ke <b>N × M</b> hai, hash join <b>N + M</b>. Isiliye analytics queries (bade JOIN, koi useful index nahi) mein hash join hi sahi hai. Kharch: hash table memory mein banti hai — na aaye toh woh disk par spill hoti hai aur dheemi ho jaati hai.',
      },
    ],
  },
  success: [
    'Teenon join algorithms aur unka "kab" bata sakte ho',
    'Bina index ke nested loop ka N×M samjha sakte ho',
    'EXPLAIN ke type/key/rows/Extra padh sakte ho',
    'Purani statistics ko ek asli wajah maante ho',
  ],
  homework: `Apni sabse dheemi JOIN query par <code>EXPLAIN</code> chalao.
    Char cheezein likho: <code>type</code>, <code>key</code>, <code>rows</code>, <code>Extra</code>.
    Phir query ko <code>COUNT(*)</code> mein badal ke chalao aur asli row count se
    <code>rows</code> ka anumaan milao. Bahut farak = statistics purani hain.`,
  cards: [
    { front: 'Teen join algorithms?', back: '<b>Nested loop</b> (har bahar row → andar lookup; index ho toh best) · <b>Hash join</b> (chhoti ki hash table + badi ka ek scan; bade JOIN bina index) · <b>Merge join</b> (dono sorted ho toh zipper).' },
    { front: 'Nested loop mein index kahan?', back: '<b>ANDAR wali table</b> ke JOIN column par. Bahar wali toh poori padhni hi hai. Bina index: 10k × 10k = <b>10 crore</b> comparisons.' },
    { front: 'EXPLAIN ka "rows"?', back: 'Ek <b>anumaan</b> hai, naap nahi. Anumaan aur sach mein bada farak = <b>purani statistics</b> → <code>ANALYZE TABLE</code>. (<code>EXPLAIN ANALYZE</code> dono dikhata hai.)' },
    { front: 'EXPLAIN padhne ka kram?', back: '<b>type</b> (ALL = scan) → <b>key</b> (NULL = index laga hi nahi) → <b>rows</b> (anumaan) → <b>Extra</b> (filesort/temporary = chhupa kaam; Using index = 🏆).' },
    { front: '"Using index" ka matlab?', back: '<b>Covering index</b> — saare chahiye columns index mein mil gaye, asli row uthaani hi nahi padi. ("Index use hua" toh <code>key</code> batata hai.)' },
    { front: 'Code nahi badla par query dheemi?', back: '<b>Data badla</b> — aur uske saath optimizer ka plan badal gaya. EXPLAIN se plan dekho, anumaan vs sach milao, phir <code>ANALYZE TABLE</code>.' },
  ],
},

/* =====================================================================
   S4 — Read replicas
   ===================================================================== */
{
  id: 'replicas',
  icon: '📑',
  title: 'Read Replicas — Kab Faayda, Kab Sirf Kharcha',
  badge: 'Replica Rakshak',
  objectives: [
    'Replica <b>reads</b> ko baantta hai — <b>writes</b> ko nahi',
    'Replication lag aur "maine abhi save kiya, dikh nahi raha"',
    'Read-after-write — teen ilaaj',
    'Kab replica sirf overhead hai',
  ],
  lesson: [
    `<h3>🎯 Replica ek hi cheez karta hai</h3>
     <pre>Primary  ──── writes ────►  Primary  (SIRF yahan)
                              │
                              ├──► Replica 1 ──► reads
                              └──► Replica 2 ──► reads</pre>
     <p>Har write <b>primary</b> par hi jaati hai, aur phir replicas tak
     <b>copy</b> hoti hai. Yaani replica se:</p>
     <table>
       <tr><td>✅ Read capacity badhti hai</td><td>reads N machines par bant gaye</td></tr>
       <tr><td>❌ Write capacity <b>bilkul nahi</b></td><td>writes abhi bhi ek hi machine par</td></tr>
       <tr><td>⚠️ Har replica ko wahi writes apply karni padti hain</td><td>replica primary se kam kaam nahi karta</td></tr>
     </table>
     <p class="tip">🎯 Yeh aakhri line hi sabse zyada chaunkati hai:
     agar tumhara problem <b>writes</b> ka hai, toh replica se <b>kuch nahi</b> hoga —
     woh ulta ek aur machine hai jo wahi saare writes apply kar rahi hai.
     Replica <b>read</b> problem ka hal hai, aur bas.</p>`,
    `<h3>⏳ Replication lag — aur uska classic bug</h3>
     <pre>t=0ms   user ne profile save kiya       → PRIMARY
t=5ms   page reload → GET /profile      → REPLICA
t=5ms   replica par abhi purana data hai → user ko PURANA naam dikha
t=80ms  replica catch up ho gaya         → ab sahi hai</pre>
     <p>User ko lagta hai save fail ho gaya. Woh <b>dobara</b> save karta hai.
     Yeh "read-after-write" ka classic bug hai, aur iske teen ilaaj hain:</p>
     <table>
       <tr><td><b>1. Apne writes primary se padho</b></td><td>save ke baad kuch second us user ko primary par bhejo</td><td>⭐ sabse practical</td></tr>
       <tr><td><b>2. Sticky session</b></td><td>us user ki saari reads ek hi replica se</td><td>lag phir bhi dikh sakta hai</td></tr>
       <tr><td><b>3. Wait-for-LSN</b></td><td>read se pehle replica ka position check karo</td><td>pakka, par mehnga aur complex</td></tr>
     </table>
     <h3>🚫 Kab replica sirf kharcha hai</h3>
     <pre>❌ Read : write ratio 2:1 hai        → reads problem hai hi nahi
❌ Primary 20% par chal raha hai      → capacity ki dikkat nahi hai
❌ Har read ko taaza data chahiye     → lag manzoor hi nahi, toh replica bekaar
❌ Sirf "HA ke liye" (par failover test kabhi kiya hi nahi)</pre>
     <p class="tip">🎯 Aur sabse bada dhoka: <b>replication ≠ backup</b>.
     Tumne galti se <code>DELETE FROM orders</code> chalaya? Woh delete
     <b>0.2 second mein</b> saare replicas par pahunch jaayega.
     Replica availability ke liye hai, galti se bachne ke liye nahi.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: replica kab faayda deta hai',
      instructions: 'Read aur write dono ghumao. Dekho ki replica kab madad karta hai aur kab nahi.',
      scenario: `Ek app hai. Primary ek machine hai jo <b>2,000 queries/sec</b> sambhaal sakti hai.
        Tum replicas add kar sakte ho — par yaad rakho ki <b>writes har replica par bhi</b> apply hoti hain.`,
      knobs: [
        { id: 'reads', label: 'Read queries/sec', min: 0, max: 8000, step: 200, value: 1000 },
        { id: 'writes', label: 'Write queries/sec', min: 0, max: 2000, step: 50, value: 500 },
        { id: 'reps', label: 'Read replicas', min: 0, max: 6, step: 1, value: 0 },
      ],
      readouts: [
        { id: 'pri', label: 'Primary ka load', unit: '', format: x => Math.round(x) + ' / 2000',
          fn: v => v.writes + (v.reps ? 0 : v.reads),
          good: x => x < 2000 },
        { id: 'per', label: 'Har replica ka load', unit: '',
          fn: v => v.reps ? Math.round(v.reads / v.reps + v.writes) : 0,
          good: (x, v) => !v.reps || x < 2000,
          sub: (x, v) => v.reps ? `${Math.round(v.reads / v.reps)} reads + <b>${v.writes} writes</b> (yeh sabko karni hi hain)` : 'koi replica nahi' },
        { id: 'ratio', label: 'Read : write', unit: '',
          format: x => x >= 100 ? '100+' : (Math.round(x * 10) / 10) + ' : 1',
          fn: v => v.writes ? v.reads / v.writes : 999,
          good: x => x >= 5 },
        { id: 'machines', label: 'Kitni machines', unit: '', fn: v => 1 + v.reps, good: x => x <= 5 },
      ],
      verdict: (v, r) => {
        if (r.pri >= 2000 && !v.reps) return { tone: 'bad', text: '🔥 <b>Primary dab raha hai.</b> Agar zyadatar load <b>reads</b> ka hai toh replica se woh bant jaayega — slider ghumao.' };
        if (v.reps && r.per >= 2000) return { tone: 'bad', text: `🔥 <b>Replicas se bhi kaam nahi bana.</b> Dekho kyun: har replica ko <b>${v.writes} writes</b> bhi apply karni hain. Agar write rate hi hadd ke paas hai, toh replica add karna bekaar hai — tumhe <b>sharding</b> chahiye.` };
        if (v.reps && r.ratio < 3) return { tone: 'warn', text: `⚠️ <b>Replica yahan sirf kharcha hai.</b> Read:write ${Math.round(r.ratio * 10) / 10}:1 hai — reads koi badi problem hain hi nahi, par tumne ${v.reps} aur machine(s) chala di jo har write ko dobara apply kar rahi hain.` };
        if (v.reps) return { tone: 'good', text: '✅ <b>Yahi replica ki sahi jagah hai:</b> read-heavy load, aur write rate ek machine ke andar.' };
        return { tone: '', text: 'Read aur write ka ratio badal ke dekho — replica ka faayda usi se aata hai.' };
      },
      goal: { text: '<b>6,000 reads/sec</b> aur <b>200 writes/sec</b> par har machine ko 2,000 ke andar laao — aur <b>5 se zyada machine mat</b> use karo.',
        check: (v, r) => v.reads >= 6000 && v.writes <= 200 && v.reps >= 1 && r.per < 2000 && (1 + v.reps) <= 5 },
      insight: `Replica ka faayda <b>ratio</b> se aata hai, load se nahi.<br><br>
        Read-heavy (100:1) → replica se poora read load bant jaata hai.<br>
        Write-heavy → replica <b>bekaar</b> hai, kyunki har replica ko wahi saare
        writes apply karne hi hain. Wahan jawab <b>sharding</b> hai.`,
    },
    {
      type: 'flow',
      title: '🎬 "Maine save kiya, dikh nahi raha"',
      instructions: 'Ek-ek kadam chalao — bug hote hue dekho, phir theek karo.',
      scenario: `User ne apna naam badla. Write primary par gayi. Page reload hua —
        aur reload ki read ek <b>replica</b> se aayi.`,
      lanes: [
        { id: 'u', label: '🙋 User' },
        { id: 'p', label: '🗄️ Primary' },
        { id: 'r', label: '📑 Replica' },
      ],
      state: (n) => [
        { k: 'primary par naam', v: n >= 2 ? 'Priya' : 'Riya' },
        { k: 'replica par naam', v: n >= 5 ? 'Priya' : 'Riya' },
        { k: 'replication lag', v: n >= 2 && n < 5 ? '~80 ms' : '0 ms' },
      ],
      steps: [
        { lane: 'u', t: 'Naam badla: Riya → Priya, Save', note: 'Form submit. Write primary par jaayegi.' },
        { lane: 'p', t: 'UPDATE users SET name = "Priya" ✅', note: 'Primary par ho gaya. Response 200. User ko lagta hai kaam ho gaya.' },
        { lane: 'u', t: 'Page reload → GET /profile', note: 'Load balancer ne is read ko ek <b>replica</b> par bhej diya (reads wahin jaate hain).' },
        { lane: 'r', t: 'SELECT name → "Riya" 😱', note: 'Replica ko woh write abhi mili hi nahi. User ko <b>purana naam</b> dikha.', bad: true,
          ask: {
            q: 'User ab kya karega?',
            choices: [
              'Dobara save karega — usse lagta hai pehli baar fail ho gaya',
              'Intezaar karega',
              'Support ko likhega',
              'Refresh karega',
            ],
            answer: 0,
            explain: 'Yahi is bug ka asli nuksaan hai. User ko lagta hai save fail hua, isliye woh <b>dobara</b> karta hai — aur ab tumhare paas duplicate submissions, dobara bheje gaye emails, ya double charge ho sakte hain. Ek "chhota sa" 80ms lag ek data problem ban jaata hai.',
          } },
        { lane: 'r', t: '80 ms baad replica catch up', note: 'Ab replica par bhi "Priya" hai. Data kabhi galat nahi tha — bas <b>der</b> se aaya.' },
        { lane: 'p', t: 'Fix: save ke 10s tak is user ki reads PRIMARY se', note: 'Sabse practical ilaaj. Sirf <b>us user</b> ke liye, sirf <b>kuch second</b> ke liye — baaki sabke reads replicas par hi rehte hain.', good: true },
        { lane: 'u', t: 'Reload → "Priya" ✅', note: 'Ab user ko apna likha hua turant dikhta hai. Yeh <b>read-your-own-writes</b> consistency hai.', good: true },
      ],
      insight: `<b>Replication lag ek bug nahi, ek design hai</b> — aur uska ilaaj
        UX/routing mein hai, DB mein nahi.<br><br>
        Sabse practical fix: <b>"apne writes ke baad kuch second primary se padho"</b>.
        Yeh sirf ek user aur sirf kuch second ke liye hai, isliye replica ka
        poora faayda bana rehta hai.`,
    },
    {
      type: 'bins',
      title: 'Yeh read kahan bhejo',
      instructions: 'Har read ko sahi jagah bhejo.',
      bins: [
        { id: 'pri', label: '🗄️ Primary' },
        { id: 'rep', label: '📑 Replica' },
      ],
      items: [
        { text: 'User ne abhi profile save ki, ab reload', bin: 'pri', explain: 'Read-your-own-writes. Save ke kuch second baad tak <b>usi user</b> ki reads primary se — warna use apna likha hua nahi dikhega.' },
        { text: 'Monthly analytics report — 40 lakh rows par aggregate', bin: 'rep', explain: 'Bhaari, aur thoda purana data bilkul chalega. Yeh replica ka <b>sabse achha</b> use hai — bhaari query primary ke buffer pool ko dho hi nahi paayegi.' },
        { text: 'Checkout se pehle wallet balance', bin: 'pri', explain: 'Yahan stale value ka matlab hai overdraft. Paisa nikaalne se <b>pehle</b> wala check hamesha primary se, transaction ke andar.' },
        { text: 'Product catalog listing', bin: 'rep', explain: 'Read-heavy aur thodi der purana bilkul chalega. Classic replica traffic.' },
        { text: 'Login ke waqt password check', bin: 'pri', explain: 'Abhi-abhi password badla hua ho sakta hai. Aur security decisions par stale data ka risk lena galat hai.' },
        { text: 'Purane orders ka history page', bin: 'rep', explain: 'Purana data hai hi — kuch second aur purana hone se koi farak nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Replicas ki samajh',
      questions: [
        {
          q: 'Writes bahut zyada hain aur primary dab raha hai. Replica add karne se?',
          choices: [
            'Kuch nahi hoga — har replica ko wahi saare writes apply karne hi hain. Yahan jawab sharding hai',
            'Write load bant jaayega',
            'Aadha faayda milega',
            'Primary halka ho jaayega',
          ],
          answer: 0,
          explain: 'Yeh sabse aam galatfehmi hai. Replica ek <b>copy</b> hai — usse har write pahunchti hai aur woh use apply karti hai. Isliye woh primary se <b>kam kaam nahi</b> karta. Reads ke liye woh bemisaal hai; writes ke liye bilkul bekaar.',
        },
        {
          q: 'Read-after-write ka sabse practical ilaaj?',
          choices: [
            'Save ke baad kuch second tak US USER ki reads primary se bhejo',
            'Replication band kar do',
            'Sabki reads primary se',
            'Frontend mein value cache kar lo',
          ],
          answer: 0,
          explain: 'Yeh ilaaj isliye achha hai ki woh <b>bahut chhota</b> hai: sirf ek user, sirf kuch second. Baaki sab kuch replicas par hi chalta rehta hai. (Frontend cache bhi chalta hai aur aksar sahi hai — par woh doosre tab ya doosre device par kaam nahi karega.)',
        },
        {
          q: 'Replica hai — kya backup ki zaroorat hai?',
          choices: [
            'Haan — replication galti ko bhi copy kar deta hai. Galat DELETE 0.2 second mein saare replicas par pahunch jaayega',
            'Nahi, replica hi backup hai',
            'Nahi, agar 3 replicas hon',
            'Sirf compliance ke liye',
          ],
          answer: 0,
          explain: '<b>Replication ≠ backup.</b> Replica <b>availability</b> ke liye hai (machine gir jaaye), <b>galti</b> ke liye nahi. Backup ka poora point hai <b>waqt mein peeche</b> jaana — aur woh replica kabhi nahi de sakta.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Replicas',
    instructions: 'Yeh sawaal seedha yeh test karta hai ki tum reads/writes alag karte ho. 🎤',
    questions: [
      {
        q: '"DB dab raha hai. Read replica add karein?"',
        choices: [
          'Pehle poochhunga ki load READS ka hai ya WRITES ka. Read-heavy hai toh haan; write-heavy hai toh replica kuch nahi karega aur sharding ya batching dekhni padegi',
          'Haan, replica hamesha madad karta hai',
          'Nahi, pehle index dekho',
          'Haan, aur 3 add karo',
        ],
        answer: 0,
        explain: 'Ek sawaal ne poora jawab tay kar diya. (Aur "pehle index dekho" bhi ek achha instinct hai — replica ek slow query ko theek nahi karta, woh use N machines par <b>faila</b> deta hai.)',
      },
      {
        q: '"Replica lag 8 second ho gaya. Kya karoge?"',
        choices: [
          'Wajah dhoondhunga — aksar ek lambi transaction, ya bhaari bulk write, ya replica par single-threaded apply. Aur us beech read-after-write wale raaste primary par bhej dunga taaki users ko galat data na dikhe',
          'Aur replicas add kar dunga',
          'Replica restart kar dunga',
          'Lag normal hai, kuch nahi karunga',
        ],
        answer: 0,
        explain: 'Do hisse: <b>wajah</b> (bulk write, lambi transaction, ya apply ka single-threaded hona) aur <b>us beech users ko bachana</b>. Aur replicas add karna ulta bura hai — woh primary par aur load daalega.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki replica sirf reads baantta hai',
    'Replication lag aur read-after-write ka ilaaj jaante ho',
    'Pehchaan sakte ho ki replica kab sirf kharcha hai',
    'Replication aur backup ko alag rakhte ho',
  ],
  homework: `Apne app mein do reads dhoondo: ek jo <b>abhi ke write</b> ke baad hoti hai,
    aur ek jo ek report/list hai. Poochho: dono ek hi jagah se aa rahi hain?
    Agar haan, toh doosri wali replica par ja sakti hai — aur pehli ko primary par
    rehna hi chahiye.`,
  cards: [
    { front: 'Replica kya deta hai?', back: '<b>Sirf read capacity.</b> Writes abhi bhi ek primary par — aur har replica ko <b>wahi saare writes</b> apply karne padte hain. Write problem ka hal <b>sharding</b> hai, replica nahi.' },
    { front: 'Read-after-write bug?', back: 'Save primary par gaya, reload replica se aaya, user ko <b>purana</b> data dikha → woh <b>dobara save</b> karta hai (duplicate/double charge).' },
    { front: 'Uska sabse practical ilaaj?', back: '<b>Save ke kuch second baad tak US USER ki reads primary se.</b> Chhota fix — sirf ek user, sirf kuch second; baaki sab replicas par.' },
    { front: 'Replica kab sirf kharcha?', back: 'Read:write ratio kam (2:1) · primary waise hi 20% par · har read ko taaza data chahiye · "HA ke liye" par failover kabhi test hi nahi kiya.' },
    { front: 'Replication = backup?', back: '<b>Nahi.</b> Galat <code>DELETE</code> <b>0.2 second</b> mein saare replicas par pahunch jaayega. Replica = availability. Backup = <b>waqt mein peeche</b> jaana.' },
    { front: 'Replica lag 8 second — wajah?', back: 'Aksar: ek <b>lambi transaction</b>, ek <b>bhaari bulk write</b>, ya replica par <b>single-threaded apply</b>. Aur replicas add karna ulta bura — primary par aur load.' },
  ],
},

/* =====================================================================
   S5 — Sharding
   ===================================================================== */
{
  id: 'sharding',
  icon: '✂️',
  title: 'Sharding — Kab Haan, Kab Bilkul Nahi',
  badge: 'Shard Sadhak',
  objectives: [
    'Sharding se pehle ki <b>saari</b> seedhiyan',
    'Shard key ka chunav — aur woh wapas kyun nahi hota',
    'Cross-shard query aur transaction ka kharch',
    'Hot shard — sharding ka apna failure mode',
  ],
  lesson: [
    `<h3>🪜 Sharding se pehle ki seedhiyan</h3>
     <p>Sharding sabse aakhri kadam hai, pehla nahi. Uske pehle yeh sab try ho chuka hona chahiye:</p>
     <pre>1. Index lagao / query theek karo     ← aksar yahin kaam ho jaata hai
2. Cache lagao                        ← read load DB tak pahunche hi na
3. Bada server lo (vertical)          ← boring, par 10x tak sasta hai
4. Read replicas                      ← read-heavy ho toh
5. Purana data alag karo (archival)   ← table chhoti = sab tez
6. Ek table alag DB par (federation)  ← "sab kuch todna" se aasan
────────────────────────────────────
7. Sharding                           ← ab</pre>
     <p class="tip">🎯 Aaj ka ek server <b>64 core, 512 GB RAM, NVMe</b> ho sakta hai —
     usme kai TB aur hazaaron qps aaram se chalte hain. Zyadatar products sharding tak
     kabhi pahunchte hi nahi. Isliye pehla sawaal hamesha yeh hai:
     <b>"kaunsi cheez sach mein ek machine se bahar ja rahi hai — data size, write rate, ya connections?"</b></p>`,
    `<h3>🔑 Shard key — sabse mehnga faisla</h3>
     <p>Shard key woh column hai jisse tay hota hai ki row kis machine par jaayegi.
     Aur woh faisla lagbhag <b>wapas nahi</b> liya ja sakta — badalne ka matlab hai
     poora data dobara baantna.</p>
     <table>
       <tr><th>Achha shard key</th><th>Bura shard key</th></tr>
       <tr><td>Zyadatar queries mein maujood hota hai</td><td>Queries mein hota hi nahi (har query saare shards par)</td></tr>
       <tr><td>Load barabar baantta hai</td><td>Ek shard par 40% traffic (hot shard)</td></tr>
       <tr><td>Ek entity ka data ek jagah rakhta hai</td><td>Har kaam ke liye do shard chahiye</td></tr>
     </table>
     <pre>SaaS app  → tenant_id     ✅ har query mein hota hai, ek tenant ek jagah
Chat app  → conversation_id ✅ ek conversation ke messages saath
E-comm    → user_id        ✅ user ke orders saath
❌ created_at              → saara naya traffic ek hi shard par (hot)
❌ random/hash of id       → har query saare shards par (koi locality nahi)</pre>
     <h3>💸 Sharding ke baad kya KHATAM ho jaata hai</h3>
     <pre>❌ Cross-shard JOIN         — ab application mein merge karo
❌ Ek transaction do shards par — 2PC ya saga, dono mehnge
❌ Global AUTO_INCREMENT    — ab Snowflake/UUID chahiye
❌ Global unique constraint — "email unique" ab aasan nahi
❌ "SELECT COUNT(*)"        — ab N queries + jod</pre>
     <p class="tip">🎯 Yeh list hi sharding ki asli keemat hai — capacity nahi.
     Har cheez jo pehle ek query thi, ab ek <b>distributed problem</b> hai.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: sharding ki zaroorat hai ya nahi',
      instructions: 'Apne system ke numbers daalo. Neeche jawab live badlega.',
      scenario: `Ek machine aaram se sambhaal leti hai: <b>~4 TB</b> data, <b>~10,000</b> qps,
        aur <b>~5,000</b> writes/sec. Dekho ki tumhara load kahan khada hai.`,
      knobs: [
        { id: 'gb', label: 'Data size', min: 10, max: 20000, step: 10, value: 200, unit: 'GB' },
        { id: 'qps', label: 'Total queries/sec', min: 100, max: 40000, step: 100, value: 2000 },
        { id: 'wps', label: 'Writes/sec', min: 10, max: 20000, step: 10, value: 300 },
      ],
      readouts: [
        { id: 'dpct', label: 'Data — ek machine ka', unit: '%', fn: v => Math.round(v.gb / 4000 * 100), good: x => x < 80 },
        { id: 'qpct', label: 'Queries — ek machine ka', unit: '%', fn: v => Math.round(v.qps / 10000 * 100), good: x => x < 80 },
        { id: 'wpct', label: 'Writes — ek machine ka', unit: '%', fn: v => Math.round(v.wps / 5000 * 100), good: x => x < 80 },
        { id: 'shards', label: 'Kitne shards chahiye', unit: '',
          fn: v => Math.max(1, Math.ceil(Math.max(v.gb / 4000, v.qps / 10000, v.wps / 5000))),
          good: x => x === 1,
          sub: x => x === 1 ? 'ek machine kaafi hai ✅' : `${x} machines — aur unke beech JOIN khatam` },
      ],
      verdict: (v, r) => {
        if (r.shards === 1) return { tone: 'good', text: '✅ <b>Sharding ki zaroorat nahi.</b> Sab kuch ek machine ke andar hai. Yahan sharding karna sirf complexity kharidna hai.' };
        if (r.wpct >= 80 && r.qpct < 80 && r.dpct < 80) return { tone: 'warn', text: '⚠️ Sirf <b>writes</b> hadd par hain. Pehle dekho: batching ho sakti hai? Bhaari indexes hain? Kya woh writes sach mein sab zaroori hain? Replica yahan <b>kaam nahi</b> aayega — par sharding se pehle yeh dekhna sasta hai.' };
        if (r.qpct >= 80 && r.wpct < 40) return { tone: 'warn', text: '⚠️ Load <b>read-heavy</b> hai. Pehle cache aur read replicas try karo — woh sharding se bahut sasta hai aur JOIN bhi nahi todta.' };
        if (r.dpct >= 80 && r.qpct < 50 && r.wpct < 50) return { tone: 'warn', text: '⚠️ Sirf <b>data size</b> hadd par hai, load nahi. Pehle archival dekho — purana data alag jagah bhejo. Aksar 80% data 5% queries khaata hai.' };
        return { tone: 'bad', text: `🔥 Sach mein <b>${r.shards} shards</b> chahiye — ek se zyada dimension hadd par hai. Ab shard key ka chunav sabse zaroori faisla hai (aur woh wapas nahi hota).` };
      },
      goal: { text: 'Aisi jagah dhoondo jahan sach mein <b>2 ya zyada shards</b> chahiye — aur uske baad ek aisi jagah jahan <b>ek machine kaafi</b> ho.',
        check: (v, r) => r.shards >= 2 },
      insight: `Dhyaan do ki teen alag dimensions the — <b>data size</b>, <b>queries</b>,
        <b>writes</b> — aur teenon ke alag ilaaj hain:<br>
        • sirf data bada → <b>archival</b><br>
        • sirf reads zyada → <b>cache + replicas</b><br>
        • sirf writes zyada → <b>batching, kam indexes</b>, phir sharding<br><br>
        Sharding tabhi sahi hai jab in sasti seedhiyon ke baad bhi ek machine kaafi na ho.`,
    },
    {
      type: 'bins',
      title: 'Shard key chuno',
      instructions: 'Har system ke liye — yeh shard key achha hai ya bura?',
      bins: [
        { id: 'good', label: '✅ Achha shard key' },
        { id: 'bad', label: '❌ Bura shard key' },
      ],
      items: [
        { text: 'SaaS app → tenant_id', bin: 'good', explain: 'Lagbhag har query mein <code>tenant_id</code> hota hai, aur ek tenant ka poora data ek shard par rehta hai. Cross-shard query ki zaroorat hi nahi padti.' },
        { text: 'Orders table → created_at', bin: 'bad', explain: '<b>Hot shard.</b> Aaj ka saara traffic ek hi shard par jaayega, aur purane shards khaali baithe rahenge. Time-based partitioning <b>ek machine ke andar</b> theek hai, sharding key ke roop mein nahi.' },
        { text: 'Chat app → conversation_id', bin: 'good', explain: 'Ek conversation ke saare messages ek jagah — aur queries hamesha "is conversation ke messages" hoti hain. Perfect locality.' },
        { text: 'Users table → hash(random_uuid)', bin: 'bad', explain: 'Load toh barabar bantega, par <b>locality khatam</b>. "Is user ke orders" ke liye ab pata hi nahi kaunsa shard — har query saare shards par jaayegi.' },
        { text: 'E-commerce → user_id', bin: 'good', explain: 'User ke orders, cart, address — sab ek jagah. Aur zyadatar queries user ke context mein hi hoti hain.' },
        { text: 'Multi-tenant app → country', bin: 'bad', explain: 'Sirf 195 values, aur woh <b>bahut asamaan</b> hain — India/US wale shard phat jaayenge aur baaki khaali. Kam-cardinality aur skewed key sharding ke liye sabse bura chunav hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Sharding ki samajh',
      questions: [
        {
          q: 'Sharding se pehle kaunsi seedhi sabse zyada bhooli jaati hai?',
          choices: [
            'Purana data archive karna — aksar 80% data sirf 5% queries khaata hai',
            'Bada server lena',
            'Index lagana',
            'Cache lagana',
          ],
          answer: 0,
          explain: 'Index aur cache toh sabko yaad rehte hain. <b>Archival</b> bhoola jaata hai — aur woh aksar sabse bada jeet deta hai: 3 saal purane orders alag table/DB mein bhej do aur active table ek-chauthai ho jaati hai (index chhote, cache mein zyada fit, backups tez).',
        },
        {
          q: 'Shard key badalna kitna mushkil hai?',
          choices: [
            'Lagbhag ek nayi migration — poora data dobara baantna padta hai, aksar dual-write + backfill + cutover ke saath',
            'Ek config change',
            'ALTER TABLE se ho jaata hai',
            'Automatic hota hai',
          ],
          answer: 0,
          explain: 'Isiliye shard key ka faisla is poore level ka sabse zaroori hissa hai. Woh lagbhag <b>hamesha ke liye</b> hai. Pehle likh ke dekho ki tumhari <b>top 10 queries</b> mein woh column hai ya nahi — agar nahi, toh woh galat key hai.',
        },
        {
          q: 'Sharding ke baad kya khatam ho jaata hai?',
          choices: [
            'Cross-shard JOIN, ek transaction do shards par, global AUTO_INCREMENT, aur global unique constraint',
            'Kuch nahi, sab waisa hi chalta hai',
            'Sirf performance badhti hai',
            'Backups mushkil ho jaate hain',
          ],
          answer: 0,
          explain: 'Yahi sharding ki <b>asli keemat</b> hai — capacity nahi. Har cheez jo pehle ek query thi (JOIN, COUNT(*), "email unique") ab ek <b>distributed problem</b> hai. Isiliye jab tak koi dimension sach mein ek machine se bahar na ja rahi ho, sharding sirf complexity kharidna hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Sharding',
    instructions: '"Kab nahi" bol paana yahan sabse bada signal hai. 🎤',
    questions: [
      {
        q: '"Table 500 GB ki ho gayi. Shard karein?"',
        choices: [
          'Abhi nahi — 500 GB ek machine ke liye theek hai. Pehle poochhunga ki dard kya hai: slow queries (index), read load (cache/replica), ya purana data (archival). Sharding tab jab in sabke baad bhi ek machine kaafi na ho',
          'Haan, 500 GB bahut hai',
          'Haan, 100 GB se upar hamesha shard karo',
          'Nahi, kabhi shard mat karo',
        ],
        answer: 0,
        explain: 'Size akela kabhi sharding ka karan nahi hota. Aaj ki ek machine kai TB rakh leti hai. Achha jawab pehle <b>dard</b> poochhta hai — kyunki 500 GB ki table jispar 200 qps hain, aur 500 GB ki table jispar 30,000 qps hain, do bilkul alag problems hain.',
      },
      {
        q: '"Shard key kaise chunoge?"',
        choices: [
          'Apni top 10 queries likhunga aur dekhunga ki kaunsa column lagbhag sabme hai — woh key har query ko ek shard tak seemit karegi. Phir distribution check karunga taaki koi hot shard na bane',
          'Primary key',
          'Random hash — woh sabse barabar baantta hai',
          'created_at',
        ],
        answer: 0,
        explain: 'Do sharten ek saath chahiye: <b>locality</b> (query ek shard tak seemit rahe) aur <b>even distribution</b> (koi shard jale nahi). Random hash doosri shart poori karta hai aur pehli tod deta hai — har query saare shards par chali jaayegi.',
      },
    ],
  },
  success: [
    'Sharding se pehle ki saari seedhiyan bata sakte ho',
    'Achha vs bura shard key pehchaan sakte ho',
    'Sharding ki asli keemat (JOIN, transaction, constraints) jaante ho',
    'Hot shard ka khatra samajhte ho',
  ],
  homework: `Apni sabse badi table lo aur teen numbers likho: size (GB), queries/sec, writes/sec.
    Har ek ko ek machine ki hadd se baanto. Agar teenon 50% se neeche hain —
    sharding ka sawaal hi nahi hai. Aur agar ek hadd par hai, toh dekho ki
    uska apna sasta ilaaj kya hai.`,
  cards: [
    { front: 'Sharding se pehle ki seedhiyan?', back: 'index/query fix → cache → bada server → read replicas → <b>archival</b> → federation (ek table alag DB) → <b>phir</b> sharding.' },
    { front: 'Achha shard key?', back: '<b>Zyadatar queries mein maujood</b> (locality) + <b>load barabar baantta</b> (koi hot shard nahi). SaaS → tenant_id · chat → conversation_id · e-comm → user_id.' },
    { front: 'Bure shard keys?', back: '<code>created_at</code> (saara naya traffic ek shard par) · <b>random hash</b> (locality khatam — har query saare shards par) · <code>country</code> (kam cardinality + skew).' },
    { front: 'Sharding ke baad kya khatam?', back: 'Cross-shard JOIN · ek transaction do shards par · global AUTO_INCREMENT · global unique constraint · <code>COUNT(*)</code>. <b>Yahi asli keemat hai</b>, capacity nahi.' },
    { front: 'Shard key badalna?', back: 'Lagbhag ek <b>nayi migration</b> — poora data dobara baantna (dual-write + backfill + cutover). Isliye pehle apni <b>top 10 queries</b> mein woh column dhoondo.' },
    { front: 'Sabse bhooli hui seedhi?', back: '<b>Archival.</b> Aksar 80% data sirf 5% queries khaata hai — purana alag karo aur active table ek-chauthai ho jaati hai.' },
  ],
},

/* =====================================================================
   S6 — CAP: CP kab, AP kab
   ===================================================================== */
{
  id: 'capdb',
  icon: '🌐',
  title: 'CAP — CP Kab Chuno, AP Kab',
  badge: 'Tradeoff Tapasvi',
  objectives: [
    'CAP ka asli matlab: chunav sirf <b>partition ke doraan</b> hota hai',
    'CP = ruk jao · AP = purana jawab do',
    'Yeh faisla <b>poore system</b> ka nahi, <b>har operation</b> ka hai',
    'PACELC — partition ke bina wala tradeoff, jo roz asar karta hai',
  ],
  lesson: [
    `<h3>🎯 CAP ka sabse zyada galat samjha jaane wala hissa</h3>
     <p>Log kehte hain "CAP: teen mein se do chuno". Yeh <b>gumraah karne wala</b> hai.
     Asli baat yeh hai:</p>
     <pre>Network partition HOGA hi. Woh chunav nahi hai — woh mausam hai.
Sawaal sirf itna hai: JAB woh ho, tab tum kya karoge?

   CP  →  jawab dena BAND karo (error do), taaki galat jawab na jaaye
   AP  →  jawab dete raho, chahe woh THODA PURANA ho</pre>
     <p class="tip">🎯 Aur "CA" jaisa kuch hota hi nahi. Network partition mein
     tumhare paas sirf do raaste hain: ruk jao, ya purana jawab do.
     Teesra option ("dono") maujood hi nahi hai.</p>
     <h3>🧭 Kaise chuno — ek hi sawaal</h3>
     <p class="tip">🎯 <b>"Galat/purana jawab dena zyada mehnga hai, ya koi jawab na dena?"</b></p>
     <table>
       <tr><th>Situation</th><th>Chunav</th><th>Kyun</th></tr>
       <tr><td>Bank balance, seat booking, stock</td><td><b>CP</b></td><td>Galat jawab = paisa/oversell. Error dikhana behtar hai</td></tr>
       <tr><td>Social feed, product listing, likes</td><td><b>AP</b></td><td>30 second purana feed bilkul theek. "Site down" nahi</td></tr>
       <tr><td>Shopping cart</td><td><b>AP</b></td><td>Cart dikhna zaroori hai. Conflict baad mein merge kar lo</td></tr>
       <tr><td>Checkout ka final stock check</td><td><b>CP</b></td><td>Wahi cart, par <b>yeh operation</b> CP hai</td></tr>
     </table>
     <p>Aakhri do rows dhyaan se padho: <b>ek hi system</b> mein cart AP hai aur
     checkout CP. Isliye CAP ka faisla <b>poore system</b> ka nahi hota —
     <b>har operation</b> ka hota hai.</p>`,
    `<h3>⚡ PACELC — woh hissa jo roz asar karta hai</h3>
     <pre>PAC   — agar Partition ho, toh Availability ya Consistency?
ELC   — Else (partition na ho), toh Latency ya Consistency?</pre>
     <p>Doosra hissa zyada kaam ka hai, kyunki partition kabhi-kabhi hota hai par
     <b>latency vs consistency</b> ka sauda tum <b>har request</b> par kar rahe ho:</p>
     <pre>Strong read  →  primary se, sabka intezaar    →  sahi par DHEEMA
Stale read   →  paas wale replica se           →  TEZ par thoda purana</pre>
     <p>Yeh bilkul wahi cheez hai jo tumne replicas level mein dekhi thi —
     bas ab uska naam pata hai.</p>
     <h3>🗄️ Databases kahan khade hain</h3>
     <table>
       <tr><td><b>Postgres / MySQL</b> (single primary)</td><td>CP</td><td>primary gaya = writes band, jab tak failover na ho</td></tr>
       <tr><td><b>Cassandra / DynamoDB</b></td><td>AP (tunable)</td><td>quorum se tum har query par CP/AP chun sakte ho</td></tr>
       <tr><td><b>MongoDB</b> (replica set)</td><td>CP by default</td><td>par read preference se AP jaisa bana sakte ho</td></tr>
       <tr><td><b>Redis</b> (async replication)</td><td>AP</td><td>failover par kuch aakhri writes ja sakti hain</td></tr>
     </table>
     <p class="tip">🎯 "Tunable consistency" hi aaj ka asli jawab hai:
     Cassandra mein <code>QUORUM</code> likho aur <code>QUORUM</code> padho toh CP jaisa;
     <code>ONE</code> padho toh AP jaisa. Yaani ek hi DB mein tum
     <b>har operation ke liye alag</b> chunav kar sakte ho — bilkul waise jaise
     cart AP aur checkout CP tha.</p>`,
  ],
  stages: [
    {
      type: 'flow',
      title: '🎬 Partition ho gaya — ab do raaste',
      instructions: 'Ek-ek kadam chalao. Beech mein tumhe faisla lena hoga.',
      scenario: `Do datacenters hain, dono mein DB ka ek node. Beech ka network
        <b>toot gaya</b>. Dono nodes zinda hain — par ek doosre se baat nahi kar sakte.`,
      lanes: [
        { id: 'a', label: '🏢 DC-A (node 1)' },
        { id: 'b', label: '🏢 DC-B (node 2)' },
        { id: 'u', label: '🙋 User' },
      ],
      state: (n) => [
        { k: 'network', v: n >= 1 ? '❌ toota hua' : '✅ theek' },
        { k: 'DC-A par balance', v: n >= 6 ? '₹500' : '₹1000' },
        { k: 'DC-B par balance', v: n >= 6 ? '₹1000 (purana)' : '₹1000' },
      ],
      steps: [
        { lane: 'a', t: 'Sab theek chal raha hai — dono nodes sync', note: 'Normal din. Har write dono par pahunchti hai.' },
        { lane: 'b', t: '💥 Network toot gaya', note: 'Dono nodes zinda hain, dono ke paas data hai — par woh ek doosre se baat nahi kar sakte. Kisi ko nahi pata ki doosri taraf kya ho raha hai.', bad: true,
          ask: {
            q: 'Ab DC-B par ek write aayi. Uske paas kitne raaste hain?',
            choices: [
              'Do — ya toh error do (CP), ya akele hi accept karo aur baad mein merge karo (AP)',
              'Teen — CP, AP, ya CA',
              'Ek — hamesha error dena chahiye',
              'Woh DC-A se poochh lega',
            ],
            answer: 0,
            explain: 'Woh DC-A se poochh <b>nahi</b> sakta — network toota hua hai, yahi toh partition ka matlab hai. Isliye sirf do raaste bachte hain. "CA" ek option hai hi nahi: jab tum baat hi nahi kar sakte, toh ya toh ruko ya akele faisla lo.',
          } },
        { lane: 'b', t: 'Raasta 1 — CP: "503, abhi nahi"', note: '<b>CP</b>: node jawab dena band kar deta hai. Data kabhi galat nahi hoga — par user ko error mila. Bank balance ke liye yeh <b>sahi</b> hai.', good: true },
        { lane: 'b', t: 'Raasta 2 — AP: "yeh raha, thoda purana ho sakta hai"', note: '<b>AP</b>: node akele hi jawab deta hai. Site chalti rahegi — par do taraf ka data alag ho sakta hai. Feed ke liye yeh <b>sahi</b> hai.' },
        { lane: 'u', t: 'AP chuna — DC-A par ₹500 nikale', note: 'DC-A ne accept kar liya. Uske hisaab se balance ab ₹500 hai.' },
        { lane: 'u', t: 'Usi waqt DC-B par bhi ₹500 nikale', note: 'DC-B ko DC-A ka pata hi nahi — uske hisaab se abhi bhi ₹1000 the. Usne bhi accept kar liya. <b>Ab kul ₹1000 nikal gaye jabki ₹1000 hi the.</b>', bad: true,
          ask: {
            q: 'Isse kya seekha?',
            choices: [
              'Paise wale operations ke liye AP galat hai — wahan CP chahiye, chahe error dena pade',
              'AP hamesha galat hai',
              'Do datacenter nahi rakhne chahiye',
              'Network kabhi tootna nahi chahiye',
            ],
            answer: 0,
            explain: 'AP bura nahi hai — woh <b>is operation</b> ke liye galat tha. Usi bank app mein "transaction history dekho" AP ho sakta hai (thoda purana chalega), par "paise nikaalo" CP hona chahiye. Faisla <b>poore system</b> ka nahi, <b>har operation</b> ka hai.',
          } },
        { lane: 'a', t: 'Network wapas aaya — ab conflict merge karna hai', note: 'AP ka bill yahan aata hai: dono taraf ke badlaav ko milana padta hai. Kabhi automatic (CRDT, last-write-wins), kabhi insaan ko dekhna padta hai.' },
        { lane: 'u', t: 'Sahi design: cart AP, checkout CP', note: 'Ek hi app mein dono. Cart hamesha dikhna chahiye (AP); paisa kaatne wala step ruk jaana chahiye agar pakka na ho (CP).', good: true },
      ],
      insight: `<b>CAP ka faisla poore system ka nahi, har operation ka hai.</b><br><br>
        Aur chunne ka sawaal ek hi hai:
        <b>"purana/galat jawab dena zyada mehnga hai, ya koi jawab na dena?"</b><br><br>
        Feed → purana chalega (AP). Balance → nahi chalega (CP).
        Ek hi system mein dono ho sakte hain, aur aksar hone chahiye.`,
    },
    {
      type: 'bins',
      title: 'CP ya AP?',
      instructions: 'Har operation ke liye chuno. Dhyaan do — kai baar ek hi app ke do operations alag hote hain.',
      bins: [
        { id: 'cp', label: '🛑 CP — ruk jao' },
        { id: 'ap', label: '🟢 AP — purana jawab do' },
      ],
      items: [
        { text: 'Bank se paise nikalna', bin: 'cp', explain: 'Galat jawab = paisa gaya. Error dikhana kahin sasta hai. ("Abhi try nahi kar sakte" se koi naraz nahi hota; do baar paisa katne se hota hai.)' },
        { text: 'Social feed dikhana', bin: 'ap', explain: '30 second purana feed bilkul theek hai. "Site down" bilkul nahi. Yahan availability hi product hai.' },
        { text: 'Concert seat book karna', bin: 'cp', explain: 'Do logon ko ek seat bech dena refund, support aur bharosa — teenon ka nuksaan hai.' },
        { text: 'Product page ke reviews', bin: 'ap', explain: 'Ek naya review 10 second baad dikhe toh kisi ko farak nahi. Par page ka na khulna seedha sale ka nuksaan hai.' },
        { text: 'Shopping cart mein item add karna', bin: 'ap', explain: 'Cart hamesha kaam karna chahiye. Do device se conflict ho jaaye toh merge kar lo (aksar union le lo) — yeh Amazon ka classic Dynamo wala case hai.' },
        { text: 'Checkout par final stock check', bin: 'cp', explain: 'Wahi cart, par <b>yeh operation</b> alag hai. Yahan oversell ka daam asli hai. Isliye ek hi flow mein cart AP aur checkout CP.' },
        { text: 'YouTube ka view counter', bin: 'ap', explain: '"1.2M views" mein exactness ka koi mol nahi. Aur counter ke liye site rokna paagalpan hoga.' },
      ],
    },
    {
      type: 'quiz',
      title: 'CAP ki samajh',
      questions: [
        {
          q: 'CAP mein "teen mein se do chuno" kyun gumraah karta hai?',
          choices: [
            'Partition ek chunav nahi hai — woh HOTA hai. Chunav sirf yeh hai ki us waqt C ya A. "CA" jaisa kuch hai hi nahi',
            'Kyunki teenon mil sakte hain',
            'Kyunki CAP purana ho gaya',
            'Kyunki modern DB alag hain',
          ],
          answer: 0,
          explain: 'Network tootna mausam hai, faisla nahi. Isliye asli sawaal hamesha yeh hai: <b>"jab woh toote, tab kya karoge?"</b> — ruk jao (CP) ya purana jawab do (AP). "Hum CA hain" ka matlab aksar hota hai "humne socha hi nahi".',
        },
        {
          q: 'Ek hi app mein CP aur AP dono ho sakte hain?',
          choices: [
            'Haan — cart AP (hamesha khule), checkout CP (pakka ho tabhi). Faisla har OPERATION ka hota hai',
            'Nahi, poore system ka ek hi chunav hota hai',
            'Haan, par do alag databases chahiye',
            'Sirf microservices mein',
          ],
          answer: 0,
          explain: 'Yeh is level ka sabse kaam ka hissa hai. Amazon ka classic udaharan: cart AP hai (hamesha add kar sakte ho, conflict baad mein merge), par checkout CP. Aur tunable consistency (Cassandra ka QUORUM vs ONE) tumhe yeh chunav <b>per query</b> deta hai.',
        },
        {
          q: 'PACELC ka "ELC" hissa roz kyun zyada asar karta hai?',
          choices: [
            'Kyunki partition kabhi-kabhi hota hai, par latency-vs-consistency ka sauda tum HAR request par kar rahe ho (primary se padho ya replica se)',
            'Kyunki woh naya hai',
            'Kyunki partitions ab nahi hote',
            'Kyunki woh sirf NoSQL par lagta hai',
          ],
          answer: 0,
          explain: 'Partition mahine mein shayad ek baar. Par "strong read (dheema) ya stale read (tez)" — yeh faisla tumhare har endpoint mein chhupa hua hai. Yeh bilkul wahi cheez hai jo replicas level mein thi; PACELC bas usko naam deta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — CAP',
    instructions: 'Yahan rata hua jawab turant pakda jaata hai. 🎤',
    questions: [
      {
        q: '"CAP theorem samjhao."',
        choices: [
          '"Partition hoga hi — woh chunav nahi hai. Chunav yeh hai ki us waqt jawab dena band karein (CP) ya purana jawab dein (AP). Aur yeh faisla har operation ka alag hota hai — cart AP, checkout CP."',
          '"Consistency, Availability, Partition tolerance — teen mein se do chun sakte ho"',
          '"NoSQL AP hota hai, SQL CP"',
          '"Distributed systems mein teenon nahi mil sakte"',
        ],
        answer: 0,
        explain: 'Doosra jawab textbook ka hai aur <b>galat samajh</b> dikhata hai — kyunki "P chhod do" ka matlab hai network kabhi na toote, jo mumkin hi nahi. Aakhri line ("har operation ka alag") hi woh cheez hai jo interviewer sunna chahta hai.',
      },
      {
        q: '"Tumhare payment system mein DB partition ho gaya. Kya karoge?"',
        choices: [
          'Payment path ko CP rakhunga — writes band, saaf error, aur user ko "abhi try nahi kar sakte" (double charge se kahin behtar). Par read-only cheezein (history, receipts) AP rakh sakta hoon taaki poora app na mare',
          'Sab kuch band kar dunga',
          'AP chununga taaki uptime bana rahe',
          'Automatic failover kar dunga',
        ],
        answer: 0,
        explain: 'Yahan dono hisse zaroori hain: <b>paise wala path CP</b> (kyunki galat jawab ka daam sabse zyada), aur <b>baaki app AP</b> (kyunki poora app girana bhi ek nuksaan hai). "Sab band kar do" surakshit lagta hai par woh us blast radius ko bada kar deta hai jo zaroori nahi tha.',
      },
    ],
  },
  success: [
    'CAP ko "partition ke doraan ka chunav" ki tarah samjha sakte ho',
    'CP vs AP ek sawaal se chun sakte ho',
    'Ek hi app mein dono rakh sakte ho',
    'PACELC ka roz wala hissa jaante ho',
  ],
  homework: `Apne app ke 5 endpoints likho. Har ek ke saamne CP ya AP likho —
    aur ek line mein karan. Phir dekho: kya tumhara system abhi <b>sach mein</b> waisa
    behave karta hai? Aksar jawab hota hai "pata nahi, kabhi test hi nahi kiya" —
    aur wahi sabse kaam ki khoj hai.`,
  cards: [
    { front: 'CAP ka asli matlab?', back: 'Partition <b>hoga hi</b> — woh chunav nahi. Chunav sirf: us waqt <b>ruk jao (CP)</b> ya <b>purana jawab do (AP)</b>. "CA" hota hi nahi.' },
    { front: 'CP vs AP kaise chunein?', back: 'Ek sawaal: <b>"purana/galat jawab dena zyada mehnga hai, ya koi jawab na dena?"</b> Balance/seat/stock → CP. Feed/reviews/cart → AP.' },
    { front: 'Faisla kis level par?', back: '<b>Har OPERATION ka</b>, poore system ka nahi. Amazon: cart AP (hamesha khule), checkout CP (pakka ho tabhi).' },
    { front: 'PACELC?', back: '<b>P-A-C</b>: partition ho toh A ya C. <b>E-L-C</b>: <b>else</b> (normal din) latency ya consistency — primary se padho (sahi, dheema) ya replica se (tez, purana). Doosra hissa roz asar karta hai.' },
    { front: 'Databases kahan?', back: 'Postgres/MySQL (single primary) = <b>CP</b> · Cassandra/DynamoDB = <b>AP, tunable</b> (QUORUM vs ONE) · MongoDB = CP default · Redis (async) = AP.' },
    { front: 'AP ka chhupa hua bill?', back: '<b>Conflict merge.</b> Partition khatam hone par dono taraf ke badlaav milane padte hain — kabhi automatic (CRDT, last-write-wins), kabhi insaan ko dekhna padta hai.' },
  ],
},

/* =====================================================================
   S7 — Slow query log & observability
   ===================================================================== */
{
  id: 'slowlog',
  icon: '📉',
  title: 'Slow Query Log — Andaza Mat Lagao, Dekho',
  badge: 'Query Jasoos',
  objectives: [
    'Slow query log on karna — aur threshold kaise chuno',
    '<b>Total time</b> vs <b>per-query time</b> — asli qatil kaunsa',
    'Query ko <b>normalize</b> karke pattern nikalna',
    'performance_schema / pg_stat_statements se seedha jawab',
  ],
  lesson: [
    `<h3>🕵️ Sabse aam galti: sabse DHEEMI query dhoondna</h3>
     <pre>Query A:  8 second lagti hai,  din mein 10 baar chalti hai
          → total: 80 second/din

Query B:  40 ms lagti hai,     din mein 20 lakh baar chalti hai
          → total: 22 GHANTE/din  🔥</pre>
     <p>Slow query log khologe toh <b>A</b> upar dikhega. Par tumhara DB
     <b>B</b> ki wajah se mar raha hai.</p>
     <p class="tip">🎯 Isliye hamesha <b>total time = per-call × calls</b> se sort karo,
     per-call se nahi. <code>pg_stat_statements</code> aur MySQL ka
     <code>sys.statement_analysis</code> yahi karte hain — aur wahi sabse pehla
     dashboard hona chahiye.</p>`,
    `<h3>🔧 Chalu kaise karein</h3>
     <pre># MySQL
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 0.2;        # 200 ms se upar sab
SET GLOBAL log_queries_not_using_indexes = 1;   # dhyaan se — bahut shor karta hai

# Postgres
log_min_duration_statement = 200         # ms
# aur behtar: pg_stat_statements extension — total time se sort</pre>
     <p><b>Threshold kaise chuno?</b> Apne p99 target se shuru karo.
     Agar API ka p99 200 ms hona chahiye, toh 200 ms se lambi <b>koi bhi</b> query
     ek sawaal hai. Bahut zyada shor aaye toh threshold upar karo — par
     use <b>zero</b> mat karo (production mein woh khud ek load ban jaata hai).</p>
     <h3>🧹 Normalize karo, warna log bekaar hai</h3>
     <pre>SELECT * FROM orders WHERE id = 8812
SELECT * FROM orders WHERE id = 4471     → 20 lakh alag lines
SELECT * FROM orders WHERE id = 9903

normalize karke:
SELECT * FROM orders WHERE id = ?        → EK pattern, 20 lakh calls</pre>
     <p>Yeh kaam <code>pt-query-digest</code> (MySQL) ya <code>pg_stat_statements</code>
     (Postgres) apne aap karte hain. Bina normalize kiye slow log bas ek badi
     text file hai jisme kuch nahi dikhta.</p>
     <p class="tip">🎯 Aur ek cheez jo log nahi batata: <b>kya woh query zaroori bhi thi?</b>
     Aksar sabse bada faayda query tune karne se nahi, use <b>hata dene</b> se aata hai —
     N+1 loop, ek dashboard jise koi nahi dekhta, ya ek polling job jo har second chalta hai.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: asli qatil kaun',
      instructions: 'Do queries hain. Slider se unki speed aur frequency badlo — dekho kaunsi DB ka zyada waqt khaati hai.',
      scenario: `<b>Query A</b> dheemi hai par kam chalti hai.
        <b>Query B</b> tez hai par bahut chalti hai. DB ke paas ek din mein
        <b>86,400 second</b> hain — dekho unme se kaun kitna khaata hai.`,
      knobs: [
        { id: 'ams', label: 'Query A — per call', min: 500, max: 15000, step: 100, value: 8000, unit: 'ms' },
        { id: 'acalls', label: 'Query A — calls/din', min: 1, max: 500, step: 1, value: 500 },
        { id: 'bms', label: 'Query B — per call', min: 1, max: 200, step: 1, value: 40, unit: 'ms' },
        { id: 'bcalls', label: 'Query B — calls/din', min: 1000, max: 3000000, step: 1000, value: 1000 },
      ],
      readouts: [
        { id: 'atot', label: 'A ka kul waqt', unit: '',
          format: x => (x / 3600).toFixed(1) + ' ghante/din',
          fn: v => v.ams * v.acalls / 1000, good: x => x < 3600 },
        { id: 'btot', label: 'B ka kul waqt', unit: '',
          format: x => (x / 3600).toFixed(1) + ' ghante/din',
          fn: v => v.bms * v.bcalls / 1000, good: x => x < 3600 },
        { id: 'winner', label: 'Slow log mein UPAR', unit: '',
          format: x => x, fn: v => v.ams >= v.bms ? 'Query A' : 'Query B' },
        { id: 'real', label: 'Asli qatil', unit: '',
          format: x => x,
          fn: v => (v.ams * v.acalls) >= (v.bms * v.bcalls) ? 'Query A' : 'Query B' },
      ],
      bar: (v, r) => {
        const tot = r.atot + r.btot;
        return { pct: (r.btot / (tot || 1)) * 100, bad: r.btot > r.atot,
          label: `B ka hissa: ${Math.round((r.btot / (tot || 1)) * 100)}%  ·  DB ka din = 86,400 s` };
      },
      verdict: (v, r) => {
        if (r.winner !== r.real) return { tone: 'bad', text: `🔥 <b>Yahi jaal hai.</b> Slow log mein <b>${r.winner}</b> upar dikhegi (woh per-call dheemi hai), par DB ka waqt <b>${r.real}</b> khaa rahi hai. Isiliye <b>total time</b> se sort karo, per-call se nahi.` };
        return { tone: 'good', text: `✅ Yahan dono jawab ek hi hain — <b>${r.real}</b>. Par slider ghuma ke dekho: thodi si frequency badalne se asli qatil badal jaata hai.` };
      },
      goal: { text: 'Aisi jagah banao jahan <b>slow log jhooth bole</b> — yaani upar dikhne wali query aur asli qatil <b>alag</b> hon.',
        check: (v, r) => r.winner !== r.real },
      insight: `Slow query log per-call time se sort karta hai — aur wahi uska
        sabse bada jaal hai.<br><br>
        <b>Hamesha total = per-call × calls dekho.</b> Ek 40 ms ki query jo
        20 lakh baar chalti hai, ek 8 second ki query se <b>1000 guna</b> zyada
        DB time khaati hai. Aur woh 40 ms wali aksar aasan bhi hoti hai theek karna.`,
    },
    {
      type: 'order',
      title: 'Slow query ko theek karne ka kram',
      instructions: 'Sahi kram mein rakho.',
      steps: [
        { text: 'Slow log / pg_stat_statements se TOTAL TIME se sort karo', explain: 'Pehla kadam hamesha <b>naapna</b> hai. Aur sort <b>total time</b> se — per-call se nahi, warna tum galat query par kaam karoge.' },
        { text: 'Poochho: kya yeh query zaroori bhi hai?', explain: 'Sabse bada faayda aksar tune karne se nahi, <b>hataane</b> se aata hai — N+1 loop, ek dashboard jise koi nahi dekhta, ya har second chalta polling job.' },
        { text: 'EXPLAIN chalao — type, key, rows, Extra', explain: 'Ab plan dekho. <code>type: ALL</code> aur <code>key: NULL</code> lagbhag hamesha ek missing index hai.' },
        { text: 'Sabse chhota badlaav karo — aksar ek index', explain: 'Ek index, ya ek <code>SELECT *</code> hata dena, ya ek sargable rewrite. Poori query dobara likhna aakhri raasta hai.' },
        { text: 'EXPLAIN dobara chala ke PROOF lo', explain: 'Andaza mat lagao. <code>rows</code> gira? <code>type</code> badla? Agar nahi, toh tumhara fix laga hi nahi.' },
        { text: 'Production mein total time dobara naapo', explain: 'Asli imtihaan yeh hai. Kabhi-kabhi index laga par query plan nahi badla (statistics purani), ya woh query itni chalti hi nahi thi jitna laga tha.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Observability ki samajh',
      questions: [
        {
          q: 'Slow query log ko kis cheez se sort karna chahiye?',
          choices: [
            'Total time (per-call × calls) — warna woh 40ms wali query dikhegi hi nahi jo din ke 22 ghante kha rahi hai',
            'Per-call duration',
            'Rows examined',
            'Alphabetically',
          ],
          answer: 0,
          explain: 'Slow log <b>per-call</b> se sort karta hai — yahi uska jaal hai. Ek 8s query jo 10 baar chalti hai = 80 second/din. Ek 40ms query jo 20 lakh baar chalti hai = <b>22 ghante</b>/din.',
        },
        {
          q: 'Slow log ki lakhon lines mein pattern kaise dhoondoge?',
          choices: [
            'Normalize karo — literals ko ? se badlo, taaki 20 lakh lines ek pattern ban jaayein (pt-query-digest / pg_stat_statements)',
            'grep se dhoondo',
            'Sabse lambi lines dekho',
            'Manually padho',
          ],
          answer: 0,
          explain: 'Bina normalize kiye slow log ek badi text file hai jisme har query alag dikhti hai (<code>WHERE id = 8812</code> vs <code>= 4471</code>). Normalize karne ke baad turant dikh jaata hai ki <b>kaunsa pattern</b> kitna waqt kha raha hai.',
        },
        {
          q: 'long_query_time = 0 set karne ka khatra?',
          choices: [
            'Har query log hogi — logging khud ek bada load aur bahut bada disk kharch ban jaata hai',
            'Kuch nahi, poora data milega',
            'Log file readable nahi hogi',
            'Queries dheemi ho jaayengi nahi',
          ],
          answer: 0,
          explain: 'Production mein sab kuch log karna khud ek performance problem hai (I/O + disk). Threshold apne <b>p99 target</b> se shuru karo — agar API ka p99 200ms hai toh 200ms se lambi query ek sawaal hai. Aur poore coverage ke liye <code>pg_stat_statements</code>/<code>performance_schema</code> behtar hain, kyunki woh <b>aggregate</b> rakhte hain, har line nahi.',
        },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: dheemi query dhoondo aur proof lo',
      instructions: 'EXPLAIN se pehle naapo, fix karo, phir dobara naapo.',
      goal: `<b>(1)</b> <code>EXPLAIN SELECT * FROM bx50Sessions WHERE buildNum = 'BX50-2024';</code>
        — <code>type</code> aur <code>rows</code> dekho.
        <b>(2)</b> Index banao: <code>CREATE INDEX idx_build ON bx50Sessions(buildNum);</code>
        <b>(3)</b> Wahi EXPLAIN dobara — <b>proof lo</b>.
        <b>(4)</b> Ab query se <code>SELECT *</code> hatao aur sirf zaroori columns maango:
        <code>SELECT id, userId FROM bx50Sessions WHERE buildNum = 'BX50-2024';</code>`,
      tasks: T_SLOW,
      db: SG.factoryDB(),
      success: allOf(T_SLOW),
      hints: [
        "EXPLAIN SELECT * FROM bx50Sessions WHERE buildNum = 'BX50-2024';",
        'CREATE INDEX idx_build ON bx50Sessions(buildNum);',
        "EXPLAIN SELECT * FROM bx50Sessions WHERE buildNum = 'BX50-2024';",
        "SELECT id, userId FROM bx50Sessions WHERE buildNum = 'BX50-2024';",
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Slow queries',
    instructions: 'Yahan "naapo" bolna hi jawab ka aadha hissa hai. 🎤',
    questions: [
      {
        q: '"DB slow hai. Kahan se shuru karoge?"',
        choices: [
          'pg_stat_statements / slow log se TOTAL time ke hisaab se top queries nikaalunga — kyunki asli qatil aksar woh chhoti query hoti hai jo lakhon baar chalti hai, woh badi wali nahi jo log mein upar dikhti hai',
          'Server resources dekhunga',
          'Sabse dheemi query dhoondunga',
          'Indexes add karunga',
        ],
        answer: 0,
        explain: '"Sabse dheemi query" wala jawab intuitive hai aur aksar galat. Achha jawab <b>total time</b> bolta hai — aur woh turant dikha deta hai ki tumne yeh kaam sach mein kiya hai.',
      },
      {
        q: '"Top query mil gayi. Ab?"',
        choices: [
          'Pehle poochhunga ki woh query zaroori bhi hai — aksar sabse bada faayda N+1 loop ya bekaar polling hataane se aata hai. Agar zaroori hai toh EXPLAIN, sabse chhota fix, aur phir dobara naap ke proof',
          'Turant index add kar dunga',
          'Query rewrite karunga',
          'Cache laga dunga',
        ],
        answer: 0,
        explain: 'Woh pehla sawaal — <b>"kya yeh query zaroori bhi hai?"</b> — sabse zyada waqt bachaata hai. Ek N+1 loop ko theek karna 20 lakh queries ko <b>2,000</b> bana deta hai; usi query par index lagane se woh 20 lakh hi rehti hain, bas thodi tez.',
      },
    ],
  },
  success: [
    'Slow query log on kar sakte ho aur threshold chun sakte ho',
    'Total time se sort karte ho, per-call se nahi',
    'Query normalize karke pattern nikaal sakte ho',
    'Fix ka proof EXPLAIN se lete ho',
  ],
  homework: `Apne DB par <code>pg_stat_statements</code> (Postgres) ya
    <code>sys.statement_analysis</code> (MySQL) kholo aur <b>total time</b> se top 5 nikaalo.
    Har ek ke saamne likho: kitni baar chalti hai, aur <b>kya woh zaroori hai?</b>
    Aksar unme se ek aisi hoti hai jise koi dekhta hi nahi.`,
  cards: [
    { front: 'Slow log ka sabse bada jaal?', back: 'Woh <b>per-call</b> se sort karta hai. 8s × 10 calls = 80 s/din. <b>40ms × 20 lakh calls = 22 ghante/din</b>. Hamesha <b>total time</b> se sort karo.' },
    { front: 'Chalu kaise karein?', back: 'MySQL: <code>slow_query_log=1</code>, <code>long_query_time=0.2</code>. Postgres: <code>log_min_duration_statement=200</code> + <b>pg_stat_statements</b>. Threshold apne <b>p99 target</b> se shuru karo.' },
    { front: 'long_query_time = 0?', back: '<b>Mat karo.</b> Har query log karna khud ek I/O + disk load ban jaata hai. Poore coverage ke liye <code>pg_stat_statements</code> — woh aggregate rakhta hai, har line nahi.' },
    { front: 'Normalize kyun?', back: '<code>WHERE id = 8812</code> aur <code>= 4471</code> alag lines hain → 20 lakh lines. Normalize karo (<code>= ?</code>) toh <b>ek pattern, 20 lakh calls</b>. pt-query-digest / pg_stat_statements yeh khud karte hain.' },
    { front: 'Top query mil gayi — pehla sawaal?', back: '<b>"Kya yeh query zaroori bhi hai?"</b> N+1 loop hataana 20 lakh queries ko 2,000 bana deta hai; index lagane se woh 20 lakh hi rehti hain.' },
    { front: 'Fix ke baad?', back: '<b>Proof lo.</b> EXPLAIN dobara (rows gira? type badla?) aur phir production mein <b>total time</b> dobara naapo — kabhi index lagta hai par plan nahi badalta (statistics purani).' },
  ],
},

/* =====================================================================
   S8 — Partitioning
   ===================================================================== */
{
  id: 'partitioning',
  icon: '🪓',
  title: 'Partitioning — Ek Table, Kai Tukde',
  badge: 'Partition Pandit',
  objectives: [
    'Partitioning vs sharding — ek machine ke andar vs kai machines',
    'Partition pruning — EXPLAIN mein iska proof',
    '<code>DROP PARTITION</code> vs <code>DELETE</code> — raat aur din ka farak',
    'Kab partitioning se koi faayda NAHI hota',
  ],
  lesson: [
    `<h3>✂️ Partitioning ≠ Sharding</h3>
     <table>
       <tr><th></th><th>Partitioning</th><th>Sharding</th></tr>
       <tr><td>Kahan</td><td><b>Ek</b> machine ke andar</td><td><b>Kai</b> machines par</td></tr>
       <tr><td>App ko pata</td><td>❌ nahi — ek hi table dikhti hai</td><td>✅ haan — routing karni padti hai</td></tr>
       <tr><td>JOIN / transaction</td><td>✅ normal chalte hain</td><td>❌ tut jaate hain</td></tr>
       <tr><td>Kya deta hai</td><td>chhote index, tez cleanup, pruning</td><td>capacity</td></tr>
     </table>
     <p class="tip">🎯 Isliye partitioning <b>sharding se pehle</b> aati hai —
     woh bahut kam keemat par kaafi faayda deti hai, aur tumhare JOIN aur
     transactions bilkul waise ke waise rehte hain.</p>
     <h3>🎯 Pruning — asli faayda</h3>
     <pre>orders  →  p2026_01, p2026_02, … p2026_09   (mahine ke hisaab se)

SELECT * FROM orders WHERE created_at >= '2026-09-01';
   → optimizer sirf p2026_09 chhuta hai
   → EXPLAIN: partitions: p2026_09      ← yahi proof hai</pre>
     <p>Par yeh tabhi hota hai jab query mein <b>partition key</b> ho.
     Agar tumne <code>created_at</code> par partition kiya aur query
     <code>WHERE user_id = 42</code> hai — toh DB ko <b>saari</b> partitions
     dekhni padengi. Woh poore scan se <b>bura</b> hai.</p>`,
    `<h3>🗑️ DROP PARTITION — sabse bada practical faayda</h3>
     <pre>-- Purana data hataana, purane tareeke se:
DELETE FROM orders WHERE created_at < '2025-01-01';
   → 4 crore rows, ghanton, bhaari locks, undo log phoola,
     replica lag, aur disk WAAPAS bhi nahi milta (fragmentation)

-- Partitioned table par:
ALTER TABLE orders DROP PARTITION p2024_12;
   → lagbhag TURANT, disk turant khaali, koi lock drama nahi</pre>
     <p class="tip">🎯 Agar tumhare paas <b>retention policy</b> hai
     ("2 saal se purana data hata do"), toh akele yeh ek wajah partitioning
     ko jaayaz kar deti hai — chahe performance ka koi problem ho hi na.</p>
     <h3>🚫 Kab faayda NAHI hota</h3>
     <pre>❌ Queries mein partition key hoti hi nahi   → saari partitions scan
❌ Table chhoti hai (10 lakh rows)          → index waise hi kaafi hai
❌ Bahut zyada partitions (5,000+)          → planning khud dheemi ho jaati hai
❌ Unique constraint jisme partition key na ho → aksar mumkin hi nahi
❌ "Sab kuch tez ho jaayega" wali ummeed    → partitioning index ka BADAL nahi hai</pre>
     <p>Woh aakhri line sabse zaroori hai: <b>partitioning index ki jagah nahi leti</b>.
     Har partition ko apne index chahiye. Partitioning sirf yeh karti hai ki
     har index <b>chhota</b> ho jaaye (memory mein fit ho) aur poori partitions
     ek saath chhodi ja sakein.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: pruning ka faayda',
      instructions: 'Partitions ki ginti aur query ka range ghumao — dekho kitni rows chhui jaati hain.',
      scenario: `<code>orders</code> mein <b>2.4 crore</b> rows hain (2 saal ka data).
        Tum use mahine ke hisaab se partitions mein baant sakte ho.`,
      knobs: [
        { id: 'parts', label: 'Kitni partitions', min: 1, max: 24, step: 1, value: 1,
          help: '1 = koi partitioning nahi' },
        { id: 'months', label: 'Query kitne mahine maangti hai', min: 1, max: 24, step: 1, value: 1 },
        { id: 'haskey', label: 'Query mein partition key hai?', min: 0, max: 1, step: 1, value: 1,
          help: '0 = query WHERE user_id par hai (partition key nahi)' },
      ],
      readouts: [
        { id: 'touched', label: 'Partitions chhui', unit: '',
          fn: v => v.haskey ? Math.min(v.parts, Math.max(1, Math.ceil(v.months * v.parts / 24))) : v.parts,
          good: (x, v) => x < v.parts || v.parts === 1 },
        { id: 'rows', label: 'Rows scan hui', unit: '',
          fn: v => {
            const t = v.haskey ? Math.min(v.parts, Math.max(1, Math.ceil(v.months * v.parts / 24))) : v.parts;
            return Math.round(24000000 * t / v.parts);
          },
          good: x => x < 5000000 },
        { id: 'idx', label: 'Har partition ka index', unit: 'MB',
          fn: v => Math.round(1800 / v.parts),
          good: x => x < 300,
          sub: x => x < 300 ? 'memory mein fit ho jaayega ✅' : 'buffer pool mein poora nahi aayega' },
      ],
      bar: (v, r) => ({ pct: (r.rows / 24000000) * 100, bad: r.rows > 5000000,
        label: `${(r.rows / 1000000).toFixed(1)} crore mein se ${(r.rows / 10000000).toFixed(2)} crore rows chhui` }),
      verdict: (v, r) => {
        if (!v.haskey && v.parts > 1) return { tone: 'bad', text: '🔥 <b>Query mein partition key hai hi nahi</b> — isliye DB ko <b>saari</b> partitions dekhni padi. Yeh bina partitioning ke bhi utna hi kaam hai, par upar se planning ka extra kharch. Partitioning tabhi kaam ki hai jab queries mein partition key ho.' };
        if (v.parts === 1) return { tone: '', text: 'Abhi koi partitioning nahi — har query poori table dekhti hai. Partitions badha ke dekho.' };
        if (v.months <= 3 && r.rows < 5000000) return { tone: 'good', text: `✅ <b>Pruning kaam kar rahi hai.</b> Query sirf ${r.touched} partition(s) chhu rahi hai — EXPLAIN mein <code>partitions:</code> line yahi dikhaayegi.` };
        return { tone: 'warn', text: 'Query bahut lamba range maang rahi hai — pruning ka faayda utna hi milega jitna range chhota hoga.' };
      },
      goal: { text: 'Aisi jagah laao jahan query <b>50 lakh se kam</b> rows chhue <b>aur</b> har partition ka index <b>300 MB se chhota</b> ho.',
        check: (v, r) => r.rows < 5000000 && r.idx < 300 && v.parts > 1 },
      insight: `Do alag faayde dhyaan mein rakho:<br>
        • <b>Pruning</b> — query sirf zaroori partitions chhuti hai
          (par <b>sirf tab</b> jab query mein partition key ho)<br>
        • <b>Chhote index</b> — har partition ka apna index, aur woh memory mein fit ho jaata hai<br><br>
        Aur teesra, jo slider mein nahi dikha: <code>DROP PARTITION</code> —
        4 crore rows ka <code>DELETE</code> ghanton lagta hai, partition drop
        lagbhag turant hota hai.`,
    },
    {
      type: 'bins',
      title: 'Partitioning yahan sahi hai?',
      instructions: 'Har case ke liye faisla karo.',
      bins: [
        { id: 'yes', label: '✅ Haan, partition karo' },
        { id: 'no', label: '❌ Nahi, faayda nahi' },
      ],
      items: [
        { text: 'Events table, 2 saal ka data, retention policy hai', bin: 'yes', explain: '<code>DROP PARTITION</code> akela yeh case jeet leta hai — 4 crore rows ka DELETE ghanton ka kaam hai, partition drop turant.' },
        { text: 'Users table, 5 lakh rows', bin: 'no', explain: 'Bahut chhoti hai. Index waise hi kaafi hai, aur partitioning sirf complexity aur planning ka kharch laayegi.' },
        { text: 'Orders, hamesha "is mahine ke orders" query hoti hai', bin: 'yes', explain: 'Partition key (<code>created_at</code>) lagbhag har query mein hai — pruning poora faayda dega.' },
        { text: 'Orders, par query hamesha WHERE user_id par hoti hai', bin: 'no', explain: 'Agar date par partition karoge toh <b>har</b> query saari partitions dekhegi — poore scan se bura. (user_id par partition kar sakte ho, par phir date-range queries mar jaayengi.)' },
        { text: 'Logs table, roz ki partition, 3 saal rakhni hai', bin: 'no', explain: 'Roz ki partition × 3 saal = <b>1,095 partitions</b>. Itni partitions par query planning khud dheemi ho jaati hai. Mahine ki partitions (36) behtar hain.' },
        { text: 'Multi-tenant table, queries hamesha tenant_id par', bin: 'yes', explain: 'List/hash partitioning by tenant_id — har tenant ka data alag partition mein, aur ek tenant chhodna bhi aasan (compliance mein yeh bahut kaam aata hai).' },
      ],
    },
    {
      type: 'quiz',
      title: 'Partitioning ki samajh',
      questions: [
        {
          q: 'Partitioning aur sharding mein sabse bada farak?',
          choices: [
            'Partitioning EK machine ke andar hai — JOIN aur transactions normal chalte hain. Sharding kai machines par hai, aur wahi cheezein tut jaati hain',
            'Partitioning tez hai',
            'Sharding sirf NoSQL mein hota hai',
            'Koi khaas farak nahi',
          ],
          answer: 0,
          explain: 'Isliye partitioning <b>sharding se pehle</b> aani chahiye: woh kaafi faayda deti hai (pruning, chhote index, turant cleanup) par tumhara SQL model bilkul nahi todti. App ko toh pata bhi nahi chalta.',
        },
        {
          q: 'created_at par partition kiya, par query WHERE user_id par hai. Kya hoga?',
          choices: [
            'Saari partitions scan hongi — yeh bina partitioning ke se BURA hai, kyunki upar se planning ka kharch bhi hai',
            'Pruning phir bhi kaam karegi',
            'Query fail ho jaayegi',
            'DB apne aap sahi partition dhoondh lega',
          ],
          answer: 0,
          explain: 'Pruning ka poora aadhaar yeh hai ki DB query se <b>bata sake</b> ki kaunsi partitions chahiye. Bina partition key ke woh andaza nahi laga sakta — isliye sab dekhta hai. Partition key ka chunav isliye tumhari <b>queries</b> se aana chahiye, "date se karte hain" wali aadat se nahi.',
        },
        {
          q: 'Retention ke liye partitioning ka sabse bada faayda?',
          choices: [
            'DROP PARTITION lagbhag turant hai aur disk turant khaali karta hai — jabki 4 crore rows ka DELETE ghanton lagta hai, locks leta hai, aur disk wapas bhi nahi deta',
            'Kam disk lagti hai',
            'Backups tez hote hain',
            'Index chhote hote hain',
          ],
          answer: 0,
          explain: 'Bade <code>DELETE</code> ka nuksaan sirf waqt nahi hai: woh undo/WAL phulaata hai, replica lag chadha deta hai, aur khaali hui jagah aksar OS ko wapas nahi milti (fragmentation). <code>DROP PARTITION</code> ek metadata operation hai — turant, saaf, aur disk wapas.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Partitioning',
    instructions: 'Yahan "sharding se pehle" bolna achha signal hai. 🎤',
    questions: [
      {
        q: '"Table 2 crore rows ki ho gayi aur queries dheemi hain. Partition karein?"',
        choices: [
          'Pehle EXPLAIN dekhunga — aksar ek missing index hai, aur partitioning uska badal nahi hai. Par agar retention policy hai ya queries hamesha date-range par hain, toh partitioning se pruning aur turant cleanup dono milte hain',
          'Haan, 1 crore se upar hamesha partition karo',
          'Nahi, sharding karo',
          'Haan, roz ki partitions banao',
        ],
        answer: 0,
        explain: 'Sabse zaroori line hai <b>"partitioning index ka badal nahi hai"</b> — har partition ko apne index chahiye hi. Partitioning teen cheezein deti hai: pruning, chhote index, aur turant cleanup. "Query dheemi hai" ka jawab lagbhag hamesha pehle index hota hai.',
      },
      {
        q: '"Partition key kaise chunoge?"',
        choices: [
          'Apni queries se — woh column jo zyadatar WHERE mein hota hai, taaki pruning lage. Aur retention ka pattern bhi dekhunga, kyunki DROP PARTITION usi ke saath align hona chahiye',
          'Primary key',
          'Hamesha date',
          'Sabse selective column',
        ],
        answer: 0,
        explain: 'Do sharten ek saath: <b>queries mein maujood</b> (warna pruning nahi lagegi) aur <b>retention se aligned</b> (warna DROP PARTITION ka faayda nahi milega). Date aksar dono poori karta hai — par woh default nahi, ek <b>natija</b> hona chahiye.',
      },
    ],
  },
  success: [
    'Partitioning aur sharding ka farak bata sakte ho',
    'Pruning ki shart (partition key query mein ho) jaante ho',
    'DROP PARTITION ka faayda samjha sakte ho',
    'Pehchaan sakte ho ki kab partitioning bekaar hai',
  ],
  homework: `Apni sabse badi table dekho. Do sawaal: (1) kya uspar koi <b>retention</b> hai
    ("X se purana hata do")? (2) kya zyadatar queries mein ek hi column hota hai
    (aksar date ya tenant_id)? Dono ka jawab "haan" hai toh partitioning
    lagbhag pakka faayda degi.`,
  cards: [
    { front: 'Partitioning vs sharding?', back: '<b>Partitioning</b> = ek machine ke andar; JOIN aur transactions <b>normal</b> chalte hain; app ko pata bhi nahi. <b>Sharding</b> = kai machines; wahi cheezein tut jaati hain. Isliye partitioning pehle.' },
    { front: 'Pruning ki shart?', back: '<b>Partition key query mein honi chahiye.</b> Warna saari partitions scan hongi — jo bina partitioning ke se <b>bura</b> hai (upar se planning ka kharch).' },
    { front: 'Partitioning ke teen faayde?', back: '<b>Pruning</b> (sirf zaroori partitions) · <b>chhote index</b> (memory mein fit) · <b>DROP PARTITION</b> (turant cleanup).' },
    { front: 'DROP PARTITION vs DELETE?', back: '4 crore rows ka DELETE = ghante + locks + undo/WAL bloat + replica lag + disk wapas nahi milti. <code>DROP PARTITION</code> = metadata operation, <b>turant</b>, disk turant khaali.' },
    { front: 'Partitioning kab bekaar?', back: 'Query mein partition key nahi · table chhoti · <b>5,000+ partitions</b> (planning khud dheemi) · unique constraint jisme partition key na ho.' },
    { front: 'Partitioning = index ka badal?', back: '<b>Nahi.</b> Har partition ko apne index chahiye hi. "Query dheemi hai" ka jawab lagbhag hamesha pehle <b>index</b> hota hai.' },
  ],
},

/* =====================================================================
   S9 — FINAL BOSS
   ===================================================================== */
{
  id: 'boss4',
  icon: '👑',
  title: 'FINAL BOSS — DB Har Taraf Se Dab Raha Hai',
  badge: 'Scale Shilpi',
  objectives: [
    'Lakshan se wajah tak — sahi kram mein',
    'Har problem ka <b>apna</b> ilaaj chunna',
    'Poore track ka nichod, ek incident mein',
  ],
  lesson: [
    `<h3>👑 Aakhri imtihaan</h3>
     <p>Ek e-commerce DB hai. Pichhle hafte se sab kuch bigad raha hai,
     aur teams alag-alag cheezein bol rahi hain:</p>
     <pre>"CPU 10% hai par sab timeout ho raha hai"       → ?
"Dashboard query 14 second leti hai"            → ?
"User save karta hai, reload par purana dikhta" → ?
"Ek hi item do logon ko bik gaya"               → ?
"orders table 2 crore ki ho gayi, DELETE atka"  → ?</pre>
     <p class="tip">🎯 Paanch lakshan, <b>paanch alag wajah</b>. Is track ka poora point
     yahi tha: har lakshan ka apna ilaaj hai, aur galat ilaaj lagane se
     cheezein aksar <b>aur</b> bigadti hain (jaise dheemi query par pool badhana).</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Lakshan → wajah',
      instructions: 'Har lakshan ko uski asli wajah se jodo.',
      bins: [
        { id: 'pool', label: '🔌 Pool exhaustion' },
        { id: 'index', label: '🗂️ Missing index' },
        { id: 'lag', label: '📑 Replication lag' },
        { id: 'race', label: '🔒 Race condition' },
      ],
      items: [
        { text: 'CPU 10%, health green, sab timeout', bin: 'pool', explain: 'Threads intezaar kar rahe hain, kaam nahi. Dekho: <code>pool.acquire()</code> ka waqt aur koi lambi transaction.' },
        { text: 'EXPLAIN: type ALL, key NULL, rows 24,00,000', bin: 'index', explain: 'Poora scan. Sabse seedha aur sabse aam problem.' },
        { text: 'Save ke turant baad reload par purana data', bin: 'lag', explain: 'Write primary par gayi, read replica se aayi. Ilaaj: us user ki reads kuch second primary se.' },
        { text: 'Stock -1 par chala gaya', bin: 'race', explain: 'Check-then-act. Ilaaj: shart <code>UPDATE … WHERE qty &gt; 0</code> ke andar.' },
        { text: 'Ek lambi report transaction, aur baaki sab ruk gaya', bin: 'pool', explain: 'Us transaction ne connection pakad rakha hai. Aur jitni der woh chalti hai, utni der woh slot bekaar hai.' },
        { text: 'Dono users ne "book" dabaya, dono ko confirmation mila', bin: 'race', explain: 'Wahi check-then-act, ab booking par. Atomic condition ya <code>FOR UPDATE</code>.' },
      ],
    },
    {
      type: 'flow',
      title: '🎬 BOSS: incident ko theek karo',
      instructions: 'Har kadam par sahi faisla chuno. Yeh poore track ka nichod hai.',
      scenario: `<b>Black Friday.</b> Traffic 5x hai. Alerts aa rahe hain,
        aur tum on-call ho. Ek-ek karke sahi kadam uthao.`,
      lanes: [
        { id: 'a', label: '🚨 Alerts' },
        { id: 'y', label: '🧑‍🔧 Tum' },
      ],
      state: (n) => [
        { k: 'API p99', v: n >= 8 ? '180 ms ✅' : n >= 5 ? '2.1 s' : '9.8 s 🔥' },
        { k: 'CPU', v: '11%' },
        { k: 'errors', v: n >= 8 ? '0.1%' : n >= 5 ? '4%' : '38% 🔥' },
      ],
      steps: [
        { lane: 'a', t: 'API p99 = 9.8s, errors 38%, CPU 11%', note: 'CPU kam hai par sab mar raha hai. Yeh ek jaana-pehchana pattern hai.', bad: true,
          ask: {
            q: 'Pehla kadam?',
            choices: [
              'pool.acquire() ka waqt dekho — CPU kam hone ka matlab hai threads INTEZAAR kar rahe hain',
              'CPU profiling shuru karo',
              'Pool size 500 kar do',
              'Server restart karo',
            ],
            answer: 0,
            explain: 'CPU 11% ka matlab hai kaam ho hi nahi raha. Jo cheezein CPU se pehle khatam hoti hain woh <b>concurrency limits</b> hain — connection pool sabse aam. Aur pool seedha 500 karna galat hai: pehle dekho ki woh bhar kyun raha hai.',
          } },
        { lane: 'y', t: 'pool.acquire() = 9.4s. Pool 50/50 busy.', note: 'Confirm ho gaya. Ab sawaal yeh hai: pool bhar kyun raha hai?' },
        { lane: 'y', t: 'Slow log dekha — ek query 8s, 20k calls/ghanta', note: 'Ek query har connection ko 8 second pakde rakhti hai. <b>Yeh</b> pool bhar rahi hai.',
          ask: {
            q: 'Ab kya karoge?',
            choices: [
              'Us query par EXPLAIN chalao — 8 second lagbhag hamesha ek missing index hai',
              'Pool 500 kar do',
              'Us endpoint ko band kar do',
              'Aur replicas add karo',
            ],
            answer: 0,
            explain: 'Yaad karo: <code>capacity = pool × (1000 / query_ms)</code>. Query 8s se 20ms karne se capacity <b>400x</b> ho jaayegi — bina ek bhi naya connection. Pool 500 karne se DB par 500 processes aa jaate aur haalat aur bigadti.',
          } },
        { lane: 'y', t: 'EXPLAIN: type ALL, rows 24,00,000', note: 'Missing index. Wahi purani kahani.' },
        { lane: 'y', t: 'Index banaya → query 8s se 18ms', note: 'p99 9.8s se 2.1s. Errors 38% se 4%. Ab aage dekho.', good: true },
        { lane: 'a', t: 'Nayi alert: "stock -3 ho gaya"', note: 'Ab ek alag problem — aur uska pool se koi lena-dena nahi.', bad: true,
          ask: {
            q: 'Stock negative kaise hua?',
            choices: [
              'Check-then-act race — do requests ne ek saath padha, dono ne likh diya. Ilaaj: shart UPDATE ke andar',
              'Index ki wajah se',
              'Replica lag ki wajah se',
              'Pool ki wajah se',
            ],
            answer: 0,
            explain: 'Traffic 5x hone se races ka mauka bahut badh jaata hai — woh bug pehle bhi tha, bas dikha nahi. <code>UPDATE … SET qty = qty-1 WHERE id=? AND qty &gt; 0</code> aur affected rows dekho.',
          } },
        { lane: 'y', t: 'Atomic UPDATE laga diya', note: 'Ab do requests mein se ek hi jeetegi, aur doosri ko turant "out of stock" milega.', good: true },
        { lane: 'a', t: 'Support: "save karke reload par purana naam"', note: 'Teesri alag problem.', bad: true,
          ask: {
            q: 'Yeh kya hai?',
            choices: [
              'Replication lag — write primary par, read replica se. Save ke baad kuch second us user ki reads primary par bhejo',
              'Cache ka bug',
              'Race condition',
              'Missing index',
            ],
            answer: 0,
            explain: 'Read-after-write. Aur is bug ka asli nuksaan yeh hai ki user <b>dobara</b> save karta hai — Black Friday par woh duplicate orders ban sakte hain.',
          } },
        { lane: 'y', t: 'Read-your-own-writes routing lagayi', note: 'p99 180ms, errors 0.1%. Teen alag problems, teen alag ilaaj.', good: true },
      ],
      insight: `👑 Dhyaan do ki tumne <b>ek bhi baar</b> "server bada karo" ya
        "pool badha do" nahi kaha.<br><br>
        Teen lakshan, teen bilkul alag wajah:
        <b>missing index</b> (jisne pool bhara), <b>race condition</b>
        (jo traffic badhne par dikhi), aur <b>replication lag</b>.<br><br>
        Aur kram bhi maayne rakhta tha: pehle naapo (<code>pool.acquire()</code>,
        slow log, EXPLAIN), phir <b>sabse chhota</b> fix karo,
        phir dobara naapo. Yahi is poore track ka nichod hai.`,
    },
    {
      type: 'quiz',
      title: 'BOSS — poore track ka nichod',
      questions: [
        {
          q: 'CPU kam par sab timeout — sabse pehle kya?',
          choices: [
            'Concurrency limits dekho (connection pool, thread pool) — CPU kam ka matlab hai threads INTEZAAR kar rahe hain',
            'CPU profiling',
            'Bada server',
            'Zyada replicas',
          ],
          answer: 0,
          explain: 'Yeh is track ka signature pattern hai. Intezaar CPU nahi khaata — isliye dashboard "sab theek" dikhata hai jabki kuch bhi kaam nahi kar raha.',
        },
        {
          q: 'Pool bhar raha hai. Pehle pool badhao ya query tez karo?',
          choices: [
            'Query tez karo — capacity = pool × (1000/query_ms). Query 8s→20ms = capacity 400x, bina ek bhi naya connection',
            'Pool badhao, woh turant hota hai',
            'Dono ek saath',
            'Replicas add karo',
          ],
          answer: 0,
          explain: 'Aur pool badhana muft bhi nahi hai — har connection DB par ek process hai, aur ek hadd ke baad woh har query ko <b>dheema</b> kar deta hai. <b>Pehle service time, phir pool.</b>',
        },
        {
          q: 'Writes bahut zyada hain. Replica add karein?',
          choices: [
            'Nahi — har replica ko wahi writes apply karni hi hain. Write problem ka jawab sharding/batching hai, replica nahi',
            'Haan, load bant jaayega',
            'Haan, 3 replicas',
            'Haan, par primary par bhi',
          ],
          answer: 0,
          explain: 'Replica <b>sirf reads</b> baantta hai. Woh primary se kam kaam nahi karta — usse har write pahunchti hai. Yeh galtfehmi bahut aam hai aur uska natija ek aur machine + wahi problem hota hai.',
        },
        {
          q: 'Poore track ka nichod, ek line mein?',
          choices: [
            'Pehle NAAPO (pool wait, slow log ka total time, EXPLAIN), phir SABSE CHHOTA fix karo, phir dobara naapo',
            'Hamesha scale ke liye design karo',
            'Har cheez par index lagao',
            'Cache sab theek kar deta hai',
          ],
          answer: 0,
          explain: 'Teen aadatein, teenon dohrayi ja sakti hain. Aur teesri sabse zyada chhooti hai — bina dobara naape tumhe pata hi nahi ki fix laga bhi ya nahi (kabhi index lagta hai par plan nahi badalta, kyunki statistics purani hain). 👑',
        },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ BOSS Mission: naapo, fix karo, proof lo',
      instructions: 'Poora chakkar ek baar mein: EXPLAIN → index → EXPLAIN → transaction ke andar atomic update.',
      goal: `<b>(1)</b> <code>EXPLAIN SELECT * FROM bx50Data WHERE buildNum = 'BX50-2024';</code>
        <b>(2)</b> <code>CREATE INDEX idx_boss ON bx50Data(buildNum);</code>
        <b>(3)</b> Wahi EXPLAIN dobara — proof lo.
        <b>(4)</b> <code>BEGIN;</code>
        <b>(5)</b> Atomic update — shart WHERE ke andar:
        <code>UPDATE operators SET shift = 'night' WHERE opId = 2 AND shift = 'day';</code>
        <b>(6)</b> <code>COMMIT;</code>`,
      tasks: T_BOSS4,
      db: SG.factoryDB(),
      success: allOf(T_BOSS4),
      hints: [
        "EXPLAIN SELECT * FROM bx50Data WHERE buildNum = 'BX50-2024';",
        'CREATE INDEX idx_boss ON bx50Data(buildNum);',
        "EXPLAIN SELECT * FROM bx50Data WHERE buildNum = 'BX50-2024';",
        'BEGIN;',
        "UPDATE operators SET shift = 'night' WHERE opId = 2 AND shift = 'day';",
        'COMMIT;',
      ],
    },
  ],
  interview: {
    title: 'FINAL Round — Scale',
    instructions: 'Aakhri do sawaal. 🎤👑',
    questions: [
      {
        q: '"Ek line mein — DB scale karne ka tareeka kya hai?"',
        choices: [
          'Pehle naapo ki kya sach mein hadd par hai (data size, reads, writes, ya connections) — kyunki chaaron ke ilaaj alag hain, aur galat ilaaj aksar cheezein aur bigaad deta hai',
          'Sharding karo',
          'Cache lagao',
          'Bade servers lo',
        ],
        answer: 0,
        explain: 'Yahi is poore track ka dhaancha hai: <b>data</b> bada → archival/partitioning · <b>reads</b> zyada → cache/replicas · <b>writes</b> zyada → batching/sharding · <b>connections</b> → pool + query time. Ek hi jawab sab par lagana hi sabse aam galti hai.',
      },
      {
        q: '"Tumne kabhi koi optimization HATAYI hai?"',
        choices: [
          'Haan — ek cache jo ek slow query chhupa raha tha. Index lagane ke baad query 12ms ki ho gayi aur cache sirf ek staleness problem bacha tha, isliye hata diya',
          'Nahi, optimizations hamesha madad karti hain',
          'Nahi, hataana risky hai',
          'Haan, par woh galti thi',
        ],
        answer: 0,
        explain: 'Yeh sawaal seniority parakhta hai. Jo engineer sirf <b>jodta</b> hai uska system har saal bhaari hota jaata hai. Aur yeh case bahut asli hai: cache aksar ek missing index ko chhupa deta hai — aur uske saath invalidation, staleness aur ek naya failure mode muft mein aa jaate hain. 👑',
      },
    ],
  },
  success: [
    'Lakshan se sahi wajah tak pahunch sakte ho',
    'Har problem ka apna ilaaj chun sakte ho',
    'Pehle naapte ho, phir sabse chhota fix karte ho',
    '👑 Tum SQL Gurukul ke Scale Shilpi ho',
  ],
  homework: `<b>Aakhri homework.</b> Apne asli DB par yeh chaar cheezein nikaalo:
    (1) <code>pool.acquire()</code> ka p99, (2) slow log se <b>total time</b> ke top 3,
    (3) sabse badi table ka size aur uska retention rule,
    (4) ek jagah jahan "padho → faisla → likho" ho raha hai.
    Char numbers, char sawaal — aur tumhare paas ek asli plan hoga. 👑`,
  cards: [
    { front: 'CPU kam par sab timeout?', back: '<b>Concurrency limit</b> (aksar connection pool). Intezaar CPU nahi khaata — isliye dashboard "sab theek" dikhata hai.' },
    { front: 'Pool badhao ya query tez karo?', back: '<b>Query tez karo, pehle.</b> <code>capacity = pool × (1000/query_ms)</code> — 8s→20ms = capacity <b>400x</b>, bina ek bhi naya connection. Aur bada pool har query ko dheema karta hai.' },
    { front: 'Writes zyada — replica?', back: '<b>Nahi.</b> Har replica ko wahi writes apply karni hain. Write problem = batching / kam indexes / sharding.' },
    { front: 'Chaar alag dimensions?', back: '<b>Data</b> bada → archival/partitioning · <b>reads</b> → cache/replicas · <b>writes</b> → batching/sharding · <b>connections</b> → pool + query time. Har ek ka alag ilaaj.' },
    { front: 'Poore track ka nichod?', back: '<b>1.</b> Naapo (pool wait · slow log ka <b>total</b> time · EXPLAIN). <b>2.</b> Sabse <b>chhota</b> fix karo. <b>3.</b> Dobara naapo — warna pata hi nahi chalega ki fix laga bhi ya nahi. 👑' },
  ],
},
]);
