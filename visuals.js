/* =====================================================================
   SQL Gurukul — Concept Visuals
   Har level ka ek signature diagram, style.css ke .dg-* primitives se.
   Pure HTML/CSS/emoji — koi dependency nahi.
   Entry: { t: chhota title, html: diagram markup }
   Hotspot games ke liye clickable nodes par data-hs="<target>" hota hai.
   ===================================================================== */

const VISUALS = {

  /* ================= TRACK 1 — BEGINNER ================= */

  db101: {
    t: 'Database → Table → Row → Column',
    html: `
      <div class="dg-box is-accent"><span class="bx-label">🗄️ Database: factory</span>
        <div class="dg-flow">
          <div class="dg-box is-good" data-hs="table"><span class="bx-label">📋 Table: bx50Builds</span>
            <div class="dg-col">
              <div class="dg-node is-gold" data-hs="colrow"><span class="ni">🏷️</span><span class="nl">Columns</span><span class="ns">buildNum · type · duration</span></div>
              <div class="dg-node is-good" data-hs="row"><span class="ni">➡️</span><span class="nl">Row</span><span class="ns">1041 · Gen4 · 5400000</span></div>
              <div class="dg-node is-good" data-hs="row"><span class="ni">➡️</span><span class="nl">Row</span><span class="ns">1042 · Gen3 · 7200000</span></div>
            </div>
          </div>
          <div class="dg-box"><span class="bx-label">📋 Table: operators</span>
            <div class="dg-col">
              <div class="dg-node"><span class="ni">👤</span><span class="nl">OP-101</span><span class="ns">Ravi · day shift</span></div>
              <div class="dg-node"><span class="ni">👤</span><span class="nl">OP-102</span><span class="ns">Priya · night shift</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill acc" data-hs="sql">SQL = table se baat karne ki bhasha</span>
        <span class="dg-pill gold">Excel sheet ≈ table, par rules ke saath</span>
        <span class="dg-pill good">MySQL / Postgres / SQLite = servers jo SQL bolte hain</span>
      </div>
      <div class="dg-cap"><b>Database</b> = tables ka dabba. <b>Table</b> = ek cheez ki list (builds, operators). <b>Row</b> = ek record. <b>Column</b> = us record ka ek field. <b>SQL</b> se poochte ho: "kaunse builds active hain?"</div>`,
  },

  select: {
    t: 'SELECT ka safar — FROM se LIMIT tak',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-accent pulse" data-hs="from"><span class="ni">📋</span><span class="nl">FROM</span><span class="ns">kaunsi table</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-bad" data-hs="where"><span class="ni">🎯</span><span class="nl">WHERE</span><span class="ns">rows chhanto</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-gold" data-hs="selectcols"><span class="ni">🏷️</span><span class="nl">SELECT cols</span><span class="ns">columns chuno</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-good" data-hs="orderby"><span class="ni">🔢</span><span class="nl">ORDER BY</span><span class="ns">sort karo</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node" data-hs="limit"><span class="ni">✂️</span><span class="nl">LIMIT</span><span class="ns">itne hi do</span></div>
      </div>
      <div class="dg-cap" style="margin-top:12px"><b>Likhne ka order:</b> SELECT → FROM → WHERE → ORDER BY → LIMIT. <b>Chalne ka order:</b> FROM → WHERE → SELECT → ORDER BY → LIMIT. WHERE rows kaat-ta hai, SELECT columns. <code>SELECT *</code> = saare columns (prod mein aadat kharab 🙂).</div>`,
  },

  filters: {
    t: 'WHERE ke hathiyar — LIKE / IN / BETWEEN / NULL',
    html: `
      <div class="dg-grid" style="grid-template-columns:1fr 1fr">
        <div class="dg-box is-accent"><span class="bx-label">🔤 LIKE — pattern</span>
          <div class="dg-col">
            <span class="dg-pill acc" data-hs="like">bx50Name LIKE '%tokyo%'</span>
            <span class="dg-pill">% = kuch bhi (0+ chars) · _ = exactly 1 char</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">📦 IN — list</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="in">status IN ('Error', 'Building')</span>
            <span class="dg-pill">= bahut saare OR ek saath</span>
          </div>
        </div>
        <div class="dg-box is-gold"><span class="bx-label">↔️ BETWEEN — range</span>
          <div class="dg-col">
            <span class="dg-pill gold" data-hs="between">duration BETWEEN 1000 AND 5000</span>
            <span class="dg-pill">dono ends INCLUSIVE</span>
          </div>
        </div>
        <div class="dg-box is-bad"><span class="bx-label">🕳️ NULL — khaali ka jaal</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="nulleq">ip = NULL ❌ hamesha empty!</span>
            <span class="dg-pill good" data-hs="isnull">ip IS NULL ✅ yehi tarika hai</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>NULL kisi ke barabar nahi hota — khud ke bhi nahi.</b> <code>NULL = NULL</code> ka jawab NULL hai (na true, na false). Isliye <code>IS NULL</code> / <code>IS NOT NULL</code>. Yeh interview ka pakka sawal hai.</div>`,
  },

  crud: {
    t: 'CRUD — Create, Read, Update, Delete',
    html: `
      <div class="dg-grid" style="grid-template-columns:1fr 1fr">
        <div class="dg-node is-good" data-hs="insert"><span class="ni">➕</span><span class="nl">INSERT INTO t (...) VALUES (...)</span><span class="ns">naya row</span></div>
        <div class="dg-node is-accent" data-hs="select"><span class="ni">🔍</span><span class="nl">SELECT ... FROM t</span><span class="ns">padho (Read)</span></div>
        <div class="dg-node is-gold" data-hs="update"><span class="ni">✏️</span><span class="nl">UPDATE t SET c=v WHERE ...</span><span class="ns">badlo</span></div>
        <div class="dg-node is-bad" data-hs="delete"><span class="ni">🗑️</span><span class="nl">DELETE FROM t WHERE ...</span><span class="ns">hatao</span></div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <div class="dg-box is-bad"><span class="bx-label">☠️ Bina WHERE ke</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="nowhere">UPDATE bx50Data SET status='X';  ← POORI TABLE</span>
            <span class="dg-pill bad">DELETE FROM bmsTester;  ← SAB GAYA</span>
            <span class="dg-pill good" data-hs="txsafe">Bachav: pehle SELECT se WHERE test karo, ya BEGIN → verify → COMMIT</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>UPDATE/DELETE likhne se pehle wahi WHERE ek SELECT par chalao.</b> Jitni rows SELECT dikhaye, utni hi badlengi. Yeh aadat 3AM incidents rok deti hai.</div>`,
  },

  datatypes: {
    t: 'Data types — dabbe ka sahi size',
    html: `
      <div class="dg-ladder">
        <div class="dg-rung"><span class="lv">🔢</span><span class="cmd">INT</span><span class="q">±2.1 billion tak — id, counts</span></div>
        <div class="dg-rung a" data-hs="bigint"><span class="lv">🔢</span><span class="cmd">BIGINT</span><span class="q">±9.2 quintillion — durations (ms), epoch</span></div>
        <div class="dg-rung"><span class="lv">🔤</span><span class="cmd">VARCHAR(n)</span><span class="q">text with max length — names, status</span></div>
        <div class="dg-rung g"><span class="lv">📜</span><span class="cmd">TEXT</span><span class="q">lamba text — notes, logs (index mushkil)</span></div>
        <div class="dg-rung"><span class="lv">📅</span><span class="cmd">DATE / DATETIME / TIMESTAMP</span><span class="q">'2026-06-02 09:15:00'</span></div>
        <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">BOOLEAN (TINYINT)</span><span class="q">0/1 — active, secure</span></div>
        <div class="dg-rung a"><span class="lv">💰</span><span class="cmd">DECIMAL(p,s)</span><span class="q">paisa — FLOAT se KABHI paisa nahi!</span></div>
      </div>
      <div class="dg-cap" data-hs="overflow"><b>Asli kahani:</b> bx50Sessions.duration <b>INT</b> tha — ms mein store hota tha. Lambi test session = 2.1 billion ms (~24 din) cross → <b>overflow error</b>. Migration likhi: <code>MODIFY duration BIGINT</code>. Chhota dabba mat chuno.</div>`,
  },

  aggregates: {
    t: 'GROUP BY — rows ko dher mein baanto, phir gino',
    html: `
      <div class="dg-flow">
        <div class="dg-box"><span class="bx-label">📋 bmsTester rows</span>
          <div class="dg-col">
            <span class="dg-pill">Komatsu · pass</span>
            <span class="dg-pill">Komatsu · fail</span>
            <span class="dg-pill">Hitachi · pass</span>
            <span class="dg-pill">Hitachi · pass</span>
            <span class="dg-pill">Denyo · fail</span>
          </div>
        </div>
        <div class="dg-link"><span class="dg-pill acc" data-hs="groupby">GROUP BY client</span><div class="dg-arrow flow"></div></div>
        <div class="dg-col">
          <div class="dg-node is-accent" data-hs="group"><span class="ni">🗂️</span><span class="nl">Komatsu</span><span class="ns">2 rows ka dher</span></div>
          <div class="dg-node is-accent" data-hs="group"><span class="ni">🗂️</span><span class="nl">Hitachi</span><span class="ns">2 rows ka dher</span></div>
          <div class="dg-node is-accent" data-hs="group"><span class="ni">🗂️</span><span class="nl">Denyo</span><span class="ns">1 row ka dher</span></div>
        </div>
        <div class="dg-link"><span class="dg-pill gold" data-hs="agg">COUNT(*) / AVG / SUM</span><div class="dg-arrow flow"></div></div>
        <div class="dg-node is-gold"><span class="ni">📊</span><span class="nl">Ek row per group</span><span class="ns">Komatsu: 2 · Hitachi: 2 · Denyo: 1</span></div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill acc" data-hs="where">WHERE — rows ka filter (GROUP BY se PEHLE)</span>
        <span class="dg-pill bad" data-hs="having">HAVING — groups ka filter (aggregate ke BAAD)</span>
      </div>
      <div class="dg-cap"><b>WHERE</b> pehle rows chhaan-ta hai, <b>GROUP BY</b> dher banata hai, aggregate har dher par ek number nikalta hai, phir <b>HAVING</b> un dhero ko chhaan-ta hai. Isiliye <code>WHERE COUNT(*) &gt; 1</code> error deta hai — us waqt tak COUNT bana hi nahi hota.</div>`,
  },

  casewhen: {
    t: 'CASE WHEN — SQL ka if-else',
    html: `
      <div class="dg-flow">
        <div class="dg-box is-accent"><span class="bx-label">🔀 CASE — row ke andar if-else</span>
          <div class="dg-col">
            <span class="dg-pill acc" data-hs="case">CASE WHEN status='fail' THEN 'CHECK' ELSE 'OK' END</span>
            <span class="dg-pill">har row ke liye ek value — naya column ban jaata hai</span>
          </div>
        </div>
        <div class="dg-link"><span class="dg-pill gold" data-hs="condagg">SUM(CASE ...) — jaadu yahan hai</span><div class="dg-arrow flow"></div></div>
        <div class="dg-box is-good"><span class="bx-label">📊 Conditional aggregation</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="sumcase">SUM(CASE WHEN status='pass' THEN 1 ELSE 0 END)</span>
            <span class="dg-pill good">= "sirf pass wali rows gino" — bina WHERE lagaye!</span>
          </div>
        </div>
      </div>
      <div class="dg-split" style="margin-top:14px">
        <div class="dg-box is-bad"><span class="bx-label">❌ WHERE se pass-rate</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="whereway">WHERE status='pass' GROUP BY client</span>
            <span class="dg-pill bad">fail rows hata diye → rate hamesha 100%</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">✅ CASE se pass-rate</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="rate">100.0 * SUM(CASE WHEN status='pass' THEN 1 ELSE 0 END) / COUNT(*)</span>
            <span class="dg-pill good">saari rows bachi — numerator aur denominator dono sahi</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>WHERE</b> rows <i>hata</i> deta hai; <b>CASE</b> unhe rakh ke sirf <i>gin-ti</i> badalta hai. Isiliye har "X ka percentage" wala sawal CASE maangta hai, WHERE nahi. Ek hi pass mein kai categories gin lo — yeh <b>pivot</b> ka bhi base hai.</div>`,
  },

  strdate: {
    t: 'String & Date functions — data ko shakal do',
    html: `
      <div class="dg-grid" style="grid-template-columns:1fr 1fr">
        <div class="dg-box is-accent"><span class="bx-label">🔤 String</span>
          <div class="dg-col">
            <span class="dg-pill acc" data-hs="concat">CONCAT(a, ' — ', b)</span>
            <span class="dg-pill">UPPER · LOWER · LENGTH · TRIM</span>
            <span class="dg-pill">SUBSTRING(s, 1, 4) · LEFT · RIGHT · REPLACE</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">📅 Date</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="year">YEAR() · MONTH() · DAY() · DATE()</span>
            <span class="dg-pill good" data-hs="datediff">DATEDIFF(a, b) — dinon ka farak</span>
            <span class="dg-pill">NOW() · CURDATE() · DATE_FORMAT()</span>
          </div>
        </div>
        <div class="dg-box is-gold"><span class="bx-label">🕳️ NULL-safe</span>
          <div class="dg-col">
            <span class="dg-pill gold" data-hs="coalesce">COALESCE(a, b, 'default')</span>
            <span class="dg-pill">IFNULL(x, 0) · NULLIF(a, b)</span>
          </div>
        </div>
        <div class="dg-box is-bad"><span class="bx-label">⚠️ Index ka dushman</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="fntrap">WHERE YEAR(d) = 2026 → full scan</span>
            <span class="dg-pill good">SELECT mein function OK, WHERE mein sochke</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>Function SELECT mein lagao — free hai.</b> <b>WHERE mein lagao — index chala jaata hai.</b> <code>COALESCE</code> woh NULL wala jaal band karta hai jo Level 3 mein mila tha: <code>CONCAT(a, NULL)</code> poora NULL de deta hai, isliye pehle <code>COALESCE</code> karo.</div>`,
  },

  keys: {
    t: 'Keys & Constraints — data ke pehredaar',
    html: `
      <div class="dg-flow">
        <div class="dg-box is-gold"><span class="bx-label">🔑 PRIMARY KEY</span>
          <div class="dg-col">
            <div class="dg-node is-gold" data-hs="pk"><span class="ni">🆔</span><span class="nl">id INT AUTO_INCREMENT</span><span class="ns">har row ka unique naam</span></div>
            <span class="dg-pill gold">NOT NULL + UNIQUE + fast lookup free</span>
          </div>
        </div>
        <div class="dg-box is-accent"><span class="bx-label">🛡️ Constraints</span>
          <div class="dg-col">
            <span class="dg-pill acc" data-hs="unique">UNIQUE — buildNum do baar nahi</span>
            <span class="dg-pill acc" data-hs="notnull">NOT NULL — khaali chalega hi nahi</span>
            <span class="dg-pill acc" data-hs="default">DEFAULT 'Not Built' — na do toh yeh</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">🆔 PK ke 2 style</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="autoinc">AUTO_INCREMENT INT — 1,2,3... simple, chhota</span>
            <span class="dg-pill good" data-hs="uuid">UUID — 'a1b2c3d4-...' — distributed-safe (bmsTester yahi karta hai)</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>Constraints DB-level rules hain</b> — app bug kare tab bhi galat data ghusega nahi. INSERT fail hoga: <code>Duplicate entry '1042' for key 'buildNum'</code>. Yeh error dost hai, dushman nahi.</div>`,
  },

  boss1: {
    t: 'Boss: Factory Report — sab kuch ek saath',
    html: `
      <div class="dg-ladder">
        <div class="dg-rung"><span class="lv">1</span><span class="cmd">SHOW TABLES / DESCRIBE</span><span class="q">database ko jaano</span></div>
        <div class="dg-rung a"><span class="lv">2</span><span class="cmd">SELECT + WHERE + ORDER BY</span><span class="q">sahi rows nikaalo</span></div>
        <div class="dg-rung g"><span class="lv">3</span><span class="cmd">GROUP BY + COUNT</span><span class="q">report banao</span></div>
        <div class="dg-rung a"><span class="lv">4</span><span class="cmd">INSERT / UPDATE (WHERE!)</span><span class="q">data theek karo</span></div>
        <div class="dg-rung"><span class="lv">🏆</span><span class="cmd">Query Pandit Certificate</span><span class="q">pehla track complete!</span></div>
      </div>
      <div class="dg-cap">Manager ne bola: "aaj ki test summary chahiye — kitne pass, kitne fail, kis client ke." Ab tumhare paas saare tools hain.</div>`,
  },

  /* ================= TRACK 2 — INTERMEDIATE ================= */

  joins: {
    t: 'INNER JOIN — do tables ka milan',
    html: `
      <div class="dg-flow">
        <div class="dg-box is-accent"><span class="bx-label">📋 bx50Data</span>
          <div class="dg-col">
            <span class="dg-pill acc">tokyo-01 · buildNum 1041</span>
            <span class="dg-pill acc">pune-01 · buildNum 1042</span>
            <span class="dg-pill bad">osaka-01 · buildNum 1099 ❓</span>
          </div>
        </div>
        <div class="dg-link"><span class="dg-pill gold" data-hs="on">ON d.buildNum = b.buildNum</span><div class="dg-arrow flow"></div></div>
        <div class="dg-box is-good"><span class="bx-label">📋 bx50Builds</span>
          <div class="dg-col">
            <span class="dg-pill good">1041 · Gen4</span>
            <span class="dg-pill good">1042 · Gen3</span>
            <span class="dg-pill">1044 · Gen4</span>
          </div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <div class="dg-node is-good" data-hs="inner"><span class="ni">🤝</span><span class="nl">INNER JOIN result</span><span class="ns">sirf matched: tokyo-01+Gen4, pune-01+Gen3</span></div>
        <div class="dg-node is-bad" data-hs="dropped"><span class="ni">🚮</span><span class="nl">osaka-01 gayab!</span><span class="ns">1099 ka koi build nahi — INNER drop kar deta hai</span></div>
      </div>
      <div class="dg-cap"><b>JOIN = dono tables ke rows ka combination jahan ON condition sach hai.</b> Alias do (<code>bx50Data d</code>), columns ko <code>d.buildNum</code> likho. INNER = sirf match hue rows.</div>`,
  },

  leftjoin: {
    t: 'LEFT JOIN — kisi ko peeche mat chhodo',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-accent" data-hs="left"><span class="ni">⬅️</span><span class="nl">LEFT table ke SAARE rows</span><span class="ns">operators — sab aayenge</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-good"><span class="ni">🤝</span><span class="nl">Match mila?</span><span class="ns">right ke columns bhar do</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-gold" data-hs="nullfill"><span class="ni">🕳️</span><span class="nl">Match nahi mila?</span><span class="ns">right ke columns = NULL</span></div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <div class="dg-box is-gold"><span class="bx-label">🕵️ Anti-join trick — "kaun chhoot gaya?"</span>
          <div class="dg-col">
            <span class="dg-pill gold" data-hs="antijoin">LEFT JOIN sessions s ... WHERE s.id IS NULL</span>
            <span class="dg-pill">= operators jinki EK BHI session nahi (Vikram pakda gaya 🙂)</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>LEFT JOIN</b> = left ke sab rows + right ka match (ya NULL). <b>WHERE right.col IS NULL</b> = jinke paas match NAHI — orphans, inactive users, bina-build device. Yeh pattern har interview mein aata hai.</div>`,
  },

  relations: {
    t: 'Relationships — FK, 1:N, N:M',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-gold" data-hs="one"><span class="ni">1️⃣</span><span class="nl">bx50Builds</span><span class="ns">ek build...</span></div>
        <div class="dg-link"><span class="dg-pill acc" data-hs="fk">FK: bx50Data.buildNum → bx50Builds.buildNum</span><div class="dg-arrow flow"></div></div>
        <div class="dg-node is-accent" data-hs="many"><span class="ni">🔢</span><span class="nl">bx50Data (N)</span><span class="ns">...par kai devices</span></div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <div class="dg-box is-good"><span class="bx-label">🔗 N:M — junction table</span>
          <div class="dg-flow">
            <div class="dg-node"><span class="ni">👤</span><span class="nl">operators</span></div>
            <div class="dg-arrow flow"></div>
            <div class="dg-node is-good pulse" data-hs="junction"><span class="ni">🪢</span><span class="nl">bx50Sessions</span><span class="ns">userId + buildNum</span></div>
            <div class="dg-arrow flow"></div>
            <div class="dg-node"><span class="ni">🏗️</span><span class="nl">bx50Builds</span></div>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>FK</b> = "yeh column doosri table ke PK ki taraf ishara karta hai". <b>1:N</b> = FK child mein. <b>N:M</b> = beech mein junction table (operator kai builds par, build par kai operators — sessions dono ko jodti hai). FK constraint orphans rokta hai (osaka-01 → 1099 jaisa).</div>`,
  },

  subquery: {
    t: 'Subquery — query ke andar query',
    html: `
      <div class="dg-box is-accent"><span class="bx-label">🎁 Outer query</span>
        <div class="dg-flow">
          <div class="dg-node is-accent"><span class="ni">🔍</span><span class="nl">SELECT bx50Name FROM bx50Data</span></div>
          <div class="dg-node is-gold" data-hs="insub"><span class="ni">📦</span><span class="nl">WHERE buildNum IN (…)</span><span class="ns">andar wali pehle chalti hai</span></div>
        </div>
        <div class="dg-box is-gold" style="margin-top:10px"><span class="bx-label">🎁 Inner query (subquery)</span>
          <div class="dg-node is-good" data-hs="inner"><span class="ni">🔍</span><span class="nl">SELECT buildNum FROM bx50Builds WHERE type='Gen4'</span><span class="ns">→ (1041, 1043, 1044, ...)</span></div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill good" data-hs="joinvs">JOIN se bhi yahi hota — dono aana chahiye</span>
        <span class="dg-pill acc">Subquery = padhne mein saaf "list banao, phir filter"</span>
        <span class="dg-pill gold">JOIN = jab dono tables ke columns output mein chahiye</span>
      </div>
      <div class="dg-cap"><b>IN (SELECT ...)</b> = inner query ek list deti hai, outer usme check karta hai. Columns sirf outer table ke chahiye → subquery saaf. Dono ke chahiye → JOIN. Correlated subquery (har row ke liye dobara) slow ho sakti hai — EXPLAIN se dekho.</div>`,
  },

  normal: {
    t: 'Normalization — god-table se 3NF tak',
    html: `
      <div class="dg-flow">
        <div class="dg-box is-bad"><span class="bx-label">😱 God-table (asli bx50Data ~40 columns!)</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="god">device + build info + 8 passwords + customer + notes sab EK table</span>
            <span class="dg-pill bad">customerLocation har device row mein repeat</span>
            <span class="dg-pill bad">customer ka naam badla = 50 rows update</span>
          </div>
        </div>
        <div class="dg-link"><span class="dg-pill gold" data-hs="split">normalize</span><div class="dg-arrow flow"></div></div>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="devices"><span class="ni">📋</span><span class="nl">devices</span><span class="ns">id, name, ip, buildNum FK, customerId FK</span></div>
          <div class="dg-node is-good"><span class="ni">📋</span><span class="nl">customers</span><span class="ns">id, name, location — EK jagah</span></div>
          <div class="dg-node is-good"><span class="ni">📋</span><span class="nl">credentials</span><span class="ns">deviceId FK, secrets alag (access control!)</span></div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:10px">
        <span class="dg-pill acc" data-hs="nf1">1NF: har cell mein EK value (CSV list nahi)</span>
        <span class="dg-pill acc" data-hs="nf3">3NF: har column sirf PK par depend kare</span>
        <span class="dg-pill gold" data-hs="denorm">Kabhi-kabhi denormalize bhi — reporting speed ke liye (samajh ke!)</span>
      </div>
      <div class="dg-cap"><b>Duplicate data = update anomaly ka ghar.</b> Ek fact ek jagah, baaki jagah FK. Par dogma nahi — analytics tables mein jaan-boojh ke denormalize karte hain. Pehle normal, phir zaroorat par samjhauta.</div>`,
  },

  setops: {
    t: 'UNION aur Self-Join — rows jodo, table ko khud se jodo',
    html: `
      <div class="dg-split">
        <div class="dg-box is-accent"><span class="bx-label">➕ UNION — rows upar-neeche jodo</span>
          <div class="dg-col">
            <div class="dg-node is-accent"><span class="ni">📋</span><span class="nl">Query A</span><span class="ns">3 rows</span></div>
            <span class="dg-pill acc" data-hs="union">UNION (duplicates hata deta hai)</span>
            <div class="dg-node is-accent"><span class="ni">📋</span><span class="nl">Query B</span><span class="ns">2 rows</span></div>
            <span class="dg-pill gold" data-hs="unionall">UNION ALL — sab rakho, tez bhi</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">🔗 JOIN — columns bagal mein jodo</span>
          <div class="dg-col">
            <span class="dg-pill good">JOIN = chaudai badhti hai (naye columns)</span>
            <span class="dg-pill acc">UNION = lambai badhti hai (naye rows)</span>
            <span class="dg-pill bad" data-hs="cols">UNION mein dono taraf ke columns ka count aur order same hona chahiye</span>
          </div>
        </div>
      </div>
      <div class="dg-box is-gold" style="margin-top:14px"><span class="bx-label">🪞 SELF-JOIN — ek hi table, do alias</span>
        <div class="dg-flow">
          <div class="dg-node is-gold" data-hs="selfa"><span class="ni">👤</span><span class="nl">operators a</span><span class="ns">"pehla banda"</span></div>
          <div class="dg-link"><span class="dg-pill gold" data-hs="selfon">ON a.shift = b.shift AND a.opId &lt; b.opId</span><div class="dg-arrow flow"></div></div>
          <div class="dg-node is-gold" data-hs="selfb"><span class="ni">👤</span><span class="nl">operators b</span><span class="ns">"doosra banda"</span></div>
        </div>
        <div class="dg-flow" style="margin-top:8px">
          <span class="dg-pill">same shift ke jode · manager-employee · pichhli row se compare</span>
          <span class="dg-pill bad" data-hs="lessthan">a.id &lt; b.id — warna har jodi DO baar aayegi (aur khud se bhi jud jayega)</span>
        </div>
      </div>
      <div class="dg-cap"><b>UNION</b> = rows ka jod (columns match karne chahiye). <b>UNION ALL</b> duplicates rakhta hai aur tez hai — default yahi chuno jab tak duplicate hatana zaroori na ho. <b>Self-join</b> = table ko khud se jodna, do alias se — "same X wale jode" aur hierarchy ke liye.</div>`,
  },

  indexes: {
    t: 'Index — kitaab ka index, table ka B-tree',
    html: `
      <div class="dg-split">
        <div class="dg-box is-bad"><span class="bx-label">🐌 Bina index</span>
          <div class="dg-col">
            <div class="dg-node is-bad" data-hs="fullscan"><span class="ni">📖</span><span class="nl">FULL TABLE SCAN</span><span class="ns">type: ALL — har row padho</span></div>
            <span class="dg-pill bad">1M rows = 1M reads har query par</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">⚡ Index ke saath</span>
          <div class="dg-col">
            <div class="dg-node is-good pulse" data-hs="btree"><span class="ni">🌳</span><span class="nl">B-tree seedha row tak</span><span class="ns">type: ref — ~log(n) reads</span></div>
            <span class="dg-pill good">CREATE INDEX idx_loc ON bx50Data(customerLocation)</span>
          </div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill acc" data-hs="explain">EXPLAIN SELECT ... ← plan dekho, andaza mat lagao</span>
        <span class="dg-pill bad" data-hs="writecost">Har index INSERT/UPDATE ko thoda slow karta hai</span>
        <span class="dg-pill gold" data-hs="whatidx">Kis par? WHERE / JOIN ON / ORDER BY wale columns</span>
      </div>
      <div class="dg-cap"><b>EXPLAIN</b> ka <code>type: ALL</code> = full scan (bura for big tables), <code>ref/const</code> = index lag raha. Index un columns par jo WHERE/JOIN mein baar-baar aate hain. Sab par mat lagao — writes mehnge ho jaate hain.</div>`,
  },

  migrations: {
    t: 'ALTER & Migrations — schema badalna bina tode',
    html: `
      <div class="dg-ladder">
        <div class="dg-rung" data-hs="add"><span class="lv">➕</span><span class="cmd">ALTER TABLE t ADD COLUMN barcode VARCHAR(50)</span><span class="q">safe — purani rows NULL/default</span></div>
        <div class="dg-rung a" data-hs="modify"><span class="lv">🔧</span><span class="cmd">ALTER TABLE t MODIFY duration BIGINT</span><span class="q">asli migration: INT overflow fix!</span></div>
        <div class="dg-rung g" data-hs="drop"><span class="lv">🗑️</span><span class="cmd">ALTER TABLE t DROP COLUMN old_col</span><span class="q">khatarnaak — data wapas nahi aata</span></div>
        <div class="dg-rung" data-hs="files"><span class="lv">📁</span><span class="cmd">migrations/2026-07-21-add-barcode.sql</span><span class="q">har change ek dated file — git mein</span></div>
        <div class="dg-rung a" data-hs="updown"><span class="lv">↕️</span><span class="cmd">up() apply · down() rollback</span><span class="q">aage bhi, peeche bhi</span></div>
      </div>
      <div class="dg-cap"><b>Schema kabhi haath se prod par mat badlo.</b> Migration file likho (up + down), review karo, sequencially apply karo. Asli project mein 79 migration files mili — "add-barcode-col", "change-duration-to-bigint", "remove-unique-macAddress" — har ek ek kahani.</div>`,
  },

  boss2: {
    t: 'Boss: Slow Dashboard — JOIN + Index + EXPLAIN',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-bad pulse"><span class="ni">🐌</span><span class="nl">Dashboard 14s</span><span class="ns">manager gussa</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-accent" data-hs="explain"><span class="ni">🔬</span><span class="nl">EXPLAIN</span><span class="ns">type: ALL dikha</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-gold" data-hs="index"><span class="ni">⚡</span><span class="nl">CREATE INDEX</span><span class="ns">JOIN/WHERE columns par</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-good"><span class="ni">🚀</span><span class="nl">0.2s</span><span class="ns">hero ban gaye</span></div>
      </div>
      <div class="dg-cap">Report chahiye: har operator ke naam ke saath uski sessions ka count aur total duration, sirf active builds par. JOIN + GROUP BY + EXPLAIN + INDEX — sab ek mission mein.</div>`,
  },

  /* ================= TRACK 3 — ADVANCED ================= */

  transactions: {
    t: 'Transaction — sab hoga ya kuch nahi (ACID)',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-accent" data-hs="begin"><span class="ni">🔒</span><span class="nl">BEGIN</span><span class="ns">transaction shuru</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node" ><span class="ni">✏️</span><span class="nl">UPDATE + INSERT</span><span class="ns">kai changes</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="commit"><span class="ni">✅</span><span class="nl">COMMIT</span><span class="ns">sab permanent</span></div>
          <div class="dg-node is-bad" data-hs="rollback"><span class="ni">↩️</span><span class="nl">ROLLBACK</span><span class="ns">jaise kuch hua hi nahi</span></div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill acc" data-hs="atomic">A — Atomic: sab ya kuch nahi</span>
        <span class="dg-pill good" data-hs="consistent">C — Consistent: rules kabhi na tootein</span>
        <span class="dg-pill gold" data-hs="isolated">I — Isolated: parallel txns aapas mein na ghusein</span>
        <span class="dg-pill bad" data-hs="durable">D — Durable: COMMIT ke baad crash bhi ho, data bacha</span>
      </div>
      <div class="dg-cap"><b>Do-table wala kaam (test result + summary counter) hamesha transaction mein.</b> Beech mein crash = aadha data, bina txn ke. BEGIN → verify → COMMIT bhi risky UPDATE ka seatbelt hai.</div>`,
  },

  isolation: {
    t: 'Isolation Levels — parallel duniya ke jhagde',
    html: `
      <div class="dg-ladder">
        <div class="dg-rung g" data-hs="readuncommitted"><span class="lv">1</span><span class="cmd">READ UNCOMMITTED</span><span class="q">dirty read — doosre ka bina-COMMIT data dikh gaya 😱</span></div>
        <div class="dg-rung" data-hs="readcommitted"><span class="lv">2</span><span class="cmd">READ COMMITTED</span><span class="q">sirf committed dikhta — par do baar padho toh alag mil sakta</span></div>
        <div class="dg-rung a" data-hs="repeatable"><span class="lv">3</span><span class="cmd">REPEATABLE READ (MySQL default)</span><span class="q">txn ke andar consistent snapshot</span></div>
        <div class="dg-rung g" data-hs="serializable"><span class="lv">4</span><span class="cmd">SERIALIZABLE</span><span class="q">jaise ek-ek karke chale — sabse safe, sabse slow</span></div>
      </div>
      <div class="dg-flow" style="margin-top:10px">
        <span class="dg-pill bad" data-hs="lostupdate">Lost update: dono ne padha 10, dono ne +1 likha → 11 (12 hona tha)</span>
        <span class="dg-pill gold" data-hs="forupdate">Fix: SELECT ... FOR UPDATE (row lock) ya atomic UPDATE c = c + 1</span>
      </div>
      <div class="dg-cap"><b>Counter race ka asli fix:</b> <code>UPDATE t SET count = count + 1</code> — padho-phir-likho mat karo. Deadlock = do txn ek doosre ke lock ka intezaar — DB ek ko maar deta hai, app retry kare.</div>`,
  },

  views: {
    t: 'Views & CTEs — query ko naam do',
    html: `
      <div class="dg-split">
        <div class="dg-box is-accent"><span class="bx-label">🪟 VIEW — stored query</span>
          <div class="dg-col">
            <span class="dg-pill acc" data-hs="view">CREATE VIEW failed_tests AS SELECT ... WHERE status='fail'</span>
            <span class="dg-pill">phir: SELECT * FROM failed_tests — table jaisa</span>
            <span class="dg-pill good">complex JOIN chhupao, sabko simple naam do</span>
          </div>
        </div>
        <div class="dg-box is-gold"><span class="bx-label">📝 CTE — WITH (query-local naam)</span>
          <div class="dg-col">
            <span class="dg-pill gold" data-hs="cte">WITH pass_rate AS (SELECT ...) SELECT * FROM pass_rate WHERE ...</span>
            <span class="dg-pill">ek hi query ke andar — readable steps</span>
          </div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <div class="dg-node is-good" data-hs="security"><span class="ni">🛡️</span><span class="nl">View = security bhi</span><span class="ns">bx50Data ke password columns chhupa ke baaki de do</span></div>
      </div>
      <div class="dg-cap"><b>View</b> = reusable, DB mein stored (asli app mein password-wale god-table ke upar ek safe view perfect hota). <b>CTE</b> = ek query ke andar ka intermediate naam — lambi query ko kahani ki tarah padhne do.</div>`,
  },

  windowfn: {
    t: 'Window Functions — group karo par rows mat kho',
    html: `
      <div class="dg-split">
        <div class="dg-box"><span class="bx-label">📊 GROUP BY</span>
          <div class="dg-col">
            <span class="dg-pill">5 rows → 2 group rows</span>
            <span class="dg-pill bad">detail rows GAYAB</span>
          </div>
        </div>
        <div class="dg-box is-gold"><span class="bx-label">🪜 Window (OVER)</span>
          <div class="dg-col">
            <span class="dg-pill gold" data-hs="over">AVG(duration) OVER (PARTITION BY userId)</span>
            <span class="dg-pill good">5 rows → 5 rows + har row par uske group ka AVG</span>
          </div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill acc" data-hs="rownumber">ROW_NUMBER() OVER (PARTITION BY client ORDER BY date DESC) = 1 → har client ka latest test</span>
        <span class="dg-pill good" data-hs="rank">RANK() — leaderboard with ties</span>
        <span class="dg-pill gold" data-hs="lag">LAG() — pichhli row se compare (trend)</span>
      </div>
      <div class="dg-cap"><b>"Har group ka latest/top-N row"</b> — yeh sawal GROUP BY se nahi hota, ROW_NUMBER() se hota hai. Asli app mein "latestDevice" boolean column rakha tha — window function se woh column hi hata sakte the!</div>`,
  },

  cte: {
    t: 'CTE — lambi query ko kahani banao',
    html: `
      <div class="dg-split">
        <div class="dg-box is-bad"><span class="bx-label">😵 Nested subqueries</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="nested">SELECT * FROM (SELECT ... FROM (SELECT ...))</span>
            <span class="dg-pill bad">andar se bahar padho — dimaag ulta chalta hai</span>
          </div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">📖 CTE — upar se neeche</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="with">WITH totals AS (...), ranked AS (...)</span>
            <span class="dg-pill good">SELECT ... FROM ranked</span>
            <span class="dg-pill">har step ka naam — kahani ki tarah padho</span>
          </div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:14px">
        <div class="dg-node is-accent" data-hs="step1"><span class="ni">1️⃣</span><span class="nl">totals</span><span class="ns">per-operator count</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-accent" data-hs="step2"><span class="ni">2️⃣</span><span class="nl">ranked</span><span class="ns">totals par ROW_NUMBER</span></div>
        <div class="dg-arrow flow"></div>
        <div class="dg-node is-good" data-hs="step3"><span class="ni">3️⃣</span><span class="nl">final SELECT</span><span class="ns">ranked se top 3</span></div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill gold" data-hs="chain">Ek CTE agle CTE ko use kar sakta hai</span>
        <span class="dg-pill acc" data-hs="reuse">Ek hi CTE query mein kai baar use ho sakta hai</span>
        <span class="dg-pill bad" data-hs="scope">Par sirf USI query mein zinda — view ke ulta</span>
      </div>
      <div class="dg-cap"><b>CTE = query-local naam.</b> Nested subquery ko naam de do aur woh readable ban jaati hai. Window function ke saath jodi bana ke <b>top-N-per-group</b> ka sabse saaf roop banta hai: <code>WITH ranked AS (… ROW_NUMBER() …) SELECT * FROM ranked WHERE rn = 1</code>.</div>`,
  },

  tuning: {
    t: 'Query Tuning — N+1 se keyset tak',
    html: `
      <div class="dg-grid" style="grid-template-columns:1fr 1fr">
        <div class="dg-box is-bad"><span class="bx-label">🐌 N+1 queries</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="nplus1">loop mein: har device ke liye alag SELECT build</span>
            <span class="dg-pill good">fix: EK JOIN query</span>
          </div>
        </div>
        <div class="dg-box is-bad"><span class="bx-label">🐌 SELECT *</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="selectstar">40 columns + passwords utha laye, chahiye the 2</span>
            <span class="dg-pill good">fix: naam le kar columns maango</span>
          </div>
        </div>
        <div class="dg-box is-bad"><span class="bx-label">🐌 OFFSET 100000</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="offset">page 5000: 100050 rows padho, 100000 phenko</span>
            <span class="dg-pill good" data-hs="keyset">fix: WHERE id > last_seen LIMIT 50 (keyset)</span>
          </div>
        </div>
        <div class="dg-box is-bad"><span class="bx-label">🐌 Function on column</span>
          <div class="dg-col">
            <span class="dg-pill bad" data-hs="fncol">WHERE YEAR(startDate) = 2026 → index bekaar</span>
            <span class="dg-pill good">fix: WHERE startDate BETWEEN '2026-01-01' AND ...</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>Pehle EXPLAIN, phir opinion.</b> 4 sabse common slowdowns: N+1 loop, SELECT *, deep OFFSET, aur indexed column par function. Chaaron ka ilaaj upar hai.</div>`,
  },

  sqlsec: {
    t: 'SQL Injection — sabse purana, sabse khatarnaak',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-bad" data-hs="concat"><span class="ni">😱</span><span class="nl">"...WHERE name = '" + userInput + "'"</span><span class="ns">string jod ke query</span></div>
        <div class="dg-arrow bad"></div>
        <div class="dg-node is-bad"><span class="ni">💉</span><span class="nl">input: ' OR '1'='1</span><span class="ns">poori table leak</span></div>
        <div class="dg-arrow bad"></div>
        <div class="dg-node is-bad" data-hs="droptable"><span class="ni">☠️</span><span class="nl">'; DROP TABLE bx50Data; --</span><span class="ns">Bobby Tables 🙏</span></div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <div class="dg-box is-good"><span class="bx-label">🛡️ Bachav</span>
          <div class="dg-col">
            <span class="dg-pill good" data-hs="prepared">Prepared statement: WHERE name = ? — input DATA rehta hai, SQL nahi banta</span>
            <span class="dg-pill acc" data-hs="leastpriv">App user ko sirf zaroori GRANT — DROP ka right hi nahi</span>
            <span class="dg-pill gold">ORM (Sequelize) placeholders use karta hai — raw query mein bhi ? use karo</span>
          </div>
        </div>
      </div>
      <div class="dg-cap"><b>Rule ek hi hai: user input kabhi SQL string mein concatenate nahi hota.</b> Placeholders (?) hamesha. Aur app ka DB user root nahi hota — GRANT SELECT, INSERT, UPDATE bas.</div>`,
  },

  backup: {
    t: 'Backup & Replication — neend ka insurance',
    html: `
      <div class="dg-flow">
        <div class="dg-node is-accent pulse" data-hs="primary"><span class="ni">🗄️</span><span class="nl">Primary</span><span class="ns">sab writes yahan</span></div>
        <div class="dg-link"><span class="dg-pill acc" data-hs="binlog">binlog stream</span><div class="dg-arrow flow"></div></div>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="replica"><span class="ni">📖</span><span class="nl">Read replica</span><span class="ns">reports/dashboards yahan</span></div>
          <div class="dg-node is-good"><span class="ni">📖</span><span class="nl">Replica 2</span><span class="ns">failover candidate</span></div>
        </div>
      </div>
      <div class="dg-flow" style="margin-top:12px">
        <span class="dg-pill gold" data-hs="dump">mysqldump nightly = logical backup (SQL file)</span>
        <span class="dg-pill acc" data-hs="pitr">binlog + last dump = point-in-time recovery ("3:07 PM se pehle tak wapas")</span>
        <span class="dg-pill bad" data-hs="testrestore">Untested backup = koi backup nahi. Restore drill karo!</span>
      </div>
      <div class="dg-cap"><b>Replication ≠ backup!</b> Galat DELETE replica par bhi turant replicate ho jaata hai. Backup = alag copy + binlog se point-in-time. Aur restore practice ke bina backup sirf ek ummeed hai.</div>`,
  },

  boss3: {
    t: 'Final Boss — 3AM: Database Down',
    html: `
      <div class="dg-ladder">
        <div class="dg-rung"><span class="lv">🚨</span><span class="cmd">3:07 AM — dashboard 500, factory line ruki</span><span class="q">panic nahi, plan</span></div>
        <div class="dg-rung a" data-hs="diag"><span class="lv">1</span><span class="cmd">Diagnose: kya toota?</span><span class="q">anti-join · EXPLAIN · SELECT se verify</span></div>
        <div class="dg-rung g" data-hs="txn"><span class="lv">2</span><span class="cmd">Transaction se surgical fix</span><span class="q">BEGIN → verify → COMMIT</span></div>
        <div class="dg-rung a" data-hs="idx"><span class="lv">3</span><span class="cmd">Index + EXPLAIN se speed wapas</span><span class="q">type: ALL → ref</span></div>
        <div class="dg-rung g"><span class="lv">4</span><span class="cmd">Injection hole band karo</span><span class="q">prepared statements</span></div>
        <div class="dg-rung"><span class="lv">👑</span><span class="cmd">Database Mahaguru Certificate</span><span class="q">tum production-ready ho</span></div>
      </div>
      <div class="dg-cap">Saara seekha hua ek raat mein: diagnose → fix in transaction → optimize → harden. Yehi asli DBA ka din (raat 🙂) hai.</div>`,
  },

  composite: {
    t: 'Composite index — column ka KRAM hi sab kuch hai',
    html: `
      <div class="dg-flow">
        <span class="dg-pill acc">CREATE INDEX ix ON bx50Sessions(userId, buildNum, startDate)</span>
      </div>
      <div class="dg-ladder" style="margin-top:10px">
        <div class="dg-rung" data-hs="prefix1"><span class="lv">✅</span><span class="cmd">WHERE userId = 'OP-101'</span><span class="q">1/3 — index lagega</span></div>
        <div class="dg-rung" data-hs="prefix2"><span class="lv">✅</span><span class="cmd">WHERE userId = 'OP-101' AND buildNum = 1041</span><span class="q">2/3 — aur gehra</span></div>
        <div class="dg-rung" data-hs="prefix3"><span class="lv">✅</span><span class="cmd">WHERE userId = … AND buildNum = … AND startDate &gt; …</span><span class="q">3/3 — poora index</span></div>
        <div class="dg-rung" data-hs="broken"><span class="lv">❌</span><span class="cmd">WHERE buildNum = 1041</span><span class="q">FULL SCAN — leading column chhoda</span></div>
        <div class="dg-rung" data-hs="broken2"><span class="lv">❌</span><span class="cmd">WHERE startDate &gt; '2026-01-01'</span><span class="q">FULL SCAN — wahi wajah</span></div>
      </div>

      <div class="dg-rule"></div>

      <div class="dg-split">
        <div class="dg-box is-bad"><span class="bx-label">📞 Phone book ulta rakh do</span>
          <div class="dg-col">
            <div class="dg-node is-bad"><span class="ni">📕</span><span class="nl">(lastName, firstName)</span><span class="ns">"Sharma" dhoondo → 1 second<br>"Priya" dhoondo → poori kitaab</span></div>
          </div>
          <div class="dg-cap">Index <b>sorted</b> hota hai — pehle column se. Doosre column ke andar order sirf <b>us</b> pehle column ke andar hai.</div>
        </div>
        <div class="dg-box is-good"><span class="bx-label">🎯 Column ka kram kaise chuno</span>
          <div class="dg-stack">
            <div class="dg-node is-good" data-hs="equality"><span class="ni">1️⃣</span><span class="nl">Equality columns pehle</span><span class="ns">WHERE x = ? wale</span></div>
            <div class="dg-node is-accent" data-hs="range"><span class="ni">2️⃣</span><span class="nl">Range column AAKHIR mein</span><span class="ns">&gt; &lt; BETWEEN — uske baad index ruk jaata hai</span></div>
            <div class="dg-node is-muted" data-hs="selective"><span class="ni">3️⃣</span><span class="nl">Zyada selective pehle</span><span class="ns">jo sabse zyada rows kaate</span></div>
          </div>
        </div>
      </div>

      <div class="dg-rule"></div>
      <div class="dg-legend">
        <span class="dg-pill good" data-hs="covering">🏆 COVERING INDEX</span>
        <span>Query ke SAARE columns index mein hain → table chhune ki zaroorat hi nahi (<code>Extra: Using index</code>)</span>
      </div>
      <div class="dg-cap"><b>5 alag single-column indexes ≠ ek composite index.</b>
        MySQL aksar ek hi index chunta hai. Aur har extra index har
        <code>INSERT/UPDATE/DELETE</code> ko dheema karta hai — index muft nahi hai,
        woh <b>write par tax</b> hai.</div>`,
  },

  locking: {
    t: 'Row locks aur deadlock — do transactions, ulta kram',
    html: `
      <div class="dg-split">
        <div class="dg-box is-bad"><span class="bx-label">💀 DEADLOCK — ulta kram</span>
          <div class="dg-stack">
            <div class="dg-node is-accent" data-hs="txA"><span class="ni">🅰️</span><span class="nl">Tx A</span><span class="ns">lock row 1 ✅<br>phir row 2 maango ⏳</span></div>
            <div class="dg-node is-gold" data-hs="txB"><span class="ni">🅱️</span><span class="nl">Tx B</span><span class="ns">lock row 2 ✅<br>phir row 1 maango ⏳</span></div>
            <div class="dg-node is-bad" data-hs="cycle"><span class="ni">🔄</span><span class="nl">CYCLE</span><span class="ns">A → B → A<br>dono hamesha ke liye rukenge</span></div>
          </div>
          <div class="dg-cap">InnoDB cycle <b>detect</b> karta hai aur ek transaction ko
            <code>ERROR 1213</code> de ke maar deta hai. Doosra chal padta hai.</div>
        </div>

        <div class="dg-box is-good"><span class="bx-label">✅ ILAAJ — hamesha ek hi kram</span>
          <div class="dg-stack">
            <div class="dg-node is-good" data-hs="order"><span class="ni">🔢</span><span class="nl">Consistent lock order</span><span class="ns">dono transactions pehle chhoti id, phir badi</span></div>
            <div class="dg-node is-good" data-hs="short"><span class="ni">⏱️</span><span class="nl">Transaction chhoti rakho</span><span class="ns">lock jitni der, takraav utna zyada</span></div>
            <div class="dg-node is-good" data-hs="retry"><span class="ni">🔁</span><span class="nl">1213 par RETRY karo</span><span class="ns">deadlock normal hai — app ko dobara koshish karni chahiye</span></div>
          </div>
          <div class="dg-cap">Deadlock ko "rok dena" nahi hota — usse <b>durlabh</b> banao aur
            <b>handle</b> karo.</div>
        </div>
      </div>

      <div class="dg-rule"></div>
      <div class="dg-legend">
        <span class="dg-pill acc" data-hs="forupdate">SELECT … FOR UPDATE</span>
        <span>row par <b>write lock</b> — read-modify-write ke liye. Bina iske "lost update" hota hai.</span>
      </div>
      <div class="dg-legend">
        <span class="dg-pill" data-hs="shared">SELECT … LOCK IN SHARE MODE</span>
        <span>read lock — doosre padh sakte hain, likh nahi sakte</span>
      </div>
      <div class="dg-legend">
        <span class="dg-pill bad" data-hs="gap">GAP LOCK</span>
        <span>REPEATABLE READ mein range par lock — jo row abhi hai hi nahi, uspar bhi. Isi se
          "maine sirf ek row chhui thi, deadlock kaise?" wale rahasya bante hain.</span>
      </div>
      <div class="dg-cap"><b>Sabse zaroori baat:</b> lock <code>UPDATE</code> ke waqt lagta hai aur
        <code>COMMIT</code>/<code>ROLLBACK</code> tak <b>rehta</b> hai — statement khatam hone par nahi.
        Isliye ek lambi transaction poori table ko bandhak bana sakti hai.</div>`,
  },
};

