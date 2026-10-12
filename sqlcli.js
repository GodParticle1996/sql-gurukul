/* =====================================================================
   SQL Gurukul — MySQL Simulator (terminal missions)

   Mission stage shape (data files mein):
   {
     type: 'terminal', title, instructions,
     goal: 'HTML — kya karna hai',
     db: {
       tables: {
         tableName: {
           columns: [{ name, type, pk, autoInc, notNull, unique, default }],
           indexes: ['colName', ...],        // secondary indexes (EXPLAIN ke liye)
           rows: [{ col: val, ... }, ...],
         },
       },
       views: { viewName: 'SELECT ...' },    // optional
     },
     responses: [ { re: /regex/, out: 'text' | fn(sim, m), mutate?: fn(sim, m) } ],
     tasks: [ { text, check(sim) -> bool } ],
     success: fn(sim) -> bool,  successText: 'HTML',
     hints: ['pehla hint', ...],
   }

   sim = { db (deep clone), history: [raw sql...], lastResult: {cols, rows} | null,
           lastError: str|null, txSnapshot, hintsUsed, done }

   Supported SQL (MySQL flavour):
     SHOW TABLES; DESCRIBE t; EXPLAIN SELECT ...;
     [WITH cte AS (...)] SELECT [DISTINCT] cols|*|aggs|exprs
       FROM t [alias] | (SELECT ...) alias        -- derived table
       [INNER|LEFT JOIN t2 [alias] ON a.c = b.c]...
       [WHERE expr] [GROUP BY ...] [HAVING ...]
       [ORDER BY ... [ASC|DESC]] [LIMIT n [OFFSET m]]
       [UNION [ALL] SELECT ...]
     aggs over ANY expression: SUM(CASE WHEN x THEN 1 ELSE 0 END), COUNT(DISTINCT c)
     window fns: ROW_NUMBER/RANK/DENSE_RANK/LAG/LEAD/FIRST_VALUE/LAST_VALUE +
                 SUM/COUNT/AVG/MIN/MAX  OVER (PARTITION BY .. ORDER BY ..)
                 (ORDER BY ke saath aggregate = running total, MySQL jaisa)
     CASE WHEN .. THEN .. [ELSE ..] END ; EXISTS/NOT EXISTS (correlated)
     scalar fns: COALESCE IFNULL NULLIF IF CONCAT UPPER LOWER LENGTH SUBSTRING
                 TRIM REPLACE LEFT RIGHT ABS ROUND FLOOR CEIL MOD GREATEST LEAST
                 NOW CURDATE DATE YEAR MONTH DAY DATEDIFF DATE_FORMAT
     WHERE ops: = != <> < > <= >=, LIKE, IN (list | subquery), BETWEEN,
                IS [NOT] NULL, AND/OR/NOT, ( ), arithmetic + - * / %
     INSERT INTO t (cols) VALUES (...), (...);
     UPDATE t SET c=v[, ...] [WHERE ...];   DELETE FROM t [WHERE ...];
     CREATE TABLE t (col TYPE [PRIMARY KEY|AUTO_INCREMENT|NOT NULL|UNIQUE|DEFAULT v], ...);
     ALTER TABLE t ADD|DROP|MODIFY [COLUMN] ...;
     CREATE INDEX i ON t(col);  DROP INDEX i ON t;
     CREATE VIEW v AS SELECT ...;
     BEGIN | START TRANSACTION; COMMIT; ROLLBACK;
   ===================================================================== */

