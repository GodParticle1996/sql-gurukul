/* =====================================================================
   TRACK 5 — 🔬 Database Internals · "Intermediate System Design" (Akhil Sharma) ka DB wala hissa — file 1/3
   Topic pehle se app mein hai → purane levels ko BADHAYA (naya level nahi):
     (a) scale/replicas          ← Ep 7 — lab 08 ex1-replica: asli streaming standby (lag, read-only, DROP bhi copy)
     (b) advanced/backup         ← Ep 7 — lab 08 ex2-pitr: pg_basebackup + WAL archive · mysqldump + binlog
     (c) scale/pooling           ← Ep 4 — lab 09 ex2-sweep: pool size ka pahaad asli Postgres par
     (d) internals/db-pg-power   ← Ep 4 — lab 09 ex1-cost + ex3-bouncer: 1.25 MB/connection, bouncer ki ek-core chhat, SET ka jaal
   Saare numbers local Postgres 16.2 + MySQL 8.0.46 + PgBouncer 1.23.1 ke ASLI run se (docker-labs READMEs mein wahi output).
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   (a) REPLICAS — asli streaming standby
   --------------------------------------------------------------------- */
SG.extendLevel('replicas', {
  objectives: [
    '<b>Asli streaming replica par:</b> lag aam din ~1 ms — par bade batch ke baad standby 12 MB peeche, aur primary ka DROP TABLE standby par bhi',
  ],
  lesson: [
    `<h3>🪞 Asli replica, asli lag (lab 08)</h3>
     <p><b>Misaal:</b> dukaan ka bahi-khata aur uski <b>carbon copy</b>. Munshi bahi-khate mein jo likhta hai, carbon copy par wahi
     likhawat turant utarti hai — <b>galat entry bhi</b>.</p>
     <p>Lab 08 mein asli Postgres primary, aur <code>pg_basebackup</code> se bana <b>streaming standby</b>:</p>
     <pre>primary ko dikh raha: walreceiver · streaming · async
standby par INSERT → ERROR:  cannot execute INSERT in a read-only transaction
chhoti write       → replay_lag 00:00:00.001003                      ← ~1 ms
2,000,000 orders ek transaction mein:
  COMMIT ke  55 ms baad | primary: 2010001 | standby:   10001 | 12 MB peeche
  COMMIT ke 448 ms baad | primary: 2010001 | standby: 2010001 | 0 bytes peeche
primary par DROP TABLE → standby: ERROR:  relation "orders" does not exist</pre>
     <ol>
       <li><b>Aam din standby kitna peeche?</b> ~1 ms. Isi liye "maine save kiya, dikh nahi raha" wala bug test mein kabhi nahi dikhta.</li>
       <li><b>Batch job ke turant baad?</b> Standby 12 MB WAL peeche tha. Usi pal standby par chali report mein batch ke 20 lakh orders <b>gayab</b> dikhte.</li>
       <li><b>Primary par galti?</b> Standby ne <code>DROP TABLE</code> bhi wafadaari se copy kiya. Standby par failover karke table wapas nahi
         aata — table wapas laane ka raasta Backup level ka point-in-time restore hai.</li>
     </ol>
     <p class="tip">🎯 <b>Asli baat:</b> replica <b>machine ke marne</b> se bachata hai, <b>galti</b> se nahi. Aur replica ka lag ek fixed number
     nahi — load ke saath badalta hai. Primary par <code>pg_stat_replication</code> (<code>replay_lag</code>, <code>replay_lsn</code>) dekho.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Asli replica: lag, read-only aur DROP TABLE',
      project: '08-replication',
      exercise: 'ex1-replica',
      goal: 'Primary + streaming standby chalao. Chhoti write ka lag, bade batch ka lag, standby par write, aur primary par DROP TABLE — apni aankh se dekho.',
      steps: [
        { text: 'Primary, standby aur MySQL chalao. Standby container khud <code>pg_basebackup</code> se primary ki poori copy banata hai, phir WAL stream karta hai.',
          cmd: 'cd sqlgurukul/docker-labs/08-replication\ndocker compose up -d' },
        { text: 'Replica script chalao.', cmd: './scripts/replica.sh',
          expect: [
            '=== 1. Replica kaun hai, kaisa hai ===',
            'primary ko dikh raha: walreceiver · streaming · async',
            'primary: 10000 orders   |   standby: 10000 orders   |   standby in recovery? t',
            '',
            '=== 2. Standby par likhne ki koshish ===',
            'ERROR:  cannot execute INSERT in a read-only transaction',
            '',
            '=== 3. Chhoti write — standby par kitni der mein? ===',
            'COMMIT ke baad standby se poochha → 1-vi koshish mein mil gaya (psql chalane mein hi ~20 ms lag jaate hain)',
            'Postgres ka apna hisaab: write_lag 00:00:00.000108 · replay_lag 00:00:00.001003',
            '',
            '=== 4. Bada batch job: 2,000,000 orders ek transaction mein ===',
            'COMMIT ke    55 ms baad | primary: 2010001 | standby:    10001 | standby kitna peeche: 12 MB',
            'COMMIT ke   448 ms baad | primary: 2010001 | standby:  2010001 | standby kitna peeche: 0 bytes',
            '',
            '=== 5. Galti: kisi ne primary par DROP TABLE chala diya ===',
            'primary par DROP → standby se bhi gayab: 596 ms ke andar (isme psql chalane ka waqt bhi shaamil)',
            'standby: ERROR:  relation "orders" does not exist',
          ].join('\n') },
        { text: '(Bonus) Primary par replication ka haal khud poochho.',
          cmd: 'docker compose exec primary psql -U postgres -c "SELECT application_name, state, sync_state, replay_lag FROM pg_stat_replication"' },
      ],
      observe: {
        q: 'Batch ke 55 ms baad primary par 2,010,001 orders the aur standby par 10,001. Usi pal standby par chali "aaj ke orders" report kya dikhati?',
        choices: [
          'Batch ke 20 lakh orders gayab — standby abhi 12 MB WAL peeche tha, aur async standby padhne walon ke liye rukta nahi',
          'Report error deti',
          'Sahi 2,010,001 orders',
          'Report tab tak rukti jab tak standby barabar na ho jaaye',
        ],
        answer: 0,
        explain: 'Async standby jitna WAL laga chuka hai, utna hi dikhata hai. Batch ke baad wali report ya toh primary par chalao, ya pehle standby ka <code>replay_lsn</code> batch ke LSN tak pahunchne do.',
      },
      lesson: 'Replica par read bhejne se pehle poochho: kya yeh page thoda purana data bardasht kar sakta hai? Nahi → primary par bhejo.',
    },
  ],
  success: ['Maine asli streaming replica par lag, read-only error aur DROP TABLE ka copy hona dekha hai'],
  interview: [
    { q: 'Interviewer: "Raat 2 baje batch job chalta hai, 2:01 par replica se report chalti hai — kabhi-kabhi aadhe orders gayab. Kyun?"',
      choices: ['Replica corrupt hai', 'Async replica bade batch ke baad WAL replay mein peeche hai — report primary par chalao, ya replica ka replay_lsn check karke', 'Report ki query galat hai', 'Index nahi hai'],
      answer: 1, explain: 'Lab 08: batch ke 55 ms baad standby 12 MB peeche tha. Report ka waqt aur replica ka lag dono dekho.' },
  ],
  cards: [
    { front: 'Streaming standby par INSERT?', back: '<code>ERROR: cannot execute INSERT in a read-only transaction</code> — writes sirf primary par (lab 08).' },
    { front: 'Replica ka lag kitna hota hai?', back: 'Aam din ~1 ms (lab: <code>replay_lag</code> 1 ms). Bade batch ke turant baad lab mein standby <b>12 MB</b> peeche tha. Lag load ke saath badalta hai — primary par <code>pg_stat_replication</code> dekho.' },
  ],
});

/* ---------------------------------------------------------------------
   (b) BACKUP — asli point-in-time restore
   --------------------------------------------------------------------- */
SG.extendLevel('backup', {
  objectives: [
    '<b>Asli PITR:</b> Postgres (<code>pg_basebackup</code> + WAL archive + <code>recovery_target_time</code>) aur MySQL (<code>mysqldump</code> + binlog <code>--stop-position</code>) — galat DELETE se thik pehle tak',
  ],
  lesson: [
    `<h3>⏪ Samay mein peeche — asli restore (lab 08)</h3>
     <p><b>Misaal:</b> dukaan ka CCTV. Raat 2 baje ki ek photo (backup) + uske baad ki poori recording (WAL / binlog). Chori 10:42 par
     hui? Recording ko 10:41:59 par rok do — dukaan bilkul chori se pehle jaisi.</p>
     <table>
       <tr><th></th><th>🐘 Postgres</th><th>🐬 MySQL</th></tr>
       <tr><td>Raat ki photo</td><td><code>pg_basebackup</code> — poori data directory</td><td><code>mysqldump --single-transaction --source-data=2</code></td></tr>
       <tr><td>Uske baad ki recording</td><td>WAL archive — <code>archive_command</code> har bhari 16 MB WAL file copy karta hai</td><td>binlog (MySQL 8 mein default on)</td></tr>
       <tr><td>Kahan rukna hai</td><td><code>recovery_target_time</code></td><td><code>mysqlbinlog --stop-position</code> (ya <code>--stop-datetime</code>)</td></tr>
     </table>
     <pre>02:00  base backup: 10000 orders
09:00  subah ke naye orders: 10500
10:42  DELETE FROM orders;   → primary 0 · standby bhi 0
Restore 1: sirf base backup                          → 10000   ← subah ke 500 gaye
Restore 2: base backup + WAL, DELETE se thik pehle   → 10500 ✅
           server log: recovery stopping before commit of transaction 825
MySQL:     dump + binlog (165944199 se 165950968 tak) → 10500 ✅</pre>
     <p class="tip">🎯 <b>Asli baat:</b> restore hamesha <b>alag server / alag database</b> mein karo, phir sirf sahi rows prod mein wapas
     copy karo. Aur jo backup kabhi restore karke dekha nahi, woh backup nahi — umeed hai. Lab 08 ki script khud ek restore drill hai.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Postgres PITR — sahi kram',
      instructions: 'Galat DELETE ke baad data wapas laane ke kadam sahi kram mein lagao.',
      steps: [
        { text: 'Raat ko <code>pg_basebackup</code> — poori data directory ki copy', explain: 'Base backup = shuruaati photo. Base backup ke bina WAL replay kahan se shuru hoga?' },
        { text: 'Din bhar <code>archive_command</code> har bhari WAL file archive folder mein copy karta hai', explain: 'WAL archive = recording. Base backup ke baad ka har badlaav WAL mein hai.' },
        { text: '10:42 — galat DELETE. DELETE se thik pehle ka waqt note karo', explain: '<code>recovery_target_time</code> isi waqt par rakhna hai. Waqt server log ya app log se nikaalo.' },
        { text: 'Base backup ko ALAG folder / server par copy karo', explain: 'Prod server ko mat chhuo. Restore hamesha alag jagah.' },
        { text: '<code>recovery.signal</code> + <code>restore_command</code> + <code>recovery_target_time</code> likho', explain: 'recovery.signal = "recovery mode mein uthna". restore_command = archive se WAL kaise laana hai. recovery_target_time = kahan rukna hai.' },
        { text: 'Server start — WAL replay hota hai aur DELETE ke COMMIT se thik pehle rukta hai', explain: 'Lab ka server log: "recovery stopping before commit of transaction 825".' },
        { text: 'Row count verify karo, phir sirf gayab rows prod mein wapas copy karo', explain: 'Poora prod restore wali copy se badalna zaroori nahi — sirf DELETE hui rows wapas daalo.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli restore: galat DELETE se thik pehle tak',
      project: '08-replication',
      exercise: 'ex2-pitr',
      goal: 'Base backup lo, subah ke orders daalo, galat DELETE chalao — phir sirf backup se aur backup + WAL/binlog se restore karke farak dekho. Dono engines par.',
      steps: [
        { text: 'Databases chalao (ex1 ke liye chal rahe hain toh chhod do).', cmd: 'cd sqlgurukul/docker-labs/08-replication\ndocker compose up -d' },
        { text: 'Postgres: pg_basebackup + WAL archive + recovery_target_time.', cmd: './scripts/pitr.sh',
          expect: [
            '02:00  base backup liya (pg_basebackup):      10000 orders',
            '09:00  subah ke naye orders:                   10500 orders',
            '10:42  intern ne chalaya: DELETE FROM orders;   (WHERE bhool gaya)',
            '       primary: 0 orders   |   standby: 0 orders',
            '       WAL archive mein: 103 files, aakhri: 000000010000000000000064',
            '',
            '=== Restore 1: sirf base backup (02:00 wali copy) ===',
            '       orders: 10000   ← subah ke 500 gaye',
            '',
            '=== Restore 2: base backup + WAL archive, recovery_target_time = DELETE se thik pehle ===',
            '       target: 2026-09-29 13:19:03.129453-04',
            '       orders: 10500   ← sab wapas ✅   (restore + replay: 2672 ms)',
            '       server log: recovery stopping before commit of transaction 825, time 2026-09-29 13:19:03.612522-04',
          ].join('\n') },
        { text: 'MySQL: mysqldump + binlog replay.', cmd: './scripts/pitr-mysql.sh',
          expect: [
            '02:00  mysqldump liya: 10000 orders   (dump ke andar likha: binlog binlog.000001, position 165944199)',
            '09:00  subah ke naye orders: 10500',
            '10:42  intern ne chalaya: DELETE FROM orders;   → 0 orders',
            '       binlog mein DELETE wala transaction position 165950968 par shuru hota hai',
            '',
            '=== Restore 1: sirf dump ===',
            '       orders: 10000   ← subah ke 500 gaye',
            '',
            '=== Restore 2: dump + binlog replay (165944199 se 165950968 tak — DELETE se thik pehle) ===',
            '       orders: 10500   ← sab wapas ✅',
          ].join('\n') },
      ],
      observe: {
        q: 'Sirf base backup se restore mein 10,000 orders aaye, backup + WAL se 10,500. 500 ka farak kahan se aaya?',
        choices: [
          'Subah ke 500 orders sirf WAL (recording) mein the — woh base backup (raat ki photo) ke baad aaye the',
          'Base backup adhoora tha',
          'Standby se copy hue',
          'DELETE ne 500 orders chhod diye the',
        ],
        answer: 0,
        explain: 'Backup = ek pal ki photo. Photo ke baad ka har badlaav sirf log (WAL / binlog) mein hai. Log hi RPO ko ghanton se seconds tak laata hai.',
      },
      lesson: 'Raat ka backup + din bhar ka log = kisi bhi pal tak wapas. Sirf raat ka backup = sirf raat tak wapas.',
    },
  ],
  success: ['Maine asli Postgres aur MySQL par galat DELETE ke baad point-in-time restore kiya hai'],
  interview: [
    { q: 'Interviewer: "Tumhare paas daily backup hai. Galat DELETE 10:42 par hua. Kitna data bachega?"',
      choices: ['Sab kuch', 'Sirf backup ke waqt tak — agar WAL archive / binlog nahi rakha. Log rakha hai toh 10:41:59 tak', 'Kuch nahi', 'Replica se sab wapas'],
      answer: 1, explain: 'Lab 08: sirf backup → 10,000 (subah ke 500 gaye); backup + log → 10,500.' },
  ],
  cards: [
    { front: 'Postgres PITR ke teen hisse?', back: '<code>pg_basebackup</code> (photo) + WAL archive via <code>archive_command</code> (recording) + <code>recovery_target_time</code> (kahan rukna hai).' },
    { front: 'MySQL mein galat DELETE se thik pehle kaise ruko?', back: 'Dump mein likhi binlog position se <code>mysqlbinlog</code> replay, aur DELETE wale transaction ki position par <code>--stop-position</code>.' },
  ],
});

/* ---------------------------------------------------------------------
   (c) POOLING — pool size ka pahaad asli Postgres par
   --------------------------------------------------------------------- */
SG.extendLevel('pooling', {
  objectives: [
    '<b>Asli Postgres par pool ka pahaad:</b> 4 connections par 2,328 queries/sec, 90 par 1,434 aur latency 36× — Little\'s Law se jaancho',
  ],
  lesson: [
    `<h3>⛰️ Asli Postgres par pahaad (lab 09)</h3>
     <p><b>Misaal:</b> dhaba aur uske gine-chune chulhe. 90 cook bula lo — chulhe utne hi rahenge. Rasoi mein dhakka-mukki badhti hai,
     khaana nahi. Har order ki der badhti hai.</p>
     <p>Har query ~1 ms CPU khaati hai (<code>SELECT count(*) FROM generate_series(1, 20000)</code>). <code>pgbench</code> se connections badhaye:</p>
     <pre>connections   1 →    693 queries/sec · latency avg   1.443 ms
connections   4 →   2328 queries/sec · latency avg   1.718 ms   ← peak
connections   8 →   1808 queries/sec · latency avg   4.422 ms
connections  14 →   1063 queries/sec · latency avg  13.164 ms
connections  28 →   1054 queries/sec · latency avg  26.545 ms
connections  56 →   1455 queries/sec · latency avg  38.481 ms
connections  90 →   1434 queries/sec · latency avg  62.738 ms</pre>
     <ol>
       <li><b>4 se 90 connections karne par kaam badha?</b> Nahi — 2,328 se 1,434 queries/sec. Har query ka intezaar <b>36×</b> (1.7 → 62.7 ms).</li>
       <li><b>Number sach hai?</b> Little's Law: 90 connections ÷ 62.7 ms = <b>1,434/sec</b>. Bilkul wahi. Bada pool queue ko app se nikaal ke
         database ke andar le jaata hai — database ke andar har intezaar karti query CPU, memory aur locks kha rahi hai.</li>
       <li><b>Peak 4 par kyun?</b> Laptop ka CPU 15 W ka hai (gine-chune tez cores, saath mein doosre programs). Bade server par peak aage
         khiskega — <b>shape wahi</b> rahega. Formula (cores × 2) se shuru karo, phir apni machine par naapo.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Asli Postgres par pool size ka pahaad',
      project: '09-pooling',
      exercise: 'ex2-sweep',
      goal: 'Ek hi query ko 1, 4, 8 … 90 connections se chalao. Throughput kahan rukta hai aur latency kaise badhti hai — apni machine par dekho.',
      steps: [
        { text: 'Postgres aur PgBouncer chalao.', cmd: 'cd sqlgurukul/docker-labs/09-pooling\ndocker compose up -d' },
        { text: 'Sweep chalao (7 runs × 5 sec).', cmd: './scripts/sweep.sh',
          expect: [
            '=== CPU cores: 14 · har run 5 sec · query: SELECT count(*) FROM generate_series(1, 20000) ===',
            'connections   1 →    693 queries/sec · latency avg   1.443 ms',
            'connections   4 →   2328 queries/sec · latency avg   1.718 ms',
            'connections   8 →   1808 queries/sec · latency avg   4.422 ms',
            'connections  14 →   1063 queries/sec · latency avg  13.164 ms',
            'connections  28 →   1054 queries/sec · latency avg  26.545 ms',
            'connections  56 →   1455 queries/sec · latency avg  38.481 ms',
            'connections  90 →   1434 queries/sec · latency avg  62.738 ms',
          ].join('\n') },
        { text: 'Little\'s Law se khud jaancho: connections ÷ latency = throughput. Apni machine ki aakhri line par hisaab lagao.' },
      ],
      observe: {
        q: '90 connections par latency 62.7 ms thi. Little\'s Law se throughput kitna hona chahiye?',
        choices: ['~1,434/sec — wahi jo pgbench ne naapa', '~90/sec', '~6,270/sec', '~14,000/sec'],
        answer: 0,
        explain: 'L = λ × W → λ = 90 ÷ 0.0627 s ≈ 1,434/sec. Zyada connections ne sirf W (intezaar) badhaya, λ (kaam) nahi.',
      },
      lesson: 'Pool size ka sawaal "kitne connections" nahi — "database kitna kaam ek saath poori raftaar se kar sakta hai" hai.',
    },
  ],
  success: ['Maine asli Postgres par pool size sweep chala ke peak aur Little\'s Law dekha hai'],
  interview: [
    { q: 'Interviewer: "DB slow hai. Pool 20 se 200 kar dein?"',
      choices: ['Haan, 10× tez ho jaayega', 'Pehle naapo — CPU ke peak ke baad connections sirf latency badhate hain (Little\'s Law). Slow query theek karo, pool cores × 2 ke aas-paas rakho', 'max_connections 5000 kar do', 'Replica lagao'],
      answer: 1, explain: 'Lab 09 sweep: peak ke baad throughput gira aur latency 36× badhi.' },
  ],
  cards: [
    { front: 'Pool bada karne par latency kyun badhti hai, throughput nahi?', back: 'CPU jitna kaam ek saath kar sakta hai, utna hi hota hai. Baaki connections database ke andar line mein. Lab 09: 4 → 90 connections, 2,328 → 1,434/sec, latency 1.7 → 62.7 ms.' },
  ],
});

/* ---------------------------------------------------------------------
   (d) db-pg-power — connection ka bill aur PgBouncer, asli naap
   --------------------------------------------------------------------- */
SG.extendLevel('db-pg-power', {
  objectives: [
    '<b>Asli naap:</b> ek idle Postgres connection ~1.25 MB, 101-va client <code>FATAL</code> — aur PgBouncer kab jeetta hai (1,000 clients, naya connection 4.6 → 0.8 ms), kab nahi (ek CPU core ki chhat)',
  ],
  lesson: [
    `<h3>🔬 Connection ka bill — asli naap (lab 09)</h3>
     <p>Video ne kaha "ek connection ~1.3 MB". Lab 09 ne 90 idle connections khol ke har backend process ki apni memory ginni:</p>
     <pre>90 backend processes · apni (private) memory 109 MB · ek connection ≈ 1250 kB
150 clients seedha Postgres par (max_connections = 100) → FATAL:  sorry, too many clients already</pre>
     <h3>🚪 PgBouncer — kab jeetta hai, kab nahi</h3>
     <p><b>Misaal:</b> shaadi ke hall ka ek gate-keeper. 1,000 mehmaan aaye aur andar sirf 20 kursiyan — gate-keeper sabko line mein lagake
     bithata hai, bahut kaam ka. Par 70 mehmaan aur 100 kursiyan? Tab gate-keeper beech mein khada hokar sirf der karwata hai.</p>
     <pre>seedha      70 clients → 121480 tps · latency avg   0.576 ms
PgBouncer   70 clients →  13026 tps · latency avg   5.374 ms   ← bouncer process: 99% CPU (ek core)
PgBouncer 1000 clients →  11581 tps · Postgres par asli connections: 21
har request par naya connection: seedha 856 tps (4.569 ms) · PgBouncer 4167 tps (0.792 ms)
client A: SET work_mem = '512MB' → naye client B ko bhi 512MB</pre>
     <ol>
       <li><b>Bouncer dheema kyun?</b> PgBouncer ek hi process hai, ek hi CPU core par. Clients max_connections ke andar hon aur
         connections lambe chalen, toh seedha Postgres tez.</li>
       <li><b>Bouncer ka asli kaam?</b> Jo seedha ho hi nahi sakta: 1,000 clients sirf 21 asli connections par. Aur naya connection sasta —
         PHP, serverless, lambda jaise "har request naya connection" wale apps ke liye.</li>
       <li><b>Jaal?</b> Transaction pooling mein session hota hi nahi — client A ka <code>SET</code> client B ke paas pahuncha. <code>SET LOCAL</code>
         use karo. (Advisory lock wala isse bhi bura jaal: <b>db-advisory</b> level.)</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Asli PgBouncer: connection ki keemat, 1,000 clients, aur SET ka jaal',
      project: '09-pooling',
      exercise: 'ex3-bouncer',
      goal: 'Idle connection ki memory naapo, max_connections ki deewar dekho, phir PgBouncer ke saath aur bina — lambe connections, 1,000 clients, har request naya connection, aur SET ka jaal.',
      steps: [
        { text: 'Postgres aur PgBouncer chalao.', cmd: 'cd sqlgurukul/docker-labs/09-pooling\ndocker compose up -d' },
        { text: 'Ek connection ki keemat (ex1-cost).', cmd: './scripts/conn-cost.sh',
          expect: [
            '=== 0. max_connections = 100 · CPU cores: 14 ===',
            '',
            '=== 1. 90 connections, har ek second mein sirf ek chhoti query ===',
            'us pal: idle 90',
            '90 backend processes · apni (private) memory 109 MB · ek connection ≈ 1250 kB',
            '',
            '=== 2. 150 clients seedha Postgres par (max_connections = 100) ===',
            'FATAL:  sorry, too many clients already',
          ].join('\n') },
        { text: 'PgBouncer ke saath aur bina (ex3-bouncer).', cmd: './scripts/bouncer.sh',
          expect: [
            '=== 1. Lambe connections, sirf SELECT — 5 sec har run ===',
            'seedha      70 clients → 121480 tps · latency avg   0.576 ms',
            'PgBouncer   70 clients →  13026 tps · latency avg   5.374 ms',
            'PgBouncer 1000 clients →  11581 tps · latency avg  86.346 ms   (us waqt Postgres par asli connections: 21)',
            '',
            '=== 2. Har request par NAYA connection (PHP / serverless jaisa) — pgbench -C, 20 clients ===',
            'seedha    (har baar naya backend process) →    856 tps · naya connection  4.569 ms',
            'PgBouncer (asli connection pehle se khula) →   4167 tps · naya connection  0.792 ms',
            '',
            '=== 3. Transaction pooling ka jaal — SET kisi aur ke sar (lab_tiny: pool mein sirf 1 asli connection) ===',
            'client A ne chalaya: SET work_mem = \'512MB\'  aur chala gaya',
            'client B (bilkul naya) : SHOW work_mem → 512MB      ← A ki setting B par!',
            'seedha Postgres        : SHOW work_mem → 4MB',
            'Ilaaj — SET LOCAL (sirf transaction ke andar): uske baad client B → 4MB',
          ].join('\n') },
        { text: '(Bonus) bouncer.sh chalte waqt doosre terminal mein containers ka CPU dekho — PgBouncer ~100% (ek core) par atakta hai.', cmd: 'docker stats --no-stream' },
      ],
      observe: {
        q: '70 lambe connections par seedha Postgres 121,480 tps, PgBouncer ke raaste 13,026. Bouncer ~9× dheema kyun?',
        choices: [
          'PgBouncer ek hi process hai jo ek hi CPU core par chalta hai — har query us ek core se guzarti hai (lab: 99% CPU)',
          'PgBouncer queries ko cache karta hai',
          'Transaction pooling mein har query naya connection kholti hai',
          'Postgres bouncer ke connections ko kam priority deta hai',
        ],
        answer: 0,
        explain: 'Bouncer ki chhat = ek core. Isi liye production mein bouncer app ke paas / har node par chalate hain, ya <code>so_reuseport</code> se kai bouncer processes. Bouncer throughput ke liye nahi — connections ki ginti aur naye connection ki keemat ke liye hai.',
      },
      lesson: 'Pooler lagaane se pehle poochho: problem connections ki <b>ginti</b> hai (FATAL, memory, naye connection ki keemat) ya queries ki <b>raftaar</b>? Pooler sirf pehli problem theek karta hai.',
    },
    {
      type: 'bins',
      title: 'Transaction pooling par kya chalega?',
      instructions: 'App PgBouncer (<code>pool_mode = transaction</code>) ke peeche hai. Har cheez sahi dabbe mein daalo.',
      bins: [
        { id: 'ok', label: '✅ Chalega' },
        { id: 'bad', label: '❌ Tootega — session chahiye' },
      ],
      items: [
        { text: 'BEGIN; UPDATE accounts …; COMMIT;', bin: 'ok', explain: 'Poora transaction ek hi server connection par chalta hai — transaction pooling isi ke liye bana hai.' },
        { text: 'SET work_mem = \'512MB\'', bin: 'bad', explain: 'Lab 09: client A ka SET server connection par chipak gaya aur naye client B ko 512MB mila.' },
        { text: 'BEGIN; SET LOCAL work_mem = \'512MB\'; …; COMMIT;', bin: 'ok', explain: 'SET LOCAL transaction ke saath khatam hota hai — lab mein uske baad client B ko wapas 4MB mila.' },
        { text: 'SELECT pg_advisory_lock(42) — session lock', bin: 'bad', explain: 'Session lock bouncer ke pooled connection par chipakta hai — lab 10 mein do clients dono ko lock mil gaya.' },
        { text: 'SELECT pg_advisory_xact_lock(42) — transaction ke andar', bin: 'ok', explain: 'Transaction lock COMMIT par khud chhootta hai — transaction pooling ke saath sahi.' },
        { text: 'LISTEN new_orders', bin: 'bad', explain: 'Notification us server connection par aati hai jahan LISTEN hua tha — client ab kisi aur server connection par ho sakta hai.' },
        { text: 'PREPARE q AS SELECT …; EXECUTE q; (SQL wala PREPARE)', bin: 'bad', explain: 'PREPARE ek server connection par hua, EXECUTE shayad doosre par → "prepared statement does not exist".' },
        { text: 'Driver ke protocol-level prepared statements (PgBouncer 1.21+, max_prepared_statements on)', bin: 'ok', explain: 'PgBouncer 1.21 se bouncer khud protocol-level prepared statements ko server connections par sambhalta hai.' },
      ],
    },
  ],
  success: ['Maine asli Postgres par connection ki memory, FATAL, aur PgBouncer ke faayde-nuksaan naape hain'],
  interview: [
    { q: 'Interviewer: "PgBouncer lagaya aur throughput gir gaya. Kyun?"',
      choices: ['PgBouncer kharab hai', 'PgBouncer ek process / ek core hai — clients max_connections ke andar the aur connections lambe the, toh bouncer sirf ek extra hop bana. Bouncer ginti aur naye connection ki keemat ke liye hai', 'Postgres ka bug', 'Index nahi hai'],
      answer: 1, explain: 'Lab 09: 70 lambe connections par seedha 121,480 tps, bouncer se 13,026 (bouncer 99% CPU). Par 1,000 clients par sirf bouncer hi chala.' },
  ],
  cards: [
    { front: 'Ek idle Postgres connection ki memory?', back: 'Lab 09: 90 idle connections = 109 MB private memory → ~<b>1.25 MB</b> har ek. 1,000 connections ≈ 1.2 GB sirf baithe rehne ke.' },
    { front: 'PgBouncer throughput badhata hai?', back: 'Nahi — ek process, ek core (lab: 99% CPU; seedha 121,480 vs bouncer 13,026 tps). Faayda: 1,000 clients → 21 connections, naya connection 4.6 → 0.8 ms.' },
  ],
});

})();