/* ===== TRACK 4 — Scale & Internals ===== */
VISUALS['pooling'] = {
  t: 'Connection pool — CPU 10% par timeout',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">CPU 10%</span>
      <span class="dg-pill">Memory 40%</span>
      <span class="dg-pill good">health ✅</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill bad">sab timeout 💥</span>
    </div>
    <div class="dg-cap">Server "aaram se" baitha hai — kyunki threads <b>kaam</b> nahi kar rahe,
      <b>intezaar</b> kar rahe hain. Aur intezaar CPU nahi khaata.</div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill acc">capacity (rps)</span><span class="dg-arrow">=</span>
      <span class="dg-pill">pool_size</span><span class="dg-arrow">×</span>
      <span class="dg-pill">1000 / query_ms</span>
    </div>
    <div class="dg-cap"><b>Little's Law.</b> 20 ms ki query par ek connection = 50 rps.
      Do knobs hain — aur log lagbhag hamesha galat wala ghumate hain.</div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚠️ POOL BADHANA MUFT NAHI</span>
      <span>Har connection DB par ek process/thread hai. Ek hadd ke baad woh aapas mein
        ladte hain aur <b>har query dheemi</b> ho jaati hai — 500 connections aksar 50 se bure.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">🎯 SAHI KRAM</span>
      <span><b>Pehle query tez karo</b> (80→20 ms = capacity 4x, muft),
        <b>phir</b> pool badhao.</span>
    </div>`,
};

VISUALS['locks'] = {
  t: 'Check-then-act race — aur teen ilaaj',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">A: SELECT qty → 1</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill bad">B: SELECT qty → 1</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill">A: UPDATE → 0</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill bad">B: UPDATE → -1 💥</span>
    </div>
    <div class="dg-cap">Dono ne <b>purani sachchai</b> padhi. Aur <code>BEGIN…COMMIT</code>
      ise nahi rokta — transaction <b>atomicity</b> deta hai, <b>mutual exclusion nahi</b>.</div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">⚡ 1. Atomic condition — sabse saaf</span>
        <div class="dg-cap"><code>UPDATE stock SET qty = qty - 1<br>WHERE id = 7 AND qty &gt; 0;</code>
          <br><br>Check aur write <b>ek hi statement</b> mein → beech mein khaali jagah bachti hi nahi.
          <br><code>affected rows = 1</code> → mila · <code>0</code> → khatam tha.</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">🔒 2. Pessimistic</span>
        <div class="dg-cap"><code>SELECT … FOR UPDATE</code>
          <br>Doosri request <b>rukti</b> hai.
          <br>→ hot row par sahi</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">🔁 3. Optimistic</span>
        <div class="dg-cap"><code>UPDATE … WHERE version = ?</code>
          <br>Haarne wali ko <code>0 rows</code>.
          <br>→ kam takraav par sahi</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🪟 MVCC</span>
      <span>Har row ke kai <b>versions</b>. Reader purana snapshot padhta hai, writer naya banata hai —
        isliye <b>readers writers ko block nahi karte</b>. Par <b>writer-writer</b> abhi bhi rukte hain,
        aur bahut lambi transaction purane versions ko saaf hone se rokti hai.</span>
    </div>`,
};