SG.renderers.terminal = function renderTerminal(stage, arena, onDone) {
  const sim = {
    db: JSON.parse(JSON.stringify(stage.db || { tables: {} })),
    history: [],
    lastResult: null,
    lastError: null,
    txSnapshot: null,
    hintsUsed: 0,
    done: false,
    stage,
  };
  if (!sim.db.tables) sim.db.tables = {};
  if (!sim.db.views) sim.db.views = {};
  sim.responses = stage.responses || [];

  /* ---------- UI ---------- */
  const goalBox = SG.el('div', 'term-goal');
  goalBox.innerHTML = `<h4>🎯 Mission</h4><div>${stage.goal}</div>`;
  const taskList = SG.el('ul', 'term-tasks');
  (stage.tasks || []).forEach(t => taskList.appendChild(SG.el('li', '', t.text)));
  if (stage.tasks) goalBox.appendChild(taskList);

  const term = SG.el('div', 'terminal');
  term.innerHTML = `
    <div class="term-bar">
      <span class="dot" style="background:#f87171"></span>
      <span class="dot" style="background:#ffb347"></span>
      <span class="dot" style="background:#34d399"></span>
      <span>&nbsp;shishya@sqlgurukul — mysql client (db: factory)</span>
    </div>
    <div class="term-out"></div>
    <div class="term-in"><span class="ps1">mysql&gt;</span><input type="text" autocomplete="off"
      spellcheck="false" placeholder="SHOW TABLES;   (madad ke liye: help)"></div>`;
  const out = term.querySelector('.term-out');
  const input = term.querySelector('input');

  const btns = SG.el('div', 'term-btns');
  const hintBtn = SG.el('button', 'btn small ghost', `💡 Hint (−${SG.HINT_COST} XP)`);
  hintBtn.onclick = () => giveHint();
  btns.appendChild(hintBtn);

  arena.append(goalBox, term, btns);
  print('sys', `Mock MySQL ready — database 'factory' selected. SQL type karo ('help' se supported syntax).`);
  setTimeout(() => input.focus(), 100);

  const cmdHistory = [];
  let histIdx = -1;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const raw = input.value.trim();
      input.value = '';
      if (raw) { cmdHistory.push(raw); histIdx = cmdHistory.length; run(raw); }
    } else if (e.key === 'ArrowUp') {
      if (histIdx > 0) { histIdx--; input.value = cmdHistory[histIdx] || ''; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histIdx < cmdHistory.length) { histIdx++; input.value = cmdHistory[histIdx] || ''; }
      e.preventDefault();
    }
  });

  function print(kind, text) {
    const div = SG.el('div', 't-' + kind);
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }
  function giveHint() {
    const hints = stage.hints || [];
    if (sim.hintsUsed >= hints.length) { print('hint', '💡 Aur hints nahi hain — tum kar sakte ho!'); return; }
    print('hint', `💡 Hint ${sim.hintsUsed + 1}: ${hints[sim.hintsUsed]}`);
    sim.hintsUsed++;
  }

  /* ---------- checks after every statement ---------- */
  function refresh() {
    if (stage.tasks) {
      stage.tasks.forEach((t, i) => {
        if (t.check && t.check(sim)) taskList.children[i].classList.add('done');
      });
    }
    if (!sim.done && stage.success && stage.success(sim)) {
      sim.done = true;
      input.disabled = true;
      const xp = Math.max(10, SG.TERMINAL_XP - sim.hintsUsed * SG.HINT_COST);
      SG.addXP(xp);
      const win = SG.el('div', 'stage-summary pop');
      win.innerHTML = `
        <div class="sum-emoji">🎉</div>
        <div class="sum-title">Mission complete! +${xp} XP${sim.hintsUsed ? ` (${sim.hintsUsed} hint use hue)` : ' — bina hint ke! 🔥'}</div>
        <div class="sum-detail" style="text-align:left;line-height:1.6;margin-top:8px">${stage.successText || ''}</div>`;
      arena.appendChild(win);
      win.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => onDone({ firstTry: sim.hintsUsed === 0 ? 1 : 0, total: 1 }), 300);
    }
  }

  function run(raw) {
    print('cmd', 'mysql> ' + raw);
    if (sim.done) return;
    const norm = raw.replace(/\s+/g, ' ').trim().replace(/;+$/, '');
    sim.history.push(norm);
    sim.lastError = null;
    try { exec(norm); }
    catch (e) {
      if (e.sqlerr) { sim.lastError = e.message; print('err', e.message); }
      else { console.error('sqlcli error:', e); print('err', `simulator error: ${e.message} — query dobara likho ya 'help' dekho`); }
    }
    refresh();
  }

  function err(msg) { const e = new Error(msg); e.sqlerr = true; throw e; }

  /* =====================================================================
     TOKENIZER
     ===================================================================== */
  function tokenize(sql) {
    const toks = [];
    let i = 0;
    const isWord = c => /[A-Za-z0-9_$.]/.test(c);
    while (i < sql.length) {
      const c = sql[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'" || c === '"' || c === '`') {
        const q = c; let j = i + 1, s = '';
        while (j < sql.length && sql[j] !== q) { s += sql[j]; j++; }
        if (j >= sql.length) err(`ERROR 1064 (42000): You have an error in your SQL syntax — unterminated ${q} string`);
        toks.push({ t: q === '`' ? 'ident' : 'str', v: s });
        i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(sql[i + 1]) && ['(', ',', '='].concat(['<', '>', 'op']).length && (toks.length === 0 || ['op', 'lparen', 'comma', 'kw'].includes(toks[toks.length - 1].t)))) {
        let j = i, s = '';
        if (sql[j] === '-') { s = '-'; j++; }
        while (j < sql.length && /[0-9.]/.test(sql[j])) { s += sql[j]; j++; }
        toks.push({ t: 'num', v: parseFloat(s) });
        i = j; continue;
      }
      if (c === '(') { toks.push({ t: 'lparen' }); i++; continue; }
      if (c === ')') { toks.push({ t: 'rparen' }); i++; continue; }
      if (c === ',') { toks.push({ t: 'comma' }); i++; continue; }
      if (c === '*') { toks.push({ t: 'star' }); i++; continue; }
      // arithmetic — WHERE duration / 1000 > 3600, SET progress = progress + 1
      if (c === '+' || c === '-' || c === '/' || c === '%') { toks.push({ t: 'arith', v: c }); i++; continue; }
      const two = sql.slice(i, i + 2);
      if (['<=', '>=', '<>', '!='].includes(two)) { toks.push({ t: 'op', v: two === '<>' ? '!=' : two }); i += 2; continue; }
      if (['=', '<', '>'].includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
      if (isWord(c)) {
        let j = i, s = '';
        while (j < sql.length && isWord(sql[j])) { s += sql[j]; j++; }
        toks.push({ t: 'word', v: s });
        i = j; continue;
      }
      err(`ERROR 1064 (42000): You have an error in your SQL syntax near '${sql.slice(i, i + 12)}'`);
    }
    return toks;
  }

  /* token cursor helpers */
  function cursor(toks) {
    let p = 0;
    return {
      peek: (n = 0) => toks[p + n] || { t: 'eof' },
      next: () => toks[p++] || { t: 'eof' },
      kw(...words) {  // consume if next word matches (case-insens); returns matched or null
        const tk = toks[p];
        if (tk && tk.t === 'word' && words.includes(tk.v.toUpperCase())) { p++; return tk.v.toUpperCase(); }
        return null;
      },
      isKw(...words) {
        const tk = toks[p];
        return tk && tk.t === 'word' && words.includes(tk.v.toUpperCase());
      },
      expectKw(w) { if (!this.kw(w)) err(`ERROR 1064 (42000): You have an error in your SQL syntax — expected ${w}`); },
      expect(t) { const tk = this.next(); if (tk.t !== t) err(`ERROR 1064 (42000): You have an error in your SQL syntax — expected ${t}`); return tk; },
      eof: () => p >= toks.length,
      pos: () => p, seek: n => { p = n; },
      toks,
    };
  }

  const RESERVED = ['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'ASC', 'DESC', 'DISTINCT', 'SET', 'VALUES', 'BY', 'UNION', 'WHEN', 'THEN', 'ELSE', 'END', 'CASE', 'OVER', 'PARTITION', 'WITH'];

  /* =====================================================================
     SCALAR FUNCTIONS — args already evaluated, NULL-aware like MySQL
     ===================================================================== */
  const nn = v => v === null || v === undefined;
  const dOf = v => { const d = new Date(String(v).replace(' ', 'T') + (String(v).length <= 10 ? 'T00:00:00' : '')); return isNaN(d) ? null : d; };
  const p2 = n => String(n).padStart(2, '0');
  const SCALAR_FNS = {
    /* NULL handling — poora ek level inhi par hai */
    COALESCE: a => { for (const v of a) if (!nn(v)) return v; return null; },
    IFNULL: a => (nn(a[0]) ? a[1] : a[0]),
    NULLIF: a => (looseEq(a[0], a[1]) ? null : a[0]),
    IF: a => (truthy(a[0]) ? a[1] : a[2]),
    /* string */
    CONCAT: a => (a.some(nn) ? null : a.map(String).join('')),
    CONCAT_WS: a => (nn(a[0]) ? null : a.slice(1).filter(v => !nn(v)).map(String).join(String(a[0]))),
    UPPER: a => (nn(a[0]) ? null : String(a[0]).toUpperCase()),
    LOWER: a => (nn(a[0]) ? null : String(a[0]).toLowerCase()),
    LENGTH: a => (nn(a[0]) ? null : String(a[0]).length),
    CHAR_LENGTH: a => (nn(a[0]) ? null : String(a[0]).length),
    TRIM: a => (nn(a[0]) ? null : String(a[0]).trim()),
    SUBSTRING: a => (nn(a[0]) ? null : String(a[0]).substr(Number(a[1]) - 1, a[2] === undefined ? undefined : Number(a[2]))),
    SUBSTR: a => SCALAR_FNS.SUBSTRING(a),
    LEFT: a => (nn(a[0]) ? null : String(a[0]).slice(0, Number(a[1]))),
    RIGHT: a => (nn(a[0]) ? null : String(a[0]).slice(-Number(a[1]))),
    REPLACE: a => (a.some(nn) ? null : String(a[0]).split(String(a[1])).join(String(a[2]))),
    /* numeric */
    ABS: a => (nn(a[0]) ? null : Math.abs(Number(a[0]))),
    ROUND: a => (nn(a[0]) ? null : (d => Math.round(Number(a[0]) * d) / d)(Math.pow(10, Number(a[1] || 0)))),
    FLOOR: a => (nn(a[0]) ? null : Math.floor(Number(a[0]))),
    CEIL: a => (nn(a[0]) ? null : Math.ceil(Number(a[0]))),
    CEILING: a => SCALAR_FNS.CEIL(a),
    MOD: a => (a.some(nn) || Number(a[1]) === 0 ? null : Number(a[0]) % Number(a[1])),
    GREATEST: a => (a.some(nn) ? null : a.reduce((x, y) => (x > y ? x : y))),
    LEAST: a => (a.some(nn) ? null : a.reduce((x, y) => (x < y ? x : y))),
    /* date/time */
    NOW: () => new Date().toISOString().slice(0, 19).replace('T', ' '),
    CURDATE: () => new Date().toISOString().slice(0, 10),
    DATE: a => (nn(a[0]) ? null : String(a[0]).slice(0, 10)),
    YEAR: a => { const d = nn(a[0]) ? null : dOf(a[0]); return d ? d.getFullYear() : null; },
    MONTH: a => { const d = nn(a[0]) ? null : dOf(a[0]); return d ? d.getMonth() + 1 : null; },
    DAY: a => { const d = nn(a[0]) ? null : dOf(a[0]); return d ? d.getDate() : null; },
    HOUR: a => { const d = nn(a[0]) ? null : dOf(a[0]); return d ? d.getHours() : null; },
    DATEDIFF: a => {
      const d1 = nn(a[0]) ? null : dOf(a[0]), d2 = nn(a[1]) ? null : dOf(a[1]);
      return d1 && d2 ? Math.round((d1 - d2) / 86400000) : null;
    },
    DATE_FORMAT: a => {
      const d = nn(a[0]) ? null : dOf(a[0]);
      if (!d) return null;
      return String(a[1])
        .replace(/%Y/g, d.getFullYear())
        .replace(/%m/g, p2(d.getMonth() + 1))
        .replace(/%d/g, p2(d.getDate()))
        .replace(/%H/g, p2(d.getHours()))
        .replace(/%i/g, p2(d.getMinutes()));
    },
  };

  /* =====================================================================
     TABLE / VIEW ACCESS
     ===================================================================== */
  /* WITH ... AS (...) se aaye query-local naam. execSelect ise set/restore karta hai. */
  let currentCTEs = {};

  function getTable(name) {
    const cte = Object.keys(currentCTEs).find(k => k.toLowerCase() === name.toLowerCase());
    if (cte) return currentCTEs[cte];
    const t = Object.keys(sim.db.tables).find(k => k.toLowerCase() === name.toLowerCase());
    if (t) return { name: t, ...sim.db.tables[t], isView: false };
    const v = Object.keys(sim.db.views || {}).find(k => k.toLowerCase() === name.toLowerCase());
    if (v) {
      const res = execSelect(tokenize(sim.db.views[v]));
      return { name: v, columns: res.cols.map(c => ({ name: c })), rows: res.rows.map(r => { const o = {}; res.cols.forEach((c, i) => o[c] = r[i]); return o; }), indexes: [], isView: true };
    }
    err(`ERROR 1146 (42S02): Table 'factory.${name}' doesn't exist`);
  }

  /* =====================================================================
     OUTPUT FORMATTING (mysql client style)
     ===================================================================== */
  function fmtVal(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'number' && !Number.isInteger(v)) return (Math.round(v * 10000) / 10000).toString();
    return String(v);
  }
  function printResult(cols, rows) {
    if (!rows.length) { print('ok', 'Empty set (0.00 sec)'); return; }
    const widths = cols.map((c, i) => Math.max(String(c).length, ...rows.map(r => fmtVal(r[i]).length)));
    const sep = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
    const line = vals => '|' + vals.map((v, i) => {
      const s = fmtVal(v);
      const num = typeof v === 'number';
      return num ? ' ' + s.padStart(widths[i]) + ' ' : ' ' + s.padEnd(widths[i]) + ' ';
    }).join('|') + '|';
    print('ok', [sep, line(cols), sep, ...rows.map(line), sep,
      `${rows.length} row${rows.length === 1 ? '' : 's'} in set (0.00 sec)`].join('\n'));
  }

  /* =====================================================================
     EXPRESSIONS (WHERE / HAVING)
     ===================================================================== */
  function parseExpr(c) { return parseOr(c); }
  function parseOr(c) {
    let left = parseAnd(c);
    while (c.kw('OR')) { const right = parseAnd(c); const l = left, r = right; left = ctx => truthy(l(ctx)) || truthy(r(ctx)); }
    return left;
  }
  function parseAnd(c) {
    let left = parseNot(c);
    while (c.kw('AND')) { const right = parseNot(c); const l = left, r = right; left = ctx => truthy(l(ctx)) && truthy(r(ctx)); }
    return left;
  }
  function parseNot(c) {
    if (c.kw('NOT')) { const inner = parseNot(c); return ctx => !truthy(inner(ctx)); }
    return parseCmp(c);
  }
  function truthy(v) { return v === true || (typeof v === 'number' && v !== 0); }

  function parseCmp(c) {
    if (c.peek().t === 'lparen') {
      // could be (expr) — try full expression group
      const save = c.pos();
      c.next();
      const inner = parseExpr(c);
      if (c.peek().t === 'rparen') { c.next(); return inner; }
      c.seek(save); // fall through to operand parsing (e.g. (subquery) won't hit here)
    }
    const left = parseArith(c);
    let neg = false;
    if (c.kw('NOT')) neg = true;
    if (c.kw('IS')) {
      const not = c.kw('NOT');
      c.expectKw('NULL');
      return ctx => { const v = left(ctx); const isNull = v === null || v === undefined; return not ? !isNull : isNull; };
    }
    if (c.kw('LIKE')) {
      const pat = c.next();
      if (pat.t !== 'str') err(`ERROR 1064 (42000): LIKE ke baad string pattern chahiye ('%...%')`);
      const rx = new RegExp('^' + pat.v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
      return ctx => { const v = left(ctx); const r = v != null && rx.test(String(v)); return neg ? !r : r; };
    }
    if (c.kw('BETWEEN')) {
      const lo = parseArith(c); c.expectKw('AND'); const hi = parseArith(c);
      return ctx => { const v = left(ctx); if (v == null) return false; const r = v >= lo(ctx) && v <= hi(ctx); return neg ? !r : r; };
    }
    if (c.kw('IN')) {
      c.expect('lparen');
      if (c.isKw('SELECT')) {
        // non-correlated subquery — execute once, lazily
        const sub = [];
        let depth = 1;
        while (!c.eof()) {
          const tk = c.peek();
          if (tk.t === 'lparen') depth++;
          if (tk.t === 'rparen') { depth--; if (depth === 0) { c.next(); break; } }
          sub.push(c.next());
        }
        let cached = null;
        return ctx => {
          if (!cached) {
            const res = execSelect(sub.slice());
            cached = res.rows.map(r => r[0]);
          }
          const v = left(ctx);
          const r = cached.some(x => looseEq(x, v));
          return neg ? !r : r;
        };
      }
      const vals = [];
      while (!c.eof()) {
        const tk = c.next();
        if (tk.t === 'str') vals.push(tk.v);
        else if (tk.t === 'num') vals.push(tk.v);
        else if (tk.t === 'word' && tk.v.toUpperCase() === 'NULL') vals.push(null);
        else err(`ERROR 1064 (42000): IN list mein sirf values aati hain`);
        const nx = c.next();
        if (nx.t === 'rparen') break;
        if (nx.t !== 'comma') err(`ERROR 1064 (42000): IN list — ',' ya ')' expected`);
      }
      return ctx => { const v = left(ctx); const r = vals.some(x => looseEq(x, v)); return neg ? !r : r; };
    }
    if (neg) err(`ERROR 1064 (42000): NOT ke baad LIKE/IN/BETWEEN chahiye`);
    if (c.peek().t === 'op') {
      const op = c.next().v;
      const right = parseArith(c);
      return ctx => {
        const a = left(ctx), b = right(ctx);
        if (a == null || b == null) return false;  // MySQL: NULL compare = NULL → false (yehi lesson hai!)
        switch (op) {
          case '=': return looseEq(a, b);
          case '!=': return !looseEq(a, b);
          case '<': return a < b; case '>': return a > b;
          case '<=': return a <= b; case '>=': return a >= b;
        }
      };
    }
    return ctx => truthy(left(ctx)); // bare value
  }
  function looseEq(a, b) {
    if (typeof a === 'boolean') a = a ? 1 : 0;
    if (typeof b === 'boolean') b = b ? 1 : 0;
    if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
    return String(a).toLowerCase() === String(b).toLowerCase();
  }

  /* arithmetic: col / 1000, progress + 1, price * 2 */
  function parseArith(c) {
    let left = parseTerm(c);
    while (c.peek().t === 'arith' && (c.peek().v === '+' || c.peek().v === '-')) {
      const op = c.next().v;
      const right = parseTerm(c);
      const l = left;
      left = ctx => {
        const a = l(ctx), b = right(ctx);
        if (a == null || b == null) return null;
        return op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
      };
    }
    return left;
  }
  function parseTerm(c) {
    let left = parseOperand(c);
    while (c.peek().t === 'star' || (c.peek().t === 'arith' && (c.peek().v === '/' || c.peek().v === '%'))) {
      const op = c.peek().t === 'star' ? '*' : c.peek().v;
      c.next();
      const right = parseOperand(c);
      const l = left;
      left = ctx => {
        const a = l(ctx), b = right(ctx);
        if (a == null || b == null) return null;
        if (op === '*') return Number(a) * Number(b);
        if (op === '%') return Number(b) === 0 ? null : Number(a) % Number(b);
        return Number(b) === 0 ? null : Number(a) / Number(b);   // MySQL: x/0 = NULL
      };
    }
    return left;
  }

  function parseOperand(c) {
    const tk = c.peek();
    if (tk.t === 'str') { c.next(); return () => tk.v; }
    if (tk.t === 'num') { c.next(); return () => tk.v; }
    if (tk.t === 'lparen') {
      // scalar subquery: WHERE duration > (SELECT AVG(duration) FROM t)
      // ya grouped expression: (a + b) * 2
      c.next();
      if (c.isKw('SELECT')) {
        const sub = [];
        let depth = 1;
        while (!c.eof()) {
          const t2 = c.peek();
          if (t2.t === 'lparen') depth++;
          if (t2.t === 'rparen') { depth--; if (depth === 0) { c.next(); break; } }
          sub.push(c.next());
        }
        // correlated ho sakti hai — har baar outer ctx ke saath chalao
        return ctx => {
          const res = execSelect(sub.slice(), ctx);
          if (res.rows.length > 1) err('ERROR 1242 (21000): Subquery returns more than 1 row');
          return res.rows.length ? res.rows[0][0] : null;
        };
      }
      const inner = parseArith(c);
      c.expect('rparen');
      return inner;
    }
    if (tk.t === 'word') {
      const up = tk.v.toUpperCase();
      if (up === 'NULL') { c.next(); return () => null; }
      if (up === 'TRUE') { c.next(); return () => 1; }
      if (up === 'FALSE') { c.next(); return () => 0; }

      /* ---- CASE WHEN cond THEN val [WHEN ...] [ELSE val] END ---- */
      if (up === 'CASE') {
        c.next();
        const whens = [];
        let elseFn = () => null;
        // simple CASE: CASE expr WHEN v THEN ...
        let subject = null;
        if (!c.isKw('WHEN')) subject = parseArith(c);
        while (c.kw('WHEN')) {
          const test = subject ? parseArith(c) : parseExpr(c);
          c.expectKw('THEN');
          const val = parseArith(c);
          whens.push({ test, val });
        }
        if (c.kw('ELSE')) elseFn = parseArith(c);
        c.expectKw('END');
        return ctx => {
          for (const w of whens) {
            const hit = subject ? looseEq(subject(ctx), w.test(ctx)) : truthy(w.test(ctx));
            if (hit) return w.val(ctx);
          }
          return elseFn(ctx);
        };
      }

      /* ---- EXISTS (subquery) — correlated ---- */
      if (up === 'EXISTS' && c.peek(1).t === 'lparen') {
        c.next(); c.next();
        const sub = [];
        let depth = 1;
        while (!c.eof()) {
          const t2 = c.peek();
          if (t2.t === 'lparen') depth++;
          if (t2.t === 'rparen') { depth--; if (depth === 0) { c.next(); break; } }
          sub.push(c.next());
        }
        return ctx => (execSelect(sub.slice(), ctx).rows.length > 0 ? 1 : 0);
      }

      /* ---- scalar functions ---- */
      if (SCALAR_FNS[up] && c.peek(1).t === 'lparen') {
        c.next(); c.next();
        const args = [];
        if (c.peek().t !== 'rparen') {
          while (true) {
            args.push(parseArith(c));
            if (c.peek().t === 'comma') { c.next(); continue; }
            break;
          }
        }
        c.expect('rparen');
        const fn = SCALAR_FNS[up];
        return ctx => fn(args.map(a => a(ctx)));
      }
      /* aggregate kisi bhi expression ke andar —
         ROUND(100.0 * SUM(CASE ...) / COUNT(*), 1) jaisa bhi chalta hai.
         Parse karke aggCollector mein daal do; value __aggs se aayegi. */
      if (AGG_FNS.includes(up) && c.peek(1).t === 'lparen') {
        const agg = parseAggCall(c);
        if (aggCollector) aggCollector.push(agg);
        const canon = agg.canon;
        return ctx => {
          if (ctx.__aggs && canon in ctx.__aggs) return ctx.__aggs[canon];
          err(`ERROR 1111 (HY000): Invalid use of group function — ${canon} yahan use nahi ho sakta (HAVING/SELECT mein likho)`);
        };
      }
      c.next();
      const ref = tk.v;
      return ctx => resolveCol(ctx, ref);
    }
    err(`ERROR 1064 (42000): You have an error in your SQL syntax near '${tk.v || tk.t}'`);
  }

  /* jab non-null hota hai, parseOperand yahan aggregates jama karta hai */
  let aggCollector = null;

  /* FN( * | [DISTINCT] <expr> ) — ek hi jagah, select-list aur expressions dono ke liye */
  function parseAggCall(c) {
    const startTok = c.peek();
    const fname = c.next().v.toUpperCase();
    c.expect('lparen');
    let star = false, isDistinct = false, argFn = null, argText = '*';
    if (c.peek().t === 'star') { c.next(); star = true; }
    else {
      isDistinct = !!c.kw('DISTINCT');
      const s0 = c.pos();
      const save = aggCollector;
      aggCollector = null;                 // nested aggregate allowed nahi
      try { argFn = parseArith(c); } finally { aggCollector = save; }
      argText = (isDistinct ? 'DISTINCT ' : '') + tokensText(c.toks.slice(s0, c.pos()));
    }
    c.expect('rparen');
    return { kind: 'agg', fn: fname, star, distinct: isDistinct, argFn,
             canon: `${fname}(${argText})`, alias: `${fname}(${argText})`, _tok: startTok };
  }

  function parseAggCanonical(c) {
    const fn = c.next().v.toUpperCase();
    c.expect('lparen');
    let inner = '';
    if (c.peek().t === 'star') { c.next(); inner = '*'; }
    else {
      if (c.kw('DISTINCT')) inner = 'DISTINCT ';
      inner += c.expect('word').v;
    }
    c.expect('rparen');
    return `${fn}(${inner})`;
  }

  /* ctx = { __scope: [{alias, row}], __aggs? } ; ref maybe 'col' or 'alias.col' */
  function resolveCol(ctx, ref) {
    if (ctx.__aggs && ref in ctx.__aggs) return ctx.__aggs[ref];
    const dot = ref.indexOf('.');
    if (dot > -1) {
      const alias = ref.slice(0, dot), col = ref.slice(dot + 1);
      const sc = ctx.__scope.find(s => s.alias.toLowerCase() === alias.toLowerCase());
      if (!sc) {
        if (ctx.__outer) return resolveCol(ctx.__outer, ref);
        err(`ERROR 1054 (42S22): Unknown column '${ref}' — alias '${alias}' kisi table ka nahi hai`);
      }
      if (!(col in sc.row) && !sc.cols.includes(col)) err(`ERROR 1054 (42S22): Unknown column '${ref}'`);
      return sc.row[col] === undefined ? null : sc.row[col];
    }
    for (const sc of ctx.__scope) {
      if (ref in sc.row) return sc.row[ref];
      if (sc.cols.includes(ref)) return null;   // LEFT JOIN null row
    }
    // correlated subquery — outer query ke scope mein dhoondo
    if (ctx.__outer) return resolveCol(ctx.__outer, ref);
    err(`ERROR 1054 (42S22): Unknown column '${ref}' in 'field list'`);
  }

  /* =====================================================================
     SELECT
     ===================================================================== */
  /* do rows ko window ke ORDER BY keys par compare karo (RANK/DENSE_RANK ties ke liye) */
  function cmpByOrder(a, b, order) {
    for (const ob of order) {
      const va = resolveCol(a, ob.key), vb = resolveCol(b, ob.key);
      if (va == null && vb == null) continue;
      if (va == null || vb == null) return 1;
      if (va < vb) return -ob.dir;
      if (va > vb) return ob.dir;
    }
    return 0;
  }

  const AGG_FNS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
  const WINDOW_ONLY = ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'NTILE', 'FIRST_VALUE', 'LAST_VALUE'];

  /* tokens ko wapas text banao — SELECT list ke auto-alias ke liye */
  function tokensText(ts) {
    return ts.map(t => {
      if (t.t === 'str') return `'${t.v}'`;
      if (t.t === 'lparen') return '(';
      if (t.t === 'rparen') return ')';
      if (t.t === 'comma') return ',';
      if (t.t === 'star') return '*';
      return String(t.v);
    }).join(' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+,/g, ',');
  }

  /* helper: balanced token slice from inside a '(' that was just consumed */
  function grabParen(c) {
    const out = [];
    let depth = 1;
    while (!c.eof()) {
      const t2 = c.peek();
      if (t2.t === 'lparen') depth++;
      if (t2.t === 'rparen') { depth--; if (depth === 0) { c.next(); break; } }
      out.push(c.next());
    }
    return out;
  }

  /* rows[] (array-of-arrays) + cols[] ko ek table jaisa object banao —
     CTE aur derived table dono isse use karte hain */
  function asTable(name, res) {
    return {
      name,
      columns: res.cols.map(cn => ({ name: cn })),
      rows: res.rows.map(r => { const o = {}; res.cols.forEach((cn, i) => (o[cn] = r[i])); return o; }),
      indexes: [],
      isView: true,
    };
  }

  /* ---------------- entry point: WITH + UNION handling ---------------- */
  function execSelect(toks, outerCtx) {
    const c0 = cursor(toks);

    /* ---- WITH name AS (...) [, name2 AS (...)] SELECT ... ---- */
    if (c0.isKw('WITH')) {
      c0.next();
      const saved = currentCTEs;
      currentCTEs = Object.assign({}, currentCTEs);
      try {
        c0.kw('RECURSIVE');
        while (true) {
          const name = c0.expect('word').v;
          c0.expectKw('AS');
          c0.expect('lparen');
          const body = grabParen(c0);
          currentCTEs[name] = asTable(name, execSelectCore(body, outerCtx));
          if (c0.peek().t === 'comma') { c0.next(); continue; }
          break;
        }
        return execSelect(toks.slice(c0.pos()), outerCtx);
      } finally { currentCTEs = saved; }
    }

    /* ---- UNION [ALL] — top level par split karo ---- */
    let depth = 0;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.t === 'lparen') depth++;
      else if (t.t === 'rparen') depth--;
      else if (depth === 0 && t.t === 'word' && t.v.toUpperCase() === 'UNION') {
        const left = toks.slice(0, i);
        let j = i + 1;
        const all = toks[j] && toks[j].t === 'word' && toks[j].v.toUpperCase() === 'ALL';
        if (all) j++;
        const right = toks.slice(j);
        const a = execSelect(left, outerCtx);
        const b = execSelect(right, outerCtx);
        if (a.cols.length !== b.cols.length)
          err(`ERROR 1222 (21000): The used SELECT statements have a different number of columns`);
        let rows = a.rows.concat(b.rows);
        if (!all) {                       // UNION = duplicates hatao (UNION ALL = rakho)
          const seen = new Set();
          rows = rows.filter(r => { const k = r.map(fmtVal).join(''); if (seen.has(k)) return false; seen.add(k); return true; });
        }
        return { cols: a.cols, rows };
      }
    }

    return execSelectCore(toks, outerCtx);
  }

  function execSelectCore(toks, outerCtx) {
    const c = cursor(toks);
    c.expectKw('SELECT');
    const distinct = !!c.kw('DISTINCT');

    const savedCollector = aggCollector;
    aggCollector = [];                  // expressions ke andar ke aggregates yahan jama honge

    // ---- select list ----
    // { kind:'star' } | { kind:'col', ref, alias } | { kind:'agg', ... }
    // | { kind:'win', fn, arg, partition, order, alias } | { kind:'expr', fn, alias }
    const items = [];
    while (true) {
      if (c.peek().t === 'star') { c.next(); items.push({ kind: 'star' }); }
      else {
        const tk = c.peek();
        const up = tk.t === 'word' ? tk.v.toUpperCase() : '';

        /* ---- WINDOW FUNCTION: FN(...) OVER (PARTITION BY .. ORDER BY ..) ---- */
        let handledWindow = false;
        if ((WINDOW_ONLY.includes(up) || AGG_FNS.includes(up)) && c.peek(1).t === 'lparen') {
          const save = c.pos();
          const fname = c.next().v.toUpperCase();
          c.expect('lparen');
          let arg = null, offset = 1;
          if (c.peek().t === 'star') { c.next(); arg = '*'; }
          else if (c.peek().t !== 'rparen') {
            c.kw('DISTINCT');
            arg = c.expect('word').v;
            if (c.peek().t === 'comma') { c.next(); offset = Number(c.expect('num').v); }
          }
          if (c.peek().t === 'rparen') c.next();
          if (c.isKw('OVER')) {
            c.next(); c.expect('lparen');
            const partition = [], order = [];
            if (c.kw('PARTITION')) {
              c.expectKw('BY');
              while (true) { partition.push(c.expect('word').v); if (c.peek().t === 'comma') { c.next(); continue; } break; }
            }
            if (c.kw('ORDER')) {
              c.expectKw('BY');
              while (true) {
                const k = c.expect('word').v;
                let d = 1;
                if (c.kw('DESC')) d = -1; else c.kw('ASC');
                order.push({ key: k, dir: d });
                if (c.peek().t === 'comma') { c.next(); continue; }
                break;
              }
            }
            while (c.peek().t !== 'rparen' && !c.eof()) c.next();  // frame clause ignore
            c.expect('rparen');
            const item = { kind: 'win', fn: fname, arg, offset, partition, order, alias: `${fname}(${arg || ''})` };
            if (c.kw('AS')) item.alias = c.next().v;
            else if (c.peek().t === 'word' && !c.isKw(...RESERVED)) item.alias = c.next().v;
            items.push(item);
            handledWindow = true;
          } else {
            c.seek(save);   // OVER nahi tha — normal aggregate hai
          }
        }
        if (handledWindow) {
          if (c.peek().t === 'comma') { c.next(); continue; }
          break;
        }

        if (AGG_FNS.includes(up) && c.peek(1).t === 'lparen') {
          // aggregate over ANY expression — SUM(CASE WHEN ... THEN 1 ELSE 0 END) bhi
          const item = parseAggCall(c);
          if (c.kw('AS')) item.alias = c.next().v;
          else if (c.peek().t === 'word' && !c.isKw(...RESERVED)) item.alias = c.next().v;
          items.push(item);
        } else if (up === 'ROUND' && c.peek(1).t === 'lparen' && typeof c.peek(2).v === 'string' && AGG_FNS.includes(c.peek(2).v.toUpperCase())) {
          c.next(); c.expect('lparen');
          const inner = parseAggCanonical(c);
          let digits = 0;
          if (c.peek().t === 'comma') { c.next(); digits = c.expect('num').v; }
          c.expect('rparen');
          const innerArg = inner.match(/\(([^)]+)\)/)[1].replace('DISTINCT ', '');
          const item = { kind: 'agg', fn: inner.match(/^(\w+)/)[1], distinct: /DISTINCT/.test(inner),
            star: innerArg === '*', argFn: innerArg === '*' ? null : (ctx => resolveCol(ctx, innerArg)),
            canon: inner, round: digits, alias: `ROUND(${inner}, ${digits})` };
          if (c.kw('AS')) item.alias = c.next().v;
          items.push(item);
        } else if (tk.t === 'word' && c.peek(1).t !== 'lparen' && up !== 'CASE') {
          // plain column reference
          c.next();
          const item = { kind: 'col', ref: tk.v, alias: tk.v.includes('.') ? tk.v.split('.').pop() : tk.v };
          if (c.kw('AS')) item.alias = c.next().v;
          else if (c.peek().t === 'word' && !c.isKw(...RESERVED)) item.alias = c.next().v;
          items.push(item);
        } else {
          // general expression — CASE WHEN, scalar function, arithmetic, literal
          const start = c.pos();
          const fn = parseArith(c);
          const item = { kind: 'expr', fn, alias: tokensText(toks.slice(start, c.pos())) };
          if (c.kw('AS')) item.alias = c.next().v;
          else if (c.peek().t === 'word' && !c.isKw(...RESERVED)) item.alias = c.next().v;
          items.push(item);
        }
      }
      if (c.peek().t === 'comma') { c.next(); continue; }
      break;
    }

    // ---- FROM (optional — SELECT 1+1, SELECT NOW()) ----
    let base, baseAlias;
    if (!c.kw('FROM')) {
      base = { name: '(none)', columns: [], rows: [{}], indexes: [] };
      baseAlias = '(none)';
    } else if (c.peek().t === 'lparen') {
      // derived table: FROM ( SELECT ... ) alias
      c.next();
      const sub = grabParen(c);
      c.kw('AS');
      const alias = c.peek().t === 'word' && !c.isKw(...RESERVED) ? c.next().v : 'derived';
      base = asTable(alias, execSelect(sub, outerCtx));
      baseAlias = alias;
    } else {
      const baseName = c.expect('word').v;
      base = getTable(baseName);
      baseAlias = baseName;
      if (c.kw('AS')) baseAlias = c.next().v;
      else if (c.peek().t === 'word' && !c.isKw(...RESERVED)) baseAlias = c.next().v;
    }

    const joins = []; // { type:'inner'|'left', table, alias, leftRef, rightRef }
    while (true) {
      let jt = null;
      if (c.kw('LEFT')) { c.kw('OUTER'); c.expectKw('JOIN'); jt = 'left'; }
      else if (c.kw('INNER')) { c.expectKw('JOIN'); jt = 'inner'; }
      else if (c.kw('JOIN')) jt = 'inner';
      else break;
      const tn = c.expect('word').v;
      const jtab = getTable(tn);
      let jalias = tn;
      if (c.kw('AS')) jalias = c.next().v;
      else if (c.peek().t === 'word' && !c.isKw(...RESERVED)) jalias = c.next().v;
      c.expectKw('ON');
      const l = c.expect('word').v;
      const opTk = c.expect('op');
      if (opTk.v !== '=') err(`ERROR 1064 (42000): JOIN ... ON mein sirf '=' support hai`);
      const r = c.expect('word').v;
      joins.push({ type: jt, table: jtab, alias: jalias, leftRef: l, rightRef: r });
    }

    // ---- optional clauses ----
    let whereFn = null;
    if (c.kw('WHERE')) whereFn = parseExpr(c);
    let groupBy = [];   // [{ text, fn }] — expressions bhi chalti hain (GROUP BY DATE_FORMAT(d,'%Y-%m'))
    if (c.kw('GROUP')) {
      c.expectKw('BY');
      while (true) {
        const g0 = c.pos();
        const gfn = parseArith(c);
        groupBy.push({ text: tokensText(c.toks.slice(g0, c.pos())), fn: gfn });
        if (c.peek().t === 'comma') { c.next(); continue; }
        break;
      }
    }
    let havingFn = null;
    if (c.kw('HAVING')) havingFn = parseExpr(c);
    const orderBy = [];
    if (c.kw('ORDER')) {
      c.expectKw('BY');
      while (true) {
        let key;
        const tk = c.peek();
        const up = tk.t === 'word' ? tk.v.toUpperCase() : '';
        if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(up) && c.peek(1).t === 'lparen') key = parseAggCanonical(c);
        else key = c.expect('word').v;
        let dir = 1;
        if (c.kw('DESC')) dir = -1; else c.kw('ASC');
        orderBy.push({ key, dir });
        if (c.peek().t === 'comma') { c.next(); continue; }
        break;
      }
    }
    let limit = null, offset = 0;
    if (c.kw('LIMIT')) {
      const a = c.expect('num').v;
      if (c.peek().t === 'comma') { c.next(); offset = a; limit = c.expect('num').v; }
      else { limit = a; if (c.kw('OFFSET')) offset = c.expect('num').v; }
    }
    if (!c.eof()) err(`ERROR 1064 (42000): You have an error in your SQL syntax near '${c.peek().v || c.peek().t}'`);

    // expressions ke andar mile aggregates ko hidden items bana do taaki compute hon
    const collected = aggCollector || [];
    aggCollector = savedCollector;
    const shown = new Set(items.filter(i => i.kind === 'agg').map(i => i.canon));
    for (const a of collected) if (!shown.has(a.canon)) { shown.add(a.canon); items.push({ ...a, hidden: true }); }

    // ---- build joined row contexts ----
    const colNames = t => (t.columns || []).map(cl => cl.name);
    let ctxs = base.rows.map(r => ({ __scope: [{ alias: baseAlias, row: r, cols: colNames(base) }], __outer: outerCtx }));
    for (const j of joins) {
      const nctxs = [];
      for (const ctx of ctxs) {
        let matched = false;
        for (const jr of j.table.rows) {
          const tryCtx = { __scope: [...ctx.__scope, { alias: j.alias, row: jr, cols: colNames(j.table) }], __outer: outerCtx };
          let lv, rv;
          try { lv = resolveCol(tryCtx, j.leftRef); rv = resolveCol(tryCtx, j.rightRef); }
          catch (e) { throw e; }
          if (lv != null && rv != null && looseEq(lv, rv)) { matched = true; nctxs.push(tryCtx); }
        }
        if (!matched && j.type === 'left') {
          nctxs.push({ __scope: [...ctx.__scope, { alias: j.alias, row: {}, cols: colNames(j.table) }], __outer: outerCtx });
        }
      }
      ctxs = nctxs;
    }

    // ---- WHERE ----
    if (whereFn) ctxs = ctxs.filter(ctx => truthy(whereFn(ctx)));

    /* ---- WINDOW FUNCTIONS ----
       GROUP BY se ULTA: rows girti nahi, har row ko uske partition ka
       number mil jaata hai. Har ctx par __win[alias] set kar dete hain. */
    const winItems = items.filter(i => i.kind === 'win');
    if (winItems.length) {
      ctxs.forEach(ctx => { ctx.__win = {}; });
      for (const w of winItems) {
        // partition banao
        const parts = new Map();
        for (const ctx of ctxs) {
          const key = w.partition.map(p => fmtVal(resolveCol(ctx, p))).join('');
          if (!parts.has(key)) parts.set(key, []);
          parts.get(key).push(ctx);
        }
        for (const rowsIn of parts.values()) {
          let rows = rowsIn;
          if (w.order.length) {
            rows = rowsIn.slice().sort((a, b) => {
              for (const ob of w.order) {
                const va = resolveCol(a, ob.key), vb = resolveCol(b, ob.key);
                if (va == null && vb == null) continue;
                if (va == null) return -ob.dir;
                if (vb == null) return ob.dir;
                if (va < vb) return -ob.dir;
                if (va > vb) return ob.dir;
              }
              return 0;
            });
          }
          const valAt = i => (w.arg && w.arg !== '*' ? resolveCol(rows[i], w.arg) : 1);
          const isAggFn = AGG_FNS.includes(w.fn);
          // MySQL default frame: ORDER BY ke saath = UNBOUNDED PRECEDING .. CURRENT ROW
          // (yani running total). Bina ORDER BY = poora partition.
          const cumulative = isAggFn && w.order.length > 0;
          const numsUpto = k => rows.slice(0, k + 1).map((_, i) => valAt(i)).filter(v => v != null).map(Number);
          const allNums = rows.map((_, i) => valAt(i)).filter(v => v != null).map(Number);
          rows.forEach((ctx, i) => {
            let v = null;
            switch (w.fn) {
              case 'ROW_NUMBER': v = i + 1; break;
              case 'RANK': {
                let r = 1;
                for (let k = 0; k < i; k++) if (cmpByOrder(rows[k], rows[i], w.order) !== 0) r = k + 2;
                v = r; break;
              }
              case 'DENSE_RANK': {
                let r = 1;
                for (let k = 1; k <= i; k++) if (cmpByOrder(rows[k - 1], rows[k], w.order) !== 0) r++;
                v = r; break;
              }
              case 'LAG': v = i - w.offset >= 0 ? valAt(i - w.offset) : null; break;
              case 'LEAD': v = i + w.offset < rows.length ? valAt(i + w.offset) : null; break;
              case 'FIRST_VALUE': v = valAt(0); break;
              case 'LAST_VALUE': v = valAt(rows.length - 1); break;
              case 'COUNT': v = cumulative ? (w.arg === '*' ? i + 1 : numsUpto(i).length)
                                           : (w.arg === '*' ? rows.length : allNums.length); break;
              case 'SUM': { const ns = cumulative ? numsUpto(i) : allNums; v = ns.length ? ns.reduce((a, b) => a + b, 0) : null; break; }
              case 'AVG': { const ns = cumulative ? numsUpto(i) : allNums; v = ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null; break; }
              case 'MIN': { const ns = cumulative ? numsUpto(i) : allNums; v = ns.length ? Math.min(...ns) : null; break; }
              case 'MAX': { const ns = cumulative ? numsUpto(i) : allNums; v = ns.length ? Math.max(...ns) : null; break; }
              default: err(`ERROR 1064 (42000): window function '${w.fn}' supported nahi hai`);
            }
            ctx.__win[w.alias] = v;
          });
        }
      }
    }

    const hasAgg = items.some(i => i.kind === 'agg');

    // expand * for output cols
    function starCols(ctx) {
      const cols = [];
      ctx.__scope.forEach(sc => sc.cols.forEach(cn => cols.push({ ref: (joins.length ? sc.alias + '.' : '') + cn, alias: cn })));
      return cols;
    }

    let outCols = [], outRows = [];

    if (hasAgg || groupBy.length) {
      // ---- GROUP BY path ----
      const groups = new Map();
      for (const ctx of ctxs) {
        const key = groupBy.map(g => fmtVal(g.fn(ctx))).join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(ctx);
      }
      if (!groups.size && !groupBy.length) groups.set('', []); // aggregates over empty set

      const groupRecs = [];
      for (const [key, rows] of groups) {
        const aggs = {};
        for (const it of items) if (it.kind === 'agg') {
          let vals = rows.map(ctx => (it.star ? 1 : it.argFn(ctx))).filter(v => v != null);
          if (it.distinct) vals = [...new Set(vals.map(v => fmtVal(v)))].map(v => isNaN(Number(v)) ? v : Number(v));
          let v;
          switch (it.fn) {
            case 'COUNT': v = it.star ? rows.length : vals.length; break;
            case 'SUM': v = vals.length ? vals.reduce((a, b) => a + Number(b), 0) : null; break;
            case 'AVG': v = vals.length ? vals.reduce((a, b) => a + Number(b), 0) / vals.length : null; break;
            case 'MIN': v = vals.length ? vals.reduce((a, b) => a < b ? a : b) : null; break;
            case 'MAX': v = vals.length ? vals.reduce((a, b) => a > b ? a : b) : null; break;
          }
          if (it.round !== undefined && v != null) v = Math.round(v * Math.pow(10, it.round)) / Math.pow(10, it.round);
          aggs[it.canon] = v;
          aggs[it.alias] = v;
          if (it.round !== undefined) aggs[`ROUND(${it.canon}, ${it.round})`] = v;
        }
        const first = rows[0] || { __scope: [{ alias: baseAlias, row: {}, cols: colNames(base) }] };
        groupRecs.push({ ctx: { ...first, __aggs: aggs }, rows });
      }

      let recs = groupRecs;
      if (havingFn) recs = recs.filter(g => truthy(havingFn(g.ctx)));

      const visible = items.filter(it => !it.hidden);
      outCols = visible.map(it => it.kind === 'star' ? '*' : it.alias);
      for (const g of recs) {
        outRows.push(visible.map(it => {
          if (it.kind === 'agg') return g.ctx.__aggs[it.canon] !== undefined && it.round === undefined ? g.ctx.__aggs[it.canon] : g.ctx.__aggs[it.alias];
          if (it.kind === 'col') return resolveCol(g.ctx, it.ref);
          if (it.kind === 'expr') return it.fn(g.ctx);
          return null;
        }));
      }
      // ORDER BY on group recs
      if (orderBy.length) {
        const idx = {};
        outCols.forEach((cn, i) => idx[cn] = i);
        outRows.sort((ra, rb) => {
          for (const ob of orderBy) {
            let ia = idx[ob.key];
            if (ia === undefined) {
              const it = items.find(x => x.canon === ob.key || x.alias === ob.key);
              ia = it ? items.indexOf(it) : undefined;
            }
            if (ia === undefined) err(`ERROR 1054 (42S22): Unknown column '${ob.key}' in 'order clause'`);
            const va = ra[ia], vb = rb[ia];
            if (va == null && vb == null) continue;
            if (va == null) return -ob.dir;
            if (vb == null) return ob.dir;
            if (va < vb) return -ob.dir;
            if (va > vb) return ob.dir;
          }
          return 0;
        });
      }
    } else {
      // ---- plain row path ----
      if (orderBy.length) {
        ctxs.sort((a, b) => {
          for (const ob of orderBy) {
            const va = resolveCol(a, ob.key), vb = resolveCol(b, ob.key);
            if (va == null && vb == null) continue;
            if (va == null) return -ob.dir;
            if (vb == null) return ob.dir;
            if (va < vb) return -ob.dir;
            if (va > vb) return ob.dir;
          }
          return 0;
        });
      }
      const expand = ctx => {
        const cols = [], vals = [];
        for (const it of items) {
          if (it.hidden) continue;
          if (it.kind === 'star') { starCols(ctx).forEach(sc => { cols.push(sc.alias); vals.push(resolveCol(ctx, sc.ref)); }); continue; }
          cols.push(it.alias);
          if (it.kind === 'win') vals.push(ctx.__win ? ctx.__win[it.alias] : null);
          else if (it.kind === 'expr') vals.push(it.fn(ctx));
          else vals.push(resolveCol(ctx, it.ref));
        }
        return { cols, vals };
      };
      if (ctxs.length) outCols = expand(ctxs[0]).cols;
      else if (items.every(i => i.kind !== 'star')) outCols = items.filter(i => !i.hidden).map(i => i.alias);
      else outCols = starCols({ __scope: [{ alias: baseAlias, row: {}, cols: colNames(base) }] }).map(sc => sc.alias);
      outRows = ctxs.map(ctx => expand(ctx).vals);
      if (distinct) {
        const seen = new Set();
        outRows = outRows.filter(r => { const k = r.map(fmtVal).join(''); if (seen.has(k)) return false; seen.add(k); return true; });
      }
    }

    if (limit !== null) outRows = outRows.slice(offset, offset + limit);
    return { cols: outCols, rows: outRows, baseTable: base, whereToks: null };
  }

  /* =====================================================================
     DML / DDL
     ===================================================================== */
  function execInsert(toks) {
    const c = cursor(toks);
    c.expectKw('INSERT'); c.expectKw('INTO');
    const tn = c.expect('word').v;
    const t = getTable(tn);
    if (t.isView) err(`ERROR 1471 (HY000): View mein INSERT nahi hota is simulator mein`);
    let cols = null;
    if (c.peek().t === 'lparen') {
      c.next(); cols = [];
      while (true) { cols.push(c.expect('word').v); const nx = c.next(); if (nx.t === 'rparen') break; if (nx.t !== 'comma') err('ERROR 1064 (42000): column list — syntax'); }
    }
    c.expectKw('VALUES');
    let inserted = 0;
    while (true) {
      c.expect('lparen');
      const vals = [];
      while (true) {
        const tk = c.next();
        if (tk.t === 'str') vals.push(tk.v);
        else if (tk.t === 'num') vals.push(tk.v);
        else if (tk.t === 'word' && tk.v.toUpperCase() === 'NULL') vals.push(null);
        else if (tk.t === 'word' && tk.v.toUpperCase() === 'NOW' && c.peek().t === 'lparen') { c.next(); c.expect('rparen'); vals.push(new Date().toISOString().slice(0, 19).replace('T', ' ')); }
        else if (tk.t === 'word' && ['TRUE', 'FALSE'].includes(tk.v.toUpperCase())) vals.push(tk.v.toUpperCase() === 'TRUE' ? 1 : 0);
        else err(`ERROR 1064 (42000): VALUES mein yeh nahi samjha: '${tk.v}'`);
        const nx = c.next();
        if (nx.t === 'rparen') break;
        if (nx.t !== 'comma') err('ERROR 1064 (42000): VALUES — syntax');
      }
      const useCols = cols || t.columns.filter(cl => !cl.autoInc).map(cl => cl.name);
      if (vals.length !== useCols.length) err(`ERROR 1136 (21S01): Column count doesn't match value count (${useCols.length} columns, ${vals.length} values)`);
      const row = {};
      useCols.forEach((cn, i) => {
        if (!t.columns.find(cl => cl.name.toLowerCase() === cn.toLowerCase())) err(`ERROR 1054 (42S22): Unknown column '${cn}' in 'field list'`);
        row[t.columns.find(cl => cl.name.toLowerCase() === cn.toLowerCase()).name] = vals[i];
      });
      for (const cl of t.columns) {
        if (row[cl.name] === undefined) {
          if (cl.autoInc) {
            const max = t.rows.reduce((m, r) => Math.max(m, Number(r[cl.name]) || 0), 0);
            row[cl.name] = max + 1;
          } else if (cl.default !== undefined) row[cl.name] = cl.default;
          else if (cl.notNull) err(`ERROR 1364 (HY000): Field '${cl.name}' doesn't have a default value`);
          else row[cl.name] = null;
        }
        if ((cl.notNull || cl.pk) && row[cl.name] === null) err(`ERROR 1048 (23000): Column '${cl.name}' cannot be null`);
        if ((cl.pk || cl.unique) && row[cl.name] != null && t.rows.some(r => looseEq(r[cl.name], row[cl.name])))
          err(`ERROR 1062 (23000): Duplicate entry '${row[cl.name]}' for key '${t.name}.${cl.name}'`);
      }
      sim.db.tables[t.name].rows.push(row);
      inserted++;
      if (c.peek().t === 'comma') { c.next(); continue; }
      break;
    }
    print('ok', `Query OK, ${inserted} row${inserted === 1 ? '' : 's'} affected (0.01 sec)`);
  }

  function execUpdate(toks) {
    const c = cursor(toks);
    c.expectKw('UPDATE');
    const tn = c.expect('word').v;
    const t = getTable(tn);
    if (t.isView) err(`ERROR 1471 (HY000): View update nahi hota is simulator mein`);
    c.expectKw('SET');
    const sets = [];
    while (true) {
      const cn = c.expect('word').v;
      const col = t.columns.find(cl => cl.name.toLowerCase() === cn.toLowerCase());
      if (!col) err(`ERROR 1054 (42S22): Unknown column '${cn}' in 'field list'`);
      const op = c.expect('op'); if (op.v !== '=') err('ERROR 1064 (42000): SET col = value');
      let valueFn;
      const tk = c.peek();
      if (tk.t === 'word' && tk.v.toUpperCase() === 'NOW' && c.peek(1).t === 'lparen') {
        c.next(); c.next(); c.expect('rparen');
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        valueFn = () => now;
      } else {
        // expression — literal, ya column arithmetic (SET progress = progress + 1)
        valueFn = parseArith(c);
      }
      sets.push({ col: col.name, fn: valueFn });
      if (c.peek().t === 'comma') { c.next(); continue; }
      break;
    }
    let whereFn = null;
    if (c.kw('WHERE')) whereFn = parseExpr(c);
    const colNames = t.columns.map(cl => cl.name);
    let n = 0;
    for (const r of sim.db.tables[t.name].rows) {
      const ctx = { __scope: [{ alias: t.name, row: r, cols: colNames }] };
      if (!whereFn || truthy(whereFn(ctx))) {
        // saare naye values PEHLE compute karo (taaki SET a=b, b=a sahi chale)
        const vals = sets.map(s => s.fn(ctx));
        sets.forEach((s, i) => r[s.col] = vals[i]);
        n++;
      }
    }
    print('ok', `Query OK, ${n} row${n === 1 ? '' : 's'} affected (0.01 sec)\nRows matched: ${n}  Changed: ${n}  Warnings: 0`);
    if (!whereFn && n > 1) print('sys', `⚠️  Bina WHERE ke UPDATE — poori table (${n} rows) badal gayi. Production mein yeh 3AM incident hota.`);
  }

  function execDelete(toks) {
    const c = cursor(toks);
    c.expectKw('DELETE'); c.expectKw('FROM');
    const tn = c.expect('word').v;
    const t = getTable(tn);
    let whereFn = null;
    if (c.kw('WHERE')) whereFn = parseExpr(c);
    const colNames = t.columns.map(cl => cl.name);
    const before = sim.db.tables[t.name].rows.length;
    sim.db.tables[t.name].rows = sim.db.tables[t.name].rows.filter(r => {
      const ctx = { __scope: [{ alias: t.name, row: r, cols: colNames }] };
      return whereFn ? !truthy(whereFn(ctx)) : false;
    });
    const n = before - sim.db.tables[t.name].rows.length;
    print('ok', `Query OK, ${n} row${n === 1 ? '' : 's'} affected (0.01 sec)`);
    if (!whereFn && n > 0) print('sys', `⚠️  Bina WHERE ke DELETE — table khaali. Backup hai na? 😅`);
  }

  function parseColDef(c) {
    const name = c.expect('word').v;
    let type = c.expect('word').v.toUpperCase();
    if (c.peek().t === 'lparen') { // VARCHAR(255)
      c.next(); const n = c.expect('num').v; c.expect('rparen');
      type += `(${n})`;
    }
    const col = { name, type };
    while (c.peek().t === 'word') {
      const up = c.peek().v.toUpperCase();
      if (up === 'PRIMARY') { c.next(); c.expectKw('KEY'); col.pk = true; col.notNull = true; }
      else if (up === 'AUTO_INCREMENT') { c.next(); col.autoInc = true; }
      else if (up === 'NOT') { c.next(); c.expectKw('NULL'); col.notNull = true; }
      else if (up === 'UNIQUE') { c.next(); col.unique = true; }
      else if (up === 'DEFAULT') {
        c.next(); const tk = c.next();
        col.default = tk.t === 'word' && tk.v.toUpperCase() === 'NULL' ? null : tk.v;
      } else break;
    }
    return col;
  }

  function execCreate(toks) {
    const c = cursor(toks);
    c.expectKw('CREATE');
    if (c.kw('TABLE')) {
      const tn = c.expect('word').v;
      if (Object.keys(sim.db.tables).some(k => k.toLowerCase() === tn.toLowerCase()))
        err(`ERROR 1050 (42S01): Table '${tn}' already exists`);
      c.expect('lparen');
      const columns = [];
      while (true) {
        // handle "PRIMARY KEY (col)" table-constraint form
        if (c.isKw('PRIMARY')) {
          c.next(); c.expectKw('KEY'); c.expect('lparen');
          const pkc = c.expect('word').v; c.expect('rparen');
          const col = columns.find(cl => cl.name.toLowerCase() === pkc.toLowerCase());
          if (col) { col.pk = true; col.notNull = true; }
        } else if (c.isKw('FOREIGN')) {
          c.next(); c.expectKw('KEY'); c.expect('lparen'); c.expect('word'); c.expect('rparen');
          c.expectKw('REFERENCES'); c.expect('word'); c.expect('lparen'); c.expect('word'); c.expect('rparen');
          // FK noted, not enforced — lesson mein bataya hai
        } else {
          columns.push(parseColDef(c));
        }
        const nx = c.next();
        if (nx.t === 'rparen') break;
        if (nx.t !== 'comma') err(`ERROR 1064 (42000): CREATE TABLE — ',' ya ')' expected`);
      }
      sim.db.tables[tn] = { columns, indexes: [], rows: [] };
      print('ok', 'Query OK, 0 rows affected (0.03 sec)');
      return;
    }
    if (c.kw('INDEX')) {
      const iname = c.expect('word').v;
      c.expectKw('ON');
      const tn = c.expect('word').v;
      const t = getTable(tn);
      c.expect('lparen');
      const cols = [c.expect('word').v];
      while (c.peek().t === 'comma') { c.next(); cols.push(c.expect('word').v); }   // composite index
      c.expect('rparen');
      cols.forEach(cn => {
        if (!t.columns.find(cl => cl.name.toLowerCase() === cn.toLowerCase()))
          err(`ERROR 1054 (42S22): Unknown column '${cn}' — index kis par banaoge?`);
      });
      addIndex(t.name, iname, cols);
      print('ok', `Query OK, 0 rows affected (0.05 sec)\nRecords: 0  Duplicates: 0  Warnings: 0`);
      if (cols.length > 1) {
        print('sys', `🔑 Composite index (${cols.join(', ')}) bana. Yaad rakho — LEFT-MOST PREFIX rule: ` +
          `yeh index (${cols[0]}) par chalega, (${cols.slice(0, 2).join(', ')}) par chalega, ` +
          `par akele '${cols[1]}' par NAHI chalega.`);
      }
      return;
    }
    if (c.kw('VIEW')) {
      const vn = c.expect('word').v;
      c.expectKw('AS');
      // rest of tokens back to SQL text: easiest — slice original from ' AS '
      const rest = [];
      while (!c.eof()) {
        const tk = c.next();
        rest.push(tk.t === 'str' ? `'${tk.v}'` : (tk.v !== undefined ? tk.v : ({ lparen: '(', rparen: ')', comma: ',', star: '*' })[tk.t]));
      }
      const sql = rest.join(' ');
      execSelect(tokenize(sql)); // validate now
      sim.db.views[vn] = sql;
      print('ok', 'Query OK, 0 rows affected (0.02 sec)');
      return;
    }
    err(`ERROR 1064 (42000): CREATE ke baad TABLE / INDEX / VIEW aata hai`);
  }

  function execAlter(toks) {
    const c = cursor(toks);
    c.expectKw('ALTER'); c.expectKw('TABLE');
    const tn = c.expect('word').v;
    const t = getTable(tn);
    if (c.kw('ADD')) {
      c.kw('COLUMN');
      if (c.isKw('INDEX')) {
        c.next();
        const iname = c.expect('word').v;
        c.expect('lparen');
        const cols = [c.expect('word').v];
        while (c.peek().t === 'comma') { c.next(); cols.push(c.expect('word').v); }
        c.expect('rparen');
        addIndex(t.name, iname, cols);
        print('ok', 'Query OK, 0 rows affected (0.05 sec)');
        return;
      }
      const col = parseColDef(c);
      if (t.columns.find(cl => cl.name.toLowerCase() === col.name.toLowerCase()))
        err(`ERROR 1060 (42S21): Duplicate column name '${col.name}'`);
      sim.db.tables[t.name].columns.push(col);
      sim.db.tables[t.name].rows.forEach(r => r[col.name] = col.default !== undefined ? col.default : null);
      print('ok', `Query OK, ${t.rows.length} rows affected (0.04 sec)`);
      return;
    }
    if (c.kw('DROP')) {
      c.kw('COLUMN');
      const cn = c.expect('word').v;
      const idx = t.columns.findIndex(cl => cl.name.toLowerCase() === cn.toLowerCase());
      if (idx < 0) err(`ERROR 1091 (42000): Can't DROP '${cn}'; check that column exists`);
      const real = t.columns[idx].name;
      sim.db.tables[t.name].columns.splice(idx, 1);
      sim.db.tables[t.name].rows.forEach(r => delete r[real]);
      print('ok', `Query OK, ${t.rows.length} rows affected (0.04 sec)`);
      return;
    }
    if (c.kw('MODIFY')) {
      c.kw('COLUMN');
      const cn = c.expect('word').v;
      const col = t.columns.find(cl => cl.name.toLowerCase() === cn.toLowerCase());
      if (!col) err(`ERROR 1054 (42S22): Unknown column '${cn}'`);
      let type = c.expect('word').v.toUpperCase();
      if (c.peek().t === 'lparen') { c.next(); const n = c.expect('num').v; c.expect('rparen'); type += `(${n})`; }
      col.type = type;
      if (c.kw('NOT')) { c.expectKw('NULL'); col.notNull = true; }
      print('ok', `Query OK, ${t.rows.length} rows affected (0.06 sec)\nRecords: ${t.rows.length}  Duplicates: 0  Warnings: 0`);
      return;
    }
    if (c.kw('RENAME')) {
      c.kw('TO');
      const nn = c.expect('word').v;
      sim.db.tables[nn] = sim.db.tables[t.name];
      delete sim.db.tables[t.name];
      print('ok', 'Query OK, 0 rows affected (0.02 sec)');
      return;
    }
    err(`ERROR 1064 (42000): ALTER TABLE ke baad ADD / DROP / MODIFY / RENAME aata hai`);
  }

  /* =====================================================================
     EXPLAIN — simplified single-table analysis
     ===================================================================== */
  /* =====================================================================
     INDEX registry
     `indexes` legacy array hai (sirf column NAAM, single-col) — purane missions
     ke checks isi par tike hain, isliye woh waisa hi rehta hai aur composite
     index ka sirf LEADING column usme jaata hai (jo left-most prefix rule ke
     hisaab se bilkul sahi hai).  Poori definition `indexDefs` mein jaati hai.
     ===================================================================== */
  function addIndex(tableName, iname, cols) {
    const T = sim.db.tables[tableName];
    T.indexes = T.indexes || [];
    T.indexNames = T.indexNames || {};
    T.indexDefs = T.indexDefs || [];
    if (!T.indexes.some(x => x.toLowerCase() === cols[0].toLowerCase())) T.indexes.push(cols[0]);
    T.indexNames[cols[0]] = iname;
    T.indexDefs.push({ name: iname, cols: cols.slice() });
  }

  /* seed data ke legacy single-column indexes ko bhi indexDefs mein le aao */
  function allIndexDefs(t) {
    const T = sim.db.tables[t.name] || t;
    const defs = (T.indexDefs || []).slice();
    (T.indexes || []).forEach(cn => {
      /* Legacy fallback SIRF tab jab is column ka koi indexDef hai hi nahi.
         `cols[0]` par match karo — warna composite (a,b) ke liye ek nakli
         single-col (a) def ban jaata hai aur EXPLAIN "1/1 columns" bolta hai. */
      if (!defs.some(d => d.cols[0].toLowerCase() === String(cn).toLowerCase())) {
        defs.push({ name: (T.indexNames || {})[cn] || 'idx_' + cn, cols: [cn] });
      }
    });
    return defs;
  }

  /* Left-most prefix: index (a,b,c) tabhi lagta hai jab WHERE mein `a` ho.
     Jitne zyada leading columns match karein, utna behtar. */
  function bestIndexFor(t, usedColsLower) {
    let best = null;
    allIndexDefs(t).forEach(def => {
      let n = 0;
      for (const col of def.cols) {
        if (usedColsLower.includes(col.toLowerCase())) n++; else break;
      }
      if (n > 0 && (!best || n > best.matched || (n === best.matched && def.cols.length < best.def.cols.length))) {
        best = { def, matched: n };
      }
    });
    return best;
  }

  function execExplain(toks) {
    // find base table + WHERE column usage textually from tokens
    const c = cursor(toks);
    c.expectKw('EXPLAIN');
    const rest = toks.slice(c.pos());
    if (!rest.length || rest[0].v.toUpperCase() !== 'SELECT') err(`ERROR 1064 (42000): EXPLAIN SELECT ... likho`);
    // parse via execSelect to validate, but we need table/where info — re-scan tokens
    const words = rest.map(tk => tk.t === 'word' ? tk.v : null);
    const fromIdx = words.findIndex(w => w && w.toUpperCase() === 'FROM');
    const tn = fromIdx > -1 ? rest[fromIdx + 1].v : null;
    if (!tn) err('ERROR 1064 (42000): FROM missing');
    const t = getTable(tn);
    execSelect(rest.slice()); // validate the query itself
    const whereIdx = words.findIndex(w => w && w.toUpperCase() === 'WHERE');
    let usedCols = [];
    if (whereIdx > -1) {
      for (let i = whereIdx + 1; i < rest.length; i++) {
        const tk = rest[i];
        if (tk.t === 'word' && !['AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'ORDER', 'GROUP', 'LIMIT', 'BY', 'ASC', 'DESC', 'HAVING', 'TRUE', 'FALSE'].includes(tk.v.toUpperCase())) {
          const cn = tk.v.includes('.') ? tk.v.split('.').pop() : tk.v;
          if (t.columns.find(cl => cl.name.toLowerCase() === cn.toLowerCase())) usedCols.push(cn);
        }
        if (tk.t === 'word' && ['ORDER', 'GROUP', 'LIMIT'].includes(tk.v.toUpperCase())) break;
      }
    }
    const pk = t.columns.find(cl => cl.pk);
    const usedLower = usedCols.map(c => c.toLowerCase());
    const HDR = ['id', 'select_type', 'table', 'type', 'possible_keys', 'key', 'rows', 'Extra'];

    /* PRIMARY KEY sabse pehle — woh hamesha const/eq_ref deta hai */
    const pkHit = pk && usedLower.includes(pk.name.toLowerCase());
    if (pkHit) {
      printResult(HDR, [[1, 'SIMPLE', t.name, 'const', 'PRIMARY', 'PRIMARY', 1, 'Using index condition']]);
      print('sys', `⚡ PRIMARY key lag rahi hai — seedha ek row. Isse tez kuch nahi hota.`);
      return;
    }

    /* Secondary indexes — LEFT-MOST PREFIX rule ke saath */
    const best = bestIndexFor(t, usedLower);
    if (best) {
      const { def, matched } = best;
      /* jitne zyada leading columns match, utni kam rows padhni padti hain */
      const rows = Math.max(1, Math.ceil(t.rows.length / Math.pow(10, matched)));
      const covering = usedLower.every(c => def.cols.some(dc => dc.toLowerCase() === c));
      printResult(HDR, [[1, 'SIMPLE', t.name, 'ref', def.name, def.name, rows,
        covering && def.cols.length > 1 ? 'Using index' : 'Using index condition']]);
      print('sys', `⚡ Index '${def.name}' (${def.cols.join(', ')}) lag raha hai — ` +
        `${matched}/${def.cols.length} column${matched > 1 ? 's' : ''} match hue, ~${rows} rows padhi.`);
      if (matched < def.cols.length) {
        const nextCol = def.cols[matched];
        print('sys', `💡 Agar WHERE mein '${nextCol}' bhi hota toh index aur gehra lagta — ` +
          `abhi sirf pehle ${matched} column tak narrowing hui.`);
      }
      return;
    }

    /* Koi index nahi laga — par shayad column INDEXED hai, bas leading nahi? */
    const strandedCol = usedCols.find(cn =>
      allIndexDefs(t).some(def => def.cols.length > 1 &&
        def.cols.slice(1).some(dc => dc.toLowerCase() === cn.toLowerCase())));

    printResult(HDR, [[1, 'SIMPLE', t.name, 'ALL', null, null, t.rows.length, usedCols.length ? 'Using where' : null]]);
    if (strandedCol) {
      const def = allIndexDefs(t).find(d => d.cols.slice(1).some(dc => dc.toLowerCase() === strandedCol.toLowerCase()));
      print('sys', `🐌 type: ALL = FULL TABLE SCAN — saari ${t.rows.length} rows padhi ja rahi hain.`);
      print('sys', `⚠️ Dhyaan do: '${strandedCol}' index '${def.name}' (${def.cols.join(', ')}) ke ANDAR toh hai — ` +
        `par woh LEADING column nahi hai. LEFT-MOST PREFIX rule: index tabhi lagta hai jab ` +
        `'${def.cols[0]}' par bhi filter ho. Isiliye composite index mein column ka KRAM sab kuch hai.`);
    } else {
      print('sys', `🐌 type: ALL = FULL TABLE SCAN — saari ${t.rows.length} rows padhi ja rahi hain.${usedCols.length ? ` '${usedCols[0]}' par index banao toh?` : ''}`);
    }
  }

  /* =====================================================================
     DISPATCH
     ===================================================================== */
  function exec(norm) {
    for (const r of sim.responses) {
      const m = norm.match(r.re);
      if (m) {
        if (r.mutate) r.mutate(sim, m);
        const text = typeof r.out === 'function' ? r.out(sim, m) : r.out;
        if (text) print(r.err ? 'err' : 'ok', text);
        return;
      }
    }

    const low = norm.toLowerCase();
    if (low === 'help') {
      print('sys', [
        'Supported SQL (is mission mein):',
        '  SHOW TABLES;              DESCRIBE <table>;        EXPLAIN SELECT ...;',
        '  SELECT [DISTINCT] cols | * | COUNT(*)/SUM/AVG/MIN/MAX(expr) FROM t [alias]',
        '    [JOIN | LEFT JOIN t2 ON a.col = b.col] [WHERE ...] [GROUP BY ...] [HAVING ...]',
        '    [ORDER BY col [DESC]] [LIMIT n [OFFSET m]];',
        '  WHERE ops: = != < > <= >=, LIKE \'%x%\', IN (...), BETWEEN a AND b, IS [NOT] NULL, AND/OR/NOT',
        '  CASE WHEN cond THEN v [WHEN ..] [ELSE v] END      — conditional logic / pivot',
        '  Window:  ROW_NUMBER()/RANK()/DENSE_RANK()/LAG(c)/LEAD(c)/SUM(c)/COUNT(*)',
        '           OVER (PARTITION BY col ORDER BY col [DESC])',
        '  WITH name AS (SELECT ...) SELECT ...                — CTE',
        '  FROM (SELECT ...) alias                             — derived table',
        '  SELECT ... UNION [ALL] SELECT ...                   — set operation',
        '  EXISTS / NOT EXISTS (SELECT ... WHERE s.x = o.x)     — correlated subquery',
        '  Functions: COALESCE IFNULL NULLIF IF · CONCAT UPPER LOWER LENGTH SUBSTRING TRIM REPLACE LEFT RIGHT',
        '             ABS ROUND FLOOR CEIL MOD GREATEST LEAST · NOW CURDATE DATE YEAR MONTH DAY DATEDIFF DATE_FORMAT',
        '  INSERT INTO t (cols) VALUES (...);   UPDATE t SET c=v WHERE ...;   DELETE FROM t WHERE ...;',
        '  CREATE TABLE t (col TYPE ...);  ALTER TABLE t ADD/DROP/MODIFY ...;  CREATE INDEX i ON t(col);',
        '  CREATE VIEW v AS SELECT ...;  BEGIN; COMMIT; ROLLBACK;',
        '  help · hint · clear',
      ].join('\n'));
      return;
    }
    if (low === 'clear') { out.innerHTML = ''; return; }
    if (low === 'hint') { giveHint(); return; }

    if (/^show\s+tables$/i.test(norm)) {
      const names = [...Object.keys(sim.db.tables), ...Object.keys(sim.db.views || {})];
      printResult(['Tables_in_factory'], names.sort().map(n => [n]));
      return;
    }
    if (/^show\s+databases$/i.test(norm)) { printResult(['Database'], [['factory'], ['information_schema']]); return; }
    if (/^(describe|desc|show\s+columns\s+from)\s+/i.test(norm)) {
      const tn = norm.split(/\s+/).pop();
      const t = getTable(tn);
      printResult(['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'],
        t.columns.map(cl => [cl.name, (cl.type || 'varchar(255)').toLowerCase(), (cl.notNull || cl.pk) ? 'NO' : 'YES',
          cl.pk ? 'PRI' : (cl.unique ? 'UNI' : ((t.indexes || []).map(x => x.toLowerCase()).includes(cl.name.toLowerCase()) ? 'MUL' : '')),
          cl.default !== undefined ? fmtVal(cl.default) : 'NULL', cl.autoInc ? 'auto_increment' : '']));
      return;
    }
    if (/^show\s+indexes?\s+from\s+/i.test(norm)) {
      const tn = norm.split(/\s+/).pop();
      const t = getTable(tn);
      const rows = [];
      const pk = t.columns.find(cl => cl.pk);
      if (pk) rows.push([t.name, 'PRIMARY', 1, pk.name]);
      allIndexDefs(t).forEach(def => {
        def.cols.forEach((cn, i) => rows.push([t.name, def.name, i + 1, cn]));
      });
      printResult(['Table', 'Key_name', 'Seq_in_index', 'Column_name'], rows);
      if (allIndexDefs(t).some(d => d.cols.length > 1)) {
        print('sys', `💡 Seq_in_index = index ke andar column ka KRAM. Composite index sirf ` +
          `left-most prefix par lagta hai — Seq 1 ke bina Seq 2 bekaar hai.`);
      }
      return;
    }

    if (/^begin$/i.test(norm) || /^start\s+transaction$/i.test(norm)) {
      sim.txSnapshot = JSON.parse(JSON.stringify(sim.db));
      print('ok', 'Query OK, 0 rows affected (0.00 sec)');
      print('sys', '🔒 Transaction shuru — ab jo bhi karo, COMMIT tak pakka nahi, ROLLBACK se wapas.');
      return;
    }
    if (/^commit$/i.test(norm)) {
      if (!sim.txSnapshot) { print('ok', 'Query OK, 0 rows affected (0.00 sec)'); return; }
      sim.txSnapshot = null;
      sim.committed = true;
      print('ok', 'Query OK, 0 rows affected (0.01 sec)');
      print('sys', '✅ COMMIT — changes ab permanent hain.');
      return;
    }
    if (/^rollback$/i.test(norm)) {
      if (!sim.txSnapshot) { print('err', 'ERROR: koi active transaction nahi hai (pehle BEGIN karo)'); return; }
      sim.db = sim.txSnapshot;
      sim.txSnapshot = null;
      sim.rolledBack = true;
      print('ok', 'Query OK, 0 rows affected (0.01 sec)');
      print('sys', '↩️  ROLLBACK — sab changes wapas, jaise kuch hua hi nahi.');
      return;
    }

    if (/^drop\s+table\s+/i.test(norm)) {
      const tn = norm.split(/\s+/).pop();
      const t = getTable(tn);
      delete sim.db.tables[t.name];
      print('ok', 'Query OK, 0 rows affected (0.02 sec)');
      return;
    }
    if (/^drop\s+index\s+/i.test(norm)) {
      const m = norm.match(/^drop\s+index\s+(\S+)\s+on\s+(\S+)/i);
      if (!m) err('ERROR 1064 (42000): DROP INDEX <name> ON <table>');
      const t = getTable(m[2]);
      const names = sim.db.tables[t.name].indexNames || {};
      const cn = Object.keys(names).find(k => names[k].toLowerCase() === m[1].toLowerCase());
      sim.db.tables[t.name].indexes = (sim.db.tables[t.name].indexes || []).filter(x => x !== (cn || m[1]) && ('idx_' + x).toLowerCase() !== m[1].toLowerCase());
      print('ok', 'Query OK, 0 rows affected (0.03 sec)');
      return;
    }

    const toks = tokenize(norm);
    if (!toks.length) return;
    const first = toks[0].t === 'word' ? toks[0].v.toUpperCase() : '';
    switch (first) {
      case 'WITH':
      case 'SELECT': {
        const res = execSelect(toks);
        sim.lastResult = { cols: res.cols, rows: res.rows };
        printResult(res.cols, res.rows);
        return;
      }
      case 'EXPLAIN': return execExplain(toks);
      case 'INSERT': return execInsert(toks);
      case 'UPDATE': return execUpdate(toks);
      case 'DELETE': return execDelete(toks);
      case 'CREATE': return execCreate(toks);
      case 'ALTER': return execAlter(toks);
      default:
        err(`ERROR 1064 (42000): '${toks[0].v}' — yeh statement is simulator mein nahi hai ('help' dekho)`);
    }
  }
};
