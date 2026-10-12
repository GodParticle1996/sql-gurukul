/* =====================================================================
   SQL Gurukul — Track 3: 🚀 Advanced (Schema Guru Path)
   Production DBA ka shastra — ACID se 3AM incident tak.
   ===================================================================== */

SG.registerLevels('advanced', [

  /* ================= LEVEL 1: Transactions & ACID ================= */
  {
    id: 'transactions',
    icon: '🔒',
    title: 'Transactions — Sab Hoga ya Kuch Nahi',
    badge: 'ACID Aacharya',
    objectives: [
      '<b>BEGIN / COMMIT / ROLLBACK</b> — teen commands, poori surakhsha',
      '<b>ACID</b> ke chaar akshar, practical matlab ke saath',
      'Transaction risky UPDATE ka <b>seatbelt</b> kaise banta hai',
      'Kaunse operations ek transaction mein hone chahiye',
    ],
    lesson: [
      `<h3>🔒 Transaction = ek atoot bundle</h3>
       <pre>BEGIN;
  UPDATE bx50Data SET status = 'Provisioned' WHERE bx50Name = 'bx50-pune-01';
  INSERT INTO bx50Sessions (userId, buildNum, duration) VALUES ('OP-101', 1042, 900000);
COMMIT;      -- ab dono pakke
-- ya
ROLLBACK;    -- ab dono gayab, jaise kuch hua hi nahi</pre>
       <p>Transaction ke andar jo bhi karo, woh <b>COMMIT tak asthayi</b> hai.
       Beech mein server crash ho jaye, connection toot jaye, ya tum
       <code>ROLLBACK</code> bol do — <b>kuch nahi hua</b>.</p>
       <p>💡 Yeh sirf "multiple statements" ke liye nahi hai. <b>Ek risky
       UPDATE bhi transaction mein chalao</b> — yeh seatbelt hai:</p>
       <pre>BEGIN;
UPDATE bx50Data SET status = 'X' WHERE customerLocation = 'Tokyo';
-- "3 rows affected" — expected tha?  SELECT se verify karo
SELECT bx50Name, status FROM bx50Data WHERE customerLocation = 'Tokyo';
COMMIT;    -- theek laga? pakka karo
-- ROLLBACK;  -- galat laga? wapas!</pre>`,
      `<h3>🧪 ACID — chaar guarantees</h3>
       <table>
         <tr><th>Akshar</th><th>Matlab</th><th>Practical</th></tr>
         <tr><td><b>A</b>tomicity</td><td>sab ya kuch nahi</td><td>paisa kata par jama nahi hua — aisa kabhi nahi</td></tr>
         <tr><td><b>C</b>onsistency</td><td>rules kabhi na tootein</td><td>FK/UNIQUE/CHECK transaction ke baad bhi sach</td></tr>
         <tr><td><b>I</b>solation</td><td>parallel txn aapas mein na ghusein</td><td>agla level poora ispar hai</td></tr>
         <tr><td><b>D</b>urability</td><td>COMMIT ke baad pakka</td><td>COMMIT ke turant baad power gaya? data safe</td></tr>
       </table>
       <p>⚠️ <b>MySQL mein engine matter karta hai:</b> <code>InnoDB</code>
       transactions support karta hai, purana <code>MyISAM</code> nahi. Aaj kal
       default InnoDB hi hai — par legacy tables par
       <code>SHOW TABLE STATUS</code> se check kar lena.</p>
       <p>⚠️ <b>DDL transactional nahi hota.</b> MySQL mein
       <code>CREATE/ALTER/DROP TABLE</code> chalate hi ek <b>implicit COMMIT</b>
       ho jaata hai — us par <code>ROLLBACK</code> kaam nahi karega.</p>`,
      `<h3>🎯 Kya transaction mein daalna chahiye</h3>
       <p><b>Haan, zaroor:</b></p>
       <ul>
         <li>Do ya zyada tables ka juda hua change (test result + summary counter)</li>
         <li>Koi bhi risky <code>UPDATE</code>/<code>DELETE</code> prod par</li>
         <li>"Paisa/stock/quota" jaisa kuch bhi jo aadha nahi reh sakta</li>
       </ul>
       <p><b>Nahi:</b></p>
       <ul>
         <li>Sirf <code>SELECT</code> (waise consistent snapshot chahiye toh theek hai)</li>
         <li><b>Lambe transactions</b> — jitni der khula rahega, utne locks pakde
             rahenge aur doosre queries wait karengi</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka test-result
       save karne wala code do kaam karta tha: <code>bmsTester</code> mein result
       insert, aur <code>adcTestResult</code> mein us build ka
       <code>progress</code> update. Dono alag statements the, <b>bina
       transaction ke</b>. Ek raat API container beech mein restart hua —
       insert ho chuka tha, progress update nahi. Ab dashboard bolta tha "test
       80% complete" par results table mein poore 8 tests the. QA ne teen din
       is "phantom incomplete build" ko debug kiya. Fix: dono statements ek
       <code>BEGIN … COMMIT</code> mein. <b>Sabak: jo do cheezein saath sach
       honi chahiye, unhe ek transaction mein rakho — warna crash unhe alag kar
       dega.</b></div>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'Transaction diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'transactions',
        questions: [
          { q: 'Changes ko pakka karne wala command?', target: 'commit', explain: 'COMMIT — ab durable hai, crash bhi ho toh data bacha rahega.' },
          { q: 'Galti wapas lene wala command?', target: 'rollback', explain: 'ROLLBACK — sab changes gayab, jaise kuch hua hi nahi. Yehi seatbelt hai.' },
          { q: '"Sab hoga ya kuch nahi" — ACID ka kaunsa akshar?', target: 'atomic', explain: 'Atomicity. Paisa kata par jama nahi hua — aisa kabhi nahi hoga.' },
          { q: 'COMMIT ke baad power gaya, phir bhi data bacha — kaunsa guarantee?', target: 'durable', explain: 'Durability. COMMIT ka matlab hi hai "disk par likha ja chuka".' },
        ],
      },
      {
        type: 'fill',
        title: 'Safe UPDATE — transaction ke andar',
        instructions: 'Risky bulk update, seatbelt ke saath. Blanks bharo.',
        template: `{0};                                          -- seatbelt lagao

UPDATE bx50Data
SET    status = 'Provisioned'
WHERE  customerLocation = 'Tokyo';
-- "2 rows affected" — expected tha?

SELECT bx50Name, status FROM bx50Data
WHERE  customerLocation = 'Tokyo';           -- apni aankhon se verify

-- Sab theek?
{1};                                          -- pakka karo
-- Kuch galat?
-- {2};                                       -- sab wapas

-- Aur yeh do statements HAMESHA saath: (crash ne inhe alag kar diya tha)
BEGIN;
  INSERT INTO bmsTester (id, operatorId, client, status)
    VALUES ('new-uuid-1', 'OP-101', 'Komatsu', 'pass');
  UPDATE adcTestResult SET progress = 100 WHERE buildNum = 502;
{1};`,
        tokens: ['BEGIN', 'COMMIT', 'ROLLBACK', 'START', 'SAVEPOINT', 'END', 'FLUSH', 'LOCK'],
        blanks: [
          { answer: 'BEGIN', explain: '<code>BEGIN</code> (ya <code>START TRANSACTION</code>) — is line ke baad sab kuch asthayi hai.' },
          { answer: 'COMMIT', explain: '<code>COMMIT</code> = changes pakke. Iske pehle server crash ho jaye toh sab apne aap rollback ho jaata hai.' },
          { answer: 'ROLLBACK', explain: '<code>ROLLBACK</code> = sab wapas. Yeh woh command hai jo "5 rows affected" dekhne ke baad tumhari jaan bachati hai.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: ROLLBACK se jaan bachao',
        instructions: 'Jaan-boojh ke ek galat UPDATE karo — aur transaction se use wapas lo.',
        goal: 'Aaj tum woh galti karoge jo Track 1 ke incident mein hui thi — par is baar seatbelt ke saath. <b>(1)</b> <code>BEGIN;</code> se transaction shuru karo. <b>(2)</b> Ab jaan-boojh ke <b>WHERE bhool jao</b>: <code>UPDATE bx50Data SET status = \'Not Built\';</code> — rows affected dekho. <b>(3)</b> <code>SELECT bx50Name, status FROM bx50Data;</code> — damage apni aankhon se dekho. <b>(4)</b> <code>ROLLBACK;</code> — sab wapas. <b>(5)</b> Verify karo ki data theek hai. <b>(6)</b> Ab sahi tarike se karo: <code>BEGIN</code> → sirf <code>bx50-tokyo-02</code> ka status <code>\'Provisioned\'</code> → verify → <code>COMMIT</code>.',
        tasks: [
          { text: 'BEGIN se transaction shuru', check: s => s.history.some(h => /^(begin|start\s+transaction)$/i.test(h)) },
          { text: 'Bina WHERE ke UPDATE (jaan-boojh ke)', check: s => s.history.some(h => /^update\s+bx50data\s+set/i.test(h) && !/where/i.test(h)) },
          { text: 'ROLLBACK se sab wapas', check: s => !!s.rolledBack },
          { text: 'Data theek hai (5 provisioned wapas)', check: s => s.db.tables.bx50Data.rows.filter(r => r.status === 'Provisioned').length >= 4 },
          { text: 'Ab sahi UPDATE + COMMIT', check: s => !!s.committed && (s.db.tables.bx50Data.rows.find(r => r.bx50Name === 'bx50-tokyo-02') || {}).status === 'Provisioned' },
        ],
        db: SG.factoryDB(),
        success: s => !!s.rolledBack && !!s.committed
          && (s.db.tables.bx50Data.rows.find(r => r.bx50Name === 'bx50-tokyo-02') || {}).status === 'Provisioned'
          && s.db.tables.bx50Data.rows.filter(r => r.status === 'Not Built').length <= 1
          && s.history.some(h => /^update\s+bx50data\s+set/i.test(h) && !/where/i.test(h)),
        successText: '🎉 <b>Wahi galti, alag anjaam.</b> Track 1 mein isi UPDATE ne 312 rows uda di thi aur backup se restore karna pada tha. Aaj <code>ROLLBACK</code> ne 1 second mein sab wapas kar diya. Yeh <b>Atomicity</b> hai — transaction ke andar sab ya kuch nahi. Aadat banao: <b>prod par koi bhi UPDATE/DELETE = <code>BEGIN</code> → chalao → <code>SELECT</code> se verify → <code>COMMIT</code></b>. Ek extra line, aur raat ki neend safe.',
        hints: [
          'BEGIN;',
          "UPDATE bx50Data SET status = 'Not Built';   ← WHERE nahi! rows affected dekho",
          'SELECT bx50Name, status FROM bx50Data;   ← damage dekho',
          'ROLLBACK;   ← ab sab wapas',
          "BEGIN;  phir  UPDATE bx50Data SET status = 'Provisioned' WHERE bx50Name = 'bx50-tokyo-02';  phir  COMMIT;",
        ],
      },
      {
        type: 'quiz',
        title: 'Transaction Quick-fire',
        questions: [
          {
            q: 'Transaction ke beech mein server crash ho gaya (COMMIT se pehle). Kya hoga?',
            choices: [
              'Saare changes apne aap rollback ho jayenge — jaise kuch hua hi nahi',
              'Aadhe changes save ho jayenge',
              'Database corrupt ho jayega',
              'Changes save ho jayenge',
            ],
            answer: 0,
            explain: 'Atomicity. Bina COMMIT ke kuch bhi pakka nahi hota — isliye crash ke baad DB apne aap saaf kar deta hai.',
          },
          {
            q: 'Ek hi UPDATE hai. Transaction ki zaroorat kya?',
            choices: [
              'Seatbelt ke liye — rows affected galat lage toh ROLLBACK kar sakte ho, warna change turant pakka ho jaata hai',
              'Koi zaroorat nahi',
              'Query tez chalti hai',
              'MySQL ki requirement hai',
            ],
            answer: 0,
            explain: 'Prod par yeh sabse sasta insurance hai. "312 rows affected" dekhne ke baad ROLLBACK ka option hona hi sab kuch hai.',
          },
          {
            q: 'MySQL mein <code>CREATE TABLE</code> ko ROLLBACK kar sakte ho?',
            choices: [
              'Nahi — DDL implicit COMMIT karta hai, uspar ROLLBACK kaam nahi karega',
              'Haan, koi bhi statement rollback ho sakta hai',
              'Sirf agar InnoDB ho',
              'Sirf agar table khaali ho',
            ],
            answer: 0,
            explain: 'MySQL mein DDL (CREATE/ALTER/DROP) transactional nahi hai — chalate hi commit ho jaata hai. (Postgres mein DDL rollback ho sakta hai.)',
          },
          {
            q: 'Lamba transaction khula rakhne ka nuksaan?',
            choices: [
              'Locks pakde rehte hain — doosri queries wait karti hain, aur deadlock/timeout ka khatra badhta hai',
              'Koi nuksaan nahi',
              'Data corrupt ho jaata hai',
              'COMMIT slow ho jaata hai',
            ],
            answer: 0,
            explain: 'Transaction chhota rakho: sirf woh statements jo saath mein atomic hone chahiye. Beech mein API call ya user input ka intezaar <b>kabhi nahi</b>.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Transactions',
      instructions: 'Production round shuru. 🎤',
      questions: [
        {
          q: '"ACID kya hai?"',
          choices: [
            '<b>Atomicity</b> (sab ya kuch nahi), <b>Consistency</b> (constraints kabhi na tootein), <b>Isolation</b> (parallel txn aapas mein na ghusein), <b>Durability</b> (COMMIT ke baad crash bhi ho toh data safe)',
            'Ek database ka naam',
            'SQL ka ek command',
            'Index ka ek type',
          ],
          answer: 0,
          explain: 'Ratne se behtar hai har akshar ka <b>ek practical example</b> dena — "paisa kata par jama nahi hua, aisa kabhi nahi" wagairah.',
        },
        {
          q: 'Interviewer: "Do tables update karni hain. Transaction kyun chahiye?"',
          choices: [
            'Kyunki beech mein crash/error ho toh aadha kaam ho jayega aur data inconsistent state mein reh jayega — jaise result save ho gaya par progress counter update nahi hua',
            'Kyunki tez chalta hai',
            'Kyunki MySQL zaroori karta hai',
            'Zaroorat nahi hai',
          ],
          answer: 0,
          explain: 'Concrete example dena best hai. Asli project mein exactly yahi hua — insert hua, progress update nahi, aur QA ne 3 din phantom bug debug kiya.',
        },
        {
          q: '🎛️ Interviewer: "Transaction live karke dikhao."',
          terminal: {
            title: 'Interview hands-on — transactions',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>BEGIN</code> karo. <b>(2)</b> <code>operators</code> mein ek naya operator insert karo (<code>OP-301</code>, koi bhi naam). <b>(3)</b> <code>SELECT COUNT(*) FROM operators;</code> — count badha? <b>(4)</b> <code>ROLLBACK</code> karo. <b>(5)</b> Phir se count dekho — wapas purana hona chahiye.',
            tasks: [
              { text: 'BEGIN', check: s => s.history.some(h => /^(begin|start\s+transaction)$/i.test(h)) },
              { text: 'Naya operator insert', check: s => s.history.some(h => /insert\s+into\s+operators/i.test(h)) },
              { text: 'ROLLBACK', check: s => !!s.rolledBack },
              { text: 'Count wapas purana (OP-301 gayab)', check: s => !s.db.tables.operators.rows.some(r => r.opId === 'OP-301') && s.history.filter(h => /count\s*\(\s*\*\s*\)/i.test(h) && /operators/i.test(h)).length >= 2 },
            ],
            db: SG.factoryDB(),
            success: s => !!s.rolledBack
              && !s.db.tables.operators.rows.some(r => r.opId === 'OP-301')
              && s.history.some(h => /insert\s+into\s+operators/i.test(h))
              && s.history.filter(h => /count\s*\(\s*\*\s*\)/i.test(h) && /operators/i.test(h)).length >= 2,
            successText: '✅ Insert dikha, phir ROLLBACK ke baad gayab. Yeh chhota sa demo hi transaction ka poora point hai — <b>COMMIT tak kuch bhi pakka nahi</b>.',
            hints: [
              'BEGIN;',
              "INSERT INTO operators (opId, name, shift) VALUES ('OP-301', 'Temp User', 'day');",
              'SELECT COUNT(*) FROM operators;   ← badha hua count',
              'ROLLBACK;   phir dobara  SELECT COUNT(*) FROM operators;',
            ],
          },
        },
      ],
    },
    success: [
      'Main BEGIN / COMMIT / ROLLBACK use kar sakta hoon',
      'Main ACID ke chaar akshar practical example se samjha sakta hoon',
      'Main risky UPDATE ko transaction ke andar chalata hoon',
      'Main jaanta hoon ki kaunse operations ek transaction mein hone chahiye',
    ],
    homework: `<p>Seatbelt ki aadat daalo:</p>
      <pre>USE factory;
SET autocommit = 0;        -- ab har statement apne aap commit nahi hoga

BEGIN;
UPDATE operators SET shift = 'night';       -- WHERE nahi!
SELECT * FROM operators;                     -- sab night ho gaye
ROLLBACK;
SELECT * FROM operators;                     -- sab wapas 😌

-- Do-table wala kaam
BEGIN;
  INSERT INTO operators (opId, name, shift) VALUES ('OP-401','Test','day');
  UPDATE bx50Builds SET active = 0 WHERE buildNum = 1043;
COMMIT;

-- DDL rollback nahi hota — khud dekho
BEGIN;
CREATE TABLE tx_demo (id INT);
ROLLBACK;
SHOW TABLES;               -- tx_demo abhi bhi hai!</pre>
      <p>✅ Self-check: ROLLBACK ke baad operators wapas aa gaye? <code>tx_demo</code> table ROLLBACK ke baad bhi maujood tha (DDL implicit commit)?</p>`,
    cards: [
      { front: 'Transaction ke teen commands?', back: '<code>BEGIN</code> (ya START TRANSACTION) → changes → <code>COMMIT</code> (pakka) ya <code>ROLLBACK</code> (sab wapas). COMMIT tak kuch bhi permanent nahi.' },
      { front: 'ACID ka matlab?', back: '<b>A</b>tomicity (sab ya kuch nahi) · <b>C</b>onsistency (constraints bache rahein) · <b>I</b>solation (parallel txn alag) · <b>D</b>urability (COMMIT ke baad crash-proof).' },
      { front: 'Ek UPDATE ke liye bhi transaction kyun?', back: '<b>Seatbelt.</b> "312 rows affected" dekh ke <code>ROLLBACK</code> kar sakte ho. Bina transaction ke woh change turant pakka ho jaata hai.' },
      { front: 'MySQL mein DDL rollback hota hai?', back: '<b>Nahi.</b> <code>CREATE/ALTER/DROP TABLE</code> par <b>implicit COMMIT</b> ho jaata hai. (Postgres mein DDL transactional hai — dialect ka farak.)' },
      { front: 'Lamba transaction kyun bura?', back: 'Locks der tak pakde rehte hain → doosri queries wait → deadlock/timeout. Transaction mein <b>kabhi</b> API call ya user input ka intezaar mat karo.' },
    ],
  },

  /* ================= LEVEL 2: Isolation Levels ================= */
  {
    id: 'isolation',
    icon: '🧊',
    title: 'Isolation Levels — Parallel Duniya ke Jhagde',
    badge: 'Lock Lehraata',
    objectives: [
      '<b>Dirty read, non-repeatable read, phantom</b> — teen problems',
      '<b>4 isolation levels</b> aur unka trade-off',
      '<b>Lost update</b> — sabse common race condition',
      '<b>Deadlock</b> kya hai aur app ko kya karna chahiye',
    ],
    lesson: [
      `<h3>😱 Teen problems jab do transactions saath chalein</h3>
       <ul>
         <li>💩 <b>Dirty read</b> — tumne woh data padh liya jo doosre ne abhi
             tak COMMIT hi nahi kiya. Woh ROLLBACK kar de toh tumne bhoot padha.</li>
         <li>🔁 <b>Non-repeatable read</b> — ek hi transaction mein same row do
             baar padhi, dono baar alag value (beech mein kisi ne commit kar diya).</li>
         <li>👻 <b>Phantom read</b> — same query do baar chalayi, doosri baar
             <b>nayi rows</b> aa gayi.</li>
       </ul>
       <table>
         <tr><th>Isolation level</th><th>Dirty</th><th>Non-repeatable</th><th>Phantom</th></tr>
         <tr><td>READ UNCOMMITTED</td><td>😱 ho sakta</td><td>😱</td><td>😱</td></tr>
         <tr><td>READ COMMITTED</td><td>✅ nahi</td><td>😱</td><td>😱</td></tr>
         <tr><td><b>REPEATABLE READ</b> (MySQL default)</td><td>✅</td><td>✅</td><td>🙂 InnoDB mein aksar rok deta hai</td></tr>
         <tr><td>SERIALIZABLE</td><td>✅</td><td>✅</td><td>✅ (par sabse slow)</td></tr>
       </table>
       <p>Upar se neeche: <b>zyada surakhsha, kam concurrency</b>. MySQL ka
       default <code>REPEATABLE READ</code> zyadatar apps ke liye sahi jagah hai.</p>`,
      `<h3>💸 Lost update — sabse common race condition</h3>
       <p>Yeh isolation level se nahi bachta — iske liye alag soch chahiye.</p>
       <pre>-- Do requests ek saath, dono "progress + 1" karna chahte hain

Session A: SELECT progress FROM adcTestResult WHERE buildNum=502;  -- 45
Session B: SELECT progress FROM adcTestResult WHERE buildNum=502;  -- 45
Session A: UPDATE adcTestResult SET progress = 46 WHERE buildNum=502;
Session B: UPDATE adcTestResult SET progress = 46 WHERE buildNum=502;

-- Result: 46. Hona chahiye tha 47. Ek update KHO GAYA. 😱</pre>
       <p><b>Do ilaaj:</b></p>
       <pre>-- 1. Atomic update — padho-phir-likho karo hi mat (SABSE ACHHA)
UPDATE adcTestResult SET progress = progress + 1 WHERE buildNum = 502;

-- 2. Row lock — padhte waqt hi lock le lo
BEGIN;
SELECT progress FROM adcTestResult WHERE buildNum=502 FOR UPDATE;  -- lock!
UPDATE adcTestResult SET progress = 46 WHERE buildNum=502;
COMMIT;</pre>
       <p>💡 <b>Sunehra niyam: jo kaam database ek statement mein kar sakta hai,
       use app mein read-modify-write mat banao.</b></p>`,
      `<h3>🔐 Deadlock — do transactions ek doosre ka intezaar</h3>
       <pre>Session A: BEGIN; UPDATE builds  SET ... WHERE id=1;   -- lock on builds#1
Session B: BEGIN; UPDATE devices SET ... WHERE id=9;   -- lock on devices#9
Session A:        UPDATE devices SET ... WHERE id=9;   -- B ka wait
Session B:        UPDATE builds  SET ... WHERE id=1;   -- A ka wait  → DEADLOCK</pre>
       <p>Dono hamesha ke liye ruke rahenge, isliye MySQL <b>ek ko maar deta
       hai</b>: <code>ERROR 1213: Deadlock found when trying to get lock; try
       restarting transaction</code>.</p>
       <p><b>App ko kya karna chahiye:</b></p>
       <ul>
         <li>🔁 Deadlock error par <b>retry</b> karo (2-3 baar, thoda backoff ke saath)
             — yeh expected error hai, crash nahi</li>
         <li>📏 Rows ko hamesha <b>same order</b> mein lock karo (jaise hamesha
             pehle builds phir devices) — isse deadlock ka chance hi khatam</li>
         <li>⏱️ Transactions <b>chhote</b> rakho</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> ADC test bench par ek
       <code>adcTestResult</code> row thi jise har test step update karta tha
       (<code>progress</code> 0 → 100). Code <code>SELECT progress</code> karke
       app mein +1 karta tha, phir <code>UPDATE progress = &lt;value&gt;</code>.
       Jab do test steps ek saath khatam hue, dono ne 45 padha aur dono ne 46
       likha — progress 100 tak pahunchta hi nahi tha, 98 par atak jaata tha,
       aur operator ko lagta tha test hang ho gaya. Ek line ne theek kiya:
       <code>SET progress = progress + 1</code>. <b>Sabak: counter kabhi
       read-modify-write mat karo — database ko hi badhaane do.</b></div>`,
    ],
    stages: [
      {
        type: 'order',
        title: 'Lost update kaise hota hai',
        instructions: 'Race condition ka sahi order lagao.',
        steps: [
          { text: 'Session A: SELECT progress → 45 padha', explain: 'A ne value padhi aur app memory mein rakhi.' },
          { text: 'Session B: SELECT progress → 45 padha (wahi purani value!)', explain: 'B ne bhi 45 padha — A ne abhi likha hi nahi hai.' },
          { text: 'Session A: UPDATE progress = 46', explain: 'A ne apna calculation likh diya. DB mein ab 46 hai.' },
          { text: 'Session B: UPDATE progress = 46 (A ka kaam mit gaya)', explain: 'B apni purani 45 par based 46 likhta hai — A ka increment kho gaya.' },
          { text: 'Result 46 — hona chahiye tha 47', explain: 'Lost update. Ilaaj: SET progress = progress + 1, ya SELECT ... FOR UPDATE.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Isolation diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'isolation',
        questions: [
          { q: 'MySQL ka default isolation level kaunsa hai?', target: 'repeatable', explain: 'REPEATABLE READ — transaction ke andar consistent snapshot. Zyadatar apps ke liye sahi jagah.' },
          { q: 'Bina COMMIT hue data padh lena — kaunse level par ho sakta hai?', target: 'readuncommitted', explain: 'READ UNCOMMITTED — dirty read. Practically kabhi use mat karo.' },
          { q: 'Sabse safe par sabse slow level?', target: 'serializable', explain: 'SERIALIZABLE — jaise transactions ek-ek karke chal rahe hon. Concurrency ki keemat par.' },
          { q: 'Counter race ka sahi ilaaj kaunsa hai?', target: 'forupdate', explain: 'SELECT ... FOR UPDATE (row lock), ya usse behtar: atomic UPDATE c = c + 1.' },
        ],
      },
      {
        type: 'fill',
        title: 'Race condition theek karo',
        instructions: 'Counter update ko safe banao. Blanks bharo.',
        template: `-- ❌ GALAT — read-modify-write (lost update ka ghar)
SELECT progress FROM adcTestResult WHERE buildNum = 502;   -- app mein 45 mila
UPDATE adcTestResult SET progress = 46 WHERE buildNum = 502;

-- ✅ SAHI #1 — atomic update, DB ko hi badhaane do
UPDATE adcTestResult SET progress = {0} WHERE buildNum = 502;

-- ✅ SAHI #2 — row lock ke saath (jab beech mein calculation zaroori ho)
BEGIN;
SELECT progress FROM adcTestResult WHERE buildNum = 502 {1};
UPDATE adcTestResult SET progress = 46 WHERE buildNum = 502;
{2};

-- Deadlock aaye toh app ko kya karna chahiye?
-- ERROR 1213 → transaction {3} karo (2-3 baar, backoff ke saath)`,
        tokens: ['progress + 1', 'FOR UPDATE', 'COMMIT', 'retry', 'progress = 46', 'LOCK TABLE', 'ROLLBACK', 'ignore'],
        blanks: [
          { answer: 'progress + 1', explain: '<b>Atomic update</b> — DB khud purani value padhta hai aur badhata hai, sab ek statement mein. Koi race possible hi nahi. Yehi asli fix tha.' },
          { answer: 'FOR UPDATE', explain: '<code>SELECT … FOR UPDATE</code> row par <b>exclusive lock</b> le leta hai — doosra transaction us row par tab tak wait karega.' },
          { answer: 'COMMIT', explain: '<code>COMMIT</code> par lock chhoot-ta hai. Isliye lock lene ke baad transaction <b>chhota</b> rakho.' },
          { answer: 'retry', explain: 'Deadlock (<b>ERROR 1213</b>) <b>expected</b> error hai, crash nahi. App ko 2-3 baar backoff ke saath retry karna chahiye.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Progress counter theek karo',
        instructions: 'Read-modify-write ka nuksaan dekho, phir atomic update se theek karo.',
        goal: 'ADC test ka progress 98 par atak jaata hai. <b>(1)</b> <code>SELECT buildNum, progress FROM adcTestResult WHERE buildNum = 502;</code> — abhi kya hai? <b>(2)</b> Galat tarika: usi value ko manually likho — <code>UPDATE adcTestResult SET progress = 46 WHERE buildNum = 502;</code> (yehi race ka ghar hai). <b>(3)</b> Sahi tarika: <b>atomic</b> update — <code>UPDATE adcTestResult SET progress = progress + 1 WHERE buildNum = 502;</code> — do baar chalao. <b>(4)</b> <code>SELECT</code> se verify karo ki dono increment gine gaye (48 hona chahiye). <b>(5)</b> Aur ek safe pattern: <code>BEGIN</code> → update → verify → <code>COMMIT</code>.',
        tasks: [
          { text: 'Current progress dekho', check: s => s.history.some(h => /^select.*adctestresult/i.test(h)) },
          { text: 'Galat tarika: fixed value likho', check: s => s.history.some(h => /update\s+adctestresult\s+set\s+progress\s*=\s*46/i.test(h)) },
          { text: 'Atomic update do baar (progress + 1)', check: s => s.history.filter(h => /set\s+progress\s*=\s*progress\s*\+\s*1/i.test(h)).length >= 2 },
          { text: 'Verify: progress 48 hai', check: s => Number((s.db.tables.adcTestResult.rows.find(r => Number(r.buildNum) === 502) || {}).progress) === 48 },
          { text: 'Transaction mein ek aur safe update', check: s => !!s.committed },
        ],
        db: SG.factoryDB(),
        success: s => Number((s.db.tables.adcTestResult.rows.find(r => Number(r.buildNum) === 502) || {}).progress) >= 48
          && s.history.filter(h => /set\s+progress\s*=\s*progress\s*\+\s*1/i.test(h)).length >= 2
          && !!s.committed,
        successText: '🎉 <b>Farak dikha?</b> Fixed value (<code>= 46</code>) likhna matlab tumne app ki purani padhi hui value par bharosa kiya — do requests ek saath aayi toh ek ka kaam mit jaata. <code>progress = progress + 1</code> mein <b>database khud</b> current value padhta aur badhata hai, sab ek atomic statement mein — race possible hi nahi. Asli project mein yeh ek line thi jisne "test 98% par hang" wala bug khatam kiya. <b>Sunehra niyam: jo DB ek statement mein kar sakta hai, use app mein read-modify-write mat banao.</b>',
        hints: [
          'SELECT buildNum, progress FROM adcTestResult WHERE buildNum = 502;',
          'UPDATE adcTestResult SET progress = 46 WHERE buildNum = 502;   ← galat tarika',
          'UPDATE adcTestResult SET progress = progress + 1 WHERE buildNum = 502;   ← do baar chalao',
          'SELECT buildNum, progress FROM adcTestResult WHERE buildNum = 502;',
          'BEGIN;  UPDATE adcTestResult SET progress = progress + 1 WHERE buildNum = 502;  COMMIT;',
        ],
      },
      {
        type: 'quiz',
        title: 'Isolation Quick-fire',
        questions: [
          {
            q: 'Lost update se bachne ka sabse achha tarika?',
            choices: [
              'Atomic update — SET counter = counter + 1, taaki DB khud padhe aur badhaye',
              'Isolation level SERIALIZABLE kar do',
              'App mein sleep(100) laga do',
              'Do baar UPDATE chala do',
            ],
            answer: 0,
            explain: 'Sabse simple aur sabse tez. <code>SELECT … FOR UPDATE</code> tab jab beech mein sach mein calculation zaroori ho.',
          },
          {
            q: 'Dirty read kya hai?',
            choices: [
              'Doosre transaction ka bina-COMMIT data padh lena — woh ROLLBACK kar de toh tumne bhoot padha',
              'Corrupt data padhna',
              'Bina index ke padhna',
              'Purana cache padhna',
            ],
            answer: 0,
            explain: 'Sirf <code>READ UNCOMMITTED</code> par hota hai. Isiliye woh level practically kabhi use nahi hota.',
          },
          {
            q: 'App ko <code>ERROR 1213 Deadlock</code> mile toh?',
            choices: [
              'Transaction retry karo (2-3 baar, thoda backoff) — yeh expected error hai, crash nahi',
              'App crash kar do',
              'Database restart karo',
              'Isolation level badal do',
            ],
            answer: 0,
            explain: 'Deadlock concurrency ka normal hissa hai. Prevention: rows ko hamesha <b>same order</b> mein lock karo aur transactions chhote rakho.',
          },
          {
            q: 'MySQL ka default isolation level?',
            choices: [
              'REPEATABLE READ',
              'READ UNCOMMITTED',
              'READ COMMITTED',
              'SERIALIZABLE',
            ],
            answer: 0,
            explain: 'MySQL/InnoDB = REPEATABLE READ. (PostgreSQL aur Oracle ka default READ COMMITTED hai — interview mein yeh farak poocha jaata hai.)',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Concurrency',
      instructions: 'Concurrency round — yahan senior/junior ka farak dikhta hai. 🎤',
      questions: [
        {
          q: '"Do users ek saath ek counter badha rahe hain. Kya problem ho sakti hai aur kaise theek karoge?"',
          choices: [
            'Lost update — dono purani value padh ke same nayi value likh denge, ek increment kho jayega. Fix: atomic <code>SET c = c + 1</code>, ya <code>SELECT … FOR UPDATE</code> se row lock',
            'Koi problem nahi, DB sambhal lega',
            'Deadlock hoga',
            'Dirty read hoga',
          ],
          answer: 0,
          explain: 'Problem ka <b>naam</b> (lost update) aur <b>do fixes</b> bolna — yeh exact jawab hai. Asli project mein yeh bug "test 98% par hang" ban ke aaya tha.',
        },
        {
          q: 'Interviewer: "Deadlock ko kaise handle karte ho?"',
          choices: [
            'App mein retry (backoff ke saath), aur prevention: rows ko hamesha same order mein lock karo, transactions chhote rakho, aur zaroorat se zyada lock mat lo',
            'Isolation level SERIALIZABLE kar deta hoon',
            'Database restart kar deta hoon',
            'Deadlock hota hi nahi agar code sahi ho',
          ],
          answer: 0,
          explain: 'Do hisse: <b>handle</b> (retry — kyunki deadlock expected hai) aur <b>prevent</b> (consistent lock order). Dono bolna zaroori hai.',
        },
        {
          q: '🎛️ Interviewer: "Atomic update karke dikhao."',
          terminal: {
            title: 'Interview hands-on — atomic update',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>adcTestResult</code> mein <code>buildNum</code> 503 ka <code>progress</code> dekho. <b>(2)</b> Use atomic tarike se 10 badhao — <code>SET progress = progress + 10</code>. <b>(3)</b> Ek transaction mein do rows ka progress badhao (502 aur 503), phir <code>COMMIT</code>. <b>(4)</b> Verify karo.',
            tasks: [
              { text: 'Current progress dekho', check: s => s.history.some(h => /^select.*adctestresult/i.test(h)) },
              { text: 'Atomic +10 (progress = progress + 10)', check: s => s.history.some(h => /set\s+progress\s*=\s*progress\s*\+\s*10/i.test(h)) },
              { text: 'Transaction mein do updates + COMMIT', check: s => !!s.committed },
              { text: 'Verify karo (SELECT)', check: s => s.history.filter(h => /^select.*adctestresult/i.test(h)).length >= 2 },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /set\s+progress\s*=\s*progress\s*\+\s*10/i.test(h))
              && !!s.committed
              && s.history.filter(h => /^select.*adctestresult/i.test(h)).length >= 2
              && Number((s.db.tables.adcTestResult.rows.find(r => Number(r.buildNum) === 503) || {}).progress) > 20,
            successText: '✅ Atomic increment + transaction. Interviewer ne yeh dekha ki tum <b>value ko app mein le jaake wapas nahi bhejte</b> — DB ko hi kaam karne dete ho. Yeh choti si aadat concurrency bugs ki poori class khatam kar deti hai.',
            hints: [
              'SELECT buildNum, progress FROM adcTestResult WHERE buildNum = 503;',
              'UPDATE adcTestResult SET progress = progress + 10 WHERE buildNum = 503;',
              'BEGIN;  UPDATE adcTestResult SET progress = progress + 5 WHERE buildNum = 502;  UPDATE adcTestResult SET progress = progress + 5 WHERE buildNum = 503;  COMMIT;',
              'SELECT buildNum, progress FROM adcTestResult;',
            ],
          },
        },
      ],
    },
    success: [
      'Main dirty / non-repeatable / phantom read ka farak bata sakta hoon',
      'Main chaar isolation levels aur unka trade-off jaanta hoon',
      'Main lost update pehchaan ke atomic update se theek kar sakta hoon',
      'Main deadlock ko retry + consistent lock order se handle karta hoon',
    ],
    homework: `<p>Race condition khud banao — do terminal windows kholo:</p>
      <pre>-- Terminal 1                      | -- Terminal 2
USE factory;                         | USE factory;
SET autocommit = 0;                  | SET autocommit = 0;
                                     |
BEGIN;                               |
SELECT progress FROM adcTestResult   |
  WHERE buildNum = 502;   -- 45      | BEGIN;
                                     | SELECT progress FROM adcTestResult
                                     |   WHERE buildNum = 502;   -- 45 bhi!
UPDATE adcTestResult                 |
  SET progress = 46 WHERE buildNum=502; |
COMMIT;                              | UPDATE adcTestResult
                                     |   SET progress = 46 WHERE buildNum=502;
                                     | COMMIT;
-- Result: 46, hona chahiye tha 47 — LOST UPDATE

-- Ab atomic tarike se dono terminals par:
UPDATE adcTestResult SET progress = progress + 1 WHERE buildNum = 502;
-- ab dono increment gine jayenge!

-- Lock dekho:
BEGIN; SELECT * FROM adcTestResult WHERE buildNum=502 FOR UPDATE;
-- doosre terminal par wahi FOR UPDATE chalao — woh WAIT karega!</pre>
      <p>✅ Self-check: Pehle case mein ek increment kho gaya? Atomic wale mein dono gine gaye? <code>FOR UPDATE</code> ne doosre terminal ko rok diya?</p>`,
    cards: [
      { front: 'Teen concurrency problems?', back: '<b>Dirty read</b> (bina-COMMIT data padha), <b>non-repeatable read</b> (same row do baar, alag value), <b>phantom read</b> (same query, nayi rows).' },
      { front: '4 isolation levels?', back: 'READ UNCOMMITTED → READ COMMITTED → <b>REPEATABLE READ (MySQL default)</b> → SERIALIZABLE. Upar se neeche: zyada surakhsha, kam concurrency.' },
      { front: 'Lost update kya hai + fix?', back: 'Dono ne purani value padhi, dono ne same nayi likhi — ek increment kho gaya. Fix: <b><code>SET c = c + 1</code></b> (atomic), ya <code>SELECT … FOR UPDATE</code> (row lock).' },
      { front: 'Deadlock — kya karein?', back: '<b>Handle:</b> ERROR 1213 par app retry kare (backoff ke saath) — yeh expected hai. <b>Prevent:</b> rows hamesha same order mein lock karo, transactions chhote rakho.' },
      { front: 'Counter ka sunehra niyam?', back: '<b>Jo DB ek statement mein kar sakta hai, use app mein read-modify-write mat banao.</b> Asli project mein <code>progress = progress + 1</code> ne "98% par hang" wala bug khatam kiya.' },
    ],
  },

  /* ================= LEVEL 3: Views & CTEs ================= */
  {
    id: 'views',
    icon: '🪟',
    title: 'Views & CTEs — Query ko Naam Do',
    badge: 'View Vidwan',
    objectives: [
      '<b>CREATE VIEW</b> — complex query ko table jaisa naam',
      '<b>View = security layer</b> — secrets chhupane ka structural tarika',
      '<b>CTE (WITH)</b> — ek query ke andar readable steps',
      'View vs CTE vs materialized table — kab kya',
    ],
    lesson: [
      `<h3>🪟 View — stored query jo table jaisi dikhti hai</h3>
       <pre>CREATE VIEW failed_tests AS
  SELECT id, operatorId, client, board
  FROM   bmsTester
  WHERE  status = 'fail';

-- Ab isse table ki tarah use karo:
SELECT * FROM failed_tests;
SELECT client, COUNT(*) FROM failed_tests GROUP BY client;</pre>
       <p>View mein <b>data nahi</b> hota — woh sirf ek <b>saved query</b> hai.
       Har baar jab tum usse SELECT karte ho, andar wali query chalti hai. Isliye
       data hamesha fresh hota hai.</p>
       <p><b>Faayde:</b></p>
       <ul>
         <li>🧩 6-table JOIN ek baar likho, poori team <code>SELECT * FROM
             device_summary</code> likhe</li>
         <li>🔒 <b>Security</b> — sensitive columns chhod ke view banao aur users
             ko sirf view par permission do</li>
         <li>🔄 Underlying schema badla? View update karo, saari queries chalti rahengi</li>
       </ul>`,
      `<h3>🔒 View as security — asli project ka sabse achha use</h3>
       <p>Yaad hai <code>bx50Data</code> mein 8 password/secret columns the, aur
       ek <code>SELECT *</code> ne unhe log file mein daal diya tha? View iska
       <b>structural</b> ilaaj hai:</p>
       <pre>CREATE VIEW device_public AS
  SELECT id, bx50Name, ip, buildNum, status, customerLocation
  FROM   bx50Data;                  -- passwords list mein hain hi nahi

-- Reporting user ko sirf view ka access do:
GRANT SELECT ON factory.device_public TO 'reporting'@'%';
-- (bx50Data par koi grant nahi!)</pre>
       <p>Ab reporting user <code>SELECT * FROM device_public</code> chalaye
       toh bhi secrets nikal hi nahi sakte — kyunki woh column view mein maujood
       hi nahi hai. <b>Yeh "dhyaan rakhna" se behtar hai — yeh na-mumkin bana
       deta hai.</b></p>`,
      `<h3>📝 CTE — <code>WITH</code> se query ko kahani banao</h3>
       <p>CTE (Common Table Expression) ek <b>query-local</b> naam hai. View DB
       mein save hota hai; CTE sirf usi query ke liye zinda rehta hai:</p>
       <pre>WITH operator_totals AS (
  SELECT   userId, COUNT(*) AS sessions, SUM(duration) AS total_ms
  FROM     bx50Sessions
  GROUP BY userId
)
SELECT   o.name, t.sessions, t.total_ms
FROM     operator_totals t
JOIN     operators o ON t.userId = o.opId
WHERE    t.sessions >= 2
ORDER BY t.total_ms DESC;</pre>
       <p>Nested subqueries ke bajaye <b>upar se neeche padhne wale steps</b>:
       "pehle per-operator totals nikaalo, phir naam jodo, phir filter karo."</p>
       <p><b>Kab kya:</b></p>
       <table>
         <tr><th></th><th>Kahan rehta hai</th><th>Kab</th></tr>
         <tr><td><b>View</b></td><td>DB mein saved</td><td>bahut jagah use hone wali query, ya security layer</td></tr>
         <tr><td><b>CTE</b></td><td>sirf ek query mein</td><td>ek lambi query ko readable banana</td></tr>
         <tr><td><b>Summary table</b></td><td>asli table, data ke saath</td><td>jab har baar compute karna bahut mehnga ho (refresh karna padega)</td></tr>
       </table>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka "device
       summary" logic 4 alag jagah copy-paste tha — API endpoint, ek cron
       report, admin panel, aur ek Grafana dashboard. Jab "inactive builds ko
       chhod do" wala rule aaya, teen jagah update hua aur <b>ek chhoot gaya</b>.
       Do mahine tak Grafana ka number baaki teenon se alag rehta raha, aur
       meetings mein log ladte rahe ki "sahi number kaunsa hai". Fix: ek
       <code>device_summary</code> view banaya aur chaaron consumers use usi par
       point kar diya. <b>Sabak: ek hi business logic chaar jagah likha hai toh
       woh chaar alag jawab dega — use ek view (ya ek query) mein rakho.</b></div>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'Views diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'views',
        questions: [
          { q: 'DB mein save hone wali reusable query kaunsi hai?', target: 'view', explain: 'VIEW — ek baar banao, poori team table ki tarah use kare. Data store nahi hota, query har baar chalti hai.' },
          { q: 'Ek query ke andar readable steps banane wala tool?', target: 'cte', explain: 'CTE (WITH) — query-local naam. Nested subqueries ko upar-se-neeche kahani banata hai.' },
          { q: 'Secrets chhupane ka structural tarika kaunsa hai?', target: 'security', explain: 'View mein sensitive columns rakho hi mat, aur users ko sirf view ka GRANT do. Ab leak na-mumkin hai.' },
        ],
      },
      {
        type: 'fill',
        title: 'View aur CTE likho',
        instructions: 'Ek security view aur ek readable CTE. Blanks bharo.',
        template: `-- Security view — secrets column list mein hain hi nahi
CREATE {0} device_public {1}
  SELECT id, bx50Name, ip, buildNum, status, customerLocation
  FROM   bx50Data;

-- Reporting user ko sirf view ka access:
GRANT SELECT ON factory.device_public TO 'reporting'@'%';

-- CTE — lambi query ko readable steps mein todo
{2} operator_totals {1} (
  SELECT   userId, COUNT(*) AS sessions, SUM(duration) AS total_ms
  FROM     bx50Sessions
  GROUP BY userId
)
SELECT   o.name, t.sessions, t.total_ms
FROM     operator_totals t
JOIN     operators o ON t.userId = o.opId
{3}    t.sessions >= 2;`,
        tokens: ['VIEW', 'AS', 'WITH', 'WHERE', 'TABLE', 'IS', 'HAVING', 'INDEX'],
        blanks: [
          { answer: 'VIEW', explain: '<code>CREATE VIEW name AS SELECT …</code> — DB mein saved query. Data store nahi hota, isliye hamesha fresh.' },
          { answer: 'AS', explain: 'Dono jagah <code>AS</code> — <code>CREATE VIEW x AS SELECT…</code> aur <code>WITH cte AS (SELECT…)</code>.' },
          { answer: 'WITH', explain: '<code>WITH name AS (…)</code> = CTE. Query-local naam — agli query mein maujood nahi rahega (view ke ulta).' },
          { answer: 'WHERE', explain: 'CTE ke result par normal <code>WHERE</code> — kyunki CTE se aage woh ek table jaisa hi behave karta hai. (GROUP BY CTE ke andar ho chuka hai, isliye yahan HAVING ki zaroorat nahi.)' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Ek sach, ek jagah',
        instructions: 'Chaar jagah copy-paste logic ko ek view mein badlo — aur secrets chhupao.',
        goal: 'Grafana ka number baaki dashboards se alag aa raha tha. <b>(1)</b> Pehle woh logic ek query mein likho: saare devices unke build type ke saath, sirf <b>active</b> builds (JOIN + <code>WHERE b.active = 1</code>). <b>(2)</b> Ab use <code>CREATE VIEW device_summary AS …</code> se view bana do. <b>(3)</b> View se query karo — <code>SELECT * FROM device_summary;</code>. <b>(4)</b> Security view banao: <code>device_public</code> jisme sirf <code>id, bx50Name, ip, status</code> hon (koi secret column nahi). <b>(5)</b> Us view se bhi SELECT karke dekho.',
        tasks: [
          { text: 'Active builds wali JOIN query likho', check: s => s.history.some(h => /^select/i.test(h) && /join/i.test(h) && /active\s*=\s*1/i.test(h)) },
          { text: 'device_summary view banao', check: s => !!Object.keys(s.db.views || {}).find(k => k.toLowerCase() === 'device_summary') },
          { text: 'View se SELECT karo', check: s => s.history.some(h => /from\s+device_summary/i.test(h)) },
          { text: 'device_public security view banao', check: s => !!Object.keys(s.db.views || {}).find(k => k.toLowerCase() === 'device_public') },
          { text: 'Security view se SELECT karo', check: s => s.history.some(h => /from\s+device_public/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => !!Object.keys(s.db.views || {}).find(k => k.toLowerCase() === 'device_summary')
          && !!Object.keys(s.db.views || {}).find(k => k.toLowerCase() === 'device_public')
          && s.history.some(h => /from\s+device_summary/i.test(h))
          && s.history.some(h => /from\s+device_public/i.test(h)),
        successText: '🎉 <b>Do views, do alag problems hal.</b> <code>device_summary</code> ne woh "chaar jagah copy-paste" wala logic ek jagah kar diya — ab rule badla toh <b>ek view update</b>, aur chaaron consumers apne aap sahi. <code>device_public</code> ne security ko structural bana diya: reporting user ko sirf is view ka GRANT do, aur phir <code>SELECT *</code> bhi chala de toh secrets nikal hi nahi sakte — <b>woh column view mein hai hi nahi</b>. Yeh "dhyaan rakhna" se kahin behtar hai.',
        hints: [
          'SELECT d.id, d.bx50Name, d.status, b.type FROM bx50Data d JOIN bx50Builds b ON d.buildNum = b.buildNum WHERE b.active = 1;',
          'CREATE VIEW device_summary AS SELECT d.id, d.bx50Name, d.status, b.type FROM bx50Data d JOIN bx50Builds b ON d.buildNum = b.buildNum WHERE b.active = 1;',
          'SELECT * FROM device_summary;',
          'CREATE VIEW device_public AS SELECT id, bx50Name, ip, status FROM bx50Data;',
          'SELECT * FROM device_public;',
        ],
      },
      {
        type: 'quiz',
        title: 'Views Quick-fire',
        questions: [
          {
            q: 'View mein data store hota hai?',
            choices: [
              'Nahi — view ek saved query hai, har SELECT par woh query chalti hai (isliye data hamesha fresh)',
              'Haan, ek copy ban jaati hai',
              'Haan, par sirf pehli baar',
              'Depend karta hai table ke size par',
            ],
            answer: 0,
            explain: 'Isiliye view "stale" nahi hota. Data ki copy chahiye (speed ke liye) toh woh <b>materialized view</b> / summary table hai — use refresh karna padta hai.',
          },
          {
            q: 'View security ke liye kaise use hota hai?',
            choices: [
              'Sensitive columns view mein rakho hi mat, aur user ko sirf view par GRANT do — ab woh column access kar hi nahi sakta',
              'View password se protect hota hai',
              'View data encrypt kar deta hai',
              'View queries ko log karta hai',
            ],
            answer: 0,
            explain: 'Structural surakhsha: leak "mushkil" nahi, <b>na-mumkin</b> ho jaata hai. Asli project ke 8 secret columns ke liye perfect fix.',
          },
          {
            q: 'CTE (WITH) aur view mein farak?',
            choices: [
              'CTE sirf usi query ke liye zinda hai; view DB mein save rehta hai aur sab use kar sakte hain',
              'CTE tez hota hai',
              'View sirf SELECT ke liye hai, CTE UPDATE ke liye',
              'Koi farak nahi',
            ],
            answer: 0,
            explain: 'Scope ka farak: <b>query-local</b> vs <b>database-wide</b>. Ek lambi query readable banani hai → CTE. Poori team ko chahiye → view.',
          },
          {
            q: 'Ek hi business logic 4 jagah copy-paste hai. Sabse bada risk?',
            choices: [
              'Rule badla toh koi ek jagah update chhoot jayegi — aur do dashboards alag number dikhane lagenge',
              'Disk zyada lagegi',
              'Query slow hogi',
              'Koi risk nahi',
            ],
            answer: 0,
            explain: 'Asli incident: Grafana ka number 2 mahine tak baaki teen se alag raha. View = ek sach, ek jagah.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Views',
      instructions: 'Design/abstraction round. 🎤',
      questions: [
        {
          q: '"View kab banate ho?"',
          choices: [
            'Jab ek hi complex query bahut jagah chahiye (ek sach ek jagah), ya jab sensitive columns chhupa ke access dena ho — view + GRANT se',
            'Jab query slow ho',
            'Jab table badi ho',
            'Jab JOIN 3 se zyada ho',
          ],
          answer: 0,
          explain: 'Do wajah: <b>DRY (reuse)</b> aur <b>security layer</b>. Doosri wajah aksar log bhool jaate hain — aur wahi zyada impress karti hai.',
        },
        {
          q: 'Interviewer: "View se performance improve hoti hai?"',
          choices: [
            'Nahi — normal view sirf saved query hai, har baar chalti hai. Performance chahiye toh summary/materialized table banani padegi, jise refresh karna hoga',
            'Haan, view result cache karta hai',
            'Haan, view apne aap index bana leta hai',
            'Haan, view hamesha tez hota hai',
          ],
          answer: 0,
          explain: 'Yeh common galatfehmi hai. View <b>abstraction</b> deta hai, speed nahi. MySQL mein materialized view nahi hota — summary table + refresh job likhna padta hai.',
        },
        {
          q: '🎛️ Interviewer: "Ek reporting view bana ke dikhao."',
          terminal: {
            title: 'Interview hands-on — views',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>CREATE VIEW failed_tests AS</code> — <code>bmsTester</code> se woh rows jinka <code>status = \'fail\'</code> (<code>id</code>, <code>operatorId</code>, <code>client</code>). <b>(2)</b> View se query karo. <b>(3)</b> View par aggregate chalao — har client ke kitne failures (<code>GROUP BY client</code>). <b>(4)</b> Dikhao ki view sirf query hai: <code>bmsTester</code> mein ek naya fail row insert karo aur view dobara dekho — naya row apne aap dikhega.',
            tasks: [
              { text: 'failed_tests view banao', check: s => !!Object.keys(s.db.views || {}).find(k => k.toLowerCase() === 'failed_tests') },
              { text: 'View se SELECT', check: s => s.history.some(h => /from\s+failed_tests/i.test(h)) },
              { text: 'View par GROUP BY aggregate', check: s => s.history.some(h => /from\s+failed_tests/i.test(h) && /group\s+by/i.test(h)) },
              { text: 'Naya fail row insert karke view dobara dekho', check: s => s.db.tables.bmsTester.rows.length > 10 && s.history.filter(h => /from\s+failed_tests/i.test(h)).length >= 3 },
            ],
            db: SG.factoryDB(),
            success: s => !!Object.keys(s.db.views || {}).find(k => k.toLowerCase() === 'failed_tests')
              && s.history.some(h => /from\s+failed_tests/i.test(h) && /group\s+by/i.test(h))
              && s.db.tables.bmsTester.rows.length > 10
              && s.history.filter(h => /from\s+failed_tests/i.test(h)).length >= 3,
            successText: '✅ Aakhri step ne view ka asli swabhav dikha diya — naya row insert karte hi view mein aa gaya, kyunki <b>view data nahi rakhta, query rakhta hai</b>. Aur view par <code>GROUP BY</code> chalna bata deta hai ki woh sach mein table ki tarah compose hota hai.',
            hints: [
              "CREATE VIEW failed_tests AS SELECT id, operatorId, client FROM bmsTester WHERE status = 'fail';",
              'SELECT * FROM failed_tests;',
              'SELECT client, COUNT(*) AS failures FROM failed_tests GROUP BY client;',
              "INSERT INTO bmsTester (id, operatorId, client, status) VALUES ('new-fail-1', 'OP-103', 'Hitachi', 'fail');   phir  SELECT * FROM failed_tests;",
            ],
          },
        },
      ],
    },
    success: [
      'Main CREATE VIEW se reusable query bana sakta hoon',
      'Main view ko security layer ki tarah use kar sakta hoon',
      'Main CTE (WITH) se lambi query ko readable steps mein tod sakta hoon',
      'Main view vs CTE vs summary table ka faisla justify kar sakta hoon',
    ],
    homework: `<p>View ki teen shaktiyan khud dekho:</p>
      <pre>USE factory;

-- 1. Reuse
CREATE VIEW active_builds AS
  SELECT buildNum, type, duration FROM bx50Builds WHERE active = 1;
SELECT * FROM active_builds;
SELECT type, COUNT(*) FROM active_builds GROUP BY type;

-- 2. Security
CREATE VIEW operator_public AS SELECT opId, name FROM operators;  -- shift chhupa diya
SELECT * FROM operator_public;

-- 3. View live hai (data copy nahi)
INSERT INTO bx50Builds (buildNum, type, duration, active) VALUES (1050,'Gen4',1000,1);
SELECT * FROM active_builds;    -- 1050 apne aap aa gaya!

-- CTE
WITH long_builds AS (
  SELECT buildNum, duration FROM bx50Builds WHERE duration > 5000000
)
SELECT COUNT(*) FROM long_builds;

-- View list dekho
SHOW FULL TABLES WHERE Table_type = 'VIEW';
DROP VIEW active_builds;</pre>
      <p>✅ Self-check: Naya build view mein apne aap dikha? <code>SHOW FULL TABLES</code> ne view ko VIEW mark kiya?</p>`,
    cards: [
      { front: 'View kya hai?', back: 'Ek <b>saved query</b> jo table jaisi dikhti hai. Data store <b>nahi</b> hota — har SELECT par andar wali query chalti hai, isliye hamesha fresh.' },
      { front: 'View se security kaise?', back: 'Sensitive columns view mein <b>rakho hi mat</b>, aur user ko sirf view ka <code>GRANT</code> do. Ab <code>SELECT *</code> bhi secrets nahi de sakta — column maujood hi nahi.' },
      { front: 'CTE vs View?', back: '<b>CTE (<code>WITH</code>)</b> = query-local naam, sirf usi query mein zinda. <b>View</b> = DB mein saved, poori team use kar sakti hai.' },
      { front: 'View se performance improve hoti hai?', back: '<b>Nahi.</b> Woh sirf abstraction hai. Speed chahiye toh <b>summary table</b> (materialized) banao aur use refresh karne ki zimmedari lo.' },
      { front: 'Ek logic 4 jagah copy-paste ka risk?', back: 'Rule badla toh ek jagah update <b>chhoot jayegi</b> aur dashboards alag numbers denge. Asli case: Grafana 2 mahine tak alag number dikhata raha. Fix = ek view.' },
    ],
  },

  /* ================= LEVEL 4: Window Functions ================= */
  {
    id: 'windowfn',
    icon: '🪜',
    title: 'Window Functions — Group Karo par Rows Mat Kho',
    badge: 'Window Wali',
    objectives: [
      '<b>OVER (PARTITION BY ...)</b> — group ka number, har row par',
      '<b>ROW_NUMBER()</b> — "har group ka latest/top-N" ka asli jawab',
      '<b>RANK, LAG, LEAD</b> — leaderboard aur trend',
      'Window function <b>derived columns</b> ki zaroorat khatam karta hai',
    ],
    lesson: [
      `<h3>🪜 GROUP BY rows kha jaata hai, window nahi</h3>
       <pre>-- GROUP BY: 8 rows → 3 rows (detail gayab)
SELECT client, COUNT(*) FROM bmsTester GROUP BY client;

-- Window: 8 rows → 8 rows (+ har row par uske group ka count)
SELECT id, client, status,
       COUNT(*) OVER (PARTITION BY client) AS client_total
FROM   bmsTester;

+---------------+---------+--------+--------------+
| id            | client  | status | client_total |
+---------------+---------+--------+--------------+
| ...0001       | Komatsu | pass   |            3 |
| ...0002       | Komatsu | fail   |            3 |
| ...0007       | Komatsu | fail   |            3 |
| ...0003       | Hitachi | pass   |            3 |
...</pre>
       <p><code>PARTITION BY</code> = "group by, par rows mat girao". Har row ko
       apne group ka number <b>mil jaata hai</b> — detail bhi bachta hai aur
       summary bhi.</p>
       <p>💡 Isse "yeh test apne client ke average se accha hai ya bura" jaisa
       sawal ek hi query mein ho jaata hai — na subquery, na self-join.</p>`,
      `<h3>🥇 ROW_NUMBER — "har group ka latest" ka asli jawab</h3>
       <p>Yeh sawal GROUP BY se <b>hota hi nahi</b>: "har client ka sabse naya
       test result do (poori row)".</p>
       <pre>SELECT * FROM (
  SELECT id, client, status, updatedAt,
         ROW_NUMBER() OVER (
           PARTITION BY client        -- har client ka apna counter
           ORDER BY updatedAt DESC    -- naya pehle
         ) AS rn
  FROM bmsTester
) t
WHERE rn = 1;        -- har client ki sirf pehli (= latest) row</pre>
       <p>Teen bhai-behen:</p>
       <ul>
         <li><code>ROW_NUMBER()</code> — 1,2,3,4 (tie par bhi alag number)</li>
         <li><code>RANK()</code> — 1,2,2,4 (tie ko same rank, phir gap)</li>
         <li><code>DENSE_RANK()</code> — 1,2,2,3 (tie ko same rank, koi gap nahi)</li>
       </ul>
       <p>Aur trend ke liye:</p>
       <pre>-- Pichhli session se kitna farak?
SELECT userId, startDate, duration,
       LAG(duration) OVER (PARTITION BY userId ORDER BY startDate) AS pichhli,
       duration - LAG(duration) OVER (PARTITION BY userId ORDER BY startDate) AS farak
FROM   bx50Sessions;</pre>`,
      `<h3>🧹 Window function ek poore column ki zaroorat khatam karta hai</h3>
       <p>Asli project ke <code>adcTestResult</code> table mein ek column tha:
       <code>latestDevice BOOLEAN</code>. Uska kaam: batana ki kaunsa row us
       device ka sabse naya result hai. Har naye insert par app ko purane row ka
       flag <code>false</code> aur naye ka <code>true</code> karna padta tha.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Woh do-step update
       (purana false, naya true) <b>transaction ke bina</b> chal raha tha. Ek
       baar beech mein request fail hui — purana <code>true</code> hi reh gaya
       aur naya bhi <code>true</code> ho gaya. Dashboard ne ek hi device ke
       <b>do "latest" results</b> dikhaye, aur QA report mein pass aur fail dono
       ek saath aa gaye. Kisi ko samajh nahi aaya ki device pass hua ya fail.
       Fix ke do raste the: (a) dono updates ek transaction mein daalo, ya
       (b) <b>woh column hi hata do</b> aur query mein
       <code>ROW_NUMBER() OVER (PARTITION BY device ORDER BY createdAt DESC) = 1</code>
       likho. Doosra raasta chuna gaya — <b>jo cheez derive ho sakti hai use
       store mat karo</b>, warna use sync rakhna tumhara sar-dard ban jaata hai
       aur woh kabhi na kabhi jhoot bolega.</div>
       <p>💡 <b>Rule:</b> "latest", "rank", "running total", "previous value" —
       yeh sab <b>derive</b> hote hain. Inhe column mat banao, window function
       likho.</p>`,
    ],
    stages: [
      {
        type: 'match',
        title: 'Window function kaunsa?',
        instructions: 'Har zaroorat ko sahi function se jodo.',
        pairs: [
          { left: '🥇 Har group ka latest row (poori row chahiye)', right: 'ROW_NUMBER() OVER (PARTITION BY g ORDER BY t DESC) = 1', explain: 'Classic top-N-per-group. GROUP BY se yeh hota hi nahi kyunki wahan detail rows gir jaati hain.' },
          { left: '🏆 Leaderboard jisme ties ko same rank mile', right: 'RANK() OVER (ORDER BY score DESC)', explain: 'RANK: 1,2,2,4 — tie ke baad gap. DENSE_RANK: 1,2,2,3 — koi gap nahi.' },
          { left: '📈 Pichhli row se compare (trend)', right: 'LAG(col) OVER (PARTITION BY g ORDER BY t)', explain: 'LAG = pichhli row ki value. LEAD = agli row ki. Trend/delta ke liye.' },
          { left: '📊 Har row par uske group ka total', right: 'COUNT(*) OVER (PARTITION BY client)', explain: 'Detail rows bachte hain aur summary bhi mil jaata hai — GROUP BY dono nahi de sakta.' },
          { left: '💰 Running total (chalta hua jod)', right: 'SUM(x) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)', explain: 'Cumulative sum — har row tak ka total. Financial reports ka standard.' },
          { left: '📉 Group ke average se compare', right: 'AVG(x) OVER (PARTITION BY g)', explain: 'Har row ko apne group ka average milta hai — phir seedha compare kar sakte ho.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Window diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'windowfn',
        questions: [
          { q: 'Rows ko bina giraye group ka number dene wala keyword?', target: 'over', explain: 'OVER (PARTITION BY …) — GROUP BY jaisa grouping, par har row bachti hai.' },
          { q: '"Har group ka latest row" ka asli jawab kaunsa hai?', target: 'rownumber', explain: 'ROW_NUMBER() OVER (PARTITION BY g ORDER BY t DESC), phir outer query mein rn = 1.' },
          { q: 'Pichhli row se compare karke trend nikaalne wala?', target: 'lag', explain: 'LAG() — pichhli row ki value. LEAD() agli row ki.' },
          { q: 'Ties ko same rank dene wala function?', target: 'rank', explain: 'RANK() — 1,2,2,4. DENSE_RANK() gap nahi chhodta: 1,2,2,3.' },
        ],
      },
      {
        type: 'fill',
        title: 'Top-N-per-group likho',
        instructions: 'Har client ka sabse naya test result. Blanks bharo.',
        template: `SELECT * FROM (
  SELECT id, client, status, updatedAt,
         {0}() {1} (
           {2} client            -- har client ka apna counter
           ORDER BY updatedAt DESC          -- naya pehle
         ) AS rn
  FROM   bmsTester
) t
WHERE  rn = {3};                            -- har group ki sirf pehli row`,
        tokens: ['ROW_NUMBER', 'OVER', 'PARTITION BY', '1', 'COUNT', 'GROUP BY', 'HAVING', '0'],
        blanks: [
          { answer: 'ROW_NUMBER', explain: '<code>ROW_NUMBER()</code> har partition mein 1,2,3… deta hai. Ties par bhi alag number — isliye "exactly ek row per group" guarantee.' },
          { answer: 'OVER', explain: '<code>OVER (…)</code> hi function ko <b>window</b> function banata hai. Iske bina woh normal aggregate hai.' },
          { answer: 'PARTITION BY', explain: '<code>PARTITION BY</code> = window ka "GROUP BY" — par rows girte nahi. Har client ka counter alag se 1 se shuru hota hai.' },
          { answer: '1', explain: '<code>rn = 1</code> = har partition ki pehli row = <b>latest</b> (kyunki ORDER BY DESC tha). Yehi poore pattern ka nichod hai.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: latestDevice column ko retire karo',
        instructions: 'Pehle dekho ki GROUP BY yeh sawal kyun nahi hal kar sakta — phir window function ka jawab dekho.',
        goal: 'Sawal: <b>"har client ka sabse naya test result — poori row"</b>. <b>(1)</b> Pehle GROUP BY se koshish karo: <code>SELECT client, MAX(id) FROM bmsTester GROUP BY client;</code> — yeh sirf ek column deta hai, poori row nahi (status/board gayab). <b>(2)</b> Ab window function chalao: <code>SELECT id, client, status, ROW_NUMBER() OVER (PARTITION BY client ORDER BY id DESC) AS rn FROM bmsTester;</code> — 10 ki 10 rows bachi hain, aur har client ka counter alag se 1 se shuru hua. <b>(3)</b> <code>COUNT(*) OVER (PARTITION BY client)</code> chala ke dekho ki har row ko apne group ka total kaise milta hai. <b>(4)</b> Ab asli jawab: usi window query ko ek <b>derived table</b> mein daalo aur bahar <code>WHERE rn = 1</code> lagao — har client ka latest row, poori detail ke saath. <b>(5)</b> Bonus: <code>RANK()</code> aur <code>DENSE_RANK()</code> ko <code>duration</code> par chala ke farak dekho.',
        tasks: [
          { text: 'GROUP BY se koshish (adhoora jawab)', check: s => s.history.some(h => /group\s+by\s+client/i.test(h) && /max\s*\(/i.test(h)) },
          { text: 'ROW_NUMBER() OVER (PARTITION BY ...) chalao', check: s => s.history.some(h => /row_number\s*\(\s*\)\s*over/i.test(h)) },
          { text: 'COUNT(*) OVER (PARTITION BY ...) chalao', check: s => s.history.some(h => /count\s*\(\s*\*\s*\)\s*over/i.test(h)) },
          { text: 'Derived table + WHERE rn = 1 — har client ka latest', check: s => s.history.some(h => /from\s*\(\s*select/i.test(h) && /rn\s*=\s*1/i.test(h)) },
          { text: 'RANK() aur DENSE_RANK() ka farak dekho', check: s => s.history.some(h => /dense_rank\s*\(\s*\)\s*over/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /group\s+by\s+client/i.test(h) && /max\s*\(/i.test(h))
          && s.history.some(h => /row_number\s*\(\s*\)\s*over/i.test(h))
          && s.history.some(h => /count\s*\(\s*\*\s*\)\s*over/i.test(h))
          && s.history.some(h => /dense_rank\s*\(\s*\)\s*over/i.test(h))
          && s.history.some(h => /from\s*\(\s*select/i.test(h) && /rn\s*=\s*1/i.test(h)),
        successText: '🎉 <b>Farak saaf hai.</b> <code>GROUP BY</code> ne 10 rows ko 3 bana diya aur sirf ek column diya — <code>status</code>, <code>board</code>, sab gayab. <code>ROW_NUMBER() OVER (PARTITION BY …)</code> ne 10 rows bachaye <b>aur</b> har client ka counter de diya; ab bas <code>WHERE rn = 1</code> se poori latest row mil jaati hai. Isiliye asli project ka <code>latestDevice BOOLEAN</code> column <b>hataya ja saka</b> — jo derive ho sakta hai use store karna matlab use sync rakhne ki zimmedari lena, aur woh flag ek din do rows par <code>true</code> reh gaya tha. <b>Derive karo, store mat karo.</b>',
        hints: [
          'SELECT client, MAX(id) FROM bmsTester GROUP BY client;   ← sirf ek column, poori row nahi',
          'SELECT id, client, status, ROW_NUMBER() OVER (PARTITION BY client ORDER BY id DESC) AS rn FROM bmsTester;',
          'SELECT id, client, status, COUNT(*) OVER (PARTITION BY client) AS client_total FROM bmsTester;',
          'SELECT * FROM (SELECT id, client, status, ROW_NUMBER() OVER (PARTITION BY client ORDER BY id DESC) AS rn FROM bmsTester) t WHERE rn = 1;',
          'SELECT buildNum, duration, RANK() OVER (ORDER BY duration DESC) AS rnk, DENSE_RANK() OVER (ORDER BY duration DESC) AS dr FROM bx50Builds;',
        ],
      },
      {
        type: 'quiz',
        title: 'Window Quick-fire',
        questions: [
          {
            q: 'GROUP BY aur window function (OVER) mein sabse bada farak?',
            choices: [
              'GROUP BY rows ko gira ke ek row per group deta hai; window function saari rows bachata hai aur har row ko uske group ka number deta hai',
              'Window function tez hota hai',
              'GROUP BY sirf COUNT ke saath chalta hai',
              'Koi farak nahi',
            ],
            answer: 0,
            explain: 'Isiliye "har group ka top row (poori detail ke saath)" GROUP BY se hota hi nahi — window function chahiye.',
          },
          {
            q: '"Har client ka sabse naya order" — kaunsa pattern?',
            choices: [
              'ROW_NUMBER() OVER (PARTITION BY client ORDER BY date DESC) subquery mein, phir WHERE rn = 1',
              'GROUP BY client + MAX(date)',
              'ORDER BY date DESC LIMIT 1',
              'DISTINCT client',
            ],
            answer: 0,
            explain: '<code>MAX(date)</code> sirf date deta hai, poori row nahi (aur uspar JOIN karna tie par duplicate de sakta hai). <code>LIMIT 1</code> poori table se ek row deta hai, per-client nahi.',
          },
          {
            q: 'RANK() aur DENSE_RANK() mein farak?',
            choices: [
              'RANK ties ke baad gap chhodta hai (1,2,2,4); DENSE_RANK nahi chhodta (1,2,2,3)',
              'RANK sirf numbers par chalta hai',
              'DENSE_RANK tez hai',
              'Dono same hain',
            ],
            answer: 0,
            explain: 'Aur <code>ROW_NUMBER()</code> ties par bhi alag number deta hai (1,2,3,4) — isliye "exactly ek row per group" ke liye wahi use karte hain.',
          },
          {
            q: '<code>latestDevice BOOLEAN</code> jaisa derived column rakhne ka nuksaan?',
            choices: [
              'Use har insert par sync rakhna padta hai — ek fail hua update chhoda toh do rows "latest" ban jaate hain aur dashboard jhoot bolta hai',
              'Disk zyada lagti hai',
              'Query slow hoti hai',
              'Koi nuksaan nahi',
            ],
            answer: 0,
            explain: 'Yeh asli bug tha — do "latest" rows, pass aur fail dono ek saath. Window function se woh column hi zaroori nahi raha.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Window Functions',
      instructions: 'Yeh sawal senior roles mein aksar aata hai. 🎤',
      questions: [
        {
          q: '"Har category ka sabse mehnga product nikaalo — poori row ke saath."',
          choices: [
            'ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) ko subquery/CTE mein daal ke bahar WHERE rn = 1',
            'GROUP BY category, MAX(price) — bas',
            'ORDER BY price DESC LIMIT 1',
            'DISTINCT category',
          ],
          answer: 0,
          explain: 'Yeh <b>the</b> top-N-per-group question hai. <code>GROUP BY + MAX</code> kyun kaafi nahi — poori row nahi milti aur uspar JOIN karne se ties par duplicates aa jaate hain.',
        },
        {
          q: 'Interviewer: "Table mein ek isLatest flag column hai. Tumhari raaye?"',
          choices: [
            'Main use hataunga — woh derived data hai jise sync rakhna padta hai aur woh kabhi na kabhi galat ho jaata hai. Query mein ROW_NUMBER() se derive karunga; agar performance chahiye toh ek indexed timestamp par sochunga',
            'Achha hai, query tez hoti hai',
            'Rakhna chahiye, standard practice hai',
            'Koi farak nahi padta',
          ],
          answer: 0,
          explain: 'Denormalization par nuanced jawab: <b>derived state = sync ki zimmedari</b>. Asli project mein woh flag do rows par true reh gaya tha aur QA report toot gayi.',
        },
        {
          q: '🎛️ Interviewer: "Window function likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — window functions',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Har operator ki sessions dikhao aur har row par us operator ka <b>total sessions</b> bhi — <code>COUNT(*) OVER (PARTITION BY userId)</code>. <b>(2)</b> Har operator ki sessions ko duration ke hisaab se rank karo — <code>ROW_NUMBER() OVER (PARTITION BY userId ORDER BY duration DESC)</code>. <b>(3)</b> Comparison ke liye wahi cheez GROUP BY se karke dekho ki kitni detail kho jaati hai. <b>(4)</b> Running total: <code>SUM(duration) OVER (ORDER BY id)</code> — dekho har row tak ka chalta hua jod.',
            tasks: [
              { text: 'COUNT(*) OVER (PARTITION BY userId)', check: s => s.history.some(h => /count\s*\(\s*\*\s*\)\s*over\s*\(\s*partition\s+by\s+userid/i.test(h)) },
              { text: 'ROW_NUMBER() OVER (PARTITION BY userId ...)', check: s => s.history.some(h => /row_number\s*\(\s*\)\s*over\s*\(\s*partition\s+by\s+userid/i.test(h)) },
              { text: 'GROUP BY se comparison', check: s => s.history.some(h => /group\s+by\s+userid/i.test(h)) },
              { text: 'Running total — SUM(...) OVER (ORDER BY ...)', check: s => s.history.some(h => /sum\s*\(\s*duration\s*\)\s*over\s*\(\s*order\s+by/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /count\s*\(\s*\*\s*\)\s*over\s*\(\s*partition\s+by\s+userid/i.test(h))
              && s.history.some(h => /row_number\s*\(\s*\)\s*over\s*\(\s*partition\s+by\s+userid/i.test(h))
              && s.history.some(h => /group\s+by\s+userid/i.test(h))
              && s.history.some(h => /sum\s*\(\s*duration\s*\)\s*over\s*\(\s*order\s+by/i.test(h)),
            successText: '✅ Side-by-side farak saaf hai: <b>GROUP BY</b> ne 8 sessions ko 4 rows bana diya, <b>window</b> ne 8 rows bachaye aur har row ko uska group-context de diya. Jab bhi sawal mein "har X ka top/latest/rank" ho — window function socho.',
            hints: [
              'SELECT id, userId, duration, COUNT(*) OVER (PARTITION BY userId) AS op_total FROM bx50Sessions;',
              'SELECT id, userId, duration, ROW_NUMBER() OVER (PARTITION BY userId ORDER BY duration DESC) AS rn FROM bx50Sessions;',
              'SELECT userId, COUNT(*) AS sessions FROM bx50Sessions GROUP BY userId;   ← detail kho gayi',
              'SELECT id, duration, SUM(duration) OVER (ORDER BY id) AS running FROM bx50Sessions;',
            ],
          },
        },
      ],
    },
    success: [
      'Main OVER (PARTITION BY ...) se group ka number har row par la sakta hoon',
      'Main ROW_NUMBER() se "top-N per group" pattern likh sakta hoon',
      'Main RANK / DENSE_RANK / LAG ka farak jaanta hoon',
      'Main derived column ke bajaye window function use karne ka faisla justify kar sakta hoon',
    ],
    homework: `<p>Window functions ke liye MySQL 8+ chahiye (ya PostgreSQL):</p>
      <pre>USE factory;
SELECT VERSION();      -- 8.0+ hona chahiye

-- Group ka total, har row par
SELECT opId, name, shift,
       COUNT(*) OVER (PARTITION BY shift) AS shift_total
FROM operators;

-- Top-N per group
SELECT * FROM (
  SELECT opId, name, shift,
         ROW_NUMBER() OVER (PARTITION BY shift ORDER BY name) AS rn
  FROM operators
) t WHERE rn = 1;      -- har shift ka pehla operator (alphabetically)

-- Teen ranking functions ka farak
SELECT buildNum, duration,
       ROW_NUMBER() OVER (ORDER BY duration DESC) AS rownum,
       RANK()       OVER (ORDER BY duration DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY duration DESC) AS dense
FROM bx50Builds;

-- Running total
SELECT buildNum, duration,
       SUM(duration) OVER (ORDER BY buildNum) AS running_total
FROM bx50Builds;

-- LAG — pichhli row se farak
SELECT buildNum, duration,
       LAG(duration) OVER (ORDER BY buildNum) AS pichhli,
       duration - LAG(duration) OVER (ORDER BY buildNum) AS farak
FROM bx50Builds;</pre>
      <p>✅ Self-check: Duplicate durations daal ke <code>RANK</code> vs <code>DENSE_RANK</code> ka gap dekha? Running total sach mein cumulative tha?</p>`,
    cards: [
      { front: 'GROUP BY vs window function?', back: '<b>GROUP BY</b> rows gira ke ek row per group deta hai. <b>Window (OVER)</b> saari rows bachata hai aur har row ko uske group ka number deta hai — detail + summary dono.' },
      { front: 'Top-N-per-group pattern?', back: '<code>ROW_NUMBER() OVER (PARTITION BY g ORDER BY t DESC)</code> subquery/CTE mein, phir bahar <code>WHERE rn = 1</code>. "Har client ka latest order" ka standard jawab.' },
      { front: 'ROW_NUMBER vs RANK vs DENSE_RANK?', back: '<b>ROW_NUMBER</b>: 1,2,3,4 (ties par bhi alag). <b>RANK</b>: 1,2,2,4 (gap). <b>DENSE_RANK</b>: 1,2,2,3 (no gap).' },
      { front: 'LAG / LEAD kis liye?', back: '<b>LAG</b> = pichhli row ki value, <b>LEAD</b> = agli. Trend/delta ke liye: <code>duration - LAG(duration) OVER (ORDER BY date)</code>.' },
      { front: 'isLatest / latestDevice jaisa column?', back: '<b>Mat rakho</b> — derived data ko sync rakhna padta hai aur woh galat ho jaata hai (asli case: do rows par <code>true</code>). Query mein <code>ROW_NUMBER() … = 1</code> se derive karo.' },
    ],
  },

  /* ================= LEVEL 5: CTEs ================= */
  {
    id: 'cte',
    icon: '📖',
    title: 'CTEs — Lambi Query ko Kahani Banao',
    badge: 'CTE Katha-Vachak',
    objectives: [
      '<b>WITH name AS (...)</b> — query-local naam',
      '<b>Chained CTEs</b> — ek CTE agle ko use kare',
      '<b>CTE + window function</b> = top-N-per-group ka sabse saaf roop',
      'CTE vs derived table vs view — kab kya',
    ],
    lesson: [
      `<h3>📖 CTE — nested subquery ko naam do</h3>
       <p>Yeh query padho (andar se bahar padhni padti hai — dimaag ulta chalta hai):</p>
       <pre>SELECT * FROM (
  SELECT userId, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn
  FROM (
    SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId
  ) x
) y WHERE rn &lt;= 3;</pre>
       <p>Ab wahi cheez CTE ke saath — <b>upar se neeche</b>, har step ka naam:</p>
       <pre>WITH totals AS (
  SELECT userId, COUNT(*) AS cnt
  FROM   bx50Sessions
  GROUP BY userId
),
ranked AS (
  SELECT userId, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn
  FROM   totals                    -- ← pichhla CTE use kar raha hai
)
SELECT * FROM ranked WHERE rn &lt;= 3;</pre>
       <p>Same result, same performance — par <b>padhne mein kahani</b>:
       "pehle totals nikaalo, phir rank karo, phir top 3 lo."</p>`,
      `<h3>🔗 Chaining aur reuse</h3>
       <ul>
         <li>Ek CTE <b>agle CTE</b> ko use kar sakta hai (upar wala pehle define hona chahiye)</li>
         <li>Ek CTE final query mein <b>kai baar</b> use ho sakta hai — subquery
             copy-paste karne ki zaroorat nahi</li>
         <li>CTE sirf <b>usi query</b> mein zinda hai (view ke ulta, jo DB mein save hota hai)</li>
       </ul>
       <pre>WITH monthly AS (
  SELECT DATE_FORMAT(startDate, '%Y-%m') AS mahina, COUNT(*) AS builds
  FROM   bx50Builds GROUP BY DATE_FORMAT(startDate, '%Y-%m')
)
SELECT a.mahina, a.builds, b.builds AS pichhla_mahina
FROM   monthly a
LEFT JOIN monthly b ON b.mahina &lt; a.mahina    -- ek hi CTE, do baar!
ORDER BY a.mahina;</pre>
       <p><b>CTE vs derived table vs view:</b></p>
       <table>
         <tr><th></th><th>Kahan zinda</th><th>Kab</th></tr>
         <tr><td><b>Derived table</b> <code>FROM (SELECT…) t</code></td><td>ek jagah, usi query mein</td><td>ek hi baar chahiye, chhota hai</td></tr>
         <tr><td><b>CTE</b> <code>WITH t AS (…)</code></td><td>poori query mein</td><td>kai steps, ya kai baar use</td></tr>
         <tr><td><b>View</b></td><td>DB mein saved</td><td>kai queries/logon ko chahiye</td></tr>
       </table>`,
      `<h3>👑 CTE + window function = top-N-per-group</h3>
       <p>Level 20 ka pattern ab apne sabse saaf roop mein:</p>
       <pre>WITH ranked AS (
  SELECT id, client, status,
         ROW_NUMBER() OVER (PARTITION BY client ORDER BY id DESC) AS rn
  FROM   bmsTester
)
SELECT id, client, status
FROM   ranked
WHERE  rn = 1;                   -- har client ka latest</pre>
       <p>Derived table se yeh bhi ho jaata, par CTE mein <code>ranked</code>
       naam padhne wale ko turant bata deta hai ki ho kya raha hai.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka "monthly QA
       summary" ek 180-line ki query thi — chaar level nested subqueries,
       aur beech mein ek subquery <b>teen jagah copy-paste</b> thi. Jab pass-rate
       ki definition badli ("retest ko exclude karo"), developer ne teen mein se
       <b>do</b> jagah update kiya. Report ka summary total aur breakdown total
       aapas mein 40 rows se alag ho gaye, aur do hafte kisi ko pata nahi chala.
       Query ko CTEs mein todha gaya — woh repeated subquery ek
       <code>valid_tests</code> CTE ban gayi, aur ab definition <b>ek jagah</b>
       hai. <b>Sabak: agar ek hi subquery do baar likhni pad rahi hai, toh woh
       CTE hai — copy-paste ek din chup-chaap alag ho jaayega.</b></div>`,
    ],
    stages: [
      {
        type: 'order',
        title: 'CTE chain ka sahi order',
        instructions: 'Top-3 operators wali query ke steps sahi order mein lagao.',
        steps: [
          { text: 'WITH totals AS (SELECT userId, COUNT(*) ... GROUP BY userId)', explain: 'Pehla step — raw sessions se per-operator counts.' },
          { text: 'ranked AS (SELECT ..., ROW_NUMBER() OVER (ORDER BY cnt DESC) FROM totals)', explain: 'Doosra CTE pehle wale ko use karta hai — chaining.' },
          { text: 'SELECT * FROM ranked WHERE rn <= 3', explain: 'Final query — ab yeh ek line mein padhi ja sakti hai.' },
          { text: 'Result: top 3 operators, poori detail ke saath', explain: 'Har step ka naam hai, isliye kal koi bhi ise padh sakta hai.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'CTE diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'cte',
        questions: [
          { q: 'Query-local naam banane wala keyword?', target: 'with', explain: 'WITH name AS (...) — CTE. Sirf usi query mein zinda rehta hai.' },
          { q: 'Yeh padhne mein ulta lagta hai — kaunsa hai?', target: 'nested', explain: 'Nested subqueries — andar se bahar padhni padti hain.' },
          { q: 'CTE ka woh faayda jo copy-paste bug rokta hai?', target: 'reuse', explain: 'Ek CTE query mein kai baar use ho sakta hai — definition ek jagah rehti hai.' },
          { q: 'CTE view se kaise alag hai?', target: 'scope', explain: 'CTE sirf usi query mein zinda hai; view DB mein saved rehta hai aur sab use kar sakte hain.' },
        ],
      },
      {
        type: 'fill',
        title: 'CTE chain likho',
        instructions: 'Top 3 sabse busy operators. Blanks bharo.',
        template: `{0} totals {1} (
  SELECT userId, COUNT(*) AS cnt
  FROM   bx50Sessions
  GROUP BY userId
){2}
ranked AS (
  SELECT userId, cnt,
         ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn
  FROM   {3}                      -- pichhla CTE
)
SELECT * FROM ranked WHERE rn <= 3;`,
        tokens: ['WITH', 'AS', ',', 'totals', 'SELECT', 'IS', ';', 'ranked'],
        blanks: [
          { answer: 'WITH', explain: '<code>WITH</code> se CTE block shuru hota hai. Ek hi <code>WITH</code> ke baad comma se kai CTE aa sakte hain.' },
          { answer: 'AS', explain: '<code>WITH name AS (query)</code> — brackets zaroori hain.' },
          { answer: ',', explain: 'Do CTE ke beech <b>comma</b> — dobara <code>WITH</code> nahi likhte. Yeh common galti hai.' },
          { answer: 'totals', explain: 'Doosra CTE pehle wale ka naam use karta hai — <b>chaining</b>. Order matter karta hai: pehle define, phir use.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: 180-line query ko kahani banao',
        instructions: 'Nested subquery se CTE tak — aur dekho ki padhna kitna aasan ho jaata hai.',
        goal: 'Woh 180-line wali query refactor karni hai. <b>(1)</b> Pehle nested tarika chalao: <code>SELECT * FROM (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId) t WHERE cnt >= 2;</code> — kaam karta hai, par padhne mein ulta. <b>(2)</b> Ab wahi CTE se: <code>WITH totals AS (...) SELECT * FROM totals WHERE cnt >= 2;</code>. <b>(3)</b> Chain banao — do CTE: <code>totals</code>, phir <code>ranked</code> (jo <code>totals</code> par <code>ROW_NUMBER() OVER (ORDER BY cnt DESC)</code> lagaye), aur final <code>SELECT * FROM ranked WHERE rn &lt;= 3</code>. <b>(4)</b> CTE + JOIN: <code>totals</code> ko <code>operators</code> se JOIN karke naam bhi dikhao. <b>(5)</b> Top-N-per-group CTE se: har client ka latest test (<code>ranked</code> CTE + <code>WHERE rn = 1</code>).',
        tasks: [
          { text: 'Nested subquery wala tarika', check: s => s.history.some(h => /from\s*\(\s*select/i.test(h) && !/with/i.test(h)) },
          { text: 'Wahi cheez CTE se (WITH totals AS ...)', check: s => s.history.some(h => /^with\s+totals\s+as/i.test(h)) },
          { text: 'Do CTE chain (totals → ranked)', check: s => s.history.some(h => /^with/i.test(h) && /ranked\s+as/i.test(h) && /row_number/i.test(h)) },
          { text: 'CTE + JOIN se naam bhi dikhao', check: s => s.history.some(h => /^with/i.test(h) && /join\s+operators/i.test(h)) },
          { text: 'CTE se top-N-per-group (rn = 1)', check: s => s.history.some(h => /^with/i.test(h) && /partition\s+by/i.test(h) && /rn\s*=\s*1/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /from\s*\(\s*select/i.test(h) && !/with/i.test(h))
          && s.history.some(h => /^with\s+totals\s+as/i.test(h))
          && s.history.some(h => /^with/i.test(h) && /ranked\s+as/i.test(h) && /row_number/i.test(h))
          && s.history.some(h => /^with/i.test(h) && /join\s+operators/i.test(h))
          && s.history.some(h => /^with/i.test(h) && /partition\s+by/i.test(h) && /rn\s*=\s*1/i.test(h)),
        successText: '🎉 <b>Wahi result, padhne laayak shakal.</b> Nested version aur CTE version <b>bilkul same</b> rows dete hain — farak sirf insaan ke liye hai. Aur wahi farak asli project mein 40-row ka mismatch bana tha: ek repeated subquery teen jagah copy thi, definition badli toh do jagah update hui. CTE mein woh definition <b>ek jagah</b> hoti hai, isliye woh bug ban hi nahi sakta. <b>Rule: ek hi subquery do baar likhni pad rahi hai? Woh CTE hai.</b> Aur <code>WITH ranked AS (… ROW_NUMBER() …) SELECT * FROM ranked WHERE rn = 1</code> — top-N-per-group ka sabse saaf roop.',
        hints: [
          'SELECT * FROM (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId) t WHERE cnt >= 2;',
          'WITH totals AS (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId) SELECT * FROM totals WHERE cnt >= 2;',
          'WITH totals AS (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId), ranked AS (SELECT userId, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn FROM totals) SELECT * FROM ranked WHERE rn <= 3;',
          'WITH totals AS (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId) SELECT o.name, t.cnt FROM totals t JOIN operators o ON t.userId = o.opId ORDER BY t.cnt DESC;',
          'WITH ranked AS (SELECT id, client, status, ROW_NUMBER() OVER (PARTITION BY client ORDER BY id DESC) AS rn FROM bmsTester) SELECT id, client, status FROM ranked WHERE rn = 1;',
        ],
      },
      {
        type: 'quiz',
        title: 'CTE Quick-fire',
        questions: [
          {
            q: 'Do CTE ke beech kya likhte hain?',
            choices: [
              'Comma — WITH a AS (...), b AS (...) SELECT ...',
              'Dobara WITH',
              'AND',
              'Semicolon',
            ],
            answer: 0,
            explain: 'Ek hi <code>WITH</code>, phir comma se aur CTE. Dobara <code>WITH</code> likhna common syntax error hai.',
          },
          {
            q: 'CTE aur view mein farak?',
            choices: [
              'CTE sirf usi query mein zinda hai; view DB mein saved rehta hai aur har koi use kar sakta hai',
              'CTE tez hota hai',
              'View sirf SELECT ke liye hai',
              'Koi farak nahi',
            ],
            answer: 0,
            explain: 'Scope ka farak. Ek query readable banani hai → CTE. Poori team ko baar-baar chahiye → view.',
          },
          {
            q: 'Ek hi subquery query mein do jagah chahiye. Best approach?',
            choices: [
              'CTE banao — definition ek jagah rahegi, aur dono jagah wahi naam use hoga',
              'Copy-paste kar do',
              'Do alag queries chalao',
              'Temporary table banao',
            ],
            answer: 0,
            explain: 'Asli incident: copy-paste ki hui subquery ki definition badli toh teen mein se do jagah update hui, aur report 40 rows se galat ho gayi.',
          },
          {
            q: 'Top-N-per-group ka sabse readable roop?',
            choices: [
              'WITH ranked AS (SELECT ..., ROW_NUMBER() OVER (PARTITION BY g ORDER BY t DESC) AS rn FROM x) SELECT * FROM ranked WHERE rn <= N',
              'GROUP BY g + MAX(t)',
              'ORDER BY t DESC LIMIT N',
              'DISTINCT g',
            ],
            answer: 0,
            explain: 'CTE + window function ki jodi. Derived table se bhi hota hai, par <code>ranked</code> naam padhne wale ko turant bata deta hai ki ho kya raha hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — CTEs',
      instructions: 'Readability aur maintainability ka round. 🎤',
      questions: [
        {
          q: '"CTE performance improve karta hai?"',
          choices: [
            'Aam taur par nahi — woh mukhya roop se <b>readability</b> ke liye hai; optimizer aksar CTE aur equivalent subquery ka same plan banata hai. Asli faayda maintainability hai: ek definition, ek jagah',
            'Haan, CTE result cache karta hai',
            'Haan, CTE hamesha tez hai',
            'Nahi, CTE hamesha slow hai',
          ],
          answer: 0,
          explain: 'Honest jawab. (Kuch DBs mein CTE materialize ho sakta hai — MySQL 8 usually merge karta hai. "EXPLAIN se verify karta hoon" bolna bonus hai.)',
        },
        {
          q: 'Interviewer: "Ek 200-line query maintain karni hai. Kahan se shuru karoge?"',
          choices: [
            'Use CTEs mein todunga — har logical step ka naam, aur jo subquery repeat ho rahi hai use ek CTE bana dunga taaki definition ek jagah rahe',
            'Poori query dobara likh dunga',
            'Comments daal dunga',
            'Chhoti queries mein tod ke app mein jod dunga',
          ],
          answer: 0,
          explain: '"Repeated subquery → CTE" wali line asli experience dikhati hai — wahi copy-paste drift asli 40-row mismatch ka karan tha.',
        },
        {
          q: '🎛️ Interviewer: "CTE se ek report likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — CTEs',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Ek CTE <code>client_stats</code> banao jo har client ka total aur pass count de (<code>CASE</code> use karo), phir usse final <code>SELECT</code> mein pass-rate nikaalo. <b>(2)</b> Do CTE chain karo: <code>totals</code> (per-operator session count) → <code>ranked</code> (ROW_NUMBER) → top 2. <b>(3)</b> CTE ko <code>operators</code> se JOIN karke naam bhi dikhao.',
            tasks: [
              { text: 'client_stats CTE + pass rate', check: s => s.history.some(h => /^with\s+client_stats/i.test(h) && /case\s+when/i.test(h)) },
              { text: 'Do CTE chain (totals → ranked)', check: s => s.history.some(h => /^with/i.test(h) && /ranked\s+as/i.test(h) && /row_number/i.test(h)) },
              { text: 'CTE + JOIN operators', check: s => s.history.some(h => /^with/i.test(h) && /join\s+operators/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /^with\s+client_stats/i.test(h) && /case\s+when/i.test(h))
              && s.history.some(h => /^with/i.test(h) && /ranked\s+as/i.test(h) && /row_number/i.test(h))
              && s.history.some(h => /^with/i.test(h) && /join\s+operators/i.test(h)),
            successText: '✅ CTE + CASE + window + JOIN — chaaron ek saath, aur query phir bhi upar se neeche padhi ja sakti hai. Yehi woh style hai jo do saal baad bhi maintain ho paata hai.',
            hints: [
              "WITH client_stats AS (SELECT client, COUNT(*) AS total, SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed FROM bmsTester GROUP BY client) SELECT client, total, passed, ROUND(100.0 * passed / total, 1) AS rate FROM client_stats;",
              'WITH totals AS (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId), ranked AS (SELECT userId, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn FROM totals) SELECT * FROM ranked WHERE rn <= 2;',
              'WITH totals AS (SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId) SELECT o.name, t.cnt FROM totals t JOIN operators o ON t.userId = o.opId;',
            ],
          },
        },
      ],
    },
    success: [
      'Main WITH ... AS (...) se CTE likh sakta hoon',
      'Main kai CTE chain kar sakta hoon aur ek CTE ko dobara use kar sakta hoon',
      'Main CTE + window function se top-N-per-group likh sakta hoon',
      'Main CTE vs derived table vs view ka faisla justify kar sakta hoon',
    ],
    homework: `<p>CTE ki teen shaktiyan (MySQL 8+ chahiye):</p>
      <pre>USE factory;

-- 1. Naam dene se readability
WITH day_ops AS (SELECT * FROM operators WHERE shift = 'day')
SELECT COUNT(*) FROM day_ops;

-- 2. Chaining
WITH totals AS (
  SELECT userId, COUNT(*) AS cnt FROM bx50Sessions GROUP BY userId
), ranked AS (
  SELECT userId, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn FROM totals
)
SELECT * FROM ranked WHERE rn <= 3;

-- 3. Ek CTE, do baar use (yehi copy-paste bug rokta hai)
WITH monthly AS (
  SELECT DATE_FORMAT(startDate, '%Y-%m') AS m, COUNT(*) AS c
  FROM bx50Builds GROUP BY DATE_FORMAT(startDate, '%Y-%m')
)
SELECT a.m, a.c, (SELECT SUM(c) FROM monthly) AS grand_total FROM monthly a;

-- 4. Recursive CTE — number series (bade test data ke liye kaam ka)
WITH RECURSIVE nums(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 10
)
SELECT * FROM nums;

-- 5. Recursive se hierarchy (staff table pichhle level se)
WITH RECURSIVE chain AS (
  SELECT id, name, managerId, 1 AS lvl FROM staff WHERE managerId IS NULL
  UNION ALL
  SELECT s.id, s.name, s.managerId, c.lvl + 1
  FROM staff s JOIN chain c ON s.managerId = c.id
)
SELECT * FROM chain ORDER BY lvl;</pre>
      <p>✅ Self-check: Chained CTE ne top 3 diye? Recursive wale ne 1..10 banaya aur hierarchy ke levels nikaale? (Recursive CTE is app ke simulator mein nahi hai — woh sirf asli MySQL 8 par chalega.)</p>`,
    cards: [
      { front: 'CTE ka syntax?', back: '<code>WITH name AS (query)[, name2 AS (query)] SELECT …</code> — do CTE ke beech <b>comma</b> (dobara <code>WITH</code> nahi). Sirf usi query mein zinda.' },
      { front: 'CTE performance improve karta hai?', back: '<b>Aam taur par nahi</b> — woh readability/maintainability ke liye hai. Optimizer aksar CTE aur equivalent subquery ka same plan banata hai. EXPLAIN se verify karo.' },
      { front: 'CTE vs derived table vs view?', back: '<b>Derived table</b> = ek jagah, usi query mein. <b>CTE</b> = poori query mein, kai baar use ho sakta hai. <b>View</b> = DB mein saved, sab use kar sakte hain.' },
      { front: 'Kab CTE banana chahiye?', back: 'Jab ek hi subquery <b>do baar</b> likhni pad rahi ho — copy-paste ek din chup-chaap alag ho jaayega. Asli case: teen mein se do jagah definition update hui, report 40 rows se galat ho gayi.' },
      { front: 'Top-N-per-group ka sabse saaf roop?', back: '<code>WITH ranked AS (SELECT …, ROW_NUMBER() OVER (PARTITION BY g ORDER BY t DESC) AS rn FROM x) SELECT * FROM ranked WHERE rn = 1;</code> — CTE + window ki jodi.' },
    ],
  },

  /* ================= LEVEL 6: Query Tuning ================= */
  {
    id: 'tuning',
    icon: '🔧',
    title: 'Query Tuning — N+1 se Keyset tak',
    badge: 'Tuning Tapasvi',
    objectives: [
      '<b>N+1 query</b> — sabse common app-level slowdown',
      '<b>SELECT *</b> ka chhupa kharcha',
      '<b>Deep OFFSET</b> pagination ka jaal, aur keyset ka ilaaj',
      '<b>Sargable</b> queries — column par function mat lagao',
    ],
    lesson: [
      `<h3>🔁 N+1 — ek query jo 501 ban jaati hai</h3>
       <pre>// ❌ App code (aksar ORM ke saath chup-chaap hota hai)
const devices = await db.query("SELECT * FROM bx50Data");        // 1 query
for (const d of devices) {
  d.build = await db.query(                                       // + N queries!
    "SELECT * FROM bx50Builds WHERE buildNum = ?", [d.buildNum]);
}
// 500 devices = 501 queries, har ek ka network round-trip</pre>
       <pre>-- ✅ Ek JOIN
SELECT d.*, b.type, b.duration
FROM   bx50Data d
JOIN   bx50Builds b ON d.buildNum = b.buildNum;</pre>
       <p>Har query apne aap tez ho sakti hai (2ms) — par 501 × 2ms = <b>1 second</b>,
       aur woh network latency ke bina. Isiliye slow-query log mein kuch nahi
       dikhta aur log confuse hote hain: "DB toh tez hai, phir page slow kyun?"</p>
       <p>💡 ORM mein iska ilaaj <code>include</code> / <code>join</code> /
       <code>eager loading</code> kehlata hai. Sequelize mein
       <code>include: [Build]</code>.</p>`,
      `<h3>💸 SELECT * aur deep OFFSET</h3>
       <p><b>SELECT * ka kharcha</b> — asli <code>bx50Data</code> mein 40 columns
       the jisme 8 secrets aur kuch TEXT blobs. Chahiye the do columns:</p>
       <pre>❌ SELECT * FROM bx50Data;            -- 40 columns × har row, network par
✅ SELECT bx50Name, status FROM bx50Data;</pre>
       <p>Aur bonus: agar zaroori columns index mein hi hain toh DB <b>table ko
       chhue bina</b> jawab de deta hai (covering index) — <code>SELECT *</code>
       woh mauka khatam kar deta hai.</p>
       <p><b>Deep OFFSET</b> — pagination ka classic jaal:</p>
       <pre>-- Page 1: tez
SELECT * FROM bmsTester ORDER BY id LIMIT 50 OFFSET 0;

-- Page 2000: 100050 rows padho, 100000 phenk do 🐌
SELECT * FROM bmsTester ORDER BY id LIMIT 50 OFFSET 100000;</pre>
       <p><b>Ilaaj — keyset (cursor) pagination:</b></p>
       <pre>-- "pichhle page ki aakhri id" yaad rakho
SELECT * FROM bmsTester WHERE id > 100000 ORDER BY id LIMIT 50;
-- Index seedha id 100000 par jump karta hai — page 2000 bhi page 1 jitna tez</pre>`,
      `<h3>🎯 Sargable — index ko kaam karne do</h3>
       <p><b>Sargable</b> = "Search ARGument able" — matlab index use ho sakta
       hai. Column par function lagate hi woh khatam:</p>
       <pre>❌ WHERE YEAR(startDate) = 2026
✅ WHERE startDate >= '2026-01-01' AND startDate < '2027-01-01'

❌ WHERE UPPER(bx50Name) = 'BX50-TOKYO-01'
✅ WHERE bx50Name = 'bx50-tokyo-01'      (collation aksar case-insensitive hai)

❌ WHERE duration / 1000 > 3600
✅ WHERE duration > 3600000              (math doosri taraf le jao)

❌ WHERE bx50Name LIKE '%tokyo%'
✅ WHERE bx50Name LIKE 'bx50-tokyo%'     (shuruaat fixed = index chal sakta hai)</pre>
       <p>Rule: <b>column ko akela chhodo, calculation doosri taraf karo.</b></p>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka monthly report
       page 40 second le raha tha. Slow query log mein <b>ek bhi</b> slow query
       nahi thi — sab 1-3ms. Wajah: page 1 query se builds laata tha, phir har
       build ke liye alag query se sessions, phir har session ke liye alag query
       se operator ka naam. 30 builds × ~8 sessions = <b>270+ queries</b> per
       page load. Ek JOIN ne 40 second ko <b>0.9 second</b> kar diya. <b>Sabak:
       agar DB "tez" hai par page slow hai, toh queries ka <i>number</i> gino,
       unka time nahi.</b></div>`,
    ],
    stages: [
      {
        type: 'slider',
        title: '🎚️ Lab: N+1 ka asli hisaab',
        instructions: 'Slider ghumao — dekho ki "har query toh 2ms hi hai" kaise ghanton mein badal jaata hai.',
        scenario: `Ek page 50 orders dikhata hai. Har order ke liye code
          uska customer alag se fetch karta hai. Har query <b>2 ms</b> ki hai —
          "kuch bhi nahi", hai na?`,
        knobs: [
          { id: 'rows', label: 'Page par kitne orders', min: 10, max: 500, step: 10, value: 50 },
          { id: 'qms', label: 'Ek query ka time', min: 1, max: 20, step: 1, value: 2, unit: 'ms' },
          { id: 'batch', label: 'Batch karo? (1 = N+1, 0 = ek hi query)', min: 0, max: 1, step: 1, value: 1 },
        ],
        readouts: [
          { id: 'q', label: 'Kitni queries', unit: '', fn: v => v.batch ? v.rows + 1 : 2, good: x => x <= 5 },
          { id: 'ms', label: 'Kul DB time', unit: 'ms',
            fn: v => v.batch ? (v.rows + 1) * v.qms : 2 * v.qms + Math.round(v.rows * 0.02),
            good: x => x < 100 },
          { id: 'day', label: 'Agar page 50,000 baar/din khule', unit: '',
            format: x => (x / 3600).toFixed(1) + ' ghante/din',
            fn: v => (v.batch ? (v.rows + 1) * v.qms : 2 * v.qms) * 50000 / 1000,
            good: x => x < 3600 },
        ],
        bar: (v, r) => ({ pct: Math.min(100, r.ms / 12), bad: r.ms >= 100,
          label: `${Math.round(r.ms)} ms page load (sirf DB)` }),
        verdict: (v, r) => {
          if (v.batch) return { tone: 'bad', text: `🔥 <b>${r.q} queries</b> ek page ke liye. Har ek "sirf ${v.qms} ms" hai — aur milke ${Math.round(r.ms)} ms. Yeh N+1 hai: har query tez hai, par unki <b>ginti</b> hi problem hai.` };
          return { tone: 'good', text: '✅ <b>2 queries.</b> Ek orders ke liye, ek saare customers ke liye (<code>WHERE id IN (…)</code>) — phir memory mein jod do. Yahi batching hai.' };
        },
        goal: { text: 'Page ka DB time <b>100 ms se kam</b> laao — orders <b>200 se kam</b> kiye bina.',
          check: (v, r) => r.ms < 100 && v.rows >= 200 },
        insight: `N+1 ka jaal yahi hai: <b>har query tez hoti hai</b>.
          Slow query log mein woh kabhi upar nahi aayegi (2 ms!), par woh
          din ke ghante khaa jaati hai.<br><br>
          Ilaaj query tune karna nahi — <b>ginti ghatana</b> hai:
          <code>WHERE id IN (…)</code> se ek hi baar sab le aao, ya JOIN karo,
          ya ORM mein eager loading on karo.`,
      },

      {
        type: 'bins',
        title: 'Kaunsa anti-pattern hai?',
        instructions: 'Har problem ko uske anti-pattern mein daalo.',
        bins: [
          { id: 'nplus1', label: '🔁 N+1 queries' },
          { id: 'star', label: '💸 SELECT *' },
          { id: 'offset', label: '📄 Deep OFFSET' },
          { id: 'sargable', label: '🎯 Non-sargable' },
        ],
        items: [
          { text: 'Loop mein har row ke liye alag query chal rahi hai', bin: 'nplus1', explain: 'N+1. Ilaaj: ek JOIN (ya ORM ka eager loading / include).' },
          { text: 'WHERE YEAR(startDate) = 2026', bin: 'sargable', explain: 'Column par function = index bekaar. Range likho: >= aur < ke saath.' },
          { text: 'Page 2000 par LIMIT 50 OFFSET 100000', bin: 'offset', explain: 'DB 100050 rows padh ke 100000 phenk deta hai. Keyset pagination use karo.' },
          { text: '40 columns aa rahe hain, chahiye the 2', bin: 'star', explain: 'Network + memory ka kharcha, aur covering index ka mauka khatam.' },
          { text: 'Slow query log khaali hai par page 40 second le raha hai', bin: 'nplus1', explain: 'Har query tez hai par 270 queries chal rahi hain. Queries ka number gino.' },
          { text: 'WHERE duration / 1000 > 3600', bin: 'sargable', explain: 'Column par math. Doosri taraf le jao: duration > 3600000.' },
          { text: 'API response mein password columns bhi aa rahe hain', bin: 'star', explain: 'SELECT * ne secrets bhi utha liye — asli project ka log-leak incident.' },
          { text: "WHERE bx50Name LIKE '%tokyo%'", bin: 'sargable', explain: 'Aage % = index bekaar. Shuruaat fixed karo, ya full-text search use karo.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Tuning diagram par ungli rakho',
        instructions: 'Diagram mein sahi problem click karo.',
        visual: 'tuning',
        questions: [
          { q: 'Loop mein har row ke liye alag query — kaunsa anti-pattern?', target: 'nplus1', explain: 'N+1. Ilaaj ek JOIN. Slow query log mein yeh nahi dikhta — isliye sabse chhupa hua hai.' },
          { q: 'Page 2000 slow hai, page 1 tez — kya problem hai?', target: 'offset', explain: 'Deep OFFSET — DB 100050 rows padh ke 100000 phenk deta hai.' },
          { q: 'Deep OFFSET ka ilaaj kya hai?', target: 'keyset', explain: 'Keyset pagination — WHERE id > last_seen LIMIT 50. Index seedha jump karta hai.' },
          { q: 'Index ko bekaar kar dene wali galti?', target: 'fncol', explain: 'Column par function (YEAR/UPPER/math). Column ko akela chhodo, calculation doosri taraf.' },
        ],
      },
      {
        type: 'fill',
        title: 'Chaar anti-patterns theek karo',
        instructions: 'Har galat query ka sahi roop bharo.',
        template: `-- 1. N+1 ka ilaaj: ek hi query
SELECT d.bx50Name, b.type
FROM   bx50Data d
{0}   bx50Builds b ON d.buildNum = b.buildNum;

-- 2. SELECT * ke bajaye naam le kar columns
SELECT {1} FROM bx50Data;

-- 3. Deep OFFSET ke bajaye keyset pagination
SELECT * FROM bmsTester
WHERE  id {2} 'a1b2c3d4-0005'        -- pichhle page ki aakhri id
ORDER  BY id LIMIT 50;

-- 4. Sargable banao (index chal sake)
SELECT * FROM bx50Sessions
WHERE  startDate {3} '2026-06-01' AND startDate < '2026-07-01';`,
        tokens: ['JOIN', 'bx50Name, status', '>', '>=', 'WHERE', '*', '<', 'LIKE'],
        blanks: [
          { answer: 'JOIN', explain: 'N+1 ka ilaaj hamesha ek hi <b>JOIN</b> hai (ORM mein "eager loading" / <code>include</code>). 501 round-trips → 1.' },
          { answer: 'bx50Name, status', explain: 'Naam le kar columns maango — kam network, kam memory, aur <b>covering index</b> ka mauka bhi bacha rehta hai.' },
          { answer: '>', explain: '<b>Keyset pagination</b> — <code>WHERE id &gt; last_seen_id</code>. Index seedha wahan jump karta hai, isliye page 2000 bhi page 1 jitna tez.' },
          { answer: '>=', explain: 'Date range <b>sargable</b> roop mein: <code>&gt;= start AND &lt; end</code>. <code>YEAR(startDate) = 2026</code> likhte toh index bekaar ho jaata.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: 40 second wala report page',
        instructions: 'N+1 ko ek JOIN se badlo, aur non-sargable query ko theek karo.',
        goal: 'Report page 40 second le raha hai par slow query log khaali hai. <b>(1)</b> N+1 ka pehla hissa dekho: <code>SELECT buildNum FROM bx50Builds WHERE active = 1;</code> — ab socho ki app har buildNum ke liye alag query chalata hai. <b>(2)</b> Ek query mein sab kuch: <code>bx50Sessions</code> ko <code>bx50Builds</code> aur <code>operators</code> se JOIN karke ek hi query mein poori report nikaalo. <b>(3)</b> <code>SELECT *</code> ke bajaye sirf zaroori columns maango. <b>(4)</b> <code>EXPLAIN</code> se non-sargable query dekho: <code>EXPLAIN SELECT * FROM bx50Sessions WHERE duration / 1000 > 3600;</code>. <b>(5)</b> Sargable roop likho: <code>WHERE duration > 3600000</code> aur <code>EXPLAIN</code> se compare karo.',
        tasks: [
          { text: 'N+1 ka pehla query dekho', check: s => s.history.some(h => /from\s+bx50builds/i.test(h) && /active\s*=\s*1/i.test(h)) },
          { text: 'Ek JOIN mein poori report', check: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2) },
          { text: 'Sirf zaroori columns (no SELECT *)', check: s => s.history.some(h => /^select\s+(?!\*)/i.test(h) && /join/i.test(h)) },
          { text: 'Non-sargable query EXPLAIN karo', check: s => s.history.some(h => /^explain/i.test(h) && /duration\s*\/\s*1000/i.test(h)) },
          { text: 'Sargable roop likho (duration > 3600000)', check: s => s.history.some(h => /duration\s*>\s*3600000/i.test(h)) },
        ],
        db: SG.factoryDB(db => {
          db.tables.bx50Sessions.indexes = ['duration'];
        }),
        success: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2)
          && s.history.some(h => /^explain/i.test(h) && /duration\s*\/\s*1000/i.test(h))
          && s.history.some(h => /duration\s*>\s*3600000/i.test(h))
          && s.history.some(h => /^select\s+(?!\*)/i.test(h) && /join/i.test(h)),
        successText: '🎉 <b>Dono problems hal.</b> <b>N+1:</b> 270+ chhoti queries ki jagah ek JOIN — asli project mein yeh 40 second se <b>0.9 second</b> ho gaya tha. Yaad rakho: slow query log tab bhi khaali tha, kyunki har query akeli tez thi. <b>Jab DB tez ho par page slow ho, queries ka <i>number</i> gino.</b> <b>Sargable:</b> <code>duration / 1000 > 3600</code> mein column par math tha, isliye index chhoot gaya; <code>duration > 3600000</code> mein column akela hai aur index lag jaata hai. <b>Column ko akela chhodo, calculation doosri taraf karo.</b>',
        hints: [
          'SELECT buildNum FROM bx50Builds WHERE active = 1;   ← app ab har buildNum par alag query chalayega (N+1)',
          'SELECT o.name, b.buildNum, b.type, s.duration FROM bx50Sessions s JOIN bx50Builds b ON s.buildNum = b.buildNum JOIN operators o ON s.userId = o.opId WHERE b.active = 1;',
          'EXPLAIN SELECT * FROM bx50Sessions WHERE duration / 1000 > 3600;   ← type dekho',
          'EXPLAIN SELECT * FROM bx50Sessions WHERE duration > 3600000;   ← ab compare karo',
        ],
      },
      {
        type: 'quiz',
        title: 'Tuning Quick-fire',
        questions: [
          {
            q: 'Page slow hai par slow query log khaali hai. Sabse pehla shak?',
            choices: [
              'N+1 — bahut saari chhoti-chhoti queries chal rahi hain, har ek tez par milkar slow',
              'Server ki RAM kam hai',
              'Index missing hai',
              'Network slow hai',
            ],
            answer: 0,
            explain: 'Slow query log <b>ek query</b> ka time dekhta hai. 270 × 2ms kahin nahi dikhta. Queries ka <b>number</b> gino (APM / query counter).',
          },
          {
            q: 'Deep OFFSET (page 2000) slow kyun hai?',
            choices: [
              'DB ko 100050 rows padhni padti hain aur 100000 phenkni padti hain — OFFSET skip nahi karta, padhta hai',
              'OFFSET index use nahi kar sakta',
              'MySQL ki limitation hai',
              'Kyunki LIMIT 50 chhota hai',
            ],
            answer: 0,
            explain: 'Yehi asli wajah hai. Ilaaj <b>keyset pagination</b>: <code>WHERE id > last_seen ORDER BY id LIMIT 50</code>.',
          },
          {
            q: 'Kaunsi query sargable (index-friendly) hai?',
            choices: [
              "WHERE startDate >= '2026-06-01' AND startDate < '2026-07-01'",
              'WHERE YEAR(startDate) = 2026 AND MONTH(startDate) = 6',
              'WHERE DATE_FORMAT(startDate, \'%Y-%m\') = \'2026-06\'',
              'WHERE CAST(startDate AS DATE) = \'2026-06-01\'',
            ],
            answer: 0,
            explain: 'Column akela hai, isliye index range scan kar sakta hai. Baaki teeno mein column par function lag gaya = full scan.',
          },
          {
            q: '<code>SELECT *</code> ka sabse kam socha jaane wala nuksaan?',
            choices: [
              'Covering index ka mauka khatam ho jaata hai — DB ko table ki row bhi padhni padti hai, sirf index se kaam nahi chalta',
              'Query syntax galat ho jaati hai',
              'Table lock ho jaata hai',
              'Index toot jaata hai',
            ],
            answer: 0,
            explain: 'Agar zaroori columns index mein hi hain toh DB table ko chhue bina jawab de deta hai. <code>SELECT *</code> woh shortcut band kar deta hai (plus secrets/network ka kharcha).',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Query Tuning',
      instructions: 'Yeh round performance engineer banata hai. 🎤',
      questions: [
        {
          q: '"Page slow hai. Debug kaise karoge?"',
          choices: [
            'Pehle dekhunga ki <b>ek</b> query slow hai ya <b>bahut saari</b> queries chal rahi hain (N+1). Ek slow query → EXPLAIN + index. Bahut queries → JOIN/eager loading. Phir dobara measure karunga',
            'Seedha index laga dunga',
            'Server upgrade karunga',
            'Cache laga dunga',
          ],
          answer: 0,
          explain: 'Sabse pehle <b>problem ki kism</b> pehchano — ek slow query aur N+1 do bilkul alag ilaaj maangte hain. Cache aakhri option hai, pehla nahi.',
        },
        {
          q: 'Interviewer: "Lakhon rows par pagination kaise karoge?"',
          choices: [
            'Keyset (cursor) pagination — WHERE id > last_seen ORDER BY id LIMIT n. Deep OFFSET har page par pichhli saari rows padhta hai, keyset index se seedha jump karta hai',
            'LIMIT/OFFSET — standard tarika hai',
            'Poora data laake app mein paginate karunga',
            'Har page ke liye alag table banaunga',
          ],
          answer: 0,
          explain: 'Trade-off bhi bolna: keyset se "page 500 par seedha jao" nahi ho sakta (sirf next/prev) — par infinite scroll aur API pagination ke liye woh sahi choice hai.',
        },
        {
          q: '🎛️ Interviewer: "N+1 ko JOIN se badal ke dikhao."',
          terminal: {
            title: 'Interview hands-on — tuning',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> N+1 ka pattern dikhao: pehle <code>SELECT opId FROM operators;</code>, phir ek operator ke liye alag query <code>SELECT * FROM bx50Sessions WHERE userId = \'OP-101\';</code>. <b>(2)</b> Ab dono ko ek JOIN mein badlo — operator naam + uske sessions, ek hi query mein. <b>(3)</b> Sirf zaroori columns maango, <code>SELECT *</code> nahi. <b>(4)</b> <code>EXPLAIN</code> se plan dekho.',
            tasks: [
              { text: 'N+1 pattern dikhao (2 alag queries)', check: s => s.history.some(h => /from\s+operators/i.test(h) && !/join/i.test(h)) && s.history.some(h => /userid\s*=\s*'op-101'/i.test(h)) },
              { text: 'Ek JOIN mein badlo', check: s => s.history.some(h => /join/i.test(h) && /bx50sessions/i.test(h)) },
              { text: 'Sirf zaroori columns', check: s => s.history.some(h => /^select\s+(?!\*)/i.test(h) && /join/i.test(h)) },
              { text: 'EXPLAIN se plan dekho', check: s => s.history.some(h => /^explain/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /userid\s*=\s*'op-101'/i.test(h))
              && s.history.some(h => /join/i.test(h) && /bx50sessions/i.test(h))
              && s.history.some(h => /^select\s+(?!\*)/i.test(h) && /join/i.test(h))
              && s.history.some(h => /^explain/i.test(h)),
            successText: '✅ Interviewer ne dekha ki tum problem ko <b>naam</b> de sakte ho (N+1), uska <b>ilaaj</b> likh sakte ho (JOIN), aur <b>verify</b> bhi karte ho (EXPLAIN). Teeno milkar ek complete jawab bante hain.',
            hints: [
              "SELECT opId FROM operators;   phir   SELECT * FROM bx50Sessions WHERE userId = 'OP-101';   ← yeh N+1 hai",
              'SELECT o.name, s.buildNum, s.duration FROM operators o JOIN bx50Sessions s ON o.opId = s.userId;',
              "EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';",
            ],
          },
        },
      ],
    },
    success: [
      'Main N+1 pattern pehchaan ke JOIN/eager loading se theek kar sakta hoon',
      'Main SELECT * ke teen nuksaan (network, secrets, covering index) bata sakta hoon',
      'Main deep OFFSET ki jagah keyset pagination likh sakta hoon',
      'Main non-sargable queries ko sargable bana sakta hoon',
    ],
    homework: `<p>Anti-patterns ka asar khud naapo (pichhle level ka <code>big_test</code> table use karo):</p>
      <pre>USE factory;

-- Deep OFFSET vs keyset
SELECT * FROM big_test ORDER BY id LIMIT 50 OFFSET 0;        -- time note karo
SELECT * FROM big_test ORDER BY id LIMIT 50 OFFSET 90000;    -- ab time note karo
SELECT * FROM big_test WHERE id > 90000 ORDER BY id LIMIT 50; -- keyset — compare!

-- Sargable vs non-sargable
EXPLAIN SELECT * FROM big_test WHERE client = 'client-42';           -- type: ref
EXPLAIN SELECT * FROM big_test WHERE UPPER(client) = 'CLIENT-42';    -- type: ALL!

-- SELECT * vs specific columns
EXPLAIN SELECT * FROM big_test WHERE client = 'client-42';
EXPLAIN SELECT client FROM big_test WHERE client = 'client-42';
-- doosri wali ka Extra dekho — "Using index" (covering index!)

-- N+1 khud dekho: general log on karke query count gino
SET GLOBAL general_log = 'ON';
-- app chalao, phir log file mein queries gino
SET GLOBAL general_log = 'OFF';</pre>
      <p>✅ Self-check: OFFSET 90000 saaf slow tha? Keyset wali page-1 jitni tez? <code>UPPER()</code> ne type ALL kar diya? Covering index par "Using index" dikha?</p>`,
    cards: [
      { front: 'N+1 query problem?', back: 'Loop mein har row ke liye alag query — 500 rows = 501 queries. <b>Slow query log mein nahi dikhta</b> (har query tez hai). Ilaaj: ek <b>JOIN</b> / ORM eager loading.' },
      { front: 'Page slow, slow-query-log khaali — kya shak?', back: '<b>N+1.</b> Queries ka <i>number</i> gino, unka time nahi. Asli case: 270 queries per page → ek JOIN → 40s se 0.9s.' },
      { front: 'Deep OFFSET slow kyun?', back: 'OFFSET skip nahi karta — <b>padhta hai</b>. Page 2000 = 100050 rows padho, 100000 phenko. Ilaaj: <b>keyset</b>: <code>WHERE id &gt; last_seen ORDER BY id LIMIT n</code>.' },
      { front: 'Sargable kya hai?', back: 'Query jispar index lag sake. <b>Column ko akela chhodo</b>: <code>YEAR(d)=2026</code> ❌ → <code>d &gt;= \'2026-01-01\' AND d &lt; \'2027-01-01\'</code> ✅.' },
      { front: 'SELECT * ke 3 nuksaan?', back: '1) Network/memory ka kharcha 2) <b>secrets leak</b> (asli log-leak incident) 3) <b>covering index</b> ka mauka khatam — DB ko table row bhi padhni padti hai.' },
    ],
  },

  /* ================= LEVEL 7: SQL Injection & Security ================= */
  {
    id: 'sqlsec',
    icon: '💉',
    title: 'SQL Injection — Sabse Purana, Sabse Khatarnaak',
    badge: 'Injection Inspector',
    objectives: [
      '<b>String concatenation</b> se query banane ka anjaam',
      '<b>Prepared statements</b> — asli aur ekmatr ilaaj',
      '<b>Least privilege</b> — app ka DB user root nahi hota',
      'Kya <b>nahi</b> bachata: escaping, blacklist, ORM par andha bharosa',
    ],
    lesson: [
      `<h3>💉 Injection kaise hota hai</h3>
       <pre>// ❌ App code
const q = "SELECT * FROM operators WHERE name = '" + userInput + "'";</pre>
       <p>User <code>Ravi</code> daale toh sab theek. Par user yeh daale:</p>
       <pre>Input: ' OR '1'='1
Query: SELECT * FROM operators WHERE name = '' OR '1'='1'
       → poori table leak 😱

Input: '; DROP TABLE bx50Data; --
Query: SELECT * FROM operators WHERE name = ''; DROP TABLE bx50Data; --'
       → table gaya (agar multi-statement on ho)</pre>
       <p>Login bypass bhi isi se hota hai:</p>
       <pre>Input (password field): ' OR 1=1 --
Query: SELECT * FROM users WHERE email='a@b.c' AND password='' OR 1=1 --'
       → password check hi bypass ho gaya</pre>
       <p>Problem ki jad ek hi hai: <b>user ka data SQL <i>code</i> ban gaya.</b></p>`,
      `<h3>🛡️ Prepared statements — ekmatr asli ilaaj</h3>
       <pre>// ✅ Node.js (mysql2)
const [rows] = await conn.execute(
  "SELECT * FROM operators WHERE name = ?", [userInput]
);

// ✅ Python
cur.execute("SELECT * FROM operators WHERE name = %s", (user_input,))

// ✅ Java
PreparedStatement ps = conn.prepareStatement(
  "SELECT * FROM operators WHERE name = ?");
ps.setString(1, userInput);</pre>
       <p><b>Yeh escaping se alag hai.</b> Prepared statement mein query ka
       <b>structure DB ko pehle</b> bhej diya jaata hai (parse + plan ban jaata
       hai), aur <b>values baad mein alag</b> jaati hain. Ab user chahe kuch bhi
       bheje, woh <b>hamesha ek value</b> rahega — kabhi SQL nahi banega.</p>
       <p>💡 <code>?</code> sirf <b>values</b> ke liye kaam karta hai. Table ya
       column ka naam dynamic chahiye toh use <b>whitelist</b> se validate
       karo:</p>
       <pre>const allowed = ['name', 'shift', 'station'];
if (!allowed.includes(sortColumn)) throw new Error('bad column');
const q = \`SELECT * FROM operators ORDER BY \${sortColumn}\`;   // ab safe</pre>`,
      `<h3>🔐 Defence in depth — aur kya nahi bachata</h3>
       <p><b>Layer 2: least privilege.</b> App ka DB user <code>root</code> nahi
       hona chahiye:</p>
       <pre>CREATE USER 'factory_app'@'%' IDENTIFIED BY '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON factory.* TO 'factory_app'@'%';
-- DROP, ALTER, GRANT ka right hai hi nahi</pre>
       <p>Ab agar injection ho bhi jaye, <code>DROP TABLE</code> fail hoga —
       damage bahut chhota ho jaata hai.</p>
       <p><b>Kya NAHI bachata:</b></p>
       <ul>
         <li>❌ <b>Blacklist</b> ("DROP", "--" jaise shabd block karna) — bypass
             ke hazaar tarike hain (encoding, comments, case).</li>
         <li>❌ <b>Sirf frontend validation</b> — attacker seedha API call karega.</li>
         <li>❌ <b>Manual escaping</b> — ek jagah bhoole toh gaye. Aur alag
             charset/context mein escaping alag hoti hai.</li>
         <li>⚠️ <b>ORM par andha bharosa</b> — ORM normally placeholders use karta
             hai, par uska <code>raw()</code> / <code>literal()</code> escape hatch
             seedha string bhejta hai. Wahi jagah audit karo.</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> Asli project Sequelize ORM
       use karta tha — jo by default placeholders lagata hai, toh 95% code safe
       tha. Par ek reporting endpoint mein "flexible filters" chahiye the, aur
       usne <code>sequelize.query()</code> se raw SQL banayi jisme filter values
       template string se jud rahi thi. Woh endpoint internal tha, isliye kisi ne
       dhyaan nahi diya. Security review mein pakda gaya: ek filter value se
       poori <code>bx50Data</code> table (secrets ke saath) dump ho sakti thi.
       <b>Sabak: ORM tumhe bachata hai jab tak tum uske bahar nahi nikalte —
       aur "internal endpoint" security boundary nahi hoti.</b></div>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'Injection diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'sqlsec',
        questions: [
          { q: 'Injection ki jad kya hai?', target: 'concat', explain: 'User input ko SQL string mein jodna — data code ban jaata hai. Yehi ek jad hai.' },
          { q: 'Asli aur ekmatr ilaaj kaunsa hai?', target: 'prepared', explain: 'Prepared statements (?) — query ka structure pehle, values alag. Input hamesha value rehta hai.' },
          { q: 'Doosri layer — damage kam karne ke liye?', target: 'leastpriv', explain: 'Least privilege — app user ko sirf SELECT/INSERT/UPDATE/DELETE, DROP/ALTER nahi.' },
          { q: 'Bobby Tables wala classic attack?', target: 'droptable', explain: "'; DROP TABLE …; -- — statement band karke naya statement chipka dena." },
        ],
      },
      {
        type: 'fill',
        title: 'Vulnerable code ko theek karo',
        instructions: 'Prepared statement aur least privilege. Blanks bharo.',
        template: `// ❌ VULNERABLE
const q = "SELECT * FROM operators WHERE name = '" + userInput + "'";

// ✅ SAFE — prepared statement
const [rows] = await conn.execute(
  "SELECT * FROM operators WHERE name = {0}",
  [userInput]                       // value alag jaati hai — kabhi SQL nahi banti
);

// ⚠️ Column/table naam ? se nahi aata — {1} se validate karo
const allowed = ['name', 'shift', 'station'];
if (!allowed.includes(sortCol)) throw new Error('bad column');

-- Layer 2: app ka DB user root nahi
CREATE USER 'factory_app'@'%' IDENTIFIED BY '...';
{2} SELECT, INSERT, UPDATE, DELETE ON factory.* TO 'factory_app'@'%';
-- {3} ka right jaan-boojh ke nahi diya`,
        tokens: ['?', 'whitelist', 'GRANT', 'DROP', '%s', 'blacklist', 'REVOKE', 'SELECT'],
        blanks: [
          { answer: '?', explain: '<code>?</code> = placeholder. Query ka <b>structure</b> DB ko pehle jaata hai, <b>values baad mein alag</b> — isliye input kabhi SQL nahi ban sakta. (Python mein <code>%s</code>, Postgres mein <code>$1</code>.)' },
          { answer: 'whitelist', explain: 'Column/table naam placeholder se nahi aa sakta, isliye <b>whitelist</b> (allowed list) se validate karo. <b>Blacklist kabhi nahi</b> — bypass ke hazaar tarike hote hain.' },
          { answer: 'GRANT', explain: '<code>GRANT</code> se sirf zaroori permissions do. App ko roz-marra ke liye DDL ki zaroorat hi nahi hoti.' },
          { answer: 'DROP', explain: '<code>DROP</code>/<code>ALTER</code>/<code>GRANT</code> app user ko mat do. Injection ho bhi jaye toh <code>DROP TABLE</code> fail hoga — damage chhota.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Injection apni aankhon se',
        instructions: 'Ek vulnerable query khud chala ke dekho ki input kaise SQL ban jaata hai.',
        goal: 'App ka code tha: <code>"SELECT * FROM operators WHERE name = \'" + input + "\'"</code>. <b>(1)</b> Normal input (<code>Ravi Kumar</code>) ke saath woh query chalao: <code>SELECT * FROM operators WHERE name = \'Ravi Kumar\';</code> — ek row. <b>(2)</b> Ab attacker ka input <code>\' OR \'1\'=\'1</code> daalne par jo query <b>banti</b> hai woh chalao: <code>SELECT * FROM operators WHERE name = \'\' OR \'1\'=\'1\';</code> — dekho kitne rows aate hain! <b>(3)</b> Yahi cheez <code>bx50Data</code> par socho — us table mein secrets hain. Chalao: <code>SELECT bx50Name, status FROM bx50Data WHERE bx50Name = \'\' OR \'1\'=\'1\';</code>. <b>(4)</b> Ab safe query likho: exact naam ke saath, bina kisi OR ke.',
        tasks: [
          { text: 'Normal query (ek row)', check: s => s.history.some(h => /where\s+name\s*=\s*'ravi kumar'/i.test(h)) },
          { text: "Injection: ' OR '1'='1 — poori table leak", check: s => s.history.some(h => /or\s+'1'\s*=\s*'1'/i.test(h) && /operators/i.test(h)) },
          { text: 'Wahi attack bx50Data par (secrets wali table)', check: s => s.history.some(h => /or\s+'1'\s*=\s*'1'/i.test(h) && /bx50data/i.test(h)) },
          /* \b...\b zaroori hai — bina word-boundary ke "operatORs" bhi match ho jaata tha,
             isliye yeh task pehle kabhi pass hi nahi hota tha. */
          { text: 'Safe query — exact match, koi OR nahi', check: s => s.history.some(h => /where\s+name\s*=\s*'[^']+'\s*$/i.test(h) && !/\bor\b/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /or\s+'1'\s*=\s*'1'/i.test(h) && /operators/i.test(h))
          && s.history.some(h => /or\s+'1'\s*=\s*'1'/i.test(h) && /bx50data/i.test(h))
          && s.history.some(h => /where\s+name\s*=\s*'ravi kumar'/i.test(h))
          && s.history.some(h => /where\s+name\s*=\s*'[^']+'\s*$/i.test(h) && !/\bor\b/i.test(h)),
        successText: '🎉 <b>Ab tumne khud dekha.</b> <code>WHERE name = \'\' OR \'1\'=\'1\'</code> — DB ke liye yeh bilkul <b>valid query</b> hai. Woh kuch galat nahi kar raha; usse aisi hi query bheji gayi thi. Yehi injection ki poori kahani hai: <b>user ka data SQL code ban gaya.</b> Aur dhyaan do ki <code>bx50Data</code> par yahi attack secrets wali poori table dump kar deta. Ilaaj escaping ya blacklist nahi — <b>prepared statement</b>: <code>WHERE name = ?</code>, jahan value <b>hamesha</b> value rehti hai. Plus least privilege, taaki injection ho bhi jaye toh <code>DROP</code> na chale.',
        hints: [
          "SELECT * FROM operators WHERE name = 'Ravi Kumar';   ← normal, 1 row",
          "SELECT * FROM operators WHERE name = '' OR '1'='1';   ← poori table!",
          "SELECT bx50Name, status FROM bx50Data WHERE bx50Name = '' OR '1'='1';",
          "SELECT * FROM operators WHERE name = 'Priya Sharma';   ← safe (app mein yeh ? se aata)",
        ],
      },
      {
        type: 'quiz',
        title: 'Security Quick-fire',
        questions: [
          {
            q: 'SQL injection ka asli ilaaj kya hai?',
            choices: [
              'Prepared statements (parameterized queries) — query structure pehle, values alag, isliye input kabhi SQL nahi ban sakta',
              'Khatarnaak shabd (DROP, --) block karna',
              'Frontend par input validate karna',
              'Manually quotes escape karna',
            ],
            answer: 0,
            explain: 'Baaki teeno bypass ho jaate hain. Prepared statement <b>structurally</b> data aur code ko alag karta hai — yeh "dhyaan rakhna" nahi, "na-mumkin banana" hai.',
          },
          {
            q: 'App ka DB user root kyun nahi hona chahiye?',
            choices: [
              'Least privilege — injection ho bhi jaye toh DROP/ALTER fail honge, damage bahut chhota rahega',
              'Root slow hota hai',
              'MySQL root ko allow nahi karta',
              'Sirf convention hai',
            ],
            answer: 0,
            explain: 'Defence in depth. Layer 1 (prepared statements) fail ho jaye toh layer 2 damage seemit kar deta hai.',
          },
          {
            q: 'ORM use kar rahe ho. Kya ab injection possible hai?',
            choices: [
              'Haan — raw()/literal() jaise escape hatches se, jahan string concatenation ho sakta hai. Wahi jagah audit karo',
              'Nahi, ORM 100% safe hai',
              'Nahi, agar version naya ho',
              'Haan, ORM hamesha vulnerable hota hai',
            ],
            answer: 0,
            explain: 'Asli project mein exactly yahi hua — Sequelize safe tha, par ek raw <code>sequelize.query()</code> wala reporting endpoint vulnerable nikla.',
          },
          {
            q: 'Dynamic <b>column</b> naam (ORDER BY user ki pasand se) kaise safe karein?',
            choices: [
              'Whitelist — allowed column names ki list se validate karo, kyunki ? sirf values ke liye kaam karta hai',
              '? placeholder se',
              'Escaping se',
              'Column name ko uppercase kar do',
            ],
            answer: 0,
            explain: 'Placeholder identifiers ke liye nahi hota. <b>Whitelist</b> (allowed list) hi sahi jawab hai — blacklist kabhi nahi.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Security',
      instructions: 'Security round — yahan galat jawab disqualify karta hai. 🎤',
      questions: [
        {
          q: '"SQL injection kya hai aur kaise rokte ho?"',
          choices: [
            'User input SQL code ban jaata hai jab use query string mein joda jaye. Rokne ka tarika: <b>prepared statements</b> (values alag jaati hain), plus least-privilege DB user, aur dynamic identifiers ke liye whitelist',
            'Database hack karne ka tareeka — firewall se rokte hain',
            'Input mein se khatarnaak shabd hata dete hain',
            'ORM use karne se apne aap ruk jaata hai',
          ],
          answer: 0,
          explain: 'Teen hisse: <b>kya</b> (data → code), <b>primary fix</b> (prepared statements), <b>defence in depth</b> (least privilege + whitelist).',
        },
        {
          q: 'Interviewer: "Code review mein tum kya dhoondhoge?"',
          choices: [
            'Har jagah jahan SQL string concatenation ya template literal se ban rahi hai — khaas kar ORM ke raw()/query() escape hatches, aur "internal" endpoints jinhe log kam dhyaan dete hain',
            'Sirf login page ka code',
            'Sirf frontend validation',
            'Table ke naam',
          ],
          answer: 0,
          explain: '"Internal endpoint security boundary nahi hoti" — yeh line asli incident se aati hai aur interviewer ko turant senior signal deti hai.',
        },
        {
          q: '🎛️ Interviewer: "Mujhe dikhao ki injection kaisa dikhta hai."',
          terminal: {
            title: 'Interview hands-on — injection demo',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Ek normal lookup query chalao — <code>bmsTester</code> se ek client ke tests (<code>WHERE client = \'Komatsu\'</code>). <b>(2)</b> Ab dikhao ki agar input <code>\' OR \'1\'=\'1</code> ho toh query kya banti hai aur kitna data leak hota hai. <b>(3)</b> Ek aur variant: <code>\' OR 1=1 --</code> style — <code>WHERE client = \'\' OR 1=1;</code>. <b>(4)</b> Wapas safe query par aao.',
            tasks: [
              { text: 'Normal lookup (ek client)', check: s => s.history.some(h => /client\s*=\s*'komatsu'/i.test(h)) },
              { text: "Injection: ' OR '1'='1", check: s => s.history.some(h => /or\s+'1'\s*=\s*'1'/i.test(h)) },
              { text: 'Variant: OR 1=1', check: s => s.history.some(h => /or\s+1\s*=\s*1/i.test(h)) },
              { text: 'Safe query par wapas', check: s => s.history.filter(h => /client\s*=\s*'[a-z]+'/i.test(h) && !/or/i.test(h)).length >= 1 },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /client\s*=\s*'komatsu'/i.test(h))
              && s.history.some(h => /or\s+'1'\s*=\s*'1'/i.test(h))
              && s.history.some(h => /or\s+1\s*=\s*1/i.test(h)),
            successText: '✅ Demo poora. Dono variants ne wahi kiya — <code>WHERE</code> ki condition ko hamesha-sach bana diya. Ab interviewer ko yeh bolo: "isiliye main <code>WHERE client = ?</code> likhta hoon — tab yeh poora string ek <b>value</b> hota hai, aur DB use naam samajh ke dhoondhta hai, code samajh ke chalata nahi."',
            hints: [
              "SELECT id, client, status FROM bmsTester WHERE client = 'Komatsu';",
              "SELECT id, client, status FROM bmsTester WHERE client = '' OR '1'='1';",
              "SELECT id, client, status FROM bmsTester WHERE client = '' OR 1=1;",
              "SELECT id, client, status FROM bmsTester WHERE client = 'Hitachi';",
            ],
          },
        },
      ],
    },
    success: [
      'Main samjha sakta hoon ki injection mein data kaise code ban jaata hai',
      'Main prepared statements likh sakta hoon aur unka mechanism samjhata hoon',
      'Main least privilege DB user set kar sakta hoon',
      'Main jaanta hoon ki blacklist/escaping/ORM kyun kaafi nahi',
    ],
    homework: `<p>⚠️ Yeh sirf <b>apne local test DB</b> par karo — kisi aur ke system par kabhi nahi.</p>
      <pre>USE factory;

-- Vulnerable pattern khud dekho
SELECT * FROM operators WHERE name = 'Ravi Kumar';       -- normal
SELECT * FROM operators WHERE name = '' OR '1'='1';      -- sab leak

-- Node.js mein safe tarika (mysql2):
--   const [rows] = await conn.execute(
--     "SELECT * FROM operators WHERE name = ?", [userInput]);

-- Least privilege user banao
CREATE USER 'factory_app'@'localhost' IDENTIFIED BY 'apppass123';
GRANT SELECT, INSERT, UPDATE, DELETE ON factory.* TO 'factory_app'@'localhost';
FLUSH PRIVILEGES;

-- Us user se login karke test karo:
--   mysql -u factory_app -papppass123 factory
SHOW GRANTS FOR 'factory_app'@'localhost';

-- Us user se yeh chala ke dekho (fail hona chahiye):
--   DROP TABLE operators;      → ERROR 1142: DROP command denied
--   CREATE TABLE x (id INT);   → ERROR 1142: CREATE command denied</pre>
      <p>✅ Self-check: <code>OR '1'='1'</code> ne poori table di? <code>factory_app</code> user se DROP fail hua? Yeh do cheezein milkar defence in depth banati hain.</p>`,
    cards: [
      { front: 'SQL injection ki jad?', back: '<b>User ka data SQL code ban jaata hai</b> — kyunki input ko query string mein joda gaya. DB kuch galat nahi karta; usse aisi hi query bheji gayi thi.' },
      { front: 'Asli ilaaj?', back: '<b>Prepared statements</b>: <code>WHERE name = ?</code> + values alag array mein. Query ka structure DB ko pehle jaata hai, values baad mein — input hamesha value rehta hai.' },
      { front: 'Kya NAHI bachata?', back: '❌ Blacklist (bypass ho jaata) ❌ sirf frontend validation ❌ manual escaping ⚠️ ORM par andha bharosa (<code>raw()</code>/<code>query()</code> escape hatch vulnerable ho sakta hai).' },
      { front: 'Dynamic column/table naam kaise safe?', back: '<code>?</code> sirf <b>values</b> ke liye hai. Identifiers ke liye <b>whitelist</b> (allowed list) se validate karo — blacklist kabhi nahi.' },
      { front: 'Least privilege kya deta hai?', back: 'App user ko sirf <code>SELECT/INSERT/UPDATE/DELETE</code>; <code>DROP/ALTER/GRANT</code> nahi. Injection ho bhi jaye toh <code>DROP TABLE</code> fail — damage seemit.' },
    ],
  },

  /* ================= LEVEL 8: Backup & Replication ================= */
  {
    id: 'backup',
    icon: '💾',
    title: 'Backup & Replication — Neend ka Insurance',
    badge: 'Backup Baba',
    objectives: [
      '<b>mysqldump</b> aur binlog — logical backup + point-in-time recovery',
      '<b>Replication ≠ backup</b> — sabse mehnga galat-fehmi',
      '<b>Read replica</b> — reporting load ko alag karo',
      '<b>RTO / RPO</b> aur restore drill ki zaroorat',
    ],
    lesson: [
      `<h3>💾 Backup ke do hisse</h3>
       <pre># 1. Full logical backup (nightly)
mysqldump --single-transaction --routines --triggers \\
          --databases factory > factory_2026-07-21.sql

# Restore
mysql factory < factory_2026-07-21.sql</pre>
       <p><code>--single-transaction</code> zaroori hai — woh InnoDB par
       consistent snapshot leta hai <b>bina tables lock kiye</b>, isliye prod
       chalta rehta hai.</p>
       <pre># 2. Binary log (binlog) — backup ke BAAD ke saare changes
[mysqld]
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW</pre>
       <p><b>Dono milkar point-in-time recovery (PITR) dete hain:</b></p>
       <pre># Raat 11 baje ka dump restore karo
mysql factory < factory_2026-07-21.sql

# Phir binlog se 11 PM se 3:07 AM tak ke changes replay karo
# (us galat UPDATE se THEEK PEHLE tak)
mysqlbinlog --start-datetime="2026-07-21 23:00:00" \\
            --stop-datetime="2026-07-22 03:06:59" \\
            mysql-bin.000042 | mysql factory</pre>
       <p>Yehi woh cheez hai jisne Track 1 ke "312 rows" wale incident mein data
       bachaya tha.</p>`,
      `<h3>⚠️ Replication ≠ Backup</h3>
       <p>Yeh galat-fehmi sabse mehngi padti hai.</p>
       <pre>Primary  ──binlog stream──→  Replica
   |                            |
   └── UPDATE ... (bina WHERE) ─┴──→ turant replica par bhi! 😱</pre>
       <p><b>Replication changes ko copy karta hai — galtiyon ko bhi.</b> Galat
       <code>DELETE</code> milliseconds mein replica par bhi pahunch jaata hai.
       Replica <b>hardware failure</b> se bachata hai, <b>human error</b> se
       nahi.</p>
       <table>
         <tr><th></th><th>Replication</th><th>Backup</th></tr>
         <tr><td>Hardware fail</td><td>✅ bachata hai</td><td>✅</td></tr>
         <tr><td>Galat DELETE/UPDATE</td><td>❌ woh bhi copy ho gaya</td><td>✅ purani copy hai</td></tr>
         <tr><td>Ransomware/corruption</td><td>❌ replicate ho jaata hai</td><td>✅ (offline copy ho toh)</td></tr>
         <tr><td>"Pichhle mahine ka data"</td><td>❌ nahi hai</td><td>✅ purane dumps</td></tr>
       </table>
       <p><b>Read replica ka asli faayda:</b> reporting/dashboard queries replica
       par bhejo, taaki bhaari analytics primary ke transactional load ko slow na
       kare. (Dhyaan: replica thoda <b>lag</b> kar sakta hai — "abhi likha, abhi
       padha" wale case primary par hi rakho.)</p>`,
      `<h3>⏱️ RTO / RPO aur restore drill</h3>
       <ul>
         <li><b>RTO</b> (Recovery Time Objective) — kitni der mein wapas
             chalu karna hai? (jaise: 1 ghanta)</li>
         <li><b>RPO</b> (Recovery Point Objective) — kitna data kho sakte ho?
             (jaise: 5 minute)</li>
       </ul>
       <p>Sirf nightly dump = RPO 24 ghante (poore din ka data ja sakta hai).
       Dump + binlog = RPO lagbhag <b>zero</b>. Business decide karta hai ki
       kitna kharcha justified hai.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Ek company ka nightly
       <code>mysqldump</code> cron 8 mahine se chal raha tha aur logs mein
       "success" likhta tha. Jis din sach mein restore karna pada, pata chala ki
       dump file mein sirf <b>schema</b> tha, data nahi — kisi ne mahine pehle
       backup script mein <code>--no-data</code> flag debug karte waqt add kiya
       tha aur hataana bhool gaya. 8 mahine ke "successful" backups sab bekaar.
       <b>Sabak: untested backup koi backup nahi hai.</b> Har mahine ek restore
       drill chalao — dump ko ek alag DB par restore karo aur row counts verify
       karo. Yeh 20 minute ka kaam hai aur yehi asli backup hai.</div>`,
    ],
    stages: [
      {
        type: 'bins',
        title: 'Kaunsi cheez kis se bachati hai?',
        instructions: 'Har disaster ko us cheez mein daalo jo usse bachati hai.',
        bins: [
          { id: 'replica', label: '🔄 Replication bachata hai' },
          { id: 'backup', label: '💾 Backup (+ binlog) bachata hai' },
          { id: 'both', label: '🛡️ Dono chahiye' },
        ],
        items: [
          { text: 'Primary server ki disk fail ho gayi', bin: 'replica', explain: 'Replica turant promote kar sakte ho — yehi replication ka core use case (high availability).' },
          { text: 'Kisi ne bina WHERE ke DELETE chala diya', bin: 'backup', explain: 'Replication ne woh DELETE bhi copy kar diya. Sirf backup + binlog PITR bachayega.' },
          { text: 'Pichhle mahine ka data audit ke liye chahiye', bin: 'backup', explain: 'Replica sirf current state rakhta hai. Purane dumps hi history dete hain.' },
          { text: 'Poora data center down (region failure)', bin: 'both', explain: 'Dusre region ka replica + wahan backups — dono. HA aur DR alag cheezein hain.' },
          { text: 'Reporting queries primary ko slow kar rahi hain', bin: 'replica', explain: 'Read replica par analytics bhejo — primary transactional load ke liye free.' },
          { text: 'Table corrupt ho gayi (silent corruption)', bin: 'backup', explain: 'Corruption replicate ho sakta hai. Purani clean copy chahiye.' },
          { text: 'Prod DB par upgrade se pehle safety chahiye', bin: 'backup', explain: 'Upgrade se pehle fresh dump — rollback ka ekmatr bharosemand rasta.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Backup diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'backup',
        questions: [
          { q: 'Saare writes kahan jaate hain?', target: 'primary', explain: 'Primary — single writer. Replicas se sirf padha jaata hai.' },
          { q: 'Reporting/dashboard queries kahan bhejni chahiye?', target: 'replica', explain: 'Read replica — taaki bhaari analytics primary ka transactional load slow na kare.' },
          { q: 'Point-in-time recovery ke liye backup ke saath kya chahiye?', target: 'pitr', explain: 'Binlog — dump ke baad ke changes replay karke exact moment tak wapas ja sakte ho.' },
          { q: 'Sabse zyada ignore ki jaane wali cheez kaunsi hai?', target: 'testrestore', explain: 'Restore drill. Asli case: 8 mahine ke "successful" backups mein data hi nahi tha.' },
        ],
      },
      {
        type: 'incident',
        title: '🚨 3AM: "Restore karna padega"',
        instructions: 'Backup ka asli imtihaan. Sahi kadam chuno.',
        pager: '<b>#factory-alerts</b> — 3:14 AM<br>Ek cleanup script mein bug tha — usne <code>bx50Sessions</code> ki <b>saari</b> rows delete kar di (8 mahine ka data). Script 3:07 AM par chali thi.<br>Nightly backup 11:00 PM ka hai. Binlog enabled hai. Ek read replica bhi chalti hai.',
        start: 'first',
        nodes: {
          first: {
            text: 'Sabse pehla kadam?',
            choices: [
              { t: 'Cleanup script/cron turant band karo aur writes rok do — phir scope confirm karo (kaunsi tables, kitni rows, kis time)', good: true, next: 'replica', explain: 'Bleeding pehle roko. Script dobara chal gaya toh recovery ke beech mein aur damage ho jayega.' },
              { t: 'Turant replica se data copy kar lo', good: false, explain: 'Replica par bhi woh DELETE replicate ho chuka hai — wahan bhi rows nahi hain. Replication backup nahi hota.' },
              { t: 'Backup restore chalu kar do prod par', good: false, explain: 'Ruko — pehle scope aur time confirm karo, warna backup ke baad ka asli data bhi mit jayega.' },
              { t: 'Subah team ko batayenge', good: false, explain: 'Har guzarta minute naye writes laata hai jo recovery ko mushkil banate hain.' },
            ],
          },
          replica: {
            sitrep: 'Script band. Confirm: <code>bx50Sessions</code> khaali hai. Baaki tables theek hain. Koi socha "replica se le lenge" —',
            text: 'Replica se data mil jayega?',
            choices: [
              { t: 'Nahi — DELETE replica par bhi replicate ho chuka hai. Backup + binlog hi raasta hai', good: true, next: 'plan', explain: 'Bilkul sahi. Replication changes copy karta hai, galtiyon ko bhi. Yeh sabse mehngi galat-fehmi hai.' },
              { t: 'Haan, replica hamesha ek copy rakhta hai', good: false, explain: 'Replica ek <b>live mirror</b> hai, backup nahi. DELETE milliseconds mein wahan bhi pahunch gaya.' },
              { t: 'Haan, agar replication lag ho toh shayad', good: false, explain: 'Lag par bharosa nahi kar sakte — aur 7 minute ho chuke hain, woh kabhi ka apply ho gaya. (Waise agar lag hota toh replica ko turant rok dena ek emergency trick hai.)' },
            ],
          },
          plan: {
            sitrep: 'Plan: 11 PM ka dump + binlog se 3:06:59 AM tak replay. Sawal yeh hai ki restore <b>kahan</b> karein.',
            text: 'Restore kaise karoge?',
            choices: [
              { t: 'Ek alag (staging) server par dump restore karo, binlog 3:06:59 tak replay karo, row counts verify karo — phir sirf bx50Sessions ka data prod mein wapas import karo', good: true, next: 'verify', explain: 'Prod par poora restore baaki tables ka naya data uda dega. Alag jagah sach banao, phir sirf affected table import karo.' },
              { t: 'Seedha prod par poora dump restore kar do', good: false, explain: '11 PM ke baad ke saare naye test results, builds, sab chale jayenge. Ek problem ko theek karke doosri badi bana doge.' },
              { t: 'Binlog se poora replay prod par chala do', good: false, explain: 'Woh galat DELETE bhi binlog mein hai — bina stop-datetime ke replay usse dobara chala dega.' },
            ],
          },
          verify: {
            sitrep: 'Staging par restore chal raha hai. Ek engineer ne poocha "row count kitna hona chahiye?"',
            text: 'Verify kaise karoge ki restore sahi hai?',
            choices: [
              { t: 'Staging par row count + kuch known rows check karo, aur monitoring/app logs se expected count cross-verify karo — import se pehle', good: true, next: 'prevent', explain: 'Restore ka verification import se <b>pehle</b> hota hai. Ek baar prod mein galat data gaya toh do problems ho jayengi.' },
              { t: 'Import karke dekhte hain, dashboard theek laga toh theek', good: false, explain: 'Dashboard "theek dikhna" verification nahi hai — aadha data bhi theek dikh sakta hai.' },
              { t: 'Verify ki zaroorat nahi, mysqldump bharosemand hai', good: false, explain: 'Yehi soch us company ko le doobi jiske 8 mahine ke backups mein data hi nahi tha.' },
            ],
          },
          prevent: {
            sitrep: '4:50 AM — data wapas, counts verified, factory chalu. Ab postmortem.',
            text: 'Dobara na ho — kya lagoge?',
            choices: [
              { t: 'Monthly restore drill (alag DB par restore + row count verify), backup mein data hone ka automated check, aur cleanup scripts ko soft-delete + dry-run + LIMIT ke saath likho', good: true, next: 'end', explain: 'Teen layer: backup ka bharosa (drill), detection (automated check), aur root cause (destructive script ka design).' },
              { t: 'Backup roz do baar lo', good: false, explain: 'Zyada backups faayda dete hain, par agar woh untested hain toh do gune bekaar backups hain. Pehle bharosa banao.' },
              { t: 'Cleanup script hamesha ke liye band kar do', good: false, explain: 'Zaroori kaam band karna fix nahi hai. Use surakshit banao — dry-run, LIMIT, soft delete, aur review.' },
            ],
          },
          end: {
            end: true,
            text: 'Incident band — data wapas, drill schedule ho gayi 🧯',
            summary: `<b>Kya seekha:</b>
              <ul>
                <li><b>Replication ≠ backup</b> — DELETE replica par bhi turant chala jaata hai. Replica hardware failure ke liye hai, human error ke liye nahi.</li>
                <li><b>PITR = dump + binlog</b> — <code>--stop-datetime</code> se galat statement se <i>theek pehle</i> tak replay karo.</li>
                <li><b>Staging par restore, prod mein sirf affected table import</b> — poora restore backup ke baad ka asli data uda deta hai.</li>
                <li><b>Verify import se pehle</b> — row counts aur known rows.</li>
                <li><b>Untested backup = koi backup nahi.</b> Monthly restore drill 20 minute ka kaam hai aur yehi asli backup hai.</li>
              </ul>`,
          },
        },
      },
      {
        type: 'quiz',
        title: 'Backup Quick-fire',
        questions: [
          {
            q: 'Read replica hai. Kya ab backup ki zaroorat hai?',
            choices: [
              'Haan — replication galat DELETE/UPDATE bhi copy kar deta hai, aur purana data bhi nahi rakhta',
              'Nahi, replica hi backup hai',
              'Nahi, agar do replicas hon',
              'Sirf tab jab data zyada ho',
            ],
            answer: 0,
            explain: 'Sabse mehngi galat-fehmi. Replica = <b>HA</b> (hardware failure), backup = <b>recovery</b> (human error, corruption, history).',
          },
          {
            q: 'Point-in-time recovery ke liye kya-kya chahiye?',
            choices: [
              'Full backup (dump) + binary log — dump restore karke binlog se galat statement se pehle tak replay',
              'Sirf nightly dump',
              'Sirf binlog',
              'Sirf replica',
            ],
            answer: 0,
            explain: 'Dump = base, binlog = uske baad ke changes. <code>--stop-datetime</code> se exact moment tak.',
          },
          {
            q: '<code>mysqldump --single-transaction</code> kyun lagate hain?',
            choices: [
              'InnoDB par bina tables lock kiye consistent snapshot deta hai — prod chalta rehta hai',
              'Dump chhota ho jaata hai',
              'Dump tez ho jaata hai',
              'Password ki zaroorat nahi padti',
            ],
            answer: 0,
            explain: 'Iske bina dump lock le sakta hai ya inconsistent snapshot de sakta hai (aadhi table pehle, aadhi baad mein).',
          },
          {
            q: 'Backup strategy ka sabse zaroori hissa kaunsa hai?',
            choices: [
              'Regular restore drill — untested backup koi backup nahi hai',
              'Backup ki frequency',
              'Backup ka storage location',
              'Backup file ka compression',
            ],
            answer: 0,
            explain: 'Asli case: 8 mahine ke "successful" backups mein <code>--no-data</code> ki wajah se sirf schema tha. Restore drill hi yeh pakadti.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Backup & HA',
      instructions: 'Ops round. 🎤',
      questions: [
        {
          q: '"Hamare paas read replica hai, backup ki zaroorat kya hai?"',
          choices: [
            'Replica <b>galtiyan bhi replicate</b> karta hai — galat DELETE milliseconds mein wahan bhi pahunch jaata hai. Replica HA (hardware failure) deta hai; backup recovery (human error, corruption, purana data) deta hai. Dono chahiye',
            'Sahi hai, replica kaafi hai',
            'Backup sirf compliance ke liye chahiye',
            'Replica se roz dump le lenge, bas',
          ],
          answer: 0,
          explain: 'Yeh sawal seedha soch ka test hai. <b>HA aur DR alag cheezein hain</b> — yeh line bolna zaroori hai.',
        },
        {
          q: 'Interviewer: "RTO aur RPO kya hai?"',
          choices: [
            '<b>RTO</b> = kitni der mein wapas chalu karna hai (downtime ki limit). <b>RPO</b> = kitna data kho sakte ho (data loss ki limit). Sirf nightly dump = RPO 24 ghante; dump + binlog = RPO lagbhag zero',
            'RTO = restore time, RPO = replica time',
            'Dono same hain',
            'RTO = read timeout, RPO = replication offset',
          ],
          answer: 0,
          explain: 'Aur ek line aur jodo: "yeh business decide karta hai, main uske hisaab se architecture chunta hoon" — cost/benefit ki samajh dikhti hai.',
        },
        {
          q: '🎛️ Interviewer: "Restore drill ka concept dikhao — ek table ka snapshot lo aur wapas lao."',
          terminal: {
            title: 'Interview hands-on — backup concept',
            goal: '🎛️ <b>Hands-on (drill ka mini version):</b> <b>(1)</b> <code>operators</code> ka "snapshot" banao — <code>CREATE TABLE operators_backup (opId VARCHAR(20) PRIMARY KEY, name VARCHAR(100), shift VARCHAR(10));</code> aur usme kam se kam do operators <code>INSERT</code> karo. <b>(2)</b> Ab "disaster": <code>BEGIN;</code> phir <code>DELETE FROM operators;</code> — count dekho. <b>(3)</b> <code>ROLLBACK</code> se wapas lao (asli duniya mein yeh backup restore hota). <b>(4)</b> Verify karo ki data wapas hai aur backup table bhi maujood hai.',
            tasks: [
              { text: 'operators_backup table banao', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'operators_backup') },
              { text: 'Backup mein 2+ rows daalo', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'operators_backup'); return !!k && s.db.tables[k].rows.length >= 2; } },
              { text: 'BEGIN + DELETE FROM operators (disaster)', check: s => s.history.some(h => /^delete\s+from\s+operators$/i.test(h)) },
              { text: 'ROLLBACK se recovery', check: s => !!s.rolledBack },
              { text: 'Verify: operators wapas hain', check: s => s.db.tables.operators.rows.length >= 5 && s.history.filter(h => /count\s*\(\s*\*\s*\)/i.test(h) && /operators/i.test(h)).length >= 2 },
            ],
            db: SG.factoryDB(),
            success: s => {
              const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'operators_backup');
              return !!k && s.db.tables[k].rows.length >= 2 && !!s.rolledBack
                && s.db.tables.operators.rows.length >= 5
                && s.history.some(h => /^delete\s+from\s+operators$/i.test(h));
            },
            successText: '✅ Yeh transaction-scale par wahi kahani hai jo backup-scale par hoti hai: <b>ek safe copy + recovery ka rasta + verification</b>. Asli duniya mein ROLLBACK ki jagah <code>mysqldump</code> restore + binlog replay hota hai — par soch bilkul yehi hai. Aur sabse zaroori hissa woh aakhri <code>COUNT(*)</code> hai: <b>verify kiye bina recovery poori nahi hoti.</b>',
            hints: [
              'CREATE TABLE operators_backup (opId VARCHAR(20) PRIMARY KEY, name VARCHAR(100), shift VARCHAR(10));',
              "INSERT INTO operators_backup (opId, name, shift) VALUES ('OP-101','Ravi Kumar','day'), ('OP-102','Priya Sharma','night');",
              'SELECT COUNT(*) FROM operators;   phir   BEGIN;   phir   DELETE FROM operators;',
              'SELECT COUNT(*) FROM operators;   ← 0!   phir   ROLLBACK;',
              'SELECT COUNT(*) FROM operators;   ← wapas 5',
            ],
          },
        },
      ],
    },
    success: [
      'Main mysqldump + binlog se point-in-time recovery samjha sakta hoon',
      'Main bata sakta hoon ki replication backup kyun nahi hai',
      'Main read replica ka sahi use-case (reporting offload) jaanta hoon',
      'Main RTO/RPO define kar sakta hoon aur restore drill ki zaroorat samjhata hoon',
    ],
    homework: `<p>Asli backup-restore drill karo:</p>
      <pre># 1. Full backup
mysqldump --single-transaction --routines --triggers \\
  -u root -p --databases factory > factory_backup.sql

ls -lh factory_backup.sql        # size dekho — 1KB hai toh kuch galat hai!
grep -c "INSERT INTO" factory_backup.sql   # data hai ya sirf schema?

# 2. "Disaster"
mysql -u root -p -e "DROP DATABASE factory;"

# 3. Restore
mysql -u root -p < factory_backup.sql

# 4. VERIFY (yeh step sabse zaroori hai)
mysql -u root -p factory -e "
  SELECT 'operators' AS t, COUNT(*) FROM operators
  UNION ALL SELECT 'bx50Builds', COUNT(*) FROM bx50Builds
  UNION ALL SELECT 'bx50Data',   COUNT(*) FROM bx50Data;"

# 5. Binlog on karo (PITR ke liye) — my.cnf mein:
#    log_bin = /var/log/mysql/mysql-bin.log
#    binlog_format = ROW
mysql -u root -p -e "SHOW BINARY LOGS;"</pre>
      <p>✅ Self-check: Dump file mein <code>INSERT INTO</code> lines thi (sirf CREATE TABLE nahi)? Restore ke baad row counts wahi the? Yeh 5-step drill mahine mein ek baar karo — yehi asli backup hai.</p>`,
    cards: [
      { front: 'Replication vs backup?', back: '<b>Replication = HA</b> (hardware failure). <b>Backup = recovery</b> (human error, corruption, purana data). Replica galat DELETE bhi <b>turant copy</b> kar leta hai — woh backup nahi hai.' },
      { front: 'Point-in-time recovery kaise?', back: '<b>Full dump restore</b> + <b>binlog replay</b> galat statement se theek pehle tak: <code>mysqlbinlog --stop-datetime="…" | mysql db</code>.' },
      { front: 'mysqldump ka zaroori flag?', back: '<code>--single-transaction</code> — InnoDB par <b>bina lock</b> ke consistent snapshot. Iske bina prod lock ho sakta hai ya dump inconsistent aa sakta hai.' },
      { front: 'RTO vs RPO?', back: '<b>RTO</b> = kitni der mein wapas chalu (downtime limit). <b>RPO</b> = kitna data kho sakte ho (data-loss limit). Nightly dump = RPO 24h; dump + binlog ≈ 0.' },
      { front: 'Backup strategy ka sabse zaroori hissa?', back: '<b>Restore drill.</b> Untested backup = koi backup nahi. Asli case: 8 mahine ke "successful" dumps mein <code>--no-data</code> ki wajah se sirf schema tha.' },
    ],
  },

  /* ================= LEVEL 9: FINAL BOSS ================= */
  {
    id: 'boss3',
    icon: '👑',
    title: 'Final Boss: 3AM — Database Down',
    badge: 'Database Mahaguru',
    objectives: [
      'Sab kuch ek raat mein — diagnose, fix, optimize, harden',
      'Transaction ke andar surgical repair',
      'EXPLAIN + index se speed wapas',
      'Track 3 ka certificate — Database Mahaguru! 👑',
    ],
    lesson: [
      `<h3>🚨 3:07 AM</h3>
       <blockquote>Factory ka dashboard 500 de raha hai. Test benches "database
       timeout" dikha rahe hain. Do shift ka kaam ruka hai. Tum on-call ho.</blockquote>
       <p>Tumhare paas ab poora shastra hai:</p>
       <table>
         <tr><th>Sawal</th><th>Tool</th></tr>
         <tr><td>Data galat hai?</td><td>SELECT se verify, anti-join se orphans</td></tr>
         <tr><td>Fix karna hai?</td><td>BEGIN → change → verify → COMMIT</td></tr>
         <tr><td>Slow hai?</td><td>EXPLAIN → index → EXPLAIN</td></tr>
         <tr><td>Galat data ghusa kaise?</td><td>constraint / FK missing</td></tr>
         <tr><td>Injection?</td><td>prepared statements + least privilege</td></tr>
         <tr><td>Data gaya?</td><td>dump + binlog PITR</td></tr>
       </table>
       <p>Aaj sirf ek cheez yaad rakho: <b>panic mat karo, measure karo.</b>
       Har kadam par pehle dekho, phir badlo, phir verify karo.</p>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'Incident playbook par ungli rakho',
        instructions: 'Final boss diagram — sahi kadam click karo.',
        visual: 'boss3',
        questions: [
          { q: 'Data badalne se pehle kya lagate ho?', target: 'txn', explain: 'BEGIN — transaction ka seatbelt. Verify karke COMMIT, galat laga toh ROLLBACK.' },
          { q: 'Slow query ka pehla kadam?', target: 'idx', explain: 'EXPLAIN se measure, phir index, phir EXPLAIN se proof.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ FINAL BOSS: Poori raat, ek terminal',
        instructions: 'Chaar kadam: diagnose → repair (transaction mein) → optimize → harden.',
        goal: '3:07 AM. <b>(1) DIAGNOSE:</b> Dashboard ka count galat hai — <code>bx50Sessions</code> mein aise sessions hain jinka build exist nahi karta. Anti-join se unhe dhoondo (<code>LEFT JOIN bx50Builds … WHERE b.buildNum IS NULL</code>). <b>(2) REPAIR:</b> <code>BEGIN</code> karo, un orphan sessions ko <code>DELETE</code> karo (<code>WHERE buildNum = 1099</code>), <code>SELECT COUNT(*)</code> se verify karo, phir <code>COMMIT</code>. <b>(3) OPTIMIZE:</b> <code>EXPLAIN</code> se dekho <code>bx50Sessions.userId</code> par kya chal raha hai, phir uspar index banao, phir <code>EXPLAIN</code> dobara. <b>(4) HARDEN:</b> Ek naya <code>sessionAudit</code> table banao jisme <code>id</code> INT PRIMARY KEY AUTO_INCREMENT, <code>sessionId</code> INT NOT NULL, <code>note</code> VARCHAR(200) NOT NULL — constraints ke saath, taaki aadha-adhoora data ghus hi na sake.',
        tasks: [
          { text: '1. DIAGNOSE — anti-join se orphans dhoondo', check: s => s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)) },
          { text: '2. REPAIR — BEGIN se transaction shuru', check: s => s.history.some(h => /^(begin|start\s+transaction)$/i.test(h)) },
          { text: '2. REPAIR — orphan sessions delete karo', check: s => !s.db.tables.bx50Sessions.rows.some(r => Number(r.buildNum) === 1099) },
          { text: '2. REPAIR — COMMIT se pakka karo', check: s => !!s.committed },
          { text: '3. OPTIMIZE — EXPLAIN (do baar) + index', check: s => (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'userid') && s.history.filter(h => /^explain/i.test(h)).length >= 2 },
          { text: '4. HARDEN — sessionAudit table constraints ke saath', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'sessionaudit') },
        ],
        db: SG.factoryDB(db => {
          db.tables.bx50Sessions.rows.push(
            { id: 9, userId: 'OP-101', buildNum: 1099, startDate: '2026-06-30 09:00:00', duration: 1500000 },
            { id: 10, userId: 'OP-102', buildNum: 1099, startDate: '2026-06-30 11:00:00', duration: 2100000 },
          );
        }),
        success: s => {
          const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'sessionaudit');
          if (!k) return false;
          const t = s.db.tables[k];
          const note = t.columns.find(c => c.name.toLowerCase() === 'note');
          return !s.db.tables.bx50Sessions.rows.some(r => Number(r.buildNum) === 1099)
            && !!s.committed
            && !!note && note.notNull
            && (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'userid')
            && s.history.filter(h => /^explain/i.test(h)).length >= 2
            && s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h));
        },
        successText: `👑 <b>RAAT BACH GAYI — AUR TUM DATABASE MAHAGURU BAN GAYE.</b><br><br>
          Dekho tumne aaj kya kiya, kadam dar kadam:<br>
          <b>1. Diagnose</b> — andaza nahi lagaya. Anti-join se do orphan sessions pakde jo build 1099 ko point kar rahe the (jo exist hi nahi karta) — yehi count mismatch ki jad thi.<br>
          <b>2. Repair</b> — seedha DELETE nahi maara. <code>BEGIN</code> → delete → <code>COUNT</code> se verify → <code>COMMIT</code>. Agar number galat aata toh <code>ROLLBACK</code> ek shabd door tha.<br>
          <b>3. Optimize</b> — EXPLAIN se measure kiya, index lagaya, phir <b>dobara EXPLAIN</b> se proof liya. Teesra kadam hi zyadatar log bhool jaate hain.<br>
          <b>4. Harden</b> — <code>NOT NULL</code> constraints ke saath table banayi, taaki agli baar galat data <b>ghus hi na sake</b>.<br><br>
          Yeh chaar kadam — <b>measure → fix safely → verify → prevent</b> — sirf SQL nahi hai. Yeh production engineering hai. Tumne Track 1 mein query likhna seekha, Track 2 mein tables jodna aur tez karna, aur Track 3 mein <b>us data ki zimmedari lena</b> jispar log apna kaam chalate hain.<br><br>
          🎓 <b>Database Mahaguru</b> — certificate le lo. Aur haan: <b>ab prod par UPDATE se pehle hamesha <code>BEGIN</code> likhna. Hamesha.</b> 🙏`,
        hints: [
          'DIAGNOSE: SELECT s.id, s.buildNum FROM bx50Sessions s LEFT JOIN bx50Builds b ON s.buildNum = b.buildNum WHERE b.buildNum IS NULL;',
          'REPAIR: BEGIN;   phir   DELETE FROM bx50Sessions WHERE buildNum = 1099;',
          'REPAIR: SELECT COUNT(*) FROM bx50Sessions;   ← verify, phir   COMMIT;',
          "OPTIMIZE: EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';   phir   CREATE INDEX idx_sess_user ON bx50Sessions(userId);",
          "OPTIMIZE (dobara chalao, ab type badla hoga): EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';",
          'HARDEN: CREATE TABLE sessionAudit (id INT PRIMARY KEY AUTO_INCREMENT, sessionId INT NOT NULL, note VARCHAR(200) NOT NULL);',
        ],
      },
      {
        type: 'quiz',
        title: 'Final Round — poora safar',
        questions: [
          {
            q: 'Prod par data badalne ka sahi tareeka (ek line mein)?',
            choices: [
              'BEGIN → change → SELECT se verify → COMMIT (galat laga toh ROLLBACK)',
              'Seedha UPDATE, backup toh hai',
              'Pehle table copy banao',
              'DBA se karwao',
            ],
            answer: 0,
            explain: 'Track 1 mein SELECT-first seekha, Track 3 mein transaction. Dono milkar yeh ek line banti hai — aur yehi poori app ka sabse zaroori sabak hai.',
          },
          {
            q: 'Slow query ka poora cycle?',
            choices: [
              'EXPLAIN (measure) → index/query fix → EXPLAIN dobara (proof)',
              'Index laga do',
              'Server upgrade',
              'Cache laga do',
            ],
            answer: 0,
            explain: 'Measure → fix → measure. Bina teesre kadam ke tumhe kabhi pata nahi chalega ki fix ne sach mein kaam kiya.',
          },
          {
            q: 'Galat data DB mein ghusne se rokne ka sabse pakka tarika?',
            choices: [
              'DB-level constraints — NOT NULL, UNIQUE, FOREIGN KEY, CHECK. App ke kai versions aur scripts sab DB par likhte hain',
              'App mein validation',
              'Code review',
              'Documentation',
            ],
            answer: 0,
            explain: 'App validation = UX (turant feedback). DB constraint = <b>aakhri deewar</b>, sabke liye lagu.',
          },
          {
            q: 'Tumne is poori app se sabse bada sabak kya seekha?',
            choices: [
              'Andaza mat lagao — verify karo. Har kadam par: pehle dekho (SELECT/EXPLAIN), phir badlo (transaction mein), phir verify karo',
              'SQL ka syntax yaad karna',
              'Sabse tez query likhna',
              'Har column par index lagana',
            ],
            answer: 0,
            explain: 'Har war story isi ek baat par khatam hui: <code>= NULL</code>, INNER JOIN ka silent drop, NOT IN ka khaali result, bina WHERE ka UPDATE, untested backup — sab tab pakde ja sakte the jab kisi ne verify kiya hota. 🙏',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Final',
      instructions: 'Aakhri round. Ab tum tayyar ho. 🎤',
      questions: [
        {
          q: '"Apne SQL experience ke baare mein batao."',
          choices: [
            'Queries se reports banata hoon (JOIN, GROUP BY, window functions), schema design karta hoon constraints aur normalization ke saath, EXPLAIN se performance tune karta hoon, aur production par transactions + prepared statements + backup verification ka anushasan follow karta hoon',
            'Mujhe SELECT aur JOIN aata hai',
            'Main sab kuch jaanta hoon',
            'Main ORM use karta hoon, SQL ki zaroorat nahi padti',
          ],
          answer: 0,
          explain: 'Chaar layer: <b>query</b> → <b>design</b> → <b>performance</b> → <b>production discipline</b>. Aakhri wala hi senior aur junior ka farak hai.',
        },
        {
          q: 'Interviewer: "Tum production database par sabse zyada kis cheez ka dhyaan rakhte ho?"',
          choices: [
            'Ki main andaza na lagaun — data badalne se pehle SELECT/EXPLAIN se verify karta hoon, transaction mein karta hoon, aur baad mein rows-affected check karta hoon. Aur backup ka restore drill karta hoon',
            'Ki queries tez chalein',
            'Ki code saaf ho',
            'Ki naye features jaldi ban jayein',
          ],
          answer: 0,
          explain: 'Yeh jawab har war story ka nichod hai. Speed sikhayi ja sakti hai; <b>discipline</b> woh cheez hai jiske liye hire karte hain.',
        },
        {
          q: '🎛️ Aakhri hands-on: "Ek complete workflow dikhao."',
          terminal: {
            title: 'Final interview hands-on',
            goal: '🎛️ <b>Final hands-on — poora workflow:</b> <b>(1)</b> Ek reporting query likho: har operator ka naam + uske sessions ka count + total duration, <b>zero wale operators bhi</b> (LEFT JOIN + <code>COUNT(s.id)</code> + <code>GROUP BY</code>). <b>(2)</b> <code>EXPLAIN</code> se plan check karo. <b>(3)</b> Ek transaction mein data theek karo: <code>BEGIN</code> → kisi operator ka <code>station</code> update karo (WHERE ke saath!) → verify → <code>COMMIT</code>. <b>(4)</b> Aakhir mein anti-join se data integrity check karo.',
            tasks: [
              { text: 'Zero-inclusive reporting query', check: s => s.history.some(h => /left\s+join/i.test(h) && /count\s*\(\s*\w+\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h)) },
              { text: 'EXPLAIN se plan check', check: s => s.history.some(h => /^explain/i.test(h)) },
              { text: 'BEGIN → UPDATE (WHERE ke saath) → COMMIT', check: s => !!s.committed && s.history.some(h => /^update\s+operators\s+set.*where/i.test(h)) },
              { text: 'Anti-join se integrity check', check: s => s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /left\s+join/i.test(h) && /count\s*\(\s*\w+\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h))
              && s.history.some(h => /^explain/i.test(h))
              && !!s.committed
              && s.history.some(h => /^update\s+operators\s+set.*where/i.test(h))
              && s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)),
            successText: '👑 <b>Poora workflow, ek terminal mein.</b> Report banayi (zero-inclusive, kyunki tum jaante ho <code>COUNT(*)</code> jhoot bolta), plan verify kiya, data transaction ke andar badla (WHERE ke saath!), aur integrity check kiya. Yeh chaar cheezein ek saath karna hi <b>Database Mahaguru</b> hona hai. Ab jao — asli MySQL install karo, asli data lo, aur yahi anushasan wahan chalao. 🎓🙏',
            hints: [
              'SELECT o.name, COUNT(s.id) AS sessions, SUM(s.duration) AS total_ms FROM operators o LEFT JOIN bx50Sessions s ON o.opId = s.userId GROUP BY o.name ORDER BY sessions DESC;',
              "EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';",
              "BEGIN;  UPDATE operators SET station = 'BMS-line-2' WHERE opId = 'OP-105';  SELECT * FROM operators WHERE opId = 'OP-105';  COMMIT;",
              'SELECT s.id FROM bx50Sessions s LEFT JOIN bx50Builds b ON s.buildNum = b.buildNum WHERE b.buildNum IS NULL;',
            ],
          },
        },
      ],
    },
    success: [
      'Main production incident ko diagnose → repair → optimize → harden kar sakta hoon',
      'Main transaction ke andar surgical data repair kar sakta hoon',
      'Main EXPLAIN + index se performance measure karke theek kar sakta hoon',
      'Main Database Mahaguru certificate le chuka hoon 👑',
    ],
    homework: `<p><b>Aakhri homework — apna khud ka project banao:</b></p>
      <pre># 1. Koi ek asli cheez chuno jo tum track karna chahte ho
#    (kitaabein, kharche, workouts, apne ghar ke devices — kuch bhi)

# 2. Schema design karo — normalized, constraints ke saath
CREATE TABLE ... (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ... NOT NULL,
  ... UNIQUE,
  FOREIGN KEY (...) REFERENCES ...(...)
);

# 3. Migration file mein likho (up + down), git mein daalo

# 4. 1000+ rows ka test data banao (recursive CTE se)

# 5. 5 reporting queries likho — JOIN, GROUP BY, window function ke saath

# 6. Har ek par EXPLAIN chalao, index lagao, dobara EXPLAIN

# 7. Backup lo, DROP DATABASE karo, restore karo, row counts verify karo

# 8. Ek chhota Node/Python script likho jo prepared statements use kare</pre>
      <p>Yeh aath kadam is poori app ka nichod hain. Ek baar khud kar loge toh
      SQL "seekha hua" nahi, <b>tumhara</b> ho jayega. 🙏</p>
      <p>✅ Self-check: Kya tumne step 7 (backup + restore + verify) sach mein kiya? Zyadatar log wahi skip karte hain — aur wahi sabse zaroori hai.</p>`,
    cards: [
      { front: 'Production data badalne ka niyam?', back: '<b>BEGIN → change → SELECT se verify → COMMIT</b> (galat laga toh <code>ROLLBACK</code>). Aur pehle wahi <code>WHERE</code> ek SELECT par test karo.' },
      { front: 'Incident playbook (4 kadam)?', back: '1) <b>Diagnose</b> (SELECT/EXPLAIN/anti-join) → 2) <b>Repair</b> (transaction mein, verify ke saath) → 3) <b>Optimize</b> (index + dobara EXPLAIN) → 4) <b>Harden</b> (constraints/FK).' },
      { front: 'Slow query ka cycle?', back: '<b>EXPLAIN → fix → EXPLAIN.</b> Measure kiye bina fix andaza hai, aur dobara measure kiye bina fix unverified hai.' },
      { front: 'Galat data rokne ki aakhri deewar?', back: '<b>DB-level constraints</b> — NOT NULL, UNIQUE, FOREIGN KEY, CHECK. App validation UX ke liye hai; DB constraint sabke liye (har version, har script, har manual query).' },
      { front: 'Poori app ka sabse bada sabak?', back: '<b>Andaza mat lagao — verify karo.</b> <code>= NULL</code>, INNER JOIN ka silent drop, <code>NOT IN</code> ka khaali result, bina WHERE ka UPDATE, untested backup — har war story yahin aake khatam hoti hai. 🙏' },
    ],
  },

]);

/* =====================================================================
   SQL Gurukul — Track 3 ka naya level (append-only)
   Row Locks & Deadlocks
   ===================================================================== */

SG.registerLevelsAfter('advanced', 'isolation', [
{
  id: 'locking',
  icon: '🔒',
  title: 'Row Locks & Deadlock — do transactions, ulta kram',
  badge: 'Lock Lohar',
  objectives: [
    '<b>Row lock kab lagta hai aur kab tak rehta hai</b> — statement par nahi, COMMIT tak',
    '<b>SELECT … FOR UPDATE</b> — read-modify-write ka sahi tareeka',
    '<b>Deadlock kaise banta hai</b> — cycle, aur InnoDB usse kaise todta hai',
    '<b>Ilaaj:</b> consistent lock order, chhoti transactions, aur ERROR 1213 par retry',
  ],
  lesson: [
    `<h3>😰 Dard: "Har shaam 6 baje checkout par ERROR 1213 ki baarish"</h3>
     <p>Factory ka shift-change 6 baje hota hai. Do alag services ek hi waqt par
     <code>adcTestResult</code> update karti thin — ek progress badhati thi, doosri
     failureType likhti thi. Har shaam logs mein:</p>
     <pre>ERROR 1213 (40001): Deadlock found when trying to get lock;
                    try restarting transaction</pre>
     <p>Team ne pehle socha ki database "overload" hai. RAM badhayi, connections badhaye —
     kuch nahi badla. Kyunki yeh load ka problem tha hi nahi.</p>
     <div class="war-story"><b>⚡ Asli wajah do lines ki thi.</b> Service A apni rows
     <code>ORDER BY id</code> se update karti thi (1, 2, 3…). Service B apni list
     <code>ORDER BY buildNum DESC</code> se banati thi — yaani <b>ulta kram</b> (3, 2, 1).
     A ne row 1 lock kiya aur row 2 maanga; B ne row 2 lock kiya aur row 1 maanga.
     Dono ek doosre ka intezaar — <b>cycle</b>. InnoDB ne cycle detect karke ek ko maar diya.
     Fix: dono services ko <b>ek hi kram</b> mein lock lene par majboor karna. Ek
     <code>ORDER BY</code> badalne se shaam ki baarish band ho gayi.</div>`,

    `<h3>🪜 Solutions ki seedhi</h3>
     <p><b>❌ Naive: "Retry loop laga do, ho jayega"</b><br>
     Retry <b>zaroori</b> hai (neeche dekho) par akela ilaaj nahi. Agar deadlock har
     minute ho raha hai toh retry sirf usse chhupata hai — latency badhti hai, throughput
     girta hai, aur kabhi-kabhi retry bhi deadlock ho jaata hai.</p>

     <p><b>❌ Aur bura: "Isolation level ko READ UNCOMMITTED kar do"</b><br>
     Deadlock <b>write locks</b> se aata hai, read se nahi. Isolation girane se dirty reads
     mil jaayenge par deadlock rahega hi. Tumne correctness bech di aur kuch khareeda nahi.</p>

     <p><b>⚠️ Better: "Transaction chhoti karo"</b><br>
     Sahi disha — lock <code>COMMIT</code> tak rehta hai, toh chhoti transaction = kam
     window = kam takraav. Par agar kram ulta hai toh chhoti transactions bhi
     kabhi-kabhi takrayengi.</p>

     <p><b>✅ Real: hamesha ek hi kram mein lock lo</b></p>
     <pre>-- DONO services yeh niyam maanein:
BEGIN;
SELECT * FROM adcTestResult
  WHERE id IN (1, 2, 3)
  ORDER BY id                 -- ← hamesha wahi kram, har jagah
  FOR UPDATE;
… updates …
COMMIT;</pre>
     <p>Agar har transaction rows ko <b>badhte hue id</b> ke kram mein lock kare, toh cycle
     ban hi nahi sakta — kyunki cycle ke liye kisi ko peeche jaana padega.</p>`,

    `<h3>⚖️ Nayi musibat: deadlock ko "rok" nahi sakte, sirf durlabh bana sakte ho</h3>
     <p>Consistent order se deadlock bahut kam ho jaate hain — <b>zero</b> nahi.
     Gap locks, secondary index locks, aur alag-alag query plans milkar kabhi bhi
     ek naya cycle bana sakte hain.</p>
     <p>Isliye <b>ERROR 1213 ko ek normal, expected condition maano</b>, exception nahi:</p>
     <pre>for (attempt = 1; attempt &lt;= 3; attempt++) {
  try { doTransaction(); break; }
  catch (e) {
    if (e.errno !== 1213) throw e;        // sirf deadlock retry karo
    sleep(random(50, 200) * attempt);     // backoff + jitter
  }
}</pre>
     <p>Do baatein zaroori: sirf <b>1213</b> par retry karo (1062 duplicate ya 1048 NOT NULL
     par retry karne se kuch nahi milega), aur <b>jitter</b> lagao — warna dono
     transactions ek saath retry karke phir takrayengi.</p>
     <p>Aur debugging ke liye ek hi command yaad rakho —
     <code>SHOW ENGINE INNODB STATUS</code>. Uske <b>LATEST DETECTED DEADLOCK</b> section mein
     dono transactions ki exact queries hoti hain. Wahi batata hai ki kram kahan ulta tha.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🖥️ Mission: deadlock khud banao, phir usse theek karo',
      instructions: 'Ek doosri session (Session B) background mein chal rahi hai. Uske saath jaan-boojh ke takrao, phir sahi kram se dobara karo.',
      goal: 'Terminal mein tum <b>Session A</b> ho. <b>Session B</b> ek doosra service instance hai — ' +
        'usse chalane ke liye <code>session-b</code> commands hain.<br><br>' +
        '<b>(1)</b> <code>BEGIN</code> karo, phir row 1 lock karo: ' +
        '<code>UPDATE adcTestResult SET progress = 50 WHERE id = 1;</code><br>' +
        '<b>(2)</b> <code>session-b lock 2</code> — B ne row 2 lock kar liya<br>' +
        '<b>(3)</b> <code>session-b wants 1</code> — ab B row 1 maang raha hai (tumhare paas hai) ⏳<br>' +
        '<b>(4)</b> Ab tum row 2 maango: <code>UPDATE adcTestResult SET progress = 60 WHERE id = 2;</code> ' +
        '— <b>cycle ban gaya, ERROR 1213</b><br>' +
        '<b>(5)</b> <code>ROLLBACK</code> karo aur <code>session-b reset</code> chalao<br>' +
        '<b>(6)</b> Ab sahi tareeka: <code>BEGIN</code>, phir <code>SELECT … WHERE id IN (1,2) ORDER BY id FOR UPDATE;</code>, ' +
        'phir dono update karo, phir <code>COMMIT</code>',
      db: SG.factoryDB(),
      responses: [
        {
          re: /^session-b\s+lock\s+2$/i,
          mutate: s => { s.bLockedRow2 = true; },
          out: '🅱️  Session B:  BEGIN;\n' +
               "🅱️  Session B:  UPDATE adcTestResult SET failureType = 'relay' WHERE id = 2;\n" +
               '🅱️  Query OK, 1 row affected\n\n' +
               '🔒 Row id=2 par ab Session B ka WRITE LOCK hai. Woh COMMIT tak rahega.',
        },
        {
          re: /^session-b\s+wants\s+1$/i,
          mutate: s => { s.bWantsRow1 = true; },
          out: '🅱️  Session B:  UPDATE adcTestResult SET progress = 99 WHERE id = 1;\n' +
               '⏳ Session B ATKI HUI HAI — row id=1 par tumhara (Session A ka) lock hai.\n\n' +
               '   Ab tasveer aisi hai:\n' +
               '     A ke paas row 1 hai, A ko row 2 chahiye\n' +
               '     B ke paas row 2 hai, B ko row 1 chahiye\n\n' +
               '   Ab tum row 2 maang ke dekho — cycle poora ho jaayega.',
        },
        {
          /* cycle poora — sirf tab jab B row 2 pakde ho aur row 1 maang raha ho */
          re: /^update\s+adctestresult\s+.*\bid\s*=\s*2\b/i,
          mutate: s => { if (s.bLockedRow2 && s.bWantsRow1) s.sawDeadlock = true; },
          out: (s) => s.bLockedRow2 && s.bWantsRow1
            ? 'ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction\n\n' +
              '💀 InnoDB ne CYCLE detect kiya (A → B → A) aur tumhari transaction ko victim chun ke maar diya.\n' +
              '   Session B ab aage badh gayi.\n\n' +
              '   Dhyaan do: yeh "overload" nahi tha. Sirf DO transactions thin —\n' +
              '   par unhone rows ULTE KRAM mein lock ki.\n\n' +
              '   Ab ROLLBACK karo, phir "session-b reset", phir sahi tareeka try karo.'
            : null,
          err: true,
        },
        {
          re: /^session-b\s+reset$/i,
          mutate: s => { s.bLockedRow2 = false; s.bWantsRow1 = false; },
          out: '🅱️  Session B:  ROLLBACK;\n✅ Session B ke saare locks chhoot gaye. Ab table saaf hai.',
        },
        {
          re: /^session-b(\s+.*)?$/i,
          out: 'Session B commands:\n' +
               '  session-b lock 2      — B row 2 lock kar leta hai\n' +
               '  session-b wants 1     — B row 1 maangta hai (atak jaata hai)\n' +
               '  session-b reset       — B rollback karke locks chhod deta hai',
        },
      ],
      tasks: [
        { text: 'Transaction shuru karo (BEGIN)',
          check: s => s.history.some(h => /^(begin|start\s+transaction)$/i.test(h)) },
        { text: 'Row 1 lock karo (UPDATE … id = 1)',
          check: s => s.history.some(h => /^update\s+adctestresult/i.test(h) && /id\s*=\s*1\b/i.test(h)) },
        { text: 'Session B se row 2 lock karwao, phir row 1 mangwao',
          check: s => !!s.bWantsRow1 || !!s.sawDeadlock },
        { text: '💀 Deadlock trigger karo (row 2 maango)',
          check: s => !!s.sawDeadlock },
        { text: 'ROLLBACK karke locks chhodo',
          check: s => !!s.rolledBack },
        { text: '✅ Sahi tareeka: ORDER BY id FOR UPDATE se dono rows ek hi kram mein lock karo',
          check: s => s.history.some(h => /for\s+update/i.test(h) && /order\s+by\s+id/i.test(h)) },
      ],
      success: s => !!s.sawDeadlock && !!s.rolledBack &&
        s.history.some(h => /for\s+update/i.test(h) && /order\s+by\s+id/i.test(h)),
      successText: '🎉 <b>Tumne deadlock banaya bhi aur roka bhi.</b><br><br>' +
        'Sabse zaroori baat jo tumne khud dekhi: deadlock ke liye <b>bhaari load ki zaroorat nahi</b> — ' +
        'sirf <b>do</b> transactions kaafi thin, bas unka <b>lock lene ka kram ulta</b> tha.<br><br>' +
        '<b>Production checklist:</b><br>' +
        '• Har transaction rows ko <b>ek hi kram</b> mein lock kare (aksar <code>ORDER BY id</code>)<br>' +
        '• Transaction <b>chhoti</b> rakho — lock <code>COMMIT</code> tak rehta hai, statement tak nahi<br>' +
        '• <code>SELECT … FOR UPDATE</code> use karo jab padh ke likhna ho (warna lost update)<br>' +
        '• <b>ERROR 1213 par retry</b> karo, backoff + jitter ke saath — aur sirf 1213 par<br>' +
        '• Debug ke liye: <code>SHOW ENGINE INNODB STATUS</code> → LATEST DETECTED DEADLOCK',
      hints: [
        'Transaction shuru karo: BEGIN;',
        'Row 1 lock karo: UPDATE adcTestResult SET progress = 50 WHERE id = 1;',
        'Session B ko row 2 lock karne do: session-b lock 2',
        'Ab B ko row 1 mangwao: session-b wants 1',
        'Ab cycle poora karo (yahi deadlock hai): UPDATE adcTestResult SET progress = 60 WHERE id = 2;',
        'Locks chhodo: ROLLBACK;',
        'Session B ko bhi saaf karo: session-b reset',
        'Ab sahi tareeka — dobara BEGIN;',
        'Ek hi kram mein dono rows lock karo: SELECT * FROM adcTestResult WHERE id IN (1, 2) ORDER BY id FOR UPDATE;',
        'Aur pakka karo: COMMIT;',
      ],
    },

    {
      type: 'incident',
      title: '🚨 3AM: "ERROR 1213 ki baarish, par CPU 20% hai"',
      instructions: 'Shift-change ke waqt deadlocks phat padte hain. Load normal hai. Kya karoge?',
      pager: '<b>#db-alerts</b> — 18:02<br>' +
        '<code>deadlock_rate: 340/min</code> (normal: 2/min)<br>' +
        'Checkout API ka error rate 11%. CPU 20%, connections 40/500, disk normal.<br>' +
        'Roz theek 6 baje shuru hota hai, 20 minute mein apne aap theek ho jaata hai.',
      start: 'n1',
      nodes: {
        n1: {
          sitrep: 'Deadlock rate 170x normal. Par har resource metric bilkul normal hai.\n' +
            'Pattern: roz 18:00 par shuru, ~18:20 par khatam. (Shift change 18:00 par hota hai.)',
          text: 'Pehla kadam?',
          choices: [
            { t: 'SHOW ENGINE INNODB STATUS chalao — LATEST DETECTED DEADLOCK section padho', good: true, next: 'n2',
              explain: 'Bilkul sahi. Yeh section dono transactions ki EXACT queries aur woh kaunse locks maang rahe the, sab batata hai. Deadlock debugging isi ek command se shuru hoti hai.' },
            { t: 'Connection pool 500 se 1000 kar do', good: false,
              explain: 'Connections 40/500 par hain — pool bottleneck hai hi nahi. Aur zyada concurrency deadlock ko <b>badhati</b> hai, ghatati nahi. Tum aag mein ghee daal rahe ho.' },
            { t: 'Isolation level READ UNCOMMITTED kar do', good: false,
              explain: 'Deadlock <b>write locks</b> se aata hai, reads se nahi. Isolation girane se dirty reads mil jaayenge aur deadlock bhi rahega. Correctness bechi, kuch mila nahi.' },
            { t: 'Database restart kar do', good: false,
              explain: 'In-flight transactions maar doge aur 6 baje ka traffic aur bigad jaayega. Aur kal shaam 6 baje phir wahi hoga, kyunki wajah code mein hai.' },
          ],
        },
        n2: {
          sitrep: 'SHOW ENGINE INNODB STATUS → LATEST DETECTED DEADLOCK:\n\n' +
            '*** (1) TRANSACTION: shift-sync service\n' +
            '    UPDATE adcTestResult SET progress = ? WHERE id = ?\n' +
            '    ... rows locked so far: id 101, 102, 103   (badhte kram mein)\n' +
            '    WAITING FOR: id 104\n\n' +
            '*** (2) TRANSACTION: report-builder service\n' +
            '    UPDATE adcTestResult SET failureType = ? WHERE id = ?\n' +
            '    ... rows locked so far: id 106, 105, 104   (ghatte kram mein)\n' +
            '    WAITING FOR: id 103\n\n' +
            '*** WE ROLL BACK TRANSACTION (1)',
          text: 'Do services, ek hi table, <b>ulte kram</b>. Ab kya?',
          choices: [
            { t: 'report-builder ko ORDER BY id (badhta kram) par laao — dono services ek hi kram mein lock lein', good: true, next: 'n3',
              explain: 'Yehi asli fix hai. Cycle tabhi banta hai jab koi transaction peeche ki taraf jaaye. Sab ek hi kram mein lock lein toh cycle ban hi nahi sakta.' },
            { t: 'report-builder ko 18:30 par shift kar do', good: false,
              explain: 'Aaj ka symptom chhup jaayega. Par kal koi teesri service aayegi, ya traffic badhega, aur wahi cycle phir banega. Yeh fix nahi, taal-matol hai.' },
            { t: 'Dono services par table-level LOCK TABLES laga do', good: false,
              explain: 'Deadlock toh nahi hoga — par ab poori table ek waqt mein ek hi transaction ko milegi. Tumne deadlock ko throughput collapse se badal diya.' },
            { t: 'innodb_lock_wait_timeout kam kar do', good: false,
              explain: 'Yeh lock WAIT timeout hai, deadlock detection alag cheez hai (woh turant hoti hai). Isse deadlocks kam nahi honge, bas doosre errors judd jaayenge.' },
          ],
        },
        n3: {
          sitrep: 'report-builder mein ek line badli:\n' +
            '  - ORDER BY buildNum DESC\n' +
            '  + ORDER BY id\n\n' +
            'Agle din 18:00 —\n' +
            '  deadlock_rate: 3/min  (normal 2/min)\n' +
            '  checkout error rate: 0.02%\n\n' +
            'Par ab bhi 3/min aa rahe hain. Zero nahi hue.',
          text: 'Lagbhag theek ho gaya par kuch deadlocks abhi bhi hain. Ab?',
          choices: [
            { t: 'App mein ERROR 1213 par retry lagao — backoff + jitter ke saath, sirf 1213 par', good: true, next: 'end',
              explain: 'Sahi soch. Deadlock ko poori tarah khatam nahi kiya ja sakta (gap locks, alag query plans). Usse durlabh banao aur handle karo — 1213 ek expected condition hai, exception nahi.' },
            { t: 'Aur bhi ORDER BY dhoondh ke badalte raho', good: false,
              explain: 'Consistent ordering pehle hi 340 se 3 le aayi. Ab bacha hua hissa gap locks aur plan variation se hai — usse ordering se nahi, retry se handle karte hain.' },
            { t: 'Har query par retry lagao, har error par', good: false,
              explain: 'Khatarnak. 1062 (duplicate) ya 1048 (NOT NULL) par retry karne se kuch nahi milega — sirf load badhega aur asli bug chhup jaayega. Sirf 1213 (aur kabhi 1205 lock timeout) par retry.' },
            { t: '3/min ignore karo', good: false,
              explain: 'Retry ke bina woh 3/min seedha user ko error dikhate hain. Ek chhota retry wrapper unhe poori tarah invisible bana deta hai.' },
          ],
        },
        end: {
          end: true,
          text: '✅ Deadlock rate 340/min → 3/min, aur woh 3 bhi retry se user tak nahi pahunchte.',
          summary: '<b>Kya seekha:</b><br><br>' +
            '1️⃣ <b>Deadlock load ka problem nahi hai.</b> CPU 20% par bhi 340/min ho sakte hain — ' +
            'sirf <b>do</b> transactions aur <b>ulta kram</b> kaafi hai.<br><br>' +
            '2️⃣ <b>SHOW ENGINE INNODB STATUS</b> → LATEST DETECTED DEADLOCK. Yeh ek command dono ' +
            'transactions ki exact queries aur locks dikha deti hai. Yahi se shuru karo.<br><br>' +
            '3️⃣ <b>Asli ilaaj: consistent lock order.</b> Har transaction rows ko ek hi kram mein lock kare ' +
            '(aksar <code>ORDER BY id</code>) — cycle ban hi nahi sakta.<br><br>' +
            '4️⃣ <b>Zero deadlock mumkin nahi.</b> Gap locks aur alag query plans se kabhi bhi ' +
            'naya cycle ban sakta hai. Isliye <b>ERROR 1213 par retry</b> — backoff + jitter ke saath, ' +
            'aur <b>sirf</b> 1213 par.<br><br>' +
            '5️⃣ <b>Jo cheezein madad NAHI karti:</b> connection pool badhana (concurrency badhne se ' +
            'deadlock badhta hai), isolation girana (deadlock write locks se hai), restart karna.',
        },
      },
    },

    {
      type: 'quiz',
      title: 'Locks & Deadlocks — deep check',
      questions: [
        {
          q: 'Row lock kab chhutta hai?',
          choices: [
            'Statement khatam hote hi',
            'COMMIT ya ROLLBACK par — statement khatam hone par nahi. Isliye ek lambi transaction rows ko der tak bandhak bana sakti hai',
            '1 second baad apne aap',
            'Jab doosri transaction maange',
          ],
          answer: 1,
          explain: 'Yeh sabse zaroori mental model hai. <code>UPDATE</code> chalte hi lock lag jaata hai aur transaction khatam hone tak <b>rehta</b> hai. Isliye "transaction chhoti rakho" sirf ek achhi salaah nahi — woh lock contention ka seedha ilaaj hai.',
        },
        {
          q: 'Deadlock hone ke liye kam se kam kya chahiye?',
          choices: [
            'Bahut zyada load',
            'Do transactions jo do rows ko ULTE KRAM mein lock karein — load ka koi lena-dena nahi',
            'Kam se kam 100 concurrent connections',
            'Ek bahut badi table',
          ],
          answer: 1,
          explain: 'Deadlock ek <b>ordering</b> ka bug hai, capacity ka nahi. CPU 20% par bhi ho sakta hai. Isiliye "server badha do" wala jawab kabhi kaam nahi karta — aur interviewer isi par pakadta hai.',
        },
        {
          q: 'InnoDB deadlock detect karne par kya karta hai?',
          choices: [
            'Dono transactions ko maar deta hai',
            'Hamesha ke liye rukh jaata hai',
            'Ek transaction ko VICTIM chun ke rollback kar deta hai (ERROR 1213) — doosri aage badh jaati hai',
            'Server restart karta hai',
          ],
          answer: 2,
          explain: 'InnoDB wait-for graph mein cycle dhoondhta hai aur usually us transaction ko maarta hai jisne kam kaam kiya hai (rollback sasta pade). Isliye tumhari app ko 1213 milna <b>normal</b> hai — usse handle karna tumhara kaam hai.',
        },
        {
          q: '<code>SELECT … FOR UPDATE</code> kyun chahiye?',
          choices: [
            'Query tez karne ke liye',
            'Padhi hui rows par WRITE LOCK lagane ke liye — read-modify-write mein bina iske doosri transaction beech mein aa ke lost update kar deti hai',
            'Rows ko sort karne ke liye',
            'Index banane ke liye',
          ],
          answer: 1,
          explain: 'Plain <code>SELECT</code> koi lock nahi leta. Toh "padho → calculate karo → likho" ke beech koi aur wahi row badal sakta hai, aur tumhara write uska kaam mita dega. <code>FOR UPDATE</code> us gap ko band karta hai.',
        },
        {
          q: 'ERROR 1213 par retry karte waqt jitter kyun chahiye?',
          choices: [
            'Jitter se query tez chalti hai',
            'Bina jitter ke dono victim transactions ek saath retry karengi aur PHIR takrayengi — random delay unhe alag kar deta hai',
            'MySQL jitter maangta hai',
            'Jitter se lock chhut jaata hai',
          ],
          answer: 1,
          explain: 'Wahi retry-storm ka pattern jo har distributed system mein aata hai. Fixed backoff se dono transactions synchronised rehti hain; thoda random delay unhe de-synchronise kar deta hai.',
        },
      ],
    },

    {
      type: 'order',
      title: 'Deadlock incident — sahi kram',
      instructions: 'Production mein deadlock rate phat gaya hai. Kadam sahi kram mein lagao.',
      steps: [
        { text: 'SHOW ENGINE INNODB STATUS chalao — LATEST DETECTED DEADLOCK padho',
          explain: 'Yeh dono transactions ki exact queries aur maange gaye locks dikhata hai. Bina isse padhe har fix andaza hai.' },
        { text: 'Dono transactions ka LOCK ORDER compare karo — kaun kis kram mein rows le raha hai',
          explain: 'Cycle tabhi banta hai jab kram ulta ho. Yahi woh ek cheez hai jise dhoondhna hai.' },
        { text: 'Dono code paths ko EK HI kram par laao (aksar ORDER BY id)',
          explain: 'Asli fix. Agar sab badhte kram mein lock lein toh cycle ban hi nahi sakta.' },
        { text: 'Transactions ko chhota karo — lock jitni der, takraav utna zyada',
          explain: 'Lock COMMIT tak rehta hai. Transaction ke andar se network call ya user input ka intezaar hataao.' },
        { text: 'App mein ERROR 1213 par retry lagao — backoff + jitter, sirf 1213 par',
          explain: 'Bache hue durlabh deadlocks ko user tak pahunchne mat do. Par sirf 1213 par — 1062/1048 par retry bekaar hai.' },
        { text: 'deadlock_rate par alert banao aur before/after compare karo',
          explain: 'Fix ko naapo. "Lagta hai theek ho gaya" production evidence nahi hai — graph hai.' },
      ],
    },

    {
      type: 'hotspot',
      title: '🎯 Diagram par: deadlock ki anatomy',
      visual: 'locking',
      questions: [
        { q: 'Deadlock ki asli jad kahan hai?', target: 'cycle', explain: 'Cycle — A row 1 pakde row 2 maange, B row 2 pakde row 1 maange. Yeh ordering ka bug hai, load ka nahi.' },
        { q: 'Sabse asardar permanent ilaaj kaunsa hai?', target: 'order', explain: 'Consistent lock order — dono transactions ek hi kram mein rows lock karein, toh cycle ban hi nahi sakta.' },
        { q: 'Read-modify-write ke liye kaunsa lock chahiye?', target: 'forupdate', explain: 'SELECT … FOR UPDATE — padhi hui rows par write lock. Bina iske lost update hota hai.' },
        { q: 'ERROR 1213 par app ko kya karna chahiye?', target: 'retry', explain: 'Retry — backoff aur jitter ke saath. Deadlock ek expected condition hai, exception nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Locking',
    instructions: 'Yeh sawaal senior backend/DBA roles mein bahut aata hai. 🎤',
    questions: [
      {
        q: 'Interviewer: "Production mein deadlocks badh gaye hain. Kya karoge?"',
        choices: [
          'Server ki RAM aur connection pool badha dunga',
          'Pehle SHOW ENGINE INNODB STATUS se LATEST DETECTED DEADLOCK padhunga — usme dono transactions ki exact queries hoti hain. Lagbhag hamesha wajah ULTA LOCK ORDER hoti hai, toh dono code paths ko ek hi kram par laaunga (ORDER BY id). Saath mein transactions chhoti karunga (lock COMMIT tak rehta hai) aur app mein 1213 par backoff+jitter retry lagaunga. Dhyaan rahe — deadlock load ka problem nahi hai, ordering ka hai; isliye pool badhane se woh BADHTE hain.',
          'Isolation level READ UNCOMMITTED kar dunga',
          'Table lock laga dunga taaki ek waqt mein ek hi transaction chale',
        ],
        answer: 1,
        explain: 'Poora jawab: (1) <b>naapo</b> — INNODB STATUS, (2) asli jad — lock order, (3) supporting fixes — chhoti transactions + retry, (4) aur woh line jo sabko alag karti hai: <b>deadlock load ka problem nahi hai</b>.',
      },
      {
        q: 'Interviewer: "Do users ek hi row ka counter badha rahe hain. Kya galat ho sakta hai?"',
        choices: [
          'Kuch nahi, MySQL sambhal lega',
          'LOST UPDATE — dono ne 45 padha, dono ne 46 likha, aur ek increment gayab. Do ilaaj hain: (a) atomic update — UPDATE … SET progress = progress + 1, jo lock database ke andar leta hai, ya (b) agar padh ke logic lagana ho toh SELECT … FOR UPDATE se row pehle lock karo. Plain SELECT koi lock nahi leta, isliye read-modify-write hamesha race hai.',
          'Deadlock hoga',
          'Duplicate key error aayega',
        ],
        answer: 1,
        explain: 'Achha jawab <b>dono</b> ilaaj batata hai aur unme farak karta hai: atomic expression (sabse simple aur tez) vs explicit locking (jab beech mein business logic ho). Aur "plain SELECT lock nahi leta" bolna zaroori hai.',
      },
      {
        q: '🎛️ Interviewer: "Lost update se bacho — mujhe dikhao."',
        terminal: {
          title: 'Interview hands-on — FOR UPDATE se safe increment',
          goal: '🎛️ <b>Hands-on:</b> <code>adcTestResult</code> ki row <code>id = 2</code> ka ' +
            '<code>progress</code> badhana hai — safe tareeke se.<br><br>' +
            '<b>(1)</b> <code>BEGIN</code><br>' +
            '<b>(2)</b> Row ko lock karke padho: <code>SELECT progress FROM adcTestResult WHERE id = 2 FOR UPDATE;</code><br>' +
            '<b>(3)</b> Atomic update karo: <code>UPDATE adcTestResult SET progress = progress + 1 WHERE id = 2;</code><br>' +
            '<b>(4)</b> <code>COMMIT</code><br>' +
            '<b>(5)</b> Verify: <code>SELECT id, progress FROM adcTestResult WHERE id = 2;</code>',
          db: SG.factoryDB(),
          tasks: [
            { text: 'BEGIN se transaction shuru',
              check: s => s.history.some(h => /^(begin|start\s+transaction)$/i.test(h)) },
            { text: 'FOR UPDATE se row lock karke padho',
              check: s => s.history.some(h => /for\s+update/i.test(h) && /adctestresult/i.test(h)) },
            { text: 'Atomic increment (progress = progress + 1)',
              check: s => s.history.some(h => /update\s+adctestresult/i.test(h) && /progress\s*=\s*progress\s*\+/i.test(h)) },
            { text: 'COMMIT se pakka karo',
              check: s => !!s.committed },
            { text: 'Verify — progress 46 hona chahiye',
              check: s => (s.db.tables.adcTestResult.rows.find(r => Number(r.id) === 2) || {}).progress === 46 },
          ],
          success: s => !!s.committed &&
            s.history.some(h => /for\s+update/i.test(h)) &&
            s.history.some(h => /progress\s*=\s*progress\s*\+/i.test(h)) &&
            (s.db.tables.adcTestResult.rows.find(r => Number(r.id) === 2) || {}).progress === 46,
          successText: '✅ <b>Do defences ek saath.</b><br><br>' +
            '<code>FOR UPDATE</code> ne row ko lock kiya taaki beech mein koi aur usse na badle, aur ' +
            '<code>progress = progress + 1</code> ne read-modify-write ko <b>database ke andar</b> kar diya — ' +
            'app mein purani value le jaane ka mauka hi nahi mila.<br><br>' +
            '<b>Interview line:</b> <i>"Agar sirf increment karna hai toh atomic expression hi kaafi hai. ' +
            '<code>FOR UPDATE</code> tab chahiye jab padhi hui value par business logic lagana ho — ' +
            'kyunki plain SELECT koi lock nahi leta."</i>',
          hints: [
            'Transaction shuru karo: BEGIN;',
            'Row lock karke padho: SELECT progress FROM adcTestResult WHERE id = 2 FOR UPDATE;',
            'Atomic increment: UPDATE adcTestResult SET progress = progress + 1 WHERE id = 2;',
            'Pakka karo: COMMIT;',
            'Verify: SELECT id, progress FROM adcTestResult WHERE id = 2;',
          ],
        },
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki row lock COMMIT tak rehta hai, statement tak nahi',
    'Main deadlock ka cycle samjha sakta hoon aur SHOW ENGINE INNODB STATUS se debug kar sakta hoon',
    'Main consistent lock order se deadlock rok sakta hoon',
    'Main SELECT … FOR UPDATE aur atomic update mein sahi chunav kar sakta hoon',
  ],
  homework: `<p>Do terminals kholo aur deadlock <b>khud</b> banao — yeh 2 minute ka experiment
    poore concept ko permanent kar deta hai:</p>
    <pre>-- Terminal 1                      -- Terminal 2
BEGIN;
UPDATE t SET x=1 WHERE id=1;
                                  BEGIN;
                                  UPDATE t SET x=1 WHERE id=2;
UPDATE t SET x=1 WHERE id=2;      -- ⏳ atak gaya
                                  UPDATE t SET x=1 WHERE id=1;
                                  -- 💀 ERROR 1213</pre>
    <p>Phir turant chalao:</p>
    <pre>SHOW ENGINE INNODB STATUS\\G</pre>
    <p><b>LATEST DETECTED DEADLOCK</b> section dhoondo — usme dono transactions ki exact
    queries aur woh kaunse locks maang rahe the, sab likha hoga. Yehi output tum
    production incident mein padhoge.</p>
    <p><b>Bonus — abhi kaun kis par atka hai:</b></p>
    <pre>SELECT * FROM performance_schema.data_lock_waits;
SELECT * FROM sys.innodb_lock_waits;      -- padhne mein aasan</pre>
    <p>Aur apni service mein ek retry wrapper likho jo <b>sirf</b> errno 1213 (aur 1205
    lock wait timeout) par retry kare — baaki errors ko waise hi upar jaane de.</p>`,
  cards: [
    { front: 'Row lock kab tak rehta hai?', back: '<b>COMMIT ya ROLLBACK tak</b> — statement khatam hone par nahi. Isliye lambi transaction rows ko der tak bandhak banati hai; transaction ke andar network call ya user input ka intezaar kabhi mat karo.' },
    { front: 'Deadlock ke liye kya chahiye?', back: 'Sirf <b>do</b> transactions jo rows ko <b>ulte kram</b> mein lock karein. <b>Load ka koi lena-dena nahi</b> — CPU 20% par bhi ho sakta hai.' },
    { front: 'InnoDB deadlock par kya karta hai?', back: 'Wait-for graph mein <b>cycle</b> detect karke ek transaction ko <b>victim</b> chunta hai aur rollback kar deta hai — <code>ERROR 1213</code>. Doosri aage badh jaati hai.' },
    { front: 'Deadlock ka asli ilaaj?', back: '<b>Consistent lock order</b> — har transaction rows ko ek hi kram mein lock kare (aksar <code>ORDER BY id</code>). Cycle ke liye kisi ko peeche jaana padta hai; sab aage badhein toh cycle ban hi nahi sakta.' },
    { front: 'SELECT … FOR UPDATE kyun?', back: 'Plain <code>SELECT</code> <b>koi lock nahi</b> leta. Read-modify-write mein beech mein koi aur row badal dega → <b>lost update</b>. <code>FOR UPDATE</code> padhi hui rows par write lock lagata hai.' },
    { front: 'ERROR 1213 par app kya kare?', back: '<b>Retry</b> — backoff + <b>jitter</b> ke saath, aur <b>sirf 1213</b> par (1062/1048 par retry bekaar hai). Zero deadlock mumkin nahi; usse durlabh banao aur handle karo.' },
    { front: 'Deadlock debug ka pehla command?', back: '<code>SHOW ENGINE INNODB STATUS</code> → <b>LATEST DETECTED DEADLOCK</b> section. Usme dono transactions ki exact queries aur maange gaye locks hote hain.' },
    { front: 'Deadlock par kya NAHI karna?', back: '❌ Connection pool badhana (concurrency badhne se deadlock <b>badhta</b> hai) ❌ Isolation girana (deadlock write locks se hai) ❌ Table lock lagana (throughput mar jaayega) ❌ Restart.' },
  ],
},
]);