VISUALS['joinalgo'] = {
  t: 'JOIN andar se — aur optimizer ka anumaan',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🔁</span><span class="cmd">Nested loop</span><span class="q">har bahar row → andar lookup. Index ho toh 🏆, na ho toh <b>N × M</b> 💥</span></div>
      <div class="dg-rung"><span class="lv">#️⃣</span><span class="cmd">Hash join</span><span class="q">chhoti ki hash table + badi ka <b>ek</b> scan → N + M. Bade JOIN bina index</span></div>
      <div class="dg-rung"><span class="lv">🤐</span><span class="cmd">Merge join</span><span class="q">dono sorted hon toh zipper ki tarah</span></div>
    </div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Bina index</span>
        <div class="dg-cap"><code>10,000 orders × 10,000 customers</code>
          <br>= <b>10 crore</b> row comparisons
          <br>= <b>~14 second</b>, CPU 100%
          <br><br>EXPLAIN mein nishaan: andar wali table par <code>type: ALL</code></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Andar wali par index</span>
        <div class="dg-cap"><code>CREATE INDEX ON customers(id)</code>
          <br>= <b>10,000</b> index seeks
          <br>= <b>~40 ms</b> — 350x tez
          <br><br>Bahar wali par index bekaar hai — woh poori padhni hi hai.</div>
      </div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">1. type</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill">2. key</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill">3. rows</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill">4. Extra</span>
    </div>
    <div class="dg-cap"><b>EXPLAIN padhne ka kram.</b>
      <code>type: ALL</code> = poora scan · <code>key: NULL</code> = index laga hi nahi ·
      <code>Extra: Using filesort/temporary</code> = chhupa hua kaam ·
      <code>Using index</code> = 🏆 covering (asli table chhui hi nahi).</div>
    <div class="dg-legend">
      <span class="dg-pill bad">🎲 rows EK ANUMAAN HAI</span>
      <span><code>rows: 12</code> par query 8 lakh rows par chali? <b>Statistics purani hain</b> —
        optimizer ne galat anumaan par plan chuna. <code>ANALYZE TABLE</code> chalao,
        khaas kar bade bulk load ya migration ke <b>baad</b>.</span>
    </div>`,
};

VISUALS['indextypes'] = {
  t: 'Index ke types — kaunsa kab, aur kaunsa bekaar',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🌳</span><span class="cmd">B-tree (default)</span><span class="q"><code>=</code> · range · <code>LIKE 'abc%'</code> · ORDER BY — <b>99% jawab yahi hai</b></span></div>
      <div class="dg-rung"><span class="lv">#️⃣</span><span class="cmd">Hash</span><span class="q">sirf <code>=</code>, usme thoda tez. Range ❌ ORDER BY ❌</span></div>
      <div class="dg-rung"><span class="lv">📝</span><span class="cmd">Fulltext</span><span class="q">shabd dhoondna + relevance. <code>LIKE '%abc%'</code> ka ekmatr jawab</span></div>
      <div class="dg-rung"><span class="lv">🗺️</span><span class="cmd">Spatial</span><span class="q">"paas mein kya hai" — geo queries</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">📉 Selectivity — kab BEKAAR</span>
        <div class="dg-cap"><code>status (2 values) → 0.000002</code> ❌
          <br><code>country (195)&nbsp;&nbsp;&nbsp;&nbsp;→ theek-thaak</code> ⚠️
          <br><code>email (sab alag)&nbsp; → 1.0</code> ✅
          <br><br>Aadhi table laut aaye toh index padho <b>aur phir</b> 5 lakh rows uthao —
          poore scan se mehenga. Optimizer use <b>ignore</b> kar dega, aur sahi karega.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🏆 Covering index</span>
        <div class="dg-cap"><code>SELECT user_id, amount<br>WHERE user_id = 42</code>
          <br><br><code>(user_id)</code> → har row table se uthani padi
          <br><code>(user_id, amount)</code> → <b>table chhui hi nahi</b>
          <br><br>EXPLAIN: <b>Using index</b> 🏆</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🔢 COMPOSITE KA KRAM</span>
      <span><b>Equality pehle, phir sort/range.</b> <code>(user_id, created_at)</code> —
        user_id ne rows chhaanti, created_at pehle se sorted tha → <b>ORDER BY muft</b>.
        Ulta karo toh <b>range ke baad index ruk jaata hai</b>.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">✂️ PARTIAL &amp; FUNCTIONAL</span>
      <span><code>CREATE INDEX … WHERE status='pending'</code> → 10 lakh ki jagah 800 rows ka index.
        <code>CREATE INDEX ON users(LOWER(email))</code> → ab <code>WHERE LOWER(email)=?</code>
        par index <b>lagta</b> hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">💸 INDEX = READS KA FAAYDA, WRITES PAR TAX</span>
      <span>Har INSERT/UPDATE/DELETE har index ko maintain karta hai. Aur zyadatar systems mein
        kai index <b>kabhi use hi nahi hote</b> — <code>sys.schema_unused_indexes</code> /
        <code>pg_stat_user_indexes</code> se dhoondo.</span>
    </div>`,
};

