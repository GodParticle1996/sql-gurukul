/* =====================================================================
   TRACK 5 — 🔬 Database Internals · file 5/6
   (a) scale/sharding ko BADHAYA — Instagram ke logical shards (lab 05 ex1)
   (b) naya level db-sharded-ids — 64-bit IDs: time | shard | sequence (lab 05 ex2)
   (c) naya level db-pg-power    — partial / expression index, connection ka bill (lab 05 ex3)
   Video: Akhil Sharma — "How Instagram scaled Postgres" (YLoYcwnqVzM), Instagram engineering blog par based
   ===================================================================== */
(function () {

/* ---------------------------------------------------------------------
   (a) SHARDING — logical shards
   --------------------------------------------------------------------- */
SG.extendLevel('sharding', {
  objectives: [
    '<b>Instagram ka tareeka:</b> hazaaron logical shards (schemas), kuch machines — machine bhari toh sirf mapping badlo',
  ],
  lesson: [
    `<h3>📦 Logical shards — Instagram ka jugaad</h3>
     <p><b>Galat shuruaat:</b> <code>shard = user_id % 2</code> (2 machines). Teesri machine aayi → <code>% 3</code> →
     lagbhag <b>har row ki jagah badli</b>. Arabon rows copy.</p>
     <p><b>Instagram ne kya kiya:</b> shuru mein hi <b>hazaaron chhote logical shards</b> banaye — har logical shard ek
     Postgres <b>schema</b> (<code>shard_0</code>, <code>shard_1</code>, …). <code>logical = user_id % 8192</code> <b>kabhi nahi badalta</b>.
     Shuru mein saare logical shards kuch hi machines par. Ek <b>mapping table</b> batati hai: logical shard → machine.</p>
     <ol>
       <li>Node 7 <b>95% bhar gaya</b>.</li>
       <li>Node 7 ke aadhe logical shards node 16 par <b>replication se stream</b> kiye (app chalti rahi).</li>
       <li>Mapping badli: shards 1920–2047 → node 16.</li>
       <li>Data ka format, schema, app ka code — <b>kuch nahi badla</b>. Sirf mapping.</li>
     </ol>
     <p>Lab 05 (ex1), 8 logical shards, do machines:</p>
     <pre>user 12 → shard_4 → node A → 8 photos
--- shards 4-7 node B par (pg_dump | psql, 254 ms) ---
Node A: 4 schemas, 40000 photos   |   Node B: 4 schemas, 40000 photos
Mapping: 0→A  1→A  2→A  3→A  4→B  5→B  6→B  7→B
user 12 → shard_4 → node B → 8 photos       ← app ka wahi function
feed: 200 users → 8 alag shards              ← scatter-gather ka bill</pre>
     <p>MySQL mein "schema" aur "database" ek hi cheez hai — logical shard = ek database, move = <code>mysqldump</code> (lab: 1470 ms).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Asli DB par: logical shards ek machine se doosri par',
      project: '05-sharding',
      exercise: 'ex1-shards',
      goal: 'Har engine ki do machines. 8 logical shards node A par banao, phir 4 shards node B par bhejo — sirf mapping badal ke app wahi chalti rahe.',
      steps: [
        { text: 'Char databases chalao (Postgres A/B, MySQL A/B).', cmd: 'cd sqlgurukul/docker-labs/05-sharding\ndocker compose up -d' },
        { text: 'Script chalao.', cmd: './scripts/shards.sh',
          expect: '=================== POSTGRES (logical shard = schema) ===================\nNode A par:  8 shards, 80000 photos\nuser 12 → shard_4 → node A → 8 photos\n200 users → 8 alag shards (sabse poochna padega, ...)\npg_dump | psql — 4 schemas node B par (254 ms)\nNode A: 4 schemas, 40000 photos   |   Node B: 4 schemas, 40000 photos\nMapping: 0→A  1→A  2→A  3→A  4→B  5→B  6→B  7→B\nuser 12 → shard_4 → node B → 8 photos\nuser 9 → shard_1 → node A → 8 photos\n\n=================== MYSQL (logical shard = database) ===================\nShards 4-7 node B par (mysqldump, 1470 ms): 4 databases\nuser 12 → shard_4 → node B → 8 photos' },
      ],
      observe: {
        q: 'Shards 4-7 node B par gaye. App ke routing function mein kya badalna pada?',
        choices: [
          'Kuch nahi — function mapping table padhta hai; sirf mapping ki 4 rows badli',
          'Har query mein naya host',
          'user_id % 8 ko % 16 karna pada',
          'Saare users ka data dobara likhna pada',
        ],
        answer: 0,
        explain: '<code>user_id % 8</code> hamesha wahi logical shard deta hai. Machine kaunsi — yeh sirf mapping table jaanti hai.',
      },
      lesson: 'Lab mein pg_dump ke dauraan un shards par writes rok-ne padte. Production mein replication se pehle copy, phir ek pal mein mapping palto.',
    },
  ],
  cards: [
    { front: 'Logical shards ka faayda?', back: '<code>user_id % 8192</code> kabhi nahi badalta. Machine badhao toh kuch logical shards move + <b>mapping</b> update — koi row rewrite nahi.' },
  ],
});

/* ---------------------------------------------------------------------
   (b) db-sharded-ids — bits ka bantwaara (positive bigint = 63 bits)
   --------------------------------------------------------------------- */
const timeBits = v => 63 - v.shard - v.seq;
const years = v => Math.round(Math.pow(2, timeBits(v)) / (1000 * 3600 * 24 * 365.25) * 10) / 10;

VISUALS['db-sharded-ids'] = {
  t: 'Instagram ki 64-bit ID',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc" data-hs="time">⏱️ 41 bit — ms (custom epoch se)</span>
      <span class="dg-pill gold" data-hs="shard">🧩 13 bit — logical shard (8192)</span>
      <span class="dg-pill good" data-hs="seq">🔢 10 bit — sequence (1024 / ms / shard)</span>
    </div>
    <div class="dg-cap"><code>id = (ms - epoch) &lt;&lt; 23 | shard &lt;&lt; 10 | (nextval(seq) % 1024)</code> —
      Postgres ke andar ek PL/pgSQL function. Koi alag ID service nahi.</div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Faayde</span>
        <div class="dg-cap">poori duniya mein unique · time ke kram mein (ORDER BY id DESC = naye posts) · id se shard pata</div></div>
      <div class="dg-box is-bad"><span class="bx-label">⚠️ Hadd</span>
        <div class="dg-cap">1 ms mein 1024 se zyada ek shard par = takraav · ghadi peeche gayi = gadbad</div></div>
    </div>`,
};

/* ---------------------------------------------------------------------
   (c) db-pg-power — connection ka bill
   Video: ek Postgres connection ~1.3 MB, 50 app servers × 30 = 1,500 connections.
   PgBouncer (transaction pooling): Postgres ko sirf ~60 asli connections.
   --------------------------------------------------------------------- */
const clientConns = v => v.servers * v.pool;
const pgConns = v => (v.bouncer ? Math.min(60, clientConns(v)) : clientConns(v));

VISUALS['db-pg-power'] = {
  t: 'Postgres ke chhote hathiyaar',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🎯 Partial index</span>
        <div class="dg-cap"><code>… WHERE created &gt;= '2025-12-01'</code><br>2 saal ka index 60 MB → 30 din ka <b>2.5 MB</b></div></div>
      <div class="dg-box is-accent"><span class="bx-label">✂️ Expression index</span>
        <div class="dg-cap"><code>(left(token, 8))</code><br>64 char token: 182 MB → <b>60 MB</b></div></div>
      <div class="dg-box is-gold"><span class="bx-label">🔌 PgBouncer</span>
        <div class="dg-cap">1,500 app connections → Postgres ko <b>~60</b></div></div>
    </div>
    <div class="dg-cap">MySQL: partial index <b>nahi</b> · prefix index <code>token(8)</code> + functional index <b>hain</b> · connection = thread (process nahi).</div>`,
};

SG.registerLevels('internals', [

/* =====================================================================
   I8 — Sharded IDs
   ===================================================================== */
{
  id: 'db-sharded-ids',
  icon: '🆔',
  title: 'Har Shard Apni ID Banaye — Phir Bhi Takraav Nahi',
  badge: 'ID Ka Darzi',
  objectives: [
    'Har shard ka apna AUTO_INCREMENT kyun takraata hai — aur UUID, ticket server, Snowflake service ki keemat',
    'Instagram ki 64-bit ID: <b>time | shard | sequence</b> — bits ka bantwaara ek faisla hai',
    'Random UUID primary key InnoDB mein aur bhi mehenga kyun (asli numbers)',
    'ID se time aur shard wapas nikaalna — aur "naye 20 posts" bina timestamp index',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p>PhotoGram 8 shards par hai. Har shard par <code>photos.id bigserial</code>. Shard 5 ki pehli photo: id 1.
     Shard 6 ki pehli photo: <b>id 1</b>. Comments table <code>photo_id = 1</code> — kaunsi photo? Lab 05: 50,000 + 50,000 IDs →
     <b>50,000 takraav</b>.</p>
     <h3>🧰 Vikalp — har ek ki keemat</h3>
     <table>
       <tr><th>Tareeka</th><th>Faayda</th><th>Keemat</th></tr>
       <tr><td>UUID v4 (random 128 bit)</td><td>koi coordination nahi</td><td>2× bada, <b>time ka kram nahi</b>, random inserts se B-tree bikharta hai</td></tr>
       <tr><td>Ticket server (Flickr: ek MySQL jo sirf IDs deta hai)</td><td>simple, kram mein</td><td>har INSERT se pehle network call, <b>single point of failure</b></td></tr>
       <tr><td>Twitter Snowflake service</td><td>time-ordered 64 bit</td><td>ek aur service chalao aur sambhalo</td></tr>
       <tr><td><b>Instagram: PL/pgSQL function har shard ke andar</b></td><td>time-ordered 64 bit, koi alag service nahi</td><td>ghadi (clock) par bharosa, 1024/ms/shard ki hadd</td></tr>
     </table>
     <h3>🆔 Instagram ki ID — kadam dar kadam</h3>
     <pre>our_epoch  := 1314220021721;                -- Aug 2011, ms mein ("zero" din)
seq_id     := nextval('shard_5.id_seq') % 1024;
now_millis := floor(extract(epoch FROM clock_timestamp()) * 1000);
result := (now_millis - our_epoch) &lt;&lt; 23;    -- 41 bit: time
result := result | (5 &lt;&lt; 10);                -- 13 bit: shard 5
result := result | seq_id;                   -- 10 bit: is ms mein kaunsa number</pre>
     <p>Lab 05: <code>3988980312464954369</code> → <code>&gt;&gt; 23</code> = 475523509081 ms epoch se = <b>2026-09-18 14:58:50 UTC</b>,
     <code>(id &gt;&gt; 10) &amp; 8191</code> = <b>shard 5</b>, <code>id &amp; 1023</code> = <b>seq 1</b>.
     Do shards, 50,000 IDs har ek → <b>0 takraav</b>.</p>`,

    `<h3>⚖️ Bits ka bantwaara = faisla</h3>
     <p>64 bit (Postgres/MySQL <code>bigint</code> signed hai — sabse upar ka bit sign, isliye positive IDs ke liye 63 bit).</p>
     <ul>
       <li><b>Time bits</b> kam → IDs jaldi khatam (saal).</li>
       <li><b>Shard bits</b> kam → aage kam logical shards.</li>
       <li><b>Sequence bits</b> kam → ek ms mein kam IDs. Lab: sequence ko sirf 2 bit (4/ms) diye → 50,000 mein se sirf
         <b>560 unique</b>, 49,440 duplicate.</li>
     </ul>
     <h3>🐢 Random UUID primary key — asli numbers (1M rows)</h3>
     <pre>                         insert     size
Postgres bigint          2172 ms    21 MB (index)
Postgres uuid v4         6168 ms    38 MB
MySQL bigint             5203 ms    32.6 MB (table)
MySQL 16 random bytes   12117 ms    68.6 MB
MySQL UUID_TO_BIN(u, 1)  6918 ms    41.6 MB   ← time pehle</pre>
     <p>Random key = har naya insert B-tree ke <b>beech mein kahin</b> → pages aadhe bhare, aur har jagah ka page memory mein chahiye.
     MySQL mein aur bura: InnoDB ki <b>table hi PK ke kram mein</b> hai. UUID chahiye hi toh time-pehle wala
     (<code>UUID_TO_BIN(uuid, 1)</code>, ya UUID v7).</p>
     <p class="tip">🎯 MySQL mein sequence nahi — lab ne counter table + <code>LAST_INSERT_ID(n + 1)</code> use kiya (Flickr ticket server ka jugaad).
     Aur function mein <code>SYSDATE(3)</code>, <code>NOW(3)</code> nahi — <code>NOW()</code> poore statement mein ek hi time deta hai.</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: 63 bits kaise baanto?',
      instructions: 'Shard bits aur sequence bits ghumao. Baaki bits time ko milte hain.',
      scenario: `PhotoGram ka plan: <b>30 saal</b> tak IDs chalni chahiye, aage <b>4,096+ logical shards</b> chahiye,
        aur peak par ek shard par ek millisecond mein <b>500+ photos</b>.`,
      knobs: [
        { id: 'shard', label: 'Shard bits', min: 4, max: 20, step: 1, value: 16 },
        { id: 'seq', label: 'Sequence bits', min: 4, max: 16, step: 1, value: 12 },
      ],
      readouts: [
        { id: 'tb', label: 'Time bits (63 − shard − seq)', unit: 'bit', fn: v => timeBits(v) },
        { id: 'yrs', label: 'IDs kitne saal chalengi', unit: 'saal', fn: v => years(v), good: x => x >= 30 },
        { id: 'shards', label: 'Max logical shards', unit: '', fn: v => Math.pow(2, v.shard), good: x => x >= 4096 },
        { id: 'perms', label: 'IDs / ms / shard', unit: '', fn: v => Math.pow(2, v.seq), good: x => x >= 500 },
      ],
      verdict: v => {
        if (years(v) < 30) return { tone: 'bad', text: `🔥 Time ko sirf ${timeBits(v)} bit — IDs <b>${years(v)} saal</b> mein khatam. Shard ya sequence bits kam karo.` };
        if (Math.pow(2, v.shard) < 4096) return { tone: 'warn', text: `⚠️ Sirf ${Math.pow(2, v.shard)} logical shards — aage machines badhane ki jagah kam.` };
        if (Math.pow(2, v.seq) < 500) return { tone: 'warn', text: `⚠️ Ek ms mein sirf ${Math.pow(2, v.seq)} IDs — peak par takraav (lab: 2 bit = 49,440 duplicate).` };
        return { tone: 'good', text: '✅ Teeno zarooratein poori. (Instagram: 41 / 13 / 10 — signed bigint mein ~35 saal positive IDs.)' };
      },
      goal: { text: '<b>≥ 30 saal</b>, <b>≥ 4,096</b> shards, <b>≥ 500</b> IDs/ms/shard.', check: (v, r) => r.yrs >= 30 && r.shards >= 4096 && r.perms >= 500 },
      insight: `63 bits ek <b>budget</b> hai: har bit jo shards ko diya, time ya sequence se gaya. Instagram ne 13 + 10 chuna —
        8,192 shards, 1,024/ms, aur baaki time. Faisla <b>pehle din</b> karna padta hai — IDs baad mein badalna = har table, har foreign key.`,
    },
    {
      type: 'flow',
      title: '🎬 Dry run: ek ID banti hai, ek ID khulti hai',
      instructions: 'Ek-ek kadam.',
      scenario: 'Shard 5 par nayi photo. <code>INSERT INTO shard_5.photos (id, …) VALUES (shard_5.next_id(), …)</code>',
      lanes: [
        { id: 'fn', label: '⚙️ next_id()' },
        { id: 'bits', label: '🔢 64 bit' },
        { id: 'app', label: '📱 App' },
      ],
      steps: [
        { lane: 'fn', t: 'now_millis − epoch = 475523509081', note: 'Aug 2011 se ab tak ke milliseconds. Custom epoch = bits bachaana (1970 se ginte toh 41 saal pehle hi kha jaate).' },
        { lane: 'bits', t: '&lt;&lt; 23 → time upar ke 41 bit mein', note: 'Neeche 23 bit khaali — shard aur sequence ke liye.' },
        { lane: 'bits', t: '| (5 &lt;&lt; 10) → shard 5', note: 'Beech ke 13 bit mein shard number.' },
        { lane: 'fn', t: 'nextval(seq) % 1024 = 1 → neeche ke 10 bit', note: 'Isi ms mein shard 5 par doosri photo aaye toh seq 2.',
          ask: {
            q: 'Shard 5 aur shard 6 par EK HI millisecond mein photo bani, dono ka seq 1. Takraav?',
            choices: ['Nahi — shard bits alag (5 vs 6), toh poora number alag', 'Haan, same ms + same seq', 'Kabhi-kabhi', 'Sirf MySQL mein'],
            answer: 0,
            explain: 'Isi liye shard bits ID ke andar hain. Lab: 50,000 + 50,000 IDs, 0 takraav.',
          } },
        { lane: 'app', t: 'id = 3988980312464954369', note: 'Ek bigint. 8 byte. Index mein time ke kram mein judta hai (hamesha B-tree ke daayein kinaare).', good: true },
        { lane: 'app', t: 'Comment aaya: photo_id = 3988980312464954369 → kaunsa shard?', note: '<code>(id &gt;&gt; 10) &amp; 8191</code> = 5. Mapping table: shard 5 → node A. Koi lookup service nahi.',
          ask: {
            q: '"Naye 20 posts" dikhane ke liye created_at par index chahiye?',
            choices: ['Nahi — ID khud time ke kram mein hai: ORDER BY id DESC LIMIT 20 (Index Scan Backward on pkey)', 'Haan, hamesha', 'UUID se sort karo', 'Namumkin'],
            answer: 0,
            explain: 'Lab: Postgres "Index Scan Backward using t_bigint_pkey", MySQL "Backward index scan". Ek index kam = har INSERT sasta.',
          } },
        { lane: 'fn', t: '⚠️ Server ki ghadi 2 second peeche gayi (NTP)', note: 'Naye IDs purane IDs se chhote ban sakte hain — kram toota, aur usi ms ke seq se takraav ka khatra. Production mein ghadi peeche jaane par ruko ya alert.', bad: true },
      ],
      insight: `ID mein time + shard + sequence = <b>coordination bina uniqueness</b>. Keemat: ghadi (clock) par bharosa.`,
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: Instagram function, takraav, UUID ka bill',
      project: '05-sharding',
      exercise: 'ex2-ids',
      goal: 'Asli Instagram function dono engines mein chalao — ID kholo, takraav gino, sequence bits kam karke dekho, aur bigint vs UUID primary key naapo.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/05-sharding\ndocker compose up -d' },
        { text: 'Postgres.', cmd: './run.sh pg sql/ex2-ids.pg.sql',
          expect: '         id          | ms_since_epoch |      kab_bani_utc       | shard | seq\n 3988980312464954369 |   475523509081 | 2026-09-18 14:58:50.802 |     5 |   1\n\n har shard ka apna bigserial     |   50000\n Instagram id (shard bits andar) |       0\n ek hi shard ke andar duplicate? |       0\n\n ek_ms_mein_sabse_zyada → 446\n ids_bani | unique_ids | duplicate\n    50000 |        560 |     49440\n\n bigint (Instagram jaisa) | 21 MB\n uuid v4                  | 38 MB\n Limit -> Index Scan Backward using t_bigint_pkey on t_bigint' },
        { text: 'MySQL.', cmd: './run.sh my sql/ex2-ids.my.sql',
          expect: '| har shard ka apna AUTO_INCREMENT |   20000 |\n| Instagram id (shard bits andar)  |       0 |\n\n| bigint (Instagram jaisa, time ke kram mein) |      5203 |     32.6 |\n| 16 random bytes (UUID v4 jaisa)             |     12117 |     68.6 |\n| UUID_TO_BIN(UUID(), 1) (time pehle)         |      6918 |     41.6 |' },
      ],
      observe: {
        q: 'MySQL mein random 16-byte PK ki table bigint PK se 2× badi kyun bani (68.6 vs 32.6 MB)?',
        choices: [
          'InnoDB table PK ke kram mein rakhi hoti hai — random key har insert ko beech mein ghusaati hai, pages split hote hain aur aadhe bhare rehte hain',
          '16 byte bigint ke 8 byte se double hai, bas',
          'MySQL UUID compress nahi karta',
          'ANALYZE galat tha',
        ],
        answer: 0,
        explain: 'Key size ka farak (16 vs 8 byte) bhi hai, par time-ordered UUID (41.6 MB) dikhata hai ki bada hissa <b>random order</b> ka hai — page splits.',
      },
      lesson: 'UUID v7 / UUID_TO_BIN(u, 1) jaisi time-pehle keys random ka zyadatar nuksaan bacha leti hain.',
    },
    {
      type: 'match',
      title: 'ID scheme aur uski keemat',
      pairs: [
        { left: 'Har shard ka apna AUTO_INCREMENT', right: 'Shards aapas mein takraate hain (har shard par id 1)', explain: 'Lab: 50,000 / 50,000 takraav.' },
        { left: 'UUID v4', right: 'Coordination nahi, par bada aur random — B-tree bikharta hai', explain: 'Postgres index 21 → 38 MB, insert 2.8× dheema.' },
        { left: 'Ticket server (Flickr)', right: 'Har ID ke liye ek alag DB se network call — single point of failure', explain: 'MySQL REPLACE INTO + LAST_INSERT_ID(); do ticket servers odd/even se HA.' },
        { left: 'Instagram PL/pgSQL next_id()', right: 'Shard ke andar hi, time-ordered 64 bit — ghadi par bharosa', explain: '41 / 13 / 10 bits.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Sharded IDs ki samajh',
      questions: [
        { q: 'Instagram ID se shard number kaise nikaalte hain?', choices: ['id % 8192', '(id >> 10) & 8191', 'id >> 23', 'Lookup table se'], answer: 1, explain: 'Neeche ke 10 bit sequence, uske upar 13 bit shard.' },
        { q: 'Custom epoch (2011) kyun, 1970 kyun nahi?', choices: ['Fashion', '1970 se ginte toh time bits ka bada hissa pehle hi khatam — IDs jaldi khatam', 'Postgres 1970 support nahi karta', 'Shard ke liye'], answer: 1, explain: 'Epoch jitna naya, utne zyada saal bachte hain.' },
        { q: 'Sequence 10 bit hai. Ek shard par ek ms mein 2,000 photos aayi toh?', choices: ['Sab theek', 'seq % 1024 ghoom ke wapas aayega — duplicate IDs', 'Postgres rok dega', 'Doosre shard par chali jaayengi'], answer: 1, explain: 'Hadd: 1,024 / ms / shard. Lab mein 2 bit par yahi hua (49,440 duplicate).' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — IDs',
    instructions: 'System design round. 🎤',
    questions: [
      { q: 'Interviewer: "Sharded system mein globally unique, sortable IDs — design?"', choices: ['UUID v4', '64-bit: time (custom epoch) | shard/worker | sequence — DB function (Instagram) ya service (Snowflake); clock skew ka dhyaan', 'Ek central auto-increment', 'Random bigint'], answer: 1, explain: 'Bits ka budget batao, hadd batao (per-ms limit, saal), aur clock peeche jaane ka ilaaj.' },
      { q: 'Interviewer: "MySQL par UUID primary key — koi dikkat?"', choices: ['Koi nahi', 'InnoDB clustered hai — random PK = page splits, bada table, dheema insert; time-ordered UUID (UUID_TO_BIN(u,1) / v7) ya bigint', 'Sirf size', 'UUID allowed nahi'], answer: 1, explain: 'Lab: 12.1 s vs 5.2 s, 68.6 vs 32.6 MB.' },
    ],
  },
  success: [
    'Main har ID scheme (auto-increment, UUID, ticket server, Snowflake, Instagram) ki keemat bata sakta hoon',
    'Main 64 bit ka bantwaara (time / shard / sequence) aur uski hadd samjha sakta hoon',
    'Main ID se time aur shard nikaal sakta hoon',
    'Maine asli DB par Instagram function aur UUID ka bill naapa hai',
  ],
  homework: `<pre>-- Apne sequence-based table ka ID "kab bana" nahi bata sakta. Instagram ID bata sakti hai:
SELECT to_timestamp(((id &gt;&gt; 23) + 1314220021721) / 1000.0) FROM photos ORDER BY id DESC LIMIT 5;</pre>`,
  cards: [
    { front: 'Instagram ID ke bits?', back: '<b>41</b> time (ms, custom epoch) · <b>13</b> shard · <b>10</b> sequence.' },
    { front: 'Random UUID PK InnoDB mein kyun mehenga?', back: 'Table PK ke kram mein (clustered) — random inserts = page splits, aadhe bhare pages. Time-ordered UUID lo.' },
    { front: 'MySQL mein sequence nahi — jugaad?', back: 'Counter table + <code>UPDATE seq SET n = LAST_INSERT_ID(n + 1)</code> (ticket server).' },
    { front: 'Time-ordered ID ka bonus?', back: '<code>ORDER BY id DESC LIMIT 20</code> = naye posts, bina created_at index.' },
  ],
},

/* =====================================================================
   I9 — Postgres ke chhote hathiyaar
   ===================================================================== */
{
  id: 'db-pg-power',
  icon: '🧰',
  title: 'Postgres Ke Chhote Hathiyaar — Partial Index, Expression Index, PgBouncer',
  badge: 'Auzaar Wala',
  objectives: [
    '<b>Partial index</b>: sirf woh rows index karo jo query sach mein dekhti hai (60 MB → 2.5 MB)',
    '<b>Expression / prefix index</b>: lambi value ka chhota hissa index karo — Postgres vs MySQL',
    'Har Postgres connection ek <b>process</b> — PgBouncer kyun aur uski shartein',
    'MySQL mein kya hai, kya nahi (partial index nahi; prefix + functional index hain)',
  ],
  lesson: [
    `<h3>😵 Problem pehle</h3>
     <p>PhotoGram: <b>1 arab photos</b>. Feed sirf <b>pichhle 30 din</b> ki photos dikhati hai. Index <code>(user_id, created)</code>
     poore 1 arab rows ka hai — RAM mein fit nahi, har INSERT par bada index badalta hai.</p>
     <h3>🎯 Partial index — sirf kaam ki rows</h3>
     <pre>CREATE INDEX photos_user_recent ON photos (user_id, created)
  WHERE created &gt;= '2025-12-01';</pre>
     <p>Lab 05 (2M photos, 2 saal): poora index <b>60 MB</b> → partial <b>2.5 MB</b>. Query
     <code>user_id = 42 AND created &gt;= '2025-12-05'</code> → <code>Index Scan Backward using photos_user_recent</code>.</p>
     <ul>
       <li>Shart mein <b>fixed date</b> — <code>now() - 30 days</code> nahi chalta (index ki shart badal nahi sakti). Har mahine naya partial index, purana DROP.</li>
       <li>Query ki date partial index ki date ke <b>andar</b> honi chahiye — <code>created &gt;= '2025-06-01'</code> par planner poora index leta hai.</li>
       <li>Aur misaal: <code>WHERE status = 'pending'</code> (99% rows "done" hain), <code>WHERE deleted_at IS NULL</code>.</li>
     </ul>
     <h3>✂️ Expression index — lambi value ka chhota hissa</h3>
     <p>Share link ka token 64 character. Pehle 8 character hi lagbhag unique (lab: 2M mein 1 row).</p>
     <pre>CREATE INDEX ON photos (left(token, 8));       -- 182 MB → 60 MB
SELECT … WHERE left(token, 8) = left($1, 8) AND token = $1;</pre>
     <p>Query ko <b>wahi expression</b> likhna padta hai. MySQL mein <b>prefix index</b> <code>KEY (token(8))</code> bina query badle kaam karta hai
     (lab: 83.9 MB → 21.5 MB). Instagram ne "10× chhota" kaha tha — hamara 3× aaya (B-tree ki har entry ka ~16 byte overhead).
     <b>Khud naapo.</b></p>`,

    `<h3>🔌 Connection ka bill</h3>
     <p>Postgres har connection ke liye ek alag <b>OS process</b> banata hai (video: ~1.3 MB se shuru, queries ke saath aur).
     50 app servers × 30 connections = <b>1,500 processes</b> — memory, context switching, aur locks par ladaai. Zyadatar connections
     zyadatar waqt <b>khaali baithe</b> hote hain.</p>
     <p><b>PgBouncer</b> beech mein baithta hai: app ke 1,500 connections leta hai, Postgres ko sirf ~60 asli connections.
     <b>Transaction pooling</b> mein ek transaction khatam → connection agle client ko.</p>
     <p>⚠️ <b>Shartein</b> (transaction pooling): session ki cheezein ek transaction se aage nahi bachti —
     <code>SET</code> (session settings), advisory locks, <code>LISTEN</code>, temp tables. Purane PgBouncer par prepared statements bhi.</p>
     <table>
       <tr><th></th><th>Postgres</th><th>MySQL</th></tr>
       <tr><td>Connection</td><td>process (bhaari)</td><td>thread (halka)</td></tr>
       <tr><td>Partial index</td><td>✅</td><td>❌ syntax error</td></tr>
       <tr><td>Prefix index <code>col(8)</code></td><td>❌ (expression index se)</td><td>✅</td></tr>
       <tr><td>Expression / functional index</td><td>✅</td><td>✅ 8.0.13+ <code>((LEFT(token, 8)))</code></td></tr>
     </table>
     <p>Aur Instagram ka ek aur hathiyaar: <b>logical replication</b> — table ke badlaav search index, cache invalidation, warehouse
     tak bhejo, app mein "dual write" ke bina (boss level mein yahi).</p>`,
  ],
  stages: [
    {
      type: 'slider',
      title: '🎚️ Lab: 1,500 connections ka bill',
      instructions: 'Knobs ghumao. App ko connections chahiye, Postgres ko kam processes.',
      scenario: `PhotoGram: <b>50 app servers</b>, har ek ka pool <b>30</b>. DBA ki shart: Postgres par <b>300 se kam</b> processes.
        App team ki shart: kul <b>1,500</b> app connections (peak par sab chahiye).`,
      knobs: [
        { id: 'servers', label: 'App servers', min: 10, max: 100, step: 5, value: 50 },
        { id: 'pool', label: 'Har server ka pool', min: 5, max: 50, step: 5, value: 30 },
        { id: 'bouncer', label: 'PgBouncer (0 = nahi, 1 = transaction pooling)', min: 0, max: 1, step: 1, value: 0 },
      ],
      readouts: [
        { id: 'client', label: 'App connections', unit: '', fn: v => clientConns(v), good: x => x >= 1500 },
        { id: 'pg', label: 'Postgres processes', unit: '', fn: v => pgConns(v), good: x => x <= 300 },
        { id: 'mem', label: 'Sirf connections ki memory (1.3 MB se shuru)', unit: 'MB', fn: v => Math.round(pgConns(v) * 1.3) },
      ],
      verdict: v => {
        if (!v.bouncer && clientConns(v) >= 1500) return { tone: 'bad', text: `🔥 ${clientConns(v).toLocaleString('en-IN')} Postgres processes — zyadatar khaali baithe, par sab memory aur scheduling kha rahe hain.` };
        if (clientConns(v) < 1500) return { tone: 'warn', text: '⚠️ Postgres khush, par app ko peak par connections nahi milenge — requests pool par line mein.' };
        return { tone: 'good', text: '✅ App ko 1,500 connections, Postgres ko sirf ~60. Khaali connections ab Postgres par bojh nahi.' };
      },
      goal: { text: 'App connections <b>≥ 1,500</b> aur Postgres processes <b>≤ 300</b>.', check: (v, r) => r.client >= 1500 && r.pg <= 300 },
      insight: `Connections ghata ke app ko bhookha mat rakho — <b>beech mein pooler</b> rakho. Par transaction pooling ki shartein
        (SET, advisory locks, LISTEN) app code mein jaanch lo. MySQL threads halke hain, par wahan bhi hazaaron connections par ProxySQL jaisa pooler lagta hai.`,
    },
    {
      type: 'bins',
      title: 'Kaunsa index?',
      instructions: 'Har situation ke liye sabse chhota kaam karne wala index chuno.',
      bins: [
        { id: 'partial', label: '🎯 Partial index (WHERE …)' },
        { id: 'expr', label: '✂️ Expression / prefix index' },
        { id: 'normal', label: '📇 Normal B-tree' },
      ],
      items: [
        { text: 'jobs table: 5 crore rows, 99.9% "done"; worker sirf status = \'pending\' dhoondhta hai', bin: 'partial', explain: '<code>CREATE INDEX … ON jobs (created) WHERE status = \'pending\'</code> — index mein sirf pending rows, chhota aur hamesha garam.' },
        { text: 'soft delete: saari queries WHERE deleted_at IS NULL', bin: 'partial', explain: 'Deleted rows index mein aane ka koi faayda nahi.' },
        { text: 'Login: WHERE lower(email) = lower($1)', bin: 'expr', explain: '<code>CREATE INDEX ON users (lower(email))</code> — warna lower() ki wajah se index use hi nahi hoga.' },
        { text: '64 char API token lookup', bin: 'expr', explain: 'left(token, 8) (Postgres) / token(8) (MySQL) — index 3–4× chhota, phir poore token se pakka match.' },
        { text: 'orders.customer_id par join', bin: 'normal', explain: 'Saari rows chahiye, value chhoti (bigint) — seedha B-tree.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Asli DB par: partial, expression aur prefix index',
      project: '05-sharding',
      exercise: 'ex3-indexes',
      goal: '2M photos par poora vs partial index, aur 64 char token par poora vs 8 character index — size aur plan dono engines par.',
      steps: [
        { text: 'Databases chalao.', cmd: 'cd sqlgurukul/docker-labs/05-sharding\ndocker compose up -d' },
        { text: 'Postgres.', cmd: './run.sh pg sql/ex3-indexes.pg.sql',
          expect: ' poora index (2 saal)                  | 60 MB\n partial (WHERE created >= 1 Dec 2025) | 2552 kB\n Index Scan Backward using photos_user_recent on photos\n Index Scan using photos_user_all on photos        (created >= 1 Jun 2025)\n\n poora token (64 char) | 182 MB\n left(token, 8)        | 60 MB\n Index Scan using photos_token_8 on photos\n   Index Cond: ("left"(token, 8) = \'f1c15925\'::text)' },
        { text: 'MySQL.', cmd: './run.sh my sql/ex3-indexes.my.sql',
          expect: 'ERROR 1064 (42000): You have an error in your SQL syntax ... near \'WHERE created >= \'2025-12-01\'\'\n| photos_token_f8   |    21.5 |\n| photos_token_full |    83.9 |\n| photos_token_p8   |    21.5 |\nEXPLAIN ... key: photos_token_p8 | rows: 1' },
      ],
      observe: {
        q: 'Postgres ne "created >= 1 Jun 2025" wali query par partial index kyun nahi chuna?',
        choices: [
          'Partial index mein sirf 1 Dec 2025 ke baad ki rows hain — June se November ki rows us index mein hain hi nahi',
          'Partial index kharab tha',
          'Stats purane the',
          'Backward scan allowed nahi',
        ],
        answer: 0,
        explain: 'Planner partial index tabhi leta hai jab query ki shart index ki shart ke andar ho — warna jawab adhoora hota.',
      },
      lesson: 'Partial index "sabse zyada poochi jaane wali" rows ke liye. Baaki queries ke liye normal index ya partitioning.',
    },
    {
      type: 'quiz',
      title: 'Chhote hathiyaaron ki samajh',
      questions: [
        { q: 'Partial index ki shart mein <code>now() - interval \'30 days\'</code> kyun nahi likh sakte?', choices: ['Syntax', 'Index ki shart fixed (immutable) honi chahiye — now() har pal badalta hai', 'Performance', 'Likh sakte hain'], answer: 1, explain: 'Fixed date likho aur har mahine naya partial index + purana DROP.' },
        { q: 'MySQL mein partial index ka sabse kareeb vikalp?', choices: ['CREATE INDEX … WHERE', 'Koi seedha vikalp nahi — alag "recent" table, partitioning, ya prefix / functional index jahan fit ho', 'FULLTEXT', 'HASH index'], answer: 1, explain: 'Lab: MySQL ne partial index par ERROR 1064 diya.' },
        { q: 'PgBouncer transaction pooling par kaunsi cheez toot sakti hai?', choices: ['SELECT', 'Session-level SET, advisory locks, LISTEN/NOTIFY', 'INSERT', 'Indexes'], answer: 1, explain: 'Agli transaction doosre server connection par ja sakti hai — session ki yaad nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Postgres power tools',
    instructions: 'Backend round. 🎤',
    questions: [
      { q: 'Interviewer: "Job queue table 5 crore rows, workers pending jobs dhoondhte hain — dheema. Kya karoge?"', choices: ['Poori table par index', 'Partial index WHERE status = \'pending\' + FOR UPDATE SKIP LOCKED; done jobs purane partitions mein', 'Redis mein daal do', 'VACUUM FULL'], answer: 1, explain: 'Index sirf pending rows ka = chhota, RAM mein, har worker ke liye tez.' },
      { q: 'Interviewer: "Postgres par max_connections 5000 kar dein?"', choices: ['Haan', 'Nahi — har connection ek process; beech mein PgBouncer lagao, Postgres par kuch sau hi rakho', 'Sirf RAM badhao', 'MySQL par jao'], answer: 1, explain: 'Pooling level (scale track) wala sweet spot yahan bhi.' },
    ],
  },
  success: [
    'Main partial index ki shart aur uski hadd (fixed date, query ki shart andar) samjha sakta hoon',
    'Main expression (Postgres) aur prefix (MySQL) index ka farak jaanta hoon',
    'Main PgBouncer kyun aur transaction pooling ki shartein bata sakta hoon',
    'Maine asli DB par index sizes aur plans naape hain',
  ],
  homework: `<pre>-- Postgres: kaunse indexes kabhi use nahi hue? (partial se badalne layak?)
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC LIMIT 10;</pre>`,
  cards: [
    { front: 'Partial index kab?', back: 'Queries hamesha ek chhoti subset dekhti hain (pending jobs, pichhle 30 din, deleted_at IS NULL).' },
    { front: 'Expression index ki shart?', back: 'Query mein <b>wahi expression</b> likho — <code>left(token, 8)</code>, <code>lower(email)</code>.' },
    { front: 'MySQL prefix index?', back: '<code>KEY (token(8))</code> — pehle 8 character; query badalni nahi padti.' },
    { front: 'PgBouncer kyun?', back: 'Postgres connection = process. Pooler hazaaron app connections ko kuch dozen asli connections par chalata hai.' },
  ],
},

]);
})();
