/* =====================================================================
   SQL Gurukul — Track 1: 🌱 Beginner (Query Shishya Path)
   Database kya hai se pehli factory report tak.

   Naya level add karna ho? Bas is array mein ek object push kar do —
   ya kahin bhi: SG.registerLevels('beginner', [ {...} ]);
   (VISUALS[id] entry visuals.js mein banana mat bhoolna.)
   ===================================================================== */

SG.registerLevels('beginner', [

  /* ================= LEVEL 1: Database 101 ================= */
  {
    id: 'db101',
    icon: '🗄️',
    title: 'Database 101 — Yeh cheez hai kya?',
    badge: 'Table Darshak',
    objectives: [
      '<b>Database / table / row / column</b> — chaar shabd, poora khel',
      '<b>SQL</b> kyun exist karta hai — Excel se kya alag hai',
      '<b>SHOW TABLES</b> aur <b>DESCRIBE</b> — anjaan database ko padhna',
      'Factory database (asli project se) se pehli mulaqat',
    ],
    lesson: [
      `<h3>🗄️ Database = tables ka dabba</h3>
       <p>Socho ek factory hai jo devices banati hai. Har roz: kaunsa device
       bana, kis operator ne banaya, test pass hua ya fail. Yeh sab kahin
       likhna padega.</p>
       <p>Excel sheet se shuru karte ho. Phir 50,000 rows ho jaate hain, 5 log
       ek saath edit karte hain, aur ek din koi galti se poora column delete
       kar deta hai. <b>Database</b> yahin se aata hai.</p>
       <table>
         <tr><th>Shabd</th><th>Matlab</th><th>Factory mein</th></tr>
         <tr><td><b>Database</b></td><td>tables ka collection</td><td><code>factory</code></td></tr>
         <tr><td><b>Table</b></td><td>ek cheez ki list</td><td><code>bx50Builds</code>, <code>operators</code></td></tr>
         <tr><td><b>Row</b> (record)</td><td>ek entry</td><td>build #1041</td></tr>
         <tr><td><b>Column</b> (field)</td><td>us entry ka ek data point</td><td><code>buildNum</code>, <code>type</code></td></tr>
       </table>
       <p>💡 Excel ki sheet ≈ table. Farak yeh hai ki database <b>rules</b>
       lagata hai (yeh column sirf number lega, yeh khaali nahi reh sakta),
       ek saath 100 log safely likh sakte hain, aur 10 lakh rows mein se
       milliseconds mein jawab nikaal deta hai.</p>`,
      `<h3>💬 SQL = database se baat karne ki bhasha</h3>
       <p>SQL (Structured Query Language) English jaisi dikhti hai — aur yahi
       iska design tha:</p>
       <pre>SELECT bx50Name FROM bx50Data WHERE status = 'Error';
-- "bx50Data table se un devices ka naam do jinka status Error hai"</pre>
       <p>MySQL, PostgreSQL, SQLite, SQL Server — yeh sab <b>databases</b> hain
       jo SQL bolte hain. Bhasha 90% same hai; thoda-bahut farak har ek mein.
       Hum <b>MySQL</b> use kar rahe hain (jo asli factory project bhi use
       karta hai).</p>
       <p>SQL ke chaar mukhya kaam — inhe <b>CRUD</b> kehte hain:</p>
       <ul>
         <li>➕ <b>C</b>reate → <code>INSERT</code></li>
         <li>🔍 <b>R</b>ead → <code>SELECT</code> ← 90% waqt yahi likhoge</li>
         <li>✏️ <b>U</b>pdate → <code>UPDATE</code></li>
         <li>🗑️ <b>D</b>elete → <code>DELETE</code></li>
       </ul>`,
      `<h3>🔦 Anjaan database mein ghusna — do commands</h3>
       <p>Naye project mein pehla din. Koi documentation nahi. Database mein
       kya hai, kaise pata karoge? Do commands kaafi hain:</p>
       <pre>SHOW TABLES;              -- kaunsi tables hain?
DESCRIBE bx50Builds;      -- is table mein kaunse columns, kis type ke?</pre>
       <p><code>DESCRIBE</code> (short: <code>DESC</code>) yeh batata hai:</p>
       <ul>
         <li><b>Field</b> — column ka naam</li>
         <li><b>Type</b> — <code>int</code>, <code>varchar(50)</code>, <code>datetime</code>...</li>
         <li><b>Null</b> — khaali chhod sakte ho? (<code>NO</code> = zaroori hai)</li>
         <li><b>Key</b> — <code>PRI</code> = primary key, <code>UNI</code> = unique, <code>MUL</code> = index</li>
         <li><b>Default</b> — na do toh kya value jayegi</li>
       </ul>
       <div class="war-story"><b>⚡ Real incident:</b> Ek naye developer ko
       "device list nikalo" task mila. Usne <code>SELECT * FROM bx50Data</code>
       chala ke poora output ek log file mein daal diya — aur woh log file
       team ke shared drive par chali gayi. Us table mein
       <code>mysql_root_password</code>, <code>api_jwt_key</code>,
       <code>bios_password</code> jaise columns the. Saare secrets rotate karne
       pade. Sabak: <b>naye table par pehle <code>DESCRIBE</code> chalao,
       phir <code>SELECT *</code> ke bajaye naam le kar columns maango.</b></div>`,
    ],
    stages: [
      {
        type: 'match',
        title: 'Shabd milao',
        instructions: 'Database ke shabd ko uske matlab se jodo.',
        pairs: [
          { left: '🗄️ Database', right: 'Tables ka collection — yahan naam hai "factory"', explain: 'Ek server par kai databases ho sakte hain. Har database apni tables rakhta hai.' },
          { left: '📋 Table', right: 'Ek hi kism ki cheezon ki list — jaise saare builds', explain: 'bx50Builds = builds ki list, operators = logon ki list. Ek table = ek concept.' },
          { left: '➡️ Row', right: 'Us list ki ek entry — build #1041', explain: 'Record bhi kehte hain. Ek row = ek asli cheez (ek build, ek operator).' },
          { left: '🏷️ Column', right: 'Har entry ka ek field — buildNum, type, duration', explain: 'Field bhi kehte hain. Column ka ek fixed data type hota hai.' },
          { left: '💬 SQL', right: 'Database se sawal poochne ki bhasha', explain: 'Structured Query Language. English jaisi — SELECT ... FROM ... WHERE ...' },
          { left: '🔦 DESCRIBE t', right: 'Table ke columns, types aur keys dikhata hai', explain: 'Anjaan table samajhne ka pehla kadam. SHOW TABLES ke saath jodi banata hai.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Diagram par ungli rakho',
        instructions: 'Sahi hisse par click karo.',
        visual: 'db101',
        questions: [
          { q: 'Ek hi kism ki cheezon ki poori list kahan hai?', target: 'table', explain: 'Table — bx50Builds mein saare builds. Ek table = ek concept.' },
          { q: 'Ek build ki poori entry — yeh kya kehlata hai?', target: 'row', explain: 'Row (record). Ek row = ek asli cheez, saare columns ke saath.' },
          { q: 'Har entry ke fields ke naam kahan define hote hain?', target: 'colrow', explain: 'Columns. Har column ka ek naam aur ek data type hota hai.' },
          { q: 'Table se baat karne ke liye kya use karte ho?', target: 'sql', explain: 'SQL — SELECT/INSERT/UPDATE/DELETE. Database ki bhasha.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Factory database se pehli mulaqat',
        instructions: 'Asli factory database khula hai. Ghoom ke dekho ki andar kya hai.',
        goal: 'Tumhe naye project ka database mila hai, bina documentation ke. <b>(1)</b> <code>SHOW TABLES;</code> — kaunsi tables hain? <b>(2)</b> <code>DESCRIBE bx50Builds;</code> — is table mein kaunse columns hain, kaunsa PRIMARY KEY hai? <b>(3)</b> <code>SELECT * FROM operators;</code> — operators table ka data dekho.',
        tasks: [
          { text: 'SHOW TABLES; — kaunsi tables hain', check: s => s.history.some(h => /^show\s+tables$/i.test(h)) },
          { text: 'DESCRIBE bx50Builds; — columns aur types', check: s => s.history.some(h => /^(describe|desc)\s+bx50builds$/i.test(h)) },
          { text: 'SELECT * FROM operators; — data dekho', check: s => s.history.some(h => /select\s+\*\s+from\s+operators/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /^show\s+tables$/i.test(h))
          && s.history.some(h => /^(describe|desc)\s+bx50builds$/i.test(h))
          && s.history.some(h => /select\s+.*from\s+operators/i.test(h)),
        successText: '🎉 <b>Pehli mulaqat ho gayi!</b> Yeh do commands (<code>SHOW TABLES</code> + <code>DESCRIBE</code>) har naye database par tumhara pehla kadam honge. Dhyaan diya — <code>bx50Builds.buildNum</code> ke Key column mein <code>UNI</code> likha hai? Matlab woh number do baar nahi aa sakta. Aur <code>id</code> par <code>PRI</code> + <code>auto_increment</code> — DB khud number deta jaata hai.',
        hints: [
          'SHOW TABLES; — semicolon lagana mat bhoolna (waise yahan bina bhi chal jayega)',
          'DESCRIBE bx50Builds; — chhota roop DESC bx50Builds; bhi chalta hai',
          'SELECT * FROM operators; — * ka matlab "saare columns"',
        ],
      },
      {
        type: 'quiz',
        title: 'Database Basics Quick-fire',
        questions: [
          {
            q: 'Table aur row mein kya farak hai?',
            choices: [
              'Table = poori list (saare builds), Row = us list ki ek entry (ek build)',
              'Table = ek entry, Row = poori list',
              'Dono same hain',
              'Table sirf numbers rakhta hai, Row sirf text',
            ],
            answer: 0,
            explain: 'Table = concept ki list. Row = us concept ka ek instance. bx50Builds table mein 7 rows = 7 builds.',
          },
          {
            q: 'Naye database par sabse pehla command kya chalaoge?',
            choices: [
              'SHOW TABLES; — pata toh chale andar hai kya',
              'DELETE FROM users; — safai se shuruaat',
              'SELECT * FROM everything;',
              'DROP DATABASE; — fresh start',
            ],
            answer: 0,
            explain: 'SHOW TABLES → phir DESCRIBE <table> → phir chhote SELECT. Anjaan database par kabhi destructive command nahi.',
          },
          {
            q: 'DESCRIBE ke output mein Key column par "PRI" likha hai. Matlab?',
            choices: [
              'Woh PRIMARY KEY hai — har row ki unique pehchaan, khaali nahi ho sakti',
              'Woh column private hai',
              'Woh column priority mein sort hota hai',
              'Woh column print nahi hota',
            ],
            answer: 0,
            explain: 'PRI = PRIMARY KEY. UNI = UNIQUE constraint. MUL = us par index hai (duplicate allowed).',
          },
          {
            q: 'Production table par <code>SELECT *</code> chalane mein kya risk hai?',
            choices: [
              'Sensitive columns (passwords, keys) bhi output mein aa jaate hain — aur zaroorat se zyada data network par',
              'Koi risk nahi, yeh best practice hai',
              'Database crash ho jaata hai',
              'Table read-only ho jaati hai',
            ],
            answer: 0,
            explain: 'Asli bx50Data table mein 8+ password/secret columns the. Naam le kar columns maango — secure bhi, tez bhi.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Database Basics',
      instructions: 'Pehla round — foundation clear hai kya? 🎤',
      questions: [
        {
          q: '"Ek line mein bolo — relational database kya hota hai?"',
          choices: [
            'Data ko tables (rows + typed columns) mein rakhta hai, aur tables ko keys se ek doosre se jodta hai',
            'Ek badi Excel file jo server par rehti hai',
            'Ek programming language',
            'Ek folder jisme JSON files hoti hain',
          ],
          answer: 0,
          explain: 'Do cheezein must hain: <b>typed tables</b> aur <b>relationships via keys</b>. "Relational" ka matlab hi yehi hai — Track 2 mein JOIN se yeh zinda ho jayega.',
        },
        {
          q: 'Interviewer: "Excel chhod ke database kyun?"',
          choices: [
            'Rules (types, constraints) DB-level par, ek saath kai log safely likh sakte hain, aur laakhon rows par bhi query milliseconds mein',
            'Database dikhne mein sundar hai',
            'Excel free nahi hai',
            'Database mein colours laga sakte ho',
          ],
          answer: 0,
          explain: 'Teen asli wajah: <b>integrity</b> (galat data ghusega hi nahi), <b>concurrency</b> (100 writers), <b>scale + speed</b> (index). Excel teeno par fail hota hai.',
        },
        {
          q: '🎛️ Hands-on ke liye tayyar? Interviewer bolta hai: "screen share karo, database dikhao."',
          terminal: {
            title: 'Interview hands-on',
            goal: '🎛️ <b>Hands-on:</b> Interviewer ne bola "yeh factory DB hai, mujhe dikhao ki tum ise samajhte ho." <b>(1)</b> Saari tables list karo. <b>(2)</b> <code>bx50Data</code> ka structure dikhao. <b>(3)</b> <code>firmwareFiles</code> table ka poora data dikha do.',
            tasks: [
              { text: 'Tables list karo', check: s => s.history.some(h => /^show\s+tables$/i.test(h)) },
              { text: 'DESCRIBE bx50Data — structure', check: s => s.history.some(h => /^(describe|desc)\s+bx50data$/i.test(h)) },
              { text: 'firmwareFiles ka data dekho', check: s => s.history.some(h => /select\s+.*from\s+firmwarefiles/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /^show\s+tables$/i.test(h))
              && s.history.some(h => /^(describe|desc)\s+bx50data$/i.test(h))
              && s.history.some(h => /select\s+.*from\s+firmwarefiles/i.test(h)),
            successText: '✅ Interviewer khush — tumne <b>explore</b> kiya, andaza nahi lagaya. Yehi aadat asli kaam mein bhi bachati hai.',
            hints: [
              'SHOW TABLES;',
              'DESCRIBE bx50Data;',
              'SELECT * FROM firmwareFiles;',
            ],
          },
        },
      ],
    },
    success: [
      'Main database, table, row aur column ka farak bata sakta hoon',
      'Main SQL kya hai aur CRUD ke chaar operations jaanta hoon',
      'Main anjaan database ko SHOW TABLES + DESCRIBE se explore kar sakta hoon',
      'Main samajhta hoon ki production par SELECT * kyun risky hai',
    ],
    homework: `<p>Apne laptop par asli MySQL chalao (Docker sabse aasan):</p>
      <pre># Docker se MySQL uthao
docker run --name sqlgurukul -e MYSQL_ROOT_PASSWORD=secret -p 3306:3306 -d mysql:8

# Client se ghuso
docker exec -it sqlgurukul mysql -uroot -psecret

# Andar:
SHOW DATABASES;
CREATE DATABASE factory;
USE factory;
SHOW TABLES;          -- abhi khaali hai

CREATE TABLE operators (
  opId    VARCHAR(20) PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  shift   VARCHAR(10)
);
DESCRIBE operators;   -- ab dekho kya bana</pre>
      <p>✅ Self-check: <code>DESCRIBE operators;</code> ke output mein <code>opId</code> ke Key column mein <code>PRI</code> dikha? <code>name</code> ka Null column <code>NO</code> hai?</p>`,
    cards: [
      { front: 'Database / table / row / column?', back: '<b>Database</b> = tables ka dabba. <b>Table</b> = ek concept ki list. <b>Row</b> = ek entry (record). <b>Column</b> = us entry ka ek typed field.' },
      { front: 'SQL kya hai?', back: 'Structured Query Language — database se baat karne ki bhasha. MySQL/Postgres/SQLite sab isse bolte hain (90% same syntax).' },
      { front: 'CRUD ke 4 SQL commands?', back: '<b>C</b>reate → <code>INSERT</code>, <b>R</b>ead → <code>SELECT</code>, <b>U</b>pdate → <code>UPDATE</code>, <b>D</b>elete → <code>DELETE</code>.' },
      { front: 'Anjaan database explore kaise?', back: '<code>SHOW TABLES;</code> → <code>DESCRIBE &lt;table&gt;;</code> → chhota <code>SELECT ... LIMIT 5</code>. Kabhi destructive command se shuru mat karo.' },
      { front: 'DESCRIBE mein PRI / UNI / MUL?', back: '<b>PRI</b> = primary key (unique + not null). <b>UNI</b> = unique constraint. <b>MUL</b> = index hai par duplicates allowed.' },
    ],
  },

  /* ================= LEVEL 2: SELECT ================= */
  {
    id: 'select',
    icon: '🔍',
    title: 'SELECT — Database se sawal poochna',
    badge: 'Query Likhne Wala',
    objectives: [
      '<b>SELECT ... FROM</b> — columns chunna',
      '<b>WHERE</b> se rows chhaan-na, <b>ORDER BY</b> se sort',
      '<b>LIMIT</b> — bade table par safety belt',
      'Likhne ka order vs <b>chalne ka order</b> (interview favourite)',
    ],
    lesson: [
      `<h3>🔍 SELECT ka dhaancha</h3>
       <pre>SELECT  buildNum, type          -- 2. kaunse COLUMNS chahiye
FROM    bx50Builds             -- 1. kis TABLE se
WHERE   active = 1             -- 3. kaunse ROWS chahiye
ORDER BY duration DESC         -- 4. kis tarah sort
LIMIT   3;                     -- 5. kitne</pre>
       <p>Do cheezein alag-alag samjho:</p>
       <ul>
         <li><b>SELECT</b> <i>columns</i> kaat-ta hai (kitni chaudai)</li>
         <li><b>WHERE</b> <i>rows</i> kaat-ta hai (kitni lambai)</li>
       </ul>
       <p><code>SELECT *</code> = "saare columns". Seekhne mein theek, production
       code mein aadat kharab — naam le kar maango.</p>`,
      `<h3>🔢 ORDER BY aur LIMIT</h3>
       <pre>ORDER BY duration DESC    -- bada se chhota (DESC = descending)
ORDER BY duration         -- chhota se bada (ASC default hai)
ORDER BY type, duration DESC   -- pehle type, phir uske andar duration</pre>
       <p><b>LIMIT</b> sirf "kam data" nahi hai — yeh <b>safety belt</b> hai. 10
       lakh rows wali table par bina LIMIT ke <code>SELECT *</code> chala doge
       toh client hang, network jam, aur DBA gussa.</p>
       <pre>SELECT * FROM bmsTester LIMIT 5;        -- pehli 5
SELECT * FROM bmsTester LIMIT 5 OFFSET 10;  -- 11se 15 tak (pagination)</pre>
       <p>💡 <b>Naye table par hamesha <code>LIMIT 5</code> se shuru karo</b> —
       shape dekho, phir poori query likho.</p>`,
      `<h3>🧠 Likhne ka order ≠ chalne ka order</h3>
       <p>Yeh interview mein bahut poocha jaata hai, aur ismein bahut confusion
       hoti hai.</p>
       <table>
         <tr><th>Tum likhte ho</th><th>Database chalata hai</th></tr>
         <tr><td>SELECT</td><td>1. <b>FROM</b> — table utha</td></tr>
         <tr><td>FROM</td><td>2. <b>WHERE</b> — rows chhaan</td></tr>
         <tr><td>WHERE</td><td>3. <b>GROUP BY / HAVING</b> (Level 6)</td></tr>
         <tr><td>ORDER BY</td><td>4. <b>SELECT</b> — columns nikaal</td></tr>
         <tr><td>LIMIT</td><td>5. <b>ORDER BY</b> → 6. <b>LIMIT</b></td></tr>
       </table>
       <p>Isliye <code>SELECT duration/1000 AS secs ... WHERE secs > 5</code>
       <b>error</b> deta hai — WHERE ke waqt tak <code>secs</code> alias bana hi
       nahi hota. Par <code>ORDER BY secs</code> chal jaata hai (woh SELECT ke
       baad hota hai)!</p>
       <div class="war-story"><b>⚡ Real incident:</b> Ek dashboard query prod par
       chali: <code>SELECT * FROM bmsTester ORDER BY updatedAt DESC</code> —
       bina LIMIT. Table mein 4 lakh test results the. Query ne 800 MB result
       banaya, Node API ka memory bhar gaya, container OOM-kill hua, aur factory
       ka live dashboard 6 minute down raha. Fix ek shabd tha:
       <code>LIMIT 100</code>. Sabak: <b>ORDER BY ke saath LIMIT ka jodi banao —
       hamesha.</b></div>`,
    ],
    stages: [
      {
        type: 'order',
        title: 'Query kis order mein chalti hai?',
        instructions: 'Database ke andar execution ka sahi order banao.',
        steps: [
          { text: 'FROM bx50Builds — table utha', explain: 'Sabse pehle source. Bina table ke kuch nahi.' },
          { text: 'WHERE active = 1 — rows chhaan', explain: 'Yahan aliases available nahi hote — SELECT abhi chala hi nahi.' },
          { text: 'SELECT buildNum, type — columns nikaal', explain: 'Ab columns chune jaate hain, aliases yahin bante hain.' },
          { text: 'ORDER BY duration DESC — sort', explain: 'SELECT ke baad — isliye ORDER BY mein alias chal jaata hai.' },
          { text: 'LIMIT 3 — top 3 kaat', explain: 'Sabse aakhir mein. Isliye LIMIT sort ke baad ke top rows deta hai.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Query pipeline par ungli rakho',
        instructions: 'Diagram mein sahi step par click karo.',
        visual: 'select',
        questions: [
          { q: 'Rows ko chhaan-ne wala clause kaunsa hai?', target: 'where', explain: 'WHERE rows filter karta hai. Columns SELECT chunta hai — dono alag kaam.' },
          { q: 'Kaunsa clause batata hai ki data kis table se aayega?', target: 'from', explain: 'FROM — aur yehi sabse pehle chalta hai.' },
          { q: 'Bade table par "safety belt" kaunsa clause hai?', target: 'limit', explain: 'LIMIT — result ka size kaat deta hai. ORDER BY ke saath hamesha lagao.' },
          { q: 'Result ko sort kaun karta hai?', target: 'orderby', explain: 'ORDER BY — DESC = bada se chhota, ASC (default) = chhota se bada.' },
        ],
      },
      {
        type: 'fill',
        title: 'Query likho: sabse lambi active builds',
        instructions: 'Top 3 sabse lambi chalne wali <b>active</b> builds chahiye. Tokens ko blank mein drag karo.',
        template: `SELECT buildNum, type, duration
FROM bx50Builds
{0} active = 1
{1} duration {2}
{3} 3;`,
        tokens: ['WHERE', 'ORDER BY', 'DESC', 'LIMIT', 'HAVING', 'GROUP BY', 'ASC', 'TOP'],
        blanks: [
          { answer: 'WHERE', explain: '<code>WHERE</code> rows chhaan-ta hai. (HAVING groups ke liye hota hai — woh Level 6 mein.)' },
          { answer: 'ORDER BY', explain: '<code>ORDER BY</code> se sort. Bina iske "top 3" ka koi matlab hi nahi — DB rows ka order guarantee nahi karta.' },
          { answer: 'DESC', explain: '<code>DESC</code> = descending (bada pehle). Sabse lambi build chahiye, isliye DESC. Default <code>ASC</code> hota hai.' },
          { answer: 'LIMIT', explain: 'MySQL/Postgres mein <code>LIMIT n</code>. (SQL Server <code>TOP</code> use karta hai — dialect ka farak.)' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Pehli asli query',
        instructions: 'Factory database khula hai. Manager ke teen sawaal hain.',
        goal: 'Manager ne teen cheezein poochi hain. <b>(1)</b> Saare <b>active</b> builds ke <code>buildNum</code> aur <code>type</code> dikhao (<code>active = 1</code>). <b>(2)</b> Sabse lambi <b>3</b> builds — <code>duration</code> ke hisaab se sort karke top 3 (LIMIT lagana!). <b>(3)</b> <code>bmsTester</code> table ki pehli 5 rows dekh lo — shape samajhne ke liye.',
        tasks: [
          { text: 'Active builds ka buildNum + type', check: s => s.history.some(h => /select.*from\s+bx50builds.*where.*active/i.test(h)) },
          { text: 'Top 3 lambi builds (ORDER BY + LIMIT)', check: s => s.history.some(h => /order\s+by\s+duration\s+desc/i.test(h) && /limit\s+3/i.test(h)) },
          { text: 'bmsTester ki pehli 5 rows (LIMIT 5)', check: s => s.history.some(h => /from\s+bmstester/i.test(h) && /limit\s+5/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /select.*from\s+bx50builds.*where.*active/i.test(h))
          && s.history.some(h => /order\s+by\s+duration\s+desc/i.test(h) && /limit\s+3/i.test(h))
          && s.history.some(h => /from\s+bmstester/i.test(h) && /limit\s+5/i.test(h)),
        successText: '🎉 <b>Teen query, teen jawab.</b> Dhyaan do ki tumne <code>LIMIT 5</code> se anjaan table ko chhua — yeh aadat rakhna. Aur <b>ORDER BY ke bina "top 3" ka koi matlab nahi hota</b>: database rows ka order guarantee nahi karta, isliye LIMIT akela random 3 de dega.',
        hints: [
          'SELECT buildNum, type FROM bx50Builds WHERE active = 1;',
          'SELECT buildNum, duration FROM bx50Builds ORDER BY duration DESC LIMIT 3;',
          'SELECT * FROM bmsTester LIMIT 5;',
        ],
      },
      {
        type: 'quiz',
        title: 'SELECT Quick-fire',
        questions: [
          {
            q: '<code>SELECT * FROM t LIMIT 3;</code> — bina ORDER BY. Kaunsi 3 rows milengi?',
            choices: [
              'Koi bhi 3 — database ka koi order guarantee nahi hota bina ORDER BY ke',
              'Hamesha sabse purani 3',
              'Hamesha sabse nayi 3',
              'Sabse choti id wali 3, hamesha',
            ],
            answer: 0,
            explain: 'Bina ORDER BY, order undefined hai (aaj id-order lag sakta hai, kal index badalne par kuch aur). "Top N" chahiye toh ORDER BY zaroori.',
          },
          {
            q: 'WHERE aur SELECT — kaun kya kaat-ta hai?',
            choices: [
              'WHERE rows kaat-ta hai (lambai), SELECT columns kaat-ta hai (chaudai)',
              'Dono rows kaat-te hain',
              'WHERE columns, SELECT rows',
              'Dono columns kaat-te hain',
            ],
            answer: 0,
            explain: 'Result ek rectangle hai: WHERE uski height decide karta hai, SELECT uski width.',
          },
          {
            q: 'Yeh query error kyun degi? <code>SELECT duration/1000 AS secs FROM t WHERE secs > 5;</code>',
            choices: [
              'WHERE, SELECT se pehle chalta hai — us waqt tak alias "secs" bana hi nahi hota',
              'Division SQL mein allowed nahi',
              'AS keyword galat hai',
              'secs reserved word hai',
            ],
            answer: 0,
            explain: 'Execution order: FROM → WHERE → SELECT → ORDER BY. Isiliye <code>ORDER BY secs</code> chal jaata hai par <code>WHERE secs</code> nahi. Fix: WHERE mein poora expression likho.',
          },
          {
            q: 'Prod dashboard ke liye kaunsi query surakshit hai?',
            choices: [
              'SELECT id, name FROM bmsTester ORDER BY updatedAt DESC LIMIT 100;',
              'SELECT * FROM bmsTester ORDER BY updatedAt DESC;',
              'SELECT * FROM bmsTester;',
              'SELECT * FROM bmsTester ORDER BY RAND();',
            ],
            answer: 0,
            explain: 'Naam le kar columns + LIMIT. Bina LIMIT ke ORDER BY ne asli project mein API container OOM-kill kar diya tha.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — SELECT',
      instructions: 'Query likhne wala round. 🎤',
      questions: [
        {
          q: '"SQL query ka logical execution order bolo."',
          choices: [
            'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT',
            'SELECT → FROM → WHERE → ORDER BY → LIMIT (jaise likhte hain)',
            'WHERE → FROM → SELECT → LIMIT → ORDER BY',
            'Order matter nahi karta, DB khud decide karta hai',
          ],
          answer: 0,
          explain: 'Yeh yaad rakhna zaroori hai kyunki isse pata chalta hai ki alias kahan use ho sakta hai (ORDER BY mein haan, WHERE mein nahi) aur WHERE vs HAVING ka farak kyun hai.',
        },
        {
          q: 'Interviewer: "10 lakh rows wali table hai. Tum pehli query kya chalaoge?"',
          choices: [
            'DESCRIBE se structure, phir SELECT ... LIMIT 5 — shape dekh ke aage badhunga',
            'SELECT * FROM table; — poora data dekh loonga',
            'DELETE se purana data hata ke chhota kar loonga',
            'COUNT(*) chala ke wait karunga',
          ],
          answer: 0,
          explain: 'Bade table par pehla contact hamesha <b>chhota aur read-only</b>. LIMIT ke bina SELECT * ne asli prod dashboard 6 minute gira diya tha.',
        },
        {
          q: '🎛️ Interviewer: "Screen share karo — mujhe teen queries likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — SELECT',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>bx50Data</code> se un devices ke <code>bx50Name</code> aur <code>status</code> dikhao jinka <code>status</code> <code>\'Provisioned\'</code> hai. <b>(2)</b> <code>operators</code> ko <code>name</code> ke alphabetical order mein dikhao. <b>(3)</b> <code>firmwareFiles</code> se sabse naya upload — <code>uploadedAt</code> DESC, LIMIT 1.',
            tasks: [
              { text: 'Provisioned devices', check: s => s.history.some(h => /from\s+bx50data/i.test(h) && /provisioned/i.test(h)) },
              { text: 'Operators name ke order mein', check: s => s.history.some(h => /from\s+operators/i.test(h) && /order\s+by\s+name/i.test(h)) },
              { text: 'Sabse naya firmware (ORDER BY + LIMIT 1)', check: s => s.history.some(h => /from\s+firmwarefiles/i.test(h) && /order\s+by\s+uploadedat\s+desc/i.test(h) && /limit\s+1/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /from\s+bx50data/i.test(h) && /provisioned/i.test(h))
              && s.history.some(h => /from\s+operators/i.test(h) && /order\s+by\s+name/i.test(h))
              && s.history.some(h => /from\s+firmwarefiles/i.test(h) && /order\s+by\s+uploadedat\s+desc/i.test(h) && /limit\s+1/i.test(h)),
            successText: '✅ Teeno saaf. "Sabse naya/purana ek row" = <code>ORDER BY &lt;time&gt; DESC LIMIT 1</code> — yeh pattern roz kaam aayega.',
            hints: [
              "SELECT bx50Name, status FROM bx50Data WHERE status = 'Provisioned';",
              'SELECT * FROM operators ORDER BY name;',
              'SELECT * FROM firmwareFiles ORDER BY uploadedAt DESC LIMIT 1;',
            ],
          },
        },
      ],
    },
    success: [
      'Main SELECT / FROM / WHERE / ORDER BY / LIMIT ka dhaancha likh sakta hoon',
      'Main jaanta hoon ki WHERE rows kaat-ta hai aur SELECT columns',
      'Main query ka logical execution order bata sakta hoon',
      'Main "top N" ke liye ORDER BY + LIMIT ka jodi lagata hoon',
    ],
    homework: `<p>Apne MySQL mein practice karo:</p>
      <pre>USE factory;
INSERT INTO operators VALUES
  ('OP-101','Ravi Kumar','day'),
  ('OP-102','Priya Sharma','night'),
  ('OP-103','Amit Patel','day');

SELECT * FROM operators;
SELECT name FROM operators WHERE shift = 'day';
SELECT * FROM operators ORDER BY name DESC;
SELECT * FROM operators LIMIT 2;
SELECT * FROM operators LIMIT 2 OFFSET 1;   -- pagination

-- Ab jaan-boojh ke galti karo aur error padho:
SELECT nam FROM operators;     -- Unknown column 'nam'</pre>
      <p>✅ Self-check: <code>LIMIT 2 OFFSET 1</code> ne beech wali rows di? Error message ne column ka naam bataya?</p>`,
    cards: [
      { front: 'SELECT ka basic dhaancha?', back: '<code>SELECT cols FROM table WHERE cond ORDER BY col [DESC] LIMIT n;</code> — WHERE rows kaat-ta hai, SELECT columns.' },
      { front: 'Query ka execution order?', back: '<b>FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.</b> Isliye alias ORDER BY mein chalta hai, WHERE mein nahi.' },
      { front: 'ORDER BY ke bina LIMIT 3?', back: 'Koi bhi 3 rows — <b>order guarantee nahi hota</b>. "Top N" ke liye <code>ORDER BY col DESC LIMIT n</code> zaroori hai.' },
      { front: 'ASC vs DESC?', back: '<code>ASC</code> = chhota se bada (<b>default</b>). <code>DESC</code> = bada se chhota. <code>ORDER BY a, b DESC</code> = pehle a (asc), phir b (desc).' },
      { front: 'Prod par LIMIT kyun zaroori?', back: 'Bina LIMIT ke bada result client/API ka memory kha jaata hai. Asli case: <code>ORDER BY updatedAt DESC</code> bina LIMIT → 800MB result → container OOM → dashboard 6 min down.' },
    ],
  },

  /* ================= LEVEL 3: WHERE deep — filters ================= */
  {
    id: 'filters',
    icon: '🎯',
    title: 'WHERE ke Hathiyar — LIKE, IN, BETWEEN, NULL',
    badge: 'Filter Fakir',
    objectives: [
      '<b>AND / OR / NOT</b> aur brackets ka khel',
      '<b>LIKE</b> pattern, <b>IN</b> list, <b>BETWEEN</b> range',
      '<b>NULL</b> ka jaal — <code>= NULL</code> kabhi kaam nahi karta',
      'Comparison operators aur unke traps',
    ],
    lesson: [
      `<h3>🔗 AND / OR / NOT — aur bracket ka jhagda</h3>
       <pre>WHERE type = 'Gen4' AND active = 1        -- dono sach
WHERE status = 'Error' OR status = 'Building'  -- koi ek sach
WHERE NOT active = 1                     -- ulta</pre>
       <p>⚠️ <b>AND, OR se pehle chalta hai.</b> Yeh chup-chaap galat jawab deta hai:</p>
       <pre>-- Galat: Gen4 wale active, YA koi bhi Gen3 (chahe inactive)
WHERE type = 'Gen4' AND active = 1 OR type = 'Gen3'

-- Sahi: (Gen4 ya Gen3) AND active
WHERE (type = 'Gen4' OR type = 'Gen3') AND active = 1</pre>
       <p>💡 <b>AND/OR mix karo toh bracket lagao</b> — chahe zaroorat na lage.
       Yeh comment se bhi behtar documentation hai.</p>`,
      `<h3>🔤 LIKE, 📦 IN, ↔️ BETWEEN</h3>
       <pre>-- LIKE: pattern match
WHERE bx50Name LIKE 'bx50-pune%'   -- 'bx50-pune' se shuru
WHERE bx50Name LIKE '%tokyo%'      -- kahin bhi tokyo
WHERE bx50Name LIKE 'bx50-____-01' -- _ = exactly 1 char

-- IN: chhoti list (bahut saare OR ka short form)
WHERE status IN ('Error', 'Building', 'Not Built')
-- ...same as: status='Error' OR status='Building' OR status='Not Built'

-- BETWEEN: range, DONO ends included
WHERE duration BETWEEN 3600000 AND 7200000
-- ...same as: duration >= 3600000 AND duration <= 7200000</pre>
       <p>⚠️ <b>LIKE '%text%'</b> (aage <code>%</code>) index use nahi kar sakta —
       full scan hota hai. Chhoti table par theek, badi par dard. (Level 14 mein
       dekhenge kyun.)</p>`,
      `<h3>🕳️ NULL — SQL ka sabse bada jaal</h3>
       <p><b>NULL ka matlab "value pata nahi / hai hi nahi" hota hai — khaali
       string ya 0 nahi.</b> Aur "pata nahi" kisi ke barabar nahi ho sakta,
       apne aap ke bhi nahi:</p>
       <pre>SELECT * FROM bx50Data WHERE ip = NULL;      -- ❌ HAMESHA khaali!
SELECT * FROM bx50Data WHERE ip IS NULL;     -- ✅ yehi sahi hai
SELECT * FROM bx50Data WHERE ip IS NOT NULL; -- ✅ ulta</pre>
       <p>Kyun? Kyunki <code>NULL = NULL</code> ka jawab <b>true nahi, NULL</b>
       hai — aur WHERE sirf <code>true</code> wali rows leta hai. Isiliye ek
       alag operator banaya gaya: <code>IS NULL</code>.</p>
       <p>Yeh bhi yaad rakho: <code>WHERE status != 'Error'</code> un rows ko
       <b>chhod deta hai</b> jinka status NULL hai! "Error ke alawa sab" chahiye
       toh likhna padega:</p>
       <pre>WHERE status != 'Error' OR status IS NULL</pre>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka "unassigned
       devices" page banana tha — woh devices jinka IP abhi allot nahi hua.
       Developer ne likha <code>WHERE ip = NULL</code>. Page hamesha khaali
       aata tha, toh team ne maan liya "sab devices assigned hain". Do hafte
       baad audit mein 43 devices bina IP ke mile — jinme se 12 kabhi deploy
       hi nahi hue. Ek shabd ka farak: <code>= NULL</code> → <code>IS NULL</code>.
       Sabak: <b>khaali result hamesha "kuch nahi hai" ka matlab nahi hota —
       kabhi-kabhi query hi galat hoti hai.</b></div>`,
    ],
    stages: [
      {
        type: 'bins',
        title: 'Kaunsa operator use karoge?',
        instructions: 'Har requirement ko sahi WHERE operator mein daalo.',
        bins: [
          { id: 'like', label: '🔤 LIKE' },
          { id: 'in', label: '📦 IN' },
          { id: 'between', label: '↔️ BETWEEN' },
          { id: 'isnull', label: '🕳️ IS NULL' },
        ],
        items: [
          { text: 'Naam mein kahin "pune" aata ho', bin: 'like', explain: "LIKE '%pune%' — pattern matching. % = kuch bhi." },
          { text: 'Status Error, Building ya Not Built mein se koi ek', bin: 'in', explain: "IN ('Error','Building','Not Built') — chhoti list ke liye. Bahut saare OR ka saaf roop." },
          { text: 'Duration 1 ghante se 2 ghante ke beech', bin: 'between', explain: 'BETWEEN 3600000 AND 7200000 — dono ends inclusive.' },
          { text: 'Jinka IP abhi allot nahi hua', bin: 'isnull', explain: 'ip IS NULL. ip = NULL likhoge toh hamesha khaali result milega!' },
          { text: 'Device naam "bx50-tokyo" se shuru hota ho', bin: 'like', explain: "LIKE 'bx50-tokyo%' — aage % nahi hai, isliye index bhi lag sakta hai." },
          { text: 'buildNum 1041, 1044 ya 1047 ho', bin: 'in', explain: 'IN (1041, 1044, 1047) — numbers ki list bhi chalti hai.' },
          { text: 'Jinke paas customerLocation bhara hua hai', bin: 'isnull', explain: 'customerLocation IS NOT NULL — IS NULL ka ulta roop.' },
          { text: 'Date 1 June se 30 June ke beech', bin: 'between', explain: "BETWEEN '2026-06-01' AND '2026-06-30' — dates par bhi BETWEEN chalta hai." },
        ],
      },
      {
        type: 'hotspot',
        title: 'Filter diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez par click karo.',
        visual: 'filters',
        questions: [
          { q: 'Yeh likhoge toh result HAMESHA khaali aayega — kaunsa hai?', target: 'nulleq', explain: 'ip = NULL. NULL kisi ke barabar nahi hota, isliye condition kabhi true nahi hoti.' },
          { q: 'Khaali (NULL) values dhoondhne ka sahi tarika?', target: 'isnull', explain: 'IS NULL / IS NOT NULL — NULL ke liye alag operator hai.' },
          { q: 'Bahut saare OR ka chhota roop kaunsa hai?', target: 'in', explain: "IN ('a','b','c') — list mein se koi ek. Padhne mein bhi saaf." },
          { q: 'Naam mein kahin bhi "tokyo" dhoondhne ke liye?', target: 'like', explain: "LIKE '%tokyo%' — % kuch bhi match karta hai (0 ya zyada chars)." },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Gayab devices ka rahasya',
        instructions: '"Unassigned devices" page khaali aata hai — par audit kehta hai devices hain. Sach pata karo.',
        goal: 'Team ka page <code>WHERE ip = NULL</code> use kar raha tha aur hamesha khaali aata tha. <b>(1)</b> Pehle <code>SELECT * FROM bx50Data WHERE ip = NULL;</code> chala ke khud dekho — kya milta hai. <b>(2)</b> Ab <code>IS NULL</code> se sahi query chalao — asli gayab devices dikhenge. <b>(3)</b> Phir <code>LIKE</code> se saare Pune wale devices dhoondo. <b>(4)</b> Aakhir mein <code>IN</code> se woh devices jinka status <code>\'Error\'</code> ya <code>\'Not Built\'</code> hai.',
        tasks: [
          { text: "Galat query dekho: WHERE ip = NULL", check: s => s.history.some(h => /where\s+ip\s*=\s*null/i.test(h)) },
          { text: 'Sahi query: WHERE ip IS NULL', check: s => s.history.some(h => /where\s+ip\s+is\s+null/i.test(h)) },
          { text: "Pune ke devices — LIKE '%pune%'", check: s => s.history.some(h => /like\s+'%pune%'/i.test(h)) },
          { text: "Error ya Not Built — IN (...)", check: s => s.history.some(h => /status\s+in\s*\(/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /where\s+ip\s*=\s*null/i.test(h))
          && s.history.some(h => /where\s+ip\s+is\s+null/i.test(h))
          && s.history.some(h => /like\s+'%pune%'/i.test(h))
          && s.history.some(h => /status\s+in\s*\(/i.test(h)),
        successText: '🎉 <b>Rahasya khul gaya.</b> <code>ip = NULL</code> ne "Empty set" diya — koi error nahi, bas chup-chaap khaali. Yehi is bug ko itna khatarnaak banata hai: query <b>fail nahi hoti</b>, sirf jhoot bolti hai. <code>IS NULL</code> se do devices mile jinka IP kabhi allot hi nahi hua. <b>Khaali result mile toh ek baar query par bhi shak karo.</b>',
        hints: [
          'SELECT * FROM bx50Data WHERE ip = NULL;   ← dekho, Empty set aayega (bug!)',
          'SELECT bx50Name, status FROM bx50Data WHERE ip IS NULL;',
          "SELECT bx50Name FROM bx50Data WHERE bx50Name LIKE '%pune%';",
          "SELECT bx50Name, status FROM bx50Data WHERE status IN ('Error', 'Not Built');",
        ],
      },
      {
        type: 'quiz',
        title: 'Filter Quick-fire',
        questions: [
          {
            q: '<code>WHERE ip = NULL</code> ka result kya hoga?',
            choices: [
              'Hamesha khaali (0 rows) — aur koi error bhi nahi milega',
              'Jinka ip NULL hai woh rows',
              'Syntax error',
              'Saari rows',
            ],
            answer: 0,
            explain: 'NULL kisi ke barabar nahi — <code>NULL = NULL</code> ka jawab NULL hai, true nahi. Aur error na aana hi ise itna khatarnaak banata hai.',
          },
          {
            q: '<code>WHERE type = \'Gen4\' AND active = 1 OR type = \'Gen3\'</code> — asal mein kya milega?',
            choices: [
              '(Gen4 AND active) wale, PLUS saare Gen3 — chahe woh inactive hi kyun na ho',
              'Sirf active Gen4 aur active Gen3',
              'Syntax error',
              'Sirf Gen3',
            ],
            answer: 0,
            explain: 'AND, OR se pehle bind hota hai. Chahiye tha: <code>(type=\'Gen4\' OR type=\'Gen3\') AND active=1</code>. <b>AND/OR mix karo toh bracket lagao.</b>',
          },
          {
            q: 'Table mein 10 rows hain: 3 ka status "Error", 2 ka NULL, 5 kuch aur. <code>WHERE status != \'Error\'</code> kitni rows dega?',
            choices: [
              '5 — NULL wali 2 rows chhoot jaati hain',
              '7 — NULL bhi "Error ke alawa" hai',
              '10',
              '3',
            ],
            answer: 0,
            explain: 'NULL ki comparison kabhi true nahi hoti, isliye <code>!=</code> unhe bhi chhod deta hai. Chahiye toh: <code>WHERE status != \'Error\' OR status IS NULL</code>.',
          },
          {
            q: 'Kaunsa LIKE pattern index use kar sakta hai?',
            choices: [
              "LIKE 'bx50-tokyo%' — shuruaat fixed hai",
              "LIKE '%tokyo%' — dono taraf %",
              "LIKE '%tokyo' — shuru mein %",
              'Koi bhi LIKE index use nahi kar sakta',
            ],
            answer: 0,
            explain: 'Index shabd ki shuruaat se sort hota hai (phone directory ki tarah). Shuruaat fixed ho toh jump kar sakte ho; aage <code>%</code> ho toh poori kitaab padhni padegi.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Filters & NULL',
      instructions: 'NULL wala round — yahin log fisalte hain. 🎤',
      questions: [
        {
          q: '"SQL mein NULL ka matlab kya hai, aur usse compare kaise karte ho?"',
          choices: [
            'NULL = "value pata nahi / hai hi nahi" — 0 ya empty string nahi. Compare hamesha <code>IS NULL</code> / <code>IS NOT NULL</code> se, kyunki <code>= NULL</code> ka jawab NULL hota hai',
            'NULL matlab 0 — normal = se compare karo',
            'NULL matlab empty string — = "" se compare karo',
            'NULL compare ho hi nahi sakta, kabhi use mat karo',
          ],
          answer: 0,
          explain: 'Do baatein bolna: <b>NULL = unknown</b> (0/"" se alag), aur <b>three-valued logic</b> — true/false/NULL. Isliye alag operator chahiye.',
        },
        {
          q: 'Interviewer: "Ek report kehti hai 0 unassigned devices, par audit kehta hai 43 hain. Kahan dekhoge?"',
          choices: [
            'Query par shak karunga — <code>= NULL</code> jaisi galti "no error, no result" deti hai. Query ko ulta karke (IS NULL) verify karunga',
            'Audit galat hoga, report par bharosa karunga',
            'Database restart karunga',
            'Table drop karke dobara banaunga',
          ],
          answer: 0,
          explain: '<b>Empty result ≠ empty reality.</b> Yeh exact bug asli project mein hua tha. Achha jawab yeh hai: "khaali result ko bhi verify karta hoon — ek known-true row se query test karta hoon."',
        },
        {
          q: '🎛️ Interviewer: "Ab likh ke dikhao — teen filter queries."',
          terminal: {
            title: 'Interview hands-on — filters',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>bx50Data</code> se woh devices jinka <code>customerLocation</code> khaali (NULL) hai. <b>(2)</b> <code>bx50Builds</code> se woh builds jinka <code>duration</code> 4000000 aur 8000000 ke beech ho — <code>BETWEEN</code> use karo. <b>(3)</b> <code>bmsTester</code> se woh tests jinka <code>client</code> <code>\'Komatsu\'</code> ya <code>\'Denyo\'</code> hai — <code>IN</code> use karo.',
            tasks: [
              { text: 'customerLocation IS NULL', check: s => s.history.some(h => /customerlocation\s+is\s+null/i.test(h)) },
              { text: 'duration BETWEEN 4000000 AND 8000000', check: s => s.history.some(h => /duration\s+between/i.test(h)) },
              { text: "client IN ('Komatsu','Denyo')", check: s => s.history.some(h => /client\s+in\s*\(/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /customerlocation\s+is\s+null/i.test(h))
              && s.history.some(h => /duration\s+between/i.test(h))
              && s.history.some(h => /client\s+in\s*\(/i.test(h)),
            successText: '✅ Teeno operators sahi jagah. <code>IS NULL</code>, <code>BETWEEN</code>, <code>IN</code> — yeh teen 80% real-world WHERE clauses cover kar dete hain.',
            hints: [
              'SELECT bx50Name FROM bx50Data WHERE customerLocation IS NULL;',
              'SELECT buildNum, duration FROM bx50Builds WHERE duration BETWEEN 4000000 AND 8000000;',
              "SELECT id, client FROM bmsTester WHERE client IN ('Komatsu', 'Denyo');",
            ],
          },
        },
      ],
    },
    success: [
      'Main AND/OR ki precedence jaanta hoon aur bracket lagata hoon',
      'Main LIKE, IN aur BETWEEN sahi jagah use kar sakta hoon',
      'Main NULL ko IS NULL se handle karta hoon, = NULL se nahi',
      'Main samajhta hoon ki != NULL wali rows ko kyun chhod deta hai',
    ],
    homework: `<p>NULL ka jaal khud dekho:</p>
      <pre>USE factory;
INSERT INTO operators VALUES ('OP-999', 'Test User', NULL);

SELECT * FROM operators WHERE shift = NULL;      -- Empty set (bug!)
SELECT * FROM operators WHERE shift IS NULL;     -- yahan milega
SELECT * FROM operators WHERE shift != 'day';    -- OP-999 GAYAB hai!
SELECT * FROM operators WHERE shift != 'day' OR shift IS NULL;  -- ab aaya

-- Bracket ka khel:
SELECT * FROM operators WHERE shift = 'day' AND name LIKE 'R%' OR shift = 'night';
SELECT * FROM operators WHERE shift = 'day' AND (name LIKE 'R%' OR shift = 'night');
-- dono ka result compare karo!</pre>
      <p>✅ Self-check: <code>!= 'day'</code> wali query mein NULL shift wala user gayab tha? Bracket badalne se result badla?</p>`,
    cards: [
      { front: 'NULL kya hai aur compare kaise?', back: 'NULL = "value pata nahi" (0 ya "" nahi). <code>= NULL</code> hamesha khaali deta hai; <b><code>IS NULL</code> / <code>IS NOT NULL</code></b> use karo.' },
      { front: '<code>WHERE status != \'Error\'</code> ka chhupa bug?', back: 'NULL wali rows <b>chhoot jaati hain</b> (NULL ki koi comparison true nahi hoti). Fix: <code>... OR status IS NULL</code>.' },
      { front: 'AND vs OR precedence?', back: '<b>AND pehle bind hota hai.</b> <code>a AND b OR c</code> = <code>(a AND b) OR c</code>. Mix karo toh <b>bracket lagao</b> — hamesha.' },
      { front: 'LIKE ke wildcards?', back: '<code>%</code> = 0+ characters, <code>_</code> = exactly 1 character. <code>\'bx50-tokyo%\'</code> index use kar sakta hai, <code>\'%tokyo%\'</code> nahi.' },
      { front: 'IN aur BETWEEN?', back: '<code>IN (a,b,c)</code> = bahut saare OR ka saaf roop. <code>BETWEEN x AND y</code> = <code>&gt;= x AND &lt;= y</code> — <b>dono ends inclusive</b>.' },
    ],
  },

  /* ================= LEVEL 4: CRUD ================= */
  {
    id: 'crud',
    icon: '✏️',
    title: 'INSERT, UPDATE, DELETE — Data Badalna',
    badge: 'WHERE Ka Pehredaar',
    objectives: [
      '<b>INSERT INTO</b> — single aur multi-row',
      '<b>UPDATE ... SET ... WHERE</b> — aur WHERE bhoolne ka anjaam',
      '<b>DELETE FROM ... WHERE</b> — soft delete ka concept',
      '<b>Safety drill</b>: SELECT pehle, phir UPDATE',
    ],
    lesson: [
      `<h3>➕ INSERT — naya data daalo</h3>
       <pre>-- Column names ke saath (RECOMMENDED)
INSERT INTO operators (opId, name, shift)
VALUES ('OP-106', 'Neha Gupta', 'night');

-- Ek saath kai rows
INSERT INTO operators (opId, name, shift) VALUES
  ('OP-107', 'Karan Mehta', 'day'),
  ('OP-108', 'Divya Nair', 'night');</pre>
       <p>⚠️ Column names chhod bhi sakte ho (<code>INSERT INTO t VALUES (...)</code>),
       par <b>mat chhodo</b> — kal koi column add karega toh tumhara insert
       chup-chaap galat column mein data daal dega ya toot jayega.</p>
       <p>💡 <code>AUTO_INCREMENT</code> wale column (jaise <code>id</code>) ko
       value mat do — DB khud agla number deta hai.</p>`,
      `<h3>✏️ UPDATE — aur woh ek shabd jo sab bacha leta hai</h3>
       <pre>UPDATE bx50Data
SET    status = 'Provisioned', bx50Status = 4
WHERE  bx50Name = 'bx50-pune-01';       -- ← YEH LINE</pre>
       <p><b>WHERE bhool gaye toh poori table badal jaati hai.</b> Koi
       confirmation nahi, koi "are you sure?" nahi — bas
       <code>Query OK, 50000 rows affected</code>.</p>
       <p>🛡️ <b>Safety drill (yeh aadat daal lo):</b></p>
       <pre>-- Step 1: WHERE ko SELECT se test karo
SELECT * FROM bx50Data WHERE bx50Name = 'bx50-pune-01';
-- 1 row aayi? Bilkul wahi row jo badalni hai?

-- Step 2: ab wahi WHERE UPDATE mein copy karo
UPDATE bx50Data SET status = 'Provisioned' WHERE bx50Name = 'bx50-pune-01';
-- "1 row affected" — jitni SELECT ne dikhayi thi, utni hi.</pre>
       <p>Rows affected ka number tumhari SELECT se match nahi kar raha? Ruk
       jao — kuch galat hai.</p>`,
      `<h3>🗑️ DELETE — aur soft delete ka rasta</h3>
       <pre>DELETE FROM bx50Sessions WHERE id = 7;        -- ek row
DELETE FROM bx50Sessions;                    -- ☠️ SAARI rows!</pre>
       <p>Bade systems mein data aksar <b>delete kiya hi nahi jaata</b>. Uski
       jagah ek flag lagta hai — ise <b>soft delete</b> kehte hain:</p>
       <pre>-- Hard delete (data gaya)
DELETE FROM bx50Builds WHERE buildNum = 1043;

-- Soft delete (data raha, dikhna band)
UPDATE bx50Builds SET active = 0 WHERE buildNum = 1043;
-- ...aur queries mein: WHERE active = 1</pre>
       <p>Isiliye <code>bx50Builds</code> mein <code>active</code> column hai.
       Faayda: history bachi rehti hai, galti wapas ho sakti hai, audit ho sakta
       hai. Nuksaan: har query mein <code>WHERE active = 1</code> yaad rakhna
       padta hai.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Ek engineer ko ek device
       ka status theek karna tha. Usne query editor mein likha:
       <code>UPDATE bx50Data SET status = 'Not Built'</code> — aur WHERE line
       likhne se pehle galti se <b>Ctrl+Enter</b> dab gaya.
       <code>Query OK, 312 rows affected</code>. Poori factory ka device
       registry ek second mein reset ho gaya; dashboard par har device "Not
       Built" dikhne laga aur do shift ka kaam ruk gaya. Bachao raat ke backup
       se hua — 4 ghante ka data phir bhi gaya. Us din se team ka rule bana:
       <b>UPDATE/DELETE hamesha <code>BEGIN;</code> ke andar, verify karke
       <code>COMMIT;</code></b> (Track 3 mein yeh seekhenge).</div>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'CRUD diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez par click karo.',
        visual: 'crud',
        questions: [
          { q: 'Naya row daalne ke liye kaunsa command?', target: 'insert', explain: 'INSERT INTO t (cols) VALUES (...). Column names hamesha likho.' },
          { q: 'Maujooda row ki value badalne ke liye?', target: 'update', explain: 'UPDATE t SET col = val WHERE ... — WHERE ke bina poori table badalti hai.' },
          { q: 'Yeh galti poori table tabah kar deti hai — kaunsi hai?', target: 'nowhere', explain: 'Bina WHERE ke UPDATE/DELETE. Koi confirmation nahi milta, seedha ho jaata hai.' },
          { q: 'Risky UPDATE se bachne ka tarika kaunsa hai?', target: 'txsafe', explain: 'Pehle wahi WHERE SELECT par test karo, ya BEGIN → verify → COMMIT. Dono aadatein bachati hain.' },
        ],
      },
      {
        type: 'fill',
        title: 'Safe UPDATE likho',
        instructions: 'Ek device ka status theek karna hai — safety ke saath. Blanks bharo.',
        template: `-- Step 1: pehle SELECT se WHERE test karo
SELECT * FROM bx50Data {0} bx50Name = 'bx50-osaka-01';
-- 1 row aayi? theek. Ab wahi WHERE UPDATE mein:

{1} bx50Data
{2} status = 'Provisioned', bx50Status = 4
{0} bx50Name = 'bx50-osaka-01';

-- Naya operator add karo (id AUTO_INCREMENT hai, isliye mat do)
{3} operators (opId, name, shift)
VALUES ('OP-106', 'Neha Gupta', 'night');`,
        tokens: ['WHERE', 'UPDATE', 'SET', 'INSERT INTO', 'DELETE FROM', 'VALUES', 'HAVING', 'MODIFY'],
        blanks: [
          { answer: 'WHERE', explain: 'Wahi <code>WHERE</code> pehle SELECT par test karo, phir UPDATE mein copy karo. Rows affected = SELECT ke rows hone chahiye.' },
          { answer: 'UPDATE', explain: '<code>UPDATE &lt;table&gt;</code> — kaunsi table badalni hai.' },
          { answer: 'SET', explain: '<code>SET col = val, col2 = val2</code> — ek hi UPDATE mein kai columns badal sakte ho (comma se).' },
          { answer: 'INSERT INTO', explain: '<code>INSERT INTO t (cols) VALUES (...)</code>. Column names likhna zaroori nahi hai par <b>likhna chahiye</b> — schema badalne par bachata hai.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Naya operator aur ek galat status',
        instructions: 'Do kaam: naya operator register karo, aur ek device ka galat status theek karo — safely.',
        goal: 'HR ne naya operator bheja hai aur QA ne ek galat status report kiya hai. <b>(1)</b> Naya operator <code>INSERT</code> karo: opId <code>\'OP-106\'</code>, name <code>\'Neha Gupta\'</code>, shift <code>\'night\'</code>, station <code>\'BMS-line-2\'</code>. <b>(2)</b> <code>bx50-osaka-01</code> ka status galat hai. Pehle <code>SELECT</code> se us row ko dekho. <b>(3)</b> Ab <code>UPDATE</code> se uska <code>status</code> <code>\'Provisioned\'</code> karo — <b>WHERE lagana mat bhoolna</b>. <b>(4)</b> Verify karo ki sirf 1 row badli.',
        tasks: [
          { text: 'Naya operator OP-106 insert karo', check: s => (s.db.tables.operators.rows || []).some(r => r.opId === 'OP-106') },
          { text: 'Pehle SELECT se osaka row dekho', check: s => s.history.some(h => /^select.*osaka/i.test(h)) },
          { text: 'UPDATE with WHERE — osaka ka status theek', check: s => (s.db.tables.bx50Data.rows.find(r => r.bx50Name === 'bx50-osaka-01') || {}).status === 'Provisioned' },
          { text: 'Baaki devices ka status nahi bigda', check: s => s.db.tables.bx50Data.rows.filter(r => r.status === 'Provisioned').length === 4 },
        ],
        db: SG.factoryDB(),
        success: s => (s.db.tables.operators.rows || []).some(r => r.opId === 'OP-106')
          && (s.db.tables.bx50Data.rows.find(r => r.bx50Name === 'bx50-osaka-01') || {}).status === 'Provisioned'
          && s.db.tables.bx50Data.rows.filter(r => r.status === 'Provisioned').length === 4
          && s.history.some(h => /^select.*osaka/i.test(h)),
        successText: '🎉 <b>Dono kaam, zero collateral damage.</b> Tumne wahi kiya jo har senior karta hai: <b>pehle SELECT se WHERE verify, phir UPDATE</b>, aur "1 row affected" dekh ke chain ki saans. Agar tumne <code>WHERE</code> chhod diya hota toh saare 7 devices "Provisioned" ho jaate — aur factory dashboard jhoot bolne lagta.',
        hints: [
          "INSERT INTO operators (opId, name, shift, station) VALUES ('OP-106', 'Neha Gupta', 'night', 'BMS-line-2');",
          "SELECT * FROM bx50Data WHERE bx50Name = 'bx50-osaka-01';   ← pehle dekho",
          "UPDATE bx50Data SET status = 'Provisioned' WHERE bx50Name = 'bx50-osaka-01';",
          'Verify: SELECT bx50Name, status FROM bx50Data;',
        ],
      },
      {
        type: 'incident',
        title: '🚨 3AM: "Maine WHERE bhool gaya"',
        instructions: 'Pager baja hai. Sahi kadam chuno.',
        pager: '<b>#factory-alerts</b> — 3:07 AM<br>Night-shift engineer: <i>"guys… maine <code>UPDATE bx50Data SET status = \'Not Built\'</code> chala diya… WHERE nahi tha… 312 rows affected likha aa raha hai"</i><br>Dashboard par har device "Not Built" dikha raha hai. Do shift ka kaam ruk gaya.',
        start: 'first',
        nodes: {
          first: {
            text: 'Sabse pehla kadam kya?',
            choices: [
              { t: 'Aur koi write na chale — writes rok do, phir damage ka scope naapo (kitni rows, kaunsi table)', good: true, next: 'scope', explain: 'Bleeding pehle roko. Aur writes chalte rahe toh recovery ka reference point hi kho jayega.' },
              { t: 'Turant ek aur UPDATE chala ke sab wapas "Provisioned" kar do', good: false, explain: 'Sab rows pehle "Provisioned" thi hi nahi — yeh doosri galti pehli ke upar chadha degi. Purani values ka pata pehle karo.' },
              { t: 'Database restart kar do', good: false, explain: 'Restart committed data wapas nahi laata. UPDATE already disk par likha ja chuka hai.' },
              { t: 'Kuch mat karo, subah dekhenge', good: false, explain: 'Factory ruki hai. Aur har guzarta minute naye writes la sakta hai jo recovery mushkil karenge.' },
            ],
          },
          scope: {
            sitrep: 'Writes rok diye. Confirm hua: <code>bx50Data</code> ki saari 312 rows ka <code>status</code> ab <code>\'Not Built\'</code> hai. Baaki columns (naam, ip, buildNum) safe hain.',
            text: 'Purani values kahan se milengi?',
            choices: [
              { t: 'Raat ka backup + binlog dekho — backup se purana status, binlog se uske baad ke asli changes', good: true, next: 'restore', explain: 'Backup + binlog = point-in-time recovery. Yeh exactly woh scenario hai jiske liye binlog hota hai.' },
              { t: 'Har device ka status yaad karke haath se type karo', good: false, explain: '312 devices. Yaaddaasht se recovery = nayi galtiyan. Data ka source of truth chahiye, andaza nahi.' },
              { t: 'Sab ko "Provisioned" kar do — zyadatar wahi the', good: false, explain: '"Zyadatar" production data mein kaafi nahi hota. Building/Error wale devices ka sach kho jayega.' },
            ],
          },
          restore: {
            sitrep: 'Backup 11:00 PM ka hai. Binlog se 11 PM se 3:07 AM tak ke asli changes replay ho sakte hain — bas woh ek galat UPDATE chhod ke.',
            text: 'Restore kaise karoge?',
            choices: [
              { t: 'Backup ko ALAG (staging) DB par restore karo, binlog replay karo, sahi status values verify karo — phir sirf status column prod par UPDATE karo', good: true, next: 'prevent', explain: 'Prod par seedha restore = baaki tables ka naya data bhi ud jayega. Staging par sach banao, phir surgical fix.' },
              { t: 'Seedha prod par poora backup restore kar do', good: false, explain: 'Backup ke baad ke saare asli changes (naye sessions, test results) mit jayenge — ek galti ka ilaaj karke doosri badi galti.' },
              { t: 'Backup file ko manually text editor mein edit karo', good: false, explain: 'GBs ki dump file haath se edit karna = naya corruption. Tools use karo.' },
            ],
          },
          prevent: {
            sitrep: 'Status column restore ho gaya, verify bhi. Factory line 4:40 AM par chalu. Ab postmortem.',
            text: 'Yeh dobara na ho — kya lagoge?',
            choices: [
              { t: 'Team rule: prod par UPDATE/DELETE hamesha BEGIN; ... verify ... COMMIT; ke andar. Plus client mein safe-updates on, aur app user ko sirf zaroori GRANT', good: true, next: 'end', explain: 'Teen layer: aadat (transaction), tool (safe-updates WHERE ke bina UPDATE rokta hai), aur permission (kam se kam power).' },
              { t: 'Us engineer ko night shift se hata do', good: false, explain: 'Blame culture se system safe nahi hota — agla insaan wahi galti karega. System badlo, insaan nahi.' },
              { t: 'Sab ko email bhej do "dhyaan se kaam karo"', good: false, explain: 'Email guardrail nahi hota. Aisi galti tab rukti hai jab galat karna mushkil ho jaye.' },
            ],
          },
          end: {
            end: true,
            text: 'Incident band — line chalu, guardrails lagi 🧯',
            summary: `<b>Kya seekha:</b>
              <ul>
                <li><b>Bleeding roko pehle</b> — writes band, phir scope naapo.</li>
                <li><b>Recovery ka source data hona chahiye</b> — backup + binlog, yaaddaasht nahi.</li>
                <li><b>Staging par restore, prod par surgical fix</b> — poora restore naye data ko maar deta hai.</li>
                <li><b>Guardrails > gyaan:</b> <code>BEGIN; ... COMMIT;</code> aadat, MySQL client mein <code>SET sql_safe_updates = 1</code> (bina WHERE ke UPDATE/DELETE rok deta hai), aur app DB user ko minimum GRANT.</li>
              </ul>
              Aur sabse aasan wala: <b>UPDATE likhne se pehle wahi WHERE ek SELECT par chalao.</b>`,
          },
        },
      },
      {
        type: 'quiz',
        title: 'CRUD Quick-fire',
        questions: [
          {
            q: '<code>UPDATE bx50Data SET status = \'X\';</code> — kya hoga?',
            choices: [
              'Table ki SAARI rows ka status "X" ho jayega — bina kisi warning ke',
              'Error milega kyunki WHERE nahi hai',
              'Sirf pehli row badlegi',
              'Kuch nahi hoga',
            ],
            answer: 0,
            explain: 'SQL tumse nahi poochta. <code>Query OK, 312 rows affected</code> — aur bas. Isiliye safety drill ki aadat.',
          },
          {
            q: 'Risky UPDATE se pehle sabse aasan safety step?',
            choices: [
              'Wahi WHERE clause ek SELECT par chalao — dekho kitni aur kaunsi rows aati hain',
              'Table ka naam do baar check karo',
              'Query ko capital letters mein likho',
              'Pehle table drop karke dobara banao',
            ],
            answer: 0,
            explain: 'SELECT-then-UPDATE drill: rows affected ka number SELECT ke rows se match hona chahiye. Na mile toh ruk jao.',
          },
          {
            q: 'Soft delete kya hai aur kyun karte hain?',
            choices: [
              'Row delete karne ke bajaye ek flag (active = 0) set karna — history, audit aur galti wapas karne ke liye',
              'Row ko dheere-dheere delete karna',
              'DELETE ko transaction mein chalana',
              'Sirf kuch columns delete karna',
            ],
            answer: 0,
            explain: 'Isiliye <code>bx50Builds.active</code> column hai. Cost: har query mein <code>WHERE active = 1</code> yaad rakhna padta hai.',
          },
          {
            q: 'INSERT mein column names kyun likhne chahiye?',
            choices: [
              'Kal koi naya column add kare toh tumhara INSERT tootega nahi ya galat column mein data nahi daalega',
              'Bina names ke INSERT chalta hi nahi',
              'Query tez ho jaati hai',
              'MySQL ki majboori hai',
            ],
            answer: 0,
            explain: '<code>INSERT INTO t VALUES (...)</code> column <b>order</b> par depend karta hai — schema badla toh chup-chaap galat data. Names likho.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Data Modification',
      instructions: 'Yahan interviewer tumhari <i>aadat</i> dekhta hai, sirf syntax nahi. 🎤',
      questions: [
        {
          q: '"Production par UPDATE chalane se pehle tum kya karte ho?"',
          choices: [
            'Wahi WHERE ek SELECT par chala ke rows dekhta hoon, phir transaction mein UPDATE karke rows-affected verify karke COMMIT karta hoon',
            'Seedha UPDATE chala deta hoon, backup toh hai hi',
            'Table copy banata hoon phir usme kaam karta hoon',
            'DBA ko bol deta hoon, mera kaam nahi',
          ],
          answer: 0,
          explain: 'Interviewer <b>process</b> sun-na chahta hai: verify → transaction → check → commit. Yeh seniority ka sabse saaf signal hai.',
        },
        {
          q: 'Interviewer: "DELETE aur soft delete mein kab kya?"',
          choices: [
            'Business data (builds, orders, users) = soft delete — history/audit chahiye. Sach mein junk (expired sessions, temp rows, GDPR erasure) = hard delete',
            'Hamesha hard delete — database chhota rehta hai',
            'Hamesha soft delete — kuch mat mitao',
            'Dono same hain',
          ],
          answer: 0,
          explain: 'Trade-off bolna: soft delete = recoverable + auditable, par har query mein filter aur table badhti rehti hai. GDPR "right to be forgotten" mein hard delete zaroori ho jaata hai.',
        },
        {
          q: '🎛️ Interviewer: "Ek naya firmware register karo aur ek purana version retire karo."',
          terminal: {
            title: 'Interview hands-on — CRUD',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>firmwareFiles</code> mein naya row daalo: fileName <code>\'bms_fw_2_3_0.bin\'</code>, version <code>\'2.3.0\'</code>, deviceType <code>\'BMS\'</code>, uploadedAt <code>\'2026-07-21 10:00:00\'</code>. <b>(2)</b> Verify karo ki BMS ke ab 3 firmware hain. <b>(3)</b> Purana <code>\'bms_fw_2_1_0.bin\'</code> hata do — <code>DELETE</code> with <code>WHERE</code>.',
            tasks: [
              { text: 'Naya firmware 2.3.0 insert', check: s => s.db.tables.firmwareFiles.rows.some(r => r.version === '2.3.0') },
              { text: 'BMS firmware verify karo (SELECT)', check: s => s.history.some(h => /^select.*firmwarefiles/i.test(h)) },
              { text: 'Purana 2.1.0 delete (WHERE ke saath!)', check: s => !s.db.tables.firmwareFiles.rows.some(r => r.version === '2.1.0') },
            ],
            db: SG.factoryDB(),
            success: s => s.db.tables.firmwareFiles.rows.some(r => r.version === '2.3.0')
              && !s.db.tables.firmwareFiles.rows.some(r => r.version === '2.1.0')
              && s.db.tables.firmwareFiles.rows.length === 4
              && s.history.some(h => /^select.*firmwarefiles/i.test(h)),
            successText: '✅ Insert + verify + targeted delete. Dhyaan diya — <code>id</code> tumne nahi diya, <code>AUTO_INCREMENT</code> ne khud de diya. Aur DELETE mein WHERE tha, isliye sirf ek row gaya.',
            hints: [
              "INSERT INTO firmwareFiles (fileName, version, deviceType, uploadedAt) VALUES ('bms_fw_2_3_0.bin', '2.3.0', 'BMS', '2026-07-21 10:00:00');",
              "SELECT * FROM firmwareFiles WHERE deviceType = 'BMS';",
              "DELETE FROM firmwareFiles WHERE version = '2.1.0';",
            ],
          },
        },
      ],
    },
    success: [
      'Main INSERT single aur multi-row likh sakta hoon (column names ke saath)',
      'Main UPDATE se pehle WHERE ko SELECT par verify karta hoon',
      'Main jaanta hoon ki bina WHERE ke UPDATE/DELETE kya tabahi karta hai',
      'Main soft delete vs hard delete ka trade-off bata sakta hoon',
    ],
    homework: `<p>Safety drill ki aadat banao (aur ek surakshit galti karke dekho):</p>
      <pre>USE factory;

-- Safe drill
SELECT * FROM operators WHERE opId = 'OP-101';       -- 1 row?
UPDATE operators SET shift = 'night' WHERE opId = 'OP-101';   -- 1 row affected?

-- MySQL client ka guardrail ON karo:
SET sql_safe_updates = 1;
UPDATE operators SET shift = 'day';       -- ab ERROR aayega (WHERE nahi hai)
DELETE FROM operators;                     -- yeh bhi block

-- Multi-row insert
INSERT INTO operators (opId, name, shift) VALUES
  ('OP-201','A Sharma','day'), ('OP-202','B Verma','night');

-- Soft delete pattern
ALTER TABLE operators ADD COLUMN active BOOLEAN DEFAULT 1;
UPDATE operators SET active = 0 WHERE opId = 'OP-202';
SELECT * FROM operators WHERE active = 1;</pre>
      <p>✅ Self-check: <code>sql_safe_updates = 1</code> ke baad bina WHERE ka UPDATE block hua? Soft delete ke baad row table mein hai par filtered query mein nahi?</p>`,
    cards: [
      { front: 'UPDATE se pehle ka safety drill?', back: 'Wahi <code>WHERE</code> pehle <b>SELECT</b> par chalao. Rows affected = SELECT ke rows hone chahiye. Na match ho toh ruk jao.' },
      { front: 'Bina WHERE ke UPDATE/DELETE?', back: '<b>Poori table</b> — koi warning nahi, bas "312 rows affected". Bachao: <code>SET sql_safe_updates=1</code>, <code>BEGIN; ... COMMIT;</code>, aur SELECT-first aadat.' },
      { front: 'Soft delete kya hai?', back: 'Row hatane ke bajaye flag (<code>active = 0</code>) set karna; queries mein <code>WHERE active = 1</code>. History + audit + undo milta hai. Cost: har query mein filter.' },
      { front: 'INSERT mein column names kyun?', back: '<code>INSERT INTO t VALUES(...)</code> column <b>order</b> par chalta hai — schema badla toh chup-chaap galat data. Names likhne se schema change safe rehta hai.' },
      { front: 'AUTO_INCREMENT column ko value doge?', back: '<b>Nahi.</b> Usse INSERT mein chhod do — DB khud agla number deta hai. Isiliye column list likhna zaroori ho jaata hai.' },
    ],
  },

  /* ================= LEVEL 5: Data Types ================= */
  {
    id: 'datatypes',
    icon: '📏',
    title: 'Data Types — Dabbe ka Sahi Size',
    badge: 'Type Tapasvi',
    objectives: [
      '<b>INT vs BIGINT</b> — aur overflow ka asli incident',
      '<b>VARCHAR vs TEXT</b>, <b>DATE / DATETIME / TIMESTAMP</b>',
      '<b>DECIMAL vs FLOAT</b> — paisa kabhi FLOAT mein nahi',
      '<b>CREATE TABLE</b> — sahi types ke saath table banana',
    ],
    lesson: [
      `<h3>🔢 Numbers — INT ki ek deewar hai</h3>
       <table>
         <tr><th>Type</th><th>Range</th><th>Kab</th></tr>
         <tr><td><code>TINYINT</code></td><td>−128 … 127</td><td>chhote flags, 0/1</td></tr>
         <tr><td><code>INT</code></td><td>±2,147,483,647 (~2.1 billion)</td><td>id, counts</td></tr>
         <tr><td><code>BIGINT</code></td><td>±9.2 quintillion</td><td>milliseconds, bytes, epoch time</td></tr>
         <tr><td><code>DECIMAL(p,s)</code></td><td>exact, apni marzi ka</td><td>💰 <b>paisa</b></td></tr>
         <tr><td><code>FLOAT/DOUBLE</code></td><td>approximate</td><td>sensor readings, science</td></tr>
       </table>
       <p>⚠️ <b>Paisa kabhi FLOAT mein nahi.</b> <code>0.1 + 0.2</code> FLOAT mein
       <code>0.30000000000000004</code> hota hai. Invoice mein yeh ek paise ka
       farak mahine baad audit fail kara deta hai. <code>DECIMAL(10,2)</code>
       use karo — woh exact hota hai.</p>`,
      `<h3>🔤 Text aur 📅 Time</h3>
       <pre>VARCHAR(50)   -- max 50 chars, jitna use kiya utni jagah. Index-friendly.
TEXT          -- bahut lamba (64KB+). Index karna mushkil, alag store hota hai.
CHAR(36)      -- FIXED length — hamesha 36 chars ki jagah. UUID ke liye badhiya.

DATE          -- '2026-07-21'
DATETIME      -- '2026-07-21 14:30:00'  ← jo daala wahi mila, timezone se azad
TIMESTAMP     -- DATETIME jaisa, par UTC mein store + session TZ mein convert
TIME          -- '14:30:00'</pre>
       <p>💡 <b>VARCHAR chuno, TEXT tab jab sach mein lamba ho</b> (notes, logs,
       JSON blob). TEXT column par <code>WHERE</code> lagana mehnga padta hai.</p>
       <p>💡 <b>DATETIME vs TIMESTAMP:</b> "yeh event 3 baje hua tha, chahe server
       kahin bhi ho" = <code>DATETIME</code>. "duniya bhar ke users ka same
       moment" = <code>TIMESTAMP</code> (ya UTC <code>DATETIME</code>).</p>`,
      `<h3>💥 Overflow — ek asli migration ki kahani</h3>
       <p>Factory ka <code>bx50Sessions</code> table session ka
       <code>duration</code> <b>milliseconds</b> mein rakhta tha, column type
       <code>INT</code>. Shuru mein sab theek — 30 minute = 1,800,000 ms, INT ke
       liye kuch bhi nahi.</p>
       <pre>INT ki max limit  = 2,147,483,647 ms
                   ≈ 596 ghante
                   ≈ 24.8 din</pre>
       <div class="war-story"><b>⚡ Real incident:</b> Ek test bench weekend par
       chhoot gaya — session band hi nahi hua. Somvaar ko jab process ne
       duration likhne ki koshish ki, MySQL ne <code>ERROR 1264 (22003): Out of
       range value for column 'duration'</code> phenk diya. Sirf woh ek row
       nahi ruka — poora session-write path fail hone laga, aur naye sessions
       save hona band ho gaye. Fix ek migration thi:
       <code>2024-12-16-change-bx50Sessions-duration-to-bigint</code> —
       <code>ALTER TABLE bx50Sessions MODIFY duration BIGINT;</code></div>
       <p>Sabak do hain: <b>(1)</b> milliseconds/bytes/epoch ke liye
       <code>BIGINT</code> se shuru karo — jagah ka farak mamooli hai, dard bada
       hai. <b>(2)</b> Type badalna baad mein <b>migration</b> hai, aur badi
       table par woh table lock kar sakta hai.</p>`,
    ],
    stages: [
      {
        type: 'bins',
        title: 'Kaunsa data type?',
        instructions: 'Har column ko sahi data type mein daalo.',
        bins: [
          { id: 'int', label: '🔢 INT' },
          { id: 'bigint', label: '🔢 BIGINT' },
          { id: 'varchar', label: '🔤 VARCHAR(n)' },
          { id: 'decimal', label: '💰 DECIMAL(p,s)' },
        ],
        items: [
          { text: 'Session ka duration milliseconds mein', bin: 'bigint', explain: 'ms jaldi bada ho jaata hai — INT 24.8 din par overflow. Asli project mein yeh migration likhni padi thi.' },
          { text: 'Device ka naam (bx50-tokyo-01)', bin: 'varchar', explain: 'VARCHAR(100) — chhota text, index-friendly.' },
          { text: 'Kitne tests pass hue (count)', bin: 'int', explain: 'Counts INT mein aaram se aa jaate hain — 2.1 billion tests nahi honge. 🙂' },
          { text: 'Part ki keemat (₹1,249.50)', bin: 'decimal', explain: 'DECIMAL(10,2) — <b>paisa hamesha exact</b>. FLOAT mein rounding error aata hai.' },
          { text: 'Build number (1041)', bin: 'int', explain: 'Simple integer identifier. INT kaafi hai.' },
          { text: 'File ka size bytes mein', bin: 'bigint', explain: 'Bytes bhi jaldi 2.1 billion cross karte hain (2 GB). BIGINT lo.' },
          { text: 'Status: Provisioned / Building / Error', bin: 'varchar', explain: 'VARCHAR(50). (ENUM bhi option hai par naye values add karna migration ban jaata hai.)' },
          { text: 'Unix epoch timestamp milliseconds mein', bin: 'bigint', explain: 'ms-epoch 2001 mein hi INT cross kar chuka hai. BIGINT zaroori.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Type ladder par ungli rakho',
        instructions: 'Diagram mein sahi jagah click karo.',
        visual: 'datatypes',
        questions: [
          { q: 'Milliseconds ya bytes store karne ke liye kaunsa type?', target: 'bigint', explain: 'BIGINT — INT ki 2.1 billion ki deewar ms/bytes par jaldi aa jaati hai.' },
          { q: 'Asli project mein kaunsi galti se migration likhni padi?', target: 'overflow', explain: 'duration INT tha, lambi session ne 2.1 billion ms cross kiya → ERROR 1264 → MODIFY duration BIGINT.' },
        ],
      },
      {
        type: 'fill',
        title: 'CREATE TABLE — sahi types chuno',
        instructions: 'Naya <code>testSessions</code> table banana hai. Sahi types drag karo.',
        template: `CREATE TABLE testSessions (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  operatorId  {0}(20)   NOT NULL,
  startedAt   {1}       NOT NULL,
  durationMs  {2}                      -- ms! INT 24.8 din par overflow karta hai
  ,partCost   {3}(10,2)                -- paisa — exact hona chahiye
);`,
        tokens: ['VARCHAR', 'DATETIME', 'BIGINT', 'DECIMAL', 'TEXT', 'INT', 'FLOAT', 'TIME'],
        blanks: [
          { answer: 'VARCHAR', explain: '<code>VARCHAR(20)</code> — chhota text, index-friendly. TEXT sirf tab jab sach mein lamba ho (notes/logs).' },
          { answer: 'DATETIME', explain: '<code>DATETIME</code> — "yeh event is waqt hua", timezone conversion ke bina. TIMESTAMP tab jab UTC-normalize chahiye.' },
          { answer: 'BIGINT', explain: 'Milliseconds ke liye <b>BIGINT</b>. <code>INT</code> ki max 2,147,483,647 ms ≈ 24.8 din — asli project mein yahi overflow hua tha.' },
          { answer: 'DECIMAL', explain: '<code>DECIMAL(10,2)</code> = exact decimal. <b>Paisa kabhi FLOAT mein nahi</b> — 0.1+0.2 = 0.30000000000000004 audit fail kara deta hai.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Overflow dekho, phir theek karo',
        instructions: 'Purana table INT use karta hai. Khud overflow trigger karo, phir sahi table banao.',
        goal: 'Legacy table <code>badSessions</code> ka <code>durationMs</code> <b>INT</b> hai. <b>(1)</b> <code>DESCRIBE badSessions;</code> — type dekho. <b>(2)</b> Ek lambi session daalne ki koshish karo: <code>INSERT INTO badSessions (operatorId, durationMs) VALUES (\'OP-101\', 3000000000);</code> — kya hota hai dekho. <b>(3)</b> Ab sahi table banao: <code>testSessions</code> jisme <code>id</code> INT PRIMARY KEY AUTO_INCREMENT, <code>operatorId</code> VARCHAR(20) NOT NULL, <code>durationMs</code> <b>BIGINT</b>. <b>(4)</b> Wahi badi value usme daalo — ab chal jayegi.',
        tasks: [
          { text: 'DESCRIBE badSessions — INT dekho', check: s => s.history.some(h => /^(describe|desc)\s+badsessions$/i.test(h)) },
          { text: 'Overflow trigger karo (INT mein badi value)', check: s => s.history.some(h => /insert\s+into\s+badsessions/i.test(h)) },
          { text: 'testSessions table banao (BIGINT ke saath)', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'testsessions') },
          { text: 'Badi duration ab successfully insert karo', check: s => { const t = s.db.tables[Object.keys(s.db.tables).find(k => k.toLowerCase() === 'testsessions') || '']; return !!t && t.rows.some(r => Number(r.durationMs) > 2147483647); } },
        ],
        db: SG.factoryDB(db => {
          db.tables.badSessions = {
            columns: [
              { name: 'id', type: 'INT', pk: true, autoInc: true },
              { name: 'operatorId', type: 'VARCHAR(20)' },
              { name: 'durationMs', type: 'INT' },
            ],
            indexes: [],
            rows: [{ id: 1, operatorId: 'OP-101', durationMs: 1800000 }],
          };
        }),
        responses: [
          {
            re: /^insert\s+into\s+badsessions[\s\S]*?(\d{10,})/i,
            err: true,
            out: (sim, m) => `ERROR 1264 (22003): Out of range value for column 'durationMs' at row 1\n\n   ${m[1]} > 2147483647 (INT ki max limit)\n   ≈ ${(Number(m[1]) / 86400000).toFixed(1)} din — INT sirf 24.8 din tak ke ms rakh sakta hai.\n   Yehi woh error hai jisne asli project mein session-writes rok diye the.`,
          },
        ],
        success: s => {
          const key = Object.keys(s.db.tables).find(k => k.toLowerCase() === 'testsessions');
          if (!key) return false;
          const t = s.db.tables[key];
          const col = t.columns.find(c => c.name.toLowerCase() === 'durationms');
          return !!col && /BIGINT/i.test(col.type || '')
            && t.rows.some(r => Number(r.durationMs) > 2147483647)
            && s.history.some(h => /insert\s+into\s+badsessions/i.test(h));
        },
        successText: '🎉 <b>Overflow apni aankhon se dekh liya.</b> <code>ERROR 1264</code> koi theoretical baat nahi thi — asli project mein isi ne poora session-write path rok diya tha, aur fix ek migration bani: <code>ALTER TABLE bx50Sessions MODIFY duration BIGINT;</code>. Sabak: <b>ms, bytes aur epoch ke liye pehle din se BIGINT lo</b> — jagah 4 extra bytes lagti hai, bachat ek outage ki hoti hai.',
        hints: [
          'DESCRIBE badSessions;   ← durationMs ka type dekho',
          "INSERT INTO badSessions (operatorId, durationMs) VALUES ('OP-101', 3000000000);",
          'CREATE TABLE testSessions (id INT PRIMARY KEY AUTO_INCREMENT, operatorId VARCHAR(20) NOT NULL, durationMs BIGINT);',
          "INSERT INTO testSessions (operatorId, durationMs) VALUES ('OP-101', 3000000000);",
        ],
      },
      {
        type: 'quiz',
        title: 'Data Types Quick-fire',
        questions: [
          {
            q: 'Duration milliseconds mein store karna hai. INT ya BIGINT?',
            choices: [
              'BIGINT — INT ki limit 2.1 billion ms ≈ 24.8 din, lambi session overflow kar degi',
              'INT — 2 billion bahut hota hai',
              'FLOAT — decimal bhi aa sakta hai',
              'VARCHAR — number ko text mein rakh lo',
            ],
            answer: 0,
            explain: 'Yeh asli bug tha. ms, bytes, aur epoch-ms — teeno BIGINT ke customers hain.',
          },
          {
            q: 'Product ki keemat kis type mein?',
            choices: [
              'DECIMAL(10,2) — exact arithmetic, paise ka hisaab sahi',
              'FLOAT — decimal support karta hai',
              'DOUBLE — zyada precision',
              'INT — paise ko rupaye mein round kar do',
            ],
            answer: 0,
            explain: 'FLOAT/DOUBLE <b>approximate</b> hote hain — <code>0.1+0.2 != 0.3</code>. Paisa hamesha DECIMAL (ya integer paise).',
          },
          {
            q: 'VARCHAR(50) aur TEXT mein kab kya?',
            choices: [
              'Chhota, bounded text (naam, status) = VARCHAR; sach mein lamba (notes, logs, JSON) = TEXT',
              'Hamesha TEXT — flexible hai',
              'Hamesha VARCHAR — TEXT purana hai',
              'Dono bilkul same hain',
            ],
            answer: 0,
            explain: 'TEXT alag store hota hai aur index karna mushkil — usme <code>WHERE</code>/<code>ORDER BY</code> mehnga padta hai.',
          },
          {
            q: 'Column type INT se BIGINT karna ho toh?',
            choices: [
              'Migration likho: ALTER TABLE t MODIFY col BIGINT; — badi table par yeh lock le sakta hai, isliye maintenance window mein',
              'Bas naye rows apne aap BIGINT ho jayenge',
              'Table drop karke dobara banao',
              'MySQL mein type badal hi nahi sakte',
            ],
            answer: 0,
            explain: '<code>ALTER TABLE ... MODIFY</code>. Badi table par table-rebuild hota hai — isiliye pehle se sahi type chunna sasta padta hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Data Types',
      instructions: 'Schema design ka pehla round. 🎤',
      questions: [
        {
          q: '"Paise ke liye kaunsa data type, aur kyun?"',
          choices: [
            'DECIMAL(p,s) — exact hota hai. FLOAT/DOUBLE binary approximation hain, unme 0.1+0.2 ≠ 0.3, aur yeh error paise ke hisaab mein jama hota jaata hai',
            'FLOAT — decimal point support karta hai',
            'DOUBLE — sabse zyada precision deta hai',
            'VARCHAR — formatting bhi save ho jaati hai',
          ],
          answer: 0,
          explain: 'Asli jawab "exact vs approximate" hai. Kuch teams paise ko <b>integer paise/cents</b> mein bhi rakhti hain — woh bhi sahi jawab hai.',
        },
        {
          q: 'Interviewer: "Ek column INT hai aur production mein overflow ho gaya. Kya karoge?"',
          choices: [
            'Migration se MODIFY karke BIGINT karunga — par pehle table size dekhunga, kyunki bade table par ALTER lock leta hai, toh maintenance window ya online-DDL tool use karunga',
            'Seedha prod par ALTER chala dunga, 1 second ka kaam hai',
            'Naya column banaunga aur app ko dono padhne bolunga, hamesha ke liye',
            'Purane rows delete kar dunga taaki jagah ban jaye',
          ],
          answer: 0,
          explain: 'Do baatein: <b>sahi fix</b> (MODIFY BIGINT) aur <b>operational awareness</b> (bade table par ALTER = lock/rebuild). Doosri baat seniority dikhati hai.',
        },
        {
          q: '🎛️ Interviewer: "Ek table design karke dikhao — firmware uploads ke liye."',
          terminal: {
            title: 'Interview hands-on — CREATE TABLE',
            goal: '🎛️ <b>Hands-on:</b> <code>fwUploads</code> table banao: <code>id</code> INT PRIMARY KEY AUTO_INCREMENT, <code>fileName</code> VARCHAR(255) NOT NULL, <code>sizeBytes</code> <b>BIGINT</b> (files 2GB se badi ho sakti hain!), <code>uploadedAt</code> DATETIME. Phir ek row insert karke <code>SELECT</code> se verify karo.',
            tasks: [
              { text: 'fwUploads table banao', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'fwuploads') },
              { text: 'sizeBytes BIGINT hona chahiye', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'fwuploads'); if (!k) return false; const c = s.db.tables[k].columns.find(c => c.name.toLowerCase() === 'sizebytes'); return !!c && /BIGINT/i.test(c.type || ''); } },
              { text: 'Ek row insert + SELECT se verify', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'fwuploads'); return !!k && s.db.tables[k].rows.length > 0 && s.history.some(h => /^select.*fwuploads/i.test(h)); } },
            ],
            db: SG.factoryDB(),
            success: s => {
              const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'fwuploads');
              if (!k) return false;
              const c = s.db.tables[k].columns.find(c => c.name.toLowerCase() === 'sizebytes');
              return !!c && /BIGINT/i.test(c.type || '') && s.db.tables[k].rows.length > 0
                && s.history.some(h => /^select.*fwuploads/i.test(h));
            },
            successText: '✅ Schema saaf hai. <code>sizeBytes</code> par BIGINT chunna hi woh choti si soch hai jo do saal baad ka outage bacha leti hai.',
            hints: [
              'CREATE TABLE fwUploads (id INT PRIMARY KEY AUTO_INCREMENT, fileName VARCHAR(255) NOT NULL, sizeBytes BIGINT, uploadedAt DATETIME);',
              "INSERT INTO fwUploads (fileName, sizeBytes, uploadedAt) VALUES ('bms_v3.bin', 3221225472, '2026-07-21 10:00:00');",
              'SELECT * FROM fwUploads;',
            ],
          },
        },
      ],
    },
    success: [
      'Main INT vs BIGINT ka farak aur overflow ka khatra samjhata hoon',
      'Main paise ke liye DECIMAL chunta hoon, FLOAT nahi',
      'Main VARCHAR vs TEXT aur DATETIME vs TIMESTAMP ka faisla kar sakta hoon',
      'Main CREATE TABLE sahi types aur constraints ke saath likh sakta hoon',
    ],
    homework: `<p>Overflow apne MySQL par khud dekho:</p>
      <pre>USE factory;
CREATE TABLE overflow_demo (id INT PRIMARY KEY AUTO_INCREMENT, ms INT);

INSERT INTO overflow_demo (ms) VALUES (2000000000);   -- theek
INSERT INTO overflow_demo (ms) VALUES (3000000000);   -- ERROR 1264!

-- Fix
ALTER TABLE overflow_demo MODIFY ms BIGINT;
INSERT INTO overflow_demo (ms) VALUES (3000000000);   -- ab chalega
DESCRIBE overflow_demo;

-- FLOAT ka dhokha khud dekho:
CREATE TABLE money_demo (a FLOAT, b DECIMAL(10,2));
INSERT INTO money_demo VALUES (0.1, 0.1);
SELECT a + a + a AS float_sum, b + b + b AS decimal_sum FROM money_demo;
-- float_sum mein 0.30000001 jaisa kuch dikhega!</pre>
      <p>✅ Self-check: <code>ERROR 1264</code> mila? ALTER ke baad wahi INSERT chal gaya? FLOAT ka sum 0.3 se thoda alag tha?</p>`,
    cards: [
      { front: 'INT ki limit aur uska matlab ms mein?', back: '<b>2,147,483,647</b> — milliseconds mein ≈ <b>24.8 din</b>. Isiliye durations/bytes/epoch-ms ke liye <b>BIGINT</b> lo. Asli project mein isi par migration likhni padi.' },
      { front: 'Paise ke liye kaunsa type?', back: '<b>DECIMAL(10,2)</b> — exact. <b>FLOAT/DOUBLE kabhi nahi</b> (binary approximation: 0.1+0.2 ≠ 0.3). Integer paise/cents bhi valid pattern hai.' },
      { front: 'VARCHAR vs TEXT?', back: '<b>VARCHAR(n)</b> = chhota bounded text, index-friendly — naam, status. <b>TEXT</b> = lamba (notes, logs, JSON), alag store hota hai, index/filter mehnga.' },
      { front: 'DATETIME vs TIMESTAMP?', back: '<b>DATETIME</b> = jo daala wahi mila, timezone-independent ("yeh 3 baje hua"). <b>TIMESTAMP</b> = UTC mein store, session timezone mein convert — global users ke liye.' },
      { front: 'Column ka type badalna?', back: '<code>ALTER TABLE t MODIFY col BIGINT;</code> — ek <b>migration</b> hai. Badi table par table rebuild + lock, isliye maintenance window ya online-DDL tool.' },
    ],
  },

  /* ================= LEVEL 6: Aggregates & GROUP BY ================= */
  {
    id: 'aggregates',
    icon: '📊',
    title: 'COUNT, SUM, GROUP BY — Report Banao',
    badge: 'Report Rachnakar',
    objectives: [
      '<b>COUNT / SUM / AVG / MIN / MAX</b> — poori table ka ek number',
      '<b>GROUP BY</b> — har category ka apna number',
      '<b>HAVING vs WHERE</b> — kaun kab chalta hai',
      '<b>COUNT(*) vs COUNT(col)</b> ka NULL wala farak',
    ],
    lesson: [
      `<h3>📊 Aggregate = bahut rows → ek number</h3>
       <pre>SELECT COUNT(*)      FROM bmsTester;   -- kitne tests hue
SELECT AVG(duration) FROM bx50Builds; -- average build time
SELECT MAX(duration) FROM bx50Builds; -- sabse lambi
SELECT SUM(duration) FROM bx50Sessions; -- total time</pre>
       <p>⚠️ <b><code>COUNT(*)</code> vs <code>COUNT(col)</code> — yeh interview
       mein poocha jaata hai:</b></p>
       <ul>
         <li><code>COUNT(*)</code> — <b>saari rows</b> gino</li>
         <li><code>COUNT(partNumber)</code> — sirf woh rows jinme
             <code>partNumber</code> <b>NULL nahi</b> hai</li>
         <li><code>COUNT(DISTINCT client)</code> — kitne <b>alag-alag</b> clients</li>
       </ul>
       <p>Isiliye <code>COUNT(*)</code> = 7 aur <code>COUNT(partNumber)</code> = 5
       ho sakta hai — do builds ka partNumber NULL hai.</p>`,
      `<h3>🗂️ GROUP BY — har dher ka apna hisaab</h3>
       <p>"Total kitne tests" se aage: "<b>har client ke</b> kitne tests?"</p>
       <pre>SELECT   client, COUNT(*) AS total
FROM     bmsTester
GROUP BY client;

+---------+-------+
| client  | total |
+---------+-------+
| Komatsu |     3 |
| Hitachi |     3 |
| Denyo   |     2 |
+---------+-------+</pre>
       <p><b>Sunehra niyam:</b> jo column <code>SELECT</code> mein hai aur
       aggregate ke andar nahi hai, woh <code>GROUP BY</code> mein hona chahiye.</p>
       <pre>-- ❌ galat: bx50Name kis row ka? DB ko nahi pata
SELECT client, bx50Name, COUNT(*) FROM t GROUP BY client;

-- ✅ sahi
SELECT client, COUNT(*) FROM t GROUP BY client;
-- ✅ ya dono par group karo
SELECT client, status, COUNT(*) FROM t GROUP BY client, status;</pre>`,
      `<h3>⚖️ WHERE vs HAVING — kaun kab</h3>
       <p>Dono "filter" karte hain, par alag waqt par:</p>
       <table>
         <tr><th></th><th>WHERE</th><th>HAVING</th></tr>
         <tr><td>Kya chhaan-ta hai</td><td><b>rows</b></td><td><b>groups</b></td></tr>
         <tr><td>Kab chalta hai</td><td>GROUP BY se <b>pehle</b></td><td>aggregate ke <b>baad</b></td></tr>
         <tr><td>Aggregate use kar sakta hai?</td><td>❌ nahi</td><td>✅ haan</td></tr>
       </table>
       <pre>SELECT   client, COUNT(*) AS total
FROM     bmsTester
WHERE    status = 'fail'        -- pehle: sirf fail rows lo
GROUP BY client                 -- phir: client ke dher banao
HAVING   COUNT(*) >= 2          -- aakhir mein: 2+ fail wale clients hi rakho
ORDER BY total DESC;</pre>
       <p><code>WHERE COUNT(*) >= 2</code> likhoge toh error milega — us waqt tak
       COUNT bana hi nahi hota.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka QA dashboard
       "pass rate per client" dikhata tha. Ek client ka rate hamesha <b>100%</b>
       aata tha — team khush thi. Baad mein pata chala ki query
       <code>WHERE status = 'pass' GROUP BY client</code> thi: pehle saare fail
       rows hata diye, phir "pass ka percentage" nikaala — jo hamesha 100% hi
       hoga! Sahi tarika: pehle <b>saare</b> rows lo, phir group karke pass aur
       total dono gino. Sabak: <b>WHERE se woh rows mat hatao jinhe tumhe
       ginna hi tha.</b></div>`,
    ],
    stages: [
      {
        type: 'order',
        title: 'Aggregate pipeline ka order',
        instructions: 'Database kis order mein yeh clauses chalata hai?',
        steps: [
          { text: 'FROM bmsTester — rows utha', explain: 'Source table pehle.' },
          { text: "WHERE status = 'fail' — rows chhaan", explain: 'Rows ka filter — GROUP BY se PEHLE. Yahan aggregate use nahi kar sakte.' },
          { text: 'GROUP BY client — dher banao', explain: 'Ab har client ka apna dher ban gaya.' },
          { text: 'COUNT(*) — har dher ka number nikaalo', explain: 'Aggregate har group par chalta hai.' },
          { text: 'HAVING COUNT(*) >= 2 — dher chhaan', explain: 'Groups ka filter — aggregate ke BAAD, isliye COUNT yahan chalta hai.' },
          { text: 'ORDER BY total DESC — sort karo', explain: 'Sabse aakhir mein sorting (aur LIMIT).' },
        ],
      },
      {
        type: 'hotspot',
        title: 'GROUP BY diagram par ungli rakho',
        instructions: 'Diagram mein sahi hissa click karo.',
        visual: 'aggregates',
        questions: [
          { q: 'Rows ko dher (groups) mein kaun baant-ta hai?', target: 'groupby', explain: 'GROUP BY <col> — har unique value ka apna dher.' },
          { q: 'Har dher ko ek number mein kaun badalta hai?', target: 'agg', explain: 'Aggregate function — COUNT/SUM/AVG/MIN/MAX. Har group ke liye ek row.' },
          { q: 'Groups ko chhaan-ne wala clause kaunsa hai?', target: 'having', explain: 'HAVING — aggregate ke baad chalta hai, isliye COUNT(*) yahan use ho sakta hai.' },
          { q: 'Rows ko GROUP BY se pehle kaun chhaan-ta hai?', target: 'where', explain: 'WHERE — rows ka filter. Yahan aggregate use nahi kar sakte (abhi bana hi nahi).' },
        ],
      },
      {
        type: 'fill',
        title: 'Client-wise failure report',
        instructions: 'Un clients ki report jinke 2 ya zyada test fail hue. Blanks bharo.',
        template: `SELECT   client, {0} AS failures
FROM     bmsTester
{1}    status = 'fail'
{2} client
{3}   COUNT(*) >= 2
ORDER BY failures DESC;`,
        tokens: ['COUNT(*)', 'WHERE', 'GROUP BY', 'HAVING', 'SUM(*)', 'ORDER BY', 'DISTINCT', 'LIMIT'],
        blanks: [
          { answer: 'COUNT(*)', explain: '<code>COUNT(*)</code> = group ki saari rows. (<code>COUNT(col)</code> hota toh NULL wali rows chhoot jaatin.)' },
          { answer: 'WHERE', explain: '<code>WHERE</code> rows chhaan-ta hai — <b>GROUP BY se pehle</b>. Yahan aggregate nahi likh sakte.' },
          { answer: 'GROUP BY', explain: '<code>GROUP BY client</code> — har client ka apna dher. SELECT ka non-aggregate column yahan hona chahiye.' },
          { answer: 'HAVING', explain: '<code>HAVING</code> = <b>groups</b> ka filter, aggregate ke baad chalta hai. Isiliye <code>COUNT(*)</code> yahan valid hai, <code>WHERE</code> mein nahi.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Aaj ki QA report',
        instructions: 'Manager ko teen numbers chahiye — SQL se nikaalo.',
        goal: 'QA meeting 10 minute mein hai. <b>(1)</b> Total kitne tests hue? (<code>COUNT(*)</code> on <code>bmsTester</code>) <b>(2)</b> Har client ke kitne tests — <code>client</code> par <code>GROUP BY</code>, count ke DESC order mein. <b>(3)</b> Sirf woh clients jinke <b>2 ya zyada</b> tests <b>fail</b> hue — <code>WHERE status = \'fail\'</code> + <code>GROUP BY</code> + <code>HAVING COUNT(*) >= 2</code>.',
        tasks: [
          { text: 'Total tests — COUNT(*)', check: s => s.history.some(h => /count\s*\(\s*\*\s*\)/i.test(h) && /from\s+bmstester/i.test(h)) },
          { text: 'Per-client count (GROUP BY client)', check: s => s.history.some(h => /group\s+by\s+client/i.test(h)) },
          { text: "Fail wale clients — WHERE + HAVING", check: s => s.history.some(h => /where.*fail/i.test(h) && /having/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /count\s*\(\s*\*\s*\)/i.test(h) && /from\s+bmstester/i.test(h))
          && s.history.some(h => /group\s+by\s+client/i.test(h))
          && s.history.some(h => /where.*fail/i.test(h) && /having/i.test(h)),
        successText: '🎉 <b>Report tayyar.</b> Dhyaan do ki teesri query mein <code>WHERE</code> aur <code>HAVING</code> dono the — aur dono ka kaam alag tha: WHERE ne pehle sirf fail rows chune, HAVING ne baad mein chhote groups hataye. Ek aur cheez try karo: <code>SELECT COUNT(*), COUNT(partNumber) FROM bx50Builds;</code> — dono numbers alag aayenge, kyunki <code>COUNT(col)</code> NULL nahi ginta.',
        hints: [
          'SELECT COUNT(*) AS total FROM bmsTester;',
          'SELECT client, COUNT(*) AS total FROM bmsTester GROUP BY client ORDER BY total DESC;',
          "SELECT client, COUNT(*) AS failures FROM bmsTester WHERE status = 'fail' GROUP BY client HAVING COUNT(*) >= 2;",
        ],
      },
      {
        type: 'quiz',
        title: 'Aggregate Quick-fire',
        questions: [
          {
            q: '<code>COUNT(*)</code> aur <code>COUNT(partNumber)</code> alag number kyun de sakte hain?',
            choices: [
              'COUNT(*) saari rows ginta hai; COUNT(col) sirf woh rows jinme woh column NULL nahi hai',
              'Dono hamesha same hote hain',
              'COUNT(col) tez hota hai isliye kam ginta hai',
              'COUNT(*) sirf pehli 100 rows ginta hai',
            ],
            answer: 0,
            explain: 'Yeh NULL ka ek aur asar hai. <code>COUNT(DISTINCT col)</code> ek teesra jawab de sakta hai — alag values ki ginti.',
          },
          {
            q: 'Yeh query error kyun degi? <code>SELECT client, COUNT(*) FROM t WHERE COUNT(*) > 2 GROUP BY client;</code>',
            choices: [
              'WHERE, GROUP BY se pehle chalta hai — us waqt tak COUNT(*) bana hi nahi hota. HAVING use karo',
              'COUNT(*) ko alias chahiye',
              'GROUP BY, WHERE se pehle likhna chahiye',
              'client column reserved hai',
            ],
            answer: 0,
            explain: 'Rows ka filter = WHERE (pehle). Groups ka filter = HAVING (baad mein). Yeh execution order ka seedha nateeja hai.',
          },
          {
            q: '"Pass rate per client" nikalne mein sabse badi galti kya hai?',
            choices: [
              "WHERE status='pass' laga dena — phir har client ka rate hamesha 100% aayega kyunki fail rows toh hata hi diye",
              'GROUP BY use karna',
              'COUNT(*) use karna',
              'ORDER BY lagana',
            ],
            answer: 0,
            explain: 'Asli dashboard mein yehi bug tha. Rate = (pass count) / (total count) — dono chahiye, isliye fail rows ko hataana nahi hai.',
          },
          {
            q: 'SELECT mein ek non-aggregate column hai. Usko kahan hona chahiye?',
            choices: [
              'GROUP BY mein — warna DB ko nahi pata ki group ki kaunsi row ki value dikhaye',
              'ORDER BY mein',
              'WHERE mein',
              'Kahin nahi, DB apne aap sambhal leta hai',
            ],
            answer: 0,
            explain: 'Sunehra niyam: SELECT ka har non-aggregate column GROUP BY mein hona chahiye. (MySQL purane versions mein yeh chup-chaap chal jaata tha — aur galat jawab deta tha.)',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Aggregates',
      instructions: 'Reporting round. 🎤',
      questions: [
        {
          q: '"WHERE aur HAVING mein farak?"',
          choices: [
            'WHERE <b>rows</b> chhaan-ta hai GROUP BY se pehle (aggregate use nahi kar sakta); HAVING <b>groups</b> chhaan-ta hai aggregate ke baad (COUNT/SUM use kar sakta hai)',
            'Dono same hain, HAVING naya syntax hai',
            'WHERE sirf numbers par, HAVING sirf text par',
            'HAVING pehle chalta hai, WHERE baad mein',
          ],
          answer: 0,
          explain: 'Do shabd bolna: <b>kya</b> (rows vs groups) aur <b>kab</b> (GROUP BY se pehle vs baad). Bonus: dono ek hi query mein aa sakte hain aur aksar aate hain.',
        },
        {
          q: 'Interviewer: "COUNT(*), COUNT(col), COUNT(DISTINCT col) — teen alag jawab kab denge?"',
          choices: [
            'Table mein us column ke kuch NULL hon aur kuch values repeat hon — tab teeno alag: total rows > non-null rows > unique values',
            'Kabhi nahi, teeno same hote hain',
            'Sirf tab jab table khaali ho',
            'Sirf tab jab index na ho',
          ],
          answer: 0,
          explain: 'Ek line ka jawab: <code>COUNT(*)</code> rows, <code>COUNT(col)</code> non-NULL, <code>COUNT(DISTINCT col)</code> unique non-NULL.',
        },
        {
          q: '🎛️ Interviewer: "Build report banao — live."',
          terminal: {
            title: 'Interview hands-on — GROUP BY',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>bx50Builds</code> se har <code>type</code> (Gen3/Gen4) ka count aur average duration dikhao — <code>GROUP BY type</code>. <b>(2)</b> <code>bx50Data</code> se har <code>customerLocation</code> ke devices gino, sabse zyada wala upar. <b>(3)</b> <code>COUNT(*)</code> aur <code>COUNT(partNumber)</code> ek saath chala ke dekho ki NULL kitna farak daalta hai.',
            tasks: [
              { text: 'Type-wise count + AVG(duration)', check: s => s.history.some(h => /group\s+by\s+type/i.test(h) && /avg\s*\(/i.test(h)) },
              { text: 'Location-wise device count (DESC)', check: s => s.history.some(h => /group\s+by\s+customerlocation/i.test(h)) },
              { text: 'COUNT(*) vs COUNT(partNumber)', check: s => s.history.some(h => /count\s*\(\s*\*\s*\)/i.test(h) && /count\s*\(\s*partnumber\s*\)/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /group\s+by\s+type/i.test(h) && /avg\s*\(/i.test(h))
              && s.history.some(h => /group\s+by\s+customerlocation/i.test(h))
              && s.history.some(h => /count\s*\(\s*\*\s*\)/i.test(h) && /count\s*\(\s*partnumber\s*\)/i.test(h)),
            successText: '✅ Teesri query ne sabse bada sabak diya: <code>COUNT(*)</code> = 7 par <code>COUNT(partNumber)</code> = 5 — do builds ka partNumber NULL hai. Aggregate NULL ko chup-chaap chhod deta hai.',
            hints: [
              'SELECT type, COUNT(*) AS builds, ROUND(AVG(duration), 0) AS avg_ms FROM bx50Builds GROUP BY type;',
              'SELECT customerLocation, COUNT(*) AS devices FROM bx50Data GROUP BY customerLocation ORDER BY devices DESC;',
              'SELECT COUNT(*), COUNT(partNumber) FROM bx50Builds;',
            ],
          },
        },
      ],
    },
    success: [
      'Main COUNT/SUM/AVG/MIN/MAX se poori table ka number nikaal sakta hoon',
      'Main GROUP BY se per-category report bana sakta hoon',
      'Main WHERE vs HAVING ka farak aur unka order bata sakta hoon',
      'Main COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col) samajhta hoon',
    ],
    homework: `<p>Apne MySQL par report banao:</p>
      <pre>USE factory;
SELECT COUNT(*) FROM operators;
SELECT shift, COUNT(*) AS logon FROM operators GROUP BY shift;

-- NULL ka asar khud dekho
INSERT INTO operators (opId, name, shift) VALUES ('OP-777','No Shift User', NULL);
SELECT COUNT(*) AS rows_total, COUNT(shift) AS shift_bhara FROM operators;
-- dono alag aayenge!

-- WHERE vs HAVING
SELECT shift, COUNT(*) AS c FROM operators GROUP BY shift HAVING COUNT(*) >= 2;
SELECT shift, COUNT(*) AS c FROM operators WHERE COUNT(*) >= 2 GROUP BY shift;  -- ERROR!

-- Sunehra niyam todo aur error padho:
SELECT shift, name, COUNT(*) FROM operators GROUP BY shift;</pre>
      <p>✅ Self-check: <code>COUNT(*)</code> aur <code>COUNT(shift)</code> ka farak dikha? WHERE wali query ne "Invalid use of group function" diya?</p>`,
    cards: [
      { front: 'WHERE vs HAVING?', back: '<b>WHERE</b> = rows ka filter, GROUP BY se <b>pehle</b>, aggregate use nahi kar sakta. <b>HAVING</b> = groups ka filter, aggregate ke <b>baad</b>, COUNT/SUM use kar sakta hai.' },
      { front: 'COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)?', back: '<code>COUNT(*)</code> = saari rows. <code>COUNT(col)</code> = sirf non-NULL. <code>COUNT(DISTINCT col)</code> = unique non-NULL values.' },
      { front: 'GROUP BY ka sunehra niyam?', back: 'SELECT ka har <b>non-aggregate</b> column <b>GROUP BY mein hona chahiye</b> — warna DB ko nahi pata group ki kaunsi row dikhaye.' },
      { front: '"Pass rate per client" ki classic galti?', back: '<code>WHERE status=\'pass\'</code> laga dena — phir rate hamesha 100%. <b>Pehle saare rows lo</b>, phir group mein pass aur total dono gino.' },
      { front: 'Aggregate pipeline ka order?', back: 'FROM → <b>WHERE</b> (rows) → <b>GROUP BY</b> (dher) → <b>aggregate</b> → <b>HAVING</b> (groups) → SELECT → ORDER BY → LIMIT.' },
    ],
  },

  /* ================= LEVEL 7: CASE WHEN ================= */
  {
    id: 'casewhen',
    icon: '🔀',
    title: 'CASE WHEN — SQL ka If-Else',
    badge: 'Shart Ka Shilpi',
    objectives: [
      '<b>CASE WHEN ... THEN ... ELSE ... END</b> — row ke andar if-else',
      '<b>Conditional aggregation</b> — <code>SUM(CASE WHEN ...)</code> ka jaadu',
      '<b>Pass rate</b> sahi tarike se nikalna (woh bug jo Level 6 mein mila tha)',
      '<b>Pivot</b> — rows ko columns mein badalna',
    ],
    lesson: [
      `<h3>🔀 CASE = SQL ka if-else</h3>
       <p>Har row ke liye ek shart lagao aur nayi value banao:</p>
       <pre>SELECT bx50Name, status,
       CASE
         WHEN status = 'Provisioned' THEN '✅ ready'
         WHEN status = 'Error'       THEN '🚨 dekho'
         ELSE '⏳ chal raha hai'
       END AS halat
FROM   bx50Data;</pre>
       <p>Rules:</p>
       <ul>
         <li>Upar se neeche — <b>pehla</b> matching WHEN jeet-ta hai</li>
         <li><code>ELSE</code> na do toh match na hone par <b>NULL</b> milta hai</li>
         <li><code>END</code> lagana zaroori hai (yeh sabse common syntax error hai)</li>
       </ul>
       <p>Chhota roop bhi hai jab ek hi column ko compare karna ho:</p>
       <pre>CASE bx50Status
  WHEN 4 THEN 'Provisioned'
  WHEN 2 THEN 'Building'
  WHEN -1 THEN 'Error'
  ELSE 'unknown'
END</pre>`,
      `<h3>✨ Conditional aggregation — asli jaadu</h3>
       <p>Yeh woh technique hai jo CASE ko zaroori banati hai. Yaad hai Level 6
       ka bug — "pass rate hamesha 100%"? Uska asli ilaaj yeh hai:</p>
       <pre>SELECT client,
       COUNT(*)                                        AS total,
       SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
       SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS failed
FROM   bmsTester
GROUP BY client;</pre>
       <p>Samjho yeh kaam kaise karta hai: har row ke liye CASE <b>1 ya 0</b>
       banata hai, aur <code>SUM</code> un 1s ko jod deta hai. Matlab
       "<b>sirf woh rows gino jo shart poori karti hain</b>" — <b>aur baaki rows
       phir bhi table mein bachi rehti hain</b>, isliye <code>COUNT(*)</code>
       sahi total deta hai.</p>
       <p>Ab pass rate:</p>
       <pre>SELECT client,
       ROUND(100.0 * SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END)
             / COUNT(*), 1) AS pass_rate
FROM   bmsTester
GROUP BY client;</pre>
       <p>💡 <b>WHERE rows hata deta hai; CASE unhe rakh ke sirf ginti badalta
       hai.</b> Isiliye har "X ka percentage" wala sawal CASE maangta hai.
       <code>100.0</code> likhna zaroori hai (<code>100</code> nahi) — warna
       integer division 0 de sakta hai.</p>`,
      `<h3>🔄 Pivot — rows ko columns banao</h3>
       <p>Manager ko yeh chahiye: har operator ki row, aur har client ka count
       alag column mein. Normal <code>GROUP BY</code> se yeh rows mein aata hai,
       columns mein nahi. CASE se pivot ho jaata hai:</p>
       <pre>SELECT operatorId,
       SUM(CASE WHEN client = 'Komatsu' THEN 1 ELSE 0 END) AS komatsu,
       SUM(CASE WHEN client = 'Hitachi' THEN 1 ELSE 0 END) AS hitachi,
       SUM(CASE WHEN client = 'Denyo'   THEN 1 ELSE 0 END) AS denyo
FROM   bmsTester
GROUP BY operatorId;</pre>
       <p><code>COUNT(CASE WHEN ... THEN 1 END)</code> bhi chalta hai —
       dhyaan do ki wahan <code>ELSE</code> nahi hai, kyunki
       <code>COUNT</code> NULL nahi ginta. Dono tareeke sahi hain;
       <code>SUM(... 1 ELSE 0)</code> padhne mein saaf lagta hai.</p>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ka QA dashboard
       teen alag queries chalata tha — ek total ke liye, ek pass ke liye, ek
       fail ke liye — aur phir <b>app mein</b> unhe jodta tha. Ek din "total"
       wali query mein <code>WHERE active = 1</code> add hua par baaki do mein
       nahi. Ab pass + fail, total se <b>zyada</b> ho gaya, aur dashboard ne
       "112% pass rate" dikhaya. Teeno queries ko ek
       <code>SUM(CASE WHEN ...)</code> wali query mein merge kiya —
       ab teeno numbers <b>ek hi rows ke set se</b> aate hain, isliye woh kabhi
       aapas mein contradict nahi kar sakte. <b>Sabak: ek hi report ke numbers
       ek hi query se nikaalo.</b></div>`,
    ],
    stages: [
      {
        type: 'hotspot',
        title: 'CASE diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'casewhen',
        questions: [
          { q: 'Sirf pass wali rows ginne ka tarika (bina WHERE lagaye)?', target: 'sumcase', explain: "SUM(CASE WHEN status='pass' THEN 1 ELSE 0 END) — CASE 1/0 banata hai, SUM jod deta hai." },
          { q: 'Yeh tarika pass-rate ko hamesha 100% kyun bana deta hai?', target: 'whereway', explain: "WHERE status='pass' ne fail rows hata di — ab denominator mein bhi sirf pass hain." },
          { q: 'Row ke andar if-else likhne wala keyword?', target: 'case', explain: 'CASE WHEN cond THEN val ELSE val END — har row ke liye ek value.' },
          { q: 'Sahi pass-rate formula kahan hai?', target: 'rate', explain: '100.0 * SUM(CASE WHEN pass THEN 1 ELSE 0 END) / COUNT(*) — numerator aur denominator dono same rows se.' },
        ],
      },
      {
        type: 'fill',
        title: 'Pass rate query likho',
        instructions: 'Har client ka total, pass, aur pass-rate. Blanks bharo.',
        template: `SELECT client,
       COUNT(*) AS total,
       {0}(CASE {1} status = 'pass' {2} 1 ELSE 0 {3}) AS passed,
       ROUND(100.0 * SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END)
             / COUNT(*), 1) AS pass_rate
FROM   bmsTester
GROUP BY client
ORDER BY pass_rate DESC;`,
        tokens: ['SUM', 'WHEN', 'THEN', 'END', 'COUNT', 'IF', 'ELSE', 'STOP'],
        blanks: [
          { answer: 'SUM', explain: '<code>SUM</code> un 1s ko jod deta hai jo CASE ne banaye. (<code>COUNT(CASE WHEN … THEN 1 END)</code> bhi chalta hai — bina ELSE ke, kyunki COUNT NULL nahi ginta.)' },
          { answer: 'WHEN', explain: '<code>CASE WHEN &lt;condition&gt; THEN &lt;value&gt;</code>. Kai WHEN ho sakte hain — pehla match jeet-ta hai.' },
          { answer: 'THEN', explain: 'Shart sach hone par yeh value milti hai. Yahan <code>1</code>, taaki SUM use gin sake.' },
          { answer: 'END', explain: '<code>END</code> CASE ko band karta hai — <b>bhoolna sabse common syntax error hai</b>.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: 112% pass rate ka bug theek karo',
        instructions: 'Pehle galat tarika dekho, phir CASE se sahi report banao.',
        goal: 'QA dashboard "112% pass rate" dikha raha tha. <b>(1)</b> Galat tarika dekho: <code>SELECT client, COUNT(*) FROM bmsTester WHERE status = \'pass\' GROUP BY client;</code> — yeh sirf pass ginta hai, total nahi (isliye rate hamesha 100%). <b>(2)</b> Ab CASE se ek hi query mein dono: har client ka <code>COUNT(*) AS total</code> aur <code>SUM(CASE WHEN status = \'pass\' THEN 1 ELSE 0 END) AS passed</code>, <code>GROUP BY client</code>. <b>(3)</b> Ab pass rate nikaalo — <code>ROUND(100.0 * SUM(CASE ...) / COUNT(*), 1) AS pass_rate</code>. <b>(4)</b> Ek simple CASE bhi chala ke dekho: <code>bx50Data</code> se <code>bx50Name</code> ke saath <code>CASE WHEN ip IS NULL THEN \'no-ip\' ELSE ip END</code>. <b>(5)</b> Pivot: har <code>operatorId</code> ke liye Komatsu aur Hitachi ke counts alag columns mein.',
        tasks: [
          { text: 'Galat tarika dekho (WHERE pass)', check: s => s.history.some(h => /where\s+status\s*=\s*'pass'/i.test(h) && /group\s+by/i.test(h)) },
          { text: 'CASE se total + passed ek query mein', check: s => s.history.some(h => /sum\s*\(\s*case\s+when/i.test(h) && /count\s*\(\s*\*\s*\)/i.test(h) && /group\s+by\s+client/i.test(h)) },
          { text: 'pass_rate nikaalo (ROUND + CASE)', check: s => s.history.some(h => /round\s*\(/i.test(h) && /case\s+when/i.test(h) && /100/.test(h)) },
          { text: 'Simple CASE — ip NULL ko label do', check: s => s.history.some(h => /case\s+when\s+ip\s+is\s+null/i.test(h)) },
          { text: 'Pivot — client-wise columns', check: s => s.history.some(h => (h.match(/case\s+when\s+client/gi) || []).length >= 2) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /sum\s*\(\s*case\s+when/i.test(h) && /count\s*\(\s*\*\s*\)/i.test(h) && /group\s+by\s+client/i.test(h))
          && s.history.some(h => /round\s*\(/i.test(h) && /case\s+when/i.test(h) && /100/.test(h))
          && s.history.some(h => /case\s+when\s+ip\s+is\s+null/i.test(h))
          && s.history.some(h => (h.match(/case\s+when\s+client/gi) || []).length >= 2),
        successText: '🎉 <b>Ek query, teen sach.</b> Dekho kya hua: <code>WHERE status = \'pass\'</code> wali query ne fail rows <b>hata</b> di, isliye woh kabhi pass-rate nahi bata sakti thi. <code>SUM(CASE WHEN ...)</code> ne wahi rows <b>rakhi</b> aur sirf ginti badli — ab <code>total</code>, <code>passed</code> aur <code>pass_rate</code> teeno <b>ek hi rows ke set se</b> aate hain, isliye woh aapas mein contradict kar hi nahi sakte. Yehi woh fix tha jisne "112%" wala dashboard theek kiya. Aur pivot ne dikha diya ki CASE se tum <b>rows ko columns</b> bhi bana sakte ho.',
        hints: [
          "SELECT client, COUNT(*) FROM bmsTester WHERE status = 'pass' GROUP BY client;   ← galat tarika",
          "SELECT client, COUNT(*) AS total, SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed FROM bmsTester GROUP BY client;",
          "SELECT client, ROUND(100.0 * SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pass_rate FROM bmsTester GROUP BY client;",
          "SELECT bx50Name, CASE WHEN ip IS NULL THEN 'no-ip' ELSE ip END AS ip_status FROM bx50Data;",
          "SELECT operatorId, SUM(CASE WHEN client = 'Komatsu' THEN 1 ELSE 0 END) AS komatsu, SUM(CASE WHEN client = 'Hitachi' THEN 1 ELSE 0 END) AS hitachi FROM bmsTester GROUP BY operatorId;",
        ],
      },
      {
        type: 'quiz',
        title: 'CASE Quick-fire',
        questions: [
          {
            q: 'CASE mein koi WHEN match nahi hua aur ELSE bhi nahi hai. Kya milta hai?',
            choices: [
              'NULL',
              '0',
              'Empty string',
              'Error',
            ],
            answer: 0,
            explain: 'ELSE na ho toh default <code>NULL</code> hai. Yeh chup-chaap NULL banata hai — aggregate mein woh chhoot jaata hai.',
          },
          {
            q: '"Har client ka pass percentage" — sahi approach?',
            choices: [
              "SUM(CASE WHEN status='pass' THEN 1 ELSE 0 END) / COUNT(*) — saari rows rakho, sirf ginti badlo",
              "WHERE status='pass' GROUP BY client",
              'Do alag queries chala ke app mein divide karo',
              'COUNT(status) / COUNT(*)',
            ],
            answer: 0,
            explain: 'WHERE fail rows hata deta hai (rate hamesha 100%). Do queries ka nuksaan asli incident tha — filters alag ho gaye aur 112% aa gaya.',
          },
          {
            q: '<code>100 * 2 / 3</code> aur <code>100.0 * 2 / 3</code> — farak?',
            choices: [
              'Pehle mein integer division ka khatra hai; 100.0 likhne se decimal result milta hai',
              'Dono same hain',
              'Doosra error dega',
              'Pehla tez hai',
            ],
            answer: 0,
            explain: 'Percentage nikalte waqt hamesha <code>100.0</code> likho — warna kuch DBs mein 0 ya truncated value milti hai.',
          },
          {
            q: 'Pivot (rows → columns) kaise karte hain?',
            choices: [
              'Har target column ke liye ek SUM(CASE WHEN ... THEN 1 ELSE 0 END), aur GROUP BY baaki column par',
              'PIVOT keyword se',
              'ORDER BY se',
              'UNION se',
            ],
            answer: 0,
            explain: 'MySQL mein PIVOT keyword nahi hota — conditional aggregation hi standard tarika hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — CASE WHEN',
      instructions: 'Reporting round — yeh sawal bahut aata hai. 🎤',
      questions: [
        {
          q: '"Ek hi query mein total, pass aur fail count kaise nikaaloge?"',
          choices: [
            'COUNT(*) ke saath SUM(CASE WHEN status=\'pass\' THEN 1 ELSE 0 END) aur SUM(CASE WHEN status=\'fail\' THEN 1 ELSE 0 END) — teeno ek hi rows ke set se',
            'Teen alag queries chalaunga',
            'WHERE se filter karke teen baar',
            'GROUP BY status se, aur app mein jod dunga',
          ],
          answer: 0,
          explain: 'Bonus line: "ek hi query se nikaalne se numbers aapas mein contradict nahi kar sakte" — yeh exact incident tha (112% pass rate).',
        },
        {
          q: 'Interviewer: "Tumhara dashboard 112% pass rate dikha raha hai. Kya hua hoga?"',
          choices: [
            'Numerator aur denominator alag queries se aa rahe honge jinke filters alag ho gaye — main dono ko ek hi query mein CASE se nikaalunga',
            'Rounding error hoga',
            'Duplicate rows hongi',
            'Cache purana hoga',
          ],
          answer: 0,
          explain: '"Do numbers do alag jagah se aa rahe hain" — yeh diagnosis instinct interviewer ko turant dikhta hai.',
        },
        {
          q: '🎛️ Interviewer: "Ek summary report likh ke dikhao."',
          terminal: {
            title: 'Interview hands-on — CASE',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>bx50Data</code> se ek report: har <code>customerLocation</code> ke liye total devices aur kitne <code>\'Provisioned\'</code> hain (CASE se). <b>(2)</b> Us report mein provisioned percentage bhi jodo. <b>(3)</b> <code>bx50Builds</code> par ek CASE label banao: <code>duration</code> 5000000 se zyada ho toh <code>\'long\'</code>, warna <code>\'short\'</code>.',
            tasks: [
              { text: 'Location-wise total + provisioned (CASE)', check: s => s.history.some(h => /sum\s*\(\s*case\s+when/i.test(h) && /group\s+by\s+customerlocation/i.test(h)) },
              { text: 'Percentage column jodo', check: s => s.history.some(h => /round\s*\(/i.test(h) && /case\s+when/i.test(h) && /customerlocation/i.test(h)) },
              { text: 'long/short label (CASE on duration)', check: s => s.history.some(h => /case\s+when\s+duration/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /sum\s*\(\s*case\s+when/i.test(h) && /group\s+by\s+customerlocation/i.test(h))
              && s.history.some(h => /round\s*\(/i.test(h) && /case\s+when/i.test(h) && /customerlocation/i.test(h))
              && s.history.some(h => /case\s+when\s+duration/i.test(h)),
            successText: '✅ Teeno CASE ke teen roop the: <b>conditional count</b>, <b>percentage</b>, aur <b>labelling</b>. Yeh teen milkar 90% reporting queries cover kar dete hain.',
            hints: [
              "SELECT customerLocation, COUNT(*) AS total, SUM(CASE WHEN status = 'Provisioned' THEN 1 ELSE 0 END) AS ready FROM bx50Data GROUP BY customerLocation;",
              "SELECT customerLocation, COUNT(*) AS total, ROUND(100.0 * SUM(CASE WHEN status = 'Provisioned' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct FROM bx50Data GROUP BY customerLocation;",
              "SELECT buildNum, duration, CASE WHEN duration > 5000000 THEN 'long' ELSE 'short' END AS len FROM bx50Builds;",
            ],
          },
        },
      ],
    },
    success: [
      'Main CASE WHEN ... THEN ... ELSE ... END likh sakta hoon',
      'Main SUM(CASE WHEN ...) se conditional aggregation kar sakta hoon',
      'Main pass-rate/percentage sahi tarike se nikaal sakta hoon',
      'Main CASE se pivot (rows → columns) bana sakta hoon',
    ],
    homework: `<p>CASE ke teeno roop apne MySQL par:</p>
      <pre>USE factory;

-- 1. Labelling
SELECT opId, name, shift,
       CASE shift WHEN 'day' THEN '☀️' WHEN 'night' THEN '🌙' ELSE '?' END AS icon
FROM operators;

-- 2. Conditional aggregation
SELECT shift,
       COUNT(*) AS total,
       SUM(CASE WHEN station LIKE 'BMS%' THEN 1 ELSE 0 END) AS bms_line
FROM operators GROUP BY shift;

-- 3. Percentage (100.0 dhyaan se!)
SELECT shift,
       ROUND(100.0 * SUM(CASE WHEN station LIKE 'BMS%' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct
FROM operators GROUP BY shift;

-- Integer division ka jaal khud dekho:
SELECT 100 * 1 / 3 AS int_ver, 100.0 * 1 / 3 AS dec_ver;

-- 4. ELSE bhool ke dekho — NULL aayega
SELECT opId, CASE WHEN shift = 'day' THEN 'DAY' END AS maybe_null FROM operators;</pre>
      <p>✅ Self-check: ELSE ke bina night-shift walon ko NULL mila? <code>100</code> vs <code>100.0</code> ka farak dikha?</p>`,
    cards: [
      { front: 'CASE ka syntax?', back: '<code>CASE WHEN cond THEN val [WHEN …] [ELSE val] END</code>. Pehla matching WHEN jeet-ta hai; ELSE na ho toh <b>NULL</b>. <code>END</code> bhoolna sabse common error hai.' },
      { front: 'Conditional aggregation?', back: '<code>SUM(CASE WHEN x THEN 1 ELSE 0 END)</code> = "sirf woh rows gino jo shart poori karti hain" — <b>baaki rows table mein bachi rehti hain</b>, isliye <code>COUNT(*)</code> sahi total deta hai.' },
      { front: 'Pass rate sahi tarika?', back: '<code>ROUND(100.0 * SUM(CASE WHEN status=\'pass\' THEN 1 ELSE 0 END) / COUNT(*), 1)</code>. <b>WHERE se mat karo</b> — woh fail rows hata deta hai aur rate hamesha 100% aata hai.' },
      { front: 'WHERE vs CASE?', back: '<b>WHERE rows hata deta hai; CASE unhe rakh ke sirf ginti badalta hai.</b> Har "X ka percentage" wala sawal CASE maangta hai.' },
      { front: 'Pivot (rows → columns)?', back: 'Har target column ke liye ek <code>SUM(CASE WHEN col = \'val\' THEN 1 ELSE 0 END) AS val</code>, aur baaki column par <code>GROUP BY</code>. MySQL mein PIVOT keyword nahi hota.' },
    ],
  },

  /* ================= LEVEL 8: String & Date Functions ================= */
  {
    id: 'strdate',
    icon: '🔤',
    title: 'String & Date Functions — Data ko Shakal Do',
    badge: 'Function Fakir',
    objectives: [
      '<b>CONCAT, UPPER, LENGTH, SUBSTRING, REPLACE</b> — text ka kaam',
      '<b>YEAR, MONTH, DATE, DATEDIFF, DATE_FORMAT</b> — time ka kaam',
      '<b>COALESCE / IFNULL / NULLIF</b> — NULL ko sambhalna',
      'Function <b>WHERE mein kyun mehnga</b> padta hai',
    ],
    lesson: [
      `<h3>🔤 String functions — roz kaam aate hain</h3>
       <pre>SELECT CONCAT(name, ' (', shift, ')')  AS label,      -- jodo
       UPPER(name)                     AS shout,
       LENGTH(name)                    AS len,
       LEFT(opId, 2)                   AS prefix,       -- 'OP'
       SUBSTRING(opId, 4, 3)           AS num,          -- '101'
       REPLACE(station, 'line-', 'L')  AS short_station
FROM   operators;</pre>
       <p>⚠️ <b>CONCAT + NULL ka jaal:</b> agar koi bhi argument NULL hai toh
       poora result <b>NULL</b> ho jaata hai:</p>
       <pre>CONCAT('Device: ', NULL)          -- NULL 😱
CONCAT('Device: ', COALESCE(ip, 'no-ip'))   -- ✅ safe
CONCAT_WS(' — ', a, b, c)         -- NULL args ko skip kar deta hai</pre>`,
      `<h3>📅 Date functions</h3>
       <pre>SELECT buildNum, startDate,
       YEAR(startDate)                        AS saal,
       MONTH(startDate)                       AS mahina,
       DATE(startDate)                        AS sirf_din,
       DATEDIFF(NOW(), startDate)             AS kitne_din_purana,
       DATE_FORMAT(startDate, '%Y-%m')        AS month_bucket
FROM   bx50Builds;</pre>
       <p><code>DATE_FORMAT</code> reporting ka favourite hai —
       <code>'%Y-%m'</code> se month-wise grouping ho jaati hai:</p>
       <pre>SELECT DATE_FORMAT(startDate, '%Y-%m') AS mahina, COUNT(*) AS builds
FROM   bx50Builds
GROUP BY DATE_FORMAT(startDate, '%Y-%m')
ORDER BY mahina;</pre>`,
      `<h3>🕳️ COALESCE — NULL ka sabse kaam ka ilaaj</h3>
       <pre>COALESCE(a, b, c, 'default')   -- pehla non-NULL jo mile
IFNULL(x, 0)                   -- do arguments wala chhota roop
NULLIF(a, b)                   -- a aur b barabar hain? toh NULL do</pre>
       <p><code>NULLIF</code> ka sabse kaam ka use — <b>divide by zero se
       bachna</b>:</p>
       <pre>-- ❌ total 0 hua toh error/NULL
SELECT passed / total FROM report;
-- ✅ safe
SELECT passed / NULLIF(total, 0) FROM report;</pre>
       <p>💡 <b>Function SELECT mein lagao — koi cost nahi.</b> Par
       <code>WHERE</code> mein lagate hi index chala jaata hai (Level 14 wala
       sabak):</p>
       <pre>❌ WHERE YEAR(startDate) = 2026
✅ WHERE startDate >= '2026-01-01' AND startDate < '2027-01-01'</pre>
       <div class="war-story"><b>⚡ Real incident:</b> Factory ke ADC tester mein
       <code>dateCode</code> ek 4-character string tha — <code>'2624'</code>
       matlab <b>saal 26, hafta 24</b>. Ek report banani thi "har mahine ke
       kitne boards" — developer ne <code>LEFT(dateCode, 2)</code> se saal aur
       <code>RIGHT(dateCode, 2)</code> se hafta nikaala, phir hafte ko 4 se
       divide karke mahina "nikaal liya". Hafta 53 wale boards mahina 14 mein
       chale gaye, aur December ki report khaali aayi. Asli fix: ek proper
       <code>DATE</code> column add karna (migration), aur
       <code>dateCode</code> ko sirf display ke liye rakhna. <b>Sabak: date ko
       string mein encode karoge toh har report mein use dobara parse karna
       padega — aur ek din koi galat parse karega.</b></div>`,
    ],
    stages: [
      {
        type: 'match',
        title: 'Function ko uske kaam se jodo',
        instructions: 'Har function ka sahi kaam chuno.',
        pairs: [
          { left: '🔗 CONCAT(a, b)', right: 'Strings jodo — par koi NULL hua toh poora NULL', explain: 'Isliye NULL-able columns par pehle COALESCE lagao, ya CONCAT_WS use karo.' },
          { left: '🕳️ COALESCE(a, b, c)', right: 'Pehla non-NULL value jo mile', explain: 'NULL ko default se badalne ka standard tarika. IFNULL chhota do-argument roop hai.' },
          { left: '➗ NULLIF(a, b)', right: 'Barabar hon toh NULL — divide-by-zero se bachao', explain: '<code>x / NULLIF(total, 0)</code> — total 0 hua toh NULL milta hai, error nahi.' },
          { left: '📅 DATEDIFF(a, b)', right: 'Do dates ke beech kitne din', explain: 'Age, SLA, "kitna purana hai" — sab isse.' },
          { left: '🗓️ DATE_FORMAT(d, \'%Y-%m\')', right: 'Date ko month-bucket string banao', explain: 'Month-wise grouping ka standard tarika: GROUP BY DATE_FORMAT(d, \'%Y-%m\').' },
          { left: '✂️ SUBSTRING(s, 4, 3)', right: 'String ka ek hissa nikaalo (position, length)', explain: 'MySQL mein position 1 se shuru hoti hai, 0 se nahi.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Functions diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'strdate',
        questions: [
          { q: 'NULL ko default value se badalne wala function?', target: 'coalesce', explain: 'COALESCE(a, b, \'default\') — pehla non-NULL. IFNULL do-argument roop hai.' },
          { q: 'Strings jodne wala function (jo NULL par poora NULL de deta hai)?', target: 'concat', explain: 'CONCAT — isliye NULL-able columns par pehle COALESCE lagao ya CONCAT_WS use karo.' },
          { q: 'Do dates ke beech ke din ginne wala?', target: 'datediff', explain: 'DATEDIFF(a, b) — a minus b, dinon mein.' },
          { q: 'Yeh galti index ko bekaar kar deti hai — kaunsi hai?', target: 'fntrap', explain: 'WHERE mein column par function (YEAR(d) = 2026). Range likho: d >= .. AND d < ..' },
        ],
      },
      {
        type: 'fill',
        title: 'Report query likho',
        instructions: 'Month-wise build report, NULL-safe labels ke saath. Blanks bharo.',
        template: `SELECT {0}(startDate, '%Y-%m')          AS mahina,
       COUNT(*)                          AS builds,
       {1}(partNumber, 'no-part')        AS part_label
FROM   bx50Builds
GROUP BY {0}(startDate, '%Y-%m'), partNumber
ORDER BY mahina;

-- Device ka label banao — ip NULL ho sakta hai!
SELECT {2}(bx50Name, ' @ ', COALESCE(ip, 'no-ip')) AS label
FROM   bx50Data;

-- Divide-by-zero se bachao
SELECT passed / {3}(total, 0) AS rate FROM summary;`,
        tokens: ['DATE_FORMAT', 'COALESCE', 'CONCAT', 'NULLIF', 'YEAR', 'IFNULL', 'SUBSTRING', 'ISNULL'],
        blanks: [
          { answer: 'DATE_FORMAT', explain: '<code>DATE_FORMAT(d, \'%Y-%m\')</code> = month bucket. Month-wise grouping ka standard tarika.' },
          { answer: 'COALESCE', explain: '<code>COALESCE(x, \'default\')</code> — pehla non-NULL. (<code>IFNULL</code> bhi sahi hai; COALESCE zyada portable hai aur 2+ arguments leta hai.)' },
          { answer: 'CONCAT', explain: '<code>CONCAT</code> strings jodta hai — par yahan <code>ip</code> par pehle <code>COALESCE</code> lagana <b>zaroori</b> tha, warna NULL ip wala poora label NULL ho jaata.' },
          { answer: 'NULLIF', explain: '<code>NULLIF(total, 0)</code> — total 0 hua toh NULL, aur <code>x / NULL</code> = NULL (error nahi). Divide-by-zero ka classic ilaaj.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Report ko padhne laayak banao',
        instructions: 'String aur date functions se raw data ko report banao.',
        goal: 'Manager ko "padhne laayak" report chahiye. <b>(1)</b> Operators ka label banao: <code>CONCAT(name, \' (\', shift, \')\')</code>. <b>(2)</b> Month-wise build count: <code>DATE_FORMAT(startDate, \'%Y-%m\')</code> par <code>GROUP BY</code>. <b>(3)</b> NULL ko sambhalo: <code>bx50Data</code> se <code>bx50Name</code> ke saath <code>COALESCE(customerLocation, \'unassigned\')</code>. <b>(4)</b> CONCAT ka NULL jaal khud dekho: <code>SELECT bx50Name, CONCAT(bx50Name, \' @ \', ip) AS bad FROM bx50Data;</code> — NULL ip wale rows ka poora label NULL ho jayega! <b>(5)</b> Use theek karo — <code>ip</code> par <code>COALESCE</code> laga ke.',
        tasks: [
          { text: 'CONCAT se operator label', check: s => s.history.some(h => /concat\s*\(/i.test(h) && /operators/i.test(h)) },
          { text: 'Month-wise count (DATE_FORMAT + GROUP BY)', check: s => s.history.some(h => /date_format/i.test(h) && /group\s+by/i.test(h)) },
          { text: 'COALESCE se unassigned label', check: s => s.history.some(h => /coalesce\s*\(\s*customerlocation/i.test(h)) },
          { text: 'CONCAT ka NULL jaal dekho (bina COALESCE)', check: s => s.history.some(h => /concat\s*\([^)]*\bip\b/i.test(h) && !/coalesce/i.test(h)) },
          { text: 'Theek karo — CONCAT + COALESCE(ip, ...)', check: s => s.history.some(h => /concat\s*\(/i.test(h) && /coalesce\s*\(\s*ip/i.test(h)) },
        ],
        db: SG.factoryDB(),
        success: s => s.history.some(h => /concat\s*\(/i.test(h) && /operators/i.test(h))
          && s.history.some(h => /date_format/i.test(h) && /group\s+by/i.test(h))
          && s.history.some(h => /coalesce\s*\(\s*customerlocation/i.test(h))
          && s.history.some(h => /concat\s*\([^)]*\bip\b/i.test(h) && !/coalesce/i.test(h))
          && s.history.some(h => /concat\s*\(/i.test(h) && /coalesce\s*\(\s*ip/i.test(h)),
        successText: '🎉 <b>CONCAT ka NULL jaal apni aankhon se dekha.</b> <code>bx50-pune-01</code> aur <code>bx50-tokyo-02</code> ka poora label <b>NULL</b> ho gaya tha — sirf isliye ki unka <code>ip</code> NULL hai. Koi error nahi, bas gayab data. <code>COALESCE(ip, \'no-ip\')</code> lagate hi sab theek. <b>Yaad rakho: NULL-able column ko CONCAT mein daalne se pehle usse COALESCE karo</b> (ya <code>CONCAT_WS</code> use karo jo NULL args skip kar deta hai). Aur <code>DATE_FORMAT(d, \'%Y-%m\')</code> — month-wise report ka woh ek pattern jo tum baar-baar likhoge.',
        hints: [
          "SELECT CONCAT(name, ' (', shift, ')') AS label FROM operators;",
          "SELECT DATE_FORMAT(startDate, '%Y-%m') AS mahina, COUNT(*) AS builds FROM bx50Builds GROUP BY DATE_FORMAT(startDate, '%Y-%m');",
          "SELECT bx50Name, COALESCE(customerLocation, 'unassigned') AS loc FROM bx50Data;",
          "SELECT bx50Name, CONCAT(bx50Name, ' @ ', ip) AS bad FROM bx50Data;   ← NULL dekho",
          "SELECT bx50Name, CONCAT(bx50Name, ' @ ', COALESCE(ip, 'no-ip')) AS good FROM bx50Data;",
        ],
      },
      {
        type: 'quiz',
        title: 'Functions Quick-fire',
        questions: [
          {
            q: "<code>CONCAT('Device: ', NULL)</code> ka result?",
            choices: [
              "NULL — CONCAT mein ek bhi NULL ho toh poora result NULL",
              "'Device: '",
              "'Device: NULL'",
              'Error',
            ],
            answer: 0,
            explain: 'Isiliye NULL-able columns par pehle <code>COALESCE</code> lagao, ya <code>CONCAT_WS</code> use karo jo NULL args skip kar deta hai.',
          },
          {
            q: '<code>NULLIF(total, 0)</code> kis kaam aata hai?',
            choices: [
              'Divide-by-zero se bachne ke liye — total 0 hua toh NULL milta hai, aur x/NULL = NULL (error nahi)',
              'NULL ko 0 banane ke liye',
              'Do columns compare karne ke liye',
              '0 ko NULL se badalne ke liye',
            ],
            answer: 0,
            explain: '<code>passed / NULLIF(total, 0)</code> — rate queries mein yeh aadat bana lo.',
          },
          {
            q: 'Month-wise report ke liye kaunsa pattern?',
            choices: [
              "GROUP BY DATE_FORMAT(startDate, '%Y-%m')",
              'GROUP BY startDate',
              'GROUP BY MONTH(startDate) — saal ke bina',
              'ORDER BY startDate',
            ],
            answer: 0,
            explain: 'Sirf <code>MONTH()</code> par group karoge toh 2025 ka June aur 2026 ka June ek saath jud jayenge. <code>%Y-%m</code> dono rakhta hai.',
          },
          {
            q: 'Function SELECT mein vs WHERE mein — farak?',
            choices: [
              'SELECT mein free hai (result par lagta hai); WHERE mein column par lagane se index bekaar ho jaata hai',
              'Dono jagah same cost hai',
              'WHERE mein tez hai',
              'SELECT mein function allowed nahi hai',
            ],
            answer: 0,
            explain: 'Index column ki asli value par bana hota hai. <code>YEAR(d)</code> ek nayi value hai — DB ko har row par compute karni padti hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Functions',
      instructions: 'Practical round. 🎤',
      questions: [
        {
          q: '"Ek column NULL ho sakta hai aur tumhe usse label banana hai. Kya karoge?"',
          choices: [
            'COALESCE(col, \'default\') se pehle NULL handle karunga, phir CONCAT — kyunki CONCAT mein ek bhi NULL poora result NULL kar deta hai',
            'Seedha CONCAT kar dunga',
            'WHERE se NULL rows hata dunga',
            'App mein handle kar lunga',
          ],
          answer: 0,
          explain: 'NULL-propagation ka pata hona hi asli jawab hai. "WHERE se hata dunga" galat hai — woh rows report se hi gayab kar dega.',
        },
        {
          q: 'Interviewer: "Last 30 din ka data chahiye. Query likho."',
          choices: [
            "WHERE startDate >= DATE_SUB(NOW(), INTERVAL 30 DAY) — column ko akela chhodo taaki index lage",
            'WHERE DATEDIFF(NOW(), startDate) <= 30',
            'WHERE YEAR(startDate) = 2026 AND MONTH(startDate) >= 6',
            'Saara data laake app mein filter karunga',
          ],
          answer: 0,
          explain: 'Doosra option sahi <b>result</b> deta hai par column par function hai → index bekaar. Sargability ka zikr karna yahan bonus point hai.',
        },
        {
          q: '🎛️ Interviewer: "Ek presentable report banao."',
          terminal: {
            title: 'Interview hands-on — functions',
            goal: '🎛️ <b>Hands-on:</b> <b>(1)</b> <code>bmsTester</code> se ek saaf label: <code>CONCAT(UPPER(client), \' / \', board)</code>. <b>(2)</b> <code>bx50Builds</code> ka month-wise count — <code>DATE_FORMAT</code> + <code>GROUP BY</code>. <b>(3)</b> <code>bx50Builds</code> mein <code>partNumber</code> NULL ho sakta hai — <code>COALESCE</code> se <code>\'unknown\'</code> dikhao aur uspar count karo.',
            tasks: [
              { text: 'CONCAT + UPPER se label', check: s => s.history.some(h => /concat\s*\(\s*upper/i.test(h)) },
              { text: 'Month-wise count (DATE_FORMAT)', check: s => s.history.some(h => /date_format/i.test(h) && /group\s+by/i.test(h)) },
              { text: 'COALESCE(partNumber, ...) + count', check: s => s.history.some(h => /coalesce\s*\(\s*partnumber/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /concat\s*\(\s*upper/i.test(h))
              && s.history.some(h => /date_format/i.test(h) && /group\s+by/i.test(h))
              && s.history.some(h => /coalesce\s*\(\s*partnumber/i.test(h)),
            successText: '✅ Nested functions (<code>CONCAT(UPPER(...))</code>), date bucketing, aur NULL-safe grouping — teeno. Ab tumhari reports raw dump nahi, padhne laayak output hain.',
            hints: [
              "SELECT CONCAT(UPPER(client), ' / ', board) AS label FROM bmsTester;",
              "SELECT DATE_FORMAT(startDate, '%Y-%m') AS mahina, COUNT(*) AS builds FROM bx50Builds GROUP BY DATE_FORMAT(startDate, '%Y-%m');",
              "SELECT COALESCE(partNumber, 'unknown') AS part, COUNT(*) AS c FROM bx50Builds GROUP BY COALESCE(partNumber, 'unknown');",
            ],
          },
        },
      ],
    },
    success: [
      'Main CONCAT/UPPER/SUBSTRING/REPLACE se text bana sakta hoon',
      'Main YEAR/DATE_FORMAT/DATEDIFF se date reports bana sakta hoon',
      'Main COALESCE/IFNULL/NULLIF se NULL sambhal sakta hoon',
      'Main jaanta hoon ki WHERE mein function index kyun tod deta hai',
    ],
    homework: `<p>Functions ke jaal khud dekho:</p>
      <pre>USE factory;

-- CONCAT + NULL
SELECT CONCAT('shift: ', shift) FROM operators;      -- NULL shift wale?
SELECT CONCAT('shift: ', COALESCE(shift, 'n/a')) FROM operators;
SELECT CONCAT_WS(' | ', opId, name, shift) FROM operators;   -- NULL skip

-- Dates
SELECT NOW(), CURDATE(), YEAR(NOW()), DATE_FORMAT(NOW(), '%Y-%m-%d');
SELECT DATEDIFF('2026-12-31', '2026-01-01') AS din;

-- NULLIF se divide-by-zero
SELECT 10 / 0 AS boom, 10 / NULLIF(0, 0) AS safe;

-- Sargability khud naapo (bade table par)
EXPLAIN SELECT * FROM big_test WHERE UPPER(client) = 'CLIENT-42';  -- type: ALL
EXPLAIN SELECT * FROM big_test WHERE client = 'client-42';         -- type: ref

-- String se date parse karne ka dard (asli dateCode wala case)
SELECT LEFT('2624', 2) AS yy, RIGHT('2624', 2) AS week;  -- ab ise date banao... 😅</pre>
      <p>✅ Self-check: <code>10 / 0</code> ne NULL/warning diya? <code>UPPER()</code> ne type ALL kar diya? Aakhri wala try karke dekho ki string se date nikalna kitna bura idea hai.</p>`,
    cards: [
      { front: 'CONCAT + NULL?', back: 'Ek bhi argument NULL → <b>poora result NULL</b>. Fix: <code>COALESCE(col, \'default\')</code> pehle, ya <code>CONCAT_WS</code> (woh NULL args skip karta hai).' },
      { front: 'COALESCE / IFNULL / NULLIF?', back: '<b>COALESCE(a,b,c)</b> = pehla non-NULL. <b>IFNULL(x,0)</b> = do-argument roop. <b>NULLIF(a,b)</b> = barabar hon toh NULL — <code>x / NULLIF(total, 0)</code> se divide-by-zero bachao.' },
      { front: 'Month-wise report ka pattern?', back: '<code>GROUP BY DATE_FORMAT(d, \'%Y-%m\')</code>. Sirf <code>MONTH()</code> par group karoge toh alag saalon ke same mahine jud jayenge.' },
      { front: 'Function SELECT vs WHERE mein?', back: '<b>SELECT mein free</b> (result par lagta hai). <b>WHERE mein column par lagao toh index bekaar</b> — index asli value par bana hota hai. Range likho.' },
      { front: 'Date ko string mein rakhne ka nuksaan?', back: 'Har report mein use dobara parse karna padta hai, aur ek din koi galat parse karega. Asli case: <code>dateCode \'2624\'</code> (saal+hafta) se mahina nikalte waqt week 53 ne December ki report khaali kar di. Proper <code>DATE</code> column rakho.' },
    ],
  },

  /* ================= LEVEL 9: Keys & Constraints ================= */
  {
    id: 'keys',
    icon: '🔑',
    title: 'Keys & Constraints — Data ke Pehredaar',
    badge: 'Constraint Kaptan',
    objectives: [
      '<b>PRIMARY KEY</b> — har row ki unique pehchaan',
      '<b>UNIQUE / NOT NULL / DEFAULT</b> — DB-level rules',
      '<b>AUTO_INCREMENT vs UUID</b> — kaunsa PK kab',
      'Constraint errors ko dost samajhna (1062, 1048)',
    ],
    lesson: [
      `<h3>🔑 PRIMARY KEY — har row ka aadhaar card</h3>
       <pre>CREATE TABLE operators (
  opId  VARCHAR(20) PRIMARY KEY,     -- natural key
  name  VARCHAR(100) NOT NULL,
  shift VARCHAR(10)
);

CREATE TABLE bx50Builds (
  id       INT PRIMARY KEY AUTO_INCREMENT,   -- surrogate key
  buildNum INT NOT NULL UNIQUE,
  type     VARCHAR(50) NOT NULL
);</pre>
       <p>PRIMARY KEY ke saath teen cheezein <b>free</b> milti hain:</p>
       <ul>
         <li>🚫 duplicate nahi ho sakta (UNIQUE)</li>
         <li>🚫 NULL nahi ho sakta (NOT NULL)</li>
         <li>⚡ uspar automatic index — lookup bahut tez</li>
       </ul>
       <p>Ek table mein <b>ek hi</b> PRIMARY KEY hoti hai (chahe woh do columns
       ki jodi ho — composite key), par <b>kai</b> UNIQUE constraints ho sakte
       hain.</p>`,
      `<h3>🛡️ Constraints — app bug ke against last defence</h3>
       <table>
         <tr><th>Constraint</th><th>Kya rokta hai</th><th>Factory mein</th></tr>
         <tr><td><code>NOT NULL</code></td><td>khaali value</td><td><code>bx50Data.buildNum</code></td></tr>
         <tr><td><code>UNIQUE</code></td><td>duplicate value</td><td><code>bx50Builds.buildNum</code></td></tr>
         <tr><td><code>DEFAULT</code></td><td>bhoolne par galat value</td><td><code>status DEFAULT 'Not Built'</code></td></tr>
         <tr><td><code>CHECK</code></td><td>galat range/value</td><td><code>CHECK (progress BETWEEN 0 AND 100)</code></td></tr>
       </table>
       <p>💡 <b>Yeh sirf "validation" nahi hai.</b> App mein validation bhi hoti
       hai — par app ke 3 versions chal rahe hote hain, ek background script
       seedha DB par likhta hai, aur koi DBA raat ko manual fix karta hai.
       <b>Constraint DB mein hai toh sabke liye hai.</b></p>`,
      `<h3>🆔 AUTO_INCREMENT vs UUID</h3>
       <table>
         <tr><th></th><th>AUTO_INCREMENT INT</th><th>UUID (CHAR(36))</th></tr>
         <tr><td>Dikhta hai</td><td>1, 2, 3…</td><td>a1b2c3d4-…</td></tr>
         <tr><td>Size</td><td>4–8 bytes</td><td>36 bytes (16 binary)</td></tr>
         <tr><td>Kaun banata hai</td><td>DB (insert ke waqt)</td><td>app (pehle hi)</td></tr>
         <tr><td>Merge/replication</td><td>😬 collision</td><td>✅ safe</td></tr>
         <tr><td>Leak</td><td>"id=500" = 500 records hain</td><td>kuch nahi batata</td></tr>
       </table>
       <p>Asli factory DB dono use karta hai: <code>bx50Builds.id</code>
       <code>AUTO_INCREMENT</code> hai (ek hi server, chhota, tez), par
       <code>bmsTester.id</code> <b>UUID</b> hai — kyunki test results kai alag
       tester machines par ban-te hain aur baad mein central DB mein aate hain.
       Wahan auto-increment collision kar jaata.</p>
       <div class="war-story"><b>⚡ Real incident:</b> <code>cloudLink</code>
       table mein <code>macAddress</code> par <code>UNIQUE</code> tha — bilkul
       sahi lagta hai, MAC unique hota hi hai. Phir ek batch aayi jisme
       manufacturing partner ne galti se <b>same MAC</b> flash kar diya kai
       devices par. Ab factory un devices ko register hi nahi kar pa rahi thi —
       <code>ERROR 1062: Duplicate entry</code>. Migration likhni padi:
       <code>2025-08-12-remove-unique-macAddress-cloudLink</code>. Sabak:
       <b>constraint tabhi lagao jab woh business rule sach mein hamesha sach ho</b>
       — "asli duniya mein unique hai" aur "hamare data mein hamesha unique
       rahega" do alag baatein hain.</div>`,
    ],
    stages: [
      {
        type: 'bins',
        title: 'Kaunsa constraint chahiye?',
        instructions: 'Har business rule ko sahi constraint mein daalo.',
        bins: [
          { id: 'pk', label: '🔑 PRIMARY KEY' },
          { id: 'unique', label: '☝️ UNIQUE' },
          { id: 'notnull', label: '🚫 NOT NULL' },
          { id: 'default', label: '📝 DEFAULT' },
        ],
        items: [
          { text: 'Har build ki ek pehchaan jisse row dhoondh sakein', bin: 'pk', explain: 'PRIMARY KEY — unique + not null + automatic index, teeno ek saath.' },
          { text: 'buildNum do baar register na ho', bin: 'unique', explain: 'UNIQUE. PK already id par hai, isliye buildNum par alag UNIQUE constraint.' },
          { text: 'Device ka naam kabhi khaali na ho', bin: 'notnull', explain: 'NOT NULL — INSERT bina value ke fail ho jayega (ERROR 1364/1048).' },
          { text: 'Naya device bina status ke aaye toh "Not Built" mana jaye', bin: 'default', explain: "DEFAULT 'Not Built' — bhoolne par bhi sahi value. Asli bx50Data mein yahi hai." },
          { text: 'Har operator ka opId alag ho aur woh hi uski pehchaan ho', bin: 'pk', explain: 'Natural primary key — opId khud hi unique business identifier hai.' },
          { text: 'Naya build by default active mana jaye', bin: 'default', explain: 'DEFAULT 1 on active column. Soft-delete pattern ke saath jodi banata hai.' },
          { text: 'Ek email do accounts par register na ho', bin: 'unique', explain: 'UNIQUE on email. (PK alag ho sakti hai — id.)' },
          { text: 'Test result mein operatorId zaroori hai, khaali nahi chalega', bin: 'notnull', explain: 'NOT NULL — "kisne test kiya" pata na ho toh record bekaar hai.' },
        ],
      },
      {
        type: 'hotspot',
        title: 'Keys diagram par ungli rakho',
        instructions: 'Diagram mein sahi cheez click karo.',
        visual: 'keys',
        questions: [
          { q: 'Kaunsi cheez UNIQUE + NOT NULL + index teeno ek saath deti hai?', target: 'pk', explain: 'PRIMARY KEY. Isiliye alag se UNIQUE/NOT NULL likhne ki zaroorat nahi hoti.' },
          { q: 'Kai alag machines par ID ban rahi hain — collision se bachne ke liye?', target: 'uuid', explain: 'UUID — app pehle hi bana leti hai, koi central counter nahi chahiye. bmsTester yahi karta hai.' },
          { q: 'Value na di jaye toh kya bhare — kaunsa constraint?', target: 'default', explain: "DEFAULT. bx50Data.status ka DEFAULT 'Not Built' hai." },
          { q: 'Ek hi server, chhota aur tez ID chahiye — kaunsa?', target: 'autoinc', explain: 'AUTO_INCREMENT INT — 4-8 bytes, DB khud badhata hai. bx50Builds.id yahi hai.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Mission: Constraint se takraao',
        instructions: 'Constraints ko todne ki koshish karo — errors padho — phir sahi table design karo.',
        goal: 'Constraints ko samajhne ka sabse achha tarika: unhe todna. <b>(1)</b> <code>bx50Builds</code> mein already maujood <code>buildNum</code> daalne ki koshish karo: <code>INSERT INTO bx50Builds (buildNum, type) VALUES (1041, \'Gen4\');</code> — error padho. <b>(2)</b> <code>operators</code> mein bina <code>name</code> ke row daalo (name NOT NULL hai) — error padho. <b>(3)</b> Ab ek sahi table banao: <code>testBench</code> jisme <code>id</code> INT PRIMARY KEY AUTO_INCREMENT, <code>benchCode</code> VARCHAR(20) NOT NULL UNIQUE, <code>status</code> VARCHAR(20) DEFAULT \'idle\'. <b>(4)</b> Usme ek row daalo bina status diye — DEFAULT khud lag jayega.',
        tasks: [
          { text: 'Duplicate buildNum try karo (ERROR 1062)', check: s => s.history.some(h => /insert\s+into\s+bx50builds/i.test(h)) && /1062/.test(s.lastError || '') || s.history.some(h => /insert\s+into\s+bx50builds.*1041/i.test(h)) },
          { text: 'NOT NULL todo (operators bina name)', check: s => s.history.some(h => /insert\s+into\s+operators/i.test(h)) },
          { text: 'testBench table banao (PK + UNIQUE + DEFAULT)', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'testbench') },
          { text: 'Bina status diye row daalo — DEFAULT lage', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'testbench'); return !!k && s.db.tables[k].rows.some(r => r.status === 'idle'); } },
        ],
        db: SG.factoryDB(),
        success: s => {
          const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'testbench');
          if (!k) return false;
          const t = s.db.tables[k];
          const bc = t.columns.find(c => c.name.toLowerCase() === 'benchcode');
          return !!bc && (bc.unique || bc.pk) && bc.notNull
            && t.rows.some(r => r.status === 'idle')
            && s.history.some(h => /insert\s+into\s+bx50builds/i.test(h))
            && s.history.some(h => /insert\s+into\s+operators/i.test(h));
        },
        successText: '🎉 <b>Constraints ko tod ke samjha — yehi sabse achha tarika hai.</b> <code>ERROR 1062: Duplicate entry</code> aur <code>ERROR 1048: Column cannot be null</code> — yeh dono <b>dost</b> hain. Inhone galat data ko DB mein ghusne se roka. Aur dhyaan do: tumne <code>status</code> diya hi nahi tha, phir bhi row mein <code>\'idle\'</code> aa gaya — <code>DEFAULT</code> ka kaam yahi hai.',
        hints: [
          "INSERT INTO bx50Builds (buildNum, type) VALUES (1041, 'Gen4');   ← 1041 already hai",
          "INSERT INTO operators (opId, name) VALUES ('OP-500', NULL);   ← name NOT NULL hai",
          "CREATE TABLE testBench (id INT PRIMARY KEY AUTO_INCREMENT, benchCode VARCHAR(20) NOT NULL UNIQUE, status VARCHAR(20) DEFAULT 'idle');",
          "INSERT INTO testBench (benchCode) VALUES ('BENCH-01');   ← status mat do, DEFAULT lagega",
        ],
      },
      {
        type: 'quiz',
        title: 'Keys Quick-fire',
        questions: [
          {
            q: 'PRIMARY KEY declare karne se kya-kya free milta hai?',
            choices: [
              'UNIQUE + NOT NULL + us column par automatic index',
              'Sirf uniqueness',
              'Sirf ek index',
              'Kuch nahi, yeh sirf documentation hai',
            ],
            answer: 0,
            explain: 'Teeno ek saath. Isiliye PK column par alag se UNIQUE ya NOT NULL likhne ki zaroorat nahi.',
          },
          {
            q: 'Test results kai alag tester machines par ban-te hain aur baad mein central DB mein aate hain. PK kya rakhoge?',
            choices: [
              'UUID — har machine bina central counter ke apni unique id bana sakti hai, merge par collision nahi',
              'AUTO_INCREMENT — chhota aur tez hai',
              'Timestamp — hamesha unique hota hai',
              'Operator ka naam',
            ],
            answer: 0,
            explain: 'Yahi wajah hai ki asli <code>bmsTester.id</code> UUID hai jabki <code>bx50Builds.id</code> AUTO_INCREMENT. Distributed writes = UUID.',
          },
          {
            q: '<code>ERROR 1062: Duplicate entry \'1041\' for key \'buildNum\'</code> — yeh kya bata raha hai?',
            choices: [
              'UNIQUE constraint ne galat data rok diya — DB apna kaam kar raha hai',
              'Database corrupt ho gaya hai',
              'Table mein jagah khatam ho gayi',
              'Query ka syntax galat hai',
            ],
            answer: 0,
            explain: 'Constraint errors <b>dost</b> hain. Woh us bug ko INSERT ke waqt pakadte hain, mahine baad audit mein nahi.',
          },
          {
            q: 'App mein already validation hai. DB constraints ki kya zaroorat?',
            choices: [
              'App ke kai versions, background scripts, aur manual DBA queries — sab DB par likhte hain. Constraint DB mein ho toh sabke liye lagu hoti hai',
              'Koi zaroorat nahi, duplicate kaam hai',
              'Sirf performance ke liye',
              'Sirf documentation ke liye',
            ],
            answer: 0,
            explain: 'App validation <b>UX</b> ke liye hai (turant feedback), DB constraint <b>integrity</b> ke liye (aakhri deewar). Dono chahiye.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Keys & Constraints',
      instructions: 'Schema design ka round. 🎤',
      questions: [
        {
          q: '"Primary key ke liye AUTO_INCREMENT ya UUID — kaise decide karoge?"',
          choices: [
            'Ek hi DB writer hai aur size/speed matter karta hai → AUTO_INCREMENT. Kai jagah se IDs ban rahi hain (distributed/offline/merge) ya id public dikhti hai → UUID',
            'Hamesha UUID — modern hai',
            'Hamesha AUTO_INCREMENT — chhota hai',
            'Koi farak nahi padta',
          ],
          answer: 0,
          explain: 'Trade-off bolna: UUID = distributed-safe + kuch leak nahi karta, par bada aur index par bhaari. Asli project dono use karta hai — alag tables ke liye alag wajah.',
        },
        {
          q: 'Interviewer: "Tumne macAddress par UNIQUE lagaya tha, ab manufacturing ne duplicate MAC bhej diye. Ab?"',
          choices: [
            'Migration se UNIQUE hataunga (ya use partial/soft rule banaunga) — kyunki constraint tabhi valid hai jab woh business reality mein sach ho, aur yahan reality badal gayi',
            'Manufacturing ko bolunga sab devices wapas lo',
            'Duplicate rows ko delete karta rahunga',
            'Constraint rakhunga aur app mein try/catch se ignore kar dunga',
          ],
          answer: 0,
          explain: 'Yeh asli migration thi (<code>remove-unique-macAddress</code>). Sabak: "asli duniya mein unique hai" ≠ "mere data mein hamesha unique rahega".',
        },
        {
          q: '🎛️ Interviewer: "Ek table design karke constraints dikhao."',
          terminal: {
            title: 'Interview hands-on — constraints',
            goal: '🎛️ <b>Hands-on:</b> <code>testStations</code> table banao: <code>id</code> INT PRIMARY KEY AUTO_INCREMENT, <code>stationCode</code> VARCHAR(20) NOT NULL UNIQUE, <code>line</code> VARCHAR(50) NOT NULL, <code>active</code> BOOLEAN DEFAULT 1. Phir <b>(2)</b> ek row insert karo, aur <b>(3)</b> wahi <code>stationCode</code> dobara insert karke dikhao ki UNIQUE kaam kar raha hai.',
            tasks: [
              { text: 'testStations table banao', check: s => !!Object.keys(s.db.tables).find(k => k.toLowerCase() === 'teststations') },
              { text: 'Ek row insert karo', check: s => { const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'teststations'); return !!k && s.db.tables[k].rows.length > 0; } },
              { text: 'Duplicate stationCode try karke UNIQUE prove karo', check: s => /1062/.test(s.lastError || '') },
            ],
            db: SG.factoryDB(),
            success: s => {
              const k = Object.keys(s.db.tables).find(x => x.toLowerCase() === 'teststations');
              if (!k) return false;
              const t = s.db.tables[k];
              const sc = t.columns.find(c => c.name.toLowerCase() === 'stationcode');
              return !!sc && sc.unique && sc.notNull && t.rows.length > 0 && /1062/.test(s.lastError || '');
            },
            successText: '✅ Table bhi bana aur constraint ne kaam bhi kiya — <code>ERROR 1062</code> yahan <b>success</b> hai. Interviewer ko yahi dikhana tha: tum constraint likhte ho aur uska asar verify bhi karte ho.',
            hints: [
              'CREATE TABLE testStations (id INT PRIMARY KEY AUTO_INCREMENT, stationCode VARCHAR(20) NOT NULL UNIQUE, line VARCHAR(50) NOT NULL, active BOOLEAN DEFAULT 1);',
              "INSERT INTO testStations (stationCode, line) VALUES ('ST-01', 'BMS-line-1');",
              "INSERT INTO testStations (stationCode, line) VALUES ('ST-01', 'BMS-line-2');   ← yeh fail hona chahiye",
            ],
          },
        },
      ],
    },
    success: [
      'Main PRIMARY KEY ke teen faayde (unique, not null, index) bata sakta hoon',
      'Main UNIQUE / NOT NULL / DEFAULT sahi jagah laga sakta hoon',
      'Main AUTO_INCREMENT vs UUID ka faisla justify kar sakta hoon',
      'Main constraint errors (1062, 1048) padh ke samajh sakta hoon',
    ],
    homework: `<p>Constraints ko todo aur errors padho:</p>
      <pre>USE factory;
CREATE TABLE benches (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  code     VARCHAR(20) NOT NULL UNIQUE,
  line     VARCHAR(50) NOT NULL,
  status   VARCHAR(20) DEFAULT 'idle',
  active   BOOLEAN DEFAULT 1
);

INSERT INTO benches (code, line) VALUES ('B-01','line-1');
SELECT * FROM benches;          -- status='idle', active=1 apne aap!

INSERT INTO benches (code, line) VALUES ('B-01','line-2');   -- ERROR 1062
INSERT INTO benches (code) VALUES ('B-02');                  -- ERROR 1364 (line NOT NULL)
INSERT INTO benches (code, line) VALUES (NULL,'line-3');     -- ERROR 1048

-- UUID wala style bhi dekho:
CREATE TABLE results (id CHAR(36) PRIMARY KEY, benchCode VARCHAR(20));
INSERT INTO results VALUES (UUID(), 'B-01');
SELECT * FROM results;</pre>
      <p>✅ Self-check: Teeno errors alag the? DEFAULT wale columns bina diye bhar gaye? <code>UUID()</code> ne 36-char id banai?</p>`,
    cards: [
      { front: 'PRIMARY KEY se kya milta hai?', back: 'Teen cheezein ek saath: <b>UNIQUE</b> + <b>NOT NULL</b> + us column par <b>automatic index</b>. Ek table mein ek hi PK (composite ho sakti hai), UNIQUE kai.' },
      { front: 'AUTO_INCREMENT vs UUID?', back: '<b>AUTO_INCREMENT</b> = chhota, tez, ek writer (bx50Builds.id). <b>UUID</b> = distributed-safe, app banati hai, kuch leak nahi karta (bmsTester.id — kai tester machines).' },
      { front: 'DB constraint kyun jab app validation hai?', back: 'App ke kai versions + background scripts + manual DBA queries — sab DB par likhte hain. App validation = UX, <b>DB constraint = aakhri deewar</b>.' },
      { front: 'ERROR 1062 / 1048 ka matlab?', back: '<b>1062</b> = Duplicate entry (UNIQUE toota). <b>1048</b> = Column cannot be null (NOT NULL toota). Yeh <b>dost</b> hain — galat data insert ke waqt hi ruk gaya.' },
      { front: 'UNIQUE lagane se pehle kya sochna?', back: '"Asli duniya mein unique hai" ≠ "mere data mein hamesha unique rahega". MAC address par UNIQUE tha, duplicate MAC wali batch aayi, migration se hataana pada.' },
    ],
  },

  /* ================= LEVEL 10: BOSS — Factory Report ================= */
  {
    id: 'boss1',
    icon: '🏆',
    title: 'Boss: Pehli Factory Report',
    badge: 'Query Pandit',
    objectives: [
      'Sab kuch ek saath — SELECT, WHERE, GROUP BY, INSERT, UPDATE',
      'Asli business sawal se SQL tak pahunchna',
      'Safety aadat: verify karke data badalna',
      'Track 1 ka certificate! 🎓',
    ],
    lesson: [
      `<h3>🏭 Situation</h3>
       <p>Somvaar subah. Production manager ke paas 10 minute hain aur usse
       hafte ki review meeting mein jaana hai. Woh tumhare paas aata hai:</p>
       <blockquote>"Mujhe teen cheezein chahiye — kitne devices provisioned
       hain, har client ke kitne test fail hue, aur woh ek device jiska data
       galat hai use theek kar do. Dus minute mein."</blockquote>
       <p>Tumhare paas jo hai woh kaafi hai. Ab jodna hai.</p>
       <p><b>Business sawal → SQL</b> ka tareeka:</p>
       <ol>
         <li>Data <b>kis table</b> mein hai? (<code>SHOW TABLES</code> / <code>DESCRIBE</code>)</li>
         <li>Kaunsi <b>rows</b> chahiye? → <code>WHERE</code></li>
         <li>Kaunse <b>columns</b>? → <code>SELECT</code></li>
         <li>Per-category number chahiye? → <code>GROUP BY</code></li>
         <li>Groups chhaan-ne hain? → <code>HAVING</code></li>
         <li>Sort/top-N? → <code>ORDER BY</code> + <code>LIMIT</code></li>
       </ol>`,
      `<h3>✅ Aur data badalne se pehle — wahi drill</h3>
       <pre>-- 1. Dekho
SELECT * FROM bx50Data WHERE bx50Name = 'bx50-tokyo-02';
-- 2. Badlo (wahi WHERE)
UPDATE bx50Data SET status = 'Provisioned', bx50Status = 4
WHERE bx50Name = 'bx50-tokyo-02';
-- 3. Verify
SELECT bx50Name, status, bx50Status FROM bx50Data WHERE bx50Name = 'bx50-tokyo-02';</pre>
       <p>Teen kadam. Har baar. Yeh boring lagta hai — aur yehi tumhe 3AM ke
       pager se bachata hai.</p>`,
    ],
    stages: [
      {
        type: 'match',
        title: 'Business sawal → SQL clause',
        instructions: 'Manager ke sawal ko us SQL tool se jodo jo use hal karega.',
        pairs: [
          { left: '"Sirf active builds dikhao"', right: 'WHERE active = 1', explain: 'Rows ka filter = WHERE.' },
          { left: '"Har client ke kitne tests?"', right: 'GROUP BY client + COUNT(*)', explain: 'Per-category number = GROUP BY + aggregate.' },
          { left: '"Sabse lambi 3 builds"', right: 'ORDER BY duration DESC LIMIT 3', explain: 'Top-N = sort + limit. ORDER BY ke bina LIMIT ka matlab nahi.' },
          { left: '"Sirf woh clients jinke 2+ fail hue"', right: 'HAVING COUNT(*) >= 2', explain: 'Groups ka filter = HAVING (aggregate ke baad).' },
          { left: '"Naya operator register karo"', right: 'INSERT INTO operators (...) VALUES (...)', explain: 'Naya row = INSERT. Column names hamesha likho.' },
          { left: '"Is device ka status theek karo"', right: "UPDATE ... SET ... WHERE bx50Name = '...'", explain: 'Ek row badalna = UPDATE with a precise WHERE.' },
          { left: '"Jinka IP allot nahi hua"', right: 'WHERE ip IS NULL', explain: 'NULL ke liye IS NULL — = NULL kabhi kaam nahi karta.' },
        ],
      },
      {
        type: 'terminal',
        title: '🖥️ Boss Mission: Manager ki teen demands',
        instructions: 'Dus minute. Teen kaam. Chalo.',
        goal: 'Production manager ki review meeting hai. <b>(1)</b> Kitne devices <code>\'Provisioned\'</code> hain? <code>COUNT(*)</code> use karo. <b>(2)</b> Har client ke kitne test <b>fail</b> hue — <code>WHERE status = \'fail\'</code> + <code>GROUP BY client</code>, sabse zyada wala upar (<code>ORDER BY ... DESC</code>). <b>(3)</b> Device <code>bx50-tokyo-02</code> ka build ho chuka hai par status abhi tak <code>\'Not Built\'</code> hai. Pehle <code>SELECT</code> se dekho, phir <code>UPDATE</code> se <code>status = \'Provisioned\'</code> aur <code>bx50Status = 4</code> karo — <b>WHERE lagana</b>. <b>(4)</b> Verify karo ki baaki devices nahi bigde.',
        tasks: [
          { text: 'Provisioned devices ka count', check: s => s.history.some(h => /count\s*\(/i.test(h) && /provisioned/i.test(h)) },
          { text: 'Client-wise failures (GROUP BY + ORDER BY)', check: s => s.history.some(h => /group\s+by\s+client/i.test(h) && /fail/i.test(h)) },
          { text: 'tokyo-02 ko pehle SELECT se dekho', check: s => s.history.some(h => /^select.*tokyo-02/i.test(h)) },
          { text: 'tokyo-02 ka status theek karo (WHERE ke saath!)', check: s => { const r = s.db.tables.bx50Data.rows.find(x => x.bx50Name === 'bx50-tokyo-02'); return !!r && r.status === 'Provisioned' && Number(r.bx50Status) === 4; } },
          { text: 'Baaki devices safe hain (sirf 4 provisioned)', check: s => s.db.tables.bx50Data.rows.filter(r => r.status === 'Provisioned').length === 4 },
        ],
        db: SG.factoryDB(),
        success: s => {
          const r = s.db.tables.bx50Data.rows.find(x => x.bx50Name === 'bx50-tokyo-02');
          return !!r && r.status === 'Provisioned' && Number(r.bx50Status) === 4
            && s.db.tables.bx50Data.rows.filter(x => x.status === 'Provisioned').length === 4
            && s.history.some(h => /count\s*\(/i.test(h) && /provisioned/i.test(h))
            && s.history.some(h => /group\s+by\s+client/i.test(h) && /fail/i.test(h))
            && s.history.some(h => /^select.*tokyo-02/i.test(h));
        },
        successText: '🏆 <b>Teeno kaam, dus minute mein, zero damage.</b> Tumne aaj sirf syntax nahi chalayi — tumne ek business sawal ko SQL mein tarjuma kiya, aur data badalne se pehle verify kiya. Yeh dono cheezein hi asli kaam hain. Ab Track 1 poora — <b>Query Pandit</b> certificate le lo, aur Track 2 mein tables ko <b>jodna</b> seekho (JOIN) — wahin se SQL asli taakat dikhata hai.',
        hints: [
          "SELECT COUNT(*) AS provisioned FROM bx50Data WHERE status = 'Provisioned';",
          "SELECT client, COUNT(*) AS failures FROM bmsTester WHERE status = 'fail' GROUP BY client ORDER BY failures DESC;",
          "SELECT * FROM bx50Data WHERE bx50Name = 'bx50-tokyo-02';   ← pehle dekho",
          "UPDATE bx50Data SET status = 'Provisioned', bx50Status = 4 WHERE bx50Name = 'bx50-tokyo-02';",
        ],
      },
      {
        type: 'quiz',
        title: 'Boss Round — Track 1 ka nichod',
        questions: [
          {
            q: 'Ek business sawal mila. Sabse pehla kadam?',
            choices: [
              'Pata karo data kis table mein hai — SHOW TABLES / DESCRIBE se, phir chhota SELECT ... LIMIT 5',
              'Seedha JOIN likhna shuru kar do',
              'Manager se poocho ki SQL khud likh de',
              'Poori table export karke Excel mein dekho',
            ],
            answer: 0,
            explain: 'Explore → chhota SELECT → phir poori query. Andaza lagana sabse mehnga tarika hai.',
          },
          {
            q: 'Kaunsi query "har client ke fail tests, sabse zyada pehle" sahi deti hai?',
            choices: [
              "SELECT client, COUNT(*) AS f FROM bmsTester WHERE status='fail' GROUP BY client ORDER BY f DESC;",
              "SELECT client, COUNT(*) FROM bmsTester GROUP BY client WHERE status='fail';",
              "SELECT client, COUNT(*) FROM bmsTester HAVING status='fail' GROUP BY client;",
              "SELECT client FROM bmsTester WHERE status='fail' ORDER BY COUNT(*);",
            ],
            answer: 0,
            explain: 'Order matter karta hai: WHERE (rows) → GROUP BY (dher) → ORDER BY (sort). WHERE ko GROUP BY ke baad likhna syntax error hai.',
          },
          {
            q: 'UPDATE chalane ke baad "5 rows affected" dikha, par tum ek row badalne aaye the. Ab?',
            choices: [
              'Ruk jao aur jaancho — WHERE galat tha. Agar transaction mein ho toh ROLLBACK, warna turant damage assess karo',
              'Theek hai, aage badho',
              'Dobara UPDATE chala do',
              'Table drop kar do',
            ],
            answer: 0,
            explain: 'Rows-affected ka number tumhari SELECT se match karna chahiye. Na kare toh yeh sabse pehla warning signal hai.',
          },
        ],
      },
    ],
    interview: {
      title: 'Interview Round — Track 1 Final',
      instructions: 'Pehle track ka aakhri round. Sab kuch mila ke. 🎤',
      questions: [
        {
          q: '"Tum SQL kitna jaante ho?" — junior role ka pehla sawal.',
          choices: [
            'CRUD comfortably likh leta hoon — SELECT with WHERE/ORDER BY/LIMIT, GROUP BY se reports, aur INSERT/UPDATE/DELETE. Production par UPDATE se pehle WHERE ko SELECT par verify karta hoon',
            'Sab kuch jaanta hoon',
            'Bas SELECT * chala leta hoon',
            'Kuch nahi, seekh raha hoon',
          ],
          answer: 0,
          explain: 'Achha jawab = <b>specific scope</b> + <b>ek safety aadat</b>. Woh aakhri line hi tumhe baaki candidates se alag karti hai.',
        },
        {
          q: 'Interviewer: "Ek chhoti table hai. Tum kaise decide karoge ki query sahi hai?"',
          choices: [
            'Chhote known data par chala ke expected result se compare karunga, aur edge cases dekhunga — NULL wali rows, khaali result, aur rows-affected ka number',
            'Query chal gayi matlab sahi hai',
            'Error nahi aaya matlab sahi hai',
            'Manager bol de toh sahi hai',
          ],
          answer: 0,
          explain: '"Error nahi aaya" ≠ "sahi hai". <code>WHERE ip = NULL</code> bilkul valid SQL hai aur hamesha jhoot bolta hai. NULL edge case ka zikr bonus point hai.',
        },
        {
          q: '🎛️ Final hands-on: "Poori report ek baar mein banao."',
          terminal: {
            title: 'Interview hands-on — final',
            goal: '🎛️ <b>Final hands-on:</b> <b>(1)</b> Har <code>type</code> (Gen3/Gen4) ke kitne <b>active</b> builds hain — <code>WHERE active = 1</code> + <code>GROUP BY type</code>. <b>(2)</b> Woh operators jinka <code>shift</code> <code>\'night\'</code> hai, naam ke order mein. <b>(3)</b> <code>bx50Data</code> mein kitne devices ka <code>ip</code> abhi allot nahi hua (<code>IS NULL</code>) — count nikaalo.',
            tasks: [
              { text: 'Active builds per type', check: s => s.history.some(h => /active\s*=\s*1/i.test(h) && /group\s+by\s+type/i.test(h)) },
              { text: 'Night shift operators (ORDER BY name)', check: s => s.history.some(h => /night/i.test(h) && /order\s+by\s+name/i.test(h)) },
              { text: 'Bina IP wale devices ka count (IS NULL)', check: s => s.history.some(h => /count\s*\(/i.test(h) && /ip\s+is\s+null/i.test(h)) },
            ],
            db: SG.factoryDB(),
            success: s => s.history.some(h => /active\s*=\s*1/i.test(h) && /group\s+by\s+type/i.test(h))
              && s.history.some(h => /night/i.test(h) && /order\s+by\s+name/i.test(h))
              && s.history.some(h => /count\s*\(/i.test(h) && /ip\s+is\s+null/i.test(h)),
            successText: '✅ <b>Track 1 complete.</b> Teen queries mein tumne WHERE + GROUP BY + ORDER BY + IS NULL sab use kiya. Ab Track 2 khulta hai — jahan do tables ek doosre se baat karti hain. 🔗',
            hints: [
              'SELECT type, COUNT(*) AS c FROM bx50Builds WHERE active = 1 GROUP BY type;',
              "SELECT name, station FROM operators WHERE shift = 'night' ORDER BY name;",
              'SELECT COUNT(*) AS no_ip FROM bx50Data WHERE ip IS NULL;',
            ],
          },
        },
      ],
    },
    success: [
      'Main business sawal ko SQL query mein tarjuma kar sakta hoon',
      'Main SELECT + WHERE + GROUP BY + HAVING + ORDER BY ek saath use kar sakta hoon',
      'Main data badalne se pehle verify karta hoon aur rows-affected check karta hoon',
      'Main Track 1 ka Query Pandit certificate le chuka hoon 🎓',
    ],
    homework: `<p>Apne MySQL par poora factory schema khud banao — Track 2 ke liye tayyari:</p>
      <pre>USE factory;

CREATE TABLE bx50Builds (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  buildNum  INT NOT NULL UNIQUE,
  type      VARCHAR(50) NOT NULL,
  duration  BIGINT,
  active    BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE bx50Data (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  bx50Name  VARCHAR(100),
  ip        VARCHAR(45),
  buildNum  INT NOT NULL,
  status    VARCHAR(50) NOT NULL DEFAULT 'Not Built'
);

INSERT INTO bx50Builds (buildNum, type, duration) VALUES
  (1041,'Gen4',5400000), (1042,'Gen3',7200000), (1043,'Gen4',3600000);

INSERT INTO bx50Data (bx50Name, ip, buildNum, status) VALUES
  ('bx50-tokyo-01','10.1.0.11',1041,'Provisioned'),
  ('bx50-pune-01', NULL,       1042,'Building'),
  ('bx50-osaka-01','10.1.0.13',1099,'Error');    -- note: 1099 ka koi build nahi!

-- Ab practice:
SELECT status, COUNT(*) FROM bx50Data GROUP BY status;
SELECT * FROM bx50Data WHERE ip IS NULL;
SELECT type, COUNT(*), AVG(duration) FROM bx50Builds GROUP BY type;</pre>
      <p>✅ Self-check: Sab tables ban gayi? Woh <code>buildNum 1099</code> wali row yaad rakhna — Track 2 mein JOIN par woh gayab ho jayegi, aur wahi asli sabak hoga. 🙂</p>`,
    cards: [
      { front: 'Business sawal se SQL tak — tareeka?', back: '1) Data kis table mein (<code>SHOW TABLES</code>/<code>DESCRIBE</code>) → 2) rows = <code>WHERE</code> → 3) columns = <code>SELECT</code> → 4) per-category = <code>GROUP BY</code> → 5) groups filter = <code>HAVING</code> → 6) <code>ORDER BY</code>+<code>LIMIT</code>.' },
      { front: 'Data badalne ka 3-step drill?', back: '<b>1. SELECT</b> (wahi WHERE) → <b>2. UPDATE</b> (wahi WHERE) → <b>3. SELECT</b> se verify. Rows-affected SELECT ke count se match hona chahiye.' },
      { front: '"Rows affected" expected se zyada dikha — kya karoge?', back: '<b>Ruk jao.</b> WHERE galat tha. Transaction mein ho toh <code>ROLLBACK</code>; warna turant damage assess karo aur backup/binlog dekho.' },
      { front: 'Clause likhne ka sahi order?', back: '<code>SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT …</code> — isse hat ke likhoge toh syntax error milega.' },
      { front: 'Track 1 ka nichod ek line mein?', back: '<b>SELECT rows chuno (WHERE), columns chuno (SELECT), report banao (GROUP BY), aur badalne se pehle verify karo (WHERE + SELECT).</b>' },
    ],
  },

]);