VISUALS['normalmore'] = {
  t: 'God-table todo — aur "duplicate" jo asal mein itihaas hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">orders_flat<br><small>sab kuch ek table mein</small></span>
      <span class="dg-arrow flow">→</span>
      <span class="dg-pill good">customers</span>
      <span class="dg-pill good">products</span>
      <span class="dg-pill good">orders</span>
      <span class="dg-pill good">order_items</span>
    </div>
    <div class="dg-cap">Har column ke liye ek hi sawaal: <b>"yeh fact KIS cheez ke baare mein hai?"</b></div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🔄</span><span class="cmd">Update anomaly</span><span class="q">customer ne city badli → 500 rows update. Ek chhoot gayi = <b>do sachchai</b></span></div>
      <div class="dg-rung"><span class="lv">➕</span><span class="cmd">Insert anomaly</span><span class="q">naya product daalna hai par order aaya hi nahi → row <b>banegi hi nahi</b></span></div>
      <div class="dg-rung"><span class="lv">🗑️</span><span class="cmd">Delete anomaly</span><span class="q">aakhri order delete → customer ka naam, email, pata <b>sab gaya</b></span></div>
    </div>
    <div class="dg-cap">Normalization ka maksad <b>jagah bachana nahi</b> — har fact sirf <b>ek jagah</b> rakhna.
      Jo do jagah likha hai, woh ek din alag ho jaayega.</div>
    <div class="dg-rule"></div>
    <div class="dg-box is-accent"><span class="bx-label">🔍 BCNF — jahan 3NF bhi kaafi nahi</span>
      <div class="dg-cap"><code>enrollment(student, subject, teacher)</code> · <code>teacher → subject</code>
        <br><br>3NF ✅ paas (subject ek key ka hissa hai)
        <br>BCNF ❌ fail (<code>teacher</code> determinant hai par akela key nahi)
        <br><br>Anjaam wahi: teacher ka subject badla → uske <b>har</b> row mein badalna padega.
        <br>Ilaaj: <code>teaches(teacher, subject)</code> + <code>enrolled(student, teacher)</code>.</div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">⚖️ Denormalize karne se pehle</span>
        <div class="dg-cap">1. JOIN sach mein slow hai? (<b>naapo</b>)
          <br>2. Read : write ratio kya hai?
          <br>3. <b>Duplicate ko SYNC kaun karega?</b>
          <br><br><small>Teesra sabse zyada bhoola jaata hai — aur wahi hamesha ka kharch hai.</small></div>
      </div>
      <div class="dg-box is-gold"><span class="bx-label">⭐ Yeh duplicate NAHI hai</span>
        <div class="dg-cap"><code>products.catalog_price</code> = <b>aaj</b> ka daam
          <br><code>order_items.price_paid</code> = <b>us din</b> ka daam
          <br><br>Do alag facts. Hatane par daam badalte hi
          <b>purane invoices badal jaayenge</b> — accounting bug.</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🪤 SABSE AAM SCHEMA BUG</span>
      <span><b>Historical value ko current se derive karna.</b> Invoice ka pata, tax rate,
        plan ka naam, commission % — jo bhi "us waqt kya tha" maayne rakhta ho,
        use <b>copy karke rakho</b>. Woh duplicate nahi, itihaas hai.</span>
    </div>`,
};

VISUALS['replicas'] = {
  t: 'Read replicas — reads baantte hain, writes nahi',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">writes</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill acc">PRIMARY<br><small>sirf yahan</small></span>
      <span class="dg-arrow flow">→</span>
      <span class="dg-pill good">Replica 1</span>
      <span class="dg-pill good">Replica 2</span>
      <span class="dg-arrow flow">→</span>
      <span class="dg-pill">reads</span>
    </div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">✅</span><span class="cmd">Read capacity</span><span class="q">reads N machines par bant gaye</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">❌</span><span class="cmd">Write capacity</span><span class="q">writes abhi bhi <b>ek</b> machine par</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">⚠️</span><span class="cmd">Har replica ko wahi writes apply karni hain</span><span class="q">replica primary se <b>kam kaam nahi</b> karta</span></div>
    </div>
    <div class="dg-cap">Isliye agar problem <b>writes</b> ka hai toh replica se kuch nahi hoga —
      wahan jawab <b>sharding</b> hai.</div>
    <div class="dg-rule"></div>
    <div class="dg-box is-bad"><span class="bx-label">⏳ Read-after-write bug</span>
      <div class="dg-cap"><code>t=0ms&nbsp;&nbsp; save → PRIMARY ✅</code>
        <br><code>t=5ms&nbsp;&nbsp; reload → REPLICA → PURANA data 😱</code>
        <br><code>t=80ms&nbsp; replica catch up</code>
        <br><br>User ko lagta hai save fail hua → woh <b>dobara</b> save karta hai
        → duplicate submission / double charge.</div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">⭐ ILAAJ</span>
      <span><b>Save ke kuch second tak US USER ki reads primary se.</b>
        Sirf ek user, sirf kuch second — baaki sab replicas par hi rehta hai.
        (Doosre raaste: sticky session, wait-for-LSN.)</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🚫 KAB SIRF KHARCHA</span>
      <span>Read:write 2:1 · primary waise hi 20% par · har read ko taaza data chahiye ·
        "HA ke liye" par failover kabhi test hi nahi kiya.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">💀 REPLICATION ≠ BACKUP</span>
      <span>Galat <code>DELETE FROM orders</code> <b>0.2 second</b> mein saare replicas par
        pahunch jaayega. Replica = <b>availability</b>. Backup = <b>waqt mein peeche jaana</b>.</span>
    </div>`,
};

