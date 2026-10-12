/* =====================================================================
   TRACK 5 — 🔬 Database Internals · file 6/6
   boss-internals — 50 TB migration ka DATABASE hissa: CDC (lab 06)
   Video: "Migrating 50 TB at 100k RPS" (JR6Z1k1kKMM). System-design wala hissa
   (proxy, shadow traffic, 1% → 100%) System Gurukul ke migrations level mein hai;
   yahan woh jo database ke andar hota hai: WAL / binlog se live copy.
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   Model: 50 TB, 10 Gbit link (~1.1 GB/s), app 100,000 writes/s
   offline dump: poora data copy = downtime; CDC: freeze sirf "lag = 0" tak
   --------------------------------------------------------------------- */
const DATA_TB = 50, WRITES = 100000;
const dumpHours = v => Math.round(DATA_TB * 1e12 * 8 / (v.gbit * 1e9) / 3600 * 10) / 10;
const downtimeS = v => (v.cdc ? 30 : Math.round(dumpHours(v) * 3600));
const lagTrend = v => (v.cdc ? v.apply - WRITES : 0);

VISUALS['boss-internals'] = {
  t: 'BOSS — purana system chalta rahe, naya pakde',
  html: `
    <div class="dg-flow">
      <div class="dg-node is-accent" data-hs="old"><span class="ni">🏛️</span><span class="nl">Purana DB</span><span class="ns">100k writes/s chalu</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold" data-hs="slot"><span class="ni">📒</span><span class="nl">WAL / binlog</span><span class="ns">replication slot = "yahan tak padha"</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node" data-hs="stream"><span class="ni">🚰</span><span class="nl">CDC stream</span><span class="ns">Debezium → Kafka</span></div>
      <div class="dg-arrow good flow"></div>
      <div class="dg-node is-good" data-hs="new"><span class="ni">🆕</span><span class="nl">Naya DB</span><span class="ns">snapshot + badlaav</span></div>
    </div>
    <div class="dg-cap"><b>Snapshot</b> ek pakke log position par · us position ke baad ka <b>har badlaav</b> stream se ·
      events mein <b>poori row</b> (state), delta nahi · lag 0 → ek pal write freeze → cutover.</div>`,
};

