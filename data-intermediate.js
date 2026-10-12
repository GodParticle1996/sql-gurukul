/* =====================================================================
   SQL Gurukul — Track 2: 🔥 Intermediate (JOIN Sadhak Path)
   Tables ko jodna, schema design, aur speed.
   ===================================================================== */

SG.registerLevels('intermediate', [

  /* ================= LEVEL 1: INNER JOIN ================= */
  {
    id: 'joins',
    icon: '🔗',
    title: 'JOIN — Do Tables ko Jodna',
    badge: 'Jodne Wala',
    objectives: [
      '<b>JOIN ... ON</b> — do tables ko key se jodna',
      '<b>Table alias</b> aur <code>alias.column</code> ka anushasan',
      '<b>INNER JOIN</b> kya chhod deta hai — aur woh chup-chaap hota hai',
      'Teen ya zyada tables ka chain JOIN',
    ],
    lesson: [
      `<h3>🔗 JOIN kyun chahiye</h3>
       <p><code>bx50Data</code> mein device ka naam hai par build ka
       <code>type</code> nahi — wahan sirf <code>buildNum</code> hai. Type
       <code>bx50Builds</code> mein hai. Manager ko dono chahiye ek saath.</p>
       <p>Yahi <b>relational</b> database ka poora point hai: har fact ek jagah
       rakho, aur zaroorat par <b>jod</b> lo.</p>
       <pre>SELECT   d.bx50Name, d.status, b.type, b.duration
FROM     bx50Data d                    -- alias 'd'
JOIN     bx50Builds b                  -- alias 'b'
  ON     d.buildNum = b.buildNum       -- jodne ki shart
WHERE    d.status = 'Provisioned';</pre>
       <p><code>ON</code> woh shart hai jispar do tables ki rows jodi jaati
       hain — aksar <b>FK = PK</b>.</p>
       <p>💡 <b>Alias hamesha do</b> (<code>bx50Data d</code>). Phir har column
       ko <code>d.buildNum</code> / <code>b.buildNum</code> likho — warna
       "Column 'buildNum' in field list is ambiguous" milega.</p>`,
      `<h3>🚮 INNER JOIN chup-chaap rows gira deta hai</h3>
       <p>Yeh sabse zaroori baat hai is level ki.</p>
       <p><code>bx50Data</code> mein 7 devices hain. Par
       <code>bx50-osaka-01</code> ka <code>buildNum</code> <b>1099</b> hai — aur
       <code>bx50Builds</code> mein 1099 naam ka koi build hai hi nahi (data
       entry ki galti, ya build delete ho gaya).</p>
       <pre>SELECT COUNT(*) FROM bx50Data;                    -- 7
SELECT COUNT(*) FROM bx50Data d
  JOIN bx50Builds b ON d.buildNum = b.buildNum;   -- 6 😱</pre>
       <p>Ek device <b>gayab</b> ho gaya. Koi error nahi, koi warning nahi —
       bas ek row kam. Report mein 7 ki jagah 6 chala gaya.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka "device
       inventory" dashboard INNER JOIN par bana tha. Mahine ke aakhir mein
       finance ne poocha: "42 devices ship hue par dashboard 39 dikha raha hai,
       teen kahan gaye?" Teen devices ke <code>buildNum</code> un builds ko
       point kar rahe the jo cleanup script ne delete kar diye the. INNER JOIN
       ne unhe chup-chaap gira diya — <b>3 hafte tak kisi ko pata nahi chala</b>.
       Fix do the: <code>LEFT JOIN</code> use karna (agla level), aur
       <b>FOREIGN KEY constraint</b> lagana taaki referenced build delete hi na
       ho sake. Sabak: <b>JOIN ke pehle aur baad ka <code>COUNT(*)</code>
       compare karo</b> — number gira toh kuch chhoot raha hai.</div>`,
      `<h3>⛓️ Teen tables — chain JOIN</h3>
       <p>"Kis operator ne kaunse build par kitni der kaam kiya?" — teen tables
       chahiye: <code>operators</code> → <code>bx50Sessions</code> →
       <code>bx50Builds</code>.</p>
       <pre>SELECT   o.name, b.buildNum, b.type, s.duration
FROM     bx50Sessions s
JOIN     operators   o ON s.userId   = o.opId
JOIN     bx50Builds  b ON s.buildNum = b.buildNum
WHERE    b.active = 1
ORDER BY s.duration DESC;</pre>
       <p>Har <code>JOIN</code> ka apna <code>ON</code> hota hai. Beech wali
       table (<code>bx50Sessions</code>) dono ko jodti hai — ise <b>junction
       table</b> kehte hain (Level 3 mein detail).</p>
       <p>💡 JOIN ke saath aggregate bhi chalta hai:</p>
       <pre>SELECT   o.name, COUNT(*) AS sessions
FROM     bx50Sessions s
JOIN     operators o ON s.userId = o.opId
GROUP BY o.name
ORDER BY sessions DESC;</pre>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'JOIN diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'joins',
        questions: [
          { q: 'Do tables ko jodne ki shart kahan likhi jaati hai?', target: 'on', explain: 'ON — aksar FK = PK. Yeh batata hai ki kaunsi row kaunsi row se milegi.' },
          { q: 'INNER JOIN ka result kya hota hai?', target: 'inner', explain: 'Sirf woh rows jinme dono taraf match mila. Baaki chhoot jaati hain.' },
          { q: 'Yeh device INNER JOIN mein gayab ho gaya — kaunsa hai?', target: 'dropped', explain: 'osaka-01, jiska buildNum 1099 kisi build se match nahi karta. Koi error nahi milta — bas row kam ho jaati hai.' },
        ],
      },
      {
        type: 'fill',
        title: 'JOIN query likho',
        instructions: 'Devices ke saath unke build ka type chahiye. Blanks bharo.',
        template: `SELECT   d.bx50Name, d.status, b.type
FROM     bx50Data {0}
{1}     bx50Builds b
  {2}   d.buildNum = b.buildNum
WHERE    d.status = 'Provisioned'
{3} b.type;`,
        tokens: ['d', 'JOIN', 'ON', 'ORDER BY', 'WHERE', 'AS', 'GROUP BY', 'USING'],
        blanks: [
          { answer: 'd', explain: 'Table <b>alias</b> — <code>bx50Data d</code>. Ab har column <code>d.bx50Name</code> likh sakte ho. Do tables mein same column naam ho toh alias ke bina "ambiguous" error milta hai.' },
          { answer: 'JOIN', explain: '<code>JOIN</code> = <code>INNER JOIN</code> (default). Sirf matched rows deta hai.' },
          { answer: 'ON', explain: '<code>ON</code> = jodne ki shart. Yahan FK (<code>d.buildNum</code>) = PK-jaisa unique column (<code>b.buildNum</code>).' },
          { answer: 'ORDER BY', explain: '<code>ORDER BY</code> JOIN ke baad bhi normal chalti hai — kisi bhi table ke column par.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Teen devices kahan gaye?',
        instructions: 'Dashboard 6 devices dikha raha hai, table mein 7 hain. INNER JOIN ka chhupa nuksaan khud dekho.',
        goal: 'Finance ne poocha "device count kam kyun hai?". <b>(1)</b> <code>SELECT COUNT(*) FROM bx50Data;</code> — asli count kya hai? <b>(2)</b> Ab dashboard wali query chalao: <code>bx50Data d</code> ko <code>bx50Builds b</code> se <code>JOIN</code> karo <code>ON d.buildNum = b.buildNum</code> aur <code>COUNT(*)</code> lo — number gir jayega! <b>(3)</b> Devices aur unke build type ki list nikaalo (<code>d.bx50Name</code>, <code>b.type</code>). <b>(4)</b> Teen tables jodo: har session ke saath operator ka <code>name</code> aur build ka <code>type</code> (<code>bx50Sessions</code> → <code>operators</code> → <code>bx50Builds</code>).',
        tasks: [
          { text: 'bx50Data ka asli COUNT(*)', check: s => s.history.some(h => /count\s*\(\s*\*\s*\)/i.test(h) && /from\s+bx50data/i.test(h) && !/join/i.test(h)) },
          { text: 'JOIN ke baad ka COUNT(*) — number gira?', check: s => s.history.some(h => /count\s*\(/i.test(h) && /join/i.test(h)) },
          { text: 'Devices + unka build type', check: s => s.history.some(h => /join\s+bx50builds/i.test(h) && /type/i.test(h)) },
          { text: 'Teen tables ka chain JOIN', check: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /count\s*\(\s*\*\s*\)/i.test(h) && /from\s+bx50data/i.test(h) && !/join/i.test(h))
          && s.history.some(h => /count\s*\(/i.test(h) && /join/i.test(h))
          && s.history.some(h => (h.match(/join/gi) || []).length >= 2),
        successText: '🎉 <b>Number apni aankhon se girta dekha: 7 → 6.</b> <code>bx50-osaka-01</code> ka <code>buildNum</code> 1099 hai, aur woh build exist hi nahi karta — INNER JOIN ne use <b>bina kuch bole</b> gira diya. Asli project mein isi wajah se 3 hafte tak dashboard 3 devices kam dikhata raha. Do ilaaj hain: <b>LEFT JOIN</b> (agla level) aur <b>FOREIGN KEY</b> constraint (Level 3). Aadat banao: <b>JOIN ke pehle-baad ka COUNT compare karo.</b>',
        hints: [
          'SELECT COUNT(*) FROM bx50Data;   ← 7 aana chahiye',
          'SELECT COUNT(*) FROM bx50Data d JOIN bx50Builds b ON d.buildNum = b.buildNum;   ← ab dekho',
          'SELECT d.bx50Name, b.type FROM bx50Data d JOIN bx50Builds b ON d.buildNum = b.buildNum;',
          'SELECT o.name, b.type, s.duration FROM bx50Sessions s JOIN operators o ON s.userId = o.opId JOIN bx50Builds b ON s.buildNum = b.buildNum;',
        ],
      },
      {
        type: 'quiz',
        title: 'JOIN Quick-fire',
        questions: [
          {
            q: 'INNER JOIN un rows ka kya karta hai jinka doosri table mein match nahi milta?',
            choices: [
              'Chup-chaap gira deta hai — koi error ya warning nahi milti',
              'NULL ke saath rakhta hai',
              'Error deta hai',
              'Unhe alag list mein dikhata hai',
            ],
            answer: 0,
            explain: 'Yehi is level ka core sabak. Silent data loss — isliye JOIN ke pehle-baad ka COUNT compare karna aadat banao.',
          },
          {
            q: 'Query mein alias kyun lagate hain?',
            choices: [
              'Chhota likhne ke liye aur "ambiguous column" error se bachne ke liye jab dono tables mein same column naam ho',
              'Query tez chalti hai',
              'MySQL ki majboori hai',
              'Sirf dikhawe ke liye',
            ],
            answer: 0,
            explain: 'Dono tables mein <code>buildNum</code> hai — bina alias ke DB nahi jaanta tum kis wala maang rahe ho.',
          },
          {
            q: '<code>ON</code> clause mein aksar kya likha jaata hai?',
            choices: [
              'Ek table ka foreign key = doosri table ka primary key (ya unique column)',
              'WHERE jaisi filtering condition',
              'Columns ki list jo chahiye',
              'Sorting ka order',
            ],
            answer: 0,
            explain: '<code>ON</code> = <b>jodne</b> ki shart (relationship). <code>WHERE</code> = <b>chhaan-ne</b> ki shart. Dono alag kaam hain.',
          },
          {
            q: 'Teen tables jodni hain. Kaise likhoge?',
            choices: [
              'Har table ke liye alag JOIN ... ON — ek chain banti jaati hai',
              'Ek hi ON mein teeno conditions likh do',
              'Teen alag queries chala ke result manually mila lo',
              'Teen tables JOIN ho hi nahi saktin',
            ],
            answer: 0,
            explain: '<code>FROM a JOIN b ON ... JOIN c ON ...</code>. Har JOIN apna ON leta hai; result step-by-step banta hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — JOIN',
      instructions: 'Yahin se asli SQL interview shuru hota hai. 🎤',
      questions: [
        {
          q: '"INNER JOIN kya karta hai?"',
          choices: [
            'Dono tables ki un rows ko jodta hai jahan ON condition sach hai — aur jinka match nahi milta unhe <b>chup-chaap gira deta hai</b>',
            'Dono tables ki saari rows jodta hai',
            'Pehli table ki saari rows rakhta hai',
            'Sirf pehli matching row leta hai',
          ],
          answer: 0,
          explain: 'Doosra hissa (silent drop) bolna hi tumhe fresher se alag karta hai — kyunki asli bugs wahin se aate hain.',
        },
        {
          q: 'Interviewer: "Report ka count kam aa raha hai. JOIN ki wajah se hai ya nahi, kaise check karoge?"',
          choices: [
            'Base table ka COUNT(*) alag se nikalunga aur JOIN wale COUNT se compare karunga; farak ho toh LEFT JOIN + WHERE right.key IS NULL se orphan rows dhoondhunga',
            'Query dobara chalaunga',
            'Manager se poochunga ki count kitna hona chahiye',
            'Sab JOIN hata dunga',
          ],
          answer: 0,
          explain: 'Yeh exact diagnostic hai jo asli incident mein chahiye tha: <b>count compare → anti-join se orphans dhoondo</b>. Agla level yeh technique sikhata hai.',
        },
        {
          q: '🎛️ Interviewer: "Live JOIN likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — JOIN',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Har session ke saath operator ka <code>name</code> dikhao — <code>bx50Sessions s</code> JOIN <code>operators o</code> ON <code>s.userId = o.opId</code>. <b>(2)</b> Har operator ke kitne sessions hain — wahi JOIN + <code>GROUP BY o.name</code>, DESC order mein. <b>(3)</b> Sirf <b>active</b> builds ke sessions — teen table JOIN karke <code>WHERE b.active = 1</code>.',
            tasks: [
              { text: 'Sessions + operator name (JOIN)', check: s => s.history.some(h => /join\s+operators/i.test(h)) },
              { text: 'Per-operator session count', check: s => s.history.some(h => /join/i.test(h) && /group\s+by/i.test(h) && /count\s*\(/i.test(h)) },
              { text: 'Active builds ke sessions (2 JOIN + WHERE)', check: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2 && /active\s*=\s*1/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /join\s+operators/i.test(h))
              && s.history.some(h => /join/i.test(h) && /group\s+by/i.test(h) && /count\s*\(/i.test(h))
              && s.history.some(h => (h.match(/join/gi) || []).length >= 2 && /active\s*=\s*1/i.test(h)),
            successText: '✅ JOIN + GROUP BY + multi-table chain — teeno. Dhyaan diya ki <code>WHERE b.active = 1</code> JOIN ke <b>baad</b> lagta hai? Woh joined result par filter karta hai.',
            hints: [
              'SELECT o.name, s.buildNum, s.duration FROM bx50Sessions s JOIN operators o ON s.userId = o.opId;',
              'SELECT o.name, COUNT(*) AS sessions FROM bx50Sessions s JOIN operators o ON s.userId = o.opId GROUP BY o.name ORDER BY sessions DESC;',
              'SELECT o.name, b.buildNum, b.type FROM bx50Sessions s JOIN operators o ON s.userId = o.opId JOIN bx50Builds b ON s.buildNum = b.buildNum WHERE b.active = 1;',
            ],
          },
        },
      ],
    },
    success: [
      'Main JOIN ... ON se do tables jod sakta hoon',
      'Main alias use karta hoon aur ambiguous column error se bachta hoon',
      'Main jaanta hoon ki INNER JOIN chup-chaap rows gira deta hai',
      'Main teen ya zyada tables ka chain JOIN likh sakta hoon',
    ],
    homework: `<p>Silent row drop khud dekho (Track 1 ke homework tables par):</p>
      <pre>USE factory;
SELECT COUNT(*) FROM bx50Data;                        -- 3

SELECT COUNT(*) FROM bx50Data d
JOIN bx50Builds b ON d.buildNum = b.buildNum;         -- 2 — osaka gayab!

-- Kaun gayab hua, dhoondo:
SELECT d.bx50Name, d.buildNum
FROM bx50Data d
LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum
WHERE b.buildNum IS NULL;                             -- agla level ka trailer 🙂

-- Alias ke bina error dekho:
SELECT buildNum FROM bx50Data d JOIN bx50Builds b ON d.buildNum = b.buildNum;
-- ERROR 1052: Column 'buildNum' in field list is ambiguous</pre>
      <p>✅ Self-check: JOIN ke baad count gira? Ambiguous column error mila? Anti-join ne osaka-01 pakda?</p>`,
    cards: [
      { front: 'INNER JOIN kya karta hai?', back: 'Dono tables ki woh rows jodta hai jahan <code>ON</code> sach hai. Jinka match nahi milta unhe <b>chup-chaap gira deta hai</b> — koi error nahi.' },
      { front: 'ON vs WHERE?', back: '<b>ON</b> = tables ko <b>jodne</b> ki shart (relationship). <b>WHERE</b> = joined result ko <b>chhaan-ne</b> ki shart.' },
      { front: 'Alias kyun zaroori?', back: 'Chhota likhne ke liye + <b>ambiguous column</b> error se bachne ke liye jab dono tables mein same column naam ho (ERROR 1052).' },
      { front: 'JOIN ke baad count kam — kaise pakdo?', back: 'Base table ka <code>COUNT(*)</code> vs JOIN ke baad ka <code>COUNT(*)</code> compare karo. Farak = orphan rows. Phir LEFT JOIN + <code>WHERE right.key IS NULL</code> se unhe dhoondo.' },
      { front: 'Teen tables kaise jodein?', back: '<code>FROM a JOIN b ON … JOIN c ON …</code> — har JOIN ka apna ON. Beech wali table aksar <b>junction table</b> hoti hai.' },
    ],
  },

  /* ================= LEVEL 2: LEFT JOIN ================= */
  {
    id: 'leftjoin',
    icon: '⬅️',
    title: 'LEFT JOIN — Kisi ko Peeche Mat Chhodo',
    badge: 'Anti-Join Jasoos',
    objectives: [
      '<b>LEFT JOIN</b> — left ke saare rows, chahe match ho ya na ho',
      '<b>Anti-join</b> pattern — "kaun chhoot gaya?" ka jawab',
      '<b>RIGHT JOIN</b> aur woh kyun kam use hota hai',
      'LEFT JOIN ke saath <b>COUNT</b> ka classic trap',
    ],
    lesson: [
      `<h3>⬅️ LEFT JOIN — left table hamesha poora</h3>
       <pre>SELECT   d.bx50Name, b.type
FROM     bx50Data d                    -- LEFT table
LEFT JOIN bx50Builds b                 -- RIGHT table
  ON     d.buildNum = b.buildNum;

+----------------+-------+
| bx50Name       | type  |
+----------------+-------+
| bx50-tokyo-01  | Gen4  |
| bx50-pune-01   | Gen3  |
| bx50-osaka-01  | NULL  |   ← match nahi mila, par row bachi!
+----------------+-------+</pre>
       <p><b>Rule:</b> LEFT table ki har row aayegi. Match mila toh right ke
       columns bhar jayenge; nahi mila toh right ke saare columns
       <code>NULL</code>.</p>
       <p>💡 Isiliye "saare devices dikhao, build info agar hai toh" = LEFT JOIN.
       "Sirf woh devices jinka build hai" = INNER JOIN. <b>Sawal ki bhasha hi
       JOIN chun deti hai.</b></p>`,
      `<h3>🕵️ Anti-join — "kaun chhoot gaya?" ka jawab</h3>
       <p>Yeh pattern har SQL interview mein aata hai aur asli kaam mein roz
       kaam aata hai:</p>
       <pre>SELECT   d.bx50Name, d.buildNum
FROM     bx50Data d
LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum
WHERE    b.buildNum IS NULL;      -- ← jaadu yahan hai</pre>
       <p>Logic samjho: LEFT JOIN ne <b>sabko</b> rakha. Jinka match nahi mila
       unke right-side columns <code>NULL</code> hain. Toh
       <code>WHERE b.buildNum IS NULL</code> = <b>sirf woh jinka match nahi
       mila</b>.</p>
       <p>Isse yeh sab pooch sakte ho:</p>
       <ul>
         <li>Kaunse operators ne ek bhi session nahi kiya?</li>
         <li>Kaunse devices ka build record gayab hai (orphan rows)?</li>
         <li>Kaunse users ne kabhi order nahi diya?</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> Pichhle level wala missing
       device mystery isi ek query se hal hua. Team teen din se logs dekh rahi
       thi, API debug kar rahi thi. Ek senior ne baith ke yeh chaar line likhi
       aur 30 second mein teeno orphan devices ka naam aur unka
       <code>buildNum</code> table par aa gaya — jo un builds ko point kar rahe
       the jo cleanup script ne uda diye the. <b>Sabak: "kya missing hai" wale
       sawal ka jawab LEFT JOIN + IS NULL hai, log files nahi.</b></div>`,
      `<h3>🪤 LEFT JOIN + COUNT ka classic trap</h3>
       <p>"Har operator ke kitne sessions?" — un operators ko bhi dikhana hai
       jinke <b>zero</b> sessions hain.</p>
       <pre>-- ❌ GALAT — Vikram ko 1 dikhayega, jabki uske 0 sessions hain!
SELECT   o.name, COUNT(*) AS sessions
FROM     operators o
LEFT JOIN bx50Sessions s ON o.opId = s.userId
GROUP BY o.name;

-- ✅ SAHI
SELECT   o.name, COUNT(s.id) AS sessions
FROM     operators o
LEFT JOIN bx50Sessions s ON o.opId = s.userId
GROUP BY o.name;</pre>
       <p>Kyun? Kyunki <code>COUNT(*)</code> <b>rows</b> ginta hai — aur Vikram
       ki ek row toh hai hi (bas uske session-columns NULL hain). Par
       <code>COUNT(s.id)</code> sirf <b>non-NULL</b> ginta hai — Vikram ke liye
       woh 0 hai.</p>
       <p>💡 <b>LEFT JOIN ke saath hamesha <code>COUNT(right_table.column)</code>
       likho, <code>COUNT(*)</code> nahi.</b> Track 1 ka
       <code>COUNT(*)</code> vs <code>COUNT(col)</code> wala sabak yahan asli
       roop mein aata hai.</p>
       <p><b>RIGHT JOIN</b> ulta karta hai (right table poora). Practice mein
       log ise kam use karte hain — tables ka order badal ke LEFT JOIN likh lete
       hain, kyunki padhne mein "pehli table poori" zyada seedha lagta hai.</p>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'LEFT JOIN diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'leftjoin',
        questions: [
          { q: 'LEFT JOIN mein kis table ki saari rows guarantee hoti hain?', target: 'left', explain: 'LEFT table — FROM ke baad wali. Uski har row aayegi, match ho ya na ho.' },
          { q: 'Match na milne par right table ke columns mein kya aata hai?', target: 'nullfill', explain: 'NULL. Isi NULL par anti-join ka poora jaadu tika hai.' },
          { q: '"Kaun chhoot gaya?" ka jawab dene wala pattern kaunsa hai?', target: 'antijoin', explain: 'LEFT JOIN + WHERE right.column IS NULL = anti-join. Orphans, inactive users, missing records.' },
        ],
      },
      {
        type: 'fill',
        title: 'Anti-join likho — orphan devices dhoondo',
        instructions: 'Woh devices jinka build record gayab hai. Blanks bharo.',
        template: `SELECT   d.bx50Name, d.buildNum
FROM     bx50Data d
{0} bx50Builds b
  ON     d.buildNum = b.buildNum
{1}    b.buildNum {2};

-- Aur har operator ke sessions (0 wale bhi dikhne chahiye):
SELECT   o.name, {3} AS sessions
FROM     operators o
LEFT JOIN bx50Sessions s ON o.opId = s.userId
GROUP BY o.name;`,
        tokens: ['LEFT JOIN', 'WHERE', 'IS NULL', 'COUNT(s.id)', 'INNER JOIN', 'HAVING', '= NULL', 'COUNT(*)'],
        blanks: [
          { answer: 'LEFT JOIN', explain: '<code>LEFT JOIN</code> sabko rakhta hai — bina iske orphan rows dikh hi nahi sakti (INNER unhe gira deta).' },
          { answer: 'WHERE', explain: 'Filter joined result par lagta hai. (HAVING groups ke liye hai, yahan koi GROUP BY hai hi nahi.)' },
          { answer: 'IS NULL', explain: '<code>IS NULL</code> — match na milne par right columns NULL hote hain. <code>= NULL</code> yahan bhi kabhi kaam nahi karta!' },
          { answer: 'COUNT(s.id)', explain: '<b>LEFT JOIN ke saath COUNT(*) nahi.</b> <code>COUNT(*)</code> Vikram ki NULL-wali row bhi gin ke 1 bata dega; <code>COUNT(s.id)</code> non-NULL ginta hai — sahi 0.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Orphans aur khaali haath operators',
        instructions: 'Anti-join se woh dhoondo jo INNER JOIN chhupa deta hai.',
        goal: 'Ab woh missing devices pakdo. <b>(1)</b> <code>LEFT JOIN</code> se saare devices + unka build type dikhao — osaka-01 ab NULL ke saath dikhega. <b>(2)</b> Anti-join: <code>WHERE b.buildNum IS NULL</code> laga ke sirf orphan devices nikaalo. <b>(3)</b> Har operator ke sessions gino, un operators ko bhi dikhao jinke <b>zero</b> hain — <code>COUNT(s.id)</code> use karo, <code>COUNT(*)</code> nahi! <b>(4)</b> Anti-join se woh operator dhoondo jisne kabhi session nahi kiya.',
        tasks: [
          { text: 'LEFT JOIN se saare devices + type', check: s => s.history.some(h => /left\s+join\s+bx50builds/i.test(h)) },
          { text: 'Anti-join: orphan devices (IS NULL)', check: s => s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)) },
          { text: 'Per-operator session count with COUNT(s.id)', check: s => s.history.some(h => /left\s+join\s+bx50sessions/i.test(h) && /count\s*\(\s*s\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h)) },
          { text: 'Zero-session operator dhoondo', check: s => s.history.some(h => /left\s+join\s+bx50sessions/i.test(h) && /is\s+null/i.test(h)) },
        ],
        db: SG.factoryDB(),
        /* Dhyaan: success() mein SAARE tasks hone chahiye. Warna mission task 3 par
           hi "complete" ho jaata hai, sim.done lag jaata hai, aur aakhri task
           kabhi tick hi nahi hota — user ko adhoora checklist dikhta hai. */
        success: s => s.history.some(h => /left\s+join\s+bx50builds/i.test(h))
          && s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h))
          && s.history.some(h => /left\s+join\s+bx50sessions/i.test(h) && /count\s*\(\s*s\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h))
          && s.history.some(h => /left\s+join\s+bx50sessions/i.test(h) && /is\s+null/i.test(h)),
        successText: '🎉 <b>Jasoosi kaamyaab.</b> <code>bx50-osaka-01</code> mil gaya — uska <code>buildNum</code> 1099 kisi build ko point nahi karta. Aur <code>OP-105 Vikram Rao</code> woh operator hai jiska ek bhi session nahi. Dono jawab <b>ek hi pattern</b> se aaye: <code>LEFT JOIN … WHERE right.col IS NULL</code>. Aur <code>COUNT(s.id)</code> ne Vikram ko sahi <b>0</b> dikhaya — <code>COUNT(*)</code> hota toh 1 dikhata aur report jhoot bolti.',
        hints: [
          'SELECT d.bx50Name, b.type FROM bx50Data d LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum;',
          'SELECT d.bx50Name, d.buildNum FROM bx50Data d LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum WHERE b.buildNum IS NULL;',
          'SELECT o.name, COUNT(s.id) AS sessions FROM operators o LEFT JOIN bx50Sessions s ON o.opId = s.userId GROUP BY o.name ORDER BY sessions;',
          'SELECT o.name FROM operators o LEFT JOIN bx50Sessions s ON o.opId = s.userId WHERE s.id IS NULL;',
        ],
      },
      {
        type: 'quiz',
        title: 'LEFT JOIN Quick-fire',
        questions: [
          {
            q: 'LEFT JOIN mein right table ka match nahi milta toh?',
            choices: [
              'Left ki row rehti hai, right ke saare columns NULL ho jaate hain',
              'Left ki row bhi gir jaati hai',
              'Error milta hai',
              'Right table ki pehli row lag jaati hai',
            ],
            answer: 0,
            explain: 'Yehi LEFT JOIN ka poora point hai — aur yehi NULL anti-join ko possible banata hai.',
          },
          {
            q: '"Woh operators jinhone kabhi session nahi kiya" — kaunsi query?',
            choices: [
              'FROM operators o LEFT JOIN bx50Sessions s ON o.opId = s.userId WHERE s.id IS NULL',
              'FROM operators o JOIN bx50Sessions s ON o.opId = s.userId WHERE s.id IS NULL',
              'FROM operators o WHERE o.opId NOT IN bx50Sessions',
              'FROM bx50Sessions s LEFT JOIN operators o ON s.userId = o.opId WHERE o.opId IS NULL',
            ],
            answer: 0,
            explain: 'Anti-join = LEFT JOIN + IS NULL on the right side. INNER JOIN ke saath yeh kabhi kuch nahi dega (match wale hi bachte hain).',
          },
          {
            q: 'LEFT JOIN ke saath <code>COUNT(*)</code> kyun galat hota hai?',
            choices: [
              'Bina match wali row bhi ek row hoti hai — COUNT(*) use 1 gin lega, jabki asli count 0 hai. COUNT(right.col) sahi hai',
              'COUNT(*) LEFT JOIN ke saath chalta hi nahi',
              'COUNT(*) dheema hota hai',
              'Koi farak nahi padta',
            ],
            answer: 0,
            explain: 'Yeh silently galat report banata hai — "har operator ne kam se kam 1 session kiya" jaisa jhoot. <code>COUNT(s.id)</code> likho.',
          },
          {
            q: 'RIGHT JOIN kam kyun use hota hai?',
            choices: [
              'Wahi kaam tables ka order badal ke LEFT JOIN se ho jaata hai, aur "pehli table poori" padhne mein zyada seedha lagta hai',
              'RIGHT JOIN MySQL mein support nahi hai',
              'RIGHT JOIN dheema hota hai',
              'RIGHT JOIN ka result galat hota hai',
            ],
            answer: 0,
            explain: 'Sirf readability ki baat hai — dono barabar taakatwar hain. Team codebase mein consistency zyada zaroori hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — LEFT JOIN',
      instructions: 'Yeh round aksar decide karta hai. 🎤',
      questions: [
        {
          q: '"INNER JOIN aur LEFT JOIN mein farak?"',
          choices: [
            'INNER sirf matched rows deta hai; LEFT left-table ki saari rows deta hai aur match na milne par right ke columns NULL bhar deta hai',
            'LEFT tez hota hai',
            'INNER zyada rows deta hai',
            'Dono same hain, sirf syntax alag hai',
          ],
          answer: 0,
          explain: 'Bonus point: "isliye <b>report jisme sabko dikhna chahiye</b> (zero wale bhi) LEFT JOIN maangti hai."',
        },
        {
          q: 'Interviewer: "Un customers ko dhoondo jinhone kabhi order nahi kiya."',
          choices: [
            'SELECT c.* FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE o.id IS NULL — anti-join pattern',
            'SELECT * FROM customers WHERE orders IS NULL',
            'SELECT c.* FROM customers c JOIN orders o ON c.id = o.customerId WHERE o.id IS NULL',
            'Do queries chala ke manually compare karunga',
          ],
          answer: 0,
          explain: 'Yeh <b>the</b> classic SQL interview question hai. Anti-join pattern ratna nahi, samajhna: LEFT sabko rakhta hai → NULL = no match → WHERE IS NULL se sirf wahi bachte hain.',
        },
        {
          q: '🎛️ Interviewer: "Ek report banao jisme har operator dikhe — zero wale bhi."',
          terminal: {
            title: 'Interview hands-on — LEFT JOIN',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Har operator ka naam + uske sessions ka count — <b>zero wale operators bhi dikhne chahiye</b> (<code>LEFT JOIN</code> + <code>COUNT(s.id)</code>). <b>(2)</b> Ab anti-join se sirf woh operator nikaalo jiska ek bhi session nahi. <b>(3)</b> Aur saare devices dikhao unke build type ke saath — orphan device NULL ke saath dikhna chahiye.',
            tasks: [
              { text: 'Per-operator count (zero wale bhi)', check: s => s.history.some(h => /left\s+join/i.test(h) && /count\s*\(\s*s\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h)) },
              { text: 'Anti-join: zero-session operator', check: s => s.history.some(h => /left\s+join\s+bx50sessions/i.test(h) && /is\s+null/i.test(h)) },
              { text: 'Saare devices + type (orphan NULL ke saath)', check: s => s.history.some(h => /left\s+join\s+bx50builds/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /left\s+join/i.test(h) && /count\s*\(\s*s\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h))
              && s.history.some(h => /left\s+join\s+bx50sessions/i.test(h) && /is\s+null/i.test(h))
              && s.history.some(h => /left\s+join\s+bx50builds/i.test(h)),
            successText: '✅ Teeno LEFT JOIN ke teen alag use-case the: <b>zero-inclusive report</b>, <b>anti-join</b>, aur <b>optional related data</b>. Yeh teen patterns 90% real reporting cover kar dete hain.',
            hints: [
              'SELECT o.name, COUNT(s.id) AS sessions FROM operators o LEFT JOIN bx50Sessions s ON o.opId = s.userId GROUP BY o.name;',
              'SELECT o.name FROM operators o LEFT JOIN bx50Sessions s ON o.opId = s.userId WHERE s.id IS NULL;',
              'SELECT d.bx50Name, b.type FROM bx50Data d LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum;',
            ],
          },
        },
      ],
    },
    success: [
      'Main LEFT JOIN aur INNER JOIN mein sahi choice kar sakta hoon',
      'Main anti-join (LEFT JOIN + IS NULL) se missing records dhoondh sakta hoon',
      'Main LEFT JOIN ke saath COUNT(right.col) likhta hoon, COUNT(*) nahi',
      'Main "kaun chhoot gaya" wale sawal ka SQL jawab de sakta hoon',
    ],
    homework: `<p>Anti-join ki practice — yeh pattern ratne se zyada samajhne ka hai:</p>
      <pre>USE factory;

-- Saare devices, build ho ya na ho
SELECT d.bx50Name, b.type
FROM bx50Data d LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum;

-- Orphans
SELECT d.bx50Name, d.buildNum
FROM bx50Data d LEFT JOIN bx50Builds b ON d.buildNum = b.buildNum
WHERE b.buildNum IS NULL;

-- COUNT trap khud dekho — ek operator banao jiska koi session na ho:
INSERT INTO operators (opId, name, shift) VALUES ('OP-909','Khaali Haath','day');

SELECT o.name, COUNT(*)   AS galat FROM operators o
LEFT JOIN bx50Sessions s ON o.opId = s.userId GROUP BY o.name;

SELECT o.name, COUNT(s.id) AS sahi FROM operators o
LEFT JOIN bx50Sessions s ON o.opId = s.userId GROUP BY o.name;
-- 'Khaali Haath' ke liye dono ka number compare karo!</pre>
      <p>✅ Self-check: <code>COUNT(*)</code> ne 1 dikhaya aur <code>COUNT(s.id)</code> ne 0? Yehi woh bug hai jo reports mein chup-chaap jhoot bolta hai.</p>`,
    cards: [
      { front: 'LEFT JOIN kya guarantee karta hai?', back: '<b>Left table ki har row</b> result mein aayegi. Match na mile toh right table ke saare columns <code>NULL</code>.' },
      { front: 'Anti-join pattern?', back: '<code>FROM a LEFT JOIN b ON … WHERE b.key IS NULL</code> — sirf woh rows jinka match <b>nahi</b> mila. Orphans, "kabhi order nahi kiya", "kabhi login nahi kiya".' },
      { front: 'LEFT JOIN + COUNT ka trap?', back: '<code>COUNT(*)</code> bina-match wali row ko bhi 1 gin leta hai. Hamesha <b><code>COUNT(right_table.col)</code></b> likho — woh NULL nahi ginta, isliye sahi 0 deta hai.' },
      { front: 'INNER ya LEFT — kaise chuno?', back: 'Sawal ki bhasha se: "sirf woh jinka X hai" = <b>INNER</b>. "sabko dikhao, X agar hai toh" ya "kiska X nahi hai" = <b>LEFT</b>.' },
      { front: 'RIGHT JOIN kam kyun dikhta hai?', back: 'Tables ka order badal ke wahi kaam LEFT JOIN se ho jaata hai, aur "pehli table poori" padhne mein saaf lagta hai. Taakat dono ki barabar hai.' },
    ],
  },

  /* ================= LEVEL 3: Relationships & FK ================= */
  {
    id: 'relations',
    icon: '🪢',
    title: 'Relationships — FK, 1:N, N:M',
    badge: 'Rishta Rachnakar',
    objectives: [
      '<b>FOREIGN KEY</b> — orphan rows ko rokne wali deewar',
      '<b>1:1, 1:N, N:M</b> — teen tarah ke rishte',
      '<b>Junction table</b> — N:M ko kaise banate hain',
      '<b>ON DELETE</b> — RESTRICT / CASCADE / SET NULL',
    ],
    lesson: [
      `<h3>🔗 FOREIGN KEY — woh cheez jo orphan rokti</h3>
       <p>Pichhle do level ka <code>bx50-osaka-01</code> problem yaad hai?
       Uska <code>buildNum</code> 1099 tha aur woh build exist hi nahi karta
       tha. <b>FOREIGN KEY</b> exactly yahi rokta hai:</p>
       <pre>CREATE TABLE bx50Data (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  bx50Name VARCHAR(100),
  buildNum INT NOT NULL,
  FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum)
);

INSERT INTO bx50Data (bx50Name, buildNum) VALUES ('x', 1099);
-- ERROR 1452: Cannot add or update a child row:
--             a foreign key constraint fails</pre>
       <p>Ab woh galat data <b>ghus hi nahi sakta</b>. Aur jis build ke devices
       hain use delete bhi nahi kar sakte (default <code>RESTRICT</code>) —
       jo cleanup script ne kiya tha, woh ab fail ho jayega. Achhi baat hai.</p>
       <p>💡 FK ka referenced column <b>PRIMARY KEY ya UNIQUE</b> hona chahiye —
       warna "kaunsi row?" ka jawab hi nahi banta.</p>`,
      `<h3>👨‍👩‍👧 Teen tarah ke rishte</h3>
       <p><b>1:N (one-to-many)</b> — sabse common. Ek build, kai devices.
       <b>FK hamesha "many" wali side par hoti hai:</b></p>
       <pre>bx50Builds (1) ←──── bx50Data (N)
                     buildNum FK</pre>
       <p><b>N:M (many-to-many)</b> — ek operator kai builds par kaam karta hai,
       aur ek build par kai operators. Yeh seedhe FK se nahi hota — beech mein
       ek <b>junction table</b> chahiye:</p>
       <pre>operators (N) ←── bx50Sessions ──→ (M) bx50Builds
                   userId FK  buildNum FK</pre>
       <p>Isiliye <code>bx50Sessions</code> exist karti hai. Aur bonus: junction
       table mein <b>extra data</b> bhi rakh sakte ho — yahan
       <code>startDate</code> aur <code>duration</code>.</p>
       <p><b>1:1</b> — kam milta hai. Use karte hain jab kuch columns
       <b>optional</b> hon ya <b>alag access control</b> chahiye. Jaise
       <code>bx50Data</code> ke saare password columns ek alag
       <code>bx50Credentials</code> table mein — taaki normal reporting query
       unhe chhu bhi na sake.</p>`,
      `<h3>💥 ON DELETE — parent gaya toh child ka kya?</h3>
       <table>
         <tr><th>Option</th><th>Parent delete karne par</th><th>Kab</th></tr>
         <tr><td><code>RESTRICT</code> (default)</td><td>❌ delete rok deta hai</td><td>zyadatar business data — safe default</td></tr>
         <tr><td><code>CASCADE</code></td><td>💥 child rows bhi delete</td><td>sach mein dependent data (order → order_items)</td></tr>
         <tr><td><code>SET NULL</code></td><td>child ka FK NULL ho jaata hai</td><td>optional rishta (employee → manager)</td></tr>
       </table>
       <pre>FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum)
  ON DELETE RESTRICT
  ON UPDATE CASCADE</pre>
       <div class="war-story"><b>⚡ Real incident:</b> Ek team ne "cleanup aasan
       ho jayega" soch ke har FK par <code>ON DELETE CASCADE</code> laga diya.
       Ek din intern ne ek purana test build delete kiya — cascade chala aur
       uske saath <b>us build ke saare devices, unke saare sessions, aur un
       sessions ke saare test results</b> chale gaye. Ek DELETE, chaar tables,
       11,000 rows. Backup se restore karna pada. Sabak: <b>CASCADE sirf tab
       jab child ka parent ke bina koi wajood hi na ho</b> (order ke bina
       order-item ka matlab nahi). Baaki har jagah <code>RESTRICT</code> —
       delete rukna <i>feature</i> hai, bug nahi.</div>`,
    ],
    stages: [
      {
        type: 'bins',
        title: 'Kaunsa rishta hai?',
        instructions: 'Har scenario ko sahi relationship type mein daalo.',
        bins: [
          { id: 'one_n', label: '1️⃣→🔢 1:N' },
          { id: 'n_m', label: '🔢↔️🔢 N:M (junction)' },
          { id: 'one_one', label: '1️⃣↔️1️⃣ 1:1' },
        ],
        items: [
          { text: 'Ek build, kai devices', bin: 'one_n', explain: '1:N — FK "many" side par (bx50Data.buildNum). Sabse common rishta.' },
          { text: 'Ek operator kai builds par, ek build par kai operators', bin: 'n_m', explain: 'N:M — beech mein junction table (bx50Sessions) chahiye, dono taraf FK ke saath.' },
          { text: 'Har device ka ek credentials record (secrets alag rakhne ke liye)', bin: 'one_one', explain: '1:1 — sensitive columns alag table mein, alag access control. Asli bx50Data ke 8 password columns ke liye perfect.' },
          { text: 'Ek customer, kai orders', bin: 'one_n', explain: '1:N — orders.customerId FK. Classic example.' },
          { text: 'Students aur courses (student kai courses, course mein kai students)', bin: 'n_m', explain: 'N:M — enrollments junction table, jisme grade/date jaisa extra data bhi rakh sakte ho.' },
          { text: 'Ek user, ek profile-settings row', bin: 'one_one', explain: '1:1 — optional/bade columns alag karne ke liye. FK par UNIQUE lagta hai.' },
          { text: 'Ek session, kai test results', bin: 'one_n', explain: '1:N — testResults.sessionId FK.' },
          { text: 'Products aur tags', bin: 'n_m', explain: 'N:M — product_tags junction table.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Relationship diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'relations',
        questions: [
          { q: 'Foreign key kis table mein hoti hai — "one" side ya "many" side?', target: 'fk', explain: 'FK hamesha "many" side par (bx50Data.buildNum). Ek build ke kai devices, isliye reference device ke paas hai.' },
          { q: 'N:M rishte ke liye beech mein kya chahiye?', target: 'junction', explain: 'Junction table — dono taraf FK. bx50Sessions operators aur builds ko jodti hai, aur extra data (duration) bhi rakhti hai.' },
          { q: '1:N mein "many" wali side kaunsi hai?', target: 'many', explain: 'bx50Data — ek build ke kai devices ho sakte hain.' },
        ],
      },
      {
        type: 'fill',
        title: 'FOREIGN KEY ke saath table banao',
        instructions: 'Ab woh orphan problem hamesha ke liye band karo. Blanks bharo.',
        template: `CREATE TABLE deviceRegistry (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  name     VARCHAR(100) NOT NULL,
  buildNum INT NOT NULL,
  {0} (buildNum) {1} bx50Builds(buildNum)
    ON DELETE {2}       -- referenced build delete na ho sake
    ON UPDATE CASCADE
);

-- N:M ke liye junction table:
CREATE TABLE buildOperators (
  buildNum INT NOT NULL,
  opId     VARCHAR(20) NOT NULL,
  hoursWorked DECIMAL(5,2),
  {3} (buildNum, opId)   -- dono milkar unique pehchaan
);`,
        tokens: ['FOREIGN KEY', 'REFERENCES', 'RESTRICT', 'PRIMARY KEY', 'UNIQUE KEY', 'CASCADE', 'SET NULL', 'CHECK'],
        blanks: [
          { answer: 'FOREIGN KEY', explain: '<code>FOREIGN KEY (col) REFERENCES parent(col)</code> — yeh woh deewar hai jo orphan rows rokti hai (ERROR 1452).' },
          { answer: 'REFERENCES', explain: 'Referenced column <b>PRIMARY KEY ya UNIQUE</b> hona chahiye — warna "kaunsi row?" ka jawab hi nahi banta.' },
          { answer: 'RESTRICT', explain: '<code>RESTRICT</code> = safe default. Jis build ke devices hain, woh delete nahi hoga. <code>CASCADE</code> ne asli project mein 11,000 rows uda diye the.' },
          { answer: 'PRIMARY KEY', explain: 'Junction table ki PK aksar <b>composite</b> hoti hai — <code>(buildNum, opId)</code>. Isse ek jodi do baar enter nahi ho sakti.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Rishte samjho, orphan pakdo',
        instructions: 'Junction table se N:M query karo, aur data integrity check karo.',
        goal: '<b>(1)</b> Junction table ka istemal: har build ke liye kaunse operators ne kaam kiya — <code>bx50Sessions</code> ko <code>operators</code> aur <code>bx50Builds</code> dono se JOIN karo. <b>(2)</b> Har build ke kitne <b>alag-alag</b> operators the — <code>COUNT(DISTINCT s.userId)</code> + <code>GROUP BY</code>. <b>(3)</b> Integrity check: kya koi <b>session</b> aise build ko point karta hai jo exist nahi karta? Anti-join se dekho. <b>(4)</b> Naya table <code>deviceRegistry</code> banao <code>FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum)</code> ke saath.',
        tasks: [
          { text: 'Sessions + operator + build (2 JOIN)', check: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2 && /bx50sessions/i.test(h)) },
          { text: 'Per-build distinct operator count', check: s => s.history.some(h => /count\s*\(\s*distinct/i.test(h) && /group\s+by/i.test(h)) },
          { text: 'Anti-join se orphan sessions check karo', check: s => s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)) },
          { text: 'deviceRegistry table FK ke saath banao', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'deviceregistry') },
        ],
        db: SG.factoryDB(),
        success: s => {
          const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'deviceregistry');
          return !!k
            && s.history.some(h => (h.match(/join/gi) || []).length >= 2 && /bx50sessions/i.test(h))
            && s.history.some(h => /count\s*\(\s*distinct/i.test(h) && /group\s+by/i.test(h))
            && s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h));
        },
        successText: '🎉 <b>Rishte saaf ho gaye.</b> <code>bx50Sessions</code> ne apna asli roop dikhaya — woh sirf ek table nahi, <b>junction table</b> hai jo operators aur builds ke N:M rishte ko sambhalti hai, aur saath mein <code>duration</code> jaisa extra data bhi rakhti hai. Aur ab <code>deviceRegistry</code> par <b>FOREIGN KEY</b> hai — <code>bx50-osaka-01</code> jaisa orphan usme kabhi ghus hi nahi sakta (ERROR 1452 milega). <b>Constraint likhne ka sahi waqt schema banate waqt hota hai, incident ke baad nahi.</b>',
        hints: [
          'SELECT b.buildNum, b.type, o.name, s.duration FROM bx50Sessions s JOIN operators o ON s.userId = o.opId JOIN bx50Builds b ON s.buildNum = b.buildNum;',
          'SELECT s.buildNum, COUNT(DISTINCT s.userId) AS operators FROM bx50Sessions s GROUP BY s.buildNum;',
          'SELECT s.id, s.buildNum FROM bx50Sessions s LEFT JOIN bx50Builds b ON s.buildNum = b.buildNum WHERE b.buildNum IS NULL;',
          'CREATE TABLE deviceRegistry (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL, buildNum INT NOT NULL, FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum));',
        ],
      },
      {
        type: 'quiz',
        title: 'Relationships Quick-fire',
        questions: [
          {
            q: '1:N rishte mein FOREIGN KEY kis table mein hoti hai?',
            choices: [
              '"Many" wali table mein — ek build ke kai devices, isliye FK device ke paas',
              '"One" wali table mein',
              'Dono mein',
              'Ek alag junction table mein',
            ],
            answer: 0,
            explain: 'Socho: ek device <b>ek</b> build ko point karta hai — toh reference device ke paas rakh sakte ho. Ulta karte toh build mein "kai device ids" rakhne padte, jo ek column mein nahi aata.',
          },
          {
            q: 'N:M rishta kaise banate hain?',
            choices: [
              'Beech mein junction table — dono taraf FK, aur composite PK (a_id, b_id)',
              'Dono tables mein ek-ek FK daal do',
              'Ek column mein comma-separated ids rakho',
              'N:M possible hi nahi',
            ],
            answer: 0,
            explain: 'Comma-separated ids 1NF todta hai (Level 5) — JOIN, index, constraint sab bekaar ho jaate hain. Junction table hi sahi jawab hai.',
          },
          {
            q: '<code>ON DELETE CASCADE</code> kab use karna chahiye?',
            choices: [
              'Sirf tab jab child ka parent ke bina koi wajood hi na ho — jaise order → order_items',
              'Hamesha — cleanup aasan ho jaata hai',
              'Kabhi nahi',
              'Sirf tab jab table chhoti ho',
            ],
            answer: 0,
            explain: 'Asli project mein har jagah CASCADE lagane se ek DELETE ne 4 tables ki 11,000 rows uda di thi. <b>RESTRICT safe default hai</b> — delete rukna feature hai.',
          },
          {
            q: 'FOREIGN KEY ka referenced column kaisa hona chahiye?',
            choices: [
              'PRIMARY KEY ya UNIQUE — warna "kaunsi row" ka jawab hi nahi banta',
              'Koi bhi column chalega',
              'Hamesha INT hona chahiye',
              'NOT NULL hona kaafi hai',
            ],
            answer: 0,
            explain: 'Reference ek <b>ek row</b> ko point karna chahiye. Duplicate values wale column par FK MySQL allow nahi karta.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Relationships',
      instructions: 'Schema design ka asli round. 🎤',
      questions: [
        {
          q: '"Students aur courses ka schema design karo."',
          choices: [
            'Teen tables: students, courses, aur enrollments (junction) jisme studentId + courseId FK aur composite PK — plus enrolledAt/grade jaisa extra data',
            'Do tables — courses mein studentIds comma-separated rakh dunga',
            'Do tables — students mein courseId FK',
            'Ek hi table jisme sab kuch ho',
          ],
          answer: 0,
          explain: 'N:M ka standard jawab. Bonus point: junction table mein <b>rishte ka apna data</b> (grade, enrolledAt) rakhna — yeh senior soch hai.',
        },
        {
          q: 'Interviewer: "FK constraints performance kharab karte hain, hata dein?"',
          choices: [
            'Write par thodi cost hai, par woh orphan data se bachne ki keemat hai — aur orphan data ka clean-up kahin zyada mehnga padta hai. Bahut high-throughput case mein hi sochunga, aur tab app-level integrity guarantee karni padegi',
            'Haan, hata do — app validation kaafi hai',
            'Nahi, kabhi nahi hata sakte',
            'FK ka performance par koi asar nahi hota',
          ],
          answer: 0,
          explain: 'Achha jawab trade-off maanta hai par <b>default integrity ke paksh mein</b> rehta hai. Asli project ka missing-device incident bilkul yahi bug tha.',
        },
        {
          q: '🎛️ Interviewer: "Junction table se query karke dikhao."',
          terminal: {
            title: 'Interview hands-on — relationships',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Har operator ne kis-kis build par kaam kiya — <code>bx50Sessions</code> junction table se, operator ke naam aur build ke type ke saath. <b>(2)</b> Har operator ka total kaam ka waqt — <code>SUM(s.duration)</code> + <code>GROUP BY</code>, sabse zyada upar. <b>(3)</b> Ek build par kitne alag operators the — <code>COUNT(DISTINCT ...)</code>.',
            tasks: [
              { text: 'Operator × build (junction se 2 JOIN)', check: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2) },
              { text: 'Per-operator SUM(duration)', check: s => s.history.some(h => /sum\s*\(/i.test(h) && /group\s+by/i.test(h)) },
              { text: 'Per-build distinct operators', check: s => s.history.some(h => /count\s*\(\s*distinct/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2)
              && s.history.some(h => /sum\s*\(/i.test(h) && /group\s+by/i.test(h))
              && s.history.some(h => /count\s*\(\s*distinct/i.test(h)),
            successText: '✅ Junction table se dono directions query kar li — operator→builds aur build→operators. Yehi N:M ka poora faayda hai, aur <code>duration</code> jaisa relationship-data uspar bonus.',
            hints: [
              'SELECT o.name, b.buildNum, b.type FROM bx50Sessions s JOIN operators o ON s.userId = o.opId JOIN bx50Builds b ON s.buildNum = b.buildNum;',
              'SELECT o.name, SUM(s.duration) AS total_ms FROM bx50Sessions s JOIN operators o ON s.userId = o.opId GROUP BY o.name ORDER BY total_ms DESC;',
              'SELECT buildNum, COUNT(DISTINCT userId) AS ops FROM bx50Sessions GROUP BY buildNum;',
            ],
          },
        },
      ],
    },
    success: [
      'Main FOREIGN KEY laga sakta hoon aur jaanta hoon woh kya rokta hai',
      'Main 1:1, 1:N aur N:M ko pehchaan ke schema design kar sakta hoon',
      'Main junction table se N:M rishta bana sakta hoon',
      'Main ON DELETE RESTRICT vs CASCADE ka faisla justify kar sakta hoon',
    ],
    homework: `<p>FK ko kaam karte hue dekho:</p>
      <pre>USE factory;

-- Purani table ko FK ke saath dobara banao
DROP TABLE IF EXISTS bx50Data;
CREATE TABLE bx50Data (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  bx50Name VARCHAR(100),
  buildNum INT NOT NULL,
  FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum) ON DELETE RESTRICT
);

INSERT INTO bx50Data (bx50Name, buildNum) VALUES ('bx50-tokyo-01', 1041);  -- OK
INSERT INTO bx50Data (bx50Name, buildNum) VALUES ('bx50-osaka-01', 1099);  -- ERROR 1452!

-- Ab parent delete karke dekho
DELETE FROM bx50Builds WHERE buildNum = 1041;   -- ERROR 1451 (child rows hain)

-- Junction table (N:M)
CREATE TABLE buildOperators (
  buildNum INT NOT NULL,
  opId     VARCHAR(20) NOT NULL,
  hours    DECIMAL(5,2),
  PRIMARY KEY (buildNum, opId),
  FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum),
  FOREIGN KEY (opId)     REFERENCES operators(opId)
);
INSERT INTO buildOperators VALUES (1041,'OP-101',3.5);
INSERT INTO buildOperators VALUES (1041,'OP-101',2.0);   -- ERROR 1062 (composite PK)</pre>
      <p>✅ Self-check: ERROR 1452 (orphan insert) aur 1451 (parent delete) dono mile? Composite PK ne duplicate jodi roki?</p>`,
    cards: [
      { front: 'FOREIGN KEY kya rokta hai?', back: 'Orphan rows — aise child jinka parent exist hi nahi karta (<b>ERROR 1452</b>). Aur default <code>RESTRICT</code> se referenced parent delete bhi nahi hota (<b>ERROR 1451</b>).' },
      { front: '1:N mein FK kahan hoti hai?', back: '<b>"Many" side par.</b> Ek build → kai devices, isliye <code>bx50Data.buildNum</code> FK hai. Referenced column PK/UNIQUE hona chahiye.' },
      { front: 'N:M kaise banate hain?', back: '<b>Junction table</b> — dono taraf FK, composite PK <code>(a_id, b_id)</code>. Bonus: rishte ka apna data (duration, grade) usi table mein.' },
      { front: 'ON DELETE RESTRICT vs CASCADE vs SET NULL?', back: '<b>RESTRICT</b> (default, safe) = delete rok do. <b>CASCADE</b> = child bhi delete (sirf jab child ka parent ke bina wajood na ho). <b>SET NULL</b> = optional rishta.' },
      { front: 'CASCADE ka khatra?', back: 'Ek DELETE chain reaction bana sakta hai. Asli case: ek purana build delete → devices → sessions → results, <b>4 tables, 11,000 rows</b> gaye. Restore karna pada.' },
    ],
  },

  /* ================= LEVEL 4: Subqueries ================= */
  {
    id: 'subquery',
    icon: '🎁',
    title: 'Subqueries — Query ke Andar Query',
    badge: 'Nested Nayak',
    objectives: [
      '<b>IN (SELECT ...)</b> — list banao, phir filter karo',
      '<b>Scalar subquery</b> — ek value nikaal ke compare karo',
      '<b>Subquery vs JOIN</b> — kab kya chunna',
      '<b>NOT IN + NULL</b> ka khatarnak jaal',
    ],
    lesson: [
      `<h3>🎁 Subquery = jawab ke andar jawab</h3>
       <p>"Woh devices dikhao jinke build ka type Gen4 hai." Do tareeke:</p>
       <pre>-- Tareeka 1: subquery
SELECT bx50Name FROM bx50Data
WHERE  buildNum IN (SELECT buildNum FROM bx50Builds WHERE type = 'Gen4');

-- Tareeka 2: JOIN
SELECT d.bx50Name FROM bx50Data d
JOIN   bx50Builds b ON d.buildNum = b.buildNum
WHERE  b.type = 'Gen4';</pre>
       <p>Dono sahi hain. Andar wali query <b>pehle</b> chalti hai aur ek list
       banati hai <code>(1041, 1043, 1044, 1046, 1047)</code>; bahar wali us
       list mein check karti hai.</p>
       <p><b>Kaunsa chuno?</b></p>
       <ul>
         <li>Output mein sirf <b>ek table</b> ke columns chahiye → <b>subquery</b>
             padhne mein saaf lagti hai ("Gen4 wali list banao, phir filter karo")</li>
         <li>Output mein <b>dono tables</b> ke columns chahiye → <b>JOIN</b>
             (subquery se columns nahi mil sakte)</li>
       </ul>`,
      `<h3>🔢 Scalar subquery — ek value wapas</h3>
       <p>Jab subquery <b>ek hi value</b> deti hai, use seedha compare mein use
       kar sakte ho:</p>
       <pre>-- Average se lambi builds
SELECT buildNum, duration FROM bx50Builds
WHERE  duration > (SELECT AVG(duration) FROM bx50Builds);

-- Sabse lambi build
SELECT * FROM bx50Builds
WHERE  duration = (SELECT MAX(duration) FROM bx50Builds);</pre>
       <p>Yeh <b>ek hi query</b> mein "pehle average nikaalo, phir usse compare
       karo" kar deta hai — do queries chalane aur beech mein value copy karne
       ki zaroorat nahi.</p>
       <p>⚠️ Scalar subquery sach mein <b>ek</b> row deni chahiye. Zyada rows
       aaye toh: <code>ERROR 1242: Subquery returns more than 1 row</code>.</p>`,
      `<h3>☠️ NOT IN + NULL — SQL ka sabse chhupa jaal</h3>
       <p>Yeh bug itna chupa hua hai ki senior log bhi fansate hain.</p>
       <pre>-- Woh builds jinka koi device nahi
SELECT buildNum FROM bx50Builds
WHERE  buildNum NOT IN (SELECT buildNum FROM bx50Data);
-- Agar bx50Data.buildNum mein EK BHI NULL hua toh:
-- RESULT HAMESHA KHAALI 😱</pre>
       <p>Kyun? <code>NOT IN (1041, 1042, NULL)</code> ka matlab hai
       <code>x != 1041 AND x != 1042 AND x != NULL</code>. Aur
       <code>x != NULL</code> ka jawab <b>NULL</b> hota hai (na true, na false) —
       toh poori AND chain kabhi true nahi hoti. <b>Har row chhoot jaati hai.</b></p>
       <p>Teen ilaaj:</p>
       <pre>-- 1. NULL hata do
WHERE buildNum NOT IN (SELECT buildNum FROM bx50Data WHERE buildNum IS NOT NULL)

-- 2. NOT EXISTS use karo (NULL-safe)
WHERE NOT EXISTS (SELECT 1 FROM bx50Data d WHERE d.buildNum = b.buildNum)

-- 3. Anti-join (Level 2 wala) — sabse readable
LEFT JOIN bx50Data d ON b.buildNum = d.buildNum WHERE d.buildNum IS NULL</pre>
       <div class="war-story"><b>⚡ Real incident:</b> "Unused builds" cleanup
       script <code>NOT IN</code> par bani thi. Mahino tak woh <b>0 builds</b>
       return karti rahi — team ne maan liya "sab builds use ho rahe hain,
       cleanup ki zaroorat nahi". Phir disk bhar gaya. Investigate kiya toh pata
       chala <code>bx50Data.buildNum</code> mein kuch NULL rows aa gayi thi
       (ek purane import se), aur us din se <code>NOT IN</code> chup-chaap
       khaali result de raha tha. Sabak: <b><code>NOT IN</code> ke saath
       subquery mein hamesha <code>IS NOT NULL</code> lagao — ya
       <code>NOT EXISTS</code>/anti-join use karo.</b></div>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'Subquery diagram par ungli rakho',
        instructions: 'Diagram mein sahi hissa click karo.',
        visual: 'subquery',
        questions: [
          { q: 'Kaunsi query pehle chalti hai?', target: 'inner', explain: 'Inner (subquery) pehle — woh ek list ya value banati hai, phir outer usse use karta hai.' },
          { q: 'Outer query mein list ko check karne wala operator?', target: 'insub', explain: 'IN (subquery) — subquery ki list mein value dhoondhta hai.' },
          { q: 'Dono tables ke columns output mein chahiye toh kya better hai?', target: 'joinvs', explain: 'JOIN — subquery se sirf filter hota hai, uske columns output mein nahi aa sakte.' },
        ],
      },
      {
        type: 'fill',
        title: 'Subquery likho — aur NOT IN ka jaal bacho',
        instructions: 'Do queries. Doosri mein NULL-safety zaroori hai. Blanks bharo.',
        template: `-- Average se lambi builds (scalar subquery)
SELECT buildNum, duration
FROM   bx50Builds
WHERE  duration > (SELECT {0} FROM bx50Builds);

-- Woh builds jinka koi device nahi (NULL-safe!)
SELECT buildNum
FROM   bx50Builds
WHERE  buildNum {1} (
         SELECT buildNum FROM bx50Data
         WHERE buildNum {2}          -- ← YEH line bug rokti hai
       );`,
        tokens: ['AVG(duration)', 'NOT IN', 'IS NOT NULL', 'SUM(duration)', 'IN', 'IS NULL', 'COUNT(*)', '!= NULL'],
        blanks: [
          { answer: 'AVG(duration)', explain: 'Scalar subquery — ek hi value deti hai, isliye seedha <code>&gt;</code> ke saath compare ho jaati hai.' },
          { answer: 'NOT IN', explain: '"Jinka koi device nahi" = <code>NOT IN</code>. (Ya <code>NOT EXISTS</code> / anti-join — dono NULL-safe hain.)' },
          { answer: 'IS NOT NULL', explain: '<b>Yeh line bug rokti hai.</b> Subquery mein ek bhi NULL aaya toh <code>NOT IN</code> ka result <b>hamesha khaali</b> ho jaata hai — kyunki <code>x != NULL</code> ka jawab NULL hai, true nahi.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: NOT IN ka jaal khud dekho',
        instructions: 'Ek NULL, aur poori cleanup script bekaar. Live dekho.',
        goal: 'Cleanup script mahino se 0 builds bata rahi thi. <b>(1)</b> Scalar subquery se average se lambi builds nikaalo: <code>WHERE duration > (SELECT AVG(duration) FROM bx50Builds)</code>. <b>(2)</b> <code>IN (SELECT ...)</code> se Gen4 builds ke devices dhoondo. <b>(3)</b> Ab <code>NOT IN</code> wali cleanup query chalao — <code>bx50Data</code> mein ek NULL <code>buildNum</code> hai, dekho result khaali aata hai. <b>(4)</b> Use theek karo: subquery mein <code>WHERE buildNum IS NOT NULL</code> lagao — ab asli unused builds dikhenge.',
        tasks: [
          { text: 'Scalar subquery — AVG se lambi builds', check: s => s.history.some(h => /select\s+avg\s*\(/i.test(h) && /where\s+duration\s*>/i.test(h)) },
          { text: 'IN (SELECT ...) — Gen4 ke devices', check: s => s.history.some(h => /in\s*\(\s*select/i.test(h)) },
          { text: 'NOT IN chalao — khaali result dekho (bug)', check: s => s.history.some(h => /not\s+in\s*\(\s*select/i.test(h)) },
          { text: 'IS NOT NULL laga ke theek karo', check: s => s.history.some(h => /not\s+in\s*\(\s*select/i.test(h) && /is\s+not\s+null/i.test(h)) },
        ],
        db: SG.factoryDB(db => {
          // ek purane import se aayi NULL buildNum wali row — yehi NOT IN ko tod deti hai
          db.tables.bx50Data.columns.find(c => c.name === 'buildNum').notNull = false;
          db.tables.bx50Data.rows.push({
            id: 8, bx50Name: 'bx50-legacy-import', ip: null, nucSerialNum: null,
            buildNum: null, status: 'Not Built', bx50Status: 0, secure: 0,
            customerLocation: null, bx50Gen: null,
          });
        }),
        success: s => s.history.some(h => /select\s+avg\s*\(/i.test(h) && /where\s+duration\s*>/i.test(h))
          && s.history.some(h => /\bin\s*\(\s*select/i.test(h) && !/not\s+in/i.test(h))
          && s.history.some(h => /not\s+in\s*\(\s*select/i.test(h) && !/is\s+not\s+null/i.test(h))
          && s.history.some(h => /not\s+in\s*\(\s*select/i.test(h) && /is\s+not\s+null/i.test(h)),
        successText: '🎉 <b>Bug apni aankhon se dekha.</b> Pehli <code>NOT IN</code> query ne <b>Empty set</b> diya — koi error nahi, bas jhoot. Wajah: <code>bx50-legacy-import</code> row ka <code>buildNum</code> NULL hai, aur <code>x != NULL</code> ka jawab NULL hota hai, isliye poori AND chain kabhi true nahi hoti. <code>IS NOT NULL</code> lagate hi asli unused builds dikh gaye. <b>Yaad rakho: <code>NOT IN</code> + subquery = hamesha <code>IS NOT NULL</code>, ya <code>NOT EXISTS</code>/anti-join use karo.</b>',
        hints: [
          'SELECT buildNum, duration FROM bx50Builds WHERE duration > (SELECT AVG(duration) FROM bx50Builds);',
          "SELECT bx50Name FROM bx50Data WHERE buildNum IN (SELECT buildNum FROM bx50Builds WHERE type = 'Gen4');",
          'SELECT buildNum FROM bx50Builds WHERE buildNum NOT IN (SELECT buildNum FROM bx50Data);   ← Empty set!',
          'SELECT buildNum FROM bx50Builds WHERE buildNum NOT IN (SELECT buildNum FROM bx50Data WHERE buildNum IS NOT NULL);',
        ],
      },
      {
        type: 'quiz',
        title: 'Subquery Quick-fire',
        questions: [
          {
            q: '<code>NOT IN (SELECT col FROM t)</code> aur us column mein ek NULL hai. Result?',
            choices: [
              'Hamesha khaali — kyunki x != NULL ka jawab NULL hota hai, true nahi',
              'NULL wali row chhod ke baaki sahi result',
              'Error milta hai',
              'Koi farak nahi padta',
            ],
            answer: 0,
            explain: 'SQL ka sabse chhupa jaal. Asli project mein cleanup script mahino tak 0 return karti rahi. Fix: <code>IS NOT NULL</code> ya <code>NOT EXISTS</code>.',
          },
          {
            q: 'Subquery ke bajaye JOIN kab zaroori ho jaata hai?',
            choices: [
              'Jab output mein doosri table ke columns bhi chahiye — subquery sirf filter karti hai, uske columns nahi milte',
              'Jab table badi ho',
              'Jab do se zyada tables hon',
              'JOIN kabhi zaroori nahi',
            ],
            answer: 0,
            explain: 'Yehi asli faisla hai. Sirf filter chahiye → subquery padhne mein saaf. Dono ke columns chahiye → JOIN.',
          },
          {
            q: 'Scalar subquery kya hoti hai?',
            choices: [
              'Woh jo ek hi value deti hai — isliye =, >, < ke saath seedha compare ho sakti hai',
              'Woh jo ek hi row deti hai',
              'Woh jo bahar wali query se tez chalti hai',
              'Woh jo sirf COUNT use karti hai',
            ],
            answer: 0,
            explain: '<code>WHERE duration > (SELECT AVG(duration) FROM t)</code>. Ek se zyada row aayi toh ERROR 1242.',
          },
          {
            q: '"Jinka koi related record nahi" — teen tareeke mein sabse readable kaunsa?',
            choices: [
              'Anti-join: LEFT JOIN ... WHERE right.col IS NULL — NULL-safe bhi hai aur padhne mein saaf bhi',
              'NOT IN — sabse chhota hai',
              'Nested NOT IN NOT IN',
              'Do queries chala ke manually compare karna',
            ],
            answer: 0,
            explain: 'Teeno (NOT IN + IS NOT NULL, NOT EXISTS, anti-join) sahi hain. Anti-join NULL-safe hai aur team ke liye padhna aasan — isiliye default choice.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Subqueries',
      instructions: 'Yahan NULL wala jaal fir se aata hai. 🎤',
      questions: [
        {
          q: '"Subquery aur JOIN mein kaise choose karte ho?"',
          choices: [
            'Output mein sirf ek table ke columns chahiye aur logic "list banao phir filter karo" hai → subquery zyada readable. Dono tables ke columns chahiye → JOIN. Performance mein aaj kal optimizer aksar dono ko same plan bana deta hai, toh main EXPLAIN se verify karta hoon',
            'Hamesha JOIN — subquery slow hoti hai',
            'Hamesha subquery — padhne mein aasan hai',
            'Koi farak nahi, dono same hain',
          ],
          answer: 0,
          explain: 'Achha jawab: <b>readability pehle, phir EXPLAIN se verify</b>. "Subquery hamesha slow hoti hai" purani baat hai — modern optimizers aksar unhe JOIN mein badal dete hain.',
        },
        {
          q: 'Interviewer: "Tumhari NOT IN query khaali result de rahi hai par data toh hai. Kya hua?"',
          choices: [
            'Subquery ke column mein NULL hoga — NOT IN us case mein hamesha khaali deta hai. Main IS NOT NULL lagaunga ya NOT EXISTS/anti-join par switch karunga',
            'Table lock ho gaya hoga',
            'Index missing hoga',
            'Subquery ko alag chala ke dekhunga, aur kuch nahi kar sakte',
          ],
          answer: 0,
          explain: 'Yeh sawal seedha real bug se aata hai. Turant "NULL" bolna hi jawab hai — aur teen fixes bata dena bonus.',
        },
        {
          q: '🎛️ Interviewer: "Subquery se do queries likho."',
          terminal: {
            title: 'Interview hands-on — subqueries',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Woh sessions jinki <code>duration</code> average se zyada hai — scalar subquery use karo. <b>(2)</b> Woh operators jinhone kisi <b>Gen4</b> build par kaam kiya — <code>IN (SELECT ...)</code> se (nested bhi ho sakta hai). <b>(3)</b> Woh builds jinka koi session nahi hua — NULL-safe tarike se (<code>NOT IN … IS NOT NULL</code> ya anti-join).',
            tasks: [
              { text: 'Average se lambi sessions (scalar subquery)', check: s => s.history.some(h => /\(\s*select\s+avg/i.test(h)) },
              { text: 'Gen4 par kaam karne wale operators (IN)', check: s => s.history.some(h => /\bin\s*\(\s*select/i.test(h)) },
              { text: 'Bina session wale builds (NULL-safe)', check: s => s.history.some(h => (/not\s+in\s*\(\s*select/i.test(h) && /is\s+not\s+null/i.test(h)) || (/left\s+join/i.test(h) && /is\s+null/i.test(h))) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /\(\s*select\s+avg/i.test(h))
              && s.history.some(h => /\bin\s*\(\s*select/i.test(h))
              && s.history.some(h => (/not\s+in\s*\(\s*select/i.test(h) && /is\s+not\s+null/i.test(h)) || (/left\s+join/i.test(h) && /is\s+null/i.test(h))),
            successText: '✅ Teeno subquery patterns: <b>scalar</b> (compare), <b>IN</b> (list filter), aur <b>NULL-safe anti pattern</b>. Teesri mein tumne NULL ka dhyaan rakha — yahi woh detail hai jo interviewer note karta hai.',
            hints: [
              'SELECT id, userId, duration FROM bx50Sessions WHERE duration > (SELECT AVG(duration) FROM bx50Sessions);',
              "SELECT DISTINCT userId FROM bx50Sessions WHERE buildNum IN (SELECT buildNum FROM bx50Builds WHERE type = 'Gen4');",
              'SELECT b.buildNum FROM bx50Builds b LEFT JOIN bx50Sessions s ON b.buildNum = s.buildNum WHERE s.id IS NULL;',
            ],
          },
        },
      ],
    },
    success: [
      'Main IN (SELECT ...) aur scalar subquery likh sakta hoon',
      'Main subquery vs JOIN ka faisla justify kar sakta hoon',
      'Main NOT IN + NULL ka jaal jaanta hoon aur usse bachta hoon',
      'Main NOT EXISTS / anti-join ko NULL-safe alternative ke roop mein use karta hoon',
    ],
    homework: `<p>NOT IN ka jaal apne DB par khud banao:</p>
      <pre>USE factory;

-- Scalar subquery
SELECT buildNum, duration FROM bx50Builds
WHERE duration > (SELECT AVG(duration) FROM bx50Builds);

-- Ab jaal banao: ek NULL daalo
INSERT INTO bx50Data (bx50Name, buildNum) VALUES ('legacy-row', NULL);

SELECT buildNum FROM bx50Builds
WHERE buildNum NOT IN (SELECT buildNum FROM bx50Data);        -- KHAALI!

SELECT buildNum FROM bx50Builds
WHERE buildNum NOT IN (SELECT buildNum FROM bx50Data WHERE buildNum IS NOT NULL);

-- NOT EXISTS (NULL-safe by design)
SELECT b.buildNum FROM bx50Builds b
WHERE NOT EXISTS (SELECT 1 FROM bx50Data d WHERE d.buildNum = b.buildNum);</pre>
      <p>✅ Self-check: Pehli NOT IN query khaali aayi? Baaki dono ne sahi builds diye? Yeh farak yaad rakhna — interview mein aata hai.</p>`,
    cards: [
      { front: 'NOT IN + NULL ka jaal?', back: 'Subquery mein ek bhi NULL aaya toh <code>NOT IN</code> ka result <b>hamesha khaali</b> (kyunki <code>x != NULL</code> = NULL, true nahi). Fix: <code>IS NOT NULL</code>, <code>NOT EXISTS</code>, ya anti-join.' },
      { front: 'Subquery vs JOIN — kab kya?', back: 'Sirf <b>filter</b> chahiye aur ek table ke columns → <b>subquery</b> (readable). <b>Dono tables</b> ke columns output mein → <b>JOIN</b> (subquery se columns nahi milte).' },
      { front: 'Scalar subquery?', back: 'Ek hi value deti hai, isliye <code>=</code>/<code>&gt;</code>/<code>&lt;</code> ke saath seedha compare: <code>WHERE duration &gt; (SELECT AVG(duration) FROM t)</code>. Zyada rows aayi toh ERROR 1242.' },
      { front: '"Jinka koi related record nahi" — 3 tareeke?', back: '1) <code>NOT IN (… WHERE col IS NOT NULL)</code> 2) <code>NOT EXISTS (…)</code> 3) <b>anti-join</b>: <code>LEFT JOIN … WHERE right.col IS NULL</code>. Teesra sabse readable aur NULL-safe.' },
      { front: 'Subquery kab chalti hai?', back: '<b>Inner pehle</b> — woh list ya value banati hai, phir outer use use karta hai. (Correlated subquery har outer row ke liye dobara chalti hai — woh slow ho sakti hai.)' },
    ],
  },

  /* ================= LEVEL 5: Normalization ================= */
  {
    id: 'normal',
    icon: '🧹',
    title: 'Normalization — God-Table se 3NF tak',
    badge: 'Schema Safai Wala',
    objectives: [
      '<b>Duplicate data</b> kaise anomalies banata hai',
      '<b>1NF / 2NF / 3NF</b> — practical bhasha mein',
      'Asli 40-column <b>god-table</b> ko todna',
      '<b>Denormalization</b> — jaan-boojh ke kab todte hain',
    ],
    lesson: [
      `<h3>😱 God-table — asli project ka bx50Data</h3>
       <p>Asli factory ka <code>bx50Data</code> table ek hi jagah yeh sab rakhta
       tha (~40 columns):</p>
       <pre>bx50Data:
  device info    → bx50Name, ip, nucSerialNum, bx50Gen, status
  build info     → buildNum, buildDate, buildDuration, jobId
  customer info  → customerLocation, notes
  SECRETS        → bios_password, api_jwt_key, cipher_secret, cipher_key,
                   mongo_db_password, mysql_password, mysql_root_password,
                   mqtt_user, mqtt_password, debuggerPW, token</pre>
       <p>Isse teen tarah ki takleef hoti hai (inhe <b>anomalies</b> kehte hain):</p>
       <ul>
         <li>✏️ <b>Update anomaly</b> — customer ka location badla? 50 device rows
             update karo. Ek chhoot gayi = data ab do jagah do baatein kehta hai.</li>
         <li>➕ <b>Insert anomaly</b> — naya customer add karna hai par abhi uska
             koi device nahi? Kahan likhoge?</li>
         <li>🗑️ <b>Delete anomaly</b> — aakhri device delete kiya toh us customer
             ki poori info bhi ud gayi.</li>
       </ul>
       <p>Aur ek bonus problem: <code>SELECT *</code> chalate hi <b>saare
       secrets</b> bhi output mein aa jaate hain (Level 1 ka war story yaad hai?).</p>`,
      `<h3>📐 1NF → 2NF → 3NF, aasan bhasha mein</h3>
       <p><b>1NF — har cell mein ek value.</b> Koi list nahi, koi repeating
       groups nahi:</p>
       <pre>❌ operators: skills = 'BMS,ADC,BX50'     -- ek cell mein list
✅ operator_skills table: (opId, skill) — har skill apni row</pre>
       <p>Comma-separated list mein na JOIN kar sakte ho, na index laga sakte ho,
       na FK — aur <code>LIKE '%ADC%'</code> "ADC2" ko bhi match kar dega.</p>
       <p><b>2NF — composite PK ho toh har non-key column poori key par depend
       kare</b> (aadhi par nahi):</p>
       <pre>❌ sessions (buildNum, opId) PK + operatorName
   -- operatorName sirf opId par depend karta hai, poori key par nahi
✅ operatorName ko operators table mein rakho</pre>
       <p><b>3NF — koi non-key column doosre non-key column par depend na kare:</b></p>
       <pre>❌ bx50Data: ..., customerId, customerName, customerLocation
   -- customerName customerId par depend karta hai, device par nahi
✅ customers table alag; bx50Data mein sirf customerId FK</pre>
       <p>💡 <b>Ek line ka rule:</b> "<b>har fact ek hi jagah likho.</b>" Baaki
       jagah uska FK reference rakho. 3NF isi ka formal roop hai.</p>`,
      `<h3>⚖️ Denormalization — jab jaan-boojh ke todte hain</h3>
       <p>Normalization dharm nahi hai, tool hai. Kabhi-kabhi <b>samajh ke</b>
       todna sahi hota hai:</p>
       <ul>
         <li>📊 <b>Reporting/analytics tables</b> — har dashboard load par 6-table
             JOIN mehnga hai; pre-joined summary table rakhna theek hai.</li>
         <li>📜 <b>Historical snapshot</b> — invoice par customer ka <b>us waqt</b>
             ka address copy karke rakhna <i>zaroori</i> hai. Customer aaj shift
             ho gaya toh purani invoice nahi badalni chahiye.</li>
         <li>⚡ <b>Counter columns</b> — <code>post.commentCount</code> har baar
             COUNT chalane se bachata hai (par ab use sync rakhna tumhara kaam).</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> Asli project mein
       <code>bx50Data</code> mein <code>latestAasVer</code> naam ka column tha,
       jiske paas ek comment likha tha: <i>"latestAasVer is actually the anzen
       ui/api version"</i>. Matlab column ka naam kuch aur, andar kuch aur. Naye
       developers mahino tak galat samajh ke query likhte rahe. Aur
       <code>adcTestResult</code> mein ek <code>latestDevice</code> BOOLEAN
       column tha jise har naye insert par manually update karna padta tha —
       kabhi-kabhi do rows par ek saath <code>true</code> reh jaata, aur
       dashboard do "latest" devices dikhata. <b>Sabak: denormalized/derived
       column tabhi rakho jab use sync rakhne ki zimmedari saaf likhi ho —
       warna woh chup-chaap jhoot bolna shuru kar deta hai.</b> (Level 20 ka
       window function isi <code>latestDevice</code> column ki zaroorat khatam
       kar deta.)</div>`,
    ],
    stages: [
      {
        type: 'splitter',
        title: '🔀 Lab: pehli god-table todo',
        instructions: 'Column par click karo, phir uske sahi table par. Neeche anomalies live theek hongi.',
        scenario: `Ek factory ne saara data ek hi table mein daal diya —
          har session ki row mein operator ka poora data <b>dobara</b> hai,
          aur device ka bhi. <b>Har column ko uske ghar bhejo.</b>`,
        table: 'sessions_flat',
        columns: [
          { name: 'session_id', pk: true, target: 'sessions', why: 'Session ki apni pehchaan.' },
          { name: 'start_time', target: 'sessions', why: 'Yeh <b>session</b> ka fact hai — operator ya device ka nahi.' },
          { name: 'duration', target: 'sessions', why: 'Bhi session ka fact. Har session ka apna.' },
          { name: 'operator_name', target: 'operators', why: 'Operator ka fact. Naam badla toh ab <b>ek</b> row badlegi, 500 nahi.', wrongHint: 'Poochho: "yeh fact KIS cheez ke baare mein hai?" — session ke, ya us insaan ke?' },
          { name: 'operator_shift', target: 'operators', why: 'Wahi baat — shift operator ka fact hai, har session mein dohraane ki cheez nahi.' },
          { name: 'device_serial', target: 'devices', why: 'Device ki pehchaan. Ab naya device bina kisi session ke bhi register ho sakta hai.' },
          { name: 'device_location', target: 'devices', why: 'Device ka fact. Machine shift hui toh ek jagah update — sab sessions mein nahi.' },
        ],
        targets: [
          { id: 'operators', label: '👤 operators', hint: 'ek operator ke facts' },
          { id: 'devices', label: '🖥️ devices', hint: 'ek device ke facts' },
          { id: 'sessions', label: '⏱️ sessions', hint: 'ek session ke facts' },
        ],
        checks: [
          { ok: p => p.operator_name === 'operators' && p.operator_shift === 'operators',
            broken: '<b>Update anomaly:</b> operator ki shift badli → uske saare session rows update karne padenge.',
            fixed: '<b>Update anomaly khatam</b> — operator ka data ek hi jagah hai.' },
          { ok: p => p.device_serial === 'devices' && p.device_location === 'devices',
            broken: '<b>Insert anomaly:</b> naya device register karna hai par abhi koi session hua hi nahi — row banegi hi nahi.',
            fixed: '<b>Insert anomaly khatam</b> — device bina session ke bhi maujood ho sakta hai.' },
          { ok: p => p.session_id === 'sessions' && p.operator_name === 'operators',
            broken: '<b>Delete anomaly:</b> operator ka aakhri session delete kiya → uska naam aur shift bhi chale gaye.',
            fixed: '<b>Delete anomaly khatam</b> — session jaane se operator nahi jaata.' },
        ],
        insight: `Har column ke liye ek hi sawaal tha:
          <b>"yeh fact KIS cheez ke baare mein hai?"</b> — session ka, operator ka, ya device ka.<br><br>
          Aur teenon anomalies apne aap gayab ho gayi. Yahi normalization hai —
          niyam yaad karna nahi, <b>facts ko unke ghar bhejna</b>.`,
      },

      {
        type: 'bins',
        title: 'Kaunsa normal form toota?',
        instructions: 'Har design galti ko sahi normal form mein daalo.',
        bins: [
          { id: 'nf1', label: '1️⃣ 1NF toota' },
          { id: 'nf2', label: '2️⃣ 2NF toota' },
          { id: 'nf3', label: '3️⃣ 3NF toota' },
        ],
        items: [
          { text: "operators.skills = 'BMS,ADC,BX50'", bin: 'nf1', explain: '1NF — ek cell mein list. JOIN/index/FK sab bekaar. Alag operator_skills table chahiye.' },
          { text: 'bx50Data mein customerId ke saath customerName aur customerLocation bhi', bin: 'nf3', explain: '3NF — customerName non-key column customerId par depend karta hai, device par nahi. customers table alag karo.' },
          { text: 'sessions (buildNum, opId) composite PK, aur usme operatorName column', bin: 'nf2', explain: '2NF — operatorName sirf opId par depend karta hai, poori composite key par nahi.' },
          { text: "device.notes mein 'ip1;ip2;ip3' teen IP ek saath", bin: 'nf1', explain: '1NF — multiple values ek cell mein. Alag rows ya alag table.' },
          { text: 'orders mein productId ke saath productName aur productPrice', bin: 'nf3', explain: '3NF — dono product ki properties hain. (Par invoice ka historical price jaan-boojh ke copy karna alag baat hai!)' },
          { text: 'enrollments (studentId, courseId) PK, aur usme courseTitle', bin: 'nf2', explain: '2NF — courseTitle sirf courseId par depend karta hai, poori key par nahi.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Normalization diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'normal',
        questions: [
          { q: 'Asli project ki 40-column wali problem table kaunsi hai?', target: 'god', explain: 'God-table — device + build + customer + 8 secrets sab ek jagah. Update/insert/delete teeno anomalies.' },
          { q: 'Har cell mein ek hi value — kaunsa normal form?', target: 'nf1', explain: '1NF. Comma-separated list todti hai ise — phir JOIN, index, FK kuch kaam nahi karta.' },
          { q: 'Sensitive columns ko alag table mein kyun daala?', target: 'devices', explain: 'Alag table = alag access control. Reporting queries secrets ko chhu bhi nahi sakti.' },
          { q: 'Reporting speed ke liye jaan-boojh ke rules todna?', target: 'denorm', explain: 'Denormalization — pre-joined summary tables, historical snapshots, counter columns. Samajh ke karo, aadat se nahi.' },
        ],
      },
      {
        type: 'fill',
        title: 'God-table ko todo',
        instructions: 'Secrets aur customer info alag karo. Blanks bharo.',
        template: `-- 1. Customers alag (3NF — customer ka fact ek hi jagah)
CREATE TABLE customers (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  name     VARCHAR(100) NOT NULL,
  location VARCHAR(100)
);

-- 2. Devices — sirf device ka data + reference
CREATE TABLE devices (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  buildNum   INT NOT NULL,
  customerId INT,
  FOREIGN KEY (customerId) {0} customers(id)
);

-- 3. Secrets bilkul alag table mein ({1} rishta — access control ke liye)
CREATE TABLE deviceCredentials (
  deviceId     INT PRIMARY KEY,          -- PK = FK, isliye har device ka ek hi row
  biosPassword TEXT,
  apiJwtKey    TEXT,
  FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE {2}
);

-- 4. Skills ki list? Alag rows mein — {3} ke liye
CREATE TABLE operatorSkills (
  opId  VARCHAR(20) NOT NULL,
  skill VARCHAR(50) NOT NULL,
  PRIMARY KEY (opId, skill)
);`,
        tokens: ['REFERENCES', '1:1', 'CASCADE', '1NF', 'FOREIGN KEY', 'N:M', 'RESTRICT', '3NF'],
        blanks: [
          { answer: 'REFERENCES', explain: '<code>FOREIGN KEY (col) REFERENCES parent(col)</code> — customer ka fact ab sirf <code>customers</code> mein hai, device sirf point karta hai.' },
          { answer: '1:1', explain: 'Har device ka <b>ek hi</b> credentials row — isliye <code>deviceId</code> khud PK hai. 1:1 ka asli faayda yahan <b>access control</b> hai: reporting queries is table ko chhu bhi nahi sakti.' },
          { answer: 'CASCADE', explain: 'Yahan <b>CASCADE sahi hai</b> — credentials ka device ke bina koi wajood hi nahi. Yehi woh case hai jiske liye CASCADE bana hai.' },
          { answer: '1NF', explain: '<code>skills = \'BMS,ADC\'</code> 1NF todta hai. Har skill apni row mein — ab JOIN, index, FK aur exact match sab kaam karte hain.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: God-table ko todo',
        instructions: 'Duplicate data ka dard dekho, phir schema theek karo.',
        goal: '<b>(1)</b> Duplicate data ka dard dekho: <code>bx50Data</code> mein <code>customerLocation</code> kitni baar repeat hota hai — <code>GROUP BY customerLocation</code> + <code>COUNT(*)</code>. (Tokyo ka naam badla toh kitni rows update karni padti!) <b>(2)</b> Ab theek karo: <code>customers</code> table banao (<code>id</code> PK auto, <code>name</code> NOT NULL, <code>location</code>). <b>(3)</b> Do customers insert karo: <code>\'Tokyo Motors\'</code>/<code>\'Tokyo\'</code> aur <code>\'Pune Industries\'</code>/<code>\'Pune\'</code>. <b>(4)</b> Secrets ke liye alag <code>deviceCredentials</code> table banao (<code>deviceId</code> INT PRIMARY KEY, <code>biosPassword</code> TEXT, <code>apiJwtKey</code> TEXT) — 1:1, access control ke liye.',
        tasks: [
          { text: 'Duplicate location dekho (GROUP BY)', check: s => s.history.some(h => /group\s+by\s+customerlocation/i.test(h)) },
          { text: 'customers table banao', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'customers') },
          { text: 'Do customers insert karo', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'customers'); return !!k && s.db.tables[k].rows.length >= 2; } },
          { text: 'deviceCredentials alag table (1:1)', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'devicecredentials') },
        ],
        db: SG.factoryDB(),
        success: s => {
          const c = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'customers');
          const d = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'devicecredentials');
          return !!c && !!d && s.db.tables[c].rows.length >= 2
            && s.history.some(h => /group\s+by\s+customerlocation/i.test(h));
        },
        successText: '🎉 <b>God-table toot gaya.</b> Ab <code>Tokyo</code> ka naam ek hi jagah hai — badalna ho toh <b>ek row</b> update, 50 nahi. Aur secrets alag table mein hain, matlab reporting query <code>SELECT * FROM devices</code> chalaye toh bhi koi password leak nahi hoga. Yaad rakho: <b>har fact ek hi jagah, baaki jagah FK.</b> Ek line mein 3NF yehi hai.',
        hints: [
          'SELECT customerLocation, COUNT(*) AS devices FROM bx50Data GROUP BY customerLocation;',
          'CREATE TABLE customers (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL, location VARCHAR(100));',
          "INSERT INTO customers (name, location) VALUES ('Tokyo Motors', 'Tokyo'), ('Pune Industries', 'Pune');",
          'CREATE TABLE deviceCredentials (deviceId INT PRIMARY KEY, biosPassword TEXT, apiJwtKey TEXT);',
        ],
      },
      {
        type: 'quiz',
        title: 'Normalization Quick-fire',
        questions: [
          {
            q: 'Update anomaly kya hai?',
            choices: [
              'Ek hi fact kai rows mein duplicate hai — badalne par sab jagah badalna padta hai, ek chhooti toh data khud se contradict karta hai',
              'UPDATE query error deti hai',
              'UPDATE bahut slow chalti hai',
              'UPDATE ke baad index toot jaata hai',
            ],
            answer: 0,
            explain: 'Yehi normalization ki asli wajah hai. Ek fact ek jagah = ek update = koi contradiction nahi.',
          },
          {
            q: "<code>skills = 'BMS,ADC,BX50'</code> ek column mein — problem?",
            choices: [
              '1NF toota — JOIN, index, FK kuch kaam nahi karta, aur LIKE \'%ADC%\' galat matches deta hai',
              'Koi problem nahi, jagah bachti hai',
              'Sirf padhne mein mushkil hai',
              'Sirf tab problem jab 10 se zyada skills hon',
            ],
            answer: 0,
            explain: 'Comma-list mein "ADC" dhoondhoge toh "ADC2" bhi match hoga. Alag rows mein exact match, index aur FK sab milta hai.',
          },
          {
            q: 'Denormalization kab sahi hai?',
            choices: [
              'Reporting speed, historical snapshot (invoice ka us waqt ka address), ya counter columns — par sync rakhne ki zimmedari saaf honi chahiye',
              'Kabhi nahi, hamesha 3NF',
              'Hamesha — JOIN slow hote hain',
              'Sirf chhoti tables mein',
            ],
            answer: 0,
            explain: 'Invoice wala case sabse important hai: woh duplicate <b>bug nahi, requirement</b> hai — purani invoice customer ke shift hone par nahi badalni chahiye.',
          },
          {
            q: 'Sensitive columns (passwords) alag table mein kyun?',
            choices: [
              'Alag access control mil jaata hai — normal reporting queries unhe chhu bhi nahi sakti, aur SELECT * accidentally leak nahi karta',
              'Query tez ho jaati hai',
              'MySQL ki requirement hai',
              'Backup chhota ho jaata hai',
            ],
            answer: 0,
            explain: 'Asli project mein <code>SELECT *</code> ne 8 secret columns ek log file mein daal diye the. 1:1 split isi ka structural ilaaj hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Schema Design',
      instructions: 'Design round — yahan trade-off bolna zaroori hai. 🎤',
      questions: [
        {
          q: '"3NF ko simple bhasha mein samjhao."',
          choices: [
            'Har fact sirf ek jagah likho — non-key column kisi doosre non-key column par depend na kare. Customer ka naam customers table mein, orders mein sirf customerId',
            'Har table mein teen se kam columns rakho',
            'Har table mein primary key ho',
            'Teen tables se zyada mat banao',
          ],
          answer: 0,
          explain: '"Har fact ek jagah" — yahi jawab hai. Uske saath ek anomaly ka example dena (customer location badla toh 50 rows) ise concrete banata hai.',
        },
        {
          q: 'Interviewer: "Invoice par customer ka address duplicate kar rahe ho — yeh 3NF violation nahi?"',
          choices: [
            'Technically haan, par yeh jaan-boojh ke hai — invoice ek historical document hai. Customer kal shift ho jaye toh purani invoice ka address nahi badalna chahiye. Yeh duplicate nahi, snapshot hai',
            'Haan, galti hai, main isse FK bana dunga',
            'Nahi, invoices normalization ke rules follow nahi karti',
            '3NF ki koi zaroorat nahi hoti',
          ],
          answer: 0,
          explain: 'Yeh sawal check karta hai ki tum rules ratte ho ya samajhte ho. <b>Snapshot vs reference</b> ka farak senior-level soch hai.',
        },
        {
          q: '🎛️ Interviewer: "Ek normalized schema likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — normalization',
            goal: '🎛️ <b>Hands-on:</b> Operators ke skills store karne hain (ek operator ke kai skills). <b>(1)</b> <code>operatorSkills</code> table banao — <code>opId</code> VARCHAR(20) NOT NULL, <code>skill</code> VARCHAR(50) NOT NULL (comma-list nahi, har skill apni row!). <b>(2)</b> <code>OP-101</code> ke liye do skills insert karo. <b>(3)</b> JOIN karke dikhao ki kaunse operator ke paas kaunse skills hain.',
            tasks: [
              { text: 'operatorSkills table banao', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'operatorskills') },
              { text: 'OP-101 ke 2 skills insert karo', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'operatorskills'); return !!k && s.db.tables[k].rows.filter(r => r.opId === 'OP-101').length >= 2; } },
              { text: 'JOIN se operator + skills dikhao', check: s => s.history.some(h => /join/i.test(h) && /operatorskills/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => {
              const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'operatorskills');
              return !!k && s.db.tables[k].rows.filter(r => r.opId === 'OP-101').length >= 2
                && s.history.some(h => /join/i.test(h) && /operatorskills/i.test(h));
            },
            successText: '✅ 1NF ka asli faayda dikha: ab tum <b>JOIN</b> kar sakte ho, skill par <b>index</b> laga sakte ho, aur <code>WHERE skill = \'ADC\'</code> exact match deta hai — comma-list mein yeh teeno na-mumkin the.',
            hints: [
              'CREATE TABLE operatorSkills (opId VARCHAR(20) NOT NULL, skill VARCHAR(50) NOT NULL);',
              "INSERT INTO operatorSkills (opId, skill) VALUES ('OP-101', 'BMS'), ('OP-101', 'ADC');",
              'SELECT o.name, k.skill FROM operatorSkills k JOIN operators o ON k.opId = o.opId;',
            ],
          },
        },
      ],
    },
    success: [
      'Main update/insert/delete anomalies pehchaan sakta hoon',
      'Main 1NF, 2NF, 3NF ko practical example se samjha sakta hoon',
      'Main god-table ko alag tables mein tod sakta hoon',
      'Main denormalization ka sahi use-case (snapshot, reporting) justify kar sakta hoon',
    ],
    homework: `<p>Anomaly khud banao aur phir theek karo:</p>
      <pre>USE factory;

-- God-table banao
CREATE TABLE bad_devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deviceName VARCHAR(100),
  customerName VARCHAR(100),
  customerLocation VARCHAR(100)
);
INSERT INTO bad_devices (deviceName, customerName, customerLocation) VALUES
 ('d1','Tokyo Motors','Tokyo'), ('d2','Tokyo Motors','Tokyo'), ('d3','Tokyo Motors','Tokyo');

-- Update anomaly: customer shift ho gaya
UPDATE bad_devices SET customerLocation = 'Osaka' WHERE deviceName = 'd1';
SELECT * FROM bad_devices;   -- ab data khud se contradict kar raha hai!

-- Normalized version
CREATE TABLE customers (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), location VARCHAR(100));
CREATE TABLE good_devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deviceName VARCHAR(100),
  customerId INT,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);
INSERT INTO customers (name, location) VALUES ('Tokyo Motors','Tokyo');
INSERT INTO good_devices (deviceName, customerId) VALUES ('d1',1),('d2',1),('d3',1);

UPDATE customers SET location = 'Osaka' WHERE id = 1;   -- EK row, sab devices sahi
SELECT d.deviceName, c.name, c.location FROM good_devices d JOIN customers c ON d.customerId = c.id;</pre>
      <p>✅ Self-check: God-table mein teen rows do alag locations bata rahe the? Normalized mein ek UPDATE ne sab theek kar diya?</p>`,
    cards: [
      { front: 'Teen anomalies?', back: '<b>Update</b> (ek fact kai jagah — ek chhooti toh contradiction), <b>Insert</b> (customer bina device ke add nahi hota), <b>Delete</b> (aakhri device gaya toh customer info bhi gayi).' },
      { front: '1NF / 2NF / 3NF ek line mein?', back: '<b>1NF</b> = har cell mein ek value (koi comma-list nahi). <b>2NF</b> = composite PK ho toh poori key par depend karo. <b>3NF</b> = non-key column doosre non-key par depend na kare. Nichod: <b>har fact ek jagah</b>.' },
      { front: 'Comma-separated list ka nuksaan?', back: 'Na JOIN, na index, na FK — aur <code>LIKE \'%ADC%\'</code> "ADC2" ko bhi match karta hai. Alag rows (junction table) hi sahi jawab hai.' },
      { front: 'Denormalization kab sahi?', back: '<b>Reporting</b> (pre-joined summary), <b>historical snapshot</b> (invoice ka us waqt ka address — yeh requirement hai, bug nahi), <b>counter columns</b>. Shart: sync rakhne ki zimmedari saaf ho.' },
      { front: 'Secrets alag table mein kyun (1:1)?', back: '<b>Access control.</b> Reporting queries secrets ko chhu hi nahi sakti aur <code>SELECT *</code> unhe leak nahi karta. Asli project mein 8 secret columns god-table mein the.' },
    ],
  },

  /* ================= LEVEL 6: UNION & Self-Joins ================= */
  {
    id: 'setops',
    icon: '🪞',
    title: 'UNION & Self-Joins — Rows Jodo, Table ko Khud se Jodo',
    badge: 'Aaine Ka Ustaad',
    objectives: [
      '<b>UNION vs UNION ALL</b> — aur kaunsa default chunna chahiye',
      '<b>UNION vs JOIN</b> — lambai vs chaudai',
      '<b>Self-join</b> — ek table, do alias',
      'Self-join ke do classic jaal: <b>duplicate jode</b> aur <b>khud se jud jaana</b>',
    ],
    lesson: [
      `<h3>➕ UNION — rows upar-neeche jodo</h3>
       <p><b>JOIN chaudai badhata hai</b> (naye columns), <b>UNION lambai</b>
       (naye rows):</p>
       <pre>SELECT bx50Name AS naam, 'device' AS kism FROM bx50Data
UNION ALL
SELECT name,          'operator'      FROM operators;</pre>
       <p>Shart: <b>dono taraf columns ka count aur order same</b> hona chahiye
       (types compatible hon). Column ke naam pehli query se aate hain.</p>
       <table>
         <tr><th></th><th>UNION</th><th>UNION ALL</th></tr>
         <tr><td>Duplicates</td><td>hata deta hai</td><td>rakhta hai</td></tr>
         <tr><td>Speed</td><td>dheema (dedupe = sort/hash)</td><td>⚡ tez</td></tr>
         <tr><td>Kab</td><td>duplicates sach mein hatane hon</td><td><b>default choice</b></td></tr>
       </table>
       <p>💡 <b>Default <code>UNION ALL</code> chuno.</b> Log aadat se
       <code>UNION</code> likh dete hain aur DB har baar bekaar mein dedupe
       karta rehta hai. <code>UNION</code> tabhi jab tumhe pata ho ki duplicates
       aa sakte hain <i>aur</i> unhe hatana zaroori hai.</p>`,
      `<h3>🪞 Self-join — ek table ko khud se jodo</h3>
       <p>Kabhi-kabhi ek hi table ki do rows ko compare karna hota hai. Solution:
       usi table ko <b>do baar</b>, do alag alias ke saath:</p>
       <pre>-- Same shift mein kaam karne wale operator jode
SELECT a.name AS pehla, b.name AS doosra, a.shift
FROM   operators a
JOIN   operators b ON a.shift = b.shift
WHERE  a.opId &lt; b.opId;          -- ← yeh line zaroori hai</pre>
       <p>Aur bhi classic use-cases:</p>
       <ul>
         <li>👔 <b>Manager–employee</b> — <code>e.managerId = m.id</code>
             (dono <code>employees</code> table mein)</li>
         <li>📈 <b>Pichhli row se compare</b> — <code>b.id = a.id + 1</code>
             (aaj kal iske liye <code>LAG()</code> behtar hai)</li>
         <li>🔁 <b>Duplicate dhoondo</b> — same email, alag id</li>
       </ul>`,
      `<h3>🪤 Self-join ke do jaal</h3>
       <p>Woh <code>WHERE a.opId &lt; b.opId</code> line bina kiye kya hota hai?</p>
       <pre>-- Bina kisi shart ke:
FROM operators a JOIN operators b ON a.shift = b.shift

Ravi   — Ravi     ❌ khud se jud gaya
Ravi   — Amit     ✅
Amit   — Ravi     ❌ wahi jodi, ulti
Amit   — Amit     ❌</pre>
       <p>Do ilaaj, do matlab:</p>
       <ul>
         <li><code>WHERE a.opId != b.opId</code> — khud se judna rok do, par
             har jodi <b>do baar</b> aayegi (A-B aur B-A)</li>
         <li><code>WHERE a.opId &lt; b.opId</code> — har jodi <b>ek hi baar</b>.
             Yehi aksar chahiye hota hai.</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ne "shift buddy"
       feature banaya — same shift ke operators ko pair karke ek dusre ka backup
       banana tha. Query self-join thi par usme sirf
       <code>a.opId != b.opId</code> tha. Result: har jodi do baar aayi, aur
       notification service ne <b>har operator ko do buddy emails</b> bheje —
       ek jisme woh "pehla" tha aur ek jisme "doosra". 40 operators, 80 emails,
       aur support ko "duplicate email" ki shikayatein. Fix ek character ka tha:
       <code>!=</code> → <code>&lt;</code>. <b>Sabak: self-join mein hamesha
       socho ki tumhe jodi chahiye ya dono directions — aur <code>&lt;</code>
       likh ke jodi ko ek baar mein seemit karo.</b></div>`,
    ],
    stages: [
      {
        type: 'bins',
        title: 'UNION ya JOIN?',
        instructions: 'Har requirement ko sahi tool mein daalo.',
        bins: [
          { id: 'union', label: '➕ UNION (rows jodo)' },
          { id: 'join', label: '🔗 JOIN (columns jodo)' },
          { id: 'self', label: '🪞 Self-join' },
        ],
        items: [
          { text: 'Devices aur operators ki ek milli-julli naam ki list', bin: 'union', explain: 'Do alag tables se rows ek list mein — lambai badhti hai. UNION ALL.' },
          { text: 'Har device ke saath uske build ka type', bin: 'join', explain: 'Ek row mein dono tables ke columns — chaudai badhti hai.' },
          { text: 'Same shift mein kaam karne wale operator jode', bin: 'self', explain: 'Ek hi table, do alias, ON a.shift = b.shift, aur a.id < b.id.' },
          { text: 'Is mahine ke aur pichhle mahine ke builds ek report mein', bin: 'union', explain: 'Do alag filters ke results ko upar-neeche jodna. UNION ALL.' },
          { text: 'Har employee ke saath uske manager ka naam', bin: 'self', explain: 'employees ko khud se JOIN — e.managerId = m.id.' },
          { text: 'Har session ke saath operator ka naam aur build ka type', bin: 'join', explain: 'Teen tables ka chain JOIN.' },
          { text: 'Same email par do accounts (duplicate dhoondo)', bin: 'self', explain: 'Self-join on email, WHERE a.id < b.id — duplicate pairs mil jaate hain.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Set-ops diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'setops',
        questions: [
          { q: 'Duplicates rakhta hai aur tez hai — kaunsa?', target: 'unionall', explain: 'UNION ALL — dedupe nahi karta. Default yahi chuno.' },
          { q: 'UNION ke liye dono queries mein kya same hona chahiye?', target: 'cols', explain: 'Columns ka count aur order (types compatible). Naam pehli query se aate hain.' },
          { q: 'Self-join mein har jodi ko ek hi baar laane wali shart?', target: 'lessthan', explain: 'a.id < b.id — != se har jodi do baar aati hai, aur bina shart ke row khud se bhi jud jaati hai.' },
          { q: 'Self-join mein table ko do baar laane ke liye kya chahiye?', target: 'selfon', explain: 'Do alag alias (a aur b) + ON condition. Alias ke bina DB nahi jaanta kaunsa "wala" chahiye.' },
        ],
      },
      {
        type: 'fill',
        title: 'UNION aur self-join likho',
        instructions: 'Ek milli-julli list, aur shift-buddy jode. Blanks bharo.',
        template: `-- Devices + operators ki ek list (duplicates ki parwah nahi = tez raasta)
SELECT bx50Name AS naam, 'device' AS kism FROM bx50Data
{0}
SELECT name, 'operator' FROM operators;

-- Shift buddies — har jodi SIRF EK BAAR
SELECT a.name AS pehla, b.name AS doosra, a.shift
FROM   operators a
JOIN   operators {1} ON a.shift = b.shift
WHERE  a.opId {2} b.opId;`,
        tokens: ['UNION ALL', 'b', '<', 'UNION', 'a', '!=', 'JOIN', '='],
        blanks: [
          { answer: 'UNION ALL', explain: '<b>UNION ALL default choice hai</b> — dedupe nahi karta, isliye tez. Plain <code>UNION</code> har baar sort/hash karke duplicates hataata hai, jiski aksar zaroorat hi nahi hoti.' },
          { answer: 'b', explain: 'Doosra <b>alias</b>. Same table do baar aa rahi hai, isliye do alag naam chahiye — warna DB nahi jaanta <code>shift</code> kis "wale" ka hai.' },
          { answer: '<', explain: '<code>&lt;</code> se har jodi <b>ek baar</b> aati hai. <code>!=</code> likhte toh A-B aur B-A dono aate — asli project mein isi se har operator ko <b>do</b> buddy emails gaye the.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Duplicate buddy emails ka bug',
        instructions: 'Self-join ke dono jaal khud dekho, phir theek karo.',
        goal: 'Shift-buddy feature har operator ko do emails bhej raha tha. <b>(1)</b> Bina kisi shart ke self-join chalao: <code>SELECT a.name, b.name FROM operators a JOIN operators b ON a.shift = b.shift;</code> — dekho log <b>khud se</b> bhi jud rahe hain. <b>(2)</b> Ab <code>WHERE a.opId != b.opId</code> lagao — khud se judna ruk gaya, par har jodi <b>do baar</b> hai. <b>(3)</b> Ab sahi fix: <code>WHERE a.opId &lt; b.opId</code> — har jodi ek baar. <b>(4)</b> Ab <code>UNION ALL</code> se ek milli-julli list banao: <code>bx50Data</code> ke naam + <code>operators</code> ke naam, dono ke saath ek label column. <b>(5)</b> Bonus: <code>UNION</code> (bina ALL) chala ke dekho ki woh duplicates hata deta hai.',
        tasks: [
          { text: 'Bina shart self-join — khud se judte dekho', check: s => s.history.some(h => /from\s+operators\s+a\s+join\s+operators\s+b/i.test(h) && !/where/i.test(h)) },
          { text: 'WHERE a.opId != b.opId — har jodi do baar', check: s => s.history.some(h => /a\.opid\s*!=\s*b\.opid/i.test(h)) },
          { text: 'WHERE a.opId < b.opId — sahi fix', check: s => s.history.some(h => /a\.opid\s*<\s*b\.opid/i.test(h)) },
          { text: 'UNION ALL se milli-julli list', check: s => s.history.some(h => /union\s+all/i.test(h)) },
          { text: 'UNION (bina ALL) ka farak dekho', check: s => s.history.some(h => /union/i.test(h) && !/union\s+all/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /from\s+operators\s+a\s+join\s+operators\s+b/i.test(h) && !/where/i.test(h))
          && s.history.some(h => /a\.opid\s*!=\s*b\.opid/i.test(h))
          && s.history.some(h => /a\.opid\s*<\s*b\.opid/i.test(h))
          && s.history.some(h => /union\s+all/i.test(h))
          && s.history.some(h => /union/i.test(h) && !/union\s+all/i.test(h)),
        successText: '🎉 <b>Dono jaal apni aankhon se.</b> Bina shart ke Ravi–Ravi bhi ek "jodi" ban gaya. <code>!=</code> ne woh roka, par Ravi–Amit aur Amit–Ravi <b>dono</b> aaye — <b>yehi woh bug tha jisne 40 operators ko 80 emails bheje</b>. <code>&lt;</code> ne har jodi ko ek baar kar diya, aur fix sirf ek character ka tha. Aur <code>UNION ALL</code> vs <code>UNION</code> — dedupe ki keemat hoti hai, isliye default <code>ALL</code> rakho aur dedupe tabhi jab sach mein chahiye.',
        hints: [
          'SELECT a.name, b.name FROM operators a JOIN operators b ON a.shift = b.shift;   ← khud se judte dekho',
          "SELECT a.name, b.name FROM operators a JOIN operators b ON a.shift = b.shift WHERE a.opId != b.opId;",
          "SELECT a.name AS pehla, b.name AS doosra FROM operators a JOIN operators b ON a.shift = b.shift WHERE a.opId < b.opId;",
          "SELECT bx50Name AS naam, 'device' AS kism FROM bx50Data UNION ALL SELECT name, 'operator' FROM operators;",
          "SELECT shift FROM operators UNION SELECT shift FROM operators;   ← dedupe ka asar",
        ],
      },
      {
        type: 'quiz',
        title: 'UNION & Self-Join Quick-fire',
        questions: [
          {
            q: 'UNION aur UNION ALL mein kaunsa default chunna chahiye?',
            choices: [
              'UNION ALL — dedupe nahi karta isliye tez. UNION tabhi jab duplicates sach mein hatane hon',
              'UNION — hamesha safe hai',
              'Dono same hain',
              'UNION ALL sirf numbers ke liye',
            ],
            answer: 0,
            explain: 'Dedupe ke liye DB ko sort/hash karna padta hai. Aadat se <code>UNION</code> likhna ek chhupa hua performance cost hai.',
          },
          {
            q: 'Self-join mein <code>WHERE a.id != b.id</code> ka kya problem hai?',
            choices: [
              'Har jodi do baar aayegi (A-B aur B-A) — usually a.id < b.id chahiye',
              'Koi problem nahi',
              'Query error degi',
              'Khud se judna nahi rukega',
            ],
            answer: 0,
            explain: 'Yehi woh bug tha jisne har operator ko do buddy emails bheje. <code>&lt;</code> jodi ko ek baar mein seemit karta hai.',
          },
          {
            q: 'UNION ke liye dono queries mein kya match karna chahiye?',
            choices: [
              'Columns ka count aur order (types compatible) — naam pehli query se aate hain',
              'Table ka naam',
              'WHERE clause',
              'Row count',
            ],
            answer: 0,
            explain: 'Mismatch par: <code>ERROR 1222: The used SELECT statements have a different number of columns</code>.',
          },
          {
            q: 'JOIN aur UNION mein fundamental farak?',
            choices: [
              'JOIN chaudai badhata hai (naye columns ek row mein), UNION lambai (naye rows)',
              'JOIN tez hai',
              'UNION sirf do tables par chalta hai',
              'Koi farak nahi',
            ],
            answer: 0,
            explain: 'Yeh ek line poora concept hai. "Related data ek row mein" = JOIN. "Same shape ki aur rows" = UNION.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Set Ops & Self-Joins',
      instructions: 'Yeh sawal aksar aata hai. 🎤',
      questions: [
        {
          q: '"UNION aur UNION ALL mein farak?"',
          choices: [
            'UNION duplicates hata deta hai (isliye sort/hash karta hai, dheema); UNION ALL sab rows rakhta hai aur tez hai. Main default UNION ALL leta hoon aur dedupe tabhi karta hoon jab zaroori ho',
            'UNION tez hai',
            'UNION ALL sirf teen ya zyada queries ke liye',
            'Koi farak nahi, syntax alag hai',
          ],
          answer: 0,
          explain: 'Aakhri line ("default ALL, dedupe zaroorat par") practical maturity dikhati hai — sirf definition se aage.',
        },
        {
          q: 'Interviewer: "Employees table hai jisme managerId bhi ussi table ko point karta hai. Har employee ke saath manager ka naam nikaalo."',
          choices: [
            'Self-join: FROM employees e LEFT JOIN employees m ON e.managerId = m.id — LEFT isliye ki CEO ka manager nahi hota',
            'JOIN employees ON managerId = id',
            'Do queries chala ke app mein jod dunga',
            'Subquery se har row ke liye manager nikaalunga',
          ],
          answer: 0,
          explain: '<b>LEFT JOIN</b> bolna yahan bonus point hai — INNER JOIN CEO (jiska managerId NULL hai) ko chup-chaap gira dega. Level 10 ka sabak yahan wapas aa gaya.',
        },
        {
          q: '🎛️ Interviewer: "Self-join aur UNION likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — set ops',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> Same <code>station</code> par kaam karne wale operator jode nikaalo — self-join, har jodi ek baar (<code>a.opId &lt; b.opId</code>). <b>(2)</b> <code>UNION ALL</code> se ek "sab kuch" list: <code>bx50Builds</code> ke buildNum (label <code>\'build\'</code>) aur <code>bmsTester</code> ke buildNumber (label <code>\'bms\'</code>). <b>(3)</b> Self-join se woh builds dhoondo jinka <code>duration</code> kisi doosre build se bilkul same hai.',
            tasks: [
              { text: 'Same-station operator jode (self-join + <)', check: s => s.history.some(h => /operators\s+a\s+join\s+operators\s+b/i.test(h) && /a\.opid\s*<\s*b\.opid/i.test(h)) },
              { text: 'UNION ALL se milli-julli list', check: s => s.history.some(h => /union\s+all/i.test(h)) },
              { text: 'Same duration wale builds (self-join)', check: s => s.history.some(h => /bx50builds\s+a\s+join\s+bx50builds\s+b/i.test(h)) },
            ],
            db: SG.factoryDB(db => {
              // do builds ko same duration do taaki self-join kuch dhoondh sake
              db.tables.bx50Builds.rows.find(r => r.buildNum === 1045).duration = 5400000;
            }),
            success: s => s.history.some(h => /operators\s+a\s+join\s+operators\s+b/i.test(h) && /a\.opid\s*<\s*b\.opid/i.test(h))
              && s.history.some(h => /union\s+all/i.test(h))
              && s.history.some(h => /bx50builds\s+a\s+join\s+bx50builds\s+b/i.test(h)),
            successText: '✅ Self-join ke do alag use-case: <b>jode banana</b> (same station) aur <b>duplicates dhoondhna</b> (same duration) — dono mein wahi <code>a.x &lt; b.x</code> trick. Aur UNION ALL se do tables ki rows ek list mein.',
            hints: [
              'SELECT a.name AS pehla, b.name AS doosra, a.station FROM operators a JOIN operators b ON a.station = b.station WHERE a.opId < b.opId;',
              "SELECT buildNum AS num, 'build' AS src FROM bx50Builds UNION ALL SELECT buildNumber, 'bms' FROM bmsTester;",
              'SELECT a.buildNum, b.buildNum, a.duration FROM bx50Builds a JOIN bx50Builds b ON a.duration = b.duration WHERE a.buildNum < b.buildNum;',
            ],
          },
        },
      ],
    },
    success: [
      'Main UNION vs UNION ALL ka farak aur default choice justify kar sakta hoon',
      'Main JOIN (chaudai) vs UNION (lambai) ka farak bata sakta hoon',
      'Main self-join do alias ke saath likh sakta hoon',
      'Main self-join ke duplicate-jodi wale jaal se bachta hoon (a.id < b.id)',
    ],
    homework: `<p>Self-join ke jaal khud banao:</p>
      <pre>USE factory;

-- 1. Bina shart — khud se judte dekho
SELECT a.name, b.name FROM operators a JOIN operators b ON a.shift = b.shift;

-- 2. != — har jodi do baar
SELECT a.name, b.name FROM operators a JOIN operators b
ON a.shift = b.shift WHERE a.opId != b.opId;

-- 3. < — sahi jawab
SELECT a.name, b.name FROM operators a JOIN operators b
ON a.shift = b.shift WHERE a.opId < b.opId;
-- teeno ka row count compare karo!

-- Manager hierarchy banao
CREATE TABLE staff (id INT PRIMARY KEY, name VARCHAR(50), managerId INT);
INSERT INTO staff VALUES (1,'CEO',NULL),(2,'Lead A',1),(3,'Dev X',2),(4,'Dev Y',2);

SELECT e.name AS employee, m.name AS manager
FROM staff e LEFT JOIN staff m ON e.managerId = m.id;   -- CEO bhi dikhega

SELECT e.name, m.name FROM staff e JOIN staff m ON e.managerId = m.id;  -- CEO gayab!

-- UNION vs UNION ALL
SELECT shift FROM operators UNION     SELECT shift FROM operators;  -- 2 rows
SELECT shift FROM operators UNION ALL SELECT shift FROM operators;  -- 10 rows</pre>
      <p>✅ Self-check: Teeno self-join ka count alag tha? INNER JOIN wali hierarchy query mein CEO gayab tha (Level 10 ka sabak wapas)?</p>`,
    cards: [
      { front: 'UNION vs UNION ALL?', back: '<b>UNION</b> duplicates hataata hai (sort/hash = dheema). <b>UNION ALL</b> sab rakhta hai, tez. <b>Default ALL chuno</b>, dedupe tabhi jab sach mein zaroori ho.' },
      { front: 'JOIN vs UNION?', back: '<b>JOIN chaudai badhata hai</b> (naye columns ek row mein). <b>UNION lambai badhata hai</b> (naye rows). UNION ke liye columns ka count+order match karna chahiye.' },
      { front: 'Self-join kya hai?', back: 'Ek hi table ko <b>do alag alias</b> ke saath JOIN karna — same-X jode, manager–employee hierarchy, duplicate dhoondhna.' },
      { front: 'Self-join ka classic bug?', back: '<code>a.id != b.id</code> se <b>har jodi do baar</b> aati hai (A-B aur B-A); bina shart ke row <b>khud se</b> bhi judti hai. Fix: <b><code>a.id &lt; b.id</code></b> — asli case mein 40 operators ko 80 emails gaye the.' },
      { front: 'Manager hierarchy query?', back: '<code>FROM employees e LEFT JOIN employees m ON e.managerId = m.id</code> — <b>LEFT</b> zaroori hai, warna CEO (managerId NULL) chup-chaap gir jaayega.' },
    ],
  },

  /* ================= LEVEL 7: Indexes & EXPLAIN ================= */
  {
    id: 'indexes',
    icon: '⚡',
    title: 'Indexes & EXPLAIN — Query ko Tez Karo',
    badge: 'Index Acharya',
    objectives: [
      '<b>Index</b> kya hai — kitaab ka index, B-tree ka jaadu',
      '<b>EXPLAIN</b> padhna — <code>type: ALL</code> vs <code>ref</code>',
      'Kis column par index — aur kis par nahi',
      'Index ki <b>keemat</b> — writes aur jagah',
    ],
    lesson: [
      `<h3>📖 Index = kitaab ka index</h3>
       <p>500 page ki kitaab mein "transaction" shabd dhoondhna hai. Do tareeke:
       page 1 se shuru karke har page padho (<b>full scan</b>), ya peeche ke
       index se seedha page number nikaalo (<b>index lookup</b>).</p>
       <p>Database bilkul yehi karta hai. Bina index ke
       <code>WHERE customerLocation = 'Tokyo'</code> ke liye use <b>har row</b>
       padhni padti hai:</p>
       <pre>1,000,000 rows wali table:
  bina index:  ~1,000,000 reads   🐌
  index ke saath: ~20 reads       ⚡  (B-tree, log₂ 1M ≈ 20)</pre>
       <pre>CREATE INDEX idx_location ON bx50Data(customerLocation);
SHOW INDEXES FROM bx50Data;
DROP INDEX idx_location ON bx50Data;</pre>
       <p>💡 <b>PRIMARY KEY par index apne aap hota hai</b> — isliye
       <code>WHERE id = 5</code> hamesha tez hai.</p>`,
      `<h3>🔬 EXPLAIN — andaza mat lagao, plan dekho</h3>
       <p>Query ke aage <code>EXPLAIN</code> lagao — database batayega ki woh
       use kaise chalayega:</p>
       <pre>EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = 'Tokyo';

+----+----------+------+---------------+------+------+-------------+
| id | table    | type | possible_keys | key  | rows | Extra       |
+----+----------+------+---------------+------+------+-------------+
|  1 | bx50Data | ALL  | NULL          | NULL | 1000 | Using where |
+----+----------+------+---------------+------+------+-------------+</pre>
       <p><b>Sabse zaroori column: <code>type</code></b></p>
       <table>
         <tr><th>type</th><th>Matlab</th><th>Kaisa</th></tr>
         <tr><td><code>ALL</code></td><td>full table scan</td><td>🐌 badi table par bura</td></tr>
         <tr><td><code>index</code></td><td>poora index scan</td><td>😐 thoda behtar</td></tr>
         <tr><td><code>range</code></td><td>index par range (BETWEEN, &gt;)</td><td>🙂 theek</td></tr>
         <tr><td><code>ref</code></td><td>index par match</td><td>⚡ achha</td></tr>
         <tr><td><code>const</code> / <code>eq_ref</code></td><td>PK/unique par ek row</td><td>🚀 best</td></tr>
       </table>
       <p><code>key</code> = kaunsa index laga (NULL = koi nahi).
       <code>rows</code> = DB ka andaza kitni rows padhni padengi.</p>
       <p>💡 <b>Chhoti table par <code>ALL</code> theek hai</b> — 50 rows ke liye
       index kholna hi mehnga hai. EXPLAIN ka matlab tab hai jab table badi ho.</p>`,
      `<h3>🎯 Index kahan lagao — aur kahan nahi</h3>
       <p><b>Lagao:</b></p>
       <ul>
         <li><code>WHERE</code> mein baar-baar aane wale columns</li>
         <li><code>JOIN ... ON</code> ke dono taraf ke columns (FK par index zaroor!)</li>
         <li><code>ORDER BY</code> / <code>GROUP BY</code> ke columns</li>
       </ul>
       <p><b>Mat lagao:</b></p>
       <ul>
         <li>Har column par "bas aise hi" — <b>har index INSERT/UPDATE ko slow
             karta hai</b> (data ke saath index bhi update hota hai) aur disk
             leta hai</li>
         <li>Bahut kam alag values wale column par (jaise <code>active</code>
             0/1) — DB aksar use ignore hi kar dega</li>
         <li>Chhoti tables par (full scan waise bhi sasta hai)</li>
       </ul>
       <p>⚠️ <b>Index bekaar ho jaata hai jab column par function lagao:</b></p>
       <pre>❌ WHERE YEAR(startDate) = 2026        -- index use nahi hoga
✅ WHERE startDate >= '2026-01-01' AND startDate < '2027-01-01'

❌ WHERE bx50Name LIKE '%tokyo%'      -- shuruaat fixed nahi
✅ WHERE bx50Name LIKE 'bx50-tokyo%'  -- index lag sakta hai</pre>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka live dashboard
       har 30 second par refresh hota tha aur build history dikhata tha. Jaise
       hi table 2 lakh rows par pahunchi, page 14 second lene laga aur kabhi-kabhi
       timeout ho jaata. EXPLAIN chalaya toh <code>type: ALL</code>, <code>rows:
       198443</code> — <code>bx50Data.buildNum</code> par koi index hi nahi tha,
       jabki har JOIN usi par hota tha. Ek line ne fix kiya:
       <code>CREATE INDEX idx_buildnum ON bx50Data(buildNum);</code> — 14s se
       <b>0.2s</b>. <b>Sabak: FK column par index dalna bhool jaana sabse common
       performance bug hai</b> (MySQL FK banane par index auto-create karta hai,
       par yahan FK constraint hi nahi tha — sirf ek plain column tha).</div>`,
    ],
    stages: [
      {
        type: 'indexlab',
        title: '📊 Lab: index banao, EXPLAIN live badalta dekho',
        instructions: 'Column par click karke index banao. Neeche EXPLAIN turant badlega — koi submit nahi.',
        scenario: `<code>bx50Data</code> jaisi ek table hai jisme <b>10 lakh</b> rows hain.
          Yeh query abhi <b>poori table</b> scan karti hai. Ise theek karo.`,
        table: {
          name: 'devices', rows: 1000000, pk: 'id',
          columns: [
            { name: 'customerLocation', distinct: 40 },
            { name: 'buildNum', distinct: 12000 },
            { name: 'installedAt', distinct: 800000 },
            { name: 'status', distinct: 3 },
          ],
        },
        query: {
          sql: "SELECT id, buildNum\nFROM   devices\nWHERE  buildNum = 'BX50-2024';",
          where: [{ col: 'buildNum', op: 'eq' }],
          select: ['id', 'buildNum'],
        },
        goal: {
          text: 'Rows examined <b>200 se kam</b> laao.',
          rowsUnder: 200,
          check: (p) => p.rowsExamined < 200,
        },
        insight: `Dekha? Sirf <code>buildNum</code> par index lagane se rows examined
          10 lakh se ~80 par aa gaye — <code>type</code> bhi <code>ALL</code> se
          <code>ref</code> ho gaya.<br><br>
          Ab ek aur cheez try karo: <code>customerLocation</code> ko index mein
          <b>pehle</b> daal ke dekho. Kuch nahi hoga — kyunki woh query mein hai hi nahi,
          aur <b>left-most prefix</b> ka niyam kehta hai ki index apne pehle column se
          hi lagta hai.`,
      },

      {
        type: 'bins',
        title: 'Index lagayein ya nahi?',
        instructions: 'Har column ko sahi bin mein daalo.',
        bins: [
          { id: 'yes', label: '✅ Index lagao' },
          { id: 'no', label: '❌ Index mat lagao' },
        ],
        items: [
          { text: 'bx50Data.buildNum — har JOIN isi par hota hai', bin: 'yes', explain: 'JOIN/FK column — sabse zyada faayda. Asli project mein isi ne 14s → 0.2s kiya.' },
          { text: 'bx50Data.customerLocation — dashboard filter', bin: 'yes', explain: 'WHERE mein baar-baar aata hai aur values kaafi alag-alag hain.' },
          { text: 'bx50Builds.active — sirf 0 ya 1', bin: 'no', explain: 'Bahut kam distinct values (low cardinality) — DB aksar index ignore karke full scan hi karega.' },
          { text: 'bx50Data.notes — lamba TEXT column', bin: 'no', explain: 'TEXT par normal index mehnga/limited hai. Full-text search chahiye toh FULLTEXT index alag cheez hai.' },
          { text: 'bx50Sessions.userId — har report isi par group hoti hai', bin: 'yes', explain: 'GROUP BY / JOIN column. Index se grouping bhi tez hoti hai.' },
          { text: 'operators.opId — already PRIMARY KEY hai', bin: 'no', explain: 'PK par index apne aap hai. Dobara banana bekaar duplicate hai.' },
          { text: 'bmsTester.client — filters aur GROUP BY dono mein', bin: 'yes', explain: 'WHERE + GROUP BY dono mein aata hai, aur distinct values theek-thaak hain.' },
          { text: 'Ek table jisme kul 40 rows hain, uske har column par', bin: 'no', explain: 'Chhoti table par full scan waise bhi sasta hai. Index ki cost (writes + jagah) faayde se zyada.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Index diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'indexes',
        questions: [
          { q: 'Bina index ke DB kya karta hai?', target: 'fullscan', explain: 'Full table scan — har row padhta hai. EXPLAIN mein type: ALL dikhta hai.' },
          { q: 'Query plan dekhne ka command kaunsa hai?', target: 'explain', explain: 'EXPLAIN SELECT ... — andaza mat lagao, plan padho.' },
          { q: 'Index ki chhupi keemat kya hai?', target: 'writecost', explain: 'Har INSERT/UPDATE par index bhi update hota hai — writes slow, disk zyada. Isliye "sab par index" galat hai.' },
          { q: 'Index kis tarah ke columns par lagana chahiye?', target: 'whatidx', explain: 'WHERE, JOIN ON, aur ORDER BY/GROUP BY mein baar-baar aane wale columns.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: 14 second wala dashboard',
        instructions: 'EXPLAIN se problem dhoondo, index se theek karo, phir EXPLAIN se proof lo.',
        goal: 'Dashboard slow hai. <b>(1)</b> <code>EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = \'Tokyo\';</code> — <code>type</code> column dekho. <b>(2)</b> <code>SHOW INDEXES FROM bx50Data;</code> — abhi kya hai? <b>(3)</b> Index banao: <code>CREATE INDEX idx_location ON bx50Data(customerLocation);</code>. <b>(4)</b> Wahi <code>EXPLAIN</code> dobara chalao — <code>type</code> ab <code>ref</code> hona chahiye. <b>(5)</b> JOIN wale column par bhi index banao: <code>bx50Data(buildNum)</code> — yehi asli 14s wala bug tha.',
        tasks: [
          { text: 'EXPLAIN chalao — type: ALL dekho', check: s => s.history.some(h => /^explain/i.test(h)) },
          { text: 'SHOW INDEXES FROM bx50Data', check: s => s.history.some(h => /show\s+index(es)?\s+from/i.test(h)) },
          { text: 'customerLocation par index banao', check: s => (s.db.tables.bx50Data.indexes || []).some(i => i.toLowerCase() === 'customerlocation') },
          { text: 'EXPLAIN dobara — ab type: ref', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
          { text: 'buildNum (JOIN column) par bhi index', check: s => (s.db.tables.bx50Data.indexes || []).some(i => i.toLowerCase() === 'buildnum') },
        ],
        db: SG.factoryDB(),
        success: s => (s.db.tables.bx50Data.indexes || []).some(i => i.toLowerCase() === 'customerlocation')
          && (s.db.tables.bx50Data.indexes || []).some(i => i.toLowerCase() === 'buildnum')
          && s.history.filter(h => /^explain/i.test(h)).length >= 2
          && s.history.some(h => /show\s+index(es)?\s+from/i.test(h)),
        successText: '🎉 <b>Proof ke saath fix.</b> Pehle <code>type: ALL</code> (full scan, saari rows), index ke baad <code>type: ref</code> — DB ab seedha B-tree se jump kar raha hai. Asli project mein <code>buildNum</code> wala index hi woh ek line thi jisne dashboard <b>14 second se 0.2 second</b> kar diya, kyunki har JOIN usi column par tha. <b>Aadat banao: performance ki baat karne se pehle EXPLAIN chalao.</b> Andaza sabse mehnga tool hai.',
        hints: [
          "EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = 'Tokyo';   ← type dekho",
          'SHOW INDEXES FROM bx50Data;',
          'CREATE INDEX idx_location ON bx50Data(customerLocation);',
          "EXPLAIN SELECT * FROM bx50Data WHERE customerLocation = 'Tokyo';   ← ab type: ref",
          'CREATE INDEX idx_buildnum ON bx50Data(buildNum);',
        ],
      },
      {
        type: 'quiz',
        title: 'Index Quick-fire',
        questions: [
          {
            q: 'EXPLAIN mein <code>type: ALL</code> ka matlab?',
            choices: [
              'Full table scan — har row padhi ja rahi hai. Badi table par yeh sabse bada red flag hai',
              'Saare indexes use ho rahe hain',
              'Query sahi hai',
              'Saare columns select ho rahe hain',
            ],
            answer: 0,
            explain: '<code>ALL</code> = koi index nahi laga. Chhoti table par theek hai, badi par ilaaj chahiye.',
          },
          {
            q: 'Har column par index kyun nahi lagate?',
            choices: [
              'Har index INSERT/UPDATE ko slow karta hai (data ke saath index bhi likhna padta hai) aur disk leta hai',
              'MySQL 5 se zyada index allow nahi karta',
              'Index se SELECT slow ho jaata hai',
              'Index galat result de sakta hai',
            ],
            answer: 0,
            explain: 'Index <b>read tez, write slow</b> ka trade-off hai. Write-heavy table par bekaar index asli nuksaan karte hain.',
          },
          {
            q: 'Kaunsi query index use NAHI kar payegi?',
            choices: [
              "WHERE YEAR(startDate) = 2026 — column par function lag gaya",
              "WHERE startDate >= '2026-01-01'",
              "WHERE bx50Name LIKE 'bx50-tokyo%'",
              'WHERE buildNum = 1041',
            ],
            answer: 0,
            explain: 'Column par function = index bekaar. Isse <b>sargable</b> banao: <code>startDate &gt;= \'2026-01-01\' AND startDate &lt; \'2027-01-01\'</code>.',
          },
          {
            q: 'Sabse common performance bug kaunsa hai?',
            choices: [
              'JOIN/FK column par index dalna bhool jaana',
              'Bahut zyada columns SELECT karna',
              'Table ka naam lamba hona',
              'VARCHAR ki jagah TEXT use karna',
            ],
            answer: 0,
            explain: 'Har JOIN us column par lookup karta hai. Index na ho toh har joined row par full scan — yehi 14s wala incident tha.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Performance',
      instructions: 'Performance round. Yahan "EXPLAIN" shabd bolna zaroori hai. 🎤',
      questions: [
        {
          q: '"Ek query slow hai. Tumhara pehla kadam?"',
          choices: [
            'EXPLAIN chalaunga — type, key aur rows dekhunga. type: ALL mila toh WHERE/JOIN columns par index ki possibility dekhunga',
            'Server ki RAM badha dunga',
            'Table ko chhota kar dunga',
            'Query ko do queries mein tod dunga',
          ],
          answer: 0,
          explain: '<b>Measure, then fix.</b> EXPLAIN bole bina koi bhi performance jawab adhoora hai. Yeh ek shabd interviewer ka pura mood badal deta hai.',
        },
        {
          q: 'Interviewer: "Index sab kuch tez karta hai toh har column par kyun na lagayein?"',
          choices: [
            'Kyunki index ek trade-off hai: reads tez, par har INSERT/UPDATE ko index bhi maintain karna padta hai, aur disk lagti hai. Write-heavy tables par bekaar index ulta nuksaan karte hain',
            'Kyunki MySQL limit lagata hai',
            'Kyunki index se SELECT slow hota hai',
            'Lagana chahiye, koi problem nahi',
          ],
          answer: 0,
          explain: 'Trade-off bolna hi asli jawab hai. Bonus: "main pehle slow query log dekhta hoon, phir jo columns sach mein WHERE/JOIN mein aate hain unpar index lagata hoon."',
        },
        {
          q: '🎛️ Interviewer: "EXPLAIN se before/after dikhao."',
          terminal: {
            title: 'Interview hands-on — EXPLAIN',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>EXPLAIN SELECT * FROM bmsTester WHERE client = \'Komatsu\';</code> chalao — <code>type</code> note karo. <b>(2)</b> <code>client</code> par index banao. <b>(3)</b> Wahi EXPLAIN dobara chalao aur <code>type</code> ka farak dikhao. <b>(4)</b> <code>SHOW INDEXES FROM bmsTester;</code> se confirm karo.',
            tasks: [
              { text: 'EXPLAIN before (type: ALL)', check: s => s.history.some(h => /^explain.*bmstester/i.test(h)) },
              { text: 'client par index banao', check: s => (s.db.tables.bmsTester.indexes || []).some(i => i.toLowerCase() === 'client') },
              { text: 'EXPLAIN after (type: ref)', check: s => s.history.filter(h => /^explain.*bmstester/i.test(h)).length >= 2 },
              { text: 'SHOW INDEXES se confirm', check: s => s.history.some(h => /show\s+index(es)?\s+from\s+bmstester/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => (s.db.tables.bmsTester.indexes || []).some(i => i.toLowerCase() === 'client')
              && s.history.filter(h => /^explain.*bmstester/i.test(h)).length >= 2
              && s.history.some(h => /show\s+index(es)?\s+from\s+bmstester/i.test(h)),
            successText: '✅ <b>Before/after ke saath proof.</b> Interviewer ko yehi dikhana tha: tum problem measure karte ho, fix karte ho, aur phir <b>dobara measure karke</b> confirm karte ho. Yeh teesra kadam hi zyadatar log bhool jaate hain.',
            hints: [
              "EXPLAIN SELECT * FROM bmsTester WHERE client = 'Komatsu';",
              'CREATE INDEX idx_client ON bmsTester(client);',
              "EXPLAIN SELECT * FROM bmsTester WHERE client = 'Komatsu';   ← ab type: ref",
              'SHOW INDEXES FROM bmsTester;',
            ],
          },
        },
      ],
    },
    success: [
      'Main index ka concept (B-tree, kitaab ka index) samjha sakta hoon',
      'Main EXPLAIN padh sakta hoon — type, key aur rows ka matlab jaanta hoon',
      'Main jaanta hoon kis column par index lagana hai aur kis par nahi',
      'Main index ki keemat (slow writes, disk) bata sakta hoon',
    ],
    homework: `<p>Asli farak dekhne ke liye thoda data chahiye:</p>
      <pre>USE factory;

-- Bahut saare rows banao (recursive CTE, MySQL 8+)
CREATE TABLE big_test (id INT PRIMARY KEY AUTO_INCREMENT, client VARCHAR(50), status VARCHAR(10));

INSERT INTO big_test (client, status)
WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < 100000)
SELECT CONCAT('client-', x % 500), IF(x % 7 = 0, 'fail', 'pass') FROM n;

-- Before
EXPLAIN SELECT * FROM big_test WHERE client = 'client-42';
SELECT COUNT(*) FROM big_test WHERE client = 'client-42';   -- time note karo

-- Index
CREATE INDEX idx_client ON big_test(client);

-- After
EXPLAIN SELECT * FROM big_test WHERE client = 'client-42';  -- type badla?
SELECT COUNT(*) FROM big_test WHERE client = 'client-42';   -- time compare karo

-- Function wala trap
EXPLAIN SELECT * FROM big_test WHERE UPPER(client) = 'CLIENT-42';  -- index gaya!</pre>
      <p>✅ Self-check: <code>type</code> ALL se ref hua? Query time mein saaf farak dikha? <code>UPPER()</code> lagate hi index chhoot gaya?</p>`,
    cards: [
      { front: 'Index kya hai?', back: 'Ek sorted structure (B-tree) jo DB ko row tak <b>seedha</b> le jaata hai. 1M rows par full scan ~1M reads, index ~20 reads. PK par index apne aap hota hai.' },
      { front: 'EXPLAIN ka <code>type</code> column?', back: '<code>ALL</code> = full scan 🐌 · <code>index</code> = poora index scan · <code>range</code> = range scan · <code>ref</code> = index match ⚡ · <code>const/eq_ref</code> = PK/unique, ek row 🚀' },
      { front: 'Index kahan lagao?', back: '<b>WHERE</b> mein baar-baar aane wale, <b>JOIN ON</b> ke columns (FK par zaroor!), aur <b>ORDER BY/GROUP BY</b> ke columns.' },
      { front: 'Index ki keemat?', back: 'Har <b>INSERT/UPDATE</b> par index bhi update hota hai (writes slow) + disk. Isliye "sab par index" galat hai — khaas kar low-cardinality (0/1) columns par.' },
      { front: 'Index kab bekaar ho jaata hai?', back: 'Column par <b>function</b> lagane par (<code>YEAR(date)</code>, <code>UPPER(col)</code>) aur <code>LIKE \'%x%\'</code> (shuruaat fixed nahi). Range likho: <code>date &gt;= \'…\' AND date &lt; \'…\'</code>.' },
    ],
  },

  /* ================= LEVEL 8: ALTER & Migrations ================= */
  {
    id: 'migrations',
    icon: '🚜',
    title: 'ALTER & Migrations — Schema Badalna',
    badge: 'Migration Mistri',
    objectives: [
      '<b>ALTER TABLE</b> — ADD / MODIFY / DROP column',
      '<b>Migration file</b> — up() aur down()',
      'Safe vs khatarnaak schema changes',
      '<b>Expand-contract</b> — bina downtime ke column rename',
    ],
    lesson: [
      `<h3>🚜 ALTER TABLE — teen basic kaam</h3>
       <pre>-- Naya column (SAFE — purani rows ko NULL/default milta hai)
ALTER TABLE bx50Data ADD COLUMN barcode VARCHAR(50);
ALTER TABLE bx50Data ADD COLUMN bx50Version VARCHAR(20) DEFAULT '1.0';

-- Type badlo (asli migration!)
ALTER TABLE bx50Sessions MODIFY duration BIGINT;

-- Column hatao (KHATARNAAK — data wapas nahi aata)
ALTER TABLE bx50Data DROP COLUMN old_field;

-- Rename
ALTER TABLE bx50Data RENAME TO deviceRegistry;</pre>
       <p>Asli project ki <code>migrations/</code> folder mein <b>79 files</b>
       thi — har ek ek kahani:</p>
       <pre>2024-08-16-add-bx50-bios-pw.cjs
2024-10-30-add-barcode-col.cjs
2024-12-16-change-bx50Sessions-duration-to-bigint.cjs   ← overflow wala!
2025-08-12-remove-unique-macAddress-cloudLink.cjs        ← duplicate MAC wala!
2025-11-17-remove-cloudLinkTestBuild-table.cjs</pre>`,
      `<h3>📁 Migration file — up() aur down()</h3>
       <p>Prod ka schema <b>kabhi haath se</b> mat badlo. Har change ek
       <b>dated file</b> mein likho jo git mein jaata hai:</p>
       <pre>// migrations/2026-07-21-add-barcode-col.js
export async function up(db) {
  await db.query("ALTER TABLE bx50Data ADD COLUMN barcode VARCHAR(50)");
}
export async function down(db) {
  await db.query("ALTER TABLE bx50Data DROP COLUMN barcode");
}</pre>
       <p>Faayde:</p>
       <ul>
         <li>📜 Har environment (dev/staging/prod) par <b>same order</b> mein same changes</li>
         <li>👀 Schema change bhi <b>code review</b> se guzarta hai</li>
         <li>↩️ <code>down()</code> se rollback ka rasta hota hai</li>
         <li>🕰️ Git history batati hai ki schema aaj aisa <b>kyun</b> hai</li>
       </ul>
       <p>⚠️ <b>Ek migration = ek logical change.</b> Ek file mein 6 alag changes
       daaloge toh ek fail hone par baaki ka kya karoge?</p>`,
      `<h3>⚠️ Khatarnaak changes aur expand-contract</h3>
       <table>
         <tr><th>Change</th><th>Risk</th><th>Kyun</th></tr>
         <tr><td>ADD COLUMN (nullable)</td><td>🟢 safe</td><td>purana code ignore kar dega</td></tr>
         <tr><td>ADD COLUMN NOT NULL (bina default)</td><td>🔴 fail</td><td>purani rows kya value lein?</td></tr>
         <tr><td>DROP COLUMN</td><td>🔴 data gaya</td><td>wapas nahi aata; purana code toot sakta hai</td></tr>
         <tr><td>RENAME COLUMN</td><td>🔴 app toot-ta hai</td><td>purana code purana naam maangta hai</td></tr>
         <tr><td>MODIFY type (badi table)</td><td>🟡 lock</td><td>table rebuild — minutes tak block</td></tr>
       </table>
       <p><b>Expand-contract</b> — column rename bina downtime ke, chaar kadam:</p>
       <pre>1. EXPAND   : naya column add karo (dono maujood)
2. BACKFILL : purane se naye mein data copy karo
3. MIGRATE  : app ko naye column par shift karo (deploy)
4. CONTRACT : kuch din baad purana column drop karo</pre>
       <p>Har kadam par purana aur naya code <b>dono</b> chal sakte hain — yehi
       zero-downtime ka raaz hai.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Ek team ne
       <code>ALTER TABLE ... MODIFY</code> seedha prod par chala diya, ek table
       par jisme 40 lakh rows the. MySQL ne poori table <b>rebuild</b> karni
       shuru ki aur table par lock lag gaya. Aath minute tak koi write nahi ho
       payi — factory ke saare testers "database unavailable" dikhane lage, aur
       do shift ka data hi record nahi hua. <b>Sabak: badi table par ALTER ek
       maintenance activity hai, ek command nahi.</b> Pehle staging par time
       naapo, phir maintenance window mein ya <code>pt-online-schema-change</code>
       / <code>gh-ost</code> jaise online-DDL tool se karo.</div>`,
    ],
    stages: [
      {
        type: 'order',
        title: 'Expand-contract ka sahi order',
        instructions: 'Bina downtime ke column rename karne ke kadam sahi order mein lagao.',
        steps: [
          { text: 'EXPAND — naya column add karo (nullable)', explain: 'Purana aur naya dono maujood. Purana code bilkul theek chalta rahega.' },
          { text: 'BACKFILL — purane se naye column mein data copy karo', explain: 'Batches mein karo taaki lock lamba na ho. Ab dono columns mein same data hai.' },
          { text: 'App ko naye column par shift karke deploy karo', explain: 'Ab app naya column padhta/likhta hai. Purana abhi bhi wahan hai — rollback ka rasta khula.' },
          { text: 'Kuch din wait karo aur verify karo', explain: 'Confirm karo ki koi purana code/script purane column ko chhu toh nahi raha.' },
          { text: 'CONTRACT — purana column drop karo', explain: 'Ab safe hai. Yeh aakhri kadam hai, pehla nahi — yehi poora point hai.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Migrations diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'migrations',
        questions: [
          { q: 'Sabse safe schema change kaunsa hai?', target: 'add', explain: 'Nullable column ADD karna — purani rows ko NULL/default milta hai aur purana code use ignore kar deta hai.' },
          { q: 'Overflow wala asli migration kaunsa tha?', target: 'modify', explain: 'MODIFY duration BIGINT — INT overflow ke baad likhni padi thi.' },
          { q: 'Sabse khatarnaak change kaunsa hai?', target: 'drop', explain: 'DROP COLUMN — data wapas nahi aata aur purana code toot sakta hai. Expand-contract mein yeh aakhri kadam hota hai.' },
          { q: 'Schema change kahan likha jaana chahiye?', target: 'files', explain: 'Dated migration file mein, git mein — taaki har environment par same order, aur code review ho sake.' },
        ],
      },
      {
        type: 'fill',
        title: 'Migration file likho',
        instructions: 'Barcode column add karne ki migration. Blanks bharo.',
        template: `// migrations/2026-07-21-add-barcode-col.js

export async function {0}(db) {
  await db.query(\`
    ALTER TABLE bx50Data
    {1} COLUMN barcode VARCHAR(50)      -- nullable = safe
  \`);
}

export async function {2}(db) {
  await db.query(\`
    ALTER TABLE bx50Data
    {3} COLUMN barcode
  \`);
}`,
        tokens: ['up', 'ADD', 'down', 'DROP', 'apply', 'MODIFY', 'rollback', 'RENAME'],
        blanks: [
          { answer: 'up', explain: '<code>up()</code> = change lagao. Migration runner isse aage badhne ke liye chalata hai.' },
          { answer: 'ADD', explain: '<code>ADD COLUMN</code> nullable = sabse safe change. Purani rows ko NULL milta hai, purana code ise ignore karta hai.' },
          { answer: 'down', explain: '<code>down()</code> = rollback. Yeh likhna aalas mein chhoot jaata hai — aur exactly tab chahiye hota hai jab raat ke 2 baje deploy ulta karna pade.' },
          { answer: 'DROP', explain: '<code>down()</code> mein <code>up()</code> ka ulta. Dhyaan: DROP se data chala jaata hai — isliye rollback bhi soch ke likho.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Teen migrations chalao',
        instructions: 'Asli project ki teen migrations — barcode, bigint fix, aur cleanup.',
        goal: 'Teen asli migrations chalani hain. <b>(1)</b> <code>bx50Data</code> mein <code>barcode VARCHAR(50)</code> column add karo (asli file: <code>2024-10-30-add-barcode-col</code>). <b>(2)</b> Verify karo — <code>DESCRIBE bx50Data;</code> aur ek <code>SELECT</code> se dekho purani rows mein kya aaya. <b>(3)</b> Overflow fix: <code>bx50Sessions</code> ka <code>duration</code> already BIGINT hai, par <code>bx50Builds</code> ka <code>duration</code> bhi <b>BIGINT</b> karo — <code>ALTER TABLE ... MODIFY</code>. <b>(4)</b> Aur ek naya column <code>bx50Data</code> mein: <code>bx50Version VARCHAR(20) DEFAULT \'1.0\'</code> — dekho DEFAULT purani rows ko kaise milta hai.',
        tasks: [
          { text: 'barcode column add karo', check: s => s.db.tables.bx50Data.columns.some(c => c.name.toLowerCase() === 'barcode') },
          { text: 'DESCRIBE se verify karo', check: s => s.history.some(h => /^(describe|desc)\s+bx50data$/i.test(h)) },
          { text: 'bx50Builds.duration ko BIGINT karo', check: s => { const c = s.db.tables.bx50Builds.columns.find(x => x.name.toLowerCase() === 'duration'); return !!c && /BIGINT/i.test(c.type || ''); } },
          { text: "bx50Version DEFAULT '1.0' add karo", check: s => s.db.tables.bx50Data.columns.some(c => c.name.toLowerCase() === 'bx50version') },
        ],
        db: SG.factoryDB(db => {
          // is mission ke liye duration ko purane INT roop mein wapas le aao
          db.tables.bx50Builds.columns.find(c => c.name === 'duration').type = 'INT';
        }),
        success: s => s.db.tables.bx50Data.columns.some(c => c.name.toLowerCase() === 'barcode')
          && s.db.tables.bx50Data.columns.some(c => c.name.toLowerCase() === 'bx50version')
          && (() => { const c = s.db.tables.bx50Builds.columns.find(x => x.name.toLowerCase() === 'duration'); return !!c && /BIGINT/i.test(c.type || ''); })()
          && s.history.some(h => /^(describe|desc)\s+bx50data$/i.test(h)),
        successText: '🎉 <b>Teen migrations, teen sabak.</b> (1) <code>ADD COLUMN</code> nullable — purani 7 rows ko chup-chaap <code>NULL</code> mil gaya, kuch toota nahi. (2) <code>MODIFY … BIGINT</code> — yehi woh asli migration thi jo overflow ke baad likhni padi. (3) <code>DEFAULT \'1.0\'</code> — purani rows ko default mil gaya. Par yaad rakho: yahan 7 rows thi. <b>40 lakh rows par yehi <code>MODIFY</code> table rebuild karta hai aur minutes tak lock leta hai</b> — woh command nahi, maintenance activity hai.',
        hints: [
          'ALTER TABLE bx50Data ADD COLUMN barcode VARCHAR(50);',
          'DESCRIBE bx50Data;   phir   SELECT bx50Name, barcode FROM bx50Data;',
          'ALTER TABLE bx50Builds MODIFY duration BIGINT;',
          "ALTER TABLE bx50Data ADD COLUMN bx50Version VARCHAR(20) DEFAULT '1.0';",
        ],
      },
      {
        type: 'quiz',
        title: 'Migration Quick-fire',
        questions: [
          {
            q: 'Sabse safe schema change kaunsa hai?',
            choices: [
              'Nullable column ADD karna — purani rows ko NULL milta hai, purana code use ignore karta hai',
              'Column DROP karna',
              'Column rename karna',
              'NOT NULL column bina default ke add karna',
            ],
            answer: 0,
            explain: 'Additive changes backward-compatible hote hain. <code>NOT NULL</code> bina default = purani rows ke liye value hi nahi, migration fail.',
          },
          {
            q: 'Prod par column rename bina downtime ke kaise?',
            choices: [
              'Expand-contract: naya column add → backfill → app shift → kuch din baad purana drop',
              'Seedha ALTER TABLE ... RENAME COLUMN chala do',
              'Maintenance window mein sab band karke rename karo',
              'Rename possible hi nahi',
            ],
            answer: 0,
            explain: 'Har kadam par purana aur naya code dono chal sakte hain — yehi zero-downtime ka raaz hai.',
          },
          {
            q: 'Migration file mein <code>down()</code> kyun likhte hain?',
            choices: [
              'Rollback ke liye — deploy ulta karna pade toh schema bhi wapas ja sake',
              'Documentation ke liye',
              'MySQL ki requirement hai',
              'Performance ke liye',
            ],
            answer: 0,
            explain: '<code>down()</code> woh cheez hai jo aalas mein chhoot jaati hai aur exactly raat ke 2 baje chahiye hoti hai.',
          },
          {
            q: '40 lakh rows wali table par <code>ALTER TABLE ... MODIFY</code> chalane se pehle?',
            choices: [
              'Staging par time naapo, phir maintenance window ya online-DDL tool (pt-online-schema-change / gh-ost) use karo',
              'Seedha chala do, 1 second ka kaam hai',
              'Table ko chhota karo pehle',
              'Kuch nahi, MySQL sambhal lega',
            ],
            answer: 0,
            explain: 'Asli incident: 8 minute ka table lock, do shift ka data record hi nahi hua. Badi table par ALTER = maintenance activity.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Migrations',
      instructions: 'Ops-awareness ka round. 🎤',
      questions: [
        {
          q: '"Production database ka schema kaise badalte ho?"',
          choices: [
            'Dated migration file mein (up + down), git mein, code review ke saath — phir dev → staging → prod same order mein. Badi table par pehle staging par time naapta hoon',
            'Seedha prod par ALTER chala deta hoon',
            'DBA se bolta hoon woh kar de',
            'Naya table banake data copy kar deta hoon',
          ],
          answer: 0,
          explain: 'Teen cheezein: <b>versioned files</b>, <b>reviewed</b>, <b>staged rollout</b>. Aur "badi table par time naapta hoon" wali line ops-maturity dikhati hai.',
        },
        {
          q: 'Interviewer: "Ek column ka naam galat hai. Zero downtime mein kaise theek karoge?"',
          choices: [
            'Expand-contract: naya column add karta hoon, backfill karta hoon, app ko naye par shift karke deploy karta hoon, kuch din verify karke purana drop karta hoon',
            'Seedha RENAME chala dunga, ek second lagta hai',
            'Raat mein maintenance window leke rename karunga',
            'Rehne dunga, naam se kya farak padta hai',
          ],
          answer: 0,
          explain: 'Expand-contract pattern ka naam lena hi kaafi hai. Core idea: <b>har waqt purana aur naya code dono chal sakein.</b>',
        },
        {
          q: '🎛️ Interviewer: "Ek migration live karke dikhao."',
          terminal: {
            title: 'Interview hands-on — ALTER',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>operators</code> table mein <code>active BOOLEAN DEFAULT 1</code> column add karo (soft-delete ke liye). <b>(2)</b> <code>DESCRIBE operators;</code> se verify karo. <b>(3)</b> <code>SELECT</code> se dekho ki purani rows ko DEFAULT mila. <b>(4)</b> Ek operator ko soft-delete karo (<code>active = 0</code>) aur phir sirf active operators select karo.',
            tasks: [
              { text: 'active column add karo', check: s => s.db.tables.operators.columns.some(c => c.name.toLowerCase() === 'active') },
              { text: 'DESCRIBE se verify', check: s => s.history.some(h => /^(describe|desc)\s+operators$/i.test(h)) },
              { text: 'Ek operator soft-delete karo (active = 0)', check: s => s.db.tables.operators.rows.some(r => Number(r.active) === 0) },
              { text: 'Sirf active operators select karo', check: s => s.history.some(h => /where\s+active\s*=\s*1/i.test(h) && /operators/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.db.tables.operators.columns.some(c => c.name.toLowerCase() === 'active')
              && s.db.tables.operators.rows.some(r => Number(r.active) === 0)
              && s.history.some(h => /^(describe|desc)\s+operators$/i.test(h))
              && s.history.some(h => /where\s+active\s*=\s*1/i.test(h) && /operators/i.test(h)),
            successText: '✅ Migration + soft delete pattern ek saath. Dhyaan diya — <code>DEFAULT 1</code> ki wajah se saare purane operators apne aap active ho gaye. Agar default na hota toh sab NULL hote aur <code>WHERE active = 1</code> sabko chhod deta (NULL wala jaal, phir se!).',
            hints: [
              'ALTER TABLE operators ADD COLUMN active BOOLEAN DEFAULT 1;',
              'DESCRIBE operators;   phir   SELECT opId, name, active FROM operators;',
              "UPDATE operators SET active = 0 WHERE opId = 'OP-105';",
              'SELECT name FROM operators WHERE active = 1;',
            ],
          },
        },
      ],
    },
    success: [
      'Main ALTER TABLE se column add/modify/drop kar sakta hoon',
      'Main migration file (up/down) ka structure aur faayda samjha sakta hoon',
      'Main safe vs khatarnaak schema changes pehchaan sakta hoon',
      'Main expand-contract se zero-downtime rename plan kar sakta hoon',
    ],
    homework: `<p>Migration ki poori kahani apne DB par:</p>
      <pre>USE factory;

-- 1. Safe: nullable column
ALTER TABLE operators ADD COLUMN email VARCHAR(120);
SELECT * FROM operators;              -- purani rows mein NULL

-- 2. Khatarnaak: NOT NULL bina default (fail hoga agar rows hain)
ALTER TABLE operators ADD COLUMN phone VARCHAR(20) NOT NULL;   -- ERROR ya '' default

-- 3. Sahi tarika: default ke saath
ALTER TABLE operators ADD COLUMN phone2 VARCHAR(20) NOT NULL DEFAULT '';

-- 4. Expand-contract se rename (shift → workShift)
ALTER TABLE operators ADD COLUMN workShift VARCHAR(10);        -- EXPAND
UPDATE operators SET workShift = shift;                        -- BACKFILL
SELECT opId, shift, workShift FROM operators;                  -- dono maujood
-- (yahan app deploy hota — MIGRATE)
ALTER TABLE operators DROP COLUMN shift;                       -- CONTRACT

-- 5. Time naapo
CREATE TABLE alter_test AS SELECT * FROM big_test;   -- pichhle level ka bada table
ALTER TABLE alter_test MODIFY client VARCHAR(100);   -- kitna time laga?</pre>
      <p>✅ Self-check: Nullable ADD instant tha? NOT NULL bina default ne shikayat ki? Bade table par MODIFY ka time note kiya?</p>`,
    cards: [
      { front: 'Migration file mein kya hota hai?', back: '<b>up()</b> (change lagao) aur <b>down()</b> (rollback), ek <b>dated file</b> mein, git mein. Faayda: har environment par same order, code review, aur rollback ka rasta.' },
      { front: 'Safe vs khatarnaak schema change?', back: '🟢 <b>Nullable column ADD</b> = safe. 🔴 <b>DROP COLUMN</b> (data gaya), <b>RENAME</b> (app toota), <b>NOT NULL bina default</b> (fail). 🟡 <b>MODIFY badi table par</b> = lock.' },
      { front: 'Expand-contract pattern?', back: '1) <b>EXPAND</b> naya column add → 2) <b>BACKFILL</b> data copy → 3) app ko naye par shift (deploy) → 4) <b>CONTRACT</b> purana drop. Har kadam par dono code versions chal sakte hain.' },
      { front: 'Badi table par ALTER ka khatra?', back: 'Table <b>rebuild</b> + lock. Asli case: 40 lakh rows par 8 minute ka write-block, do shift ka data record hi nahi hua. Staging par time naapo, phir window ya <code>gh-ost</code>/<code>pt-online-schema-change</code>.' },
      { front: 'Ek migration mein kitne changes?', back: '<b>Ek logical change.</b> Ek file mein 6 changes daloge toh ek fail hone par baaki ka kya karoge? Chhoti, reviewable, reversible migrations.' },
    ],
  },

  /* ================= LEVEL 9: BOSS — Slow Dashboard ================= */
  {
    id: 'boss2',
    icon: '🏆',
    title: 'Boss: Slow Dashboard Bachao',
    badge: 'JOIN Sadhak',
    objectives: [
      'JOIN + GROUP BY + index — sab ek asli problem mein',
      'EXPLAIN se diagnose, index se fix, EXPLAIN se proof',
      'Missing data (orphans) ko anti-join se pakadna',
      'Track 2 ka certificate! 🎓',
    ],
    lesson: [
      `<h3>🚨 Situation</h3>
       <blockquote>"Operator productivity dashboard 14 second le raha hai aur
       kabhi-kabhi timeout ho jaata hai. Aur finance kehta hai device count
       galat hai. Dono theek karo."</blockquote>
       <p>Tumhare paas Track 2 ke saare tools hain. Plan:</p>
       <ol>
         <li><b>Diagnose</b> — <code>EXPLAIN</code> se dekho query kaise chal rahi hai</li>
         <li><b>Fix</b> — JOIN/WHERE columns par index</li>
         <li><b>Prove</b> — <code>EXPLAIN</code> dobara, <code>type</code> badla?</li>
         <li><b>Audit</b> — anti-join se orphan rows pakdo (count mismatch ki wajah)</li>
       </ol>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'Boss diagram par ungli rakho',
        instructions: 'Slow dashboard theek karne ke kadam.',
        visual: 'boss2',
        questions: [
          { q: 'Sabse pehla kadam kya hai — kuch badalne se pehle?', target: 'explain', explain: 'EXPLAIN — measure first. Bina plan dekhe index lagana andaza hai.' },
          { q: 'type: ALL mila. Ilaaj kya hai?', target: 'index', explain: 'JOIN/WHERE ke columns par index. Phir EXPLAIN dobara chala ke proof lo.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Boss Mission: 14 second se 0.2 second',
        instructions: 'Diagnose → fix → prove → audit. Chaar kadam.',
        goal: 'Dashboard query yeh hai: har operator ka naam, uske sessions ka count aur total duration, sirf active builds par. <b>(1)</b> Yeh query likho — <code>bx50Sessions</code> ko <code>operators</code> aur <code>bx50Builds</code> se JOIN karke, <code>WHERE b.active = 1</code>, <code>GROUP BY o.name</code>, total ke DESC order mein. <b>(2)</b> <code>EXPLAIN</code> se dekho ki <code>bx50Sessions</code> par kya chal raha hai. <b>(3)</b> Index banao <code>bx50Sessions(userId)</code> aur <code>bx50Sessions(buildNum)</code> par. <b>(4)</b> <code>EXPLAIN</code> dobara chala ke proof lo. <b>(5)</b> Audit: anti-join se woh sessions dhoondo jinka build exist nahi karta.',
        tasks: [
          { text: 'Dashboard query (2 JOIN + GROUP BY + ORDER BY)', check: s => s.history.some(h => (h.match(/join/gi) || []).length >= 2 && /group\s+by/i.test(h) && /order\s+by/i.test(h)) },
          { text: 'EXPLAIN se diagnose karo', check: s => s.history.some(h => /^explain/i.test(h)) },
          { text: 'userId par index', check: s => (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'userid') },
          { text: 'buildNum par index', check: s => (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'buildnum') },
          { text: 'EXPLAIN dobara — proof lo', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
          { text: 'Anti-join se orphan sessions audit karo', check: s => s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)) },
        ],
        db: SG.factoryDB(db => {
          // ek session aise build ko point karta hai jo delete ho chuka — finance ka count mismatch
          db.tables.bx50Sessions.rows.push({
            id: 9, userId: 'OP-101', buildNum: 1099,
            startDate: '2026-06-30 09:00:00', duration: 1500000,
          });
        }),
        success: s => (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'userid')
          && (s.db.tables.bx50Sessions.indexes || []).some(i => i.toLowerCase() === 'buildnum')
          && s.history.filter(h => /^explain/i.test(h)).length >= 2
          && s.history.some(h => (h.match(/join/gi) || []).length >= 2 && /group\s+by/i.test(h) && /order\s+by/i.test(h))
          && s.history.some(h => /left\s+join/i.test(h) && /is\s+null/i.test(h)),
        successText: '🏆 <b>Dono problems hal.</b> <b>Speed:</b> <code>EXPLAIN</code> ne <code>type: ALL</code> dikhaya, tumne JOIN columns par index lagaye, aur dobara EXPLAIN se <b>proof</b> liya — measure → fix → measure. <b>Count mismatch:</b> anti-join ne session #9 pakda jo build 1099 ko point karta hai jo exist hi nahi karta — INNER JOIN wali dashboard query use chup-chaap gira rahi thi, isliye finance ka number match nahi ho raha tha. Asli ilaaj? <b>FOREIGN KEY</b> jo use pehle din se ghusne hi na deti. Track 2 poora — <b>JOIN Sadhak</b> 🎓. Ab Track 3 mein transactions, tuning aur production DBA ka kaam.',
        hints: [
          'SELECT o.name, COUNT(s.id) AS sessions, SUM(s.duration) AS total_ms FROM bx50Sessions s JOIN operators o ON s.userId = o.opId JOIN bx50Builds b ON s.buildNum = b.buildNum WHERE b.active = 1 GROUP BY o.name ORDER BY total_ms DESC;',
          "EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';",
          'CREATE INDEX idx_sess_user ON bx50Sessions(userId);',
          'CREATE INDEX idx_sess_build ON bx50Sessions(buildNum);',
          'EXPLAIN dobara chalao — type ab ref hona chahiye',
          'SELECT s.id, s.buildNum FROM bx50Sessions s LEFT JOIN bx50Builds b ON s.buildNum = b.buildNum WHERE b.buildNum IS NULL;',
        ],
      },
      {
        type: 'quiz',
        title: 'Boss Round — Track 2 ka nichod',
        questions: [
          {
            q: 'Dashboard ka count finance ke count se kam hai. Sabse pehle kya shak karoge?',
            choices: [
              'INNER JOIN orphan rows gira raha hoga — anti-join se check karunga',
              'Database corrupt hai',
              'Index missing hai',
              'Cache purana hai',
            ],
            answer: 0,
            explain: 'Count mismatch + JOIN = pehla shak silent row drop. Anti-join (LEFT JOIN + IS NULL) 30 second mein jawab de deta hai.',
          },
          {
            q: 'Slow query ka sahi tareeka?',
            choices: [
              'EXPLAIN se measure → index/query fix → EXPLAIN se dobara measure (proof)',
              'Seedha index laga do',
              'Server upgrade kar do',
              'Query ko chhote hisson mein tod do',
            ],
            answer: 0,
            explain: 'Teesra kadam (dobara measure) hi zyadatar log bhool jaate hain — aur wahi confirm karta hai ki fix ne sach mein kaam kiya.',
          },
          {
            q: 'Orphan rows ka structural ilaaj kya hai?',
            choices: [
              'FOREIGN KEY constraint — galat reference ghus hi nahi payega (ERROR 1452)',
              'Roz cleanup script chalao',
              'App mein validation daal do',
              'LEFT JOIN use karo hamesha',
            ],
            answer: 0,
            explain: 'LEFT JOIN <b>lakshan</b> chhupata hai, FK <b>bimaari</b> rokta hai. Dono ka apna kaam hai — par prevention behtar hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Track 2 Final',
      instructions: 'Doosre track ka aakhri round. 🎤',
      questions: [
        {
          q: '"Ek reporting query slow hai aur uska count bhi galat lag raha hai. Kaise approach karoge?"',
          choices: [
            'Do alag problem hain: speed ke liye EXPLAIN → index → dobara EXPLAIN; correctness ke liye base table ka COUNT vs JOIN ke baad ka COUNT compare karke anti-join se orphans dhoondhunga',
            'Poori query dobara likh dunga',
            'Pehle server upgrade karunga',
            'Dono ek hi problem hain, index se dono theek ho jayenge',
          ],
          answer: 0,
          explain: 'Speed aur correctness <b>alag</b> problems hain — unhe alag diagnose karna hi senior approach hai. Dono ke liye specific tool bolna bonus hai.',
        },
        {
          q: 'Interviewer: "Tum Track 2 mein kya-kya seekhe, ek line mein?"',
          choices: [
            'Tables ko JOIN se jodna, LEFT JOIN se missing data pakadna, FK aur normalization se schema saaf rakhna, aur EXPLAIN + index se query tez karna',
            'Sirf JOIN likhna',
            'Sirf index lagana',
            'Kuch khaas nahi',
          ],
          answer: 0,
          explain: 'Chaar cheezein: <b>jodna</b> (JOIN), <b>dhoondhna</b> (anti-join), <b>design</b> (FK/normalization), <b>speed</b> (index/EXPLAIN). Yeh ek intermediate SQL developer ka poora scope hai.',
        },
        {
          q: '🎛️ Final hands-on: "Poori reporting query likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — Track 2 final',
            goal: '🎛️ <b>Final hands-on:</b> <b>(1)</b> Har client ke kitne tests hue aur kitne fail — <code>bmsTester</code> par <code>GROUP BY client</code>, aur <code>COUNT(*)</code> ke saath. <b>(2)</b> Har operator ka naam + uske test count — <code>bmsTester</code> ko <code>operators</code> se JOIN karke (<code>operatorId = opId</code>), <b>zero wale operators bhi dikhne chahiye</b> (LEFT JOIN + COUNT(col)). <b>(3)</b> <code>EXPLAIN</code> se dekho ki yeh JOIN kaise chal raha hai.',
            tasks: [
              { text: 'Client-wise test report', check: s => s.history.some(h => /group\s+by\s+client/i.test(h)) },
              { text: 'Operator-wise count (LEFT JOIN, zero wale bhi)', check: s => s.history.some(h => /left\s+join/i.test(h) && /count\s*\(\s*\w+\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h)) },
              { text: 'EXPLAIN se plan dekho', check: s => s.history.some(h => /^explain/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /group\s+by\s+client/i.test(h))
              && s.history.some(h => /left\s+join/i.test(h) && /count\s*\(\s*\w+\.\w+\s*\)/i.test(h) && /group\s+by/i.test(h))
              && s.history.some(h => /^explain/i.test(h)),
            successText: '✅ <b>Track 2 complete!</b> GROUP BY report, LEFT JOIN se zero-inclusive count, aur EXPLAIN se plan check — teeno ek saath. Tum ab woh SQL likh sakte ho jo asli dashboards chalati hai. 🎓',
            hints: [
              'SELECT client, COUNT(*) AS total FROM bmsTester GROUP BY client ORDER BY total DESC;',
              'SELECT o.name, COUNT(t.id) AS tests FROM operators o LEFT JOIN bmsTester t ON o.opId = t.operatorId GROUP BY o.name ORDER BY tests DESC;',
              "EXPLAIN SELECT * FROM bmsTester WHERE operatorId = 'OP-101';",
            ],
          },
        },
      ],
    },
    success: [
      'Main slow query ko EXPLAIN → index → EXPLAIN se theek kar sakta hoon',
      'Main JOIN + GROUP BY + ORDER BY ki reporting query likh sakta hoon',
      'Main anti-join se orphan rows aur count mismatch pakad sakta hoon',
      'Main Track 2 ka JOIN Sadhak certificate le chuka hoon 🎓',
    ],
    homework: `<p>Poora dashboard workflow apne DB par:</p>
      <pre>USE factory;

-- 1. Dashboard query
SELECT o.name, COUNT(s.id) AS sessions, SUM(s.duration) AS total_ms
FROM operators o
LEFT JOIN bx50Sessions s ON o.opId = s.userId
GROUP BY o.name
ORDER BY total_ms DESC;

-- 2. Diagnose
EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';

-- 3. Fix
CREATE INDEX idx_sess_user ON bx50Sessions(userId);

-- 4. Prove
EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';

-- 5. Audit
SELECT s.id, s.buildNum FROM bx50Sessions s
LEFT JOIN bx50Builds b ON s.buildNum = b.buildNum
WHERE b.buildNum IS NULL;

-- 6. Prevention
ALTER TABLE bx50Sessions
  ADD FOREIGN KEY (buildNum) REFERENCES bx50Builds(buildNum);
-- agar orphan rows hain toh yeh FAIL hoga — pehle unhe theek karo!</pre>
      <p>✅ Self-check: Aakhri step fail hua? Bahut achha — FK ne tumhe bataya ki data mein pehle se gandagi hai. Use saaf karke dobara chalao.</p>`,
    cards: [
      { front: 'Slow query ka 3-step tareeka?', back: '<b>1) EXPLAIN</b> (measure) → <b>2) index/query fix</b> → <b>3) EXPLAIN dobara</b> (proof). Teesra step zyadatar log bhool jaate hain.' },
      { front: 'Count mismatch ka pehla shak?', back: '<b>INNER JOIN orphan rows gira raha hai.</b> Base <code>COUNT(*)</code> vs JOIN ke baad ka compare karo, phir anti-join se orphans dhoondo.' },
      { front: 'Orphan rows ka lakshan vs ilaaj?', back: '<b>Lakshan chhupana</b> = LEFT JOIN (row bach jaati hai). <b>Bimaari rokna</b> = FOREIGN KEY (galat reference ghus hi nahi sakta).' },
      { front: 'Reporting query ka standard dhaancha?', back: '<code>SELECT … FROM a JOIN b ON … WHERE … GROUP BY … ORDER BY … LIMIT</code> — aur zero-inclusive chahiye toh <b>LEFT JOIN + COUNT(right.col)</b>.' },
      { front: 'Track 2 ka nichod?', back: '<b>Jodna</b> (JOIN) · <b>dhoondhna</b> (anti-join) · <b>design</b> (FK + normalization) · <b>speed</b> (EXPLAIN + index). Yeh chaar milkar asli dashboards chalate hain.' },
    ],
  },

]);

/* =====================================================================
   SQL Gurukul — Track 2 ka naya level (append-only)
   Composite Indexes & Selectivity
   ===================================================================== */

SG.registerLevelsAfter('intermediate', 'indexes', [
{
  id: 'composite',
  icon: '🔑',
  title: 'Composite Index — column ka kram hi sab kuch hai',
  badge: 'Prefix Pandit',
  objectives: [
    '<b>Left-most prefix rule</b> — index (a,b,c) kab lagta hai aur kab bilkul nahi',
    '<b>Column ka kram kaise chuno</b> — equality pehle, range aakhir mein',
    '<b>Covering index</b> — jab table chhune ki zaroorat hi na pade',
    '<b>5 single-column index ≠ 1 composite index</b> — aur har index write par tax hai',
  ],
  lesson: [
    `<h3>😰 Dard: "Index toh laga hua tha, phir bhi query 4 second le rahi thi"</h3>
     <p>QA dashboard ki ek query slow thi. Table par index bhi tha. Team confuse thi:</p>
     <pre>-- index pehle se maujood tha:
CREATE INDEX ix_sess ON bx50Sessions(userId, buildNum);

-- par dashboard yeh chala raha tha:
SELECT * FROM bx50Sessions WHERE buildNum = 1041;
                                 ↑ sirf DOOSRA column

EXPLAIN: type: ALL, rows: 4,200,000    🐌</pre>
     <p><code>buildNum</code> index ke <b>andar</b> tha. Phir bhi full table scan.</p>
     <div class="war-story"><b>⚡ Wajah ek phone book jaisi hai.</b> Phone book
     <code>(lastName, firstName)</code> par sorted hai. "Sharma" dhoondna aasan hai.
     Par sirf "Priya" dhoondni ho — bina lastName ke — toh tumhe <b>poori kitaab</b>
     padhni padegi. Kyunki firstName sirf har lastName ke <b>andar</b> sorted hai,
     poori kitaab mein nahi. Composite index bilkul yahi cheez hai.</div>`,

    `<h3>🪜 Solutions ki seedhi</h3>
     <p><b>❌ Naive: "Har column par ek index laga do"</b></p>
     <pre>CREATE INDEX ix1 ON bx50Sessions(userId);
CREATE INDEX ix2 ON bx50Sessions(buildNum);
CREATE INDEX ix3 ON bx50Sessions(startDate);</pre>
     <p>Ab har single-column query par ek index toh lagega. Par do problem hain:
     MySQL aksar <b>ek hi index</b> chunta hai (index merge sasta nahi hota), toh
     <code>WHERE userId = ? AND buildNum = ?</code> par bhi sirf ek hi lagega.
     Aur har extra index <b>har INSERT/UPDATE/DELETE ko dheema</b> karta hai —
     write-heavy table par yeh ulta nuksaan hai.</p>

     <p><b>⚠️ Better: "Composite index bana do"</b> — sahi, par <b>kram</b> galat ho toh bekaar.
     <code>(userId, buildNum)</code> aur <code>(buildNum, userId)</code> do <b>bilkul alag</b>
     cheezein hain.</p>

     <p><b>✅ Real: query dekho, phir kram chuno</b></p>
     <pre>Left-most prefix rule — index (a, b, c) lagta hai:
  WHERE a = ?                       ✅ (1/3)
  WHERE a = ? AND b = ?             ✅ (2/3)
  WHERE a = ? AND b = ? AND c = ?   ✅ (3/3)
  WHERE b = ?                       ❌ FULL SCAN
  WHERE c = ?                       ❌ FULL SCAN
  WHERE b = ? AND c = ?             ❌ FULL SCAN</pre>
     <p>Yaani <b>leading column</b> chhoda toh index gaya. Isiliye index banane se pehle
     apni asli queries dekho — <code>a</code> woh column hona chahiye jo <b>lagbhag har query</b>
     mein aata hai.</p>`,

    `<h3>⚖️ Nayi musibat: range column poore index ko rok deta hai</h3>
     <p>Index columns tab tak use hote hain jab tak <b>equality</b> (<code>=</code>) chalti rahe.
     Pehla <b>range</b> (<code>&gt;</code>, <code>&lt;</code>, <code>BETWEEN</code>, <code>LIKE 'x%'</code>)
     aate hi index wahin <b>ruk jaata</b> hai — uske baad wale columns bekaar ho jaate hain.</p>
     <pre>Index: (userId, startDate, buildNum)
Query: WHERE userId = 'OP-101'
         AND startDate &gt; '2026-01-01'     ← RANGE
         AND buildNum = 1041               ← ab yeh index se filter NAHI hoga

Behtar index: (userId, buildNum, startDate)
              equality, equality, phir range — teenon use honge</pre>
     <p><b>Niyam:</b> equality columns pehle, <b>range column hamesha aakhir mein</b>.</p>
     <p>Aur ek bonus: agar index mein query ke <b>saare</b> columns aa jaayein, toh MySQL ko
     table chhune ki zaroorat hi nahi padti — <code>Extra: Using index</code>. Isse
     <b>covering index</b> kehte hain, aur woh sabse tez cheez hai jo tum kar sakte ho.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🖥️ Mission: left-most prefix apni aankhon se',
      instructions: 'Composite index banao, phir teen alag WHERE clauses par EXPLAIN chala ke farak dekho.',
      goal: 'Yeh mission tumhe khud dikhayega ki index <b>kab lagta hai aur kab nahi</b>. ' +
        '<b>(1)</b> Pehle bina index ke: <code>EXPLAIN SELECT * FROM bx50Sessions WHERE userId = \'OP-101\';</code> — <code>type: ALL</code>. ' +
        '<b>(2)</b> Composite index banao: <code>CREATE INDEX ix_sess ON bx50Sessions(userId, buildNum);</code> ' +
        '<b>(3)</b> Wahi EXPLAIN dobara — ab <code>type: ref</code>. ' +
        '<b>(4)</b> Ab <b>dono</b> columns par EXPLAIN — dekho kitne columns match hue. ' +
        '<b>(5)</b> Ab sirf <code>buildNum</code> par EXPLAIN — <b>index hone ke bawajood FULL SCAN</b>. Yahi asli sabak hai. ' +
        '<b>(6)</b> <code>SHOW INDEXES FROM bx50Sessions;</code> se <code>Seq_in_index</code> dekho.',
      db: SG.factoryDB(),
      tasks: [
        { text: 'Index se PEHLE EXPLAIN (type: ALL)',
          check: s => s.history.some(h => /^explain/i.test(h) && /bx50sessions/i.test(h)) },
        { text: 'Composite index banao (userId, buildNum)',
          check: s => (s.db.tables.bx50Sessions.indexDefs || []).some(d => d.cols.length >= 2) },
        { text: 'Leading column par EXPLAIN — ab index lagega',
          check: s => s.history.filter(h => /^explain/i.test(h) && /userid/i.test(h)).length >= 1 &&
                      (s.db.tables.bx50Sessions.indexDefs || []).some(d => d.cols.length >= 2) },
        { text: 'DONO columns par EXPLAIN (2/2 match)',
          check: s => s.history.some(h => /^explain/i.test(h) && /userid/i.test(h) && /buildnum/i.test(h)) },
        { text: 'Sirf buildNum par EXPLAIN — FULL SCAN dekho',
          check: s => s.history.some(h => /^explain/i.test(h) && /buildnum/i.test(h) && !/userid/i.test(h)) },
        { text: 'SHOW INDEXES se Seq_in_index dekho',
          check: s => s.history.some(h => /show\s+index(es)?\s+from\s+bx50sessions/i.test(h)) },
      ],
      success: s =>
        (s.db.tables.bx50Sessions.indexDefs || []).some(d => d.cols.length >= 2) &&
        s.history.some(h => /^explain/i.test(h) && /userid/i.test(h) && /buildnum/i.test(h)) &&
        s.history.some(h => /^explain/i.test(h) && /buildnum/i.test(h) && !/userid/i.test(h)) &&
        s.history.some(h => /show\s+index(es)?\s+from\s+bx50sessions/i.test(h)),
      successText: '🎉 <b>Yehi woh 4-second wali query ka jawab tha.</b><br><br>' +
        'Tumne khud dekha: <code>ix_sess (userId, buildNum)</code> maujood hone ke bawajood ' +
        '<code>WHERE buildNum = 1041</code> par <b>FULL TABLE SCAN</b> hua — kyunki leading column ' +
        '<code>userId</code> query mein tha hi nahi.<br><br>' +
        '<b>Yaad rakho:</b> index ek <b>sorted list</b> hai, pehle column se sorted. Doosra column ' +
        'sirf pehle ke <b>andar</b> sorted hai — poore index mein nahi. Isiliye ' +
        '<code>(a,b)</code> aur <code>(b,a)</code> do bilkul alag indexes hain, aur ' +
        '<code>SHOW INDEXES</code> ka <code>Seq_in_index</code> hi batata hai kaunsa kaunsa hai.',
      hints: [
        "Pehle baseline dekho: EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';",
        'Ab index banao: CREATE INDEX ix_sess ON bx50Sessions(userId, buildNum);',
        "Wahi EXPLAIN dobara chalao: EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101';",
        "Dono columns par: EXPLAIN SELECT * FROM bx50Sessions WHERE userId = 'OP-101' AND buildNum = 1041;",
        'Ab sirf doosra column (yahi asli sabak hai): EXPLAIN SELECT * FROM bx50Sessions WHERE buildNum = 1041;',
        'Aakhir mein: SHOW INDEXES FROM bx50Sessions;',
      ],
    },

    {
      type: 'bins',
      title: 'Index lagega ya nahi?',
      instructions: 'Index hai <code>(userId, buildNum, startDate)</code>. Har query ko sahi bin mein daalo.',
      bins: [
        { id: 'yes', label: '✅ Index lagega' },
        { id: 'no', label: '❌ FULL SCAN' },
      ],
      items: [
        { text: "WHERE userId = 'OP-101'", bin: 'yes', explain: 'Leading column — 1/3 prefix. Index lagega, bhale poora na lage.' },
        { text: "WHERE userId = 'OP-101' AND buildNum = 1041", bin: 'yes', explain: '2/3 prefix — aur gehri narrowing. Yehi composite ka faayda hai.' },
        { text: 'WHERE buildNum = 1041', bin: 'no', explain: 'Leading column chhoot gaya. buildNum index ke andar hai par usse akele dhoondha nahi ja sakta — phone book mein sirf firstName se dhoondhne jaisa.' },
        { text: "WHERE startDate > '2026-01-01'", bin: 'no', explain: 'Teesra column akela. Wahi left-most prefix rule — pehle do ke bina yeh bekaar hai.' },
        { text: "WHERE buildNum = 1041 AND startDate > '2026-01-01'", bin: 'no', explain: 'Do columns hain par LEADING column phir bhi nahi hai. Prefix pehle column se hi shuru hota hai.' },
        { text: "WHERE userId = 'OP-101' AND startDate > '2026-01-01'", bin: 'yes', explain: 'Leading column hai, toh index lagega — par sirf 1/3 tak (buildNum beech mein chhoot gaya, isliye startDate se filter nahi hoga).' },
        { text: "WHERE userId IN ('OP-101','OP-102')", bin: 'yes', explain: 'IN bhi equality jaisa hi hai leading column par — index lagta hai.' },
        { text: "WHERE UPPER(userId) = 'OP-101'", bin: 'no', explain: 'Column par FUNCTION laga diya — index ab bekaar. Index raw value par bana hai, UPPER(value) par nahi. Isliye WHERE mein column ko kabhi function mein mat lapeto.' },
      ],
    },

    {
      type: 'quiz',
      title: 'Composite index — deep check',
      questions: [
        {
          q: 'Index <code>(a, b)</code> hai. <code>WHERE b = 5</code> par kya hoga?',
          choices: [
            'Full table scan — leading column `a` query mein nahi hai, toh index use hi nahi hoga',
            'Index lagega, bas thoda slow',
            'MySQL apne aap index ko ulta kar dega',
            'Error aayega',
          ],
          answer: 0,
          explain: 'Left-most prefix rule. Index <code>a</code> se sorted hai; <code>b</code> sirf har <code>a</code> ke andar sorted hai. Isliye <code>b</code> akele dhoondhne ke liye poora index padhna padega — jo full scan se behtar nahi.',
        },
        {
          q: '<code>(a, b)</code> aur <code>(b, a)</code> — kya farak hai?',
          choices: [
            'Koi farak nahi, dono same hain',
            'Ye do BILKUL alag indexes hain. (a,b) `WHERE a` par chalta hai par `WHERE b` par nahi; (b,a) ka ulta. Kaunsa chahiye yeh tumhari asli queries batati hain',
            '(b,a) hamesha behtar hai',
            'MySQL dono ko merge kar deta hai',
          ],
          answer: 1,
          explain: 'Column ka kram hi index ki pehchaan hai. Isliye index design ka pehla kadam hamesha <b>slow query log dekhna</b> hai — kaunsa column har query mein aata hai, wahi leading banega.',
        },
        {
          q: 'Index <code>(userId, startDate, buildNum)</code> par query hai: <code>WHERE userId = ? AND startDate > ? AND buildNum = ?</code>. Kya hoga?',
          choices: [
            'Teenon columns index se filter honge',
            'Index sirf `userId` aur `startDate` tak use hoga — pehla RANGE (>) aate hi index ruk jaata hai, isliye `buildNum` index se filter nahi hoga',
            'Index bilkul use nahi hoga',
            'buildNum pehle use hoga',
          ],
          answer: 1,
          explain: 'Yeh sabse zyada miss kiya jaane wala niyam hai. Equality columns index ko aage badhate hain; pehla range column use <b>rok</b> deta hai. Isliye behtar index hota <code>(userId, buildNum, startDate)</code> — <b>range hamesha aakhir mein</b>.',
        },
        {
          q: 'Covering index kya hai?',
          choices: [
            'Har column par index',
            'Aisa index jisme query ke SAARE zaroori columns maujood hain — MySQL ko table ki rows chhune ki zaroorat hi nahi padti (Extra: Using index)',
            'Ek index jo do tables ko cover karta hai',
            'PRIMARY KEY ka doosra naam',
          ],
          answer: 1,
          explain: 'Normal index se MySQL row ka pata leta hai, phir table se poori row uthata hai (do kaam). Covering index mein jawab index ke andar hi mil jaata hai — ek kaam bacha. <code>EXPLAIN</code> ke <code>Extra</code> mein <code>Using index</code> dikhe toh samajh lo covering hai.',
        },
        {
          q: 'Har column par alag index banane mein kya problem hai?',
          choices: [
            'Koi problem nahi',
            'Do: MySQL aksar EK hi index chunta hai (multi-column filter par woh composite jitna acha nahi), aur har extra index har INSERT/UPDATE/DELETE ko dheema karta hai — index write par tax hai',
            'MySQL 3 se zyada index allow nahi karta',
            'Indexes SELECT ko slow kar dete hain',
          ],
          answer: 1,
          explain: 'Reads tez, writes dheeme — yeh trade-off hamesha bolna. Ek unused index sirf disk nahi khaata, woh har write par maintain bhi hota hai. Isiliye pehle naapo (slow query log), phir index banao.',
        },
      ],
    },

    {
      type: 'fill',
      title: 'Sahi composite index likho',
      instructions: 'Dashboard ki query hai: <code>WHERE customerLocation = ? AND status = ? AND createdAt &gt; ?</code>. Sabse behtar index banao — <b>equality pehle, range aakhir mein</b>.',
      template: `CREATE {0} idx_dash
  {1} bx50Data (customerLocation, {2}, {3});`,
      tokens: ['INDEX', 'ON', 'status', 'createdAt', 'TABLE', 'FROM', 'VIEW'],
      blanks: [
        { answer: 'INDEX', explain: 'CREATE INDEX — secondary index banane ka statement.' },
        { answer: 'ON', explain: 'CREATE INDEX <naam> ON <table>(columns) — "ON" table batata hai.' },
        { answer: 'status', explain: 'Doosra EQUALITY column. Equality columns hamesha range se pehle aate hain, taaki index unse aage badh sake.' },
        { answer: 'createdAt', explain: 'RANGE column (createdAt > ?) hamesha AAKHIR mein. Pehla range aate hi index ruk jaata hai, isliye uske baad kuch rakhna bekaar hai.' },
      ],
    },

    {
      type: 'hotspot',
      title: '🎯 Diagram par: kaunsa niyam kahan',
      visual: 'composite',
      questions: [
        { q: 'Kaunsi query par index BILKUL nahi lagega?', target: 'broken', explain: 'Leading column (userId) chhoot gaya — left-most prefix toota, full scan.' },
        { q: 'Composite index mein equality columns kahan rakhte hain?', target: 'equality', explain: 'Sabse pehle. Equality index ko aage badhati hai; range use rok deta hai.' },
        { q: 'Range column (>, <, BETWEEN) kahan rakhna chahiye?', target: 'range', explain: 'Hamesha AAKHIR mein — pehla range column ke baad index aage nahi badhta.' },
        { q: 'Kaunsa cheez table chhune ki zaroorat hi khatam kar deti hai?', target: 'covering', explain: 'Covering index — query ke saare columns index mein, toh Extra: Using index.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Index Design',
    instructions: 'Yeh sawaal senior roles mein lagbhag pakka aata hai. 🎤',
    questions: [
      {
        q: 'Interviewer: "Index (a, b, c) hai. Kaunsi queries uska faayda uthayengi?"',
        choices: [
          'WHERE a / WHERE a,b / WHERE a,b,c — yaani koi bhi LEFT-MOST PREFIX. WHERE b, WHERE c, ya WHERE b,c par index nahi lagega kyunki leading column chhoot jaata hai. Aur agar beech mein koi RANGE aa gaya toh index wahin ruk jaayega — isliye range column hamesha aakhir mein rakhta hoon.',
          'Saari queries jinme a, b ya c mein se koi bhi ho',
          'Sirf WHERE a AND b AND c',
          'Koi bhi query, MySQL apne aap sambhal leta hai',
        ],
        answer: 0,
        explain: 'Poora jawab do cheezein bolta hai: (1) left-most <b>prefix</b> (sirf "leading column" nahi), aur (2) range column index ko <b>rok</b> deta hai. Doosri baat bahut kam log bolte hain — wahi tumhe alag karti hai.',
      },
      {
        q: 'Interviewer: "Ek table par 9 indexes hain. Tumhari raay?"',
        choices: [
          'Bilkul theek hai, jitne zyada utna achha',
          'Sabse pehle main dekhunga ki kaunse SACH MEIN use ho rahe hain (performance_schema / sys.schema_unused_indexes). Har index har INSERT/UPDATE/DELETE par maintain hota hai, toh unused index sirf disk nahi — write latency bhi khaata hai. Aur aksar 3-4 single-column indexes ko ek sahi composite index se replace kiya ja sakta hai. Par hataane se pehle production traffic par verify karunga.',
          '9 se kam kar ke 3 kar dunga',
          'Saare hata ke sirf PRIMARY KEY rakhunga',
        ],
        answer: 1,
        explain: 'Achha jawab <b>naapne</b> se shuru hota hai, andaze se nahi. "Unused indexes dhoondhunga" bolna turant senior signal deta hai — aur "hataane se pehle verify" bolna aur bhi.',
      },
      {
        q: '🎛️ Interviewer: "Composite index ka faayda aur uski seema, dono dikhao."',
        terminal: {
          title: 'Interview hands-on — prefix rule prove karo',
          goal: '🎛️ <b>Hands-on:</b> <code>bmsTester</code> par kaam karo. ' +
            '<b>(1)</b> Composite index banao: <code>(client, status)</code>. ' +
            '<b>(2)</b> <code>EXPLAIN</code> se dikhao ki <code>WHERE client = \'Komatsu\' AND status = \'pass\'</code> par index lagta hai. ' +
            '<b>(3)</b> Ab <code>EXPLAIN</code> se dikhao ki <code>WHERE status = \'pass\'</code> par <b>nahi</b> lagta. ' +
            '<b>(4)</b> <code>SHOW INDEXES FROM bmsTester;</code> se Seq_in_index confirm karo.',
          db: SG.factoryDB(),
          tasks: [
            { text: 'Composite index (client, status) banao',
              check: s => (s.db.tables.bmsTester.indexDefs || []).some(d => d.cols.length >= 2 && d.cols[0].toLowerCase() === 'client') },
            { text: 'Dono columns par EXPLAIN — index lagta hai',
              check: s => s.history.some(h => /^explain/i.test(h) && /client/i.test(h) && /status/i.test(h)) },
            { text: 'Sirf status par EXPLAIN — index NAHI lagta',
              check: s => s.history.some(h => /^explain/i.test(h) && /status/i.test(h) && !/client/i.test(h)) },
            { text: 'SHOW INDEXES se confirm',
              check: s => s.history.some(h => /show\s+index(es)?\s+from\s+bmstester/i.test(h)) },
          ],
          success: s =>
            (s.db.tables.bmsTester.indexDefs || []).some(d => d.cols.length >= 2 && d.cols[0].toLowerCase() === 'client') &&
            s.history.some(h => /^explain/i.test(h) && /client/i.test(h) && /status/i.test(h)) &&
            s.history.some(h => /^explain/i.test(h) && /status/i.test(h) && !/client/i.test(h)) &&
            s.history.some(h => /show\s+index(es)?\s+from\s+bmstester/i.test(h)),
          successText: '✅ <b>Yehi demo interview jitata hai.</b> Tumne index ka faayda AUR uski seema, ' +
            'dono ek hi terminal mein prove kar di.<br><br>Bolne ke liye ek line: ' +
            '<i>"Composite index ek sorted list hai — pehle column se. Isliye left-most prefix ke bina ' +
            'woh utna hi bekaar hai jitna koi index na hona. Aur range column uske aage ka hissa rok deta hai, ' +
            'isliye main range hamesha aakhir mein rakhta hoon."</i>',
          hints: [
            'Index banao: CREATE INDEX ix_bms ON bmsTester(client, status);',
            "Dono columns par: EXPLAIN SELECT * FROM bmsTester WHERE client = 'Komatsu' AND status = 'pass';",
            "Ab sirf doosra column: EXPLAIN SELECT * FROM bmsTester WHERE status = 'pass';",
            'Confirm karo: SHOW INDEXES FROM bmsTester;',
          ],
        },
      },
    ],
  },
  success: [
    'Main left-most prefix rule samjha sakta hoon aur EXPLAIN se prove kar sakta hoon',
    'Main composite index ke columns ka sahi kram chun sakta hoon (equality pehle, range aakhir)',
    'Main covering index pehchan sakta hoon (Extra: Using index)',
    'Main bata sakta hoon ki har column par index kyun bura idea hai',
  ],
  homework: `<p>Asli MySQL par khud dekho — yeh 4 commands poora sabak hain:</p>
    <pre>-- 1. Composite index banao
CREATE INDEX ix_demo ON your_table (colA, colB);

-- 2. Leading column — index lagega
EXPLAIN SELECT * FROM your_table WHERE colA = 'x';

-- 3. Sirf doosra column — index NAHI lagega (yahi asli sabak hai)
EXPLAIN SELECT * FROM your_table WHERE colB = 'y';

-- 4. Index ke andar ka kram dekho
SHOW INDEXES FROM your_table;      -- Seq_in_index column dekho</pre>
    <p><b>Aur ek asli production trick</b> — kaunse indexes bekaar pade hain:</p>
    <pre>SELECT * FROM sys.schema_unused_indexes;</pre>
    <p>Yeh MySQL 5.7+ mein built-in hai aur aksar chaunkane wale natije deta hai.
    Par yaad rakho: yeh sirf <b>server start ke baad</b> ka data dikhata hai —
    mahine mein ek baar chalne wali report ka index bhi "unused" dikh sakta hai.
    Isliye hataane se pehle kam se kam ek poora business cycle observe karo.</p>`,
  cards: [
    { front: 'Left-most prefix rule kya hai?', back: 'Index <code>(a,b,c)</code> tabhi lagta hai jab WHERE mein <b>a</b> ho. <code>a</code> / <code>a,b</code> / <code>a,b,c</code> ✅ — par <code>b</code>, <code>c</code>, ya <code>b,c</code> akele ❌ full scan.' },
    { front: '(a,b) aur (b,a) mein farak?', back: 'Ye <b>do bilkul alag</b> indexes hain. Index pehle column se sorted hota hai; doosra column sirf pehle ke <b>andar</b> sorted hai. Kaunsa chahiye — yeh tumhari asli queries batati hain.' },
    { front: 'Composite index mein column ka kram kaise chuno?', back: '1) <b>Equality</b> columns (=, IN) pehle. 2) <b>Range</b> column (&gt;, &lt;, BETWEEN) <b>hamesha aakhir</b> — pehla range aate hi index ruk jaata hai. 3) Barabari ho toh zyada selective pehle.' },
    { front: 'Covering index?', back: 'Query ke <b>saare</b> columns index mein maujood → MySQL ko table ki row chhune ki zaroorat hi nahi. <code>EXPLAIN</code> ke <code>Extra</code> mein <b>Using index</b> dikhta hai. Sabse tez.' },
    { front: 'Har column par index kyun nahi?', back: 'MySQL aksar <b>ek hi</b> index chunta hai, toh multi-column filter par composite hi kaam aata hai. Aur har index <b>har write</b> par maintain hota hai — index reads ka faayda hai par <b>writes par tax</b>.' },
    { front: 'WHERE UPPER(col) = ? par index kyun nahi lagta?', back: 'Index <b>raw value</b> par bana hai, <code>UPPER(value)</code> par nahi. Column ko function mein lapetne se index bekaar ho jaata hai. Yehi <code>duration / 1000 &gt; 3600</code> ke saath bhi hota hai.' },
  ],
},
]);

/* =====================================================================
   Index types — `indexes` level ke BAAD.
   Woh level "index kya hai" sikhata hai; yeh "kaunsa index, kab".
   ===================================================================== */
/* success() ko tasks se sync rakhne ka pattern — dekho EXTENDING.md.
   Bina iske success() tasks se aage nikal jaata hai, sim.done jaldi lag
   jaata hai, aur baaki hints chalti hi nahi. */
const allOfInt = tasks => s => tasks.every(t => t.check(s));

const T_IDXTYPE = [
  { text: 'EXPLAIN chalao — abhi type: ALL', check: s => s.history.some(h => /^explain/i.test(h)) },
  /* NOTE: sqlcli `indexes` mein sirf PEHLA column rakhta hai; poori definition
     `indexDefs` mein hoti hai. Composite check hamesha indexDefs par karo. */
  { text: 'Composite index banao (customerLocation, buildNum)', check: s => (s.db.tables.bx50Data.indexDefs || []).some(d => d.cols.length >= 2 && /customerlocation/i.test(d.cols[0]) && d.cols.some(c => /buildnum/i.test(c))) },
  { text: 'EXPLAIN dobara — ab covering', check: s => s.history.filter(h => /^explain/i.test(h)).length >= 2 },
  { text: 'SHOW INDEXES se Seq_in_index dekho', check: s => s.history.some(h => /show\s+index(es)?\s+from/i.test(h)) },
];

SG.registerLevelsAfter('intermediate', 'indexes', [
{
  id: 'indextypes',
  icon: '🗂️',
  title: 'Index Ke Types — Kaunsa Kab, Aur Kaunsa Bekaar',
  badge: 'Index Parakhi',
  objectives: [
    'B-tree vs Hash vs Fulltext — <b>kaam</b> ke hisaab se',
    '<b>Covering index</b> — asli table chhue bina jawab',
    'Selectivity — kis column par index <b>bekaar</b> hai',
    'Partial aur functional index — chhote, sasta, tez',
  ],
  lesson: [
    `<h3>🎯 Ek line: index ka type = SAWAAL ka type</h3>
     <table>
       <tr><th>Type</th><th>Kya kar sakta hai</th><th>Kya NAHI</th></tr>
       <tr><td><b>B-tree</b> (default)</td><td><code>=</code>, <code>&lt; &gt;</code>, <code>BETWEEN</code>, <code>LIKE 'abc%'</code>, <code>ORDER BY</code></td><td>—</td></tr>
       <tr><td><b>Hash</b></td><td>sirf <code>=</code> — aur usme B-tree se tez</td><td>range ❌, <code>ORDER BY</code> ❌</td></tr>
       <tr><td><b>Fulltext</b></td><td>shabd dhoondna, relevance ranking</td><td>exact match ke liye bekaar</td></tr>
       <tr><td><b>Spatial</b></td><td>"paas mein kya hai" (geo)</td><td>normal columns ke liye nahi</td></tr>
     </table>
     <p class="tip">🎯 99% waqt jawab <b>B-tree</b> hai — aur wahi default bhi hai.
     Hash tabhi jab sirf equality ho aur woh bahut hot ho.
     Aur <code>LIKE '%abc%'</code> ke liye <b>koi bhi</b> normal index kaam nahi karta —
     kyunki B-tree shuruaat se navigate karta hai, aur yahan shuruaat unknown hai.
     Uske liye fulltext (ya inverted index) chahiye.</p>`,
    `<h3>📉 Selectivity — index kab BEKAAR hai</h3>
     <pre>Selectivity = alag values / kul rows

status ('active'/'inactive')  → 2 / 10,00,000  = 0.000002   ❌ bekaar
country                       → 195 / 10,00,000            ⚠️ theek-thaak
email                         → 10,00,000 / 10,00,000 = 1   ✅ perfect</pre>
     <p>Agar <code>WHERE status = 'active'</code> aadhi table laut aati hai, toh index
     use karna <b>ulta mehnga</b> hai — DB ko index padhna padega <b>aur phir</b> 5 lakh
     rows table se uthani padengi. Poora scan usse sasta hai. Isiliye optimizer
     aise index ko <b>ignore</b> kar deta hai — aur woh sahi karta hai.</p>
     <p class="tip">🎯 Par ek mod hai: agar values <b>bahut asamaan</b> hain
     (99.9% rows <code>status='done'</code>, 0.1% <code>'pending'</code>), toh
     <code>WHERE status='pending'</code> ke liye index bahut kaam ka hai —
     aur uske liye <b>partial index</b> sabse sahi hai.</p>
     <h3>🏆 Covering index — asli table chhue bina</h3>
     <pre>SELECT user_id, amount FROM orders WHERE user_id = 42;

index (user_id)             → index se rows dhoondi, phir HAR row table se uthai
index (user_id, amount)     → amount bhi index mein hai → table chhui hi nahi 🏆
                              EXPLAIN: "Using index"</pre>
     <h3>✂️ Partial aur functional</h3>
     <pre>-- Partial: sirf un rows par index jo tum sach mein dhoondte ho
CREATE INDEX ix ON orders(created_at) WHERE status = 'pending';
   → 10 lakh rows ki jagah 800 rows ka index. Chhota = tez = sasta.

-- Functional: expression par index
CREATE INDEX ix ON users(LOWER(email));
   → ab WHERE LOWER(email) = ? par index LAGTA hai
     (warna column ko function mein lapetne se index bekaar ho jaata hai)</pre>`,
  ],
  stages: [
    {
      type: 'indexlab',
      title: '📊 Lab: index banao, EXPLAIN live badalta dekho',
      instructions: 'Columns par click karke index banao. Kram maayne rakhta hai — neeche EXPLAIN turant badlega.',
      scenario: `<code>orders</code> table mein <b>10 lakh</b> rows hain.
        Yeh query roz hazaaron baar chalti hai aur abhi <b>poori table</b> scan karti hai.`,
      table: {
        name: 'orders', rows: 1000000, pk: 'id',
        columns: [
          { name: 'user_id', distinct: 50000 },
          { name: 'status', distinct: 4 },
          { name: 'created_at', distinct: 900000 },
          { name: 'amount', distinct: 80000 },
        ],
      },
      query: {
        sql: "SELECT amount\nFROM   orders\nWHERE  user_id = 42\n  AND  status  = 'paid';",
        where: [{ col: 'user_id', op: 'eq' }, { col: 'status', op: 'eq' }],
        select: ['amount'],
      },
      goal: {
        text: 'Rows examined <b>100 se kam</b> laao — aur Extra mein <b>Using index</b> aana chahiye (covering).',
        rowsUnder: 100,
        check: (p) => p.rowsExamined < 100 && p.covering,
      },
      insight: `Do cheezein dhyaan mein rakho:<br>
        • <b>Kram:</b> equality columns pehle. <code>(user_id, status)</code> dono ko use karta hai;
          <code>(status, user_id)</code> bhi chalega par <code>status</code> ki selectivity
          itni kharab hai ki woh pehle rakhna faltu hai.<br>
        • <b>Covering:</b> jaise hi <code>amount</code> bhi index mein aaya,
          EXPLAIN mein <b>Using index</b> aa gaya — DB ne asli table chhui hi nahi.
          Yahi sabse tez raasta hai.`,
    },
    {
      type: 'indexlab',
      title: '📊 Lab: ab ek RANGE daal do',
      instructions: 'Wahi table, par ab query mein ek range aur ek ORDER BY hai. Kram aur bhi zyada matter karega.',
      scenario: `Ab query mein <code>created_at &gt;</code> bhi hai. Yaad rakho —
        <b>range ke BAAD index ruk jaata hai</b>.`,
      table: {
        name: 'orders', rows: 1000000, pk: 'id',
        columns: [
          { name: 'user_id', distinct: 50000 },
          { name: 'status', distinct: 4 },
          { name: 'created_at', distinct: 900000 },
          { name: 'amount', distinct: 80000 },
        ],
      },
      query: {
        sql: "SELECT id, amount\nFROM   orders\nWHERE  user_id = 42\n  AND  created_at > '2026-01-01'\nORDER BY created_at\nLIMIT 20;",
        where: [{ col: 'user_id', op: 'eq' }, { col: 'created_at', op: 'range' }],
        orderBy: 'created_at',
        select: ['id', 'amount'],
        limit: 20,
      },
      goal: {
        text: 'Rows examined <b>50 se kam</b> laao <b>aur</b> "Using filesort" hataao.',
        rowsUnder: 50,
        check: (p) => p.rowsExamined < 50 && !p.filesort,
      },
      insight: `<b>Equality pehle, phir sort/range.</b> <code>(user_id, created_at)</code>
        mein <code>user_id</code> ne rows chhaant di aur <code>created_at</code>
        pehle se sorted tha — isliye <code>ORDER BY</code> <b>muft</b> mila
        aur <code>LIMIT 20</code> ne bas 20 rows chhui.<br><br>
        Ulta kar ke dekho: <code>(created_at, user_id)</code> mein range pehle aa jaata hai,
        aur <b>range ke baad index ruk jaata hai</b> — <code>user_id</code> phir sirf
        filter ban jaata hai, index nahi.`,
    },
    {
      type: 'bins',
      title: 'Kaunsa index type',
      instructions: 'Har zaroorat ke liye sahi index chuno.',
      bins: [
        { id: 'btree', label: '🌳 B-tree' },
        { id: 'ft', label: '📝 Fulltext' },
        { id: 'none', label: '🚫 Index mat banao' },
      ],
      items: [
        { text: "WHERE created_at BETWEEN ? AND ?", bin: 'btree', explain: 'Range query — B-tree ka classic kaam. Woh sorted hai, isliye range ek continuous slice hai.' },
        { text: "WHERE description LIKE '%wireless%'", bin: 'ft', explain: 'Beech mein wildcard — B-tree yahan kaam kar hi nahi sakta (shuruaat unknown hai). Fulltext index shabdon ka inverted index banata hai.' },
        { text: "WHERE is_deleted = 0  (99% rows 0 hain)", bin: 'none', explain: 'Selectivity lagbhag zero. Index padho <b>aur phir</b> 99% rows uthao — poore scan se mehenga. (Ulta case: <code>WHERE is_deleted = 1</code> ke liye <b>partial index</b> bahut kaam ka hai.)' },
        { text: 'ORDER BY created_at DESC LIMIT 20', bin: 'btree', explain: 'B-tree sorted hai — index ke kram se padhne par sort <b>muft</b> mil jaata hai aur LIMIT sirf 20 rows chhuti hai.' },
        { text: "WHERE email = ? (har email alag)", bin: 'btree', explain: 'Perfect selectivity. (Hash index bhi chalega aur thoda tez hoga — par woh range aur ORDER BY nahi kar sakta, isliye default B-tree hi rakhte hain.)' },
        { text: 'gender column (2 values, 50-50 baate hue)', bin: 'none', explain: 'Aadhi table laut aayegi. Index ka koi faayda nahi — par agar woh <b>kisi aur column ke saath</b> composite mein ho toh baat alag hai.' },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: covering index bana ke dikhao',
      instructions: 'Pehle EXPLAIN, phir composite index, phir EXPLAIN se proof.',
      goal: `<b>(1)</b> <code>EXPLAIN SELECT buildNum FROM bx50Data WHERE customerLocation = 'Tokyo';</code>
        <b>(2)</b> Composite index banao jisme <b>dono</b> columns hon:
        <code>CREATE INDEX idx_cover ON bx50Data(customerLocation, buildNum);</code>
        <b>(3)</b> Wahi EXPLAIN dobara chalao.
        <b>(4)</b> <code>SHOW INDEXES FROM bx50Data;</code> — <code>Seq_in_index</code> dekho, wahi column ka kram hai.`,
      tasks: T_IDXTYPE,
      db: SG.factoryDB(),
      success: allOfInt(T_IDXTYPE),
      hints: [
        "EXPLAIN SELECT buildNum FROM bx50Data WHERE customerLocation = 'Tokyo';",
        'CREATE INDEX idx_cover ON bx50Data(customerLocation, buildNum);',
        "EXPLAIN SELECT buildNum FROM bx50Data WHERE customerLocation = 'Tokyo';",
        'SHOW INDEXES FROM bx50Data;',
      ],
    },
    {
      type: 'quiz',
      title: 'Index types ki samajh',
      questions: [
        {
          q: 'Composite index mein column ka kram kaise chuno?',
          choices: [
            'Equality columns pehle, phir sort/range wale — kyunki range ke BAAD index ruk jaata hai',
            'Sabse selective column pehle',
            'Alphabetical',
            'Kram maayne nahi rakhta',
          ],
          answer: 0,
          explain: 'Yeh niyam hi composite index ka poora khel hai. <code>(user_id, created_at)</code> mein user_id ne rows chhaanti aur created_at pehle se sorted tha — ORDER BY muft. Ulta karo toh range pehle aa jaata hai aur uske baad ka column sirf <b>filter</b> reh jaata hai. ("Sabse selective pehle" ek purana rule of thumb hai jo range ke saamne tut jaata hai.)',
        },
        {
          q: 'EXPLAIN mein "Using index" ka matlab?',
          choices: [
            'Covering — saare chahiye columns index mein mil gaye, asli table chhui hi nahi',
            'Index use ho raha hai',
            'Index ki zaroorat hai',
            'Index bana raha hai',
          ],
          answer: 0,
          explain: 'Naam confusing hai. "Index use hua" toh <code>key</code> column batata hai. <b>"Using index"</b> ka matlab hai <b>index-only scan</b> — sabse tez raasta, kyunki heap/table par jaana hi nahi pada.',
        },
        {
          q: "status column mein sirf 2 values hain aur 50-50 bata hua hai. Index banaoge?",
          choices: [
            'Nahi — aadhi table laut aayegi, index padhna aur phir rows uthana poore scan se mehenga hai',
            'Haan, har WHERE column par index chahiye',
            'Haan, chhota index hai',
            'Haan, unique bana ke',
          ],
          answer: 0,
          explain: 'Optimizer aise index ko <b>ignore</b> kar dega — aur woh sahi karega. Par do mod hain: (1) agar values <b>asamaan</b> hain (99.9% done, 0.1% pending) toh us dulrbh value ke liye <b>partial index</b> bahut kaam ka hai; (2) composite index mein doosre column ke saath woh useful ho sakta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Index types',
    instructions: 'Yahan "index laga do" ke aage jaana hai. 🎤',
    questions: [
      {
        q: '"WHERE a = ? AND b > ? ORDER BY b — kaunsa index?"',
        choices: [
          '(a, b) — equality pehle, phir range/sort. a rows chhaantega aur b pehle se sorted hoga, isliye ORDER BY muft aur LIMIT sasta',
          '(b, a)',
          'Do alag index: (a) aur (b)',
          '(a) kaafi hai',
        ],
        answer: 0,
        explain: 'Do alag index lagbhag hamesha galat jawab hai — MySQL aksar <b>ek hi</b> index chunta hai. Aur <code>(b, a)</code> mein range pehle aa jaata hai, isliye <code>a</code> index se filter nahi hoga.',
      },
      {
        q: '"Ek table par 12 index hain. Problem?"',
        choices: [
          'Har INSERT/UPDATE/DELETE ko 12 index maintain karne padte hain — writes dheeme, disk zyada. Aur unme se kai shayad use hi nahi hote; unused index dhoondh ke hataao',
          'Koi problem nahi, reads tez rahenge',
          'Sirf disk zyada lagega',
          '12 bahut kam hain',
        ],
        answer: 0,
        explain: 'Index <b>reads ka faayda, writes par tax</b> hai. Aur asli baat woh aakhri hissa hai: zyadatar systems mein kai index kabhi use hi nahi hote (purane feature, purani query). MySQL mein <code>sys.schema_unused_indexes</code>, Postgres mein <code>pg_stat_user_indexes</code> se woh dikh jaate hain.',
      },
    ],
  },
  success: [
    'Index type ko sawaal ke type se jod sakte ho',
    'Selectivity dekh ke bata sakte ho ki index bekaar hai',
    'Covering index bana ke "Using index" laa sakte ho',
    'Composite index ka column kram sahi chun sakte ho',
  ],
  homework: `Apni sabse zyada chalne wali query lo aur uske SELECT + WHERE + ORDER BY ke
    saare columns likho. Ab poochho: kya un sabko ek hi index mein daala ja sakta hai
    (equality pehle, phir sort)? Agar haan — woh ek <b>covering index</b> hai,
    aur woh aksar sabse bada jump deta hai.`,
  cards: [
    { front: 'Index type kaise chunein?', back: '<b>Sawaal ke type se.</b> B-tree = <code>=</code>, range, <code>LIKE \'abc%\'</code>, ORDER BY (99% jawab). Hash = sirf <code>=</code>. Fulltext = shabd dhoondna. <code>LIKE \'%abc%\'</code> par <b>koi</b> normal index nahi chalta.' },
    { front: 'Selectivity?', back: '<code>alag values / kul rows</code>. 2-value column par index <b>bekaar</b> (aadhi table laut aayegi). Par values <b>asamaan</b> hon (99.9% vs 0.1%) toh dulrbh value ke liye <b>partial index</b> bahut kaam ka.' },
    { front: 'Covering index?', back: 'Query ke <b>saare</b> columns (SELECT + WHERE + ORDER BY) index mein → asli table chhui hi nahi. EXPLAIN: <b>Using index</b>. Sabse tez raasta.' },
    { front: 'Composite ka column kram?', back: '<b>Equality pehle, phir sort/range.</b> Range ke <b>baad index ruk jaata hai</b> — uske aage ke columns sirf filter ban jaate hain.' },
    { front: 'Partial index?', back: '<code>CREATE INDEX … WHERE status = \'pending\'</code> — 10 lakh rows ki jagah 800 rows ka index. Chhota = tez = sasta.' },
    { front: 'Functional index?', back: '<code>CREATE INDEX ON users(LOWER(email))</code> — ab <code>WHERE LOWER(email) = ?</code> par index <b>lagta</b> hai. Warna column ko function mein lapetne se index bekaar ho jaata hai.' },
    { front: '12 index ek table par?', back: 'Har write par 12 maintain karne padte hain — writes dheeme, disk zyada. Aur kai kabhi use hi nahi hote: <code>sys.schema_unused_indexes</code> / <code>pg_stat_user_indexes</code> se dhoondo.' },
  ],
},
]);

/* =====================================================================
   Normalization ka aage ka hissa — `normal` level ke BAAD.
   Woh 1NF/2NF/3NF sikhata hai; yeh BCNF, denormalization ka faisla,
   aur ek hands-on schema splitter.
   ===================================================================== */
const T_NORMMORE = [
  { text: 'cust table banao', check: s => !!s.db.tables.cust },
  { text: 'ord table banao', check: s => !!s.db.tables.ord },
  { text: 'Ek customer daalo', check: s => !!s.db.tables.cust && s.db.tables.cust.rows.length >= 1 },
  { text: 'Do orders daalo jo usi customer ko point karein', check: s => !!s.db.tables.ord && s.db.tables.ord.rows.length >= 2 },
  { text: 'JOIN karke dekho — city ek jagah, dono orders ke saath', check: s => s.history.some(h => /^select[\s\S]*join[\s\S]*cust/i.test(h)) },
];

SG.registerLevelsAfter('intermediate', 'normal', [
{
  id: 'normalmore',
  icon: '🧮',
  title: 'Normalization Ke Aage — BCNF Aur "Jaan-Boojh Ke Todna"',
  badge: 'Schema Shilpi',
  objectives: [
    'God-table ko haath se todna — aur anomalies gayab hote dekhna',
    'BCNF — jahan 3NF bhi kaafi nahi',
    'Denormalization ka <b>faisla</b>: kab, kitna, aur kya keemat',
    'Historical value vs current value — sabse aam schema bug',
  ],
  lesson: [
    `<h3>🎯 Normalization ka asli maksad</h3>
     <p>Log samajhte hain normalization "jagah bachane" ke liye hai. Nahi.
     Uska asli maksad hai: <b>har fact sirf EK jagah likha ho</b>.
     Kyunki jo cheez do jagah likhi hai, woh ek din <b>alag</b> ho jaayegi.</p>
     <table>
       <tr><th>Anomaly</th><th>Kya hota hai</th></tr>
       <tr><td><b>Update</b></td><td>Customer ka city badla — 500 rows update karni padi. Ek chhoot gayi → ab do sachchai</td></tr>
       <tr><td><b>Insert</b></td><td>Naya product add karna hai par order aaya hi nahi — row banegi hi nahi</td></tr>
       <tr><td><b>Delete</b></td><td>Aakhri order delete kiya → customer ka pata bhi chala gaya</td></tr>
     </table>
     <p class="tip">🎯 Neeche wale lab mein tum ek god-table todoge —
     aur teenon anomalies ko <b>live gayab hote</b> dekhoge.</p>`,
    `<h3>🔍 BCNF — jahan 3NF bhi kaafi nahi</h3>
     <p>3NF kehta hai: non-key column kisi doosre non-key column par depend na kare.
     BCNF thoda sakht hai: <b>har determinant ek candidate key hona chahiye</b>.</p>
     <pre>enrollment(student, subject, teacher)
   • Ek teacher sirf EK subject padhata hai      → teacher → subject
   • Ek subject ke KAI teacher ho sakte hain

Candidate keys: (student, subject)  aur  (student, teacher)
3NF? ✅ paas — subject ek key ka hissa hai (prime attribute)
BCNF? ❌ fail — "teacher" determinant hai par akela key nahi</pre>
     <p>Natija wahi purani bimari: agar ek teacher ka subject badla, toh uske
     <b>har</b> enrollment row mein badalna padega. Ilaaj: do tables —
     <code>teaches(teacher, subject)</code> aur <code>enrolled(student, teacher)</code>.</p>
     <p class="tip">🎯 Practically BCNF violations kam milte hain — par jab milte hain
     toh unka nishaan yeh hota hai: <i>"yeh column toh kisi aur column se hi
     nikal aata hai, par woh column key nahi hai."</i> 3NF tak pahunch jao toh
     99% kaam ho gaya; BCNF us baaki 1% ke liye hai.</p>`,
    `<h3>⚖️ Denormalization — jaan-boojh ke todna</h3>
     <p>Normalize karna default hai. Denormalize karna ek <b>faisla</b> hai,
     aur uske teen sawaal hain:</p>
     <pre>1. Kya woh JOIN sach mein slow hai?   ← NAAPO, andaza mat lagao
2. Read:write ratio kya hai?          ← 1000:1 hai toh haan; 2:1 hai toh nahi
3. Duplicate ko SYNC kaun karega?      ← yahi asli keemat hai</pre>
     <p>Teesra sawaal hi sabse zyada bhoola jaata hai. Duplicate data ek
     <b>hamesha ka kaam</b> ban jaata hai: trigger, application code, ya ek
     background job — aur woh kabhi na kabhi peeche reh jaayega.</p>
     <h3>💡 Ek apwaad jo denormalization LAGTA hai par hai nahi</h3>
     <pre>order_items(order_id, product_id, qty, price_paid)
                                              ↑
                       "Yeh toh products.price se duplicate hai!"</pre>
     <p><b>Nahi.</b> <code>products.price</code> aaj ka daam hai;
     <code>price_paid</code> us din ka daam hai. Yeh do <b>alag facts</b> hain.
     Agar tum <code>price_paid</code> hata do, toh daam badalne par
     <b>purane invoices badal jaayenge</b> — aur woh ek accounting bug hai.</p>
     <p class="tip">🎯 Yahi sabse aam schema bug hai:
     <b>historical value ko current value se derive karna</b>.
     Jab bhi koi cheez "us waqt kya thi" maayne rakhti ho —
     address on invoice, tax rate, plan ka naam, commission % —
     use <b>copy karke rakho</b>. Woh duplicate nahi hai; woh itihaas hai.</p>`,
  ],
  stages: [
    {
      type: 'splitter',
      title: '🔀 Lab: god-table ko todo',
      instructions: 'Column par click karo, phir us table par click karo jahan woh jaana chahiye. Neeche anomalies live theek hote dikhengi.',
      scenario: `Ek e-commerce ne sab kuch ek hi table mein rakha hai.
        Har order ki row mein customer ka poora data <b>dobara</b> likha hai,
        aur product ka bhi. <b>Har column ko uske sahi ghar mein bhejo.</b>`,
      table: 'orders_flat',
      columns: [
        { name: 'order_id', pk: true, target: 'orders', why: 'Order ki apni pehchaan — yeh orders table ka primary key hai.' },
        { name: 'order_date', target: 'orders', why: 'Yeh <b>order</b> ke baare mein ek fact hai, customer ya product ke baare mein nahi.' },
        { name: 'customer_email', target: 'customers', why: 'Customer ki pehchaan. Isse customers table ka natural key ban sakta hai — aur ab yeh 500 orders mein dohraaya nahi jaayega.' },
        { name: 'customer_name', target: 'customers', why: 'Customer ka fact. Naam badla toh ab <b>ek</b> row badalni hai, 500 nahi.', wrongHint: 'Yeh customer ke baare mein hai, order ke baare mein nahi. Poochho: "yeh fact KIS cheez ka hai?"' },
        { name: 'customer_city', target: 'customers', why: 'Wahi baat — customer ka pata order ka fact nahi hai. (Par dhyaan: <b>shipping address</b> order ka fact hota hai, kyunki woh us din ka pata hai.)' },
        { name: 'product_sku', target: 'products', why: 'Product ki pehchaan. Ab naya product bina kisi order ke bhi add ho sakta hai — <b>insert anomaly khatam</b>.' },
        { name: 'product_name', target: 'products', why: 'Product ka fact. Ek jagah likha, ek jagah badla.' },
        { name: 'catalog_price', target: 'products', why: 'Aaj ka daam — product ka current fact. Yeh badalta rehta hai.' },
        { name: 'qty', target: 'items', why: 'Kitne kharide — yeh order aur product ke <b>jod</b> ka fact hai, kisi ek ka nahi. Isliye yeh line item mein jaata hai.' },
        { name: 'price_paid', target: 'items', why: '⭐ Yeh <code>catalog_price</code> ka duplicate <b>NAHI</b> hai. Woh <b>aaj ka</b> daam hai, yeh <b>us din ka</b>. Ise hata doge toh daam badalne par purane invoices badal jaayenge — accounting bug.' },
      ],
      targets: [
        { id: 'customers', label: '👤 customers', hint: 'ek customer ke baare mein facts' },
        { id: 'products', label: '📦 products', hint: 'ek product ke baare mein facts' },
        { id: 'orders', label: '🧾 orders', hint: 'ek order ke baare mein facts' },
        { id: 'items', label: '🔗 order_items', hint: 'order + product ke JOD ke facts' },
      ],
      checks: [
        {
          ok: p => p.customer_name === 'customers' && p.customer_city === 'customers' && p.customer_email === 'customers',
          broken: '<b>Update anomaly:</b> customer ne city badli → 500 order rows update karni padengi. Ek chhoot gayi toh do sachchai ban jaayengi.',
          fixed: '<b>Update anomaly khatam</b> — customer ka data ab ek hi jagah hai. City badlo, ek row badlegi.',
        },
        {
          ok: p => p.product_sku === 'products' && p.product_name === 'products' && p.catalog_price === 'products',
          broken: '<b>Insert anomaly:</b> naya product catalog mein daalna hai par abhi kisi ne order nahi kiya — row banegi hi nahi.',
          fixed: '<b>Insert anomaly khatam</b> — product ab bina kisi order ke bhi maujood ho sakta hai.',
        },
        {
          ok: p => p.customer_email === 'customers' && p.order_id === 'orders',
          broken: '<b>Delete anomaly:</b> customer ka aakhri order delete kiya → uska naam, email, pata sab chala gaya.',
          fixed: '<b>Delete anomaly khatam</b> — order jaane se customer nahi jaata. Do alag cheezein, do alag tables.',
        },
        {
          ok: p => p.price_paid === 'items',
          broken: '<b>Itihaas ka khatra:</b> agar diya hua daam sirf products mein hai, toh daam badalne par <b>purane invoices badal jaayenge</b>.',
          fixed: '<b>Itihaas surakshit</b> — <code>price_paid</code> line item mein hai. Woh duplicate nahi, us din ka sach hai.',
        },
      ],
      insight: `Dhyaan do ki tumne kya kiya: har column ke liye ek hi sawaal poochha —
        <b>"yeh fact KIS cheez ke baare mein hai?"</b><br><br>
        Aur ek cheez jaan-boojh ke "duplicate" chhodi:
        <code>price_paid</code>. Woh duplicate nahi hai — <code>catalog_price</code>
        <b>aaj</b> ka daam hai, <code>price_paid</code> <b>us din</b> ka.
        Do alag facts, do alag jagah. Yeh farak samajhna hi schema design ka
        sabse kaam ka hunar hai.`,
    },
    {
      type: 'quiz',
      title: 'BCNF aur denormalization',
      questions: [
        {
          q: 'Kaunsi cheez 3NF paas kar sakti hai par BCNF fail?',
          choices: [
            'Jab ek non-key column kisi doosre column ko determine kare, par woh determinant khud akela key na ho',
            'Jab repeating groups hon',
            'Jab partial dependency ho',
            'Jab NULL values hon',
          ],
          answer: 0,
          explain: 'Classic udaharan: <code>(student, subject, teacher)</code> jahan <code>teacher → subject</code>. Yeh 3NF paas karta hai (kyunki subject ek key ka hissa hai) par BCNF fail — aur uska anjaam wahi purana hai: teacher ka subject badla toh uske <b>har</b> row mein badalna padega.',
        },
        {
          q: 'Denormalize karne se pehle sabse zyada bhoola jaane wala sawaal?',
          choices: [
            '"Duplicate ko SYNC kaun karega?" — yahi asli, hamesha ka kharch hai',
            '"Kitni jagah bachegi?"',
            '"Query kitni tez hogi?"',
            '"Team ko yeh aata hai?"',
          ],
          answer: 0,
          explain: 'Log speed-up naap lete hain aur sync ka kharch bhool jaate hain. Duplicate data ek <b>permanent zimmedari</b> ban jaata hai — trigger, app code, ya background job — aur woh kisi na kisi din peeche reh jaayega. Isiliye pehle poochho: kaun, kaise, aur agar woh fail ho jaaye toh kaise pata chalega?',
        },
        {
          q: 'order_items mein price_paid rakhna denormalization hai?',
          choices: [
            'Nahi — catalog_price AAJ ka daam hai, price_paid US DIN ka. Do alag facts hain',
            'Haan, woh products.price ka duplicate hai',
            'Haan, par theek hai',
            'Depends on the database',
          ],
          answer: 0,
          explain: 'Yeh sabse zaroori farak hai. Jab bhi koi cheez "us waqt kya thi" maayne rakhti ho — invoice ka pata, tax rate, plan ka naam, commission % — use <b>copy karke rakho</b>. Woh duplicate nahi, <b>itihaas</b> hai. Ise "clean up" karne wale log ek din accounting bug banate hain.',
        },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: normalized schema khud banao',
      instructions: 'Do tables banao aur unhe foreign key se jodo.',
      goal: `<b>(1)</b> Customers table banao:
        <code>CREATE TABLE cust (id INT PRIMARY KEY, email VARCHAR(100), city VARCHAR(50));</code>
        <b>(2)</b> Orders table banao jo usse point kare:
        <code>CREATE TABLE ord (id INT PRIMARY KEY, cust_id INT, total INT);</code>
        <b>(3)</b> Ek customer daalo:
        <code>INSERT INTO cust VALUES (1, 'a@b.com', 'Tokyo');</code>
        <b>(4)</b> Do orders daalo jo usi customer ko point karein:
        <code>INSERT INTO ord VALUES (1, 1, 500), (2, 1, 900);</code>
        <b>(5)</b> JOIN karke dekho:
        <code>SELECT c.email, c.city, o.total FROM ord o JOIN cust c ON o.cust_id = c.id;</code>
        <br><br>Dhyaan do — city <b>ek</b> jagah likhi hai, par dono orders ke saath dikh rahi hai.`,
      tasks: T_NORMMORE,
      db: SG.factoryDB(),
      success: allOfInt(T_NORMMORE),
      hints: [
        'CREATE TABLE cust (id INT PRIMARY KEY, email VARCHAR(100), city VARCHAR(50));',
        'CREATE TABLE ord (id INT PRIMARY KEY, cust_id INT, total INT);',
        "INSERT INTO cust VALUES (1, 'a@b.com', 'Tokyo');",
        'INSERT INTO ord VALUES (1, 1, 500), (2, 1, 900);',
        'SELECT c.email, c.city, o.total FROM ord o JOIN cust c ON o.cust_id = c.id;',
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Schema design',
    instructions: 'Yahan "normalize karo" ke aage jaana hai. 🎤',
    questions: [
      {
        q: '"Kitna normalize karoge?"',
        choices: [
          '3NF tak default — usse 99% anomalies chali jaati hain. Uske baad denormalize sirf ek MAAPE hue slow JOIN ke liye, aur tabhi jab sync ka rasta saaf ho',
          'Hamesha BCNF tak',
          'Jitna ho sake utna',
          'Normalize nahi karta, denormalized tez hota hai',
        ],
        answer: 0,
        explain: 'Achha jawab ek default deta hai <b>aur</b> usse hatne ki shart. "Hamesha BCNF" ek academically sahi par practically bekaar jawab hai; "denormalized tez hota hai" bina naap ke ek anumaan hai — aur woh sync ka kharch chhupa deta hai.',
      },
      {
        q: '"Ek order ki row mein customer ka naam bhi rakha hua hai. Bug hai?"',
        choices: [
          '"Depends — agar woh AAJ ka naam dikhane ke liye hai toh bug hai (JOIN karo). Agar woh us waqt ka naam hai jo invoice par chapa tha, toh woh sahi hai — historical fact hai"',
          'Haan, denormalization hai',
          'Nahi, performance ke liye theek hai',
          'Haan, foreign key hona chahiye tha',
        ],
        answer: 0,
        explain: 'Yeh sawaal seedha yeh test karta hai ki tum <b>current vs historical</b> ka farak jaante ho. Ek hi dikhne wala column do bilkul alag cheezein ho sakta hai — aur "cleanup" karke use hataana ek asli production bug banata hai.',
      },
    ],
  },
  success: [
    'God-table ko facts ke hisaab se tod sakte ho',
    'Teenon anomalies naam se pehchaan sakte ho',
    'BCNF ka case pehchaan sakte ho',
    'Historical vs current value ka farak kar sakte ho',
  ],
  homework: `Apne schema mein ek aisa column dhoondo jo do jagah likha hai.
    Phir poochho: (1) kya woh sach mein duplicate hai, ya ek <b>historical</b> copy hai?
    (2) agar duplicate hai, toh use sync kaun karta hai? (3) agar sync toot jaaye,
    toh pata kaise chalega? Teesre ka jawab lagbhag hamesha "nahi chalega" hota hai.`,
  cards: [
    { front: 'Normalization ka asli maksad?', back: 'Jagah bachana <b>nahi</b> — <b>har fact sirf EK jagah</b>. Jo do jagah likha hai woh ek din <b>alag</b> ho jaayega.' },
    { front: 'Teen anomalies?', back: '<b>Update</b> (500 rows badalni padi, ek chhoot gayi) · <b>Insert</b> (product bina order ke add nahi ho sakta) · <b>Delete</b> (aakhri order gaya toh customer bhi gaya).' },
    { front: 'BCNF kab fail hota hai?', back: 'Jab koi <b>determinant khud key na ho</b>. Classic: <code>(student, subject, teacher)</code> with <code>teacher → subject</code> — 3NF paas, BCNF fail.' },
    { front: 'Denormalize karne se pehle?', back: '1. JOIN sach mein slow hai? (<b>naapo</b>) 2. Read:write ratio? 3. <b>Duplicate ko sync kaun karega?</b> — teesra sabse zyada bhoola jaata hai aur wahi asli kharch hai.' },
    { front: 'price_paid duplicate hai?', back: '<b>Nahi.</b> <code>catalog_price</code> = aaj ka daam, <code>price_paid</code> = us din ka. Do alag facts. Hataoge toh daam badalne par <b>purane invoices badal jaayenge</b>.' },
    { front: 'Sabse aam schema bug?', back: '<b>Historical value ko current se derive karna.</b> Invoice ka pata, tax rate, plan ka naam, commission % — jo bhi "us waqt kya tha" maayne rakhta ho, use <b>copy karke rakho</b>.' },
    { front: 'Column kahan jaana chahiye?', back: 'Ek hi sawaal: <b>"yeh fact KIS cheez ke baare mein hai?"</b> Customer ka? Product ka? Order ka? Ya order+product ke <b>jod</b> ka (line item)?' },
  ],
},
]);

/* =====================================================================
   Constraints deep — `relations` level ke BAAD.
   ===================================================================== */
const T_CONSTR = [
  { text: 'Parent table banao', check: s => !!s.db.tables.dept },
  { text: 'Child table banao', check: s => !!s.db.tables.emp },
  { text: 'Ek dept daalo', check: s => !!s.db.tables.dept && s.db.tables.dept.rows.length >= 1 },
  { text: 'Duplicate PRIMARY KEY try karo — 1062 milna chahiye', check: s => s.history.filter(h => /^insert\s+into\s+dept/i.test(h)).length >= 2 },
  { text: 'NOT NULL todo — 1048 dekho', check: s => s.history.some(h => /^insert\s+into\s+emp/i.test(h)) },
];

SG.registerLevelsAfter('intermediate', 'relations', [
{
  id: 'constraints',
  icon: '🔗',
  title: 'Constraints — Galat Data Ko DB Hi Rok De',
  badge: 'Constraint Kotwal',
  objectives: [
    'FK actions: CASCADE / RESTRICT / SET NULL — aur unka chhupa khatra',
    'UNIQUE vs INDEX — kya farak hai',
    'NOT NULL ka performance faayda',
    '"Constraint DB mein ya app mein?" — asli jawab',
  ],
  lesson: [
    `<h3>🛡️ Constraint = aakhri deewar</h3>
     <p>App mein validation zaroori hai — par woh <b>aakhri</b> deewar nahi hai.
     Kyunki data sirf tumhare app se nahi aata:</p>
     <pre>• ek doosri service jo usi DB par likhti hai
• ek migration script
• ek data fix jo kisi ne raat 2 baje chalaya
• ek purana app version jo abhi bhi chal raha hai
• tumhara apna bug</pre>
     <p class="tip">🎯 App validation <b>user ko achha message</b> deti hai.
     DB constraint <b>galat data ko rokti</b> hai. Ye do alag kaam hain, aur
     dono chahiye. Aur constraint ka sabse bada faayda yeh hai ki woh
     <b>hamesha</b> lagti hai — chahe data kahin se bhi aaye.</p>
     <h3>🔗 FK actions — teen raaste, teen anjaam</h3>
     <pre>ON DELETE RESTRICT   -- parent delete hi nahi hoga jab tak child hai
ON DELETE CASCADE    -- parent gaya toh saare children bhi gaye
ON DELETE SET NULL   -- children rehte hain, unka reference NULL ho jaata hai</pre>
     <table>
       <tr><th>Action</th><th>Kab sahi</th><th>Khatra</th></tr>
       <tr><td><b>RESTRICT</b></td><td>⭐ default — accidental delete rokta hai</td><td>delete "kaam nahi kar raha" lagta hai</td></tr>
       <tr><td><b>CASCADE</b></td><td>true ownership (order → order_items)</td><td>ek delete <b>lakhon</b> rows uda sakta hai</td></tr>
       <tr><td><b>SET NULL</b></td><td>optional reference (employee → manager)</td><td>column NOT NULL nahi ho sakta</td></tr>
     </table>
     <p class="tip">🎯 <b>CASCADE ka chhupa khatra:</b> ek user delete karne se
     uske orders, uske order_items, uske payments — sab chain mein ud sakte hain.
     Aur woh ek hi transaction hoti hai: lambi, bhaari, aur locks pakde hue.
     CASCADE sirf tab jab child ka parent ke bina <b>koi matlab hi na ho</b>.</p>`,
    `<h3>🔑 UNIQUE vs INDEX</h3>
     <table>
       <tr><th></th><th>INDEX</th><th>UNIQUE</th></tr>
       <tr><td>Kya karta hai</td><td>dhoondhna tez</td><td>dhoondhna tez <b>+ duplicate rokta hai</b></td></tr>
       <tr><td>Duplicate par</td><td>chalta rahega</td><td><code>ERROR 1062</code></td></tr>
       <tr><td>NULL</td><td>—</td><td>kai NULL <b>allowed</b> hain (NULL ≠ NULL)</td></tr>
     </table>
     <p>Woh aakhri line ek asli jaal hai: <code>UNIQUE(email)</code> lagane ke baad bhi
     tum <b>kitne bhi</b> rows daal sakte ho jinme <code>email IS NULL</code> ho.
     Agar email zaroori hai toh <code>NOT NULL</code> <b>bhi</b> lagao.</p>
     <h3>⚡ NOT NULL ka performance faayda</h3>
     <p>NOT NULL sirf data quality ke liye nahi hai. Woh optimizer ko ek
     <b>guarantee</b> deta hai — aur us guarantee se woh behtar plan chun sakta hai
     (NULL checks skip, kuch index optimizations, aur thodi kam storage).
     Aur asli faayda yeh hai ki tumhari queries se ek poora sawaal
     <b>gayab</b> ho jaata hai: "yahan NULL ho sakta hai kya?"</p>
     <h3>✅ CHECK constraints</h3>
     <pre>CHECK (qty > 0)
CHECK (status IN ('pending','paid','shipped','cancelled'))
CHECK (discount >= 0 AND discount <= 100)
CHECK (end_date > start_date)</pre>
     <p>Yeh woh niyam hain jo tumhare business mein <b>hamesha</b> sach hain.
     App mein bhi check karo (achhe error message ke liye), par DB mein bhi rakho —
     kyunki app ke bahar se aane wale data ko sirf DB hi rok sakta hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa FK action',
      instructions: 'Har rishte ke liye sahi ON DELETE chuno.',
      bins: [
        { id: 'restrict', label: '🛑 RESTRICT' },
        { id: 'cascade', label: '🌊 CASCADE' },
        { id: 'setnull', label: '⚪ SET NULL' },
      ],
      items: [
        { text: 'order → order_items', bin: 'cascade', explain: 'Line item ka order ke bina <b>koi matlab hi nahi</b>. Yahi CASCADE ki sahi jagah hai: sacchi ownership.' },
        { text: 'customer → orders', bin: 'restrict', explain: 'Customer delete karne se uske orders <b>nahi</b> udne chahiye — woh accounting record hain. Aur aksar asli jawab yeh hai ki customer ko delete karo hi mat, <b>soft delete</b> karo.' },
        { text: 'employee → manager (usi table mein)', bin: 'setnull', explain: 'Manager chala gaya toh employee rehta hai — bas uska manager NULL ho jaata hai (jab tak naya na mile). Isiliye woh column NOT NULL nahi ho sakta.' },
        { text: 'product → order_items', bin: 'restrict', explain: 'Product delete karne se purane orders ke line items udna <b>bhayanak</b> hoga — invoices badal jaayenge. Product ko <code>is_active = 0</code> karo.' },
        { text: 'blog post → comments', bin: 'cascade', explain: 'Post gaya toh uske comments ka koi matlab nahi. Par dhyaan: ek post par 50,000 comments hon toh woh delete <b>ek lambi transaction</b> ban jaayega.' },
        { text: 'user → audit_log entries', bin: 'restrict', explain: 'Audit log ka poora point hai ki woh <b>rahe</b>. CASCADE lagane se user delete karte hi uska poora itihaas ud jaayega — aur compliance mein yeh gambhir hai.' },
      ],
    },
    {
      type: 'terminal',
      title: '🖥️ Mission: constraints ko todke dekho',
      instructions: 'Tables banao, phir jaan-boojh ke constraint todo aur error padho.',
      goal: `<b>(1)</b> <code>CREATE TABLE dept (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);</code>
        <b>(2)</b> <code>CREATE TABLE emp (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL, dept_id INT);</code>
        <b>(3)</b> <code>INSERT INTO dept VALUES (1, 'Engineering');</code>
        <b>(4)</b> Ab <b>wahi id</b> dobara daalo — <code>INSERT INTO dept VALUES (1, 'Sales');</code>
        → <code>ERROR 1062 Duplicate entry</code> milega. <b>Yahi constraint ka kaam hai.</b>
        <b>(5)</b> Ab NOT NULL todo — <code>INSERT INTO emp VALUES (1, NULL, 1);</code>
        → <code>ERROR 1048</code>.`,
      tasks: T_CONSTR,
      db: SG.factoryDB(),
      success: allOfInt(T_CONSTR),
      hints: [
        'CREATE TABLE dept (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);',
        'CREATE TABLE emp (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL, dept_id INT);',
        "INSERT INTO dept VALUES (1, 'Engineering');",
        "INSERT INTO dept VALUES (1, 'Sales');",
        'INSERT INTO emp VALUES (1, NULL, 1);',
      ],
    },
    {
      type: 'quiz',
      title: 'Constraints ki samajh',
      questions: [
        {
          q: 'App mein validation hai. DB constraint bhi chahiye?',
          choices: [
            'Haan — data sirf tumhare app se nahi aata (doosri service, migration script, manual fix, purana app version). App validation achha MESSAGE deti hai; constraint galat data ROKTI hai',
            'Nahi, app validation kaafi hai',
            'Nahi, constraints slow karte hain',
            'Sirf production mein',
          ],
          answer: 0,
          explain: 'Do alag kaam hain aur dono chahiye. Aur constraint ka sabse bada faayda yeh hai ki woh <b>hamesha</b> lagti hai — chahe data kahin se bhi aaye. App code ka har raasta yaad rakhna namumkin hai.',
        },
        {
          q: 'UNIQUE(email) laga diya. Ab kitne rows mein email NULL ho sakta hai?',
          choices: [
            'Kitne bhi — SQL mein NULL ≠ NULL, isliye UNIQUE unhe duplicate nahi maanta. NOT NULL bhi lagana padega',
            'Sirf ek',
            'Koi nahi',
            'Database ke hisaab se',
          ],
          answer: 0,
          explain: 'Yeh ek asli jaal hai. <code>UNIQUE</code> ka matlab hai "do rows ki value <b>barabar</b> na ho" — aur SQL mein <code>NULL = NULL</code> ka jawab <code>NULL</code> hai, <code>TRUE</code> nahi. Isliye 10,000 NULL emails bilkul allowed hain. Agar email zaroori hai toh <code>NOT NULL</code> <b>bhi</b> chahiye.',
        },
        {
          q: 'ON DELETE CASCADE ka sabse bada khatra?',
          choices: [
            'Ek delete chain mein lakhon rows uda sakta hai — ek lambi transaction, bhaari locks, aur wapas laane ka koi tareeka nahi',
            'Woh slow hai',
            'Woh sirf MySQL mein hai',
            'Koi khatra nahi',
          ],
          answer: 0,
          explain: 'CASCADE chain mein chalta hai: user → orders → order_items → payments. Ek chhota sa <code>DELETE FROM users WHERE id=42</code> ek bhaari transaction ban sakta hai. Isliye CASCADE <b>sirf</b> tab jab child ka parent ke bina koi matlab hi na ho — aur user/customer par lagbhag hamesha <b>soft delete</b> behtar hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Constraints',
    instructions: 'Yeh sawaal data quality ki soch dikhata hai. 🎤',
    questions: [
      {
        q: '"Constraints DB mein rakhein ya app mein?"',
        choices: [
          '"Dono — par alag kaam ke liye. App validation user ko achha message deti hai; DB constraint galat data rokti hai chahe woh kahin se bhi aaye. Aur invariants jo hamesha sach hain (FK, UNIQUE, NOT NULL, CHECK) DB mein hone hi chahiye"',
          '"App mein — DB constraints slow karte hain"',
          '"DB mein — app par bharosa nahi"',
          '"App mein, taaki portable rahe"',
        ],
        answer: 0,
        explain: 'Doosra jawab bahut aam hai aur galat: constraint ka kharch lagbhag hamesha usse kam hai jo ek din corrupt data theek karne mein lagega. Achha jawab dono ko <b>alag kaam</b> deta hai — yahi dikhata hai ki tumne socha hai.',
      },
      {
        q: '"Ek purani table mein FK nahi hai. Ab lagayein?"',
        choices: [
          'Pehle dekhunga ki abhi kitne orphan rows hain (LEFT JOIN … WHERE parent IS NULL) — aksar hote hain. Unhe saaf karunga, phir FK lagaunga, aur bade table par lock ka dhyaan rakhunga',
          'Haan, turant laga do',
          'Nahi, purani tables ko chhedo mat',
          'Haan, par NOVALIDATE ke saath',
        ],
        answer: 0,
        explain: 'FK lagane se pehle woh <b>maujooda</b> data check karega — aur purani tables mein orphan rows lagbhag hamesha milte hain. Achha jawab do cheezein sochta hai: pehle safai, aur bade table par <b>lock</b> ka asar (isliye maintenance window ya online DDL).',
      },
    ],
  },
  success: [
    'FK actions chun sakte ho aur CASCADE ka khatra jaante ho',
    'UNIQUE ka NULL wala jaal jaante ho',
    'NOT NULL ka dohra faayda bata sakte ho',
    '"DB mein ya app mein" ka poora jawab de sakte ho',
  ],
  homework: `Apne schema ki ek table lo. Teen cheezein check karo:
    (1) kaunse columns <b>kabhi</b> NULL nahi hone chahiye — kya un par NOT NULL hai?
    (2) kaunsa column unique hona chahiye — kya UNIQUE laga hai?
    (3) FK par kaunsa ON DELETE hai — aur kya woh jaan-boojh ke chuna gaya tha
    ya default reh gaya?`,
  cards: [
    { front: 'App validation vs DB constraint?', back: 'App = achha <b>message</b>. DB = galat data <b>rokna</b>. Data doosri service, migration, manual fix, purane app version se bhi aata hai — constraint <b>hamesha</b> lagti hai.' },
    { front: 'FK actions?', back: '<b>RESTRICT</b> (⭐ default — accidental delete rokta hai) · <b>CASCADE</b> (sirf sacchi ownership: order → order_items) · <b>SET NULL</b> (optional reference: employee → manager).' },
    { front: 'CASCADE ka chhupa khatra?', back: 'Chain mein chalta hai — ek <code>DELETE FROM users</code> lakhon rows uda sakta hai, ek lambi transaction mein, bina wapas laane ke. User/customer par aksar <b>soft delete</b> sahi hai.' },
    { front: 'UNIQUE ka NULL jaal?', back: 'SQL mein <b>NULL ≠ NULL</b> — isliye <code>UNIQUE(email)</code> ke baad bhi <b>kitne bhi</b> NULL emails aa sakte hain. Zaroori ho toh <code>NOT NULL</code> <b>bhi</b> lagao.' },
    { front: 'NOT NULL ka faayda?', back: 'Data quality <b>aur</b> optimizer ko ek guarantee (behtar plan, kam storage). Aur asli faayda: tumhari queries se "yahan NULL ho sakta hai kya?" wala sawaal <b>gayab</b> ho jaata hai.' },
    { front: 'Purani table par FK lagana?', back: 'Pehle <b>orphan rows</b> dhoondo (<code>LEFT JOIN … WHERE parent IS NULL</code>) — purani tables mein lagbhag hamesha hote hain. Saaf karo, phir FK, aur bade table par <b>lock</b> ka dhyaan.' },
  ],
},
]);