VISUALS['sharding'] = {
  t: 'Sharding — aakhri seedhi, pehli nahi',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Index / query fix</span><span class="q">aksar yahin kaam ho jaata hai</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">Cache</span><span class="q">read load DB tak pahunche hi na</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">Bada server</span><span class="q">boring — par 10x tak sasta</span></div>
      <div class="dg-rung"><span class="lv">4</span><span class="cmd">Read replicas</span><span class="q">read-heavy ho toh</span></div>
      <div class="dg-rung g"><span class="lv">5</span><span class="cmd">Archival</span><span class="q">⭐ sabse bhooli hui — 80% data 5% queries khaata hai</span></div>
      <div class="dg-rung"><span class="lv">6</span><span class="cmd">Federation</span><span class="q">ek table alag DB par</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">7</span><span class="cmd">Sharding</span><span class="q">ab</span></div>
    </div>
    <div class="dg-cap">Aaj ka ek server 64 core / 512 GB / NVMe ho sakta hai — kai TB aur
      hazaaron qps aaram se. <b>Zyadatar products sharding tak pahunchte hi nahi.</b></div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Achha shard key</span>
        <div class="dg-cap"><b>Locality</b> — zyadatar queries mein maujood
          <br><b>Even</b> — koi hot shard nahi
          <br><br>SaaS → <code>tenant_id</code>
          <br>Chat → <code>conversation_id</code>
          <br>E-comm → <code>user_id</code></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">❌ Bura shard key</span>
        <div class="dg-cap"><code>created_at</code> → saara naya traffic <b>ek shard</b> par
          <br><code>hash(random)</code> → locality khatam, har query <b>saare</b> shards par
          <br><code>country</code> → kam cardinality + bhaari skew</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">💸 SHARDING KE BAAD KYA KHATAM</span>
      <span>Cross-shard JOIN · ek transaction do shards par · global AUTO_INCREMENT ·
        global unique constraint · <code>COUNT(*)</code>.
        <b>Yahi asli keemat hai — capacity nahi.</b> Har cheez jo ek query thi,
        ab ek distributed problem hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🔑 SHARD KEY WAPAS NAHI HOTA</span>
      <span>Badalne ka matlab hai poora data dobara baantna (dual-write + backfill + cutover).
        Isliye pehle apni <b>top 10 queries</b> likho aur dekho ki woh column unme hai ya nahi.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🧭 TEEN ALAG DIMENSIONS</span>
      <span>Sirf <b>data</b> bada → archival · sirf <b>reads</b> zyada → cache + replicas ·
        sirf <b>writes</b> zyada → batching, kam indexes. Sharding tab jab in sabke baad bhi
        ek machine kaafi na ho.</span>
    </div>`,
};

VISUALS['capdb'] = {
  t: 'CAP — partition ke doraan ka chunav',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">DC-A</span>
      <span class="dg-arrow flow">✂️</span>
      <span class="dg-pill bad">network toota</span>
      <span class="dg-arrow flow">✂️</span>
      <span class="dg-pill">DC-B</span>
    </div>
    <div class="dg-cap"><b>Partition ek chunav nahi hai — woh mausam hai.</b>
      Sawaal sirf itna: jab woh ho, tab kya karoge? Aur <b>"CA" hota hi nahi</b> —
      jab baat hi nahi kar sakte, toh ya ruko ya akele faisla lo.</div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🛑 CP — ruk jao</span>
        <div class="dg-cap">Jawab dena <b>band</b>. Error do.
          <br>Data kabhi galat nahi hoga.
          <br><br>→ balance · seat booking · stock · payment</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🟢 AP — purana jawab do</span>
        <div class="dg-cap">Jawab dete raho, chahe thoda <b>purana</b> ho.
          <br>Site chalti rahegi.
          <br><br>→ feed · reviews · cart · view counter</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🧭 CHUNNE KA EK SAWAAL</span>
      <span><b>"Purana/galat jawab dena zyada mehnga hai, ya koi jawab na dena?"</b></span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">cart = AP<br><small>hamesha khule</small></span>
      <span class="dg-arrow flow">→</span>
      <span class="dg-pill acc">checkout = CP<br><small>pakka ho tabhi</small></span>
    </div>
    <div class="dg-cap"><b>Ek hi app, dono chunav.</b> Isiliye CAP ka faisla poore system ka nahi —
      <b>har operation</b> ka hota hai. Aur tunable consistency (Cassandra ka
      <code>QUORUM</code> vs <code>ONE</code>) yeh chunav <b>per query</b> de deta hai.</div>
    <div class="dg-legend">
      <span class="dg-pill acc">⚡ PACELC — roz wala hissa</span>
      <span><b>P-A-C</b>: partition ho toh A ya C. <b>E-L-C</b>: <i>else</i> — latency ya consistency?
        Primary se padho (sahi, dheema) ya replica se (tez, purana).
        Partition kabhi-kabhi hota hai; <b>yeh sauda har request par</b> ho raha hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">💸 AP KA CHHUPA BILL</span>
      <span><b>Conflict merge.</b> Network wapas aane par dono taraf ke badlaav milane padte hain —
        kabhi automatic (CRDT, last-write-wins), kabhi insaan ko dekhna padta hai.</span>
    </div>`,
};