SG.registerLevels('internals', [
{
  id: 'boss-internals',
  icon: '🏆',
  title: 'BOSS: 50 TB, 100k Writes/Sec — Database Ke Andar Ka Migration',
  badge: 'Engine Khoji',
  objectives: [
    'Offline dump kyun namumkin: 11 ghante × 100k writes/s = <b>4 arab</b> writes',
    '<b>CDC</b>: snapshot + log position + stream — asli Postgres logical replication par',
    '<b>State bhejo, delta nahi</b> — idempotent events (asli MySQL binlog se)',
    'Poore track ka jod: WAL, checkpoint, MVCC, replication slot, DDL — sab ek migration mein',
  ],
  lesson: [
    `<h3>😵 Problem</h3>
     <p>Ek <b>50 TB</b> purana database, <b>100,000 writes/second</b>. Naye system par jaana hai — <b>zero downtime, zero data loss</b>.</p>
     <p><b>Seedha tareeka:</b> dump lo, copy karo, restore karo. 10 Gbit link poora bhar ke bhi 50 TB = <b>~11 ghante</b>.
     11 ghante × 100,000 writes/s = <b>~4 arab writes</b> jo ya toh ruke (downtime) ya kho gaye.</p>
     <p><b>App se dual write</b> (dono DB mein likho)? Purane mein likha gaya, naye mein fail → dono alag. Koi coordinator nahi.
     100 ms ka network jhatka = 10,000 writes kahin atke.</p>

     <h3>📒 Asli baat: table ek "nateeja" hai, sach log hai</h3>
     <p>Pehle level (WAL) yaad karo: database <b>har badlaav pehle log mein</b> likhta hai. Table us log ka nateeja hai.
     Toh naye system ko table copy karne ki jagah <b>log padhne</b> do:</p>
     <ol>
       <li><b>Log position note karo</b> (Postgres: replication slot ka LSN; MySQL: binlog file + position / GTID).</li>
       <li><b>Snapshot</b> copy karo — usi position ki photo (MVCC wali photo!). Din lag jaayein toh bhi chalega.</li>
       <li>Snapshot ke dauraan aaye badlaav log mein <b>jama</b> hain (slot unhe delete nahi hone deta).</li>
       <li>Naya system position se <b>replay</b> karta hai → pakadta hai → kuch ms peeche chalta hai.</li>
       <li><b>Cutover:</b> ek pal likhna roko → lag 0 → traffic naye par.</li>
     </ol>
     <p>Isi ko <b>CDC</b> (change data capture) kehte hain. Debezium replica ban ke WAL/binlog padhta hai — source par koi query nahi.</p>`,

    `<h3>🔬 Lab 06 — asli Postgres par (app chalti rahi)</h3>
     <pre>App likh rahi hai (~20,000 txn/s)... node B par SUBSCRIPTION: pehle snapshot, phir WAL ka stream
    0 s | A: 203614 rows | B: 0 rows      | peeche: 1306 kB
    1 s | A: 205762 rows | B: 204747 rows | peeche: 2712 kB
    8 s | A: 219917 rows | B: 219523 rows | peeche: 1464 kB
--- app ne likhna band kiya ---
    9 s | A: 220127 rows, sum 210264775 | B: 220127 rows, sum 210264775 | peeche: 0 bytes
✅ A aur B barabar</pre>
     <h3>🪤 Do jaal (lab mein asli errors)</h3>
     <ul>
       <li><b>Bina PRIMARY KEY ki table:</b> <code>cannot update table "notes" because it does not have a replica identity</code> —
         UPDATE/DELETE ko batana padta hai <b>kaunsi</b> row. PK do.</li>
       <li><b>DDL replicate nahi hota:</b> A par naya column → B ek event apply nahi kar paaya → <b>uske baad ka poora stream ruka</b>
         (<code>apply_error_count: 2</code>). Aur jab tak B ruka hai, A ka slot WAL delete nahi hone deta — <b>A ki disk bharti hai</b>.
         Schema change: pehle naye par, phir purane par.</li>
     </ul>
     <h3>♻️ State bhejo, delta nahi (MySQL binlog)</h3>
     <pre>ROW format:        ### WHERE @3=100   ### SET @3=80          ← poori row pehle aur baad
STATEMENT format:  UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1

Event do baar mila (retry / consumer restart):
  ROW ("= 80") do baar       → 80 ✅
  STATEMENT ("- 20") do baar → 60 ❌</pre>
     <p>Kafka jaise pipelines event <b>dobara</b> de sakti hain. "balance = 80" do baar lagao — 80. "20 ghatao" do baar — galat.
     Isliye CDC mein ROW format (MySQL) / logical decoding (Postgres) — dono <b>state</b> bhejte hain. Kafka ko <b>user_id</b>
     se partition karo taaki ek user ke events kram mein rahein.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: dump ya CDC?',
      instructions: 'Knobs ghumao. Downtime aur "naya system pakad payega ya nahi" dono dekho.',
      scenario: `50 TB, app <b>100,000 writes/s</b>. Business: downtime <b>1 minute</b> se zyada nahi.
        Naya system ek second mein kitne events apply kar sakta hai — yeh consumers ki sankhya par depend karta hai.`,
      knobs: [
        { id: 'cdc', label: 'Tareeka: 0 = dump + restore · 1 = CDC (snapshot + stream)', min: 0, max: 1, step: 1, value: 0 },
        { id: 'gbit', label: 'Network', min: 1, max: 40, step: 1, value: 10, unit: 'Gbit/s' },
        { id: 'apply', label: 'Naya system apply kar sakta hai', min: 40000, max: 200000, step: 10000, value: 60000, unit: 'events/s' },
      ],
      readouts: [
        { id: 'dump', label: 'Poora data copy', unit: 'ghante', fn: v => dumpHours(v) },
        { id: 'down', label: 'App band', unit: 's', fn: v => downtimeS(v), good: x => x <= 60,
          sub: (x, v) => v.cdc ? 'sirf aakhri write-freeze' : `${(WRITES * x / 1e9).toFixed(1)} arab writes ruke` },
        { id: 'trend', label: 'Lag har second', unit: 'events/s', fn: v => lagTrend(v), good: x => x >= 0,
          sub: (x, v) => !v.cdc ? '—' : (x >= 0 ? 'lag ghat raha hai — pakad lega' : '⚠️ lag badhta hi jaayega — kabhi pakad nahi paayega') },
      ],
      verdict: v => {
        if (!v.cdc) return { tone: 'bad', text: `🔥 Dump = <b>${dumpHours(v)} ghante</b> app band. Network ${v.gbit} Gbit bhi kar do, 50 TB ki copy minutes mein nahi hoti — aur copy ke dauraan aaye writes ka kya?` };
        if (lagTrend(v) < 0) return { tone: 'warn', text: `⚠️ CDC sahi tareeka hai, par naya system ${v.apply.toLocaleString('en-IN')}/s apply karta hai aur app ${WRITES.toLocaleString('en-IN')}/s likhti hai — lag har second <b>${(-lagTrend(v)).toLocaleString('en-IN')}</b> badhega. Consumers badhao (Kafka partitions by user_id).` };
        return { tone: 'good', text: '✅ Snapshot background mein (din lage toh bhi), stream pakad raha hai, cutover sirf kuch second ka freeze.' };
      },
      goal: { text: 'Downtime <b>≤ 60 s</b> aur naya system <b>pakad sake</b> (lag ghate).', check: (v, r) => r.down <= 60 && r.trend >= 0 },
      wrongWay: v => v.cdc === 0 && v.gbit >= 30,
      insight: `Downtime <b>data ke size</b> se tay nahi hota jab tum log stream karte ho — sirf aakhri freeze se. Asli shart:
        naya system writes se <b>tez apply</b> kare, warna lag kabhi 0 nahi hoga. Isliye Kafka ko user_id se partition karke
        kai consumers parallel.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: snapshot + stream, ek-ek kadam',
      instructions: 'Lab 06 ka rasta, database ki nazar se.',
      scenario: 'Node A (purana) par app chal rahi hai. Node B (naya) khaali hai.',
      lanes: [
        { id: 'a', label: '🏛️ Node A' },
        { id: 'slot', label: '📒 Slot / WAL' },
        { id: 'b', label: '🆕 Node B' },
      ],
      state: n => [
        { k: 'B ki haalat', v: n < 2 ? 'khaali' : (n < 4 ? 'snapshot copy ho raha' : (n < 6 ? 'stream se pakad raha' : 'barabar')) },
        { k: 'A par WAL jama', v: n >= 2 && n < 5 ? 'badh raha' : 'normal' },
      ],
      steps: [
        { lane: 'slot', t: 'CREATE SUBSCRIPTION → A par replication slot bana, LSN note', note: 'Slot A ko bolta hai: "is LSN ke baad ka WAL mere padhne tak mat hatana".' },
        { lane: 'b', t: 'Snapshot: us LSN ki photo se poori table copy', note: 'Snapshot MVCC ki photo hai — copy ke dauraan A par likhna chalu, par photo nahi badalti.',
          ask: {
            q: 'Snapshot copy ke dauraan A par jo 20,000 txn/s aaye, woh kahan hain?',
            choices: ['A ke WAL mein — slot unhe hatne nahi deta; snapshot ke baad B unhe replay karega', 'Kho gaye', 'Snapshot mein', 'B par seedhe gaye'],
            answer: 0,
            explain: 'Snapshot ek LSN par hai; us ke baad ka sab WAL mein. Isi liye snapshot din bhar chale toh bhi koi write nahi chhoot-ti.',
          } },
        { lane: 'a', t: 'App likhti rahi — WAL badhta raha', note: 'Slot ki wajah se A ka WAL tab tak disk par rahega jab tak B padh na le. (Lab: B 1-2 MB peeche.)' },
        { lane: 'b', t: 'Snapshot khatam → LSN se WAL ke badlaav apply', note: 'Har event me poori nayi row (state). B lagataar kuch ms peeche.' },
        { lane: 'a', t: 'Cutover: likhna ek pal roko (write freeze)', note: 'Ab A par naya kuch nahi aa raha.',
          ask: {
            q: 'Traffic B par kab palto?',
            choices: ['Jab slot ka lag 0 ho aur A-B ka count/sum match kare', 'Turant, freeze ke saath', 'Snapshot khatam hote hi', 'Kal subah'],
            answer: 0,
            explain: 'Lab: "peeche: 0 bytes" aur sum 210264775 = 210264775 → ✅. Ek bhi event baaki ho toh B par data kam.',
          } },
        { lane: 'b', t: '✅ A aur B barabar → proxy B ki taraf', note: 'Kul downtime = freeze ka waqt (seconds). 50 TB ki copy ka waqt app ne mehsoos hi nahi kiya.', good: true },
        { lane: 'slot', t: 'Purana slot DROP karo (ya reverse CDC ke liye rakho)', note: 'Bhoola hua slot = A ka WAL kabhi delete nahi hoga = A ki disk bhar jaayegi. Video: kuch purani reports ke liye B se A ki taraf reverse CDC kuch din chalti hai.', good: true },
      ],
      insight: `Poora track ek jagah: <b>WAL</b> (sach ka log) · <b>MVCC</b> (snapshot ki photo) · <b>replication slot</b> (WAL mat hatao) ·
        <b>row images</b> (idempotent) · <b>DDL</b> (alag se) · <b>cutover</b> (lag 0).`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: Postgres CDC, app chalte hue',
      project: '06-cdc',
      exercise: 'ex1-pg-cdc',
      goal: 'Node A par app 10 second likhti rahe; beech mein node B subscription se snapshot + stream pakde. Phir dono jaal (bina PK, DDL) khud dekho.',
      steps: [
        { text: 'Teen databases chalao (Postgres A logical WAL ke saath, Postgres B, MySQL).', cmd: 'cd sqlgurukul/docker-labs/06-cdc\ndocker compose up -d' },
        { text: 'CDC script.', cmd: './scripts/pg-cdc.sh',
          expect: '    0 s | A: 203614 rows, sum 201843148   | B: 0 rows, sum 0                | peeche: 1306 kB\n    1 s | A: 205762 rows, sum 202938621   | B: 204747 rows, sum 202420971   | peeche: 2712 kB\n    ...\n--- app ne likhna band kiya (cutover se pehle ka \'write freeze\') ---\n    9 s | A: 220127 rows, sum 210264775   | B: 220127 rows, sum 210264775   | peeche: 0 bytes\n✅ A aur B barabar — ab proxy ko node B ki taraf palat sakte ho\n\n=== Jaal 1 ===\n   ERROR:  cannot update table "notes" because it does not have a replica identity and publishes updates\n=== Jaal 2 ===\nA: 220128 rows | B: 220127 rows | B par apply errors: 2\nA: 220128 rows | B: 220128 rows ✅ (retry ke baad stream wahi se chalu — koi row nahi chhooti)' },
        { text: '(Bonus) Jaal 2 ke waqt A par atka WAL dekho.', cmd: 'docker compose exec postgres psql -U postgres -d lab -c "SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) FROM pg_replication_slots"' },
      ],
      observe: {
        q: 'Jaal 2 mein B ek event par atka. B ne us event ke BAAD wale events kyun apply nahi kiye?',
        choices: [
          'Kram todna data kharab karne se bura hai — ek event chhod ke aage badhna = B par galat data; isliye stream ruk ke retry karta hai',
          'B crash ho gaya',
          'A ne bhejna band kiya',
          'Network toota',
        ],
        answer: 0,
        explain: 'Events kram mein hi sahi hain (pehle profile update, phir password change). Ruk ke retry + column jodne ke baad wahin se chalu — koi row nahi chhooti.',
      },
      lesson: 'Jitni der B ruka, A ka slot WAL pakde raha. Production mein slot lag par alert zaroori — warna CDC ka atakna A ki disk bhar deta hai.',
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: MySQL binlog — state vs delta',
      project: '06-cdc',
      exercise: 'ex2-my-binlog',
      goal: 'Ek UPDATE ko ROW aur STATEMENT dono binlog formats mein padho (Debezium ki tarah, replica ban ke), phir event do baar lagao.',
      steps: [
        { text: 'Script chalao.', cmd: './scripts/my-binlog.sh',
          expect: '=== 1. binlog_format = ROW ===\n   ### UPDATE `lab`.`wallet`\n   ### WHERE\n   ###   @1=1\n   ###   @2=\'asha\'\n   ###   @3=100\n   ### SET\n   ###   @1=1\n   ###   @2=\'asha\'\n   ###   @3=80\n\n=== 2. binlog_format = STATEMENT ===\n   UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1\n\n=== 3. Consumer ko ek event DO BAAR mila ===\n   ROW event (state \'= 80\') do baar lagaya   → 80 ✅\n   STATEMENT event (\'- 20\') do baar lagaya   → 60 ❌' },
        { text: '(Bonus) binlog_row_image = MINIMAL karke dobara — WHERE aur SET mein ab kya hai?', cmd: 'docker compose exec mysql mysql -uroot -e "SET GLOBAL binlog_row_image = \'MINIMAL\'"\n./scripts/my-binlog.sh\ndocker compose exec mysql mysql -uroot -e "SET GLOBAL binlog_row_image = \'FULL\'"' },
      ],
      observe: {
        q: 'CDC consumer ke liye ROW format "idempotent" kyun hai?',
        choices: [
          'Event mein nayi value hai ("balance = 80") — kitni bhi baar lagao, nateeja 80',
          'ROW format chhota hai',
          'ROW format encrypted hai',
          'ROW format mein retry nahi hota',
        ],
        answer: 0,
        explain: 'State = "yeh hai nayi value". Delta = "itna badlo". Dobara aaya delta = double badlaav. Isliye video kehta hai: "set balance 50" bhejo, "subtract 10" nahi.',
      },
      lesson: 'Bonus: MINIMAL mein binlog sirf PK aur badle columns rakhta hai — chhota, par consumer ko poori row nahi milti. CDC tools FULL maangte hain.',
    },
    {
      type: 'incident',
      title: '🚨 Migration ke teesre din: purane DB ki disk 92%',
      instructions: 'CDC chal raha hai. Sahi kadam chuno.',
      pager: '<b>#migration</b> — 2:40 AM<br>legacy-db-primary: disk <b>92%</b>, har ghante +3%. <code>pg_wal/</code> 1.8 TB. Kal tak 40 GB tha.',
      start: 'n1',
      nodes: {
        n1: {
          text: 'Pehla sawaal?',
          choices: [
            { t: '<code>SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) FROM pg_replication_slots</code>', good: true, next: 'n2', explain: 'pg_wal achanak badha = koi slot WAL pakde hai. Kaunsa, aur kitna?' },
            { t: '<code>rm pg_wal/0000…</code> purani files', good: false, explain: 'WAL haath se delete = database kharab / start hi nahi hoga. Kabhi nahi.' },
            { t: 'checkpoint_timeout kam karo', good: false, explain: 'Checkpoint WAL tab recycle karta hai jab koi slot use na pakde. Slot pakde hai toh checkpoint kuch nahi kar sakta.' },
          ],
        },
        n2: {
          sitrep: '<code>debezium_orders | active: f | 1.7 TB</code> — Debezium connector 31 ghante pehle ek schema change par fail hua aur ruka pada hai.',
          text: 'Ab?',
          choices: [
            { t: 'Connector ki error theek karo (naya column naye system / schema history mein) aur connector chalao — slot aage badhega, WAL recycle hoga', good: true, next: 'n3', explain: 'Asli ilaaj: consumer ko chalao. Lab 06 ka Jaal 2 — DDL ne stream roka.' },
            { t: 'Slot DROP kar do, disk bach jaayegi', good: false, explain: 'Disk bachegi, par slot ke saath 31 ghante ke badlaav bhi gaye — naya system ab adhoora. Poora snapshot dobara. Sirf aakhri raasta (jab disk full hone hi wali ho).' },
          ],
        },
        n3: {
          text: 'Dobara na ho?',
          choices: [
            { t: 'Slot lag par alert (jaise 50 GB) + Postgres 13+ <code>max_slot_wal_keep_size</code> (hadd — slot tootega par primary nahi gira) + schema changes ka runbook (pehle naya, phir purana)', good: true, next: 'end', explain: 'Alert jaldi batata hai, hadd primary ko bachaati hai, runbook wajah hatata hai.' },
            { t: 'CDC band karke dump se migration', good: false, explain: '4 arab writes wali problem wapas.' },
          ],
        },
        end: { end: true, text: 'Disk wapas normal 🧯', summary: 'CDC ka sabse aam production jaal: <b>ruka hua consumer + replication slot = source ki disk bharna</b>. Slot lag monitor karo, <code>max_slot_wal_keep_size</code> lagao, aur DDL ka kram tay rakho.' },
      },
    },
    {
      type: 'quiz',
      title: '🏆 Boss quiz — poora track',
      questions: [
        { q: 'CDC kis cheez ko padhta hai?', choices: ['Tables ko baar-baar SELECT', 'Database ka transaction log — Postgres WAL (logical decoding) / MySQL binlog', 'Backups', 'App ke logs'], answer: 1, explain: 'Level 1 (WAL): sach log mein hai, table us ka nateeja.' },
        { q: 'Snapshot copy mein 2 din lage. Us dauraan ke writes?', choices: ['Kho gaye', 'Slot ki wajah se WAL mein jama; snapshot ke baad replay', 'Snapshot mein aa gaye', 'App ne dobara bheje'], answer: 1, explain: 'Snapshot ek LSN par, baaki stream se. Keemat: source par jama WAL (disk).' },
        { q: 'Consumer restart par kuch events dobara aaye. Kaunsa event safe hai?', choices: ['balance = balance - 20', 'balance = 80 (poori row ki nayi state)', 'Dono', 'Koi nahi'], answer: 1, explain: 'State idempotent hai, delta nahi.' },
        { q: 'Migration ke beech naya column chahiye. Kram?', choices: ['Pehle purane DB par', 'Pehle naye system par, phir purane par — warna stream atakta hai', 'Dono ek saath', 'Migration ke baad hi'], answer: 1, explain: 'Lab 06 Jaal 2: A par pehle → B atka.' },
        { q: 'Poora track ek line mein — sab kuch kis par tika hai?', choices: ['Indexes', 'WAL pehle, data page baad mein — crash recovery, replication, CDC sab isi log se', 'RAM', 'SQL'], answer: 1, explain: 'Track ka formula yahi hai.' },
      ],
    },
  ],
  interview: {
    title: 'Final Interview — Engine Khoji',
    instructions: 'Staff / principal round. Poore track se. 🎤',
    questions: [
      { q: 'Interviewer: "50 TB database zero downtime ke saath naye cluster par le jaana hai. Database ka hissa batao."', choices: ['Weekend downtime', 'CDC: slot/binlog position → consistent snapshot → WAL/binlog stream (row images, PK zaroori) → lag monitor → write freeze → lag 0 → cutover → reverse CDC kuch din', 'Dual writes app se', 'pg_dump parallel'], answer: 1, explain: 'Har kadam ek level se: WAL, MVCC snapshot, replica identity, slot, idempotency.' },
      { q: 'Interviewer: "Debezium lagaya, source DB ki disk bharne lagi. Kyun?"', choices: ['Debezium data likhta hai', 'Consumer ruka/peeche → replication slot WAL recycle nahi hone deta; slot lag alert + max_slot_wal_keep_size', 'Kafka bhar gaya', 'Checkpoint band'], answer: 1, explain: 'Slot = "mere padhne tak rakho". Padhne wala ruka toh rakhte hi jaao.' },
      { q: 'Interviewer: "Kafka topic ko kis key se partition karoge?"', choices: ['Random', 'Entity key (user_id / account_id) — ek entity ke events kram mein, alag entities parallel', 'Timestamp', 'Table ka naam'], answer: 1, explain: 'Profile update phir password change — ulta lage toh galat state.' },
    ],
  },
  success: [
    'Main bata sakta hoon ki 50 TB ka offline dump kyun namumkin hai aur CDC downtime ko seconds tak kaise laata hai',
    'Main snapshot + log position + stream ka poora rasta, slot ke saath, samjha sakta hoon',
    'Main idempotent (state) vs delta events ka farak asli binlog se dikha sakta hoon',
    'Main CDC ke production jaal (bina PK, DDL, ruka slot) pehchaan ke theek kar sakta hoon',
    'Maine asli Postgres par app chalte hue live copy aur cutover check kiya hai',
  ],
  homework: `<p>Apne kisi Postgres par (lab ya staging): <code>wal_level = logical</code> karo, ek publication banao, aur
    <code>pg_recvlogical</code> ya ek doosre database ki subscription se changes padho. Ek column add karke dekho stream kab atakta hai.</p>
    <pre>SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS lag
FROM pg_replication_slots;</pre>`,
  cards: [
    { front: 'CDC ke teen kadam?', back: '<b>Log position</b> note → us position ka <b>snapshot</b> → position se <b>stream</b> (replay). Phir lag 0 par cutover.' },
    { front: 'Replication slot ka khatra?', back: 'Consumer ruka toh slot WAL recycle nahi hone deta → <b>source ki disk bharti hai</b>. Alert + <code>max_slot_wal_keep_size</code>.' },
    { front: 'CDC mein PK kyun zaroori?', back: 'UPDATE/DELETE ko naye system par <b>kaunsi row</b> — yeh replica identity (PK) batati hai. Warna Postgres UPDATE hi mana kar deta hai.' },
    { front: 'Idempotent event?', back: '<b>State</b> ("balance = 80") — dobara lagao, wahi nateeja. <b>Delta</b> ("- 20") dobara = galat.' },
    { front: 'Migration ke beech schema change ka kram?', back: '<b>Pehle naye</b> system par, phir purane par — logical replication / CDC DDL nahi bhejta.' },
  ],
},
]);
})();
