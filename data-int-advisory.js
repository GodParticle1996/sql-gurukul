/* =====================================================================
   TRACK 5 — 🔬 Database Internals · "Intermediate System Design" ka DB wala hissa — file 3/3
   NAYA level db-advisory — Ep 3 (Distributed Locks) ka database wala jawab: advisory locks.
   App mein advisory locks sirf PgBouncer ki "shart" ke roop mein the (db-pg-power) — sikhaya kahin nahi → naya level,
   db-pg-power ke baad (PgBouncer wala jaal wahin se aage badhta hai).
   Numbers: docker-labs/10-advisory — Postgres 16.2 + MySQL 8.0.46 + PgBouncer 1.23.1, asli run.
   System Gurukul lab 36 (Redis / Redlock + GC pause = double charge) is level ka "pehle" hai.
   ===================================================================== */
(function () {

VISUALS['db-advisory'] = {
  t: 'Database hi taala-chaabi',
  html: `
    <div class="dg-flow">
      <div class="dg-node is-accent" data-hs="server"><span class="ni">🖥️</span><span class="nl">Server A · B · C</span><span class="ns">sab ek hi pal mein</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-good" data-hs="lock"><span class="ni">🔐</span><span class="nl">pg_try_advisory_xact_lock(42)</span><span class="ns">ek ko t, baaki ko f</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold" data-hs="work"><span class="ni">💸</span><span class="nl">UPDATE wallet</span><span class="ns">lock ke saath, ek hi transaction</span></div>
    </div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Lock ki umar = connection / transaction ki umar</span>
        <div class="dg-cap">server mara → lock free · zombie ka COMMIT database mana karta hai</div></div>
      <div class="dg-box is-bad"><span class="bx-label">⚠️ Jaal</span>
        <div class="dg-cap">MySQL <code>GET_LOCK</code> ROLLBACK ke baad bhi pakda · PgBouncer + session lock = do maalik</div></div>
    </div>`,
};

SG.registerLevelsAfter('internals', 'db-pg-power', [
{
  id: 'db-advisory',
  icon: '🔐',
  title: 'Database Hi Taala-Chaabi — Advisory Locks',
  badge: 'Taala Pandit',
  objectives: [
    '<b>Advisory lock:</b> database mein ek number (ya naam) par taala — 3 servers, ek raat ka job, sirf ek server chale',
    'Lock ki umar = <b>connection ki umar</b>: server mara → lock turant free, koi TTL ka andaaza nahi',
    '<b>Lock + kaam ek transaction mein:</b> GC pause wala zombie double charge nahi kar sakta — database zombie ka COMMIT mana karta hai',
    'Do jaal: MySQL <code>GET_LOCK</code> transaction ka hissa nahi, aur PgBouncer transaction pooling + session lock = do maalik',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>PayRoll</b> app 3 servers par chalti hai. Har server par wahi cron: raat 12 baje <b>salary payout</b>. Teeno servers ek hi pal mein
     jaagte hain → salary <b>teen baar</b>. System Gurukul lab 36 ne Redis lock (TTL 300 ms) lagaya — worker ke <b>600 ms GC pause</b> mein
     Redis lock khud expire hua, doosre worker ne lock liya, aur 30 mein se 30 orders par <b>do baar paisa</b> kata.</p>
     <h3>🔑 Misaal: society ke clubhouse ki chaabi</h3>
     <p>Clubhouse ki ek hi chaabi, security guard ke register ke saath. Chaabi <b>aapki kalaai se bandhi</b> rehti hai — aap society se bahar
     gaye (connection toota) toh guard chaabi khud wapas le leta hai. "30 minute baad chaabi apne aap wapas" wala koi andaaza nahi.</p>
     <p>Database mein yahi <b>advisory lock</b> hai: ek number (ya naam) par taala — table ki kisi row se koi lena-dena nahi.</p>
     <table>
       <tr><th>🐘 Postgres</th><th>🐬 MySQL</th><th>Kab chhootta hai</th></tr>
       <tr><td><code>pg_advisory_lock(42)</code> / <code>pg_try_advisory_lock(42)</code></td><td><code>GET_LOCK('naam', timeout)</code></td><td>unlock, ya connection band</td></tr>
       <tr><td><code>pg_advisory_xact_lock(42)</code> / <code>pg_try_advisory_xact_lock(42)</code></td><td>— (hota hi nahi)</td><td><b>COMMIT / ROLLBACK</b> par khud</td></tr>
       <tr><td><code>pg_locks</code> (<code>locktype = 'advisory'</code>)</td><td><code>IS_USED_LOCK('naam')</code> → connection id</td><td>lock kiske paas hai?</td></tr>
     </table>
     <pre>3 servers ek saath → server B: lock mila → job chalaya · A, C: skip · job_runs mein rows: 1
server D (ghadi 3 sec peeche) → lock free tha → job DOBARA chala · rows: 2
ilaaj: lock ke andar "aaj ho chuka?" check → server D: aaj ka job ho chuka → skip
server A (lock ke saath) mara → server B: pg_try_advisory_lock(42) → t   ← na TTL, na intezaar</pre>
     <p class="tip">🎯 <b>Asli baat:</b> lock sirf <b>ek saath</b> chalne se rokta hai. "Aaj ho chuka?" wala check lock ke <b>andar</b> rakho. Aur ulta
     khatra yaad rakho: connection <b>chupchaap</b> mara ho (network kata) toh database ko pata chalne mein TCP keepalive jitna waqt lagta hai —
     Linux default par 2 ghante. <code>tcp_keepalives_idle</code> set karo.</p>`,

    `<h3>🧟 Zombie worker — lock aur kaam ek hi transaction mein</h3>
     <p>Wallet ₹10,000. Worker A ne lock liya, ₹500 kaate, phir <b>GC pause</b> mein atak gaya. Lab 10 (Postgres):</p>
     <pre>t=1s  worker A: lock liya, ₹500 kaate — phir GC pause (4 sec tak database ko kuch nahi bhejta)
t=1s  worker B: pg_try_advisory_xact_lock(7) → f   ← A ke paas hai, B ne nahi kaata
t=3s  worker A ke sessions: 0   ← 2 sec 'idle in transaction' ke baad database ne khatam kiya
t=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹9500
t=4s  worker A jaaga, COMMIT bheja → FATAL:  terminating connection due to idle-in-transaction timeout
wallet: ₹9500   ← ek hi baar kata ✅</pre>
     <ol>
       <li><b>Lab 36 mein fencing token kyun chahiye tha?</b> Lock ek jagah (Redis) tha aur kaam doosri jagah (ledger). Zombie ka kaam ledger tak pahunch gaya.</li>
       <li><b>Yahan fencing token kyun nahi chahiye?</b> Lock aur UPDATE <b>ek hi transaction</b> mein hain. Zombie ka ₹500 kabhi COMMIT hua hi nahi, aur
         zombie ka der se aaya COMMIT database ne mana kar diya. Database ka transaction hi fencing token ka kaam karta hai.</li>
       <li><b>MySQL mein?</b> Wahi kahani <code>SELECT … FOR UPDATE</code> + <code>wait_timeout</code> se — zombie ko <code>ERROR 4031</code>. Par
         <code>GET_LOCK</code> transaction ka hissa nahi: ROLLBACK ke baad bhi lock connection ke paas pakda rehta hai.</li>
       <li><b>PgBouncer ke peeche?</b> Transaction pooling mein session lock bouncer ke pooled connection par chipakta hai — lab mein client A aur
         client B <b>dono</b> ko lock mila. Bouncer ke peeche hamesha <code>pg_advisory_xact_lock</code>.</li>
     </ol>
     <p class="tip">🎯 <b>Asli baat:</b> jab paisa (side effect) database mein hai, toh lock bhi database mein rakho aur dono ek transaction mein.
     Side effect database ke bahar ho (payment gateway, email) toh lock kaafi nahi — <b>idempotency key</b> chahiye, taaki wahi request do baar
     pahunche toh bhi paisa ek hi baar kate.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 3 servers, ek raat ka job — sirf ek chale',
      project: '10-advisory',
      exercise: 'ex1-cron',
      goal: 'Teen servers ek hi pal mein job try karte hain. Dekho job kitni baar chala, der se jaaga server kya karta hai, aur lock wala server mare toh lock ka kya hota hai — dono engines par.',
      steps: [
        { text: 'Postgres, PgBouncer aur MySQL chalao.', cmd: 'cd sqlgurukul/docker-labs/10-advisory\ndocker compose up -d' },
        { text: 'Cron script chalao.', cmd: './scripts/cron.sh',
          expect: [
            '=================== POSTGRES — pg_try_advisory_xact_lock(42) ===================',
            'server C: lock nahi mila → skip',
            'server A: lock nahi mila → skip',
            'server B: lock mila → job chalaya (2 sec)',
            'job_runs mein rows: 1',
            '',
            '--- server D ki ghadi 3 second peeche thi — woh ab jaaga ---',
            'server D: lock mila → job chalaya (2 sec)',
            'job_runs mein rows: 2   ← lock ne sirf EK SAATH chalne se roka tha',
            'ilaaj (lock ke andar \'aaj ho chuka?\' check) ke baad: server D: aaj ka job ho chuka → skip',
            '',
            '--- lock pakadne wala server mar jaaye toh? (session-level pg_advisory_lock) ---',
            'pg_locks: advisory key 42 → serverA (pid 723435)',
            'server B: pg_try_advisory_lock(42) → f',
            'server A ki machine mari (uska connection toota)',
            'server B: pg_try_advisory_lock(42) → t   ← na TTL ka andaaza, na intezaar',
            '',
            '=================== MYSQL — GET_LOCK(\'nightly_job\', 0) ===================',
            'server C: lock nahi mila → skip',
            'server A: lock nahi mila → skip',
            'server B: lock mila → job chalaya (2 sec)',
            'job_runs mein rows: 1',
            '',
            '--- lock pakadne wala mar jaaye toh? ---',
            'IS_USED_LOCK(\'nightly_job\') → connection 53 ke paas',
            'server B: GET_LOCK(\'nightly_job\', 0) → 0',
            'connection 53 mara (KILL)',
            'server B: GET_LOCK(\'nightly_job\', 0) → 1',
          ].join('\n') },
      ],
      observe: {
        q: 'Server D 3 second der se jaaga aur job DOBARA chal gaya, jabki lock laga tha. Kyun?',
        choices: [
          'Lock sirf ek saath chalne se rokta hai — server D jaaga tab tak server B ka transaction khatam aur lock free ho chuka tha',
          'Advisory lock toot gaya',
          'Server D ke paas admin rights the',
          'Postgres lock ki ginti bhool gaya',
        ],
        answer: 0,
        explain: 'Lock "abhi" ko bachata hai, "aaj" ko nahi. Ilaaj: lock ke andar <code>job_runs</code> mein aaj ki date check karo — lock ke andar check-then-act safe hai.',
      },
      lesson: 'Har cron job ke do sawaal: (1) do server ek saath na chalein — lock. (2) Aaj dobara na chale — lock ke andar "ho chuka?" check.',
    },
    {
      type: 'flow',
      title: '🎬 Dry run: worker A GC pause mein atka',
      instructions: 'Ek-ek kadam. Lock, sessions aur wallet dekho.',
      scenario: 'Wallet ₹10,000. Worker A aur worker B dono ko wahi ₹500 ka payout karna hai — sirf ek baar. Postgres par <code>idle_in_transaction_session_timeout = 2s</code>.',
      lanes: [
        { id: 'a', label: '🧟 Worker A' },
        { id: 'b', label: '👷 Worker B' },
        { id: 'db', label: '🗄️ Postgres' },
      ],
      state: n => [
        { k: 'Lock 7 kiske paas', v: n >= 1 && n <= 3 ? 'Worker A' : 'kisi ke nahi' },
        { k: 'Worker A ka session', v: n < 2 ? (n === 1 ? 'zinda (transaction khula)' : '—') : (n < 4 ? 'idle in transaction ⏸️' : 'khatam ❌') },
        { k: 'Wallet (committed)', v: n < 5 ? '₹10,000' : '₹9,500' },
      ],
      steps: [
        { lane: 'a', t: 'BEGIN; pg_advisory_xact_lock(7); UPDATE wallet SET balance = balance - 500', note: 'Worker A ke paas lock 7. Worker A ne ₹500 kaate — par COMMIT abhi nahi hua, isliye doosron ko wallet ₹10,000 hi dikhta hai.' },
        { lane: 'a', t: '⏸️ GC pause — database ko kuch nahi bhej raha', note: 'Worker A ka session "idle in transaction" hai. Lock 7 abhi bhi Worker A ke paas.', bad: true },
        { lane: 'b', t: 'pg_try_advisory_xact_lock(7) → f', note: 'Worker B ko lock nahi mila — Worker B ₹500 nahi kaatta.', good: true,
          ask: {
            q: 'System Gurukul lab 36 ke Redis TTL lock mein isi pal kya hota?',
            choices: [
              'TTL khatam → Worker B ko lock mil jaata aur Worker B bhi ₹500 kaat deta',
              'Worker B rukta',
              'Redis Worker A ko jaga deta',
              'Kuch nahi hota',
            ],
            answer: 0,
            explain: 'TTL lock "waqt" par chalta hai, Worker A ke zinda hone par nahi. Isi liye lab 36 mein 30 mein se 30 orders par double charge.',
          } },
        { lane: 'db', t: '2 sec idle in transaction → Worker A ka session khatam → ROLLBACK', note: 'Postgres ne Worker A ka adhoora ₹500 wapas kiya aur lock 7 chhoda. Worker A ko abhi pata bhi nahi.', bad: true },
        { lane: 'b', t: 'pg_advisory_xact_lock(7) → UPDATE wallet -500 → COMMIT', note: 'Worker B ne payout poora kiya. Wallet ₹9,500. COMMIT par lock 7 khud chhoota.', good: true },
        { lane: 'a', t: 'Worker A jaaga → COMMIT → FATAL: terminating connection due to idle-in-transaction timeout', note: 'Zombie ka COMMIT database ne mana kiya.', good: true,
          ask: {
            q: 'Worker A ka COMMIT fail kyun hua?',
            choices: [
              'Worker A ka transaction (aur connection) database pehle hi khatam kar chuka tha — commit karne ko kuch bacha hi nahi',
              'Wallet mein paisa kam tha',
              'Worker B ne lock nahi chhoda',
              'Network slow tha',
            ],
            answer: 0,
            explain: 'Session khatam karte hi database ne transaction ROLLBACK kiya. Zombie ke paas koi adhoora kaam bacha hi nahi jo baad mein likh sake.',
          } },
        { lane: 'db', t: 'Wallet ₹9,500 — ek hi baar kata ✅', note: 'Fencing token ki zaroorat nahi padi: lock aur kaam ek hi transaction mein the.', good: true },
      ],
      insight: `Lock aur side effect <b>ek hi transaction</b> mein = zombie apna adhoora kaam kabhi commit nahi kar sakta. Timeout
        (<code>idle_in_transaction_session_timeout</code> / MySQL <code>wait_timeout</code>) atke worker ko hataata hai taaki baaki workers na ruken.`,
    },
    {
      type: 'docker',
      title: '🐳 Zombie worker: lock + kaam ek transaction mein',
      project: '10-advisory',
      exercise: 'ex2-xact',
      goal: 'Worker A lock leke ₹500 kaatta hai aur GC pause mein atak jaata hai. Dekho worker B kab kaatta hai, zombie ke COMMIT ka kya hota hai, aur wallet kitni baar kata — dono engines par.',
      steps: [
        { text: 'Databases chalao (pehle se chal rahe hain toh chhod do).', cmd: 'cd sqlgurukul/docker-labs/10-advisory\ndocker compose up -d' },
        { text: 'Zombie wali script chalao.', cmd: './scripts/xact.sh',
          expect: [
            '=================== POSTGRES — pg_advisory_xact_lock + UPDATE, ek hi transaction ===================',
            'wallet: ₹10000',
            't=1s  worker A: lock liya, ₹500 kaate — phir GC pause (4 sec tak database ko kuch nahi bhejta)',
            't=1s  worker B: pg_try_advisory_xact_lock(7) → f   ← A ke paas hai, B ne nahi kaata',
            't=3s  worker A ke sessions: 0   ← 2 sec \'idle in transaction\' ke baad database ne khatam kiya',
            't=3s  wallet: ₹10000   ← A ka ₹500 kabhi COMMIT hua hi nahi; session gaya → ROLLBACK, lock bhi chhoota',
            't=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹9500',
            't=4s  worker A jaaga, COMMIT bheja → FATAL:  terminating connection due to idle-in-transaction timeout',
            'wallet: ₹9500   ← ek hi baar kata ✅ (zombie ka COMMIT database ne khud mana kiya)',
            '',
            '=================== MYSQL — SELECT … FOR UPDATE + wait_timeout ===================',
            'wallet: ₹10000',
            't=1s  worker A: row lock (FOR UPDATE), ₹500 kaate — phir GC pause · InnoDB mein khule transactions: 1',
            't=1s  worker B: SELECT … FOR UPDATE NOWAIT → ERROR 3572 (HY000) at line 1: Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.',
            't=3s  InnoDB mein khule transactions: 0   ← wait_timeout = 2 → server ne A ka connection band kiya → uska ₹500 ROLLBACK',
            't=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹9500',
            't=4s  worker A jaaga, COMMIT bheja → ERROR 4031 (HY000) at line 6: The client was disconnected by the server because of inactivity. See wait_timeout and interactive_timeout for configuring this behavior.',
            'wallet: ₹9500   ← ek hi baar kata ✅',
            '',
            '--- MySQL ka GET_LOCK transaction ka hissa NAHI ---',
            'ROLLBACK ke baad wallet_1 lock: connection 76 ke paas · main connection 76 hoon',
          ].join('\n') },
      ],
      observe: {
        q: 'Worker A GC pause ke baad jaaga aur COMMIT bheja. Wallet ₹9,500 hi kyun raha — ₹9,000 kyun nahi?',
        choices: [
          'Database ne worker A ka session (aur transaction) pehle hi khatam karke ROLLBACK kar diya tha — zombie ke paas commit karne ko kuch bacha hi nahi',
          'Worker B ne worker A ka UPDATE mita diya',
          'Wallet par CHECK constraint tha',
          'GC pause ne UPDATE mita diya',
        ],
        answer: 0,
        explain: '<code>idle_in_transaction_session_timeout</code> (Postgres) / <code>wait_timeout</code> (MySQL) ne atke session ko khatam kiya. Lock aur kaam ek transaction mein the — dono saath gaye.',
      },
      lesson: 'Timeout ka faisla: bahut chhota → lambe (sahi) transactions bhi marenge; bahut bada → atka zombie sabko rokega. Transactions chhote rakho, timeout unse thoda bada.',
    },
    {
      type: 'bins',
      title: 'Kaunsa lock?',
      instructions: 'Har kaam ke liye sahi taala chuno.',
      bins: [
        { id: 'xact', label: '🔐 pg_advisory_xact_lock (transaction ke saath)' },
        { id: 'row', label: '📌 Row lock (SELECT … FOR UPDATE)' },
        { id: 'getlock', label: '🐬 GET_LOCK (MySQL, session ka)' },
        { id: 'idem', label: '🧾 Lock kaafi nahi — idempotency key' },
      ],
      items: [
        { text: 'Postgres: raat ka cron 3 servers par — invoices banana, sab database ke andar, ek transaction mein', bin: 'xact', explain: 'Lock aur invoices ek transaction mein. COMMIT par lock khud chhootega; server mara toh lock bhi gaya.' },
        { text: 'Ek hi wallet row se paisa kaatna — do requests ek saath', bin: 'row', explain: 'Wallet row pehle se maujood hai — FOR UPDATE usi row par taala lagata hai, alag lock number ki zaroorat nahi. COMMIT par khud chhootta hai.' },
        { text: 'Payment gateway ko charge request bhejna (database ke bahar)', bin: 'idem', explain: 'Lock gateway tak nahi pahunchta — zombie ki request gateway tak pahunch sakti hai. Har charge ke saath idempotency key; gateway wahi key dobara dekhe toh dobara na kaate.' },
        { text: 'Customer ko "salary aa gayi" email — sirf ek baar', bin: 'idem', explain: 'Email database ke bahar jaata hai. Outbox table + "bheja" flag + email provider ki idempotency.' },
        { text: 'MySQL app: raat ka cleanup job ek hi server par, kaam kai chhote transactions mein', bin: 'getlock', explain: 'GET_LOCK session ka hai — kai transactions ke paar pakda rehta hai. Aakhir mein RELEASE_LOCK (ya connection band).' },
        { text: 'Postgres app PgBouncer (transaction pooling) ke peeche — migration script "sirf ek chale"', bin: 'xact', explain: 'Session lock bouncer ke pooled connection par chipakta hai (lab 10 ex3: do maalik). Transaction lock COMMIT par chhootta hai.' },
        { text: 'Seat 10 ki booking — seats table ki row', bin: 'row', explain: 'Taala usi row par jo badalni hai. Lab 02: FOR UPDATE ke saath seat ek hi baar biki.' },
        { text: 'Postgres: report job "ek waqt mein ek hi" — koi khaas row nahi jis par taala lage', bin: 'xact', explain: 'Advisory lock kisi row se bandha nahi — job ka apna number (jaise 42) hi lock ki key.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 PgBouncer + session lock = ek lock, do maalik',
      project: '10-advisory',
      exercise: 'ex3-bouncer-trap',
      goal: 'Session-level advisory lock PgBouncer (transaction pooling) ke raaste lo. Dekho doosre client ko kya milta hai — phir transaction-level lock se ilaaj.',
      steps: [
        { text: 'Databases chalao (pehle se chal rahe hain toh chhod do).', cmd: 'cd sqlgurukul/docker-labs/10-advisory\ndocker compose up -d' },
        { text: 'Jaal wali script chalao.', cmd: './scripts/bouncer-trap.sh',
          expect: [
            '=== session-level lock, bouncer ke raaste (lab_tiny: pool mein 1 asli connection) ===',
            'client A (bouncer): pg_try_advisory_lock(42) → t   ...kaam kiya, unlock bhool gaya, chala gaya',
            'client B (bouncer): pg_try_advisory_lock(42) → t   ← B ko bhi mil gaya — ab DO maalik',
            'client C (seedha) : pg_try_advisory_lock(42) → f   ← aur baaki sab ke liye band',
            'pg_locks: key 42 → pid 714806 · bouncer se \'SELECT pg_backend_pid()\' → pid 714806   ← wahi pooled connection',
            'A aur B dono chale gaye — phir bhi lock pakda hua hai: pid 714806',
            '',
            '=== ilaaj: transaction-level lock — COMMIT par khud chhootta ===',
            'client A (bouncer): BEGIN; pg_try_advisory_xact_lock(42) → t; ...kaam...; COMMIT',
            'client C (seedha) : pg_try_advisory_lock(42) → t   ← lock chhoot chuka tha',
          ].join('\n') },
      ],
      observe: {
        q: 'Client B ko pg_try_advisory_lock(42) → t kyun mila, jabki client A ne lock chhoda hi nahi tha?',
        choices: [
          'Bouncer ne client B ko wahi server connection diya jiske paas lock tha — Postgres ke liye woh wahi session hai, aur advisory lock usi session ko dobara milta hai',
          'Client A ka lock expire ho gaya',
          'PgBouncer locks ko share karta hai',
          'pg_try_advisory_lock hamesha t deta hai',
        ],
        answer: 0,
        explain: 'Transaction pooling mein client ka session nahi hota — lock pooled server connection (pid 714806) par chipka. Pool bada ho toh bug random: kabhi do maalik, kabhi lock atka.',
      },
      lesson: 'Bouncer ke peeche session wali koi bhi cheez (SET, session lock, LISTEN) agle client ki ho jaati hai. Transaction ke andar wali cheezein hi safe hain.',
    },
    {
      type: 'quiz',
      title: 'Advisory locks ki samajh',
      questions: [
        { q: 'Postgres mein <code>pg_advisory_lock</code> aur <code>pg_advisory_xact_lock</code> mein farak?', choices: ['Session lock unlock ya connection band hone tak; transaction lock COMMIT / ROLLBACK par khud chhootta hai', 'Koi farak nahi', 'xact lock sirf reads ke liye hai', 'Session lock tez hai'], answer: 0, explain: 'PgBouncer (transaction pooling) ke peeche sirf transaction lock safe hai.' },
        { q: 'MySQL: <code>START TRANSACTION; SELECT GET_LOCK(\'x\', 0); ROLLBACK;</code> — lock ka kya hua?', choices: ['Abhi bhi usi connection ke paas — GET_LOCK transaction ka hissa nahi', 'ROLLBACK ne chhod diya', 'Lock kabhi mila hi nahi', 'Doosre connection ko chala gaya'], answer: 0, explain: 'Lab 10: "ROLLBACK ke baad wallet_1 lock: connection 76 ke paas · main connection 76 hoon".' },
        { q: 'Lock wale server ki machine mar gayi. Postgres advisory lock ka kya hota hai?', choices: ['Connection toot-te hi lock free — koi TTL nahi', '30 second baad free', 'Hamesha ke liye atka', 'DBA ko haath se hatana padta hai'], answer: 0, explain: 'Lab 10: server A ka backend khatam hua → server B: pg_try_advisory_lock(42) → t. (Chupchaap mara connection — network kata — alag kahani: TCP keepalive tak.)' },
        { q: 'PgBouncer (transaction pooling) ke raaste client A ne pg_try_advisory_lock(42) liya aur chala gaya. Client B ko kya mila?', choices: ['t — wahi pooled server connection mila, ab do maalik', 'f — lock client A ke paas hai', 'Error', 'Timeout'], answer: 0, explain: 'Lab 10 ex3: client A → t, client B → t, seedha aaya client C → f.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Advisory locks',
    instructions: 'Backend / system design round. 🎤',
    questions: [
      { q: 'Interviewer: "Cron 5 servers par hai, job sirf ek baar chalna chahiye. Redis lock lagaoge?"',
        choices: [
          'Kaam database mein hai toh pg_try_advisory_xact_lock + kaam ek transaction mein + lock ke andar "aaj ho chuka?" check. Redis lock tab jab database na ho — aur tab fencing / idempotency bhi',
          'Haan, Redis SETNX kaafi hai',
          'Har server par cron alag time par chalao',
          'Cron ko random delay de do',
        ],
        answer: 0, explain: 'Lab 10: rows hamesha 1, lock wala server mara toh lock turant free, zombie ka COMMIT mana. Lab 36 (Redis TTL): 30 mein se 30 double charge.' },
      { q: 'Interviewer: "Worker lock leke GC pause mein atak gaya. Double charge kaun rokega?"',
        choices: [
          'Lock aur side effect ek hi DB transaction mein + idle_in_transaction_session_timeout — zombie ka transaction ROLLBACK, zombie ka COMMIT database mana karta hai',
          'Lock ka TTL lamba kar do',
          'GC band kar do',
          'Kuch nahi, double charge ho hi jaayega',
        ],
        answer: 0, explain: 'TTL lamba karne se pause chhota nahi hota — sirf atke hue worker ka intezaar lamba hota hai.' },
    ],
  },
  success: [
    'Main advisory lock se "sirf ek server chale" bana sakta hoon (Postgres aur MySQL)',
    'Main bata sakta hoon ki lock wala server mare toh lock ka kya hota hai — aur chupchaap mare connection ka khatra',
    'Main lock + kaam ek transaction mein rakh ke zombie worker ka double charge rok sakta hoon',
    'Main GET_LOCK aur PgBouncer wale jaal pehchaanta hoon',
  ],
  homework: `<p>Apne project ke cron jobs dekho: kitne servers par chalte hain? Do copies ek saath chal jaayein toh kya toot-ta hai? Ek job ko aise likho:</p>
    <pre>BEGIN;
SELECT pg_try_advisory_xact_lock(42);             -- f aaya toh ROLLBACK aur skip
SELECT 1 FROM job_runs WHERE day = current_date;  -- row mili toh "aaj ho chuka" → ROLLBACK
-- … asli kaam …
INSERT INTO job_runs (day) VALUES (current_date);
COMMIT;                                           -- lock yahin khud chhootega</pre>`,
  cards: [
    { front: 'Advisory lock kya hai?', back: 'Database mein ek number (Postgres) ya naam (MySQL <code>GET_LOCK</code>) par taala — kisi table row se bandha nahi. App ke "sirf ek chale" wale kaam ke liye.' },
    { front: 'Session vs transaction advisory lock (Postgres)?', back: '<code>pg_advisory_lock</code>: unlock ya connection band hone tak. <code>pg_advisory_xact_lock</code>: COMMIT / ROLLBACK par khud chhootta hai — PgBouncer ke peeche yahi.' },
    { front: 'Lock + kaam ek transaction mein — faayda?', back: 'Zombie (GC pause) worker ka adhoora kaam ROLLBACK, aur zombie ka der se aaya COMMIT database mana karta hai. Lab 10: wallet ek hi baar kata — fencing token ki zaroorat nahi.' },
    { front: 'MySQL GET_LOCK ka jaal?', back: 'Transaction ka hissa nahi — ROLLBACK ke baad bhi pakda rehta hai. RELEASE_LOCK ya connection band. Transaction ke saath chalne wala lock chahiye → row lock (FOR UPDATE).' },
    { front: 'Lock laga tha, phir bhi job do baar kyun chala?', back: 'Lock sirf <b>ek saath</b> chalne se rokta hai. Der se jaaga server free lock pakad leta hai. Lock ke andar "aaj ho chuka?" check.' },
  ],
},
]);

})();