VISUALS['slowlog'] = {
  t: 'Slow query log — asli qatil kaun',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🐢 Query A — log mein UPAR</span>
        <div class="dg-cap"><code>8 second</code> per call
          <br><code>× 10 calls/din</code>
          <br>= <b>80 second/din</b></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🔥 Query B — ASLI qatil</span>
        <div class="dg-cap"><code>40 ms</code> per call
          <br><code>× 20,00,000 calls/din</code>
          <br>= <b>22 GHANTE/din</b></div>
      </div>
    </div>
    <div class="dg-cap">Slow log <b>per-call</b> se sort karta hai — isliye woh A dikhata hai.
      Par DB B ki wajah se mar raha hai. <b>Hamesha total = per-call × calls se sort karo.</b></div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Total time se sort</span><span class="q">pg_stat_statements / sys.statement_analysis</span></div>
      <div class="dg-rung g"><span class="lv">2</span><span class="cmd">"Kya yeh query zaroori bhi hai?"</span><span class="q">⭐ sabse bada faayda aksar HATAANE se aata hai</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">EXPLAIN — type, key, rows, Extra</span><span class="q">ab plan dekho</span></div>
      <div class="dg-rung"><span class="lv">4</span><span class="cmd">Sabse chhota fix — aksar ek index</span><span class="q">poori query rewrite aakhri raasta hai</span></div>
      <div class="dg-rung"><span class="lv">5</span><span class="cmd">EXPLAIN dobara — PROOF</span><span class="q">rows gira? type badla?</span></div>
      <div class="dg-rung"><span class="lv">6</span><span class="cmd">Production mein total time dobara naapo</span><span class="q">asli imtihaan yahi hai</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🧹 NORMALIZE</span>
      <span><code>WHERE id = 8812</code> · <code>= 4471</code> · <code>= 9903</code> → 20 lakh alag lines.
        Normalize karke: <code>WHERE id = ?</code> → <b>ek pattern, 20 lakh calls</b>.
        Bina iske slow log bas ek badi text file hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚠️ long_query_time = 0 MAT karo</span>
      <span>Har query log karna khud ek I/O aur disk load ban jaata hai.
        Threshold apne <b>p99 target</b> se shuru karo.</span>
    </div>`,
};

VISUALS['partitioning'] = {
  t: 'Partitioning — ek table, kai tukde (ek hi machine par)',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">orders</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill acc">p2026_07</span>
      <span class="dg-pill acc">p2026_08</span>
      <span class="dg-pill good">p2026_09</span>
      <span class="dg-pill">…</span>
    </div>
    <div class="dg-cap"><code>WHERE created_at &gt;= '2026-09-01'</code> →
      EXPLAIN: <code>partitions: p2026_09</code> — <b>sirf ek partition chhui</b>.
      Par yeh tabhi hota hai jab query mein <b>partition key</b> ho.</div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✂️ Partitioning</span>
        <div class="dg-cap"><b>Ek</b> machine ke andar
          <br>✅ JOIN aur transactions normal
          <br>✅ app ko pata bhi nahi
          <br>→ pruning · chhote index · turant cleanup</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🔀 Sharding</span>
        <div class="dg-cap"><b>Kai</b> machines par
          <br>❌ cross-shard JOIN khatam
          <br>❌ ek transaction do shards par nahi
          <br>→ capacity (aur bhaari keemat)</div>
      </div>
    </div>
    <div class="dg-cap">Isliye <b>partitioning sharding se pehle</b> aati hai — kam keemat, kaafi faayda.</div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐌 DELETE</span>
        <div class="dg-cap"><code>DELETE … WHERE created_at &lt; '2025-01-01'</code>
          <br>4 crore rows → <b>ghante</b>
          <br>bhaari locks · undo/WAL bloat · replica lag
          <br>aur disk <b>wapas bhi nahi</b> milti</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⚡ DROP PARTITION</span>
        <div class="dg-cap"><code>ALTER TABLE orders DROP PARTITION p2024_12;</code>
          <br>lagbhag <b>turant</b>
          <br>disk turant khaali
          <br>koi lock drama nahi</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🚫 KAB FAAYDA NAHI</span>
      <span>Query mein partition key nahi (→ <b>saari</b> partitions scan, bina partitioning se bura) ·
        table chhoti · <b>5,000+ partitions</b> (planning khud dheemi) ·
        unique constraint jisme partition key na ho.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⚠️ PARTITIONING ≠ INDEX KA BADAL</span>
      <span>Har partition ko apne index chahiye hi. "Query dheemi hai" ka jawab
        lagbhag hamesha pehle <b>index</b> hota hai.</span>
    </div>`,
};

