/* =====================================================================
   TRACK 5 — 🔬 Database Internals · file 2/6
   (a) advanced/isolation  ko BADHAYA — kitaab vs asli engine (lab 02 ex1)
   (b) scale/locks         ko BADHAYA — ek seat 20 log, OCC vs PCC, deadlock (lab 02 ex2/ex3)
   (c) naya level db-mvcc  — row versions, VACUUM vs undo, lambi transaction (lab 04 ex2)
   Videos: Shrayansh — Concurrency Control (D3XhDu--uoI), Snowflake architecture (row versions / immutable files)

   User ka faisla: "overlap wale topics mein purane levels ko hi update karo" —
   isliye (a) aur (b) naye level nahi, SG.extendLevel hain.
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   (a) ISOLATION — kitaab kya kehti hai, engine kya karta hai
   --------------------------------------------------------------------- */
SG.extendLevel('isolation', {
  objectives: [
    '<b>Kitaab vs asli engine:</b> Postgres aur MySQL har isolation level par sach mein kya karte hain (asli containers par naapa)',
  ],
  lesson: [
    `<h3>📚 Kitaab ek baat kehti hai, engine doosri</h3>
     <p>Upar ki table <b>SQL standard</b> ki hai — "kaunsa level kaunsi problem <b>allow</b> karta hai".
     Asli engines kai jagah <b>zyada</b> bachaate hain. Lab 02 (ex1) mein dono engines par teeno jaal chalaaye:</p>
     <pre>ENGINE     LEVEL              DIRTY READ   NON-REPEATABLE   PHANTOM
Postgres   READ UNCOMMITTED   nahi         HUA ❌           HUA ❌
Postgres   READ COMMITTED     nahi         HUA ❌           HUA ❌
Postgres   REPEATABLE READ    nahi         nahi             nahi
Postgres   SERIALIZABLE       nahi         nahi             nahi
MySQL      READ UNCOMMITTED   HUA ❌       HUA ❌           HUA ❌
MySQL      READ COMMITTED     nahi         HUA ❌           HUA ❌
MySQL      REPEATABLE READ    nahi         nahi             nahi
MySQL      SERIALIZABLE       nahi         nahi             nahi</pre>
     <ol>
       <li><b>Postgres mein dirty read hota hi nahi.</b> <code>READ UNCOMMITTED</code> likho toh Postgres chupchaap
         <code>READ COMMITTED</code> chala deta hai.</li>
       <li><b>Default alag hai:</b> Postgres = <code>READ COMMITTED</code>, MySQL = <code>REPEATABLE READ</code>.
         Ek hi app code do engines par alag bartav kar sakta hai.</li>
       <li><b>Dono engines "photo" (snapshot) se padhte hain</b> — kitaab wale lambe read-locks nahi. Isiliye
         REPEATABLE READ mein simple SELECT ka phantom bhi nahi dikha.</li>
       <li><b>Farak UPDATE par aata hai:</b> REPEATABLE READ mein kisi aur ne wahi row badal di ho toh
         Postgres error deta hai (<code>could not serialize access due to concurrent update</code> — app retry kare),
         MySQL latest committed row par UPDATE kar deta hai.</li>
       <li><b>SERIALIZABLE:</b> Postgres (SSI) rukta nahi, takraav par <b>error</b> deta hai. MySQL har SELECT ko
         locking read bana deta hai — zyada <b>intezaar</b>.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Engine ka asli bartav — jodi milao',
      pairs: [
        { left: 'Postgres + READ UNCOMMITTED', right: 'READ COMMITTED jaisa hi chalta hai — dirty read kabhi nahi', explain: 'Postgres ka MVCC uncommitted row ka version kisi ko dikhata hi nahi.' },
        { left: 'MySQL + READ UNCOMMITTED', right: 'Doosre ki uncommitted row sach mein dikh jaati hai', explain: 'Lab 02: MySQL READ UNCOMMITTED par dirty read HUA. Sirf "lagbhag" counts jaise kaam ke liye.' },
        { left: 'Postgres ka default level', right: 'READ COMMITTED — har statement nayi photo', explain: 'Isliye Postgres par ek transaction mein do SELECT alag jawab de sakte hain.' },
        { left: 'MySQL ka default level', right: 'REPEATABLE READ — poori transaction ek photo', explain: 'Pehla SELECT jo photo leta hai, transaction ke aakhir tak wahi.' },
        { left: 'Postgres SERIALIZABLE par takraav', right: 'Rukta nahi — ek transaction ko serialization error, app retry kare', explain: 'SSI (Serializable Snapshot Isolation): pehle chalne do, galat order dikhe toh ek ko fail karo.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: har level ke teen jaal',
      project: '02-isolation',
      exercise: 'ex1-anomalies',
      goal: 'Dono engines ke har isolation level par dirty read, non-repeatable read aur phantom khud chalao — kitaab ki table se milao.',
      steps: [
        { text: 'Dono databases chalao.', cmd: 'cd sqlgurukul/docker-labs/02-isolation\ndocker compose up -d' },
        { text: 'Script har level par do transactions ka khel chalati hai.', cmd: './scripts/anomalies.sh',
          expect: 'ENGINE     LEVEL              DIRTY READ   NON-REPEATABLE   PHANTOM\nPostgres   READ UNCOMMITTED   nahi         HUA ❌          HUA ❌\nPostgres   READ COMMITTED     nahi         HUA ❌          HUA ❌\nPostgres   REPEATABLE READ    nahi         nahi             nahi\nPostgres   SERIALIZABLE       nahi         nahi             nahi\nMySQL      READ UNCOMMITTED   HUA ❌      HUA ❌          HUA ❌\nMySQL      READ COMMITTED     nahi         HUA ❌          HUA ❌\nMySQL      REPEATABLE READ    nahi         nahi             nahi\nMySQL      SERIALIZABLE       nahi         nahi             nahi' },
      ],
      observe: {
        q: 'Ek app Postgres se MySQL par shift hui, isolation level kahin set nahi kiya. Report ke do SELECT ab hamesha same jawab dete hain. Kyun?',
        choices: [
          'MySQL ka default REPEATABLE READ hai — poori transaction ek hi photo se padhti hai',
          'MySQL mein caching hai',
          'MySQL dirty read rokta hai',
          'Postgres mein bug tha',
        ],
        answer: 0,
        explain: 'Postgres default READ COMMITTED: har statement nayi photo. MySQL default REPEATABLE READ: pehli photo poori transaction chalti hai. Migration mein isolation level <b>explicitly</b> set karo.',
      },
      lesson: 'Kitaab "kam se kam guarantee" batati hai. Engine us se zyada de sakta hai — par app ko us zyada par <b>bharosa nahi</b> karna chahiye jab tak level khud set na kiya ho.',
    },
  ],
  interview: [
    { q: 'Interviewer: "Postgres par READ UNCOMMITTED se reports tez honge?"', choices: ['Haan, locks nahi lagte', 'Nahi — Postgres READ UNCOMMITTED ko READ COMMITTED ki tarah chalata hai; readers pehle se hi block nahi hote (MVCC)', 'Sirf indexes ke saath', 'Haan, 2× tak'], answer: 1, explain: 'MVCC mein readers writers ko rokte hi nahi. Postgres mein dirty read ka koi "speed" faayda nahi hai.' },
  ],
  cards: [
    { front: 'Postgres aur MySQL ke default isolation levels?', back: 'Postgres: <b>READ COMMITTED</b>. MySQL InnoDB: <b>REPEATABLE READ</b>.' },
    { front: 'Postgres SERIALIZABLE mein takraav par kya hota hai?', back: 'Ek transaction ko <code>could not serialize access</code> error — app ko <b>retry</b> karna hota hai (SSI).' },
  ],
});

/* ---------------------------------------------------------------------
   (b) LOCKS — ek seat, 20 log; OCC vs PCC; deadlock
   --------------------------------------------------------------------- */
SG.extendLevel('locks', {
  objectives: [
    '<b>Ek seat, 20 log:</b> naive vs FOR UPDATE vs version column — asli numbers ke saath',
    'Optimistic vs pessimistic — <b>kab kaunsa</b> (takraav kitna hai, row kitni der pakadni hai)',
    'Deadlock kaise banta hai aur <b>locks ek hi kram mein</b> lene se kaise khatam hota hai',
  ],
  lesson: [
    `<h3>🎟️ Ek seat, 20 log — asli numbers</h3>
     <p>Movie ki <b>seat 10</b> free hai. 20 connections ek saath book karte hain. Har connection:
     status padho → 0.2 second socho (payment check) → likho. Lab 02 (ex2), dono engines par:</p>
     <pre>ENGINE     TAREEKA                       EK SEAT KITNI BAAR BIKI  TIME
Postgres   naive (padho-socho-likho)     20 ❌                    252 ms
MySQL      naive (padho-socho-likho)     20 ❌                    438 ms
Postgres   SELECT ... FOR UPDATE         1 ✅                     4095 ms
MySQL      SELECT ... FOR UPDATE         1 ✅                     4174 ms
Postgres   version column (optimistic)   1 ✅                     237 ms
MySQL      version column (optimistic)   1 ✅                     424 ms</pre>
     <ul>
       <li><b>Naive:</b> 20 tickets ek seat ke. Default isolation (dono engines) ise nahi rokta.</li>
       <li><b>FOR UPDATE (pessimistic):</b> sahi, par line lagti hai — 20 × 0.2 s ≈ 4 second. Aakhri user 4 second ruka.</li>
       <li><b>Version column (optimistic):</b> sahi aur tez — par 19 logon ko "seat chali gayi, dobara try karo".</li>
     </ul>

     <h3>⚖️ Kab kaunsa?</h3>
     <table>
       <tr><th>Situation</th><th>Chuno</th><th>Kyun</th></tr>
       <tr><td>Takraav kam (profile edit, cart, apna document)</td><td>🟢 <b>Optimistic</b> (version column)</td><td>koi lock nahi, retry kabhi-kabhi</td></tr>
       <tr><td>Row padhne aur likhne ke beech <b>user ka time</b> (form 5 minute khula)</td><td>🟢 <b>Optimistic</b></td><td>5 minute ka DB lock / connection pakadna namumkin</td></tr>
       <tr><td>Sab ek hi row par toot padte hain (aakhri seat, flash sale)</td><td>🔴 <b>Pessimistic</b> ya atomic UPDATE ya queue</td><td>optimistic mein retry ka toofan</td></tr>
       <tr><td>Shart ek hi row ki value par (stock &gt; 0)</td><td>⭐ <b>Atomic UPDATE</b> (<code>WHERE stock &gt; 0</code>)</td><td>padhna-likhna ek hi statement mein, koi gap nahi</td></tr>
     </table>`,
    `<h3>🔁 Deadlock — dono ek doosre ka intezaar</h3>
     <p><b>Transfer 1:</b> Asha → Bilal ₹100. <b>Transfer 2:</b> Bilal → Asha ₹50. Ek hi pal mein.</p>
     <ol>
       <li>Transfer 1 ne <b>Asha ki row</b> lock ki.</li>
       <li>Transfer 2 ne <b>Bilal ki row</b> lock ki.</li>
       <li>Transfer 1 ko <b>Bilal ki row</b> chahiye → Transfer 2 ke paas hai → ruko.</li>
       <li>Transfer 2 ko <b>Asha ki row</b> chahiye → Transfer 1 ke paas hai → ruko.</li>
       <li>Dono hamesha rukenge. Database cycle pakadta hai aur <b>ek transaction ko maar deta hai</b>
         (Postgres: <code>deadlock detected</code>, <code>deadlock_timeout</code> = 1 s baad check;
         MySQL: <code>Deadlock found when trying to get lock</code>, turant).</li>
     </ol>
     <p class="tip">🎯 <b>Ilaaj:</b> locks hamesha <b>ek hi kram</b> mein lo — jaise <b>chhoti account id pehle</b>.
     Transfer(Bilal → Asha) bhi pehle Asha (id 1) ko lock kare. Ulta cycle ban hi nahi sakta. Lab 02 (ex3):
     same kram par "koi deadlock nahi ✅ (doosra transaction bas ruka, phir chala)".</p>
     <p>Aur phir bhi: deadlock error par <b>app retry</b> kare — kram kabhi-kabhi code mein chhoot jaata hai.</p>`,
  ],
  stages: [
    {
      type: 'flow',
      title: '🎬 Dry run: do transfers, ulta kram',
      instructions: 'Ek-ek kadam. Dekho cycle kaise banta hai.',
      scenario: '<code>accounts</code>: Asha (id 1) ₹1000, Bilal (id 2) ₹1000.',
      lanes: [
        { id: 't1', label: '💸 Transfer 1: Asha → Bilal' },
        { id: 't2', label: '💸 Transfer 2: Bilal → Asha' },
        { id: 'db', label: '🗄️ Lock manager' },
      ],
      state: n => [
        { k: 'Asha (id 1) ka lock', v: n >= 1 && n < 6 ? 'Transfer 1' : (n >= 6 ? 'Transfer 2 (T1 mara gaya)' : 'free') },
        { k: 'Bilal (id 2) ka lock', v: n >= 2 ? 'Transfer 2' : 'free' },
      ],
      steps: [
        { lane: 't1', t: 'UPDATE accounts SET bal = bal - 100 WHERE id = 1', note: 'Transfer 1 ke paas ab <b>Asha ki row</b> ka lock.' },
        { lane: 't2', t: 'UPDATE accounts SET bal = bal - 50 WHERE id = 2', note: 'Transfer 2 ke paas ab <b>Bilal ki row</b> ka lock.' },
        { lane: 't1', t: 'UPDATE … WHERE id = 2  → ⏳ ruka', note: 'Bilal ki row Transfer 2 ke paas hai. Transfer 1 intezaar kar raha hai.', bad: true },
        { lane: 't2', t: 'UPDATE … WHERE id = 1  → ⏳ ruka', note: 'Asha ki row Transfer 1 ke paas hai. Ab dono ek doosre ka intezaar kar rahe hain.', bad: true,
          ask: {
            q: 'Agar database kuch na kare toh?',
            choices: ['Dono hamesha ruke rahenge — cycle hai', 'Pehla apne aap aage badh jaayega', 'Dono commit ho jaayenge', 'Database dono ko ek saath chala dega'],
            answer: 0,
            explain: 'T1 → T2 ka intezaar, T2 → T1 ka intezaar = cycle. Koi bahar se tode bina koi aage nahi badh sakta.',
          } },
        { lane: 'db', t: 'ERROR: deadlock detected → Transfer 1 ROLLBACK', note: 'Database ne cycle pakdi aur ek transaction (victim) ko maar diya. Asha ki row ka lock chhoot gaya.', bad: true },
        { lane: 't2', t: 'Transfer 2 aage badha → COMMIT', note: 'Transfer 2 ko Asha ki row mil gayi.', good: true,
          ask: {
            q: 'Aage se deadlock na ho — sabse saaf ilaaj?',
            choices: [
              'Har transfer pehle CHHOTI id wali row lock kare, phir badi — dono transfers ek hi kram mein',
              'Isolation SERIALIZABLE kar do',
              'Lock timeout 1 ghanta kar do',
              'Transfers band kar do',
            ],
            answer: 0,
            explain: 'Ek hi kram = cycle ban hi nahi sakti. Transfer 2 (Bilal → Asha) bhi pehle id 1 (Asha) lock karega — Transfer 1 ke peeche line mein lagega, phanse ga nahi.',
          } },
        { lane: 't1', t: 'App: deadlock error par retry → Transfer 1 dobara, ab safal', note: 'Kram theek karne ke baad bhi retry-on-deadlock rakho — koi naya code path kram bhool sakta hai.', good: true },
      ],
      insight: `Deadlock "bug" nahi, <b>design ki galti</b> hai: do raaste ek hi rows ko ulte kram mein pakadte hain.
        Kram tay karo (id se sort), aur fir bhi retry rakho.`,
    },
    {
      type: 'bins',
      title: 'Optimistic ya pessimistic?',
      instructions: 'Har situation ko sahi tareeke mein daalo.',
      bins: [
        { id: 'occ', label: '🟢 Optimistic (version column)' },
        { id: 'pcc', label: '🔴 Pessimistic (SELECT … FOR UPDATE)' },
        { id: 'atomic', label: '⭐ Ek atomic UPDATE kaafi hai' },
      ],
      items: [
        { text: 'Notion jaisa document — user 10 minute edit karke Save dabata hai', bin: 'occ', explain: '10 minute tak row lock / connection pakadna namumkin. Save par <code>WHERE version = 7</code> — kisi aur ne beech mein save kiya toh "conflict, merge karo".' },
        { text: 'User apni profile ka naam badalta hai', bin: 'occ', explain: 'Ek hi user apni row badalta hai — takraav lagbhag kabhi nahi. Lock ka kharch bekaar.' },
        { text: 'Concert ki aakhri 10 seats, 50,000 log ek saath', bin: 'pcc', explain: 'Sab ek hi rows par. Optimistic mein 49,990 log retry karte rahenge — retry ka toofan. Line mein lagao (ya aage queue).' },
        { text: 'Bank transfer: do accounts, dono ka balance check phir update', bin: 'pcc', explain: 'Do rows ek saath pakki karni hain aur check ke baad likhna hai — FOR UPDATE, <b>chhoti id pehle</b>.' },
        { text: 'Stock ghatao sirf tab jab stock > 0', bin: 'atomic', explain: '<code>UPDATE items SET stock = stock - 1 WHERE id = 5 AND stock &gt; 0</code> — 0 rows badli = khatam. Padhna aur likhna ek hi statement.' },
        { text: 'Post ka like count +1', bin: 'atomic', explain: '<code>SET likes = likes + 1</code> — database khud line lagata hai, app ko padhne ki zaroorat nahi.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: ek seat 20 log, aur deadlock',
      project: '02-isolation',
      exercise: 'ex2-booking',
      goal: '20 connections ek seat par — naive, FOR UPDATE aur version column teeno chalao. Phir ulte kram ka deadlock aur same kram ka ilaaj dekho.',
      steps: [
        { text: 'Databases chalao (pehle se chal rahe hain toh chhod do).', cmd: 'cd sqlgurukul/docker-labs/02-isolation\ndocker compose up -d' },
        { text: 'Booking + deadlock script.', cmd: './scripts/booking.sh',
          expect: 'ENGINE     TAREEKA                       EK SEAT KITNI BAAR BIKI  TIME\nPostgres   naive (padho-socho-likho)     20 ❌                    252 ms\nMySQL      naive (padho-socho-likho)     20 ❌                    438 ms\nPostgres   SELECT ... FOR UPDATE         1 ✅                     4095 ms\nMySQL      SELECT ... FOR UPDATE         1 ✅                     4174 ms\nPostgres   version column (optimistic)   1 ✅                     237 ms\nMySQL      version column (optimistic)   1 ✅                     424 ms\n\n--- DEADLOCK: T1 (A phir B) aur T2 (B phir A) ---\nPostgres: deadlock detected  → ek transaction rollback hua\nMySQL:    Deadlock found when trying to get lock\n--- Ab dono transactions ek hi KRAM mein (pehle id 1, phir id 2) ---\nPostgres: koi deadlock nahi ✅ (doosra transaction bas ruka, phir chala)' },
        { text: '(Bonus) MySQL ke deadlock ki poori report dekho.', cmd: 'docker compose exec mysql mysql -uroot -e "SHOW ENGINE INNODB STATUS\\G" | sed -n "/LATEST DETECTED DEADLOCK/,/WE ROLL BACK/p"' },
      ],
      observe: {
        q: 'FOR UPDATE wala tareeka ~4 second kyun le gaya, jabki ek booking 0.2 second ki hai?',
        choices: [
          '20 log ek line mein — har ek pichhle ke 0.2 s "sochne" ka intezaar karta hai (20 × 0.2 s)',
          'FOR UPDATE query dheemi hai',
          'Disk slow hai',
          'Index nahi tha',
        ],
        answer: 0,
        explain: 'Pessimistic lock ke andar jitna time lagao, line utni lambi. Lock ke andar <b>payment API call</b> jaisa slow kaam = sabke liye dheema. Lock ke andar kaam chhota rakho.',
      },
      lesson: 'Version column bhi 1 hi bika aur 17× tez tha — par 19 users ko "dobara try karo" mila. Takraav kitna hai, yahi faisla karta hai.',
    },
  ],
  interview: [
    { q: 'Interviewer: "Optimistic locking hamesha behtar hai, locks nahi lagte" — sahi?', choices: ['Haan', 'Nahi — bahut takraav (hot row) par retry ka toofan; wahan pessimistic, atomic UPDATE ya queue', 'Sirf MySQL mein', 'Sirf read-heavy par'], answer: 1, explain: 'Optimistic ka bill = retries. Takraav kam = sasta; takraav zyada = bahut mehenga.' },
    { q: 'Interviewer: "Production mein deadlocks aa rahe hain. Pehla kadam?"', choices: ['Lock timeout badhao', 'Deadlock report (SHOW ENGINE INNODB STATUS / Postgres log) se dekho kaunsi do queries kis kram mein rows pakad rahi hain — kram ek karo, retry rakho', 'Isolation READ UNCOMMITTED', 'Replicas badhao'], answer: 1, explain: 'Deadlock report dono statements aur dono locks batati hai. Ilaaj hamesha kram (aur chhoti transactions).' },
  ],
  cards: [
    { front: 'Optimistic vs pessimistic — ek line?', back: 'Takraav <b>kam</b> ya user ka lamba "think time" → optimistic (version). Sab <b>ek row</b> par → pessimistic / atomic UPDATE / queue.' },
    { front: 'Deadlock ka design-level ilaaj?', back: 'Locks hamesha <b>ek hi kram</b> mein (jaise chhoti id pehle) + deadlock error par <b>retry</b>.' },
    { front: 'FOR UPDATE ke andar payment API call — problem?', back: 'Lock utni der pakda rehta hai jitni der API — har doosra user us row par line mein. Lock ke andar kaam chhota rakho.' },
  ],
});

/* ---------------------------------------------------------------------
   (c) NAYA LEVEL — db-mvcc
   Slider model: 2,000 UPDATE/s, ek row ~100 bytes. Report 180 minute ka.
   Report ko N chhote transactions mein todo → sabse lambi "photo" = 180/N min.
   Jab tak photo khuli hai, VACUUM us ke baad ki dead rows nahi hata sakta.
   --------------------------------------------------------------------- */
const UPD_PER_SEC = 2000, ROW_B = 100, REPORT_MIN = 180;
const longestMin = v => REPORT_MIN / v.chunks;
const stuckRows = v => Math.round(UPD_PER_SEC * 60 * longestMin(v));
const bloatMb = v => Math.round(stuckRows(v) * ROW_B / 1e6);

VISUALS['db-mvcc'] = {
  t: 'MVCC — UPDATE = nayi copy, purani copy kahin rehti hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🐘 Postgres</span>
        <div class="dg-flow">
          <span class="dg-pill bad" data-hs="dead">row 7 · ₹1000 (dead)</span>
          <span class="dg-pill good" data-hs="live">row 7 · ₹900 (live)</span>
        </div>
        <div class="dg-cap">Purani aur nayi copy <b>dono table mein</b>. <b>VACUUM</b> baad mein dead copy ki jagah khaali karta hai.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🐬 MySQL InnoDB</span>
        <div class="dg-flow">
          <span class="dg-pill good">row 7 · ₹900 (table mein, apni jagah)</span>
          <span class="dg-pill" data-hs="undo">undo log: ₹1000</span>
        </div>
        <div class="dg-cap">Row <b>apni jagah</b> badli. Purani value <b>undo log</b> mein. <b>Purge thread</b> baad mein saaf karta hai.</div></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="longtx">⏳ Lambi transaction</span>
      <span>Jab tak koi purani "photo" (snapshot) khuli hai, <b>dono engines</b> purani copies nahi hata sakte →
        Postgres: table bloat · MySQL: undo ka pahaad.</span>
    </div>`,
};

SG.registerLevels('internals', [
{
  id: 'db-mvcc',
  icon: '🧬',
  title: 'MVCC — UPDATE Ke Baad Purani Copy Kahan Jaati Hai?',
  badge: 'Copy Ka Hisaab',
  objectives: [
    'Postgres mein UPDATE = <b>nayi row</b>; MySQL mein UPDATE = <b>apni jagah</b> + purani value undo log mein',
    'VACUUM, VACUUM FULL aur MySQL purge — kaun kya karta hai, kaun table lock karta hai',
    '<b>Lambi transaction</b> dono engines mein safai kaise rokti hai (asli lab numbers)',
    'Snowflake ki "immutable files" aur time travel — wahi idea, bade level par',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p><b>Orders</b> table: asli data sirf <b>4 GB</b>. Disk par table <b>40 GB</b>. Queries har hafte dheemi.
     Kisi ne kuch delete nahi kiya — sirf UPDATE hote rahe (status: placed → packed → shipped → delivered).</p>

     <h3>🏪 Misaal: Sharma ji ka rajister</h3>
     <p>Sharma ji rajister mein kisi entry ko <b>mitaate nahi</b>. Galti ya badlaav ho toh purani line <b>kaat</b> dete hain
     aur nayi line <b>neeche</b> likhte hain. Kyun? Kyunki munim ji ek purani "photocopy" se hisaab mila rahe hain —
     munim ji ko purani line dikhni chahiye.</p>
     <ul>
       <li>Rajister mein kati hui lines badhti jaati hain → <b>rajister mota</b> (Postgres ka bloat).</li>
       <li>Kati lines tabhi hat sakti hain jab koi bhi munim purani photocopy use na kar raha ho.</li>
     </ul>
     <p class="tip">🎯 <b>Asli baat:</b> yahi <b>MVCC</b> (multi-version concurrency control) hai. Readers ko purani copy
     milti hai, isliye readers writers ko rokte nahi. Keemat: purani copies ko <b>baad mein saaf</b> karna padta hai.</p>

     <h3>🔍 Dono engines — purani copy kahan?</h3>
     <table>
       <tr><th></th><th>Postgres</th><th>MySQL InnoDB</th></tr>
       <tr><td>UPDATE</td><td>nayi row, <b>nayi jagah</b> (<code>ctid</code> badla)</td><td>row <b>apni jagah</b> badli</td></tr>
       <tr><td>Purani copy</td><td>wahi table mein ("dead row")</td><td><b>undo log</b> mein</td></tr>
       <tr><td>Safai</td><td><b>VACUUM</b> / autovacuum — jagah dobara use ke liye khaali</td><td><b>purge thread</b></td></tr>
       <tr><td>Lab 04: 200k rows, 3 baar poori table UPDATE</td><td>10 MB → <b>40 MB</b></td><td>16 MB → <b>16 MB</b></td></tr>
     </table>`,
    `<h3>🧹 VACUUM vs VACUUM FULL (lab 04 ke numbers)</h3>
     <pre>kadam                          table_size  dead_rows
0. shuru (200,000 rows)        10192 kB    1
1. sab rows UPDATE (1 baar)    20 MB       200001
2. sab rows UPDATE (3 baar)    40 MB       600000
3. VACUUM                      40 MB       0          ← jagah khaali, par file utni hi
4. phir se sab UPDATE          40 MB       200000     ← nayi jagah nahi maangi
5. VACUUM FULL                 10192 kB    0          ← poori table dobara likhi</pre>
     <ul>
       <li><b>VACUUM:</b> dead rows ki jagah <b>dobara use</b> ke liye khaali. Table chalti rehti hai. Disk OS ko wapas nahi.</li>
       <li><b>VACUUM FULL:</b> poori table nayi file mein. Disk wapas. Par tab tak table par <b>sabse bhaari lock</b> —
         na padhna, na likhna. Production mein 40 GB table par = downtime. (Online vikalp: <code>pg_repack</code> extension.)</li>
     </ul>

     <h3>⏳ Lambi transaction — dono engines ka dushman</h3>
     <pre>Postgres: 20 baar poori table UPDATE (report chal raha hai) → dead rows: 20000
          VACUUM (report abhi bhi chal raha hai)            → dead rows: 20000  ❌
          Report khatam, phir VACUUM                        → dead rows: 0      ✅
MySQL:    300 UPDATEs (report chal raha hai) → purge kitna peeche: 599 trx-ids ❌
          Report khatam                      → purge kitna peeche: 0 ✅</pre>
     <p>Report ki photo purani hai → database purani copies nahi hata sakta ("kya pata report unhe padhe").
     Sabse aam chor: app ka <b>"idle in transaction"</b> connection — <code>BEGIN</code> kiya, phir bhool gaya.</p>
     <p><b>Snowflake</b> yahi idea jaan-boojh ke use karta hai: files kabhi badalti nahi, badlaav = nayi file.
     Purani files 1–90 din rakhi jaati hain → <code>AT (yesterday 4pm)</code> <b>time travel</b> aur <code>UNDROP</code>.
     Postgres/MySQL mein purani copy sirf tab tak jab tak koi photo use kar rahi ho.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: 3 ghante ka report aur table ka motapa',
      instructions: 'Knob ghumao aur dekho kitni dead rows VACUUM ke haath se bahar hain.',
      scenario: `Orders table par <b>2,000 UPDATE/second</b>. Finance ka ek report <b>180 minute</b> chalta hai —
        <b>ek hi transaction</b> mein (REPEATABLE READ, ek photo). Report ko chhote hisson (har din / har city) mein todna
        possible hai — har hissa apni alag chhoti transaction.`,
      knobs: [
        { id: 'chunks', label: 'Report ko kitne hisson mein todo', min: 1, max: 30, step: 1, value: 1,
          help: '1 = poora report ek transaction' },
      ],
      readouts: [
        { id: 'longest', label: 'Sabse lambi photo (snapshot)', unit: 'min', fn: v => Math.round(longestMin(v)) },
        { id: 'stuck', label: 'Dead rows jo VACUUM nahi hata sakta', unit: '', fn: v => stuckRows(v),
          sub: x => `${(x / 1e6).toFixed(1)} million` },
        { id: 'bloat', label: 'Table ka extra motapa', unit: 'MB', fn: v => bloatMb(v), good: x => x <= 300,
          sub: x => x <= 300 ? 'autovacuum sambhaal lega' : '⚠️ queries ko ye sab pages bhi padhne padenge' },
      ],
      bar: v => ({ pct: Math.min(100, bloatMb(v) / 22), bad: bloatMb(v) > 300, label: `bloat ≈ ${bloatMb(v)} MB` }),
      verdict: v => {
        if (v.chunks === 1) return { tone: 'bad', text: `🔥 Ek hi photo <b>3 ghante</b> khuli. Us dauraan ke <b>${(stuckRows(v) / 1e6).toFixed(1)} million</b> purani copies VACUUM ke haath se bahar. Table ${bloatMb(v).toLocaleString('en-IN')} MB moti.` };
        if (bloatMb(v) > 300) return { tone: 'warn', text: `⚠️ Behtar — sabse lambi photo ab ${Math.round(longestMin(v))} min. Par abhi bhi ${bloatMb(v)} MB dead rows atki hain.` };
        return { tone: 'good', text: '✅ Har hissa jaldi khatam, photo jaldi band — autovacuum saath-saath saaf kar pa raha hai.' };
      },
      goal: { text: 'Extra motapa <b>≤ 300 MB</b> laao.', check: (v, r) => r.bloat <= 300 },
      insight: `Bloat ka size <b>sabse lambi transaction</b> tay karti hai, report ka total time nahi.
        Aur do rakshak settings: Postgres <code>idle_in_transaction_session_timeout</code> (bhoola hua BEGIN maaro),
        <code>statement_timeout</code>; MySQL mein <code>information_schema.innodb_trx</code> par nazar.
        Bade reports <b>replica</b> par chalao.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: ek UPDATE, do readers, phir VACUUM',
      instructions: 'Ek-ek kadam. Postgres ka rasta.',
      scenario: 'Order 7 ka status <b>packed</b> hai. Finance report (photo A) pehle se chal raha hai.',
      lanes: [
        { id: 'w', label: '✍️ Writer' },
        { id: 'tbl', label: '🗄️ Table pages' },
        { id: 'r', label: '👀 Readers' },
        { id: 'vac', label: '🧹 VACUUM' },
      ],
      state: n => [
        { k: 'order 7 ki copies', v: n >= 2 && n < 6 ? '2 (packed = dead, shipped = live)' : (n >= 6 ? '1 (shipped)' : '1 (packed)') },
        { k: 'photo A (report)', v: n >= 5 ? 'band' : 'khuli' },
      ],
      steps: [
        { lane: 'w', t: "UPDATE orders SET status = 'shipped' WHERE id = 7", note: 'Writer ne order 7 badla.' },
        { lane: 'tbl', t: 'Nayi row likhi (shipped). Purani row (packed) par "xmax = is transaction" ka nishaan', note: 'Postgres ne purani row <b>mitaayi nahi</b>. Purani row par sirf likha: "is transaction ne tumhe purana kar diya".' },
        { lane: 'r', t: 'Photo A (report) order 7 padhta hai → packed', note: 'Report ki photo UPDATE se <b>pehle</b> ki hai. Report ko purani row dikhti hai — writer ne report ko roka nahi, report ne writer ko nahi.',
          ask: {
            q: 'Ek naya reader (photo B, UPDATE commit ke baad shuru) order 7 padhe toh?',
            choices: ['shipped — photo B commit ke baad ki hai', 'packed', 'Dono rows', 'Error'],
            answer: 0,
            explain: 'Har photo ko wahi copy dikhti hai jo us photo ke waqt committed thi. Photo A → packed, photo B → shipped. Yahi <b>multi-version</b> hai.',
          } },
        { lane: 'vac', t: 'VACUUM chala → packed wali row NAHI hati', note: 'Photo A abhi khuli hai aur packed row padh sakti hai. VACUUM usse nahi hata sakta.', bad: true },
        { lane: 'r', t: 'Report khatam — photo A band', note: 'Ab koi bhi photo packed wali row nahi dekh sakti.' },
        { lane: 'vac', t: 'VACUUM dobara → packed row ki jagah khaali (dobara use ke liye)', note: 'Jagah table ke andar reuse hogi. File chhoti nahi hogi — woh sirf VACUUM FULL / pg_repack karta hai.', good: true,
          ask: {
            q: 'MySQL mein yahi UPDATE hota toh purani value (packed) kahan hoti?',
            choices: ['Undo log mein — table mein row apni jagah badli', 'Table mein nayi row', 'binlog mein sirf', 'Kahin nahi'],
            answer: 0,
            explain: 'InnoDB row ko apni jagah badalta hai aur purani value undo log mein rakhta hai. Photo A ko purani value undo se "wapas bana ke" dikhti hai. Purge thread baad mein undo saaf karta hai.',
          } },
        { lane: 'tbl', t: 'Agla UPDATE is khaali jagah ko use karega', note: 'Table ab aur nahi badhegi — jab tak VACUUM saath-saath chal pa raha hai aur koi lambi photo safai nahi rok rahi.', good: true },
      ],
      insight: `Readers writers ko nahi rokte — yahi MVCC ka faayda. Bill: purani copies. Postgres mein <b>table</b> moti hoti hai,
        MySQL mein <b>undo</b>. Dono mein lambi photo safai rokti hai.`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: copies ginti karo',
      project: '04-storage',
      exercise: 'ex2-versions',
      goal: 'Postgres mein UPDATE se ctid badalta dekho, table 4 guna hote dekho, VACUUM vs VACUUM FULL dekho — MySQL mein file wahi rehti hai. Phir lambi transaction ka asar dono engines par.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/04-storage\ndocker compose up -d' },
        { text: 'Postgres: ctid, xmin, aur size ka safar.', cmd: './run.sh pg sql/ex2-versions.pg.sql',
          expect: ' ctid  | xmin  | id | balance\n (0,7) | 42564 |  7 |    1000\n    ctid    | xmin  | id | balance\n (1273,125) | 42566 |  7 |     900\n\n                   kadam                   | table_size | live_rows | dead_rows\n 0. shuru (200,000 rows)                   | 10192 kB   |    200000 |         1\n 1. sab rows UPDATE (1 baar)               | 20 MB      |    200000 |    200001\n 2. sab rows UPDATE (3 baar)               | 40 MB      |    200000 |    600000\n 3. VACUUM                                 | 40 MB      |    200000 |         0\n 4. phir se sab UPDATE                     | 40 MB      |    200000 |    200000\n 5. VACUUM FULL (poori table dobara likhi) | 10192 kB   |    200000 |         0' },
        { text: 'MySQL: wahi kaam.', cmd: './run.sh my sql/ex2-versions.my.sql',
          expect: '| kadam                       | table_file_mb | undo_history_len_txns |\n| 0. shuru (200,000 rows)     |          16.0 |                     8 |\n| 1. sab rows UPDATE (1 baar) |          16.0 |                     9 |\n| 2. sab rows UPDATE (3 baar) |          16.0 |                    11 |' },
        { text: 'Lambi transaction — dono engines.', cmd: './scripts/long-txn.sh',
          expect: '=== Postgres ===\n20 baar poori table UPDATE (report abhi chal raha hai)  → dead rows: 20000\nVACUUM kiya (report abhi bhi chal raha hai)            → dead rows: 20000   ❌ hat nahi sakti\nReport khatam, phir VACUUM                             → dead rows: 0   ✅\n\n=== MySQL ===\nshuru                                                  → purge kitna peeche: 0 trx-ids\n300 chhote UPDATEs (report abhi chal raha hai)         → purge kitna peeche: 599 trx-ids   ❌ purge ruka hua\nReport khatam, 2 second baad                           → purge kitna peeche: 0 trx-ids   ✅' },
      ],
      observe: {
        q: 'Step 3 (VACUUM) ke baad dead rows 0 ho gayi, par table 40 MB hi rahi. Kyun?',
        choices: [
          'VACUUM dead rows ki jagah table ke andar dobara use ke liye khaali karta hai — file ko chhota nahi karta',
          'VACUUM fail ho gaya',
          'Stats purane the',
          'Index ki wajah se',
        ],
        answer: 0,
        explain: 'Step 4 mein phir se sab UPDATE kiya aur table 40 MB hi rahi — nayi rows ne wahi khaali jagah li. File chhoti karni ho toh VACUUM FULL (lock!) ya pg_repack.',
      },
      lesson: 'MySQL mein file 16 MB hi rahi kyunki InnoDB row apni jagah badalta hai — purani value undo mein gayi. Bloat ka jaal dono mein hai, bas alag jagah.',
    },
    {
      type: 'incident',
      title: '🚨 Table 40 GB, data 4 GB',
      instructions: 'Postgres production. Sahi kadam chuno.',
      pager: '<b>#db-alerts</b> — 11:20 AM<br><code>orders</code> table 40 GB, disk 85%. <code>SELECT count(*)</code> 4× dheema. autovacuum chal raha hai par "kuch nahi hota".',
      start: 's1',
      nodes: {
        s1: {
          text: 'Pehla sawaal kya poochoge?',
          choices: [
            { t: 'Sabse purani khuli transaction kaunsi hai? — <code>SELECT pid, state, xact_start FROM pg_stat_activity ORDER BY xact_start LIMIT 5</code>', good: true, next: 's2', explain: 'autovacuum chal raha hai par saaf nahi kar pa raha = koi purani photo dead rows ko pakde hai.' },
            { t: 'Turant VACUUM FULL orders', good: false, explain: '40 GB table par poori copy + sabse bhaari lock = checkout band. Aur jo transaction safai rok rahi hai woh abhi bhi khuli hai — bloat wapas aayega.' },
            { t: 'Disk badhao aur bhool jao', good: false, explain: 'Disk badhane se bloat ki wajah nahi hati. 2 hafte baad phir 85%.' },
          ],
        },
        s2: {
          sitrep: 'pid 4471 · state: <b>idle in transaction</b> · xact_start: <b>6 din pehle</b> · application: admin-dashboard',
          text: 'Ab?',
          choices: [
            { t: 'Pehle us connection ko khatam karo: <code>SELECT pg_terminate_backend(4471)</code> — phir autovacuum ko chalne do', good: true, next: 's3', explain: '6 din purani photo khatam → VACUUM ab un dead rows ko saaf kar sakta hai.' },
            { t: 'Admin dashboard ko ignore karo, woh kuch likh nahi raha', good: false, explain: 'Likh nahi raha, par uski photo 6 din purani hai — us ke baad ki saari dead rows atki hain. Idle bhi nuksaan karta hai.' },
          ],
        },
        s3: {
          text: 'Dobara na ho — pakka ilaaj?',
          choices: [
            { t: '<code>ALTER DATABASE app SET idle_in_transaction_session_timeout = \'5min\'</code> + dashboard code mein BEGIN ke baad COMMIT/ROLLBACK theek', good: true, next: 'end', explain: 'Database khud 5 minute se lamba bhoola hua BEGIN band kar dega. Aur file chhoti karni ho toh raat ko pg_repack (online).' },
            { t: 'autovacuum band kar do', good: false, explain: 'Ulta! autovacuum hi dead rows saaf karta hai. Band karna = bloat aur transaction ID wraparound ka khatra.' },
          ],
        },
        end: { end: true, text: 'Bloat ki wajah khatam 🧯', summary: 'Bloat ka sabse aam chor: <b>lambi ya "idle in transaction"</b> connection. <code>pg_stat_activity</code> mein <code>xact_start</code> dekho, timeout lagao. MySQL mein yahi <code>information_schema.innodb_trx</code> + history list length.' },
      },
    },
    {
      type: 'quiz',
      title: 'MVCC ki samajh',
      questions: [
        { q: 'Postgres mein ek row 10 baar UPDATE hui, VACUUM nahi chala. Table mein us row ki kitni copies?', choices: ['1', '11 (10 dead + 1 live)', '10', '2'], answer: 1, explain: 'Har UPDATE = nayi copy. VACUUM hi dead copies ki jagah khaali karta hai.' },
        { q: 'MySQL mein wahi 10 UPDATE — purani values kahan?', choices: ['Table mein', 'Undo log mein (purge thread baad mein saaf karega)', 'binlog mein', 'Kahin nahi'], answer: 1, explain: 'InnoDB in-place update + undo log.' },
        { q: 'VACUUM aur VACUUM FULL mein sabse bada farak?', choices: ['Koi nahi', 'VACUUM jagah reuse ke liye khaali karta hai, table chalti rehti hai; VACUUM FULL poori table dobara likhta hai aur tab tak table LOCK', 'VACUUM FULL tez hai', 'VACUUM sirf indexes par'], answer: 1, explain: 'Production mein VACUUM FULL = downtime. Online: pg_repack.' },
        { q: 'Kaunsi cheez dono engines mein safai (VACUUM / purge) rok deti hai?', choices: ['Bade indexes', 'Lambi khuli transaction / purana snapshot', 'Zyada RAM', 'Replication'], answer: 1, explain: 'Purani photo ko purani copies chahiye ho sakti hain — isliye database unhe nahi hatata.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — MVCC',
    instructions: 'Database engineer round. 🎤',
    questions: [
      { q: 'Interviewer: "Postgres mein UPDATE-heavy table ke liye kya design karoge?"', choices: ['Kuch nahi', 'Aggressive autovacuum settings us table ke liye, lambi transactions par timeout, aur fillfactor kam (HOT updates ke liye jagah)', 'Har ghante VACUUM FULL', 'Indexes hata do'], answer: 1, explain: '<code>ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.02, fillfactor = 80)</code> — chhota scale factor = jaldi vacuum; fillfactor = same page par nayi copy (HOT update, index nahi chhoona padta).' },
      { q: 'Interviewer: "Snowflake time travel aur Postgres MVCC mein kya common hai?"', choices: ['Kuch nahi', 'Dono mein badlaav purani copy mitaata nahi — Snowflake purani files jaan-boojh kar din bhar rakhta hai, Postgres sirf tab tak jab tak koi snapshot chahiye', 'Dono columnar hain', 'Dono mein undo log hai'], answer: 1, explain: 'Immutable/versioned storage ka ek hi idea: likho naya, purana baad mein hatao. Farak: kitni der rakhte ho aur kyun.' },
    ],
  },
  success: [
    'Main bata sakta hoon ki UPDATE ke baad purani copy Postgres aur MySQL mein kahan jaati hai',
    'Main VACUUM, VACUUM FULL aur purge ka farak (aur lock) samjha sakta hoon',
    'Main bloat ki jaanch pg_stat_activity / innodb_trx se shuru karta hoon',
    'Maine asli DB par ctid badalte aur lambi transaction se safai rukte dekha hai',
  ],
  homework: `<pre>-- Postgres: sabse zyada dead rows wali tables
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;

-- MySQL: sabse purani khuli transactions
SELECT trx_id, trx_started, trx_mysql_thread_id, trx_query
FROM information_schema.innodb_trx ORDER BY trx_started LIMIT 5;</pre>`,
  cards: [
    { front: 'Postgres UPDATE ke baad purani row?', back: 'Wahi table mein <b>dead row</b> ban ke rehti hai. VACUUM jagah reuse ke liye khaali karta hai.' },
    { front: 'MySQL UPDATE ke baad purani value?', back: '<b>Undo log</b> mein. Row apni jagah badli. Purge thread baad mein saaf karta hai.' },
    { front: 'Bloat ka sabse aam chor?', back: '<b>Lambi / "idle in transaction"</b> connection — purana snapshot safai rokta hai. Ilaaj: <code>idle_in_transaction_session_timeout</code>.' },
    { front: 'VACUUM FULL production mein kyun khatarnak?', back: 'Poori table dobara likhta hai aur tab tak <b>ACCESS EXCLUSIVE</b> lock — na read, na write. Online: pg_repack.' },
  ],
},
]);
})();