VISUALS['boss4'] = {
  t: 'FINAL BOSS — paanch lakshan, paanch alag wajah',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🔌</span><span class="cmd">"CPU 10% par sab timeout"</span><span class="q">pool exhaustion → <code>pool.acquire()</code> ka waqt dekho</span></div>
      <div class="dg-rung"><span class="lv">🗂️</span><span class="cmd">"Dashboard 14 second"</span><span class="q">missing index → EXPLAIN: <code>type ALL, key NULL</code></span></div>
      <div class="dg-rung"><span class="lv">📑</span><span class="cmd">"Save karke reload par purana"</span><span class="q">replication lag → read-your-own-writes routing</span></div>
      <div class="dg-rung"><span class="lv">🔒</span><span class="cmd">"Ek item do logon ko bik gaya"</span><span class="q">check-then-act race → shart <code>UPDATE</code> ke andar</span></div>
      <div class="dg-rung"><span class="lv">🪓</span><span class="cmd">"2 crore rows, DELETE atka"</span><span class="q">partitioning → <code>DROP PARTITION</code></span></div>
    </div>
    <div class="dg-cap"><b>Paanch lakshan, paanch alag wajah.</b> Galat ilaaj lagane se
      cheezein aksar <b>aur</b> bigadti hain — jaise dheemi query par pool badhana.</div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">📏 NAAPO</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill acc">🔧 SABSE CHHOTA FIX</span><span class="dg-arrow flow">→</span>
      <span class="dg-pill good">📏 DOBARA NAAPO</span>
    </div>
    <div class="dg-cap">Teesra kadam sabse zyada chhoota jaata hai — aur uske bina tumhe
      pata hi nahi chalta ki fix laga bhi ya nahi (kabhi index lagta hai par plan nahi badalta,
      kyunki statistics purani hain).</div>
    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">🧭 CHAAR ALAG DIMENSIONS</span>
      <span><b>Data</b> bada → archival / partitioning ·
        <b>Reads</b> zyada → cache / replicas ·
        <b>Writes</b> zyada → batching / kam indexes / sharding ·
        <b>Connections</b> → pool + query time.
        Ek hi jawab sab par lagana hi sabse aam galti hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">👑 SABSE ZAROORI FORMULA</span>
      <span><code>capacity = pool × (1000 / query_ms)</code><br>
        Query 8s → 20ms = capacity <b>400x</b>, bina ek bhi naya connection.
        <b>Pehle service time, phir pool.</b></span>
    </div>`,
};

VISUALS['constraints'] = {
  t: 'Constraints — galat data ko DB hi rok de',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">tumhara app</span>
      <span class="dg-pill">doosri service</span>
      <span class="dg-pill">migration script</span>
      <span class="dg-pill">raat 2 baje ka manual fix</span>
      <span class="dg-arrow flow">→</span>
      <span class="dg-pill acc">DB</span>
    </div>
    <div class="dg-cap">Data sirf tumhare app se nahi aata. App validation <b>achha message</b> deti hai;
      DB constraint <b>galat data rokti hai</b> — chahe woh kahin se bhi aaye.</div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">🛑</span><span class="cmd">ON DELETE RESTRICT</span><span class="q">⭐ default — accidental delete rokta hai</span></div>
      <div class="dg-rung"><span class="lv">🌊</span><span class="cmd">ON DELETE CASCADE</span><span class="q">sirf <b>sacchi ownership</b> (order → order_items)</span></div>
      <div class="dg-rung"><span class="lv">⚪</span><span class="cmd">ON DELETE SET NULL</span><span class="q">optional reference (employee → manager)</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">💀 CASCADE KA CHHUPA KHATRA</span>
      <span>Woh <b>chain</b> mein chalta hai: user → orders → order_items → payments.
        Ek chhota <code>DELETE FROM users WHERE id=42</code> ek <b>lambi bhaari transaction</b>
        ban sakta hai — aur wapas laane ka koi tareeka nahi. User/customer par
        aksar <b>soft delete</b> sahi jawab hai.</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔍 INDEX</span>
        <div class="dg-cap">Dhoondhna tez.
          <br>Duplicate par → <b>chalta rahega</b></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔑 UNIQUE</span>
        <div class="dg-cap">Dhoondhna tez <b>+ duplicate rokta hai</b>.
          <br>Duplicate par → <code>ERROR 1062</code></div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🪤 UNIQUE KA NULL JAAL</span>
      <span>SQL mein <b>NULL ≠ NULL</b> — isliye <code>UNIQUE(email)</code> ke baad bhi
        <b>kitne bhi</b> rows mein email NULL ho sakta hai.
        Zaroori ho toh <code>NOT NULL</code> <b>bhi</b> lagao.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">✅ CHECK CONSTRAINTS</span>
      <span><code>CHECK (qty &gt; 0)</code> · <code>CHECK (status IN (…))</code> ·
        <code>CHECK (end_date &gt; start_date)</code> — woh niyam jo tumhare business mein
        <b>hamesha</b> sach hain.</span>
    </div>`,
};
